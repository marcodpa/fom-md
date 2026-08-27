import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { PasswordHasherService } from '../authentication/crypto/password-hasher.service';
import { DatabaseService } from '../database/database.service';
import {
  canonicalRole,
  requireCanManage,
  requireFomAdminActor,
  requireManagerActor,
} from './console-roles';
import type {
  AssignDriverDto,
  CreateDirectoryUserDto,
  CreateVehicleDto,
  ResetCredentialDto,
  RevokeDriverDto,
  UpdateMembershipDto,
  UpdateVehicleDto,
} from './console-directory.dto';
import type { ListQueryDto } from './console.dto';

/**
 * Escrituras del directorio: personal y flota — Issue #169 / FOM-02 §1 y §3.
 *
 * Primer módulo de la consola donde el ROL autoriza (console-roles.ts):
 * gestor para administrar personal y editar flota; administrador FOM para
 * crear vehículos y otorgar el rol de supervisor. La base añade sus propios
 * candados por detrás (rol↔categoría del ente, un principal activo por
 * vehículo, PIN solo hasheado): aquí no se repiten — se traducen sus errores
 * a respuestas con nombre.
 *
 * Toda alta escribe su AUTORÍA (created_by / granted_by, migración
 * 20260825180000000): quién, además del cuándo que ya ponen los relojes.
 *
 * El 404 es uniforme a propósito, como en el resto de la superficie: lo
 * inexistente y lo ajeno responden igual.
 */
@Injectable()
export class ConsoleDirectoryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly hasher: PasswordHasherService,
  ) {}

  async createUser(dto: CreateDirectoryUserDto) {
    const actor = requireManagerActor();
    // Otorgar el rango de supervisor es del administrador FOM (FOM-02 §1.1);
    // el resto de roles los otorga cualquier gestor dentro de su ente.
    if (dto.role === 'supervisor') {
      requireFomAdminActor();
    }

    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM fom.users WHERE email = $1 FOR UPDATE`,
        [dto.email],
      );

      // Un usuario global existente pero NO activo no recibe membresías
      // nuevas (#202, punto 6): sería un rol activo colgado de una cuenta
      // que no puede entrar. Reactivar la cuenta es una decisión aparte,
      // con su propia superficie, y se responde con ese hecho.
      if (
        existing.rows.length > 0 &&
        existing.rows[0].status !== 'active'
      ) {
        throw new ConflictException(
          'That account exists but is not active; reactivate it before granting a role',
        );
      }

      let userId: string;
      let createdUser = false;
      if (existing.rows.length === 0) {
        // 'active' con email_verified_at: la invitacion del gestor ES la
        // verificacion (responde por el correo, y la persona lo demuestra
        // al entrar con la clave temporal). Un alta 'pending' seria una
        // cuenta que jamas puede iniciar sesion.
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO fom.users
             (email, display_name, status, email_verified_at,
              created_by_user_id)
           VALUES ($1, $2, 'active', clock_timestamp(), $3)
           RETURNING id`,
          [dto.email, dto.displayName, actor.userId],
        );
        userId = inserted.rows[0].id;
        createdUser = true;
      } else {
        userId = existing.rows[0].id;
      }

      // Mientras no exista un selector explícito de empresa, una segunda
      // membresía activa volvería inautenticable la cuenta completa: el
      // resolvedor rechaza correctamente contextos ambiguos. No se revela a
      // qué empresa pertenece; solo se evita crear la ambigüedad.
      const activeMembership = await client.query(
        `SELECT 1 FROM fom.tenant_memberships
          WHERE user_id = $1 AND status = 'active'
          LIMIT 1`,
        [userId],
      );
      if (activeMembership.rows.length > 0) {
        throw new ConflictException(
          'That account already has active company access',
        );
      }

      const membership = await client.query(
        `SELECT 1 FROM fom.tenant_memberships
          WHERE tenant_id = $1 AND user_id = $2`,
        [actor.tenantId, userId],
      );
      if (membership.rows.length > 0) {
        throw new ConflictException(
          'That person already belongs to this company',
        );
      }

      await client.query(
        `INSERT INTO fom.tenant_memberships
           (tenant_id, user_id, role, status, activated_at, granted_by_user_id)
         VALUES ($1, $2, $3, 'active', clock_timestamp(), $4)`,
        [actor.tenantId, userId, dto.role, actor.userId],
      );

      // La credencial se crea solo si no existe: una persona que ya tiene
      // clave (viene de otra empresa) conserva la suya — pisársela sería
      // dejar fuera a alguien que hoy puede entrar.
      let passwordSet = false;
      const credential = await client.query(
        `SELECT user_id FROM fom.user_password_credentials WHERE user_id = $1`,
        [userId],
      );
      if (credential.rows.length === 0) {
        const passwordHash = await this.hasher.hashPassword(
          dto.temporaryPassword,
        );
        await client.query(
          `INSERT INTO fom.user_password_credentials
             (user_id, password_hash, must_change_password)
           VALUES ($1, $2, true)`,
          [userId, passwordHash],
        );
        passwordSet = true;
      }

      await client.query('COMMIT');
      return {
        userId,
        email: dto.email,
        displayName: dto.displayName,
        role: dto.role,
        createdUser,
        passwordSet,
        mustChangePassword: passwordSet,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.translate(error);
    } finally {
      client.release();
    }
  }

  async listUsers(query: ListQueryDto) {
    const actor = requireManagerActor();
    const search = query.q?.trim()
      ? `%${query.q.trim().toLowerCase()}%`
      : null;
    // Orden determinista con desempate por identidad (#202): dos personas
    // con el mismo nombre no pueden intercambiar de página entre lecturas.
    const result = await this.database.query(
      `SELECT
         membership.user_id AS "userId",
         users.email,
         users.display_name AS "displayName",
         membership.role,
         membership.status,
         membership.activated_at AS "activatedAt",
         count(*) OVER () AS "total"
       FROM fom.tenant_memberships membership
       JOIN fom.users users ON users.id = membership.user_id
       WHERE membership.tenant_id = $1
         AND ($2::text IS NULL OR (
           lower(users.display_name) LIKE $2
           OR lower(users.email) LIKE $2
         ))
       ORDER BY users.display_name, users.email, membership.user_id
       LIMIT $3 OFFSET $4`,
      [actor.tenantId, search, query.limit, query.offset],
    );
    const total = Number(result.rows[0]?.total ?? 0);
    return {
      items: result.rows.map(({ total: _ignorado, ...row }) => ({
        ...row,
        role: canonicalRole(String(row.role)),
      })),
      page: {
        limit: query.limit,
        offset: query.offset,
        count: result.rows.length,
        total,
      },
    };
  }

  async assignDriver(vehicleId: string, dto: AssignDriverDto) {
    const actor = requireManagerActor();
    if (dto.role === 'secundario' && !dto.pin) {
      throw new BadRequestException(
        'A secondary driver requires a PIN (the GPS identifies them by it)',
      );
    }
    if (dto.role === 'principal' && dto.pin) {
      throw new BadRequestException(
        'The principal driver does not use a PIN',
      );
    }

    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      await this.requireVehicle(client, actor.tenantId, vehicleId);

      const member = await client.query(
        `SELECT 1 FROM fom.tenant_memberships
          WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`,
        [actor.tenantId, dto.userId],
      );
      if (member.rows.length === 0) {
        throw new NotFoundException('Not found');
      }

      const pinHash = dto.pin
        ? await this.hasher.hashPassword(dto.pin)
        : null;
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO fom.vehicle_driver_assignments
           (tenant_id, vehicle_id, user_id, role, pin_hash, pin_set_at,
            assigned_by_user_id)
         VALUES ($1, $2, $3, $4, $5,
                 CASE WHEN $5::varchar IS NULL THEN NULL ELSE clock_timestamp() END,
                 $6)
         RETURNING id`,
        [actor.tenantId, vehicleId, dto.userId, dto.role, pinHash, actor.userId],
      );

      await client.query('COMMIT');
      return { assignmentId: inserted.rows[0].id, role: dto.role };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.translate(error, {
        vehicle_driver_assignments_active_principal_idx:
          'That vehicle already has an active principal driver',
        vehicle_driver_assignments_active_member_idx:
          'That person already has an open assignment on that vehicle',
      });
    } finally {
      client.release();
    }
  }

  async revokeDriver(assignmentId: string, dto: RevokeDriverDto) {
    const actor = requireManagerActor();
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{
        id: string;
        vehicle_id: string;
        user_id: string;
        role: string;
        valid_to: string;
      }>(
        `UPDATE fom.vehicle_driver_assignments
            SET valid_to = clock_timestamp(), revocation_reason = $3
          WHERE tenant_id = $1 AND id = $2 AND valid_to IS NULL
          RETURNING id, vehicle_id, user_id, role, valid_to`,
        [actor.tenantId, assignmentId, dto.reason ?? null],
      );
      if (result.rows.length === 0) {
        throw new NotFoundException('Not found');
      }
      // Trazabilidad obligatoria (#202): quién revocó, cuándo, a quién, de
      // qué vehículo y por qué — en la misma transacción que el cambio.
      await this.audit(client, actor, {
        action: 'driver_assignment.revoked',
        entityType: 'vehicle_driver_assignment',
        entityId: assignmentId,
        changes: {
          vehicleId: result.rows[0].vehicle_id,
          driverUserId: result.rows[0].user_id,
          role: result.rows[0].role,
          validTo: result.rows[0].valid_to,
          reason: dto.reason ?? null,
        },
      });
      await client.query('COMMIT');
      return { assignmentId, revoked: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.translate(error);
    } finally {
      client.release();
    }
  }

  async createVehicle(dto: CreateVehicleDto) {
    // Crear vehículos es del administrador FOM (FOM-02 §1.2): el alta formal
    // incluye el GPS y la auditoría del alta. El supervisor edita, no crea.
    const actor = requireFomAdminActor();
    try {
      const inserted = await this.database.query<{ id: string }>(
        `INSERT INTO fom.vehicles
           (tenant_id, code, plate, alias, make, model, model_year,
            vehicle_type, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, coalesce($8, 'otro'), $9)
         RETURNING id`,
        [
          actor.tenantId,
          dto.code,
          dto.plate ?? null,
          dto.alias ?? null,
          dto.make ?? null,
          dto.model ?? null,
          dto.modelYear ?? null,
          dto.vehicleType ?? null,
          actor.userId,
        ],
      );
      return { vehicleId: inserted.rows[0].id, code: dto.code };
    } catch (error) {
      throw this.translate(error, {
        vehicles_tenant_code_unique:
          'A vehicle with that code already exists in this company',
      });
    }
  }

  async updateVehicle(vehicleId: string, dto: UpdateVehicleDto) {
    const actor = requireManagerActor();
    const campos: Array<[string, unknown]> = [];
    if (dto.plate !== undefined) campos.push(['plate', dto.plate]);
    if (dto.alias !== undefined) campos.push(['alias', dto.alias]);
    if (dto.make !== undefined) campos.push(['make', dto.make]);
    if (dto.model !== undefined) campos.push(['model', dto.model]);
    if (dto.modelYear !== undefined) campos.push(['model_year', dto.modelYear]);
    if (dto.vehicleType !== undefined) {
      campos.push(['vehicle_type', dto.vehicleType]);
    }
    if (dto.areaId !== undefined) campos.push(['area_id', dto.areaId]);
    if (campos.length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    const asignaciones = campos
      .map(([columna], indice) => `${columna} = $${indice + 3}`)
      .join(', ');
    const columnas = campos.map(([columna]) => columna).join(', ');
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      // El valor ANTERIOR se lee bajo candado en la misma transacción: la
      // auditoría debe contar la verdad aunque dos ediciones compitan.
      const antes = await client.query(
        `SELECT ${columnas} FROM fom.vehicles
          WHERE tenant_id = $1 AND id = $2
          FOR UPDATE`,
        [actor.tenantId, vehicleId],
      );
      if (antes.rows.length === 0) {
        throw new NotFoundException('Not found');
      }
      await client.query(
        `UPDATE fom.vehicles SET ${asignaciones}
          WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, vehicleId, ...campos.map(([, valor]) => valor)],
      );
      const cambios: Record<string, { before: unknown; after: unknown }> = {};
      for (const [columna, valor] of campos) {
        cambios[columna] = { before: antes.rows[0][columna], after: valor };
      }
      await this.audit(client, actor, {
        action: 'vehicle.updated',
        entityType: 'vehicle',
        entityId: vehicleId,
        changes: cambios,
      });
      await client.query('COMMIT');
      return { vehicleId, updated: campos.map(([columna]) => columna) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.translate(error);
    } finally {
      client.release();
    }
  }

  /**
   * La entrada de auditoría de una mutación (#202): actor, instante, entidad
   * y cambios, en la MISMA transacción que la escritura — o entran las dos,
   * o no entra ninguna. fom.audit_log es de solo anexado por disparador.
   */
  /**
   * Administrar a una persona del ente: cambiarle el perfil, suspenderla o
   * revocarla (Issue #202, reglas 9 y 10).
   *
   * La membresia se lee BAJO CANDADO dentro de la transaccion antes de
   * decidir: si dos gestores administran a la misma persona a la vez, el
   * segundo ve el estado que dejo el primero y no una foto vieja.
   */
  async updateMembership(userId: string, dto: UpdateMembershipDto) {
    const actor = requireManagerActor();
    if (dto.role === undefined && dto.status === undefined) {
      throw new BadRequestException('Nothing to update');
    }
    // Otorgar el rango de supervisor es del administrador FOM, igual que en
    // el alta: la puerta de entrada y la de ascenso no pueden diferir.
    if (dto.role === 'supervisor') {
      requireFomAdminActor();
    }

    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const actual = await client.query<{ role: string; status: string }>(
        `SELECT role, status FROM fom.tenant_memberships
          WHERE tenant_id = $1 AND user_id = $2
          FOR UPDATE`,
        [actor.tenantId, userId],
      );
      if (actual.rows.length === 0) {
        throw new NotFoundException('Not found');
      }
      requireCanManage(actor, { userId, role: actual.rows[0].role });

      const antes = actual.rows[0];
      const rol = dto.role ?? antes.role;
      const estado = dto.status ?? antes.status;
      if (estado === antes.status && rol === antes.role) {
        throw new ConflictException('That person is already in that state');
      }
      // Revocar es terminal por el ciclo de vida de la membresia: una vez
      // revocada no vuelve, y decirlo aqui es mejor que un 23514 opaco.
      if (antes.status === 'revoked') {
        throw new ConflictException('A revoked membership cannot be changed');
      }

      await client.query(
        // El estado se declara varchar UNA vez: el mismo parametro se compara
        // y se asigna, y sin el molde PostgreSQL deduce text en un sitio y
        // varchar en otro ("inconsistent types deduced for parameter").
        `UPDATE fom.tenant_memberships
            SET role = $3::varchar,
                status = $4::varchar,
                activated_at = CASE
                  WHEN $4::varchar = 'active' AND activated_at IS NULL
                    THEN clock_timestamp() ELSE activated_at END,
                suspended_at = CASE
                  WHEN $4::varchar = 'suspended' THEN clock_timestamp()
                  WHEN $4::varchar = 'active' THEN NULL
                  ELSE suspended_at END,
                revoked_at = CASE
                  WHEN $4::varchar = 'revoked' THEN clock_timestamp()
                  ELSE revoked_at END
          WHERE tenant_id = $1 AND user_id = $2`,
        [actor.tenantId, userId, rol, estado],
      );

      // Perder el acceso debe surtir efecto ya: suspender o revocar cierra
      // las sesiones abiertas en vez de esperar a que caduquen.
      let sesionesRevocadas = 0;
      if (estado !== 'active') {
        const cerradas = await client.query(
          `UPDATE fom.auth_sessions SET revoked_at = clock_timestamp()
            WHERE user_id = $1 AND revoked_at IS NULL
            RETURNING id`,
          [userId],
        );
        sesionesRevocadas = cerradas.rows.length;
      }

      await this.audit(client, actor, {
        action: 'membership.updated',
        entityType: 'tenant_membership',
        entityId: userId,
        changes: {
          role: { before: antes.role, after: rol },
          status: { before: antes.status, after: estado },
          revokedSessions: sesionesRevocadas,
          reason: dto.reason ?? null,
        },
      });
      await client.query('COMMIT');
      return {
        userId,
        role: canonicalRole(rol),
        status: estado,
        revokedSessions: sesionesRevocadas,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.translate(error);
    } finally {
      client.release();
    }
  }

  /**
   * Devolver el acceso a quien olvido su clave.
   *
   * La escritura del hash NO la hace este servicio: la hace
   * fom.reset_member_credential(), que vuelve a comprobar ente compartido,
   * rango y exclusiones por su cuenta. Que la regla viva tambien en la base
   * significa que un fallo de esta capa no alcanza para secuestrar una
   * cuenta, y que el permiso de sobrescribir hashes sigue sin existir.
   */
  async resetCredential(userId: string, dto: ResetCredentialDto) {
    const actor = requireManagerActor();
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const objetivo = await client.query<{ role: string }>(
        `SELECT role FROM fom.tenant_memberships
          WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`,
        [actor.tenantId, userId],
      );
      if (objetivo.rows.length === 0) {
        throw new NotFoundException('Not found');
      }
      requireCanManage(actor, { userId, role: objetivo.rows[0].role });

      const passwordHash = await this.hasher.hashPassword(
        dto.temporaryPassword,
      );
      const hecho = await client.query<{ reset: boolean }>(
        `SELECT fom.reset_member_credential($1, $2, $3) AS "reset"`,
        [actor.userId, userId, passwordHash],
      );
      if (hecho.rows[0]?.reset !== true) {
        // La persona existe en el ente pero no tiene credencial que reiniciar.
        throw new ConflictException('That person has no credential to reset');
      }

      await this.audit(client, actor, {
        action: 'credential.reset',
        entityType: 'user_password_credential',
        entityId: userId,
        // El hash jamas entra en la auditoria: se registra el hecho, no el
        // secreto.
        changes: {
          mustChangePassword: true,
          sessionsRevoked: true,
          reason: dto.reason ?? null,
        },
      });
      await client.query('COMMIT');
      return { userId, mustChangePassword: true, sessionsRevoked: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.translate(error);
    } finally {
      client.release();
    }
  }

  private async audit(
    client: PoolClient,
    actor: { tenantId: string; userId: string },
    entrada: {
      action: string;
      entityType: string;
      entityId: string;
      changes: Record<string, unknown>;
    },
  ): Promise<void> {
    // actor_db_role no se escribe: lo captura el disparador BEFORE INSERT de
    // la tabla, del lado del servidor — la aplicacion ni siquiera tiene el
    // permiso de columna, a proposito.
    await client.query(
      `INSERT INTO fom.audit_log
         (tenant_id, actor_kind, actor_user_id,
          action, entity_type, entity_id, changes)
       VALUES ($1, 'user', $2, $3, $4, $5, $6::jsonb)`,
      [
        actor.tenantId,
        actor.userId,
        entrada.action,
        entrada.entityType,
        entrada.entityId,
        JSON.stringify(entrada.changes),
      ],
    );
  }

  private async requireVehicle(
    client: PoolClient,
    tenantId: string,
    vehicleId: string,
  ): Promise<void> {
    const vehicle = await client.query(
      `SELECT 1 FROM fom.vehicles WHERE tenant_id = $1 AND id = $2`,
      [tenantId, vehicleId],
    );
    if (vehicle.rows.length === 0) {
      throw new NotFoundException('Not found');
    }
  }

  /**
   * Traduce los candados de la base a respuestas con nombre. El texto del
   * check de un trigger (por ejemplo, rol incompatible con la categoría del
   * ente) es exactamente el mensaje útil, así que se reenvía.
   */
  private translate(
    error: unknown,
    porRestriccion: Record<string, string> = {},
  ): unknown {
    const pg = error as {
      code?: string;
      constraint?: string;
      message?: string;
    };
    if (
      error instanceof ConflictException ||
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof ForbiddenException
    ) {
      return error;
    }
    if (pg?.code === '23505') {
      const mensaje =
        (pg.constraint && porRestriccion[pg.constraint]) ??
        'That record already exists';
      return new ConflictException(mensaje);
    }
    if (pg?.code === '23514') {
      return new BadRequestException(pg.message ?? 'Rejected by a data rule');
    }
    if (pg?.code === '23503') {
      return new NotFoundException('Not found');
    }
    return error;
  }
}
