'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../stores/authStore';
import toast from 'react-hot-toast';

const FIELDS = [
  { label: 'Full name',        field: 'name',     type: 'text',     placeholder: 'Jane Smith', autoComplete: 'name' },
  { label: 'Email address',    field: 'email',    type: 'email',    placeholder: 'you@example.com', autoComplete: 'email' },
  { label: 'Password',         field: 'password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
  { label: 'Confirm password', field: 'confirm',  type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
] as const;

type Field = typeof FIELDS[number]['field'];

export default function RegisterPage() {
  const [form, setForm] = useState<Record<Field, string>>({ name: '', email: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    try {
      await register(form.email, form.password, form.name);
      router.replace('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Registration failed.'));
    }
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--primary)';
    e.target.style.boxShadow = '0 0 0 3px rgba(177,18,38,0.10)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--border-2)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        marginBottom: 28,
        animation: 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
      }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div style={{
            width: 64, height: 64,
            background: 'radial-gradient(circle at 33% 33%, #FF8090, #B11226 52%, #3D0008)',
            borderRadius: '50%',
            boxShadow: '0 8px 40px rgba(177,18,38,0.40), inset 0 2px 10px rgba(255,255,255,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'float 4s ease-in-out infinite',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} style={{ width: 26, height: 26 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div style={{
            position: 'absolute', inset: -8, borderRadius: '50%',
            border: '1px solid rgba(177,18,38,0.18)', pointerEvents: 'none',
          }} />
        </div>

        <h1 style={{
          fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em',
          color: 'var(--text)',
          fontFamily: "'DM Serif Display', Georgia, serif",
          marginBottom: 4,
        }}>
          CERP
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Community Emergency Response
        </p>
      </div>

      {/* ── Form card ────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 28px 24px',
        boxShadow: '0 4px 40px rgba(90,20,10,0.10), 0 1px 8px rgba(90,20,10,0.06)',
        animation: 'slide-up 0.55s cubic-bezier(0.16,1,0.3,1) 80ms both',
      }}>
        <p style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>
          Create your account
        </p>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 22 }}>
          Join the responder network
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FIELDS.map(({ label, field, type, placeholder, autoComplete }) => {
            const isPassword = type === 'password';
            const actualType = isPassword ? (showPwd ? 'text' : 'password') : type;
            return (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, letterSpacing: '0.02em' }}>
                  {label}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={actualType}
                    value={form[field]}
                    onChange={set(field)}
                    required
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    style={{
                      width: '100%',
                      padding: `11px ${isPassword ? '42px' : '14px'} 11px 14px`,
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border-2)',
                      borderRadius: 'var(--radius)',
                      fontSize: 14, color: 'var(--text)',
                      outline: 'none',
                      transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                      fontFamily: 'inherit',
                    }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-3)', padding: 4, display: 'flex', borderRadius: 4,
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                    >
                      {showPwd ? (
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
                  )}
                </div>
              </div>
            );
          })}

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
                Creating account…
              </>
            ) : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
          <Link
            href="/login"
            style={{
              color: 'var(--text-3)', fontSize: 13, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            Already have an account?
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in →</span>
          </Link>
        </div>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 22,
        display: 'flex', alignItems: 'center', gap: 6,
        color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.10em',
        animation: 'slide-up 0.5s cubic-bezier(0.16,1,0.3,1) 200ms both',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2.5s infinite' }} />
        SYSTEM LIVE · CERP PLATFORM
      </div>
    </div>
  );
}
