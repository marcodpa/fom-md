/**
 * MI PERFIL (autoservicio): cada usuario edita su propia información — foto,
 * cédula, dirección, fecha de nacimiento — desde cualquier superficie. El
 * email NO se toca aquí (lo cambia un administrador desde el CRUD, porque
 * vive en la cuenta de acceso).
 */

import { validarFecha } from '@/lib/validate';
import { supabase } from '@/lib/supabase';

import { esIdDb } from './db';
import { fakeNetwork } from './network';

export interface MiPerfil {
  nombre: string;
  cedula?: string;
  /** Teléfono compuesto ("+58 4141234567"). */
  telefono?: string;
  direccion?: string;
  /** ISO corto AAAA-MM-DD. */
  fechaNacimiento?: string;
  fotoUrl?: string;
  // Licencia y carta médica (solo aplican a conductores). Se editan desde "Mi
  // perfil" con las mismas reglas de fecha del alta; si el campo llega
  // `undefined` no se toca la columna (los no-conductores no lo mandan).
  licenciaNumero?: string;
  licenciaCategoria?: string;
  /** ISO corto AAAA-MM-DD. */
  licenciaVence?: string;
  /** ISO corto AAAA-MM-DD. */
  cartaMedicaVence?: string;
}

/** Respaldo mock: lo editado en la sesión (por usuario). */
const MOCK_PERFILES = new Map<string, MiPerfil>();

/** El perfil editable del usuario logueado. */
export async function getMiPerfil(userId: string, nombreActual: string): Promise<MiPerfil> {
  if (supabase && esIdDb(userId)) {
    const { data } = await supabase
      .from('perfiles')
      .select('nombre, cedula, telefono, direccion, fecha_nacimiento, foto_url, licencia_numero, licencia_categoria, licencia_vence, carta_medica_vence')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      const f = data as unknown as {
        nombre: string | null;
        cedula: string | null;
        telefono: string | null;
        direccion: string | null;
        fecha_nacimiento: string | null;
        foto_url: string | null;
        licencia_numero: string | null;
        licencia_categoria: string | null;
        licencia_vence: string | null;
        carta_medica_vence: string | null;
      };
      return {
        nombre: f.nombre ?? nombreActual,
        cedula: f.cedula ?? undefined,
        telefono: f.telefono ?? undefined,
        direccion: f.direccion ?? undefined,
        fechaNacimiento: f.fecha_nacimiento ?? undefined,
        fotoUrl: f.foto_url ?? undefined,
        licenciaNumero: f.licencia_numero ?? undefined,
        licenciaCategoria: f.licencia_categoria ?? undefined,
        licenciaVence: f.licencia_vence ?? undefined,
        cartaMedicaVence: f.carta_medica_vence ?? undefined,
      };
    }
  }
  return fakeNetwork(MOCK_PERFILES.get(userId) ?? { nombre: nombreActual });
}

/** Guarda los cambios del propio perfil (RLS: solo la fila propia). */
export async function actualizarMiPerfil(userId: string, perfil: MiPerfil): Promise<void> {
  const fecha = perfil.fechaNacimiento?.trim();
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error('La fecha de nacimiento va como AAAA-MM-DD (ej. 1990-05-14).');
  }
  if (!perfil.nombre.trim()) throw new Error('Ponle tu nombre.');

  // Licencia y carta médica (si vienen): mismas reglas de fecha del alta.
  const licVence = perfil.licenciaVence?.trim();
  if (licVence) {
    const err = validarFecha(licVence);
    if (err) throw new Error(`Licencia · vence: ${err}`);
  }
  const cartaVence = perfil.cartaMedicaVence?.trim();
  if (cartaVence) {
    const err = validarFecha(cartaVence);
    if (err) throw new Error(`Carta médica · vence: ${err}`);
  }

  if (supabase && esIdDb(userId)) {
    // Solo se tocan las columnas de licencia/carta si el campo llega definido
    // (los no-conductores no las mandan, así no se borran por accidente).
    const update: Record<string, unknown> = {
      nombre: perfil.nombre.trim(),
      cedula: perfil.cedula?.trim() || null,
      direccion: perfil.direccion?.trim() || null,
      fecha_nacimiento: fecha || null,
      foto_url: perfil.fotoUrl || null,
    };
    if (perfil.telefono !== undefined) update.telefono = perfil.telefono.trim() || null;
    if (perfil.licenciaNumero !== undefined) update.licencia_numero = perfil.licenciaNumero.trim() || null;
    if (perfil.licenciaCategoria !== undefined) update.licencia_categoria = perfil.licenciaCategoria.trim() || null;
    if (perfil.licenciaVence !== undefined) update.licencia_vence = licVence || null;
    if (perfil.cartaMedicaVence !== undefined) update.carta_medica_vence = cartaVence || null;

    const { error } = await supabase.from('perfiles').update(update).eq('id', userId);
    if (error) throw new Error('No se pudo guardar tu perfil. Intenta de nuevo.');
    return;
  }
  MOCK_PERFILES.set(userId, { ...perfil, nombre: perfil.nombre.trim() });
  return fakeNetwork(undefined, 350);
}
