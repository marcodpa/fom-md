import {
  type ActorContext,
  type MembershipRole,
  runWithActorStore,
  setCurrentActor,
} from '../authentication/actor-context';

/**
 * Puente entre la sesión móvil y los servicios que leen el actor del almacén
 * de contexto.
 *
 * Los servicios de consola resuelven su tenant con `currentActor()`, y la
 * sesión móvil resuelve el suyo desde el token. Son dos formas de autenticar
 * y una sola forma de consultar: en vez de reescribir el SQL para el móvil
 * —dos verdades que divergirían a la primera corrección hecha en una sola—,
 * el controlador móvil abre un almacén de actor con la identidad que YA
 * resolvió su guard y llama al mismo servicio.
 *
 * El actor sigue siendo del servidor de principio a fin: procede del token
 * opaco, jamás de algo que el teléfono declare. Y el almacén dura lo que dura
 * la petición, así que ninguna consulta puede heredar el tenant de otra.
 */
export type MobileActorLike = {
  userId: string;
  tenantId: string;
  role?: string;
};

export function conActorMovil<T>(
  actor: MobileActorLike,
  consulta: () => T | Promise<T>,
): Promise<T> {
  const contexto: ActorContext = {
    userId: actor.userId,
    tenantId: actor.tenantId,
    // El rol viaja por completitud; ninguna de estas lecturas lo consulta.
    // `platformAdmin` es false siempre: la capacidad transversal de la
    // plataforma no se ejerce desde un teléfono.
    role: (actor.role ?? 'usuario') as MembershipRole,
    platformAdmin: false,
  };
  return Promise.resolve(
    runWithActorStore(() => {
      setCurrentActor(contexto);
      return consulta();
    }),
  );
}
