'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { areasApi } from '../../../../lib/api';

declare global {
  interface Window {
    jsQR?: (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
  }
}

export default function JoinAreaPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'code' | 'scan'>('code');

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState('');
  const [jsQrReady, setJsQrReady] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Load jsQR from CDN once
  useEffect(() => {
    if (window.jsQR) { setJsQrReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js';
    script.onload = () => setJsQrReady(true);
    script.onerror = () => setCamError('ไม่สามารถโหลด QR library ได้');
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamActive(false);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const handleJoin = useCallback(async (raw: string) => {
    let t = raw.trim();
    if (!t) return;
    let isQrToken = false;
    // Extract token param if full URL (QR code encodes a full URL)
    try {
      const url = new URL(t);
      const param = url.searchParams.get('token');
      if (param) { t = param; isQrToken = true; }
    } catch { /* not a URL — typed invite code */ }

    // Invite codes are uppercase in DB; QR tokens are lowercase hex — don't modify
    if (!isQrToken) t = t.toUpperCase();

    setLoading(true);
    try {
      await areasApi.join({ token: t });
      toast.success('เข้าร่วม Area สำเร็จ!');
      router.push('/areas');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'ไม่สามารถเข้าร่วมได้'));
      setLoading(false);
    }
  }, [router]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = window.jsQR?.(imageData.data, canvas.width, canvas.height);
    if (result?.data) {
      setScanSuccess(true);
      stopCamera();
      handleJoin(result.data);
      return;
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera, handleJoin]);

  const startCamera = async () => {
    setCamError('');
    setScanSuccess(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamActive(true);
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setCamError('ไม่สามารถเปิดกล้องได้ — กรุณาอนุญาต Camera');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoin(code);
  };

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link
          href="/areas"
          className="flex items-center justify-center"
          style={{ width: 32, height: 32, background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--text-3)', textDecoration: 'none', fontSize: 16 }}
        >
          ←
        </Link>
        <div>
          <p style={{ color: 'var(--text-3)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em' }}>ACCESS REQUEST</p>
          <p style={{ color: 'var(--text)', fontSize: 18, fontWeight: 800, letterSpacing: '0.08em', marginTop: 1 }}>
            JOIN AREA
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="px-4 pt-4">
        <div
          className="flex"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 3 }}
        >
          {([['code', '# INVITE CODE'], ['scan', '⊡ SCAN QR']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === 'code') stopCamera(); }}
              className="flex-1 py-2 font-bold uppercase transition-all"
              style={{
                fontSize: 10, letterSpacing: '0.15em', borderRadius: 6, border: 'none',
                background: tab === t ? 'var(--red)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-3)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">

        {/* ── CODE TAB ─────────────────────────────────────────────────────── */}
        {tab === 'code' && (
          <div
            className="p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-xs)' }}
          >
            <p style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 16 }}>
              ใส่รหัสเชิญที่ได้รับ
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EX: CAMP-XK7"
                autoCapitalize="characters"
                className="w-full focus:outline-none"
                style={{
                  background: 'var(--surface-2)',
                  border: '1.5px solid var(--border-2)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  fontSize: 20,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  padding: '14px 16px',
                  textAlign: 'center',
                  marginBottom: 12,
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--red)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-2)'; }}
              />
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full py-3 font-black uppercase"
                style={{
                  background: loading || !code.trim() ? 'var(--surface-3)' : 'var(--red)',
                  color: loading || !code.trim() ? 'var(--text-3)' : '#fff',
                  border: 'none', borderRadius: 6,
                  fontSize: 12, letterSpacing: '0.25em',
                  cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'JOINING…' : '⊕ JOIN AREA'}
              </button>
            </form>
          </div>
        )}

        {/* ── SCAN TAB ─────────────────────────────────────────────────────── */}
        {tab === 'scan' && (
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}
          >
            {scanSuccess ? (
              <div className="flex flex-col items-center py-16">
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <p style={{ color: 'var(--green)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em' }}>QR DETECTED — JOINING…</p>
              </div>
            ) : camActive ? (
              <div className="relative" style={{ background: '#000' }}>
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="w-full"
                  style={{ maxHeight: 300, objectFit: 'cover', display: 'block' }}
                />
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div style={{ position: 'relative', width: 200, height: 200 }}>
                    {/* Corner brackets */}
                    {[
                      { top: 0, left: 0, borderTop: '3px solid var(--red)', borderLeft: '3px solid var(--red)', borderRadius: '4px 0 0 0' },
                      { top: 0, right: 0, borderTop: '3px solid var(--red)', borderRight: '3px solid var(--red)', borderRadius: '0 4px 0 0' },
                      { bottom: 0, left: 0, borderBottom: '3px solid var(--red)', borderLeft: '3px solid var(--red)', borderRadius: '0 0 0 4px' },
                      { bottom: 0, right: 0, borderBottom: '3px solid var(--red)', borderRight: '3px solid var(--red)', borderRadius: '0 0 4px 0' },
                    ].map((s, i) => (
                      <div key={i} style={{ position: 'absolute', width: 24, height: 24, ...s }} />
                    ))}
                    {/* Scan line */}
                    <div style={{
                      position: 'absolute', inset: 0, overflow: 'hidden',
                      border: '1px solid rgba(179,36,28,0.2)', borderRadius: 2,
                    }}>
                      <div style={{
                        height: 2, background: 'linear-gradient(90deg, transparent, var(--red), transparent)',
                        animation: 'scanline 2s ease-in-out infinite',
                      }} />
                    </div>
                  </div>
                </div>
                {/* Stop button */}
                <button
                  onClick={stopCamera}
                  className="absolute top-3 right-3"
                  style={{
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
                    color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '4px 10px',
                  }}
                >
                  ✕ STOP
                </button>
                <p
                  className="text-center"
                  style={{ padding: '10px', color: 'var(--text-3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', background: 'var(--surface-2)' }}
                >
                  วาง QR ให้อยู่ในกรอบแดง
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 px-6">
                {camError ? (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📵</div>
                    <p style={{ color: 'var(--red)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textAlign: 'center', marginBottom: 16 }}>
                      {camError}
                    </p>
                  </>
                ) : (
                  <>
                    <div
                      className="flex items-center justify-center mb-5"
                      style={{ width: 64, height: 64, background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border-2)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={1.5} style={{ width: 32, height: 32 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V6a3 3 0 013-3h3M3 15v3a3 3 0 003 3h3m9-18h3a3 3 0 013 3v3m0 6v3a3 3 0 01-3 3h-3M9 9h6v6H9z" />
                      </svg>
                    </div>
                    <p style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 20, textAlign: 'center' }}>
                      กดเพื่อเปิดกล้องสแกน QR Code ของ Area
                    </p>
                  </>
                )}
                <button
                  onClick={startCamera}
                  disabled={!jsQrReady || loading}
                  className="flex items-center gap-2 font-black uppercase"
                  style={{
                    background: !jsQrReady || loading ? 'var(--surface-3)' : 'var(--red)',
                    color: !jsQrReady || loading ? 'var(--text-3)' : '#fff',
                    border: 'none', borderRadius: 6,
                    fontSize: 11, letterSpacing: '0.2em', padding: '12px 24px',
                    cursor: !jsQrReady || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {jsQrReady ? '⊡ OPEN SCANNER' : 'LOADING…'}
                </button>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Info note */}
        <div
          className="mt-4 flex items-center gap-2 px-4 py-3"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)', borderRadius: 8 }}
        >
          <span style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>
            ℹ️ รหัสเชิญได้จากผู้ดูแล Area หรือสแกน QR Code จากหน้า MY AREAS
          </span>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(0); }
          50% { transform: translateY(196px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
