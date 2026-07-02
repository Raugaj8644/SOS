import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Area } from './area.entity';
import { User } from '../../users/entities/user.entity';

@Entity('area_invitations')
export class AreaInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Single-use or multi-use token for joining an area.
   * Generated as crypto.randomBytes(32).toString('hex').
   */
  @Index({ unique: true })
  @Column({ unique: true, length: 64 })
  code: string;

  /**
   * Optional: restrict this invitation to a specific email address.
   * If null, anyone with the code can join.
   */
  @Column({ type: 'varchar', nullable: true, length: 255 })
  email: string | null;

  /**
   * Maximum number of times this code can be used.
   * null = unlimited.
   */
  @Column({ name: 'max_uses', nullable: true, type: 'int' })
  maxUses: number | null;

  @Column({ name: 'use_count', default: 0 })
  useCount: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ── Relations ──────────────────────────────────────────
  @ManyToOne(() => Area, (a) => a.invitations, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ name: 'area_id' })
  areaId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;
}
