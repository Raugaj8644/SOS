import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidentsGateway } from './incidents.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AreaMembership } from '../areas/entities/area-membership.entity';
import { Incident } from './entities/incident.entity';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class IncidentsProcessor {
  private readonly logger = new Logger(IncidentsProcessor.name);

  constructor(
    @InjectRepository(AreaMembership)
    private readonly memberRepo: Repository<AreaMembership>,
    @InjectRepository(Incident)
    private readonly incidentRepo: Repository<Incident>,
    private readonly gateway: IncidentsGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleIncidentCreated(data: {
    incidentId: string; areaId: string; lat?: number | null; lng?: number | null;
  }): Promise<void> {
    const { incidentId, areaId, lat, lng } = data;
    this.logger.log(`Processing incident.created: ${incidentId}`);

    const incident = await this.incidentRepo.findOne({
      where: { id: incidentId },
      relations: ['createdBy'],
    });
    if (!incident) return;

    this.gateway.emitToArea(areaId, 'incident:created', {
      id: incident.id, type: incident.type, severity: incident.severity,
      createdById: incident.createdById, creatorName: incident.createdBy?.name,
      areaId, createdAt: incident.createdAt,
    });

    const members = await this.memberRepo.find({
      where: { areaId, isActive: true, notificationsEnabled: true },
      relations: ['user'],
    });

    const fcmTokens = members.map((m) => m.user?.fcmToken).filter((t): t is string => !!t);
    const title = `🚨 SOS Alert — ${incident.type.replace(/_/g, ' ').toUpperCase()}`;
    const body = `${incident.createdBy?.name ?? 'Someone'} triggered an emergency in your area.`;
    const coordData: Record<string, string> =
      lat != null && lng != null ? { lat: String(lat), lng: String(lng) } : {};

    await Promise.allSettled(
      members.map((m) =>
        this.notificationsService.create({
          userId: m.userId, areaId, type: NotificationType.SOS, title, body,
          data: { incidentId, areaId, type: incident.type, ...coordData },
        }),
      ),
    );

    if (fcmTokens.length > 0) {
      await this.notificationsService.sendFcmBatch(fcmTokens, {
        title, body,
        data: { incidentId, areaId, type: incident.type, screen: 'incident', ...coordData },
      });
    }

    this.logger.log(`Notified ${members.length} members for incident ${incidentId}`);
  }

  async handleIncidentClosed(data: { incidentId: string; areaId: string }): Promise<void> {
    const { incidentId, areaId } = data;
    this.gateway.emitToArea(areaId, 'incident:closed', { incidentId, areaId });

    const members = await this.memberRepo.find({ where: { areaId, isActive: true }, relations: ['user'] });
    const fcmTokens = members.map((m) => m.user?.fcmToken).filter((t): t is string => !!t);

    if (fcmTokens.length > 0) {
      await this.notificationsService.sendFcmBatch(fcmTokens, {
        title: '✅ Emergency Resolved',
        body: 'An incident in your area has been marked as resolved.',
        data: { incidentId, areaId, screen: 'incident' },
      });
    }
  }

  handleResponded(data: { incidentId: string; areaId: string; userId: string; distanceMeters: number | null }): void {
    const { incidentId, areaId, userId, distanceMeters } = data;
    this.gateway.emitToArea(areaId, 'incident:responder_added', { incidentId, userId, distanceMeters });
  }

  handleUpdatePosted(data: { incidentId: string; areaId: string; updateId: string }): void {
    const { incidentId, areaId, updateId } = data;
    this.gateway.emitToArea(areaId, 'incident:updated', { incidentId, updateId });
  }
}
