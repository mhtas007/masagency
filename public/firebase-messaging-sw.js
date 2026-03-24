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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  if (payload.notification) {
    console.log('Notification handled automatically by browser.');
    return;
  }

  const notificationTitle = payload.data?.title || 'ئاگادارکردنەوەی نوێ';
  const notificationOptions = {
    body: payload.data?.body || 'نامەیەکی نوێت هەیە',
    icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
    badge: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
    data: {
      url: payload.data?.url || '/'
    },
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  event.notification.close();

  // FCM automatically puts the link in event.notification.data.FCM_MSG.notification.click_action or similar,
  // but we also pass url in data.url or fcmOptions.link
  let urlToOpen = '/';
  if (event.notification.data?.url) {
    urlToOpen = event.notification.data.url;
  } else if (event.notification.data?.FCM_MSG?.data?.url) {
    urlToOpen = event.notification.data.FCM_MSG.data.url;
  } else if (event.notification.data?.FCM_MSG?.notification?.click_action) {
    urlToOpen = event.notification.data.FCM_MSG.notification.click_action;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
