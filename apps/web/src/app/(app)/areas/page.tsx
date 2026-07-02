'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { areasApi } from '../../../lib/api';
import toast from 'react-hot-toast';

interface AreaMembership {
  areaId: string;
  role: string;
  joinedAt: string;
  area: { id: string; name: string; type: string; isActive: boolean; description?: string };
}

interface QrModal {
  areaId: string; areaName: string;
  qrImageDataUrl: string; joinUrl: string; inviteCode: string;
}

const TYPE_ICON: Record<string, string> = {
  university: '🎓', school: '🏫', company: '🏢', concert: '🎵',
  camp: '⛺', marathon: '🏃', community: '🏘️', open_house: '🏠', other: '📍',
};

export default function MyAreasPage() {
  const [areas, setAreas]     = useState<AreaMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<QrModal | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [copied, setCopied]   = useState<'code' | 'url' | null>(null);

  useEffect(() => {
    areasApi.myAreas()
      .then((res) => setAreas(res.data.data ?? []))
      .catch(() => toast.error('Failed to load areas.'))
      .finally(() => setLoading(false));
  }, []);

  const openQr = useCallback(async (areaId: string, areaName: string) => {
    setQrLoading(true);
    try {
      const [qrRes, areaRes] = await Promise.all([areasApi.qrCode(areaId), areasApi.findOne(areaId)]);
      const qrImageDataUrl = qrRes.data.data as string;
      const areaData = areaRes.data.data as any;
      const joinUrl = `${window.location.origin}/areas/join?token=${areaData.qrToken}`;
      setQrModal({ areaId, areaName, qrImageDataUrl, joinUrl, inviteCode: areaData.inviteCode });
    } catch { toast.error('Cannot load QR code (Admin only).'); }
    finally { setQrLoading(false); }
  }, []);

  const rotateQr = useCallback(async () => {
    if (!qrModal) return;
    try { await areasApi.rotateQr(qrModal.areaId); await openQr(qrModal.areaId, qrModal.areaName); toast.success('QR refreshed'); }
    catch { toast.error('Refresh failed.'); }
  }, [qrModal, openQr]);

  const copyText = useCallback((text: string, key: 'code' | 'url') => {
    const fallback = (t: string) => {
      const el = document.createElement('textarea');
      el.value = t; el.style.position = 'fixed'; el.style.opacity = '0';
      document.body.appendChild(el); el.focus(); el.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(el);
    };
    navigator.clipboard ? navigator.clipboard.writeText(text).catch(() => fallback(text)) : fallback(text);
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  }, []);

  const activeCount = areas.filter((a) => a.area.isActive).length;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>My Areas</p>
            <p style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {activeCount} Active
            </p>
          </div>
          <Link
            href="/areas/join"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              background: 'var(--red)',
              color: '#fff',
              borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Join Area
          </Link>
        </div>
      </div>

      {/* Area list */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 70 }} />)
        ) : areas.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            border: '1px dashed var(--border-2)', borderRadius: 'var(--radius)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 16 }}>
              You haven't joined any areas yet
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Link href="/areas/join" style={{
                padding: '9px 18px', background: 'var(--red)', color: '#fff',
                borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>Join Area</Link>
              <Link href="/admin/areas" style={{
                padding: '9px 18px', border: '1px solid var(--border-2)', color: 'var(--text-2)',
                borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>Create Area</Link>
            </div>
          </div>
        ) : (
          areas.map(({ area, role, areaId }) => (
            <div
              key={areaId}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderLeft: `3px solid ${area.isActive ? 'var(--red)' : 'var(--border-2)'}`,
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 42, height: 42, background: 'var(--surface-2)',
                borderRadius: 10, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 20, flexShrink: 0,
              }}>
                {TYPE_ICON[area.type] ?? '📍'}
              </div>

              {/* Info */}
              <Link href={`/areas/${areaId}/map`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{
                    color: 'var(--text)', fontSize: 14, fontWeight: 600,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {area.name}
                  </p>
                  {role === 'admin' && (
                    <span style={{
                      background: 'var(--red-soft)', color: 'var(--red)',
                      border: '1px solid var(--red-border)',
                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                    }}>Admin</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <span className={area.isActive ? 'dot-green' : 'dot-grey'} />
                  <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
                    {area.isActive ? 'Active' : 'Offline'}
                  </span>
                  {area.description && (
                    <span style={{ color: 'var(--text-3)', fontSize: 11 }}>· {area.description}</span>
                  )}
                </div>
              </Link>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {role === 'admin' && (
                  <button
                    onClick={() => openQr(areaId, area.name)}
                    disabled={qrLoading}
                    title="Show QR Code"
                    style={{
                      width: 32, height: 32,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-2)',
                      borderRadius: 7,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--text-2)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4H4v8h8V4zM20 4h-8v8h8V4zM12 12H4v8h8v-8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 16h4m-4 4h4m0-4v4" />
                    </svg>
                  </button>
                )}
                <Link href={`/areas/${areaId}/map`} style={{ color: 'var(--text-3)', display: 'flex' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── QR Modal ─────────────────────────────────────────────────────── */}
      {qrModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setQrModal(null)}
        >
          <div
            style={{
              width: '100%', maxWidth: 360,
              background: 'var(--surface)',
              border: '1px solid var(--border-2)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <p style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                  Invite Code
                </p>
                <p style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>{qrModal.areaName}</p>
              </div>
              <button
                onClick={() => setQrModal(null)}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-2)',
                  color: 'var(--text-2)', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

            {/* QR */}
            <div style={{
              display: 'flex', justifyContent: 'center',
              padding: '24px 0',
              background: 'var(--bg-2)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrModal.qrImageDataUrl}
                alt="QR Code"
                width={160} height={160}
                style={{ borderRadius: 8, border: '4px solid white', imageRendering: 'pixelated' }}
              />
            </div>

            {/* Invite code + link */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Invite Code</p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 8,
                }}>
                  <span style={{
                    flex: 1, fontFamily: 'monospace', fontWeight: 800,
                    fontSize: 22, letterSpacing: '0.25em', color: 'var(--text)', textAlign: 'center',
                  }}>
                    {qrModal.inviteCode}
                  </span>
                  <button onClick={() => copyText(qrModal.inviteCode, 'code')}
                    style={{ color: copied === 'code' ? 'var(--green)' : 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                    {copied === 'code' ? '✓' : '⎘'}
                  </button>
                </div>
              </div>

              <div>
                <p style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Join Link</p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 8,
                }}>
                  <span style={{
                    flex: 1, fontFamily: 'monospace', fontSize: 10,
                    color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {qrModal.joinUrl}
                  </span>
                  <button onClick={() => copyText(qrModal!.joinUrl, 'url')}
                    style={{ color: copied === 'url' ? 'var(--green)' : 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>
                    {copied === 'url' ? '✓' : '⎘'}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '0 20px 20px', display: 'flex', gap: 8 }}>
              <button onClick={rotateQr} className="btn-ghost" style={{ fontSize: 12, gap: 4, display: 'flex', alignItems: 'center' }}>
                ↺ Refresh
              </button>
              <button
                onClick={() => copyText(qrModal!.joinUrl, 'url')}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {copied === 'url' ? '✓ Copied!' : '⎘ Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
