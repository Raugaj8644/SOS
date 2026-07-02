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
import { Area } from '../../areas/entities/area.entity';
import { User } from '../../users/entities/user.entity';
import { IncidentUpdate } from './incident-update.entity';
import { IncidentResponder } from './incident-responder.entity';
import { IncidentMedia } from './incident-media.entity';

export enum IncidentType {
  MEDICAL_EMERGENCY  = 'medical_emergency',
  INJURY             = 'injury',
  FIRE               = 'fire',
  VIOLENCE           = 'violence',
  MISSING_PERSON     = 'missing_person',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  OTHER              = 'other',
  EMERGENCY          = 'emergency', // default when no type selected
}

export enum IncidentStatus {
  ACTIVE   = 'active',
  RESOLVED = 'resolved', // marked resolved by creator
  CLOSED   = 'closed',   // admin-force-closed (overrides)
  FALSE    = 'false',    // flagged as false report by admin
}

export enum IncidentSeverity {
  LOW    = 'low',
  MEDIUM = 'medium',
  HIGH   = 'high',
  CRITICAL = 'critical',
}

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'enum', enum: IncidentType, default: IncidentType.EMERGENCY })
  type: IncidentType;

  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.ACTIVE })
  status: IncidentStatus;

  @Column({ type: 'enum', enum: IncidentSeverity, default: IncidentSeverity.HIGH })
  severity: IncidentSeverity;

  /**
   * PostGIS Point geometry in WGS84 (EPSG:4326).
   * Captured automatically from browser Geolocation API at SOS trigger moment.
   * Validated server-side: must be ST_Contains(area.polygon, incident.location).
   */
  @Index({ spatial: true })
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: string; // GeoJSON; raw WKB in DB

  /**
   * GPS accuracy in meters at time of capture.
   * Stored for quality assessment.
   */
  @Column({ name: 'location_accuracy', type: 'float', nullable: true })
  locationAccuracy: number | null;

  /**
   * Optional free-text description from the reporter.
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Additional context: victim count, weapon type, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /**
   * Number of users who have confirmed they are responding.
   * Denormalised for fast display — also derivable from incident_responders count.
   */
  @Column({ name: 'responder_count', default: 0 })
  responderCount: number;

  /**
   * ISO timestamp when the incident was resolved/closed.
   */
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  /**
   * Admin can force-close with a reason.
   */
  @Column({ name: 'close_reason', type: 'text', nullable: true })
  closeReason: string | null;

  /**
   * Tracks if this incident was flagged by the anti-spam system.
   */
  @Column({ name: 'spam_score', type: 'float', default: 0 })
  spamScore: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────
  @Index()
  @ManyToOne(() => Area, (a) => a.incidents, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ name: 'area_id' })
  areaId: string;

  /**
   * The user who triggered the SOS — the ONLY person who can close the incident.
   */
  @Index()
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  /**
   * Who closed the incident (may differ from creator if admin force-closes).
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closed_by' })
  closedBy: User | null;

  @Column({ name: 'closed_by', type: 'varchar', nullable: true })
  closedById: string | null;

  @OneToMany(() => IncidentUpdate, (u) => u.incident)
  updates: IncidentUpdate[];

  @OneToMany(() => IncidentResponder, (r) => r.incident)
  responders: IncidentResponder[];

  @OneToMany(() => IncidentMedia, (m) => m.incident)
  media: IncidentMedia[];
}
