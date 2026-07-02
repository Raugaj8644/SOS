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

export enum UpdateType {
  STATUS_CHANGE = 'status_change',  // system-generated
  USER_UPDATE   = 'user_update',    // user posted an update
  ADMIN_NOTE    = 'admin_note',     // admin comment
  RESPONDER     = 'responder',      // user confirmed responding
}

@Entity('incident_updates')
export class IncidentUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UpdateType, default: UpdateType.USER_UPDATE })
  type: UpdateType;

  @Column({ type: 'text' })
  message: string;

  /**
   * Optional snapshot of the incident status at update time.
   * Useful for building a status timeline.
   */
  @Column({ name: 'previous_status', type: 'varchar', nullable: true, length: 50 })
  previousStatus: string | null;

  @Column({ name: 'new_status', type: 'varchar', nullable: true, length: 50 })
  newStatus: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ── Relations ──────────────────────────────────────────
  @Index()
  @ManyToOne(() => Incident, (i) => i.updates, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident: Incident;

  @Column({ name: 'incident_id' })
  incidentId: string;

  /**
   * area_id is denormalised here for efficient RLS and queries
   * without requiring a join to incidents every time.
   */
  @Index()
  @Column({ name: 'area_id' })
  areaId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;
}
