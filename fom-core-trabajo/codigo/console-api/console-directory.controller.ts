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
  @Post('gps-devices')
  @ApiOperation({
    summary: 'Registrar un equipo GPS en el inventario de la empresa',
    description:
      'Registrar e instalar son cosas distintas: un equipo puede pasar ' +
      'meses en una gaveta antes de montarse. El IMEI es único en toda la ' +
      'plataforma, porque el aparato es uno solo en el mundo.',
  })
  @ApiResponse({ status: 403, description: 'El alta de equipos es del administrador FOM.' })
  @ApiResponse({ status: 409, description: 'Ese IMEI ya está registrado.' })
  registerGpsDevice(@Body() dto: RegisterGpsDeviceDto) {
    return this.directory.registerGpsDevice(dto);
  }

  @Patch('gps-devices/:deviceId')
  @ApiOperation({
    summary: 'Ajustar un equipo del inventario',
    description:
      'El IMEI no se corrige: si el IMEI está mal, el aparato registrado es ' +
      'otro, y lo que toca es registrar el que es.',
  })
  updateGpsDevice(
    @Param('deviceId', new ParseUUIDPipe({ version: '4' })) deviceId: string,
    @Body() dto: UpdateGpsDeviceDto,
  ) {
    return this.directory.updateGpsDevice(deviceId, dto);
  }

  @Post('gps-devices/:deviceId/installation')
  @ApiOperation({
    summary: 'Instalar el equipo sobre una unidad',
    description:
      'Un equipo no puede estar montado en dos unidades a la vez, ni una ' +
      'unidad llevar dos equipos: lo sostienen dos índices únicos de la base, ' +
      'que es donde tiene que estar, porque también hay instalaciones que ' +
      'entran por la app de campo.',
  })
  @ApiResponse({ status: 409, description: 'El equipo o la unidad ya están ocupados.' })
  installGpsDevice(
    @Param('deviceId', new ParseUUIDPipe({ version: '4' })) deviceId: string,
    @Body() dto: InstallGpsDeviceDto,
  ) {
    return this.directory.installGpsDevice(deviceId, dto);
  }

  @Patch('gps-installations/:assignmentId/remove')
  @ApiOperation({
    summary: 'Desmontar un equipo',
    description:
      'La instalación no se borra: se cierra con fecha, porque es lo que ' +
      'explica de qué unidad venían las posiciones de hace tres meses.',
  })
  removeGpsInstallation(
    @Param('assignmentId', new ParseUUIDPipe({ version: '4' }))
    assignmentId: string,
    @Body() dto: RemoveGpsInstallationDto,
  ) {
    return this.directory.removeGpsInstallation(assignmentId, dto);
  }

  @Get('directory')
  @ApiOperation({
    summary: 'La gente del ente, con su cuenta y sus papeles en una sola vista',
    description:
      'Cuenta, datos personales, la unidad que maneja hoy y el documento ' +
      'que vence antes. Estaban repartidos en dos pantallas para la misma ' +
      'persona, y cruzarlas a mano es lo que hace que a un conductor se le ' +
      'venza la licencia sin que nadie lo note.',
  })
  listDirectory(@Query() query: ListQueryDto) {
    return this.directory.listDirectory(query);
  }

  @Get('tenants/:tenantId/directory')
  @ApiOperation({
    summary: 'La gente de un contratista, en solo lectura',
    description:
      'Una compañía lee así la gente de los contratistas que tiene ' +
      'vigentes. El ente viaja en la RUTA y no en el cuerpo, y se comprueba ' +
      'contra `fom.actor_tenant_scope`: lo que autoriza sigue saliendo de la ' +
      'sesión, y esto solo elige a cuál de los entes permitidos mirar. Los ' +
      'datos personales no cruzan — la política de fila exige compartir un ' +
      'ente activo, y una compañía no lo comparte con la gente ajena.',
  })
  @ApiResponse({
    status: 404,
    description: 'Fuera de alcance o inexistente. Responden igual.',
  })
  listContractorDirectory(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
    @Query() query: ListQueryDto,
  ) {
    return this.directory.listDirectory(query, tenantId);
  }

  @Patch('users/:userId/profile')
  @ApiOperation({
    summary: 'Datos personales: cédula, teléfono, dirección, nacimiento',
    description:
      'Se llenan en otro momento y por otra persona que el alta de la ' +
      'cuenta. «Perfil completo» lo decide el servidor cuando están la ' +
      'cédula y el teléfono, no un botón.',
  })
  updateUserProfile(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.directory.updateUserProfile(userId, dto);
  }

}
