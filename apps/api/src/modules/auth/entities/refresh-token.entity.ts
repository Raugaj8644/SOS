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

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * bcrypt hash of the raw refresh token.
   * The raw token is only sent to the client once, never stored plain.
   * On refresh: compare raw token against this hash.
   */
  @Index({ unique: true })
  @Column({ name: 'token_hash', unique: true, length: 255 })
  tokenHash: string;

  /**
   * Device/browser info for the "active sessions" screen.
   */
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null; // IPv4 or IPv6

  @Column({ name: 'device_name', type: 'varchar', length: 100, nullable: true })
  deviceName: string | null; // e.g., "iPhone 14", "Chrome on Windows"

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /**
   * True after the token has been used once.
   * Enables refresh token rotation: each use issues a new token
   * and marks this one as revoked.
   */
  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  /**
   * Token that replaced this one (audit trail for rotation).
   */
  @Column({ name: 'replaced_by', type: 'varchar', nullable: true, length: 36 })
  replacedBy: string | null; // UUID of new token

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ── Relations ──────────────────────────────────────────
  @Index()
  @ManyToOne(() => User, (u) => u.refreshTokens, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;
}
