import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';

export enum AuditAction {
  // Auth
  LOGIN              = 'login',
  LOGOUT             = 'logout',
  REGISTER           = 'register',
  PASSWORD_CHANGE    = 'password_change',
  TOKEN_REFRESH      = 'token_refresh',
  ACCOUNT_LOCKED     = 'account_locked',

  // Areas
  AREA_CREATE        = 'area_create',
  AREA_UPDATE        = 'area_update',
  AREA_DELETE        = 'area_delete',
  AREA_JOIN          = 'area_join',
  AREA_LEAVE         = 'area_leave',
  MEMBER_REMOVED     = 'member_removed',

  // Incidents
  INCIDENT_CREATE    = 'incident_create',
  INCIDENT_UPDATE    = 'incident_update',
  INCIDENT_CLOSE     = 'incident_close',
  INCIDENT_RESPOND   = 'incident_respond',
  INCIDENT_FLAG      = 'incident_flag',

  // Safe Points
  SAFE_POINT_CREATE  = 'safe_point_create',
  SAFE_POINT_UPDATE  = 'safe_point_update',
  SAFE_POINT_DELETE  = 'safe_point_delete',

  // Admin
  BROADCAST_SEND     = 'broadcast_send',
  REPORT_EXPORT      = 'report_export',
}

/**
 * Append-only audit log. No UPDATE or DELETE on this table (enforced by DB trigger).
 * Every state-changing action in the system creates one record here.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  /**
   * The type of entity being acted on (e.g., 'incident', 'area', 'user').
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 50, nullable: true })
  entityType: string | null;

  /**
   * The UUID of the entity being acted on.
   */
  @Column({ name: 'entity_id', type: 'varchar', length: 36, nullable: true })
  entityId: string | null;

  /**
   * Snapshot of entity state before the action.
   */
  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, unknown> | null;

  /**
   * Snapshot of entity state after the action.
   */
  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, unknown> | null;

  /**
   * area_id for scoping admin audit views.
   */
  @Index()
  @Column({ name: 'area_id', type: 'varchar', nullable: true })
  areaId: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  /**
   * Additional context (e.g., rejection reason, geolocation at time of action).
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ── Relations ──────────────────────────────────────────
  /**
   * Nullable: system-generated events may not have a user.
   */
  @Index()
  @ManyToOne(() => User, (u) => u.auditLogs, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId: string | null;
}
