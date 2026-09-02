import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * Escrituras del directorio (personal y flota) — Issue #169 / FOM-02.
 *
 * Aquí tampoco hay `tenantId`: toda alta ocurre en la empresa del actor,
 * derivada de su sesión. Un supervisor no puede crear gente ni vehículos en
 * una empresa ajena porque no existe forma de nombrarla.
 */

/** Roles que un gestor puede otorgar. `admin_fom` NO está y es a propósito:
 *  un administrador de la plataforma no se crea por API (regla de mando:
 *  nadie administra a un admin FOM, tampoco creándolo). */
export const ROLES_OTORGABLES = [
  'supervisor',
  'conductor',
  'operator',
  'usuario',
] as const;

export class CreateDirectoryUserDto {
  @ApiProperty({ maxLength: 254 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(6, 254)
  email!: string;

  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 120)
  displayName!: string;

  @ApiProperty({ enum: ROLES_OTORGABLES })
  @IsIn(ROLES_OTORGABLES as unknown as string[])
  role!: string;

  @ApiProperty({
    minLength: 16,
    maxLength: 256,
    description:
      'Clave temporal: la persona debe cambiarla en su primer ingreso ' +
      '(must_change_password queda activo). Solo caracteres imprimibles.',
  })
  @IsString()
  @Length(16, 256)
  @Matches(/^[\x20-\x7e¡-￿]+$/u, {
    message: 'temporaryPassword must contain printable characters only',
  })
  temporaryPassword!: string;
}

export class InitialPasswordChangeDto {
  @ApiProperty({ description: 'La clave temporal vigente.' })
  @IsString()
  @Length(1, 1024)
  currentPassword!: string;

  @ApiProperty({ minLength: 16, maxLength: 256 })
  @IsString()
  @Length(16, 256)
  @Matches(/^[\x20-\x7e¡-￿]+$/u, {
    message: 'newPassword must contain printable characters only',
  })
  newPassword!: string;
}

export class AssignDriverDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  userId!: string;

  @ApiPropertyOptional({ enum: ['principal', 'secundario'], default: 'principal' })
  @IsOptional()
  @IsIn(['principal', 'secundario'])
  role: 'principal' | 'secundario' = 'principal';

  @ApiPropertyOptional({
    description:
      'PIN de conductor secundario (4 a 8 dígitos). Obligatorio para ' +
      'secundario, prohibido para principal; se guarda solo su hash.',
    pattern: '^[0-9]{4,8}$',
  })
  @IsOptional()
  @Matches(/^[0-9]{4,8}$/u, { message: 'pin must be 4 to 8 digits' })
  pin?: string;
}

export class RevokeDriverDto {
  @ApiPropertyOptional({
    description: 'Motivo corto en minúsculas (letras, números, punto, guion).',
    pattern: '^[a-z0-9][a-z0-9._-]{0,99}$',
  })
  @IsOptional()
  @Matches(/^[a-z0-9][a-z0-9._-]{0,99}$/u)
  reason?: string;
}

export class CreateVehicleDto {
  @ApiProperty({ minLength: 1, maxLength: 60 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 60)
  code!: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  plate?: string;

  @ApiPropertyOptional({ maxLength: 80, description: 'Alias interno de la empresa.' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  alias?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  make?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  model?: string;

  @ApiPropertyOptional({ minimum: 1950, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  modelYear?: number;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  vehicleType?: string;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  plate?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  alias?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  make?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  model?: string;

  @ApiPropertyOptional({ minimum: 1950, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  modelYear?: number;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  vehicleType?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Área; null la quita.' })
  @IsOptional()
  @IsUUID('4')
  areaId?: string | null;
}

/**
 * Estados que un gestor puede fijar sobre una membresía. `invited` no está:
 * es el estado de nacimiento de una invitación, no un destino al que se
 * vuelve. `revoked` es terminal por diseño del ciclo de vida.
 */
export const ESTADOS_ADMINISTRABLES = [
  'active',
  'suspended',
  'revoked',
] as const;

export class UpdateMembershipDto {
  @ApiPropertyOptional({
    enum: ROLES_OTORGABLES,
    description: 'Nuevo perfil. Otorgar supervisor exige administrador FOM.',
  })
  @IsOptional()
  @IsIn(ROLES_OTORGABLES as unknown as string[])
  role?: string;

  @ApiPropertyOptional({
    enum: ESTADOS_ADMINISTRABLES,
    description:
      'Suspender retira el acceso y es reversible; revocar es terminal.',
  })
  @IsOptional()
  @IsIn(ESTADOS_ADMINISTRABLES as unknown as string[])
  status?: string;

  @ApiPropertyOptional({
    maxLength: 100,
    description: 'Motivo del cambio, en minúsculas; queda en la auditoría.',
  })
  @IsOptional()
  @Matches(/^[a-z0-9][a-z0-9._-]{0,99}$/u)
  reason?: string;
}

export class ResetCredentialDto {
  @ApiProperty({
    minLength: 16,
    maxLength: 256,
    description:
      'Clave temporal nueva: la persona queda obligada a cambiarla en su ' +
      'siguiente ingreso y sus sesiones abiertas se revocan.',
  })
  @IsString()
  @Length(16, 256)
  @Matches(/^[\x20-\x7e¡-￿]+$/u, {
    message: 'temporaryPassword must contain printable characters only',
  })
  temporaryPassword!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Matches(/^[a-z0-9][a-z0-9._-]{0,99}$/u)
  reason?: string;
}

// ============================================================
// INVENTARIO DE EQUIPOS GPS
// ------------------------------------------------------------
// El equipo se REGISTRA en la consola —es inventario, y quien lo compra no es
// quien lo instala— y se INSTALA sobre una unidad, que sí es trabajo de campo.
// Separarlos importa: un equipo puede existir meses en una gaveta antes de
// montarse, y su historia de instalaciones es lo que explica de qué unidad
// venían las posiciones de hace tres meses.
// ============================================================

/** Los estados que admite la base (`gps_devices_status_check`). `archived` no
 *  se fija por aquí: archivar exige su propia fecha y su propia decisión. */
export const ESTADOS_DE_EQUIPO = [
  'inventory',
  'active',
  'inactive',
  'maintenance',
  'lost',
] as const;

export class RegisterGpsDeviceDto {
  @ApiProperty({
    description:
      'IMEI de 15 dígitos. Es único en TODA la plataforma, no solo en la ' +
      'empresa: el aparato es uno solo en el mundo.',
    pattern: '^[0-9]{15}$',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/^[0-9]{15}$/u)
  imei!: string;

  @ApiProperty({ maxLength: 80 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  model!: string;

  @ApiProperty({
    maxLength: 50,
    description: 'Familia de protocolo, p. ej. `coban-gps103`.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 50)
  protocolFamily!: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  manufacturer?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  serialNumber?: string;

  @ApiPropertyOptional({ enum: ESTADOS_DE_EQUIPO, default: 'inventory' })
  @IsOptional()
  @IsIn(ESTADOS_DE_EQUIPO as unknown as string[])
  status?: (typeof ESTADOS_DE_EQUIPO)[number];
}

/** Ajustes del equipo en inventario. El IMEI NO se corrige: si el IMEI está
 *  mal, el aparato registrado es otro, y lo que toca es registrar el que es. */
export class UpdateGpsDeviceDto {
  @ApiPropertyOptional({ enum: ESTADOS_DE_EQUIPO })
  @IsOptional()
  @IsIn(ESTADOS_DE_EQUIPO as unknown as string[])
  status?: (typeof ESTADOS_DE_EQUIPO)[number];

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  manufacturer?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  serialNumber?: string;
}

/** Instalar un equipo sobre una unidad. */
export class InstallGpsDeviceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  vehicleId!: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Dónde quedó montado, con qué quedó pendiente.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 500)
  notes?: string;
}

/** Desmontar un equipo. La instalación no se borra: se cierra con fecha. */
export class RemoveGpsInstallationDto {
  @ApiPropertyOptional({ maxLength: 500, description: 'Por qué se retira.' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 500)
  notes?: string;
}

// ============================================================
// LA PERSONA COMPLETA
// ------------------------------------------------------------
// El panel tenía dos pantallas para la misma gente: una preguntaba «¿puede
// manejar hoy?» y la otra «¿tiene acceso?». Nunca fueron dos tipos de
// persona, y la base lo dice sola: un documento de persona apunta a su
// membresía, así que aquí NO existe alguien sin cuenta.
// ============================================================

/**
 * Datos personales. Van aparte del alta de la cuenta porque se llenan en otro
 * momento y por otra persona: la cuenta la crea el supervisor el primer día,
 * y la cédula la trae el conductor cuando aparece con sus papeles.
 */
export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    description: 'Cédula en el formato de la base: `v-12345678`.',
    pattern: '^[ve]-[0-9]{6,9}$',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Matches(/^[ve]-[0-9]{6,9}$/u)
  nationalId?: string;

  @ApiPropertyOptional({
    description: 'Teléfono con código de país: `+584141234567`.',
    pattern: '^[+][0-9]{7,15}$',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s-]/gu, '') : value,
  )
  @Matches(/^[+][0-9]{7,15}$/u)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 300)
  address?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/u)
  birthDate?: string;
}
