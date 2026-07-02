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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    label: 'My Areas', href: '/areas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Discover', href: '/areas/discover',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}>
        <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
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
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── SOS Hero ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        paddingTop: 28,
        paddingBottom: 32,
        background: 'linear-gradient(180deg, rgba(220,38,38,0.06) 0%, rgba(220,38,38,0.02) 60%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Welcome label */}
        {user?.name && (
          <p style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 500, marginBottom: 16, letterSpacing: '0.01em' }}>
            สวัสดี, <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{user.name}</span>
          </p>
        )}

        {/* Area selector pills */}
        {!loading && areas.length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', paddingInline: 16 }}>
            {areas.map(({ areaId, area }) => {
              const active = selectedAreaId === areaId;
              return (
                <button
                  key={areaId}
                  onClick={() => setSelectedAreaId(areaId)}
                  style={{
                    padding: '5px 13px',
                    borderRadius: 20,
                    background: active ? 'var(--red)' : 'var(--surface)',
                    border: `1.5px solid ${active ? 'var(--red)' : 'var(--border-2)'}`,
                    color: active ? '#fff' : 'var(--text-2)',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: active ? '0 2px 8px rgba(220,38,38,0.22)' : 'var(--shadow-xs)',
                  }}
                >
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
                  width: 140, height: 140, borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '2px dashed var(--border-2)',
                  boxShadow: 'var(--shadow)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 40 }}>🆘</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
                    NO AREA
                  </span>
                </div>
                <Link
                  href="/areas/join"
                  className="btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  Join an Area
                </Link>
              </div>
            )
          )}
        </div>

        {/* GPS indicator */}
        <div style={{
          marginTop: 20,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          fontSize: 11,
          color: 'var(--text-3)',
          fontWeight: 500,
          boxShadow: 'var(--shadow-xs)',
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
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>{selectedArea.area.name}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <div style={{ padding: '16px 16px 12px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          Quick Actions
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {QUICK_ACTIONS.map(({ label, href, icon }) => (
            <Link
              key={label}
              href={href}
              onMouseEnter={() => setHoveredAction(label)}
              onMouseLeave={() => setHoveredAction(null)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                padding: '14px 8px',
                background: hoveredAction === label ? 'var(--surface-2)' : 'var(--surface)',
                border: `1.5px solid ${hoveredAction === label ? 'var(--border-2)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                color: 'var(--text-2)',
                textDecoration: 'none',
                fontSize: 11, fontWeight: 600,
                transition: 'all 0.15s',
                boxShadow: hoveredAction === label ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
              }}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── My Areas ───────────────────────────────────────────────────── */}
      <div style={{ padding: '4px 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            My Areas
          </p>
          {activeAreas.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {activeAreas.length} active
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 68 }} />)}
          </div>
        ) : areas.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            border: '1.5px dashed var(--border-2)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📡</div>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 14 }}>
              You haven&apos;t joined any areas yet
            </p>
            <Link href="/areas/join" className="btn-primary" style={{ textDecoration: 'none', fontSize: 13, padding: '9px 18px' }}>
              Join an Area
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {areas.map(({ area, role, areaId }) => {
              const isSelected = selectedAreaId === areaId;
              const isHovered  = hoveredArea === areaId;
              return (
                <Link
                  key={areaId}
                  href={`/areas/${areaId}/map`}
                  onMouseEnter={() => setHoveredArea(areaId)}
                  onMouseLeave={() => setHoveredArea(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: isSelected ? 'rgba(220,38,38,0.04)' : 'var(--surface)',
                    border: `1.5px solid ${isSelected ? 'var(--red-border)' : isHovered ? 'var(--border-2)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                    boxShadow: isHovered || isSelected ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, flexShrink: 0,
                    background: isSelected ? 'var(--red-soft)' : 'var(--surface-2)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                    border: isSelected ? '1px solid var(--red-border)' : '1px solid transparent',
                  }}>
                    {AREA_ICON[area.type] ?? '📍'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      color: 'var(--text)', fontSize: 14, fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginBottom: 3,
                    }}>
                      {area.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {role === 'admin' && (
                        <span style={{ color: 'var(--red)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>ADMIN</span>
                      )}
                      {role === 'admin' && <span style={{ color: 'var(--border-2)', fontSize: 10 }}>·</span>}
                      <span className={area.isActive ? 'dot-green' : 'dot-grey'} style={{ width: 6, height: 6, flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
                        {area.isActive ? 'Active' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    style={{ width: 15, height: 15, color: isSelected ? 'var(--red)' : 'var(--text-3)', flexShrink: 0 }}>
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
