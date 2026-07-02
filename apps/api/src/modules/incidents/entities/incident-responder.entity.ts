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
import { Incident } from './incident.entity';
import { User } from '../../users/entities/user.entity';

@Entity('incident_responders')
@Unique(['incident', 'user']) // a user can only confirm response once per incident
export class IncidentResponder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * GPS location of the responder at the time they confirmed response.
   * Used to calculate distance to incident and display on the map.
   */
  @Column({
    name: 'responder_location',
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  responderLocation: string | null;

  /**
   * Estimated walking distance in meters (computed via PostGIS ST_Distance).
   * Cached on confirmation to avoid repeated geo calculations.
   */
  @Column({ name: 'distance_meters', type: 'float', nullable: true })
  distanceMeters: number | null;

  /**
   * Whether the responder has arrived at the incident location.
   */
  @Column({ name: 'has_arrived', default: false })
  hasArrived: boolean;

  @Column({ name: 'arrived_at', type: 'timestamptz', nullable: true })
  arrivedAt: Date | null;

  @CreateDateColumn({ name: 'responded_at', type: 'timestamptz' })
  respondedAt: Date;

  // ── Relations ──────────────────────────────────────────
  @Index()
  @ManyToOne(() => Incident, (i) => i.responders, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident: Incident;

  @Column({ name: 'incident_id' })
  incidentId: string;

  @Column({ name: 'area_id' })
  areaId: string; // denormalised

  @Index()
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;
}
