'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { analyticsApi } from '../../../../lib/api';
import { FadeInSection } from '../../../../components/motion/FadeInSection';
import { AlertTriangle, Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const params = useParams();
  const areaId = params.areaId as string;
  const [stats, setStats] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!areaId) return;
    Promise.all([analyticsApi.getStats(areaId), analyticsApi.getBreakdown(areaId)])
      .then(([s, b]) => { setStats(s.data.data); setBreakdown(b.data.data); })
      .finally(() => setLoading(false));
  }, [areaId]);

  const METRICS = stats ? [
    { label: 'Total Incidents', value: stats.total_incidents, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Active Now',      value: stats.active_incidents, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
    { label: 'Resolved',        value: stats.resolved_incidents, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Total Members',   value: stats.total_members,  icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Last 24 Hours',   value: stats.incidents_last_24h, icon: Clock, color: 'text-purple-600 bg-purple-50' },
    { label: 'Avg Resolution',  value: stats.avg_resolution_minutes ? `${Math.round(stats.avg_resolution_minutes)}m` : 'N/A',
      icon: TrendingUp, color: 'text-slate-600 bg-slate-50' },
  ] : [];

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 96 }} />)}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>Analytics</h1>

      <FadeInSection className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {METRICS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-xs)' }}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value ?? 0}</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{label}</p>
          </div>
        ))}
      </FadeInSection>

      {breakdown.length > 0 && (
        <FadeInSection delayMs={60} className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-2)' }}>Incidents by Type</h2>
          <div className="space-y-3">
            {breakdown.map((item: any) => {
              const max = breakdown[0]?.count ?? 1;
              const pct = (item.count / max) * 100;
              return (
                <div key={item.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize" style={{ color: 'var(--text-2)' }}>{item.type.replace(/_/g, ' ')}</span>
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: 'var(--red)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </FadeInSection>
      )}
    </div>
  );
}
