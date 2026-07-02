'use client';
import { useEffect, useState, useRef } from 'react';
import { notificationsApi, incidentsApi } from '../../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Notification {
  id: string; type: string; title: string; body: string;
  isRead: boolean; data?: Record<string, string>; createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  sos: '⚡', sos_triggered: '⚡', incident_update: '📡',
  responder_joined: '✋', incident_closed: '✅', broadcast: '📣',
  area_invitation: '✉️', member_joined: '👤',
};

// ── Mini Map ──────────────────────────────────────────────────────────────────
function SosMapPreview({ lat, lng }: { lat: number; lng: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    delete (ref.current as any)._leaflet_id;

    import('leaflet').then((L) => {
      if (!ref.current || mapRef.current) return;
      const map = L.map(ref.current, {
        center: [lat, lng], zoom: 16,
        zoomControl: false, dragging: false,
        scrollWheelZoom: false, doubleClickZoom: false, attributionControl: false,
      });
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:28px;height:28px">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(220,38,38,0.35);animation:sp 1.2s ease-out infinite"></div>
          <div style="position:absolute;top:4px;left:4px;width:20px;height:20px;border-radius:50%;background:#dc2626;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.6)"></div>
        </div><style>@keyframes sp{0%{transform:scale(1);opacity:.9}100%{transform:scale(2.4);opacity:0}}</style>`,
        iconSize: [28, 28], iconAnchor: [14, 14],
      });
      L.marker([lat, lng], { icon }).addTo(map);
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng]);

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: 130, borderRadius: 8, border: '1px solid var(--border-2)', marginTop: 10 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={ref} style={{ height: '100%', width: '100%' }} />
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 1000,
        background: 'var(--red)', borderRadius: 4,
        padding: '2px 8px', fontSize: 10, color: '#fff', fontWeight: 600,
      }}>
        📍 Incident Location
      </div>
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank" rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 8, right: 8, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', border: '1px solid var(--border-2)',
          borderRadius: 5, color: 'var(--text-2)', fontSize: 11, fontWeight: 600,
          padding: '4px 10px', textDecoration: 'none',
        }}
      >
        ↗ Maps
      </a>
    </div>
  );
}

// ── SOS Card ──────────────────────────────────────────────────────────────────
function SosCard({ n, onClick }: { n: Notification; onClick: () => void }) {
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (n.data?.lat && n.data?.lng) { setLoc({ lat: parseFloat(n.data.lat), lng: parseFloat(n.data.lng) }); return; }
    if (n.data?.areaId && n.data?.incidentId) {
      incidentsApi.findOne(n.data.areaId, n.data.incidentId).then((res) => {
        const coords = res.data.data?.location_geojson?.coordinates ?? res.data.data?.location?.coordinates;
        if (coords) setLoc({ lat: coords[1], lng: coords[0] });
      }).catch(() => {});
    }
  }, [n]);

  const date    = new Date(n.createdAt);
  const timeStr = isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true });
  const incType = n.data?.type?.replace(/_/g, ' ') ?? 'Emergency';

  return (
    <div
      onClick={onClick}
      style={{
        background: n.isRead ? 'var(--surface)' : 'rgba(220,38,38,0.04)',
        border: `1.5px solid ${n.isRead ? 'var(--border)' : 'var(--red-border)'}`,
        borderLeft: '3px solid var(--red)',
        borderRadius: 'var(--radius)',
        padding: 14,
        marginBottom: 8,
        cursor: 'pointer',
        boxShadow: n.isRead ? 'var(--shadow-xs)' : '0 2px 8px rgba(220,38,38,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!n.isRead && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, display: 'inline-block' }} />
          )}
          <span className="badge badge-red">⚡ SOS · {incType}</span>
        </div>
        {timeStr && <span style={{ color: 'var(--text-3)', fontSize: 11, flexShrink: 0 }}>{timeStr}</span>}
      </div>

      <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700, marginTop: 8, lineHeight: 1.4 }}>{n.title}</p>
      {n.body && <p style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{n.body}</p>}

      {loc ? <SosMapPreview lat={loc.lat} lng={loc.lng} /> : (
        <div className="skeleton" style={{ height: 48, marginTop: 10 }} />
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="btn-primary"
        style={{ width: '100%', marginTop: 10 }}
      >
        Respond →
      </button>
    </div>
  );
}

// ── Regular Card ──────────────────────────────────────────────────────────────
function RegularCard({ n, onClick }: { n: Notification; onClick: () => void }) {
  const date    = new Date(n.createdAt);
  const timeStr = isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true });

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: n.isRead ? 'var(--surface)' : 'rgba(59,130,246,0.04)',
        border: `1.5px solid ${n.isRead ? 'var(--border)' : 'rgba(59,130,246,0.22)'}`,
        borderRadius: 'var(--radius)',
        marginBottom: 6,
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div style={{
        width: 34, height: 34, flexShrink: 0,
        background: 'var(--surface-2)', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
      }}>
        {TYPE_ICON[n.type] ?? '🔔'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: n.isRead ? 'var(--text-2)' : 'var(--text)', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
          {n.title}
        </p>
        {n.body && (
          <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 3, lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
            {n.body}
          </p>
        )}
        {timeStr && <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 5 }}>{timeStr}</p>}
      </div>
      {!n.isRead && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0, marginTop: 4, display: 'inline-block' }} />
      )}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'all' | 'unread'>('all');

  useEffect(() => {
    setLoading(true);
    notificationsApi.findAll({ limit: 100, unread_only: filter === 'unread' })
      .then((r) => setNotifications(r.data.data ?? []))
      .catch(() => toast.error('Failed to load.'))
      .finally(() => setLoading(false));
  }, [filter]);

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
    } catch { toast.error('Failed.'); }
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      await notificationsApi.markRead(n.id).catch(() => {});
      setNotifications((ns) => ns.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
    }
    if (n.data?.areaId && n.data?.incidentId) router.push(`/areas/${n.data.areaId}/incidents/${n.data.incidentId}`);
    else if (n.data?.areaId) router.push(`/areas/${n.data.areaId}/map`);
  };

  const isSos  = (n: Notification) => n.type === 'sos' || n.type === 'sos_triggered';
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Incident Feed</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Incidents</p>
            {unread > 0 && (
              <span className="badge badge-red">{unread} new</span>
            )}
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-ghost" style={{ fontSize: 12 }}>
            Mark all read
          </button>
        )}
      </div>

      {/* Filter */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 6 }}>
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              background: filter === f ? 'var(--red)' : 'var(--surface)',
              color: filter === f ? '#fff' : 'var(--text-2)',
              border: `1px solid ${filter === f ? 'var(--red)' : 'var(--border-2)'}`,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {f === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: '4px 16px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 76 }} />)}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            border: '1px dashed var(--border-2)', borderRadius: 'var(--radius)', marginTop: 8,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
              {filter === 'unread' ? 'No unread notifications' : 'No incidents yet'}
            </p>
          </div>
        ) : (
          <>
            {notifications.filter(isSos).map((n) => <SosCard key={n.id} n={n} onClick={() => handleClick(n)} />)}
            {notifications.filter((n) => !isSos(n)).length > 0 && (
              <>
                {notifications.filter(isSos).length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 10px' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600 }}>Other updates</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>
                )}
                {notifications.filter((n) => !isSos(n)).map((n) => <RegularCard key={n.id} n={n} onClick={() => handleClick(n)} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
