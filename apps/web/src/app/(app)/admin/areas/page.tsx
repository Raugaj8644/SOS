'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { areasApi } from '../../../../lib/api';
import toast from 'react-hot-toast';

const PolygonDrawer = dynamic(
  () => import('../../../../components/map/PolygonDrawer').then((m) => m.PolygonDrawer),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius)' }} /> },
);

const AREA_TYPES = [
  'university','school','company','concert','camp','marathon','community','open_house','other'
];
const AREA_ICON: Record<string, string> = {
  university: '🎓', school: '🏫', company: '🏢', concert: '🎵',
  camp: '⛺', marathon: '🏃', community: '🏘️', open_house: '🏠', other: '📍',
};

interface ExistingArea {
  id: string; name: string; type: string; isActive: boolean; description?: string;
}

export default function CreateAreaPage() {
  const router = useRouter();
  const [polygon, setPolygon] = useState<object | null>(null);
  const [userCenter, setUserCenter] = useState<[number, number] | undefined>(undefined);
  const [existingAreas, setExistingAreas] = useState<ExistingArea[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Load existing areas + user location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => setUserCenter([coords.latitude, coords.longitude]),
      () => {},
    );
    areasApi.myAreas()
      .then((res) => {
        const areas = (res.data.data ?? []).map((m: any) => m.area);
        setExistingAreas(areas);
      })
      .catch(() => {})
      .finally(() => setLoadingAreas(false));
  }, []);

  const [form, setForm] = useState({
    name: '', type: 'other', description: '',
    contactEmail: '', emergencyPhone: '', isPublic: true,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!polygon) { toast.error('กรุณาวาดขอบเขต Area บนแผนที่ก่อน'); return; }
    setSaving(true);
    try {
      const res = await areasApi.create({
        ...form,
        polygon: { type: 'Polygon', coordinates: [(polygon as any).coordinates[0]] },
      });
      toast.success('สร้าง Area เรียบร้อย!');
      router.push(`/areas/${res.data.data.id}/map`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'ไม่สามารถสร้าง Area ได้');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.back()}
          style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <p style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Admin</p>
        <p style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Create New Area</p>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── Existing Areas Warning ─────────────────────────────────────── */}
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderLeft: '3px solid var(--amber)',
          borderRadius: 'var(--radius)',
          padding: '14px 16px',
          marginBottom: 16,
          boxShadow: 'var(--shadow-xs)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ color: 'var(--amber)', fontSize: 12, fontWeight: 700 }}>
              ตรวจสอบก่อนสร้าง — Area ที่มีอยู่แล้ว
            </p>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 12 }}>
            กรุณาตรวจสอบรายการด้านล่างเพื่อหลีกเลี่ยงการสร้าง Area ซ้ำ
          </p>

          {loadingAreas ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
            </div>
          ) : existingAreas.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
              คุณยังไม่มี Area — สามารถสร้างใหม่ได้เลย
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {existingAreas.map((area) => (
                <div
                  key={area.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{AREA_ICON[area.type] ?? '📍'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {area.name}
                    </p>
                    {area.description && (
                      <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {area.description}
                      </p>
                    )}
                  </div>
                  <span className={area.isActive ? 'dot-green' : 'dot-grey'} />
                </div>
              ))}
            </div>
          )}

          {/* Confirm / Expand Form */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                marginTop: 14, width: '100%',
                padding: '10px',
                background: 'var(--red)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220,38,38,0.22)',
              }}
            >
              ยืนยัน — ต้องการสร้าง Area ใหม่
            </button>
          )}
        </div>

        {/* ── Create Form (hidden until confirmed) ──────────────────────── */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Map */}
            <div style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 16,
              boxShadow: 'var(--shadow-xs)',
            }}>
              <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                1. วาดขอบเขต Area <span style={{ color: 'var(--red)' }}>*</span>
              </p>
              <PolygonDrawer onPolygonChange={setPolygon} center={userCenter} />
              {polygon && (
                <p style={{ color: 'var(--green)', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
                  ✅ บันทึกขอบเขตแล้ว
                </p>
              )}
            </div>

            {/* Details */}
            <div style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 16,
              boxShadow: 'var(--shadow-xs)',
            }}>
              <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                2. รายละเอียด Area
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    ชื่อ Area <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    value={form.name} onChange={set('name')} required
                    placeholder="เช่น มหาวิทยาลัยเทคโนโลยี Open House 2024"
                    className="input-base"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                      ประเภท <span style={{ color: 'var(--red)' }}>*</span>
                    </label>
                    <select value={form.type} onChange={set('type')} className="input-base" style={{ cursor: 'pointer' }}>
                      {AREA_TYPES.map((t) => (
                        <option key={t} value={t}>{AREA_ICON[t] ?? '📍'} {t.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                      โทรฉุกเฉิน
                    </label>
                    <input
                      value={form.emergencyPhone} onChange={set('emergencyPhone')}
                      placeholder="+66 2 xxx xxxx" type="tel"
                      className="input-base"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    อีเมลติดต่อ
                  </label>
                  <input
                    value={form.contactEmail} onChange={set('contactEmail')}
                    placeholder="admin@yourorg.com" type="email"
                    className="input-base"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    คำอธิบาย
                  </label>
                  <textarea
                    value={form.description} onChange={set('description')} rows={3}
                    placeholder="รายละเอียดย่อของ Area นี้…"
                    className="input-base"
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !polygon}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15 }}
            >
              {saving ? 'กำลังสร้าง…' : '🚨 สร้าง Area'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
