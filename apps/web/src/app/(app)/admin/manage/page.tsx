'use client';
import { useEffect, useState } from 'react';
import { Trash2, RefreshCw, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { adminApi } from '../../../../lib/api';
import { useAuthStore } from '../../../../stores/authStore';
import { useRouter } from 'next/navigation';
import { FadeInSection } from '../../../../components/motion/FadeInSection';
import toast from 'react-hot-toast';

const GLOBAL_ADMIN_EMAIL = 'jagauer8644@gmail.com';

const AREA_TYPE_ICON: Record<string, string> = {
  university: '🎓', school: '🏫', company: '🏢', concert: '🎵',
  camp: '⛺', marathon: '🏃', community: '🏘️', open_house: '🏠', other: '📍',
};

interface Area {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  isPublic: boolean;
  maxMembers: number | null;
  createdAt: string;
  memberCount?: number;
}

export default function GlobalAdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Guard: redirect non-admins
  useEffect(() => {
    if (user && user.email !== GLOBAL_ADMIN_EMAIL) {
      toast.error('Access denied.');
      router.replace('/dashboard');
    }
  }, [user, router]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listAllAreas(showInactive);
      setAreas(res.data.data ?? []);
    } catch {
      toast.error('Failed to load areas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [showInactive]);

  const handleDelete = async (areaId: string, name: string) => {
    if (confirmId !== areaId) {
      setConfirmId(areaId);
      return;
    }
    setDeletingId(areaId);
    setConfirmId(null);
    try {
      await adminApi.forceDeleteArea(areaId);
      setAreas((prev) => prev.filter((a) => a.id !== areaId));
      toast.success(`"${name}" has been deactivated.`);
    } catch {
      toast.error('Failed to delete area.');
    } finally {
      setDeletingId(null);
    }
  };

  if (user?.email !== GLOBAL_ADMIN_EMAIL) return null;

  const active   = areas.filter((a) => a.isActive);
  const inactive = areas.filter((a) => !a.isActive);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'radial-gradient(circle at 35% 35%, #FF7080, #B11226 60%, #4A0010)', boxShadow: '0 3px 12px rgba(177,18,38,0.35)' }}>
          <ShieldAlert size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Global Admin</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Manage all areas on the platform</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowInactive((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={showInactive
              ? { background: 'var(--text)', color: '#fff' }
              : { background: 'var(--surface-2)', color: 'var(--text-2)' }}
          >
            {showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
            {showInactive ? 'Showing all' : 'Active only'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total', value: areas.length, color: 'var(--text)' },
          { label: 'Active',   value: active.length,   color: 'var(--green)' },
          { label: 'Inactive', value: inactive.length,  color: 'var(--text-3)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-xs)' }}>
            <p className="text-3xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Area list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80 }} />
          ))}
        </div>
      ) : areas.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>
          <p className="text-4xl mb-3">🏜️</p>
          <p className="font-medium">No areas found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {areas.map((area, i) => (
            <FadeInSection
              key={area.id}
              delayMs={Math.min(i, 6) * 40}
              className={`flex items-center gap-4 p-4 rounded-xl border ${!area.isActive ? 'opacity-50' : ''}`}
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-xs)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                {AREA_TYPE_ICON[area.type] ?? '📍'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{area.name}</p>
                  {!area.isActive && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded font-medium flex-shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                      INACTIVE
                    </span>
                  )}
                  {!area.isPublic && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded font-medium flex-shrink-0" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
                      PRIVATE
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-3)' }}>
                  {area.type.replace(/_/g, ' ')} · ID: {area.id.slice(0, 8)}…
                  {area.createdAt && (
                    <> · {new Date(area.createdAt).toLocaleDateString('th-TH')}</>
                  )}
                </p>
              </div>

              {/* Delete button — double-confirm */}
              {area.isActive && (
                <button
                  onClick={() => handleDelete(area.id, area.name)}
                  disabled={deletingId === area.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
                    transition-all flex-shrink-0 ${confirmId === area.id ? 'animate-pulse' : ''}
                    ${deletingId === area.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={confirmId === area.id
                    ? { background: 'var(--red)', color: '#fff' }
                    : { background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red-border)' }}
                >
                  <Trash2 size={14} />
                  {deletingId === area.id
                    ? 'Deleting…'
                    : confirmId === area.id
                      ? 'Confirm delete'
                      : 'Delete'}
                </button>
              )}
            </FadeInSection>
          ))}
        </div>
      )}

      {/* Cancel confirm on outside click */}
      {confirmId && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
