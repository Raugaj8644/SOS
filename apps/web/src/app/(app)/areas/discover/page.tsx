'use client';
import { useEffect, useState } from 'react';
import { Compass, ArrowLeft, Users, MapPin, LocateFixed } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { areasApi } from '../../../../lib/api';
import { FadeInSection } from '../../../../components/motion/FadeInSection';

interface Area {
  id: string;
  name: string;
  description?: string;
  type: string;
  memberCount?: number;
}

const TYPE_ICON: Record<string, string> = {
  university: '🎓', school: '🏫', company: '🏢', concert: '🎵',
  camp: '⛺', marathon: '🏃', community: '🏘️', open_house: '🏠', other: '📍',
};

export default function DiscoverAreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);

  const search = (lat: number, lng: number, radius = 5000) => {
    setLoading(true);
    areasApi.findNearby(lat, lng, radius)
      .then((res) => {
        const data = res.data.data ?? [];
        setAreas(data);
        if (data.length === 0) toast('ไม่พบ Area ในรัศมี 5 กม.', { icon: '📍' });
      })
      .catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false));
  };

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error('เบราว์เซอร์ไม่รองรับ Geolocation');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        setLocated(true);
        search(coords.latitude, coords.longitude);
      },
      () => {
        setLocating(false);
        toast.error('ไม่สามารถดึงตำแหน่งได้ กรุณาอนุญาต Location');
      },
    );
  };

  // Auto-locate on mount
  useEffect(() => { locate(); }, []);

  return (
    <div className="max-w-2xl mx-auto p-4" style={{ position: 'relative', zIndex: 1 }}>
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>
        <ArrowLeft className="w-4 h-4" /> กลับ
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gold-soft)' }}>
            <Compass className="w-5 h-5" style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Area ใกล้เคียง</h1>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>ภายในรัศมี 5 กม.</p>
          </div>
        </div>
        <button
          onClick={locate}
          disabled={locating}
          className="flex items-center gap-1.5 px-3 py-2 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors"
          style={{ background: 'var(--gold)', color: '#fff' }}
        >
          <LocateFixed size={14} className={locating ? 'animate-spin' : ''} />
          {locating ? 'กำลังค้นหา...' : 'ค้นหาอีกครั้ง'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : !located ? (
        <div className="text-center py-20">
          <LocateFixed className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--border-2)' }} />
          <p style={{ color: 'var(--text-3)' }}>กำลังขอตำแหน่งปัจจุบัน...</p>
        </div>
      ) : areas.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>
          <Compass className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>ไม่พบ Area ในรัศมีนี้</p>
          <Link href="/admin/areas" className="mt-4 inline-block text-sm hover:underline" style={{ color: 'var(--gold)' }}>
            สร้าง Area แรกในพื้นที่นี้ →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm mb-3" style={{ color: 'var(--text-3)' }}>พบ {areas.length} area</p>
          {areas.map((area, i) => (
            <FadeInSection key={area.id} delayMs={Math.min(i, 6) * 40}>
              <Link
                href={`/areas/${area.id}/map`}
                className="flex items-center gap-4 rounded-xl p-4 transition-all"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                  {TYPE_ICON[area.type] ?? '📍'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate" style={{ color: 'var(--text)' }}>{area.name}</h3>
                  {area.description && (
                    <p className="text-sm mt-0.5 line-clamp-1" style={{ color: 'var(--text-3)' }}>{area.description}</p>
                  )}
                  <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-3)' }}>{area.type.replace('_', ' ')}</p>
                </div>
                {area.memberCount != null && (
                  <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                    <Users className="w-3.5 h-3.5" />
                    <span>{area.memberCount}</span>
                  </div>
                )}
              </Link>
            </FadeInSection>
          ))}
        </div>
      )}
    </div>
  );
}
