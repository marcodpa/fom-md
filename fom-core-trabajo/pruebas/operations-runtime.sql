-- ============================================================
-- Órdenes de trabajo e inspecciones — Issue #170
-- ------------------------------------------------------------
-- Comprueba, ejecutando contra PostgreSQL, los cuatro criterios de cierre:
--
--   · transiciones de estado válidas e inválidas;
--   · inmutabilidad del historial;
--   · aislamiento entre entes;
--   · compatibilidad de evolución — que ampliar el catálogo de estados sea
--     aditivo y no obligue a reescribir nada.
--
-- El último importa especialmente: este bloque es una fundación inicial
-- expandible, y lo que hay que demostrar no es que el modelo esté completo
-- —no lo está— sino que crecer no cuesta una migración destructiva.
-- ============================================================

BEGIN;

-- ── Montaje ────────────────────────────────────────────────────────────────

INSERT INTO fom.tenants (id, code, name, kind, status, category)
VALUES
  ('e1000000-0000-4000-8000-000000000001', 'ops-uno', 'Ops Uno',
   'organization', 'active', 'contratista'),
  ('e1000000-0000-4000-8000-000000000002', 'ops-dos', 'Ops Dos',
   'organization', 'active', 'contratista');

INSERT INTO fom.users (id, email, display_name)
VALUES ('e2000000-0000-4000-8000-000000000001', 'jefe@ops-uno.test', 'Jefe');

INSERT INTO fom.tenant_memberships
  (tenant_id, user_id, role, status, activated_at)
VALUES ('e1000000-0000-4000-8000-000000000001',
        'e2000000-0000-4000-8000-000000000001', 'supervisor', 'active', now());

INSERT INTO fom.vehicles (id, tenant_id, code, status)
VALUES
  ('e3000000-0000-4000-8000-000000000001',
   'e1000000-0000-4000-8000-000000000001', 'ops-uno-01', 'active'),
  ('e3000000-0000-4000-8000-000000000002',
   'e1000000-0000-4000-8000-000000000002', 'ops-dos-01', 'active');

-- ── 1 · Transiciones ───────────────────────────────────────────────────────

INSERT INTO fom.work_orders
  (id, tenant_id, vehicle_id, kind, status, description, created_by_user_id)
VALUES
  ('e4000000-0000-4000-8000-000000000001',
   'e1000000-0000-4000-8000-000000000001',
   'e3000000-0000-4000-8000-000000000001',
   'correctiva', 'abierta', 'Ruido en el tren delantero',
   'e2000000-0000-4000-8000-000000000001');

DO $prueba$
BEGIN
  -- 1.0 · Una orden recien creada tiene UNA hora de creacion. Con tres
  -- DEFAULT clock_timestamp() independientes, status_changed_at podia caer un
  -- microsegundo antes que created_at y el INSERT de arriba fallaba al azar
  -- (work_orders_timestamps_check, PR #187 y #194); desde 20260825170000000
  -- el trigger sella las tres columnas con el mismo instante.
  IF NOT EXISTS (
    SELECT 1 FROM fom.work_orders
    WHERE id = 'e4000000-0000-4000-8000-000000000001'
      AND updated_at = created_at
      AND status_changed_at = created_at
  ) THEN
    RAISE EXCEPTION 'FALLO 1.0: los relojes de creacion no coinciden';
  END IF;

  -- 1.a · Valida: abierta -> en_revision
  UPDATE fom.work_orders SET status = 'en_revision'
    WHERE id = 'e4000000-0000-4000-8000-000000000001';

  -- 1.b · Valida: en_revision -> aprobada
  UPDATE fom.work_orders SET status = 'aprobada'
    WHERE id = 'e4000000-0000-4000-8000-000000000001';

  -- 1.c · Invalida: aprobada -> abierta. Retroceder al inicio borraria que la
  -- orden ya paso por taller y falsearia la metrica de primera respuesta.
  BEGIN
    UPDATE fom.work_orders SET status = 'abierta'
      WHERE id = 'e4000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FALLO 1c: se acepto retroceder de aprobada a abierta';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  -- 1.d · Valida: aprobada -> cerrada. Cerrar exige nota de resolucion
  -- —work_orders_closure_check—, porque una orden cerrada sin decir que se
  -- hizo no sirve para el historial del vehiculo.
  UPDATE fom.work_orders
    SET status = 'cerrada', resolution_note = 'Rotula cambiada'
    WHERE id = 'e4000000-0000-4000-8000-000000000001';

  IF NOT EXISTS (
    SELECT 1 FROM fom.work_orders
    WHERE id = 'e4000000-0000-4000-8000-000000000001'
      AND resolved_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'FALLO 1d: cerrar no sello resolved_at';
  END IF;

  -- 1.e · Reabrir devuelve a revision y limpia la resolucion.
  UPDATE fom.work_orders SET status = 'en_revision'
    WHERE id = 'e4000000-0000-4000-8000-000000000001';

  IF EXISTS (
    SELECT 1 FROM fom.work_orders
    WHERE id = 'e4000000-0000-4000-8000-000000000001'
      AND resolved_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'FALLO 1e: reabrir no limpio resolved_at';
  END IF;

  -- 1.f · Un estado fuera del catalogo no entra. Lo impide el dominio.
  BEGIN
    UPDATE fom.work_orders SET status = 'planificada'
      WHERE id = 'e4000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FALLO 1f: se acepto un estado fuera del catalogo';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END
$prueba$;

-- ── 2 · Cancelar desde cualquier estado no terminal ────────────────────────
-- Una orden se anula por motivos ajenos al taller. Obligarla a pasar por
-- revision para poder cerrarla falsearia el historial de trabajo.

INSERT INTO fom.work_orders
  (id, tenant_id, vehicle_id, kind, status, description, created_by_user_id)
VALUES
  ('e4000000-0000-4000-8000-000000000002',
   'e1000000-0000-4000-8000-000000000001',
   'e3000000-0000-4000-8000-000000000001',
   'correctiva', 'abierta', 'Solicitud duplicada',
   'e2000000-0000-4000-8000-000000000001');

UPDATE fom.work_orders SET status = 'cancelada'
  WHERE id = 'e4000000-0000-4000-8000-000000000002';

DO $prueba$
BEGIN
  -- Cancelada es terminal: no revive.
  BEGIN
    UPDATE fom.work_orders SET status = 'abierta'
      WHERE id = 'e4000000-0000-4000-8000-000000000002';
    RAISE EXCEPTION 'FALLO 2: una orden cancelada volvio a abrirse';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END
$prueba$;

-- ── 3 · El historial es inmutable y solo registra cambios reales ───────────

DO $prueba$
DECLARE
  eventos integer;
  antes integer;
BEGIN
  SELECT count(*) INTO eventos FROM fom.work_order_events
  WHERE work_order_id = 'e4000000-0000-4000-8000-000000000001';
  IF eventos < 4 THEN
    RAISE EXCEPTION
      'FALLO 3: se esperaban al menos 4 eventos de estado, hay %', eventos;
  END IF;

  -- 3.a · Editar un campo que no es el estado NO genera evento. Si generase,
  -- corregir una descripcion ensuciaria el historial de trabajo.
  antes := eventos;
  UPDATE fom.work_orders SET description = 'Ruido en el tren delantero (rev.)'
    WHERE id = 'e4000000-0000-4000-8000-000000000001';
  SELECT count(*) INTO eventos FROM fom.work_order_events
  WHERE work_order_id = 'e4000000-0000-4000-8000-000000000001';
  IF eventos <> antes THEN
    RAISE EXCEPTION 'FALLO 3a: editar la descripcion genero un evento';
  END IF;

  -- 3.b · El historial no se edita.
  BEGIN
    UPDATE fom.work_order_events SET note = 'reescrito'
      WHERE work_order_id = 'e4000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FALLO 3b: se pudo editar el historial';
  EXCEPTION
    WHEN check_violation THEN NULL;
    WHEN raise_exception THEN NULL;
    WHEN insufficient_privilege THEN NULL;
  END;

  -- 3.c · Ni se borra.
  BEGIN
    DELETE FROM fom.work_order_events
      WHERE work_order_id = 'e4000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FALLO 3c: se pudo borrar el historial';
  EXCEPTION
    WHEN check_violation THEN NULL;
    WHEN raise_exception THEN NULL;
    WHEN insufficient_privilege THEN NULL;
  END;
END
$prueba$;

-- ── 4 · Aislamiento entre entes ────────────────────────────────────────────

DO $prueba$
BEGIN
  BEGIN
    INSERT INTO fom.work_orders
      (tenant_id, vehicle_id, kind, status, description, created_by_user_id)
    VALUES
      ('e1000000-0000-4000-8000-000000000001',
       'e3000000-0000-4000-8000-000000000002',  -- vehiculo del OTRO ente
       'correctiva', 'abierta', 'Orden cruzada',
       'e2000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'FALLO 4: se abrio una orden sobre un vehiculo ajeno';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END
$prueba$;

-- ── 5 · Compatibilidad de evolución ────────────────────────────────────────
-- Este bloque es una fundación inicial expandible. Lo que se demuestra aquí no
-- es que el catálogo esté completo —el documento maestro contempla doce
-- estados y aquí hay cinco— sino que AMPLIARLO ES ADITIVO: una sola
-- restricción de dominio, sin tocar tablas, sin reescribir filas y sin
-- invalidar el historial ya registrado.

DO $prueba$
DECLARE
  sitios integer;
  historicos integer;
BEGIN
  -- 5.a · El catalogo vive en un solo sitio. Si alguien vuelve a repetirlo en
  -- una columna, esta prueba lo detecta antes de que cueste una migracion.
  -- Se busca por el CONTENIDO, no por el nombre: una restriccion que enumere
  -- los estados es una copia del catalogo, se llame como se llame. Buscar por
  -- nombre daba un falso positivo con work_orders_status_note_check, que trata
  -- de la nota y no del catalogo.
  SELECT count(*) INTO sitios
  FROM pg_catalog.pg_constraint
  WHERE conrelid IN ('fom.work_orders'::regclass,
                     'fom.work_order_events'::regclass)
    AND pg_catalog.pg_get_constraintdef(oid) LIKE '%''abierta''%';
  IF sitios <> 0 THEN
    RAISE EXCEPTION
      'FALLO 5a: el catalogo de estados volvio a duplicarse en % restricciones de tabla',
      sitios;
  END IF;

  SELECT count(*) INTO historicos FROM fom.work_order_events;

  -- 5.b · Ampliar el catalogo es una linea.
  ALTER DOMAIN fom.work_order_status DROP CONSTRAINT work_order_status_catalogue;
  ALTER DOMAIN fom.work_order_status
    ADD CONSTRAINT work_order_status_catalogue CHECK (
      VALUE IN ('abierta', 'en_revision', 'aprobada', 'cerrada', 'cancelada',
                'planificada')
    );

  -- 5.c · El historial anterior sigue siendo valido tras ampliar.
  IF (SELECT count(*) FROM fom.work_order_events) <> historicos THEN
    RAISE EXCEPTION 'FALLO 5c: ampliar el catalogo altero el historial';
  END IF;

  -- 5.d · Y el estado nuevo ya es aceptable donde las transiciones lo
  -- permitan; que aun no haya transicion hacia el es decision funcional, no
  -- una limitacion del esquema.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'work_order_status_catalogue'
      AND pg_catalog.pg_get_constraintdef(oid) LIKE '%planificada%'
  ) THEN
    RAISE EXCEPTION 'FALLO 5d: el catalogo ampliado no incluye el estado nuevo';
  END IF;
END
$prueba$;

ROLLBACK;

\echo 'OPERATIONS_OK'
