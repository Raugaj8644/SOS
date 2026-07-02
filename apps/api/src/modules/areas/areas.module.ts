import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { Area } from './entities/area.entity';
import { AreaMembership } from './entities/area-membership.entity';
import { AreaInvitation } from './entities/area-invitation.entity';
import { AreaMemberGuard } from '../../common/guards/area-member.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Area, AreaMembership, AreaInvitation])],
  controllers: [AreasController],
  providers: [AreasService, AreaMemberGuard, RolesGuard],
  exports: [AreasService, TypeOrmModule],
})
export class AreasModule {}
