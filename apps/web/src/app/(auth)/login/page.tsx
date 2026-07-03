'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../stores/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Authentication failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          marginBottom: 32,
          animation: 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {/* Crimson orb logo */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{
            width: 72, height: 72,
            background: 'radial-gradient(circle at 33% 33%, #FF8090, #B11226 52%, #3D0008)',
            borderRadius: '50%',
            boxShadow: '0 8px 40px rgba(177,18,38,0.45), inset 0 2px 10px rgba(255,255,255,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'float 4s ease-in-out infinite',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} style={{ width: 28, height: 28 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          {/* Glow ring */}
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: '50%',
            border: '1px solid rgba(177,18,38,0.18)',
            pointerEvents: 'none',
          }} />
        </div>

        <h1
          style={{
            fontSize: 34,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            fontFamily: "'DM Serif Display', Georgia, serif",
            marginBottom: 4,
          }}
        >
          CERP
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Community Emergency Response
        </p>
      </div>

      {/* ── Form card ────────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.7)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px 28px',
          boxShadow: '0 4px 40px rgba(90,20,10,0.10), 0 1px 8px rgba(90,20,10,0.06)',
          animation: 'slide-up 0.55s cubic-bezier(0.16,1,0.3,1) 80ms both',
        }}
      >
        <p style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>
          Welcome back
        </p>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 24 }}>
          Sign in to your responder account
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 7, letterSpacing: '0.02em' }}>
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-3)', display: 'flex',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  width: '100%',
                  paddingLeft: 38, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border-2)',
                  borderRadius: 'var(--radius)',
                  fontSize: 14, color: 'var(--text)',
                  outline: 'none',
                  transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(177,18,38,0.10)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 7, letterSpacing: '0.02em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-3)', display: 'flex',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  paddingLeft: 38, paddingRight: 42, paddingTop: 11, paddingBottom: 11,
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border-2)',
                  borderRadius: 'var(--radius)',
                  fontSize: 14, color: 'var(--text)',
                  outline: 'none',
                  transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(177,18,38,0.10)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {/* Show/hide toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-3)', padding: 4, display: 'flex', borderRadius: 4,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{ width: '100%', marginTop: 6, padding: '13px 20px', fontSize: 14, fontWeight: 700, letterSpacing: '0.02em' }}
          >
            {isLoading ? (
              <>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite',
                  display: 'inline-block',
                }} />
                Signing in…
              </>
            ) : 'Sign in'}
          </button>
        </form>

        {/* Register link */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
          <Link
            href="/register"
            style={{
              color: 'var(--text-3)', fontSize: 13, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            No account?
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Register as responder →</span>
          </Link>
        </div>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 24,
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.10em',
          animation: 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1) 200ms both',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2.5s infinite' }} />
        SYSTEM LIVE · CERP PLATFORM
      </div>
    </div>
  );
}
