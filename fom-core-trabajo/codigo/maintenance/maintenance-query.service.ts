import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * Lecturas del dominio de mantenimiento — planes, odómetro y acciones.
 *
 * El `tenantId` llega SIEMPRE por parámetro y nunca se deduce aquí. Es lo que
 * permite que las dos superficies compartan estas consultas sin compartir su
 * forma de autenticar: la consola lo saca del actor de su sesión por cookie y
 * el móvil del actor de su token, cada una en su capa, y ninguna puede
 * declararlo desde el cliente. Escribir el SQL dos veces habría creado dos
 * verdades que divergen a la primera corrección hecha solo en una.
 *
 * Solo lectura: las tablas nacieron con el programa delta de mantenimiento y
 * hasta hoy ninguna superficie las servía. Esto las abre para consultarlas;
 * crear planes y registrar acciones es un paso aparte, con sus propias reglas
 * de autorización.
 */
@Injectable()
export class MaintenanceQueryService {
  constructor(private readonly database: DatabaseService) {}

  private page(rows: Array<Record<string, unknown>>, limit: number, offset: number) {
    const total = Number(rows[0]?.total ?? 0);
    return {
      items: rows.map(({ total: _descartado, ...fila }) => fila),
      page: { limit, offset, count: rows.length, total },
    };
  }

  /**
   * Planes de servicio con a cuántas unidades alcanzan. El conteo se hace en
   * la base y no trayendo las filas: una empresa con doscientos vehículos por
   * plan no debe costar doscientas filas para mostrar un número.
   */
  async listPlans(query: {
    limit: number;
    offset: number;
    enabledOnly?: boolean;
    tenantId: string;
  }) {
    const result = await this.database.query(
      `SELECT
         plan.id, plan.code, plan.service_name AS "serviceName",
         plan.description, plan.strategy,
         plan.interval_km AS "intervalKm",
         plan.interval_days AS "intervalDays",
         plan.criticality, plan.enabled,
         plan.archived_at AS "archivedAt",
         plan.created_at AS "createdAt",
         (
           SELECT count(*) FROM fom.maintenance_plan_vehicles link
            WHERE link.tenant_id = plan.tenant_id
              AND link.plan_id = plan.id
              AND link.enabled
         ) AS "vehicleCount",
         count(*) OVER () AS "total"
       FROM fom.maintenance_service_plans plan
       WHERE plan.tenant_id = $1
         AND ($2::boolean IS NOT TRUE OR (plan.enabled AND plan.archived_at IS NULL))
       ORDER BY plan.enabled DESC, plan.service_name, plan.id
       LIMIT $3 OFFSET $4`,
      [query.tenantId, query.enabledOnly ?? false, query.limit, query.offset],
    );
    return this.page(result.rows, query.limit, query.offset);
  }

  /** Un plan con las unidades que cubre y cuándo les toca. */
  async getPlan(tenantId: string, planId: string) {
    const plan = await this.database.query(
      `SELECT
         plan.id, plan.code, plan.service_name AS "serviceName",
         plan.description, plan.strategy,
         plan.interval_km AS "intervalKm",
         plan.interval_days AS "intervalDays",
         plan.criticality, plan.enabled,
         plan.archived_at AS "archivedAt",
         plan.created_at AS "createdAt"
       FROM fom.maintenance_service_plans plan
       WHERE plan.tenant_id = $1 AND plan.id = $2`,
      [tenantId, planId],
    );
    if (plan.rows.length === 0) {
      throw new NotFoundException('Not found');
    }
    const vehicles = await this.database.query(
      `SELECT
         link.vehicle_id AS "vehicleId",
         vehicle.code AS "vehicleCode",
         vehicle.plate,
         link.last_service_odometer_km AS "lastServiceOdometerKm",
         link.next_due_odometer_km AS "nextDueOdometerKm",
         link.last_service_at AS "lastServiceAt",
         link.next_due_at AS "nextDueAt",
         link.enabled
       FROM fom.maintenance_plan_vehicles link
       JOIN fom.vehicles vehicle
         ON vehicle.tenant_id = link.tenant_id AND vehicle.id = link.vehicle_id
       WHERE link.tenant_id = $1 AND link.plan_id = $2
       ORDER BY link.next_due_at NULLS LAST, vehicle.code`,
      [tenantId, planId],
    );
    return { ...plan.rows[0], vehicles: vehicles.rows };
  }

  /**
   * Acciones de mantenimiento. El orden pone delante lo que ya venció y
   * después lo que vence antes: es el orden en que se atienden, no el orden
   * en que se crearon.
   */
  async listActions(query: {
    limit: number;
    offset: number;
    vehicleId?: string;
    status?: string;
    tenantId: string;
  }) {
    const result = await this.database.query(
      `SELECT
         action.id, action.vehicle_id AS "vehicleId",
         vehicle.code AS "vehicleCode", vehicle.plate,
         action.plan_id AS "planId",
         plan.service_name AS "planName",
         action.work_order_id AS "workOrderId",
         action.kind, action.title, action.detail,
         action.component_position AS "componentPosition",
         action.relevance, action.status,
         action.due_odometer_km AS "dueOdometerKm",
         action.due_at AS "dueAt",
         action.progress_ratio AS "progressRatio",
         action.generated_by AS "generatedBy",
         action.cost_amount AS "costAmount",
         action.cost_currency AS "costCurrency",
         action.completed_at AS "completedAt",
         action.created_at AS "createdAt",
         count(*) OVER () AS "total"
       FROM fom.maintenance_actions action
       JOIN fom.vehicles vehicle
         ON vehicle.tenant_id = action.tenant_id
        AND vehicle.id = action.vehicle_id
       LEFT JOIN fom.maintenance_service_plans plan
         ON plan.tenant_id = action.tenant_id AND plan.id = action.plan_id
       WHERE action.tenant_id = $1
         AND ($2::uuid IS NULL OR action.vehicle_id = $2::uuid)
         AND ($3::varchar IS NULL OR action.status = $3::varchar)
       ORDER BY
         action.status <> 'pending',
         action.due_at NULLS LAST,
         action.due_odometer_km NULLS LAST,
         action.id
       LIMIT $4 OFFSET $5`,
      [
        query.tenantId,
        query.vehicleId ?? null,
        query.status ?? null,
        query.limit,
        query.offset,
      ],
    );
    return this.page(result.rows, query.limit, query.offset);
  }

  /**
   * Historial de odómetro de una unidad, del último al primero.
   *
   * La unidad se comprueba aparte: sin eso, una unidad de otra empresa
   * respondería una lista vacía —indistinguible de una unidad sin lecturas—
   * en vez del 404 uniforme que responde el resto de la superficie.
   */
  async listOdometer(query: {
    limit: number;
    offset: number;
    vehicleId: string;
    tenantId: string;
  }) {
    const vehicle = await this.database.query(
      `SELECT 1 FROM fom.vehicles WHERE tenant_id = $1 AND id = $2`,
      [query.tenantId, query.vehicleId],
    );
    if (vehicle.rows.length === 0) {
      throw new NotFoundException('Not found');
    }
    const result = await this.database.query(
      `SELECT
         reading.id::text AS id,
         reading.odometer_km AS "odometerKm",
         reading.source,
         reading.work_order_id AS "workOrderId",
         reading.observed_at AS "observedAt",
         reading.created_at AS "createdAt",
         count(*) OVER () AS "total"
       FROM fom.vehicle_odometer_readings reading
       WHERE reading.tenant_id = $1 AND reading.vehicle_id = $2
       ORDER BY reading.observed_at DESC, reading.id DESC
       LIMIT $3 OFFSET $4`,
      [query.tenantId, query.vehicleId, query.limit, query.offset],
    );
    return this.page(result.rows, query.limit, query.offset);
  }
}
