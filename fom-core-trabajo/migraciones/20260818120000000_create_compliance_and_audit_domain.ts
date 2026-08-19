import type { MigrationBuilder } from 'node-pg-migrate/dist/bundle/index';

/**
 * Documentos con vencimiento, reglas de alerta, notificaciones y auditoría.
 *
 * Depende de 20260814120000000 (dominio de operación): el reinicio del
 * contador y la clave foránea de notificaciones referencian `fom.work_orders`.
 *
 * SOBRE LA AUDITORÍA. Es append-only de verdad, no por convención: `fom_app`
 * recibe INSERT y SELECT y nada más, los triggers rechazan UPDATE y DELETE, y
 * hay un trigger de sentencia aparte contra TRUNCATE —que no dispara triggers
 * de fila y sería la vía obvia para borrar el rastro—. El actor técnico, el
 * reloj y la dirección de red los pone el servidor con `current_user`,
 * `clock_timestamp()` e `inet_client_addr()`: lo que mande el cliente en esas
 * columnas se descarta, y además el GRANT de INSERT ni siquiera se las concede.
 *
 * SOBRE EL CRECIMIENTO. Ninguna de las dos tablas grandes se particiona hoy, y
 * es una decisión razonada, no una omisión. `audit_log` registra mutaciones
 * administrativas, no telemetría: su frecuencia la marca el número de personas
 * que usan la consola, no los GPS. Con 200 eventos diarios son 73.000 filas al
 * año; el umbral de particionado está en el orden de los 100 millones. Además
 * es particionable más adelante sin drama —nadie la referencia y no tiene
 * unicidad de idempotencia—, a diferencia de `gps_positions`. `notifications`
 * sí escala con la telemetría, pero su índice caliente es parcial sobre las no
 * leídas: su tamaño lo fija la bandeja pendiente, no el histórico.
 *
 * Retención: en `audit_log` NO, y es deliberado — una bitácora que se puede
 * podar no es una bitácora, y la purga exigiría el DELETE que aquí se prohíbe.
 * En `notifications` sí conviene, para las leídas con más de 180 días, con un
 * rol de mantenimiento y en su propio Issue.
 */

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE FUNCTION fom.maintain_document_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.scope IS DISTINCT FROM OLD.scope
        OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
        OR NEW.holder_user_id IS DISTINCT FROM OLD.holder_user_id
        OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'document identity and scope are immutable'
          USING ERRCODE = '23514';
      END IF;

      NEW.document_type = lower(btrim(NEW.document_type));
      NEW.document_number = CASE
        WHEN NEW.document_number IS NULL THEN NULL
        ELSE upper(btrim(NEW.document_number))
      END;
      NEW.notes = CASE
        WHEN NEW.notes IS NULL THEN NULL ELSE btrim(NEW.notes) END;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.maintain_document_file_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.document_id IS DISTINCT FROM OLD.document_id
        OR NEW.storage_key IS DISTINCT FROM OLD.storage_key
        OR NEW.content_type IS DISTINCT FROM OLD.content_type
        OR NEW.byte_size IS DISTINCT FROM OLD.byte_size
        OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
        OR NEW.uploaded_by_user_id IS DISTINCT FROM OLD.uploaded_by_user_id
        OR NEW.uploaded_at IS DISTINCT FROM OLD.uploaded_at
      ) THEN
        RAISE EXCEPTION 'document file content is immutable; only removal is allowed'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'UPDATE'
        AND OLD.removed_at IS NOT NULL
        AND NEW.removed_at IS DISTINCT FROM OLD.removed_at THEN
        RAISE EXCEPTION 'document file removal cannot be undone'
          USING ERRCODE = '23514';
      END IF;

      NEW.storage_key = btrim(NEW.storage_key);
      NEW.checksum_sha256 = lower(btrim(NEW.checksum_sha256));
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.maintain_alert_rule_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.rule_type IS DISTINCT FROM OLD.rule_type
        OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'alert rule identity and type are immutable'
          USING ERRCODE = '23514';
      END IF;

      NEW.service_name = CASE
        WHEN NEW.service_name IS NULL THEN NULL ELSE btrim(NEW.service_name) END;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.maintain_alert_rule_vehicle_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.alert_rule_id IS DISTINCT FROM OLD.alert_rule_id
        OR NEW.rule_type IS DISTINCT FROM OLD.rule_type
        OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'alert rule assignment identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'UPDATE'
        AND OLD.unassigned_at IS NOT NULL
        AND NEW.unassigned_at IS DISTINCT FROM OLD.unassigned_at THEN
        RAISE EXCEPTION 'alert rule assignment cannot be reopened'
          USING ERRCODE = '23514';
      END IF;

      -- El contador es dato derivado de la telemetría: solo avanza, y solo
      -- retrocede a cero acompañado de un reinicio fechado.
      IF TG_OP = 'UPDATE' AND NEW.progress_km < OLD.progress_km AND NOT (
        NEW.progress_km = 0 AND NEW.last_reset_at > OLD.last_reset_at
      ) THEN
        RAISE EXCEPTION 'maintenance progress is monotonic outside a reset'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'UPDATE' AND NEW.progress_km > OLD.progress_km THEN
        NEW.last_progress_at = clock_timestamp();
      END IF;

      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.maintain_notification_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.notification_type IS DISTINCT FROM OLD.notification_type
        OR NEW.title IS DISTINCT FROM OLD.title
        OR NEW.detail IS DISTINCT FROM OLD.detail
        OR NEW.work_order_id IS DISTINCT FROM OLD.work_order_id
        OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'notification content is immutable; only the read receipt changes'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'UPDATE'
        AND OLD.read_at IS NOT NULL
        AND NEW.read_at IS DISTINCT FROM OLD.read_at THEN
        RAISE EXCEPTION 'notification read receipt is immutable once set'
          USING ERRCODE = '23514';
      END IF;

      NEW.title = btrim(NEW.title);
      NEW.detail = btrim(NEW.detail);
      NEW.dedupe_key = CASE
        WHEN NEW.dedupe_key IS NULL THEN NULL
        ELSE lower(btrim(NEW.dedupe_key)) END;
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.capture_audit_log_entry()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      NEW.occurred_at = clock_timestamp();
      NEW.actor_db_role = current_user;
      NEW.actor_client_addr = inet_client_addr();
      NEW.action = lower(btrim(NEW.action));
      NEW.entity_type = lower(btrim(NEW.entity_type));
      NEW.actor_service_name = CASE
        WHEN NEW.actor_service_name IS NULL THEN NULL
        ELSE lower(btrim(NEW.actor_service_name)) END;
      NEW.request_id = CASE
        WHEN NEW.request_id IS NULL THEN NULL ELSE btrim(NEW.request_id) END;
      IF NEW.changes IS NULL THEN
        NEW.changes = '{}'::jsonb;
      END IF;
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.reject_audit_log_mutation()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      RAISE EXCEPTION 'audit log is append-only' USING ERRCODE = '23514';
    END
    $function$;

    CREATE FUNCTION fom.reject_audit_log_truncate()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      RAISE EXCEPTION 'audit log cannot be truncated' USING ERRCODE = '23514';
    END
    $function$;

    CREATE FUNCTION fom.reset_alert_rule_progress_on_work_order_close()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      UPDATE fom.alert_rule_vehicles
      SET progress_km = 0,
        last_reset_at = clock_timestamp(),
        last_reset_work_order_id = NEW.id
      WHERE tenant_id = NEW.tenant_id
        AND alert_rule_id = NEW.alert_rule_id
        AND vehicle_id = NEW.vehicle_id
        AND unassigned_at IS NULL
        AND progress_km > 0;
      RETURN NULL;
    END
    $function$;

    -- ═════════════════════════ DOCUMENTOS ═════════════════════════

    CREATE TABLE fom.documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      scope varchar(20) NOT NULL,
      vehicle_id uuid,
      holder_user_id uuid,
      document_type varchar(60) NOT NULL,
      document_number varchar(60),
      issued_on date,
      expires_on date NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'active',
      notes varchar(1000),
      created_by_user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      archived_at timestamptz,

      CONSTRAINT documents_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT documents_vehicle_fk FOREIGN KEY (tenant_id, vehicle_id)
        REFERENCES fom.vehicles(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT documents_holder_fk FOREIGN KEY (tenant_id, holder_user_id)
        REFERENCES fom.tenant_memberships(tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT documents_creator_fk FOREIGN KEY (tenant_id, created_by_user_id)
        REFERENCES fom.tenant_memberships(tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT documents_tenant_id_unique UNIQUE (tenant_id, id),
      CONSTRAINT documents_scope_check CHECK (
        scope IN ('vehiculo', 'persona')
      ),
      -- El ámbito y el titular son coherentes en las DOS direcciones: un
      -- documento de vehículo no admite titular persona, ni al revés.
      CONSTRAINT documents_holder_coherence_check CHECK (
        (scope = 'vehiculo' AND vehicle_id IS NOT NULL AND holder_user_id IS NULL)
        OR
        (scope = 'persona' AND holder_user_id IS NOT NULL AND vehicle_id IS NULL)
      ),
      CONSTRAINT documents_type_check CHECK (
        document_type ~ '^[a-z][a-z0-9_]{1,59}$'
      ),
      CONSTRAINT documents_number_check CHECK (
        document_number IS NULL
        OR (document_number = btrim(document_number) AND document_number <> '')
      ),
      CONSTRAINT documents_status_check CHECK (status IN ('active', 'archived')),
      CONSTRAINT documents_archive_check CHECK (
        (status = 'archived') = (archived_at IS NOT NULL)
      ),
      CONSTRAINT documents_validity_check CHECK (
        issued_on IS NULL OR expires_on >= issued_on
      ),
      CONSTRAINT documents_notes_check CHECK (
        notes IS NULL OR (notes = btrim(notes) AND notes <> '')
      ),
      CONSTRAINT documents_timestamps_check CHECK (
        updated_at >= created_at
        AND (archived_at IS NULL OR archived_at >= created_at)
      )
    );

    CREATE INDEX documents_tenant_type_idx
      ON fom.documents (tenant_id, document_type, expires_on);
    -- La consulta caliente del módulo: qué vence en los próximos 30 días.
    CREATE INDEX documents_tenant_expiry_idx
      ON fom.documents (tenant_id, expires_on) WHERE status = 'active';
    -- El barrido diario recorre todos los tenants.
    CREATE INDEX documents_expiry_sweep_idx
      ON fom.documents (expires_on) WHERE status = 'active';
    CREATE INDEX documents_vehicle_idx
      ON fom.documents (tenant_id, vehicle_id, expires_on)
      WHERE vehicle_id IS NOT NULL;
    CREATE INDEX documents_holder_idx
      ON fom.documents (tenant_id, holder_user_id, expires_on)
      WHERE holder_user_id IS NOT NULL;
    CREATE INDEX documents_creator_idx
      ON fom.documents (tenant_id, created_by_user_id);

    CREATE TABLE fom.document_files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      document_id uuid NOT NULL,
      storage_key varchar(500) NOT NULL,
      content_type varchar(120) NOT NULL,
      byte_size integer NOT NULL,
      checksum_sha256 varchar(64) NOT NULL,
      uploaded_by_user_id uuid NOT NULL,
      uploaded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      removed_at timestamptz,

      CONSTRAINT document_files_document_fk
        FOREIGN KEY (tenant_id, document_id)
        REFERENCES fom.documents(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT document_files_uploader_fk
        FOREIGN KEY (tenant_id, uploaded_by_user_id)
        REFERENCES fom.tenant_memberships(tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      -- La clave es una RUTA dentro del almacen, nunca una direccion. Guardar
      -- una URL aqui acoplaria el expediente al proveedor de turno, y si ademas
      -- viene firmada mete un secreto con caducidad en una tabla que se
      -- respalda y se audita: el dia que caduque el enlace, el documento queda
      -- inaccesible y el secreto sigue ahi. La direccion se construye al
      -- servir, no se persiste.
      CONSTRAINT document_files_storage_key_check CHECK (
        storage_key = btrim(storage_key)
        AND storage_key <> ''
        AND storage_key NOT LIKE '/%'
        AND storage_key !~* '^[a-z][a-z0-9+.-]*://'
        AND storage_key NOT LIKE '%?%'
        AND storage_key !~ '[[:space:]]'
      ),
      CONSTRAINT document_files_content_type_check CHECK (
        content_type IN (
          'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'
        )
      ),
      CONSTRAINT document_files_byte_size_check CHECK (
        byte_size BETWEEN 1 AND 26214400
      ),
      CONSTRAINT document_files_checksum_check CHECK (
        checksum_sha256 ~ '^[0-9a-f]{64}$'
      ),
      CONSTRAINT document_files_removal_check CHECK (
        removed_at IS NULL OR removed_at >= uploaded_at
      )
    );

    CREATE INDEX document_files_document_idx
      ON fom.document_files (tenant_id, document_id, uploaded_at);
    CREATE INDEX document_files_uploader_idx
      ON fom.document_files (tenant_id, uploaded_by_user_id);
    CREATE UNIQUE INDEX document_files_content_unique_idx
      ON fom.document_files (tenant_id, document_id, checksum_sha256)
      WHERE removed_at IS NULL;

    -- ═══════════════════════ REGLAS DE ALERTA ═══════════════════════

    CREATE TABLE fom.alert_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      rule_type varchar(20) NOT NULL,
      threshold_kph smallint,
      threshold_km integer,
      service_name varchar(120),
      is_active boolean NOT NULL DEFAULT true,
      created_by_user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT alert_rules_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT alert_rules_creator_fk
        FOREIGN KEY (tenant_id, created_by_user_id)
        REFERENCES fom.tenant_memberships(tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT alert_rules_tenant_id_unique UNIQUE (tenant_id, id),
      -- Sostiene la clave foránea de tres columnas de alert_rule_vehicles,
      -- que impide que una asignación mienta sobre el tipo de su regla.
      CONSTRAINT alert_rules_tenant_id_type_unique UNIQUE (tenant_id, id, rule_type),
      CONSTRAINT alert_rules_type_check CHECK (
        rule_type IN ('velocidad', 'mantenimiento')
      ),
      -- El umbral lleva su unidad en el nombre y solo existe el de su tipo.
      CONSTRAINT alert_rules_threshold_check CHECK (
        (
          rule_type = 'velocidad'
          AND threshold_kph IS NOT NULL
          AND threshold_kph BETWEEN 1 AND 300
          AND threshold_km IS NULL
          AND service_name IS NULL
        )
        OR
        (
          rule_type = 'mantenimiento'
          AND threshold_km IS NOT NULL
          AND threshold_km BETWEEN 1 AND 1000000
          AND threshold_kph IS NULL
          AND service_name IS NOT NULL
        )
      ),
      CONSTRAINT alert_rules_service_name_check CHECK (
        service_name IS NULL
        OR (service_name = btrim(service_name) AND service_name <> '')
      ),
      CONSTRAINT alert_rules_timestamps_check CHECK (updated_at >= created_at)
    );

    CREATE INDEX alert_rules_tenant_type_idx
      ON fom.alert_rules (tenant_id, rule_type, is_active);
    CREATE INDEX alert_rules_creator_idx
      ON fom.alert_rules (tenant_id, created_by_user_id);

    -- La clave foránea que el dominio de operación dejó pendiente porque esta
    -- tabla no existía todavía.
    ALTER TABLE fom.work_orders
      ADD CONSTRAINT work_orders_alert_rule_fk
        FOREIGN KEY (tenant_id, alert_rule_id)
        REFERENCES fom.alert_rules(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT;

    CREATE TABLE fom.alert_rule_vehicles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      alert_rule_id uuid NOT NULL,
      rule_type varchar(20) NOT NULL,
      vehicle_id uuid NOT NULL,
      progress_km numeric(12,2) NOT NULL DEFAULT 0,
      last_progress_at timestamptz,
      last_reset_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      last_reset_work_order_id uuid,
      unassigned_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT alert_rule_vehicles_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT alert_rule_vehicles_rule_fk
        FOREIGN KEY (tenant_id, alert_rule_id, rule_type)
        REFERENCES fom.alert_rules(tenant_id, id, rule_type)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT alert_rule_vehicles_vehicle_fk
        FOREIGN KEY (tenant_id, vehicle_id)
        REFERENCES fom.vehicles(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT alert_rule_vehicles_reset_work_order_fk
        FOREIGN KEY (tenant_id, last_reset_work_order_id)
        REFERENCES fom.work_orders(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT alert_rule_vehicles_type_check CHECK (
        rule_type IN ('velocidad', 'mantenimiento')
      ),
      CONSTRAINT alert_rule_vehicles_progress_check CHECK (
        progress_km >= 0
        AND (rule_type = 'mantenimiento' OR progress_km = 0)
      ),
      CONSTRAINT alert_rule_vehicles_timestamps_check CHECK (
        updated_at >= created_at
        AND last_reset_at >= created_at
        AND (last_progress_at IS NULL OR last_progress_at >= created_at)
        AND (unassigned_at IS NULL OR unassigned_at >= created_at)
      )
    );

    CREATE UNIQUE INDEX alert_rule_vehicles_active_unique_idx
      ON fom.alert_rule_vehicles (tenant_id, alert_rule_id, vehicle_id)
      WHERE unassigned_at IS NULL;
    CREATE INDEX alert_rule_vehicles_rule_idx
      ON fom.alert_rule_vehicles (tenant_id, alert_rule_id, rule_type);
    -- El evaluador de posiciones entra siempre por vehículo.
    CREATE INDEX alert_rule_vehicles_vehicle_idx
      ON fom.alert_rule_vehicles (tenant_id, vehicle_id);
    CREATE INDEX alert_rule_vehicles_reset_work_order_idx
      ON fom.alert_rule_vehicles (tenant_id, last_reset_work_order_id)
      WHERE last_reset_work_order_id IS NOT NULL;

    -- ═══════════════════════ NOTIFICACIONES ═══════════════════════

    CREATE TABLE fom.notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      notification_type varchar(30) NOT NULL DEFAULT 'otro',
      title varchar(200) NOT NULL,
      detail varchar(1000) NOT NULL DEFAULT '',
      work_order_id uuid,
      dedupe_key varchar(200),
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT notifications_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT notifications_work_order_fk
        FOREIGN KEY (tenant_id, work_order_id)
        REFERENCES fom.work_orders(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT notifications_type_check CHECK (
        notification_type IN (
          'odt_nueva', 'alerta_cumplida', 'documento_por_vencer', 'otro'
        )
      ),
      CONSTRAINT notifications_title_check CHECK (
        title = btrim(title) AND title <> ''
      ),
      CONSTRAINT notifications_detail_check CHECK (detail = btrim(detail)),
      CONSTRAINT notifications_dedupe_key_check CHECK (
        dedupe_key IS NULL OR dedupe_key ~ '^[a-z0-9][a-z0-9:._-]{2,199}$'
      ),
      CONSTRAINT notifications_read_check CHECK (
        read_at IS NULL OR read_at >= created_at
      )
    );

    -- La consulta de cada carga de pantalla. El índice parcial solo contiene
    -- lo pendiente, no el histórico: su tamaño no crece con la tabla.
    CREATE INDEX notifications_tenant_unread_idx
      ON fom.notifications (tenant_id, created_at DESC) WHERE read_at IS NULL;
    CREATE INDEX notifications_tenant_created_idx
      ON fom.notifications (tenant_id, created_at DESC);
    CREATE INDEX notifications_work_order_idx
      ON fom.notifications (tenant_id, work_order_id)
      WHERE work_order_id IS NOT NULL;
    -- El productor es un consumidor de RabbitMQ con entrega al-menos-una-vez.
    CREATE UNIQUE INDEX notifications_dedupe_unique_idx
      ON fom.notifications (tenant_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

    -- ═════════════════════════ AUDITORÍA ═════════════════════════

    CREATE TABLE fom.audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      actor_kind varchar(20) NOT NULL,
      actor_user_id uuid,
      actor_service_name varchar(80),
      actor_db_role varchar(63) NOT NULL,
      actor_client_addr inet,
      action varchar(80) NOT NULL,
      entity_type varchar(60) NOT NULL,
      entity_id uuid NOT NULL,
      changes jsonb NOT NULL DEFAULT '{}'::jsonb,
      request_id varchar(64),
      occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT audit_log_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT audit_log_actor_fk FOREIGN KEY (tenant_id, actor_user_id)
        REFERENCES fom.tenant_memberships(tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT audit_log_actor_kind_check CHECK (
        actor_kind IN ('user', 'service', 'system')
      ),
      CONSTRAINT audit_log_actor_identity_check CHECK (
        (actor_kind = 'user' AND actor_user_id IS NOT NULL AND actor_service_name IS NULL)
        OR (actor_kind = 'service' AND actor_user_id IS NULL AND actor_service_name IS NOT NULL)
        OR (actor_kind = 'system' AND actor_user_id IS NULL AND actor_service_name IS NULL)
      ),
      CONSTRAINT audit_log_actor_service_name_check CHECK (
        actor_service_name IS NULL
        OR actor_service_name ~ '^[a-z][a-z0-9._-]{1,79}$'
      ),
      CONSTRAINT audit_log_actor_db_role_check CHECK (actor_db_role <> ''),
      CONSTRAINT audit_log_action_check CHECK (
        action ~ '^[a-z][a-z0-9_]{1,39}[.][a-z][a-z0-9_]{1,38}$'
      ),
      CONSTRAINT audit_log_entity_type_check CHECK (
        entity_type ~ '^[a-z][a-z0-9_]{1,59}$'
      ),
      CONSTRAINT audit_log_changes_type_check CHECK (
        jsonb_typeof(changes) = 'object'
        AND char_length(changes::text) <= 65536
      ),
      CONSTRAINT audit_log_changes_shape_check CHECK (
        changes = '{}'::jsonb
        OR (
          (NOT changes ? 'before' OR jsonb_typeof(changes -> 'before') = 'object')
          AND (NOT changes ? 'after' OR jsonb_typeof(changes -> 'after') = 'object')
        )
      ),
      CONSTRAINT audit_log_request_id_check CHECK (
        request_id IS NULL OR (request_id = btrim(request_id) AND request_id <> '')
      )
    );

    CREATE INDEX audit_log_tenant_time_idx
      ON fom.audit_log (tenant_id, occurred_at DESC);
    CREATE INDEX audit_log_entity_idx
      ON fom.audit_log (tenant_id, entity_type, entity_id, occurred_at DESC);
    CREATE INDEX audit_log_actor_idx
      ON fom.audit_log (tenant_id, actor_user_id, occurred_at DESC)
      WHERE actor_user_id IS NOT NULL;

    -- ══════════════════════════ TRIGGERS ══════════════════════════

    CREATE TRIGGER documents_maintain_record
      BEFORE INSERT OR UPDATE ON fom.documents
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_document_record();

    CREATE TRIGGER document_files_maintain_record
      BEFORE INSERT OR UPDATE ON fom.document_files
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_document_file_record();

    CREATE TRIGGER alert_rules_maintain_record
      BEFORE INSERT OR UPDATE ON fom.alert_rules
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_alert_rule_record();

    CREATE TRIGGER alert_rule_vehicles_maintain_record
      BEFORE INSERT OR UPDATE ON fom.alert_rule_vehicles
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_alert_rule_vehicle_record();

    CREATE TRIGGER notifications_maintain_record
      BEFORE INSERT OR UPDATE ON fom.notifications
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_notification_record();

    CREATE TRIGGER audit_log_capture_entry
      BEFORE INSERT ON fom.audit_log
      FOR EACH ROW EXECUTE FUNCTION fom.capture_audit_log_entry();

    CREATE TRIGGER audit_log_reject_mutation
      BEFORE UPDATE OR DELETE ON fom.audit_log
      FOR EACH ROW EXECUTE FUNCTION fom.reject_audit_log_mutation();

    -- TRUNCATE no dispara triggers de fila: hace falta el de sentencia, o
    -- sería la vía obvia para borrar el rastro entero.
    CREATE TRIGGER audit_log_reject_truncate
      BEFORE TRUNCATE ON fom.audit_log
      FOR EACH STATEMENT EXECUTE FUNCTION fom.reject_audit_log_truncate();

    -- Cerrar una ODT preventiva reinicia el contador de kilómetros.
    CREATE TRIGGER work_orders_reset_alert_rule_progress
      AFTER UPDATE OF status ON fom.work_orders
      FOR EACH ROW
      WHEN (
        NEW.status = 'cerrada'
        AND OLD.status <> 'cerrada'
        AND NEW.kind = 'preventiva'
        AND NEW.alert_rule_id IS NOT NULL
      )
      EXECUTE FUNCTION fom.reset_alert_rule_progress_on_work_order_close();

    -- ═════════════════════════ PERMISOS ═════════════════════════

    REVOKE ALL ON TABLE
      fom.documents, fom.document_files, fom.alert_rules,
      fom.alert_rule_vehicles, fom.notifications, fom.audit_log
      FROM PUBLIC;
    REVOKE ALL ON FUNCTION
      fom.maintain_document_record(),
      fom.maintain_document_file_record(),
      fom.maintain_alert_rule_record(),
      fom.maintain_alert_rule_vehicle_record(),
      fom.maintain_notification_record(),
      fom.capture_audit_log_entry(),
      fom.reject_audit_log_mutation(),
      fom.reject_audit_log_truncate(),
      fom.reset_alert_rule_progress_on_work_order_close()
      FROM PUBLIC;

    GRANT SELECT (
        id, tenant_id, scope, vehicle_id, holder_user_id, document_type,
        document_number, issued_on, expires_on, status, notes,
        created_by_user_id, created_at, updated_at, archived_at
      ),
      INSERT (
        tenant_id, scope, vehicle_id, holder_user_id, document_type,
        document_number, issued_on, expires_on, notes, created_by_user_id
      ),
      UPDATE (document_number, issued_on, expires_on, status, notes, archived_at)
      ON fom.documents TO fom_app;

    GRANT SELECT (
        id, tenant_id, document_id, storage_key, content_type, byte_size,
        checksum_sha256, uploaded_by_user_id, uploaded_at, removed_at
      ),
      INSERT (
        tenant_id, document_id, storage_key, content_type, byte_size,
        checksum_sha256, uploaded_by_user_id
      ),
      UPDATE (removed_at)
      ON fom.document_files TO fom_app;

    GRANT SELECT (
        id, tenant_id, rule_type, threshold_kph, threshold_km, service_name,
        is_active, created_by_user_id, created_at, updated_at
      ),
      INSERT (
        tenant_id, rule_type, threshold_kph, threshold_km, service_name,
        is_active, created_by_user_id
      ),
      UPDATE (threshold_kph, threshold_km, service_name, is_active)
      ON fom.alert_rules TO fom_app;

    GRANT SELECT (
        id, tenant_id, alert_rule_id, rule_type, vehicle_id, progress_km,
        last_progress_at, last_reset_at, last_reset_work_order_id,
        unassigned_at, created_at, updated_at
      ),
      INSERT (tenant_id, alert_rule_id, rule_type, vehicle_id),
      UPDATE (progress_km, last_reset_at, last_reset_work_order_id, unassigned_at)
      ON fom.alert_rule_vehicles TO fom_app;

    GRANT SELECT (
        id, tenant_id, notification_type, title, detail, work_order_id,
        dedupe_key, read_at, created_at
      ),
      INSERT (
        tenant_id, notification_type, title, detail, work_order_id, dedupe_key
      ),
      UPDATE (read_at)
      ON fom.notifications TO fom_app;

    -- Auditoría: solo INSERT y SELECT, y el INSERT no alcanza a las columnas
    -- que captura el servidor. Sin UPDATE, sin DELETE, sin TRUNCATE.
    GRANT SELECT (
        id, tenant_id, actor_kind, actor_user_id, actor_service_name,
        actor_db_role, actor_client_addr, action, entity_type, entity_id,
        changes, request_id, occurred_at
      ),
      INSERT (
        tenant_id, actor_kind, actor_user_id, actor_service_name,
        action, entity_type, entity_id, changes, request_id
      )
      ON fom.audit_log TO fom_app;

    -- ═══════════════════════ COMENTARIOS ═══════════════════════

    COMMENT ON TABLE fom.documents IS
      'Tenant-owned expiring documents scoped to either a vehicle or a person';
    COMMENT ON COLUMN fom.documents.scope IS
      'Discriminator kept coherent with the holder columns by a two-way CHECK';
    COMMENT ON COLUMN fom.documents.expires_on IS
      'Calendar expiry date, deliberately a date and not a timestamptz: an expiry is a calendar fact and a timestamp would shift the 30-day window with the timezone';
    COMMENT ON TABLE fom.document_files IS
      'Immutable attachment metadata for a document; removal is a soft flag';
    COMMENT ON TABLE fom.alert_rules IS
      'Tenant alert rules: speed threshold in km/h or service interval in km';
    COMMENT ON COLUMN fom.alert_rules.rule_type IS
      'Immutable rule type mirrored into alert_rule_vehicles through a composite foreign key';
    COMMENT ON COLUMN fom.alert_rule_vehicles.progress_km IS
      'Derived from telemetry; monotonic except on reset by a closed preventive work order';
    COMMENT ON TABLE fom.notifications IS
      'Tenant console inbox produced by message consumers, not by database triggers';
    COMMENT ON COLUMN fom.notifications.dedupe_key IS
      'Idempotency key for at-least-once delivery from the message broker';
    COMMENT ON TABLE fom.audit_log IS
      'Append-only record of administrative mutations; enforced by triggers and privileges';
    COMMENT ON COLUMN fom.audit_log.actor_db_role IS
      'Captured server-side from current_user; never accepted from the client';
    COMMENT ON COLUMN fom.audit_log.occurred_at IS
      'Captured server-side from clock_timestamp(); never accepted from the client';
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    REVOKE SELECT, INSERT ON fom.audit_log FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.notifications FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.alert_rule_vehicles FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.alert_rules FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.document_files FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.documents FROM fom_app;

    DROP TRIGGER work_orders_reset_alert_rule_progress ON fom.work_orders;

    DO $guard$ BEGIN
      IF EXISTS (SELECT 1 FROM fom.audit_log LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.notifications LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.alert_rule_vehicles LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.alert_rules LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.document_files LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.documents LIMIT 1) THEN
        RAISE EXCEPTION
          'cannot roll back compliance, alerting and audit while data exists';
      END IF;
    END $guard$;

    ALTER TABLE fom.work_orders DROP CONSTRAINT work_orders_alert_rule_fk;

    DROP TABLE fom.audit_log;
    DROP TABLE fom.notifications;
    DROP TABLE fom.alert_rule_vehicles;
    DROP TABLE fom.alert_rules;
    DROP TABLE fom.document_files;
    DROP TABLE fom.documents;

    DROP FUNCTION fom.reset_alert_rule_progress_on_work_order_close();
    DROP FUNCTION fom.reject_audit_log_truncate();
    DROP FUNCTION fom.reject_audit_log_mutation();
    DROP FUNCTION fom.capture_audit_log_entry();
    DROP FUNCTION fom.maintain_notification_record();
    DROP FUNCTION fom.maintain_alert_rule_vehicle_record();
    DROP FUNCTION fom.maintain_alert_rule_record();
    DROP FUNCTION fom.maintain_document_file_record();
    DROP FUNCTION fom.maintain_document_record();
  `);
};
