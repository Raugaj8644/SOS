import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AreasService } from './areas.service';
import { CreateAreaDto, UpdateAreaDto, JoinAreaDto } from './dto/create-area.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AreaMemberGuard } from '../../common/guards/area-member.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AreaRole } from './entities/area-membership.entity';
import { User } from '../users/entities/user.entity';
import { IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

class NearbyQuery {
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lat: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lng: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  radius?: number;
}

@Controller({ path: 'areas', version: '1' })
@UseGuards(JwtAuthGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  // POST /api/v1/areas
  @Post()
  create(@Body() dto: CreateAreaDto, @CurrentUser() user: User) {
    return this.areasService.create(dto, user.id);
  }

  // GET /api/v1/areas?lat=...&lng=...&radius=...
  @Get()
  findNearby(@Query() query: NearbyQuery) {
    return this.areasService.findNearby(query.lat, query.lng, query.radius);
  }

  // GET /api/v1/areas/:areaId
  @Get(':areaId')
  @UseGuards(AreaMemberGuard)
  findOne(@Param('areaId') areaId: string) {
    return this.areasService.findOne(areaId);
  }

  // PATCH /api/v1/areas/:areaId
  @Patch(':areaId')
  @UseGuards(AreaMemberGuard, RolesGuard)
  @Roles(AreaRole.ADMIN)
  update(
    @Param('areaId') areaId: string,
    @Body() dto: UpdateAreaDto,
    @CurrentUser() user: User,
  ) {
    return this.areasService.update(areaId, dto, user.id);
  }

  // DELETE /api/v1/areas/:areaId
  @Delete(':areaId')
  @UseGuards(AreaMemberGuard, RolesGuard)
  @Roles(AreaRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('areaId') areaId: string, @CurrentUser() user: User) {
    return this.areasService.remove(areaId, user.id);
  }

  // POST /api/v1/areas/join
  @Post('join')
  join(@Body() dto: JoinAreaDto, @CurrentUser() user: User) {
    return this.areasService.join(dto, user.id);
  }

  // DELETE /api/v1/areas/:areaId/leave
  @Delete(':areaId/leave')
  @UseGuards(AreaMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@Param('areaId') areaId: string, @CurrentUser() user: User) {
    return this.areasService.leave(areaId, user.id);
  }

  // GET /api/v1/areas/:areaId/members
  @Get(':areaId/members')
  @UseGuards(AreaMemberGuard)
  listMembers(@Param('areaId') areaId: string) {
    return this.areasService.listMembers(areaId);
  }

  // DELETE /api/v1/areas/:areaId/members/:userId
  @Delete(':areaId/members/:userId')
  @UseGuards(AreaMemberGuard, RolesGuard)
  @Roles(AreaRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('areaId') areaId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: User,
  ) {
    return this.areasService.removeMember(areaId, targetUserId, user.id);
  }

  // GET /api/v1/areas/:areaId/qr-code
  @Get(':areaId/qr-code')
  @UseGuards(AreaMemberGuard, RolesGuard)
  @Roles(AreaRole.ADMIN)
  generateQrCode(@Param('areaId') areaId: string, @CurrentUser() user: User) {
    return this.areasService.generateQrCode(areaId, user.id);
  }

  // POST /api/v1/areas/:areaId/qr-code/rotate
  @Post(':areaId/qr-code/rotate')
  @UseGuards(AreaMemberGuard, RolesGuard)
  @Roles(AreaRole.ADMIN)
  rotateQrToken(@Param('areaId') areaId: string, @CurrentUser() user: User) {
    return this.areasService.rotateQrToken(areaId, user.id);
  }
}
