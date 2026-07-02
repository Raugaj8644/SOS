import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { IncidentsGateway } from './incidents.gateway';
import { IncidentsProcessor } from './incidents.processor';
import { Incident } from './entities/incident.entity';
import { IncidentUpdate } from './entities/incident-update.entity';
import { IncidentResponder } from './entities/incident-responder.entity';
import { IncidentMedia } from './entities/incident-media.entity';
import { Area } from '../areas/entities/area.entity';
import { AreaMembership } from '../areas/entities/area-membership.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Incident, IncidentUpdate, IncidentResponder, IncidentMedia,
      Area, AreaMembership,
    ]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService, IncidentsGateway, IncidentsProcessor],
  exports: [IncidentsService, IncidentsGateway],
})
export class IncidentsModule {}
