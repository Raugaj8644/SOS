'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../stores/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div>
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        {/* Shield icon */}
        <div className="mb-4">
          <svg viewBox="0 0 56 64" className="w-14 h-16">
            <path d="M28 2 L52 12 V30 C52 44 42 54 28 60 C14 54 4 44 4 30 V12 Z"
              fill="none" stroke="#dc2626" strokeWidth="2" />
            <path d="M28 10 L46 18 V30 C46 40 38 48 28 54 C18 48 10 40 10 30 V18 Z"
              fill="rgba(220,38,38,0.08)" stroke="none" />
            {/* Inner shield detail */}
            <rect x="22" y="24" width="12" height="14" rx="2"
              fill="none" stroke="#dc2626" strokeWidth="1.5" />
            <circle cx="28" cy="31" r="3" fill="#dc2626" />
          </svg>
        </div>

        <h1
          className="font-black tracking-widest"
          style={{ fontSize: 28, letterSpacing: '0.3em', color: '#111' }}
        >
          CERP
        </h1>

        {/* Tactical Authentication divider */}
        <div className="flex items-center gap-3 mt-2">
          <div style={{ height: 1, width: 40, background: '#dc2626' }} />
          <span style={{ color: '#888', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em' }}>
            TACTICAL AUTHENTICATION
          </span>
          <div style={{ height: 1, width: 40, background: '#dc2626' }} />
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #dc2626',
          borderRadius: 6,
          padding: '28px 24px',
          boxShadow: '0 2px 20px rgba(220,38,38,0.08)',
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personnel ID */}
          <div>
            <label
              className="block font-bold uppercase"
              style={{ fontSize: 9, letterSpacing: '0.2em', color: '#888', marginBottom: 8 }}
            >
              Personnel ID
            </label>
            <div className="relative">
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#bbb' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="E.G. ALPHA-904"
                className="w-full pl-10 pr-4 py-3 focus:outline-none transition-colors"
                style={{
                  background: '#fafafa',
                  border: '1px solid #e5e5e5',
                  borderRadius: 4,
                  fontSize: 13,
                  color: '#111',
                  letterSpacing: '0.05em',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#dc2626'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e5e5'; }}
              />
            </div>
          </div>

          {/* Security Key */}
          <div>
            <label
              className="block font-bold uppercase"
              style={{ fontSize: 9, letterSpacing: '0.2em', color: '#888', marginBottom: 8 }}
            >
              Security Key
            </label>
            <div className="relative">
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#bbb' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 focus:outline-none transition-colors"
                style={{
                  background: '#fafafa',
                  border: '1px solid #e5e5e5',
                  borderRadius: 4,
                  fontSize: 13,
                  color: '#111',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#dc2626'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e5e5'; }}
              />
            </div>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 font-black uppercase tracking-widest transition-colors"
            style={{
              background: isLoading ? '#9b1c1c' : '#dc2626',
              color: '#fff',
              fontSize: 13,
              letterSpacing: '0.3em',
              borderRadius: 4,
              border: 'none',
              marginTop: 4,
            }}
          >
            {isLoading ? 'AUTHENTICATING…' : 'LOGIN'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-5 flex flex-col items-center gap-3">
          <Link
            href="/register"
            className="flex items-center gap-2"
            style={{ color: '#888', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textDecoration: 'none' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            REGISTER NEW RESPONDER
          </Link>
        </div>
      </div>

      {/* Status bar */}
      <div
        className="mt-6 flex items-center justify-center gap-2"
        style={{ color: '#aaa', fontSize: 9, letterSpacing: '0.15em' }}
      >
        <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: 1 }} />
        SYSTEM LIVE &nbsp;·&nbsp; CERP PLATFORM
      </div>
    </div>
  );
}
