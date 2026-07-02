import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AreaMembership } from './area-membership.entity';
import { SafePoint } from '../../safe-points/entities/safe-point.entity';
import { Incident } from '../../incidents/entities/incident.entity';
import { Broadcast } from '../../analytics/entities/broadcast.entity';
import { AreaInvitation } from './area-invitation.entity';

export enum AreaType {
  UNIVERSITY  = 'university',
  SCHOOL      = 'school',
  COMPANY     = 'company',
  CONCERT     = 'concert',
  CAMP        = 'camp',
  MARATHON    = 'marathon',
  COMMUNITY   = 'community',
  OPEN_HOUSE  = 'open_house',
  OTHER       = 'other',
}

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: AreaType, default: AreaType.OTHER })
  type: AreaType;

  /**
   * PostGIS Polygon geometry in WGS84 (EPSG:4326).
   * Stored as geometry(Polygon, 4326).
   * Admins draw this on the Leaflet map.
   * Use ST_Contains(polygon, point) to check membership.
   */
  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
    nullable: true,
  })
  polygon: string | null; // GeoJSON string; raw WKB in DB

  /**
   * Derived centroid — computed and cached on polygon save.
   * Used for "Nearby Areas" discovery queries (ST_DWithin).
   */
  @Index({ spatial: true })
  @Column({
    name: 'centroid',
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  centroid: string | null;

  /**
   * Opaque token embedded in QR codes.
   * User scans → POST /areas/join?token=<qr_token>
   * Can be rotated by admin to invalidate old QR codes.
   */
  @Index({ unique: true })
  @Column({ name: 'qr_token', unique: true, length: 64 })
  qrToken: string;

  /**
   * Human-readable invite code (e.g., "CAMP-2024-XK7").
   * Optional alternative to QR code.
   */
  @Index({ unique: true })
  @Column({ name: 'invite_code', unique: true, length: 20 })
  inviteCode: string;

  /**
   * Whether the Area is accepting new members.
   */
  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  /**
   * Hard-disable an area (admin-only action).
   */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /**
   * Optional: Area auto-expires at this datetime.
   * Useful for one-day events like concerts or marathons.
   */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'max_members', nullable: true, type: 'int' })
  maxMembers: number | null;

  @Column({ name: 'logo_url', type: 'varchar', nullable: true, length: 500 })
  logoUrl: string | null;

  @Column({ name: 'contact_email', type: 'varchar', nullable: true, length: 255 })
  contactEmail: string | null;

  @Column({ name: 'emergency_phone', type: 'varchar', nullable: true, length: 30 })
  emergencyPhone: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @OneToMany(() => AreaMembership, (m) => m.area)
  memberships: AreaMembership[];

  @OneToMany(() => SafePoint, (sp) => sp.area)
  safePoints: SafePoint[];

  @OneToMany(() => Incident, (i) => i.area)
  incidents: Incident[];

  @OneToMany(() => Broadcast, (b) => b.area)
  broadcasts: Broadcast[];

  @OneToMany(() => AreaInvitation, (inv) => inv.area)
  invitations: AreaInvitation[];
}
