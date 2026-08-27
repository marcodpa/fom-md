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
