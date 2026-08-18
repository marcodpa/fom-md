import type { MigrationBuilder } from 'node-pg-migrate/dist/bundle/index';

/**
 * Issue #159 — Telemetria canonica aditiva: velocidad, rumbo, ignicion y odometro.
 *
 * Cuatro columnas nullable sobre `fom.gps_positions`, sin default y sin NOT
 * NULL. Las filas historicas quedan en NULL, que es la respuesta correcta:
 * significa «la version del decoder que escribio esta fila no extrajo el dato»,
 * y eso no es lo mismo que cero, que afirmaria que el vehiculo estaba detenido
 * o que el odometro marcaba cero.
 *
 * UNIDADES, fijadas en el nombre y repetidas en el comentario de cada columna,
 * porque una columna `speed` sin unidad se interpreta mal tarde o temprano:
 *   speed_kph    kilometros por hora
 *   heading_deg  grados desde el norte verdadero, [0, 360)
 *   ignition     estado observado de la linea de contacto
 *   odometer_km  kilometros acumulados reportados por el equipo
 *
 * PRECISION. `numeric` y no coma flotante: el mismo frame reprocesado por el
 * mismo decoder debe producir el mismo valor byte a byte, o las comparaciones
 * de reproceso dejan de ser fiables. `odometer_km` con tres decimales porque de
 * ahi saldran los kilometros facturables y el mantenimiento por distancia.
 *
 * SIN INDICES, por instruccion explicita del Issue: no se anaden hasta demostrar
 * una consulta real que los use. Un indice sobre una tabla que solo crece se
 * paga en cada insercion, para siempre.
 *
 * BLOQUEO. `ADD COLUMN` sin default es catalogo puro: desde PostgreSQL 11 el
 * valor faltante vive en `pg_attribute.attmissingval` y las paginas existentes
 * no se tocan, asi que no hay reescritura de tabla. Las restricciones se validan
 * en linea porque hoy son decenas de miles de filas, todas NULL, y el recorrido
 * dura milisegundos; separar en NOT VALID + VALIDATE exigiria `noTransaction`,
 * que parte la migracion en varias transacciones y rompe la garantia de todo o
 * nada del despliegue, para ahorrar un bloqueo mas corto que el propio ALTER. Si
 * esta tabla llegara al orden de los millones de filas antes de aplicarse, la
 * decision se invierte.
 *
 * El riesgo real no es la duracion sino la cola: ACCESS EXCLUSIVE es incompatible
 * con todo, de modo que un SELECT largo abierto sobre la tabla haria esperar al
 * ALTER y, detras de el, a los INSERT del ingestor. De ahi el `lock_timeout`: si
 * no consigue paso libre en tres segundos la migracion aborta sin haber tocado
 * nada, y se reintenta en otro momento.
 *
 * PERMISOS. No se modifican, y es deliberado. `fom.gps_positions` ya concede
 * `SELECT, INSERT` a `fom_app` y `SELECT` a `fom_readonly`, sin UPDATE ni DELETE
 * porque la tabla es de solo anexado; un permiso otorgado a nivel de tabla
 * alcanza a las columnas nuevas. Conceder de menos aqui romperia la ingesta, y
 * conceder de mas contradiria el minimo privilegio que ya esta bien resuelto.
 */

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`SET LOCAL lock_timeout = '3s';`);

  pgm.sql(`
    ALTER TABLE fom.gps_positions
      ADD COLUMN speed_kph   numeric(6,2),
      ADD COLUMN heading_deg numeric(5,2),
      ADD COLUMN ignition    boolean,
      ADD COLUMN odometer_km numeric(12,3);
  `);

  pgm.sql(`
    ALTER TABLE fom.gps_positions
      ADD CONSTRAINT gps_positions_speed_kph_check CHECK (
        speed_kph IS NULL OR (speed_kph >= 0 AND speed_kph <= 400)
      ),
      ADD CONSTRAINT gps_positions_heading_deg_check CHECK (
        heading_deg IS NULL OR (heading_deg >= 0 AND heading_deg < 360)
      ),
      ADD CONSTRAINT gps_positions_odometer_km_check CHECK (
        odometer_km IS NULL OR (odometer_km >= 0 AND odometer_km <= 9999999)
      );
  `);

  pgm.sql(`
    COMMENT ON COLUMN fom.gps_positions.speed_kph IS
      'Observed ground speed in km/h taken from the preserved frame. NULL means the decoder version that wrote this row did not extract it, which is not the same as zero';
    COMMENT ON COLUMN fom.gps_positions.heading_deg IS
      'Observed course over ground in degrees clockwise from true north, 0 inclusive to 360 exclusive. NULL when the frame carries no usable course';
    COMMENT ON COLUMN fom.gps_positions.ignition IS
      'Observed ignition line state. NULL when the frame carries no ignition signal. Never derived from speed or movement heuristics';
    COMMENT ON COLUMN fom.gps_positions.odometer_km IS
      'Device-reported cumulative odometer in km. Not monotonic across hardware replacements, and never derived from consecutive positions';
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  // Revertir solo mientras no exista telemetria decodificada. Si ya se escribio
  // aunque sea un valor, un DROP COLUMN lo borraria y solo se recuperaria
  // reprocesando los frames. Ante esa duda la migracion se niega en vez de
  // destruir dato observado.
  pgm.sql(`
    DO $guard$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM fom.gps_positions
        WHERE speed_kph IS NOT NULL
           OR heading_deg IS NOT NULL
           OR ignition IS NOT NULL
           OR odometer_km IS NOT NULL
        LIMIT 1
      ) THEN
        RAISE EXCEPTION
          'cannot roll back GPS telemetry columns while decoded telemetry exists'
          USING ERRCODE = '23514';
      END IF;
    END
    $guard$;
  `);

  pgm.sql(`SET LOCAL lock_timeout = '3s';`);

  pgm.sql(`
    ALTER TABLE fom.gps_positions
      DROP CONSTRAINT gps_positions_odometer_km_check,
      DROP CONSTRAINT gps_positions_heading_deg_check,
      DROP CONSTRAINT gps_positions_speed_kph_check,
      DROP COLUMN odometer_km,
      DROP COLUMN ignition,
      DROP COLUMN heading_deg,
      DROP COLUMN speed_kph;
  `);
};
