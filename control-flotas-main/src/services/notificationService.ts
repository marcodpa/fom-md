/**
 * Notificaciones in-app del panel (FOM-02 §3.2/§3.3/§3.4 — D7: in-app en el
 * mock; push cuando exista el backend). Aquí llegan la "Nueva ODT" para el
 * supervisor y las alertas cumplidas de las reglas. Con la BD provisional la
 * "Nueva ODT" la escribe un TRIGGER de la base al crear la orden.
 */

import { supabase } from '@/lib/supabase';
import type { NotificacionPanel } from '@/types';

import { empresaIdDe, esIdDb } from './db';
import { fakeNetwork } from './network';

const MOCK_NOTIFICACIONES: NotificacionPanel[] = [];

let _seq = 100;

/** Registra una notificación (interno de la capa de servicios). */
export function notificar(input: Omit<NotificacionPanel, 'id' | 'creadaEn' | 'leida'>): void {
  // BD provisional: se guarda de verdad (sin bloquear al que la origina).
  if (supabase) {
    void (async () => {
      const empresaId = await empresaIdDe(input.companyId);
      if (!empresaId) return;
      await supabase!.from('notificaciones').insert({
        empresa_id: empresaId,
        tipo: input.tipo,
        titulo: input.titulo,
        detalle: input.detalle,
        odt_id: esIdDb(input.odtId) ? input.odtId : null,
      });
    })();
  }
  // Evita duplicar la misma notificación (mismo título+detalle sin leer).
  const dup = MOCK_NOTIFICACIONES.some(
    (n) => !n.leida && n.companyId === input.companyId && n.titulo === input.titulo && n.detalle === input.detalle,
  );
  if (dup) return;
  MOCK_NOTIFICACIONES.unshift({
    ...input,
    id: `not-${++_seq}`,
    creadaEn: new Date().toISOString(),
    leida: false,
  });
}

/** Fila de `notificaciones` en la BD. */
type NotificacionRow = {
  id: string;
  tipo: NotificacionPanel['tipo'];
  titulo: string;
  detalle: string;
  odt_id: string | null;
  leida: boolean;
  creada_en: string;
};

/**
 * Notificaciones de una empresa, de la más nueva a la más vieja.
 *
 * TODO API: conectado a la BD provisional (tabla `notificaciones`).
 */
export async function getNotificacionesPanel(companyId: string): Promise<NotificacionPanel[]> {
  if (supabase) {
    const empresaId = await empresaIdDe(companyId);
    if (empresaId) {
      const { data } = await supabase
        .from('notificaciones')
        .select('id, tipo, titulo, detalle, odt_id, leida, creada_en')
        .eq('empresa_id', empresaId)
        .order('creada_en', { ascending: false });
      if (data) {
        return (data as unknown as NotificacionRow[]).map((f) => ({
          id: f.id,
          companyId,
          tipo: f.tipo,
          titulo: f.titulo,
          detalle: f.detalle,
          odtId: f.odt_id ?? undefined,
          creadaEn: f.creada_en,
          leida: f.leida,
        }));
      }
    }
  }
  return fakeNetwork(MOCK_NOTIFICACIONES.filter((n) => n.companyId === companyId));
}

/** Notificaciones sin leer (para el contador del dashboard). */
export async function getNotificacionesNoLeidas(companyId: string): Promise<number> {
  if (supabase) {
    const empresaId = await empresaIdDe(companyId);
    if (empresaId) {
      const { count } = await supabase
        .from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('leida', false);
      if (count != null) return count;
    }
  }
  return fakeNetwork(
    MOCK_NOTIFICACIONES.filter((n) => n.companyId === companyId && !n.leida).length,
    200,
  );
}

/**
 * Marca una notificación como leída.
 *
 * TODO API: conectado a la BD provisional.
 */
export async function marcarNotificacionLeida(id: string): Promise<void> {
  if (supabase && esIdDb(id)) {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
    return;
  }
  const n = MOCK_NOTIFICACIONES.find((x) => x.id === id);
  if (n) n.leida = true;
  return fakeNetwork(undefined, 150);
}
