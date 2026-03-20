import React, { useState, useEffect } from 'react';
import { Bell, X, Share, PlusSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export function NotificationPermission() {
  const [showPopup, setShowPopup] = useState(false);
  const [isIosNotStandalone, setIsIosNotStandalone] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const { user } = useAuth();

  useEffect(() => {
    const checkPermission = async () => {
      const dismissed = localStorage.getItem('notification_popup_dismissed');
      if (dismissed === 'true') return;

      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIos = /iphone|ipad|ipod/.test(userAgent);
      const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

      // iOS but NOT added to Home Screen — show install guide
      if (isIos && !isInStandaloneMode) {
        setIsIosNotStandalone(true);
        if (user) {
          setTimeout(() => setShowPopup(true), 3000);
        }
        return;
      }

      if (!('Notification' in window)) return;
      
      // If already granted, silently try to (re-)save token in case it wasn't saved before
      if (Notification.permission === 'granted' && user) {
        await silentlySaveToken();
        return;
      }

      // Show permission popup only if still default
      if (Notification.permission === 'default' && user) {
        setTimeout(() => setShowPopup(true), 3000);
      }
    };

    checkPermission();
  }, [user]);

  /**
   * Silently attempts to get and save the FCM token without user interaction.
   * Called when permission is already granted.
   */
  const silentlySaveToken = async () => {
    try {
      const msg = await messaging();
      if (!msg || !user) return;
      const registration = await navigator.serviceWorker.ready;
      const currentToken = await getToken(msg, {
        vapidKey: 'BIhWam1y6cqc9fQ2vClq-2D4Wh52kVxfJPsds1OkofcdSkLZGWYCMZgXVSqjb_nUrsutbRtkEugs8JEim3-NQGc',
        serviceWorkerRegistration: registration
      });
      if (currentToken) {
        await updateDoc(doc(db, 'users', user.uid), {
          fcmTokens: arrayUnion(currentToken)
        });
        console.log('[FCM] Token silently refreshed and saved for user:', user.uid);
      } else {
        console.warn('[FCM] No token returned — user may not have granted permission or browser not supported.');
      }
    } catch (error) {
      console.error('[FCM] Silent token save failed:', error);
    }
  };

  const handleAllow = async () => {
    try {
      if (!('Notification' in window)) {
        alert('ئەم براوزەرە پشتگیری نۆتیفیکەیشن ناکات.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setTokenStatus('saving');
        const msg = await messaging();
        if (msg && user) {
          const registration = await navigator.serviceWorker.ready;
          const currentToken = await getToken(msg, {
            vapidKey: 'BIhWam1y6cqc9fQ2vClq-2D4Wh52kVxfJPsds1OkofcdSkLZGWYCMZgXVSqjb_nUrsutbRtkEugs8JEim3-NQGc',
            serviceWorkerRegistration: registration
          });

          if (currentToken) {
            await updateDoc(doc(db, 'users', user.uid), {
              fcmTokens: arrayUnion(currentToken)
            });
            console.log('[FCM] Token saved for user:', user.uid, '| Token:', currentToken.substring(0, 20) + '...');
            setTokenStatus('success');
          } else {
            console.warn('[FCM] Permission granted but no token returned.');
            setTokenStatus('error');
          }
        }
      }
    } catch (error) {
      console.error('[FCM] Error requesting notification permission:', error);
      setTokenStatus('error');
    } finally {
      setTimeout(() => {
        setShowPopup(false);
        localStorage.setItem('notification_popup_dismissed', 'true');
      }, tokenStatus === 'success' ? 1500 : 0);
    }
  };

  const handleDismiss = () => {
    setShowPopup(false);
    localStorage.setItem('notification_popup_dismissed', 'true');
  };

  if (!showPopup) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-5 z-50">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          {isIosNotStandalone ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">زیادکردن بۆ شاشەی سەرەکی</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
                بۆ وەرگرتنی نۆتیفیکەیشن لەسەر ئایفۆنەکەت، پێویستە ئەم ئەپە زیاد بکەیت بۆ شاشەی سەرەکی (Home Screen).
              </p>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600 mb-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-600 rounded-md shadow-sm text-blue-500">
                    <Share className="w-4 h-4" />
                  </span>
                  <span>١. کلیک لە دوگمەی <strong>Share</strong> بکە (ئەو ئایکۆنەی تیرێکی ھەیە)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-600 rounded-md shadow-sm text-gray-700 dark:text-gray-300">
                    <PlusSquare className="w-4 h-4" />
                  </span>
                  <span>٢. هەڵبژاردەی <strong>Add to Home Screen</strong> دابگرە</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-600 rounded-md shadow-sm text-blue-500">
                    <Bell className="w-4 h-4" />
                  </span>
                  <span>٣. بەرنامەکە لە شاشەکەوە بکەرەوە و ڕێگە بە نۆتیفیکەیشن بدە</span>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                تێگەیشتم
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">نۆتیفیکەیشنەکان چالاک بکە</h3>
              
              {tokenStatus === 'success' ? (
                <div className="flex items-center gap-2 mt-3 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">بەسەرکەوتووی چالاک کرا! ✓</span>
                </div>
              ) : tokenStatus === 'error' ? (
                <div className="flex items-center gap-2 mt-3 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">کێشەیەک ڕوویدا. دووبارە هەوڵ بدەرەوە.</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
                    بۆ ئەوەی ئاگاداری نوێترین گۆڕانکارییەکان و نامەکان بیت، تکایە ڕێگە بە نۆتیفیکەیشن بدە.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAllow}
                      disabled={tokenStatus === 'saving'}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70"
                    >
                      {tokenStatus === 'saving' ? 'چاوەڕێ بکە...' : 'ڕێگەدان'}
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      نەخێر سوپاس
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
