import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SafePoint } from './entities/safe-point.entity';
import { AreaMembership } from '../areas/entities/area-membership.entity';
import { Area } from '../areas/entities/area.entity';
import { SafePointsService } from './safe-points.service';
import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AreaMemberGuard } from '../../common/guards/area-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SafePointType } from './entities/safe-point.entity';
import { CreateSafePointDto, UpdateSafePointDto } from './safe-points.service';
import { IsEnum, IsOptional } from 'class-validator';

class SafePointQuery {
  @IsOptional() @IsEnum(SafePointType) type?: SafePointType;
}

@Controller({ path: 'areas/:areaId/safe-points', version: '1' })
@UseGuards(JwtAuthGuard, AreaMemberGuard)
class SafePointsController {
  constructor(private readonly service: SafePointsService) {}

  @Post()
  create(
    @Param('areaId') areaId: string,
    @Body() dto: CreateSafePointDto,
    @CurrentUser() user: User,
  ) { return this.service.create(areaId, dto, user.id); }

  @Get()
  findAll(@Param('areaId') areaId: string, @Query() query: SafePointQuery) {
    return this.service.findAll(areaId, query.type);
  }

  @Patch(':id')
  update(
    @Param('areaId') areaId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSafePointDto,
    @CurrentUser() user: User,
  ) { return this.service.update(areaId, id, dto, user.id); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('areaId') areaId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) { return this.service.remove(areaId, id, user.id); }
}

@Module({
  imports: [TypeOrmModule.forFeature([SafePoint, AreaMembership, Area])],
  controllers: [SafePointsController],
  providers: [SafePointsService],
  exports: [SafePointsService],
})
export class SafePointsModule {}
