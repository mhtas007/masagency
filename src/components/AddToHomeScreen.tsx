import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, X } from 'lucide-react';

export default function AddToHomeScreen() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user is on iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Check if the app is already installed (standalone mode)
    const isInStandaloneMode = () => {
      return ('standalone' in window.navigator) && (window.navigator as any).standalone;
    };

    // Show prompt if on iOS and not in standalone mode, and hasn't dismissed recently
    if (isIos() && !isInStandaloneMode()) {
      const hasDismissed = localStorage.getItem('pwaPromptDismissed');
      if (!hasDismissed) {
        // Delay showing prompt slightly for better UX
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal for 7 days
    localStorage.setItem('pwaPromptDismissed', 'true');
    setTimeout(() => {
      localStorage.removeItem('pwaPromptDismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 flex justify-center"
        >
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-3xl p-5 max-w-sm w-full relative">
            <button 
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl shadow-lg flex items-center justify-center mb-4">
                <img src="/vite.svg" alt="App Icon" className="w-8 h-8 filter brightness-0 invert" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">ئەپەکە دابەزێنە</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                بۆ ئەزموونێکی خێراتر و باشتر، ئەپەکە بخەرە سەر شاشەی سەرەکی مۆبایلەکەت.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 w-full flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">1</span>
                  <span>کرتە بکە لە</span>
                </div>
                <Share className="w-5 h-5 text-blue-500" />
              </div>
              
              <div className="w-0.5 h-4 bg-gray-200 dark:bg-gray-700 my-1"></div>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 w-full flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">2</span>
                  <span>هەڵبژێرە</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  Add to Home Screen <PlusSquare className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
