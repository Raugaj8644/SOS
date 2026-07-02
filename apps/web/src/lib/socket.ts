import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('cerp_access_token')
      : null;

    socket = io(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/ws`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
}

export const SOCKET_EVENTS = {
  // Server → Client
  INCIDENT_CREATED:     'incident:created',
  INCIDENT_UPDATED:     'incident:updated',
  INCIDENT_CLOSED:      'incident:closed',
  RESPONDER_ADDED:      'incident:responder_added',
  BROADCAST_NEW:        'broadcast:new',
  AREA_ALERT:           'area:alert',
  LOCATION_UPDATE:      'location:update',
  LOCATION_STOP:        'location:stop',
  // Client → Server
  JOIN_AREA:            'join_area',
  LEAVE_AREA:           'leave_area',
  SEND_LOCATION:        'location:update',  // same event name, different direction
  STOP_LOCATION:        'location:stop',
} as const;
