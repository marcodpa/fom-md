import {
  type GpsFrameDecodeFailureReason,
  type GpsFrameDecodeResult,
  type ObservedFrameTelemetry,
} from '../gps-protocol-adapter';

const HEARTBEAT_PATTERN = /^([0-9]{15});$/u;
const LOGIN_PATTERN = /^##,imei:[0-9]{15},A;$/u;
const DEVICE_PREFIX_PATTERN = /^imei:([0-9]{15})$/u;
const INVALID_FIELD_8_PATTERN = /^afd[0-9]$/u;
const INVALID_FIELD_10_PATTERN = /^(?:aa[0-9]{2}|aac[0-9]|aaa[0-9])$/u;
const DEVICE_DATETIME_PATTERN =
  /^([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})$/u;
const GPS_TIME_PATTERN =
  /^([0-9]{2})([0-9]{2})([0-9]{2})\.000$/u;
const LATITUDE_PATTERN = /^([0-9]{2})([0-9]{2}\.[0-9]{5})$/u;
const LONGITUDE_PATTERN = /^([0-9]{3})([0-9]{2}\.[0-9]{5})$/u;
// Campo 4 de GPS103: numero de devolucion de llamada configurado en el equipo.
// No participa en la posicion. Se observa vacio en los equipos de FOM, pero un
// equipo con el numero configurado emite digitos, y descartar una posicion
// entera por eso perderia el dato util de la trama.
const CALLBACK_NUMBER_PATTERN = /^[0-9]{0,20}$/u;
// Campos 12 y 13: velocidad y rumbo. Hasta tres enteros y como maximo dos
// decimales, que es la forma con la que los emite el firmware observado.
const SPEED_PATTERN = /^[0-9]{1,3}(?:\.[0-9]{1,2})?$/u;
const HEADING_PATTERN = /^[0-9]{1,3}(?:\.[0-9]{1,2})?$/u;

/**
 * UNIDAD DEL CAMPO DE VELOCIDAD.
 *
 * GPS103 no declara la unidad de este campo en la trama, y las dos lecturas
 * posibles se diferencian en un factor de 1,852. Escoger mal no produce un
 * error visible: produce velocidades verosimiles y equivocadas para siempre.
 *
 * Por eso el decodificador NO adivina. Entrega el valor tal cual viene, con la
 * unidad marcada como indeterminada, y la persistencia deja `speed_kph` en NULL
 * mientras no haya prueba. El rumbo, que se mide en grados y no admite dos
 * lecturas, si se guarda desde ahora.
 *
 * Como se resuelve, con los datos que ya estan en la base: para un mismo
 * equipo, tomar pares de posiciones validas consecutivas, calcular la velocidad
 * implicita entre ellas (distancia sobre tiempo) y compararla con el campo
 * reportado. Si coincide, el campo son km/h; si el campo es aproximadamente la
 * implicita dividida entre 1,852, son nudos. Con unos cientos de pares el
 * resultado no admite duda.
 *
 * Confirmada la unidad: cambiar esta constante, subir `protocolVersion` a '3' y
 * reprocesar. Las tramas estan preservadas integras, asi que no se perdio nada
 * por haber esperado.
 */
export const COBAN_SPEED_WIRE_UNIT: 'knot' | 'kph' | 'undetermined' =
  'undetermined';

type ParsedDeviceTime = Extract<
  GpsFrameDecodeResult,
  { readonly kind: 'position_valid' }
>['deviceDateTime'];

type ParsedGpsTime = Extract<
  GpsFrameDecodeResult,
  { readonly kind: 'position_valid' }
>['gpsTime'];

function failure(
  kind: 'unsupported' | 'malformed',
  reason: GpsFrameDecodeFailureReason,
): GpsFrameDecodeResult {
  return { kind, reason };
}

function isPrintableAscii(frame: Buffer): boolean {
  return (
    frame.length > 0 &&
    frame.every((value) => value >= 0x20 && value <= 0x7e)
  );
}

function parseDeviceTime(value: string): ParsedDeviceTime | null {
  const match = DEVICE_DATETIME_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = 2000 + Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const isLeapYear =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (daysByMonth[month - 1] ?? 0) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  return {
    raw: value,
    year,
    month,
    day,
    hour,
    minute,
    second,
    timezone: 'unknown',
  };
}

function parseGpsTime(
  value: string,
  deviceTime: ParsedDeviceTime,
): ParsedGpsTime | null | 'mismatch' {
  const match = GPS_TIME_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3]);

  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  if (
    hour !== deviceTime.hour ||
    minute !== deviceTime.minute ||
    second !== deviceTime.second
  ) {
    return 'mismatch';
  }

  return {
    raw: value,
    hour,
    minute,
    second,
    millisecond: 0,
    timezone: 'unknown',
  };
}

function parseDegreesMinutes(
  value: string,
  pattern: RegExp,
  maximumDegrees: number,
): number | null {
  const match = pattern.exec(value);
  if (!match) {
    return null;
  }

  const degrees = Number(match[1]);
  const minutes = Number(match[2]);
  const coordinate = degrees + minutes / 60;

  if (
    !Number.isFinite(degrees) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(coordinate) ||
    minutes >= 60 ||
    coordinate > maximumDegrees
  ) {
    return null;
  }

  return coordinate;
}

/**
 * Lee velocidad y rumbo. Un campo vacio es ausencia legitima —los equipos sin
 * fijacion de rumbo lo dejan en blanco— y se traduce a `null`, nunca a cero.
 * Devuelve `null` (la funcion completa) si algun campo trae una forma no
 * observada, para que la trama se registre como variante desconocida en lugar
 * de guardarse a medias.
 */
function parseTelemetry(
  speedField: string,
  headingField: string,
): ObservedFrameTelemetry | null {
  let speed: ObservedFrameTelemetry['speed'] = null;
  if (speedField !== '') {
    if (!SPEED_PATTERN.test(speedField)) {
      return null;
    }
    const value = Number(speedField);
    if (!Number.isFinite(value)) {
      return null;
    }
    speed = {
      raw: speedField,
      value,
      // La unidad se decide en un solo sitio. Mientras este indeterminada se
      // marca como nudos para conservar el tipo, y la persistencia se niega a
      // escribir el valor; ver COBAN_SPEED_WIRE_UNIT.
      wireUnit: COBAN_SPEED_WIRE_UNIT === 'kph' ? 'kph' : 'knot',
    };
  }

  let heading: ObservedFrameTelemetry['heading'] = null;
  if (headingField !== '') {
    if (!HEADING_PATTERN.test(headingField)) {
      return null;
    }
    const degrees = Number(headingField);
    // 360 es el mismo rumbo que 0 y algunos firmwares lo emiten asi; se
    // normaliza en vez de rechazar la trama.
    if (!Number.isFinite(degrees) || degrees > 360) {
      return null;
    }
    heading = { raw: headingField, degrees: degrees === 360 ? 0 : degrees };
  }

  return { speed, heading };
}

function isObservedInvalidPosition(fields: string[]): boolean {
  return (
    fields[3] === '' &&
    fields[4] === 'L' &&
    fields[5] === '' &&
    fields[6] === '' &&
    INVALID_FIELD_8_PATTERN.test(fields[7] ?? '') &&
    fields[8] === '' &&
    INVALID_FIELD_10_PATTERN.test(fields[9] ?? '') &&
    fields[10] === '' &&
    fields[11] === '' &&
    fields[12] === ';'
  );
}

export function decodeObservedCobanFrame(
  frame: Buffer,
): GpsFrameDecodeResult {
  if (!isPrintableAscii(frame)) {
    return failure('malformed', 'non_ascii');
  }

  const message = frame.toString('ascii');
  if (!message.endsWith(';')) {
    return failure('malformed', 'missing_terminator');
  }

  const heartbeat = HEARTBEAT_PATTERN.exec(message);
  if (heartbeat?.[1]) {
    return { kind: 'heartbeat', imei: heartbeat[1] };
  }

  if (/^[0-9]+;$/u.test(message)) {
    return failure('malformed', 'invalid_imei');
  }

  if (LOGIN_PATTERN.test(message)) {
    return failure('unsupported', 'unsupported_family');
  }

  if (!message.startsWith('imei:')) {
    return failure('unsupported', 'unsupported_family');
  }

  const fields = message.split(',');
  if (fields.length !== 13) {
    return failure('malformed', 'invalid_field_count');
  }

  const identity = DEVICE_PREFIX_PATTERN.exec(fields[0] ?? '');
  if (!identity?.[1]) {
    return failure('malformed', 'invalid_imei');
  }

  if (fields[1] !== 'tracker') {
    return failure('unsupported', 'unsupported_family');
  }

  const deviceTime = parseDeviceTime(fields[2] ?? '');
  if (!deviceTime) {
    return failure('malformed', 'invalid_datetime');
  }

  if (isObservedInvalidPosition(fields)) {
    return {
      kind: 'position_invalid',
      imei: identity[1],
      deviceDateTime: deviceTime,
      fixValid: false,
    };
  }

  if (fields[4] !== 'F') {
    return failure('unsupported', 'unobserved_variant');
  }

  // El campo de devolucion de llamada no afecta a la posicion: se comprueba
  // que tenga forma conocida y se ignora.
  if (!CALLBACK_NUMBER_PATTERN.test(fields[3] ?? '')) {
    return failure('unsupported', 'unexpected_fields');
  }

  const headingField = fields[12] ?? '';
  if (!headingField.endsWith(';')) {
    return failure('malformed', 'missing_terminator');
  }

  const telemetry = parseTelemetry(
    fields[11] ?? '',
    headingField.slice(0, -1),
  );
  if (telemetry === null) {
    return failure('unsupported', 'unexpected_fields');
  }

  const gpsTime = parseGpsTime(fields[5] ?? '', deviceTime);
  if (gpsTime === null) {
    return failure('malformed', 'invalid_gps_time');
  }
  if (gpsTime === 'mismatch') {
    return failure('malformed', 'gps_time_mismatch');
  }

  if (fields[6] !== 'A') {
    return failure('unsupported', 'unobserved_variant');
  }

  if (fields[8] !== 'N' || fields[10] !== 'W') {
    return failure('malformed', 'unsupported_hemisphere');
  }

  const latitude = parseDegreesMinutes(
    fields[7] ?? '',
    LATITUDE_PATTERN,
    90,
  );
  if (latitude === null) {
    return failure('malformed', 'invalid_latitude');
  }

  const unsignedLongitude = parseDegreesMinutes(
    fields[9] ?? '',
    LONGITUDE_PATTERN,
    180,
  );
  if (unsignedLongitude === null) {
    return failure('malformed', 'invalid_longitude');
  }

  return {
    kind: 'position_valid',
    imei: identity[1],
    deviceDateTime: deviceTime,
    gpsTime,
    latitude,
    latitudeHemisphere: 'N',
    longitude: -unsignedLongitude,
    longitudeHemisphere: 'W',
    fixValid: true,
    telemetry,
  };
}
