import { collection, addDoc, getDocs, query, where, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Adds a notification to Firestore AND sends a real FCM push notification.
 * @param title - Notification title
 * @param message - Notification body
 * @param type - Type of notification ('info', 'success', 'warning', 'error')
 * @param targetRole - (optional) Only notify users with this role
 * @param userId - (optional) Only notify this specific user (by their Firestore UID)
 */
export const addNotification = async (
  title: string,
  message: string,
  type: string,
  targetRole?: string,
  userId?: string
) => {
  try {
    let targetUserIds: string[] = [];

    if (userId) {
      // Single user target
      targetUserIds = [userId];
    } else {
      // Fetch all users (or by role) to get their UIDs and write per-user docs
      let usersQuery = query(collection(db, 'users'));
      if (targetRole) {
        usersQuery = query(collection(db, 'users'), where('role', '==', targetRole));
      }
      const usersSnap = await getDocs(usersQuery);
      targetUserIds = usersSnap.docs.map(d => d.id);
    }

    // Write a notification document per user (so they can see it in-app)
    const writes = targetUserIds.map(uid =>
      addDoc(collection(db, 'notifications'), {
        title,
        message,
        type,
        user_id: uid,
        created_at: new Date().toISOString(),
        read: false
      })
    );
    await Promise.all(writes);

    // Send real FCM push notification via backend API
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body: message,
          targetRole: targetRole || null,
          userId: userId || null,
          data: { type }
        }),
      });
      const result = await response.json();
      console.log('[FCM] Push sent:', result);
    } catch (apiError) {
      console.error('[FCM] Failed to trigger push notification API:', apiError);
    }

  } catch (error) {
    console.error('Error adding notification:', error);
  }
};

/**
 * Removes a stale (invalid) FCM token from a user's document.
 */
export const removeStaleToken = async (userId: string, token: string) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(token)
    });
    console.log('[FCM] Removed stale token for user:', userId);
  } catch (error) {
    console.error('[FCM] Failed to remove stale token:', error);
  }
};

export const showBrowserNotification = async (title: string, options: NotificationOptions) => {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    try {
      // On iOS and mobile devices, notifications must be shown via the Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(title, {
            icon: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
            badge: 'https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png',
            ...options
          });
          return;
        }
      }
      // Fallback for desktop browsers
      new Notification(title, options);
    } catch (error) {
      console.error('Error showing notification via SW:', error);
      try {
        new Notification(title, options);
      } catch (e) {
        console.error('Fallback notification failed:', e);
      }
    }
  }
};
