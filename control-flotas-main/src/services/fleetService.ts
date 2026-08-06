/**
 * Servicio de flota (capa de datos abstracta).
 *
 * Devuelve hoy datos simulados con la MISMA forma async que tendrá la API
 * real de Juan. Las pantallas ya consumen Promesas, así que migrar a la API
 * es reescribir SOLO el cuerpo de cada función (marcado con «TODO API»),
 * sin tocar tipos ni pantallas.
 */

import { puedeConducir } from '@/auth/permissions';
import { supabase } from '@/lib/supabase';
import type { DriverScore, Emparejamiento, LatLng, User, Vehicle, VehicleTelemetry } from '@/types';

import { getSesionPin, vehiculosDondeEsSecundario } from './asignacionService';
import { getCoordsVehiculoSync, getVehiculo, getVehiculoDePrincipalSync } from './companyService';
import { esIdDb } from './db';
import { fakeNetwork } from './network';

// ───────────────────────────── DATOS MOCK ─────────────────────────────────
// Reemplazar por la respuesta real de la API. Vehículo de ejemplo asignado
// al conductor (emparejamiento usuario↔vehículo vía chip, brief sección 5).
// Hay uno por empresa para que la OT que genere el conductor caiga en SU
// empresa (los ids existen en la flota de `companyService`).

const MOCK_VEHICLES_POR_EMPRESA: Record<string, Vehicle> = {
  Samfor: {
    id: 'veh-014',
    companyId: 'Samfor',
    marca: 'Toyota',
    modelo: 'Hilux',
    anio: 2022,
    placa: 'AB123CD',
    numero: 'U-014',
    tipo: 'camioneta',
  },
  petrosur: {
    id: 'veh-101',
    companyId: 'petrosur',
    marca: 'Kenworth',
    modelo: 'T370',
    anio: 2023,
    placa: 'PS101AA',
    numero: 'P-101',
    tipo: 'camion',
  },
};

const MOCK_VEHICLE: Vehicle = MOCK_VEHICLES_POR_EMPRESA.Samfor;

const MOCK_TELEMETRY: VehicleTelemetry = {
  vehicleId: 'veh-014',
  estado: 'en_marcha',
  caja: 'D',
  velocidadKmh: 54,
  combustiblePct: 72,
  aceitePct: 61,
  tempMotorC: 89,
  estadoAceite: 'bueno',
  personasABordo: 2,
  ubicacionTexto: 'Av. Intercomunal, Maracaibo',
  km: 84230,
  actualizadoEn: new Date().toISOString(),
};

const MOCK_SCORE: DriverScore = {
  userId: 'mock',
  excesosVelocidad100km: 1.2,
  frenadasBruscas100km: 0.8,
  aceleracionesBruscas100km: 0.5,
  scoreTotal: 76,
  // El rango lo decide el backend según sus reglas; aquí va precalculado.
  rango: 'amarillo',
};

// ───────────────────────────── SERVICIOS ──────────────────────────────────

/**
 * Vehículo que el conductor maneja ahora mismo (emparejado por chip). Se elige
 * según la empresa del usuario para que las OT que genere queden en su empresa.
 *
 * TODO API: GET /conductores/me/vehiculo-actual
 */
export async function getMiVehiculoActual(user?: User): Promise<Vehicle> {
  const vehiculo =
    (user?.companyId && MOCK_VEHICLES_POR_EMPRESA[user.companyId]) || MOCK_VEHICLE;
  return fakeNetwork(vehiculo);
}

/**
 * Vehículo que le corresponde al conductor: su unidad ASIGNADA. Todo conductor
 * tiene una unidad asignada que ve y monitorea SIEMPRE (aunque en el momento la
 * esté manejando otra persona con su chip). Solo los conductores tienen unidad
 * (los administradores usan el panel).
 *
 * TODO API: GET /conductores/me/emparejamiento  (lo resolverá el GPS de Juan a
 * partir de qué chip está enviando señal en qué vehículo).
 */
export async function getEmparejamientoActual(user?: User): Promise<Emparejamiento> {
  // Sin usuario, o no conduce: no hay unidad.
  if (!user || !puedeConducir(user)) {
    return fakeNetwork({ emparejado: false, vehicle: null }, 500);
  }
  const vehicle = (user.companyId && MOCK_VEHICLES_POR_EMPRESA[user.companyId]) || MOCK_VEHICLE;
  return fakeNetwork({ emparejado: true, vehicle }, 500);
}

/**
 * Telemetría en vivo de un vehículo.
 *
 * TODO API: GET /vehiculos/:vehicleId/telemetria  (o suscripción por websocket
 * cuando se defina el tiempo real con Juan).
 */
export async function getTelemetria(vehicleId: string): Promise<VehicleTelemetry> {
  return fakeNetwork({ ...MOCK_TELEMETRY, vehicleId });
}

/**
 * Score de manejo del conductor.
 *
 * TODO API: GET /conductores/:userId/score
 */
export async function getMiScore(userId: string): Promise<DriverScore> {
  return fakeNetwork({ ...MOCK_SCORE, userId });
}

// ─────────────── Sesión de conducción (FOM-02 §3.5 / §4.3) ─────────────────

/** Qué vehículo le corresponde al usuario ahora mismo, y a qué título. */
export interface SesionConduccion {
  vehicle: Vehicle;
  /**
   * `secundario`: PIN activo en el GPS de la unidad · `principal`: es el
   * titular · `chip`: emparejamiento legado (conductores del modelo viejo).
   */
  via: 'principal' | 'secundario' | 'chip';
}

/**
 * Resuelve la sesión de conducción (FOM-02 §3.5): el conductor actual de una
 * unidad es el SECUNDARIO ACTIVO (PIN) ?? el PRINCIPAL. El principal SIEMPRE ve
 * su unidad asignada (el gate ya no depende del chip). Los conductores del
 * modelo legado conservan el emparejamiento por chip para no romper nada.
 *
 * TODO API: GET /conductores/me/sesion-conduccion
 */
export async function getSesionConduccion(user?: User): Promise<SesionConduccion | null> {
  if (!user || !puedeConducir(user)) return fakeNetwork(null, 300);

  // 1) Uso temporal por PIN (§4.3): su app muestra ESA unidad mientras la use.
  const pin = getSesionPin(user.id);
  if (pin) {
    const vehicle = await getVehiculo(pin.vehicleId);
    if (vehicle) return fakeNetwork({ vehicle, via: 'secundario' as const }, 300);
  }

  // 2) Titularidad (§3.5): el principal siempre ve su unidad.
  //    BD provisional: los conductores reales buscan su unidad en Supabase.
  if (supabase && esIdDb(user.id)) {
    const { data } = await supabase
      .from('vehiculos')
      .select('id')
      .eq('conductor_principal_id', user.id)
      .limit(1)
      .maybeSingle();
    const idVehiculo = (data as { id: string } | null)?.id;
    if (idVehiculo) {
      const vehicle = await getVehiculo(idVehiculo);
      if (vehicle) return { vehicle, via: 'principal' };
    }
  }
  const propia = getVehiculoDePrincipalSync(user.id);
  if (propia) return fakeNetwork({ vehicle: propia, via: 'principal' as const }, 300);

  // 3) Legado (rol `driver`): emparejamiento por chip. Los roles nuevos
  //    (`conductor`) no usan chip: sin titularidad ni PIN, no hay unidad.
  if (user.role === 'driver') {
    const emp = await getEmparejamientoActual(user);
    if (emp.emparejado && emp.vehicle) return { vehicle: emp.vehicle, via: 'chip' };
  }
  return fakeNetwork(null, 300);
}

/**
 * Posición actual (mock) de un vehículo para el mapa de DOS puntos (§8-8):
 * la del vehículo viene del GPS del equipo; la tuya, del teléfono.
 *
 * TODO API: GET /vehiculos/:id/posicion
 */
export async function getPosicionVehiculo(vehicleId: string): Promise<LatLng | null> {
  if (supabase && esIdDb(vehicleId)) {
    const { data } = await supabase.from('vehiculos').select('lat, lng').eq('id', vehicleId).maybeSingle();
    const f = data as { lat: number | null; lng: number | null } | null;
    return f && f.lat != null && f.lng != null ? { lat: f.lat, lng: f.lng } : null;
  }
  return fakeNetwork(getCoordsVehiculoSync(vehicleId), 200);
}

/** Unidades donde el usuario está autorizado como secundario (para simular §4.3). */
export async function getMisUnidadesSecundario(
  userId: string,
): Promise<{ vehicle: Vehicle; nombre: string }[]> {
  const autorizaciones = vehiculosDondeEsSecundario(userId);
  const out: { vehicle: Vehicle; nombre: string }[] = [];
  for (const a of autorizaciones) {
    const v = await getVehiculo(a.vehicleId);
    if (v) out.push({ vehicle: v, nombre: v.alias ?? v.numero });
  }
  return fakeNetwork(out, 300);
}
