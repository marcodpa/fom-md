/**
 * Servicio de costos y gastos (capa de datos abstracta) — Módulo 14 del
 * documento. Pensado sobre todo para el administrador general (ej. Chevron):
 * costos por rango de fechas, desglosados por PRODUCTO o SERVICIO, y la
 * comparación entre empresas.
 *
 * Hoy genera un histórico simulado y determinista (mismo resultado en cada
 * corrida) con la MISMA forma async que tendrá la API real de Juan. Los costos
 * de mantenimiento CORRECTIVO salen de las OT ya realizadas (con su `costo`),
 * así que lo que registra el admin al cerrar una OT se refleja aquí.
 *
 * Migrar a real = reescribir SOLO los cuerpos marcados con «TODO API».
 */

import type { Company } from '@/types';

import { getFlotaVehiculos, getOrdenesDeTrabajo, listarEmpresasMock } from './companyService';
import { fakeNetwork } from './network';

export type CostoClase = 'producto' | 'servicio';

/** Categoría de costo (un producto o un servicio). */
export interface CostoCategoria {
  id: string;
  label: string;
  clase: CostoClase;
}

/** Categorías del catálogo (brief §14). Ampliable sin límite. */
export const CATEGORIAS_COSTO: CostoCategoria[] = [
  { id: 'combustible', label: 'Combustible', clase: 'producto' },
  { id: 'repuestos', label: 'Repuestos', clase: 'producto' },
  { id: 'neumaticos', label: 'Neumáticos', clase: 'producto' },
  { id: 'lubricantes', label: 'Lubricantes', clase: 'producto' },
  { id: 'mano_obra', label: 'Mano de obra', clase: 'servicio' },
  { id: 'preventivo', label: 'Mantenimiento preventivo', clase: 'servicio' },
  { id: 'correctivo', label: 'Mantenimiento correctivo', clase: 'servicio' },
  { id: 'peajes', label: 'Peajes', clase: 'servicio' },
  { id: 'seguros', label: 'Seguros', clase: 'servicio' },
];

function categoriaDe(id: string): CostoCategoria {
  return CATEGORIAS_COSTO.find((c) => c.id === id) ?? CATEGORIAS_COSTO[0];
}

/** Un gasto individual (registrado o importado). */
export interface CostoItem {
  id: string;
  /** ISO del gasto. */
  fecha: string;
  categoriaId: string;
  clase: CostoClase;
  /** Monto en USD (mock). */
  monto: number;
  vehicleId: string;
  vehicleLabel: string;
  concepto: string;
}

/** Rango de fechas de consulta. */
export interface RangoFechas {
  desde: string;
  hasta: string;
  label: string;
}

/** Total de una categoría dentro del rango (con su peso relativo). */
export interface CostoPorCategoria {
  categoria: CostoCategoria;
  total: number;
  porcentaje: number;
}

/** Resumen de costos de una empresa en un rango. */
export interface ResumenCostos {
  rango: RangoFechas;
  total: number;
  nItems: number;
  porClase: { producto: number; servicio: number };
  porCategoria: CostoPorCategoria[];
  topVehiculos: { vehicleId: string; vehicleLabel: string; total: number }[];
}

/** Total de una empresa en un rango (para comparar). */
export interface CostoEmpresa {
  company: Company;
  total: number;
}

// ───────────────────────────── Rangos ──────────────────────────────────────

const DIA_MS = 86_400_000;

function iso(d: Date): string {
  return d.toISOString();
}

/** Rangos predefinidos que ofrece la pantalla. */
export type RangoPreset = 'mes' | 'd30' | 'd90' | 'anio';

export function rangoPreset(preset: RangoPreset): RangoFechas {
  const hasta = new Date();
  if (preset === 'mes') {
    const desde = new Date(hasta.getFullYear(), hasta.getMonth(), 1);
    const label = hasta.toLocaleDateString('es', { month: 'long', year: 'numeric' });
    return { desde: iso(desde), hasta: iso(hasta), label: label.charAt(0).toUpperCase() + label.slice(1) };
  }
  if (preset === 'anio') {
    const desde = new Date(hasta.getFullYear(), 0, 1);
    return { desde: iso(desde), hasta: iso(hasta), label: `Año ${hasta.getFullYear()}` };
  }
  const dias = preset === 'd30' ? 30 : 90;
  const desde = new Date(hasta.getTime() - dias * DIA_MS);
  return { desde: iso(desde), hasta: iso(hasta), label: `Últimos ${dias} días` };
}

// ───────────────────────── Generación (mock) ───────────────────────────────

/** RNG determinista (Lehmer) sembrado por empresa, para un histórico estable. */
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function seedDe(texto: string): number {
  return [...texto].reduce((a, c) => a + c.charCodeAt(0) * 31, 7);
}

/** Ventana histórica que se simula (para poder consultar hasta ~1 año atrás). */
const DIAS_HISTORICO = 365;

// Recetas de gasto por categoría: cada cuántos días aparece (aprox) y su rango
// de monto. Con esto el histórico se ve realista y proporcionado.
const RECETAS: { categoriaId: string; cadaDias: number; min: number; max: number; concepto: string }[] = [
  { categoriaId: 'combustible', cadaDias: 4, min: 45, max: 120, concepto: 'Carga de combustible' },
  { categoriaId: 'peajes', cadaDias: 6, min: 4, max: 18, concepto: 'Peajes de ruta' },
  { categoriaId: 'lubricantes', cadaDias: 45, min: 30, max: 70, concepto: 'Cambio de aceite' },
  { categoriaId: 'neumaticos', cadaDias: 120, min: 220, max: 520, concepto: 'Juego de neumáticos' },
  { categoriaId: 'repuestos', cadaDias: 35, min: 40, max: 260, concepto: 'Repuestos varios' },
  { categoriaId: 'preventivo', cadaDias: 60, min: 120, max: 340, concepto: 'Servicio preventivo' },
  { categoriaId: 'mano_obra', cadaDias: 30, min: 50, max: 180, concepto: 'Mano de obra de taller' },
  { categoriaId: 'seguros', cadaDias: 90, min: 150, max: 420, concepto: 'Prima de seguro' },
];

// Cache del histórico por empresa (se genera una vez por sesión).
const _historico = new Map<string, CostoItem[]>();

async function historicoDe(companyId: string): Promise<CostoItem[]> {
  const cache = _historico.get(companyId);
  if (cache) return cache;

  const flota = await getFlotaVehiculos(companyId);
  const rand = rng(seedDe(companyId));
  const ahora = Date.now();
  const items: CostoItem[] = [];

  for (const f of flota) {
    const label = `${f.vehicle.numero} · ${f.vehicle.marca} ${f.vehicle.modelo}`;
    for (const receta of RECETAS) {
      // Desde hoy hacia atrás, saltos ~cadaDias con jitter, hasta cubrir la ventana.
      let dia = Math.floor(rand() * receta.cadaDias);
      while (dia < DIAS_HISTORICO) {
        const fecha = new Date(ahora - dia * DIA_MS);
        const monto = Math.round(receta.min + rand() * (receta.max - receta.min));
        items.push({
          id: `cost-${f.vehicle.id}-${receta.categoriaId}-${dia}`,
          fecha: iso(fecha),
          categoriaId: receta.categoriaId,
          clase: categoriaDe(receta.categoriaId).clase,
          monto,
          vehicleId: f.vehicle.id,
          vehicleLabel: label,
          concepto: receta.concepto,
        });
        dia += Math.max(1, Math.round(receta.cadaDias * (0.6 + rand() * 0.8)));
      }
    }
  }

  // Costos de mantenimiento CORRECTIVO: de las ODT ya cerradas con costo. Si la
  // ODT no trae costo, se estima uno para que el correctivo no quede en cero.
  const ots = await getOrdenesDeTrabajo(companyId);
  for (const ot of ots.filter((o) => o.estado === 'cerrada')) {
    const monto = ot.costo ?? 80 + Math.round(rand() * 300);
    items.push({
      id: `cost-ot-${ot.id}`,
      fecha: ot.creadaEn,
      categoriaId: 'correctivo',
      clase: 'servicio',
      monto,
      vehicleId: ot.vehicleId,
      vehicleLabel: ot.vehicleLabel,
      concepto: `ODT ${ot.id} · ${ot.descripcion.slice(0, 40)}`,
    });
  }

  items.sort((a, b) => b.fecha.localeCompare(a.fecha));
  _historico.set(companyId, items);
  return items;
}

function enRango(items: CostoItem[], r: RangoFechas): CostoItem[] {
  return items.filter((i) => i.fecha >= r.desde && i.fecha <= r.hasta);
}

// ───────────────────────────── Servicios ───────────────────────────────────

/**
 * Gastos de una empresa dentro de un rango (lista cruda, más nuevos primero).
 *
 * TODO API: GET /empresas/:companyId/costos?desde=..&hasta=..
 */
export async function getCostos(companyId: string, rango: RangoFechas): Promise<CostoItem[]> {
  const hist = await historicoDe(companyId);
  return fakeNetwork(enRango(hist, rango), 200);
}

/**
 * Resumen de costos de una empresa en un rango: total, desglose por producto/
 * servicio, por categoría y los vehículos que más gastan.
 *
 * TODO API: GET /empresas/:companyId/costos/resumen?desde=..&hasta=..
 */
export async function getResumenCostos(companyId: string, rango: RangoFechas): Promise<ResumenCostos> {
  const hist = await historicoDe(companyId);
  const items = enRango(hist, rango);
  const total = items.reduce((a, i) => a + i.monto, 0);

  const porCatMap = new Map<string, number>();
  const porVehMap = new Map<string, { vehicleLabel: string; total: number }>();
  let producto = 0;
  let servicio = 0;
  for (const i of items) {
    porCatMap.set(i.categoriaId, (porCatMap.get(i.categoriaId) ?? 0) + i.monto);
    const v = porVehMap.get(i.vehicleId) ?? { vehicleLabel: i.vehicleLabel, total: 0 };
    v.total += i.monto;
    porVehMap.set(i.vehicleId, v);
    if (i.clase === 'producto') producto += i.monto;
    else servicio += i.monto;
  }

  const porCategoria: CostoPorCategoria[] = [...porCatMap.entries()]
    .map(([id, monto]) => ({
      categoria: categoriaDe(id),
      total: monto,
      porcentaje: total > 0 ? Math.round((monto / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const topVehiculos = [...porVehMap.entries()]
    .map(([vehicleId, v]) => ({ vehicleId, vehicleLabel: v.vehicleLabel, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return fakeNetwork({
    rango,
    total,
    nItems: items.length,
    porClase: { producto, servicio },
    porCategoria,
    topVehiculos,
  });
}

/**
 * Total de costos por empresa en un rango (para la comparación del admin
 * general). Sin `companyIds`, compara todas las empresas cliente.
 *
 * TODO API: GET /empresas/costos?ids=..&desde=..&hasta=..
 */
export async function getCostosPorEmpresa(rango: RangoFechas, companyIds?: string[]): Promise<CostoEmpresa[]> {
  const empresas = listarEmpresasMock().filter((c) => !companyIds || companyIds.includes(c.id));
  const stats = await Promise.all(
    empresas.map(async (company) => {
      const hist = await historicoDe(company.id);
      const total = enRango(hist, rango).reduce((a, i) => a + i.monto, 0);
      return { company, total };
    }),
  );
  return fakeNetwork(stats.sort((a, b) => b.total - a.total));
}
