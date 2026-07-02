import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  SOS              = 'sos',
  INCIDENT_UPDATE  = 'incident_update',
  INCIDENT_CLOSED  = 'incident_closed',
  BROADCAST        = 'broadcast',
  AREA_UPDATE      = 'area_update',
  SAFETY_ALERT     = 'safety_alert',
  MEMBER_JOINED    = 'member_joined',
  SYSTEM           = 'system',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /**
   * Arbitrary payload forwarded to the client (incident id, area id, etc.)
   * Used for deep-linking: tap notification → open incident.
   */
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  /**
   * area_id denormalised for fast scoping queries and area isolation.
   * null for system-level notifications.
   */
  @Index()
  @Column({ name: 'area_id', type: 'varchar', nullable: true })
  areaId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ── Relations ──────────────────────────────────────────
  @Index()
  @ManyToOne(() => User, (u) => u.notifications, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;
}
