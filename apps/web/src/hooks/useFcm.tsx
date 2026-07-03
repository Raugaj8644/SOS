'use client';
import { useEffect, useCallback } from 'react';
import { requestFcmToken, onForegroundMessage } from '../lib/firebase';
import { notificationsApi } from '../lib/api';
import toast from 'react-hot-toast';

const FCM_TOKEN_KEY = 'cerp_fcm_token';

/**
 * Registers FCM token with the backend and subscribes to foreground messages.
 * Safe to call on every page load — deduplicates token registration.
 */
export function useFcm() {
  const register = useCallback(async () => {
    const token = await requestFcmToken();
    if (!token) return;

    const stored = localStorage.getItem(FCM_TOKEN_KEY);
    if (stored === token) return; // already registered

    try {
      await notificationsApi.registerFcmToken(token);
      localStorage.setItem(FCM_TOKEN_KEY, token);
    } catch (err) {
      console.error('[FCM] failed to register token', err);
    }
  }, []);

  useEffect(() => {
    register();

    let unsub: (() => void) | undefined;
    onForegroundMessage((payload) => {
      const { title, body } = payload.notification ?? {};
      toast.custom(
        (t) => (
          <div
            className={`flex items-start gap-3 rounded-2xl px-4 py-3 max-w-sm transition-all ${t.visible ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
          >
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{title ?? 'CERP Alert'}</p>
              {body && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{body}</p>}
            </div>
          </div>
        ),
        { duration: 6000 },
      );
    }).then((fn) => { unsub = fn; });

    return () => { unsub?.(); };
  }, []);
}
