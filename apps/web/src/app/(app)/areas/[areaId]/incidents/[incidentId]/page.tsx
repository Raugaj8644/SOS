'use client';
import { useEffect, useState, useRef, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { incidentsApi } from '../../../../../../lib/api';
import { useAuthStore } from '../../../../../../stores/authStore';
import { useGeolocation } from '../../../../../../hooks/useGeolocation';
import { getSocket, SOCKET_EVENTS } from '../../../../../../lib/socket';
import { FadeInSection } from '../../../../../../components/motion/FadeInSection';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_LABEL: Record<string, string> = {
  medical_emergency: 'Medical Alert', injury: 'Injury Alert', fire: 'Fire Alert',
  violence: 'Violence Alert', missing_person: 'Missing Person',
  suspicious_activity: 'Suspicious Activity', emergency: 'Emergency', other: 'Incident',
};
const TYPE_EMOJI: Record<string, string> = {
  medical_emergency: '🏥', injury: '🩹', fire: '🔥', violence: '⚠️',
  missing_person: '🔍', suspicious_activity: '👁️', emergency: '🚨', other: '📢',
};

// ── Static incident map ───────────────────────────────────────────────────────
function IncidentMap({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    delete (ref.current as any)._leaflet_id;

    import('leaflet').then((L) => {
      if (!ref.current || mapRef.current) return;
      const map = L.map(ref.current, {
        center: [lat, lng], zoom: 17,
        zoomControl: true, dragging: true, attributionControl: false,
      });
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:32px;height:32px">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(179,36,28,0.3);animation:ip 1.2s ease-out infinite"></div>
          <div style="position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;background:#b3241c;border:3px solid white;box-shadow:0 2px 12px rgba(179,36,28,0.6);display:flex;align-items:center;justify-content:center;font-size:13px">🚨</div>
        </div><style>@keyframes ip{0%{transform:scale(1);opacity:.9}100%{transform:scale(2.5);opacity:0}}</style>`,
        iconSize: [32, 32], iconAnchor: [16, 16],
      });
      L.marker([lat, lng], { icon }).addTo(map);
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng]);

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div ref={ref} style={{ height: 200, width: '100%' }} />
      <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
        style={{
          position: 'absolute', bottom: 10, right: 10, zIndex: 1000,
          background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border-2)',
          borderRadius: 6, color: 'var(--text-2)', fontSize: 11, fontWeight: 600,
          padding: '5px 10px', textDecoration: 'none', boxShadow: 'var(--shadow-sm)',
        }}>
        ↗ Google Maps
      </a>
    </div>
  );
}

// ── Live tracking map ─────────────────────────────────────────────────────────
function LiveMap({
  initialLat, initialLng, liveLocation, onClose, userPosition,
}: {
  initialLat: number; initialLng: number;
  liveLocation: { lat: number; lng: number; updatedAt: string } | null;
  onClose: () => void;
  userPosition: { lat: number; lng: number } | null;
}) {
  const ref           = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const markerRef     = useRef<any>(null); // incident / SOS reporter marker
  const userMarkerRef = useRef<any>(null); // current responder (you) marker

  // Init map
  useEffect(() => {
    if (!ref.current) return;
    delete (ref.current as any)._leaflet_id;

    import('leaflet').then((L) => {
      if (!ref.current || mapRef.current) return;

      // Center between both points if we have user location
      const center: [number, number] = userPosition
        ? [(initialLat + userPosition.lat) / 2, (initialLng + userPosition.lng) / 2]
        : [initialLat, initialLng];

      const map = L.map(ref.current, {
        center, zoom: 16,
        zoomControl: true, dragging: true, attributionControl: false,
      });
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      // ── SOS / incident reporter marker (red) ──
      const sosIcon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:36px;height:36px">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(179,36,28,0.25);animation:lp 1.5s ease-out infinite"></div>
          <div style="position:absolute;top:5px;left:5px;width:26px;height:26px;border-radius:50%;background:#b3241c;border:3px solid white;box-shadow:0 2px 14px rgba(179,36,28,0.7);display:flex;align-items:center;justify-content:center;font-size:14px">🆘</div>
        </div><style>@keyframes lp{0%{transform:scale(1);opacity:.9}100%{transform:scale(2.8);opacity:0}}</style>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      });
      markerRef.current = L.marker([initialLat, initialLng], { icon: sosIcon })
        .bindTooltip('🆘 ผู้ขอความช่วยเหลือ', { direction: 'top' })
        .addTo(map);

      // ── Responder (you) marker (blue) ──
      if (userPosition) {
        const youIcon = L.divIcon({
          className: '',
          html: `<div style="position:relative;width:28px;height:28px">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.25);animation:you 1.8s ease-out infinite"></div>
            <div style="position:absolute;top:4px;left:4px;width:20px;height:20px;border-radius:50%;background:#2563EB;border:2.5px solid white;box-shadow:0 2px 10px rgba(37,99,235,0.6);display:flex;align-items:center;justify-content:center;font-size:11px">🧑</div>
          </div><style>@keyframes you{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.4);opacity:0}}</style>`,
          iconSize: [28, 28], iconAnchor: [14, 14],
        });
        userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], { icon: youIcon })
          .bindTooltip('📍 ตำแหน่งของคุณ', { direction: 'top' })
          .addTo(map);

        // Fit both markers in view
        const bounds = L.latLngBounds(
          [initialLat, initialLng],
          [userPosition.lat, userPosition.lng],
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
      }
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [initialLat, initialLng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update SOS reporter marker when live location changes
  useEffect(() => {
    if (!liveLocation || !markerRef.current || !mapRef.current) return;
    const { lat, lng } = liveLocation;
    markerRef.current.setLatLng([lat, lng]);
    // Pan only if user marker doesn't exist, otherwise re-fit bounds
    if (!userMarkerRef.current) {
      mapRef.current.panTo([lat, lng], { animate: true, duration: 1 });
    }
  }, [liveLocation]);

  // Update responder (you) marker in real-time
  useEffect(() => {
    if (!userPosition || !mapRef.current) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng]);
    }
  }, [userPosition?.lat, userPosition?.lng]);

  const displayLat = liveLocation?.lat ?? initialLat;
  const displayLng = liveLocation?.lng ?? initialLng;
  const lastUpdate = liveLocation?.updatedAt
    ? formatDistanceToNow(new Date(liveLocation.updatedAt), { addSuffix: true })
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flex: 1,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--red)',
            animation: 'pulse 1.2s infinite', flexShrink: 0,
          }} />
          <span style={{ color: 'var(--red)', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>
            LIVE TRACKING
          </span>
          {lastUpdate && (
            <span style={{ color: 'var(--text-3)', fontSize: 11 }}>· อัปเดต {lastUpdate}</span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'var(--surface-2)', border: '1px solid var(--border-2)',
            color: 'var(--text-2)', fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      </div>

      {/* Map */}
      <div ref={ref} style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
            🆘 {displayLat.toFixed(5)}, {displayLng.toFixed(5)}
          </span>
          {userPosition && (
            <span style={{ color: 'var(--blue)', fontSize: 11 }}>
              📍 คุณ: {userPosition.lat.toFixed(5)}, {userPosition.lng.toFixed(5)}
            </span>
          )}
        </div>
        <a
          href={`https://www.google.com/maps/dir/${userPosition ? `${userPosition.lat},${userPosition.lng}/` : ''}${displayLat},${displayLng}`}
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', textDecoration: 'none', flexShrink: 0 }}
        >
          {userPosition ? 'นำทางไปช่วย ↗' : 'เปิดใน Google Maps ↗'}
        </a>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IncidentDetailPage() {
  const { areaId, incidentId } = useParams() as { areaId: string; incidentId: string };
  const router = useRouter();
  const { user } = useAuthStore();
  const { position } = useGeolocation(true); // watch mode — real-time for responder marker

  const [incident, setIncident]     = useState<any>(null);
  const [updates, setUpdates]       = useState<any[]>([]);
  const [responders, setResponders] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [posting, setPosting]       = useState(false);
  const [responding, setResponding] = useState(false);
  const [closing, setClosing]       = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; updatedAt: string } | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);

  useEffect(() => {
    Promise.all([
      incidentsApi.findOne(areaId, incidentId),
      incidentsApi.getUpdates(areaId, incidentId),
      incidentsApi.getResponders(areaId, incidentId),
    ]).then(([i, u, r]) => {
      setIncident(i.data.data);
      setUpdates(u.data.data);
      setResponders(r.data.data);
    }).catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'));
  }, [areaId, incidentId]);

  // ── Subscribe to live location updates ───────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const onLocationUpdate = (data: { incidentId: string; lat: number; lng: number; updatedAt: string }) => {
      if (data.incidentId !== incidentId) return;
      setLiveLocation({ lat: data.lat, lng: data.lng, updatedAt: data.updatedAt });
      setIsLiveActive(true);
    };

    const onLocationStop = (data: { incidentId: string }) => {
      if (data.incidentId !== incidentId) return;
      setIsLiveActive(false);
    };

    socket.on(SOCKET_EVENTS.LOCATION_UPDATE, onLocationUpdate);
    socket.on(SOCKET_EVENTS.LOCATION_STOP, onLocationStop);

    return () => {
      socket.off(SOCKET_EVENTS.LOCATION_UPDATE, onLocationUpdate);
      socket.off(SOCKET_EVENTS.LOCATION_STOP, onLocationStop);
    };
  }, [incidentId]);

  const handleRespond = async () => {
    setResponding(true);
    try {
      await incidentsApi.respond(areaId, incidentId, { lat: position?.lat, lng: position?.lng });
      setIncident((i: any) => ({ ...i, responderCount: (i.responderCount ?? 0) + 1 }));
      toast.success('คุณถูกบันทึกเป็นผู้ตอบสนองแล้ว!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'ไม่สำเร็จ');
    } finally { setResponding(false); }
  };

  const handlePostUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setPosting(true);
    try {
      const res = await incidentsApi.postUpdate(areaId, incidentId, newMessage);
      setUpdates((u) => [...u, res.data.data]);
      setNewMessage('');
    } catch { toast.error('ส่งอัปเดตไม่สำเร็จ'); }
    finally { setPosting(false); }
  };

  const handleClose = async () => {
    if (!confirm('ยืนยันว่าเหตุการณ์นี้ได้รับการแก้ไขแล้ว?')) return;
    setClosing(true);
    try {
      await incidentsApi.close(areaId, incidentId, { closeReason: 'Resolved by creator' });
      setIncident((i: any) => ({ ...i, status: 'resolved' }));
      toast.success('ปิดเหตุการณ์เรียบร้อย');
    } catch { toast.error('ปิดเหตุการณ์ไม่สำเร็จ'); }
    finally { setClosing(false); }
  };

  if (!incident) return (
    <div style={{ background: 'transparent', minHeight: '100vh', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 70 }} />)}
    </div>
  );

  const isCreator = user?.id === incident.created_by || user?.id === incident.createdById;
  const isActive  = incident.status === 'active';
  const label     = TYPE_LABEL[incident.type]  ?? 'Incident';
  const emoji     = TYPE_EMOJI[incident.type]  ?? '📢';

  const loc        = incident.location_geojson ?? incident.location;
  const incidentLat = loc?.coordinates?.[1] ?? null;
  const incidentLng = loc?.coordinates?.[0] ?? null;
  const respCount   = incident.responder_count ?? incident.responderCount ?? responders.length;

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>

      {/* Live Map Modal */}
      {showLiveMap && incidentLat && (
        <LiveMap
          initialLat={incidentLat}
          initialLng={incidentLng}
          liveLocation={liveLocation}
          userPosition={position}
          onClose={() => setShowLiveMap(false)}
        />
      )}

      {/* Back */}
      <div style={{ padding: '14px 16px 0' }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'var(--text-3)', fontSize: 12, fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div style={{
        margin: '12px 16px 0',
        padding: '14px',
        background: isActive ? 'rgba(179,36,28,0.05)' : 'var(--surface)',
        border: `1.5px solid ${isActive ? 'var(--red-border)' : 'var(--border)'}`,
        borderLeft: `3px solid ${isActive ? 'var(--red)' : 'var(--border-2)'}`,
        borderRadius: 'var(--radius)',
        boxShadow: isActive ? '0 2px 12px rgba(179,36,28,0.08)' : 'var(--shadow-xs)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <div>
            <span className={isActive ? 'badge badge-red' : 'badge badge-green'}>
              {isActive ? `⚡ ${label}` : `✓ Resolved`}
            </span>
          </div>
          {isActive && isLiveActive && (
            <span style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
              color: 'var(--red)', fontSize: 11, fontWeight: 700,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1.2s infinite', flexShrink: 0, display: 'inline-block' }} />
              LIVE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <p style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 600, marginBottom: 2 }}>รายงานโดย</p>
            <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700 }}>
              {incident.creator_name ?? incident.createdBy?.name ?? 'Unknown'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 600, marginBottom: 2 }}>เวลา</p>
            <p style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 600 }}>
              {(() => {
                const d = new Date(incident.createdAt ?? incident.created_at);
                return isNaN(d.getTime()) ? '—' : formatDistanceToNow(d, { addSuffix: true });
              })()}
            </p>
          </div>
        </div>

        {incident.description && (
          <p style={{ color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>
            {incident.description}
          </p>
        )}
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Map section ─────────────────────────────────────────────── */}
        {incidentLat && incidentLng && (
          <FadeInSection style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)',
          }}>
            {/* Live Map button */}
            {isActive && (
              <div style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14 }}>📍</span>
                  <span style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 600 }}>
                    ตำแหน่งเหตุการณ์
                  </span>
                  {isLiveActive && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'var(--red-soft)', color: 'var(--red)',
                      border: '1px solid var(--red-border)',
                      borderRadius: 10, padding: '2px 7px', fontSize: 10, fontWeight: 700,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1s infinite', display: 'inline-block' }} />
                      LIVE
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowLiveMap(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px',
                    background: 'var(--red)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(179,36,28,0.25)',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 13, height: 13 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {isLiveActive ? 'Live Map' : 'ดูแผนที่'}
                </button>
              </div>
            )}
            <IncidentMap lat={incidentLat} lng={incidentLng} />
          </FadeInSection>
        )}

        {/* ── Responders count ─────────────────────────────────────────── */}
        <FadeInSection delayMs={40} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16, color: 'var(--text-3)', flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 600, flex: 1 }}>
            {respCount} ผู้ตอบสนอง{respCount !== 1 ? '' : ''}
          </span>
          {isActive && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1.5s infinite', flexShrink: 0, display: 'inline-block' }} />}
        </FadeInSection>

        {/* ── Action Buttons ───────────────────────────────────────────── */}
        {isActive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!isCreator && (
              <button
                onClick={handleRespond}
                disabled={responding}
                className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 14 }}
              >
                {responding ? 'กำลังบันทึก…' : '✋ ฉันกำลังเดินทางไปช่วย'}
              </button>
            )}
            {isCreator && (
              <button
                onClick={handleClose}
                disabled={closing}
                style={{
                  width: '100%', padding: '13px',
                  background: closing ? 'var(--surface-2)' : 'var(--green-soft)',
                  color: closing ? 'var(--text-3)' : 'var(--green)',
                  border: `1.5px solid ${closing ? 'var(--border-2)' : 'rgba(22,163,74,0.3)'}`,
                  borderRadius: 'var(--radius)',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {closing ? 'กำลังปิด…' : '✓ ปิดเหตุการณ์ — แก้ไขแล้ว'}
              </button>
            )}
          </div>
        )}

        {/* ── Activity Log ─────────────────────────────────────────────── */}
        <FadeInSection delayMs={80} style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '14px',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <p style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            บันทึกกิจกรรม
          </p>

          {updates.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 12 }}>ยังไม่มีการอัปเดต</p>
          ) : (
            <div>
              {updates.map((u: any, idx: number) => {
                const d = new Date(u.createdAt ?? u.created_at);
                const t = isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
                const name = u.created_by?.name ?? u.createdBy?.name ?? 'System';
                return (
                  <div key={u.id ?? idx} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 3 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        border: '2px solid var(--red)', background: 'var(--surface)', flexShrink: 0,
                      }} />
                      {idx < updates.length - 1 && (
                        <div style={{ width: 1, flex: 1, minHeight: 16, background: 'var(--border)', marginTop: 3 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 700 }}>{name}</span>
                        {t && <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{t}</span>}
                      </div>
                      <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.5 }}>{u.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add update form */}
          <form onSubmit={handlePostUpdate} style={{ display: 'flex', gap: 8, marginTop: updates.length > 0 ? 8 : 0 }}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="เพิ่มอัปเดต…"
              maxLength={2000}
              className="input-base"
              style={{ flex: 1, padding: '10px 12px' }}
            />
            <button
              type="submit"
              disabled={posting || !newMessage.trim()}
              style={{
                width: 42, height: 42, borderRadius: 'var(--radius-sm)', border: 'none', flexShrink: 0,
                background: posting || !newMessage.trim() ? 'var(--surface-2)' : 'var(--red)',
                cursor: posting || !newMessage.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </FadeInSection>

        {/* ── Responders list ───────────────────────────────────────────── */}
        {responders.length > 0 && (
          <FadeInSection delayMs={120} style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '14px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <p style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              ผู้ตอบสนอง ({responders.length})
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {responders.map((r: any) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--blue)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>
                    {r.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 500 }}>{r.user?.name}</span>
                  {r.distance_meters && (
                    <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{Math.round(r.distance_meters)}m</span>
                  )}
                </div>
              ))}
            </div>
          </FadeInSection>
        )}
      </div>
    </div>
  );
}
