/**
 * Servicio de mantenimiento (capa de datos abstracta) — Módulo 5 del documento.
 *
 * Cubre los TRES tipos de mantenimiento: preventivo (por km/fecha), correctivo
 * (las OT que reportan los conductores) y predictivo (anomalías de telemetría).
 * Todo se deriva de la MISMA fuente que ven conductores y vehículos, así que lo
 * que ellos hacen (reportar una falla, etc.) se refleja aquí automáticamente.
 *
 * Hoy es un mock con la misma forma async que tendrá la API de Juan; migrar es
 * reescribir el cuerpo marcado con «TODO API».
 */

import type { WorkOrderListItem } from '@/types';

import { getFlotaVehiculos, getOrdenesDeTrabajo } from './companyService';
import { fakeNetwork } from './network';

export type MantenimientoTipo = 'preventivo' | 'correctivo' | 'predictivo';
export type PlanEstado = 'al_dia' | 'proximo' | 'vencido';

/** Plan preventivo de un vehículo (próximo servicio por km/fecha). */
export interface PlanPreventivo {
  vehicleId: string;
  vehicleLabel: string;
  /** Servicio pendiente (ej. "Cambio de aceite y filtros"). */
  servicio: string;
  estado: PlanEstado;
  /** Detalle legible (ej. "en 800 km" / "vencido hace 2 días"). */
  detalle: string;
}

/** Alerta predictiva (anomalía detectada por telemetría/sensores). */
export interface AlertaPredictiva {
  vehicleId: string;
  vehicleLabel: string;
  titulo: string;
  detalle: string;
  severidad: 'advertencia' | 'critica';
}

/** Resumen de mantenimiento para el tablero. */
export interface MantenimientoResumen {
  preventivosProximos: number;
  preventivosVencidos: number;
  otAbiertas: number;
  predictivas: number;
}

const SERVICIOS = [
  'Cambio de aceite y filtros',
  'Revisión de frenos',
  'Rotación de neumáticos',
  'Servicio mayor (correa/bujías)',
];

/** Estado preventivo determinista por id (mock). TODO API: km/horas/fechas reales. */
function planDe(vehicleId: string, label: string): PlanPreventivo {
  const n = [...vehicleId].reduce((a, c) => a + c.charCodeAt(0), 0);
  const servicio = SERVICIOS[n % SERVICIOS.length];
  const bucket = n % 10;
  if (bucket >= 8) return { vehicleId, vehicleLabel: label, servicio, estado: 'vencido', detalle: `Vencido hace ${100 + (n % 400)} km` };
  if (bucket >= 5) return { vehicleId, vehicleLabel: label, servicio, estado: 'proximo', detalle: `En ${200 + (n % 600)} km` };
  return { vehicleId, vehicleLabel: label, servicio, estado: 'al_dia', detalle: `Al día · próximo en ${3000 + (n % 4000)} km` };
}

/**
 * Planes preventivos de la flota (por km/fecha).
 *
 * TODO API: GET /empresas/:companyId/mantenimiento/preventivo
 */
export async function getPlanesPreventivos(companyId: string): Promise<PlanPreventivo[]> {
  const flota = await getFlotaVehiculos(companyId);
  return flota.map((f) => planDe(f.vehicle.id, `${f.vehicle.numero} · ${f.vehicle.marca} ${f.vehicle.modelo}`));
}

/**
 * Alertas predictivas (anomalías). Mock: las genera para las unidades cuyo plan
 * preventivo está vencido (proxy de "algo va mal").
 *
 * TODO API: GET /empresas/:companyId/mantenimiento/predictivo
 */
export async function getAlertasPredictivas(companyId: string): Promise<AlertaPredictiva[]> {
  const planes = await getPlanesPreventivos(companyId);
  const alertas: AlertaPredictiva[] = planes
    .filter((p) => p.estado === 'vencido')
    .map((p) => ({
      vehicleId: p.vehicleId,
      vehicleLabel: p.vehicleLabel,
      titulo: 'Posible desgaste anticipado',
      detalle: 'La telemetría sugiere revisar frenos/motor antes de lo previsto.',
      severidad: 'advertencia' as const,
    }));
  return fakeNetwork(alertas, 200);
}

/**
 * Resumen de mantenimiento (para el tablero del admin).
 *
 * TODO API: GET /empresas/:companyId/mantenimiento/resumen
 */
export async function getMantenimientoResumen(companyId: string): Promise<MantenimientoResumen> {
  const [planes, ots, predictivas] = await Promise.all([
    getPlanesPreventivos(companyId),
    getOrdenesDeTrabajo(companyId),
    getAlertasPredictivas(companyId),
  ]);
  return {
    preventivosProximos: planes.filter((p) => p.estado === 'proximo').length,
    preventivosVencidos: planes.filter((p) => p.estado === 'vencido').length,
    otAbiertas: ots.filter((o) => o.estado !== 'cerrada').length,
    predictivas: predictivas.length,
  };
}

/** Reexporta las OT como "correctivo" para el tab de mantenimiento. */
export async function getMantenimientoCorrectivo(companyId: string): Promise<WorkOrderListItem[]> {
  return getOrdenesDeTrabajo(companyId);
}
