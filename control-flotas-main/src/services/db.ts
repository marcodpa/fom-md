/**
 * Utilidades compartidas de la BD provisional.
 *
 * La app usa el SLUG como id de empresa y los servicios mock usan ids tipo
 * `veh-014`; la BD usa uuids. Aquí viven la traducción slug → uuid (con caché)
 * y el detector de ids de BD, para que cada servicio decida si una consulta va
 * a Supabase o al mock.
 */

import { supabase } from '@/lib/supabase';

/** ¿El id es un uuid de la BD (y no un id del mock tipo `veh-014`)? */
export function esIdDb(id: string | undefined | null): boolean {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Caché slug → uuid de empresas (estable durante la sesión).
const _idPorSlug = new Map<string, string>();

/** uuid de una empresa por su slug (o `null` si no hay BD o no existe). */
export async function empresaIdDe(slug: string | undefined | null): Promise<string | null> {
  if (!supabase || !slug) return null;
  const hit = _idPorSlug.get(slug);
  if (hit) return hit;
  const { data } = await supabase.from('empresas').select('id').eq('slug', slug).maybeSingle();
  const id = (data as { id: string } | null)?.id ?? null;
  if (id) _idPorSlug.set(slug, id);
  return id;
}
