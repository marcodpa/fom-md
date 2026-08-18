export type FramingContext = {
  readonly maxFrameBytes: number;
};

export type FrameExtraction = {
  readonly frames: Buffer[];
  readonly remainder: Buffer;
  readonly overflowed: boolean;
};

export type DeviceIdentityResult =
  | { readonly identified: true; readonly imei: string }
  | { readonly identified: false };

export type GpsFrameDecodeFailureReason =
  | 'non_ascii'
  | 'missing_terminator'
  | 'invalid_imei'
  | 'invalid_field_count'
  | 'invalid_datetime'
  | 'invalid_gps_time'
  | 'gps_time_mismatch'
  | 'invalid_latitude'
  | 'invalid_longitude'
  | 'unsupported_hemisphere'
  | 'unexpected_fields'
  | 'unsupported_family'
  | 'unobserved_variant';

export type TimezoneNeutralDeviceDateTime = {
  readonly raw: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly timezone: 'unknown';
};

export type TimezoneNeutralGpsTime = {
  readonly raw: string;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
  readonly timezone: 'unknown';
};

/**
 * Telemetria observada en la trama, antes de convertir unidades.
 *
 * Se conserva `raw` junto al numero porque el texto exacto del campo es la
 * unica prueba de lo que dijo el equipo. Si manana se demuestra que la unidad
 * asumida no era la correcta, el valor original sigue en la trama preservada y
 * el reproceso lo corrige sin haber perdido nada.
 *
 * `wireUnit` es un dato explicito y no un comentario: el campo de velocidad de
 * GPS103 no declara su unidad, asi que la unidad debe viajar pegada al valor
 * hasta el punto donde se convierte. Ver `COBAN_SPEED_WIRE_UNIT`.
 */
export type ObservedFrameTelemetry = {
  readonly speed: {
    readonly raw: string;
    readonly value: number;
    readonly wireUnit: 'knot' | 'kph';
  } | null;
  readonly heading: {
    readonly raw: string;
    readonly degrees: number;
  } | null;
};

export type GpsFrameDecodeResult =
  | { readonly kind: 'heartbeat'; readonly imei: string }
  | {
      readonly kind: 'position_valid';
      readonly imei: string;
      readonly deviceDateTime: TimezoneNeutralDeviceDateTime;
      readonly gpsTime: TimezoneNeutralGpsTime;
      readonly latitude: number;
      readonly latitudeHemisphere: 'N';
      readonly longitude: number;
      readonly longitudeHemisphere: 'W';
      readonly fixValid: true;
      readonly telemetry: ObservedFrameTelemetry;
    }
  | {
      readonly kind: 'position_invalid';
      readonly imei: string;
      readonly deviceDateTime: TimezoneNeutralDeviceDateTime;
      readonly fixValid: false;
    }
  | {
      readonly kind: 'unsupported';
      readonly reason: GpsFrameDecodeFailureReason;
    }
  | {
      readonly kind: 'malformed';
      readonly reason: GpsFrameDecodeFailureReason;
    };

export interface GpsProtocolAdapter {
  readonly profileId: string;
  readonly protocolFamily: string;
  readonly protocolVersion: string;

  extractFrames(
    buffer: Buffer,
    context: FramingContext,
  ): FrameExtraction;

  identifyDevice(frame: Buffer): DeviceIdentityResult;

  decodeFrame(frame: Buffer): GpsFrameDecodeResult;

  buildAcknowledgement(frame: Buffer): Buffer | null;
}
