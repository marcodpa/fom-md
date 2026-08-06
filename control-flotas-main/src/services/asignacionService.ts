/**
 * Servicio de áreas y titularidad de vehículos (FOM-02 §3.1 y §3.5, mock).
 *
 * El supervisor de empresa crea ÁREAS (por ubicación, sector o contrato) y
 * asigna: vehículo → área, conductor PRINCIPAL → vehículo, y conductores
 * SECUNDARIOS autorizados con PIN (solo si el GPS de la unidad soporta PIN).
 * Misma forma async que la API real («TODO API»).
 */

import { supabase } from '@/lib/supabase';
import type { Area, AreaTipo, ConductorSecundario, Vehicle } from '@/types';

import { getVehiculo, patchVehiculo, setConductorActual } from './companyService';
import { empresaIdDe, esIdDb } from './db';
import { getGpsDeVehiculo } from './gpsService';
import { fakeNetwork, seed } from './network';
import { getNombreConductor } from './userService';

// ───────────────────────────── DATOS MOCK ─────────────────────────────────

// Áreas de ejemplo de Samfor: una por cada naturaleza del documento (§3.1).
// Petrosur tiene las suyas: cada empresa estructura su flota con SUS áreas.
const MOCK_AREAS: Area[] = seed<Area>([
  { id: 'area-sam-base', companyId: 'Samfor', nombre: 'Base Maturín', tipo: 'ubicacion' },
  { id: 'area-sam-produccion', companyId: 'Samfor', nombre: 'Producción', tipo: 'sector' },
  { id: 'area-sam-contrato', companyId: 'Samfor', nombre: 'Contrato Chevron 2026', tipo: 'contrato' },
  { id: 'area-pet-occidente', companyId: 'petrosur', nombre: 'Zona Occidente', tipo: 'ubicacion' },
  { id: 'area-pet-carga', companyId: 'petrosur', nombre: 'Carga pesada', tipo: 'sector' },
]);

/** Nombre de un área por id (para etiquetas de reportes y listas). Interno del mock. */
export function getNombreAreaSync(areaId?: string | null): string | null {
  if (!areaId) return null;
  return MOCK_AREAS.find((a) => a.id === areaId)?.nombre ?? null;
}

// Secundarios autorizados (§3.5): la Unidad 07 (veh-031) con Luis y Carlos,
// el ejemplo literal del documento. El PIN vive en el GPS real; aquí, simulado.
const MOCK_SECUNDARIOS: ConductorSecundario[] = seed<ConductorSecundario>([
  { vehicleId: 'veh-031', userId: 'drv-sam-4', nombre: 'Luis Atencio', pin: '4821' },
  { vehicleId: 'veh-031', userId: 'drv-sam-6', nombre: 'Carlos Paz', pin: '7359' },
]);

let _areaSeq = 10;

/** PIN de 4 dígitos para un secundario (mock; lo generará el sistema real). */
function generarPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ───────────────────────────── ÁREAS (§3.1) ───────────────────────────────

/**
 * Áreas de una empresa.
 *
 * TODO API: GET /empresas/:companyId/areas
 */
export async function getAreas(companyId: string): Promise<Area[]> {
  if (supabase) {
    const empresaId = await empresaIdDe(companyId);
    if (empresaId) {
      const { data } = await supabase
        .from('areas')
        .select('id, nombre, tipo')
        .eq('empresa_id', empresaId)
        .order('nombre');
      if (data) {
        const filas = data as unknown as { id: string; nombre: string; tipo: AreaTipo }[];
        return filas.map((f) => ({ id: f.id, companyId, nombre: f.nombre, tipo: f.tipo }));
      }
    }
  }
  return fakeNetwork(MOCK_AREAS.filter((a) => a.companyId === companyId));
}

/**
 * Crea un área (la crea el supervisor de la empresa, §3.1).
 *
 * TODO API: POST /empresas/:companyId/areas
 */
export async function crearArea(companyId: string, nombre: string, tipo: AreaTipo): Promise<Area> {
  const limpio = nombre.trim();
  if (!limpio) throw new Error('Ponle nombre al área.');

  if (supabase) {
    const empresaId = await empresaIdDe(companyId);
    if (!empresaId) throw new Error('Empresa no encontrada en la base de datos.');
    const { data, error } = await supabase
      .from('areas')
      .insert({ empresa_id: empresaId, nombre: limpio, tipo })
      .select('id, nombre, tipo')
      .single();
    if (error) {
      throw new Error(
        error.code === '23505' ? 'Ya existe un área con ese nombre.' : 'No se pudo crear el área.',
      );
    }
    const f = data as unknown as { id: string; nombre: string; tipo: AreaTipo };
    return { id: f.id, companyId, nombre: f.nombre, tipo: f.tipo };
  }

  if (MOCK_AREAS.some((a) => a.companyId === companyId && a.nombre.toLowerCase() === limpio.toLowerCase())) {
    throw new Error('Ya existe un área con ese nombre.');
  }
  const area: Area = { id: `area-${++_areaSeq}`, companyId, nombre: limpio, tipo };
  MOCK_AREAS.push(area);
  return fakeNetwork(area, 400);
}

/**
 * Asigna (o quita, con `null`) el área de un vehículo (§3.1).
 *
 * TODO API: PATCH /vehiculos/:id { areaId }
 */
export async function asignarVehiculoAArea(vehicleId: string, areaId: string | null): Promise<void> {
  if (supabase && esIdDb(vehicleId)) {
    const { error } = await supabase.from('vehiculos').update({ area_id: areaId }).eq('id', vehicleId);
    if (error) throw new Error('No se pudo asignar el área.');
    return;
  }
  patchVehiculo(vehicleId, { areaId: areaId ?? undefined });
  return fakeNetwork(undefined, 300);
}

// ─────────────────── TITULARIDAD Y SECUNDARIOS (§3.5) ─────────────────────

/**
 * Asigna el conductor PRINCIPAL (titular) de un vehículo (§3.1/§3.5).
 *
 * TODO API: PATCH /vehiculos/:id { conductorPrincipalId }
 */
export async function asignarConductorPrincipal(
  vehicleId: string,
  userId: string | null,
): Promise<void> {
  if (supabase && esIdDb(vehicleId)) {
    const { error } = await supabase
      .from('vehiculos')
      .update({ conductor_principal_id: userId })
      .eq('id', vehicleId);
    if (error) throw new Error('No se pudo asignar el conductor principal.');
    return;
  }
  patchVehiculo(vehicleId, { conductorPrincipalId: userId ?? undefined });
  return fakeNetwork(undefined, 300);
}

/**
 * Secundarios autorizados de un vehículo, con su PIN (§3.5).
 *
 * TODO API: GET /vehiculos/:id/secundarios
 */
export async function getSecundarios(vehicleId: string): Promise<ConductorSecundario[]> {
  if (supabase && esIdDb(vehicleId)) {
    const { data } = await supabase
      .from('conductores_secundarios')
      .select('user_id, pin, perfil:perfiles(nombre)')
      .eq('vehiculo_id', vehicleId);
    if (data) {
      const filas = data as unknown as { user_id: string; pin: string; perfil: { nombre: string } | null }[];
      return filas.map((f) => ({ vehicleId, userId: f.user_id, nombre: f.perfil?.nombre ?? 'Conductor', pin: f.pin }));
    }
    return [];
  }
  return fakeNetwork(MOCK_SECUNDARIOS.filter((s) => s.vehicleId === vehicleId));
}

/**
 * Autoriza a un conductor como SECUNDARIO de un vehículo y le genera su PIN
 * (§3.5). Regla dura: si el GPS de la unidad NO soporta PIN, no hay secundarios.
 *
 * TODO API: POST /vehiculos/:id/secundarios { userId }
 */
export async function autorizarSecundario(
  vehicleId: string,
  userId: string,
): Promise<ConductorSecundario> {
  const gps = await getGpsDeVehiculo(vehicleId);
  if (!gps?.pinSupport) {
    throw new Error('El GPS de esta unidad no soporta identificación por PIN: solo conductor principal.');
  }

  if (supabase && esIdDb(vehicleId)) {
    const pin = generarPin();
    const { error } = await supabase
      .from('conductores_secundarios')
      .insert({ vehiculo_id: vehicleId, user_id: userId, pin });
    if (error) {
      throw new Error(
        error.code === '23505'
          ? 'Ese conductor ya está autorizado en esta unidad.'
          : 'No se pudo autorizar al conductor. Intenta de nuevo.',
      );
    }
    const { data } = await supabase.from('perfiles').select('nombre').eq('id', userId).maybeSingle();
    const nombre = (data as { nombre: string } | null)?.nombre ?? 'Conductor';
    return { vehicleId, userId, nombre, pin };
  }

  if (MOCK_SECUNDARIOS.some((s) => s.vehicleId === vehicleId && s.userId === userId)) {
    throw new Error('Ese conductor ya está autorizado en esta unidad.');
  }
  const entry: ConductorSecundario = {
    vehicleId,
    userId,
    nombre: getNombreConductor(userId) ?? 'Conductor',
    pin: generarPin(),
  };
  MOCK_SECUNDARIOS.push(entry);
  return fakeNetwork(entry, 400);
}

/**
 * Regenera el PIN de un secundario (entrega/rotación del PIN, D8).
 *
 * TODO API: POST /vehiculos/:id/secundarios/:userId/regenerar-pin
 */
export async function regenerarPinSecundario(
  vehicleId: string,
  userId: string,
): Promise<ConductorSecundario> {
  if (supabase && esIdDb(vehicleId)) {
    const pin = generarPin();
    const { data, error } = await supabase
      .from('conductores_secundarios')
      .update({ pin })
      .eq('vehiculo_id', vehicleId)
      .eq('user_id', userId)
      .select('user_id, perfil:perfiles(nombre)')
      .single();
    if (error || !data) throw new Error('Ese conductor no está autorizado en esta unidad.');
    const f = data as unknown as { user_id: string; perfil: { nombre: string } | null };
    return { vehicleId, userId, nombre: f.perfil?.nombre ?? 'Conductor', pin };
  }
  const entry = MOCK_SECUNDARIOS.find((s) => s.vehicleId === vehicleId && s.userId === userId);
  if (!entry) throw new Error('Ese conductor no está autorizado en esta unidad.');
  entry.pin = generarPin();
  return fakeNetwork({ ...entry }, 400);
}

/**
 * Revoca la autorización de un secundario (D8).
 *
 * TODO API: DELETE /vehiculos/:id/secundarios/:userId
 */
export async function revocarSecundario(vehicleId: string, userId: string): Promise<void> {
  if (supabase && esIdDb(vehicleId)) {
    await supabase
      .from('conductores_secundarios')
      .delete()
      .eq('vehiculo_id', vehicleId)
      .eq('user_id', userId);
    return;
  }
  const i = MOCK_SECUNDARIOS.findIndex((s) => s.vehicleId === vehicleId && s.userId === userId);
  if (i >= 0) MOCK_SECUNDARIOS.splice(i, 1);
  return fakeNetwork(undefined, 300);
}

/**
 * ¿Quién está autorizado a usar un vehículo y con qué PIN? (para que la sesión
 * de conducción valide el PIN del secundario, §4.3). Interno del mock.
 */
export function validarPinSecundario(vehicleId: string, pin: string): ConductorSecundario | null {
  return MOCK_SECUNDARIOS.find((s) => s.vehicleId === vehicleId && s.pin === pin) ?? null;
}

/** Vehículos donde el usuario es secundario autorizado (para simular §4.3). */
export function vehiculosDondeEsSecundario(userId: string): ConductorSecundario[] {
  return MOCK_SECUNDARIOS.filter((s) => s.userId === userId);
}

// ───────────── Sesión de uso temporal por PIN (§3.5 / §4.3) ────────────────

/**
 * Sesión de uso temporal: quién está usando qué vehículo tras ingresar su PIN
 * en el GPS. En real la abre el EQUIPO al recibir el PIN; aquí la simula la
 * app. Fuente del "conductor actual = secundario activo ?? principal".
 */
interface SesionPin {
  vehicleId: string;
  userId: string;
  desde: string;
}

const SESIONES_PIN = new Map<string, SesionPin>();

/** Sesión por PIN activa del usuario (o `null`). Interno del mock. */
export function getSesionPin(userId: string): SesionPin | null {
  return SESIONES_PIN.get(userId) ?? null;
}

/**
 * Simula que el conductor ingresa SU PIN en el GPS del vehículo (§4.3): el
 * sistema lo reconoce como conductor ACTUAL temporal; su app muestra esa
 * unidad; los eventos y ODT del lapso quedan a su nombre.
 *
 * TODO API: el equipo real notificará esto por telemetría.
 */
export async function ingresarPinEnGps(
  userId: string,
  vehicleId: string,
  pin: string,
): Promise<Vehicle> {
  const gps = await getGpsDeVehiculo(vehicleId);
  if (!gps?.pinSupport) {
    throw new Error('El GPS de esa unidad no tiene identificación por PIN.');
  }
  const entry = validarPinSecundario(vehicleId, pin.trim());
  if (!entry || entry.userId !== userId) {
    throw new Error('PIN incorrecto para esta unidad. Verifica con tu supervisor.');
  }
  const vehicle = await getVehiculo(vehicleId);
  if (!vehicle) throw new Error('Unidad no encontrada.');
  SESIONES_PIN.set(userId, { vehicleId, userId, desde: new Date().toISOString() });
  // En el mapa del panel, el resumen muestra al secundario como conductor actual.
  setConductorActual(vehicleId, entry.nombre);
  return fakeNetwork(vehicle, 600);
}

/**
 * El secundario deja el vehículo: todo vuelve a asociarse al principal (§4.3).
 */
export async function dejarVehiculo(userId: string): Promise<void> {
  const sesion = SESIONES_PIN.get(userId);
  if (!sesion) return fakeNetwork(undefined, 200);
  SESIONES_PIN.delete(userId);
  const vehicle = await getVehiculo(sesion.vehicleId);
  const principalNombre = vehicle?.conductorPrincipalId
    ? (getNombreConductor(vehicle.conductorPrincipalId) ?? null)
    : null;
  setConductorActual(sesion.vehicleId, principalNombre);
  return fakeNetwork(undefined, 300);
}