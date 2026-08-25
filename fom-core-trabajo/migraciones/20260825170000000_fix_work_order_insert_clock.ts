import type { MigrationBuilder } from 'node-pg-migrate/dist/bundle/index';

/**
 * Sella los tres relojes de una ODT recién creada en un solo instante.
 *
 * fom.work_orders declara status_changed_at, created_at y updated_at con
 * DEFAULT clock_timestamp() cada una: tres lecturas distintas del reloj
 * dentro del mismo INSERT. La restricción work_orders_timestamps_check exige
 * status_changed_at >= created_at, pero los DEFAULT se evalúan en el orden de
 * declaración de las columnas y status_changed_at está declarada antes que
 * created_at, así que puede quedar un microsegundo por debajo y el INSERT
 * falla sin que el dato tenga nada de malo. Es intermitente por construcción:
 * tumbó el CI de los PR #187 y #194 en test/operations-runtime.sql y seguirá
 * haciéndolo mientras lo decida el azar del reloj.
 *
 * El arreglo vive en el trigger BEFORE INSERT que ya custodia la tabla, no en
 * los DEFAULT: una orden recién creada tiene UNA hora de creación y las tres
 * columnas deben decir exactamente esa. En INSERT el trigger copia created_at
 * sobre updated_at y status_changed_at; el comportamiento en UPDATE no cambia
 * en nada. Se reemplaza la función entera porque plpgsql no permite parchar
 * solo el final; el resto del cuerpo es copia literal de 20260818110000000.
 *
 * CREATE OR REPLACE conserva los privilegios que fijó 20260818110000000
 * (REVOKE ALL ... FROM PUBLIC), de modo que aquí no hay REVOKE que repetir.
 * down() restaura el cuerpo original literal, con su carrera incluida: eso es
 * lo que había, y la cadena de reversión del CI comprueba estados, no gustos.
 */

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION fom.maintain_work_order_record()
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

      -- Una sola hora de creación. Los tres DEFAULT clock_timestamp() son
      -- lecturas independientes y status_changed_at, declarada antes que
      -- created_at, podía quedar un microsegundo por debajo y disparar
      -- work_orders_timestamps_check al azar.
      IF TG_OP = 'INSERT' THEN
        NEW.updated_at = NEW.created_at;
        NEW.status_changed_at = NEW.created_at;
      ELSE
        NEW.updated_at = clock_timestamp();
      END IF;
      RETURN NEW;
    END
    $function$;
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION fom.maintain_work_order_record()
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
  `);
};
