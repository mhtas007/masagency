importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCy1nI_5ij2M2zchtQN3FRyfppLabG1OGc",
  authDomain: "gen-lang-client-0753035912.firebaseapp.com",
  projectId: "gen-lang-client-0753035912",
  storageBucket: "gen-lang-client-0753035912.firebasestorage.app",
  messagingSenderId: "892937935038",
  appId: "1:892937935038:web:5e19e957b3c2f6354466ef"
});

const messaging = firebase.messaging();

// ─── Method 1: Firebase SDK background handler ────────────────────────────────
// This is the standard FCM way. Works on Chrome, Edge, Firefox, and iOS Safari
// when installed as a PWA (Home Screen).
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Firebase onBackgroundMessage:', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'ئاگاداری نوێ';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'تۆ نامەیەکی نوێت بۆ هاتووە.',
    icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
    badge: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
    data: payload.data,
    tag: 'mas-agency-push-notification',
    vibrate: [200, 100, 200],
    requireInteraction: false
  };

  // Always explicitly call showNotification — required on iOS Safari PWA
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ─── Method 2: Native push event listener (iOS fallback) ─────────────────────
// iOS Safari PWA sometimes bypasses the Firebase SDK and delivers the raw push
// event directly to the service worker. This handler catches those cases.
self.addEventListener('push', (event) => {
  console.log('[SW] Native push event received:', event);

  let title = 'ئاگاداری نوێ';
  let body = 'تۆ نامەیەکی نوێت بۆ هاتووە.';

  if (event.data) {
    try {
      const data = event.data.json();
      // FCM wraps the payload — try both standard and data fields
      title = data.notification?.title || data.data?.title || data.title || title;
      body = data.notification?.body || data.data?.body || data.body || body;
    } catch (e) {
      // If JSON parse fails, try reading as plain text
      try {
        body = event.data.text() || body;
      } catch (_) {}
    }
  }

  const notificationOptions = {
    body,
    icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
    badge: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
    tag: 'mas-agency-push-notification',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = new URL('/', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // If a window is already open, focus it
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url.startsWith(self.location.origin)) {
        return windowClient.focus();
      }
    }
    // Otherwise open a new window
    return clients.openWindow(urlToOpen);
  });

  event.waitUntil(promiseChain);
});

// ─── Service Worker Lifecycle ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});
