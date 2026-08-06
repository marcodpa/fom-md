/**
 * Servicio de equipos GPS + auditoría del alta (FOM-02 §1.2, capa de datos mock).
 *
 * El GPS es una entidad de primera clase: registro en orden estricto (modelo →
 * IMEI único → línea), asociación al vehículo (hereda su empresa), verificación
 * de que reporta posición (con reintento) y prueba opcional del botón de pánico
 * físico. Todo lo específico del hardware real (catálogo de modelos, PIN,
 * pruebas) lo definirá el Sr. Pacheco (D4/D9); aquí se simula con la misma
 * forma async que tendrá la API.
 */

import { supabase } from '@/lib/supabase';
import type { Gps } from '@/types';

import { empresaIdDe, esIdDb } from './db';
import { fakeNetwork, seed } from './network';

// ───────────────────────────── DATOS MOCK ─────────────────────────────────

// GPS ya instalados en la flota existente (los vehículos del mock nacieron
// antes del modelo de GPS; se les asigna su equipo retroactivamente). La mezcla
// de `pinSupport` demuestra la regla §3.5: sin PIN → solo conductor principal.
const MOCK_GPS: Gps[] = seed<Gps>([
  { id: 'gps-014', modelo: 'Teltonika FMC130', imei: '356938035643801', linea: '0414-5550014', vehicleId: 'veh-014', companyId: 'Samfor', verificado: true, pinSupport: false },
  { id: 'gps-022', modelo: 'Teltonika FMC150', imei: '356938035643802', linea: '0414-5550022', vehicleId: 'veh-022', companyId: 'Samfor', verificado: true, pinSupport: true },
  { id: 'gps-031', modelo: 'Teltonika FMC150', imei: '356938035643803', linea: '0414-5550031', vehicleId: 'veh-031', companyId: 'Samfor', verificado: true, pinSupport: true },
  { id: 'gps-045', modelo: 'Teltonika FMC150', imei: '356938035643804', linea: '0424-5550045', vehicleId: 'veh-045', companyId: 'Samfor', verificado: true, pinSupport: true },
  { id: 'gps-052', modelo: 'Queclink GV75', imei: '356938035643805', linea: '0424-5550052', vehicleId: 'veh-052', companyId: 'Samfor', verificado: true, pinSupport: false },
  { id: 'gps-067', modelo: 'Queclink GV75', imei: '356938035643806', linea: '0416-5550067', vehicleId: 'veh-067', companyId: 'Samfor', verificado: true, pinSupport: false },
  { id: 'gps-101', modelo: 'Teltonika FMC130', imei: '356938035644101', linea: '0414-5551101', vehicleId: 'veh-101', companyId: 'petrosur', verificado: true, pinSupport: true },
  { id: 'gps-102', modelo: 'Teltonika FMC130', imei: '356938035644102', linea: '0414-5551102', vehicleId: 'veh-102', companyId: 'petrosur', verificado: true, pinSupport: false },
  { id: 'gps-103', modelo: 'Queclink GV75', imei: '356938035644103', linea: '0424-5551103', vehicleId: 'veh-103', companyId: 'petrosur', verificado: true, pinSupport: false },
  { id: 'gps-104', modelo: 'Teltonika FMC150', imei: '356938035644104', linea: '0416-5551104', vehicleId: 'veh-104', companyId: 'petrosur', verificado: true, pinSupport: true },
  { id: 'gps-105', modelo: 'Queclink GV75', imei: '356938035644105', linea: '0426-5551105', vehicleId: 'veh-105', companyId: 'petrosur', verificado: true, pinSupport: false },
  // Cuenta personal de Ale Sampieri (§5.1: el Admin creó sus vehículos con GPS).
  { id: 'gps-ale-1', modelo: 'Teltonika FMC130', imei: '356938035645001', linea: '0414-5552001', vehicleId: 'veh-ale-1', companyId: 'sampieri', verificado: true, pinSupport: false },
  { id: 'gps-ale-2', modelo: 'Teltonika FMC130', imei: '356938035645002', linea: '0414-5552002', vehicleId: 'veh-ale-2', companyId: 'sampieri', verificado: true, pinSupport: false },
  // Equipos EN STOCK (registrados, sin vehículo): para el alta con GPS existente.
  { id: 'gps-stock-1', modelo: 'Teltonika FMC150', imei: '356938035649001', linea: '0414-5559001', vehicleId: null, companyId: null, verificado: true, pinSupport: true },
  { id: 'gps-stock-2', modelo: 'Queclink GV75', imei: '356938035649002', linea: '0424-5559002', vehicleId: null, companyId: null, verificado: false, pinSupport: false },
]);

let _gpsSeq = 500;

// Intentos de verificación por GPS: el primero falla a propósito para ejercitar
// el camino "NO reporta → revisar línea/configuración → reintentar" (§1.2-3.3).
const _intentosVerificacion = new Map<string, number>();

// ───────────────────────────── SERVICIOS ──────────────────────────────────

/** Datos del registro del equipo, en el orden del instalador (§8-4). */
export interface RegistrarGpsInput {
  /** 1° Modelo del equipo. */
  modelo: string;
  /** 2° IMEI (se valida que sea único). */
  imei: string;
  /** 3° Línea telefónica asociada. */
  linea: string;
  /** Capacidad de PIN del equipo (D4: simulado). */
  pinSupport: boolean;
}

/**
 * Registra un equipo GPS nuevo. Valida IMEI único en todo el sistema.
 *
 * TODO API: POST /gps
 */
export async function registrarGps(input: RegistrarGpsInput): Promise<Gps> {
  const imei = input.imei.trim();

  // BD provisional: el equipo se registra de verdad (IMEI único lo valida la BD).
  if (supabase) {
    const { data, error } = await supabase
      .from('gps')
      .insert({
        modelo: input.modelo.trim(),
        imei,
        linea: input.linea.trim(),
        pin_support: input.pinSupport,
      })
      .select('id, modelo, imei, linea, verificado, pin_support')
      .single();
    if (error) {
      throw new Error(
        error.code === '23505'
          ? 'Ese IMEI ya está registrado en el sistema. Verifica el número del equipo.'
          : 'No se pudo registrar el equipo. Intenta de nuevo.',
      );
    }
    const f = data as unknown as { id: string; modelo: string; imei: string; linea: string; verificado: boolean; pin_support: boolean };
    return { id: f.id, modelo: f.modelo, imei: f.imei, linea: f.linea, vehicleId: null, companyId: null, verificado: f.verificado, pinSupport: f.pin_support };
  }

  if (MOCK_GPS.some((g) => g.imei === imei)) {
    throw new Error('Ese IMEI ya está registrado en el sistema. Verifica el número del equipo.');
  }
  const gps: Gps = {
    id: `gps-${++_gpsSeq}`,
    modelo: input.modelo.trim(),
    imei,
    linea: input.linea.trim(),
    vehicleId: null,
    companyId: null,
    verificado: false,
    pinSupport: input.pinSupport,
  };
  MOCK_GPS.push(gps);
  return fakeNetwork(gps, 500);
}

/**
 * Asocia el GPS a un vehículo; el GPS hereda la empresa del vehículo (§1.2-3.2).
 *
 * TODO API: POST /gps/:id/asociar { vehicleId }
 */
export async function asociarGps(gpsId: string, vehicleId: string, companyId: string): Promise<Gps> {
  // BD: el GPS hereda la empresa; el enlace al vehículo lo sella `vehiculos.gps_id`.
  if (supabase && esIdDb(gpsId)) {
    const empresaId = await empresaIdDe(companyId);
    const { data, error } = await supabase
      .from('gps')
      .update({ empresa_id: empresaId })
      .eq('id', gpsId)
      .select('id, modelo, imei, linea, verificado, pin_support')
      .single();
    if (error || !data) throw new Error('Equipo GPS no encontrado.');
    const f = data as unknown as { id: string; modelo: string; imei: string; linea: string; verificado: boolean; pin_support: boolean };
    return { id: f.id, modelo: f.modelo, imei: f.imei, linea: f.linea, vehicleId, companyId, verificado: f.verificado, pinSupport: f.pin_support };
  }

  const gps = MOCK_GPS.find((g) => g.id === gpsId);
  if (!gps) throw new Error('Equipo GPS no encontrado.');
  gps.vehicleId = vehicleId;
  gps.companyId = companyId;
  return fakeNetwork(gps, 400);
}

/**
 * Verifica que el GPS reporta posición (§1.2-3.3). Mock: el PRIMER intento
 * falla (simula línea sin activar) para ejercitar el reintento; los siguientes
 * verifican bien.
 *
 * TODO API: POST /gps/:id/verificar
 */
export async function verificarGps(gpsId: string): Promise<{ ok: boolean; detalle: string }> {
  const gps = MOCK_GPS.find((g) => g.id === gpsId);
  if (!gps && !esIdDb(gpsId)) throw new Error('Equipo GPS no encontrado.');
  // El primer intento falla a propósito (ejercita el reintento §1.2-3.3) hasta
  // que exista el GPS real del Sr. Pacheco; aplica igual con la BD.
  const intento = (_intentosVerificacion.get(gpsId) ?? 0) + 1;
  _intentosVerificacion.set(gpsId, intento);
  if (intento === 1) {
    return fakeNetwork(
      { ok: false, detalle: 'El equipo no reporta posición. Revisa la línea o la configuración y reintenta.' },
      900,
    );
  }
  if (supabase && esIdDb(gpsId)) {
    const { error } = await supabase.from('gps').update({ verificado: true }).eq('id', gpsId);
    if (error) throw new Error('No se pudo guardar la verificación. Intenta de nuevo.');
  }
  if (gps) gps.verificado = true;
  return fakeNetwork({ ok: true, detalle: 'El equipo reporta posición correctamente.' }, 900);
}

/**
 * Prueba opcional del botón de pánico físico (§1.2-3.3).
 *
 * TODO API: POST /gps/:id/probar-panico
 */
export async function probarPanicoGps(gpsId: string): Promise<boolean> {
  if (supabase && esIdDb(gpsId)) {
    await supabase.from('gps').update({ panico_probado: true }).eq('id', gpsId);
    return fakeNetwork(true, 800);
  }
  const gps = MOCK_GPS.find((g) => g.id === gpsId);
  if (!gps) throw new Error('Equipo GPS no encontrado.');
  gps.panicoProbado = true;
  return fakeNetwork(true, 800);
}

/**
 * Equipos GPS registrados pero SIN vehículo (para el alta: en vez de registrar
 * un equipo nuevo, elegir uno que ya está registrado/conectado).
 *
 * TODO API: GET /gps?disponibles=1
 */
export async function getGpsDisponibles(): Promise<Gps[]> {
  // BD: equipos registrados que ningún vehículo referencia todavía.
  if (supabase) {
    const [{ data: equipos }, { data: usados }] = await Promise.all([
      supabase.from('gps').select('id, modelo, imei, linea, verificado, pin_support'),
      supabase.from('vehiculos').select('gps_id'),
    ]);
    if (equipos) {
      const ocupados = new Set(((usados ?? []) as unknown as { gps_id: string }[]).map((v) => v.gps_id));
      const filas = equipos as unknown as { id: string; modelo: string; imei: string; linea: string; verificado: boolean; pin_support: boolean }[];
      return filas
        .filter((f) => !ocupados.has(f.id))
        .map((f) => ({ id: f.id, modelo: f.modelo, imei: f.imei, linea: f.linea, vehicleId: null, companyId: null, verificado: f.verificado, pinSupport: f.pin_support }));
    }
  }
  return fakeNetwork(MOCK_GPS.filter((g) => !g.vehicleId));
}

/**
 * GPS instalado en un vehículo (para saber, entre otras cosas, si soporta PIN,
 * §3.5).
 *
 * TODO API: GET /vehiculos/:vehicleId/gps
 */
export async function getGpsDeVehiculo(vehicleId: string): Promise<Gps | null> {
  if (supabase && esIdDb(vehicleId)) {
    const { data } = await supabase
      .from('vehiculos')
      .select('gps:gps(id, modelo, imei, linea, verificado, pin_support), empresa:empresas(slug)')
      .eq('id', vehicleId)
      .maybeSingle();
    if (data) {
      const fila = data as unknown as {
        gps: { id: string; modelo: string; imei: string; linea: string; verificado: boolean; pin_support: boolean } | null;
        empresa: { slug: string } | null;
      };
      if (!fila.gps) return null;
      return {
        id: fila.gps.id,
        modelo: fila.gps.modelo,
        imei: fila.gps.imei,
        linea: fila.gps.linea,
        vehicleId,
        companyId: fila.empresa?.slug ?? null,
        verificado: fila.gps.verificado,
        pinSupport: fila.gps.pin_support,
      };
    }
    return null;
  }
  return fakeNetwork(MOCK_GPS.find((g) => g.vehicleId === vehicleId) ?? null);
}

