import React, { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Show splash screen for 2.5 seconds
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      // Wait for fade out animation to complete before unmounting
      setTimeout(() => {
        onFinish();
      }, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900 transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      dir="rtl"
    >
      <div className="relative flex flex-col items-center animate-pulse-slow">
        {/* Glow effect behind logo */}
        <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full transform scale-150"></div>
        
        <img 
          src="https://colonial-amethyst-puymdof8z7.edgeone.app/Untitled%20design%20-%202026-03-17T052123.849.png" 
          alt="MAS Agency" 
          className="w-40 h-auto relative z-10 mb-6 drop-shadow-2xl"
          referrerPolicy="no-referrer"
        />
        
        <h1 className="text-3xl font-bold text-white tracking-tight relative z-10">
          MAS <span className="text-gray-300">Agency</span>
        </h1>
        <p className="text-gray-400 mt-2 text-sm font-medium tracking-wide relative z-10">
          سیستەمی بەڕێوەبردنی دیجیتاڵی
        </p>
        
        <div className="mt-12 flex space-x-2 space-x-reverse relative z-10">
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
