import type { MigrationBuilder } from 'node-pg-migrate/dist/bundle/index';

/**
 * Categoría comercial del ente, relación compañía↔contratista, datos
 * personales, credenciales de conducción y catálogo de roles.
 *
 * SOBRE `kind` Y `category`. `tenants.kind` ya distingue individual de
 * organization, y `category` lo determina por completo (personal→individual,
 * compania|contratista→organization). Es redundante, pero `kind` lleva meses
 * en la tabla. En vez de borrarlo —lo que rompería lo que lo consulte— pasa a
 * ser una PROYECCIÓN que mantiene el trigger a partir de `category`, con un
 * CHECK que documenta el acoplamiento. Nadie lo escribe nunca más: ni siquiera
 * la aplicación, que no recibe permiso sobre esa columna. Eliminarlo es una
 * migración de contracción posterior.
 *
 * SOBRE EL ALCANCE DEL SUPERVISOR. La solución aparente para que un supervisor
 * de compañía alcance a sus contratistas es darle una membresía en cada uno.
 * Es la equivocada: multiplica membresías y denormaliza el grafo — al terminar
 * el contrato habría que acordarse de revocar N membresías, y la que se olvide
 * deja acceso vivo. El alcance es una propiedad de la RELACIÓN ENTRE ENTES, no
 * de la persona. Por eso vive en `tenant_relationships` y se deriva en la
 * vista `actor_tenant_scope`: cerrar la relación apaga el acceso en la misma
 * transacción, sin tocar ninguna membresía.
 *
 * `user_profiles` y `user_credentials` NO llevan `tenant_id`, a diferencia del
 * resto del esquema. La cédula y la licencia son de la persona, no del
 * contratista; con `tenant_id` una misma persona tendría dos cédulas al
 * cambiar de empleo. Hay precedente: `user_password_credentials` y
 * `map_platform_administrators` también son de usuario y sin tenant.
 */

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    -- ═══════════════ 1 · tenants: categoría y contacto ═══════════════

    ALTER TABLE fom.tenants
      ADD COLUMN category varchar(20) NOT NULL DEFAULT 'contratista',
      ADD COLUMN rif varchar(20),
      ADD COLUMN phone varchar(20),
      ADD COLUMN email varchar(320),
      ADD COLUMN contact_name varchar(160),
      ADD COLUMN brand_color varchar(7);

    UPDATE fom.tenants SET category = 'personal' WHERE kind = 'individual';

    ALTER TABLE fom.tenants ALTER COLUMN category DROP DEFAULT;

    ALTER TABLE fom.tenants
      ADD CONSTRAINT tenants_category_check CHECK (
        category IN ('compania', 'contratista', 'personal')
      ),
      ADD CONSTRAINT tenants_category_kind_check CHECK (
        (category = 'personal' AND kind = 'individual')
        OR (category IN ('compania', 'contratista') AND kind = 'organization')
      ),
      ADD CONSTRAINT tenants_rif_format_check CHECK (
        rif IS NULL OR rif ~ '^[vejpgc]-[0-9]{8,9}-[0-9]$'
      ),
      ADD CONSTRAINT tenants_phone_format_check CHECK (
        phone IS NULL OR phone ~ '^[+][0-9]{7,15}$'
      ),
      ADD CONSTRAINT tenants_email_format_check CHECK (
        email IS NULL OR (
          email = lower(btrim(email))
          AND char_length(email) BETWEEN 3 AND 320
          AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        )
      ),
      ADD CONSTRAINT tenants_contact_name_check CHECK (
        contact_name IS NULL OR (
          contact_name = btrim(contact_name)
          AND char_length(contact_name) BETWEEN 2 AND 160
        )
      ),
      ADD CONSTRAINT tenants_brand_color_check CHECK (
        brand_color IS NULL OR brand_color ~ '^#[0-9a-f]{6}$'
      ),
      -- Sostiene la clave foránea compuesta de tenant_relationships, que es
      -- lo que hace imposible invertir el par compañía/contratista.
      ADD CONSTRAINT tenants_id_category_unique UNIQUE (id, category);

    CREATE UNIQUE INDEX tenants_rif_unique_idx
      ON fom.tenants (rif) WHERE rif IS NOT NULL;
    CREATE INDEX tenants_category_status_idx
      ON fom.tenants (category, status);

    CREATE OR REPLACE FUNCTION fom.maintain_tenant_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND NEW.code IS DISTINCT FROM OLD.code THEN
        RAISE EXCEPTION 'tenant code is immutable' USING ERRCODE = '23514';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone
      ) THEN
        RAISE EXCEPTION 'tenant timezone is not recognized: %', NEW.timezone
          USING ERRCODE = '23514';
      END IF;

      NEW.category = lower(btrim(NEW.category));
      -- kind es proyección de category y no se acepta del cliente.
      NEW.kind = CASE
        WHEN NEW.category = 'personal' THEN 'individual'
        ELSE 'organization'
      END;
      NEW.rif = CASE
        WHEN NEW.rif IS NULL THEN NULL ELSE lower(btrim(NEW.rif)) END;
      NEW.email = CASE
        WHEN NEW.email IS NULL THEN NULL ELSE lower(btrim(NEW.email)) END;
      NEW.phone = CASE
        WHEN NEW.phone IS NULL THEN NULL
        ELSE regexp_replace(btrim(NEW.phone), '[^0-9+]', '', 'g') END;
      NEW.contact_name = CASE
        WHEN NEW.contact_name IS NULL THEN NULL ELSE btrim(NEW.contact_name) END;
      NEW.brand_color = CASE
        WHEN NEW.brand_color IS NULL THEN NULL ELSE lower(btrim(NEW.brand_color)) END;

      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    -- ═══════════════ 2 · tenant_relationships ═══════════════

    CREATE FUNCTION fom.maintain_tenant_relationship_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.company_tenant_id IS DISTINCT FROM OLD.company_tenant_id
        OR NEW.contractor_tenant_id IS DISTINCT FROM OLD.contractor_tenant_id
        OR NEW.company_category IS DISTINCT FROM OLD.company_category
        OR NEW.contractor_category IS DISTINCT FROM OLD.contractor_category
        OR NEW.started_at IS DISTINCT FROM OLD.started_at
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'tenant relationship identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'UPDATE'
        AND OLD.ended_at IS NOT NULL AND NEW.ended_at IS NULL THEN
        RAISE EXCEPTION 'a closed tenant relationship cannot be reopened'
          USING ERRCODE = '23514';
      END IF;

      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    -- Sin tenant_id: la fila pertenece a DOS tenants y un tercero sería
    -- ambiguo. El límite multi-tenant lo dan las dos claves foráneas.
    CREATE TABLE fom.tenant_relationships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_tenant_id uuid NOT NULL,
      company_category varchar(20) NOT NULL DEFAULT 'compania',
      contractor_tenant_id uuid NOT NULL,
      contractor_category varchar(20) NOT NULL DEFAULT 'contratista',
      started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      ended_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT tenant_relationships_company_fk
        FOREIGN KEY (company_tenant_id, company_category)
        REFERENCES fom.tenants (id, category)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT tenant_relationships_contractor_fk
        FOREIGN KEY (contractor_tenant_id, contractor_category)
        REFERENCES fom.tenants (id, category)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      -- Los discriminadores son constantes y la aplicación no puede
      -- escribirlos: invertir el par es imposible sin un solo trigger.
      CONSTRAINT tenant_relationships_company_category_check CHECK (
        company_category = 'compania'
      ),
      CONSTRAINT tenant_relationships_contractor_category_check CHECK (
        contractor_category = 'contratista'
      ),
      CONSTRAINT tenant_relationships_distinct_check CHECK (
        company_tenant_id <> contractor_tenant_id
      ),
      CONSTRAINT tenant_relationships_lifecycle_check CHECK (
        ended_at IS NULL OR ended_at >= started_at
      ),
      CONSTRAINT tenant_relationships_timestamps_check CHECK (
        updated_at >= created_at
      )
    );

    CREATE UNIQUE INDEX tenant_relationships_active_unique_idx
      ON fom.tenant_relationships (company_tenant_id, contractor_tenant_id)
      WHERE ended_at IS NULL;
    CREATE INDEX tenant_relationships_company_idx
      ON fom.tenant_relationships (company_tenant_id, started_at DESC);
    CREATE INDEX tenant_relationships_contractor_idx
      ON fom.tenant_relationships (contractor_tenant_id, started_at DESC);

    CREATE TRIGGER tenant_relationships_maintain_record
      BEFORE INSERT OR UPDATE ON fom.tenant_relationships
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_tenant_relationship_record();

    -- ═══════════════ 3 · user_profiles ═══════════════

    CREATE FUNCTION fom.maintain_user_profile_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'user profile identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'UPDATE'
        AND OLD.profile_completed_at IS NOT NULL
        AND NEW.profile_completed_at IS NULL THEN
        RAISE EXCEPTION 'a completed user profile cannot be marked incomplete'
          USING ERRCODE = '23514';
      END IF;

      NEW.national_id = CASE
        WHEN NEW.national_id IS NULL THEN NULL
        ELSE lower(btrim(NEW.national_id)) END;
      NEW.phone = CASE
        WHEN NEW.phone IS NULL THEN NULL
        ELSE regexp_replace(btrim(NEW.phone), '[^0-9+]', '', 'g') END;
      NEW.address = CASE
        WHEN NEW.address IS NULL THEN NULL ELSE btrim(NEW.address) END;
      NEW.photo_url = CASE
        WHEN NEW.photo_url IS NULL THEN NULL ELSE btrim(NEW.photo_url) END;

      IF NEW.birth_date IS NOT NULL AND NEW.birth_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'user birth date cannot be in the future: %', NEW.birth_date
          USING ERRCODE = '23514';
      END IF;

      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    CREATE TABLE fom.user_profiles (
      user_id uuid PRIMARY KEY,
      national_id varchar(20),
      phone varchar(20),
      address varchar(300),
      birth_date date,
      photo_url varchar(500),
      profile_completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT user_profiles_user_fk FOREIGN KEY (user_id)
        REFERENCES fom.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT user_profiles_national_id_check CHECK (
        national_id IS NULL OR national_id ~ '^[ve]-[0-9]{6,9}$'
      ),
      CONSTRAINT user_profiles_phone_check CHECK (
        phone IS NULL OR phone ~ '^[+][0-9]{7,15}$'
      ),
      CONSTRAINT user_profiles_address_check CHECK (
        address IS NULL OR (address = btrim(address) AND address <> '')
      ),
      CONSTRAINT user_profiles_birth_date_check CHECK (
        birth_date IS NULL OR birth_date >= DATE '1900-01-01'
      ),
      CONSTRAINT user_profiles_photo_url_check CHECK (
        photo_url IS NULL OR photo_url ~ '^https://[^[:space:]]{3,492}$'
      ),
      -- El perfil obligatorio del primer ingreso no se marca completo a medias.
      CONSTRAINT user_profiles_completion_check CHECK (
        profile_completed_at IS NULL
        OR (
          national_id IS NOT NULL AND phone IS NOT NULL
          AND address IS NOT NULL AND birth_date IS NOT NULL
        )
      ),
      CONSTRAINT user_profiles_timestamps_check CHECK (
        updated_at >= created_at
        AND (profile_completed_at IS NULL OR profile_completed_at >= created_at)
      )
    );

    CREATE UNIQUE INDEX user_profiles_national_id_unique_idx
      ON fom.user_profiles (national_id) WHERE national_id IS NOT NULL;
    CREATE INDEX user_profiles_incomplete_idx
      ON fom.user_profiles (created_at) WHERE profile_completed_at IS NULL;

    CREATE TRIGGER user_profiles_maintain_record
      BEFORE INSERT OR UPDATE ON fom.user_profiles
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_user_profile_record();

    -- ═══════════════ 4 · user_credentials ═══════════════

    CREATE FUNCTION fom.maintain_user_credential_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.kind IS DISTINCT FROM OLD.kind
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'user credential identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'UPDATE'
        AND OLD.superseded_at IS NOT NULL AND NEW.superseded_at IS NULL THEN
        RAISE EXCEPTION 'a superseded user credential cannot be reinstated'
          USING ERRCODE = '23514';
      END IF;

      NEW.kind = lower(btrim(NEW.kind));
      NEW.number = CASE
        WHEN NEW.number IS NULL THEN NULL ELSE lower(btrim(NEW.number)) END;
      NEW.category = CASE
        WHEN NEW.category IS NULL THEN NULL ELSE lower(btrim(NEW.category)) END;

      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    -- Licencia y certificado médico en UNA tabla: los dos son documentos con
    -- vencimiento que inhabilitan a un conductor.
    CREATE TABLE fom.user_credentials (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      kind varchar(30) NOT NULL,
      number varchar(50),
      category varchar(20),
      issued_at date,
      expires_at date NOT NULL,
      superseded_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT user_credentials_user_fk FOREIGN KEY (user_id)
        REFERENCES fom.users (id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT user_credentials_kind_check CHECK (
        kind IN ('driver_license', 'medical_certificate')
      ),
      CONSTRAINT user_credentials_number_check CHECK (
        number IS NULL OR number ~ '^[a-z0-9][a-z0-9.-]{0,49}$'
      ),
      CONSTRAINT user_credentials_category_check CHECK (
        category IS NULL OR category ~ '^[a-z0-9][a-z0-9-]{0,19}$'
      ),
      CONSTRAINT user_credentials_shape_check CHECK (
        (kind = 'driver_license' AND number IS NOT NULL AND category IS NOT NULL)
        OR (kind = 'medical_certificate' AND category IS NULL)
      ),
      CONSTRAINT user_credentials_validity_check CHECK (
        expires_at >= DATE '1900-01-01'
        AND (
          issued_at IS NULL
          OR (issued_at >= DATE '1900-01-01' AND expires_at > issued_at)
        )
      ),
      CONSTRAINT user_credentials_timestamps_check CHECK (
        updated_at >= created_at
        AND (superseded_at IS NULL OR superseded_at >= created_at)
      )
    );

    -- Una vigente por persona y tipo; la renovada se conserva.
    CREATE UNIQUE INDEX user_credentials_current_unique_idx
      ON fom.user_credentials (user_id, kind) WHERE superseded_at IS NULL;
    CREATE INDEX user_credentials_user_history_idx
      ON fom.user_credentials (user_id, kind, expires_at DESC);
    CREATE INDEX user_credentials_expiry_idx
      ON fom.user_credentials (expires_at) WHERE superseded_at IS NULL;

    CREATE TRIGGER user_credentials_maintain_record
      BEFORE INSERT OR UPDATE ON fom.user_credentials
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_user_credential_record();

    -- ═══════════════ 5 · catálogo de roles (expandir sin romper) ═══════════════

    CREATE FUNCTION fom.canonical_membership_role(membership_role varchar)
    RETURNS varchar LANGUAGE sql IMMUTABLE PARALLEL SAFE
    RETURNS NULL ON NULL INPUT AS $function$
      SELECT CASE membership_role
        WHEN 'owner' THEN 'supervisor'
        WHEN 'administrator' THEN 'supervisor'
        WHEN 'fleet_manager' THEN 'supervisor'
        WHEN 'operator' THEN 'conductor'
        WHEN 'viewer' THEN 'usuario'
        ELSE membership_role
      END::varchar(30)
    $function$;

    -- Los valores nuevos conviven con los antiguos: primero el código entiende
    -- los dos, después se migran las filas, y solo entonces una migración de
    -- contracción reduce el CHECK. Nada de lo que funciona hoy deja de hacerlo.
    ALTER TABLE fom.tenant_memberships
      DROP CONSTRAINT tenant_memberships_role_check;

    ALTER TABLE fom.tenant_memberships
      ADD CONSTRAINT tenant_memberships_role_check CHECK (
        role IN (
          'admin_fom', 'supervisor', 'conductor', 'usuario',
          'owner', 'administrator', 'fleet_manager', 'operator', 'viewer'
        )
      );

    CREATE INDEX tenant_memberships_canonical_role_idx
      ON fom.tenant_memberships (tenant_id, fom.canonical_membership_role(role))
      WHERE status = 'active';

    CREATE OR REPLACE FUNCTION fom.maintain_tenant_membership_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    DECLARE
      v_category varchar(20);
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.user_id IS DISTINCT FROM OLD.user_id
      ) THEN
        RAISE EXCEPTION 'membership tenant and user are immutable'
          USING ERRCODE = '23514';
      END IF;

      NEW.role = lower(btrim(NEW.role));

      -- La compatibilidad rol↔categoría solo se exige a los valores nuevos,
      -- para no invalidar ninguna fila existente.
      IF NEW.role IN ('admin_fom', 'supervisor', 'conductor', 'usuario')
        AND (TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role) THEN
        SELECT t.category INTO v_category
          FROM fom.tenants t WHERE t.id = NEW.tenant_id;

        IF NEW.role = 'conductor' AND v_category <> 'contratista' THEN
          RAISE EXCEPTION
            'role conductor is only valid in a contratista tenant, not %', v_category
            USING ERRCODE = '23514';
        END IF;

        IF NEW.role = 'usuario' AND v_category <> 'personal' THEN
          RAISE EXCEPTION
            'role usuario is only valid in a personal tenant, not %', v_category
            USING ERRCODE = '23514';
        END IF;

        IF v_category = 'personal' AND NEW.role NOT IN ('supervisor', 'usuario') THEN
          RAISE EXCEPTION
            'a personal tenant only admits supervisor and usuario roles'
            USING ERRCODE = '23514';
        END IF;
      END IF;

      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    -- ═══════════════ 6 · alcance del actor ═══════════════

    -- El único sitio donde vive la regla de alcance. Repetirla en cinco
    -- servicios es exactamente cómo se producen las fugas entre tenants.
    CREATE VIEW fom.actor_tenant_scope WITH (security_invoker = true) AS
    SELECT
      membership.user_id,
      membership.tenant_id AS home_tenant_id,
      fom.canonical_membership_role(membership.role) AS role,
      membership.tenant_id AS scope_tenant_id,
      'home'::varchar(20) AS scope_kind
    FROM fom.tenant_memberships membership
    JOIN fom.tenants home ON home.id = membership.tenant_id
    WHERE membership.status = 'active' AND home.status = 'active'
    UNION ALL
    SELECT
      membership.user_id,
      membership.tenant_id,
      fom.canonical_membership_role(membership.role),
      relationship.contractor_tenant_id,
      'contractor'::varchar(20)
    FROM fom.tenant_memberships membership
    JOIN fom.tenants home ON home.id = membership.tenant_id
    JOIN fom.tenant_relationships relationship
      ON relationship.company_tenant_id = membership.tenant_id
      AND relationship.ended_at IS NULL
    JOIN fom.tenants contractor
      ON contractor.id = relationship.contractor_tenant_id
    WHERE membership.status = 'active'
      AND home.status = 'active'
      AND home.category = 'compania'
      AND contractor.status = 'active'
      AND fom.canonical_membership_role(membership.role)
        IN ('admin_fom', 'supervisor');

    -- ═══════════════ 7 · privilegios ═══════════════

    REVOKE ALL ON TABLE
      fom.tenant_relationships, fom.user_profiles, fom.user_credentials
      FROM PUBLIC;
    REVOKE ALL ON FUNCTION
      fom.maintain_tenant_relationship_record(),
      fom.maintain_user_profile_record(),
      fom.maintain_user_credential_record(),
      fom.canonical_membership_role(varchar)
      FROM PUBLIC;

    -- tenants: alta y contacto. Nunca code ni kind, que son derivados o
    -- inmutables. category solo en el alta.
    -- `category` también en UPDATE: el backfill deja a TODA organización
    -- existente como 'contratista', y sin permiso de actualización ningún
    -- ente podría promoverse a 'compania' desde la aplicación. La relación
    -- compañía↔contratista quedaría inalcanzable sobre los datos actuales
    -- hasta que alguien hiciera un UPDATE manual en la base.
    GRANT INSERT (
        code, name, category, timezone,
        rif, phone, email, contact_name, brand_color
      ),
      UPDATE (
        name, category, timezone, status, archived_at,
        rif, phone, email, contact_name, brand_color
      )
      ON fom.tenants TO fom_app;

    GRANT INSERT (email, display_name), UPDATE (display_name)
      ON fom.users TO fom_app;

    -- Sin DELETE: una membresía se revoca, no se borra.
    GRANT INSERT (tenant_id, user_id, role, status, activated_at),
      UPDATE (role, status, activated_at, suspended_at, revoked_at)
      ON fom.tenant_memberships TO fom_app;

    -- No puede escribir los discriminadores: le es imposible invertir el par.
    GRANT SELECT (
        id, company_tenant_id, contractor_tenant_id,
        started_at, ended_at, created_at
      ),
      INSERT (company_tenant_id, contractor_tenant_id, started_at),
      UPDATE (ended_at)
      ON fom.tenant_relationships TO fom_app;

    -- Sin DELETE: borrar datos personales es un procedimiento administrativo
    -- con su propio permiso, no un endpoint.
    GRANT SELECT (
        user_id, national_id, phone, address, birth_date,
        photo_url, profile_completed_at, created_at, updated_at
      ),
      INSERT (
        user_id, national_id, phone, address, birth_date,
        photo_url, profile_completed_at
      ),
      UPDATE (
        national_id, phone, address, birth_date, photo_url, profile_completed_at
      )
      ON fom.user_profiles TO fom_app;

    GRANT SELECT (
        id, user_id, kind, number, category,
        issued_at, expires_at, superseded_at, created_at
      ),
      INSERT (user_id, kind, number, category, issued_at, expires_at),
      UPDATE (number, category, issued_at, expires_at, superseded_at)
      ON fom.user_credentials TO fom_app;

    GRANT SELECT ON fom.actor_tenant_scope TO fom_app;
    GRANT EXECUTE ON FUNCTION fom.canonical_membership_role(varchar) TO fom_app;

    -- ═══════════════ comentarios ═══════════════

    COMMENT ON COLUMN fom.tenants.category IS
      'Commercial classification driving product rules: compania, contratista or personal';
    COMMENT ON COLUMN fom.tenants.kind IS
      'DEPRECATED: maintained projection of category; do not write, it is derived by trigger';
    COMMENT ON TABLE fom.tenant_relationships IS
      'Dated N:M engagement between a compania tenant and a contratista tenant';
    COMMENT ON COLUMN fom.tenant_relationships.company_category IS
      'Constant discriminator pinned by composite foreign key so the pair cannot be inverted';
    COMMENT ON TABLE fom.user_profiles IS
      'Personal data of a global FOM user; deliberately tenant-free because a person keeps one identity across tenants';
    COMMENT ON TABLE fom.user_credentials IS
      'Expiring personal qualifications that gate driving: licence and medical certificate';
    COMMENT ON COLUMN fom.user_credentials.superseded_at IS
      'Timestamp closing a renewed credential; NULL denotes the current one, at most one per user and kind';
    COMMENT ON VIEW fom.actor_tenant_scope IS
      'Tenants an active member may READ: the home tenant, plus contractors currently engaged by a compania when the member is supervisor or admin_fom. Writes are only ever allowed on scope_kind = home';
    COMMENT ON FUNCTION fom.canonical_membership_role(varchar) IS
      'Maps legacy membership roles onto the canonical catalogue so read paths can migrate one at a time';
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DO $guard$ BEGIN
      IF EXISTS (SELECT 1 FROM fom.tenant_relationships LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.user_profiles LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.user_credentials LIMIT 1) THEN
        RAISE EXCEPTION
          'cannot roll back the identity and organization foundation while data exists';
      END IF;

      IF EXISTS (
        SELECT 1 FROM fom.tenant_memberships
        WHERE role IN ('admin_fom', 'supervisor', 'conductor', 'usuario')
        LIMIT 1
      ) THEN
        RAISE EXCEPTION
          'cannot restore the legacy role catalogue while canonical roles are in use';
      END IF;
    END $guard$;

    REVOKE EXECUTE ON FUNCTION fom.canonical_membership_role(varchar) FROM fom_app;
    REVOKE SELECT ON fom.actor_tenant_scope FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.user_credentials FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.user_profiles FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.tenant_relationships FROM fom_app;
    REVOKE INSERT (tenant_id, user_id, role, status, activated_at),
      UPDATE (role, status, activated_at, suspended_at, revoked_at)
      ON fom.tenant_memberships FROM fom_app;
    -- Por columna, NO a nivel de tabla: un REVOKE de tabla se llevaría por
    -- delante el UPDATE (last_login_at) que concedió
    -- 20260808030000000_grant_authentication_runtime y dejaría el inicio de
    -- sesión sin poder registrar el último ingreso.
    REVOKE INSERT (email, display_name), UPDATE (display_name)
      ON fom.users FROM fom_app;
    REVOKE INSERT (
        code, name, category, timezone,
        rif, phone, email, contact_name, brand_color
      ),
      UPDATE (
        name, category, timezone, status, archived_at,
        rif, phone, email, contact_name, brand_color
      )
      ON fom.tenants FROM fom_app;

    DROP VIEW fom.actor_tenant_scope;

    CREATE OR REPLACE FUNCTION fom.maintain_tenant_membership_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.user_id IS DISTINCT FROM OLD.user_id
      ) THEN
        RAISE EXCEPTION 'membership tenant and user are immutable'
          USING ERRCODE = '23514';
      END IF;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    DROP INDEX fom.tenant_memberships_canonical_role_idx;

    ALTER TABLE fom.tenant_memberships
      DROP CONSTRAINT tenant_memberships_role_check;
    ALTER TABLE fom.tenant_memberships
      ADD CONSTRAINT tenant_memberships_role_check CHECK (
        role IN ('owner', 'administrator', 'fleet_manager', 'operator', 'viewer')
      );

    DROP FUNCTION fom.canonical_membership_role(varchar);

    DROP TABLE fom.user_credentials;
    DROP TABLE fom.user_profiles;
    DROP TABLE fom.tenant_relationships;

    DROP FUNCTION fom.maintain_user_credential_record();
    DROP FUNCTION fom.maintain_user_profile_record();
    DROP FUNCTION fom.maintain_tenant_relationship_record();

    CREATE OR REPLACE FUNCTION fom.maintain_tenant_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND NEW.code IS DISTINCT FROM OLD.code THEN
        RAISE EXCEPTION 'tenant code is immutable' USING ERRCODE = '23514';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone
      ) THEN
        RAISE EXCEPTION 'tenant timezone is not recognized: %', NEW.timezone
          USING ERRCODE = '23514';
      END IF;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    DROP INDEX fom.tenants_category_status_idx;
    DROP INDEX fom.tenants_rif_unique_idx;

    ALTER TABLE fom.tenants
      DROP CONSTRAINT tenants_id_category_unique,
      DROP CONSTRAINT tenants_brand_color_check,
      DROP CONSTRAINT tenants_contact_name_check,
      DROP CONSTRAINT tenants_email_format_check,
      DROP CONSTRAINT tenants_phone_format_check,
      DROP CONSTRAINT tenants_rif_format_check,
      DROP CONSTRAINT tenants_category_kind_check,
      DROP CONSTRAINT tenants_category_check,
      DROP COLUMN brand_color,
      DROP COLUMN contact_name,
      DROP COLUMN email,
      DROP COLUMN phone,
      DROP COLUMN rif,
      DROP COLUMN category;
  `);
};
