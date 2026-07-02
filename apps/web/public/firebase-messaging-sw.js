// Firebase Cloud Messaging Service Worker
// Handles background push notifications when the app is not in the foreground.
// NOTE: Service Workers cannot access Next.js env vars — Firebase config is hardcoded here
// (these are public client-side keys, safe to expose).

importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyCS2ufea8hQeSzbY-TiZhfgvMRYqy2R_SY',
  authDomain:        'cerp-sos.firebaseapp.com',
  projectId:         'cerp-sos-3e5fa',
  storageBucket:     'cerp-sos.firebasestorage.app',
  messagingSenderId: '585353996075',
  appId:             '1:585353996075:web:f2274c3c35f0d63833876e',
});

const messaging = firebase.messaging();

// Handle background messages (app is closed / in background tab)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};

  self.registration.showNotification(title ?? '🚨 CERP Alert', {
    body: body ?? '',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200, 100, 400],
    data: payload.data ?? {},
    tag: payload.data?.incidentId ?? 'cerp-notification',
    requireInteraction: payload.data?.type === 'sos',
    actions: [
      { action: 'view',    title: 'View Incident' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
});

// Handle notification click → open the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const data = event.notification.data ?? {};
  const url  = data.incidentId
    ? `/areas/${data.areaId}/incidents/${data.incidentId}`
    : '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
