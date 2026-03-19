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
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
