// ── Shared constants across API + Web ─────────────────────────────────────────

export const INCIDENT_QUEUE     = 'incident';
export const NOTIFICATION_QUEUE = 'notification';
export const MEDIA_QUEUE        = 'media';

export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_AREA:  'area:join',
  LEAVE_AREA: 'area:leave',

  // Server → Client
  INCIDENT_CREATED:  'incident:created',
  INCIDENT_UPDATED:  'incident:updated',
  INCIDENT_CLOSED:   'incident:closed',
  RESPONDER_JOINED:  'incident:responder_joined',
  BROADCAST:         'area:broadcast',
  MEMBER_JOINED:     'area:member_joined',
} as const;

export const HOLD_DURATION_MS = 3000;  // SOS button hold time

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  medical_emergency:   '🏥 Medical Emergency',
  injury:              '🩹 Injury',
  fire:                '🔥 Fire',
  violence:            '⚠️ Violence / Threat',
  missing_person:      '🔍 Missing Person',
  suspicious_activity: '👁️ Suspicious Activity',
  emergency:           '🚨 Emergency',
  other:               '📢 Other',
};

export const DEFAULT_PROXIMITY_RADIUS_M = 5000; // 5 km geo-detection
export const MAX_UPLOAD_BYTES           = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES         = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
