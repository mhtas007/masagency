import React, { useState, useEffect } from 'react';
import { Bell, X, Share, PlusSquare } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export function NotificationPermission() {
  const [showPopup, setShowPopup] = useState(false);
  const [isIosNotStandalone, setIsIosNotStandalone] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkPermission = async () => {
      // Check if user has dismissed it before (stored in localStorage)
      const dismissed = localStorage.getItem('notification_popup_dismissed');
      if (dismissed === 'true') return;

      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIos = /iphone|ipad|ipod/.test(userAgent);
      const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

      // If it's iOS and not in standalone mode (not added to home screen)
      if (isIos && !isInStandaloneMode) {
        setIsIosNotStandalone(true);
        if (user) {
          setTimeout(() => setShowPopup(true), 3000);
        }
        return;
      }

      // If Notification API is not supported at all (and not caught by the iOS check)
      if (!('Notification' in window)) return;
      
      // If permission is already granted or denied, don't show the popup
      if (Notification.permission !== 'default') return;

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
      if (!('Notification' in window)) {
        alert('ئەم براوزەرە پشتگیری نۆتیفیکەیشن ناکات.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const msg = await messaging();
        if (msg) {
          try {
            // Get the service worker registration to pass to getToken
            const registration = await navigator.serviceWorker.ready;
            const currentToken = await getToken(msg, { 
              vapidKey: 'BIhWam1y6cqc9fQ2vClq-2D4Wh52kVxfJPsds1OkofcdSkLZGWYCMZgXVSqjb_nUrsutbRtkEugs8JEim3-NQGc',
              serviceWorkerRegistration: registration
            });
            
            if (currentToken && user) {
              // Save token to user's document
              await updateDoc(doc(db, 'users', user.uid), {
                fcmTokens: arrayUnion(currentToken)
              });
              console.log('Token saved successfully');
              alert('نۆتیفیکەیشن بە سەرکەوتوویی چالاک کرا!');
            } else {
              console.error('No registration token available. Request permission to generate one.');
              alert('کێشەیەک هەیە لە وەرگرتنی تۆکنی نۆتیفیکەیشن.');
            }
          } catch (tokenError: any) {
            console.error('Error getting token:', tokenError);
            alert(`کێشە لە وەرگرتنی تۆکن: ${tokenError.message}`);
          }
        }
      } else {
        alert('ڕێگەت نەدا بە نۆتیفیکەیشن.');
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
          {isIosNotStandalone ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900">زیادکردن بۆ شاشەی سەرەکی</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4 leading-relaxed">
                بۆ وەرگرتنی نۆتیفیکەیشن لەسەر ئایفۆنەکەت، پێویستە ئەم ئەپە زیاد بکەیت بۆ شاشەی سەرەکی (Home Screen).
              </p>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4 text-sm text-gray-700 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-blue-500"><Share className="w-4 h-4" /></span>
                  <span>١. کلیک لە دوگمەی <strong>Share</strong> بکە</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-700"><PlusSquare className="w-4 h-4" /></span>
                  <span>٢. هەڵبژاردەی <strong>Add to Home Screen</strong> دابگرە</span>
                </div>
              </div>
              <button 
                onClick={handleDismiss}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                تێگەیشتم
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
