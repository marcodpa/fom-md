/**
 * Servicio de autenticación (capa de datos abstracta).
 *
 * Hoy valida contra usuarios simulados (mock). Cuando exista el backend real
 * (auth de Juan / proveedor de identidad), se reescribe SOLO `signIn` aquí,
 * sin tocar pantallas ni el contexto de auth.
 *
 * ⚠️ MOCK / SOLO DESARROLLO: las credenciales de abajo son temporales y NO
 * deben usarse en producción. La validación real de contraseñas ocurrirá en
 * el backend; aquí solo simulamos el flujo.
 */

import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

import { registrarAuditoria } from './auditoriaService';
import { DESEMPLEADOS_ID, getTipoEmpresa, getTipoEmpresaSync } from './companyService';
import { fakeNetwork, seed } from './network';
import { marcarPerfilPendiente, registrarConductorNuevo } from './userService';

/** Usuario interno del mock: como `User` pero con contraseña (nunca se expone). */
type MockCredential = User & { password: string };

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  ADMINS FOM — los ÚNICOS usuarios que nacen con el sistema: los 3    │
 * │  desarrolladores. TODO lo demás (supervisores generales, de empresa, │
 * │  conductores, cuentas personales) lo crean ELLOS desde la Consola,   │
 * │  eligiendo el perfil y la empresa — eso define su vista y permisos.  │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const ADMINS_FOM: MockCredential[] = seed<MockCredential>([
  { id: 'adm-juan', name: 'Juan Guerra', email: 'jguerracaldera@gmail.com', role: 'admin', drives: false, password: 'Flotas2026..' },
  { id: 'adm-marco', name: 'Marco Pacheco', email: 'marcodpacheco@gmail.com', role: 'admin', drives: false, password: 'Flotas2026..' },
  { id: 'adm-juanp', name: 'Juan Pacheco', email: 'juancpachecog@gmail.com', role: 'admin', drives: false, password: 'Flotas2026..' },
]);

/** Todos los usuarios conocidos por el mock (crece con lo creado en Consola). */
const MOCK_USERS: MockCredential[] = [...ADMINS_FOM];

/** Quita la contraseña antes de devolver el usuario a la app. */
function toPublicUser({ password: _password, ...user }: MockCredential): User {
  // El TIPO del ente decide la superficie (compañía → /compania).
  return {
    ...user,
    companyTipo: user.companyId ? (getTipoEmpresaSync(user.companyId) ?? undefined) : undefined,
  };
}

let _supSeq = 10;

/**
 * Crea el SUPERVISOR de una empresa con su invitación (FOM-02 §1.1): nombre,
 * email, rol `supervisor_company` y su empresa. En el mock la "invitación" deja
 * la credencial lista (contraseña estándar de demo) para poder entrar de una;
 * al entrar llenará su perfil (cédula, licencia, carta médica).
 *
 * TODO API: POST /usuarios (rol supervisor_company) + envío de invitación.
 */
export async function crearSupervisorEmpresa(
  companyId: string,
  nombre: string,
  email: string,
): Promise<User> {
  // Con BD: mismo camino real que la Consola (Edge Function).
  if (supabase) {
    return crearUsuarioConRol({ companyId, nombre, email, role: 'supervisor_company' });
  }
  const limpio = nombre.trim();
  const mail = email.trim().toLowerCase();
  if (!limpio) throw new Error('Ponle nombre al supervisor.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new Error('Indica un email válido.');
  if (MOCK_USERS.some((u) => u.email.toLowerCase() === mail)) {
    throw new Error('Ya existe un usuario con ese email.');
  }
  const cred: MockCredential = {
    id: `sc-${++_supSeq}`,
    name: limpio,
    email: mail,
    role: 'supervisor_company',
    companyId,
    drives: false,
    password: 'Flotas2026..',
  };
  MOCK_USERS.push(cred);
  return fakeNetwork(toPublicUser(cred), 500);
}

/**
 * Crea un CONDUCTOR de una empresa (lo crea su supervisor): nombre, email, su
 * CLAVE (elegida a mano o la de demo) y su empresa. Queda loginable de una y
 * pasará por el gate de perfil obligatorio al entrar: rellena su formato con
 * todos sus datos (cédula, licencia, carta médica).
 *
 * TODO API: POST /usuarios (rol conductor) + envío de invitación.
 */
export async function crearConductorEmpresa(
  companyId: string,
  nombre: string,
  email: string,
  password?: string,
): Promise<User> {
  const limpio = nombre.trim();
  const mail = email.trim().toLowerCase();
  const clave = (password ?? '').trim() || 'Flotas2026..';
  if (!limpio) throw new Error('Ponle nombre al conductor.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new Error('Indica un email válido.');
  if (clave.length < 8) throw new Error('La clave debe tener al menos 8 caracteres.');
  if (MOCK_USERS.some((u) => u.email.toLowerCase() === mail)) {
    throw new Error('Ya existe un usuario con ese email.');
  }
  const cred: MockCredential = {
    id: `cd-${++_supSeq}`,
    name: limpio,
    email: mail,
    role: 'conductor',
    companyId,
    drives: true,
    password: clave,
  };
  MOCK_USERS.push(cred);
  registrarConductorNuevo(cred.id, limpio, companyId);
  return fakeNetwork(toPublicUser(cred), 500);
}

/**
 * Roles que se pueden ASIGNAR al crear un usuario. Regla del producto: solo
 * los admin FOM (los 3 desarrolladores) eligen el rol/perfil (qué vista y qué
 * permisos tendrá) y la ente; los administradores de empresa SOLO crean
 * conductores de su propia empresa.
 * - `supervisor_company` = el operativo de su ente: crea y edita todo
 *   (vehículos, usuarios, ODT). En una COMPAÑÍA se llama "SUPERVISOR" y además
 *   gestiona a sus contratistas asociadas (reportes, comparativas, histórico);
 *   en contratistas y empresas se llama "ADMINISTRADOR".
 * - `supervisor_personal` / `usuario_personal`: cuentas de una ente
 *   PERSONAL (familia/oficina pequeña), FOM-02 §5–§6.
 */
export type RolAsignable =
  | 'conductor'
  | 'supervisor_company'
  | 'supervisor_personal'
  | 'usuario_personal';

/** ¿El rol es de cuenta personal (empresa tipo `personal`)? */
function esRolPersonal(role: RolAsignable): boolean {
  return role === 'supervisor_personal' || role === 'usuario_personal';
}

/**
 * Crea un usuario con el ROL elegido (solo para admin FOM). El tipo de empresa
 * valida el rol: una empresa GENERAL (predefinida) solo admite supervisores
 * generales; las demás, conductores y supervisores de empresa.
 *
 * TODO API: POST /usuarios { role } — en Supabase será una Edge Function con
 * service_role (la app nunca lleva esa llave).
 */
export async function crearUsuarioConRol(input: {
  companyId: string;
  nombre: string;
  email: string;
  password?: string;
  role: RolAsignable;
  telefono?: string;
}): Promise<User> {
  // BD provisional: la cuenta se crea DE VERDAD vía la Edge Function
  // `crear-usuario` (la llave de servicio vive en el servidor, no en la app).
  if (supabase) {
    const { data, error } = await supabase.functions.invoke('crear-usuario', {
      body: {
        email: input.email.trim().toLowerCase(),
        password: (input.password ?? '').trim() || 'Flotas2026..',
        nombre: input.nombre.trim(),
        rol: input.role,
        empresa_slug: input.companyId,
        telefono: input.telefono?.trim() || null,
      },
    });
    if (error) {
      // El mensaje útil viene en el cuerpo de la respuesta de la función.
      let msg = 'No se pudo crear el usuario.';
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        try {
          const cuerpo = (await ctx.json()) as { error?: string };
          if (cuerpo?.error) msg = cuerpo.error;
        } catch {
          // sin cuerpo legible: se queda el mensaje genérico
        }
      }
      throw new Error(msg);
    }
    const r = data as { id: string; email: string; nombre: string; rol: User['role']; empresa_slug: string };
    registrarAuditoria({ accion: 'crear', entidad: 'usuario', objetivo: r.nombre, companyId: r.empresa_slug });
    return {
      id: r.id,
      name: r.nombre,
      email: r.email,
      role: r.rol,
      companyId: r.empresa_slug,
      drives: r.rol === 'conductor',
    };
  }

  // Modo mock (sin .env). El TIPO de ente valida el rol:
  //  - SUPERVISOR (solo lectura de asociadas) solo en compañías.
  //  - Compañías y contratistas admiten Administrador y Conductor (la
  //    compañía también opera su propia flota).
  //  - Las cuentas personales, solo perfiles personales.
  const tipoEmpresa = await getTipoEmpresa(input.companyId);
  if (input.role === 'conductor' && tipoEmpresa === 'predefinida') {
    throw new Error('Una compañía no opera flota propia: solo admite Administrador y Supervisor.');
  }
  if (esRolPersonal(input.role) && tipoEmpresa !== 'personal') {
    throw new Error('Los perfiles personales pertenecen a una cuenta PERSONAL.');
  }
  if (!esRolPersonal(input.role) && tipoEmpresa === 'personal') {
    throw new Error('Una cuenta personal solo admite perfiles personales (supervisor o usuario personal).');
  }

  if (input.role === 'conductor') {
    const nuevo = await crearConductorEmpresa(input.companyId, input.nombre, input.email, input.password);
    registrarAuditoria({ accion: 'crear', entidad: 'usuario', objetivo: nuevo.name, companyId: input.companyId });
    return nuevo;
  }

  // Los demás perfiles (supervisores y cuentas personales): misma alta.
  const limpio = input.nombre.trim();
  const mail = input.email.trim().toLowerCase();
  const clave = (input.password ?? '').trim() || 'Flotas2026..';
  if (!limpio) throw new Error('Ponle nombre al usuario.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new Error('Indica un email válido.');
  if (clave.length < 8) throw new Error('La clave debe tener al menos 8 caracteres.');
  if (MOCK_USERS.some((u) => u.email.toLowerCase() === mail)) {
    throw new Error('Ya existe un usuario con ese email.');
  }
  const cred: MockCredential = {
    id: `sc-${++_supSeq}`,
    name: limpio,
    email: mail,
    role: input.role,
    companyId: input.companyId,
    drives: false,
    password: clave,
  };
  MOCK_USERS.push(cred);
  marcarPerfilPendiente(cred.id);
  registrarAuditoria({ accion: 'crear', entidad: 'usuario', objetivo: cred.name, companyId: input.companyId });
  return fakeNetwork(toPublicUser(cred), 500);
}

/**
 * TODOS los usuarios del sistema con su rol y empresa (solo la CONSOLA del
 * admin FOM: los únicos que ven y administran todo).
 *
 * TODO API: GET /usuarios (requiere rol admin).
 */
export async function listarUsuariosSistema(): Promise<User[]> {
  // BD provisional: el roster real (la RLS deja al admin ver todos).
  if (supabase) {
    const { data } = await supabase
      .from('perfiles')
      .select('id, nombre, email, rol, conduce, cedula, telefono, empresa:empresas!empresa_id(slug)')
      .order('nombre');
    if (data) {
      const filas = data as unknown as {
        id: string;
        nombre: string | null;
        email: string;
        rol: User['role'];
        conduce: boolean;
        cedula: string | null;
        telefono: string | null;
        empresa: { slug: string } | null;
      }[];
      return filas.map((f) => ({
        id: f.id,
        name: f.nombre || f.email,
        email: f.email,
        role: f.rol,
        companyId: f.empresa?.slug,
        cedula: f.cedula ?? undefined,
        telefono: f.telefono ?? undefined,
        drives: f.conduce,
      }));
    }
  }
  return fakeNetwork(MOCK_USERS.map(toPublicUser));
}

/**
 * Cambia el ROL/perfil de un usuario (solo admin FOM): redefine qué vista y
 * qué permisos tiene. Los roles de administración FOM no se tocan desde aquí.
 *
 * TODO API: PATCH /usuarios/:id { role } — Edge Function con service_role.
 */
export async function actualizarRolUsuario(userId: string, role: RolAsignable): Promise<User> {
  // BD provisional: el cambio de perfil se guarda de verdad.
  if (supabase) {
    const { data: actual } = await supabase.from('perfiles').select('rol').eq('id', userId).single();
    if (!actual) throw new Error('Usuario no encontrado.');
    if ((actual as { rol: User['role'] }).rol === 'admin') {
      throw new Error('Los administradores FOM no se modifican desde la consola.');
    }
    const { data, error } = await supabase
      .from('perfiles')
      .update({ rol: role, conduce: role === 'conductor' })
      .eq('id', userId)
      .select('id, nombre, email, rol, conduce, empresa:empresas!empresa_id(slug)')
      .single();
    if (error || !data) throw new Error('No se pudo cambiar el perfil. Intenta de nuevo.');
    const f = data as unknown as {
      id: string;
      nombre: string | null;
      email: string;
      rol: User['role'];
      conduce: boolean;
      empresa: { slug: string } | null;
    };
    return { id: f.id, name: f.nombre || f.email, email: f.email, role: f.rol, companyId: f.empresa?.slug, drives: f.conduce };
  }

  const cred = MOCK_USERS.find((u) => u.id === userId);
  if (!cred) throw new Error('Usuario no encontrado.');
  if (cred.role === 'admin' || cred.role === 'superAdmin') {
    throw new Error('Los administradores FOM no se modifican desde la consola.');
  }
  cred.role = role;
  cred.drives = role === 'conductor';
  return fakeNetwork(toPublicUser(cred), 400);
}

/** Saca el mensaje útil del cuerpo de la respuesta de una Edge Function. */
async function mensajeDeFuncion(error: unknown, porDefecto: string): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  if (ctx) {
    try {
      const cuerpo = (await ctx.json()) as { error?: string };
      if (cuerpo?.error) return cuerpo.error;
    } catch {
      // sin cuerpo legible: se queda el mensaje genérico
    }
  }
  return porDefecto;
}

/**
 * EDITA un usuario (CRUD del admin FOM y de los administradores de ente):
 * nombre, email, su ENTE (moverlo de empresa, o `companyId: null` = dejarlo
 * SIN empresa) y su perfil. Los permisos finos los valida el servidor
 * (Edge Function `administrar-usuario`): el admin FOM alcanza a todos; un
 * administrador de compañía, a su compañía y sus asociadas; un administrador
 * de contratista o cuenta personal, solo a su propia gente.
 *
 * TODO API: PATCH /usuarios/:id — hoy Edge Function con service_role.
 */
export async function actualizarUsuario(input: {
  userId: string;
  nombre?: string;
  email?: string;
  cedula?: string;
  /** Teléfono ya compuesto ("+58 4141234567"). `undefined` = no tocar. */
  telefono?: string;
  /** `null` = quitarlo de su empresa; `undefined` = no tocarla. */
  companyId?: string | null;
  role?: RolAsignable;
}): Promise<User> {
  if (supabase) {
    const { data, error } = await supabase.functions.invoke('administrar-usuario', {
      body: {
        accion: 'actualizar',
        user_id: input.userId,
        nombre: input.nombre?.trim(),
        email: input.email?.trim().toLowerCase(),
        cedula: input.cedula?.trim(),
        ...(input.telefono !== undefined ? { telefono: input.telefono.trim() } : {}),
        // undefined = no tocar; null = sin empresa; slug = moverlo.
        ...(input.companyId !== undefined ? { empresa_slug: input.companyId } : {}),
        rol: input.role,
      },
    });
    if (error) throw new Error(await mensajeDeFuncion(error, 'No se pudo actualizar el usuario.'));
    const r = data as { id: string; nombre: string; email: string; rol: User['role']; empresa_slug: string | null };
    registrarAuditoria({ accion: 'editar', entidad: 'usuario', objetivo: r.nombre, companyId: r.empresa_slug ?? undefined });
    return {
      id: r.id,
      name: r.nombre,
      email: r.email,
      role: r.rol,
      companyId: r.empresa_slug ?? undefined,
      drives: r.rol === 'conductor',
    };
  }

  // Modo mock.
  const cred = MOCK_USERS.find((u) => u.id === input.userId);
  if (!cred) throw new Error('Usuario no encontrado.');
  if (cred.role === 'admin' || cred.role === 'superAdmin') {
    throw new Error('Los administradores FOM no se modifican desde aquí.');
  }
  const empresaFinal = input.companyId === undefined ? cred.companyId : (input.companyId ?? undefined);
  const rolFinal = input.role ?? cred.role;
  // El TIPO del ente destino valida el perfil (mismas reglas del alta).
  if (empresaFinal) {
    const tipo = await getTipoEmpresa(empresaFinal);
    const esPersonalRol = rolFinal === 'supervisor_personal' || rolFinal === 'usuario_personal';
    if (esPersonalRol && tipo !== 'personal') {
      throw new Error('Los perfiles personales pertenecen a una cuenta PERSONAL.');
    }
    if (!esPersonalRol && tipo === 'personal') {
      throw new Error('Una cuenta personal solo admite perfiles personales.');
    }
  }
  if (input.nombre?.trim()) cred.name = input.nombre.trim();
  if (input.cedula !== undefined) cred.cedula = input.cedula.trim() || undefined;
  if (input.telefono !== undefined) cred.telefono = input.telefono.trim() || undefined;
  if (input.email?.trim()) {
    const mail = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new Error('Indica un email válido.');
    if (MOCK_USERS.some((u) => u.id !== cred.id && u.email.toLowerCase() === mail)) {
      throw new Error('Ya existe un usuario con ese email.');
    }
    cred.email = mail;
  }
  cred.companyId = empresaFinal;
  if (input.role) {
    cred.role = input.role;
    cred.drives = input.role === 'conductor';
  }
  registrarAuditoria({ accion: 'editar', entidad: 'usuario', objetivo: cred.name, companyId: empresaFinal });
  return fakeNetwork(toPublicUser(cred), 400);
}

/**
 * "ELIMINA" un usuario: sale de su empresa pero su cuenta NO se borra de la
 * BD — pasa a la ente de respaldo "Desempleados C.A." (servicio suspendido,
 * visible solo para el admin FOM), desde donde FOM puede reasignarlo a otra
 * compañía → contratista/personal sin re-crear la cuenta. Mismos alcances que
 * `actualizarUsuario`; nadie puede eliminarse a sí mismo ni a un admin FOM.
 *
 * TODO API: POST /usuarios/:id/eliminar — hoy Edge Function con service_role.
 */
export async function eliminarUsuario(userId: string, opts?: { fecha?: string }): Promise<void> {
  if (supabase) {
    // Se lee el nombre/ente antes de moverlo para dejarlo legible en la auditoría.
    const { data: prev } = await supabase
      .from('perfiles')
      .select('nombre, empresa:empresas!empresa_id(slug)')
      .eq('id', userId)
      .maybeSingle();
    const p = prev as unknown as { nombre: string | null; empresa: { slug: string } | null } | null;
    const { error } = await supabase.functions.invoke('administrar-usuario', {
      body: { accion: 'eliminar', user_id: userId },
    });
    if (error) throw new Error(await mensajeDeFuncion(error, 'No se pudo eliminar el usuario.'));
    registrarAuditoria({
      accion: 'eliminar',
      entidad: 'usuario',
      objetivo: p?.nombre ?? userId,
      companyId: p?.empresa?.slug,
      detalle: 'movido a Desempleados C.A.',
      fecha: opts?.fecha,
    });
    return;
  }
  const cred = MOCK_USERS.find((u) => u.id === userId);
  if (!cred) throw new Error('Usuario no encontrado.');
  if (cred.role === 'admin' || cred.role === 'superAdmin') {
    throw new Error('Los administradores FOM no se eliminan desde aquí.');
  }
  cred.companyId = DESEMPLEADOS_ID;
  registrarAuditoria({ accion: 'eliminar', entidad: 'usuario', objetivo: cred.name, detalle: 'movido a Desempleados C.A.', fecha: opts?.fecha });
  return fakeNetwork(undefined, 400);
}

/**
 * ELIMINA DEFINITIVAMENTE una cuenta (auth + perfil en cascada). Solo el admin
 * FOM y SOLO desde el respaldo "Desempleados C.A." (ya sin empresa activa): así
 * el borrado permanente exige el paso previo de eliminarlo de su empresa. Nadie
 * puede eliminarse a sí mismo ni a un admin FOM (lo re-valida el servidor).
 *
 * TODO API: DELETE /usuarios/:id — hoy Edge Function con service_role.
 */
export async function eliminarUsuarioDefinitivo(userId: string, opts?: { fecha?: string }): Promise<void> {
  if (supabase) {
    const { data: prev } = await supabase.from('perfiles').select('nombre').eq('id', userId).maybeSingle();
    const nombre = (prev as { nombre?: string } | null)?.nombre ?? userId;
    const { error } = await supabase.functions.invoke('administrar-usuario', {
      body: { accion: 'eliminar_definitivo', user_id: userId },
    });
    if (error) throw new Error(await mensajeDeFuncion(error, 'No se pudo eliminar la cuenta.'));
    registrarAuditoria({ accion: 'eliminar', entidad: 'usuario', objetivo: nombre, detalle: 'cuenta borrada permanentemente', fecha: opts?.fecha });
    return;
  }
  const cred = MOCK_USERS.find((u) => u.id === userId);
  if (!cred) throw new Error('Usuario no encontrado.');
  if (cred.role === 'admin' || cred.role === 'superAdmin') {
    throw new Error('Los administradores FOM no se eliminan desde aquí.');
  }
  if (cred.companyId !== DESEMPLEADOS_ID) {
    throw new Error('Una cuenta solo se elimina definitivamente desde el respaldo.');
  }
  const i = MOCK_USERS.indexOf(cred);
  if (i >= 0) MOCK_USERS.splice(i, 1);
  registrarAuditoria({ accion: 'eliminar', entidad: 'usuario', objetivo: cred.name, detalle: 'cuenta borrada permanentemente', fecha: opts?.fecha });
  return fakeNetwork(undefined, 400);
}

/**
 * CAMBIA MI PROPIA clave (desde el perfil, ya logueado). Con Supabase usa
 * `updateUser`; en mock actualiza la credencial local.
 *
 * TODO API: Supabase Auth updateUser.
 */
export async function cambiarMiClave(nuevaClave: string): Promise<void> {
  const clave = nuevaClave.trim();
  if (clave.length < 8) throw new Error('La clave debe tener al menos 8 caracteres.');
  if (supabase) {
    const { error } = await supabase.auth.updateUser({ password: clave });
    if (error) {
      const msg = (error.message ?? '').toLowerCase();
      throw new Error(
        msg.includes('different') || msg.includes('same')
          ? 'La nueva clave debe ser distinta de la actual.'
          : 'No se pudo cambiar la clave. Intenta de nuevo.',
      );
    }
    return;
  }
  return fakeNetwork(undefined, 400);
}

/**
 * CAMBIA la clave de OTRO usuario (solo admin FOM; NUNCA de un admin FOM ni de
 * sí mismo). Va por la Edge Function con la llave de servicio.
 *
 * TODO API: POST /usuarios/:id/clave — Edge Function service_role.
 */
export async function cambiarClaveUsuario(userId: string, nuevaClave: string): Promise<void> {
  const clave = nuevaClave.trim();
  if (clave.length < 8) throw new Error('La clave debe tener al menos 8 caracteres.');
  if (supabase) {
    const { error } = await supabase.functions.invoke('administrar-usuario', {
      body: { accion: 'clave', user_id: userId, nueva_clave: clave },
    });
    if (error) throw new Error(await mensajeDeFuncion(error, 'No se pudo cambiar la clave.'));
    return;
  }
  const cred = MOCK_USERS.find((u) => u.id === userId);
  if (!cred) throw new Error('Usuario no encontrado.');
  if (cred.role === 'admin' || cred.role === 'superAdmin') {
    throw new Error('Las claves de los administradores FOM no se cambian desde aquí.');
  }
  cred.password = clave;
  return fakeNetwork(undefined, 400);
}

/**
 * Recuperación de clave con verificación por CORREO: cualquier usuario puede
 * pedirla desde el login sin estar dentro. Con Supabase configurado envía el
 * email real de recuperación (funciona desde cualquier red/lugar); el enlace
 * abre la app en la pantalla para poner la clave nueva (`redirectTo`). Sin
 * Supabase (mock), simula el envío.
 *
 * TODO API: ya conectado a Supabase Auth cuando hay .env.
 */
export async function recuperarClave(email: string): Promise<void> {
  const mail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    throw new Error('Escribe tu email para enviarte el enlace.');
  }
  if (supabase) {
    // El enlace del correo vuelve a la app (deep link) a poner la clave nueva.
    const { error } = await supabase.auth.resetPasswordForEmail(mail, {
      redirectTo: 'controlflotas://recuperar',
    });
    if (error) throw new Error('No se pudo enviar el correo. Intenta de nuevo.');
    return;
  }
  // Modo mock: simula el envío (no revela si el correo existe).
  return fakeNetwork(undefined, 600);
}

/** Fila de `perfiles` de la BD (lo que el login necesita para armar el User). */
type PerfilRow = {
  id: string;
  nombre: string | null;
  email: string;
  rol: User['role'];
  conduce: boolean;
  perfil_completo: boolean;
  empresa: { slug: string; servicio_activo: boolean; tipo: User['companyTipo'] } | null;
};

/**
 * Login contra la BD provisional (Supabase Auth + tabla `perfiles`).
 * Devuelve `null` si las credenciales no existen en la BD (para que el flujo
 * pruebe el mock de transición); lanza si el usuario existe pero está mal
 * configurado (sin perfil).
 */
async function signInSupabase(email: string, password: string): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;

  // El perfil (rol + empresa) define su vista y sus permisos. El join lleva
  // la pista !empresa_id: perfiles llega a empresas por DOS caminos (empresa
  // directa y predefinidas supervisadas) y sin ella la consulta es ambigua.
  const { data: perfilData } = await supabase
    .from('perfiles')
    .select('id, nombre, email, rol, conduce, perfil_completo, empresa:empresas!empresa_id(slug, servicio_activo, tipo)')
    .eq('id', data.user.id)
    .single();
  if (!perfilData) {
    await supabase.auth.signOut();
    throw new Error('Tu usuario existe pero no tiene perfil asignado. Avísale a un administrador FOM.');
  }
  const perfil = perfilData as unknown as PerfilRow;

  // Servicio SUSPENDIDO por el admin FOM: los usuarios de esa empresa no
  // entran (los admin FOM no pertenecen a ninguna empresa y nunca se bloquean).
  if (perfil.rol !== 'admin' && perfil.empresa && perfil.empresa.servicio_activo === false) {
    await supabase.auth.signOut();
    throw new Error('El servicio FOM de tu empresa está suspendido. Contacta a tu administración.');
  }

  // Rol operativo SIN empresa (ej.: su empresa fue eliminada): no hay
  // superficie para él — se corta en el login con un mensaje claro en vez de
  // dejarlo entrar a una navegación sin destino.
  if (perfil.rol !== 'admin' && !perfil.empresa) {
    await supabase.auth.signOut();
    throw new Error('Tu usuario ya no tiene empresa asignada. Avísale a un administrador FOM.');
  }

  return {
    id: perfil.id,
    name: perfil.nombre ?? perfil.email,
    email: perfil.email,
    role: perfil.rol,
    companyId: perfil.empresa?.slug,
    companyTipo: perfil.empresa?.tipo,
    drives: perfil.conduce,
  };
}

/**
 * Inicia sesión. Con la BD provisional conectada valida contra Supabase (la
 * fuente de verdad); si el usuario no está allá, cae al mock de transición
 * (usuarios creados en la Consola antes de conectar esa parte).
 *
 * @throws Error con mensaje apto para mostrar al usuario si fallan.
 */
export async function signIn(email: string, password: string): Promise<User> {
  const normalized = email.trim().toLowerCase();

  // 1) BD provisional (Supabase) — el login real.
  const remoto = await signInSupabase(normalized, password);
  if (remoto) return remoto;

  // 2) Mock de transición.
  const match = MOCK_USERS.find((u) => u.email.toLowerCase() === normalized);

  // Mensaje genérico a propósito: no revela si el correo existe o no.
  if (!match || match.password !== password) {
    throw new Error('Correo o contraseña incorrectos.');
  }

  return toPublicUser(match);
}

/** Cierra también la sesión REMOTA (Supabase), si está conectada. */
export function cerrarSesionRemota(): void {
  supabase?.auth.signOut();
}
