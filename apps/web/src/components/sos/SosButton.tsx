'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { incidentsApi } from '../../lib/api';
import { SosModal } from './SosModal';
import toast from 'react-hot-toast';

interface Props {
  areaId: string;
  userPosition: { lat: number; lng: number; accuracy: number } | null;
}

const HOLD_DURATION = 3000; // 3 seconds

export function SosButton({ areaId, userPosition }: Props) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);       // 0–100
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startHold = useCallback(() => {
    if (triggered) return;

    setHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(pct);

      if (elapsed >= HOLD_DURATION) {
        clearInterval(intervalRef.current!);
        setHolding(false);
        setShowModal(true); // open type-selection modal
      }
    }, 50);
  }, [userPosition, triggered]);

  const cancelHold = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleSOS = async (type?: string, description?: string) => {
    setIsSubmitting(true);
    try {
      await incidentsApi.create(areaId, {
        ...(userPosition ? {
          lat: userPosition.lat,
          lng: userPosition.lng,
          accuracy: userPosition.accuracy,
        } : {}),
        type: type ?? 'emergency',
        description,
      });
      setTriggered(true);
      setShowModal(false);
      toast.success('🚨 SOS Alert sent! Help is on the way.');
      // Reset after 30 seconds (allow re-trigger if needed)
      setTimeout(() => setTriggered(false), 30_000);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(msg ?? 'Failed to send SOS. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* ── SOS Button ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 select-none">
        {/* Progress ring + button */}
        <div className="relative">
          {/* Animated pulse ring when holding */}
          {holding && (
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
          )}

          {/* SVG progress ring */}
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 120 120"
            width="120"
            height="120"
          >
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="rgba(239,68,68,0.2)"
              strokeWidth="8"
            />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="#ef4444"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
              className="transition-all duration-100"
            />
          </svg>

          {/* Main button */}
          <button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            disabled={isSubmitting}
            aria-label="Hold for 3 seconds to send SOS emergency alert"
            className={`
              relative w-[120px] h-[120px] rounded-full font-black text-white text-2xl
              flex flex-col items-center justify-center gap-0.5
              transition-all duration-150 shadow-2xl
              ${triggered
                ? 'bg-orange-600 cursor-not-allowed scale-95'
                : holding
                  ? 'bg-red-700 scale-95 shadow-red-500/60'
                  : 'bg-red-600 hover:bg-red-500 active:scale-95 animate-sos-pulse shadow-red-600/50'
              }
            `}
          >
            <span className="text-3xl leading-none">🆘</span>
            <span className="text-xs font-bold tracking-widest">
              {triggered ? 'SENT' : 'SOS'}
            </span>
          </button>
        </div>

        {/* Instruction text */}
        <p className="text-xs text-white/80 font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur">
          {triggered
            ? 'Alert sent — help is coming'
            : holding
              ? `Hold… ${Math.ceil(((100 - progress) / 100) * 3)}s`
              : 'Hold 3s for emergency'}
        </p>
      </div>

      {/* ── Type selection modal — portal to escape CSS transform ancestor ── */}
      {typeof document !== 'undefined' && createPortal(
        <SosModal
          open={showModal}
          onClose={() => { setShowModal(false); setProgress(0); }}
          onSubmit={handleSOS}
          isSubmitting={isSubmitting}
        />,
        document.body,
      )}
    </>
  );
}
