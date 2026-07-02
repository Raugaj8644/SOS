'use client';
import { useState } from 'react';
import { MapPin, Clock, Users, ChevronRight, X } from 'lucide-react';
import { incidentsApi } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useIncidentStore, Incident } from '../../stores/incidentStore';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  medical_emergency:   { label: 'Medical Emergency',    icon: '🏥', color: 'bg-red-100 text-red-800 border-red-200' },
  injury:              { label: 'Injury',               icon: '🩹', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  fire:                { label: 'Fire',                 icon: '🔥', color: 'bg-red-100 text-red-800 border-red-200' },
  violence:            { label: 'Violence',             icon: '⚠️',  color: 'bg-purple-100 text-purple-800 border-purple-200' },
  missing_person:      { label: 'Missing Person',       icon: '🔍', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  suspicious_activity: { label: 'Suspicious Activity',  icon: '👁️', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  emergency:           { label: 'Emergency',            icon: '🚨', color: 'bg-red-100 text-red-800 border-red-200' },
  other:               { label: 'Other',                icon: '📢', color: 'bg-slate-100 text-slate-800 border-slate-200' },
};

interface Props {
  incident: Incident;
  compact?: boolean;
}

export function IncidentCard({ incident, compact = false }: Props) {
  const { user } = useAuthStore();
  const { updateIncident } = useIncidentStore();
  const [responding, setResponding] = useState(false);
  const [closing, setClosing] = useState(false);

  const config = TYPE_CONFIG[incident.type] ?? TYPE_CONFIG.emergency;
  const isCreator = user?.id === incident.createdById;
  const isActive = incident.status === 'active';

  const handleRespond = async () => {
    setResponding(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await incidentsApi.respond(incident.areaId, incident.id, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          toast.success('Marked as responding!');
          updateIncident(incident.id, { responderCount: incident.responderCount + 1 });
          setResponding(false);
        });
      } else {
        await incidentsApi.respond(incident.areaId, incident.id, {});
        toast.success('Marked as responding!');
        setResponding(false);
      }
    } catch {
      toast.error('Failed to mark response.');
      setResponding(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Close this incident?')) return;
    setClosing(true);
    try {
      await incidentsApi.close(incident.areaId, incident.id, {
        closeReason: 'Resolved by creator',
      });
      updateIncident(incident.id, { status: 'resolved' });
      toast.success('Incident closed.');
    } catch {
      toast.error('Failed to close incident.');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-md
      ${isActive ? 'border-red-200' : 'border-slate-200 opacity-70'}
      ${compact ? '' : 'shadow-sm'}`}
    >
      {/* Active indicator */}
      {isActive && <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />}

      <div className="p-4">
        {/* Type badge + time */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
            text-xs font-semibold border ${config.color}`}>
            {config.icon} {config.label}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock size={11} />
            {(() => { const d = new Date(incident.createdAt); return isNaN(d.getTime()) ? '—' : formatDistanceToNow(d, { addSuffix: true }); })()}
          </span>
        </div>

        {/* Description */}
        {incident.description && (
          <p className="text-sm text-slate-700 mb-3">{incident.description}</p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {incident.responderCount} responding
          </span>
          {!compact && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {incident.creatorName ?? 'Unknown'}
            </span>
          )}
        </div>

        {/* Actions */}
        {!compact && isActive && (
          <div className="flex gap-2 mt-4">
            {!isCreator && (
              <button
                onClick={handleRespond}
                disabled={responding}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300
                           text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {responding ? 'Confirming…' : '✋ I\'m Responding'}
              </button>
            )}
            {isCreator && (
              <button
                onClick={handleClose}
                disabled={closing}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-300
                           text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {closing ? 'Closing…' : '✅ Close Incident'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
