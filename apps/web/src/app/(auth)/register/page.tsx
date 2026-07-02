'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../stores/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

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

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const inputStyle = {
    background: '#fafafa',
    border: '1px solid #e5e5e5',
    borderRadius: 4,
    fontSize: 13,
    color: '#111',
    width: '100%',
    padding: '10px 14px',
  };

  return (
    <div>
      {/* Logo */}
      <div className="flex flex-col items-center mb-7">
        <div className="mb-4">
          <svg viewBox="0 0 56 64" className="w-12 h-14">
            <path d="M28 2 L52 12 V30 C52 44 42 54 28 60 C14 54 4 44 4 30 V12 Z"
              fill="none" stroke="#dc2626" strokeWidth="2" />
            <path d="M28 10 L46 18 V30 C46 40 38 48 28 54 C18 48 10 40 10 30 V18 Z"
              fill="rgba(220,38,38,0.08)" />
            <rect x="22" y="24" width="12" height="14" rx="2"
              fill="none" stroke="#dc2626" strokeWidth="1.5" />
            <circle cx="28" cy="31" r="3" fill="#dc2626" />
          </svg>
        </div>
        <h1 className="font-black tracking-widest" style={{ fontSize: 24, letterSpacing: '0.3em', color: '#111' }}>CERP</h1>
        <div className="flex items-center gap-3 mt-2">
          <div style={{ height: 1, width: 30, background: '#dc2626' }} />
          <span style={{ color: '#888', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em' }}>REGISTER RESPONDER</span>
          <div style={{ height: 1, width: 30, background: '#dc2626' }} />
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', border: '1px solid #dc2626', borderRadius: 6, padding: '24px 20px', boxShadow: '0 2px 20px rgba(220,38,38,0.08)' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'FULL NAME', field: 'name', type: 'text', placeholder: 'John Smith' },
            { label: 'PERSONNEL ID', field: 'email', type: 'email', placeholder: 'E.G. ALPHA-904' },
            { label: 'SECURITY KEY', field: 'password', type: 'password', placeholder: '••••••••••' },
            { label: 'CONFIRM KEY', field: 'confirm', type: 'password', placeholder: '••••••••••' },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label
                className="block font-bold uppercase"
                style={{ fontSize: 9, letterSpacing: '0.2em', color: '#888', marginBottom: 6 }}
              >
                {label}
              </label>
              <input
                type={type}
                value={(form as any)[field]}
                onChange={set(field)}
                required
                placeholder={placeholder}
                className="focus:outline-none"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#dc2626'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e5e5'; }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 font-black uppercase tracking-widest"
            style={{
              background: isLoading ? '#9b1c1c' : '#dc2626',
              color: '#fff', fontSize: 12, letterSpacing: '0.25em', borderRadius: 4, border: 'none', marginTop: 4,
            }}
          >
            {isLoading ? 'REGISTERING…' : 'REGISTER'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            style={{ color: '#888', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textDecoration: 'none' }}
          >
            ← BACK TO LOGIN
          </Link>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2" style={{ color: '#aaa', fontSize: 9, letterSpacing: '0.15em' }}>
        <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: 1 }} />
        SYSTEM LIVE &nbsp;·&nbsp; CERP PLATFORM
      </div>
    </div>
  );
}
