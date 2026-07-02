'use client';
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, SOCKET_EVENTS } from '../lib/socket';
import { useIncidentStore } from '../stores/incidentStore';
import toast from 'react-hot-toast';

export function useSocket(areaId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const addIncident = useIncidentStore((s) => s.addIncident);
  const updateIncident = useIncidentStore((s) => s.updateIncident);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      if (areaId) socket.emit(SOCKET_EVENTS.JOIN_AREA, { areaId });
    });

    socket.on(SOCKET_EVENTS.INCIDENT_CREATED, (incident) => {
      addIncident(incident);
      const label = incident.type?.replace(/_/g, ' ') ?? 'emergency';
      toast.custom(
        (t) => (
          <div className={`flex gap-3 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg
            transition-all duration-300 ${t.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <span className="text-xl">🚨</span>
            <div>
              <p className="font-bold text-sm">SOS Alert</p>
              <p className="text-xs text-red-100">{incident.creatorName} triggered {label}</p>
            </div>
          </div>
        ),
        { duration: 8000, id: `sos-${incident.id}` },
      );
    });

    socket.on(SOCKET_EVENTS.INCIDENT_CLOSED, ({ incidentId }: { incidentId: string }) => {
      updateIncident(incidentId, { status: 'resolved' });
      toast.success('Incident has been resolved.', { id: `close-${incidentId}` });
    });

    socket.on(SOCKET_EVENTS.RESPONDER_ADDED, ({ incidentId }: { incidentId: string }) => {
      updateIncident(incidentId, {});
    });

    return () => {
      if (areaId) socket.emit(SOCKET_EVENTS.LEAVE_AREA, { areaId });
      socket.off(SOCKET_EVENTS.INCIDENT_CREATED);
      socket.off(SOCKET_EVENTS.INCIDENT_CLOSED);
      socket.off(SOCKET_EVENTS.RESPONDER_ADDED);
    };
  }, [areaId]);

  return socketRef.current;
}
