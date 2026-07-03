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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} style={{ width: 20, height: 20, flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    href: '/notifications',
    label: 'Incidents',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} style={{ width: 20, height: 20, flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    href: '/areas',
    label: 'Areas',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} style={{ width: 20, height: 20, flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} style={{ width: 20, height: 20, flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

const SHIELD_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{ width: 16, height: 16 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, hydrate } = useAuthStore();
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
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: 300, height: 300,
          background: 'radial-gradient(ellipse, rgba(177,18,38,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52,
            background: 'radial-gradient(circle at 33% 33%, #FF8090, #B11226 52%, #3D0008)',
            borderRadius: '50%',
            boxShadow: '0 8px 32px rgba(177,18,38,0.40)',
            animation: 'float 2.5s ease-in-out infinite, glow-pulse 2.5s ease-in-out infinite',
          }} />
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '2.5px solid var(--border-2)',
            borderTopColor: 'var(--primary)',
            animation: 'spin 0.75s linear infinite',
          }} />
          <p style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em' }}>กำลังโหลด…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isAdmin = user?.email === GLOBAL_ADMIN_EMAIL;
  const activeHref = NAV.slice().reverse().find((n) => pathname.startsWith(n.href))?.href ?? '/dashboard';

  const PAGE_TITLE: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/notifications': 'Incidents',
    '/areas': 'Areas',
    '/profile': 'Profile',
    '/admin/manage': 'Admin',
  };
  const currentTitle = Object.entries(PAGE_TITLE).find(([k]) => pathname.startsWith(k))?.[1] ?? 'CERP';

  const sidebarNavItem = (href: string, label: string, icon: (a: boolean) => React.ReactNode) => {
    const active = activeHref === href;
    return (
      <Link
        key={href}
        href={href}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 14px', borderRadius: 10, marginBottom: 2,
          color: active ? 'var(--primary)' : 'var(--text-2)',
          background: active ? 'var(--primary-soft)' : 'transparent',
          textDecoration: 'none', fontWeight: active ? 600 : 500, fontSize: 14,
          transition: 'background 0.15s ease, color 0.15s ease',
          borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
        }}
      >
        {icon(active)}
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="app-sidebar">
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: 'radial-gradient(circle at 35% 35%, #FF7080, #B11226 60%, #4A0010)',
              borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 12px rgba(177,18,38,0.35)',
            }}>
              {SHIELD_SVG}
            </div>
            <div>
              <p style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontWeight: 700, fontSize: 18, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1,
              }}>CERP</p>
              <p style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginTop: 3, textTransform: 'uppercase' }}>
                Emergency Response
              </p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(({ href, label, icon }) => sidebarNavItem(href, label, icon))}

          {isAdmin && (
            <>
              <div style={{ margin: '10px 4px', borderTop: '1px solid var(--border)' }} />
              {sidebarNavItem(
                '/admin/manage',
                'Admin',
                (active) => (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} style={{ width: 20, height: 20, flexShrink: 0, color: active ? 'var(--gold)' : undefined }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              )}
            </>
          )}
        </nav>

        {/* User profile footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Link href="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'radial-gradient(circle at 35% 35%, #FF7080, #B11226 60%, #4A0010)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 700,
              boxShadow: '0 2px 8px rgba(177,18,38,0.30)',
            }}>
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }} className="truncate">
                {user?.name}
              </p>
              <p style={{ color: 'var(--text-3)', fontSize: 11, lineHeight: 1 }} className="truncate">
                {user?.email}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 app-shifted"
        style={{
          height: 56,
          background: 'rgba(250,248,245,0.82)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 16px rgba(90,20,10,0.07)',
        }}
      >
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          {/* Logo — mobile only (hidden on desktop where sidebar shows it) */}
          <div className="lg:hidden">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 32, height: 32,
                background: 'radial-gradient(circle at 35% 35%, #FF7080, #B11226 60%, #4A0010)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 12px rgba(177,18,38,0.35)',
              }}>
                {SHIELD_SVG}
              </div>
              <span style={{
                fontWeight: 800, fontSize: 15, color: 'var(--text)',
                letterSpacing: '-0.04em', fontFamily: "'DM Serif Display', Georgia, serif",
              }}>
                CERP
              </span>
            </div>
          </div>

          {/* Desktop: current page title */}
          <div className="hidden lg:block" style={{ flex: 1 }}>
            <p style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {currentTitle}
            </p>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationBell />
            <Link
              href="/profile"
              aria-label="Profile"
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #FF7080, #B11226 60%, #4A0010)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 10px rgba(177,18,38,0.30)',
              }}
            >
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main
        className="app-shifted app-main-content"
        style={{
          flex: 1,
          paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* key={pathname} forces React to remount this div on every route change → re-triggers page-enter animation */}
        <div
          key={pathname}
          className="app-container"
          style={{ animation: 'page-enter 0.35s cubic-bezier(0.16,1,0.3,1) forwards' }}
        >
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ───────────────────────────────────────────────── */}
      <nav
        className="app-bottom-nav"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          background: 'rgba(250,248,245,0.92)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -2px 20px rgba(90,20,10,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Full-width flex — no app-container so items spread evenly */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: 62, width: '100%' }}>
          {NAV.map(({ href, label, icon }) => {
            const active = activeHref === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  color: active ? 'var(--primary)' : 'var(--text-3)',
                  textDecoration: 'none', position: 'relative',
                  transition: 'color 0.18s ease',
                  minWidth: 0,
                }}
              >
                {/* Active pill background */}
                {active && (
                  <span style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -54%)',
                    width: 44, height: 30,
                    borderRadius: 15,
                    background: 'var(--primary-soft)',
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>{icon(active)}</span>
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  letterSpacing: '0.01em', lineHeight: 1,
                  position: 'relative', zIndex: 1,
                }}>
                  {label}
                </span>
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin/manage"
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
                color: pathname.startsWith('/admin') ? 'var(--gold)' : 'var(--text-3)',
                textDecoration: 'none', position: 'relative', minWidth: 0,
              }}
            >
              {pathname.startsWith('/admin') && (
                <span style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -54%)',
                  width: 44, height: 30,
                  borderRadius: 15,
                  background: 'rgba(180,83,9,0.10)',
                }} />
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 20, height: 20, position: 'relative', zIndex: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span style={{ fontSize: 10, fontWeight: 500, position: 'relative', zIndex: 1 }}>Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
