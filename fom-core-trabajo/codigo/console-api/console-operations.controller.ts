import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConsoleOperationsService } from './console-operations.service';
import { ConsoleBrowserMutationGuard } from './console-browser-mutation.guard';
import { ConsoleSessionGuard } from './console-session.guard';
import {
  CreateAlertRuleDto,
  CreateDocumentDto,
  CreateWorkOrderDto,
  DocumentQueryDto,
  NotificationQueryDto,
  VehicleFilterQueryDto,
  WorkOrderQueryDto,
  TransitionWorkOrderDto,
  UpdateAlertRuleDto,
  UpdateDocumentDto,
} from './console.dto';
import { ListQueryDto } from './console.dto';

/**
 * Operación y cumplimiento para la consola web.
 *
 * Las tablas existen desde los Issues #170 y #171; esto es la superficie que
 * las sirve. Sin ella, los módulos de mantenimiento, inspecciones, documentos y
 * alertas seguían mostrando datos de ejemplo aunque el esquema estuviera
 * completo — que es la confusión más fácil de tener: tener las tablas no es
 * tener la aplicación.
 *
 * Las lecturas son para cualquier sesión válida. La transición de una orden
 * añade protección CSRF y autorización de gestor dentro del servicio.
 */
@ApiTags('Console')
@ApiCookieAuth('__Host-fom_session')
@ApiResponse({ status: 401, description: 'Sin sesión, o sesión revocada.' })
@ApiResponse({
  status: 404,
  description:
    'Inexistente, o de otra empresa. Ambos responden igual a propósito.',
})
@UseGuards(ConsoleSessionGuard, ConsoleBrowserMutationGuard)
@Controller('api/v1/console')
export class ConsoleOperationsController {
  constructor(private readonly operations: ConsoleOperationsService) {}

  @Get('work-orders')
  @ApiOperation({
    summary: 'Órdenes de trabajo, de la más recientemente movida a la más vieja',
  })
  listWorkOrders(@Query() query: WorkOrderQueryDto) {
    return this.operations.listWorkOrders(query);
  }

  @Get('work-orders/:workOrderId')
  @ApiOperation({
    summary: 'Ficha de una orden con su historial completo',
    description:
      'El historial es inmutable: lo escribe un disparador cuando cambia el ' +
      'estado, y no se puede editar ni borrar.',
  })
  getWorkOrder(
    @Param('workOrderId', new ParseUUIDPipe({ version: '4' }))
    workOrderId: string,
  ) {
    return this.operations.getWorkOrder(workOrderId);
  }

  @Patch('work-orders/:workOrderId/status')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'consoleWorkOrderTransition',
    summary: 'Avanzar, cerrar, cancelar o reabrir una orden',
    description:
      'Solo supervisor o administrador FOM. expectedStatus protege contra ' +
      'ediciones concurrentes; el trigger de la base escribe el historial ' +
      'append-only con el actor y la nota.',
  })
  @ApiResponse({ status: 403, description: 'El rol no administra órdenes.' })
  @ApiResponse({
    status: 409,
    description: 'Estado obsoleto o transición inválida.',
  })
  transitionWorkOrder(
    @Param('workOrderId', new ParseUUIDPipe({ version: '4' }))
    workOrderId: string,
    @Body() dto: TransitionWorkOrderDto,
  ) {
    return this.operations.transitionWorkOrder(workOrderId, dto);
  }

  @Post('work-orders')
  @ApiOperation({
    summary: 'Levantar una orden de trabajo sobre una unidad de la empresa',
    description:
      'La app del conductor solo abre órdenes sobre la unidad que tiene ' +
      'asignada y siempre correctivas. Un supervisor las abre sobre ' +
      'cualquier unidad de su empresa, y también preventivas. La orden nace ' +
      '`abierta`: el estado solo lo mueve la transición, que es la que deja ' +
      'histórico.',
  })
  @ApiResponse({ status: 403, description: 'El rol no administra órdenes.' })
  createWorkOrder(@Body() dto: CreateWorkOrderDto) {
    return this.operations.createWorkOrder(dto);
  }

  @Get('inspections')
  @ApiOperation({ summary: 'Inspecciones realizadas' })
  listInspections(@Query() query: VehicleFilterQueryDto) {
    return this.operations.listInspections(query);
  }

  @Get('documents')
  @ApiOperation({
    summary: 'Documentos con vencimiento, del que antes caduca al que más tarda',
    description:
      '`daysToExpiry` lo calcula la base, no el navegador: un documento ' +
      'vencido que aparece vigente por un huso horario es justo el fallo que ' +
      'este módulo existe para evitar. No expone la ruta de almacenamiento.',
  })
  listDocuments(@Query() query: DocumentQueryDto) {
    return this.operations.listDocuments(query);
  }

  @Get('alert-rules')
  @ApiOperation({ summary: 'Reglas de alerta y a cuántas unidades alcanzan' })
  listAlertRules(@Query() query: ListQueryDto) {
    return this.operations.listAlertRules(query);
  }

  @Get('notifications')
  @ApiOperation({
    summary: 'Avisos, los no leídos primero',
    description: 'Es el orden en que se atienden.',
  })
  listNotifications(@Query() query: NotificationQueryDto) {
    return this.operations.listNotifications(query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Contadores del panel',
    description:
      'Todos salen de una sola consulta. Pedirlos por separado daría cifras ' +
      'de instantes distintos, y un panel cuyas partes no suman el total es ' +
      'un panel en el que se deja de confiar.',
  })
  summary() {
    return this.operations.summary();
  }
  @Patch('notifications/:notificationId/read')
  @ApiOperation({
    summary: 'Dar un aviso por visto',
    description:
      'Lo marca para TODA la empresa: la tabla no guarda quién lo leyó, ' +
      'porque el aviso describe algo de la flota y no del lector. Marcarlo ' +
      'dos veces conserva la primera fecha.',
  })
  markNotificationRead(
    @Param('notificationId', new ParseUUIDPipe({ version: '4' }))
    notificationId: string,
  ) {
    return this.operations.markNotificationRead(notificationId);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Dar por vistos todos los avisos pendientes' })
  markAllNotificationsRead() {
    return this.operations.markAllNotificationsRead();
  }

  @Post('documents')
  @ApiOperation({
    summary: 'Registrar un documento con vencimiento',
    description:
      'El vencimiento es obligatorio: un documento sin fecha no puede ' +
      'vigilarse, y vigilar vencimientos es para lo que existe el módulo.',
  })
  @ApiResponse({ status: 403, description: 'El rol no administra documentos.' })
  createDocument(@Body() dto: CreateDocumentDto) {
    return this.operations.createDocument(dto);
  }

  @Patch('documents/:documentId')
  @ApiOperation({
    summary: 'Corregir un documento o archivarlo',
    description:
      'Archivar no borra. El documento vencido de ayer es lo que explica ' +
      'la multa de mañana.',
  })
  updateDocument(
    @Param('documentId', new ParseUUIDPipe({ version: '4' }))
    documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.operations.updateDocument(documentId, dto);
  }

  @Post('alert-rules')
  @ApiOperation({
    summary: 'Crear una regla de alerta',
    description:
      'Cada tipo lleva su umbral y solo el suyo: velocidad en km/h; ' +
      'mantenimiento en kilómetros y con el nombre del servicio.',
  })
  createAlertRule(@Body() dto: CreateAlertRuleDto) {
    return this.operations.createAlertRule(dto);
  }

  @Patch('alert-rules/:alertRuleId')
  @ApiOperation({
    summary: 'Ajustar o desactivar una regla',
    description:
      'El tipo no se cambia: una regla que cambiara de tipo dejaría ' +
      'huérfanas las unidades que tiene asignadas. Se desactiva y se crea otra.',
  })
  updateAlertRule(
    @Param('alertRuleId', new ParseUUIDPipe({ version: '4' }))
    alertRuleId: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.operations.updateAlertRule(alertRuleId, dto);
  }

}
