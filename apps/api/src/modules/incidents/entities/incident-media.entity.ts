import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Incident } from './incident.entity';
import { User } from '../../users/entities/user.entity';

export enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
}

@Entity('incident_media')
export class IncidentMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MediaType, default: MediaType.PHOTO })
  type: MediaType;

  /**
   * S3 object key (not full URL — construct URL from key + bucket).
   * Pattern: incidents/{areaId}/{incidentId}/{uuid}.{ext}
   */
  @Column({ name: 's3_key', length: 500 })
  s3Key: string;

  /**
   * Friendly filename for download.
   */
  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  /**
   * File size in bytes. Validated on upload (max 10MB per file).
   */
  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes: number;

  /**
   * Thumbnail S3 key (auto-generated for photos via Sharp).
   */
  @Column({ name: 'thumbnail_key', type: 'varchar', nullable: true, length: 500 })
  thumbnailKey: string | null;

  /**
   * ClamAV scan result. Files are quarantined until scanned = true.
   */
  @Column({ name: 'virus_scanned', default: false })
  virusScanned: boolean;

  @Column({ name: 'is_safe', nullable: true, type: 'boolean' })
  isSafe: boolean | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ── Relations ──────────────────────────────────────────
  @Index()
  @ManyToOne(() => Incident, (i) => i.media, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident: Incident;

  @Column({ name: 'incident_id' })
  incidentId: string;

  @Column({ name: 'area_id' })
  areaId: string; // denormalised

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by' })
  uploadedById: string;
}
