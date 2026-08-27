import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  type ActorContext,
  currentActor,
} from '../authentication/actor-context';

/**
 * Autorización por ROL de la superficie de consola — la primera del sistema.
 *
 * Hasta aquí los roles viajaban como información: el aislamiento era solo por
 * empresa. Con la llegada de las escrituras (directorio de personal, flota)
 * el rol pasa a AUTORIZAR, y la regla vive en un solo lugar para que cada
 * endpoint nuevo no invente la suya.
 *
 * El espejo exacto de fom.canonical_membership_role() de la base: los roles
 * del catálogo viejo se traducen antes de comparar, para que un usuario con
 * rol heredado no pierda (ni gane) capacidades por el nombre del valor.
 */
const ROL_CANONICO: Record<string, string> = {
  owner: 'supervisor',
  administrator: 'supervisor',
  fleet_manager: 'supervisor',
  operator: 'operator',
  viewer: 'usuario',
};

export function canonicalRole(role: string): string {
  return ROL_CANONICO[role] ?? role;
}

function requireActor(): ActorContext {
  const actor = currentActor();
  if (!actor) {
    throw new UnauthorizedException('Console session required');
  }
  return actor;
}

/**
 * Un GESTOR: supervisor de su ente o administrador FOM. Es el rango que
 * administra gente y flota (FOM-02 §1 y §3; regla de mando: rango 3+).
 */
export function requireManagerActor(): ActorContext {
  const actor = requireActor();
  const role = canonicalRole(actor.role);
  if (role !== 'admin_fom' && role !== 'supervisor') {
    throw new ForbiddenException(
      'Managing the directory requires a supervisor or FOM administrator',
    );
  }
  return actor;
}

/**
 * El ADMINISTRADOR FOM. Crear empresas, supervisores y vehículos es suyo
 * (FOM-02 §1.1-1.3). `platformAdmin` cuenta: es la capacidad transversal que
 * la plataforma ya reconocía antes del catálogo nuevo de roles.
 */
export function requireFomAdminActor(): ActorContext {
  const actor = requireActor();
  if (canonicalRole(actor.role) !== 'admin_fom' && !actor.platformAdmin) {
    throw new ForbiddenException(
      'This action requires the FOM administrator',
    );
  }
  return actor;
}

/**
 * JERARQUÍA DE MANDO (Issue #202, reglas 9 y 10).
 *
 * A mayor número, más alcance. Todo lo que no administra a nadie comparte el
 * rango 1: da igual si es conductor, usuario u operador telemático — ninguno
 * manda sobre otra persona, y numerarlos distinto sugeriría una autoridad que
 * no existe.
 */
const RANGO: Record<string, number> = {
  admin_fom: 4,
  supervisor: 3,
};

export function rangoDe(role: string): number {
  return RANGO[canonicalRole(role)] ?? 1;
}

export type PersonaAdministrable = {
  userId: string;
  role: string;
};

/**
 * ¿El actor puede administrar a esa persona? Cuatro negativas, en orden:
 *
 *   1. A sí mismo, nunca. Los datos propios se editan en el perfil; nadie se
 *      cambia su propio rol ni se saca de su ente.
 *   2. A un administrador FOM, nadie — ni siquiera otro administrador FOM.
 *      Es la regla que impide que la capa de plataforma se cierre sola.
 *   3. Sin rango de gestor (3 o más), tampoco: un conductor no administra.
 *   4. A un rango igual o mayor, tampoco (regla 10 tal como está escrita).
 *
 * NOTA de divergencia con la app: allí un supervisor de compañía administra a
 * los supervisores de sus contratistas asociadas — un par de su mismo rango —
 * y el alcance lo garantiza el ente. Aquí se aplica la regla estricta porque
 * hoy toda administración ocurre DENTRO de un ente, donde dos supervisores son
 * iguales y ninguno manda sobre el otro. Cuando exista el alcance entre entes,
 * esa excepción se añade con su propia autorización y sus pruebas.
 */
export function puedeAdministrarA(
  actor: ActorContext,
  objetivo: PersonaAdministrable,
): boolean {
  if (actor.userId === objetivo.userId) return false;
  if (canonicalRole(objetivo.role) === 'admin_fom') return false;
  const rangoActor = rangoDe(actor.role);
  if (rangoActor < 3) return false;
  return rangoActor > rangoDe(objetivo.role);
}

export function requireCanManage(
  actor: ActorContext,
  objetivo: PersonaAdministrable,
): void {
  if (!puedeAdministrarA(actor, objetivo)) {
    throw new ForbiddenException(
      'Your rank does not allow managing that person',
    );
  }
}
