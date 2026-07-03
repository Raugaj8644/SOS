'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { areasApi } from '../../../lib/api';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { useAuthStore } from '../../../stores/authStore';
import { SosSpeedDial } from '../../../components/sos/SosSpeedDial';
import toast from 'react-hot-toast';

interface AreaMembership {
  areaId: string;
  role: string;
  area: { id: string; name: string; type: string; isActive: boolean };
}

const AREA_ICON: Record<string, string> = {
  university: '🎓', school: '🏫', company: '🏢', concert: '🎵',
  camp: '⛺', marathon: '🏃', community: '🏘️', open_house: '🏠', other: '📍',
};

const QUICK_ACTIONS = [
  {
    label: 'Join Area', href: '/areas/join',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    label: 'My Areas', href: '/areas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Discover', href: '/areas/discover',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 20, height: 20 }}>
        <circle cx="11" cy="11" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [areas, setAreas] = useState<AreaMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const { position } = useGeolocation(true);

  useEffect(() => {
    areasApi.myAreas()
      .then((res) => {
        const data: AreaMembership[] = res.data.data ?? [];
        setAreas(data);
        if (data.length > 0) setSelectedAreaId(data[0].areaId);
      })
      .catch(() => toast.error('Failed to load areas.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedArea = areas.find((a) => a.areaId === selectedAreaId);
  const activeAreas  = areas.filter((a) => a.area.isActive);

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Hero: Orb + Greeting + SOS ──────────────────────────────── */}
      <div style={{
        padding: '24px 16px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(177,18,38,0.06) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
      }}>

          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4, textAlign: 'center' }}>
          สวัสดี, {user?.name ?? 'ผู้ใช้งาน'}
        </p>
        <p style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 24 }}>
          <span style={{ color: 'var(--text-2)' }}>พื้นที่ของคุณ </span>
          <span style={{
            background: 'linear-gradient(90deg, #B11226, #E03050)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>ปลอดภัยดีไหม?</span>
        </p>

        {/* Area selector pills */}
        {!loading && areas.length > 0 && (
          <div style={{ marginBottom: 22, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {areas.map(({ areaId, area }) => {
              const active = selectedAreaId === areaId;
              return (
                <button key={areaId} onClick={() => setSelectedAreaId(areaId)} style={{
                  padding: '5px 14px', borderRadius: 20,
                  background: active ? 'var(--violet)' : 'var(--surface)',
                  border: `1.5px solid ${active ? 'var(--violet)' : 'var(--border-2)'}`,
                  color: active ? '#fff' : 'var(--text-2)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: active ? '0 3px 10px rgba(177,18,38,0.30)' : 'var(--shadow-xs)',
                }}>
                  {AREA_ICON[area.type] ?? '📍'} {area.name}
                </button>
              );
            })}
          </div>
        )}

        {/* SOS Button */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {selectedAreaId ? (
            <SosSpeedDial areaId={selectedAreaId} userPosition={position} variant="card" />
          ) : (
            !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 130, height: 130, borderRadius: '50%',
                  background: 'var(--surface)', border: '2px dashed var(--border-2)',
                  boxShadow: 'var(--shadow)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 38 }}>🆘</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>NO AREA</span>
                </div>
                <Link href="/areas/join" className="btn-primary" style={{ textDecoration: 'none' }}>เข้าร่วม Area</Link>
              </div>
            )
          )}
        </div>

        {/* GPS badge */}
        <div style={{
          marginTop: 22, display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 13px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 20,
          fontSize: 11, color: 'var(--text-3)', fontWeight: 500, boxShadow: 'var(--shadow-xs)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: position ? 'var(--green)' : 'var(--amber)',
            ...(position ? { animation: 'pulse 2s infinite' } : {}),
          }} />
          GPS {position ? 'Active' : 'Acquiring'}
          {selectedArea && (
            <>
              <span style={{ color: 'var(--border-2)', margin: '0 2px' }}>·</span>
              <span style={{ color: 'var(--violet)', fontWeight: 600 }}>{selectedArea.area.name}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <div style={{ padding: '16px 16px 12px' }}>
        <p className="section-label" style={{ marginBottom: 10 }}>Quick Actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
          {QUICK_ACTIONS.map(({ label, href, icon }) => (
            <Link key={label} href={href}
              onMouseEnter={() => setHoveredAction(label)}
              onMouseLeave={() => setHoveredAction(null)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                padding: '14px 8px',
                background: hoveredAction === label ? 'var(--violet-soft)' : 'var(--surface)',
                border: `1.5px solid ${hoveredAction === label ? 'var(--violet-border)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                color: hoveredAction === label ? 'var(--violet)' : 'var(--text-2)',
                textDecoration: 'none', fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                boxShadow: hoveredAction === label ? '0 2px 12px rgba(177,18,38,0.12)' : 'var(--shadow-xs)',
              }}
            >
              {icon}{label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── My Areas ──────────────────────────────────────────────── */}
      <div style={{ padding: '4px 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p className="section-label">My Areas</p>
          {activeAreas.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{activeAreas.length} active</span>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 68 }} />)}
          </div>
        ) : areas.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '44px 24px',
            border: '1.5px dashed var(--border-2)', borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
          }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>📡</div>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 14 }}>ยังไม่ได้เข้าร่วม Area</p>
            <Link href="/areas/join" className="btn-primary" style={{ textDecoration: 'none', fontSize: 13, padding: '9px 18px' }}>
              เข้าร่วม Area
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {areas.map(({ area, role, areaId }) => {
              const isSelected = selectedAreaId === areaId;
              const isHovered  = hoveredArea === areaId;
              return (
                <Link key={areaId} href={`/areas/${areaId}/map`}
                  onMouseEnter={() => setHoveredArea(areaId)}
                  onMouseLeave={() => setHoveredArea(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: isSelected ? 'rgba(177,18,38,0.04)' : 'var(--surface)',
                    border: `1.5px solid ${isSelected ? 'var(--violet-border)' : isHovered ? 'var(--border-2)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', textDecoration: 'none', transition: 'all 0.15s',
                    boxShadow: isHovered || isSelected ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, flexShrink: 0, fontSize: 18,
                    background: isSelected ? 'var(--violet-soft)' : 'var(--surface-2)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: isSelected ? '1px solid var(--violet-border)' : '1px solid transparent',
                  }}>
                    {AREA_ICON[area.type] ?? '📍'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      color: 'var(--text)', fontSize: 14, fontWeight: 600, marginBottom: 3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {area.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {role === 'admin' && (
                        <span style={{ color: 'var(--violet)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>ADMIN</span>
                      )}
                      {role === 'admin' && <span style={{ color: 'var(--border-2)', fontSize: 10 }}>·</span>}
                      <span className={area.isActive ? 'dot-green' : 'dot-grey'} style={{ width: 6, height: 6 }} />
                      <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{area.isActive ? 'Active' : 'Offline'}</span>
                    </div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    style={{ width: 15, height: 15, color: isSelected ? 'var(--violet)' : 'var(--text-3)', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
