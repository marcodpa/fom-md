/**
 * Pagos del servicio FOM por empresa — SOLO los admin FOM los ven y los
 * administran desde su Consola: registran el cobro de cada período, lo marcan
 * pagado y con eso deciden activar/desactivar el servicio de la empresa.
 */

import { supabase } from '@/lib/supabase';
import type { Pago, PagoEstado } from '@/types';

import { listarEmpresasMock } from './companyService';
import { empresaIdDe, esIdDb } from './db';
import { fakeNetwork } from './network';

const MOCK_PAGOS: Pago[] = [];
let _seq = 10;

/** Fila de `pagos` en la BD. */
type PagoRow = {
  id: string;
  monto: number;
  moneda: string;
  periodo: string;
  estado: PagoEstado;
  pagado_en: string | null;
  nota: string | null;
  creada_en: string;
};

function rowToPago(f: PagoRow, companyId: string): Pago {
  return {
    id: f.id,
    companyId,
    monto: Number(f.monto),
    moneda: f.moneda,
    periodo: f.periodo,
    estado: f.estado,
    pagadoEn: f.pagado_en ?? undefined,
    nota: f.nota ?? undefined,
    creadaEn: f.creada_en,
  };
}

/**
 * Pagos de una empresa, del más reciente al más viejo.
 *
 * TODO API: conectado a la BD provisional (tabla `pagos`, RLS solo admin).
 */
export async function getPagosEmpresa(companyId: string): Promise<Pago[]> {
  if (supabase) {
    const empresaId = await empresaIdDe(companyId);
    if (empresaId) {
      const { data } = await supabase
        .from('pagos')
        .select('id, monto, moneda, periodo, estado, pagado_en, nota, creada_en')
        .eq('empresa_id', empresaId)
        .order('creada_en', { ascending: false });
      if (data) return (data as unknown as PagoRow[]).map((f) => rowToPago(f, companyId));
    }
    return [];
  }
  return fakeNetwork(MOCK_PAGOS.filter((p) => p.companyId === companyId));
}

/** Pago + el nombre de su empresa (para el tablero del admin FOM). */
export type PagoSistema = Pago & { companyNombre: string };

/**
 * TODOS los pagos del sistema (tablero del admin FOM): primero los que hay
 * que atender (vencidos y pendientes), luego los pagados.
 *
 * TODO API: GET /pagos (RLS: solo admin).
 */
export async function listarPagosSistema(): Promise<PagoSistema[]> {
  const orden: Record<Pago['estado'], number> = { vencido: 0, pendiente: 1, pagado: 2 };
  if (supabase) {
    const { data, error } = await supabase
      .from('pagos')
      .select('id, monto, moneda, periodo, estado, pagado_en, nota, creada_en, empresa:empresas(slug, nombre)')
      .order('creada_en', { ascending: false });
    // Un fallo NO puede leerse como "todo cobrado": se propaga al ErrorState.
    if (error || !data) throw new Error('No se pudieron cargar los pagos.');
    const filas = data as unknown as (PagoRow & { empresa: { slug: string; nombre: string } | null })[];
    return filas
      .map((f) => ({
        ...rowToPago(f, f.empresa?.slug ?? ''),
        companyNombre: f.empresa?.nombre ?? '—',
      }))
      .sort((a, b) => orden[a.estado] - orden[b.estado]);
  }
  return fakeNetwork(
    MOCK_PAGOS.map((p) => ({
      ...p,
      companyNombre: listarEmpresasMock().find((e) => e.id === p.companyId)?.name ?? p.companyId,
    })).sort((a, b) => orden[a.estado] - orden[b.estado]),
  );
}

/**
 * Registra un cobro del servicio para un período (nace PENDIENTE).
 *
 * TODO API: POST /empresas/:slug/pagos
 */
export async function registrarPago(input: {
  companyId: string;
  monto: number;
  periodo: string;
  nota?: string;
}): Promise<Pago> {
  if (!Number.isFinite(input.monto) || input.monto < 0) throw new Error('Indica un monto válido.');
  if (!input.periodo.trim()) throw new Error('Indica el período (ej. 2026-07).');

  if (supabase) {
    const empresaId = await empresaIdDe(input.companyId);
    if (!empresaId) throw new Error('Empresa no encontrada.');
    const { data, error } = await supabase
      .from('pagos')
      .insert({
        empresa_id: empresaId,
        monto: input.monto,
        periodo: input.periodo.trim(),
        nota: input.nota?.trim() || null,
      })
      .select('id, monto, moneda, periodo, estado, pagado_en, nota, creada_en')
      .single();
    if (error || !data) throw new Error('No se pudo registrar el pago. Intenta de nuevo.');
    return rowToPago(data as unknown as PagoRow, input.companyId);
  }

  const pago: Pago = {
    id: `pago-${++_seq}`,
    companyId: input.companyId,
    monto: input.monto,
    moneda: 'USD',
    periodo: input.periodo.trim(),
    estado: 'pendiente',
    nota: input.nota?.trim() || undefined,
    creadaEn: new Date().toISOString(),
  };
  MOCK_PAGOS.unshift(pago);
  return fakeNetwork(pago, 400);
}

/**
 * Cambia el estado de un pago (pendiente → pagado / vencido).
 *
 * TODO API: PATCH /pagos/:id { estado }
 */
export async function actualizarEstadoPago(id: string, estado: PagoEstado): Promise<Pago> {
  if (supabase && esIdDb(id)) {
    const { data, error } = await supabase
      .from('pagos')
      .update({ estado, pagado_en: estado === 'pagado' ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id, monto, moneda, periodo, estado, pagado_en, nota, creada_en, empresa:empresas(slug)')
      .single();
    if (error || !data) throw new Error('No se pudo actualizar el pago.');
    const f = data as unknown as PagoRow & { empresa: { slug: string } | null };
    return rowToPago(f, f.empresa?.slug ?? '');
  }
  const pago = MOCK_PAGOS.find((p) => p.id === id);
  if (!pago) throw new Error('Pago no encontrado.');
  pago.estado = estado;
  pago.pagadoEn = estado === 'pagado' ? new Date().toISOString() : undefined;
  return fakeNetwork({ ...pago }, 300);
}
