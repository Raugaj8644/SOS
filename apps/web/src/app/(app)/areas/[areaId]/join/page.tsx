'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { areasApi } from '../../../../../lib/api';
import toast from 'react-hot-toast';

export default function JoinViaTokenPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [status, setStatus] = useState<'joining' | 'done' | 'error' | 'no-token'>(!token ? 'no-token' : 'joining');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    // Token from URL is a QR token (lowercase hex) — send as-is, not uppercased
    areasApi.join({ token })
      .then(() => {
        setStatus('done');
        toast.success('เข้าร่วม Area สำเร็จ!');
        setTimeout(() => router.push('/areas'), 2000);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.message;
        setErrMsg(Array.isArray(msg) ? msg[0] : (msg ?? 'ไม่สามารถเข้าร่วมได้'));
        setStatus('error');
      });
  }, [token]);

  return (
    <div
      className="flex items-center justify-center"
      style={{ background: 'transparent', minHeight: '100vh' }}
    >
      <div
        className="flex flex-col items-center text-center px-8 py-10 w-full max-w-xs"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)' }}
      >
        {status === 'joining' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }} className="animate-pulse">🛡️</div>
            <p style={{ color: 'var(--red)', fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 8 }}>
              AUTHENTICATING
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.12em' }}>
              กำลังเข้าร่วม Area…
            </p>
          </>
        )}

        {status === 'done' && (
          <>
            <div
              className="flex items-center justify-center mb-5"
              style={{ width: 64, height: 64, background: 'var(--green-soft)', border: '2px solid rgba(22,101,52,0.3)', borderRadius: '50%' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={2.5} style={{ width: 32, height: 32 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p style={{ color: 'var(--green)', fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 8 }}>
              ACCESS GRANTED
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.12em' }}>
              กำลังพาไปยัง Areas…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              className="flex items-center justify-center mb-5"
              style={{ width: 64, height: 64, background: 'var(--red-soft)', border: '2px solid var(--red-border)', borderRadius: '50%' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth={2.5} style={{ width: 32, height: 32 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p style={{ color: 'var(--red)', fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 8 }}>
              ACCESS DENIED
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.12em', marginBottom: 20 }}>
              {errMsg}
            </p>
            <button
              onClick={() => router.push('/areas/join')}
              style={{
                background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              TRY AGAIN
            </button>
          </>
        )}

        {status === 'no-token' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📵</div>
            <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 800, letterSpacing: '0.15em', marginBottom: 8 }}>
              NO TOKEN
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.12em', marginBottom: 20 }}>
              ลิงก์ไม่มี token — ลองสแกน QR ใหม่
            </p>
            <button
              onClick={() => router.push('/areas/join')}
              style={{
                background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              ⊡ SCAN QR
            </button>
          </>
        )}
      </div>
    </div>
  );
}
