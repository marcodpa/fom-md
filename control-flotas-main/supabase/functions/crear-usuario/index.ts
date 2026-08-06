// ============================================================================
// Edge Function: crear-usuario
// ============================================================================
// Crea un usuario del sistema DESDE LA APP (Consola del admin FOM o panel del
// supervisor) usando la LLAVE DE SERVICIO, que vive solo aquí en el servidor
// — la app únicamente lleva la llave pública.
//
// Reglas de permisos del producto:
//  - admin (los 3 desarrolladores): crea cualquier perfil en cualquier ente.
//  - supervisor_company: el operativo de su ente (en una COMPAÑÍA se llama
//    "Supervisor" y gestiona a sus contratistas asociadas; en contratistas y
//    empresas, "Administrador"). Solo crea conductores de SU propia empresa.
//  - Las cuentas PERSONALES solo admiten supervisor_personal/usuario_personal.
//  - Una cuenta PERSONAL solo admite perfiles personales (supervisor/usuario).
//
// El usuario nace confirmado, con su clave, y con perfil_completo=false: en su
// primer ingreso rellena su formato (cédula, licencia, carta médica).
//
// Despliegue: `npx supabase functions deploy crear-usuario` (o pegar este
// archivo en Dashboard → Edge Functions → Deploy a new function).
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

type Payload = {
  email?: string;
  password?: string;
  nombre?: string;
  rol?: Rol;
  empresa_slug?: string;
  telefono?: string | null;
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
    // Cliente con la llave de servicio (solo existe en el servidor).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) ¿QUIÉN llama? El JWT del usuario logueado viene en Authorization.
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: quien } = await admin.auth.getUser(jwt);
    if (!quien?.user) return responder(401, { error: 'Inicia sesión para crear usuarios.' });

    const { data: caller } = await admin
      .from('perfiles')
      .select('rol, empresa_id')
      .eq('id', quien.user.id)
      .single();
    if (!caller) return responder(403, { error: 'Tu usuario no tiene perfil asignado.' });

    // 2) Datos del usuario nuevo.
    const body = (await req.json()) as Payload;
    const email = (body.email ?? '').trim().toLowerCase();
    const password = (body.password ?? '').trim();
    const nombre = (body.nombre ?? '').trim();
    const rol = body.rol;
    const empresaSlug = (body.empresa_slug ?? '').trim();
    const telefono = (body.telefono ?? '').trim();

    if (!nombre) return responder(400, { error: 'Ponle nombre al usuario.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return responder(400, { error: 'Indica un email válido.' });
    if (password.length < 8) return responder(400, { error: 'La clave debe tener al menos 8 caracteres.' });
    if (!rol || !ROLES_VALIDOS.includes(rol)) {
      return responder(400, { error: 'Perfil no válido.' });
    }

    const { data: empresa } = await admin
      .from('empresas')
      .select('id, tipo')
      .eq('slug', empresaSlug)
      .single();
    if (!empresa) return responder(400, { error: 'Empresa no encontrada.' });

    // 3) Permisos del que llama (regla del producto):
    //    - admin FOM: cualquier perfil en cualquier ente.
    //    - administrador de COMPAÑÍA: usuarios de su compañía y sus asociadas.
    //    - administrador de contratista: SOLO conductores de su empresa.
    //    - supervisor personal: usuarios de su propia cuenta personal.
    const esAdminFom = caller.rol === 'admin';
    if (!esAdminFom) {
      if (caller.rol === 'supervisor_company' && caller.empresa_id) {
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
          const alcance = new Set([caller.empresa_id, ...(asociadas ?? []).map((a) => a.empresa_id)]);
          if (!alcance.has(empresa.id)) {
            return responder(403, { error: 'Solo creas usuarios de tu compañía o de sus empresas asociadas.' });
          }
        } else if (rol !== 'conductor' || empresa.id !== caller.empresa_id) {
          return responder(403, { error: 'Como administrador solo creas conductores de tu propia empresa.' });
        }
      } else if (caller.rol === 'supervisor_personal' && caller.empresa_id) {
        if (empresa.id !== caller.empresa_id) {
          return responder(403, { error: 'Solo creas usuarios de tu propia cuenta.' });
        }
      } else {
        return responder(403, { error: 'No tienes permiso para crear usuarios.' });
      }
    }

    // 4) El TIPO de ente valida el perfil: los perfiles personales ⇔ cuenta
    //    personal; una COMPAÑÍA no opera flota propia (no admite conductores):
    //    su único perfil es el Supervisor, que gestiona a sus asociadas.
    const esRolPersonal = rol === 'supervisor_personal' || rol === 'usuario_personal';
    if (rol === 'conductor' && empresa.tipo === 'predefinida') {
      return responder(400, { error: 'Una compañía no opera flota propia: su perfil es el Supervisor.' });
    }
    if (esRolPersonal && empresa.tipo !== 'personal') {
      return responder(400, { error: 'Los perfiles personales pertenecen a una cuenta PERSONAL.' });
    }
    if (!esRolPersonal && empresa.tipo === 'personal') {
      return responder(400, { error: 'Una cuenta personal solo admite perfiles personales (supervisor o usuario personal).' });
    }

    // 5) Crear la cuenta CONFIRMADA (el trigger de la BD crea su perfil vacío).
    const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (errCrear || !creado?.user) {
      const yaExiste = (errCrear?.code ?? '').includes('email_exists');
      return responder(yaExiste ? 409 : 400, {
        error: yaExiste ? 'Ya existe un usuario con ese email.' : 'No se pudo crear la cuenta.',
      });
    }

    // 6) Asignar el PERFIL: rol + empresa definen su vista y sus permisos.
    const { error: errPerfil } = await admin
      .from('perfiles')
      .update({
        nombre,
        rol,
        empresa_id: empresa.id,
        conduce: rol === 'conductor',
        telefono: telefono || null,
        perfil_completo: false, // rellena su formato en el primer ingreso
      })
      .eq('id', creado.user.id);
    if (errPerfil) {
      // Sin perfil el usuario quedaría a medias: se revierte la cuenta.
      await admin.auth.admin.deleteUser(creado.user.id);
      return responder(500, { error: 'No se pudo asignar el perfil. Intenta de nuevo.' });
    }

    return responder(200, { id: creado.user.id, email, nombre, rol, empresa_slug: empresaSlug });
  } catch (_e) {
    return responder(500, { error: 'Error inesperado creando el usuario.' });
  }
});
