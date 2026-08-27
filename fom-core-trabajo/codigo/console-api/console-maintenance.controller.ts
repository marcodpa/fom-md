import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { currentActor } from '../authentication/actor-context';
import { MaintenanceQueryService } from '../maintenance/maintenance-query.service';
import { ConsoleSessionGuard } from './console-session.guard';
import {
  MaintenanceActionQueryDto,
  MaintenancePlanQueryDto,
} from './console.dto';
import { ListQueryDto } from './console.dto';

/**
 * Mantenimiento para la consola web.
 *
 * Las tablas existen desde el programa delta de mantenimiento, pero ninguna
 * superficie las servía: el módulo de Mantenimiento del panel leía de una
 * fuente vacía. Esto las abre, y de paso deja de ser cierto que tener las
 * tablas equivale a tener la aplicación.
 *
 * Solo lectura, igual que el resto de esta superficie.
 */
@ApiTags('Console')
@ApiCookieAuth('__Host-fom_session')
@ApiResponse({ status: 401, description: 'Sin sesión, o sesión revocada.' })
@ApiResponse({
  status: 404,
  description:
    'Inexistente, o de otra empresa. Ambos responden igual a propósito.',
})
@UseGuards(ConsoleSessionGuard)
@Controller('api/v1/console')
export class ConsoleMaintenanceController {
  constructor(private readonly maintenance: MaintenanceQueryService) {}

  private tenantId(): string {
    const actor = currentActor();
    if (!actor) {
      throw new UnauthorizedException('Console session required');
    }
    return actor.tenantId;
  }

  @Get('maintenance/plans')
  @ApiOperation({
    summary: 'Planes de servicio y a cuántas unidades alcanzan',
    description:
      'El conteo de unidades lo hace la base: mostrar un número no debe ' +
      'costar traer todas las filas que lo componen.',
  })
  listPlans(@Query() query: MaintenancePlanQueryDto) {
    return this.maintenance.listPlans({
      limit: query.limit,
      offset: query.offset,
      enabledOnly: query.enabledOnly,
      tenantId: this.tenantId(),
    });
  }

  @Get('maintenance/plans/:planId')
  @ApiOperation({
    summary: 'Un plan con las unidades que cubre y cuándo les toca',
  })
  getPlan(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
  ) {
    return this.maintenance.getPlan(this.tenantId(), planId);
  }

  @Get('maintenance/actions')
  @ApiOperation({
    summary: 'Acciones de mantenimiento, lo vencido primero',
    description:
      'El orden es el de atención —vencidas antes que próximas—, no el de ' +
      'creación.',
  })
  listActions(@Query() query: MaintenanceActionQueryDto) {
    return this.maintenance.listActions({
      limit: query.limit,
      offset: query.offset,
      vehicleId: query.vehicleId,
      status: query.status,
      tenantId: this.tenantId(),
    });
  }

  @Get('vehicles/:vehicleId/odometer')
  @ApiOperation({
    summary: 'Historial de odómetro de una unidad, de lo más reciente atrás',
  })
  listOdometer(
    @Param('vehicleId', new ParseUUIDPipe({ version: '4' }))
    vehicleId: string,
    @Query() query: ListQueryDto,
  ) {
    return this.maintenance.listOdometer({
      limit: query.limit,
      offset: query.offset,
      vehicleId,
      tenantId: this.tenantId(),
    });
  }
}
