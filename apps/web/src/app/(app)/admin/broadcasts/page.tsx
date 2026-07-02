'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { analyticsApi } from '../../../../lib/api';
import { Send, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;

export default function BroadcastsPage() {
  const { areaId } = useParams() as { areaId: string };
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', message: '', priority: 'normal' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    analyticsApi.listBroadcasts(areaId)
      .then((r) => setBroadcasts(r.data.data));
  }, [areaId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await analyticsApi.sendBroadcast(areaId, form);
      setBroadcasts((prev) => [res.data.data, ...prev]);
      setForm({ title: '', message: '', priority: 'normal' });
      toast.success(`Broadcast sent to ${res.data.data.recipientCount} members!`);
    } catch {
      toast.error('Failed to send broadcast.');
    } finally {
      setSending(false);
    }
  };

  const PRIORITY_COLOR: Record<string, string> = {
    low: 'bg-slate-100 text-slate-700',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Megaphone size={24} /> Broadcast Messages
      </h1>

      {/* Compose */}
      <form onSubmit={handleSend} className="bg-white border rounded-xl p-5 shadow-sm mb-6 space-y-4">
        <h2 className="font-semibold text-slate-700">New Broadcast</h2>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
          placeholder="Title…"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <textarea
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          required
          rows={3}
          placeholder="Message for all area members…"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
        <div className="flex items-center gap-3">
          <select
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={sending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600
                       hover:bg-red-500 disabled:bg-red-300 text-white font-semibold rounded-lg transition-colors"
          >
            <Send size={16} />
            {sending ? 'Sending…' : 'Send to All Members'}
          </button>
        </div>
      </form>

      {/* History */}
      <div className="space-y-3">
        {broadcasts.map((b: any) => (
          <div key={b.id} className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <p className="font-semibold text-slate-800">{b.title}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PRIORITY_COLOR[b.priority]}`}>
                {b.priority}
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-2">{b.message}</p>
            <p className="text-xs text-slate-400">
              Sent to {b.recipientCount} members · {(() => { const d = new Date(b.createdAt); return isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true }); })()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
