import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConsoleDirectoryService } from './console-directory.service';
import { ConsoleSessionGuard } from './console-session.guard';
import { ConsoleBrowserMutationGuard } from './console-browser-mutation.guard';
import {
  AssignDriverDto,
  CreateDirectoryUserDto,
  CreateVehicleDto,
  ResetCredentialDto,
  RevokeDriverDto,
  UpdateMembershipDto,
  UpdateVehicleDto,
} from './console-directory.dto';
import { ListQueryDto } from './console.dto';

/**
 * Las primeras ESCRITURAS de la consola — el directorio (Issue #169, FOM-02).
 *
 * Autorización en dos capas: la sesión (este guard) y el ROL dentro del
 * servicio (console-roles.ts). El tenant sigue siendo imposible de nombrar
 * desde el cliente: toda alta ocurre en la empresa del actor.
 */
@ApiTags('Console')
@ApiCookieAuth('__Host-fom_session')
@ApiResponse({ status: 401, description: 'Sin sesión, o sesión revocada.' })
@ApiResponse({
  status: 403,
  description: 'Sesión válida pero rol sin permiso para esta acción.',
})
@ApiResponse({
  status: 404,
  description:
    'Inexistente, o de otra empresa. Ambos responden igual a propósito.',
})
@UseGuards(ConsoleSessionGuard, ConsoleBrowserMutationGuard)
@Controller('api/v1/console')
export class ConsoleDirectoryController {
  constructor(private readonly directory: ConsoleDirectoryService) {}

  @Get('users')
  @ApiOperation({
    summary: 'Directorio del ente: cada persona con su rol y estado',
    description:
      'Paginado y con orden determinista (nombre, correo, id). El total ' +
      'viaja en la página.',
  })
  listUsers(@Query() query: ListQueryDto) {
    return this.directory.listUsers(query);
  }

  @Post('users')
  @ApiOperation({
    summary: 'Alta de una persona en el ente del actor, con clave temporal',
    description:
      'Gestores (supervisor o administrador FOM). Otorgar el rol de ' +
      'supervisor exige ser administrador FOM. La persona debe cambiar la ' +
      'clave en su primer ingreso.',
  })
  createUser(@Body() dto: CreateDirectoryUserDto) {
    return this.directory.createUser(dto);
  }

  @Patch('users/:userId')
  @ApiOperation({
    summary: 'Administrar a una persona: perfil, suspension o revocacion',
    description:
      'Exige rango estrictamente mayor. Nadie se administra a si mismo ni ' +
      'administra a un administrador FOM. Suspender y revocar cierran sus ' +
      'sesiones abiertas en el acto. Todo queda en la auditoria con el valor ' +
      'anterior, el nuevo y el motivo.',
  })
  updateMembership(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.directory.updateMembership(userId, dto);
  }

  @Post('users/:userId/credential-reset')
  @ApiOperation({
    summary: 'Devolver el acceso a quien olvido su clave',
    description:
      'La clave nueva nace obligada a cambiarse y revoca las sesiones de esa ' +
      'persona. La escritura la realiza una funcion de la base que vuelve a ' +
      'comprobar ente, rango y exclusiones por su cuenta.',
  })
  resetCredential(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: ResetCredentialDto,
  ) {
    return this.directory.resetCredential(userId, dto);
  }

  @Post('vehicles')
  @ApiOperation({
    summary: 'Alta de un vehículo (administrador FOM)',
    description:
      'El alta formal de FOM-02 §1.2 incluye el GPS; esta superficie crea ' +
      'la unidad y su auditoría de autoría. El registro del equipo GPS ' +
      'sigue en la consola interna de comisionado.',
  })
  createVehicle(@Body() dto: CreateVehicleDto) {
    return this.directory.createVehicle(dto);
  }

  @Patch('vehicles/:vehicleId')
  @ApiOperation({ summary: 'Editar una unidad (alias, placa, área…)' })
  updateVehicle(
    @Param('vehicleId', new ParseUUIDPipe({ version: '4' }))
    vehicleId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.directory.updateVehicle(vehicleId, dto);
  }

  @Post('vehicles/:vehicleId/drivers')
  @ApiOperation({
    summary: 'Asignar conductor (principal, o secundario con PIN)',
    description:
      'La base garantiza un solo principal activo por vehículo y que el ' +
      'PIN solo exista hasheado.',
  })
  assignDriver(
    @Param('vehicleId', new ParseUUIDPipe({ version: '4' }))
    vehicleId: string,
    @Body() dto: AssignDriverDto,
  ) {
    return this.directory.assignDriver(vehicleId, dto);
  }

  @Patch('driver-assignments/:assignmentId/revoke')
  @ApiOperation({
    summary: 'Revocar una asignación de conductor vigente',
    description:
      'La asignación no se borra: queda cerrada con fecha y motivo, porque ' +
      'el historial de quién condujo qué es auditoría.',
  })
  revokeDriver(
    @Param('assignmentId', new ParseUUIDPipe({ version: '4' }))
    assignmentId: string,
    @Body() dto: RevokeDriverDto,
  ) {
    return this.directory.revokeDriver(assignmentId, dto);
  }
}
