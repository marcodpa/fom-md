import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { currentActor } from '../authentication/actor-context';
import { DatabaseService } from '../database/database.service';
import type { PoolClient } from 'pg';
import type {
  CreateAlertRuleDto,
  CreateDocumentDto,
  CreateWorkOrderDto,
  ListQueryDto,
  TransitionWorkOrderDto,
  UpdateAlertRuleDto,
  UpdateDocumentDto,
} from './console.dto';
import { requireManagerActor } from './console-roles';

/**
 * Lecturas de operación y cumplimiento para `/api/v1/console`.
 *
 * Mismas reglas que `ConsoleFleetService`, y por las mismas razones: el tenant
 * sale del actor y de ningún otro sitio, y un recurso ajeno responde 404 con el
 * mismo mensaje que uno inexistente para no convertir el endpoint en un oráculo.
 *
 * Estas tablas existen desde los Issues #170 y #171 pero no tenían superficie
 * que las sirviera, así que los módulos de mantenimiento, inspecciones,
 * documentos y alertas de la consola seguían con datos de ejemplo.
 */
@Injectable()
export class ConsoleOperationsService {
  constructor(private readonly database: DatabaseService) {}

  private tenantId(): string {
    const actor = currentActor();
    if (!actor) {
      // Defensa en profundidad: sin actor no se sirve nada, aunque una ruta
      // llegue a montarse sin guard.
      throw new NotFoundException('Resource not found');
    }
    return actor.tenantId;
  }

  /**
   * Órdenes de trabajo.
   *
   * `status` se filtra contra el catálogo real de la base y no contra una lista
   * repetida aquí: el #170 dejó el catálogo en el dominio `work_order_status`
   * precisamente para que ampliarlo no obligue a tocar cinco sitios. Un estado
   * inválido devuelve lista vacía, no error: filtrar por algo que no existe no
   * es un fallo del cliente, es una búsqueda sin resultados.
   */
  async listWorkOrders(query: ListQueryDto & { status?: string; vehicleId?: string }) {
    const tenantId = this.tenantId();
    const result = await this.database.query(
      `
        SELECT
          work_order.id, work_order.status, work_order.kind,
          work_order.description, work_order.failure_type AS "failureType",
          work_order.location, work_order.resolution_note AS "resolutionNote",
          work_order.resolution_cost AS "resolutionCost",
          work_order.resolution_currency AS "resolutionCurrency",
          work_order.resolved_at AS "resolvedAt",
          work_order.status_changed_at AS "statusChangedAt",
          work_order.created_at AS "createdAt",
          work_order.vehicle_id AS "vehicleId",
          vehicle.code AS "vehicleCode", vehicle.plate AS "vehiclePlate",
          author.display_name AS "createdByName",
          count(*) OVER () AS "total"
        FROM fom.work_orders work_order
        JOIN fom.vehicles vehicle
          ON vehicle.tenant_id = work_order.tenant_id
         AND vehicle.id = work_order.vehicle_id
        LEFT JOIN fom.users author
          ON author.id = work_order.created_by_user_id
        WHERE work_order.tenant_id = $1
          AND ($2::text IS NULL OR work_order.status::text = $2)
          AND ($3::uuid IS NULL OR work_order.vehicle_id = $3)
        ORDER BY work_order.status_changed_at DESC, work_order.id DESC
        LIMIT $4 OFFSET $5
      `,
      [
        tenantId,
        query.status ?? null,
        query.vehicleId ?? null,
        query.limit,
        query.offset,
      ],
    );
    return this.page(result.rows, query, ['resolutionCost']);
  }

  /** Ficha de una orden con su historial completo, en orden de ocurrencia. */
  async getWorkOrder(workOrderId: string) {
    const tenantId = this.tenantId();
    const cabecera = await this.database.query(
      `
        SELECT
          work_order.id, work_order.status, work_order.kind,
          work_order.description, work_order.failure_type AS "failureType",
          work_order.location, work_order.resolution_note AS "resolutionNote",
          work_order.resolution_cost AS "resolutionCost",
          work_order.resolution_currency AS "resolutionCurrency",
          work_order.resolved_at AS "resolvedAt",
          work_order.created_at AS "createdAt",
          work_order.vehicle_id AS "vehicleId",
          vehicle.code AS "vehicleCode", vehicle.plate AS "vehiclePlate",
          author.display_name AS "createdByName"
        FROM fom.work_orders work_order
        JOIN fom.vehicles vehicle
          ON vehicle.tenant_id = work_order.tenant_id
         AND vehicle.id = work_order.vehicle_id
        LEFT JOIN fom.users author
          ON author.id = work_order.created_by_user_id
        WHERE work_order.tenant_id = $1 AND work_order.id = $2
      `,
      [tenantId, workOrderId],
    );
    const row = cabecera.rows[0];
    if (!row) {
      throw new NotFoundException('Work order not found');
    }

    // El historial se pide DESPUÉS de comprobar la orden. Consultarlo antes
    // permitiría medir por el tiempo de respuesta si una orden ajena existe.
    const historial = await this.database.query(
      `
        SELECT
          event.sequence_number AS "sequence",
          event.from_status AS "fromStatus",
          event.to_status AS "toStatus",
          event.note, event.occurred_at AS "occurredAt",
          actor.display_name AS "actorName"
        FROM fom.work_order_events event
        LEFT JOIN fom.users actor ON actor.id = event.actor_user_id
        WHERE event.tenant_id = $1 AND event.work_order_id = $2
        ORDER BY event.sequence_number
      `,
      [tenantId, workOrderId],
    );

    return {
      workOrder: this.decimals(row, ['resolutionCost']),
      events: historial.rows,
    };
  }

  /**
   * Cambia el estado bajo lock y deja que la base escriba el evento. La
   * transición se valida aquí para responder 409 con claridad y vuelve a ser
   * validada por el trigger: ninguna otra entrada puede saltarse la máquina.
   */
  /**
   * Levantar una orden desde la consola.
   *
   * La diferencia con `reportFailure` de la app no es de forma sino de
   * autoridad: el conductor solo abre órdenes sobre la unidad que tiene
   * asignada, mientras que un supervisor las abre sobre cualquier unidad de su
   * empresa. Por eso aquí NO se exige asignación —sería exigirle al supervisor
   * que se asigne a sí mismo el carro para poder reportarlo— y en cambio se
   * exige rol de gestor, que es la condición verdadera.
   *
   * `author_via` queda nulo a propósito: esa columna dice «lo abrió el
   * conductor principal o el secundario», y quien abre desde la consola no lo
   * hace en ninguno de esos dos papeles. Rellenarla con el rol de consola
   * ensuciaría la única señal que distingue el reporte de campo.
   *
   * La unidad se comprueba dentro de la MISMA transacción que inserta. Si se
   * comprobara antes y por separado, entre las dos consultas cabría el borrado
   * o el traslado de la unidad; la clave foránea compuesta `(tenant_id,
   * vehicle_id)` es la que de verdad cierra esa puerta, y la consulta previa
   * existe solo para poder responder 404 en vez de un error de integridad.
   */
  async createWorkOrder(dto: CreateWorkOrderDto) {
    const actor = requireManagerActor();
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const unidad = await client.query(
        `SELECT 1 FROM fom.vehicles WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, dto.vehicleId],
      );
      if (unidad.rows.length === 0) {
        // Ajena e inexistente responden igual: si se distinguieran, este
        // endpoint diría qué unidades tiene la empresa de al lado.
        throw new NotFoundException('Vehicle not found');
      }

      // `last_status_actor_user_id` se rellena en la creacion porque el
      // trigger `record_work_order_event` escribe el evento de nacimiento
      // (from_status NULL -> abierta) tomando el actor DE ESA COLUMNA. Sin
      // ella el histórico abre con un «alguien la abrió» anónimo, y el
      // histórico existe justamente para que nunca diga eso.
      const creada = await client.query<Record<string, unknown>>(
        `INSERT INTO fom.work_orders
           (tenant_id, vehicle_id, created_by_user_id,
            last_status_actor_user_id, kind,
            description, failure_type, location)
         VALUES ($1, $2, $3, $3, $4::varchar, $5::varchar, $6::varchar,
                 $7::varchar)
         RETURNING id, status::text AS status, kind,
           description, failure_type AS "failureType", location,
           vehicle_id AS "vehicleId", created_at AS "createdAt",
           status_changed_at AS "statusChangedAt"`,
        [
          actor.tenantId,
          dto.vehicleId,
          actor.userId,
          dto.kind ?? 'correctiva',
          dto.description,
          dto.failureType ?? null,
          dto.location ?? null,
        ],
      );
      await client.query('COMMIT');
      return { workOrder: creada.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException) throw error;
      const databaseError = error as { code?: string; constraint?: string };
      // La base vuelve a validar lo que el DTO ya validó. Que el mensaje
      // nombre la restricción evita el diagnóstico a ciegas cuando el
      // contrato y el esquema se separen.
      if (databaseError.code === '23514') {
        throw new BadRequestException(
          `Work order rejected by the database check ` +
            `${databaseError.constraint ?? 'constraint'}`,
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async transitionWorkOrder(
    workOrderId: string,
    dto: TransitionWorkOrderDto,
  ) {
    const actor = requireManagerActor();
    if (dto.expectedStatus === dto.status) {
      throw new ConflictException('Work order is already in that status');
    }
    if (dto.status === 'cerrada') {
      if (!dto.resolutionNote) {
        throw new BadRequestException(
          'resolutionNote is required when closing a work order',
        );
      }
      const hasCost = dto.resolutionCost !== undefined;
      const hasCurrency = dto.resolutionCurrency !== undefined;
      if (hasCost !== hasCurrency) {
        throw new BadRequestException(
          'resolutionCost and resolutionCurrency must be supplied together',
        );
      }
    } else if (
      dto.resolutionNote !== undefined ||
      dto.resolutionCost !== undefined ||
      dto.resolutionCurrency !== undefined
    ) {
      throw new BadRequestException(
        'Resolution fields are accepted only when closing a work order',
      );
    }

    const allowed: Record<string, ReadonlySet<string>> = {
      abierta: new Set(['en_revision', 'cerrada', 'cancelada']),
      en_revision: new Set(['abierta', 'aprobada', 'cerrada', 'cancelada']),
      aprobada: new Set(['en_revision', 'cerrada', 'cancelada']),
      cerrada: new Set(['en_revision']),
      cancelada: new Set(),
    };
    if (!allowed[dto.expectedStatus]?.has(dto.status)) {
      throw new ConflictException('Invalid work order status transition');
    }

    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const current = await client.query<{ status: string }>(
        `SELECT status::text AS status FROM fom.work_orders
          WHERE tenant_id = $1 AND id = $2
          FOR UPDATE`,
        [actor.tenantId, workOrderId],
      );
      if (current.rows.length === 0) {
        throw new NotFoundException('Work order not found');
      }
      if (current.rows[0].status !== dto.expectedStatus) {
        throw new ConflictException('Work order state changed; reload it');
      }

      const updated = await client.query<Record<string, unknown>>(
        `UPDATE fom.work_orders
            SET status = $3::fom.work_order_status,
                last_status_actor_user_id = $4,
                last_status_note = $5,
                resolution_note = CASE WHEN $3 = 'cerrada'
                  THEN $6 ELSE resolution_note END,
                resolution_cost = CASE WHEN $3 = 'cerrada'
                  THEN $7::numeric ELSE resolution_cost END,
                resolution_currency = CASE WHEN $3 = 'cerrada'
                  THEN $8::char(3) ELSE resolution_currency END
          WHERE tenant_id = $1 AND id = $2
          RETURNING id, status::text AS status,
            resolution_note AS "resolutionNote",
            resolution_cost AS "resolutionCost",
            resolution_currency AS "resolutionCurrency",
            resolved_at AS "resolvedAt",
            status_changed_at AS "statusChangedAt"`,
        [
          actor.tenantId,
          workOrderId,
          dto.status,
          actor.userId,
          dto.note,
          dto.resolutionNote ?? null,
          dto.resolutionCost ?? null,
          dto.resolutionCurrency ?? null,
        ],
      );
      const event = await this.lastWorkOrderEvent(
        client,
        actor.tenantId,
        workOrderId,
      );
      await client.query('COMMIT');
      return {
        workOrder: this.decimals(updated.rows[0], ['resolutionCost']),
        event,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const databaseError = error as { code?: string };
      if (databaseError.code === '23514') {
        throw new ConflictException('Invalid work order status transition');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // ==========================================================
  // AVISOS
  // ==========================================================

  /**
   * Dar un aviso por visto.
   *
   * `read_at` es de la EMPRESA, no de cada persona: la tabla no tiene columna
   * de lector. Es coherente con lo que el aviso significa —«esto de la flota
   * está pendiente»— y con que darlo por visto sea una decisión de quien
   * atiende, no una marca privada. Conviene saberlo antes de usarlo: si un
   * supervisor lo marca, deja de aparecerle a sus compañeros.
   *
   * Marcar dos veces no es un error, pero la fecha se conserva: el segundo
   * intento no reescribe la hora en que de verdad se atendió.
   */
  async markNotificationRead(notificationId: string) {
    const actor = requireManagerActor();
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const marcada = await client.query<Record<string, unknown>>(
        `UPDATE fom.notifications
            SET read_at = coalesce(read_at, clock_timestamp())
          WHERE tenant_id = $1 AND id = $2
          RETURNING id, read_at AS "readAt",
            (read_at IS NULL) AS "eraNuevo"`,
        [actor.tenantId, notificationId],
      );
      if (marcada.rows.length === 0) {
        throw new NotFoundException('Notification not found');
      }
      // La auditoria va en la MISMA transaccion que el cambio. Separarlas
      // permitiria que el aviso quede oculto y el registro de quien lo
      // ocultó no llegue nunca — que es justo el caso en el que hace falta.
      await this.audit(client, actor, {
        action: 'notification.read',
        entityType: 'notification',
        entityId: notificationId,
        changes: { notificationIds: [notificationId] },
      });
      await client.query('COMMIT');
      return { notification: marcada.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.traducirEscritura(error);
    } finally {
      client.release();
    }
  }

  /**
   * Dar por vistos todos los pendientes de la empresa de una vez.
   *
   * Se audita como UNA accion con la lista de lo que alcanzo, no una entrada
   * por aviso: la decision fue una sola, y cien entradas identicas esconden
   * las demas en vez de explicar nada. La lista va en los cambios para que se
   * pueda saber exactamente que dejo de verse.
   */
  async markAllNotificationsRead() {
    const actor = requireManagerActor();
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const marcadas = await client.query<{ id: string }>(
        `UPDATE fom.notifications
            SET read_at = clock_timestamp()
          WHERE tenant_id = $1 AND read_at IS NULL
          RETURNING id`,
        [actor.tenantId],
      );
      const ids = marcadas.rows.map((fila) => fila.id);
      if (ids.length > 0) {
        await this.audit(client, actor, {
          action: 'notification.read_all',
          entityType: 'notification',
          // La entrada se ancla al PRIMER aviso alcanzado: `entity_id` es
          // obligatorio y no existe un identificador del lote. La lista
          // completa viaja en los cambios.
          entityId: ids[0],
          changes: { markedCount: ids.length, notificationIds: ids },
        });
      }
      await client.query('COMMIT');
      return { markedCount: ids.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.traducirEscritura(error);
    } finally {
      client.release();
    }
  }

  // ==========================================================
  // DOCUMENTOS
  // ==========================================================

  /**
   * Alta de documento.
   *
   * El titular se comprueba AQUÍ, dentro de la transacción, para poder
   * responder 404 en vez de un error de integridad: la clave foránea compuesta
   * ya impide el documento de un vehículo ajeno, pero su mensaje no sirve para
   * enseñárselo a nadie.
   */
  async createDocument(dto: CreateDocumentDto) {
    const actor = requireManagerActor();
    if (dto.scope === 'vehiculo' && !dto.vehicleId) {
      throw new BadRequestException(
        'vehicleId is required when scope is vehiculo',
      );
    }
    if (dto.scope === 'persona' && !dto.holderUserId) {
      throw new BadRequestException(
        'holderUserId is required when scope is persona',
      );
    }
    if (dto.scope === 'vehiculo' && dto.holderUserId) {
      throw new BadRequestException(
        'A vehicle document cannot have a person as holder',
      );
    }
    if (dto.scope === 'persona' && dto.vehicleId) {
      throw new BadRequestException(
        'A person document cannot have a vehicle as holder',
      );
    }

    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      if (dto.vehicleId) {
        const unidad = await client.query(
          `SELECT 1 FROM fom.vehicles WHERE tenant_id = $1 AND id = $2`,
          [actor.tenantId, dto.vehicleId],
        );
        if (unidad.rows.length === 0) {
          throw new NotFoundException('Vehicle not found');
        }
      }
      if (dto.holderUserId) {
        const persona = await client.query(
          `SELECT 1 FROM fom.tenant_memberships
            WHERE tenant_id = $1 AND user_id = $2`,
          [actor.tenantId, dto.holderUserId],
        );
        if (persona.rows.length === 0) {
          throw new NotFoundException('Person not found');
        }
      }

      const creado = await client.query<Record<string, unknown>>(
        `INSERT INTO fom.documents
           (tenant_id, scope, vehicle_id, holder_user_id, document_type,
            document_number, issued_on, expires_on, notes, created_by_user_id)
         VALUES ($1, $2::varchar, $3, $4, $5::varchar, $6::varchar,
                 $7::date, $8::date, $9::varchar, $10)
         RETURNING id, scope, document_type AS "documentType",
           document_number AS "documentNumber",
           issued_on::text AS "issuedOn", expires_on::text AS "expiresOn",
           status, notes,
           vehicle_id AS "vehicleId", holder_user_id AS "holderUserId",
           created_at AS "createdAt"`,
        [
          actor.tenantId,
          dto.scope,
          dto.vehicleId ?? null,
          dto.holderUserId ?? null,
          dto.documentType,
          dto.documentNumber ?? null,
          dto.issuedOn ?? null,
          dto.expiresOn,
          dto.notes ?? null,
          actor.userId,
        ],
      );
      await this.audit(client, actor, {
        action: 'document.create',
        entityType: 'document',
        entityId: creado.rows[0].id as string,
        changes: {
          scope: dto.scope,
          documentType: dto.documentType,
          expiresOn: dto.expiresOn,
        },
      });
      await client.query('COMMIT');
      return { document: creado.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.traducirEscritura(error);
    } finally {
      client.release();
    }
  }

  /**
   * Corregir un documento, o archivarlo.
   *
   * Archivar NO borra: el documento vencido de ayer es lo que explica la multa
   * de mañana. El estado y su fecha se mueven juntos porque la base exige que
   * vayan juntos, y dejarlo en manos de quien llama sería dejar abierta la
   * puerta a un archivado sin fecha.
   */
  async updateDocument(documentId: string, dto: UpdateDocumentDto) {
    const actor = requireManagerActor();
    const campos: Array<[string, unknown]> = [];
    if (dto.documentNumber !== undefined) {
      campos.push(['document_number', dto.documentNumber]);
    }
    if (dto.issuedOn !== undefined) campos.push(['issued_on', dto.issuedOn]);
    if (dto.expiresOn !== undefined) campos.push(['expires_on', dto.expiresOn]);
    if (dto.notes !== undefined) campos.push(['notes', dto.notes]);
    if (dto.status !== undefined) campos.push(['status', dto.status]);
    if (campos.length === 0) {
      throw new BadRequestException('No changes were supplied');
    }

    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const asignaciones: string[] = [];
      const valores: unknown[] = [actor.tenantId, documentId];
      for (const [columna, valor] of campos) {
        valores.push(valor);
        const tipo =
          columna === 'issued_on' || columna === 'expires_on'
            ? '::date'
            : '::varchar';
        asignaciones.push(columna + ' = $' + valores.length + tipo);
      }
      if (dto.status !== undefined) {
        asignaciones.push(
          dto.status === 'archived'
            ? 'archived_at = coalesce(archived_at, clock_timestamp())'
            : 'archived_at = NULL',
        );
      }

      const actualizado = await client.query<Record<string, unknown>>(
        `UPDATE fom.documents
            SET ${asignaciones.join(', ')}
          WHERE tenant_id = $1 AND id = $2
          RETURNING id, scope, document_type AS "documentType",
            document_number AS "documentNumber",
            issued_on::text AS "issuedOn", expires_on::text AS "expiresOn",
            status, notes,
            archived_at AS "archivedAt"`,
        valores,
      );
      if (actualizado.rows.length === 0) {
        throw new NotFoundException('Document not found');
      }
      await this.audit(client, actor, {
        action: 'document.update',
        entityType: 'document',
        entityId: documentId,
        changes: Object.fromEntries(campos),
      });
      await client.query('COMMIT');
      return { document: actualizado.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.traducirEscritura(error);
    } finally {
      client.release();
    }
  }

  // ==========================================================
  // REGLAS DE ALERTA
  // ==========================================================

  /**
   * Alta de regla.
   *
   * Cada tipo lleva su umbral y solo el suyo. Se comprueba aquí para dar un
   * mensaje que se pueda leer, y la base lo vuelve a comprobar en las dos
   * direcciones: si algún día este contrato se relaja por descuido, la regla
   * incoherente sigue sin poder guardarse.
   */
  async createAlertRule(dto: CreateAlertRuleDto) {
    const actor = requireManagerActor();
    if (dto.ruleType === 'velocidad') {
      if (dto.thresholdKph === undefined) {
        throw new BadRequestException(
          'thresholdKph is required for a velocidad rule',
        );
      }
      if (dto.thresholdKm !== undefined || dto.serviceName !== undefined) {
        throw new BadRequestException(
          'A velocidad rule takes no thresholdKm or serviceName',
        );
      }
    } else {
      if (dto.thresholdKm === undefined || dto.serviceName === undefined) {
        throw new BadRequestException(
          'thresholdKm and serviceName are required for a mantenimiento rule',
        );
      }
      if (dto.thresholdKph !== undefined) {
        throw new BadRequestException(
          'A mantenimiento rule takes no thresholdKph',
        );
      }
    }

    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const creada = await client.query<Record<string, unknown>>(
        `INSERT INTO fom.alert_rules
           (tenant_id, rule_type, threshold_kph, threshold_km, service_name,
            is_active, created_by_user_id)
         VALUES ($1, $2::varchar, $3::smallint, $4::integer, $5::varchar,
                 coalesce($6::boolean, true), $7)
         RETURNING id, rule_type AS "ruleType",
           threshold_kph AS "thresholdKph", threshold_km AS "thresholdKm",
           service_name AS "serviceName", is_active AS "isActive",
           created_at AS "createdAt"`,
        [
          actor.tenantId,
          dto.ruleType,
          dto.thresholdKph ?? null,
          dto.thresholdKm ?? null,
          dto.serviceName ?? null,
          dto.isActive ?? null,
          actor.userId,
        ],
      );
      await this.audit(client, actor, {
        action: 'alert_rule.create',
        entityType: 'alert_rule',
        entityId: creada.rows[0].id as string,
        changes: { ruleType: dto.ruleType },
      });
      await client.query('COMMIT');
      return { alertRule: creada.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.traducirEscritura(error);
    } finally {
      client.release();
    }
  }

  /**
   * Ajustar una regla. El TIPO no se cambia y no está en el contrato: una
   * regla de velocidad convertida en una de mantenimiento dejaría huérfanas
   * las unidades que tiene asignadas, que apuntan al tipo con una clave de
   * tres columnas. Para cambiar de tipo se desactiva y se crea otra.
   */
  async updateAlertRule(alertRuleId: string, dto: UpdateAlertRuleDto) {
    const actor = requireManagerActor();
    const campos: Array<[string, unknown]> = [];
    if (dto.thresholdKph !== undefined) {
      campos.push(['threshold_kph', dto.thresholdKph]);
    }
    if (dto.thresholdKm !== undefined) {
      campos.push(['threshold_km', dto.thresholdKm]);
    }
    if (dto.serviceName !== undefined) {
      campos.push(['service_name', dto.serviceName]);
    }
    if (dto.isActive !== undefined) campos.push(['is_active', dto.isActive]);
    if (campos.length === 0) {
      throw new BadRequestException('No changes were supplied');
    }

    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const asignaciones: string[] = [];
      const valores: unknown[] = [actor.tenantId, alertRuleId];
      for (const [columna, valor] of campos) {
        valores.push(valor);
        const tipo =
          columna === 'threshold_kph'
            ? '::smallint'
            : columna === 'threshold_km'
              ? '::integer'
              : columna === 'is_active'
                ? '::boolean'
                : '::varchar';
        asignaciones.push(columna + ' = $' + valores.length + tipo);
      }
      const actualizada = await client.query<Record<string, unknown>>(
        `UPDATE fom.alert_rules
            SET ${asignaciones.join(', ')}
          WHERE tenant_id = $1 AND id = $2
          RETURNING id, rule_type AS "ruleType",
            threshold_kph AS "thresholdKph", threshold_km AS "thresholdKm",
            service_name AS "serviceName", is_active AS "isActive"`,
        valores,
      );
      if (actualizada.rows.length === 0) {
        throw new NotFoundException('Alert rule not found');
      }
      await this.audit(client, actor, {
        action: 'alert_rule.update',
        entityType: 'alert_rule',
        entityId: alertRuleId,
        changes: Object.fromEntries(campos),
      });
      await client.query('COMMIT');
      return { alertRule: actualizada.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw this.traducirEscritura(error);
    } finally {
      client.release();
    }
  }

  /**
   * La auditoría se escribe donde el actor ES miembro, que es su propio ente.
   * La clave foránea `(tenant_id, actor_user_id)` lo exige, y con razón: una
   * entrada firmada por alguien que no pertenece al ente no es auditoría.
   *
   * `actor_db_role` no se escribe: lo captura el disparador de la tabla, del
   * lado del servidor — la aplicación ni siquiera tiene el permiso de esa
   * columna, a propósito.
   */
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
   * Las restricciones de la base vuelven a comprobar lo que el contrato ya
   * validó. Que el mensaje nombre la restricción evita el diagnóstico a
   * ciegas cuando el contrato y el esquema se separen.
   */
  private traducirEscritura(error: unknown): unknown {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException
    ) {
      return error;
    }
    const pg = error as { code?: string; constraint?: string };
    if (pg.code === '23514') {
      return new BadRequestException(
        `Rejected by the database check ${pg.constraint ?? 'constraint'}`,
      );
    }
    if (pg.code === '23503') {
      return new NotFoundException('Referenced record not found');
    }
    if (pg.code === '23505') {
      return new ConflictException('That record already exists');
    }
    return error;
  }

  private async lastWorkOrderEvent(
    client: PoolClient,
    tenantId: string,
    workOrderId: string,
  ) {
    const result = await client.query(
      `SELECT sequence_number AS "sequence",
              from_status AS "fromStatus", to_status AS "toStatus",
              note, occurred_at AS "occurredAt"
         FROM fom.work_order_events
        WHERE tenant_id = $1 AND work_order_id = $2
        ORDER BY sequence_number DESC
        LIMIT 1`,
      [tenantId, workOrderId],
    );
    return result.rows[0];
  }

  async listInspections(query: ListQueryDto & { vehicleId?: string }) {
    const tenantId = this.tenantId();
    const result = await this.database.query(
      `
        SELECT
          inspection.id, inspection.result,
          inspection.inspection_date::text AS "inspectionDate",
          inspection.location, inspection.submitted_at AS "submittedAt",
          inspection.vehicle_id AS "vehicleId",
          vehicle.code AS "vehicleCode", vehicle.plate AS "vehiclePlate",
          driver.display_name AS "driverName",
          template.name AS "templateName",
          count(*) OVER () AS "total"
        FROM fom.inspections inspection
        JOIN fom.vehicles vehicle
          ON vehicle.tenant_id = inspection.tenant_id
         AND vehicle.id = inspection.vehicle_id
        JOIN fom.inspection_templates template
          ON template.tenant_id = inspection.tenant_id
         AND template.id = inspection.template_id
        LEFT JOIN fom.users driver ON driver.id = inspection.driver_user_id
        WHERE inspection.tenant_id = $1
          AND ($2::uuid IS NULL OR inspection.vehicle_id = $2)
        ORDER BY inspection.inspection_date DESC, inspection.id DESC
        LIMIT $3 OFFSET $4
      `,
      [tenantId, query.vehicleId ?? null, query.limit, query.offset],
    );
    return this.page(result.rows, query);
  }

  /**
   * Documentos con vencimiento.
   *
   * `daysToExpiry` se calcula en la base y no en el navegador: el reloj del
   * cliente puede estar en otra zona o simplemente mal, y un documento vencido
   * que aparece vigente por un huso horario es exactamente el fallo que este
   * módulo existe para evitar.
   */
  async listDocuments(query: ListQueryDto & { vehicleId?: string }) {
    const tenantId = this.tenantId();
    const result = await this.database.query(
      `
        SELECT
          document.id, document.scope, document.document_type AS "documentType",
          document.document_number AS "documentNumber",
          document.issued_on::text AS "issuedOn",
          document.expires_on::text AS "expiresOn",
          document.status, document.notes,
          document.expires_on - CURRENT_DATE AS "daysToExpiry",
          document.vehicle_id AS "vehicleId",
          vehicle.code AS "vehicleCode", vehicle.plate AS "vehiclePlate",
          count(file.id) AS "fileCount",
          count(*) OVER () AS "total"
        FROM fom.documents document
        LEFT JOIN fom.vehicles vehicle
          ON vehicle.tenant_id = document.tenant_id
         AND vehicle.id = document.vehicle_id
        LEFT JOIN fom.document_files file
          ON file.tenant_id = document.tenant_id
         AND file.document_id = document.id
        WHERE document.tenant_id = $1
          AND ($2::uuid IS NULL OR document.vehicle_id = $2)
        GROUP BY document.id, vehicle.code, vehicle.plate
        ORDER BY document.expires_on
        LIMIT $3 OFFSET $4
      `,
      [tenantId, query.vehicleId ?? null, query.limit, query.offset],
    );
    // `storage_key` NO sale. Es una ruta interna del almacén: publicarla daría
    // la forma del bucket sin aportar nada al expediente. Servir un archivo
    // será un endpoint propio que construya la dirección al momento.
    return this.page(
      result.rows.map((row) => ({
        ...row,
        fileCount: Number((row as { fileCount: string }).fileCount),
      })),
      query,
    );
  }

  async listAlertRules(query: ListQueryDto) {
    const tenantId = this.tenantId();
    const result = await this.database.query(
      `
        SELECT
          rule.id, rule.rule_type AS "ruleType",
          rule.threshold_kph AS "thresholdKph",
          rule.threshold_km AS "thresholdKm",
          rule.service_name AS "serviceName",
          rule.is_active AS "isActive",
          rule.created_at AS "createdAt",
          count(target.vehicle_id) AS "vehicleCount",
          count(*) OVER () AS "total"
        FROM fom.alert_rules rule
        LEFT JOIN fom.alert_rule_vehicles target
          ON target.tenant_id = rule.tenant_id AND target.alert_rule_id = rule.id
        WHERE rule.tenant_id = $1
        GROUP BY rule.id
        ORDER BY rule.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [tenantId, query.limit, query.offset],
    );
    return this.page(
      result.rows.map((row) => ({
        ...row,
        vehicleCount: Number((row as { vehicleCount: string }).vehicleCount),
      })),
      query,
    );
  }

  /** Avisos. Los no leídos primero: es el orden en que se atienden. */
  async listNotifications(query: ListQueryDto & { unreadOnly?: boolean }) {
    const tenantId = this.tenantId();
    const result = await this.database.query(
      `
        SELECT
          notification.id,
          notification.notification_type AS "notificationType",
          notification.title, notification.detail,
          notification.work_order_id AS "workOrderId",
          notification.read_at AS "readAt",
          notification.created_at AS "createdAt",
          count(*) OVER () AS "total"
        FROM fom.notifications notification
        WHERE notification.tenant_id = $1
          AND ($2::boolean IS NOT TRUE OR notification.read_at IS NULL)
        ORDER BY
          (notification.read_at IS NULL) DESC,
          notification.created_at DESC
        LIMIT $3 OFFSET $4
      `,
      [tenantId, query.unreadOnly ?? null, query.limit, query.offset],
    );
    return this.page(result.rows, query);
  }

  /**
   * Contadores del resumen, en una sola consulta.
   *
   * Cinco consultas separadas darían cinco fotos de instantes distintos, y un
   * panel donde las órdenes abiertas y las cerradas no suman el total es un
   * panel en el que se deja de confiar.
   */
  async summary() {
    const tenantId = this.tenantId();
    const result = await this.database.query(
      `
        SELECT
          (SELECT count(*) FROM fom.work_orders
            WHERE tenant_id = $1 AND status = 'abierta') AS "odtAbiertas",
          (SELECT count(*) FROM fom.work_orders
            WHERE tenant_id = $1 AND status = 'en_revision') AS "odtEnRevision",
          (SELECT count(*) FROM fom.work_orders
            WHERE tenant_id = $1 AND status = 'cerrada') AS "odtCerradas",
          (SELECT count(*) FROM fom.inspections
            WHERE tenant_id = $1 AND inspection_date = CURRENT_DATE)
            AS "inspeccionesHoy",
          (SELECT count(*) FROM fom.inspections
            WHERE tenant_id = $1 AND result = 'pendiente')
            AS "inspeccionesPendientes",
          (SELECT count(*) FROM fom.documents
            WHERE tenant_id = $1 AND status = 'active'
              AND expires_on < CURRENT_DATE) AS "docsVencidos",
          (SELECT count(*) FROM fom.documents
            WHERE tenant_id = $1 AND status = 'active'
              AND expires_on >= CURRENT_DATE
              AND expires_on <= CURRENT_DATE + 30) AS "docsPorVencer",
          (SELECT count(*) FROM fom.notifications
            WHERE tenant_id = $1 AND read_at IS NULL) AS "alertasSinLeer"
      `,
      [tenantId],
    );
    // Una consulta de agregados sin FROM siempre devuelve una fila, pero el
    // servicio no debe depender de esa sutileza: un resultado vacio son ceros,
    // no una excepcion.
    const row = (result.rows[0] ?? {}) as Record<string, string>;
    const numeros: Record<string, number> = {};
    for (const [clave, valor] of Object.entries(row)) {
      numeros[clave] = Number(valor);
    }
    return numeros;
  }

  /** `numeric` vuelve como cadena; se expone como número o `null`. */
  private decimals(row: Record<string, unknown>, claves: string[]) {
    const out = { ...row };
    for (const clave of claves) {
      const valor = out[clave];
      out[clave] = typeof valor === 'string' ? Number(valor) : (valor ?? null);
    }
    return out;
  }

  private page(
    rows: Record<string, unknown>[],
    query: ListQueryDto,
    decimales: string[] = [],
  ) {
    const total = rows.length > 0 ? Number(rows[0]!['total']) : 0;
    const items = rows.map((row) => {
      const { total: _descartado, ...resto } = row;
      return decimales.length > 0 ? this.decimals(resto, decimales) : resto;
    });
    return {
      items,
      page: {
        limit: query.limit,
        offset: query.offset,
        count: items.length,
        total,
      },
    };
  }
}
