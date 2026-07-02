import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messaging: Messaging | null = null;

/**
 * Initialise Firebase Messaging (browser only, requires HTTPS / localhost).
 * Returns null in SSR or unsupported environments.
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messaging) return messaging;

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  messaging = getMessaging(app);
  return messaging;
}

/**
 * Request notification permission and obtain FCM token.
 * Registers the service worker before requesting the token.
 */
export async function requestFcmToken(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const m = await getFirebaseMessaging();
    if (!m) return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const token = await getToken(m, {
      vapidKey:            process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
      serviceWorkerRegistration: registration,
    });

    return token ?? null;
  } catch (err) {
    console.error('[FCM] token error', err);
    return null;
  }
}

/**
 * Subscribe to foreground messages (app is open).
 * Returns an unsubscribe function.
 */
export async function onForegroundMessage(
  handler: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void,
): Promise<() => void> {
  const m = await getFirebaseMessaging();
  if (!m) return () => {};
  return onMessage(m, handler);
}
