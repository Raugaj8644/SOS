import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Incident, IncidentStatus, IncidentType } from './entities/incident.entity';
import { IncidentUpdate, UpdateType } from './entities/incident-update.entity';
import { IncidentResponder } from './entities/incident-responder.entity';
import { Area } from '../areas/entities/area.entity';
import {
  CreateIncidentDto,
  CloseIncidentDto,
  RespondToIncidentDto,
  PostIncidentUpdateDto,
} from './dto/create-incident.dto';
import { IncidentsProcessor } from './incidents.processor';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    @InjectRepository(Incident) private readonly incidentRepo: Repository<Incident>,
    @InjectRepository(IncidentUpdate) private readonly updateRepo: Repository<IncidentUpdate>,
    @InjectRepository(IncidentResponder) private readonly responderRepo: Repository<IncidentResponder>,
    @InjectRepository(Area) private readonly areaRepo: Repository<Area>,
    private readonly processor: IncidentsProcessor,
    private readonly dataSource: DataSource,
  ) {}

  // ── Trigger SOS ─────────────────────────────────────────────────────────────
  async create(
    areaId: string,
    dto: CreateIncidentDto,
    userId: string,
  ): Promise<Incident> {
    // 1. Verify location is inside the Area polygon (skip if area has no polygon)
    const [locationCheck] = await this.dataSource.query(
      `SELECT polygon IS NULL OR ST_Contains(polygon, ST_SetSRID(ST_Point($1, $2), 4326)) AS inside
       FROM areas WHERE id = $3`,
      [dto.lng, dto.lat, areaId],
    );

    if (locationCheck && locationCheck.inside === false) {
      throw new BadRequestException(
        'Your location is outside the Area boundary.',
      );
    }

    const incident = this.incidentRepo.create({
      areaId,
      createdById: userId,
      type: dto.type ?? IncidentType.EMERGENCY,
      status: IncidentStatus.ACTIVE,
      location: { type: 'Point', coordinates: [dto.lng, dto.lat] } as any,
      locationAccuracy: dto.accuracy ?? null,
      description: dto.description ?? null,
    });

    const saved = await this.incidentRepo.save(incident);

    // 2. Process async — fire-and-forget to keep response fast
    setImmediate(() =>
      this.processor.handleIncidentCreated({
        incidentId: saved.id, areaId,
        lat: dto.lat ?? null, lng: dto.lng ?? null,
      }).catch((err) => this.logger.error('Failed to process incident.created', err)),
    );

    return saved;
  }

  // ── List active incidents in an Area ────────────────────────────────────────
  async findAll(
    areaId: string,
    status?: IncidentStatus,
  ): Promise<Incident[]> {
    return this.dataSource.query(
      `
      SELECT
        i.*,
        ST_AsGeoJSON(i.location)::jsonb AS location_geojson,
        u.name AS creator_name,
        u.avatar_url AS creator_avatar
      FROM incidents i
      JOIN users u ON u.id = i.created_by
      WHERE i.area_id = $1
        ${status ? 'AND i.status = $2' : "AND i.status = 'active'"}
      ORDER BY i.created_at DESC
      LIMIT 100
      `,
      status ? [areaId, status] : [areaId],
    );
  }

  // ── Get single incident ──────────────────────────────────────────────────────
  async findOne(areaId: string, incidentId: string): Promise<Incident> {
    const result = await this.dataSource.query(
      `
      SELECT
        i.*,
        ST_AsGeoJSON(i.location)::jsonb AS location_geojson
      FROM incidents i
      WHERE i.id = $1 AND i.area_id = $2
      `,
      [incidentId, areaId],
    );
    if (!result[0]) throw new NotFoundException('Incident not found.');
    return result[0];
  }

  // ── Close incident (creator only) ────────────────────────────────────────────
  async close(
    areaId: string,
    incidentId: string,
    dto: CloseIncidentDto,
    userId: string,
  ): Promise<Incident> {
    const incident = await this.incidentRepo.findOne({
      where: { id: incidentId, areaId },
    });
    if (!incident) throw new NotFoundException('Incident not found.');
    if (incident.createdById !== userId) {
      throw new ForbiddenException(
        'Only the incident creator can close this incident.',
      );
    }
    if (incident.status !== IncidentStatus.ACTIVE) {
      throw new BadRequestException('Incident is not active.');
    }

    incident.status = IncidentStatus.RESOLVED;
    incident.resolvedAt = new Date();
    incident.closedById = userId;
    incident.closeReason = dto.closeReason ?? null;
    const saved = await this.incidentRepo.save(incident);

    // Post a system update to the timeline
    await this.updateRepo.save({
      incidentId,
      areaId,
      createdById: userId,
      type: UpdateType.STATUS_CHANGE,
      message: dto.closeReason
        ? `Incident closed: ${dto.closeReason}`
        : 'Incident marked as resolved by creator.',
      previousStatus: IncidentStatus.ACTIVE,
      newStatus: IncidentStatus.RESOLVED,
    });

    setImmediate(() =>
      this.processor.handleIncidentClosed({ incidentId, areaId })
        .catch((err) => this.logger.error('Failed to process incident.closed', err)),
    );

    return saved;
  }

  // ── Confirm responding ───────────────────────────────────────────────────────
  async respond(
    areaId: string,
    incidentId: string,
    dto: RespondToIncidentDto,
    userId: string,
  ): Promise<IncidentResponder> {
    const incident = await this.incidentRepo.findOne({
      where: { id: incidentId, areaId, status: IncidentStatus.ACTIVE },
    });
    if (!incident) throw new NotFoundException('Active incident not found.');

    // Calculate distance if user provided their location
    let distanceMeters: number | null = null;
    let locationWkt: string | null = null;

    if (dto.lat && dto.lng) {
      locationWkt = `SRID=4326;POINT(${dto.lng} ${dto.lat})`;
      const [dist] = await this.dataSource.query(
        `SELECT ST_Distance(
           ST_SetSRID(ST_Point($1, $2), 4326)::geography,
           location::geography
         ) AS dist FROM incidents WHERE id = $3`,
        [dto.lng, dto.lat, incidentId],
      );
      distanceMeters = dist?.dist ?? null;
    }

    const responder = this.responderRepo.create({
      incidentId,
      areaId,
      userId,
      responderLocation: locationWkt as any,
      distanceMeters,
    });

    const saved = await this.responderRepo.save(responder);

    // Increment denormalised count
    await this.incidentRepo.increment({ id: incidentId }, 'responderCount', 1);

    setImmediate(() => this.processor.handleResponded({ incidentId, areaId, userId, distanceMeters }));

    return saved;
  }

  // ── Post update to incident timeline ─────────────────────────────────────────
  async postUpdate(
    areaId: string,
    incidentId: string,
    dto: PostIncidentUpdateDto,
    userId: string,
  ): Promise<IncidentUpdate> {
    const incident = await this.incidentRepo.findOne({
      where: { id: incidentId, areaId },
    });
    if (!incident) throw new NotFoundException('Incident not found.');

    const update = await this.updateRepo.save({
      incidentId,
      areaId,
      createdById: userId,
      type: UpdateType.USER_UPDATE,
      message: dto.message,
    });

    setImmediate(() => this.processor.handleUpdatePosted({ incidentId, areaId, updateId: update.id }));

    return update;
  }

  // ── Get incident timeline ────────────────────────────────────────────────────
  async getUpdates(areaId: string, incidentId: string): Promise<IncidentUpdate[]> {
    return this.updateRepo.find({
      where: { incidentId, areaId },
      relations: ['createdBy'],
      order: { createdAt: 'ASC' },
    });
  }

  // ── Get responders ────────────────────────────────────────────────────────────
  async getResponders(areaId: string, incidentId: string): Promise<IncidentResponder[]> {
    return this.responderRepo.find({
      where: { incidentId, areaId },
      relations: ['user'],
      order: { respondedAt: 'ASC' },
    });
  }
}
