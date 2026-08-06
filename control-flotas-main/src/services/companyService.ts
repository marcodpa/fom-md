/**
 * Servicio del dashboard de empresa + reportes y comparativa (capa de datos
 * abstracta).
 *
 * Devuelve hoy flotas simuladas de varias empresas, con la MISMA forma async
 * que tendrá la API real de Juan. Migrar = reescribir SOLO el cuerpo marcado
 * con «TODO API», sin tocar pantallas ni tipos.
 *
 * Todo se filtra por `companyId`: cada empresa solo ve su propia flota.
 */

import { subirFotosCloudinary } from '@/lib/cloudinary';
import { supabase } from '@/lib/supabase';
import { DEFAULT_BRAND } from '@/theme';
import type {
  Company,
  CompanyStats,
  CompanyTipo,
  DriverProfile,
  OdtEstado,
  OdtTipo,
  ReporteGerencial,
  FleetReport,
  FleetSummary,
  FleetVehicle,
  LatLng,
  ReportMetrics,
  ReportPeriod,
  ReportScope,
  Role,
  UserReport,
  UserReportMetrics,
  UserReportScope,
  ScoreRange,
  User,
  Vehicle,
  VehicleReportRow,
  VehicleStatus,
  VehicleType,
  WorkOrder,
  WorkOrderListItem,
} from '@/types';

import { getNombreAreaSync } from './asignacionService';
import { registrarAuditoria } from './auditoriaService';
import { getCompanyBrandById } from './brandService';
import { empresaIdDe, esIdDb } from './db';
import { fakeNetwork, seed } from './network';
import { notificar } from './notificationService';
import { getIdConductorPorNombre, getNombreConductor, perfilesDeEmpresa } from './userService';

// ───────────────────────────── DATOS MOCK ─────────────────────────────────

/**
 * Empresas del sistema (FOM-02 §1.1): estándar (operativas), predefinidas
 * (contratantes sin flota propia, ej. Chevron) y personales (§5). La asignación
 * estándar → predefinida vive en `predefinidaIds` (Samfor y PDVSA Petroboscan
 * → Chevron). Las flotas de PDVSA Petroboscan y de la cuenta personal llegan
 * en sus bloques.
 */
/**
 * Ente de RESPALDO del sistema: aquí "cae" la gente eliminada de su empresa
 * (su cuenta NO se borra de la BD) hasta que la administración FOM la
 * reasigne a otra compañía → contratista/personal. Solo la ve el admin FOM;
 * con el servicio suspendido, su gente no puede iniciar sesión.
 */
export const DESEMPLEADOS_ID = 'desempleados-ca';

/** ¿Es la ente de respaldo (no aparece en pickers ni reportes)? */
export function esDesempleados(companyId?: string): boolean {
  return companyId === DESEMPLEADOS_ID;
}

const MOCK_COMPANIES: Company[] = seed<Company>([
  { id: 'Samfor', name: 'Samfor', tipo: 'estandar', rif: 'J-30123456-7', predefinidaIds: ['chevron'] },
  { id: 'petrosur', name: 'Petrosur', tipo: 'estandar', rif: 'J-29887766-1' },
  { id: 'pdvsa-petroboscan', name: 'PDVSA Petroboscan', tipo: 'estandar', rif: 'J-31555222-3', predefinidaIds: ['chevron'] },
  { id: 'chevron', name: 'Chevron', tipo: 'predefinida', rif: 'J-00123456-0' },
  { id: 'sampieri', name: 'Ale Sampieri', tipo: 'personal' },
  { id: DESEMPLEADOS_ID, name: 'Desempleados C.A.', tipo: 'estandar', servicioActivo: false },
]);

/**
 * Unidad de flota interna: el plano del vehículo (GPS) + el conductor actual +
 * las estadísticas del período (últimos 30 días) que alimentan los reportes.
 * De aquí se derivan tanto `FleetVehicle` (dashboard) como las métricas.
 */
interface MockFleetUnit {
  vehicle: Vehicle;
  estado: VehicleStatus;
  velocidadKmh: number;
  conductorActual: string | null;
  coords: LatLng;
  // Estadísticas acumuladas del período (conteos crudos de eventos).
  km: number;
  indiceSeguro: number; // 0–100, 100 = perfecto
  excesosVelocidad: number;
  frenadasBruscas: number;
  aceleracionesBruscas: number;
}

// Flota de Samfor, dispersa por Maracaibo. Coordenadas reales para que el mapa
// multi-vehículo se vea poblado.
const MOCK_FLEET: MockFleetUnit[] = seed<MockFleetUnit>([
  {
    vehicle: { id: 'veh-014', companyId: 'Samfor', marca: 'Toyota', modelo: 'Hilux', anio: 2022, placa: 'AB123CD', numero: 'U-014', alias: 'Unidad 14', gpsId: 'gps-014', cicloEstado: 'activo_reportando', areaId: 'area-sam-produccion', conductorPrincipalId: 'usr-sam-1' },
    estado: 'en_marcha', velocidadKmh: 54, conductorActual: 'José Marrufo', coords: { lat: 10.6545, lng: -71.6405 },
    km: 3120, indiceSeguro: 78, excesosVelocidad: 6, frenadasBruscas: 4, aceleracionesBruscas: 3,
  },
  {
    vehicle: { id: 'veh-022', companyId: 'Samfor', marca: 'Ford', modelo: 'F-150', anio: 2021, placa: 'CF884KK', numero: 'U-022', alias: 'Unidad 22', gpsId: 'gps-022', cicloEstado: 'activo_reportando', areaId: 'area-sam-produccion', conductorPrincipalId: 'usr-sam-2' },
    // Parada y sin conductor ahora: su conductora habitual (María Chourio) no
    // está manejando en este momento (aparece "inactiva" en la lista de usuarios).
    estado: 'parada', velocidadKmh: 0, conductorActual: null, coords: { lat: 10.6712, lng: -71.6128 },
    km: 2740, indiceSeguro: 91, excesosVelocidad: 1, frenadasBruscas: 1, aceleracionesBruscas: 0,
  },
  {
    // "Unidad 07": la unidad ejemplo del documento (§3.5) — GPS con PIN,
    // conductor principal Pedro, secundarios Luis y Carlos.
    vehicle: { id: 'veh-031', companyId: 'Samfor', marca: 'Chevrolet', modelo: 'Silverado', anio: 2020, placa: 'DG201LM', numero: 'U-031', alias: 'Unidad 07', gpsId: 'gps-031', cicloEstado: 'activo_reportando', areaId: 'area-sam-base', conductorPrincipalId: 'drv-sam-3' },
    estado: 'parada', velocidadKmh: 0, conductorActual: 'Pedro Villalobos', coords: { lat: 10.6389, lng: -71.6602 },
    km: 1980, indiceSeguro: 64, excesosVelocidad: 11, frenadasBruscas: 7, aceleracionesBruscas: 5,
  },
  {
    vehicle: { id: 'veh-045', companyId: 'Samfor', marca: 'Toyota', modelo: 'Land Cruiser', anio: 2023, placa: 'EH552NP', numero: 'U-045', alias: 'Unidad 45', gpsId: 'gps-045', cicloEstado: 'activo_reportando', areaId: 'area-sam-base', conductorPrincipalId: 'drv-sam-4' },
    estado: 'en_marcha', velocidadKmh: 61, conductorActual: 'Luis Atencio', coords: { lat: 10.6901, lng: -71.6350 },
    km: 3560, indiceSeguro: 86, excesosVelocidad: 3, frenadasBruscas: 2, aceleracionesBruscas: 1,
  },
  {
    vehicle: { id: 'veh-052', companyId: 'Samfor', marca: 'Nissan', modelo: 'Frontier', anio: 2019, placa: 'FJ339QR', numero: 'U-052', alias: 'Unidad 52', gpsId: 'gps-052', cicloEstado: 'activo_reportando' },
    estado: 'parada', velocidadKmh: 0, conductorActual: null, coords: { lat: 10.6233, lng: -71.6281 },
    km: 2210, indiceSeguro: 72, excesosVelocidad: 5, frenadasBruscas: 5, aceleracionesBruscas: 4,
  },
  {
    vehicle: { id: 'veh-067', companyId: 'Samfor', marca: 'Ford', modelo: 'Ranger', anio: 2022, placa: 'GK710ST', numero: 'U-067', alias: 'Unidad 67', gpsId: 'gps-067', cicloEstado: 'activo_reportando', areaId: 'area-sam-contrato' },
    estado: 'en_marcha', velocidadKmh: 47, conductorActual: 'Carla Romero', coords: { lat: 10.6620, lng: -71.6489 },
    km: 2990, indiceSeguro: 83, excesosVelocidad: 4, frenadasBruscas: 3, aceleracionesBruscas: 2,
  },

  // Flota de Petrosur (otra empresa, para comparar). Alrededor de Cabimas.
  {
    vehicle: { id: 'veh-101', companyId: 'petrosur', marca: 'Toyota', modelo: 'Hilux', anio: 2023, placa: 'PS101AA', numero: 'P-101', gpsId: 'gps-101', cicloEstado: 'activo_reportando', areaId: 'area-pet-occidente' },
    estado: 'en_marcha', velocidadKmh: 58, conductorActual: 'Ramón Bracho', coords: { lat: 10.4015, lng: -71.4521 },
    km: 4120, indiceSeguro: 69, excesosVelocidad: 9, frenadasBruscas: 6, aceleracionesBruscas: 5,
  },
  {
    vehicle: { id: 'veh-102', companyId: 'petrosur', marca: 'Chevrolet', modelo: 'Silverado', anio: 2021, placa: 'PS102BB', numero: 'P-102', gpsId: 'gps-102', cicloEstado: 'activo_reportando', areaId: 'area-pet-occidente' },
    estado: 'parada', velocidadKmh: 0, conductorActual: 'Yelitza Soto', coords: { lat: 10.4102, lng: -71.4380 },
    km: 3380, indiceSeguro: 88, excesosVelocidad: 2, frenadasBruscas: 1, aceleracionesBruscas: 1,
  },
  {
    vehicle: { id: 'veh-103', companyId: 'petrosur', marca: 'Ford', modelo: 'F-150', anio: 2020, placa: 'PS103CC', numero: 'P-103', gpsId: 'gps-103', cicloEstado: 'activo_reportando', areaId: 'area-pet-carga' },
    estado: 'en_marcha', velocidadKmh: 44, conductorActual: 'Gustavo Pirela', coords: { lat: 10.3890, lng: -71.4602 },
    km: 2860, indiceSeguro: 75, excesosVelocidad: 5, frenadasBruscas: 4, aceleracionesBruscas: 3,
  },
  {
    vehicle: { id: 'veh-104', companyId: 'petrosur', marca: 'Nissan', modelo: 'Frontier', anio: 2022, placa: 'PS104DD', numero: 'P-104', gpsId: 'gps-104', cicloEstado: 'activo_reportando', areaId: 'area-pet-occidente' },
    estado: 'en_marcha', velocidadKmh: 52, conductorActual: 'Daniela Faría', coords: { lat: 10.4188, lng: -71.4455 },
    km: 3640, indiceSeguro: 81, excesosVelocidad: 4, frenadasBruscas: 3, aceleracionesBruscas: 2,
  },
  {
    vehicle: { id: 'veh-105', companyId: 'petrosur', marca: 'Toyota', modelo: 'Land Cruiser', anio: 2019, placa: 'PS105EE', numero: 'P-105', gpsId: 'gps-105', cicloEstado: 'activo_reportando', areaId: 'area-pet-carga' },
    estado: 'parada', velocidadKmh: 0, conductorActual: 'Héctor Nava', coords: { lat: 10.3955, lng: -71.4310 },
    km: 2120, indiceSeguro: 60, excesosVelocidad: 13, frenadasBruscas: 8, aceleracionesBruscas: 6,
  },

  // Flota DOMÉSTICA de Ale Sampieri (FOM-02 §5): el Admin ya creó su cuenta y
  // sus vehículos (con GPS). Cada carro tiene a su usuario como principal.
  {
    vehicle: { id: 'veh-ale-1', companyId: 'sampieri', marca: 'Toyota', modelo: 'Corolla', anio: 2021, placa: 'AE111PP', numero: 'C-01', alias: 'Carro de Santi', tipo: 'auto', gpsId: 'gps-ale-1', cicloEstado: 'activo_reportando', conductorPrincipalId: 'up-santi' },
    estado: 'en_marcha', velocidadKmh: 38, conductorActual: 'Santi Sampieri', coords: { lat: 10.6655, lng: -71.6372 },
    km: 1240, indiceSeguro: 92, excesosVelocidad: 1, frenadasBruscas: 1, aceleracionesBruscas: 0,
  },
  {
    vehicle: { id: 'veh-ale-2', companyId: 'sampieri', marca: 'Chevrolet', modelo: 'Aveo', anio: 2019, placa: 'AE222QQ', numero: 'C-02', alias: 'Carro de Sofi', tipo: 'auto', gpsId: 'gps-ale-2', cicloEstado: 'activo_reportando', conductorPrincipalId: 'up-sofi' },
    estado: 'parada', velocidadKmh: 0, conductorActual: 'Sofi Sampieri', coords: { lat: 10.6420, lng: -71.6150 },
    km: 980, indiceSeguro: 95, excesosVelocidad: 0, frenadasBruscas: 1, aceleracionesBruscas: 0,
  },
]);

// ODT de las flotas (FOM-02 §3.3). Mutable: el supervisor puede avanzar su
// estado y debe persistir durante la sesión.
// Las URLs de evidencia son fotos de ejemplo (placeholder); en real vendrán del
// backend tras subir las fotos del conductor.
// Cada ODT tiene un AUTOR real (driverId del conductor que la reportó), no el
// conductor "actual" del vehículo: una unidad parada sin conductor igual pudo
// haber generado una ODT cuando alguien la manejaba (corrige el bug §2).
// Las cerradas traen el cierre completo (§3.3): qué se hizo, costo, factura y
// fecha de resolución.
const MOCK_WORK_ORDERS: WorkOrder[] = seed<WorkOrder>([
  { id: 'wo-301', vehicleId: 'veh-031', driverId: 'drv-sam-3', descripcion: 'Frenos hacen ruido al detenerse; el pedal vibra.', tipoFalla: 'frenos', tipo: 'correctiva', estado: 'abierta', creadaEn: hace(2), ubicacionTexto: 'Av. La Limpia, Maracaibo', evidenciaUrls: ['https://picsum.photos/seed/wo301a/600/400', 'https://picsum.photos/seed/wo301b/600/400'] },
  { id: 'wo-298', vehicleId: 'veh-014', driverId: 'usr-sam-1', descripcion: 'Testigo de temperatura del motor encendido en ralentí.', tipoFalla: 'motor', tipo: 'correctiva', estado: 'en_revision', creadaEn: hace(8), ubicacionTexto: 'Av. Intercomunal, Maracaibo', evidenciaUrls: ['https://picsum.photos/seed/wo298/600/400'] },
  { id: 'wo-292', vehicleId: 'veh-052', driverId: 'usr-sam-2', descripcion: 'Neumático trasero derecho con desgaste irregular.', tipoFalla: 'neumaticos', tipo: 'correctiva', estado: 'cerrada', creadaEn: hace(26), ubicacionTexto: 'Sector Los Haticos, Maracaibo', evidenciaUrls: ['https://picsum.photos/seed/wo292/600/400'], notaSolucion: 'Se reemplazó el neumático y se alineó el tren trasero.', costo: 140, evidenciaResolucionUrls: ['https://picsum.photos/seed/wo292f/600/400'], resueltaEn: hace(20) },
  { id: 'wo-289', vehicleId: 'veh-067', driverId: 'drv-sam-5', descripcion: 'Aire acondicionado no enfría; revisar sistema eléctrico.', tipoFalla: 'electrico', tipo: 'correctiva', estado: 'abierta', creadaEn: hace(30), ubicacionTexto: 'Av. Bella Vista, Maracaibo', evidenciaUrls: ['https://picsum.photos/seed/wo289/600/400'] },
  // Petrosur
  { id: 'wo-410', vehicleId: 'veh-101', driverId: 'usr-pet-1', descripcion: 'Vibración fuerte del volante a alta velocidad.', tipoFalla: 'neumaticos', tipo: 'correctiva', estado: 'abierta', creadaEn: hace(5), ubicacionTexto: 'Carretera Lara-Zulia, Cabimas', evidenciaUrls: ['https://picsum.photos/seed/wo410/600/400'] },
  { id: 'wo-405', vehicleId: 'veh-105', driverId: 'drv-pet-5', descripcion: 'Pérdida de aceite bajo el motor.', tipoFalla: 'motor', tipo: 'correctiva', estado: 'en_revision', creadaEn: hace(14), ubicacionTexto: 'Av. Andrés Bello, Cabimas', evidenciaUrls: ['https://picsum.photos/seed/wo405/600/400'] },
  { id: 'wo-401', vehicleId: 'veh-103', driverId: 'drv-pet-3', descripcion: 'Luz de check engine intermitente.', tipoFalla: 'motor', tipo: 'correctiva', estado: 'cerrada', creadaEn: hace(40), ubicacionTexto: 'Sector La Rosa, Cabimas', notaSolucion: 'Se cambió el sensor de oxígeno y se borró el código de falla.', costo: 85, resueltaEn: hace(36) },
]);

/** Devuelve una fecha ISO de hace N horas (para que los reportes se vean recientes). */
function hace(horas: number): string {
  return new Date(Date.now() - horas * 3600_000).toISOString();
}

// ───────────────────────────── HELPERS ────────────────────────────────────

/** Clasifica un índice de manejo seguro en el semáforo del tema. */
function rangoDeIndice(indice: number): ScoreRange {
  if (indice >= 85) return 'verde';
  if (indice >= 70) return 'amarillo';
  return 'rojo';
}

/** Unidades de una empresa. */
function unidadesDe(companyId: string): MockFleetUnit[] {
  return MOCK_FLEET.filter((f) => f.vehicle.companyId === companyId);
}

/**
 * Empresas cliente CON flota operativa (para servicios que iteran todas, ej.
 * costos). Las empresas nuevas del FOM-02 sin flota todavía (PDVSA Petroboscan,
 * la cuenta personal) y las predefinidas (sin flota por definición) no aparecen
 * aquí; entrarán solas cuando sus bloques les den unidades.
 */
export function listarEmpresasMock(): Company[] {
  return MOCK_COMPANIES.filter((c) => MOCK_FLEET.some((f) => f.vehicle.companyId === c.id));
}

/** Proyección pública de una unidad al `FleetVehicle` del dashboard. */
function toFleetVehicle(u: MockFleetUnit): FleetVehicle {
  return {
    vehicle: u.vehicle,
    estado: u.estado,
    velocidadKmh: u.velocidadKmh,
    km: u.km,
    conductorActual: u.conductorActual,
    // Enlaza el nombre del conductor con su id para abrir su perfil.
    conductorId: u.conductorActual ? (getIdConductorPorNombre(u.conductorActual) ?? null) : null,
    coords: u.coords,
  };
}

/** ODT abiertas (no cerradas) de un conjunto de vehículos. */
function reportesAbiertosDe(vehicleIds: string[]): number {
  return MOCK_WORK_ORDERS.filter(
    (wo) => vehicleIds.includes(wo.vehicleId) && wo.estado !== 'cerrada',
  ).length;
}

/** Agrega métricas sobre un conjunto de unidades. */
function agregarMetricas(unidades: MockFleetUnit[]): ReportMetrics {
  const vehiculos = unidades.length;
  const kmRecorridos = sum(unidades.map((u) => u.km));
  const excesosVelocidad = sum(unidades.map((u) => u.excesosVelocidad));
  const frenadasBruscas = sum(unidades.map((u) => u.frenadasBruscas));
  const aceleracionesBruscas = sum(unidades.map((u) => u.aceleracionesBruscas));
  // Promedio del índice ponderado por igual entre vehículos.
  const indiceSeguroPromedio = vehiculos
    ? Math.round(sum(unidades.map((u) => u.indiceSeguro)) / vehiculos)
    : 0;
  return {
    vehiculos,
    kmRecorridos,
    indiceSeguroPromedio,
    rango: rangoDeIndice(indiceSeguroPromedio),
    excesosVelocidad,
    frenadasBruscas,
    aceleracionesBruscas,
    reportesAbiertos: reportesAbiertosDe(unidades.map((u) => u.vehicle.id)),
  };
}

function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

/** Nombre del área de un vehículo (o "Sin área"). */
function nombreArea(areaId?: string): string {
  return getNombreAreaSync(areaId) ?? 'Sin área';
}

/**
 * Desglose por vehículo: cada vehículo con su área y sus datos del período
 * (sin conductor: el reporte es del vehículo, brief §6).
 */
function desglosePorVehiculo(unidades: MockFleetUnit[]): VehicleReportRow[] {
  return unidades.map((u) => ({
    vehicle: u.vehicle,
    areaName: nombreArea(u.vehicle.areaId),
    estado: u.estado,
    km: u.km,
    indiceSeguro: u.indiceSeguro,
    rango: rangoDeIndice(u.indiceSeguro),
    excesosVelocidad: u.excesosVelocidad,
    frenadasBruscas: u.frenadasBruscas,
    aceleracionesBruscas: u.aceleracionesBruscas,
    otAbiertas: reportesAbiertosDe([u.vehicle.id]),
  }));
}

/** Período "mes en curso" (rango por defecto de los reportes). */
export function periodoMesActual(): ReportPeriod {
  const ahora = new Date();
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const label = ahora.toLocaleDateString('es', { month: 'long', year: 'numeric' });
  return {
    desde: desde.toISOString(),
    hasta: ahora.toISOString(),
    // Capitaliza la primera letra del mes.
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
}

// ───────────── BD PROVISIONAL: EMPRESAS (lectura/escritura reales) ─────────
// Con .env configurado, las empresas viven en Supabase; sin él (o si la BD no
// responde en una lectura), el mock sigue contestando y la app no se rompe.

/** Fila de `empresas` en la BD. La app usa el SLUG como id de empresa. */
type EmpresaRow = {
  slug: string;
  nombre: string;
  tipo: CompanyTipo;
  rif: string | null;
  contacto: string | null;
  telefono?: string | null;
  email?: string | null;
  servicio_activo?: boolean;
};

function rowToCompany(r: EmpresaRow, predefinidaIds?: string[]): Company {
  return {
    id: r.slug,
    name: r.nombre,
    tipo: r.tipo,
    rif: r.rif ?? undefined,
    contacto: r.contacto ?? undefined,
    telefono: r.telefono ?? undefined,
    email: r.email ?? undefined,
    predefinidaIds: predefinidaIds && predefinidaIds.length > 0 ? predefinidaIds : undefined,
    servicioActivo: r.servicio_activo ?? true,
  };
}

const EMPRESA_SELECT = 'slug, nombre, tipo, rif, contacto, telefono, email, servicio_activo';

/**
 * TODAS las empresas de la BD con sus asignaciones a predefinidas, o `null`
 * si no hay BD configurada o la lectura falla (→ el caller cae al mock).
 */
async function empresasDb(): Promise<Company[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('empresas')
    .select(EMPRESA_SELECT)
    .order('creada_en');
  if (error || !data) return null;
  const filas = data as unknown as EmpresaRow[];

  // Asignaciones estándar → predefinida (por slug, en una sola consulta).
  const { data: asig } = await supabase
    .from('empresa_predefinidas')
    .select('empresa:empresas!empresa_id(slug), predefinida:empresas!predefinida_id(slug)');
  const asigFilas = (asig ?? []) as unknown as {
    empresa: { slug: string } | null;
    predefinida: { slug: string } | null;
  }[];
  const porEmpresa = new Map<string, string[]>();
  for (const a of asigFilas) {
    if (!a.empresa?.slug || !a.predefinida?.slug) continue;
    porEmpresa.set(a.empresa.slug, [...(porEmpresa.get(a.empresa.slug) ?? []), a.predefinida.slug]);
  }
  return filas.map((r) => rowToCompany(r, porEmpresa.get(r.slug)));
}

/** Fila de `vehiculos` con sus joins (empresa slug + nombre del principal). */
type VehiculoRow = {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  numero: string;
  alias: string | null;
  tipo: VehicleType;
  gps_id: string;
  area_id: string | null;
  conductor_principal_id: string | null;
  estado_marcha: VehicleStatus;
  velocidad_kmh: number;
  km: number;
  lat: number | null;
  lng: number | null;
  empresa: { slug: string } | null;
  principal: { nombre: string } | null;
};

// `principal:perfiles!conductor_principal_id`: hay DOS relaciones vehiculos↔perfiles
// (el conductor principal y la tabla conductores_secundarios), así que el embed
// DEBE nombrar la FK; si no, PostgREST tira PGRST201 y la flota no carga.
const VEHICULO_SELECT =
  'id, marca, modelo, anio, placa, numero, alias, tipo, gps_id, area_id, conductor_principal_id, estado_marcha, velocidad_kmh, km, lat, lng, empresa:empresas(slug), principal:perfiles!conductor_principal_id(nombre)';

function rowToVehicle(f: VehiculoRow): Vehicle {
  return {
    id: f.id,
    companyId: f.empresa?.slug ?? '',
    marca: f.marca,
    modelo: f.modelo,
    anio: f.anio,
    placa: f.placa,
    numero: f.numero,
    alias: f.alias ?? undefined,
    tipo: f.tipo,
    gpsId: f.gps_id,
    cicloEstado: 'activo_reportando',
    areaId: f.area_id ?? undefined,
    conductorPrincipalId: f.conductor_principal_id ?? undefined,
  };
}

function rowToFleetVehicle(f: VehiculoRow): FleetVehicle {
  const base = BASE_COORDS[f.empresa?.slug ?? ''] ?? { lat: 10.6545, lng: -71.6405 };
  return {
    vehicle: rowToVehicle(f),
    estado: f.estado_marcha,
    velocidadKmh: f.velocidad_kmh,
    km: f.km,
    // Conductor "actual": el principal (la sesión por PIN llegará con el GPS real).
    conductorActual: f.principal?.nombre ?? null,
    conductorId: f.conductor_principal_id ?? null,
    coords: f.lat != null && f.lng != null ? { lat: f.lat, lng: f.lng } : base,
  };
}

/** Vehículos de una empresa desde la BD, o `null` (→ el caller cae al mock). */
async function vehiculosDb(companyId: string): Promise<VehiculoRow[] | null> {
  if (!supabase) return null;
  const empresaId = await empresaIdDe(companyId);
  if (!empresaId) return null;
  const { data, error } = await supabase
    .from('vehiculos')
    .select(VEHICULO_SELECT)
    .eq('empresa_id', empresaId)
    .order('creado_en');
  if (error || !data) return null;
  return data as unknown as VehiculoRow[];
}

/** Fila de `odts` con sus joins (etiqueta del vehículo + nombre del creador). */
type OdtRow = {
  id: string;
  vehiculo_id: string;
  creador_id: string | null;
  autor_via: 'principal' | 'secundario' | null;
  tipo: OdtTipo;
  estado: OdtEstado;
  descripcion: string;
  tipo_falla: string | null;
  ubicacion: string | null;
  evidencia_urls: string[];
  nota_solucion: string | null;
  costo: number | null;
  evidencia_resolucion_urls: string[];
  resuelta_en: string | null;
  regla_id: string | null;
  creada_en: string;
  vehiculo: { numero: string; marca: string; modelo: string; alias: string | null } | null;
  creador: { nombre: string } | null;
};

const ODT_SELECT =
  'id, vehiculo_id, creador_id, autor_via, tipo, estado, descripcion, tipo_falla, ubicacion, evidencia_urls, nota_solucion, costo, evidencia_resolucion_urls, resuelta_en, regla_id, creada_en, vehiculo:vehiculos(numero, marca, modelo, alias), creador:perfiles(nombre)';

function rowToOrden(f: OdtRow): WorkOrderListItem {
  return {
    id: f.id,
    vehicleId: f.vehiculo_id,
    driverId: f.creador_id ?? '',
    descripcion: f.descripcion,
    tipoFalla: (f.tipo_falla as WorkOrder['tipoFalla']) ?? undefined,
    tipo: f.tipo,
    autorVia: f.autor_via ?? undefined,
    reglaAlertaId: f.regla_id ?? undefined,
    estado: f.estado,
    creadaEn: f.creada_en,
    ubicacionTexto: f.ubicacion ?? '',
    evidenciaUrls: f.evidencia_urls.length > 0 ? f.evidencia_urls : undefined,
    notaSolucion: f.nota_solucion ?? undefined,
    costo: f.costo != null ? Number(f.costo) : undefined,
    evidenciaResolucionUrls:
      f.evidencia_resolucion_urls.length > 0 ? f.evidencia_resolucion_urls : undefined,
    resueltaEn: f.resuelta_en ?? undefined,
    vehicleLabel: f.vehiculo
      ? `${f.vehiculo.alias ?? f.vehiculo.numero} · ${f.vehiculo.marca} ${f.vehiculo.modelo}`
      : '—',
    // ODT sin creador = la generó el SISTEMA (preventiva automática, §3.4).
    driverName: f.creador?.nombre ?? 'Sistema',
  };
}

/** Tipo de una empresa (BD primero, mock después) para validar roles. */
export async function getTipoEmpresa(companyId: string): Promise<CompanyTipo | null> {
  if (supabase) {
    const { data } = await supabase.from('empresas').select('tipo').eq('slug', companyId).maybeSingle();
    if (data) return (data as { tipo: CompanyTipo }).tipo;
  }
  return getTipoEmpresaSync(companyId);
}

// ───────────────────────────── SERVICIOS ──────────────────────────────────

/**
 * Empresas cuyo PANEL OPERATIVO puede mirar un usuario, según su rol (brief §5
 * + FOM-02 §1/§3):
 *  - companyAdmin / supervisor_company: solo la suya.
 *  - generalAdmin / superAdmin / admin: las empresas estándar (las predefinidas
 *    no tienen panel operativo — sin flota propia — y las personales tendrán su
 *    superficie propia; ambas se administrarán desde la superficie de Admin).
 *
 * Para la vista gerencial del supervisor de predefinida está
 * `getEmpresasAsignadasA` (no esta función).
 *
 * TODO API: GET /usuarios/me/empresas
 */
export async function getEmpresasDelUsuario(role: Role, companyId?: string): Promise<Company[]> {
  const db = await empresasDb();
  const todas = db ?? MOCK_COMPANIES;
  if (role === 'generalAdmin' || role === 'superAdmin' || role === 'admin') {
    // La ente de respaldo (Desempleados) no participa en reportes.
    const lista = todas.filter((c) => (c.tipo ?? 'estandar') === 'estandar' && !esDesempleados(c.id));
    return db ? lista : fakeNetwork(lista);
  }
  const propia = todas.find((c) => c.id === companyId);
  // Gente de una COMPAÑÍA: su alcance de reportes/comparativas son sus
  // empresas ASOCIADAS (la compañía no opera flota propia).
  if (propia && (propia.tipo ?? 'estandar') === 'predefinida') {
    const asociadas = todas.filter((c) => c.predefinidaIds?.includes(propia.id));
    return db ? asociadas : fakeNetwork(asociadas);
  }
  const lista = propia ? [propia] : [];
  return db ? lista : fakeNetwork(lista);
}

/**
 * Empresas ASIGNADAS a una o varias predefinidas (FOM-02 §2.1): la lista que ve
 * el supervisor de predefinida al entrar (ej. Chevron → Samfor y PDVSA
 * Petroboscan). Solo lectura gerencial; nunca da acceso al panel operativo.
 *
 * TODO API: GET /predefinidas/:ids/empresas-asignadas
 */
export async function getEmpresasAsignadasA(predefinidaIds: string[]): Promise<Company[]> {
  const db = await empresasDb();
  const todas = db ?? MOCK_COMPANIES;
  const asignadas = todas.filter((c) => c.predefinidaIds?.some((id) => predefinidaIds.includes(id)));
  return db ? asignadas : fakeNetwork(asignadas);
}

/**
 * Resumen de la flota para las tarjetas superiores del dashboard.
 *
 * TODO API: GET /empresas/:companyId/flota/resumen
 */
export async function getResumenFlota(companyId: string): Promise<FleetSummary> {
  const db = await vehiculosDb(companyId);
  if (db) {
    return {
      totalVehiculos: db.length,
      enMarcha: db.filter((f) => f.estado_marcha === 'en_marcha').length,
      parados: db.filter((f) => f.estado_marcha === 'parada').length,
      // Las ODT se conectan en su propio bloque; mientras, sin abiertas.
      reportesAbiertos: reportesAbiertosDe(db.map((f) => f.id)),
    };
  }
  const unidades = unidadesDe(companyId);
  return fakeNetwork({
    totalVehiculos: unidades.length,
    enMarcha: unidades.filter((u) => u.estado === 'en_marcha').length,
    parados: unidades.filter((u) => u.estado === 'parada').length,
    reportesAbiertos: reportesAbiertosDe(unidades.map((u) => u.vehicle.id)),
  });
}

/**
 * Flota completa de la empresa (lista + marcadores del mapa).
 *
 * TODO API: GET /empresas/:companyId/flota
 */
export async function getFlotaVehiculos(companyId: string): Promise<FleetVehicle[]> {
  const db = await vehiculosDb(companyId);
  if (db) return db.map(rowToFleetVehicle);
  return fakeNetwork(unidadesDe(companyId).map(toFleetVehicle));
}

/**
 * TODA la flota del sistema (una sola consulta, con el slug de su ente en el
 * join): la usa el tab Flota del admin FOM para verlos agrupados por empresa.
 * RLS: solo el admin FOM (soy_admin) recibe todas.
 *
 * TODO API: GET /vehiculos
 */
export async function getVehiculosSistema(): Promise<FleetVehicle[]> {
  if (supabase) {
    const { data } = await supabase.from('vehiculos').select(VEHICULO_SELECT).order('creado_en');
    if (data) return (data as unknown as VehiculoRow[]).map(rowToFleetVehicle);
  }
  return fakeNetwork(MOCK_FLEET.map(toFleetVehicle));
}

/**
 * Vehículo que conduce el propio usuario, como un miembro de flota más (él como
 * conductor). Sirve para que un admin que está manejando aparezca en el panel
 * de SU empresa (brief §4). Devuelve `null` si el usuario no está ligado a una
 * empresa con flota.
 *
 * TODO API: GET /conductores/me/vehiculo-actual?formato=flota
 */
export async function getMiVehiculoFlota(user: User): Promise<FleetVehicle | null> {
  if (!user.companyId) return null;
  const fleetVehicle: FleetVehicle = {
    vehicle: {
      id: `adm-${user.id}`,
      companyId: user.companyId,
      marca: 'Toyota',
      modelo: 'Hilux',
      anio: 2023,
      placa: 'ADM-001',
      numero: 'U-001',
    },
    estado: 'en_marcha',
    velocidadKmh: 42,
    conductorActual: user.name,
    conductorId: user.id,
    coords: { lat: 10.668, lng: -71.624 },
  };
  return fakeNetwork(fleetVehicle);
}

// ───────────────────── Alta de vehículo (FOM-02 §1.2) ──────────────────────

/** Punto base por empresa para ubicar unidades nuevas en el mapa (mock). */
const BASE_COORDS: Record<string, LatLng> = {
  Samfor: { lat: 10.6545, lng: -71.6405 },
  petrosur: { lat: 10.4015, lng: -71.4521 },
  'pdvsa-petroboscan': { lat: 10.34, lng: -71.9 },
  sampieri: { lat: 10.66, lng: -71.63 },
};

let _vehSeq = 200;

/** Datos del paso 1 y 2 del alta (§1.2); el GPS llega ya registrado y verificado. */
export interface NuevoVehiculoInput {
  companyId: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  tipo: VehicleType;
  /** Id de la unidad en el sistema (empareja con el conductor/chip). Sin él, la placa. */
  numero?: string;
  /** Área de la empresa a la que pertenece (opcional). */
  areaId?: string;
  /** Alias interno de la empresa para la unidad (§8-1). */
  alias: string;
  /** GPS instalado y verificado (obligatorio: sin él no se llega aquí). */
  gpsId: string;
  /**
   * Documentos del vehículo con sus vencimientos (§1.2 paso 2): trimestres,
   * RCV, carné de circulación y póliza de seguro.
   */
  documentos: { tipo: string; venceEn: string }[];
}

// Documentos capturados en el alta, por vehículo (§1.2 paso 2). En real los
// guarda el backend junto al vehículo.
const DOCS_ALTA = new Map<string, { tipo: string; venceEn: string }[]>();

/**
 * Documentos registrados en el alta de un vehículo.
 *
 * TODO API: GET /vehiculos/:id/documentos
 */
export async function getDocumentosAltaVehiculo(
  vehicleId: string,
): Promise<{ tipo: string; venceEn: string }[]> {
  return fakeNetwork(DOCS_ALTA.get(vehicleId) ?? []);
}

/**
 * Termina el alta del vehículo (§1.2 paso 4): lo agrega a la flota de su
 * empresa en estado "activo y reportando". El GPS ya debe estar registrado,
 * asociado y verificado (la pantalla del wizard hace cumplir el orden).
 *
 * TODO API: POST /vehiculos
 */
export async function crearVehiculo(input: NuevoVehiculoInput): Promise<Vehicle> {
  // BD provisional: el alta escribe de verdad (la BD exige el GPS verificado).
  if (supabase) {
    const empresaId = await empresaIdDe(input.companyId);
    if (!empresaId) throw new Error('Empresa no encontrada en la base de datos.');
    const baseDb = BASE_COORDS[input.companyId] ?? { lat: 10.6545, lng: -71.6405 };
    const { data, error } = await supabase
      .from('vehiculos')
      .insert({
        empresa_id: empresaId,
        marca: input.marca.trim(),
        modelo: input.modelo.trim(),
        anio: input.anio,
        placa: input.placa.trim().toUpperCase(),
        numero: (input.numero?.trim() || input.placa.trim()).toUpperCase(),
        alias: input.alias.trim(),
        tipo: input.tipo,
        gps_id: input.gpsId,
        area_id: input.areaId ?? null,
        lat: baseDb.lat,
        lng: baseDb.lng,
      })
      .select(VEHICULO_SELECT)
      .single();
    if (error) {
      throw new Error(
        error.code === '23505'
          ? 'Ya existe un vehículo con esa placa en la empresa.'
          : error.message.includes('GPS')
            ? 'El GPS debe estar VERIFICADO antes de crear el vehículo.'
            : 'No se pudo crear el vehículo. Intenta de nuevo.',
      );
    }
    const vehicle = rowToVehicle(data as unknown as VehiculoRow);
    // Documentos del alta con su vencimiento (de aquí saltan las alertas).
    if (input.documentos.length > 0) {
      await supabase.from('documentos').insert(
        input.documentos.map((d) => ({
          ambito: 'vehiculo',
          vehiculo_id: vehicle.id,
          tipo: d.tipo,
          vence_en: d.venceEn,
        })),
      );
    }
    registrarAuditoria({
      accion: 'crear',
      entidad: 'vehiculo',
      objetivo: `${vehicle.alias ?? vehicle.numero} · ${vehicle.placa}`,
      companyId: input.companyId,
      vehicleId: vehicle.id,
    });
    return vehicle;
  }

  const seq = ++_vehSeq;
  const base = BASE_COORDS[input.companyId] ?? BASE_COORDS.Samfor;
  const vehicle: Vehicle = {
    id: `veh-${seq}`,
    companyId: input.companyId,
    marca: input.marca.trim(),
    modelo: input.modelo.trim(),
    anio: input.anio,
    placa: input.placa.trim().toUpperCase(),
    numero: (input.numero?.trim() || `U-${seq}`).toUpperCase(),
    alias: input.alias.trim(),
    tipo: input.tipo,
    gpsId: input.gpsId,
    areaId: input.areaId,
    cicloEstado: 'activo_reportando',
  };
  DOCS_ALTA.set(vehicle.id, input.documentos);
  MOCK_FLEET.push({
    vehicle,
    estado: 'parada',
    velocidadKmh: 0,
    conductorActual: null,
    // Ligeramente desplazada de la base para no apilar marcadores.
    coords: { lat: base.lat + (seq % 10) * 0.002, lng: base.lng + (seq % 7) * 0.002 },
    km: 0,
    indiceSeguro: 100,
    excesosVelocidad: 0,
    frenadasBruscas: 0,
    aceleracionesBruscas: 0,
  });
  registrarAuditoria({
    accion: 'crear',
    entidad: 'vehiculo',
    objetivo: `${vehicle.alias ?? vehicle.numero} · ${vehicle.placa}`,
    companyId: input.companyId,
    vehicleId: vehicle.id,
  });
  return fakeNetwork(vehicle, 500);
}

/**
 * Empresas a las que se les puede dar de alta un vehículo (§1.2 paso 1,
 * "asignar empresa"): las estándar y las personales. Las predefinidas no
 * operan flota propia.
 *
 * TODO API: GET /empresas?asignables=1
 */
export async function getEmpresasAsignables(): Promise<Company[]> {
  const db = await empresasDb();
  if (db) return db.filter((c) => c.tipo !== 'predefinida');
  return fakeNetwork(MOCK_COMPANIES.filter((c) => c.tipo !== 'predefinida'));
}

// ─────────────────── Superficie Admin (FOM-02 §1.1/§1.3) ───────────────────

/** Datos del alta de una empresa (§1.1). */
export interface NuevaEmpresaInput {
  name: string;
  rif: string;
  contacto?: string;
  /** Teléfono con código de país (obligatorio). */
  telefono?: string;
  /** Correo electrónico (obligatorio). */
  email?: string;
  tipo: CompanyTipo;
  /** Asignación opcional a predefinida(s) al crearla (ej. Samfor → Chevron). */
  predefinidaIds?: string[];
}

/**
 * Crea una empresa (solo Admin, §1.1): nombre, RIF, datos de contacto, tipo
 * (estándar | predefinida | personal) y, opcionalmente, su asignación a una
 * predefinida.
 *
 * TODO API: POST /empresas
 */
export async function crearEmpresa(input: NuevaEmpresaInput): Promise<Company> {
  const name = input.name.trim();
  if (!name) throw new Error('Ponle nombre a la empresa.');
  if (!input.rif.trim()) throw new Error('Indica el RIF.');
  if (!input.telefono?.trim()) throw new Error('Indica el teléfono.');
  if (!input.email?.trim()) throw new Error('Indica el correo electrónico.');
  // Una CONTRATISTA (estandar) debe pertenecer a una compañía; la PERSONAL es
  // opcional; la COMPAÑÍA no se asigna a otra.
  const predefinidaIds =
    input.tipo === 'predefinida' ? undefined : input.predefinidaIds;
  if (input.tipo === 'estandar' && !predefinidaIds?.length) {
    throw new Error('Una contratista debe asignarse a una compañía existente.');
  }
  const id = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // BD provisional: la empresa se crea de verdad en Supabase.
  if (supabase) {
    const { data, error } = await supabase
      .from('empresas')
      .insert({
        slug: id,
        nombre: name,
        tipo: input.tipo,
        rif: input.rif.trim(),
        contacto: input.contacto?.trim() || null,
        telefono: input.telefono.trim(),
        email: input.email.trim().toLowerCase(),
      })
      .select(EMPRESA_SELECT)
      .single();
    if (error) {
      throw new Error(
        error.code === '23505'
          ? 'Ya existe una empresa con ese nombre.'
          : 'No se pudo crear la empresa en la base de datos. Intenta de nuevo.',
      );
    }
    if (predefinidaIds?.length) {
      await asignarPredefinidasDb(id, predefinidaIds);
    }
    registrarAuditoria({ accion: 'crear', entidad: 'empresa', objetivo: name, companyId: id, companyNombre: name });
    return rowToCompany(data as unknown as EmpresaRow, predefinidaIds);
  }

  // Modo mock.
  if (MOCK_COMPANIES.some((c) => c.id === id || c.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('Ya existe una empresa con ese nombre.');
  }
  const company: Company = {
    id,
    name,
    tipo: input.tipo,
    rif: input.rif.trim(),
    contacto: input.contacto?.trim() || undefined,
    telefono: input.telefono.trim(),
    email: input.email.trim().toLowerCase(),
    predefinidaIds,
  };
  MOCK_COMPANIES.push(company);
  registrarAuditoria({ accion: 'crear', entidad: 'empresa', objetivo: name, companyId: id, companyNombre: name });
  return fakeNetwork(company, 500);
}

/**
 * Reescribe en la BD las asignaciones estándar → predefinida de una empresa
 * (por slugs). Interno de `crearEmpresa`/`asignarPredefinidas`.
 */
async function asignarPredefinidasDb(companySlug: string, predefinidaSlugs: string[]): Promise<void> {
  if (!supabase) return;
  const slugs = [companySlug, ...predefinidaSlugs];
  const { data } = await supabase.from('empresas').select('id, slug').in('slug', slugs);
  const filas = (data ?? []) as unknown as { id: string; slug: string }[];
  const idDe = new Map(filas.map((f) => [f.slug, f.id]));
  const empresaId = idDe.get(companySlug);
  if (!empresaId) throw new Error('Empresa no encontrada en la base de datos.');

  // Reemplazo completo: borra las asignaciones previas y escribe las nuevas.
  await supabase.from('empresa_predefinidas').delete().eq('empresa_id', empresaId);
  const rows = predefinidaSlugs
    .map((s) => idDe.get(s))
    .filter((pid): pid is string => !!pid)
    .map((pid) => ({ empresa_id: empresaId, predefinida_id: pid }));
  if (rows.length > 0) {
    const { error } = await supabase.from('empresa_predefinidas').insert(rows);
    if (error) throw new Error('No se pudo guardar la asignación a la predefinida.');
  }
}

/** Empresas predefinidas (para el selector de asignación, §1.1/§1.3). */
export async function getPredefinidas(): Promise<Company[]> {
  const db = await empresasDb();
  if (db) return db.filter((c) => c.tipo === 'predefinida');
  return fakeNetwork(MOCK_COMPANIES.filter((c) => c.tipo === 'predefinida'));
}

/**
 * Edita los datos de una empresa (solo admin FOM, desde su Consola).
 *
 * TODO API: PATCH /empresas/:slug
 */
export async function actualizarEmpresa(
  companyId: string,
  patch: { name?: string; rif?: string; contacto?: string; telefono?: string; email?: string },
): Promise<Company> {
  if (supabase) {
    const cambios: Record<string, unknown> = {};
    if (patch.name !== undefined) cambios.nombre = patch.name.trim();
    if (patch.rif !== undefined) cambios.rif = patch.rif.trim() || null;
    if (patch.contacto !== undefined) cambios.contacto = patch.contacto.trim() || null;
    if (patch.telefono !== undefined) cambios.telefono = patch.telefono.trim() || null;
    if (patch.email !== undefined) cambios.email = patch.email.trim().toLowerCase() || null;
    const { data, error } = await supabase
      .from('empresas')
      .update(cambios)
      .eq('slug', companyId)
      .select(EMPRESA_SELECT)
      .single();
    if (error || !data) throw new Error('No se pudo guardar la empresa. Intenta de nuevo.');
    const company = rowToCompany(data as unknown as EmpresaRow);
    registrarAuditoria({ accion: 'editar', entidad: 'empresa', objetivo: company.name, companyId, companyNombre: company.name });
    return company;
  }
  const c = MOCK_COMPANIES.find((x) => x.id === companyId);
  if (!c) throw new Error('Empresa no encontrada.');
  if (patch.name !== undefined) c.name = patch.name.trim();
  if (patch.rif !== undefined) c.rif = patch.rif.trim() || undefined;
  if (patch.contacto !== undefined) c.contacto = patch.contacto.trim() || undefined;
  if (patch.telefono !== undefined) c.telefono = patch.telefono.trim() || undefined;
  if (patch.email !== undefined) c.email = patch.email.trim().toLowerCase() || undefined;
  registrarAuditoria({ accion: 'editar', entidad: 'empresa', objetivo: c.name, companyId, companyNombre: c.name });
  return fakeNetwork({ ...c }, 400);
}

/**
 * ACTIVA o DESACTIVA el servicio FOM de una empresa (solo admin FOM).
 * Suspendido, los usuarios de esa empresa no pueden entrar a la app.
 *
 * TODO API: PATCH /empresas/:slug { servicioActivo }
 */
export async function setServicioEmpresa(companyId: string, activo: boolean): Promise<Company> {
  if (supabase) {
    const { data, error } = await supabase
      .from('empresas')
      .update({ servicio_activo: activo })
      .eq('slug', companyId)
      .select(EMPRESA_SELECT)
      .single();
    if (error || !data) throw new Error('No se pudo cambiar el estado del servicio.');
    const company = rowToCompany(data as unknown as EmpresaRow);
    registrarAuditoria({ accion: 'editar', entidad: 'servicio', objetivo: company.name, companyId, companyNombre: company.name, detalle: activo ? 'servicio reactivado' : 'servicio suspendido' });
    return company;
  }
  const c = MOCK_COMPANIES.find((x) => x.id === companyId);
  if (!c) throw new Error('Empresa no encontrada.');
  c.servicioActivo = activo;
  registrarAuditoria({ accion: 'editar', entidad: 'servicio', objetivo: c.name, companyId, companyNombre: c.name, detalle: activo ? 'servicio reactivado' : 'servicio suspendido' });
  return fakeNetwork({ ...c }, 300);
}

/**
 * ELIMINA una empresa con todo lo suyo (vehículos, áreas, ODT… en cascada).
 * Solo admin FOM, desde su Consola, con confirmación.
 *
 * TODO API: DELETE /empresas/:slug
 */
export async function eliminarEmpresa(companyId: string): Promise<void> {
  if (supabase) {
    // Se lee el nombre antes de borrar para dejarlo legible en la auditoría.
    const { data: prev } = await supabase.from('empresas').select('nombre').eq('slug', companyId).maybeSingle();
    const nombre = (prev as { nombre?: string } | null)?.nombre ?? companyId;
    const { error } = await supabase.from('empresas').delete().eq('slug', companyId);
    if (error) throw new Error('No se pudo eliminar la empresa. Intenta de nuevo.');
    registrarAuditoria({ accion: 'eliminar', entidad: 'empresa', objetivo: nombre, companyNombre: nombre });
    return;
  }
  const i = MOCK_COMPANIES.findIndex((x) => x.id === companyId);
  const nombre = i >= 0 ? MOCK_COMPANIES[i].name : companyId;
  if (i >= 0) MOCK_COMPANIES.splice(i, 1);
  registrarAuditoria({ accion: 'eliminar', entidad: 'empresa', objetivo: nombre, companyNombre: nombre });
  return fakeNetwork(undefined, 400);
}

/**
 * Asigna (o cambia) las predefinidas de una empresa estándar (§1.3, "asignar
 * empresas predefinidas a empresas" — administración del Admin).
 *
 * TODO API: PATCH /empresas/:id { predefinidaIds }
 */
export async function asignarPredefinidas(companyId: string, predefinidaIds: string[]): Promise<Company> {
  // BD provisional: la asignación se guarda de verdad.
  if (supabase) {
    await asignarPredefinidasDb(companyId, predefinidaIds);
    const { data } = await supabase
      .from('empresas')
      .select(EMPRESA_SELECT)
      .eq('slug', companyId)
      .single();
    if (!data) throw new Error('Empresa no encontrada.');
    return rowToCompany(data as unknown as EmpresaRow, predefinidaIds);
  }

  const c = MOCK_COMPANIES.find((x) => x.id === companyId);
  if (!c) throw new Error('Empresa no encontrada.');
  c.predefinidaIds = predefinidaIds.length > 0 ? predefinidaIds : undefined;
  return fakeNetwork(c, 400);
}

/**
 * Actualiza campos de asignación de un vehículo (área, conductor principal).
 * Interno de la capa de servicios (lo usa `asignacionService`); muta el mock
 * para que persista durante la sesión.
 */
export function patchVehiculo(
  vehicleId: string,
  patch: Partial<Pick<Vehicle, 'areaId' | 'conductorPrincipalId'>>,
): Vehicle | null {
  const unit = MOCK_FLEET.find((u) => u.vehicle.id === vehicleId);
  if (!unit) return null;
  Object.assign(unit.vehicle, patch);
  return unit.vehicle;
}

/** Vehículo por id (detalle de unidad del panel). TODO API: GET /vehiculos/:id */
export async function getVehiculo(vehicleId: string): Promise<Vehicle | null> {
  if (supabase && esIdDb(vehicleId)) {
    const { data } = await supabase.from('vehiculos').select(VEHICULO_SELECT).eq('id', vehicleId).maybeSingle();
    return data ? rowToVehicle(data as unknown as VehiculoRow) : null;
  }
  return fakeNetwork(MOCK_FLEET.find((u) => u.vehicle.id === vehicleId)?.vehicle ?? null);
}

/**
 * EDITA un vehículo (CRUD, espejo del de usuarios): datos de la unidad y su
 * ENTE (moverlo de empresa dentro del alcance de quien edita). Al moverlo de
 * empresa pierde su área y su conductor principal (son de cada ente).
 *
 * TODO API: PATCH /vehiculos/:id
 */
export async function actualizarVehiculo(input: {
  vehicleId: string;
  alias?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  placa?: string;
  tipo?: VehicleType;
  /** Id de la unidad en el sistema (columna `numero`). */
  numero?: string;
  companyId?: string;
}): Promise<Vehicle> {
  if (supabase && esIdDb(input.vehicleId)) {
    const patch: Record<string, unknown> = {};
    if (input.alias !== undefined) patch.alias = input.alias.trim() || null;
    if (input.marca?.trim()) patch.marca = input.marca.trim();
    if (input.modelo?.trim()) patch.modelo = input.modelo.trim();
    if (input.anio && Number.isFinite(input.anio)) patch.anio = input.anio;
    if (input.placa?.trim()) patch.placa = input.placa.trim().toUpperCase();
    if (input.tipo) patch.tipo = input.tipo;
    if (input.numero?.trim()) patch.numero = input.numero.trim().toUpperCase();
    if (input.companyId) {
      const empresaId = await empresaIdDe(input.companyId);
      if (!empresaId) throw new Error('Empresa no encontrada.');
      patch.empresa_id = empresaId;
      patch.area_id = null;
      patch.conductor_principal_id = null;
    }
    const { data, error } = await supabase
      .from('vehiculos')
      .update(patch)
      .eq('id', input.vehicleId)
      .select(VEHICULO_SELECT)
      .single();
    if (error || !data) throw new Error('No se pudo guardar el vehículo.');
    const vehicle = rowToVehicle(data as unknown as VehiculoRow);
    registrarAuditoria({
      accion: 'editar',
      entidad: 'vehiculo',
      objetivo: `${vehicle.alias ?? vehicle.numero} · ${vehicle.placa}`,
      companyId: vehicle.companyId,
      vehicleId: vehicle.id,
    });
    return vehicle;
  }
  const unit = MOCK_FLEET.find((u) => u.vehicle.id === input.vehicleId);
  if (!unit) throw new Error('Vehículo no encontrado.');
  const v = unit.vehicle;
  if (input.alias !== undefined) v.alias = input.alias.trim() || undefined;
  if (input.marca?.trim()) v.marca = input.marca.trim();
  if (input.modelo?.trim()) v.modelo = input.modelo.trim();
  if (input.anio && Number.isFinite(input.anio)) v.anio = input.anio;
  if (input.placa?.trim()) v.placa = input.placa.trim().toUpperCase();
  if (input.tipo) v.tipo = input.tipo;
  if (input.numero?.trim()) v.numero = input.numero.trim().toUpperCase();
  if (input.companyId && input.companyId !== v.companyId) {
    v.companyId = input.companyId;
    v.areaId = undefined;
    v.conductorPrincipalId = undefined;
  }
  registrarAuditoria({
    accion: 'editar',
    entidad: 'vehiculo',
    objetivo: `${v.alias ?? v.numero} · ${v.placa}`,
    companyId: v.companyId,
    vehicleId: v.id,
  });
  return fakeNetwork({ ...v }, 350);
}

/**
 * ELIMINA un vehículo del sistema (con confirmación en la UI). A diferencia
 * de las personas, la unidad sí se borra: no tiene cuenta que conservar.
 *
 * TODO API: DELETE /vehiculos/:id
 */
export async function eliminarVehiculo(vehicleId: string, opts?: { fecha?: string }): Promise<void> {
  if (supabase && esIdDb(vehicleId)) {
    // Se lee la etiqueta antes de borrar para dejarla legible en la auditoría.
    const { data: prev } = await supabase
      .from('vehiculos')
      .select('numero, alias, placa, empresa:empresas(slug)')
      .eq('id', vehicleId)
      .maybeSingle();
    const p = prev as unknown as { numero: string; alias: string | null; placa: string; empresa: { slug: string } | null } | null;
    const { error } = await supabase.from('vehiculos').delete().eq('id', vehicleId);
    if (error) throw new Error('No se pudo eliminar el vehículo.');
    registrarAuditoria({
      accion: 'eliminar',
      entidad: 'vehiculo',
      objetivo: p ? `${p.alias ?? p.numero} · ${p.placa}` : vehicleId,
      companyId: p?.empresa?.slug,
      fecha: opts?.fecha,
    });
    return;
  }
  const i = MOCK_FLEET.findIndex((u) => u.vehicle.id === vehicleId);
  if (i < 0) throw new Error('Vehículo no encontrado.');
  const v = MOCK_FLEET[i].vehicle;
  MOCK_FLEET.splice(i, 1);
  registrarAuditoria({
    accion: 'eliminar',
    entidad: 'vehiculo',
    objetivo: `${v.alias ?? v.numero} · ${v.placa}`,
    companyId: v.companyId,
    fecha: opts?.fecha,
  });
  return fakeNetwork(undefined, 350);
}

/** ¿La empresa es una cuenta personal? (para reglas que difieren, ej. §5 sin ODT de taller). */
/** Tipo de una empresa por id (para validar qué roles admite). Interno del mock. */
export function getTipoEmpresaSync(companyId: string): CompanyTipo | null {
  return MOCK_COMPANIES.find((c) => c.id === companyId)?.tipo ?? null;
}

/** TODAS las empresas del sistema (solo la Consola del admin FOM). */
export async function getEmpresasSistema(): Promise<Company[]> {
  const db = await empresasDb();
  if (db) return db;
  return fakeNetwork([...MOCK_COMPANIES]);
}

export function esEmpresaPersonalSync(companyId: string): boolean {
  return MOCK_COMPANIES.find((c) => c.id === companyId)?.tipo === 'personal';
}

/** Vehículo del que el usuario es conductor PRINCIPAL (titular, §3.5). Interno. */
export function getVehiculoDePrincipalSync(userId: string): Vehicle | null {
  return MOCK_FLEET.find((u) => u.vehicle.conductorPrincipalId === userId)?.vehicle ?? null;
}

/** Posición actual (mock) de un vehículo, para el mapa de dos puntos (§8-8). */
export function getCoordsVehiculoSync(vehicleId: string): LatLng | null {
  return MOCK_FLEET.find((u) => u.vehicle.id === vehicleId)?.coords ?? null;
}

/**
 * Fija quién aparece como conductor ACTUAL de un vehículo (lo usa la sesión por
 * PIN, §3.5/§4.3: el secundario activo desplaza al principal y al salir vuelve).
 * Interno de la capa de servicios.
 */
export function setConductorActual(vehicleId: string, nombre: string | null): void {
  const unit = MOCK_FLEET.find((u) => u.vehicle.id === vehicleId);
  if (unit) unit.conductorActual = nombre;
}

/** Enriquece una ODT con etiquetas legibles (vehículo + AUTOR de la ODT). */
function enriquecerOrden(wo: WorkOrder): WorkOrderListItem {
  const v = MOCK_FLEET.find((x) => x.vehicle.id === wo.vehicleId)?.vehicle;
  return {
    ...wo,
    // El ALIAS interno manda (§8-1): "Unidad 07 · Silverado" cabe y significa
    // más que "U-031 · Chevrolet Silverado" truncado.
    vehicleLabel: v ? `${v.alias ?? v.numero} · ${v.modelo}` : wo.vehicleId,
    // El nombre viene del AUTOR (driverId), no del conductor actual del vehículo.
    // Las preventivas las crea el SISTEMA (§3.4), no una persona.
    driverName: wo.driverId === 'sistema' ? 'Sistema' : (getNombreConductor(wo.driverId) ?? 'Conductor'),
  };
}

/**
 * Registra una ODT nueva en el almacén (la que crea un conductor desde su
 * vista, o el sistema si es preventiva). Aparece de inmediato en el panel del
 * supervisor de su empresa y le llega su notificación (§3.3).
 */
export function registrarOrden(orden: WorkOrder): void {
  MOCK_WORK_ORDERS.unshift(orden);
  // "Nueva ODT — Vehículo Unidad 07 (ABC-123)" (§3.3). Las preventivas notifican
  // desde el motor de reglas con su propio mensaje (§3.4).
  if (orden.tipo !== 'preventiva') {
    const v = MOCK_FLEET.find((u) => u.vehicle.id === orden.vehicleId)?.vehicle;
    if (v) {
      notificar({
        companyId: v.companyId,
        tipo: 'odt_nueva',
        titulo: `Nueva ODT — Vehículo ${v.alias ?? v.numero} (${v.placa})`,
        detalle: orden.descripcion,
        odtId: orden.id,
      });
    }
  }
}

// Hooks que corren al CERRAR una ODT (ej.: reiniciar el contador de la regla
// preventiva, §3.4). Los registran otros servicios para no crear ciclos.
const ODT_CERRADA_HOOKS: ((wo: WorkOrder) => void)[] = [];

/** Registra un hook que corre cada vez que una ODT pasa a `cerrada`. */
export function registrarHookOdtCerrada(fn: (wo: WorkOrder) => void): void {
  ODT_CERRADA_HOOKS.push(fn);
}

/**
 * ODT de la empresa (fallas reportadas por los conductores), enriquecidas y
 * ordenadas de la más nueva a la más vieja.
 *
 * TODO API: GET /empresas/:companyId/odt
 */
export async function getOrdenesDeTrabajo(companyId: string): Promise<WorkOrderListItem[]> {
  if (supabase) {
    const empresaId = await empresaIdDe(companyId);
    if (empresaId) {
      const { data } = await supabase
        .from('odts')
        .select(ODT_SELECT)
        .eq('empresa_id', empresaId)
        .order('creada_en', { ascending: false });
      if (data) return (data as unknown as OdtRow[]).map(rowToOrden);
    }
  }
  const ids = unidadesDe(companyId).map((u) => u.vehicle.id);
  const items = MOCK_WORK_ORDERS.filter((wo) => ids.includes(wo.vehicleId))
    .slice()
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
    .map(enriquecerOrden);
  return fakeNetwork(items);
}

/**
 * Detalle de una ODT por id.
 *
 * TODO API: GET /odt/:id
 */
export async function getOrdenDeTrabajo(id: string): Promise<WorkOrderListItem | null> {
  if (supabase && esIdDb(id)) {
    const { data } = await supabase.from('odts').select(ODT_SELECT).eq('id', id).maybeSingle();
    return data ? rowToOrden(data as unknown as OdtRow) : null;
  }
  const wo = MOCK_WORK_ORDERS.find((x) => x.id === id);
  return fakeNetwork(wo ? enriquecerOrden(wo) : null);
}

/**
 * Cambia el estado de una ODT (abierta → en_revision → cerrada, FOM-02 §3.3).
 * Muta el mock en memoria para que persista durante la sesión. Al cerrar,
 * guarda el cierre completo (qué se hizo, costo, factura/foto) y fija la fecha
 * de resolución; si se reabre, la fecha se retira (ya no está resuelta).
 *
 * TODO API: PATCH /odt/:id  { estado, notaSolucion?, costo?, evidenciaResolucionUrls? }
 */
export async function actualizarEstadoOrden(
  id: string,
  estado: OdtEstado,
  extras?: { notaSolucion?: string; costo?: number; evidenciaResolucionUrls?: string[] },
): Promise<WorkOrderListItem> {
  // BD provisional: el avance/cierre se guarda de verdad. Los triggers de la
  // BD fijan `resuelta_en` y reinician el contador de la regla al cerrar.
  if (supabase && esIdDb(id)) {
    const patch: Record<string, unknown> = { estado };
    if (extras) {
      if (extras.notaSolucion !== undefined) patch.nota_solucion = extras.notaSolucion;
      if (extras.costo !== undefined) patch.costo = extras.costo;
      if (extras.evidenciaResolucionUrls !== undefined) {
        // Factura/foto del cierre a Cloudinary (URI local si no está configurado).
        patch.evidencia_resolucion_urls = await subirFotosCloudinary(extras.evidenciaResolucionUrls);
      }
    }
    const { data, error } = await supabase
      .from('odts')
      .update(patch)
      .eq('id', id)
      .select(ODT_SELECT)
      .single();
    if (error || !data) throw new Error('No se pudo actualizar la ODT. Intenta de nuevo.');
    return rowToOrden(data as unknown as OdtRow);
  }

  const wo = MOCK_WORK_ORDERS.find((x) => x.id === id);
  if (!wo) throw new Error('ODT no encontrada.');
  wo.estado = estado;
  if (extras) {
    if (extras.notaSolucion !== undefined) wo.notaSolucion = extras.notaSolucion;
    if (extras.costo !== undefined) wo.costo = extras.costo;
    if (extras.evidenciaResolucionUrls !== undefined)
      // Factura/foto del cierre a Cloudinary (URI local si no está configurado).
      wo.evidenciaResolucionUrls = await subirFotosCloudinary(extras.evidenciaResolucionUrls);
  }
  if (estado === 'cerrada') {
    wo.resueltaEn = wo.resueltaEn ?? new Date().toISOString();
    // Efectos del cierre (ej.: reiniciar el contador de la regla preventiva, §3.4).
    for (const hook of ODT_CERRADA_HOOKS) hook(wo);
  } else {
    wo.resueltaEn = undefined;
  }
  return fakeNetwork(enriquecerOrden(wo));
}

/**
 * Genera un reporte de VEHÍCULOS para un alcance (brief §6): general (toda la
 * empresa), flota (un área de la empresa), grupo (vehículos elegidos a mano) o un
 * vehículo. SIEMPRE lista cada vehículo del alcance con su grupo y datos.
 *
 * TODO API: POST /empresas/:companyId/reportes  (alcance + período en el cuerpo).
 */
export async function getReporte(scope: ReportScope): Promise<FleetReport> {
  const todas = unidadesDe(scope.companyId);

  // Selecciona las unidades según el tipo de alcance.
  let unidades = todas;
  if (scope.tipo === 'vehiculo' || scope.tipo === 'grupo') {
    const ids = scope.vehicleIds ?? [];
    unidades = todas.filter((u) => ids.includes(u.vehicle.id));
  } else if (scope.tipo === 'flota') {
    // "Flota" = un área concreta de la empresa (§3.1).
    unidades = todas.filter((u) => u.vehicle.areaId === scope.areaId);
  }

  return fakeNetwork({
    scope,
    titulo: tituloDeAlcance(scope, unidades),
    periodo: scope.periodo.label,
    metrics: agregarMetricas(unidades),
    porVehiculo: desglosePorVehiculo(unidades),
  });
}

/** Texto legible del alcance de un reporte. */
function tituloDeAlcance(scope: ReportScope, unidades: MockFleetUnit[]): string {
  if (scope.tipo === 'general') return 'General de la empresa';
  if (scope.tipo === 'flota') return `Área: ${scope.areaId ? nombreArea(scope.areaId) : '—'}`;
  if (scope.tipo === 'grupo') return `Grupo de ${unidades.length} vehículo(s)`;
  const v = unidades[0]?.vehicle;
  return v ? `Vehículo ${v.numero} · ${v.marca} ${v.modelo}` : 'Vehículo';
}

// ───────────────────── Vista gerencial (FOM-02 §2) ─────────────────────────

/**
 * Reporte gerencial de una empresa asignada (FOM-02 §2.1): resumen derivado del
 * histórico de ODT y sus costos. No expone métricas operativas (prohibidas para
 * el supervisor de predefinida, §8-5). Borrador hasta recibir el formato real
 * de la predefinida (D2).
 *
 * TODO API: GET /empresas/:companyId/reporte-gerencial
 */
export async function getReporteGerencial(companyId: string): Promise<ReporteGerencial> {
  const ids = unidadesDe(companyId).map((u) => u.vehicle.id);
  const odts = MOCK_WORK_ORDERS.filter((wo) => ids.includes(wo.vehicleId));
  const cerradas = odts.filter((o) => o.estado === 'cerrada');
  const horas = cerradas.flatMap((o) =>
    o.resueltaEn ? [(new Date(o.resueltaEn).getTime() - new Date(o.creadaEn).getTime()) / 3600_000] : [],
  );
  return fakeNetwork({
    companyId,
    periodo: periodoMesActual().label,
    odtAbiertas: odts.filter((o) => o.estado === 'abierta').length,
    odtEnRevision: odts.filter((o) => o.estado === 'en_revision').length,
    odtCerradas: cerradas.length,
    odtCorrectivas: odts.filter((o) => (o.tipo ?? 'correctiva') === 'correctiva').length,
    odtPreventivas: odts.filter((o) => o.tipo === 'preventiva').length,
    costoTotal: cerradas.reduce((a, o) => a + (o.costo ?? 0), 0),
    horasPromedioResolucion: horas.length
      ? Math.round(horas.reduce((a, b) => a + b, 0) / horas.length)
      : null,
  });
}

// ───────────────────── Reportes de USUARIOS (brief §7) ─────────────────────

/** Agrega las métricas de un conjunto de usuarios. */
function agregarMetricasUsuarios(us: DriverProfile[]): UserReportMetrics {
  return {
    usuarios: us.length,
    kmRecorridos: sum(us.map((u) => u.metrics.kmRecorridos)),
    diasConducidos: sum(us.map((u) => u.metrics.diasConducidos)),
    horasConducidas: sum(us.map((u) => u.metrics.horasConducidas)),
    recargas: sum(us.map((u) => u.metrics.recargas.length)),
    litros: sum(us.map((u) => sum(u.metrics.recargas.map((r) => r.litros)))),
    otReportadas: sum(us.map((u) => u.metrics.otReportadas)),
  };
}

/** Texto legible del alcance de un reporte de usuarios. */
function tituloUsuarios(scope: UserReportScope, usuarios: DriverProfile[]): string {
  if (scope.tipo === 'general') return 'Todos los usuarios';
  if (scope.tipo === 'flota')
    return `Usuarios del área: ${scope.areaId ? nombreArea(scope.areaId) : '—'}`;
  if (scope.tipo === 'grupo') return `Grupo de ${usuarios.length} usuario(s)`;
  return usuarios[0] ? `Usuario: ${usuarios[0].nombre}` : 'Usuario';
}

/**
 * Genera un reporte de USUARIOS para un alcance (brief §7): general, por grupo
 * de flota, por un conjunto de usuarios, o de un usuario. Separado de los
 * reportes de vehículos.
 *
 * TODO API: POST /empresas/:companyId/reportes-usuarios
 */
export async function getReporteUsuarios(scope: UserReportScope): Promise<UserReport> {
  const todos = perfilesDeEmpresa(scope.companyId);

  let usuarios = todos;
  if (scope.tipo === 'usuario' || scope.tipo === 'grupo') {
    const ids = scope.userIds ?? [];
    usuarios = todos.filter((u) => ids.includes(u.id));
  } else if (scope.tipo === 'flota') {
    // Usuarios que han usado algún vehículo del área elegida.
    const vehIds = MOCK_FLEET.filter((f) => f.vehicle.areaId === scope.areaId).map(
      (f) => f.vehicle.id,
    );
    usuarios = todos.filter((u) => u.metrics.vehiculosUsados.some((v) => vehIds.includes(v)));
  }

  return fakeNetwork({
    scope,
    titulo: tituloUsuarios(scope, usuarios),
    periodo: scope.periodo.label,
    metrics: agregarMetricasUsuarios(usuarios),
    usuarios,
  });
}

/**
 * Estadísticas por empresa para la vista comparativa. Si no se pasan ids,
 * compara todas las empresas cliente.
 *
 * TODO API: GET /empresas/estadisticas?ids=...
 */
export async function getComparativaEmpresas(companyIds?: string[]): Promise<CompanyStats[]> {
  const empresas = companyIds
    ? MOCK_COMPANIES.filter((c) => companyIds.includes(c.id))
    : MOCK_COMPANIES;

  const stats = empresas.map((company) => ({
    company,
    metrics: agregarMetricas(unidadesDe(company.id)),
  }));

  return fakeNetwork(stats);
}

/**
 * Empresas accesibles por el usuario, con el color de marca de cada una (para
 * los selectores de chips multi-empresa, brief §8).
 *
 * TODO API: GET /usuarios/me/empresas?conMarca=1
 */
export async function getEmpresasDelUsuarioConColor(
  role: Role,
  companyId?: string,
): Promise<{ company: Company; color: string }[]> {
  const empresas = await getEmpresasDelUsuario(role, companyId);
  return Promise.all(
    empresas.map(async (company) => {
      const brand = await getCompanyBrandById(company.id);
      return { company, color: brand?.primaryColor ?? DEFAULT_BRAND.primaryColor };
    }),
  );
}

/**
 * Comparativa lista para pantalla: estadísticas de las empresas que el usuario
 * puede ver, ya enriquecidas con el color de marca de cada empresa (para el
 * swatch). Encapsula el cruce empresas-del-usuario ↔ stats ↔ marca.
 *
 * TODO API: GET /empresas/estadisticas?delUsuario=me (con color de marca).
 */
export async function getComparativaEmpresasConColor(
  role: Role,
  companyId?: string,
): Promise<(CompanyStats & { color: string })[]> {
  const empresas = await getEmpresasDelUsuario(role, companyId);
  const stats = await getComparativaEmpresas(empresas.map((e) => e.id));

  return Promise.all(
    stats.map(async (s) => {
      const brand = await getCompanyBrandById(s.company.id);
      return { ...s, color: brand?.primaryColor ?? DEFAULT_BRAND.primaryColor };
    }),
  );
}
