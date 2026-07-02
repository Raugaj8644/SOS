import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SafePoint, SafePointType } from './entities/safe-point.entity';
import { AreaMembership, AreaRole } from '../areas/entities/area-membership.entity';
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateSafePointDto {
  @IsString() @MaxLength(150) name: string;
  @IsEnum(SafePointType) type: SafePointType;
  @IsNumber() @Min(-90) @Max(90) lat: number;
  @IsNumber() @Min(-180) @Max(180) lng: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(50) floor?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class UpdateSafePointDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsEnum(SafePointType) type?: SafePointType;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) lng?: number;
  @IsOptional() @IsString() description?: string;
}

@Injectable()
export class SafePointsService {
  constructor(
    @InjectRepository(SafePoint) private readonly repo: Repository<SafePoint>,
    @InjectRepository(AreaMembership) private readonly memberRepo: Repository<AreaMembership>,
    private readonly dataSource: DataSource,
  ) {}

  async create(areaId: string, dto: CreateSafePointDto, userId: string): Promise<SafePoint> {
    await this.assertAdmin(areaId, userId);
    const sp = this.repo.create({
      areaId,
      createdById: userId,
      name: dto.name,
      type: dto.type,
      location: `SRID=4326;POINT(${dto.lng} ${dto.lat})` as any,
      description: dto.description,
      floor: dto.floor,
      metadata: dto.metadata,
    });
    return this.repo.save(sp);
  }

  async findAll(areaId: string, type?: SafePointType): Promise<SafePoint[]> {
    return this.dataSource.query(
      `SELECT sp.*, ST_AsGeoJSON(sp.location)::jsonb AS location_geojson
       FROM safe_points sp
       WHERE sp.area_id = $1 AND sp.is_active = TRUE
       ${type ? 'AND sp.type = $2' : ''}
       ORDER BY sp.name ASC`,
      type ? [areaId, type] : [areaId],
    );
  }

  async update(areaId: string, id: string, dto: UpdateSafePointDto, userId: string): Promise<SafePoint> {
    await this.assertAdmin(areaId, userId);
    const sp = await this.repo.findOne({ where: { id, areaId } });
    if (!sp) throw new NotFoundException('Safe point not found.');
    if (dto.lat && dto.lng) {
      (dto as any).location = `SRID=4326;POINT(${dto.lng} ${dto.lat})`;
    }
    Object.assign(sp, dto);
    return this.repo.save(sp);
  }

  async remove(areaId: string, id: string, userId: string): Promise<void> {
    await this.assertAdmin(areaId, userId);
    await this.repo.update({ id, areaId }, { isActive: false });
  }

  private async assertAdmin(areaId: string, userId: string): Promise<void> {
    const m = await this.memberRepo.findOne({
      where: { areaId, userId, role: AreaRole.ADMIN, isActive: true },
    });
    if (!m) throw new ForbiddenException('Admin role required.');
  }
}
