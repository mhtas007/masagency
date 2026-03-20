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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'ئاگاداری نوێ';
  const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'تۆ نامەیەکی نوێت بۆ هاتووە.',
      icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
      badge: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
      data: payload.data,
      tag: 'mas-agency-push-notification',
      vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = new URL('/', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// Service Worker Lifecycle
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
