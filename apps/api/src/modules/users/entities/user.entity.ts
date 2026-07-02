import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { AreaMembership } from '../../areas/entities/area-membership.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { AuditLog } from '../../../common/entities/audit-log.entity';

export enum GlobalRole {
  SUPER_ADMIN = 'super_admin', // platform-level admin
  USER = 'user',               // default
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true, length: 500 })
  avatarUrl: string | null;

  /**
   * Firebase Cloud Messaging token for push notifications.
   * Updated every time the user logs in on a new device/browser.
   */
  @Column({ name: 'fcm_token', type: 'varchar', nullable: true, length: 500 })
  fcmToken: string | null;

  @Column({
    type: 'enum',
    enum: GlobalRole,
    default: GlobalRole.USER,
  })
  role: GlobalRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  /**
   * Tracks failed login attempts for brute-force protection.
   * Resets to 0 on successful login.
   */
  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  /**
   * Temporarily locks the account after too many failed attempts.
   */
  @Column({ name: 'locked_until', nullable: true, type: 'timestamptz' })
  lockedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ── Relations ──────────────────────────────────────────
  @OneToMany(() => AreaMembership, (m) => m.user)
  memberships: AreaMembership[];

  @OneToMany(() => Notification, (n) => n.user)
  notifications: Notification[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => AuditLog, (al) => al.user)
  auditLogs: AuditLog[];
}
