import type { MigrationBuilder } from 'node-pg-migrate/dist/bundle/index';

/**
 * Áreas, clasificación de vehículos, titularidad de conductores y estado vivo.
 *
 * Sobre `fom.vehicle_live_state`: es una PROYECCIÓN del pipeline de telemetría,
 * no columnas en `fom.vehicles`, por cuatro razones.
 *
 *   1. Contención. El estado se reescribe una vez por minuto y por vehículo.
 *      En `vehicles` cada trama tomaría ROW EXCLUSIVE sobre el catálogo maestro
 *      y tocaría sus cuatro índices, matando las actualizaciones HOT.
 *   2. Bloat. A un minuto por unidad, `vehicles` acumularía ~1.440 versiones
 *      muertas por vehículo y día. Aislada y con fillfactor bajo, esa presión
 *      se queda donde no importa.
 *   3. Permisos. Con columnas en `vehicles`, cualquiera que pueda editar el
 *      alias podría escribir la velocidad. Separada, la regla es estructural.
 *   4. Reconstruible. Se puede vaciar y regenerar con un DISTINCT ON sobre
 *      `gps_positions`. Un estado escrito a mano no tiene fuente a la que
 *      volver.
 *
 * `motion_state` es columna GENERADA: no admite escritura de nadie, ni siquiera
 * del ingestor. La regla «nada de datos derivados escritos a mano» deja de
 * depender de la disciplina de quien programe.
 *
 * NOTA DE ALCANCE. El diseño original separaba un rol `fom_ingest` y retiraba
 * a `fom_app` la escritura sobre `fom.gps_positions`. No se incluye aquí: hoy
 * el ingestor y la API comparten rol, y ese REVOKE detendría la ingesta en el
 * instante de aplicarse. La separación de roles es un cambio operacional con
 * su propia autorización y su propio Issue, y debe ir DESPUÉS de aprovisionar
 * el rol del ingestor.
 */

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE FUNCTION fom.maintain_area_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'area identity is immutable' USING ERRCODE = '23514';
      END IF;
      NEW.name = btrim(NEW.name);
      NEW.kind = lower(btrim(NEW.kind));
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.maintain_vehicle_driver_assignment_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
        OR NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.role IS DISTINCT FROM OLD.role
        OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'vehicle driver assignment identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      -- Cerrar es irreversible: un período histórico no se reabre ni se mueve.
      IF TG_OP = 'UPDATE'
        AND OLD.valid_to IS NOT NULL
        AND NEW.valid_to IS DISTINCT FROM OLD.valid_to THEN
        RAISE EXCEPTION 'closed vehicle driver assignment cannot be reopened'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'UPDATE'
        AND OLD.valid_to IS NOT NULL
        AND NEW.pin_hash IS DISTINCT FROM OLD.pin_hash THEN
        RAISE EXCEPTION 'closed vehicle driver assignment cannot rotate its PIN'
          USING ERRCODE = '23514';
      END IF;

      -- Sin CASE aqui dentro: PL/pgSQL corta la condicion de un IF en el
      -- primer THEN que encuentra, y el THEN del CASE se lo comia, dejando
      -- media expresion. La forma equivalente es explicita y no tiene trampa:
      -- en un alta cualquier PIN es nuevo, y en una actualizacion solo cuenta
      -- si cambia respecto al anterior.
      IF NEW.pin_hash IS NOT NULL
        AND (
          TG_OP <> 'UPDATE'
          OR NEW.pin_hash IS DISTINCT FROM OLD.pin_hash
        ) THEN
        NEW.pin_set_at = clock_timestamp();
      END IF;

      NEW.revocation_reason = CASE
        WHEN NEW.revocation_reason IS NULL THEN NULL
        ELSE lower(btrim(NEW.revocation_reason))
      END;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.maintain_vehicle_live_state_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    DECLARE
      source_tenant_id uuid;
      source_vehicle_id uuid;
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'vehicle live state identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      -- Las tramas GPS llegan desordenadas: la proyección nunca retrocede.
      IF TG_OP = 'UPDATE' AND NEW.last_report_at < OLD.last_report_at THEN
        RAISE EXCEPTION 'vehicle live state cannot move backwards in time'
          USING ERRCODE = '23514';
      END IF;
      IF TG_OP = 'UPDATE'
        AND NEW.last_position_at IS NOT NULL
        AND OLD.last_position_at IS NOT NULL
        AND NEW.last_position_at < OLD.last_position_at THEN
        RAISE EXCEPTION 'vehicle live state position cannot move backwards in time'
          USING ERRCODE = '23514';
      END IF;

      -- Sin clave foránea hacia gps_positions: esa tabla no tiene
      -- UNIQUE (tenant_id, id) y crear ese índice en una serie temporal viva
      -- cuesta un btree más en cada INSERT, para siempre. La pertenencia se
      -- comprueba aquí, como ya hace validate_gps_position_attempt.
      IF NEW.position_id IS NOT NULL THEN
        SELECT tenant_id, vehicle_id
          INTO source_tenant_id, source_vehicle_id
          FROM fom.gps_positions
         WHERE id = NEW.position_id;

        IF NOT FOUND
          OR source_tenant_id IS DISTINCT FROM NEW.tenant_id
          OR source_vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
          RAISE EXCEPTION
            'vehicle live state must project a position of the same tenant and vehicle'
            USING ERRCODE = '23514';
        END IF;
      END IF;

      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    -- ─────────────────────────── fom.areas ───────────────────────────

    CREATE TABLE fom.areas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      name varchar(120) NOT NULL,
      kind varchar(20) NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'active',
      archived_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT areas_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT areas_tenant_id_unique UNIQUE (tenant_id, id),
      CONSTRAINT areas_name_check CHECK (
        name = btrim(name) AND char_length(name) BETWEEN 1 AND 120
      ),
      CONSTRAINT areas_kind_check CHECK (
        kind IN ('ubicacion', 'sector', 'contrato')
      ),
      CONSTRAINT areas_status_check CHECK (status IN ('active', 'archived')),
      CONSTRAINT areas_archive_check CHECK (
        (status = 'archived') = (archived_at IS NOT NULL)
      ),
      CONSTRAINT areas_timestamps_check CHECK (
        updated_at >= created_at
        AND (archived_at IS NULL OR archived_at >= created_at)
      )
    );

    -- Lidera con tenant_id: sirve además de índice de su clave foránea.
    CREATE UNIQUE INDEX areas_tenant_name_unique_idx
      ON fom.areas (tenant_id, lower(name));
    CREATE INDEX areas_tenant_kind_idx
      ON fom.areas (tenant_id, kind) WHERE status = 'active';

    -- ────────────────────── fom.vehicles (extensión) ──────────────────────

    ALTER TABLE fom.vehicles
      ADD COLUMN alias varchar(120),
      ADD COLUMN vehicle_type varchar(20) NOT NULL DEFAULT 'otro',
      ADD COLUMN area_id uuid,
      ADD COLUMN fleet_number varchar(30);

    ALTER TABLE fom.vehicles
      ADD CONSTRAINT vehicles_area_fk
        FOREIGN KEY (tenant_id, area_id)
        REFERENCES fom.areas (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      ADD CONSTRAINT vehicles_vehicle_type_check CHECK (
        vehicle_type IN ('camioneta', 'camion', 'auto', 'otro')
      ),
      ADD CONSTRAINT vehicles_alias_check CHECK (
        alias IS NULL OR (alias = btrim(alias) AND alias <> '')
      ),
      ADD CONSTRAINT vehicles_fleet_number_check CHECK (
        fleet_number IS NULL OR fleet_number ~ '^[A-Z0-9][A-Z0-9._-]{0,29}$'
      );

    CREATE INDEX vehicles_tenant_area_idx
      ON fom.vehicles (tenant_id, area_id) WHERE area_id IS NOT NULL;
    CREATE UNIQUE INDEX vehicles_tenant_fleet_number_unique_idx
      ON fom.vehicles (tenant_id, fleet_number) WHERE fleet_number IS NOT NULL;

    -- El trigger existente pasa a normalizar las columnas nuevas.
    CREATE OR REPLACE FUNCTION fom.maintain_vehicle_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
        RAISE EXCEPTION 'vehicle identity is immutable' USING ERRCODE = '23514';
      END IF;
      NEW.code = lower(btrim(NEW.code));
      NEW.plate = CASE WHEN NEW.plate IS NULL THEN NULL ELSE upper(btrim(NEW.plate)) END;
      NEW.vin = CASE WHEN NEW.vin IS NULL THEN NULL ELSE upper(btrim(NEW.vin)) END;
      NEW.make = CASE WHEN NEW.make IS NULL THEN NULL ELSE btrim(NEW.make) END;
      NEW.model = CASE WHEN NEW.model IS NULL THEN NULL ELSE btrim(NEW.model) END;
      NEW.alias = CASE WHEN NEW.alias IS NULL THEN NULL ELSE btrim(NEW.alias) END;
      NEW.vehicle_type = lower(btrim(NEW.vehicle_type));
      NEW.fleet_number = CASE WHEN NEW.fleet_number IS NULL THEN NULL ELSE upper(btrim(NEW.fleet_number)) END;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END $function$;

    -- ──────────── fom.vehicle_driver_assignments (histórico) ────────────

    CREATE TABLE fom.vehicle_driver_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      vehicle_id uuid NOT NULL,
      user_id uuid NOT NULL,
      role varchar(20) NOT NULL,
      pin_hash varchar(1024),
      pin_set_at timestamptz,
      assigned_by_user_id uuid,
      valid_from timestamptz NOT NULL DEFAULT clock_timestamp(),
      valid_to timestamptz,
      revocation_reason varchar(100),
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT vehicle_driver_assignments_tenant_fk
        FOREIGN KEY (tenant_id) REFERENCES fom.tenants(id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT vehicle_driver_assignments_vehicle_fk
        FOREIGN KEY (tenant_id, vehicle_id)
        REFERENCES fom.vehicles (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT vehicle_driver_assignments_driver_fk
        FOREIGN KEY (tenant_id, user_id)
        REFERENCES fom.tenant_memberships (tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT vehicle_driver_assignments_assigner_fk
        FOREIGN KEY (tenant_id, assigned_by_user_id)
        REFERENCES fom.tenant_memberships (tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT vehicle_driver_assignments_tenant_id_unique
        UNIQUE (tenant_id, id),
      CONSTRAINT vehicle_driver_assignments_role_check CHECK (
        role IN ('principal', 'secundario')
      ),
      -- El PIN es del secundario y solo puede existir hasheado.
      CONSTRAINT vehicle_driver_assignments_pin_policy_check CHECK (
        (role = 'principal' AND pin_hash IS NULL AND pin_set_at IS NULL)
        OR (role = 'secundario' AND pin_hash IS NOT NULL AND pin_set_at IS NOT NULL)
      ),
      -- El formato hace estructuralmente imposible guardar un PIN en claro:
      -- ningún PIN de cuatro dígitos satisface esta expresión.
      CONSTRAINT vehicle_driver_assignments_pin_format_check CHECK (
        pin_hash IS NULL OR (
          char_length(pin_hash) BETWEEN 32 AND 1024
          AND pin_hash ~ '^[$]argon2id[$]v=19[$]'
          AND pin_hash !~ '[[:space:]]'
        )
      ),
      CONSTRAINT vehicle_driver_assignments_period_check CHECK (
        valid_to IS NULL OR valid_to > valid_from
      ),
      CONSTRAINT vehicle_driver_assignments_revocation_check CHECK (
        (valid_to IS NULL AND revocation_reason IS NULL)
        OR (valid_to IS NOT NULL AND (
          revocation_reason IS NULL
          OR revocation_reason ~ '^[a-z0-9][a-z0-9._-]{0,99}$'
        ))
      ),
      CONSTRAINT vehicle_driver_assignments_timestamps_check CHECK (
        updated_at >= created_at
        AND (pin_set_at IS NULL OR pin_set_at >= created_at)
      )
    );

    -- Un solo conductor principal activo por vehículo, impuesto por la base.
    CREATE UNIQUE INDEX vehicle_driver_assignments_active_principal_idx
      ON fom.vehicle_driver_assignments (vehicle_id)
      WHERE role = 'principal' AND valid_to IS NULL;

    -- Una persona no tiene dos asignaciones abiertas al mismo vehículo.
    CREATE UNIQUE INDEX vehicle_driver_assignments_active_member_idx
      ON fom.vehicle_driver_assignments (vehicle_id, user_id)
      WHERE valid_to IS NULL;

    CREATE INDEX vehicle_driver_assignments_vehicle_history_idx
      ON fom.vehicle_driver_assignments (tenant_id, vehicle_id, valid_from DESC);
    CREATE INDEX vehicle_driver_assignments_member_history_idx
      ON fom.vehicle_driver_assignments (tenant_id, user_id, valid_from DESC);
    CREATE INDEX vehicle_driver_assignments_assigner_idx
      ON fom.vehicle_driver_assignments (tenant_id, assigned_by_user_id)
      WHERE assigned_by_user_id IS NOT NULL;

    -- ─────────────────── fom.vehicle_live_state ───────────────────

    CREATE TABLE fom.vehicle_live_state (
      tenant_id uuid NOT NULL,
      vehicle_id uuid NOT NULL,
      gps_device_id uuid,
      position_id bigint,
      last_report_at timestamptz NOT NULL,
      last_position_at timestamptz,
      has_position boolean NOT NULL DEFAULT false,
      latitude double precision,
      longitude double precision,
      speed_kph numeric(6,2),
      heading_deg numeric(5,2),
      ignition boolean,
      odometer_km numeric(12,3),
      motion_state varchar(20) GENERATED ALWAYS AS (
        CASE
          WHEN speed_kph IS NULL THEN 'unknown'
          WHEN speed_kph >= 3 THEN 'en_marcha'
          ELSE 'parada'
        END
      ) STORED,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT vehicle_live_state_pkey PRIMARY KEY (tenant_id, vehicle_id),
      CONSTRAINT vehicle_live_state_tenant_fk
        FOREIGN KEY (tenant_id) REFERENCES fom.tenants(id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT vehicle_live_state_vehicle_fk
        FOREIGN KEY (tenant_id, vehicle_id)
        REFERENCES fom.vehicles (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT vehicle_live_state_device_fk
        FOREIGN KEY (tenant_id, gps_device_id)
        REFERENCES fom.gps_devices (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT vehicle_live_state_position_check CHECK (
        (
          has_position
          AND position_id IS NOT NULL
          AND last_position_at IS NOT NULL
          AND latitude BETWEEN -90 AND 90
          AND longitude BETWEEN -180 AND 180
        )
        OR (
          NOT has_position
          AND position_id IS NULL
          AND last_position_at IS NULL
          AND latitude IS NULL
          AND longitude IS NULL
        )
      ),
      CONSTRAINT vehicle_live_state_speed_check CHECK (
        speed_kph IS NULL OR (speed_kph >= 0 AND speed_kph <= 400)
      ),
      CONSTRAINT vehicle_live_state_heading_check CHECK (
        heading_deg IS NULL OR (heading_deg >= 0 AND heading_deg < 360)
      ),
      CONSTRAINT vehicle_live_state_odometer_check CHECK (
        odometer_km IS NULL OR (odometer_km >= 0 AND odometer_km <= 9999999)
      ),
      CONSTRAINT vehicle_live_state_timestamps_check CHECK (
        updated_at >= created_at
        AND (last_position_at IS NULL OR last_position_at <= last_report_at)
      )
    ) WITH (fillfactor = 70);

    -- Único índice además de la clave primaria. No se indexa last_report_at a
    -- propósito: hay una fila por vehículo, y el recorrido secuencial de unos
    -- cientos de filas cuesta menos que perder las actualizaciones HOT en una
    -- tabla que se reescribe cada minuto por unidad.
    CREATE INDEX vehicle_live_state_device_idx
      ON fom.vehicle_live_state (tenant_id, gps_device_id)
      WHERE gps_device_id IS NOT NULL;

    -- ─────────────────────────── triggers ───────────────────────────

    CREATE TRIGGER areas_maintain_record
      BEFORE INSERT OR UPDATE ON fom.areas
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_area_record();

    CREATE TRIGGER vehicle_driver_assignments_maintain_record
      BEFORE INSERT OR UPDATE ON fom.vehicle_driver_assignments
      FOR EACH ROW
      EXECUTE FUNCTION fom.maintain_vehicle_driver_assignment_record();

    CREATE TRIGGER vehicle_live_state_maintain_record
      BEFORE INSERT OR UPDATE ON fom.vehicle_live_state
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_vehicle_live_state_record();

    -- ─────────────────────────── permisos ───────────────────────────

    REVOKE ALL ON TABLE
      fom.areas,
      fom.vehicle_driver_assignments,
      fom.vehicle_live_state
      FROM PUBLIC;
    REVOKE ALL ON FUNCTION
      fom.maintain_area_record(),
      fom.maintain_vehicle_driver_assignment_record(),
      fom.maintain_vehicle_live_state_record()
      FROM PUBLIC;

    GRANT SELECT (
        id, tenant_id, name, kind, status, archived_at, created_at, updated_at
      ),
      INSERT (tenant_id, name, kind),
      UPDATE (name, kind, status, archived_at)
      ON fom.areas TO fom_app;

    -- Las columnas nuevas de vehicles quedan bajo el GRANT de tabla que ya
    -- tiene fom_app desde 20260725011500000. Convertir esa tabla a permisos
    -- por columna es un cambio aparte: hay que verificar antes que la consola
    -- no escriba id, created_at ni updated_at explícitamente.

    GRANT SELECT (
        id, tenant_id, vehicle_id, user_id, role, pin_hash, pin_set_at,
        assigned_by_user_id, valid_from, valid_to, revocation_reason,
        created_at, updated_at
      ),
      INSERT (
        tenant_id, vehicle_id, user_id, role, pin_hash, pin_set_at,
        assigned_by_user_id, valid_from
      ),
      UPDATE (pin_hash, valid_to, revocation_reason)
      ON fom.vehicle_driver_assignments TO fom_app;

    -- La asimetría es el punto entero de la tabla: la web LEE, el pipeline
    -- de telemetría ESCRIBE. Hoy comparten rol; cuando el ingestor tenga el
    -- suyo, el UPDATE y el INSERT se le retiran a fom_app aquí.
    GRANT SELECT (
        tenant_id, vehicle_id, gps_device_id, position_id,
        last_report_at, last_position_at, has_position, latitude, longitude,
        speed_kph, heading_deg, ignition, odometer_km, motion_state, updated_at
      ),
      INSERT (
        tenant_id, vehicle_id, gps_device_id, position_id,
        last_report_at, last_position_at, has_position, latitude, longitude,
        speed_kph, heading_deg, ignition, odometer_km
      ),
      UPDATE (
        gps_device_id, position_id,
        last_report_at, last_position_at, has_position, latitude, longitude,
        speed_kph, heading_deg, ignition, odometer_km
      )
      ON fom.vehicle_live_state TO fom_app;

    -- ────────────────────────── comentarios ──────────────────────────

    COMMENT ON TABLE fom.areas IS
      'Tenant-defined groupings of vehicles by location, sector or contract';
    COMMENT ON TABLE fom.vehicle_driver_assignments IS
      'Immutable history of principal and secondary driver assignments per vehicle';
    COMMENT ON COLUMN fom.vehicle_driver_assignments.valid_to IS
      'Timestamp closing an assignment; NULL denotes the active assignment';
    COMMENT ON COLUMN fom.vehicle_driver_assignments.pin_hash IS
      'Argon2id hash of the secondary driver PIN; the plaintext PIN never reaches the database';
    COMMENT ON TABLE fom.vehicle_live_state IS
      'Projection of the last known telemetry per vehicle, owned by the ingestion pipeline';
    COMMENT ON COLUMN fom.vehicle_live_state.last_report_at IS
      'Last frame of any kind, including heartbeats without a fix';
    COMMENT ON COLUMN fom.vehicle_live_state.motion_state IS
      'Derived from speed_kph and never writable: en_marcha at 3 km/h or more';
    COMMENT ON COLUMN fom.vehicles.vehicle_type IS
      'Product taxonomy: camioneta, camion, auto or otro';
    COMMENT ON COLUMN fom.vehicles.fleet_number IS
      'Operator-facing fleet number, unique per tenant';
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DO $guard$ BEGIN
      IF EXISTS (SELECT 1 FROM fom.vehicle_live_state LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.vehicle_driver_assignments LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.areas LIMIT 1)
        OR EXISTS (
          SELECT 1 FROM fom.vehicles
          WHERE alias IS NOT NULL
             OR area_id IS NOT NULL
             OR fleet_number IS NOT NULL
             OR vehicle_type <> 'otro'
          LIMIT 1
        ) THEN
        RAISE EXCEPTION 'cannot roll back the fleet domain while data exists';
      END IF;
    END $guard$;

    COMMENT ON COLUMN fom.vehicles.fleet_number IS NULL;
    COMMENT ON COLUMN fom.vehicles.vehicle_type IS NULL;

    REVOKE SELECT, INSERT, UPDATE ON TABLE fom.vehicle_live_state FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE
      ON TABLE fom.vehicle_driver_assignments FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON TABLE fom.areas FROM fom_app;

    DROP TRIGGER vehicle_live_state_maintain_record ON fom.vehicle_live_state;
    DROP TRIGGER vehicle_driver_assignments_maintain_record
      ON fom.vehicle_driver_assignments;
    DROP TRIGGER areas_maintain_record ON fom.areas;

    DROP TABLE fom.vehicle_live_state;
    DROP TABLE fom.vehicle_driver_assignments;

    DROP INDEX fom.vehicles_tenant_fleet_number_unique_idx;
    DROP INDEX fom.vehicles_tenant_area_idx;
    ALTER TABLE fom.vehicles
      DROP CONSTRAINT vehicles_fleet_number_check,
      DROP CONSTRAINT vehicles_alias_check,
      DROP CONSTRAINT vehicles_vehicle_type_check,
      DROP CONSTRAINT vehicles_area_fk,
      DROP COLUMN fleet_number,
      DROP COLUMN area_id,
      DROP COLUMN vehicle_type,
      DROP COLUMN alias;

    DROP TABLE fom.areas;

    -- Cuerpo original de 20260721160000000, byte a byte.
    CREATE OR REPLACE FUNCTION fom.maintain_vehicle_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
        RAISE EXCEPTION 'vehicle identity is immutable' USING ERRCODE = '23514';
      END IF;
      NEW.code = lower(btrim(NEW.code));
      NEW.plate = CASE WHEN NEW.plate IS NULL THEN NULL ELSE upper(btrim(NEW.plate)) END;
      NEW.vin = CASE WHEN NEW.vin IS NULL THEN NULL ELSE upper(btrim(NEW.vin)) END;
      NEW.make = CASE WHEN NEW.make IS NULL THEN NULL ELSE btrim(NEW.make) END;
      NEW.model = CASE WHEN NEW.model IS NULL THEN NULL ELSE btrim(NEW.model) END;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END $function$;

    DROP FUNCTION fom.maintain_vehicle_live_state_record();
    DROP FUNCTION fom.maintain_vehicle_driver_assignment_record();
    DROP FUNCTION fom.maintain_area_record();
  `);
};
