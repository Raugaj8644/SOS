import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Area } from '../../areas/entities/area.entity';
import { User } from '../../users/entities/user.entity';

export enum SafePointType {
  TOILET           = 'toilet',
  MEDICAL_STATION  = 'medical_station',
  FOOD_COURT       = 'food_court',
  EMERGENCY_EXIT   = 'emergency_exit',
  ASSEMBLY_POINT   = 'assembly_point',
  WATER_STATION    = 'water_station',
  PARKING          = 'parking',
  AED              = 'aed',              // Automated External Defibrillator
  FIRE_EXTINGUISHER = 'fire_extinguisher',
  INFORMATION      = 'information',
  OTHER            = 'other',
}

@Entity('safe_points')
export class SafePoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'enum', enum: SafePointType, default: SafePointType.OTHER })
  type: SafePointType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * PostGIS Point geometry in WGS84 (EPSG:4326).
   * Placed by admin on the Leaflet map.
   * Used to calculate distance from user / incident.
   */
  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: string; // GeoJSON; raw WKB in DB

  /**
   * Floor or level (for multi-story buildings).
   * e.g., "Ground Floor", "Level 2", "B1"
   */
  @Column({ type: 'varchar', nullable: true, length: 50 })
  floor: string | null;

  /**
   * Additional metadata (operating hours, capacity, phone, etc.)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────
  @Index()
  @ManyToOne(() => Area, (a) => a.safePoints, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ name: 'area_id' })
  areaId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;
}
