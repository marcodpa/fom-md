/**
 * Servicio de marcas de empresa (capa de datos abstracta).
 *
 * Hoy devuelve datos simulados (mock). Cuando la API/BD de Juan esté lista,
 * se cambia SOLO la implementación de estas funciones, sin tocar pantallas
 * ni el sistema de temas. Por eso devuelven Promesas: el contrato ya es async.
 */

import { supabase } from '@/lib/supabase';
import { DEFAULT_BRAND } from '@/theme';
import type { CompanyBrand } from '@/theme';

/** Marca + el id de empresa con el que la liga el resto del sistema. */
type CompanyBrandEntry = CompanyBrand & { companyId?: string };

/**
 * Empresas de ejemplo (del brief: Samfor como primer cliente, Chevron como
 * admin general). Cada una aporta su propio color de acento.
 */
const MOCK_BRANDS: CompanyBrandEntry[] = [
  DEFAULT_BRAND,
  { companyId: 'Samfor', name: 'Samfor', primaryColor: '#0F7B6C', logo: null },
  { companyId: 'petrosur', name: 'Petrosur', primaryColor: '#B4530A', logo: null },
  { companyId: 'chevron', name: 'Chevron', primaryColor: '#1A3FAA', logo: null },
  { companyId: 'pdvsa-petroboscan', name: 'PDVSA Petroboscan', primaryColor: '#B3261E', logo: null },
];

/** Quita el `companyId` interno y devuelve la marca pública del tema. */
function toBrand({ companyId: _id, ...brand }: CompanyBrandEntry): CompanyBrand {
  return brand;
}

/** Lista las marcas disponibles. Mock: resuelve de inmediato. */
export async function getCompanyBrands(): Promise<CompanyBrand[]> {
  return MOCK_BRANDS.map(toBrand);
}

/** Obtiene la marca de una empresa por nombre. Mock. */
export async function getCompanyBrandByName(name: string): Promise<CompanyBrand | undefined> {
  const found = MOCK_BRANDS.find((b) => b.name === name);
  return found ? toBrand(found) : undefined;
}

/**
 * Obtiene la marca de una empresa por su id (el que trae el usuario logueado).
 * Es la vía que usa el dashboard para "pintarse" con la marca de la empresa.
 * Con la BD provisional lee `empresas.color_marca`; sin color (o sin BD) usa
 * el mock y, en última instancia, la identidad base de la app.
 */
// Caché por empresa: devuelve la MISMA referencia en llamadas repetidas (las
// pantallas piden la marca en cada foco; sin caché, cada foco = objeto nuevo =
// re-render global + un viaje a la BD).
const _brandCache = new Map<string, CompanyBrand>();

export async function getCompanyBrandById(companyId: string): Promise<CompanyBrand | undefined> {
  const cacheada = _brandCache.get(companyId);
  if (cacheada) return cacheada;
  if (supabase) {
    const { data } = await supabase
      .from('empresas')
      .select('nombre, color_marca')
      .eq('slug', companyId)
      .maybeSingle();
    if (data) {
      const fila = data as unknown as { nombre: string; color_marca: string | null };
      const brand: CompanyBrand = {
        name: fila.nombre,
        primaryColor: fila.color_marca ?? DEFAULT_BRAND.primaryColor,
        logo: null,
      };
      _brandCache.set(companyId, brand);
      return brand;
    }
  }
  const found = MOCK_BRANDS.find((b) => b.companyId === companyId);
  if (!found) return undefined;
  const brand = toBrand(found);
  _brandCache.set(companyId, brand);
  return brand;
}

/** Invalida la marca cacheada de una empresa (al editar su color/nombre). */
export function invalidarBrandCache(companyId?: string): void {
  if (companyId) _brandCache.delete(companyId);
  else _brandCache.clear();
}
