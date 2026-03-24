import React, { useState, useEffect } from 'react';
import { Bell, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

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

  return (
    <AnimatePresence>
      {showPopup && (
        <>
          {/* Backdrop for mobile */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] sm:hidden"
            onClick={handleDismiss}
          />
          
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[400px] bg-white dark:bg-gray-800 sm:rounded-3xl rounded-t-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 z-[70] overflow-hidden"
          >
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-primary/20">
                {isIosNotStandalone ? (
                  <Smartphone className="w-8 h-8 text-primary" />
                ) : (
                  <Bell className="w-8 h-8 text-primary" />
                )}
              </div>
              
              {isIosNotStandalone ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ئەپەکە دابەزێنە</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                    بۆ وەرگرتنی نۆتیفیکەیشن و ئەزموونێکی باشتر، ئەپەکە زیاد بکە بۆ شاشەی سەرەکی مۆبایلەکەت.
                  </p>
                  
                  <div className="w-full bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 mb-6 text-sm text-gray-700 dark:text-gray-300 space-y-4 text-right">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm text-primary border border-gray-100 dark:border-gray-700 shrink-0">
                        <Share className="w-4 h-4" />
                      </div>
                      <span>١. کلیک لە دوگمەی <strong>Share</strong> بکە لە خوارەوە</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700 shrink-0">
                        <PlusSquare className="w-4 h-4" />
                      </div>
                      <span>٢. هەڵبژاردەی <strong>Add to Home Screen</strong> دابگرە</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleDismiss}
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3.5 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    تێگەیشتم
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">نۆتیفیکەیشنەکان چالاک بکە</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                    بۆ ئەوەی ئاگاداری نوێترین گۆڕانکارییەکان و نامەکان بیت، تکایە ڕێگە بە نۆتیفیکەیشن بدە.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row w-full gap-3">
                    <button 
                      onClick={handleAllow}
                      className="flex-1 bg-primary text-white py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5"
                    >
                      ڕێگەدان
                    </button>
                    <button 
                      onClick={handleDismiss}
                      className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3.5 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      نەخێر سوپاس
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
