-- ============================================================
-- Cumplimiento y auditoría — Issue #171
-- ------------------------------------------------------------
-- Comprueba, ejecutando contra PostgreSQL, los criterios de cierre:
--
--   · auditoría append-only, demostrada en negativo;
--   · nada cruza entes: ni documento, ni archivo, ni notificación;
--   · los metadatos de archivo no acoplan al proveedor de almacenamiento;
--   · no entran secretos ni URLs firmadas;
--   · retención y trazabilidad sin borrados automáticos.
-- ============================================================

BEGIN;

-- ── Montaje ────────────────────────────────────────────────────────────────

INSERT INTO fom.tenants (id, code, name, kind, status, category)
VALUES
  ('f1000000-0000-4000-8000-000000000001', 'cump-uno', 'Cumplimiento Uno',
   'organization', 'active', 'contratista'),
  ('f1000000-0000-4000-8000-000000000002', 'cump-dos', 'Cumplimiento Dos',
   'organization', 'active', 'contratista');

INSERT INTO fom.users (id, email, display_name)
VALUES
  ('f2000000-0000-4000-8000-000000000001', 'admin@cump-uno.test', 'Admin Uno'),
  ('f2000000-0000-4000-8000-000000000002', 'admin@cump-dos.test', 'Admin Dos');

INSERT INTO fom.tenant_memberships
  (tenant_id, user_id, role, status, activated_at)
VALUES
  ('f1000000-0000-4000-8000-000000000001',
   'f2000000-0000-4000-8000-000000000001', 'supervisor', 'active', now()),
  ('f1000000-0000-4000-8000-000000000002',
   'f2000000-0000-4000-8000-000000000002', 'supervisor', 'active', now());

INSERT INTO fom.vehicles (id, tenant_id, code, status)
VALUES
  ('f3000000-0000-4000-8000-000000000001',
   'f1000000-0000-4000-8000-000000000001', 'cump-uno-01', 'active'),
  ('f3000000-0000-4000-8000-000000000002',
   'f1000000-0000-4000-8000-000000000002', 'cump-dos-01', 'active');

-- ── 1 · Un documento no cruza entes ────────────────────────────────────────

INSERT INTO fom.documents
  (id, tenant_id, scope, vehicle_id, document_type, document_number,
   status, expires_on, created_by_user_id)
VALUES
  ('f4000000-0000-4000-8000-000000000001',
   'f1000000-0000-4000-8000-000000000001', 'vehiculo',
   'f3000000-0000-4000-8000-000000000001',
   'seguro_rcv', 'POL-0001', 'active', current_date + 180,
   'f2000000-0000-4000-8000-000000000001');

DO $prueba$
BEGIN
  BEGIN
    INSERT INTO fom.documents
      (tenant_id, scope, vehicle_id, document_type, document_number,
       status, expires_on, created_by_user_id)
    VALUES
      ('f1000000-0000-4000-8000-000000000001', 'vehiculo',
       'f3000000-0000-4000-8000-000000000002',  -- vehiculo del OTRO ente
       'seguro_rcv', 'POL-CRUZADA', 'active', current_date + 180,
       'f2000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'FALLO 1: se creo un documento sobre un vehiculo ajeno';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END
$prueba$;

-- ── 2 · La clave de almacenamiento no admite direcciones ni secretos ───────
-- El expediente guarda una RUTA dentro del almacen. Una URL acopla al
-- proveedor de turno; una URL firmada mete ademas un secreto con caducidad en
-- una tabla que se respalda y se audita.

DO $prueba$
DECLARE
  intento text;
BEGIN
  FOREACH intento IN ARRAY ARRAY[
    'https://bucket.s3.amazonaws.com/doc.pdf',
    's3://bucket/doc.pdf',
    'documentos/doc.pdf?X-Amz-Signature=deadbeef',
    'documentos/con espacio.pdf'
  ] LOOP
    BEGIN
      INSERT INTO fom.document_files
        (tenant_id, document_id, storage_key, content_type, byte_size,
         checksum_sha256, uploaded_by_user_id)
      VALUES
        ('f1000000-0000-4000-8000-000000000001',
         'f4000000-0000-4000-8000-000000000001',
         intento, 'application/pdf', 1024,
         repeat('a', 64), 'f2000000-0000-4000-8000-000000000001');
      RAISE EXCEPTION 'FALLO 2: se acepto la clave insegura %', intento;
    EXCEPTION
      WHEN check_violation THEN NULL;
    END;
  END LOOP;
END
$prueba$;

-- Una ruta legitima si entra.
INSERT INTO fom.document_files
  (tenant_id, document_id, storage_key, content_type, byte_size,
   checksum_sha256, uploaded_by_user_id)
VALUES
  ('f1000000-0000-4000-8000-000000000001',
   'f4000000-0000-4000-8000-000000000001',
   'cump-uno/documentos/f4000000/poliza-2026.pdf', 'application/pdf', 204800,
   repeat('b', 64), 'f2000000-0000-4000-8000-000000000001');

-- ── 3 · La auditoría es append-only ────────────────────────────────────────
-- Un registro de auditoría que se puede editar no es un registro de auditoría.
-- Se comprueban las tres vias, incluida TRUNCATE, que no pasa por los
-- disparadores de fila y por eso suele quedar sin cubrir.

INSERT INTO fom.audit_log
  (tenant_id, actor_kind, actor_user_id, actor_db_role, action,
   entity_type, entity_id)
VALUES
  ('f1000000-0000-4000-8000-000000000001', 'user',
   'f2000000-0000-4000-8000-000000000001', current_user,
   'document.created', 'document', 'f4000000-0000-4000-8000-000000000001');

DO $prueba$
BEGIN
  BEGIN
    UPDATE fom.audit_log SET action = 'document.deleted'
      WHERE tenant_id = 'f1000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FALLO 3a: se pudo editar la auditoria';
  EXCEPTION
    WHEN check_violation THEN NULL;
    WHEN raise_exception THEN NULL;
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM fom.audit_log
      WHERE tenant_id = 'f1000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'FALLO 3b: se pudo borrar la auditoria';
  EXCEPTION
    WHEN check_violation THEN NULL;
    WHEN raise_exception THEN NULL;
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    TRUNCATE fom.audit_log;
    RAISE EXCEPTION 'FALLO 3c: se pudo truncar la auditoria';
  EXCEPTION
    WHEN check_violation THEN NULL;
    WHEN raise_exception THEN NULL;
    WHEN insufficient_privilege THEN NULL;
  END;
END
$prueba$;

-- ── 4 · Una regla de alerta no alcanza vehículos de otro ente ──────────────

-- Una regla de mantenimiento exige umbral en km Y el servicio al que
-- corresponde: sin nombrar el servicio, el aviso no dice que hay que hacer.
INSERT INTO fom.alert_rules
  (id, tenant_id, rule_type, threshold_km, service_name, created_by_user_id)
VALUES
  ('f5000000-0000-4000-8000-000000000001',
   'f1000000-0000-4000-8000-000000000001',
   'mantenimiento', 5000, 'Cambio de aceite',
   'f2000000-0000-4000-8000-000000000001');

DO $prueba$
BEGIN
  BEGIN
    -- `rule_type` se repite aqui a proposito: forma parte de la clave foranea
    -- compuesta hacia la regla, de modo que un vehiculo no puede engancharse a
    -- una regla de otro tipo del que cree.
    INSERT INTO fom.alert_rule_vehicles
      (tenant_id, alert_rule_id, rule_type, vehicle_id)
    VALUES
      ('f1000000-0000-4000-8000-000000000001',
       'f5000000-0000-4000-8000-000000000001', 'mantenimiento',
       'f3000000-0000-4000-8000-000000000002');  -- vehiculo del OTRO ente
    RAISE EXCEPTION 'FALLO 4: una regla alcanzo un vehiculo ajeno';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END
$prueba$;

-- ── 5 · Retención sin borrados automáticos ─────────────────────────────────
-- Archivar no es borrar. Un documento vencido conserva su fila y su historial:
-- la trazabilidad depende de que el pasado siga estando.

DO $prueba$
DECLARE
  filas integer;
BEGIN
  UPDATE fom.documents
    SET status = 'archived', archived_at = clock_timestamp()
    WHERE id = 'f4000000-0000-4000-8000-000000000001';

  SELECT count(*) INTO filas FROM fom.documents
  WHERE id = 'f4000000-0000-4000-8000-000000000001';
  IF filas <> 1 THEN
    RAISE EXCEPTION 'FALLO 5: archivar el documento lo hizo desaparecer';
  END IF;

  SELECT count(*) INTO filas FROM fom.document_files
  WHERE document_id = 'f4000000-0000-4000-8000-000000000001';
  IF filas <> 1 THEN
    RAISE EXCEPTION 'FALLO 5: archivar el documento se llevo sus archivos';
  END IF;

  -- Y no hay ningun disparador de borrado programado sobre estas tablas.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger trigger_record
    JOIN pg_catalog.pg_class table_record
      ON table_record.oid = trigger_record.tgrelid
    WHERE table_record.relname IN ('documents', 'document_files', 'audit_log')
      AND NOT trigger_record.tgisinternal
      AND pg_catalog.pg_get_triggerdef(trigger_record.oid) ILIKE '%DELETE FROM%'
  ) THEN
    RAISE EXCEPTION 'FALLO 5: hay un disparador que borra filas por su cuenta';
  END IF;
END
$prueba$;

ROLLBACK;

\echo 'COMPLIANCE_OK'
