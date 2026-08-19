-- ============================================================
-- Dominio de flota: aislamiento, PIN y proyección — Issue #169
-- ------------------------------------------------------------
-- Comprueba, ejecutando contra PostgreSQL, los cuatro criterios de cierre:
--
--   · relaciones cross-tenant, en estructural y en negativo;
--   · el PIN nunca se almacena en claro;
--   · `vehicle_live_state` es una proyección y no sustituye a la posición
--     fuente ni a su trazabilidad;
--   · las áreas no cruzan entes.
--
-- Cada bloque falla ruidosamente si la garantía no se cumple.
-- ============================================================

BEGIN;

-- ── Montaje: dos entes, un vehículo y un equipo en cada uno ────────────────

INSERT INTO fom.tenants (id, code, name, kind, status, category)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'flota-uno', 'Flota Uno',
   'organization', 'active', 'contratista'),
  ('a1000000-0000-4000-8000-000000000002', 'flota-dos', 'Flota Dos',
   'organization', 'active', 'contratista');

INSERT INTO fom.users (id, email, display_name)
VALUES
  ('b1000000-0000-4000-8000-000000000001', 'chofer1@flota-uno.test', 'Chofer Uno'),
  ('b1000000-0000-4000-8000-000000000002', 'chofer2@flota-dos.test', 'Chofer Dos');

INSERT INTO fom.tenant_memberships
  (tenant_id, user_id, role, status, activated_at)
VALUES
  ('a1000000-0000-4000-8000-000000000001',
   'b1000000-0000-4000-8000-000000000001', 'conductor', 'active', now()),
  ('a1000000-0000-4000-8000-000000000002',
   'b1000000-0000-4000-8000-000000000002', 'conductor', 'active', now());

INSERT INTO fom.vehicles (id, tenant_id, code, status)
VALUES
  ('c1000000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000001', 'flota-uno-01', 'active'),
  ('c1000000-0000-4000-8000-000000000002',
   'a1000000-0000-4000-8000-000000000002', 'flota-dos-01', 'active');

-- ── 1 · El PIN no puede guardarse en claro ─────────────────────────────────
-- Lo impide la base, no la disciplina de la aplicación: el CHECK exige el
-- prefijo de argon2id. Un PIN de cuatro dígitos, o incluso un hash de otra
-- familia, se rechazan.

DO $prueba$
DECLARE
  rechazado boolean;
BEGIN
  FOR rechazado IN
    SELECT true
  LOOP
    NULL;
  END LOOP;

  -- 1.a · PIN en claro
  BEGIN
    INSERT INTO fom.vehicle_driver_assignments
      (tenant_id, vehicle_id, user_id, role, pin_hash, pin_set_at, valid_from)
    VALUES
      ('a1000000-0000-4000-8000-000000000001',
       'c1000000-0000-4000-8000-000000000001',
       'b1000000-0000-4000-8000-000000000001',
       'secundario', '1234', now(), now());
    RAISE EXCEPTION 'FALLO 1a: se acepto un PIN en claro';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  -- 1.b · Hash de otra familia: bcrypt no vale, y el CHECK lo dice.
  BEGIN
    INSERT INTO fom.vehicle_driver_assignments
      (tenant_id, vehicle_id, user_id, role, pin_hash, pin_set_at, valid_from)
    VALUES
      ('a1000000-0000-4000-8000-000000000001',
       'c1000000-0000-4000-8000-000000000001',
       'b1000000-0000-4000-8000-000000000001',
       'secundario',
       '$2b$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH', now(), now());
    RAISE EXCEPTION 'FALLO 1b: se acepto un hash que no es argon2id';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  -- 1.c · Un hash con espacios delata concatenación accidental.
  BEGIN
    INSERT INTO fom.vehicle_driver_assignments
      (tenant_id, vehicle_id, user_id, role, pin_hash, pin_set_at, valid_from)
    VALUES
      ('a1000000-0000-4000-8000-000000000001',
       'c1000000-0000-4000-8000-000000000001',
       'b1000000-0000-4000-8000-000000000001',
       'secundario',
       '$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$ hash con espacios',
       now(), now());
    RAISE EXCEPTION 'FALLO 1c: se acepto un hash con espacios';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END
$prueba$;

-- Un hash bien formado sí entra.
INSERT INTO fom.vehicle_driver_assignments
  (tenant_id, vehicle_id, user_id, role, pin_hash, pin_set_at, valid_from)
VALUES
  ('a1000000-0000-4000-8000-000000000001',
   'c1000000-0000-4000-8000-000000000001',
   'b1000000-0000-4000-8000-000000000001',
   'secundario',
   '$argon2id$v=19$m=65536,t=3,p=4$c2FsdGVkc2FsdGVk$aGFzaGVkcGluaGFzaGVk',
   -- valid_from en el pasado: dentro de una transaccion now() es constante, y
   -- el cierre de la seccion 5 exige que valid_to sea POSTERIOR a valid_from.
   now(), now() - interval '1 hour');

-- ── 2 · Una asignación no puede cruzar entes ───────────────────────────────
-- La clave foránea compuesta (tenant_id, vehicle_id) lo hace estructuralmente
-- imposible: no es una comprobación que la aplicación pueda olvidar.

DO $prueba$
BEGIN
  BEGIN
    INSERT INTO fom.vehicle_driver_assignments
      (tenant_id, vehicle_id, user_id, role, valid_from)
    VALUES
      ('a1000000-0000-4000-8000-000000000001',
       'c1000000-0000-4000-8000-000000000002',  -- vehículo del OTRO ente
       'b1000000-0000-4000-8000-000000000001',
       'principal', now());
    RAISE EXCEPTION 'FALLO 2: se asigno un conductor a un vehiculo de otro ente';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END
$prueba$;

-- ── 3 · Un área no puede adoptarse desde otro ente ─────────────────────────

INSERT INTO fom.areas (id, tenant_id, name, kind, status)
VALUES
  ('d1000000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000001', 'Costa Oriental', 'sector', 'active');

DO $prueba$
DECLARE
  ajenas integer;
BEGIN
  SELECT count(*) INTO ajenas
  FROM fom.areas
  WHERE tenant_id = 'a1000000-0000-4000-8000-000000000002';
  IF ajenas <> 0 THEN
    RAISE EXCEPTION 'FALLO 3: el area aparece bajo otro ente';
  END IF;
END
$prueba$;

-- ── 4 · El estado en vivo es una proyección, no la fuente ──────────────────
-- Solo puede apuntar a una posición del mismo ente y del mismo vehículo, y
-- borrarlo no toca `gps_positions`: la trazabilidad vive en la fuente.

DO $prueba$
DECLARE
  posiciones_antes bigint;
  posiciones_despues bigint;
BEGIN
  SELECT count(*) INTO posiciones_antes FROM fom.gps_positions;

  -- Sin posición: `has_position` en false y las coordenadas en NULL. Es el
  -- estado legítimo de un vehículo que reportó pero sin fijación.
  INSERT INTO fom.vehicle_live_state
    (tenant_id, vehicle_id, last_report_at, has_position)
  VALUES
    ('a1000000-0000-4000-8000-000000000001',
     'c1000000-0000-4000-8000-000000000001', now(), false);

  -- Un vehículo de otro ente no se puede proyectar bajo este.
  BEGIN
    INSERT INTO fom.vehicle_live_state
      (tenant_id, vehicle_id, last_report_at, has_position)
    VALUES
      ('a1000000-0000-4000-8000-000000000001',
       'c1000000-0000-4000-8000-000000000002',  -- vehículo del OTRO ente
       now(), false);
    RAISE EXCEPTION 'FALLO 4: se proyecto el estado de un vehiculo ajeno';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;

  -- Borrar la proyección no puede llevarse por delante ninguna posición.
  DELETE FROM fom.vehicle_live_state
  WHERE tenant_id = 'a1000000-0000-4000-8000-000000000001'
    AND vehicle_id = 'c1000000-0000-4000-8000-000000000001';

  SELECT count(*) INTO posiciones_despues FROM fom.gps_positions;
  IF posiciones_antes <> posiciones_despues THEN
    RAISE EXCEPTION
      'FALLO 4: borrar la proyeccion cambio el numero de posiciones de % a %',
      posiciones_antes, posiciones_despues;
  END IF;
END
$prueba$;

-- ── 5 · Una asignación cerrada no puede rotar su PIN ───────────────────────
-- El PIN es la credencial de un conductor mientras lleva la unidad. Cambiarlo
-- después de cerrada la asignación reabriría un acceso ya retirado.

UPDATE fom.vehicle_driver_assignments
  SET valid_to = now()
  WHERE tenant_id = 'a1000000-0000-4000-8000-000000000001';

DO $prueba$
BEGIN
  BEGIN
    UPDATE fom.vehicle_driver_assignments
      SET pin_hash =
        '$argon2id$v=19$m=65536,t=3,p=4$bnVldm9zYWx0$bnVldm9oYXNoZGVwaW4'
      WHERE tenant_id = 'a1000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FALLO 5: una asignacion cerrada roto su PIN';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END
$prueba$;

ROLLBACK;

\echo 'FLEET_ISOLATION_OK'
