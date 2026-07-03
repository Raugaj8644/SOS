'use client';
import React, {
  useState, useRef, useCallback, useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { incidentsApi } from '../../lib/api';
import { getSocket, SOCKET_EVENTS } from '../../lib/socket';
import toast from 'react-hot-toast';

// ── Incident types ─────────────────────────────────────────────────────────────
const INCIDENT_TYPES = [
  { value: 'medical_emergency',   label: 'Medical',    icon: '🏥', color: '#0f766e', hover: '#0d9488' },
  { value: 'fire',                label: 'Fire',       icon: '🔥', color: '#c2410c', hover: '#ea580c' },
  { value: 'violence',            label: 'Violence',   icon: '⚠️', color: '#6d28d9', hover: '#7c3aed' },
  { value: 'injury',              label: 'Injury',     icon: '🩹', color: '#b45309', hover: '#d97706' },
  { value: 'missing_person',      label: 'Missing',    icon: '🔍', color: '#1d4ed8', hover: '#2563eb' },
  { value: 'suspicious_activity', label: 'Suspicious', icon: '👁️', color: '#0e7490', hover: '#0891b2' },
  { value: 'other',               label: 'Other',      icon: '📢', color: '#be185d', hover: '#db2777' },
];

// ── Ring geometry ──────────────────────────────────────────────────────────────
const N        = INCIDENT_TYPES.length;   // 7 segments
const GAP      = 5;                       // gap between segments (degrees)
const SEG      = 360 / N - GAP;          // each segment's angular span (~46.4°)
const INNER_R  = 72;                      // inner radius of ring (px)
const OUTER_R  = 165;                     // outer radius of ring (px)
const MID_R    = (INNER_R + OUTER_R) / 2; // ~118 px — where icons/labels sit
const BTN_R    = 58;                      // SOS button radius
const SVG_HALF = OUTER_R + 20;           // half the SVG element size
const CX       = SVG_HALF;               // SVG center x
const CY       = SVG_HALF;               // SVG center y

// ── Timing ────────────────────────────────────────────────────────────────────
const HOLD_MS   = 2000;
const CANCEL_MS = 3000;

// ── Helpers ───────────────────────────────────────────────────────────────────
function polarXY(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180; // 0° = top
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function donutPath(inner: number, outer: number, start: number, end: number) {
  const p1 = polarXY(inner, start);
  const p2 = polarXY(inner, end);
  const p3 = polarXY(outer, end);
  const p4 = polarXY(outer, start);
  const arc = end - start > 180 ? 1 : 0;
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${arc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${arc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

interface Props {
  areaId: string;
  userPosition: { lat: number; lng: number; accuracy: number } | null;
  variant?: 'map' | 'card';
}

export function SosSpeedDial({ areaId, userPosition, variant = 'map' }: Props) {
  const [open, setOpen]           = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdPct, setHoldPct]     = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pending, setPending]     = useState<{ type: string; label: string } | null>(null);
  const [countdown, setCountdown] = useState(CANCEL_MS / 1000);
  // Start off-screen so there's no flash before position is measured
  const [btnPos, setBtnPos]       = useState({ x: -9999, y: -9999 });

  const placeholderRef    = useRef<HTMLDivElement>(null);
  const holdTimerRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const holdIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdIntervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationShareRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeIncidentRef = useRef<{ incidentId: string; areaId: string } | null>(null);
  const userPositionRef   = useRef(userPosition);
  const pressStartRef     = useRef(0);
  const isHoldingRef      = useRef(false);

  // Keep position ref current
  useEffect(() => { userPositionRef.current = userPosition; }, [userPosition]);

  // ── Track placeholder centre in viewport ──────────────────────────────────
  useEffect(() => {
    function update() {
      if (!placeholderRef.current) return;
      const r = placeholderRef.current.getBoundingClientRect();
      setBtnPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, []);

  // ── Hold logic ────────────────────────────────────────────────────────────
  const clearHold = useCallback(() => {
    if (holdTimerRef.current)    clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdTimerRef.current = holdIntervalRef.current = null;
    isHoldingRef.current = false;
    setIsHolding(false);
    setHoldPct(0);
  }, []);

  // ── Stop location sharing ─────────────────────────────────────────────────
  const stopLocationSharing = useCallback(() => {
    if (locationShareRef.current) {
      clearInterval(locationShareRef.current);
      locationShareRef.current = null;
    }
    if (activeIncidentRef.current) {
      try {
        const socket = getSocket();
        socket.emit(SOCKET_EVENTS.STOP_LOCATION, activeIncidentRef.current);
      } catch {}
      activeIncidentRef.current = null;
    }
  }, []);

  // ── Start location sharing ─────────────────────────────────────────────────
  const startLocationSharing = useCallback((incidentId: string) => {
    stopLocationSharing();
    activeIncidentRef.current = { incidentId, areaId };

    const socket = getSocket();
    const emitLocation = () => {
      const pos = userPositionRef.current;
      if (!pos || !activeIncidentRef.current) return;
      socket.emit(SOCKET_EVENTS.SEND_LOCATION, {
        incidentId: activeIncidentRef.current.incidentId,
        areaId:     activeIncidentRef.current.areaId,
        lat: pos.lat,
        lng: pos.lng,
      });
    };

    // Send immediately then every 5 seconds
    emitLocation();
    locationShareRef.current = setInterval(emitLocation, 5000);

    // Auto-stop after 60 minutes (safety net)
    setTimeout(stopLocationSharing, 60 * 60 * 1000);
  }, [areaId, stopLocationSharing]);

  // ── Send SOS ──────────────────────────────────────────────────────────────
  const sendSos = useCallback(async (type: string) => {
    try {
      const pos = userPositionRef.current;
      const res = await incidentsApi.create(areaId, {
        ...(pos ? { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy } : {}),
        type,
      });
      toast.success('🚨 SOS ส่งแล้ว! ความช่วยเหลือกำลังมา');
      // Start sharing live location so responders can track victim
      const incidentId = res?.data?.data?.id;
      if (incidentId) startLocationSharing(incidentId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'ส่ง SOS ไม่สำเร็จ กรุณาลองใหม่');
    }
  }, [areaId, startLocationSharing]);

  // ── 3-second countdown ────────────────────────────────────────────────────
  const triggerCountdown = useCallback((type: string, label: string) => {
    setOpen(false);
    const total = CANCEL_MS / 1000;
    setPending({ type, label });
    setCountdown(total);
    let c = total;
    cdIntervalRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(cdIntervalRef.current!);
        cdIntervalRef.current = null;
        setPending(null);
        sendSos(type);
      }
    }, 1000);
  }, [sendSos]);

  const cancelCountdown = useCallback(() => {
    if (cdIntervalRef.current) { clearInterval(cdIntervalRef.current); cdIntervalRef.current = null; }
    setPending(null);
    setCountdown(CANCEL_MS / 1000);
    toast('SOS cancelled ✋', { duration: 2000 });
  }, []);

  // ── Press events ──────────────────────────────────────────────────────────
  const onPressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isHoldingRef.current = true;
    pressStartRef.current = Date.now();
    setIsHolding(true);
    setHoldPct(0);
    holdIntervalRef.current = setInterval(() => {
      setHoldPct(Math.min(((Date.now() - pressStartRef.current) / HOLD_MS) * 100, 100));
    }, 50);
    holdTimerRef.current = setTimeout(() => {
      clearHold();
      triggerCountdown('emergency', 'Emergency');
    }, HOLD_MS);
  }, [userPosition, clearHold, triggerCountdown]);

  const onPressEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const elapsed    = Date.now() - pressStartRef.current;
    const wasHolding = isHoldingRef.current;
    clearHold();
    if (wasHolding && elapsed < 300) setOpen((o) => !o);
  }, [clearHold]);

  useEffect(() => () => {
    clearHold();
    if (cdIntervalRef.current) clearInterval(cdIntervalRef.current);
    stopLocationSharing();
  }, [clearHold, stopLocationSharing]);

  // ── Derived SVG position ──────────────────────────────────────────────────
  const svgLeft = btnPos.x - SVG_HALF;
  const svgTop  = btnPos.y - SVG_HALF;
  const PROG_R  = BTN_R + 10;
  const PROG_C  = 2 * Math.PI * PROG_R;

  return (
    <>
      {/* ── Invisible placeholder — occupies layout space, tracks position ── */}
      <div
        className="flex flex-col items-center select-none"
        style={{ visibility: 'hidden', gap: 12 }}
      >
        <div ref={placeholderRef} style={{ width: BTN_R * 2, height: BTN_R * 2 }} />
        <p className="text-xs px-3 py-1">Tap or hold</p>
      </div>

      {/* ── Portal: everything rendered at body level ─────────────────────── */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          {open && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              style={{ zIndex: 9998 }}
              onClick={() => setOpen(false)}
            />
          )}

          {/* Ring + button SVG */}
          <svg
            style={{
              position: 'fixed',
              left: svgLeft,
              top:  svgTop,
              width:  SVG_HALF * 2,
              height: SVG_HALF * 2,
              zIndex: 9999,
              overflow: 'visible',
            }}
            viewBox={`0 0 ${SVG_HALF * 2} ${SVG_HALF * 2}`}
          >
            {/* ── Donut segments ─────────────────────────────────────────── */}
            {INCIDENT_TYPES.map((item, i) => {
              const startDeg = i * (SEG + GAP);
              const endDeg   = startDeg + SEG;
              const midDeg   = startDeg + SEG / 2;
              const iconPt   = polarXY(MID_R - 13, midDeg);
              const lblPt    = polarXY(MID_R + 18, midDeg);
              const isHov    = hoveredIdx === i;

              return (
                <g
                  key={item.value}
                  style={{
                    cursor: 'pointer',
                    pointerEvents: open ? 'auto' : 'none',
                    transformOrigin: `${CX}px ${CY}px`,
                    transform: open ? 'scale(1)' : 'scale(0.3)',
                    opacity: open ? 1 : 0,
                    transition: `transform 0.38s cubic-bezier(0.34,1.56,0.64,1) ${i * 38}ms,
                                 opacity 0.22s ease ${i * 38}ms`,
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => { setOpen(false); triggerCountdown(item.value, item.label); }}
                >
                  <path
                    d={donutPath(INNER_R, OUTER_R, startDeg, endDeg)}
                    fill={isHov ? item.hover : item.color}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="2"
                    style={{ transition: 'fill 0.18s', filter: isHov ? `drop-shadow(0 0 8px ${item.hover}99)` : 'none' }}
                  />
                  {/* Icon */}
                  <text
                    x={iconPt.x.toFixed(1)}
                    y={iconPt.y.toFixed(1)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="22"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {item.icon}
                  </text>
                  {/* Label */}
                  <text
                    x={lblPt.x.toFixed(1)}
                    y={lblPt.y.toFixed(1)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.9)"
                    fontSize="11"
                    fontWeight="700"
                    letterSpacing="0.5"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}

            {/* ── Hold-progress ring ─────────────────────────────────────── */}
            <circle
              cx={CX} cy={CY} r={PROG_R}
              fill="none" stroke="rgba(179,36,28,0.18)" strokeWidth="7"
              style={{ pointerEvents: 'none' }}
            />
            <circle
              cx={CX} cy={CY} r={PROG_R}
              fill="none" stroke="#b3241c" strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={PROG_C}
              strokeDashoffset={PROG_C * (1 - holdPct / 100)}
              style={{
                transformOrigin: `${CX}px ${CY}px`,
                transform: 'rotate(-90deg)',
                opacity: isHolding ? 1 : 0,
                transition: 'stroke-dashoffset 75ms linear, opacity 150ms',
                pointerEvents: 'none',
              }}
            />

            {/* ── SOS button circle ──────────────────────────────────────── */}
            <circle
              cx={CX} cy={CY} r={BTN_R}
              fill={open || isHolding ? '#931d17' : '#b3241c'}
              style={{
                cursor: 'pointer',
                filter: 'drop-shadow(0 4px 16px rgba(179,36,28,0.55))',
                transition: 'fill 0.15s',
                pointerEvents: 'auto',
              }}
              onMouseDown={onPressStart as any}
              onMouseUp={onPressEnd as any}
              onMouseLeave={() => { if (isHoldingRef.current) clearHold(); }}
              onTouchStart={onPressStart as any}
              onTouchEnd={onPressEnd as any}
              onTouchCancel={onPressEnd as any}
            />

            {/* SOS label */}
            <text
              x={CX} y={CY - 6}
              textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize="30"
              letterSpacing="6"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              SOS
            </text>
            <text
              x={CX} y={CY + 17}
              textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.60)" fontSize="10" fontWeight="600"
              letterSpacing="2"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {isHolding
                ? `${Math.max(1, Math.ceil(((100 - holdPct) / 100) * 2))}s`
                : open ? 'SELECT TYPE' : 'TAP • HOLD 2s'}
            </text>
          </svg>

          {/* Hint below button (when idle) */}
          {!open && !isHolding && (
            <div
              className={`fixed text-xs font-medium px-3 py-1 rounded-full
                whitespace-nowrap pointer-events-none
                ${variant === 'card'
                  ? 'text-red-100 bg-red-800/50'
                  : 'text-white/80 bg-black/40 backdrop-blur'}`}
              style={{
                left: btnPos.x,
                top:  btnPos.y + BTN_R + 18,
                transform: 'translateX(-50%)',
                zIndex: 9999,
              }}
            >
              Tap: pick type  •  Hold 2s: emergency
            </div>
          )}

          {/* ── 3-second countdown overlay ─────────────────────────────── */}
          {pending && (
            <div
              className="fixed inset-0 flex flex-col items-center justify-center
                         bg-red-950/92 backdrop-blur-md"
              style={{ zIndex: 10000 }}
            >
              <div className="flex flex-col items-center gap-5 text-white px-8 text-center">
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
                  <div className="relative w-24 h-24 bg-red-600 rounded-full flex items-center justify-center text-5xl shadow-2xl">
                    🚨
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-black uppercase tracking-wider">SOS Alert</p>
                  <p className="text-red-300 mt-1">{pending.label} emergency</p>
                </div>
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="-rotate-90 absolute inset-0" viewBox="0 0 144 144" width="144" height="144">
                    <circle cx="72" cy="72" r="60" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                    <circle cx="72" cy="72" r="60" fill="none" stroke="white" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 60}`}
                      strokeDashoffset={`${2 * Math.PI * 60 * (1 - countdown / (CANCEL_MS / 1000))}`}
                      style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                    />
                  </svg>
                  <span className="text-6xl font-black tabular-nums">{countdown}</span>
                </div>
                <p className="text-red-200 text-sm">
                  Sending in {countdown} second{countdown !== 1 ? 's' : ''}…
                </p>
                <button
                  onClick={cancelCountdown}
                  className="mt-2 px-14 py-5 bg-white text-red-700 font-black text-2xl
                             rounded-2xl shadow-2xl hover:bg-red-50 active:scale-95
                             transition-all border-4 border-red-200"
                >
                  ✋  CANCEL
                </button>
              </div>
            </div>
          )}
        </>,
        document.body,
      )}
    </>
  );
}
