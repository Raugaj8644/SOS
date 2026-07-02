import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Area } from './area.entity';

export enum AreaRole {
  ADMIN = 'admin',
  USER  = 'user',
}

export enum JoinMethod {
  QR_CODE    = 'qr_code',
  INVITE     = 'invite',
  GEO        = 'geo',         // auto-detected by proximity
  MANUAL     = 'manual',      // admin manually added
}

@Entity('area_memberships')
@Unique(['area', 'user']) // one membership per user per area
export class AreaMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AreaRole, default: AreaRole.USER })
  role: AreaRole;

  /**
   * How the user joined. Tracked for analytics + audit.
   */
  @Column({ name: 'join_method', type: 'enum', enum: JoinMethod, default: JoinMethod.MANUAL })
  joinMethod: JoinMethod;

  /**
   * Soft-delete: admin can remove a member, member can leave.
   * Preserves history for audit trails.
   */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /**
   * When a member leaves or is removed, record it.
   */
  @Column({ name: 'left_at', type: 'timestamptz', nullable: true })
  leftAt: Date | null;

  /**
   * Whether this member receives push notifications for this Area.
   * Users can silence a specific area without leaving.
   */
  @Column({ name: 'notifications_enabled', default: true })
  notificationsEnabled: boolean;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;

  // ── Relations ──────────────────────────────────────────
  @Index()
  @ManyToOne(() => Area, (a) => a.memberships, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ name: 'area_id' })
  areaId: string;

  @Index()
  @ManyToOne(() => User, (u) => u.memberships, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  /**
   * If added by an admin — track who invited whom.
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invited_by' })
  invitedBy: User | null;

  @Column({ name: 'invited_by', type: 'varchar', nullable: true })
  invitedById: string | null;
}
