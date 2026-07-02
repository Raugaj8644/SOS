import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AreasModule } from '../areas/areas.module';
import { GlobalAdminGuard } from '../../common/guards/global-admin.guard';

@Module({
  imports: [AreasModule],   // re-uses AreasService + TypeORM entities
  controllers: [AdminController],
  providers: [GlobalAdminGuard],
})
export class AdminModule {}
