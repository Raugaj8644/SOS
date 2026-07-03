'use client';
import { AlertTriangle } from 'lucide-react';
import { Incident } from '../../stores/incidentStore';
import { IncidentCard } from './IncidentCard';

interface Props {
  areaId: string;
  incidents: Incident[];
}

export function IncidentFeed({ areaId, incidents }: Props) {
  const active = incidents.filter((i) => i.status === 'active');
  const resolved = incidents.filter((i) => i.status !== 'active');

  return (
    <div className="px-4 py-3">
      {active.length > 0 && (
        <div className="mb-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--red)' }} />
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--red)' }}>
              Active Incidents ({active.length})
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {active.map((i) => (
              <div key={i.id} className="min-w-[280px]">
                <IncidentCard incident={i} compact />
              </div>
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-3)' }}>
            Recent ({resolved.length})
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {resolved.slice(0, 5).map((i) => (
              <div key={i.id} className="min-w-[240px]">
                <IncidentCard incident={i} compact />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
