import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Area } from '../../areas/entities/area.entity';
import { User } from '../../users/entities/user.entity';

export enum BroadcastPriority {
  LOW      = 'low',
  NORMAL   = 'normal',
  HIGH     = 'high',
  CRITICAL = 'critical', // triggers loud FCM notification regardless of mute settings
}

@Entity('broadcasts')
export class Broadcast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: BroadcastPriority,
    default: BroadcastPriority.NORMAL,
  })
  priority: BroadcastPriority;

  /**
   * Number of area members who received this broadcast via FCM.
   * Populated asynchronously by the BullMQ notification worker.
   */
  @Column({ name: 'recipient_count', default: 0 })
  recipientCount: number;

  /**
   * Optional: schedule this broadcast for a future time.
   */
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ── Relations ──────────────────────────────────────────
  @Index()
  @ManyToOne(() => Area, (a) => a.broadcasts, { nullable: false, onDelete: 'CASCADE' })
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
