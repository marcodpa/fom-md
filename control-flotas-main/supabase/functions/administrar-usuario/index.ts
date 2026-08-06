// ============================================================================
// Edge Function: administrar-usuario
// ============================================================================
// EDITA o "ELIMINA" un usuario del sistema usando la LLAVE DE SERVICIO (solo
// vive en el servidor): cambiar nombre/email/cédula, moverlo de ente, cambiar
// su perfil, o ELIMINARLO de su empresa — que NO borra su cuenta: lo mueve a
// la ente de respaldo "Desempleados C.A." (servicio suspendido, visible solo
// para FOM) para poder reasignarlo después sin re-crear la cuenta.
//
// Alcances (regla del producto):
//  - admin (los 3 FOM): administra a cualquiera, en cualquier ente.
//  - supervisor_company de una COMPAÑÍA (tipo predefinida): a la gente de su
//    compañía Y de sus empresas asociadas; puede moverla entre esas entes.
//  - supervisor_company de contratista y supervisor_personal de cuenta
//    personal: SOLO a la gente de su propio ente (sin moverla de empresa).
//  - NADIE toca a un admin FOM, y nadie se elimina a sí mismo.
//
// Despliegue: Dashboard → Edge Functions → Deploy new function →
// nombre `administrar-usuario` → pegar este archivo → Deploy (Verify JWT ON).
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Rol =
  | 'conductor'
  | 'supervisor_company'
  | 'supervisor_personal'
  | 'usuario_personal';

const ROLES_VALIDOS: Rol[] = [
  'conductor',
  'supervisor_company',
  'supervisor_personal',
  'usuario_personal',
];

/** Ente de respaldo para la gente "eliminada" de su empresa. */
const DESEMPLEADOS_SLUG = 'desempleados-ca';

type Payload = {
  accion?: 'actualizar' | 'eliminar' | 'clave' | 'eliminar_definitivo';
  user_id?: string;
  nombre?: string;
  email?: string;
  cedula?: string;
  /** Ausente = no tocar; presente = teléfono compuesto ("+58 4141234567"). */
  telefono?: string | null;
  /** Ausente = no tocar; null = dejarlo SIN empresa; slug = moverlo a esa ente. */
  empresa_slug?: string | null;
  rol?: Rol;
  /** Nueva clave (solo accion 'clave'). */
  nueva_clave?: string;
};

function responder(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) ¿QUIÉN llama?
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: quien } = await admin.auth.getUser(jwt);
    if (!quien?.user) return responder(401, { error: 'Inicia sesión para administrar usuarios.' });

    const { data: caller } = await admin
      .from('perfiles')
      .select('rol, empresa_id')
      .eq('id', quien.user.id)
      .single();
    if (!caller) return responder(403, { error: 'Tu usuario no tiene perfil asignado.' });

    // 2) Payload y usuario OBJETIVO.
    const body = (await req.json()) as Payload;
    const accion = body.accion;
    const userId = (body.user_id ?? '').trim();
    const ACCIONES = ['actualizar', 'eliminar', 'clave', 'eliminar_definitivo'];
    if (!accion || !ACCIONES.includes(accion) || !userId) {
      return responder(400, { error: 'Petición no válida.' });
    }

    const { data: objetivo } = await admin
      .from('perfiles')
      .select('id, rol, empresa_id, email, nombre')
      .eq('id', userId)
      .single();
    if (!objetivo) return responder(404, { error: 'Usuario no encontrado.' });
    if (objetivo.rol === 'admin') {
      return responder(403, { error: 'Los administradores FOM no se administran desde aquí.' });
    }

    // 3) ALCANCE del que llama.
    const esAdminFom = caller.rol === 'admin';
    let alcance: Set<string> | null = null; // null = todo el sistema (admin FOM)
    if (!esAdminFom) {
      if (caller.rol !== 'supervisor_company' && caller.rol !== 'supervisor_personal') {
        return responder(403, { error: 'No tienes permiso para administrar usuarios.' });
      }
      if (!caller.empresa_id) return responder(403, { error: 'Ya no tienes empresa asignada.' });
      alcance = new Set([caller.empresa_id]);
      if (caller.rol === 'supervisor_company') {
        // ¿Su ente es una COMPAÑÍA? El alcance suma sus asociadas.
        const { data: propia } = await admin
          .from('empresas')
          .select('tipo')
          .eq('id', caller.empresa_id)
          .single();
        if (propia?.tipo === 'predefinida') {
          const { data: asociadas } = await admin
            .from('empresa_predefinidas')
            .select('empresa_id')
            .eq('predefinida_id', caller.empresa_id);
          for (const a of asociadas ?? []) alcance.add(a.empresa_id);
        }
      }
      // El objetivo debe estar dentro del alcance (los "sin empresa" son de FOM).
      if (!objetivo.empresa_id || !alcance.has(objetivo.empresa_id)) {
        return responder(403, { error: 'Ese usuario está fuera de tu alcance.' });
      }
    }

    // ── ELIMINAR: NO borra la cuenta — la persona sale de su empresa y pasa
    //    a "Desempleados C.A." (respaldo, servicio suspendido) hasta que la
    //    administración FOM la reasigne. Así una recontratación no obliga a
    //    crearle una cuenta nueva. ──
    if (accion === 'eliminar') {
      if (userId === quien.user.id) {
        return responder(403, { error: 'No puedes eliminarte a ti mismo.' });
      }
      // La ente de respaldo se garantiza aquí mismo (idempotente).
      let { data: respaldo } = await admin
        .from('empresas')
        .select('id')
        .eq('slug', DESEMPLEADOS_SLUG)
        .maybeSingle();
      if (!respaldo) {
        const { data: creada } = await admin
          .from('empresas')
          .insert({ slug: DESEMPLEADOS_SLUG, nombre: 'Desempleados C.A.', tipo: 'estandar', servicio_activo: false })
          .select('id')
          .single();
        respaldo = creada;
      }
      if (!respaldo) return responder(500, { error: 'No se pudo preparar la ente de respaldo.' });
      const { error: errMover } = await admin
        .from('perfiles')
        .update({ empresa_id: respaldo.id })
        .eq('id', userId);
      if (errMover) return responder(500, { error: 'No se pudo eliminar el usuario de su empresa.' });
      return responder(200, { ok: true });
    }

    // ── ELIMINAR DEFINITIVAMENTE: borra la cuenta de VERDAD (auth + perfil en
    //    cascada). SOLO el admin FOM y SOLO desde el respaldo "Desempleados
    //    C.A." — así el borrado permanente exige el paso previo de sacarlo de
    //    su empresa. No se puede a sí mismo ni a un admin FOM (bloqueado). ──
    if (accion === 'eliminar_definitivo') {
      if (!esAdminFom) {
        return responder(403, { error: 'Solo la administración FOM elimina cuentas definitivamente.' });
      }
      if (userId === quien.user.id) {
        return responder(403, { error: 'No puedes eliminarte a ti mismo.' });
      }
      const { data: respaldo } = await admin
        .from('empresas')
        .select('id')
        .eq('slug', DESEMPLEADOS_SLUG)
        .maybeSingle();
      if (!respaldo || objetivo.empresa_id !== respaldo.id) {
        return responder(400, {
          error: 'Una cuenta solo se elimina definitivamente desde el respaldo (Desempleados C.A.).',
        });
      }
      // Borra el usuario de auth; la FK perfiles→auth.users (on delete cascade)
      // arrastra el perfil y todo lo suyo (cascade / set null).
      const { error: errDel } = await admin.auth.admin.deleteUser(userId);
      if (errDel) return responder(500, { error: 'No se pudo eliminar la cuenta.' });
      return responder(200, { ok: true });
    }

    // ── CAMBIAR CLAVE de otro usuario: SOLO el admin FOM, y NUNCA la de un
    //    admin FOM (bloqueado arriba) ni la suya propia. ──
    if (accion === 'clave') {
      if (!esAdminFom) {
        return responder(403, { error: 'Solo la administración FOM cambia la clave de otros usuarios.' });
      }
      if (userId === quien.user.id) {
        return responder(403, { error: 'Tu propia clave la cambias desde tu perfil.' });
      }
      const clave = (body.nueva_clave ?? '').trim();
      if (clave.length < 8) return responder(400, { error: 'La clave debe tener al menos 8 caracteres.' });
      const { error: errClave } = await admin.auth.admin.updateUserById(userId, { password: clave });
      if (errClave) return responder(500, { error: 'No se pudo cambiar la clave.' });
      return responder(200, { ok: true });
    }

    // ── ACTUALIZAR ──
    const nombre = body.nombre?.trim();
    const email = body.email?.trim().toLowerCase();
    const cedula = body.cedula?.trim();
    const rol = body.rol;
    if (rol && !ROLES_VALIDOS.includes(rol)) return responder(400, { error: 'Perfil no válido.' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return responder(400, { error: 'Indica un email válido.' });
    }

    // Resolver el ENTE destino (si viene): slug → id/tipo, o null = sin empresa.
    let empresaFinalId: string | null = objetivo.empresa_id;
    let empresaFinalSlug: string | null = null;
    let empresaFinalTipo: string | null = null;
    if ('empresa_slug' in body) {
      if (body.empresa_slug === null) {
        if (!esAdminFom) {
          return responder(403, { error: 'Dejar a alguien sin empresa es de la administración FOM.' });
        }
        empresaFinalId = null;
      } else {
        const { data: destino } = await admin
          .from('empresas')
          .select('id, slug, tipo')
          .eq('slug', (body.empresa_slug ?? '').trim())
          .single();
        if (!destino) return responder(400, { error: 'Empresa no encontrada.' });
        if (alcance && !alcance.has(destino.id)) {
          return responder(403, { error: 'Solo puedes mover gente entre tus propias entes.' });
        }
        empresaFinalId = destino.id;
        empresaFinalSlug = destino.slug;
        empresaFinalTipo = destino.tipo;
      }
    }
    if (empresaFinalId && !empresaFinalTipo) {
      const { data: actual } = await admin
        .from('empresas')
        .select('slug, tipo')
        .eq('id', empresaFinalId)
        .single();
      empresaFinalSlug = actual?.slug ?? null;
      empresaFinalTipo = actual?.tipo ?? null;
    }

    // El TIPO del ente final valida el perfil final (mismas reglas del alta).
    const rolFinal = (rol ?? objetivo.rol) as Rol;
    if (empresaFinalTipo) {
      const esRolPersonal = rolFinal === 'supervisor_personal' || rolFinal === 'usuario_personal';
      if (rolFinal === 'conductor' && empresaFinalTipo === 'predefinida') {
        return responder(400, { error: 'Una compañía no opera flota propia: su perfil es el Supervisor.' });
      }
      if (esRolPersonal && empresaFinalTipo !== 'personal') {
        return responder(400, { error: 'Los perfiles personales pertenecen a una cuenta PERSONAL.' });
      }
      if (!esRolPersonal && empresaFinalTipo === 'personal') {
        return responder(400, { error: 'Una cuenta personal solo admite perfiles personales.' });
      }
    }

    // Email: vive en auth.users; se sincroniza también en perfiles.
    if (email && email !== objetivo.email) {
      const { error: errEmail } = await admin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
      });
      if (errEmail) {
        const yaExiste = (errEmail.code ?? '').includes('email_exists');
        return responder(yaExiste ? 409 : 400, {
          error: yaExiste ? 'Ya existe un usuario con ese email.' : 'No se pudo cambiar el email.',
        });
      }
    }

    const { error: errPerfil } = await admin
      .from('perfiles')
      .update({
        ...(nombre ? { nombre } : {}),
        ...(email ? { email } : {}),
        ...(cedula !== undefined ? { cedula: cedula || null } : {}),
        ...('telefono' in body ? { telefono: (body.telefono ?? '').trim() || null } : {}),
        ...('empresa_slug' in body ? { empresa_id: empresaFinalId } : {}),
        ...(rol ? { rol, conduce: rol === 'conductor' } : {}),
      })
      .eq('id', userId);
    if (errPerfil) return responder(500, { error: 'No se pudo guardar el cambio. Intenta de nuevo.' });

    return responder(200, {
      id: userId,
      nombre: nombre ?? objetivo.nombre ?? '',
      email: email ?? objetivo.email,
      rol: rolFinal,
      empresa_slug: empresaFinalId ? empresaFinalSlug : null,
    });
  } catch (_e) {
    return responder(500, { error: 'Error inesperado administrando el usuario.' });
  }
});
