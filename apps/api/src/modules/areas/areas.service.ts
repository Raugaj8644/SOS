import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { Area } from './entities/area.entity';
import { AreaMembership, AreaRole, JoinMethod } from './entities/area-membership.entity';
import { AreaInvitation } from './entities/area-invitation.entity';
import { User } from '../users/entities/user.entity';
import { CreateAreaDto, UpdateAreaDto, JoinAreaDto } from './dto/create-area.dto';

@Injectable()
export class AreasService {
  private readonly logger = new Logger(AreasService.name);

  constructor(
    @InjectRepository(Area) private readonly areaRepo: Repository<Area>,
    @InjectRepository(AreaMembership) private readonly memberRepo: Repository<AreaMembership>,
    @InjectRepository(AreaInvitation) private readonly invitationRepo: Repository<AreaInvitation>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Create Area ─────────────────────────────────────────────────────────────
  async create(dto: CreateAreaDto, userId: string): Promise<Area> {
    const qrToken = randomBytes(32).toString('hex');
    const inviteCode = this.generateInviteCode();

    return this.dataSource.transaction(async (manager) => {
      const area = manager.create(Area, {
        ...dto,
        polygon: (dto.polygon ?? null) as any,
        qrToken,
        inviteCode,
        createdById: userId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      });
      const saved = await manager.save(area);

      // Creator is automatically an Admin member
      await manager.save(AreaMembership, {
        areaId: saved.id,
        userId,
        role: AreaRole.ADMIN,
        joinMethod: JoinMethod.MANUAL,
      });

      return saved;
    });
  }

  // ── Update Area ─────────────────────────────────────────────────────────────
  async update(areaId: string, dto: UpdateAreaDto, userId: string): Promise<Area> {
    const area = await this.findOneOrFail(areaId);
    await this.assertAdmin(areaId, userId);

    Object.assign(area, dto);
    return this.areaRepo.save(area);
  }

  // ── Delete Area ─────────────────────────────────────────────────────────────
  async remove(areaId: string, userId: string): Promise<void> {
    await this.assertAdmin(areaId, userId);
    await this.areaRepo.update(areaId, { isActive: false });
  }

  /** Force-delete any area — global admin bypass (no membership check) */
  async forceRemove(areaId: string): Promise<void> {
    const area = await this.areaRepo.findOne({ where: { id: areaId } });
    if (!area) throw new NotFoundException(`Area ${areaId} not found.`);
    await this.areaRepo.update(areaId, { isActive: false });
  }

  /** List ALL areas (global admin view) */
  async findAll(includeInactive = false): Promise<Area[]> {
    return this.areaRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Get single area (with safe points count) ─────────────────────────────────
  async findOne(areaId: string): Promise<Area> {
    return this.findOneOrFail(areaId);
  }

  // ── Discover nearby areas ────────────────────────────────────────────────────
  async findNearby(lat: number, lng: number, radiusMeters = 500): Promise<Area[]> {
    return this.dataSource.query(
      `
      SELECT a.*,
        ST_Distance(
          a.centroid::geography,
          ST_SetSRID(ST_Point($1, $2), 4326)::geography
        ) AS distance_meters
      FROM areas a
      WHERE a.is_active = TRUE
        AND a.is_public = TRUE
        AND ST_DWithin(
          a.centroid::geography,
          ST_SetSRID(ST_Point($1, $2), 4326)::geography,
          $3
        )
      ORDER BY distance_meters ASC
      LIMIT 20
      `,
      [lng, lat, radiusMeters],
    );
  }

  // ── Join Area ────────────────────────────────────────────────────────────────
  async join(dto: JoinAreaDto, userId: string): Promise<AreaMembership> {
    let area: Area | null = null;
    let method = JoinMethod.GEO;

    if (dto.token) {
      // 1) Try QR token
      area = await this.areaRepo.findOne({
        where: { qrToken: dto.token, isActive: true },
      });
      if (area) { method = JoinMethod.QR_CODE; }

      // 2) Try area inviteCode (short code on area itself)
      if (!area) {
        area = await this.areaRepo.findOne({
          where: { inviteCode: dto.token.toUpperCase(), isActive: true },
        });
        if (area) { method = JoinMethod.INVITE; }
      }

      // 3) Try AreaInvitation table
      if (!area) {
        const invitation = await this.invitationRepo.findOne({
          where: { code: dto.token, isActive: true },
          relations: ['area'],
        });
        if (invitation) {
          if (invitation.expiresAt && invitation.expiresAt < new Date()) {
            throw new BadRequestException('Invitation has expired.');
          }
          if (invitation.maxUses && invitation.useCount >= invitation.maxUses) {
            throw new BadRequestException('Invitation has reached its maximum uses.');
          }
          area = invitation.area;
          method = JoinMethod.INVITE;
          await this.invitationRepo.increment({ id: invitation.id }, 'useCount', 1);
        }
      }
    } else if (dto.lat && dto.lng) {
      // Geo-based join: find area containing the user's location
      const results = await this.dataSource.query(
        `SELECT * FROM areas WHERE is_active = TRUE AND is_public = TRUE
         AND ST_Contains(polygon, ST_SetSRID(ST_Point($1, $2), 4326))
         LIMIT 1`,
        [dto.lng, dto.lat],
      );
      area = results[0] ?? null;
      method = JoinMethod.GEO;
    }

    if (!area) throw new NotFoundException('Area not found.');
    if (!area.isPublic) throw new ForbiddenException('This Area is private.');

    // Check already a member
    const existing = await this.memberRepo.findOne({
      where: { areaId: area.id, userId, isActive: true },
    });
    if (existing) throw new ConflictException('You are already a member of this Area.');

    // Check max members
    if (area.maxMembers) {
      const count = await this.memberRepo.count({
        where: { areaId: area.id, isActive: true },
      });
      if (count >= area.maxMembers) {
        throw new ForbiddenException('This Area has reached its member limit.');
      }
    }

    return this.memberRepo.save({
      areaId: area.id,
      userId,
      role: AreaRole.USER,
      joinMethod: method,
    });
  }

  // ── Leave Area ───────────────────────────────────────────────────────────────
  async leave(areaId: string, userId: string): Promise<void> {
    const membership = await this.memberRepo.findOne({
      where: { areaId, userId, isActive: true },
    });
    if (!membership) throw new NotFoundException('Membership not found.');
    membership.isActive = false;
    membership.leftAt = new Date();
    await this.memberRepo.save(membership);
  }

  // ── Remove member (admin only) ───────────────────────────────────────────────
  async removeMember(areaId: string, targetUserId: string, adminId: string): Promise<void> {
    await this.assertAdmin(areaId, adminId);
    const membership = await this.memberRepo.findOne({
      where: { areaId, userId: targetUserId, isActive: true },
    });
    if (!membership) throw new NotFoundException('Member not found.');
    membership.isActive = false;
    membership.leftAt = new Date();
    await this.memberRepo.save(membership);
  }

  // ── List members ────────────────────────────────────────────────────────────
  async listMembers(areaId: string): Promise<AreaMembership[]> {
    return this.memberRepo.find({
      where: { areaId, isActive: true },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });
  }

  // ── Promote/demote member ────────────────────────────────────────────────────
  async updateMemberRole(
    areaId: string,
    targetUserId: string,
    newRole: AreaRole,
    adminId: string,
  ): Promise<AreaMembership> {
    await this.assertAdmin(areaId, adminId);
    const membership = await this.memberRepo.findOne({
      where: { areaId, userId: targetUserId, isActive: true },
    });
    if (!membership) throw new NotFoundException('Member not found.');
    membership.role = newRole;
    return this.memberRepo.save(membership);
  }

  // ── Generate QR Code image ────────────────────────────────────────────────────
  async generateQrCode(areaId: string, userId: string): Promise<string> {
    await this.assertAdmin(areaId, userId);
    const area = await this.findOneOrFail(areaId);
    const joinUrl = `${process.env.APP_URL}/areas/join?token=${area.qrToken}`;
    return QRCode.toDataURL(joinUrl, { width: 400, margin: 2 });
  }

  // ── Rotate QR token ───────────────────────────────────────────────────────────
  async rotateQrToken(areaId: string, userId: string): Promise<{ qrToken: string }> {
    await this.assertAdmin(areaId, userId);
    const newToken = randomBytes(32).toString('hex');
    await this.areaRepo.update(areaId, { qrToken: newToken });
    return { qrToken: newToken };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────
  private async findOneOrFail(areaId: string): Promise<Area> {
    // Use raw query to get polygon/centroid as GeoJSON instead of raw WKB
    const rows = await this.dataSource.query(
      `SELECT *,
              ST_AsGeoJSON(polygon)  AS polygon_geojson,
              ST_AsGeoJSON(centroid) AS centroid_geojson
       FROM areas
       WHERE id = $1 AND is_active = true
       LIMIT 1`,
      [areaId],
    );
    if (!rows.length) throw new NotFoundException(`Area ${areaId} not found.`);
    const row = rows[0];
    // dataSource.query() returns raw snake_case columns — map to camelCase manually
    const area = this.areaRepo.create({
      id:             row.id,
      name:           row.name,
      description:    row.description,
      type:           row.type,
      qrToken:        row.qr_token,
      inviteCode:     row.invite_code,
      isPublic:       row.is_public,
      isActive:       row.is_active,
      expiresAt:      row.expires_at,
      maxMembers:     row.max_members,
      logoUrl:        row.logo_url,
      contactEmail:   row.contact_email,
      emergencyPhone: row.emergency_phone,
      createdById:    row.created_by,
      createdAt:      row.created_at,
      updatedAt:      row.updated_at,
      polygon:  row.polygon_geojson  ? JSON.parse(row.polygon_geojson)  : null,
      centroid: row.centroid_geojson ? JSON.parse(row.centroid_geojson) : null,
    }) as any;
    return area;
  }

  private async assertAdmin(areaId: string, userId: string): Promise<void> {
    const membership = await this.memberRepo.findOne({
      where: { areaId, userId, role: AreaRole.ADMIN, isActive: true },
    });
    if (!membership) {
      throw new ForbiddenException('Admin role required for this action.');
    }
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

}
