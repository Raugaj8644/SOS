import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { FcmService, FcmMessage } from './fcm.service';

export interface CreateNotificationDto {
  userId: string;
  areaId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly fcmService: FcmService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: dto.userId,
      areaId: dto.areaId ?? null,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data ?? null,
    });
    return this.notificationRepo.save(notification);
  }

  async findForUser(userId: string, limit = 50, unreadOnly = false): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepo.update(
      { id: notificationId, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({ where: { userId, isRead: false } });
  }

  async sendFcmBatch(tokens: string[], message: FcmMessage): Promise<void> {
    return this.fcmService.sendBatch(tokens, message);
  }
}
