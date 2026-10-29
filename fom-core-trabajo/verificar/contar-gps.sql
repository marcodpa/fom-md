-- ============================================================
-- Cuántos GPS hay en el servidor, de qué empresa es cada uno, y qué
-- IMEI ha oído el receptor en los últimos 3 días (estén o no registrados).
-- SOLO LECTURA: la transacción es READ ONLY y termina en ROLLBACK.
--
-- Uso (en el servidor de la base):
--   sudo -u postgres psql -d fom_core -v ON_ERROR_STOP=1 -f contar-gps.sql
-- ============================================================

BEGIN TRANSACTION READ ONLY;

\echo '--- 1. Todos los GPS registrados (de todas las empresas) ---'
SELECT d.imei,
       t.name                         AS empresa,
       t.status                       AS estado_empresa,
       d.model                        AS modelo,
       d.status                       AS estado_gps,
       to_char(d.created_at AT TIME ZONE 'America/Caracas', 'YYYY-MM-DD HH24:MI') AS creado,
       to_char(d.last_connection_at AT TIME ZONE 'America/Caracas', 'YYYY-MM-DD HH24:MI') AS ultima_conexion
  FROM fom.gps_devices d
  JOIN fom.tenants t ON t.id = d.tenant_id
 ORDER BY d.created_at DESC;

\echo '--- 2. IMEI que el receptor oyó en los últimos 3 días ---'
SELECT m.imei,
       count(*)                                         AS mensajes,
       to_char(max(m.received_at) AT TIME ZONE 'America/Caracas', 'YYYY-MM-DD HH24:MI') AS ultimo,
       CASE WHEN d.id IS NULL THEN 'NO REGISTRADO' ELSE t.name END AS empresa
  FROM (
        SELECT (regexp_match(encode(payload, 'escape'), '([0-9]{15})'))[1] AS imei, received_at
          FROM fom.gps_raw_messages
         WHERE received_at > now() - interval '3 days'
       ) m
  LEFT JOIN fom.gps_devices d ON d.imei = m.imei
  LEFT JOIN fom.tenants t ON t.id = d.tenant_id
 WHERE m.imei IS NOT NULL
 GROUP BY m.imei, d.id, t.name
 ORDER BY max(m.received_at) DESC;

ROLLBACK;
