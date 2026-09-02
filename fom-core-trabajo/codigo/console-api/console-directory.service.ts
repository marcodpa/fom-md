import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { currentConsoleSessionToken } from '../authentication/actor-context';
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
  InstallGpsDeviceDto,
  RegisterGpsDeviceDto,
  RemoveGpsInstallationDto,
  ResetCredentialDto,
  RevokeDriverDto,
  UpdateGpsDeviceDto,
  UpdateMembershipDto,
  UpdateUserProfileDto,
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

      await this.lockIdentities(client, [userId]);

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

  /**
   * Declara a la base QUIÉN está actuando, para lo que vive tras política de
   * fila.
   *
   * `user_profiles` y `user_credentials` tienen RLS FORZADA desde el #168:
   * sin este ajuste, `fom.current_actor_user_id()` devuelve nulo y la tabla
   * responde vacía —o rechaza la escritura—, que es el fallo seguro correcto.
   *
   * Quién puede ver a quién NO lo decide este servicio: lo decide
   * `fom.actor_may_see_person`, que exige compartir un ente activo. Por eso
   * fijamos el actor y dejamos que la base resuelva, en vez de filtrar aquí:
   * un filtro en la aplicación se olvida en la siguiente consulta, una
   * política no.
   *
   * `true` como tercer argumento lo hace LOCAL a la transacción: el ajuste no
   * puede quedarse pegado a una conexión del pool y contaminar la petición de
   * otra persona.
   */
  private async declararActor(
    client: PoolClient,
    userId: string,
  ): Promise<void> {
    await client.query(`SELECT set_config('fom.actor_user_id', $1, true)`, [
      userId,
    ]);
  }

  /**
   * A qué ente puede mirar el actor, y si puede escribir en él.
   *
   * La regla no la inventa este servicio: la sirve `fom.actor_tenant_scope`,
   * cuyo propio comentario dice que solo el ente PROPIO admite escrituras. Una
   * compañía lee la gente de sus contratistas —para eso existe la relación—
   * pero quien administra a un contratista es el contratista.
   */
  private async alcanceDeLectura(
    tenantIdPedido: string | undefined,
    actor: { tenantId: string; userId: string },
  ): Promise<{ tenantId: string; propio: boolean }> {
    if (!tenantIdPedido || tenantIdPedido === actor.tenantId) {
      return { tenantId: actor.tenantId, propio: true };
    }
    const alcance = await this.database.query<{ scope_kind: string }>(
      `SELECT scope_kind FROM fom.actor_tenant_scope
        WHERE user_id = $1 AND scope_tenant_id = $2`,
      [actor.userId, tenantIdPedido],
    );
    if (alcance.rows.length === 0) {
      // Fuera de alcance e inexistente responden igual: distinguirlos
      // convertiría esto en un buscador de empresas ajenas.
      throw new NotFoundException('Not found');
    }
    return { tenantId: tenantIdPedido, propio: false };
  }

  /**
   * La gente del ente, con todo lo que hace falta para decidir sobre ella.
   *
   * Antes esto devolvía solo la cuenta —correo, rol, estado— y el panel tenía
   * una segunda pantalla, vacía, para lo demás: cédula, teléfono, qué unidad
   * maneja y qué documento tiene por vencer. Eran dos vistas de la MISMA
   * persona, y cruzarlas a mano es justo lo que hace que a un conductor se le
   * venza la licencia sin que nadie lo note.
   *
   * El documento más urgente se calcula en la base con `CURRENT_DATE`, no en
   * el navegador: un vencimiento que se juzga con el reloj del que mira
   * cambia de respuesta según quién abra la pantalla.
   */
  async listDirectory(query: ListQueryDto, tenantIdPedido?: string) {
    const actor = requireManagerActor();
    const { tenantId, propio } = await this.alcanceDeLectura(
      tenantIdPedido,
      actor,
    );
    const search = query.q?.trim()
      ? `%${query.q.trim().toLowerCase()}%`
      : null;
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      // Con el actor declarado, la política de fila decide por su cuenta qué
      // datos personales salen. Leyendo un CONTRATISTA no se comparte ente
      // con su gente, así que la cédula y el teléfono vuelven nulos solos:
      // se ve quién es y qué maneja, no su documento de identidad. Esa línea
      // la traza la base, no una condición de esta consulta.
      await this.declararActor(client, actor.userId);
      const result = await client.query(
      `SELECT
         membership.user_id AS "userId",
         users.email,
         users.display_name AS "displayName",
         membership.role,
         membership.status,
         membership.activated_at AS "activatedAt",
         profile.national_id AS "nationalId",
         profile.phone,
         -- TRES estados, no dos. La politica de fila oculta el perfil de
         -- quien no comparte ente activo, y un IS NOT NULL sobre una fila
         -- ausente devuelve false — que aqui significaria «perfil
         -- incompleto» cuando la verdad es «no me toca saberlo». Un dato
         -- oculto disfrazado de dato negativo hace perseguir un pendiente
         -- que no existe.
         --
         -- Se distingue lo que se puede distinguir: si la fila se ve, se
         -- responde con su valor; si no se ve pero la persona esta activa en
         -- MI ente, es que no tiene perfil todavia, y eso si es incompleto;
         -- en lo demas, nulo.
         CASE
           WHEN profile.user_id IS NOT NULL
             THEN (profile.profile_completed_at IS NOT NULL)
           WHEN $5::boolean AND membership.status = 'active' THEN false
           ELSE NULL
         END AS "profileComplete",
         unidad.vehicle_id AS "vehicleId",
         unidad.code AS "vehicleCode",
         unidad.plate AS "vehiclePlate",
         unidad.assignment_role AS "assignmentRole",
         papel.document_type AS "nextDocumentType",
         papel.expires_on::text AS "nextDocumentExpiresOn",
         papel.days_to_expiry AS "nextDocumentDaysToExpiry",
         papeles.pending AS "expiringDocumentCount",
         count(*) OVER () AS "total"
       FROM fom.tenant_memberships membership
       JOIN fom.users users ON users.id = membership.user_id
       LEFT JOIN fom.user_profiles profile ON profile.user_id = membership.user_id
       -- La asignación VIGENTE, si la hay. Una persona puede haber manejado
       -- cinco unidades; aquí interesa la de hoy.
       LEFT JOIN LATERAL (
         SELECT vehicle.id AS vehicle_id, vehicle.code, vehicle.plate,
                assignment.role AS assignment_role
           FROM fom.vehicle_driver_assignments assignment
           JOIN fom.vehicles vehicle
             ON vehicle.tenant_id = assignment.tenant_id
            AND vehicle.id = assignment.vehicle_id
          WHERE assignment.tenant_id = membership.tenant_id
            AND assignment.user_id = membership.user_id
            AND assignment.valid_to IS NULL
          ORDER BY assignment.role, assignment.valid_from DESC
          LIMIT 1
       ) unidad ON true
       -- El papel que vence antes, entre los que siguen activos.
       LEFT JOIN LATERAL (
         SELECT document.document_type, document.expires_on,
                document.expires_on - CURRENT_DATE AS days_to_expiry
           FROM fom.documents document
          WHERE document.tenant_id = membership.tenant_id
            AND document.holder_user_id = membership.user_id
            AND document.status = 'active'
          ORDER BY document.expires_on
          LIMIT 1
       ) papel ON true
       -- Cuántos están vencidos o vencen dentro de 30 días.
       LEFT JOIN LATERAL (
         SELECT count(*)::int AS pending
           FROM fom.documents document
          WHERE document.tenant_id = membership.tenant_id
            AND document.holder_user_id = membership.user_id
            AND document.status = 'active'
            AND document.expires_on <= CURRENT_DATE + 30
       ) papeles ON true
       WHERE membership.tenant_id = $1
         AND ($2::text IS NULL OR (
           lower(users.display_name) LIKE $2
           OR lower(users.email) LIKE $2
           OR lower(coalesce(profile.national_id, '')) LIKE $2
         ))
       ORDER BY users.display_name, users.email, membership.user_id
       LIMIT $3 OFFSET $4`,
      [tenantId, search, query.limit, query.offset, propio],
      );
      await client.query('COMMIT');
      const total = Number(result.rows[0]?.total ?? 0);
      return {
        items: result.rows.map(({ total: _ignorado, ...row }) => ({
          ...row,
          role: canonicalRole(String(row.role)),
          // `null` viaja tal cual: es «no se sabe», no «no».
          profileComplete:
            row.profileComplete === null || row.profileComplete === undefined
              ? null
              : Boolean(row.profileComplete),
          expiringDocumentCount: Number(row.expiringDocumentCount ?? 0),
        })),
        // Quien lee un contratista solo lee: el panel necesita saberlo para
        // no ofrecer botones que el servidor va a rechazar.
        scope: { tenantId, writable: propio },
        page: {
          limit: query.limit,
          offset: query.offset,
          count: result.rows.length,
          total,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Los datos personales, que se llenan en otro momento y por otra persona:
   * la cuenta la crea el supervisor el primer día y la cédula la trae el
   * conductor cuando aparece con sus papeles.
   *
   * `profile_completed_at` lo fija el SERVIDOR en cuanto están la cédula y el
   * teléfono. Si lo declarara el cliente, «perfil completo» pasaría a
   * significar «alguien pulsó un botón», que es justo lo que no sirve para
   * perseguir lo que falta.
   */
  async updateUserProfile(userId: string, dto: UpdateUserProfileDto) {
    const actor = requireManagerActor();
    const campos: Array<[string, unknown]> = [];
    if (dto.nationalId !== undefined) campos.push(['national_id', dto.nationalId]);
    if (dto.phone !== undefined) campos.push(['phone', dto.phone]);
    if (dto.address !== undefined) campos.push(['address', dto.address]);
    if (dto.birthDate !== undefined) campos.push(['birth_date', dto.birthDate]);
    if (campos.length === 0) {
      throw new BadRequestException('No changes were supplied');
    }

    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      await this.declararActor(client, actor.userId);
      // La membresía en el ente PROPIO es la que autoriza: una compañía lee
      // la gente de sus contratistas pero no la administra. La política de
      // fila lo vuelve a comprobar por su cuenta al escribir.
      const miembro = await client.query(
        `SELECT 1 FROM fom.tenant_memberships
          WHERE tenant_id = $1 AND user_id = $2`,
        [actor.tenantId, userId],
      );
      if (miembro.rows.length === 0) {
        throw new NotFoundException('Not found');
      }

      const columnas = campos.map(([c]) => c);
      const valores = campos.map(([, v]) => v);
      const marcadores = valores.map((_, i) => {
        const columna = columnas[i];
        return `$${i + 2}${columna === 'birth_date' ? '::date' : '::varchar'}`;
      });
      const asignaciones = columnas.map(
        (columna, i) => `${columna} = ${marcadores[i]}`,
      );

      await client.query(
        `INSERT INTO fom.user_profiles (user_id, ${columnas.join(', ')})
         VALUES ($1, ${marcadores.join(', ')})
         ON CONFLICT (user_id) DO UPDATE SET ${asignaciones.join(', ')}`,
        [userId, ...valores],
      );

      // Qué es un perfil completo NO lo decide este servicio: lo dice
      // `user_profiles_completion_check`, y son los CUATRO datos. La condición
      // se escribe aquí igual que allá a propósito — si se separan, la base
      // rechaza la fila y el error aparece en el sitio correcto.
      //
      // `coalesce` en vez de una fecha nueva, y nunca NULL: el trigger prohíbe
      // devolver a incompleto un perfil ya completo, y con razón. Que alguien
      // borre un campo no deshace que sus papeles se entregaron.
      const marcado = await client.query<Record<string, unknown>>(
        `UPDATE fom.user_profiles
            SET profile_completed_at = CASE
                  WHEN national_id IS NOT NULL AND phone IS NOT NULL
                   AND address IS NOT NULL AND birth_date IS NOT NULL
                  THEN coalesce(profile_completed_at, clock_timestamp())
                  ELSE profile_completed_at END
          WHERE user_id = $1
          RETURNING user_id AS "userId", national_id AS "nationalId", phone,
            address, birth_date::text AS "birthDate",
            (profile_completed_at IS NOT NULL) AS "profileComplete"`,
        [userId],
      );

      await this.audit(client, actor, {
        action: 'user_profile.update',
        entityType: 'user_profile',
        entityId: userId,
        changes: Object.fromEntries(campos),
      });
      await client.query('COMMIT');
      return { profile: marcado.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.translate(error, {
        user_profiles_national_id_check:
          'The national id must look like v-12345678',
        user_profiles_phone_check:
          'The phone must include the country code, like +584141234567',
        user_profiles_national_id_unique_idx:
          'That national id already belongs to someone else',
      });
    } finally {
      client.release();
    }
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
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      await this.lockIdentities(client, [actor.userId, userId]);
      const memberships = await client.query<{
        user_id: string;
        role: string;
        status: string;
      }>(
        `SELECT user_id, role, status FROM fom.tenant_memberships
          WHERE tenant_id = $1 AND user_id = ANY($2::uuid[])
          ORDER BY user_id
          FOR UPDATE`,
        [actor.tenantId, [actor.userId, userId]],
      );
      const actorMembership = memberships.rows.find(
        (row) => row.user_id === actor.userId,
      );
      const targetMembership = memberships.rows.find(
        (row) => row.user_id === userId,
      );
      if (!actorMembership || actorMembership.status !== 'active') {
        throw new ForbiddenException('Your membership is not active');
      }
      if (!targetMembership) {
        throw new NotFoundException('Not found');
      }
      const lockedActor = {
        ...actor,
        role: actorMembership.role as typeof actor.role,
      };
      requireCanManage(lockedActor, { userId, role: targetMembership.role });
      if (
        dto.role === 'supervisor' &&
        canonicalRole(actorMembership.role) !== 'admin_fom' &&
        !actor.platformAdmin
      ) {
        throw new ForbiddenException(
          'This action requires the FOM administrator',
        );
      }

      const antes = targetMembership;
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
            WHERE user_id = $1
              AND (tenant_id = $2 OR
                   (session_type = 'web' AND tenant_id IS NULL))
              AND revoked_at IS NULL
            RETURNING id`,
          [userId, actor.tenantId],
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
    const sessionToken = currentConsoleSessionToken();
    if (!sessionToken) {
      throw new UnauthorizedException('Console session required');
    }
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      await this.lockIdentities(client, [actor.userId, userId]);
      const memberships = await client.query<{
        user_id: string;
        role: string;
        status: string;
      }>(
        `SELECT user_id, role, status FROM fom.tenant_memberships
          WHERE tenant_id = $1 AND user_id = ANY($2::uuid[])
          ORDER BY user_id
          FOR UPDATE`,
        [actor.tenantId, [actor.userId, userId]],
      );
      const actorMembership = memberships.rows.find(
        (row) => row.user_id === actor.userId,
      );
      const targetMembership = memberships.rows.find(
        (row) => row.user_id === userId,
      );
      if (!actorMembership || actorMembership.status !== 'active') {
        throw new ForbiddenException('Your membership is not active');
      }
      if (!targetMembership || targetMembership.status !== 'active') {
        throw new NotFoundException('Not found');
      }
      const lockedActor = {
        ...actor,
        role: actorMembership.role as typeof actor.role,
      };
      requireCanManage(lockedActor, { userId, role: targetMembership.role });

      const passwordHash = await this.hasher.hashPassword(
        dto.temporaryPassword,
      );
      const hecho = await client.query<{ reset: boolean }>(
        `SELECT fom.reset_member_credential($1, $2, $3) AS "reset"`,
        [sessionToken, userId, passwordHash],
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

  // ==========================================================
  // EQUIPOS GPS
  // ==========================================================

  /**
   * Registrar un equipo en el inventario de la empresa.
   *
   * Es alta de activo, igual que la del vehículo, así que la firma el
   * administrador FOM por la misma razón: el equipo llega con una compra
   * detrás y su alta tiene que quedar atribuida.
   *
   * El IMEI es único en TODA la plataforma —el aparato es uno solo en el
   * mundo—, así que un IMEI repetido responde conflicto sin decir de qué
   * empresa es el otro: eso convertiría el endpoint en un buscador de flotas
   * ajenas.
   */
  async registerGpsDevice(dto: RegisterGpsDeviceDto) {
    const actor = requireFomAdminActor();
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const creado = await client.query<Record<string, unknown>>(
        `INSERT INTO fom.gps_devices
           (tenant_id, imei, manufacturer, model, protocol_family,
            serial_number, status)
         VALUES ($1, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
                 $6::varchar, coalesce($7::varchar, 'inventory'))
         RETURNING id, imei, manufacturer, model,
           protocol_family AS "protocolFamily",
           serial_number AS "serialNumber", status, created_at AS "createdAt"`,
        [
          actor.tenantId,
          dto.imei,
          dto.manufacturer ?? null,
          dto.model,
          dto.protocolFamily,
          dto.serialNumber ?? null,
          dto.status ?? null,
        ],
      );
      await this.audit(client, actor, {
        action: 'gps_device.register',
        entityType: 'gps_device',
        entityId: creado.rows[0].id as string,
        changes: { imei: dto.imei, model: dto.model },
      });
      await client.query('COMMIT');
      return { gpsDevice: creado.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.translate(error, {
        gps_devices_imei_unique_idx:
          'That IMEI is already registered on this platform',
      });
    } finally {
      client.release();
    }
  }

  /** Ajustes del equipo en inventario. El IMEI no se corrige a propósito. */
  async updateGpsDevice(deviceId: string, dto: UpdateGpsDeviceDto) {
    const actor = requireManagerActor();
    const campos: Array<[string, unknown]> = [];
    if (dto.status !== undefined) campos.push(['status', dto.status]);
    if (dto.manufacturer !== undefined) {
      campos.push(['manufacturer', dto.manufacturer]);
    }
    if (dto.serialNumber !== undefined) {
      campos.push(['serial_number', dto.serialNumber]);
    }
    if (campos.length === 0) {
      throw new BadRequestException('No changes were supplied');
    }

    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const asignaciones: string[] = [];
      const valores: unknown[] = [actor.tenantId, deviceId];
      for (const [columna, valor] of campos) {
        valores.push(valor);
        asignaciones.push(columna + ' = $' + valores.length + '::varchar');
      }
      const actualizado = await client.query<Record<string, unknown>>(
        `UPDATE fom.gps_devices
            SET ${asignaciones.join(', ')}
          WHERE tenant_id = $1 AND id = $2
          RETURNING id, imei, manufacturer, model,
            protocol_family AS "protocolFamily",
            serial_number AS "serialNumber", status`,
        valores,
      );
      if (actualizado.rows.length === 0) {
        throw new NotFoundException('Not found');
      }
      await this.audit(client, actor, {
        action: 'gps_device.update',
        entityType: 'gps_device',
        entityId: deviceId,
        changes: Object.fromEntries(campos),
      });
      await client.query('COMMIT');
      return { gpsDevice: actualizado.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.translate(error);
    } finally {
      client.release();
    }
  }

  /**
   * Instalar un equipo sobre una unidad.
   *
   * La base sostiene la regla que de verdad importa con dos índices únicos
   * parciales: un equipo no puede estar montado en dos unidades a la vez, ni
   * una unidad llevar dos equipos. Aquí se traduce ese choque a un mensaje
   * que se pueda leer, pero quien impide el disparate es la base — que es
   * donde tiene que estar, porque también hay instalaciones que entran por la
   * app de campo.
   */
  async installGpsDevice(deviceId: string, dto: InstallGpsDeviceDto) {
    const actor = requireManagerActor();
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const equipo = await client.query<{ status: string }>(
        `SELECT status FROM fom.gps_devices
          WHERE tenant_id = $1 AND id = $2
          FOR UPDATE`,
        [actor.tenantId, deviceId],
      );
      if (equipo.rows.length === 0) {
        throw new NotFoundException('Not found');
      }
      // Que el equipo EXISTA no lo hace instalable. Uno dado por perdido, en
      // mantenimiento o de baja no esta fisicamente disponible para montar, y
      // aceptarlo crearia una instalacion abierta contra un aparato que nadie
      // tiene en la mano — y con ella un vehiculo que parece rastreado y no
      // lo esta. Ese es el peor fallo posible en este dominio: no se nota
      // hasta que hace falta la posicion.
      const estado = equipo.rows[0].status;
      if (estado !== 'inventory') {
        throw new ConflictException(
          `A device in status ${estado} cannot be installed; only a device ` +
            `in inventory can`,
        );
      }
      await this.requireVehicle(client, actor.tenantId, dto.vehicleId);

      const instalada = await client.query<Record<string, unknown>>(
        `INSERT INTO fom.gps_device_assignments
           (tenant_id, gps_device_id, vehicle_id, installation_notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, gps_device_id AS "gpsDeviceId",
           vehicle_id AS "vehicleId", installed_at AS "installedAt"`,
        [actor.tenantId, deviceId, dto.vehicleId, dto.notes ?? null],
      );
      // El equipo montado pasa a activo: dejarlo en inventario haría que el
      // inventario mintiera sobre lo que hay en la gaveta. La fila viene
      // bloqueada desde el SELECT ... FOR UPDATE, así que entre la
      // comprobación y esto no cabe otra instalación.
      await client.query(
        `UPDATE fom.gps_devices SET status = 'active'
          WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, deviceId],
      );
      await this.audit(client, actor, {
        action: 'gps_device.install',
        entityType: 'gps_device_assignment',
        entityId: instalada.rows[0].id as string,
        changes: { gpsDeviceId: deviceId, vehicleId: dto.vehicleId },
      });
      await client.query('COMMIT');
      return { installation: instalada.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.translate(error, {
        gps_device_assignments_open_device_idx:
          'That device is already installed on a vehicle',
        gps_device_assignments_open_vehicle_idx:
          'That vehicle already has a device installed',
      });
    } finally {
      client.release();
    }
  }

  /**
   * Desmontar. La instalación NO se borra: se cierra con fecha, porque es lo
   * que explica de qué unidad venían las posiciones de hace tres meses.
   */
  async removeGpsInstallation(
    assignmentId: string,
    dto: RemoveGpsInstallationDto,
  ) {
    const actor = requireManagerActor();
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const cerrada = await client.query<Record<string, unknown>>(
        `UPDATE fom.gps_device_assignments
            SET removed_at = clock_timestamp(), removal_notes = $3
          WHERE tenant_id = $1 AND id = $2 AND removed_at IS NULL
          RETURNING id, gps_device_id AS "gpsDeviceId",
            vehicle_id AS "vehicleId", removed_at AS "removedAt"`,
        [actor.tenantId, assignmentId, dto.notes ?? null],
      );
      if (cerrada.rows.length === 0) {
        // Inexistente, ajena o ya cerrada responden igual: distinguirlas
        // diría si existe una instalación de otra empresa.
        throw new NotFoundException('Not found');
      }
      await client.query(
        `UPDATE fom.gps_devices SET status = 'inventory'
          WHERE tenant_id = $1 AND id = $2 AND status = 'active'`,
        [actor.tenantId, cerrada.rows[0].gpsDeviceId],
      );
      await this.audit(client, actor, {
        action: 'gps_device.remove',
        entityType: 'gps_device_assignment',
        entityId: assignmentId,
        changes: { vehicleId: cerrada.rows[0].vehicleId },
      });
      await client.query('COMMIT');
      return { installation: cerrada.rows[0] };
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

  /**
   * Serializa cambios que puedan crear, quitar o usar membresías de una
   * identidad. Un candado de fila no protege una membresía que todavía no
   * existe en otro tenant; este candado transaccional sí.
   */
  private async lockIdentities(
    client: PoolClient,
    userIds: string[],
  ): Promise<void> {
    for (const userId of [...new Set(userIds)].sort()) {
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1::text, 202))`,
        [userId],
      );
    }
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
