import type { MigrationBuilder } from 'node-pg-migrate/dist/bundle/index';

/**
 * Órdenes de trabajo (ODT) e inspección diaria.
 *
 * Dos decisiones estructurales que conviene entender antes de leer el SQL.
 *
 * HISTÓRICO EN VEZ DE COLUMNA DE CIERRE. La base provisional resolvía el
 * cierre con un trigger sobre `resuelta_en`. Esa columna responde una sola
 * pregunta —cuándo se cerró— y el supervisor hace otras cuatro: cuánto estuvo
 * en revisión, quién la devolvió a abierta y por qué, cuántas veces se
 * reabrió, y el tiempo medio de cierre por tipo de falla. Todas son la misma:
 * la duración de cada tramo, que solo existe si se guardan sus dos extremos.
 * `work_order_events` es append-only, la escribe un trigger —así ningún cambio
 * de estado escapa sin rastro— y `fom_app` solo tiene SELECT sobre ella.
 *
 * PLANTILLAS VERSIONADAS E INMUTABLES. Si el checklist se edita en sitio, una
 * inspección de marzo que decía «Extintor vigente: conforme» pasa a colgar de
 * un ítem que hoy se llama otra cosa, o que hoy es crítico y entonces no lo
 * era. El registro cambia de significado retroactivamente, y eso es
 * inaceptable en un documento que se usa para deslindar responsabilidad tras
 * un accidente. Editar significa publicar una versión nueva; la anterior queda
 * congelada. La respuesta lleva `template_id` además de `template_item_id`,
 * con dos claves foráneas compuestas, de modo que la base hace IMPOSIBLE
 * responder un ítem que no pertenece a la versión que se está respondiendo.
 *
 * Las notificaciones NO se generan aquí. La decisión tomada es publicar un
 * evento en RabbitMQ y que un consumidor las cree; `work_order_events` es el
 * punto de enganche.
 */

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    -- ═══════════════ 0 . catalogo de estados de la orden ═══════════════

    -- FUNDACION INICIAL EXPANDIBLE, declarada como tal segun pide el Issue.
    --
    -- docs/functional/FOM-MAINTENANCE.md contempla un ciclo mucho mas largo:
    -- pendiente de revision, aprobada, planificada, asignada, en ejecucion,
    -- pausada, esperando repuesto, esperando proveedor, en prueba, en calidad,
    -- cerrada y cancelada. Este bloque NO lo implementa entero, porque cada
    -- uno de esos estados arrastra actores, motivos y evidencia que todavia no
    -- estan decididos, y fijarlos a ciegas seria peor que no fijarlos.
    --
    -- Lo que si se resuelve es que ampliarlo despues no cueste una reescritura.
    -- El catalogo vivia repetido en tres sitios —la columna de la orden y las
    -- dos del historial—, de modo que anadir un estado obligaba a acertar en
    -- los tres. Aqui vive una sola vez, en un dominio, y ampliarlo es cambiar
    -- la restriccion del dominio y nada mas.
    --
    -- Se incluyen 'aprobada' y 'cancelada' porque no son suposiciones: el
    -- documento maestro las nombra y la aplicacion movil ya las emite. Dejarlas
    -- fuera garantizaba que la base rechazara datos que el cliente ya produce.
    --
    -- Lo que NO se modela todavia, y consta para que no se de por cerrado:
    -- la solicitud es una entidad con identidad propia y no un estado de la
    -- orden (FOM-MAINTENANCE.md §5), asi que 'pendiente' no aparece aqui.

    CREATE DOMAIN fom.work_order_status AS varchar(30)
      CONSTRAINT work_order_status_catalogue CHECK (
        VALUE IN ('abierta', 'en_revision', 'aprobada', 'cerrada', 'cancelada')
      );

    CREATE FUNCTION fom.maintain_work_order_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
        OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
        OR NEW.author_via IS DISTINCT FROM OLD.author_via
        OR NEW.kind IS DISTINCT FROM OLD.kind
        OR NEW.alert_rule_id IS DISTINCT FROM OLD.alert_rule_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'work order identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'INSERT' AND NEW.status <> 'abierta' THEN
        RAISE EXCEPTION 'a work order is always created in status abierta'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        -- Reabrir devuelve a revisión, nunca a abierta: el trabajo ya pasó por
        -- el taller, y fingir lo contrario produciría un segundo tramo de
        -- "abierta" que ensucia la métrica de primera respuesta.
        -- Cancelar se permite desde cualquier estado no terminal: una orden
        -- se anula por motivos ajenos al taller —el vehiculo se vendio, la
        -- falla no existia— y obligar a pasarla por revision para cerrarla
        -- falsearia el historial de trabajo.
        IF NOT (
          (OLD.status = 'abierta'
            AND NEW.status IN ('en_revision', 'cerrada', 'cancelada'))
          OR (OLD.status = 'en_revision'
            AND NEW.status IN ('abierta', 'aprobada', 'cerrada', 'cancelada'))
          OR (OLD.status = 'aprobada'
            AND NEW.status IN ('en_revision', 'cerrada', 'cancelada'))
          OR (OLD.status = 'cerrada' AND NEW.status = 'en_revision')
        ) THEN
          RAISE EXCEPTION 'invalid work order status transition: % to %',
            OLD.status, NEW.status
            USING ERRCODE = '23514';
        END IF;
        NEW.status_changed_at = clock_timestamp();
      END IF;

      -- Cerrar fija resuelta_en; reabrir lo limpia. Se conservan la nota y el
      -- costo: el gasto ya incurrido no desaparece porque se reabra.
      IF NEW.status = 'cerrada' THEN
        NEW.resolved_at = coalesce(NEW.resolved_at, clock_timestamp());
      ELSE
        NEW.resolved_at = NULL;
      END IF;

      NEW.description = btrim(NEW.description);
      NEW.failure_type = CASE
        WHEN NEW.failure_type IS NULL THEN NULL
        ELSE lower(btrim(NEW.failure_type)) END;
      NEW.location = CASE
        WHEN NEW.location IS NULL THEN NULL ELSE btrim(NEW.location) END;
      NEW.resolution_note = CASE
        WHEN NEW.resolution_note IS NULL THEN NULL
        ELSE btrim(NEW.resolution_note) END;
      NEW.last_status_note = CASE
        WHEN NEW.last_status_note IS NULL THEN NULL
        ELSE btrim(NEW.last_status_note) END;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    -- SECURITY DEFINER a propósito: es la única forma de que fom_app, que solo
    -- tiene SELECT sobre el histórico, no pueda insertar historia falsa.
    CREATE FUNCTION fom.record_work_order_event()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = pg_catalog AS $function$
    DECLARE
      next_sequence integer;
    BEGIN
      SELECT coalesce(max(event.sequence_number), 0) + 1
        INTO next_sequence
        FROM fom.work_order_events AS event
        WHERE event.work_order_id = NEW.id;

      INSERT INTO fom.work_order_events (
        tenant_id, work_order_id, sequence_number,
        actor_user_id, from_status, to_status, note, occurred_at
      ) VALUES (
        NEW.tenant_id,
        NEW.id,
        next_sequence,
        NEW.last_status_actor_user_id,
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        NEW.status,
        NEW.last_status_note,
        NEW.status_changed_at
      );
      RETURN NULL;
    END
    $function$;

    CREATE FUNCTION fom.reject_work_order_event_mutation()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      RAISE EXCEPTION 'work order history is append-only'
        USING ERRCODE = '23514';
    END
    $function$;

    CREATE FUNCTION fom.maintain_inspection_template_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.code IS DISTINCT FROM OLD.code
        OR NEW.version IS DISTINCT FROM OLD.version
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'inspection template identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'INSERT' AND NEW.status <> 'borrador' THEN
        RAISE EXCEPTION 'an inspection template is always created as borrador'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
          (OLD.status = 'borrador' AND NEW.status IN ('publicada', 'archivada'))
          OR (OLD.status = 'publicada' AND NEW.status = 'archivada')
        ) THEN
          RAISE EXCEPTION 'invalid inspection template status transition: % to %',
            OLD.status, NEW.status
            USING ERRCODE = '23514';
        END IF;
      END IF;

      -- Una versión publicada es inmutable salvo por su propio archivado.
      IF TG_OP = 'UPDATE' AND OLD.status <> 'borrador' AND (
        NEW.name IS DISTINCT FROM OLD.name
        OR NEW.description IS DISTINCT FROM OLD.description
        OR NEW.published_at IS DISTINCT FROM OLD.published_at
      ) THEN
        RAISE EXCEPTION 'a published inspection template version is immutable'
          USING ERRCODE = '23514';
      END IF;

      IF NEW.status = 'publicada' AND NOT EXISTS (
        SELECT 1 FROM fom.inspection_template_items AS item
        WHERE item.template_id = NEW.id
      ) THEN
        RAISE EXCEPTION 'an inspection template cannot be published without items'
          USING ERRCODE = '23514';
      END IF;

      IF NEW.status = 'borrador' THEN
        NEW.published_at = NULL;
        NEW.archived_at = NULL;
      ELSIF NEW.status = 'publicada' THEN
        NEW.published_at = coalesce(NEW.published_at, clock_timestamp());
        NEW.archived_at = NULL;
      ELSE
        NEW.archived_at = coalesce(NEW.archived_at, clock_timestamp());
      END IF;

      NEW.code = lower(btrim(NEW.code));
      NEW.name = btrim(NEW.name);
      NEW.description = CASE
        WHEN NEW.description IS NULL THEN NULL ELSE btrim(NEW.description) END;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.guard_inspection_template_item_mutation()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    DECLARE
      template_status varchar(20);
    BEGIN
      SELECT template.status INTO template_status
        FROM fom.inspection_templates AS template
        WHERE template.id = CASE
          WHEN TG_OP = 'DELETE' THEN OLD.template_id ELSE NEW.template_id END;

      IF template_status IS DISTINCT FROM 'borrador' THEN
        RAISE EXCEPTION 'items of a published inspection template are immutable'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;

      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.template_id IS DISTINCT FROM OLD.template_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'inspection template item identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      NEW.code = lower(btrim(NEW.code));
      NEW.category = btrim(NEW.category);
      NEW.name = btrim(NEW.name);
      NEW.help_text = CASE
        WHEN NEW.help_text IS NULL THEN NULL ELSE btrim(NEW.help_text) END;
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.maintain_inspection_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    DECLARE
      template_status varchar(20);
    BEGIN
      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
        OR NEW.driver_user_id IS DISTINCT FROM OLD.driver_user_id
        OR NEW.template_id IS DISTINCT FROM OLD.template_id
        OR NEW.inspection_date IS DISTINCT FROM OLD.inspection_date
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'inspection identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'INSERT' THEN
        IF NEW.result <> 'pendiente' THEN
          RAISE EXCEPTION 'an inspection is always created as pendiente'
            USING ERRCODE = '23514';
        END IF;
        SELECT template.status INTO template_status
          FROM fom.inspection_templates AS template
          WHERE template.id = NEW.template_id;
        IF template_status IS DISTINCT FROM 'publicada' THEN
          RAISE EXCEPTION 'an inspection must use a published template version'
            USING ERRCODE = '23514';
        END IF;
      END IF;

      -- Enviada es terminal: un error se corrige con una inspección nueva, no
      -- reescribiendo la del día.
      IF TG_OP = 'UPDATE'
        AND OLD.result <> 'pendiente'
        AND NEW.result IS DISTINCT FROM OLD.result
      THEN
        RAISE EXCEPTION 'invalid inspection result transition: % to %',
          OLD.result, NEW.result
          USING ERRCODE = '23514';
      END IF;

      IF NEW.result <> 'pendiente' THEN
        NEW.submitted_at = coalesce(NEW.submitted_at, clock_timestamp());
      ELSE
        NEW.submitted_at = NULL;
      END IF;

      -- Un ítem CRÍTICO en falla nunca produce una inspección aprobada, ni
      -- siquiera "con observaciones": un camión sin frenos aprobado con
      -- observaciones sale a la carretera igual.
      IF NEW.result IN ('aprobada', 'aprobada_con_observaciones') AND EXISTS (
        SELECT 1 FROM fom.inspection_answers AS answer
        WHERE answer.inspection_id = NEW.id
          AND answer.item_state = 'falla'
          AND answer.is_critical
      ) THEN
        RAISE EXCEPTION
          'inspection with a failed critical item cannot be approved'
          USING ERRCODE = '23514';
      END IF;

      -- "Aprobada" a secas significa que no hubo nada que anotar; si hubo,
      -- el estado que lo nombra ya existe.
      IF NEW.result = 'aprobada' AND EXISTS (
        SELECT 1 FROM fom.inspection_answers AS answer
        WHERE answer.inspection_id = NEW.id
          AND answer.item_state <> 'conforme'
      ) THEN
        RAISE EXCEPTION
          'inspection with observations or failures must be recorded as aprobada_con_observaciones or bloqueada'
          USING ERRCODE = '23514';
      END IF;

      NEW.location = CASE
        WHEN NEW.location IS NULL THEN NULL ELSE btrim(NEW.location) END;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    CREATE FUNCTION fom.maintain_inspection_answer_record()
    RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $function$
    DECLARE
      parent_result varchar(30);
      item_is_critical boolean;
    BEGIN
      SELECT inspection.result INTO parent_result
        FROM fom.inspections AS inspection
        WHERE inspection.id = CASE
          WHEN TG_OP = 'DELETE' THEN OLD.inspection_id ELSE NEW.inspection_id END;

      IF parent_result IS DISTINCT FROM 'pendiente' THEN
        RAISE EXCEPTION 'answers of a submitted inspection are immutable'
          USING ERRCODE = '23514';
      END IF;

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;

      IF TG_OP = 'UPDATE' AND (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.inspection_id IS DISTINCT FROM OLD.inspection_id
        OR NEW.template_id IS DISTINCT FROM OLD.template_id
        OR NEW.template_item_id IS DISTINCT FROM OLD.template_item_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      ) THEN
        RAISE EXCEPTION 'inspection answer identity is immutable'
          USING ERRCODE = '23514';
      END IF;

      SELECT item.is_critical INTO item_is_critical
        FROM fom.inspection_template_items AS item
        WHERE item.id = NEW.template_item_id;

      NEW.is_critical = item_is_critical;
      NEW.note = CASE WHEN NEW.note IS NULL THEN NULL ELSE btrim(NEW.note) END;
      NEW.updated_at = clock_timestamp();
      RETURN NEW;
    END
    $function$;

    -- ═══════════════════════════ ODT ═══════════════════════════

    CREATE TABLE fom.work_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      vehicle_id uuid NOT NULL,
      created_by_user_id uuid,
      author_via varchar(20),
      kind varchar(20) NOT NULL DEFAULT 'correctiva',
      status fom.work_order_status NOT NULL DEFAULT 'abierta',
      description varchar(2000) NOT NULL,
      failure_type varchar(30),
      location varchar(200),
      evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
      resolution_note varchar(2000),
      resolution_cost numeric(12,2),
      resolution_evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
      resolved_at timestamptz,
      alert_rule_id uuid,
      last_status_actor_user_id uuid,
      last_status_note varchar(1000),
      status_changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT work_orders_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT work_orders_vehicle_fk FOREIGN KEY (tenant_id, vehicle_id)
        REFERENCES fom.vehicles(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT work_orders_author_fk
        FOREIGN KEY (tenant_id, created_by_user_id)
        REFERENCES fom.tenant_memberships(tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT work_orders_status_actor_fk
        FOREIGN KEY (tenant_id, last_status_actor_user_id)
        REFERENCES fom.tenant_memberships(tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT work_orders_tenant_id_unique UNIQUE (tenant_id, id),

      CONSTRAINT work_orders_kind_check CHECK (
        kind IN ('correctiva', 'preventiva')
      ),
      CONSTRAINT work_orders_author_via_check CHECK (
        author_via IS NULL OR author_via IN ('principal', 'secundario')
      ),
      CONSTRAINT work_orders_author_check CHECK (
        created_by_user_id IS NOT NULL OR author_via IS NULL
      ),
      CONSTRAINT work_orders_description_check CHECK (
        description = btrim(description)
        AND char_length(description) BETWEEN 3 AND 2000
      ),
      CONSTRAINT work_orders_failure_type_check CHECK (
        failure_type IS NULL OR failure_type IN (
          'motor', 'frenos', 'neumaticos', 'electrico', 'carroceria', 'otro'
        )
      ),
      CONSTRAINT work_orders_location_check CHECK (
        location IS NULL OR (location = btrim(location) AND location <> '')
      ),
      CONSTRAINT work_orders_evidence_check CHECK (
        jsonb_typeof(evidence_urls) = 'array'
        AND jsonb_array_length(evidence_urls) <= 12
        AND NOT evidence_urls @? '$[*] ? (@.type() != "string")'
      ),
      CONSTRAINT work_orders_resolution_evidence_check CHECK (
        jsonb_typeof(resolution_evidence_urls) = 'array'
        AND jsonb_array_length(resolution_evidence_urls) <= 12
        AND NOT resolution_evidence_urls @? '$[*] ? (@.type() != "string")'
      ),
      CONSTRAINT work_orders_resolution_note_check CHECK (
        resolution_note IS NULL OR (
          resolution_note = btrim(resolution_note)
          AND char_length(resolution_note) BETWEEN 3 AND 2000
        )
      ),
      CONSTRAINT work_orders_resolution_cost_check CHECK (
        resolution_cost IS NULL OR resolution_cost >= 0
      ),
      -- No se cierra vacía, y solo una ODT cerrada tiene resolved_at.
      CONSTRAINT work_orders_closure_check CHECK (
        (
          status = 'cerrada'
          AND resolved_at IS NOT NULL
          AND resolution_note IS NOT NULL
        )
        OR (status <> 'cerrada' AND resolved_at IS NULL)
      ),
      CONSTRAINT work_orders_status_note_check CHECK (
        last_status_note IS NULL OR (
          last_status_note = btrim(last_status_note) AND last_status_note <> ''
        )
      ),
      CONSTRAINT work_orders_timestamps_check CHECK (
        updated_at >= created_at
        AND status_changed_at >= created_at
        AND (resolved_at IS NULL OR resolved_at >= created_at)
      )
    );

    CREATE INDEX work_orders_tenant_open_idx
      ON fom.work_orders (tenant_id, created_at DESC)
      WHERE status <> 'cerrada';
    CREATE INDEX work_orders_tenant_status_idx
      ON fom.work_orders (tenant_id, status, created_at DESC);
    CREATE INDEX work_orders_tenant_vehicle_idx
      ON fom.work_orders (tenant_id, vehicle_id, created_at DESC);
    CREATE INDEX work_orders_author_idx
      ON fom.work_orders (tenant_id, created_by_user_id)
      WHERE created_by_user_id IS NOT NULL;
    CREATE INDEX work_orders_status_actor_idx
      ON fom.work_orders (tenant_id, last_status_actor_user_id)
      WHERE last_status_actor_user_id IS NOT NULL;
    -- Compuesto y en este orden porque la clave foránea que añade el dominio
    -- de cumplimiento es (tenant_id, alert_rule_id): un índice solo sobre
    -- alert_rule_id no es prefijo izquierdo de ese par.
    CREATE INDEX work_orders_alert_rule_idx
      ON fom.work_orders (tenant_id, alert_rule_id)
      WHERE alert_rule_id IS NOT NULL;
    CREATE INDEX work_orders_tenant_resolved_idx
      ON fom.work_orders (tenant_id, resolved_at DESC)
      WHERE status = 'cerrada';

    CREATE TABLE fom.work_order_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      work_order_id uuid NOT NULL,
      sequence_number integer NOT NULL,
      from_status fom.work_order_status,
      to_status fom.work_order_status NOT NULL,
      actor_user_id uuid,
      note varchar(1000),
      occurred_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT work_order_events_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT work_order_events_work_order_fk
        FOREIGN KEY (tenant_id, work_order_id)
        REFERENCES fom.work_orders(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT work_order_events_actor_fk
        FOREIGN KEY (tenant_id, actor_user_id)
        REFERENCES fom.tenant_memberships(tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT work_order_events_sequence_unique
        UNIQUE (work_order_id, sequence_number),
      CONSTRAINT work_order_events_sequence_check CHECK (sequence_number > 0),
      CONSTRAINT work_order_events_change_check CHECK (
        from_status IS DISTINCT FROM to_status
      ),
      -- El primer evento es la creación y no tiene estado anterior.
      CONSTRAINT work_order_events_origin_check CHECK (
        (sequence_number = 1) = (from_status IS NULL)
      ),
      CONSTRAINT work_order_events_note_check CHECK (
        note IS NULL OR (note = btrim(note) AND note <> '')
      ),
      CONSTRAINT work_order_events_timestamps_check CHECK (
        created_at >= occurred_at
      )
    );

    CREATE INDEX work_order_events_timeline_idx
      ON fom.work_order_events (tenant_id, work_order_id, sequence_number);
    CREATE INDEX work_order_events_tenant_status_idx
      ON fom.work_order_events (tenant_id, to_status, occurred_at DESC);
    CREATE INDEX work_order_events_actor_idx
      ON fom.work_order_events (tenant_id, actor_user_id)
      WHERE actor_user_id IS NOT NULL;

    -- ══════════════ PLANTILLAS DE INSPECCIÓN (versionadas) ══════════════

    CREATE TABLE fom.inspection_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      code varchar(50) NOT NULL,
      version integer NOT NULL,
      name varchar(120) NOT NULL,
      description varchar(500),
      status varchar(20) NOT NULL DEFAULT 'borrador',
      published_at timestamptz,
      archived_at timestamptz,
      created_by_user_id uuid,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT inspection_templates_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspection_templates_author_fk
        FOREIGN KEY (tenant_id, created_by_user_id)
        REFERENCES fom.tenant_memberships(tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspection_templates_tenant_id_unique UNIQUE (tenant_id, id),
      CONSTRAINT inspection_templates_version_unique
        UNIQUE (tenant_id, code, version),
      CONSTRAINT inspection_templates_code_check CHECK (
        code ~ '^[a-z0-9][a-z0-9._-]{0,49}$'
      ),
      CONSTRAINT inspection_templates_version_check CHECK (version > 0),
      CONSTRAINT inspection_templates_name_check CHECK (
        name = btrim(name) AND char_length(name) BETWEEN 2 AND 120
      ),
      CONSTRAINT inspection_templates_description_check CHECK (
        description IS NULL
        OR (description = btrim(description) AND description <> '')
      ),
      CONSTRAINT inspection_templates_status_check CHECK (
        status IN ('borrador', 'publicada', 'archivada')
      ),
      CONSTRAINT inspection_templates_lifecycle_check CHECK (
        (status = 'borrador' AND published_at IS NULL AND archived_at IS NULL)
        OR (
          status = 'publicada'
          AND published_at IS NOT NULL
          AND archived_at IS NULL
        )
        OR (
          status = 'archivada'
          AND archived_at IS NOT NULL
          AND (published_at IS NULL OR archived_at >= published_at)
        )
      ),
      CONSTRAINT inspection_templates_timestamps_check CHECK (
        updated_at >= created_at
        AND (published_at IS NULL OR published_at >= created_at)
        AND (archived_at IS NULL OR archived_at >= created_at)
      )
    );

    -- Una sola versión vigente por checklist y por tenant.
    CREATE UNIQUE INDEX inspection_templates_published_unique_idx
      ON fom.inspection_templates (tenant_id, code)
      WHERE status = 'publicada';
    CREATE INDEX inspection_templates_tenant_status_idx
      ON fom.inspection_templates (tenant_id, status, code);
    CREATE INDEX inspection_templates_author_idx
      ON fom.inspection_templates (tenant_id, created_by_user_id)
      WHERE created_by_user_id IS NOT NULL;

    CREATE TABLE fom.inspection_template_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      template_id uuid NOT NULL,
      code varchar(50) NOT NULL,
      category varchar(60) NOT NULL,
      name varchar(160) NOT NULL,
      is_critical boolean NOT NULL DEFAULT false,
      help_text varchar(500),
      vehicle_types jsonb NOT NULL DEFAULT '[]'::jsonb,
      display_order smallint NOT NULL,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT inspection_template_items_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspection_template_items_template_fk
        FOREIGN KEY (tenant_id, template_id)
        REFERENCES fom.inspection_templates(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspection_template_items_tenant_id_unique UNIQUE (tenant_id, id),
      -- Permite que una respuesta ate su ítem a la versión exacta que responde.
      CONSTRAINT inspection_template_items_template_id_unique
        UNIQUE (tenant_id, template_id, id),
      CONSTRAINT inspection_template_items_code_unique UNIQUE (template_id, code),
      CONSTRAINT inspection_template_items_order_unique
        UNIQUE (template_id, display_order),
      CONSTRAINT inspection_template_items_code_check CHECK (
        code ~ '^[a-z0-9][a-z0-9._-]{0,49}$'
      ),
      CONSTRAINT inspection_template_items_category_check CHECK (
        category = btrim(category) AND char_length(category) BETWEEN 2 AND 60
      ),
      CONSTRAINT inspection_template_items_name_check CHECK (
        name = btrim(name) AND char_length(name) BETWEEN 2 AND 160
      ),
      CONSTRAINT inspection_template_items_help_check CHECK (
        help_text IS NULL OR (help_text = btrim(help_text) AND help_text <> '')
      ),
      -- '[]' = aplica a todos los tipos de vehículo.
      CONSTRAINT inspection_template_items_vehicle_types_check CHECK (
        jsonb_typeof(vehicle_types) = 'array'
        AND vehicle_types <@ '["camioneta","camion","auto","otro"]'::jsonb
      ),
      CONSTRAINT inspection_template_items_order_check CHECK (display_order > 0)
    );

    CREATE INDEX inspection_template_items_template_idx
      ON fom.inspection_template_items (tenant_id, template_id, display_order);

    -- ══════════════════════ INSPECCIÓN DIARIA ══════════════════════

    CREATE TABLE fom.inspections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      vehicle_id uuid NOT NULL,
      driver_user_id uuid NOT NULL,
      template_id uuid NOT NULL,
      inspection_date date NOT NULL DEFAULT CURRENT_DATE,
      result varchar(30) NOT NULL DEFAULT 'pendiente',
      location varchar(200),
      submitted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT inspections_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspections_vehicle_fk FOREIGN KEY (tenant_id, vehicle_id)
        REFERENCES fom.vehicles(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspections_driver_fk FOREIGN KEY (tenant_id, driver_user_id)
        REFERENCES fom.tenant_memberships(tenant_id, user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspections_template_fk FOREIGN KEY (tenant_id, template_id)
        REFERENCES fom.inspection_templates(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspections_tenant_id_unique UNIQUE (tenant_id, id),
      -- Ata cada respuesta a la versión de plantilla de SU inspección.
      CONSTRAINT inspections_template_id_unique UNIQUE (tenant_id, id, template_id),
      CONSTRAINT inspections_result_check CHECK (
        result IN (
          'pendiente', 'aprobada', 'aprobada_con_observaciones', 'bloqueada'
        )
      ),
      CONSTRAINT inspections_submission_check CHECK (
        (result = 'pendiente' AND submitted_at IS NULL)
        OR (result <> 'pendiente' AND submitted_at IS NOT NULL)
      ),
      CONSTRAINT inspections_location_check CHECK (
        location IS NULL OR (location = btrim(location) AND location <> '')
      ),
      CONSTRAINT inspections_timestamps_check CHECK (
        updated_at >= created_at
        AND (submitted_at IS NULL OR submitted_at >= created_at)
      )
    );

    CREATE UNIQUE INDEX inspections_daily_unique_idx
      ON fom.inspections (tenant_id, vehicle_id, inspection_date, driver_user_id);
    CREATE INDEX inspections_tenant_date_idx
      ON fom.inspections (tenant_id, inspection_date DESC, result);
    CREATE INDEX inspections_tenant_open_idx
      ON fom.inspections (tenant_id, inspection_date DESC)
      WHERE result IN ('pendiente', 'bloqueada');
    CREATE INDEX inspections_driver_idx
      ON fom.inspections (tenant_id, driver_user_id, inspection_date DESC);
    CREATE INDEX inspections_template_idx
      ON fom.inspections (tenant_id, template_id);

    CREATE TABLE fom.inspection_answers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      inspection_id uuid NOT NULL,
      template_id uuid NOT NULL,
      template_item_id uuid NOT NULL,
      item_state varchar(20) NOT NULL,
      is_critical boolean NOT NULL DEFAULT false,
      note varchar(1000),
      evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
      requested_work_order boolean,
      work_order_id uuid,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),

      CONSTRAINT inspection_answers_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES fom.tenants(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspection_answers_inspection_fk
        FOREIGN KEY (tenant_id, inspection_id, template_id)
        REFERENCES fom.inspections(tenant_id, id, template_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspection_answers_item_fk
        FOREIGN KEY (tenant_id, template_id, template_item_id)
        REFERENCES fom.inspection_template_items(tenant_id, template_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspection_answers_work_order_fk
        FOREIGN KEY (tenant_id, work_order_id)
        REFERENCES fom.work_orders(tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT inspection_answers_item_unique
        UNIQUE (inspection_id, template_item_id),
      CONSTRAINT inspection_answers_state_check CHECK (
        item_state IN ('conforme', 'observacion', 'falla')
      ),
      CONSTRAINT inspection_answers_note_check CHECK (
        note IS NULL OR (note = btrim(note) AND note <> '')
      ),
      CONSTRAINT inspection_answers_evidence_check CHECK (
        jsonb_typeof(evidence_urls) = 'array'
        AND jsonb_array_length(evidence_urls) <= 12
        AND NOT evidence_urls @? '$[*] ? (@.type() != "string")'
      ),
      -- Un ítem conforme no lleva nota, evidencia ni ODT.
      CONSTRAINT inspection_answers_conforme_check CHECK (
        item_state <> 'conforme' OR (
          note IS NULL
          AND evidence_urls = '[]'::jsonb
          AND coalesce(requested_work_order, false) = false
          AND work_order_id IS NULL
        )
      ),
      CONSTRAINT inspection_answers_work_order_check CHECK (
        work_order_id IS NULL OR requested_work_order
      ),
      CONSTRAINT inspection_answers_timestamps_check CHECK (
        updated_at >= created_at
      )
    );

    CREATE INDEX inspection_answers_inspection_idx
      ON fom.inspection_answers (tenant_id, inspection_id, template_id);
    CREATE INDEX inspection_answers_item_idx
      ON fom.inspection_answers (tenant_id, template_id, template_item_id);
    CREATE INDEX inspection_answers_work_order_idx
      ON fom.inspection_answers (tenant_id, work_order_id)
      WHERE work_order_id IS NOT NULL;
    CREATE INDEX inspection_answers_critical_failure_idx
      ON fom.inspection_answers (inspection_id)
      WHERE is_critical AND item_state = 'falla';

    -- ═══════════════════════════ TRIGGERS ═══════════════════════════

    CREATE TRIGGER work_orders_maintain_record
      BEFORE INSERT OR UPDATE ON fom.work_orders
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_work_order_record();

    -- Dos triggers y no uno: un WHEN no puede referenciar OLD en un trigger
    -- de INSERT, y sin comparar OLD.status con NEW.status cualquier edición
    -- —corregir la descripción, adjuntar evidencia, registrar el costo—
    -- insertaría un evento con from_status = to_status, que la restricción
    -- work_order_events_change_check rechaza. Es decir: editar una ODT
    -- fallaría siempre.
    --
    -- Tampoco se filtra por pg_trigger_depth(): el día que otro trigger cierre
    -- una ODT automáticamente, esa transición ocurriría a profundidad mayor y
    -- no dejaría rastro EN SILENCIO. Un histórico con huecos es peor que
    -- ninguno, y no hay riesgo de recursión porque esta función escribe en
    -- work_order_events, no en work_orders.
    CREATE TRIGGER work_orders_record_creation
      AFTER INSERT ON fom.work_orders
      FOR EACH ROW
      EXECUTE FUNCTION fom.record_work_order_event();

    CREATE TRIGGER work_orders_record_transition
      AFTER UPDATE OF status ON fom.work_orders
      FOR EACH ROW
      WHEN (OLD.status IS DISTINCT FROM NEW.status)
      EXECUTE FUNCTION fom.record_work_order_event();

    CREATE TRIGGER work_order_events_reject_mutation
      BEFORE UPDATE OR DELETE ON fom.work_order_events
      FOR EACH ROW EXECUTE FUNCTION fom.reject_work_order_event_mutation();

    CREATE TRIGGER inspection_templates_maintain_record
      BEFORE INSERT OR UPDATE ON fom.inspection_templates
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_inspection_template_record();

    CREATE TRIGGER inspection_template_items_guard_mutation
      BEFORE INSERT OR UPDATE OR DELETE ON fom.inspection_template_items
      FOR EACH ROW EXECUTE FUNCTION fom.guard_inspection_template_item_mutation();

    CREATE TRIGGER inspections_maintain_record
      BEFORE INSERT OR UPDATE ON fom.inspections
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_inspection_record();

    CREATE TRIGGER inspection_answers_maintain_record
      BEFORE INSERT OR UPDATE OR DELETE ON fom.inspection_answers
      FOR EACH ROW EXECUTE FUNCTION fom.maintain_inspection_answer_record();

    -- ══════════════════════════ PRIVILEGIOS ══════════════════════════

    REVOKE ALL ON TABLE
      fom.work_orders,
      fom.work_order_events,
      fom.inspection_templates,
      fom.inspection_template_items,
      fom.inspections,
      fom.inspection_answers
      FROM PUBLIC;
    REVOKE ALL ON FUNCTION
      fom.maintain_work_order_record(),
      fom.record_work_order_event(),
      fom.reject_work_order_event_mutation(),
      fom.maintain_inspection_template_record(),
      fom.guard_inspection_template_item_mutation(),
      fom.maintain_inspection_record(),
      fom.maintain_inspection_answer_record()
      FROM PUBLIC;

    GRANT SELECT (
        id, tenant_id, vehicle_id, created_by_user_id, author_via, kind, status,
        description, failure_type, location, evidence_urls, resolution_note,
        resolution_cost, resolution_evidence_urls, resolved_at, alert_rule_id,
        last_status_actor_user_id, last_status_note, status_changed_at,
        created_at, updated_at
      ),
      INSERT (
        tenant_id, vehicle_id, created_by_user_id, author_via, kind, description,
        failure_type, location, evidence_urls, alert_rule_id,
        last_status_actor_user_id, last_status_note
      ),
      UPDATE (
        status, description, failure_type, location, evidence_urls,
        resolution_note, resolution_cost, resolution_evidence_urls,
        last_status_actor_user_id, last_status_note
      )
      ON fom.work_orders TO fom_app;

    -- Solo lectura: el histórico lo escribe el trigger SECURITY DEFINER.
    GRANT SELECT (
        id, tenant_id, work_order_id, sequence_number, from_status, to_status,
        actor_user_id, note, occurred_at, created_at
      )
      ON fom.work_order_events TO fom_app;

    GRANT SELECT (
        id, tenant_id, code, version, name, description, status, published_at,
        archived_at, created_by_user_id, created_at, updated_at
      ),
      INSERT (
        tenant_id, code, version, name, description, created_by_user_id
      ),
      UPDATE (name, description, status)
      ON fom.inspection_templates TO fom_app;

    GRANT SELECT (
        id, tenant_id, template_id, code, category, name, is_critical, help_text,
        vehicle_types, display_order, created_at
      ),
      INSERT (
        tenant_id, template_id, code, category, name, is_critical, help_text,
        vehicle_types, display_order
      ),
      UPDATE (
        code, category, name, is_critical, help_text, vehicle_types, display_order
      ),
      DELETE
      ON fom.inspection_template_items TO fom_app;

    GRANT SELECT (
        id, tenant_id, vehicle_id, driver_user_id, template_id, inspection_date,
        result, location, submitted_at, created_at, updated_at
      ),
      INSERT (
        tenant_id, vehicle_id, driver_user_id, template_id, inspection_date,
        location
      ),
      UPDATE (result, location)
      ON fom.inspections TO fom_app;

    GRANT SELECT (
        id, tenant_id, inspection_id, template_id, template_item_id, item_state,
        is_critical, note, evidence_urls, requested_work_order, work_order_id,
        created_at, updated_at
      ),
      INSERT (
        tenant_id, inspection_id, template_id, template_item_id, item_state,
        note, evidence_urls, requested_work_order, work_order_id
      ),
      UPDATE (
        item_state, note, evidence_urls, requested_work_order, work_order_id
      ),
      DELETE
      ON fom.inspection_answers TO fom_app;

    -- ══════════════════════════ COMENTARIOS ══════════════════════════

    COMMENT ON TABLE fom.work_orders IS
      'Tenant-owned work orders (ODT) raised against a vehicle';
    COMMENT ON COLUMN fom.work_orders.created_by_user_id IS
      'NULL means the work order was raised by the system from an alert rule';
    COMMENT ON COLUMN fom.work_orders.alert_rule_id IS
      'Alert rule that originated a preventive work order; the composite foreign key to fom.alert_rules is added by the compliance migration';
    COMMENT ON COLUMN fom.work_orders.resolved_at IS
      'Trigger-managed: set on close, cleared on reopen; never written by the application';
    COMMENT ON TABLE fom.work_order_events IS
      'Append-only state history of every work order; the publication point for RabbitMQ notification events';
    COMMENT ON COLUMN fom.work_order_events.occurred_at IS
      'Transition instant; consecutive rows measure time spent in each status';
    COMMENT ON TABLE fom.inspection_templates IS
      'Versioned daily inspection checklists; a published version is immutable';
    COMMENT ON COLUMN fom.inspection_templates.version IS
      'Monotonic version per (tenant_id, code); editing a published checklist means publishing a new version';
    COMMENT ON TABLE fom.inspections IS
      'One daily inspection per vehicle, driver and date, bound to a template version';
    COMMENT ON TABLE fom.inspection_answers IS
      'Per-item answers; frozen once the parent inspection is submitted';
    COMMENT ON COLUMN fom.inspection_answers.is_critical IS
      'Trigger-managed copy of the template item criticality at answering time';
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DO $guard$ BEGIN
      IF EXISTS (SELECT 1 FROM fom.inspection_answers LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.inspections LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.inspection_template_items LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.inspection_templates LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.work_order_events LIMIT 1)
        OR EXISTS (SELECT 1 FROM fom.work_orders LIMIT 1)
      THEN
        RAISE EXCEPTION 'cannot roll back the operations domain while data exists';
      END IF;
    END $guard$;

    REVOKE SELECT, INSERT, UPDATE, DELETE
      ON fom.inspection_answers FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.inspections FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE, DELETE
      ON fom.inspection_template_items FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.inspection_templates FROM fom_app;
    REVOKE SELECT ON fom.work_order_events FROM fom_app;
    REVOKE SELECT, INSERT, UPDATE ON fom.work_orders FROM fom_app;

    DROP TRIGGER inspection_answers_maintain_record ON fom.inspection_answers;
    DROP TRIGGER inspections_maintain_record ON fom.inspections;
    DROP TRIGGER inspection_template_items_guard_mutation
      ON fom.inspection_template_items;
    DROP TRIGGER inspection_templates_maintain_record ON fom.inspection_templates;
    DROP TRIGGER work_order_events_reject_mutation ON fom.work_order_events;
    DROP TRIGGER work_orders_record_transition ON fom.work_orders;
    DROP TRIGGER work_orders_record_creation ON fom.work_orders;
    DROP TRIGGER work_orders_maintain_record ON fom.work_orders;

    DROP TABLE fom.inspection_answers;
    DROP TABLE fom.inspections;
    DROP TABLE fom.inspection_template_items;
    DROP TABLE fom.inspection_templates;
    DROP TABLE fom.work_order_events;
    DROP TABLE fom.work_orders;

    -- El dominio al final: mientras una columna lo use, PostgreSQL se niega a
    -- soltarlo, y con razon.
    DROP DOMAIN IF EXISTS fom.work_order_status;

    DROP FUNCTION fom.maintain_inspection_answer_record();
    DROP FUNCTION fom.maintain_inspection_record();
    DROP FUNCTION fom.guard_inspection_template_item_mutation();
    DROP FUNCTION fom.maintain_inspection_template_record();
    DROP FUNCTION fom.reject_work_order_event_mutation();
    DROP FUNCTION fom.record_work_order_event();
    DROP FUNCTION fom.maintain_work_order_record();
  `);
};
