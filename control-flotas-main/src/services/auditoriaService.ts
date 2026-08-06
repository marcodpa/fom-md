/**
 * AUDITORÍA del sistema: registra cada MUTACIÓN (crear / editar / eliminar) de
 * empresas, usuarios y vehículos — quién la hizo y cuándo. El actor lo pone la
 * BD (default auth.uid()): no se puede falsear desde el cliente. La pantalla
 * /auditoria lo muestra (FOM ve todo; cada ente, lo suyo — RLS puedo_ver_empresa).
 */

import { supabase } from '@/lib/supabase';

import { empresaIdDe, esIdDb } from './db';
import { fakeNetwork } from './network';

import type { AuditoriaAccion, AuditoriaEntidad, AuditoriaEvento } from '@/types';

/** Respaldo mock: lo registrado en la sesión (sin BD). */
const MOCK_AUDITORIA: AuditoriaEvento[] = [];
let _seq = 0;

export interface RegistrarAuditoriaInput {
  accion: AuditoriaAccion;
  entidad: AuditoriaEntidad;
  /** Etiqueta legible de lo afectado (ej. "Samfor", "Unidad 07 · AB123CD"). */
  objetivo: string;
  /** Slug de la empresa relacionada (define el alcance de lectura). */
  companyId?: string;
  companyNombre?: string;
  /** Id (uuid) del vehículo afectado, si aplica. */
  vehicleId?: string;
  /** Detalle libre (ej. "servicio suspendido", "movido a Chevron"). */
  detalle?: string;
  /** Nombre del actor SOLO para el mock (en BD lo resuelve el join a perfiles). */
  actorNombre?: string;
  /**
   * Marca de tiempo explícita (ISO). Se usa en el borrado MASIVO para que todos
   * los ítems del lote queden con la MISMA hora exacta (una acción, un instante).
   * Sin ella, la BD pone `now()` por defecto.
   */
  fecha?: string;
}

/**
 * Registra una acción sin bloquear el flujo (fire-and-forget). Los datos
 * legibles viven en `detalle` (JSON) para que la lectura no dependa de joins
 * frágiles; el actor lo captura la BD del JWT.
 */
export function registrarAuditoria(input: RegistrarAuditoriaInput): void {
  if (supabase) {
    void (async () => {
      const empresaId = input.companyId ? await empresaIdDe(input.companyId) : null;
      await supabase!.from('auditoria').insert({
        tipo: `${input.accion}_${input.entidad}`,
        empresa_id: empresaId,
        vehiculo_id: input.vehicleId && esIdDb(input.vehicleId) ? input.vehicleId : null,
        detalle: JSON.stringify({
          accion: input.accion,
          entidad: input.entidad,
          objetivo: input.objetivo,
          companyNombre: input.companyNombre ?? null,
          detalle: input.detalle ?? null,
        }),
        // Hora explícita solo en el borrado masivo; si no, la BD pone now().
        ...(input.fecha ? { fecha: input.fecha } : {}),
        // actor_id: lo pone la BD (default auth.uid()).
      });
    })();
    return;
  }
  MOCK_AUDITORIA.unshift({
    id: `aud-${++_seq}`,
    accion: input.accion,
    entidad: input.entidad,
    actorId: '',
    actorNombre: input.actorNombre ?? '—',
    objetivo: input.objetivo,
    companyId: input.companyId,
    companyNombre: input.companyNombre,
    detalle: input.detalle,
    fecha: input.fecha ?? new Date().toISOString(),
  });
}

/**
 * Historial de auditoría (más reciente primero). La RLS filtra por alcance:
 * el admin FOM ve todo; cada ente/compañía ve lo suyo.
 *
 * TODO API: GET /auditoria
 */
export async function getAuditoria(): Promise<AuditoriaEvento[]> {
  if (supabase) {
    const { data } = await supabase
      .from('auditoria')
      .select('id, tipo, detalle, fecha, actor:perfiles!actor_id(nombre), empresa:empresas(slug)')
      .order('fecha', { ascending: false })
      .limit(200);
    if (data) {
      const filas = data as unknown as {
        id: string;
        tipo: string;
        detalle: string;
        fecha: string;
        actor: { nombre: string | null } | null;
        empresa: { slug: string } | null;
      }[];
      return filas.map((f) => {
        let d = {
          accion: 'editar' as AuditoriaAccion,
          entidad: 'empresa' as AuditoriaEntidad,
          objetivo: '—',
          companyNombre: null as string | null,
          detalle: null as string | null,
        };
        try {
          d = { ...d, ...(JSON.parse(f.detalle) as Partial<typeof d>) };
        } catch {
          // detalle sin JSON (fila vieja): se muestran los guiones
        }
        return {
          id: f.id,
          accion: d.accion,
          entidad: d.entidad,
          actorId: '',
          actorNombre: f.actor?.nombre ?? '—',
          objetivo: d.objetivo,
          companyId: f.empresa?.slug,
          companyNombre: d.companyNombre ?? undefined,
          detalle: d.detalle ?? undefined,
          fecha: f.fecha,
        };
      });
    }
  }
  return fakeNetwork([...MOCK_AUDITORIA]);
}
