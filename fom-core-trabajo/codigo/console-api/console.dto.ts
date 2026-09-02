import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * Paginación de los listados de consola.
 *
 * Los límites son explícitos y acotados por arriba. Un endpoint sin techo es
 * una denegación de servicio esperando a que alguien pida un millón de filas,
 * y además hace imposible razonar sobre el coste de una pantalla.
 *
 * Aquí NO hay `tenantId`. No es un olvido: el tenant se deriva de la sesión en
 * el servidor y no existe forma de indicarlo desde el cliente.
 */
export class ListQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 200,
    default: 50,
    description: 'Máximo de elementos devueltos.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  @ApiPropertyOptional({
    minimum: 0,
    default: 0,
    description: 'Elementos omitidos desde el inicio del orden.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @ApiPropertyOptional({
    maxLength: 80,
    description:
      'Búsqueda por código, placa, alias o número de flota. Solo en vehículos.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  q?: string;
}

/**
 * Rango temporal de un recorrido.
 *
 * `rangeBasis` es siempre `receivedAt`, el instante en que el servidor recibió
 * la trama, y no el que declara el equipo. La hora del dispositivo llega sin
 * zona horaria y con el reloj a veces desajustado: filtrar por ella daría
 * recorridos con huecos o duplicados según el equipo.
 */
export class PositionRangeQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 1000,
    default: 200,
    description: 'Máximo de posiciones devueltas.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 200;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Inicio del rango, sobre la hora de recepción.',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Fin del rango, sobre la hora de recepción.',
  })
  @IsOptional()
  @IsString()
  to?: string;
}

/** Telemetría de una posición. Ver el Issue #159 para el porqué de los nulos. */
export class PositionTelemetryDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Velocidad en km/h. NULL mientras la unidad del campo de GPS103 no esté ' +
      'demostrada; nunca debe presentarse como cero, que afirmaría que la ' +
      'unidad está detenida.',
  })
  speedKph!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Rumbo en grados desde el norte, [0, 360).',
  })
  headingDeg!: number | null;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    description:
      'Estado del contacto. NULL cuando la trama no lo transporta; nunca se ' +
      'deriva de la velocidad.',
  })
  ignition!: boolean | null;

  @ApiProperty({ type: Number, nullable: true, description: 'Odómetro en km.' })
  odometerKm!: number | null;
}

/** Filtro por vehículo. Común a inspecciones y documentos. */
export class VehicleFilterQueryDto extends ListQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Restringe al vehículo indicado, si pertenece a la empresa.',
  })
  @IsOptional()
  @IsUUID('4')
  vehicleId?: string;
}

export class DocumentQueryDto extends VehicleFilterQueryDto {}

/**
 * Filtro de órdenes de trabajo.
 *
 * `status` NO se valida contra una lista repetida aquí. El catálogo vive en el
 * dominio `fom.work_order_status` desde el Issue #170, precisamente para que
 * ampliarlo no obligue a acertar en cinco sitios; duplicarlo en este DTO
 * volvería a crear el problema que aquel PR quitó. Un estado que no existe
 * devuelve lista vacía, que es lo que corresponde a una búsqueda sin
 * resultados, no un error del cliente.
 */
export class WorkOrderQueryDto extends ListQueryDto {
  @ApiPropertyOptional({
    description: 'Estado exacto de la orden. Uno fuera del catálogo no falla: no encuentra nada.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  status?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  vehicleId?: string;
}

export const WORK_ORDER_STATUSES = [
  'abierta',
  'en_revision',
  'aprobada',
  'cerrada',
  'cancelada',
] as const;

/** El catálogo que admite la base (`work_orders_failure_type_check`). */
export const WORK_ORDER_FAILURE_TYPES = [
  'motor',
  'frenos',
  'neumaticos',
  'electrico',
  'carroceria',
  'otro',
] as const;

/** Los dos tipos que admite la base (`work_orders_kind_check`). */
export const WORK_ORDER_KINDS = ['correctiva', 'preventiva'] as const;

/**
 * Levantar una orden desde la consola.
 *
 * La app del conductor ya sabía reportar una falla, pero solo sobre SU unidad
 * asignada y siempre correctiva: es lo correcto para quien va manejando. Un
 * supervisor trabaja al revés — abre órdenes sobre cualquier unidad de su
 * empresa, y necesita además la preventiva, que es la que se programa antes de
 * que algo se rompa. Sin esta ruta ese trabajo no tenía por dónde entrar.
 *
 * No hay `tenantId` ni autor: los dos salen de la sesión. Tampoco hay
 * `status`: una orden nace `abierta` y de ahí solo la mueve la transición, que
 * es la que escribe el histórico.
 */
export class CreateWorkOrderDto {
  @ApiProperty({ format: 'uuid', description: 'Unidad sobre la que se abre.' })
  @IsUUID('4')
  vehicleId!: string;

  @ApiProperty({
    minLength: 10,
    maxLength: 2000,
    description: 'Qué le pasa a la unidad. Cuanto más claro, mejor el taller.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(10, 2000)
  description!: string;

  @ApiPropertyOptional({
    enum: WORK_ORDER_KINDS,
    default: 'correctiva',
    description:
      'Correctiva es una falla que ya ocurrió; preventiva es el trabajo ' +
      'programado. Se distinguen porque no se miden igual.',
  })
  @IsOptional()
  @IsIn(WORK_ORDER_KINDS as unknown as string[])
  kind?: (typeof WORK_ORDER_KINDS)[number];

  @ApiPropertyOptional({
    enum: WORK_ORDER_FAILURE_TYPES,
    description:
      'Catálogo cerrado a propósito: un campo libre produce veinte formas ' +
      'de escribir "caucho" y ningún reporte agrupable.',
  })
  @IsOptional()
  @IsIn(WORK_ORDER_FAILURE_TYPES as unknown as string[])
  failureType?: string;

  @ApiPropertyOptional({
    maxLength: 200,
    description: 'Dónde está la unidad o dónde ocurrió la falla.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 200)
  location?: string;
}

/**
 * Una transición de ODT parte de un estado que el navegador acaba de leer.
 * `expectedStatus` convierte una edición concurrente en 409 en vez de pisarla.
 * El actor y el tenant no aparecen: ambos salen de la sesión autenticada.
 */
export class TransitionWorkOrderDto {
  @ApiProperty({ enum: WORK_ORDER_STATUSES })
  @IsIn(WORK_ORDER_STATUSES as unknown as string[])
  expectedStatus!: (typeof WORK_ORDER_STATUSES)[number];

  @ApiProperty({ enum: WORK_ORDER_STATUSES })
  @IsIn(WORK_ORDER_STATUSES as unknown as string[])
  status!: (typeof WORK_ORDER_STATUSES)[number];

  @ApiProperty({
    minLength: 3,
    maxLength: 1000,
    description: 'Motivo operativo de la transición; queda en el histórico.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 1000)
  note!: string;

  @ApiPropertyOptional({
    minLength: 3,
    maxLength: 2000,
    description: 'Obligatoria al cerrar; no se acepta en otros destinos.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 2000)
  resolutionNote?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 9999999999.99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  resolutionCost?: number;

  @ApiPropertyOptional({
    pattern: '^[A-Z]{3}$',
    description: 'Moneda ISO-4217; obligatoria si se declara costo.',
  })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/u)
  resolutionCurrency?: string;
}

export class NotificationQueryDto extends ListQueryDto {
  @ApiPropertyOptional({
    description: 'Solo los avisos sin leer.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unreadOnly?: boolean;
}

/**
 * Filtros de los planes de servicio. `enabledOnly` es la pregunta que hace el
 * panel casi siempre: qué está vigente hoy, no qué existió alguna vez.
 */
export class MaintenancePlanQueryDto extends ListQueryDto {
  @ApiPropertyOptional({
    description: 'Solo planes activos y sin archivar.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  enabledOnly: boolean = false;
}

/** Filtros de las acciones de mantenimiento. */
export class MaintenanceActionQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  vehicleId?: string;

  @ApiPropertyOptional({
    description: 'Estado exacto de la acción, tal como lo guarda la base.',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  status?: string;
}

// ============================================================
// ESCRITURAS DE CUMPLIMIENTO Y AVISOS
// ------------------------------------------------------------
// La consola leía documentos, reglas y avisos desde el #171 pero no podía
// tocarlos, así que el módulo enseñaba vencimientos sin poder corregirlos y
// avisos sin poder darlos por vistos. Estos contratos cierran esa mitad.
// ============================================================

/** Los dos ámbitos que admite la base (`documents_holder_coherence_check`). */
export const AMBITOS_DE_DOCUMENTO = ['vehiculo', 'persona'] as const;

/**
 * Alta de documento.
 *
 * El titular va en UNO de los dos campos según el ámbito, nunca en los dos:
 * un documento de vehículo con titular persona no es un dato incompleto, es
 * un dato contradictorio, y la base lo rechaza en las dos direcciones.
 */
export class CreateDocumentDto {
  @ApiProperty({ enum: AMBITOS_DE_DOCUMENTO })
  @IsIn(AMBITOS_DE_DOCUMENTO as unknown as string[])
  scope!: (typeof AMBITOS_DE_DOCUMENTO)[number];

  @ApiPropertyOptional({ format: 'uuid', description: 'Solo si es de vehículo.' })
  @IsOptional()
  @IsUUID('4')
  vehicleId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Solo si es de persona.' })
  @IsOptional()
  @IsUUID('4')
  holderUserId?: string;

  @ApiProperty({
    description:
      'Tipo en minúsculas con guion bajo (`licencia_conducir`, `rcv`). Es ' +
      'un código, no un rótulo: se agrupa y se compara, así que no admite ' +
      'acentos ni espacios.',
    pattern: '^[a-z][a-z0-9_]{1,59}$',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{1,59}$/u)
  documentType!: string;

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 60)
  documentNumber?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Fecha de emisión.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  issuedOn?: string;

  @ApiProperty({
    format: 'date',
    description:
      'Fecha de vencimiento. Es obligatoria: un documento sin vencimiento no ' +
      'puede vigilarse, y vigilar vencimientos es para lo que existe el módulo.',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  expiresOn!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 1000)
  notes?: string;
}

/**
 * Corrección de un documento. `status: 'archived'` lo saca de la vigilancia
 * sin borrarlo: el vencido de ayer sigue explicando la multa de mañana.
 */
export class UpdateDocumentDto {
  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 60)
  documentNumber?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  issuedOn?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  expiresOn?: string;

  @ApiPropertyOptional({ enum: ['active', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: 'active' | 'archived';

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 1000)
  notes?: string;
}

/** Los dos tipos que admite la base (`alert_rules_type_check`). */
export const TIPOS_DE_REGLA = ['velocidad', 'mantenimiento'] as const;

/**
 * Alta de regla de alerta.
 *
 * Cada tipo lleva SU umbral y solo el suyo: velocidad en km/h, mantenimiento
 * en kilómetros y con el nombre del servicio. La base lo comprueba en las dos
 * direcciones, así que una regla de velocidad con kilómetros no se guarda a
 * medias — se rechaza.
 */
export class CreateAlertRuleDto {
  @ApiProperty({ enum: TIPOS_DE_REGLA })
  @IsIn(TIPOS_DE_REGLA as unknown as string[])
  ruleType!: (typeof TIPOS_DE_REGLA)[number];

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 300,
    description: 'Solo para `velocidad`, en km/h.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  thresholdKph?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 1000000,
    description: 'Solo para `mantenimiento`, en kilómetros.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  thresholdKm?: number;

  @ApiPropertyOptional({
    maxLength: 120,
    description: 'Obligatorio en `mantenimiento`: qué servicio toca.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 120)
  serviceName?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Ajuste de una regla. El tipo NO se cambia: una regla de velocidad que se
 *  vuelve de mantenimiento deja huérfanas sus unidades asignadas. */
export class UpdateAlertRuleDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  thresholdKph?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  thresholdKm?: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 120)
  serviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
