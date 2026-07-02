import {
  Controller, Get, Patch, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

class NotificationsQuery {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 50;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  unread_only?: boolean = false;
}

@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /api/v1/notifications?limit=50&unread_only=false
  @Get()
  findAll(@CurrentUser() user: User, @Query() query: NotificationsQuery) {
    return this.notificationsService.findForUser(
      user.id,
      query.limit ?? 50,
      query.unread_only ?? false,
    );
  }

  // PATCH /api/v1/notifications/read-all  (must be before :id)
  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user.id);
  }

  // PATCH /api/v1/notifications/:id/read
  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.markRead(id, user.id);
  }
}
