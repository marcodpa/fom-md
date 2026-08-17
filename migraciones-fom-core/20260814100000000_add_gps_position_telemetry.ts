import type { MigrationBuilder } from 'node-pg-migrate/dist/bundle/index';

/**
 * Velocidad, rumbo, encendido y odómetro en fom.gps_positions.
 *
 * El decodificador canónico persiste hoy solo latitud, longitud y validez. El
 * protocolo Coban transmite además la cinemática, y sin ella no existen el
 * estado de marcha, el índice de manejo seguro, las alertas por exceso de
 * velocidad, el kilometraje ni el mantenimiento por kilómetros.
 *
 * Las filas ya escritas quedan con NULL en las cuatro columnas. Ese NULL es la
 * respuesta correcta —«el decodificador de aquel momento no extrajo el dato»—
 * y es distinto de un cero, que afirmaría que el vehículo estaba detenido. El
 * histórico no se pierde: fom.gps_raw_messages conserva los bytes exactos de
 * cada trama y la clave de idempotencia incluye decoder_version, así que un
 * decodificador nuevo puede reprocesar e insertar posiciones completas sin
 * chocar con las viejas.
 *
 * SIN TRANSACCIÓN, y a propósito. node-pg-migrate envuelve cada migración en
 * una transacción; dentro de una, el ACCESS EXCLUSIVE que toma el ALTER no se
 * suelta hasta el COMMIT, así que VALIDATE CONSTRAINT correría bajo el bloqueo
 * fuerte y CREATE INDEX CONCURRENTLY fallaría con 25001. Cada pgm.sql() va
 * como una consulta separada por la misma razón.
 *
 * Se pide con `pgm.noTransaction()` DENTRO del cuerpo, no con un export a
 * nivel de módulo: node-pg-migrate 8 desestructura solo `{ up, down }` del
 * módulo e ignora cualquier otro export EN SILENCIO — sin aviso ni error. Un
 * `export const noTransaction = true` parece funcionar y no hace nada.
 *
 * AVISO DE DESPLIEGUE. `run-migrations.ts` pasa `--single-transaction`. Al
 * pedir noTransaction, node-pg-migrate parte la transacción envolvente: emite
 * un COMMIT antes de esta migración y un BEGIN después. Si falla cualquiera de
 * las migraciones posteriores, esta y las anteriores YA están confirmadas y
 * registradas. Por eso esta migración debe desplegarse como paso propio,
 * separado de las otras cuatro, y no en la misma tanda.
 */

export const up = (pgm: MigrationBuilder): void => {
  pgm.noTransaction();

  // El riesgo no es la duración del bloqueo sino la cola: ACCESS EXCLUSIVE es
  // incompatible con todo, y si hay un SELECT largo abierto, los INSERT del
  // ingestor se encolan detrás del ALTER. Con tramas entrando cada minuto,
  // treinta segundos de espera son tramas perdidas. Si no se consigue el
  // bloqueo en tres segundos, la migración aborta sin haber tocado nada.
  pgm.sql(`SET lock_timeout = '3s';`);

  // Metadato puro: sin DEFAULT no hay reescritura de la tabla. Desde
  // PostgreSQL 11 el valor faltante vive en pg_attribute.attmissingval.
  pgm.sql(`
    ALTER TABLE fom.gps_positions
      ADD COLUMN speed_kph    numeric(6,2),
      ADD COLUMN heading_deg  numeric(5,2),
      ADD COLUMN ignition     boolean,
      ADD COLUMN odometer_km  numeric(12,3);
  `);

  // NOT VALID: la restricción rige desde ya para las filas nuevas sin recorrer
  // las existentes. Hoy son milisegundos; a cien millones de filas serían
  // minutos de ingesta detenida. El hábito se instala ahora, que sale gratis.
  pgm.sql(`
    ALTER TABLE fom.gps_positions
      ADD CONSTRAINT gps_positions_speed_check CHECK (
        speed_kph IS NULL OR (speed_kph >= 0 AND speed_kph <= 400)
      ) NOT VALID,
      ADD CONSTRAINT gps_positions_heading_check CHECK (
        heading_deg IS NULL OR (heading_deg >= 0 AND heading_deg < 360)
      ) NOT VALID,
      ADD CONSTRAINT gps_positions_odometer_check CHECK (
        odometer_km IS NULL OR (odometer_km >= 0 AND odometer_km <= 9999999)
      ) NOT VALID;
  `);

  // Validación de las filas históricas. SHARE UPDATE EXCLUSIVE: el ingestor
  // sigue insertando mientras se recorre la tabla.
  pgm.sql(`ALTER TABLE fom.gps_positions VALIDATE CONSTRAINT gps_positions_speed_check;`);
  pgm.sql(`ALTER TABLE fom.gps_positions VALIDATE CONSTRAINT gps_positions_heading_check;`);
  pgm.sql(`ALTER TABLE fom.gps_positions VALIDATE CONSTRAINT gps_positions_odometer_check;`);

  // El timeout corto era para el ALTER. CREATE INDEX CONCURRENTLY hace varios
  // recorridos y espera a las transacciones en curso: bajo lock_timeout aborta
  // sobre una tabla con ingesta activa y deja un índice INVALID que PostgreSQL
  // no limpia solo, penalizando cada INSERT sin servir a ninguna consulta.
  pgm.sql(`RESET lock_timeout;`);

  // Reintento idempotente: si un intento anterior dejó el índice inválido,
  // se retira antes de volver a crearlo.
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS fom.gps_positions_vehicle_track_idx;`);

  // Índice del recorrido: igualdad, igualdad, rango; parcial para excluir lo
  // que nunca se dibuja, y cubridor para que el trazado salga por index-only
  // scan, ya ordenado y sin tocar el heap.
  pgm.sql(`
    CREATE INDEX CONCURRENTLY gps_positions_vehicle_track_idx
      ON fom.gps_positions (tenant_id, vehicle_id, received_at)
      INCLUDE (latitude, longitude, speed_kph, heading_deg, ignition, odometer_km)
      WHERE vehicle_id IS NOT NULL AND position_valid;
  `);

  pgm.sql(`
    COMMENT ON COLUMN fom.gps_positions.speed_kph IS
      'Ground speed in km/h decoded from the protocol frame; NULL means the decoder version on this row did not extract it';
    COMMENT ON COLUMN fom.gps_positions.heading_deg IS
      'Course over ground in degrees clockwise from true north, 0 inclusive to 360 exclusive';
    COMMENT ON COLUMN fom.gps_positions.ignition IS
      'Ignition line state reported by the tracker; NULL when the frame carries no ignition signal';
    COMMENT ON COLUMN fom.gps_positions.odometer_km IS
      'Device-reported cumulative odometer in km; resets on hardware replacement and is not monotonic across devices';
    COMMENT ON INDEX fom.gps_positions_vehicle_track_idx IS
      'Covering index for vehicle track replay over a time range; serves index-only scans';
  `);

  pgm.sql(`RESET lock_timeout;`);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.noTransaction();

  pgm.sql(`
    DO $guard$ BEGIN
      IF EXISTS (
        SELECT 1 FROM fom.gps_positions
        WHERE speed_kph IS NOT NULL
           OR heading_deg IS NOT NULL
           OR ignition IS NOT NULL
           OR odometer_km IS NOT NULL
        LIMIT 1
      ) THEN
        RAISE EXCEPTION
          'cannot roll back GPS telemetry columns while telemetry data exists';
      END IF;
    END $guard$;
  `);

  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS fom.gps_positions_vehicle_track_idx;`);

  pgm.sql(`SET lock_timeout = '3s';`);

  pgm.sql(`
    ALTER TABLE fom.gps_positions
      DROP CONSTRAINT gps_positions_odometer_check,
      DROP CONSTRAINT gps_positions_heading_check,
      DROP CONSTRAINT gps_positions_speed_check,
      DROP COLUMN odometer_km,
      DROP COLUMN ignition,
      DROP COLUMN heading_deg,
      DROP COLUMN speed_kph;
  `);

  pgm.sql(`RESET lock_timeout;`);
};
