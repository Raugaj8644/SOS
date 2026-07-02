import {
  Controller, Get, Post, Patch, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IncidentsService } from './incidents.service';
import {
  CreateIncidentDto, CloseIncidentDto,
  RespondToIncidentDto, PostIncidentUpdateDto,
} from './dto/create-incident.dto';
import { IncidentStatus } from './entities/incident.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AreaMemberGuard } from '../../common/guards/area-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { IsEnum, IsOptional } from 'class-validator';

class IncidentQuery {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;
}

@Controller({ path: 'areas/:areaId/incidents', version: '1' })
@UseGuards(JwtAuthGuard, AreaMemberGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  // POST /api/v1/areas/:areaId/incidents  ← SOS Trigger
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // 5 SOS per minute per user
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('areaId') areaId: string,
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: User,
  ) {
    return this.incidentsService.create(areaId, dto, user.id);
  }

  // GET /api/v1/areas/:areaId/incidents?status=active
  @Get()
  findAll(@Param('areaId') areaId: string, @Query() query: IncidentQuery) {
    return this.incidentsService.findAll(areaId, query.status);
  }

  // GET /api/v1/areas/:areaId/incidents/:incidentId
  @Get(':incidentId')
  findOne(
    @Param('areaId') areaId: string,
    @Param('incidentId') incidentId: string,
  ) {
    return this.incidentsService.findOne(areaId, incidentId);
  }

  // PATCH /api/v1/areas/:areaId/incidents/:incidentId/close
  @Patch(':incidentId/close')
  close(
    @Param('areaId') areaId: string,
    @Param('incidentId') incidentId: string,
    @Body() dto: CloseIncidentDto,
    @CurrentUser() user: User,
  ) {
    return this.incidentsService.close(areaId, incidentId, dto, user.id);
  }

  // POST /api/v1/areas/:areaId/incidents/:incidentId/respond
  @Post(':incidentId/respond')
  respond(
    @Param('areaId') areaId: string,
    @Param('incidentId') incidentId: string,
    @Body() dto: RespondToIncidentDto,
    @CurrentUser() user: User,
  ) {
    return this.incidentsService.respond(areaId, incidentId, dto, user.id);
  }

  // POST /api/v1/areas/:areaId/incidents/:incidentId/updates
  @Post(':incidentId/updates')
  postUpdate(
    @Param('areaId') areaId: string,
    @Param('incidentId') incidentId: string,
    @Body() dto: PostIncidentUpdateDto,
    @CurrentUser() user: User,
  ) {
    return this.incidentsService.postUpdate(areaId, incidentId, dto, user.id);
  }

  // GET /api/v1/areas/:areaId/incidents/:incidentId/updates
  @Get(':incidentId/updates')
  getUpdates(
    @Param('areaId') areaId: string,
    @Param('incidentId') incidentId: string,
  ) {
    return this.incidentsService.getUpdates(areaId, incidentId);
  }

  // GET /api/v1/areas/:areaId/incidents/:incidentId/responders
  @Get(':incidentId/responders')
  getResponders(
    @Param('areaId') areaId: string,
    @Param('incidentId') incidentId: string,
  ) {
    return this.incidentsService.getResponders(areaId, incidentId);
  }
}
