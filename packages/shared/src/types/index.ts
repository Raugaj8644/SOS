// ── Domain types shared between API and Web ───────────────────────────────────

export type GlobalRole = 'super_admin' | 'user';
export type AreaRole   = 'admin' | 'user';
export type JoinMethod = 'qr_code' | 'invitation' | 'geo_detection' | 'direct';

export type IncidentType =
  | 'medical_emergency' | 'injury' | 'fire' | 'violence'
  | 'missing_person' | 'suspicious_activity' | 'emergency' | 'other';

export type IncidentStatus   = 'active' | 'responding' | 'resolved' | 'false_alarm' | 'cancelled';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SafePointType =
  | 'toilet' | 'medical_station' | 'food_court' | 'emergency_exit'
  | 'assembly_point' | 'water_station' | 'parking' | 'aed'
  | 'fire_extinguisher' | 'information' | 'other';

export type NotificationType =
  | 'sos_triggered' | 'incident_update' | 'responder_joined' | 'incident_closed'
  | 'broadcast' | 'area_invitation' | 'member_joined' | 'safe_point_nearby';

export interface GeoPoint {
  type: 'Point';
  coordinates: [longitude: number, latitude: number];
}

export interface ApiResponse<T> {
  success: boolean;
  data:    T;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page:  number;
  limit: number;
}
