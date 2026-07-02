'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { incidentsApi } from '../../../../../lib/api';
import { useIncidentStore } from '../../../../../stores/incidentStore';
import { useSocket } from '../../../../../hooks/useSocket';
import { IncidentCard } from '../../../../../components/incidents/IncidentCard';
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
        <h1 className="text-xl font-bold text-slate-800">Incidents</h1>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['active', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors
                ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <AlertTriangle size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No incidents found</p>
          <p className="text-sm mt-1">{filter === 'active' ? 'All clear — no active incidents' : 'Nothing to show'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </div>
  );
}
