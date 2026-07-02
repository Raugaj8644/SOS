'use client';
import { useEffect, useState } from 'react';
import { Compass, ArrowLeft, Users, MapPin, LocateFixed } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { areasApi } from '../../../../lib/api';

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
    <div className="max-w-2xl mx-auto p-4">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> กลับ
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Compass className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Area ใกล้เคียง</h1>
            <p className="text-sm text-slate-500">ภายในรัศมี 5 กม.</p>
          </div>
        </div>
        <button
          onClick={locate}
          disabled={locating}
          className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700
                     disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <LocateFixed size={14} className={locating ? 'animate-spin' : ''} />
          {locating ? 'กำลังค้นหา...' : 'ค้นหาอีกครั้ง'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !located ? (
        <div className="text-center py-20">
          <LocateFixed className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">กำลังขอตำแหน่งปัจจุบัน...</p>
        </div>
      ) : areas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Compass className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>ไม่พบ Area ในรัศมีนี้</p>
          <Link href="/admin/areas" className="mt-4 inline-block text-blue-600 text-sm hover:underline">
            สร้าง Area แรกในพื้นที่นี้ →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 mb-3">พบ {areas.length} area</p>
          {areas.map((area) => (
            <Link
              key={area.id}
              href={`/areas/${area.id}/map`}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4
                         hover:border-purple-300 hover:shadow-sm transition-all"
            >
              <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {TYPE_ICON[area.type] ?? '📍'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 truncate">{area.name}</h3>
                {area.description && (
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{area.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5 capitalize">{area.type.replace('_', ' ')}</p>
              </div>
              {area.memberCount != null && (
                <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                  <Users className="w-3.5 h-3.5" />
                  <span>{area.memberCount}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
