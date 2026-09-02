import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  RecordOdometerDto,
  ReportFailureDto,
  SubmitInspectionDto,
} from './mobile-field.dto';
import { MobileMutationReceiptService } from './mobile-mutation-receipt.service';

/**
 * Lo que la aplicación de campo ESCRIBE: reportar una falla, entregar la
 * inspección diaria y anotar el odómetro (FOM-02 §4).
 *
 * QUIÉN PUEDE ESCRIBIR SOBRE UNA UNIDAD. No es el rol: es la ASIGNACIÓN
 * vigente. Conducir no es una condición de la persona sino un hecho con
 * vehículo y fechas, y vive en `vehicle_driver_assignments`. Por eso aquí se
 * pregunta «¿esta persona tiene hoy esta unidad?» y no «¿de qué rol es?».
 * El conductor secundario que entró por PIN escribe igual que el principal, y
 * su rol queda anotado en `author_via`, que es justo lo que la especificación
 * pide poder distinguir después.
 *
 * Un gestor del ente también puede reportar una falla —a veces la reporta el
 * supervisor— y entonces `author_via` queda nulo: no condujo, y decir que sí
 * sería inventar un hecho. La inspección diaria, en cambio, exige asignación:
 * es un acto del conductor sobre la unidad que va a manejar.
 *
 * El vehículo llega por la RUTA y el actor por el token. El cuerpo no puede
 * nombrar ni la empresa ni al autor.
 */

type Actor = { userId: string; tenantId: string; role?: string };
type Vinculo = {
  role: 'principal' | 'secundario' | null;
  vehicleType: string;
};

const ROLES_GESTORES = new Set(['admin_fom', 'supervisor']);
const ROL_CANONICO: Record<string, string> = {
  owner: 'supervisor',
  administrator: 'supervisor',
  fleet_manager: 'supervisor',
  operator: 'operator',
  viewer: 'usuario',
};

@Injectable()
export class MobileFieldService {
  constructor(
    private readonly database: DatabaseService,
    private readonly receipts: MobileMutationReceiptService,
  ) {}

  /**
   * Catálogo que el teléfono necesita ANTES de entregar una inspección.
   * Reutiliza la misma comprobación de asignación y el mismo filtro por tipo
   * de vehículo que `submitInspection`, de modo que la app nunca reciba un
   * ítem que después el servidor rechace ni omita uno que vaya a exigir.
   */
  async listInspectionTemplates(actor: Actor, vehicleId: string) {
    const client = await this.database.getPool().connect();
    try {
      await client.query('BEGIN');
      const { vehicleType } = await this.vinculo(
        client,
        actor,
        vehicleId,
        true,
      );
      const result = await client.query<{
        template_id: string;
        template_code: string;
        template_version: number;
        template_name: string;
        template_description: string | null;
        item_id: string;
        item_code: string;
        item_category: string;
        item_name: string;
        item_is_critical: boolean;
        item_help_text: string | null;
        item_display_order: number;
      }>(
        `SELECT
           template.id AS template_id, template.code AS template_code,
           template.version AS template_version,
           template.name AS template_name,
           template.description AS template_description,
           item.id AS item_id, item.code AS item_code,
           item.category AS item_category, item.name AS item_name,
           item.is_critical AS item_is_critical,
           item.help_text AS item_help_text,
           item.display_order AS item_display_order
         FROM fom.inspection_templates template
         JOIN fom.inspection_template_items item
           ON item.tenant_id = template.tenant_id
          AND item.template_id = template.id
        WHERE template.tenant_id = $1
          AND template.status = 'publicada'
          AND (item.vehicle_types = '[]'::jsonb OR item.vehicle_types ? $2)
        ORDER BY template.code, template.version DESC, template.id,
                 item.display_order, item.id`,
        [actor.tenantId, vehicleType],
      );
      const templates = new Map<
        string,
        {
          id: string;
          code: string;
          version: number;
          name: string;
          description: string | null;
          items: Array<Record<string, unknown>>;
        }
      >();
      for (const row of result.rows) {
        let template = templates.get(row.template_id);
        if (!template) {
          template = {
            id: row.template_id,
            code: row.template_code,
            version: row.template_version,
            name: row.template_name,
            description: row.template_description,
            items: [],
          };
          templates.set(row.template_id, template);
        }
        template.items.push({
          id: row.item_id,
          code: row.item_code,
          category: row.item_category,
          name: row.item_name,
          isCritical: row.item_is_critical,
          helpText: row.item_help_text,
          displayOrder: row.item_display_order,
        });
      }
      await client.query('COMMIT');
      return { items: [...templates.values()] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Resuelve el vínculo del actor con la unidad. Devuelve el rol de su
   * asignación vigente, o `null` si no conduce pero sí gestiona el ente.
   * Si no es ni una cosa ni la otra, 404: una unidad que no le corresponde
   * responde igual que una que no existe.
   */
  private async vinculo(
    cliente: PoolClient,
    actor: Actor,
    vehicleId: string,
    exigeAsignacion: boolean,
  ): Promise<Vinculo> {
    const unidad = await cliente.query<{ vehicle_type: string }>(
      `SELECT vehicle_type FROM fom.vehicles
        WHERE tenant_id = $1 AND id = $2
        FOR SHARE`,
      [actor.tenantId, vehicleId],
    );
    if (unidad.rows.length === 0) {
      throw new NotFoundException('Not found');
    }

    const asignacion = await cliente.query<{ role: string }>(
      `SELECT role FROM fom.vehicle_driver_assignments
        WHERE tenant_id = $1 AND vehicle_id = $2 AND user_id = $3
          AND valid_from <= transaction_timestamp()
          AND (valid_to IS NULL OR valid_to > transaction_timestamp())
        FOR SHARE`,
      [actor.tenantId, vehicleId, actor.userId],
    );
    if (asignacion.rows.length > 0) {
      return {
        role: asignacion.rows[0].role as 'principal' | 'secundario',
        vehicleType: unidad.rows[0].vehicle_type,
      };
    }

    const rol = ROL_CANONICO[actor.role ?? ''] ?? actor.role ?? '';
    if (!exigeAsignacion && ROLES_GESTORES.has(rol)) {
      return { role: null, vehicleType: unidad.rows[0].vehicle_type };
    }
    throw new ForbiddenException(
      'You are not assigned to that vehicle',
    );
  }

  /** Reportar una falla: nace una orden correctiva abierta. */
  async reportFailure(
    actor: Actor,
    vehicleId: string,
    dto: ReportFailureDto,
    idempotencyKey?: string,
  ) {
    const key = this.receipts.requireKey(idempotencyKey);
    const requestHash = this.receipts.hashRequest({
      vehicleId,
      description: dto.description,
      failureType: dto.failureType ?? null,
      location: dto.location ?? null,
    });
    const cliente = await this.database.getPool().connect();
    try {
      await cliente.query('BEGIN');
      const replay = await this.receipts.replay<Record<string, unknown>>(
        cliente,
        actor,
        'vehicle.failure.report',
        key,
        requestHash,
      );
      if (replay) {
        await cliente.query('COMMIT');
        return replay;
      }
      const { role } = await this.vinculo(cliente, actor, vehicleId, false);
      // `last_status_actor_user_id` se rellena aunque nadie haya cambiado
      // todavia ningun estado: el trigger que escribe el evento de nacimiento
      // del historico toma el actor DE ESA COLUMNA. Sin ella el historico de
      // toda orden abierta desde el telefono empieza con un «alguien la
      // abrio» anonimo, justo lo que un historico no debe permitirse.
      const creada = await cliente.query<{ id: string; status: string }>(
        `INSERT INTO fom.work_orders
           (tenant_id, vehicle_id, created_by_user_id,
            last_status_actor_user_id, author_via, kind,
            description, failure_type, location)
         VALUES ($1, $2, $3, $3, $4::varchar, 'correctiva', $5, $6, $7)
         RETURNING id, status::text AS status`,
        [
          actor.tenantId,
          vehicleId,
          actor.userId,
          role,
          dto.description,
          dto.failureType ?? null,
          dto.location ?? null,
        ],
      );
      const response = {
        workOrderId: creada.rows[0].id,
        status: creada.rows[0].status,
        authorVia: role,
      };
      await this.receipts.store(
        cliente,
        actor,
        'vehicle.failure.report',
        key,
        requestHash,
        response,
      );
      await cliente.query('COMMIT');
      return response;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw this.traducir(error);
    } finally {
      cliente.release();
    }
  }

  /**
   * Entregar la inspección diaria: la inspección, sus respuestas y el
   * resultado, todo en una transacción.
   *
   * El RESULTADO lo calcula el servidor a partir de las respuestas, nunca lo
   * declara el teléfono: una app que pudiera decir «aprobada» convertiría el
   * checklist en un trámite. Un ítem crítico en falla bloquea —y la base
   * vuelve a comprobarlo por su cuenta—; una observación aprueba con
   * observaciones; todo conforme, aprueba.
   */
  async submitInspection(
    actor: Actor,
    vehicleId: string,
    dto: SubmitInspectionDto,
    idempotencyKey?: string,
  ) {
    const key = this.receipts.requireKey(idempotencyKey);
    const requestHash = this.receipts.hashRequest({
      vehicleId,
      templateId: dto.templateId,
      location: dto.location ?? null,
      answers: [...dto.answers]
        .map((answer) => ({
          templateItemId: answer.templateItemId,
          itemState: answer.itemState,
          note: answer.note ?? null,
          requestedWorkOrder: answer.requestedWorkOrder ?? false,
        }))
        .sort((left, right) =>
          left.templateItemId.localeCompare(right.templateItemId),
        ),
    });
    const cliente = await this.database.getPool().connect();
    try {
      await cliente.query('BEGIN');
      const replay = await this.receipts.replay<Record<string, unknown>>(
        cliente,
        actor,
        'vehicle.inspection.submit',
        key,
        requestHash,
      );
      if (replay) {
        await cliente.query('COMMIT');
        return replay;
      }
      const { role, vehicleType } = await this.vinculo(
        cliente,
        actor,
        vehicleId,
        true,
      );

      // Los ítems se leen del formato: su criticidad es del catálogo, no de
      // lo que diga el teléfono.
      const items = await cliente.query<{
        id: string;
        is_critical: boolean;
        name: string;
      }>(
        `SELECT item.id, item.is_critical, item.name
           FROM fom.inspection_template_items item
           JOIN fom.inspection_templates plantilla
             ON plantilla.tenant_id = item.tenant_id
            AND plantilla.id = item.template_id
          WHERE item.tenant_id = $1 AND item.template_id = $2
            AND plantilla.status = 'publicada'
            AND (
              item.vehicle_types = '[]'::jsonb
              OR item.vehicle_types ? $3
            )`,
        [actor.tenantId, dto.templateId, vehicleType],
      );
      if (items.rows.length === 0) {
        throw new NotFoundException('Not found');
      }
      const catalogo = new Map(
        items.rows.map((fila) => [
          fila.id,
          { isCritical: fila.is_critical, name: fila.name },
        ]),
      );
      const respondidos = new Set(dto.answers.map((r) => r.templateItemId));
      if (respondidos.size !== dto.answers.length) {
        throw new BadRequestException('Repeated item in the answers');
      }
      for (const respuesta of dto.answers) {
        if (!catalogo.has(respuesta.templateItemId)) {
          throw new BadRequestException(
            'An answer does not belong to that template',
          );
        }
        if (
          respuesta.itemState === 'conforme' &&
          respuesta.requestedWorkOrder === true
        ) {
          throw new BadRequestException(
            'A conforming item cannot request a work order',
          );
        }
      }
      if (respondidos.size !== items.rows.length) {
        throw new BadRequestException(
          'Every item of the template must be answered',
        );
      }

      const inspeccion = await cliente.query<{ id: string }>(
        `INSERT INTO fom.inspections
           (tenant_id, vehicle_id, driver_user_id, template_id, location)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          actor.tenantId,
          vehicleId,
          actor.userId,
          dto.templateId,
          dto.location ?? null,
        ],
      );
      const inspectionId = inspeccion.rows[0].id;
      const workOrderIds: string[] = [];

      for (const respuesta of dto.answers) {
        let workOrderId: string | null = null;
        if (respuesta.requestedWorkOrder === true) {
          const item = catalogo.get(respuesta.templateItemId)!;
          // Mismo motivo que en `reportFailure`: el evento de nacimiento del
          // historico necesita el actor en `last_status_actor_user_id`.
          const creada = await cliente.query<{ id: string }>(
            `INSERT INTO fom.work_orders
               (tenant_id, vehicle_id, created_by_user_id,
                last_status_actor_user_id, author_via, kind,
                description, failure_type, location)
             VALUES ($1, $2, $3, $3, $4::varchar, 'correctiva', $5, 'otro', $6)
             RETURNING id`,
            [
              actor.tenantId,
              vehicleId,
              actor.userId,
              role,
              `Inspection finding: ${item.name}. ${respuesta.note ?? 'Reported by the driver.'}`,
              dto.location ?? null,
            ],
          );
          workOrderId = creada.rows[0].id;
          workOrderIds.push(workOrderId);
        }
        await cliente.query(
          `INSERT INTO fom.inspection_answers
             (tenant_id, inspection_id, template_id, template_item_id,
              item_state, note, requested_work_order, work_order_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            actor.tenantId,
            inspectionId,
            dto.templateId,
            respuesta.templateItemId,
            respuesta.itemState,
            respuesta.note ?? null,
            respuesta.requestedWorkOrder ?? false,
            workOrderId,
          ],
        );
      }

      const hayCriticaEnFalla = dto.answers.some(
        (r) =>
          r.itemState === 'falla' &&
          catalogo.get(r.templateItemId)?.isCritical === true,
      );
      const hayHallazgo = dto.answers.some((r) => r.itemState !== 'conforme');
      const resultado = hayCriticaEnFalla
        ? 'bloqueada'
        : hayHallazgo
          ? 'aprobada_con_observaciones'
          : 'aprobada';

      await cliente.query(
        `UPDATE fom.inspections SET result = $3::varchar
          WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, inspectionId, resultado],
      );

      const response = {
        inspectionId,
        result: resultado,
        answers: dto.answers.length,
        authorVia: role,
        workOrderIds,
      };
      await this.receipts.store(
        cliente,
        actor,
        'vehicle.inspection.submit',
        key,
        requestHash,
        response,
      );
      await cliente.query('COMMIT');
      return response;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw this.traducir(error);
    } finally {
      cliente.release();
    }
  }

  /** Anotar el odómetro leído en el tablero. */
  async recordOdometer(
    actor: Actor,
    vehicleId: string,
    dto: RecordOdometerDto,
    idempotencyKey?: string,
  ) {
    const key = this.receipts.requireKey(idempotencyKey);
    let observado: string | null = null;
    if (dto.observedAt !== undefined) {
      const instante = new Date(dto.observedAt);
      if (Number.isNaN(instante.getTime()) || instante.getTime() > Date.now()) {
        throw new BadRequestException('observedAt cannot be in the future');
      }
      observado = instante.toISOString();
    }
    const requestHash = this.receipts.hashRequest({
      vehicleId,
      odometerKm: dto.odometerKm,
      observedAt: observado,
    });
    const cliente = await this.database.getPool().connect();
    try {
      await cliente.query('BEGIN');
      const replay = await this.receipts.replay<Record<string, unknown>>(
        cliente,
        actor,
        'vehicle.odometer.record',
        key,
        requestHash,
      );
      if (replay) {
        await cliente.query('COMMIT');
        return replay;
      }
      await this.vinculo(cliente, actor, vehicleId, true);
      // Una lectura del futuro no es un dato, es un error de reloj: se
      // rechaza aquí en vez de guardarla y desordenar el historial. El
      // margen es cero a propósito — la base exige `created_at >=
      // observed_at`, así que un instante «casi presente» tampoco cabe.
      const anotada = await cliente.query<{ id: string }>(
        `INSERT INTO fom.vehicle_odometer_readings
           (tenant_id, vehicle_id, odometer_km, source, recorded_by_user_id,
            observed_at)
         VALUES ($1, $2, $3, 'manual', $4,
                 coalesce($5::timestamptz, transaction_timestamp()))
         RETURNING id::text AS id`,
        [
          actor.tenantId,
          vehicleId,
          dto.odometerKm,
          actor.userId,
          observado,
        ],
      );
      const response = {
        readingId: anotada.rows[0].id,
        odometerKm: dto.odometerKm,
      };
      await this.receipts.store(
        cliente,
        actor,
        'vehicle.odometer.record',
        key,
        requestHash,
        response,
      );
      await cliente.query('COMMIT');
      return response;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw this.traducir(error);
    } finally {
      cliente.release();
    }
  }

  /** Traduce los candados de la base a respuestas con nombre. */
  private traducir(error: unknown): unknown {
    if (
      error instanceof NotFoundException ||
      error instanceof ForbiddenException ||
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      return error;
    }
    const pg = error as { code?: string; message?: string };
    if (pg?.code === '23505') {
      // Cada choque tiene su motivo y merece su frase: un mensaje genérico
      // obliga al conductor a adivinar qué hizo mal.
      const restriccion = (pg as { constraint?: string }).constraint ?? '';
      if (restriccion === 'inspections_daily_unique_idx') {
        return new ConflictException(
          'You already submitted today inspection for that vehicle',
        );
      }
      if (restriccion.startsWith('vehicle_odometer_readings')) {
        return new ConflictException(
          'That odometer reading was already recorded',
        );
      }
      return new ConflictException('That record already exists');
    }
    if (pg?.code === '23514') {
      return new BadRequestException('Rejected by a data rule');
    }
    if (pg?.code === '23503') {
      return new NotFoundException('Not found');
    }
    return error;
  }
}
