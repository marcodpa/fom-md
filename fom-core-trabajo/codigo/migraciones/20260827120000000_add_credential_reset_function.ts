import type { MigrationBuilder } from 'node-pg-migrate/dist/bundle/index';

/**
 * Reinicio de credencial por un gestor — la puerta más peligrosa del
 * directorio, y por eso la que más candados lleva.
 *
 * El oráculo de mínimo privilegio prohíbe que `fom_app` pueda escribir
 * `password_hash`: ese permiso de columna alcanzaría el hash de CUALQUIER
 * persona y convertiría un fallo de la aplicación en secuestro de cuentas.
 * La necesidad real es mucho más estrecha —un gestor devuelve el acceso a
 * alguien de su ente que olvidó su clave— y cabe entera en una función
 * SECURITY DEFINER que comprueba la autorización POR SÍ MISMA:
 *
 *   1. Actor y objetivo deben compartir ente, ambos con membresía activa.
 *      Cruzar entes por aquí es imposible, no improbable.
 *   2. El actor debe ser gestor (supervisor o admin_fom) del catálogo
 *      canónico, traducido con la misma función que usa el resto del sistema.
 *   3. Nadie se reinicia a sí mismo: la clave propia se cambia sabiendo la
 *      vigente, que es un hecho distinto de recuperarla.
 *   4. Nadie reinicia a un administrador FOM, ni siquiera otro administrador.
 *   5. El rango del actor debe ser ESTRICTAMENTE mayor (Issue #202, regla 10).
 *
 * Y el efecto también está acotado: la clave nueva nace OBLIGADA a cambiarse,
 * de modo que el gestor devuelve el acceso pero no se queda con una llave
 * silenciosa —la persona la reemplaza en su primer ingreso—; y se revocan las
 * sesiones abiertas del objetivo, para que un reinicio expulse de verdad.
 *
 * La aplicación deriva el hash con Argon2id antes de llamar: la función jamás
 * ve una clave en claro, y rechaza cualquier cosa que no tenga forma de hash.
 */

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE FUNCTION fom.reset_member_credential(
      actor_user_id uuid,
      target_user_id uuid,
      new_password_hash varchar
    ) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
    AS $function$
    DECLARE
      actor_role varchar(30);
      target_role varchar(30);
      shared_tenant uuid;
      actor_rank integer;
      target_rank integer;
    BEGIN
      IF new_password_hash IS NULL
        OR char_length(new_password_hash) NOT BETWEEN 32 AND 1024
        OR new_password_hash !~ '^[$]argon2id[$]v=19[$]'
        OR new_password_hash ~ '[[:space:]]' THEN
        RAISE EXCEPTION 'the new credential must be an argon2id hash'
          USING ERRCODE = '23514';
      END IF;

      IF actor_user_id = target_user_id THEN
        RAISE EXCEPTION 'a member cannot reset their own credential'
          USING ERRCODE = '42501';
      END IF;

      -- Un solo SELECT decide ente compartido y ambos roles: si el par no
      -- convive en un ente activo, no hay fila y no hay reinicio.
      SELECT actor_membership.tenant_id,
             fom.canonical_membership_role(actor_membership.role),
             fom.canonical_membership_role(target_membership.role)
        INTO shared_tenant, actor_role, target_role
        FROM fom.tenant_memberships actor_membership
        JOIN fom.tenant_memberships target_membership
          ON target_membership.tenant_id = actor_membership.tenant_id
         AND target_membership.user_id = target_user_id
        JOIN fom.tenants tenant
          ON tenant.id = actor_membership.tenant_id
       WHERE actor_membership.user_id = actor_user_id
         AND actor_membership.status = 'active'
         AND target_membership.status = 'active'
         AND tenant.status = 'active';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'actor and target do not share an active tenant'
          USING ERRCODE = '42501';
      END IF;

      actor_rank := CASE actor_role
        WHEN 'admin_fom' THEN 4 WHEN 'supervisor' THEN 3 ELSE 1 END;
      target_rank := CASE target_role
        WHEN 'admin_fom' THEN 4 WHEN 'supervisor' THEN 3 ELSE 1 END;

      IF actor_rank < 3 OR target_role = 'admin_fom'
        OR actor_rank <= target_rank THEN
        RAISE EXCEPTION 'rank does not allow resetting that credential'
          USING ERRCODE = '42501';
      END IF;

      UPDATE fom.user_password_credentials
         SET password_hash = new_password_hash,
             must_change_password = true,
             password_changed_at = clock_timestamp(),
             failed_attempts = 0,
             locked_until = NULL,
             updated_at = clock_timestamp()
       WHERE user_id = target_user_id;

      IF NOT FOUND THEN
        RETURN false;
      END IF;

      -- Un reinicio expulsa: las sesiones abiertas con la clave anterior
      -- dejan de servir en el acto.
      UPDATE fom.auth_sessions
         SET revoked_at = clock_timestamp()
       WHERE user_id = target_user_id
         AND revoked_at IS NULL;

      RETURN true;
    END
    $function$;

    REVOKE ALL ON FUNCTION
      fom.reset_member_credential(uuid, uuid, varchar) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION
      fom.reset_member_credential(uuid, uuid, varchar) TO fom_app;

    COMMENT ON FUNCTION fom.reset_member_credential(uuid, uuid, varchar) IS
      'Manager-initiated credential reset: shared active tenant, strictly higher rank, never an admin_fom, never oneself; the new credential is always born must_change_password and revokes the target sessions';
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP FUNCTION fom.reset_member_credential(uuid, uuid, varchar);
  `);
};
