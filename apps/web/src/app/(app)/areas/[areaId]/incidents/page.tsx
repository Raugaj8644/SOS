'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { incidentsApi } from '../../../../../lib/api';
import { useIncidentStore } from '../../../../../stores/incidentStore';
import { useSocket } from '../../../../../hooks/useSocket';
import { IncidentCard } from '../../../../../components/incidents/IncidentCard';
import { FadeInSection } from '../../../../../components/motion/FadeInSection';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function IncidentsPage() {
  const { areaId } = useParams() as { areaId: string };
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'resolved' | 'all'>('active');
  const { setIncidents, getAreaIncidents } = useIncidentStore();
  const incidents = getAreaIncidents(areaId);

  useSocket(areaId);

  useEffect(() => {
    incidentsApi.findAll(areaId, filter === 'all' ? undefined : filter)
      .then((res) => setIncidents(areaId, res.data.data))
      .catch(() => toast.error('Failed to load incidents.'))
      .finally(() => setLoading(false));
  }, [areaId, filter]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Incidents</h1>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          {(['active', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors"
              style={filter === f
                ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-xs)' }
                : { color: 'var(--text-3)' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 128 }} />)}
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-3)' }}>
          <AlertTriangle size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No incidents found</p>
          <p className="text-sm mt-1">{filter === 'active' ? 'All clear — no active incidents' : 'Nothing to show'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident, i) => (
            <FadeInSection key={incident.id} delayMs={Math.min(i, 6) * 40}>
              <IncidentCard incident={incident} />
            </FadeInSection>
          ))}
        </div>
      )}
    </div>
  );
}
