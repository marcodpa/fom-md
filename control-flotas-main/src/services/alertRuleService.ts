/**
 * Reglas de alerta configurables (FOM-02 §3.6) + motor mock (§3.4).
 *
 * El supervisor crea reglas (exceso de velocidad con límite, mantenimiento
 * preventivo cada X km) y las asigna a uno o varios vehículos (o por área).
 * Cada vehículo asignado se "monitorea": el motor mock evalúa las reglas al
 * refrescar el panel y, cuando una de mantenimiento se cumple, crea SOLO la
 * ODT preventiva y notifica al supervisor. Al cerrar esa ODT, el contador del
 * vehículo se reinicia.
 */

import { supabase } from '@/lib/supabase';
import type { ReglaAlerta, ReglaAlertaTipo, WorkOrder } from '@/types';

import {
  esEmpresaPersonalSync,
  getCoordsVehiculoSync,
  getFlotaVehiculos,
  getTipoEmpresa,
  getVehiculo,
  registrarHookOdtCerrada,
  registrarOrden,
} from './companyService';
import { empresaIdDe, esIdDb } from './db';
import { fakeNetwork, seed } from './network';
import { notificar } from './notificationService';

// ───────────────────────────── DATOS MOCK ─────────────────────────────────

// Reglas de ejemplo de Samfor, calcadas del documento (§3.6): velocidad 80
// km/h y aceite cada 3.000 km. La Unidad 07 ya llegó a los 3.000 km para
// ejercitar el flujo §3.4 completo (ODT preventiva automática al evaluar).
const MOCK_REGLAS: ReglaAlerta[] = seed<ReglaAlerta>([
  {
    id: 'regla-vel-80',
    companyId: 'Samfor',
    tipo: 'velocidad',
    umbral: 80,
    vehicleIds: ['veh-031', 'veh-045'],
    creadaPor: 'sc-yeison',
    activa: true,
  },
  {
    id: 'regla-aceite-3000',
    companyId: 'Samfor',
    tipo: 'mantenimiento',
    umbral: 3000,
    servicio: 'Cambio de aceite',
    vehicleIds: ['veh-031'],
    creadaPor: 'sc-yeison',
    activa: true,
    progresoKm: { 'veh-031': 3000 },
  },
  // Ale (FOM-02 §5.1, literal): aceite cada 5.000 km → Carro 1 y Carro 2. El
  // carro de Santi ya llegó al umbral para ejercitar la notificación del §5.2.
  {
    id: 'regla-ale-aceite',
    companyId: 'sampieri',
    tipo: 'mantenimiento',
    umbral: 5000,
    servicio: 'Cambio de aceite',
    vehicleIds: ['veh-ale-1', 'veh-ale-2'],
    creadaPor: 'sp-ale',
    activa: true,
    progresoKm: { 'veh-ale-1': 5000, 'veh-ale-2': 2100 },
  },
]);

let _reglaSeq = 10;
let _odtSeq = 700;

// ODT preventivas ya generadas por (regla, vehículo) sin cerrar, para no duplicar.
const _preventivasAbiertas = new Set<string>();

// Al cerrar una ODT preventiva, el contador de su regla/vehículo se reinicia (§3.4).
registrarHookOdtCerrada((wo: WorkOrder) => {
  if (wo.tipo !== 'preventiva' || !wo.reglaAlertaId) return;
  const regla = MOCK_REGLAS.find((r) => r.id === wo.reglaAlertaId);
  if (regla?.progresoKm) regla.progresoKm[wo.vehicleId] = 0;
  _preventivasAbiertas.delete(`${wo.reglaAlertaId}:${wo.vehicleId}`);
});

// ───────────────────────────── SERVICIOS ──────────────────────────────────

/**
 * Reglas de alerta de una empresa.
 *
 * TODO API: GET /empresas/:companyId/reglas-alerta
 */
/** Fila de `reglas_alerta` con sus vehículos asignados y contadores. */
type ReglaRow = {
  id: string;
  tipo: ReglaAlertaTipo;
  umbral: number;
  servicio: string | null;
  creada_por: string | null;
  activa: boolean;
  vehiculos: { vehiculo_id: string; progreso_km: number }[];
};

function rowToRegla(f: ReglaRow, companyId: string): ReglaAlerta {
  return {
    id: f.id,
    companyId,
    tipo: f.tipo,
    umbral: f.umbral,
    servicio: f.servicio ?? undefined,
    vehicleIds: f.vehiculos.map((v) => v.vehiculo_id),
    creadaPor: f.creada_por ?? '',
    activa: f.activa,
    progresoKm:
      f.tipo === 'mantenimiento'
        ? Object.fromEntries(f.vehiculos.map((v) => [v.vehiculo_id, v.progreso_km]))
        : undefined,
  };
}

async function reglasDb(companyId: string): Promise<ReglaAlerta[] | null> {
  if (!supabase) return null;
  const empresaId = await empresaIdDe(companyId);
  if (!empresaId) return null;
  const { data, error } = await supabase
    .from('reglas_alerta')
    .select('id, tipo, umbral, servicio, creada_por, activa, vehiculos:regla_vehiculos(vehiculo_id, progreso_km)')
    .eq('empresa_id', empresaId)
    .order('creada_en');
  if (error || !data) return null;
  return (data as unknown as ReglaRow[]).map((f) => rowToRegla(f, companyId));
}

export async function getReglasAlerta(companyId: string): Promise<ReglaAlerta[]> {
  const db = await reglasDb(companyId);
  if (db) return db;
  return fakeNetwork(MOCK_REGLAS.filter((r) => r.companyId === companyId));
}

export interface NuevaReglaInput {
  companyId: string;
  tipo: ReglaAlertaTipo;
  umbral: number;
  servicio?: string;
  vehicleIds: string[];
  creadaPor: string;
}

/**
 * Crea una regla de alerta y la deja ACTIVA (§3.6): cada vehículo asignado se
 * monitorea con ella.
 *
 * TODO API: POST /empresas/:companyId/reglas-alerta
 */
export async function crearReglaAlerta(input: NuevaReglaInput): Promise<ReglaAlerta> {
  if (!Number.isFinite(input.umbral) || input.umbral <= 0) {
    throw new Error('Indica un límite válido (km/h o km).');
  }
  if (input.vehicleIds.length === 0) {
    throw new Error('Asigna la alerta a al menos un vehículo.');
  }

  // BD provisional: la regla y sus vehículos monitoreados se guardan de verdad.
  if (supabase) {
    const empresaId = await empresaIdDe(input.companyId);
    if (empresaId) {
      const { data, error } = await supabase
        .from('reglas_alerta')
        .insert({
          empresa_id: empresaId,
          tipo: input.tipo,
          umbral: input.umbral,
          servicio: input.tipo === 'mantenimiento' ? input.servicio?.trim() || 'Mantenimiento' : null,
          creada_por: esIdDb(input.creadaPor) ? input.creadaPor : null,
        })
        .select('id, tipo, umbral, servicio, creada_por, activa')
        .single();
      if (error || !data) throw new Error('No se pudo crear la regla. Intenta de nuevo.');
      const f = data as unknown as Omit<ReglaRow, 'vehiculos'>;
      // Contadores reales: arrancan en 0 (los moverá la telemetría del GPS).
      const { error: errVeh } = await supabase.from('regla_vehiculos').insert(
        input.vehicleIds.filter(esIdDb).map((vid) => ({ regla_id: f.id, vehiculo_id: vid, progreso_km: 0 })),
      );
      if (errVeh) throw new Error('La regla se creó pero no se pudo asignar a los vehículos.');
      return rowToRegla({ ...f, vehiculos: input.vehicleIds.map((vid) => ({ vehiculo_id: vid, progreso_km: 0 })) }, input.companyId);
    }
  }

  const regla: ReglaAlerta = {
    id: `regla-${++_reglaSeq}`,
    companyId: input.companyId,
    tipo: input.tipo,
    umbral: input.umbral,
    servicio: input.tipo === 'mantenimiento' ? input.servicio?.trim() || 'Mantenimiento' : undefined,
    vehicleIds: input.vehicleIds,
    creadaPor: input.creadaPor,
    activa: true,
    // El contador arranca avanzado (mock) para que el flujo sea observable.
    progresoKm:
      input.tipo === 'mantenimiento'
        ? Object.fromEntries(input.vehicleIds.map((id, i) => [id, Math.round(input.umbral * (0.3 + i * 0.17)) % input.umbral]))
        : undefined,
  };
  MOCK_REGLAS.push(regla);
  return fakeNetwork(regla, 400);
}

/**
 * MOTOR MOCK (§3.4): evalúa las reglas de la empresa.
 *  - Mantenimiento cumplido → ODT PREVENTIVA automática (abierta) + notificación.
 *  - Exceso de velocidad → notificación de alerta.
 * En real esto vive en el backend alimentado por el GPS; la forma del efecto
 * (ODT + notificación) es la misma.
 */
export async function evaluarReglas(companyId: string): Promise<void> {
  // BD provisional: evalúa las reglas reales. La ODT preventiva la inserta la
  // app (creador null = SISTEMA) y la notificación la pone el trigger V5; el
  // contador se reinicia al cerrar (trigger V4).
  if (supabase) {
    const empresaId = await empresaIdDe(companyId);
    if (empresaId) {
      const reglasDbLista = (await reglasDb(companyId))?.filter((r) => r.activa) ?? [];
      if (reglasDbLista.length === 0) return;
      const flotaDb = await getFlotaVehiculos(companyId);
      const esPersonal = (await getTipoEmpresa(companyId)) === 'personal';

      for (const regla of reglasDbLista) {
        for (const vehicleId of regla.vehicleIds) {
          const unidad = flotaDb.find((f) => f.vehicle.id === vehicleId);
          if (!unidad) continue;
          const etiqueta = unidad.vehicle.alias ?? unidad.vehicle.numero;

          if (regla.tipo === 'velocidad') {
            if (unidad.velocidadKmh > regla.umbral) {
              notificar({
                companyId,
                tipo: 'alerta_cumplida',
                titulo: 'Exceso de velocidad',
                detalle: `${etiqueta} va a ${unidad.velocidadKmh} km/h (límite ${regla.umbral}).`,
              });
            }
            continue;
          }

          const progreso = regla.progresoKm?.[vehicleId] ?? 0;
          if (progreso < regla.umbral) continue;

          // Cuentas PERSONALES (§5.2): solo notificación, sin ODT de taller.
          if (esPersonal) {
            notificar({
              companyId,
              tipo: 'alerta_cumplida',
              titulo: `${regla.servicio ?? 'Mantenimiento'} de ${etiqueta}: vencido`,
              detalle: `Llegó a ${progreso.toLocaleString('es')} km del último servicio (regla: cada ${regla.umbral.toLocaleString('es')} km).`,
            });
            continue;
          }

          // ¿Ya hay una preventiva SIN CERRAR de esta regla/vehículo? No duplicar.
          const { data: abierta } = await supabase
            .from('odts')
            .select('id')
            .eq('regla_id', regla.id)
            .eq('vehiculo_id', vehicleId)
            .neq('estado', 'cerrada')
            .limit(1)
            .maybeSingle();
          if (abierta) continue;

          await supabase.from('odts').insert({
            empresa_id: empresaId,
            vehiculo_id: vehicleId,
            creador_id: null, // la genera el SISTEMA (§3.4)
            tipo: 'preventiva',
            estado: 'abierta',
            regla_id: regla.id,
            descripcion: `${regla.servicio ?? 'Mantenimiento preventivo'}: ${etiqueta} llegó a ${progreso.toLocaleString('es')} km del último servicio (regla: cada ${regla.umbral.toLocaleString('es')} km).`,
            ubicacion: 'Posición actual del GPS',
          });
        }
      }
      return;
    }
  }

  const reglas = MOCK_REGLAS.filter((r) => r.companyId === companyId && r.activa);
  if (reglas.length === 0) return;
  const flota = await getFlotaVehiculos(companyId);

  for (const regla of reglas) {
    for (const vehicleId of regla.vehicleIds) {
      const unidad = flota.find((f) => f.vehicle.id === vehicleId);
      if (!unidad) continue;
      const etiqueta = unidad.vehicle.alias ?? unidad.vehicle.numero;

      if (regla.tipo === 'velocidad') {
        if (unidad.velocidadKmh > regla.umbral) {
          notificar({
            companyId,
            tipo: 'alerta_cumplida',
            titulo: 'Exceso de velocidad',
            detalle: `${etiqueta} va a ${unidad.velocidadKmh} km/h (límite ${regla.umbral}).`,
          });
        }
        continue;
      }

      // Mantenimiento: ¿el contador llegó al umbral?
      const progreso = regla.progresoKm?.[vehicleId] ?? 0;
      const clave = `${regla.id}:${vehicleId}`;
      if (progreso >= regla.umbral && !_preventivasAbiertas.has(clave)) {
        // Cuentas PERSONALES (§5.2): la alerta cumplida notifica ("Cambio de
        // aceite del carro de Santi: vencido") pero NO abre ODT de taller.
        if (esEmpresaPersonalSync(companyId)) {
          notificar({
            companyId,
            tipo: 'alerta_cumplida',
            titulo: `${regla.servicio ?? 'Mantenimiento'} de ${etiqueta}: vencido`,
            detalle: `Llegó a ${progreso.toLocaleString('es')} km del último servicio (regla: cada ${regla.umbral.toLocaleString('es')} km).`,
          });
          continue;
        }
        _preventivasAbiertas.add(clave);
        const vehiculo = await getVehiculo(vehicleId);
        const odt: WorkOrder = {
          id: `wo-prev-${++_odtSeq}`,
          vehicleId,
          // La genera el SISTEMA; el responsable de gestionarla es el supervisor.
          driverId: 'sistema',
          descripcion: `${regla.servicio ?? 'Mantenimiento preventivo'}: ${etiqueta} llegó a ${progreso.toLocaleString('es')} km del último servicio (regla: cada ${regla.umbral.toLocaleString('es')} km).`,
          tipo: 'preventiva',
          reglaAlertaId: regla.id,
          estado: 'abierta',
          creadaEn: new Date().toISOString(),
          ubicacionTexto: vehiculo ? (getCoordsVehiculoSync(vehicleId) ? 'Posición actual del GPS' : '—') : '—',
        };
        registrarOrden(odt);
        notificar({
          companyId,
          tipo: 'alerta_cumplida',
          titulo: `${regla.servicio ?? 'Mantenimiento'} · ${etiqueta}`,
          detalle: `Se cumplió la regla (cada ${regla.umbral.toLocaleString('es')} km). Se creó la ODT preventiva automáticamente.`,
          odtId: odt.id,
        });
      }
    }
  }
  return fakeNetwork(undefined, 200);
}
