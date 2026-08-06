# TANDA 3 — Volcado íntegro de archivos (Órdenes de Trabajo) — Parte 1 de 2

> Contenido completo y literal de los archivos solicitados, sin resumir ni recortar.
> Parte 1: capa de datos (servicios) + tipos de OT.
> Parte 2 (pantallas, componente y sección NOTAS): ver `TANDA3_OT_b.md`.

---

### `src/services/companyService.ts`

```ts
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

import { DEFAULT_BRAND } from '@/theme';
import type {
  Company,
  CompanyStats,
  DriverProfile,
  FleetGroup,
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
  WorkOrder,
  WorkOrderListItem,
  WorkOrderStatus,
} from '@/types';

import { getCompanyBrandById } from './brandService';
import { fakeNetwork } from './network';
import { getIdConductorPorNombre, getNombreConductor, perfilesDeEmpresa } from './userService';

// ───────────────────────────── DATOS MOCK ─────────────────────────────────

/** Empresas cliente con flota propia (las que un admin puede mirar). */
const MOCK_COMPANIES: Company[] = [
  { id: 'Samfor', name: 'Samfor' },
  { id: 'petrosur', name: 'Petrosur' },
];

/**
 * Grupos de flota por empresa. Cada empresa los estructura distinto; estos son
 * de ejemplo. Cada vehículo (abajo) referencia uno por `groupId`.
 */
const MOCK_GROUPS: FleetGroup[] = [
  { id: 'grp-sam-personal', companyId: 'Samfor', name: 'Transporte de personal' },
  { id: 'grp-sam-campo', companyId: 'Samfor', name: 'Operaciones en campo' },
  { id: 'grp-sam-carga', companyId: 'Samfor', name: 'Carga' },
  { id: 'grp-pet-personal', companyId: 'petrosur', name: 'Transporte de personal' },
  { id: 'grp-pet-campo', companyId: 'petrosur', name: 'Operaciones en campo' },
  { id: 'grp-pet-carga', companyId: 'petrosur', name: 'Carga' },
];

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
const MOCK_FLEET: MockFleetUnit[] = [
  {
    vehicle: { id: 'veh-014', companyId: 'Samfor', marca: 'Toyota', modelo: 'Hilux', anio: 2022, placa: 'AB123CD', numero: 'U-014', groupId: 'grp-sam-personal' },
    estado: 'en_marcha', velocidadKmh: 54, conductorActual: 'José Marrufo', coords: { lat: 10.6545, lng: -71.6405 },
    km: 3120, indiceSeguro: 78, excesosVelocidad: 6, frenadasBruscas: 4, aceleracionesBruscas: 3,
  },
  {
    vehicle: { id: 'veh-022', companyId: 'Samfor', marca: 'Ford', modelo: 'F-150', anio: 2021, placa: 'CF884KK', numero: 'U-022', groupId: 'grp-sam-personal' },
    // Parada y sin conductor ahora: su conductora habitual (María Chourio) no
    // está manejando en este momento (aparece "inactiva" en la lista de usuarios).
    estado: 'parada', velocidadKmh: 0, conductorActual: null, coords: { lat: 10.6712, lng: -71.6128 },
    km: 2740, indiceSeguro: 91, excesosVelocidad: 1, frenadasBruscas: 1, aceleracionesBruscas: 0,
  },
  {
    vehicle: { id: 'veh-031', companyId: 'Samfor', marca: 'Chevrolet', modelo: 'Silverado', anio: 2020, placa: 'DG201LM', numero: 'U-031', groupId: 'grp-sam-campo' },
    estado: 'parada', velocidadKmh: 0, conductorActual: 'Pedro Villalobos', coords: { lat: 10.6389, lng: -71.6602 },
    km: 1980, indiceSeguro: 64, excesosVelocidad: 11, frenadasBruscas: 7, aceleracionesBruscas: 5,
  },
  {
    vehicle: { id: 'veh-045', companyId: 'Samfor', marca: 'Toyota', modelo: 'Land Cruiser', anio: 2023, placa: 'EH552NP', numero: 'U-045', groupId: 'grp-sam-campo' },
    estado: 'en_marcha', velocidadKmh: 61, conductorActual: 'Luis Atencio', coords: { lat: 10.6901, lng: -71.6350 },
    km: 3560, indiceSeguro: 86, excesosVelocidad: 3, frenadasBruscas: 2, aceleracionesBruscas: 1,
  },
  {
    vehicle: { id: 'veh-052', companyId: 'Samfor', marca: 'Nissan', modelo: 'Frontier', anio: 2019, placa: 'FJ339QR', numero: 'U-052', groupId: 'grp-sam-carga' },
    estado: 'parada', velocidadKmh: 0, conductorActual: null, coords: { lat: 10.6233, lng: -71.6281 },
    km: 2210, indiceSeguro: 72, excesosVelocidad: 5, frenadasBruscas: 5, aceleracionesBruscas: 4,
  },
  {
    vehicle: { id: 'veh-067', companyId: 'Samfor', marca: 'Ford', modelo: 'Ranger', anio: 2022, placa: 'GK710ST', numero: 'U-067', groupId: 'grp-sam-carga' },
    estado: 'en_marcha', velocidadKmh: 47, conductorActual: 'Carla Romero', coords: { lat: 10.6620, lng: -71.6489 },
    km: 2990, indiceSeguro: 83, excesosVelocidad: 4, frenadasBruscas: 3, aceleracionesBruscas: 2,
  },

  // Flota de Petrosur (otra empresa, para comparar). Alrededor de Cabimas.
  {
    vehicle: { id: 'veh-101', companyId: 'petrosur', marca: 'Toyota', modelo: 'Hilux', anio: 2023, placa: 'PS101AA', numero: 'P-101', groupId: 'grp-pet-personal' },
    estado: 'en_marcha', velocidadKmh: 58, conductorActual: 'Ramón Bracho', coords: { lat: 10.4015, lng: -71.4521 },
    km: 4120, indiceSeguro: 69, excesosVelocidad: 9, frenadasBruscas: 6, aceleracionesBruscas: 5,
  },
  {
    vehicle: { id: 'veh-102', companyId: 'petrosur', marca: 'Chevrolet', modelo: 'Silverado', anio: 2021, placa: 'PS102BB', numero: 'P-102', groupId: 'grp-pet-personal' },
    estado: 'parada', velocidadKmh: 0, conductorActual: 'Yelitza Soto', coords: { lat: 10.4102, lng: -71.4380 },
    km: 3380, indiceSeguro: 88, excesosVelocidad: 2, frenadasBruscas: 1, aceleracionesBruscas: 1,
  },
  {
    vehicle: { id: 'veh-103', companyId: 'petrosur', marca: 'Ford', modelo: 'F-150', anio: 2020, placa: 'PS103CC', numero: 'P-103', groupId: 'grp-pet-campo' },
    estado: 'en_marcha', velocidadKmh: 44, conductorActual: 'Gustavo Pirela', coords: { lat: 10.3890, lng: -71.4602 },
    km: 2860, indiceSeguro: 75, excesosVelocidad: 5, frenadasBruscas: 4, aceleracionesBruscas: 3,
  },
  {
    vehicle: { id: 'veh-104', companyId: 'petrosur', marca: 'Nissan', modelo: 'Frontier', anio: 2022, placa: 'PS104DD', numero: 'P-104', groupId: 'grp-pet-campo' },
    estado: 'en_marcha', velocidadKmh: 52, conductorActual: 'Daniela Faría', coords: { lat: 10.4188, lng: -71.4455 },
    km: 3640, indiceSeguro: 81, excesosVelocidad: 4, frenadasBruscas: 3, aceleracionesBruscas: 2,
  },
  {
    vehicle: { id: 'veh-105', companyId: 'petrosur', marca: 'Toyota', modelo: 'Land Cruiser', anio: 2019, placa: 'PS105EE', numero: 'P-105', groupId: 'grp-pet-carga' },
    estado: 'parada', velocidadKmh: 0, conductorActual: 'Héctor Nava', coords: { lat: 10.3955, lng: -71.4310 },
    km: 2120, indiceSeguro: 60, excesosVelocidad: 13, frenadasBruscas: 8, aceleracionesBruscas: 6,
  },
];

// Órdenes de trabajo de las flotas (brief sección 8). Mutable: el admin puede
// avanzar su estado y debe persistir durante la sesión.
// Las URLs de evidencia son fotos de ejemplo (placeholder); en real vendrán del
// backend tras subir las fotos del conductor.
// Cada OT tiene un AUTOR real (driverId del conductor que la reportó), no el
// conductor "actual" del vehículo: una unidad parada sin conductor igual pudo
// haber generado una OT cuando alguien la manejaba (corrige el bug §2).
const MOCK_WORK_ORDERS: WorkOrder[] = [
  { id: 'wo-301', vehicleId: 'veh-031', driverId: 'drv-sam-3', descripcion: 'Frenos hacen ruido al detenerse; el pedal vibra.', tipoFalla: 'frenos', estado: 'Enviada', creadaEn: hace(2), ubicacionTexto: 'Av. La Limpia, Maracaibo', evidenciaUrls: ['https://picsum.photos/seed/wo301a/600/400', 'https://picsum.photos/seed/wo301b/600/400'] },
  { id: 'wo-298', vehicleId: 'veh-014', driverId: 'usr-sam-1', descripcion: 'Testigo de temperatura del motor encendido en ralentí.', tipoFalla: 'motor', estado: 'Revisada', creadaEn: hace(8), ubicacionTexto: 'Av. Intercomunal, Maracaibo', evidenciaUrls: ['https://picsum.photos/seed/wo298/600/400'] },
  { id: 'wo-292', vehicleId: 'veh-052', driverId: 'usr-sam-2', descripcion: 'Neumático trasero derecho con desgaste irregular.', tipoFalla: 'neumaticos', estado: 'Realizada', creadaEn: hace(26), ubicacionTexto: 'Sector Los Haticos, Maracaibo', evidenciaUrls: ['https://picsum.photos/seed/wo292/600/400'] },
  { id: 'wo-289', vehicleId: 'veh-067', driverId: 'drv-sam-5', descripcion: 'Aire acondicionado no enfría; revisar sistema eléctrico.', tipoFalla: 'electrico', estado: 'Enviada', creadaEn: hace(30), ubicacionTexto: 'Av. Bella Vista, Maracaibo', evidenciaUrls: ['https://picsum.photos/seed/wo289/600/400'] },
  // Petrosur
  { id: 'wo-410', vehicleId: 'veh-101', driverId: 'usr-pet-1', descripcion: 'Vibración fuerte del volante a alta velocidad.', tipoFalla: 'neumaticos', estado: 'Enviada', creadaEn: hace(5), ubicacionTexto: 'Carretera Lara-Zulia, Cabimas', evidenciaUrls: ['https://picsum.photos/seed/wo410/600/400'] },
  { id: 'wo-405', vehicleId: 'veh-105', driverId: 'drv-pet-5', descripcion: 'Pérdida de aceite bajo el motor.', tipoFalla: 'motor', estado: 'Revisada', creadaEn: hace(14), ubicacionTexto: 'Av. Andrés Bello, Cabimas', evidenciaUrls: ['https://picsum.photos/seed/wo405/600/400'] },
  { id: 'wo-401', vehicleId: 'veh-103', driverId: 'drv-pet-3', descripcion: 'Luz de check engine intermitente.', tipoFalla: 'motor', estado: 'Realizada', creadaEn: hace(40), ubicacionTexto: 'Sector La Rosa, Cabimas' },
];

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

/** Empresas cliente (para servicios que necesitan iterar todas, ej. costos). */
export function listarEmpresasMock(): Company[] {
  return MOCK_COMPANIES;
}

/** Proyección pública de una unidad al `FleetVehicle` del dashboard. */
function toFleetVehicle(u: MockFleetUnit): FleetVehicle {
  return {
    vehicle: u.vehicle,
    estado: u.estado,
    velocidadKmh: u.velocidadKmh,
    conductorActual: u.conductorActual,
    // Enlaza el nombre del conductor con su id para abrir su perfil.
    conductorId: u.conductorActual ? (getIdConductorPorNombre(u.conductorActual) ?? null) : null,
    coords: u.coords,
  };
}

/** Reportes abiertos (no realizados) de un conjunto de vehículos. */
function reportesAbiertosDe(vehicleIds: string[]): number {
  return MOCK_WORK_ORDERS.filter(
    (wo) => vehicleIds.includes(wo.vehicleId) && wo.estado !== 'Realizada',
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

/** Nombre del grupo de flota por id. */
function nombreGrupo(groupId: string): string {
  return MOCK_GROUPS.find((g) => g.id === groupId)?.name ?? 'Sin grupo';
}

/**
 * Desglose por vehículo: cada vehículo con su grupo y sus datos del período
 * (sin conductor: el reporte es del vehículo, brief §6).
 */
function desglosePorVehiculo(unidades: MockFleetUnit[]): VehicleReportRow[] {
  return unidades.map((u) => ({
    vehicle: u.vehicle,
    groupName: nombreGrupo(u.vehicle.groupId),
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

// ───────────────────────────── SERVICIOS ──────────────────────────────────

/**
 * Empresas que un usuario puede mirar, según su rol (brief §5):
 *  - companyAdmin: solo la suya.
 *  - generalAdmin / superAdmin: todas las empresas cliente.
 *
 * TODO API: GET /usuarios/me/empresas
 */
export async function getEmpresasDelUsuario(role: Role, companyId?: string): Promise<Company[]> {
  if (role === 'generalAdmin' || role === 'superAdmin') {
    return fakeNetwork(MOCK_COMPANIES);
  }
  const propia = MOCK_COMPANIES.find((c) => c.id === companyId);
  return fakeNetwork(propia ? [propia] : []);
}

/**
 * Resumen de la flota para las tarjetas superiores del dashboard.
 *
 * TODO API: GET /empresas/:companyId/flota/resumen
 */
export async function getResumenFlota(companyId: string): Promise<FleetSummary> {
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
  return fakeNetwork(unidadesDe(companyId).map(toFleetVehicle));
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
  // El vehículo del admin se ancla al grupo "personal" de su empresa, si existe.
  const grupo = MOCK_GROUPS.find((g) => g.companyId === user.companyId);
  const fleetVehicle: FleetVehicle = {
    vehicle: {
      id: `adm-${user.id}`,
      companyId: user.companyId,
      marca: 'Toyota',
      modelo: 'Hilux',
      anio: 2023,
      placa: 'ADM-001',
      numero: 'U-001',
      groupId: grupo?.id ?? '',
    },
    estado: 'en_marcha',
    velocidadKmh: 42,
    conductorActual: user.name,
    conductorId: user.id,
    coords: { lat: 10.668, lng: -71.624 },
  };
  return fakeNetwork(fleetVehicle);
}

/**
 * Grupos de flota de una empresa.
 *
 * TODO API: GET /empresas/:companyId/grupos-de-flota
 */
export async function getGruposDeFlota(companyId: string): Promise<FleetGroup[]> {
  return fakeNetwork(MOCK_GROUPS.filter((g) => g.companyId === companyId));
}

/** Enriquece una OT con etiquetas legibles (vehículo + AUTOR de la OT). */
function enriquecerOrden(wo: WorkOrder): WorkOrderListItem {
  const v = MOCK_FLEET.find((x) => x.vehicle.id === wo.vehicleId)?.vehicle;
  return {
    ...wo,
    vehicleLabel: v ? `${v.numero} · ${v.marca} ${v.modelo}` : wo.vehicleId,
    // El nombre viene del AUTOR (driverId), no del conductor actual del vehículo.
    driverName: getNombreConductor(wo.driverId) ?? 'Conductor',
  };
}

/**
 * Registra una OT nueva en el almacén (la que crea un conductor desde su vista).
 * Así aparece de inmediato en el panel del admin de su empresa (brief §2).
 */
export function registrarOrden(orden: WorkOrder): void {
  MOCK_WORK_ORDERS.unshift(orden);
}

/**
 * Órdenes de trabajo de la empresa (fallas reportadas por los conductores),
 * enriquecidas y ordenadas de la más nueva a la más vieja.
 *
 * TODO API: GET /empresas/:companyId/ordenes-de-trabajo
 */
export async function getOrdenesDeTrabajo(companyId: string): Promise<WorkOrderListItem[]> {
  const ids = unidadesDe(companyId).map((u) => u.vehicle.id);
  const items = MOCK_WORK_ORDERS.filter((wo) => ids.includes(wo.vehicleId))
    .slice()
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
    .map(enriquecerOrden);
  return fakeNetwork(items);
}

/**
 * Detalle de una orden de trabajo por id.
 *
 * TODO API: GET /ordenes-de-trabajo/:id
 */
export async function getOrdenDeTrabajo(id: string): Promise<WorkOrderListItem | null> {
  const wo = MOCK_WORK_ORDERS.find((x) => x.id === id);
  return fakeNetwork(wo ? enriquecerOrden(wo) : null);
}

/**
 * Cambia el estado de una orden de trabajo (Enviada → Revisada → En proceso →
 * Realizada). Muta el mock en memoria para que persista durante la sesión. Al
 * marcar Realizada, opcionalmente guarda la nota de solución y el costo.
 *
 * TODO API: PATCH /ordenes-de-trabajo/:id  { estado, notaSolucion?, costo? }
 */
export async function actualizarEstadoOrden(
  id: string,
  estado: WorkOrderStatus,
  extras?: { notaSolucion?: string; costo?: number },
): Promise<WorkOrderListItem> {
  const wo = MOCK_WORK_ORDERS.find((x) => x.id === id);
  if (!wo) throw new Error('Orden de trabajo no encontrada.');
  wo.estado = estado;
  if (extras) {
    if (extras.notaSolucion !== undefined) wo.notaSolucion = extras.notaSolucion;
    if (extras.costo !== undefined) wo.costo = extras.costo;
  }
  return fakeNetwork(enriquecerOrden(wo));
}

/**
 * Genera un reporte de VEHÍCULOS para un alcance (brief §6): general (toda la
 * empresa), flota (un grupo de flota), grupo (vehículos elegidos a mano) o un
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
    // "Flota" = un grupo de flota concreto.
    unidades = todas.filter((u) => u.vehicle.groupId === scope.groupId);
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
  if (scope.tipo === 'flota') return `Grupo: ${scope.groupId ? nombreGrupo(scope.groupId) : '—'}`;
  if (scope.tipo === 'grupo') return `Grupo de ${unidades.length} vehículo(s)`;
  const v = unidades[0]?.vehicle;
  return v ? `Vehículo ${v.numero} · ${v.marca} ${v.modelo}` : 'Vehículo';
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
    return `Usuarios del grupo: ${scope.groupId ? nombreGrupo(scope.groupId) : '—'}`;
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
    // Usuarios que han usado algún vehículo del grupo elegido.
    const vehIds = MOCK_FLEET.filter((f) => f.vehicle.groupId === scope.groupId).map(
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
```

---

### `src/services/workOrderService.ts`

```ts
/**
 * Servicio de órdenes de trabajo / reportes de falla (capa de datos mock).
 *
 * Misma forma async que tendrá la API real. Migrar = reescribir el cuerpo
 * marcado con «TODO API», sin tocar pantallas ni tipos.
 */

import { encolar } from '@/sync/outbox';
import type { FaultType, WorkOrder } from '@/types';

import { registrarOrden } from './companyService';
import { fakeNetwork } from './network';

/**
 * Datos que aporta el conductor + los que se rellenan solos (vehículo,
 * conductor, ubicación; la fecha/hora la pone el servidor). Ver brief, sección 8.
 */
export interface NuevaOrdenInput {
  vehicleId: string;
  driverId: string;
  /** Descripción de la falla (obligatoria). */
  descripcion: string;
  /** Tipo de falla (opcional). */
  tipoFalla?: FaultType;
  ubicacionTexto: string;
  /** URIs locales de la evidencia (foto obligatoria; se subirán al backend). */
  evidenciaUris: string[];
}

let _secuencia = 1000;

/**
 * Crea una orden de trabajo en estado inicial "Enviada".
 *
 * Offline-first: la OT se registra localmente de una vez y su envío al servidor
 * se encola (se manda ya si hay conexión, o al reconectar).
 *
 * TODO API: POST /ordenes (multipart: datos + archivos de evidencia).
 */
export async function crearOrdenDeTrabajo(input: NuevaOrdenInput): Promise<WorkOrder> {
  const orden: WorkOrder = {
    id: `wo-${++_secuencia}`,
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    descripcion: input.descripcion.trim(),
    tipoFalla: input.tipoFalla,
    estado: 'Enviada',
    creadaEn: new Date().toISOString(),
    ubicacionTexto: input.ubicacionTexto,
    evidenciaUrls: input.evidenciaUris,
  };
  // Persiste la OT en el almacén que lee el admin (de punta a punta, §2).
  registrarOrden(orden);
  // Encola el viaje al servidor (inmediato si hay red, diferido si no).
  await encolar('ot', `Orden de trabajo ${orden.id}`, async () => {
    await fakeNetwork(undefined, 500);
    // TODO API: POST /ordenes
  });
  return orden;
}
```

---

### Extracto de `src/types/index.ts` — tipos de Órdenes de Trabajo

> Sección "Órdenes de trabajo" tal cual aparece en el archivo (`WorkOrderStatus`,
> `WORK_ORDER_STATUSES`, `FaultType`, `WorkOrder`, `WorkOrderListItem`). Estos tipos solo referencian
> primitivos (`string`, `number`) y entre sí; no dependen de otros tipos del dominio.

```ts
// ──────────────────────────── Órdenes de trabajo ─────────────────────────

/**
 * Estados de una orden de trabajo, en orden de avance (brief §8):
 * Enviada → Revisada (al abrirla el admin) → En proceso (en taller) → Realizada.
 */
export type WorkOrderStatus = 'Enviada' | 'Revisada' | 'En proceso' | 'Realizada';

/** Estados de OT en su orden de progreso (para selectores y avance). */
export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'Enviada',
  'Revisada',
  'En proceso',
  'Realizada',
];

/** Tipo de falla (opcional al reportar). */
export type FaultType = 'motor' | 'frenos' | 'neumaticos' | 'electrico' | 'carroceria' | 'otro';

/** Orden de trabajo / reporte de falla. */
export interface WorkOrder {
  id: string;
  vehicleId: string;
  driverId: string;
  descripcion: string;
  /** Tipo de falla, si el conductor lo indicó. */
  tipoFalla?: FaultType;
  estado: WorkOrderStatus;
  /** Marca de tiempo ISO de creación. */
  creadaEn: string;
  ubicacionTexto: string;
  /** Evidencia adjunta por el conductor (URLs de fotos). */
  evidenciaUrls?: string[];
  /** Nota de solución que escribe el admin al marcar Realizada (opcional). */
  notaSolucion?: string;
  /** Costo de la solución (opcional). */
  costo?: number;
}

/**
 * Orden de trabajo enriquecida para listas de administración: añade las
 * etiquetas legibles (vehículo y conductor) que el admin necesita ver de un
 * vistazo, resueltas en la capa de servicios a partir de los ids.
 */
export interface WorkOrderListItem extends WorkOrder {
  /** Etiqueta del vehículo, ej. "U-014 · Toyota Hilux". */
  vehicleLabel: string;
  /** Nombre del conductor que generó el reporte. */
  driverName: string;
}
```

---

*Fin de la Parte 1. Continúa en `TANDA3_OT_b.md` (pantallas + componente + NOTAS).*
