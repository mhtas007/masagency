import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export function NotificationPermission() {
  const [showPopup, setShowPopup] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Check if we should show the popup
    const checkPermission = async () => {
      if (!('Notification' in window)) return;
      
      // If permission is already granted or denied, don't show the popup
      if (Notification.permission !== 'default') return;

      // Check if user has dismissed it before (stored in localStorage)
      const dismissed = localStorage.getItem('notification_popup_dismissed');
      if (dismissed === 'true') return;

      // Only show if user is logged in
      if (user) {
        // Small delay to not overwhelm the user immediately on login
        setTimeout(() => setShowPopup(true), 3000);
      }
    };

    checkPermission();
  }, [user]);

  const handleAllow = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const msg = await messaging();
        if (msg) {
          const currentToken = await getToken(msg, { vapidKey: 'BIhWam1y6cqc9fQ2vClq-2D4Wh52kVxfJPsds1OkofcdSkLZGWYCMZgXVSqjb_nUrsutbRtkEugs8JEim3-NQGc' });
          
          if (currentToken && user) {
            // Save token to user's document
            await updateDoc(doc(db, 'users', user.uid), {
              fcmTokens: arrayUnion(currentToken)
            });
            console.log('Token saved successfully');
          }
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setShowPopup(false);
      localStorage.setItem('notification_popup_dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPopup(false);
    localStorage.setItem('notification_popup_dismissed', 'true');
  };

  if (!showPopup) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50 animate-in slide-in-from-bottom-5">
      <button 
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">نۆتیفیکەیشنەکان چالاک بکە</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4 leading-relaxed">
            بۆ ئەوەی ئاگاداری نوێترین گۆڕانکارییەکان و نامەکان بیت، تکایە ڕێگە بە نۆتیفیکەیشن بدە.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={handleAllow}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              ڕێگەدان
            </button>
            <button 
              onClick={handleDismiss}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              نەخێر سوپاس
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
