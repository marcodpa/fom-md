/**
 * Servicio de usuarios/conductores (capa de datos abstracta).
 *
 * Perfiles (datos personales) + métricas de ejemplo de cada conductor. Misma
 * forma async que tendrá la API real; migrar = reescribir el cuerpo marcado con
 * «TODO API». Los datos de acceso (login) viven en `authService`; aquí va el
 * perfil enriquecido, enlazado por `id` = `User.id`.
 */

import { supabase } from '@/lib/supabase';
import type { DriverProfile, Role } from '@/types';

import { empresaIdDe } from './db';
import { fakeNetwork, seed } from './network';

/** Fecha ISO de hace N días (para fechar las recargas de combustible). */
function dia(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

/** Avatar placeholder determinista por usuario. */
function avatar(seed: string): string {
  return `https://i.pravatar.cc/200?u=${seed}`;
}

/**
 * Directorio de identidades de conductores (todas las personas que manejan).
 * Es la fuente única para resolver "quién" a partir de un id: las 4 con perfil
 * completo (abajo) + las demás que aparecen en la flota como conductores/autores
 * de OT. Así toda OT tiene un autor real (nunca "sin conductor").
 */
interface DriverIdentity {
  id: string;
  nombre: string;
  companyId: string;
}

const DRIVER_IDENTITIES: DriverIdentity[] = seed<DriverIdentity>([
  // Samfor
  { id: 'usr-sam-1', nombre: 'José Marrufo', companyId: 'Samfor' },
  { id: 'usr-sam-2', nombre: 'María Chourio', companyId: 'Samfor' },
  { id: 'drv-sam-3', nombre: 'Pedro Villalobos', companyId: 'Samfor' },
  { id: 'drv-sam-4', nombre: 'Luis Atencio', companyId: 'Samfor' },
  { id: 'drv-sam-5', nombre: 'Carla Romero', companyId: 'Samfor' },
  // Elenco FOM-02 (§3.5): Carlos, futuro conductor secundario de la Unidad 07.
  { id: 'drv-sam-6', nombre: 'Carlos Paz', companyId: 'Samfor' },
  // Cuenta personal de Ale Sampieri (§5–§6).
  { id: 'up-santi', nombre: 'Santi Sampieri', companyId: 'sampieri' },
  { id: 'up-sofi', nombre: 'Sofi Sampieri', companyId: 'sampieri' },
  // Petrosur
  { id: 'usr-pet-1', nombre: 'Ramón Bracho', companyId: 'petrosur' },
  { id: 'usr-pet-2', nombre: 'Yelitza Soto', companyId: 'petrosur' },
  { id: 'drv-pet-3', nombre: 'Gustavo Pirela', companyId: 'petrosur' },
  { id: 'drv-pet-4', nombre: 'Daniela Faría', companyId: 'petrosur' },
  { id: 'drv-pet-5', nombre: 'Héctor Nava', companyId: 'petrosur' },
]);

/** Nombre de un conductor por id (para mostrar el autor de una OT, etc.). */
export function getNombreConductor(driverId: string): string | undefined {
  return DRIVER_IDENTITIES.find((d) => d.id === driverId)?.nombre;
}

/** Id de un conductor por su nombre (para enlazar la flota a su perfil). */
export function getIdConductorPorNombre(nombre: string): string | undefined {
  return DRIVER_IDENTITIES.find((d) => d.nombre === nombre)?.id;
}

// ───────────────────────────── DATOS MOCK ─────────────────────────────────
// 2 conductores por empresa, con perfil y métricas de ejemplo. Reemplazar por
// la respuesta real de la API (los ids coinciden con los de `authService`).

const MOCK_PROFILES: DriverProfile[] = seed<DriverProfile>([
  // ── Samfor ──────────────────────────────────────────────────────────────
  {
    id: 'usr-sam-1',
    nombre: 'José Marrufo',
    fotoUrl: avatar('usr-sam-1'),
    cedula: 'V-12.345.678',
    direccion: 'Calle 72, Sector Tierra Negra, Maracaibo, Zulia',
    companyId: 'Samfor',
    licencia: { numero: '12.345.678', categoria: '5', venceEn: dia(-430) },
    metrics: {
      kmRecorridos: 3120,
      vehiculosUsados: ['veh-014', 'veh-045'],
      diasConducidos: 64,
      horasConducidas: 410,
      recargas: [
        { fecha: dia(2), litros: 45 },
        { fecha: dia(9), litros: 60 },
        { fecha: dia(17), litros: 52 },
        { fecha: dia(25), litros: 58 },
      ],
      otReportadas: 2,
    },
  },
  {
    id: 'usr-sam-2',
    nombre: 'María Chourio',
    fotoUrl: avatar('usr-sam-2'),
    cedula: 'V-15.987.321',
    direccion: 'Av. Bella Vista, Maracaibo, Zulia',
    companyId: 'Samfor',
    licencia: { numero: '15.987.321', categoria: '4', venceEn: dia(-215) },
    metrics: {
      kmRecorridos: 2740,
      vehiculosUsados: ['veh-022'],
      diasConducidos: 58,
      horasConducidas: 372,
      recargas: [
        { fecha: dia(4), litros: 40 },
        { fecha: dia(13), litros: 42 },
        { fecha: dia(22), litros: 38 },
      ],
      otReportadas: 1,
    },
  },

  // ── Petrosur ─────────────────────────────────────────────────────────────
  {
    id: 'usr-pet-1',
    nombre: 'Ramón Bracho',
    fotoUrl: avatar('usr-pet-1'),
    cedula: 'V-18.222.111',
    direccion: 'Av. Andrés Bello, Cabimas, Zulia',
    companyId: 'petrosur',
    licencia: { numero: '18.222.111', categoria: '5', venceEn: dia(-620) },
    metrics: {
      kmRecorridos: 4120,
      vehiculosUsados: ['veh-101', 'veh-103'],
      diasConducidos: 70,
      horasConducidas: 455,
      recargas: [
        { fecha: dia(1), litros: 60 },
        { fecha: dia(8), litros: 58 },
        { fecha: dia(15), litros: 62 },
        { fecha: dia(23), litros: 57 },
      ],
      otReportadas: 3,
    },
  },
  {
    id: 'usr-pet-2',
    nombre: 'Yelitza Soto',
    fotoUrl: avatar('usr-pet-2'),
    cedula: 'V-20.333.444',
    direccion: 'Sector La Rosa, Cabimas, Zulia',
    companyId: 'petrosur',
    licencia: { numero: '20.333.444', categoria: '4', venceEn: dia(-300) },
    metrics: {
      kmRecorridos: 3380,
      vehiculosUsados: ['veh-102'],
      diasConducidos: 66,
      horasConducidas: 405,
      recargas: [
        { fecha: dia(3), litros: 48 },
        { fecha: dia(12), litros: 50 },
        { fecha: dia(20), litros: 46 },
      ],
      otReportadas: 1,
    },
  },

  // ── Cuenta personal de Ale Sampieri (FOM-02 §5–§6) ───────────────────────
  {
    id: 'up-santi',
    nombre: 'Santi Sampieri',
    fotoUrl: avatar('up-santi'),
    cedula: 'V-30.111.222',
    direccion: 'Av. 5 de Julio, Maracaibo, Zulia',
    companyId: 'sampieri',
    licencia: { numero: '30.111.222', categoria: '3', venceEn: dia(-800) },
    metrics: { kmRecorridos: 1240, vehiculosUsados: ['veh-ale-1'], diasConducidos: 38, horasConducidas: 92, recargas: [{ fecha: dia(4), litros: 35 }], otReportadas: 0 },
  },
  {
    id: 'up-sofi',
    nombre: 'Sofi Sampieri',
    fotoUrl: avatar('up-sofi'),
    cedula: 'V-31.333.444',
    direccion: 'Av. 5 de Julio, Maracaibo, Zulia',
    companyId: 'sampieri',
    licencia: { numero: '31.333.444', categoria: '3', venceEn: dia(-500) },
    metrics: { kmRecorridos: 980, vehiculosUsados: ['veh-ale-2'], diasConducidos: 29, horasConducidas: 71, recargas: [{ fecha: dia(9), litros: 32 }], otReportadas: 0 },
  },
]);

// ─────────── Perfil obligatorio al primer ingreso (FOM-02) ─────────────────
// Quiénes AÚN no han llenado su perfil (cédula, licencia, carta médica): el
// elenco nuevo entra por primera vez; los usuarios legados ya tienen perfil.
const PERFIL_PENDIENTE = new Set<string>(seed<string>(['sc-yeison', 'drv-sam-6', 'sp-ale', 'up-santi', 'up-sofi']));

/** ¿El usuario ya llenó su perfil obligatorio? (sync, para el contexto de login). */
export function tienePerfilCompletoSync(userId: string): boolean {
  return !PERFIL_PENDIENTE.has(userId);
}

export interface CompletarPerfilInput {
  userId: string;
  nombre: string;
  companyId?: string;
  cedula: string;
  licenciaNumero: string;
  licenciaCategoria: string;
  /** ISO (AAAA-MM-DD) de vencimiento de la licencia. */
  licenciaVence: string;
  /** ISO (AAAA-MM-DD) de vencimiento de la carta médica. */
  cartaMedicaVence: string;
}

/**
 * Completa el perfil obligatorio del primer ingreso (FOM-02 §3.1/§4.1/§5.1/
 * §6.1): cédula, licencia y carta médica. Crea o actualiza el perfil.
 *
 * TODO API: PUT /usuarios/me/perfil
 */
export async function completarPerfil(input: CompletarPerfilInput): Promise<void> {
  // BD provisional: el formato del primer ingreso se guarda de verdad.
  if (supabase) {
    const { error } = await supabase
      .from('perfiles')
      .update({
        nombre: input.nombre,
        cedula: input.cedula.trim(),
        licencia_numero: input.licenciaNumero.trim(),
        licencia_categoria: input.licenciaCategoria.trim(),
        licencia_vence: input.licenciaVence.trim(),
        carta_medica_vence: input.cartaMedicaVence.trim(),
        perfil_completo: true,
      })
      .eq('id', input.userId);
    if (error) throw new Error('No se pudo guardar tu perfil. Intenta de nuevo.');
    return;
  }

  const licencia = {
    numero: input.licenciaNumero.trim(),
    categoria: input.licenciaCategoria.trim(),
    venceEn: input.licenciaVence.trim(),
  };
  const cartaMedica = { venceEn: input.cartaMedicaVence.trim() };
  const perfil = MOCK_PROFILES.find((p) => p.id === input.userId);
  if (perfil) {
    perfil.cedula = input.cedula.trim();
    perfil.licencia = licencia;
    perfil.cartaMedica = cartaMedica;
  } else {
    MOCK_PROFILES.push({
      id: input.userId,
      nombre: input.nombre,
      fotoUrl: avatar(input.userId),
      cedula: input.cedula.trim(),
      direccion: '—',
      companyId: input.companyId ?? '',
      licencia,
      cartaMedica,
      metrics: { kmRecorridos: 0, vehiculosUsados: [], diasConducidos: 0, horasConducidas: 0, recargas: [], otReportadas: 0 },
    });
    if (!DRIVER_IDENTITIES.some((d) => d.id === input.userId)) {
      DRIVER_IDENTITIES.push({ id: input.userId, nombre: input.nombre, companyId: input.companyId ?? '' });
    }
  }
  PERFIL_PENDIENTE.delete(input.userId);
  return fakeNetwork(undefined, 500);
}

let _usuarioSeq = 10;

/**
 * Crea un usuario de una cuenta PERSONAL (FOM-02 §5.1: Ale crea a Santi y
 * Sofi). El usuario llenará su perfil (cédula, licencia, carta médica) al
 * entrar por primera vez; la invitación real llegará con el backend.
 *
 * TODO API: POST /cuentas/:companyId/usuarios (con invitación por email).
 */
export async function crearUsuarioPersonal(
  companyId: string,
  nombre: string,
  _email: string,
): Promise<DriverProfile> {
  const limpio = nombre.trim();
  if (!limpio) throw new Error('Ponle nombre al usuario.');
  const id = `up-${++_usuarioSeq}`;
  DRIVER_IDENTITIES.push({ id, nombre: limpio, companyId });
  const perfil: DriverProfile = {
    id,
    nombre: limpio,
    fotoUrl: avatar(id),
    // Su perfil lo llena la persona al entrar (gate de primer ingreso).
    cedula: 'Pendiente',
    direccion: 'Pendiente',
    companyId,
    metrics: { kmRecorridos: 0, vehiculosUsados: [], diasConducidos: 0, horasConducidas: 0, recargas: [], otReportadas: 0 },
  };
  MOCK_PROFILES.push(perfil);
  return fakeNetwork(perfil, 400);
}

/**
 * Marca a un usuario NUEVO con el perfil pendiente: pasará por el gate de
 * primer ingreso (rellenar su formato con todos sus datos). Interno del mock.
 */
export function marcarPerfilPendiente(userId: string): void {
  PERFIL_PENDIENTE.add(userId);
}

/**
 * Registra la identidad y el perfil (PENDIENTE) de un conductor que el
 * supervisor acaba de crear (§3.1): aparece en las listas de personal y pasa
 * por el gate de perfil obligatorio en su primer ingreso. Interno del mock.
 */
export function registrarConductorNuevo(userId: string, nombre: string, companyId: string): void {
  if (!DRIVER_IDENTITIES.some((d) => d.id === userId)) {
    DRIVER_IDENTITIES.push({ id: userId, nombre, companyId });
  }
  MOCK_PROFILES.push({
    id: userId,
    nombre,
    fotoUrl: avatar(userId),
    // Su perfil lo llena la persona al entrar (gate de primer ingreso).
    cedula: 'Pendiente',
    direccion: 'Pendiente',
    companyId,
    metrics: { kmRecorridos: 0, vehiculosUsados: [], diasConducidos: 0, horasConducidas: 0, recargas: [], otReportadas: 0 },
  });
  PERFIL_PENDIENTE.add(userId);
}

// ───────────────────────────── SERVICIOS ──────────────────────────────────

/**
 * Perfiles de una empresa: los que tienen datos de ejemplo (MOCK_PROFILES) MÁS
 * las demás identidades de conductores de esa ente (Pedro, Luis…) como perfil
 * mínimo, para que el roster esté COMPLETO. Así el conductor principal y los
 * secundarios de CUALQUIER unidad se resuelven por su id y se pueden elegir en
 * los selectores, y los reportes por usuario cubren a todo el personal — no solo
 * a los dos con perfil de ejemplo. En la BD real la lista ya llega completa por
 * empresa. Acceso síncrono (lo usan los reportes de usuarios).
 */
export function perfilesDeEmpresa(companyId: string): DriverProfile[] {
  const conPerfil = MOCK_PROFILES.filter((p) => p.companyId === companyId);
  const yaListados = new Set(conPerfil.map((p) => p.id));
  const extra = DRIVER_IDENTITIES.filter(
    (d) => d.companyId === companyId && !yaListados.has(d.id),
  ).map<DriverProfile>((d) => ({
    id: d.id,
    nombre: d.nombre,
    fotoUrl: avatar(d.id),
    cedula: 'Pendiente',
    direccion: '—',
    companyId,
    metrics: { kmRecorridos: 0, vehiculosUsados: [], diasConducidos: 0, horasConducidas: 0, recargas: [], otReportadas: 0 },
  }));
  return [...conPerfil, ...extra];
}

/**
 * Usuarios (conductores) de una empresa, con su perfil y métricas.
 *
 * TODO API: GET /empresas/:companyId/usuarios
 */
export async function getUsuariosDeEmpresa(companyId: string): Promise<DriverProfile[]> {
  // BD provisional: las personas reales de la empresa. Igual que las demás
  // consultas por ente (áreas, flota), se resuelve el uuid por slug; si la
  // empresa no está en la BD (datos mock), cae al mock en vez de devolver vacío
  // — así el conductor principal siempre se puede resolver y elegir.
  if (supabase) {
    const empresaId = await empresaIdDe(companyId);
    if (empresaId) {
      const { data } = await supabase
        .from('perfiles')
        .select('id, nombre, email, rol, cedula, foto_url, licencia_numero, licencia_categoria, licencia_vence')
        .eq('empresa_id', empresaId)
        .order('nombre');
      if (data) {
        const filas = data as unknown as {
          id: string;
          nombre: string | null;
          email: string;
          rol: Role;
          cedula: string | null;
          foto_url: string | null;
          licencia_numero: string | null;
          licencia_categoria: string | null;
          licencia_vence: string | null;
        }[];
        return filas.map((f) => ({
          id: f.id,
          nombre: f.nombre || f.email,
          email: f.email,
          // Foto REAL de la persona; vacía si no subió ninguna (el avatar cae a
          // sus iniciales, no a una cara de relleno).
          fotoUrl: f.foto_url ?? '',
          cedula: f.cedula ?? 'Pendiente',
          direccion: '—',
          companyId,
          role: f.rol,
          licencia:
            f.licencia_numero && f.licencia_vence
              ? { numero: f.licencia_numero, categoria: f.licencia_categoria ?? '—', venceEn: f.licencia_vence }
              : undefined,
          // Las métricas llegan con la telemetría real; en cero mientras tanto.
          metrics: { kmRecorridos: 0, vehiculosUsados: [], diasConducidos: 0, horasConducidas: 0, recargas: [], otReportadas: 0 },
        }));
      }
    }
  }
  return fakeNetwork(perfilesDeEmpresa(companyId));
}
