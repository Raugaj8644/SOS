import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  Controller, Get, Post, Body, Param,
  UseGuards, Query,
} from '@nestjs/common';
import { Broadcast, BroadcastPriority } from './entities/broadcast.entity';
import { AreaMembership, AreaRole } from '../areas/entities/area-membership.entity';
import { Area } from '../areas/entities/area.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AreaMemberGuard } from '../../common/guards/area-member.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

class CreateBroadcastDto {
  @IsString() @MaxLength(200) title: string;
  @IsString() @MaxLength(5000) message: string;
  @IsOptional() @IsEnum(BroadcastPriority) priority?: BroadcastPriority;
}

@Injectable()
class AnalyticsService {
  constructor(
    @InjectRepository(Broadcast) private readonly broadcastRepo: Repository<Broadcast>,
    @InjectRepository(AreaMembership) private readonly memberRepo: Repository<AreaMembership>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async getStats(areaId: string) {
    const [stats] = await this.dataSource.query(
      `
      SELECT
        (SELECT COUNT(*) FROM incidents WHERE area_id = $1) AS total_incidents,
        (SELECT COUNT(*) FROM incidents WHERE area_id = $1 AND status = 'active') AS active_incidents,
        (SELECT COUNT(*) FROM incidents WHERE area_id = $1 AND status = 'resolved') AS resolved_incidents,
        (SELECT COUNT(*) FROM area_memberships WHERE area_id = $1 AND is_active = TRUE) AS total_members,
        (SELECT COUNT(*) FROM incidents WHERE area_id = $1
          AND created_at >= NOW() - INTERVAL '24 hours') AS incidents_last_24h,
        (SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60)
          FROM incidents WHERE area_id = $1 AND status = 'resolved') AS avg_resolution_minutes
      `,
      [areaId],
    );
    return stats;
  }

  async getIncidentBreakdown(areaId: string) {
    return this.dataSource.query(
      `SELECT type, COUNT(*) AS count
       FROM incidents WHERE area_id = $1
       GROUP BY type ORDER BY count DESC`,
      [areaId],
    );
  }

  async sendBroadcast(
    areaId: string,
    dto: CreateBroadcastDto,
    userId: string,
  ): Promise<Broadcast> {
    const broadcast = await this.broadcastRepo.save({
      areaId,
      createdById: userId,
      title: dto.title,
      message: dto.message,
      priority: dto.priority ?? BroadcastPriority.NORMAL,
    });

    const members = await this.memberRepo.find({
      where: { areaId, isActive: true, notificationsEnabled: true },
      relations: ['user'],
    });

    const fcmTokens = members.map((m) => m.user?.fcmToken).filter(Boolean) as string[];

    await Promise.allSettled(
      members.map((m) =>
        this.notificationsService.create({
          userId: m.userId,
          areaId,
          type: NotificationType.BROADCAST,
          title: dto.title,
          body: dto.message,
          data: { broadcastId: broadcast.id },
        }),
      ),
    );

    if (fcmTokens.length > 0) {
      await this.notificationsService.sendFcmBatch(fcmTokens, {
        title: dto.title,
        body: dto.message,
        data: { broadcastId: broadcast.id, screen: 'broadcast' },
      });
    }

    await this.broadcastRepo.update(broadcast.id, {
      recipientCount: members.length,
      sentAt: new Date(),
    });

    return broadcast;
  }

  async listBroadcasts(areaId: string): Promise<Broadcast[]> {
    return this.broadcastRepo.find({
      where: { areaId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}

@Controller({ path: 'areas/:areaId', version: '1' })
@UseGuards(JwtAuthGuard, AreaMemberGuard)
class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('analytics')
  @UseGuards(RolesGuard)
  @Roles(AreaRole.ADMIN)
  getStats(@Param('areaId') areaId: string) {
    return this.analyticsService.getStats(areaId);
  }

  @Get('analytics/breakdown')
  @UseGuards(RolesGuard)
  @Roles(AreaRole.ADMIN)
  getBreakdown(@Param('areaId') areaId: string) {
    return this.analyticsService.getIncidentBreakdown(areaId);
  }

  @Post('broadcasts')
  @UseGuards(RolesGuard)
  @Roles(AreaRole.ADMIN)
  sendBroadcast(
    @Param('areaId') areaId: string,
    @Body() dto: CreateBroadcastDto,
    @CurrentUser() user: User,
  ) {
    return this.analyticsService.sendBroadcast(areaId, dto, user.id);
  }

  @Get('broadcasts')
  listBroadcasts(@Param('areaId') areaId: string) {
    return this.analyticsService.listBroadcasts(areaId);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Broadcast, AreaMembership, Area]),
    NotificationsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
