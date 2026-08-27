import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MaintenanceQueryService } from './maintenance-query.service';

/**
 * Lecturas de mantenimiento, compartidas por la consola y el móvil.
 *
 * Es un módulo sin controladores a propósito: cada superficie expone estas
 * consultas por su propia puerta y con su propia autenticación, y este módulo
 * solo garantiza que ambas lean lo mismo.
 */
@Module({
  imports: [DatabaseModule],
  providers: [MaintenanceQueryService],
  exports: [MaintenanceQueryService],
})
export class MaintenanceModule {}
