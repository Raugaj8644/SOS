'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';
import { useFcm } from '../../hooks/useFcm';
import { NotificationBell } from '../../components/notifications/NotificationBell';

const GLOBAL_ADMIN_EMAIL = 'jagauer8644@gmail.com';

const NAV = [
  {
    href: '/dashboard',
    label: 'Map',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'none' : 'none'} stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    href: '/notifications',
    label: 'Incidents',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    href: '/areas',
    label: 'Areas',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, hydrate } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useSocket();
  useFcm();

  useEffect(() => {
    const done = () => {
      setChecking(false);
      if (!useAuthStore.getState().isAuthenticated) router.replace('/login');
    };
    if (useAuthStore.getState().isAuthenticated) { setChecking(false); return; }
    const timeout = setTimeout(done, 6000);
    hydrate().finally(() => { clearTimeout(timeout); done(); });
    return () => clearTimeout(timeout);
  }, []);

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Logo */}
          <div style={{ width: 48, height: 48, background: 'var(--red)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(220,38,38,0.25)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{ width: 24, height: 24 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2.5px solid var(--border-2)', borderTopColor: 'var(--red)', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 500 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isAdmin = user?.email === GLOBAL_ADMIN_EMAIL;
  const activeHref = NAV.slice().reverse().find((n) => pathname.startsWith(n.href))?.href ?? '/dashboard';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{
          height: 56,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--red)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            CERP
          </span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotificationBell />
          <Link
            href="/profile"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--red), #b91c1c)',
              border: '2px solid rgba(220,38,38,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(220,38,38,0.25)',
            }}
          >
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </Link>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        {children}
      </main>

      {/* ── Bottom Nav ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          height: 64,
          display: 'flex', alignItems: 'stretch',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -1px 12px rgba(15,23,42,0.06)',
        }}
      >
        {NAV.map(({ href, label, icon }) => {
          const active = activeHref === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                color: active ? 'var(--red)' : 'var(--text-3)',
                textDecoration: 'none',
                position: 'relative',
                transition: 'color 0.15s',
              }}
            >
              {icon(active)}
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, letterSpacing: '0.01em' }}>
                {label}
              </span>
              {active && (
                <span style={{
                  position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                  height: 2.5, width: 24, background: 'var(--red)', borderRadius: '2px 2px 0 0',
                }} />
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin/manage"
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              color: pathname.startsWith('/admin') ? '#f97316' : 'var(--text-3)',
              textDecoration: 'none',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span style={{ fontSize: 10, fontWeight: 500 }}>Admin</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
