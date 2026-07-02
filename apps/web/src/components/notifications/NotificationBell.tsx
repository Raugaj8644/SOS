'use client';
import { useEffect, useState, useRef } from 'react';
import { notificationsApi } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, string>;
  createdAt: string;
}

const TYPE_EMOJI: Record<string, string> = {
  sos: '🚨', sos_triggered: '🚨', incident_update: '📡',
  responder_joined: '✋', incident_closed: '✅', broadcast: '📣',
  area_invitation: '✉️', member_joined: '👤', safe_point_nearby: '📍',
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.findAll({ limit: 20, unread_only: false });
      setNotifications(res.data.data ?? []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await notificationsApi.markRead(n.id);
        setNotifications((ns) => ns.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
      } catch {}
    }
    if (n.data?.areaId && n.data?.incidentId) router.push(`/areas/${n.data.areaId}/incidents/${n.data.incidentId}`);
    else if (n.data?.areaId) router.push(`/areas/${n.data.areaId}/map`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded transition-colors"
        style={{ color: unreadCount > 0 ? '#dc2626' : '#555' }}
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center font-bold animate-pulse"
            style={{
              minWidth: 16, height: 16, background: '#dc2626', color: '#fff',
              fontSize: 9, borderRadius: 8, padding: '0 3px', letterSpacing: 0,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 mt-2 z-50 overflow-hidden"
          style={{
            width: 300,
            background: '#0d0d0d',
            border: '1px solid #1f1f1f',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #1a1a1a' }}
          >
            <span style={{ color: '#888', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em' }}>
              ALERTS {unreadCount > 0 && `· ${unreadCount} UNREAD`}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em' }}
              >
                MARK ALL READ
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse"
                    style={{ height: 44, background: '#111', borderRadius: 6 }} />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <p style={{ color: '#333', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em' }}>NO ALERTS</p>
              </div>
            ) : notifications.map((n) => {
              const isSos = n.type === 'sos' || n.type === 'sos_triggered';
              const d = new Date(n.createdAt);
              const timeStr = isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full flex items-start gap-3 text-left transition-colors"
                  style={{
                    padding: '10px 14px',
                    background: !n.isRead ? (isSos ? 'rgba(220,38,38,0.05)' : '#0d0d0d') : 'transparent',
                    borderBottom: '1px solid #141414',
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                    {TYPE_EMOJI[n.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p style={{
                      fontSize: 11, fontWeight: !n.isRead ? 700 : 500,
                      color: !n.isRead ? '#e5e5e5' : '#666',
                      letterSpacing: '0.03em', lineHeight: 1.3,
                    }} className="truncate">
                      {n.title}
                    </p>
                    {timeStr && (
                      <p style={{ color: '#383838', fontSize: 9, marginTop: 3, letterSpacing: '0.08em' }}>
                        {timeStr.toUpperCase()}
                      </p>
                    )}
                  </div>
                  {!n.isRead && (
                    <div
                      className="flex-shrink-0 animate-pulse"
                      style={{ width: 6, height: 6, borderRadius: '50%', background: isSos ? '#dc2626' : '#3b82f6', marginTop: 4 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #1a1a1a', padding: '10px 14px' }}>
            <button
              onClick={() => { router.push('/notifications'); setOpen(false); }}
              className="w-full font-bold uppercase"
              style={{ color: '#dc2626', fontSize: 9, letterSpacing: '0.2em', background: 'none', border: 'none' }}
            >
              VIEW ALL INCIDENTS →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
