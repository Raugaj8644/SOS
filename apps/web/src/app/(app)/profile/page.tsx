'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, logout, setUser } = useAuthStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(user?.name ?? '');
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.patch('/users/me', { name: name.trim() });
      setUser(res.data.data);
      toast.success('Profile updated.');
      setEditing(false);
    } catch { toast.error('Update failed.'); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Account</p>
        <p style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Profile</p>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Avatar card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px',
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-xs)',
        }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--red), #7f1d1d)',
            border: '2px solid var(--red-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 20, fontWeight: 800,
          }}>
            {initial}
          </div>

          {/* Name / edit */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="input-dark"
                  style={{ flex: 1, fontSize: 13 }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: 12 }}
                >
                  {saving ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => { setName(user?.name ?? ''); setEditing(false); }}
                  className="btn-ghost"
                  style={{ padding: '8px 12px' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <p style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}
                  className="truncate">
                  {user?.name}
                </p>
                <button
                  onClick={() => setEditing(true)}
                  style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 3 }}
                >
                  Edit name
                </button>
              </>
            )}
          </div>

          {/* Online dot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            <span className="dot-green" style={{ animation: 'pulse 2s infinite' }} />
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
            <span style={{ color: 'var(--text-3)', fontSize: 9, fontWeight: 600 }}>Online</span>
          </div>
        </div>

        {/* Info rows */}
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xs)',
        }}>
          {/* Email */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ width: 34, height: 34, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 15, height: 15, color: 'var(--text-3)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Email</p>
              <p style={{ color: 'var(--text-2)', fontSize: 13 }} className="truncate">{user?.email}</p>
            </div>
          </div>

          {/* Role */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{ width: 34, height: 34, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 15, height: 15, color: 'var(--text-3)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Role</p>
              <p style={{ color: 'var(--text-2)', fontSize: 13, textTransform: 'capitalize' }}>
                {user?.role ?? 'Responder'}
              </p>
            </div>
            <span className="badge badge-green">Active</span>
          </div>
        </div>

        {/* System status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--green)',
          borderRadius: 'var(--radius)',
        }}>
          <span className="dot-green" />
          <span style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 500 }}>
            CERP system · all channels nominal
          </span>
        </div>

        {/* Logout */}
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 34, height: 34, flexShrink: 0,
              background: 'var(--red-soft)',
              border: '1px solid var(--red-border)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth={1.8} style={{ width: 15, height: 15 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <span style={{ flex: 1, textAlign: 'left', color: 'var(--red)', fontSize: 14, fontWeight: 600 }}>
              Sign out
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16, color: 'var(--text-3)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
