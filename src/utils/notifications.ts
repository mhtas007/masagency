import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const addNotification = async (title: string, message: string, type: string, targetRole?: string, targetUserId?: string, url?: string) => {
  try {
    const finalTargetRole = targetRole || (!targetUserId ? 'Admin' : null);
    
    // Add to Firestore for in-app history
    await addDoc(collection(db, 'notifications'), {
      title,
      message,
      type,
      targetRole: finalTargetRole,
      user_id: targetUserId || (finalTargetRole === 'Admin' ? 'admin' : null),
      url: url || null,
      created_at: new Date().toISOString(),
      read: false
    });

    // Call backend API to send real Push Notifications (required for iOS)
    try {
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body: message,
          targetRole: finalTargetRole,
          targetUserId: targetUserId || null,
          data: { type, url: url || '/' }
        }),
      });
    } catch (apiError) {
      console.error('Failed to trigger push notification API:', apiError);
    }

  } catch (error) {
    console.error('Error adding notification:', error);
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
          await registration.showNotification(title, options);
          return;
        }
      }
      // Fallback for desktop browsers if no SW is found
      new Notification(title, options);
    } catch (error) {
      console.error('Error showing notification via SW:', error);
      // Final fallback
      try {
        new Notification(title, options);
      } catch (e) {
        console.error('Fallback notification failed:', e);
      }
    }
  }
};
