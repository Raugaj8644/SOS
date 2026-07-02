'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, MapPin } from 'lucide-react';
import { areasApi, incidentsApi, safePointsApi } from '../../../../../lib/api';
import { useSocket } from '../../../../../hooks/useSocket';
import { useGeolocation } from '../../../../../hooks/useGeolocation';
import { SosSpeedDial } from '../../../../../components/sos/SosSpeedDial';
import { IncidentFeed } from '../../../../../components/incidents/IncidentFeed';
import { useIncidentStore } from '../../../../../stores/incidentStore';
import toast from 'react-hot-toast';

// Leaflet must be loaded client-side only
const AreaMap = dynamic(
  () => import('../../../../../components/map/AreaMap').then((m) => m.AreaMap),
  { ssr: false, loading: () => <div className="flex-1 bg-slate-200 animate-pulse" /> },
);

export default function MapPage() {
  const params = useParams();
  const areaId = params.areaId as string;
  const [area, setArea] = useState<any>(null);
  const [safePoints, setSafePoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { position } = useGeolocation(true); // watch mode
  const { setIncidents, getAreaIncidents } = useIncidentStore();
  const incidents = getAreaIncidents(areaId);

  // Connect to WebSocket for this area
  useSocket(areaId);

  useEffect(() => {
    Promise.all([
      areasApi.findOne(areaId),
      incidentsApi.findAll(areaId, 'active'),
      safePointsApi.findAll(areaId),
    ])
      .then(([areaRes, incRes, spRes]) => {
        setArea(areaRes.data.data);
        setIncidents(areaId, incRes.data.data);
        setSafePoints(spRes.data.data);
      })
      .catch(() => toast.error('Failed to load area data.'))
      .finally(() => setLoading(false));
  }, [areaId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0a0a0a', minHeight: '100vh' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <p style={{ color: '#555', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em' }}>LOADING MAP…</p>
        </div>
      </div>
    );
  }

  const activeCount = incidents.filter((i) => i.status === 'active').length;

  return (
    <div className="flex flex-col relative" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Map takes up most of the screen */}
      <div className="flex-1 relative">
        <AreaMap
          area={area}
          incidents={incidents}
          safePoints={safePoints}
          userPosition={position}
        />

        {/* Area name overlay — dark tactical */}
        <div
          className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-2"
          style={{
            background: 'rgba(13,13,13,0.92)',
            border: '1px solid #1f1f1f',
            borderRadius: 8,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className={activeCount > 0 ? 'animate-pulse' : ''}
            style={{ width: 7, height: 7, borderRadius: '50%', background: activeCount > 0 ? '#dc2626' : '#22c55e', flexShrink: 0 }}
          />
          <div>
            <p style={{ color: '#e5e5e5', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }} className="uppercase">
              {area?.name}
            </p>
            <p style={{ color: '#555', fontSize: 9, letterSpacing: '0.1em', marginTop: 1 }}>
              {activeCount > 0 ? `${activeCount} ACTIVE INCIDENT${activeCount > 1 ? 'S' : ''}` : 'ALL CLEAR'}
            </p>
          </div>
        </div>

        {/* SOS speed dial */}
        <div className="absolute bottom-6 z-10" style={{ left: '50%', transform: 'translateX(-50%)' }}>
          <SosSpeedDial areaId={areaId} userPosition={position} variant="map" />
        </div>
      </div>

      {/* Incident feed drawer — dark */}
      {incidents.length > 0 && (
        <div
          className="overflow-y-auto"
          style={{
            height: 160,
            background: '#0d0d0d',
            borderTop: '1px solid #1a1a1a',
          }}
        >
          <IncidentFeed areaId={areaId} incidents={incidents} />
        </div>
      )}
    </div>
  );
}
