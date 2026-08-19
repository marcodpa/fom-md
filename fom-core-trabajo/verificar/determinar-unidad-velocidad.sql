-- ============================================================
-- ¿En qué unidad manda la velocidad el GPS103? (Issue #159)
-- ------------------------------------------------------------
-- GPS103 no declara la unidad del campo de velocidad. Las dos lecturas
-- posibles —km/h y nudos— se diferencian en un factor de 1,852, y elegir mal
-- no produce ningún error visible: produce velocidades verosímiles y falsas de
-- forma permanente. Por eso `speed_kph` se escribe como NULL hasta tener esto.
--
-- La idea es simple: entre dos posiciones válidas consecutivas del mismo
-- equipo se puede calcular la velocidad implícita —distancia dividida entre
-- tiempo— sin depender de ningún campo reportado. Si el campo coincide con esa
-- velocidad implícita, son km/h. Si el campo es aproximadamente la implícita
-- dividida entre 1,852, son nudos.
--
-- REQUISITO. Solo sirve sobre tramas reales decodificadas con la versión '2'
-- del decodificador o posterior, que es la primera que extrae el campo. En
-- FOM-TEST no da resultado: `GPS_LIVE_ENABLED=NO` y los datos son sintéticos.
--
-- NO EXPONE DATOS. Devuelve únicamente conteos y medianas de un cociente
-- adimensional. Ninguna coordenada, IMEI ni identificador sale en el
-- resultado, así que la salida se puede pegar en el Issue tal cual.
--
-- Uso:
--   psql -d fom_core -v ON_ERROR_STOP=1 -f determinar-unidad-velocidad.sql
-- ============================================================

WITH consecutivas AS (
  SELECT
    gps_device_id,
    latitude,
    longitude,
    speed_kph AS campo_reportado,
    received_at,
    LAG(latitude)    OVER (PARTITION BY gps_device_id ORDER BY received_at) AS lat_previa,
    LAG(longitude)   OVER (PARTITION BY gps_device_id ORDER BY received_at) AS lon_previa,
    LAG(received_at) OVER (PARTITION BY gps_device_id ORDER BY received_at) AS hora_previa
  FROM fom.gps_positions
  WHERE position_valid
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND speed_kph IS NOT NULL
),

medidas AS (
  SELECT
    campo_reportado,
    EXTRACT(EPOCH FROM (received_at - hora_previa)) AS segundos,
    -- Haversine sin PostGIS: ninguna tabla del esquema usa tipos geográficos.
    -- 6371 km es el radio medio de la Tierra; el error frente a un elipsoide
    -- es de milésimas y aquí se busca distinguir un factor de 1,852.
    2 * 6371 * asin(sqrt(
      power(sin(radians(latitude - lat_previa) / 2), 2) +
      cos(radians(lat_previa)) * cos(radians(latitude)) *
      power(sin(radians(longitude - lon_previa) / 2), 2)
    )) AS km
  FROM consecutivas
  WHERE hora_previa IS NOT NULL
),

utiles AS (
  SELECT
    campo_reportado,
    km / (segundos / 3600.0) AS implicita_kph
  FROM medidas
  WHERE
    -- Ventanas cortas: cuanto más tiempo pasa entre dos posiciones, menos se
    -- parece la línea recta al camino recorrido y más subestima la implícita.
    segundos BETWEEN 5 AND 120
    -- En reposo el cociente es ruido puro dividido por casi cero.
    AND km > 0.05
    AND campo_reportado > 1
    -- Descarta saltos imposibles: un salto de posición por rebote de señal
    -- produce implícitas de miles de km/h que arruinarían la mediana.
    AND km / (segundos / 3600.0) < 200
)

SELECT
  count(*) AS pares_utiles,
  round(percentile_cont(0.5) WITHIN GROUP (
    ORDER BY implicita_kph / campo_reportado
  )::numeric, 4) AS cociente_mediano,
  round(percentile_cont(0.25) WITHIN GROUP (
    ORDER BY implicita_kph / campo_reportado
  )::numeric, 4) AS cuartil_1,
  round(percentile_cont(0.75) WITHIN GROUP (
    ORDER BY implicita_kph / campo_reportado
  )::numeric, 4) AS cuartil_3,
  CASE
    WHEN count(*) < 200 THEN
      'INSUFICIENTE: hacen falta al menos 200 pares para concluir'
    WHEN percentile_cont(0.5) WITHIN GROUP (
      ORDER BY implicita_kph / campo_reportado) BETWEEN 0.90 AND 1.10 THEN
      'El campo son KM/H: cambiar COBAN_SPEED_WIRE_UNIT a ''kph'''
    WHEN percentile_cont(0.5) WITHIN GROUP (
      ORDER BY implicita_kph / campo_reportado) BETWEEN 1.70 AND 2.00 THEN
      'El campo son NUDOS: cambiar COBAN_SPEED_WIRE_UNIT a ''knot'''
    ELSE
      'NO CONCLUYENTE: revisar antes de tocar la constante'
  END AS veredicto
FROM utiles;

-- CÓMO LEERLO
--
--   cociente = velocidad implícita / campo reportado
--
--   ≈ 1,00   el campo ya está en km/h
--   ≈ 1,85   el campo está en nudos y hay que multiplicarlo por 1,852
--
-- Los cuartiles importan tanto como la mediana: si el primero y el tercero
-- caen a ambos lados de 1,4 la muestra no es coherente y el veredicto no vale,
-- por muy limpia que parezca la mediana. Eso apuntaría a equipos con firmware
-- distinto mezclados, y entonces habría que repetirlo agrupando por
-- `gps_devices.firmware_version`.
--
-- Confirmada la unidad:
--   1. cambiar COBAN_SPEED_WIRE_UNIT en coban-gps103.decoder.ts
--   2. subir protocolVersion a '3' en coban-gps103.adapter.ts
--   3. reprocesar: las tramas están íntegras en gps_raw_messages.payload y
--      decoder_version forma parte de la clave de idempotencia, así que las
--      filas nuevas conviven con las viejas en vez de chocar
