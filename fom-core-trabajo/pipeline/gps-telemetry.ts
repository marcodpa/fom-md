import type { ObservedFrameTelemetry } from '../gps-ingress/gps-protocol-adapter';
import type { CanonicalTelemetry } from './gps-canonical.types';

/**
 * Traduccion de la telemetria observada en la trama a la forma que se guarda.
 *
 * Un solo sitio decide unidades y redondeo. Si esta regla vive repartida entre
 * el decodificador, el procesador y el repositorio, tarde o temprano dos de
 * ellos discrepan y nadie lo nota hasta que un informe da un numero raro.
 */

/** Nudos a kilometros por hora. Exacto por definicion de milla nautica. */
const KNOT_TO_KPH = 1.852;

/**
 * Ausencia total de telemetria. Es lo que corresponde a una trama sin fijacion
 * y a cualquier variante que no transporte estos campos: cuatro nulos, que
 * significan «no se sabe», y no cuatro ceros, que afirmarian un vehiculo
 * detenido, mirando al norte y con el odometro en cero.
 */
export const TELEMETRIA_AUSENTE: CanonicalTelemetry = {
  speedKph: null,
  headingDeg: null,
  ignition: null,
  odometerKm: null,
};

/** Dos decimales, que es la precision de la columna `numeric(6,2)`. */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function toCanonicalTelemetry(
  observed: ObservedFrameTelemetry,
): CanonicalTelemetry {
  // La unidad viaja pegada al valor, asi que la conversion depende solo de
  // ella y no de leer otra vez la constante global. Con la unidad todavia
  // indeterminada no se escribe nada: el valor no se pierde, porque la trama
  // esta preservada integra y basta con subir la version del decodificador y
  // reprocesar cuando quede demostrada. Guardar un numero plausible y
  // equivocado si seria irreversible, porque nadie volveria a revisarlo.
  let speedKph: number | null = null;
  if (observed.speed !== null) {
    if (observed.speed.wireUnit === 'kph') {
      speedKph = redondear(observed.speed.value);
    } else if (observed.speed.wireUnit === 'knot') {
      speedKph = redondear(observed.speed.value * KNOT_TO_KPH);
    }
  }

  return {
    speedKph,
    headingDeg:
      observed.heading === null ? null : redondear(observed.heading.degrees),
    // IGNICION Y ODOMETRO. Las tramas `tracker` de GPS103 tienen trece campos y
    // ninguno los transporta: el encendido llega en mensajes de alarma
    // distintos (`acc on` / `acc off`), que este decodificador todavia no
    // interpreta, y el odometro solo existe en variantes de firmware con mas
    // campos que no se han observado en la flota. Las columnas se crean ahora
    // para no volver a migrar la tabla, y se llenan cuando haya una fuente
    // observada. Derivarlas de la velocidad seria inventar.
    ignition: null,
    odometerKm: null,
  };
}
