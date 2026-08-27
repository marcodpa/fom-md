import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { MobileActorIdentity } from '../authentication/mobile-authentication.service';
import { ConsoleFleetService } from '../console-api/console-fleet.service';
import { ConsoleOperationsService } from '../console-api/console-operations.service';
import {
  DocumentQueryDto,
  ListQueryDto,
  MaintenanceActionQueryDto,
  NotificationQueryDto,
  VehicleFilterQueryDto,
  WorkOrderQueryDto,
} from '../console-api/console.dto';
import { MaintenanceQueryService } from '../maintenance/maintenance-query.service';
import { conActorMovil } from './mobile-actor-scope';
import { MobileActor, MobileSessionGuard } from './mobile-session.guard';

/**
 * Operación y mantenimiento para la aplicación móvil — solo lectura.
 *
 * Hasta aquí el móvil solo veía vehículos y posiciones, de modo que una app
 * que necesita órdenes de trabajo, inspecciones, documentos o mantenimiento no
 * tenía de dónde leerlos aunque las tablas existieran en producción.
 *
 * Las consultas son EXACTAMENTE las de la consola: mismo SQL, mismo orden,
 * mismos límites. Lo único distinto es la puerta —token opaco en vez de
 * cookie— y eso vive en el guard, no en la consulta. El tenant lo resuelve el
 * servidor desde el token y se pasa por el almacén de actor de la petición;
 * ninguna ruta lo acepta del cliente.
 *
 * `no-store` en todo: son datos de operación que caducan y no deben quedarse
 * en ninguna cache intermedia.
 */
@ApiTags('Mobile')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin sesión móvil, o revocada.' })
@ApiResponse({
  status: 404,
  description:
    'Inexistente, o de otra empresa. Ambos responden igual a propósito.',
})
@UseGuards(MobileSessionGuard)
@Controller('api/v1/mobile')
export class MobileOperationsController {
  constructor(
    private readonly operations: ConsoleOperationsService,
    private readonly fleet: ConsoleFleetService,
    private readonly maintenance: MaintenanceQueryService,
  ) {}

  @Header('Cache-Control', 'no-store')
  @Get('work-orders')
  @ApiOperation({
    summary: 'Órdenes de trabajo, de la más recientemente movida a la más vieja',
  })
  listWorkOrders(
    @MobileActor() actor: MobileActorIdentity,
    @Query() query: WorkOrderQueryDto,
  ) {
    return conActorMovil(actor, () => this.operations.listWorkOrders(query));
  }

  @Header('Cache-Control', 'no-store')
  @Get('work-orders/:workOrderId')
  @ApiOperation({
    summary: 'Ficha de una orden con su historial inmutable',
  })
  getWorkOrder(
    @MobileActor() actor: MobileActorIdentity,
    @Param('workOrderId', new ParseUUIDPipe({ version: '4' }))
    workOrderId: string,
  ) {
    return conActorMovil(actor, () =>
      this.operations.getWorkOrder(workOrderId),
    );
  }

  @Header('Cache-Control', 'no-store')
  @Get('inspections')
  @ApiOperation({ summary: 'Inspecciones realizadas' })
  listInspections(
    @MobileActor() actor: MobileActorIdentity,
    @Query() query: VehicleFilterQueryDto,
  ) {
    return conActorMovil(actor, () => this.operations.listInspections(query));
  }

  @Header('Cache-Control', 'no-store')
  @Get('documents')
  @ApiOperation({
    summary: 'Documentos con vencimiento, del que antes caduca al que más tarda',
    description:
      '`daysToExpiry` lo calcula la base: un documento vencido que aparece ' +
      'vigente por un huso horario es justo el fallo que esto evita.',
  })
  listDocuments(
    @MobileActor() actor: MobileActorIdentity,
    @Query() query: DocumentQueryDto,
  ) {
    return conActorMovil(actor, () => this.operations.listDocuments(query));
  }

  @Header('Cache-Control', 'no-store')
  @Get('alert-rules')
  @ApiOperation({ summary: 'Reglas de alerta y a cuántas unidades alcanzan' })
  listAlertRules(
    @MobileActor() actor: MobileActorIdentity,
    @Query() query: ListQueryDto,
  ) {
    return conActorMovil(actor, () => this.operations.listAlertRules(query));
  }

  @Header('Cache-Control', 'no-store')
  @Get('notifications')
  @ApiOperation({ summary: 'Avisos, los no leídos primero' })
  listNotifications(
    @MobileActor() actor: MobileActorIdentity,
    @Query() query: NotificationQueryDto,
  ) {
    return conActorMovil(actor, () => this.operations.listNotifications(query));
  }

  @Header('Cache-Control', 'no-store')
  @Get('summary')
  @ApiOperation({
    summary: 'Contadores de la operación',
    description:
      'Todos salen de una sola consulta: partes que no suman el total son ' +
      'partes en las que se deja de confiar.',
  })
  summary(@MobileActor() actor: MobileActorIdentity) {
    return conActorMovil(actor, () => this.operations.summary());
  }

  @Header('Cache-Control', 'no-store')
  @Get('areas')
  @ApiOperation({ summary: 'Áreas de la empresa, con cuántas unidades tiene cada una' })
  listAreas(
    @MobileActor() actor: MobileActorIdentity,
    @Query() query: ListQueryDto,
  ) {
    return conActorMovil(actor, () => this.fleet.listAreas(query));
  }

  @Header('Cache-Control', 'no-store')
  @Get('drivers')
  @ApiOperation({
    summary: 'Conductores con asignación vigente',
    description: 'Sin datos personales: quién conduce qué, y desde cuándo.',
  })
  listDrivers(
    @MobileActor() actor: MobileActorIdentity,
    @Query() query: ListQueryDto,
  ) {
    return conActorMovil(actor, () => this.fleet.listDrivers(query));
  }

  @Header('Cache-Control', 'no-store')
  @Get('maintenance/plans')
  @ApiOperation({ summary: 'Planes de servicio y a cuántas unidades alcanzan' })
  listPlans(
    @MobileActor() actor: MobileActorIdentity,
    @Query() query: ListQueryDto,
  ) {
    return this.maintenance.listPlans({
      limit: query.limit,
      offset: query.offset,
      tenantId: actor.tenantId,
    });
  }

  @Header('Cache-Control', 'no-store')
  @Get('maintenance/actions')
  @ApiOperation({
    summary: 'Acciones de mantenimiento, lo vencido primero',
  })
  listActions(
    @MobileActor() actor: MobileActorIdentity,
    @Query() query: MaintenanceActionQueryDto,
  ) {
    return this.maintenance.listActions({
      limit: query.limit,
      offset: query.offset,
      vehicleId: query.vehicleId,
      status: query.status,
      tenantId: actor.tenantId,
    });
  }

  @Header('Cache-Control', 'no-store')
  @Get('vehicles/:vehicleId/odometer')
  @ApiOperation({ summary: 'Historial de odómetro de una unidad' })
  listOdometer(
    @MobileActor() actor: MobileActorIdentity,
    @Param('vehicleId', new ParseUUIDPipe({ version: '4' }))
    vehicleId: string,
    @Query() query: ListQueryDto,
  ) {
    return this.maintenance.listOdometer({
      limit: query.limit,
      offset: query.offset,
      vehicleId,
      tenantId: actor.tenantId,
    });
  }
}
