'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { analyticsApi } from '../../../../lib/api';
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
      {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Analytics</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {METRICS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value ?? 0}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {breakdown.length > 0 && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Incidents by Type</h2>
          <div className="space-y-3">
            {breakdown.map((item: any) => {
              const max = breakdown[0]?.count ?? 1;
              const pct = (item.count / max) * 100;
              return (
                <div key={item.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 capitalize">{item.type.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-slate-800">{item.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
