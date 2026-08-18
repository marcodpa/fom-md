export type GpsFrameSegmentInput = {
  readonly rawMessageId: string;
  readonly segmentOrdinal: number;
  readonly sourceStartOffset: number;
  readonly sourceEndOffset: number;
  readonly frameStartOffset: number;
  readonly frameEndOffset: number;
};

export type GpsFrameInput = {
  readonly tenantId: string;
  readonly gpsDeviceId: string | null;
  readonly transport: 'tcp' | 'udp';
  readonly connectionId: string | null;
  readonly frameSequence: number;
  readonly payload: Buffer;
  readonly payloadSha256?: Buffer;
  readonly segments: readonly GpsFrameSegmentInput[];
};

export type PersistedGpsFrame = {
  readonly id: string;
  readonly tenantId: string;
  readonly gpsDeviceId: string | null;
  readonly firstReceivedAt: Date;
  readonly lastReceivedAt: Date;
  readonly inserted: boolean;
};

export type DeviceDateTimeComponents = {
  readonly raw: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly timezone: 'unknown';
};

export type GpsTimeComponents = {
  readonly raw: string;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
  readonly timezone: 'unknown';
};

/**
 * Telemetria lista para guardar, ya en las unidades del producto.
 *
 * Cada campo es `number | null` o `boolean | null`, nunca un valor por defecto:
 * `null` significa «la version del decodificador que escribio esta fila no
 * pudo afirmarlo», que no es lo mismo que cero.
 */
export type CanonicalTelemetry = {
  /** Kilometros por hora. */
  readonly speedKph: number | null;
  /** Grados desde el norte verdadero, [0, 360). */
  readonly headingDeg: number | null;
  /** Estado observado de la linea de contacto. Nunca derivado del movimiento. */
  readonly ignition: boolean | null;
  /** Kilometros acumulados que reporta el equipo. */
  readonly odometerKm: number | null;
};

type CanonicalPositionBase = {
  readonly gpsDeviceId: string;
  readonly vehicleId: string | null;
  readonly eventOrdinal: number;
  readonly deviceDateTime: DeviceDateTimeComponents | null;
  readonly gpsTime: GpsTimeComponents | null;
  readonly telemetry: CanonicalTelemetry;
};

export type CanonicalValidPositionInput = CanonicalPositionBase & {
  readonly positionValid: true;
  readonly latitude: number;
  readonly longitude: number;
};

export type CanonicalInvalidPositionInput = CanonicalPositionBase & {
  readonly positionValid: false;
  readonly latitude: null;
  readonly longitude: null;
};

export type CanonicalPositionInput =
  | CanonicalValidPositionInput
  | CanonicalInvalidPositionInput;

export type DecodeResultKind =
  | 'heartbeat'
  | 'position_valid'
  | 'position_invalid'
  | 'unsupported'
  | 'malformed'
  | 'unknown_device'
  | 'archived_device'
  | 'ambiguous_identity'
  | 'persistence_error';

type CanonicalDecodeBase = {
  readonly frame: PersistedGpsFrame;
  readonly tenantId: string;
  readonly gpsDeviceId: string | null;
  readonly processorInstance: string;
  readonly protocolFamily: string;
  readonly decoderVersion: string;
};

export type CanonicalDecodeInput =
  | (
    CanonicalDecodeBase & {
      readonly resultKind: 'position_valid';
      readonly failureReason: null;
      readonly position: CanonicalValidPositionInput;
    }
  )
  | (
    CanonicalDecodeBase & {
      readonly resultKind: 'position_invalid';
      readonly failureReason: null;
      readonly position: CanonicalInvalidPositionInput;
    }
  )
  | (
    CanonicalDecodeBase & {
      readonly resultKind: Exclude<
        DecodeResultKind,
        'position_valid' | 'position_invalid'
      >;
      readonly failureReason: string | null;
      readonly position?: undefined;
    }
  );

export type PersistedDecodeAttempt = {
  readonly id: string;
  readonly resultKind: DecodeResultKind;
};

export type PersistedGpsPosition = {
  readonly id: string;
  readonly decodeAttemptId: string;
  readonly inserted: boolean;
};
