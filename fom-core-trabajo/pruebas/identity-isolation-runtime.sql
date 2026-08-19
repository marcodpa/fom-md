-- ============================================================
-- Aislamiento de datos personales — Issue #168, criterio 2
-- ------------------------------------------------------------
-- `user_profiles` y `user_credentials` no llevan `tenant_id`: la cédula y la
-- licencia son de la persona, no del contratista. Eso deja fuera de juego la
-- protección que usa el resto del esquema, las claves foráneas compuestas
-- `(tenant_id, id)`, porque no hay columna por la que filtrar.
--
-- Un permiso por columna tampoco alcanza: limita qué columnas se leen, no qué
-- filas. Sin nada más, la aplicación podría llevarse la cédula y el teléfono
-- de todas las personas del sistema con un solo SELECT.
--
-- Esto lo comprueba de verdad, ejecutando como `fom_app` contra PostgreSQL.
-- Cada bloque falla ruidosamente si el aislamiento no se cumple.
--
-- Uso (lo ejecuta CI):
--   psql -v ON_ERROR_STOP=1 -f test/identity-isolation-runtime.sql
-- ============================================================

BEGIN;

-- ── Montaje: dos entes que no comparten a nadie ────────────────────────────

INSERT INTO fom.tenants (id, code, name, kind, status, category)
VALUES
  ('aa000000-0000-4000-8000-000000000001', 'aislamiento-uno',
   'Aislamiento Uno', 'organization', 'active', 'contratista'),
  ('aa000000-0000-4000-8000-000000000002', 'aislamiento-dos',
   'Aislamiento Dos', 'organization', 'active', 'contratista');

INSERT INTO fom.users (id, email, display_name)
VALUES
  ('bb000000-0000-4000-8000-000000000001', 'ana@aislamiento-uno.test', 'Ana'),
  ('bb000000-0000-4000-8000-000000000002', 'beto@aislamiento-uno.test', 'Beto'),
  ('bb000000-0000-4000-8000-000000000003', 'caro@aislamiento-dos.test', 'Caro');

-- `activated_at` es obligatorio con status 'active': lo exige
-- tenant_memberships_lifecycle_check desde 20260719233000000.
INSERT INTO fom.tenant_memberships
  (tenant_id, user_id, role, status, activated_at)
VALUES
  ('aa000000-0000-4000-8000-000000000001',
   'bb000000-0000-4000-8000-000000000001', 'supervisor', 'active', now()),
  ('aa000000-0000-4000-8000-000000000001',
   'bb000000-0000-4000-8000-000000000002', 'operator', 'active', now()),
  ('aa000000-0000-4000-8000-000000000002',
   'bb000000-0000-4000-8000-000000000003', 'supervisor', 'active', now());

-- Los perfiles se insertan con la identidad del migrador y RLS desactivada un
-- instante: el objetivo de la prueba es la LECTURA como `fom_app`, y montar el
-- escenario a través de la propia política sería circular.
ALTER TABLE fom.user_profiles NO FORCE ROW LEVEL SECURITY;
ALTER TABLE fom.user_credentials NO FORCE ROW LEVEL SECURITY;

INSERT INTO fom.user_profiles (user_id, national_id, phone)
VALUES
  ('bb000000-0000-4000-8000-000000000001', 'V-10000001', '+58 000 0000001'),
  ('bb000000-0000-4000-8000-000000000002', 'V-10000002', '+58 000 0000002'),
  ('bb000000-0000-4000-8000-000000000003', 'V-10000003', '+58 000 0000003');

-- Una licencia exige numero y categoria: lo impone user_credentials_shape_check.
INSERT INTO fom.user_credentials
  (user_id, kind, number, category, issued_at, expires_at)
VALUES
  ('bb000000-0000-4000-8000-000000000001', 'driver_license', 'LIC-0001',
   '5', current_date - 365, current_date + 365),
  ('bb000000-0000-4000-8000-000000000003', 'driver_license', 'LIC-0003',
   '5', current_date - 365, current_date + 365);

ALTER TABLE fom.user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE fom.user_credentials FORCE ROW LEVEL SECURITY;

SET LOCAL ROLE fom_app;

-- ── 1 · Sin actor no se ve nada ────────────────────────────────────────────
-- Negar por omisión: olvidar fijar el actor tiene que dejar la consulta vacía,
-- nunca abrir la tabla entera. Es el fallo más probable en producción.

DO $prueba$
DECLARE
  visibles integer;
BEGIN
  SELECT count(*) INTO visibles FROM fom.user_profiles;
  IF visibles <> 0 THEN
    RAISE EXCEPTION
      'FALLO 1: sin actor se ven % perfiles; deberian ser 0', visibles;
  END IF;

  SELECT count(*) INTO visibles FROM fom.user_credentials;
  IF visibles <> 0 THEN
    RAISE EXCEPTION
      'FALLO 1: sin actor se ven % credenciales; deberian ser 0', visibles;
  END IF;
END
$prueba$;

-- ── 2 · Con actor se ve el propio ente, y solo ese ─────────────────────────

SET LOCAL fom.actor_user_id = 'bb000000-0000-4000-8000-000000000001';

DO $prueba$
DECLARE
  visibles integer;
  ajeno integer;
BEGIN
  -- Ana comparte ente con Beto: dos perfiles, el suyo y el de él.
  SELECT count(*) INTO visibles FROM fom.user_profiles;
  IF visibles <> 2 THEN
    RAISE EXCEPTION
      'FALLO 2: el actor ve % perfiles; deberian ser 2', visibles;
  END IF;

  -- Caro es de otro ente. Ni enumerable ni legible, ni por su cédula.
  SELECT count(*) INTO ajeno
  FROM fom.user_profiles
  WHERE user_id = 'bb000000-0000-4000-8000-000000000003';
  IF ajeno <> 0 THEN
    RAISE EXCEPTION 'FALLO 2: se lee el perfil de otro ente';
  END IF;

  SELECT count(*) INTO ajeno
  FROM fom.user_profiles WHERE national_id = 'V-10000003';
  IF ajeno <> 0 THEN
    RAISE EXCEPTION
      'FALLO 2: la cedula de otro ente se puede confirmar por busqueda';
  END IF;

  SELECT count(*) INTO ajeno
  FROM fom.user_credentials
  WHERE user_id = 'bb000000-0000-4000-8000-000000000003';
  IF ajeno <> 0 THEN
    RAISE EXCEPTION 'FALLO 2: se lee la credencial de otro ente';
  END IF;
END
$prueba$;

-- ── 3 · Tampoco se puede ESCRIBIR sobre una persona ajena ──────────────────
-- `USING` sin `WITH CHECK` dejaría escribir lo que no se puede leer, que es la
-- mitad del agujero y la más difícil de notar.

DO $prueba$
BEGIN
  BEGIN
    INSERT INTO fom.user_credentials
      (user_id, kind, number, category, issued_at, expires_at)
    VALUES ('bb000000-0000-4000-8000-000000000003', 'driver_license',
            'LIC-FALSA', '5', current_date, current_date + 365);
    RAISE EXCEPTION 'FALLO 3: se pudo crear una credencial a una persona ajena';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;  -- lo esperado
  END;

  BEGIN
    UPDATE fom.user_profiles
      SET phone = '+58 999 9999999'
      WHERE user_id = 'bb000000-0000-4000-8000-000000000003';
    -- Un UPDATE que no ve la fila afecta a cero filas sin error; eso también
    -- es correcto, siempre que el dato no cambie.
    IF EXISTS (
      SELECT 1 FROM fom.user_profiles
      WHERE user_id = 'bb000000-0000-4000-8000-000000000003'
        AND phone = '+58 999 9999999'
    ) THEN
      RAISE EXCEPTION 'FALLO 3: se modifico el perfil de una persona ajena';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END
$prueba$;

-- ── 4 · Una membresía revocada apaga el acceso ─────────────────────────────
-- El alcance se calcula en cada consulta, no se hereda del momento del alta.

RESET ROLE;
UPDATE fom.tenant_memberships
  SET status = 'revoked', revoked_at = now()
  WHERE user_id = 'bb000000-0000-4000-8000-000000000002';
SET LOCAL ROLE fom_app;
SET LOCAL fom.actor_user_id = 'bb000000-0000-4000-8000-000000000001';

DO $prueba$
DECLARE
  visibles integer;
BEGIN
  -- Ana ya solo se ve a sí misma.
  SELECT count(*) INTO visibles FROM fom.user_profiles;
  IF visibles <> 1 THEN
    RAISE EXCEPTION
      'FALLO 4: tras revocar la membresia se ven % perfiles; deberia ser 1',
      visibles;
  END IF;
END
$prueba$;

-- ── 5 · Un actor inexistente no ve nada ────────────────────────────────────

SET LOCAL fom.actor_user_id = 'cc000000-0000-4000-8000-00000000ffff';

DO $prueba$
DECLARE
  visibles integer;
BEGIN
  SELECT count(*) INTO visibles FROM fom.user_profiles;
  IF visibles <> 0 THEN
    RAISE EXCEPTION
      'FALLO 5: un actor inexistente ve % perfiles', visibles;
  END IF;
END
$prueba$;

-- ── 6 · La traducción de roles preserva operator ───────────────────────────
-- Criterio 1 del Issue: el operador telemático no es el conductor.

RESET ROLE;

DO $prueba$
DECLARE
  traducido varchar;
BEGIN
  SELECT fom.canonical_membership_role('operator') INTO traducido;
  IF traducido <> 'operator' THEN
    RAISE EXCEPTION
      'FALLO 6: operator se tradujo a %; debe preservarse', traducido;
  END IF;

  SELECT fom.canonical_membership_role('owner') INTO traducido;
  IF traducido <> 'supervisor' THEN
    RAISE EXCEPTION
      'FALLO 6: owner se tradujo a %; el titular de un ente no es admin_fom',
      traducido;
  END IF;
END
$prueba$;

ROLLBACK;

\echo 'IDENTITY_ISOLATION_OK'
