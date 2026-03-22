import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCircle2, Monitor, Briefcase, Send, CreditCard, Sparkles, X } from 'lucide-react';

const SLIDES = [
  {
    id: 'welcome',
    title: 'بەخێربێیت بۆ پۆرتاڵی MAS',
    description: 'ئێمە پۆرتاڵێکی تایبەتمان بۆ دروستکردوویت بۆ ئەوەی بە ئاسانترین شێوە چاودێری کارەکانت بکەیت.',
    icon: Sparkles,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20'
  },
  {
    id: 'projects',
    title: 'چاودێری پرۆژەکانت بکە',
    description: 'لە هەر کاتێکدا دەتوانیت قۆناغی پرۆژەکانت ببینی و بزانیت کارەکان گەیشتوونەتە کوێ.',
    icon: Briefcase,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20'
  },
  {
    id: 'communication',
    title: 'پەیوەندی ڕاستەوخۆ',
    description: 'بە خێرایی نامە و داواکارییەکانت بنێرە بۆ تیمی پاڵپشتی و ڕاستەوخۆ وەڵام وەربگرە.',
    icon: Send,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20'
  },
  {
    id: 'finance',
    title: 'بەڕێوەبردنی دارایی',
    description: 'سەرجەم فاتورەکانت، پارە دراوەکان و قەرزەکانت لە یەک شوێن بە ڕوونی دەبینیت.',
    icon: CreditCard,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20'
  }
];

export default function ClientOnboarding() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('masClientOnboardingSeen');
    if (!hasSeenOnboarding) {
      // Small delay to let the main UI load first
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    setIsOpen(false);
    localStorage.setItem('masClientOnboardingSeen', 'true');
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen) return null;

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative"
        >
          {/* Skip Button */}
          <button 
            onClick={handleSkip}
            className="absolute top-6 left-6 text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
          >
            تێپەڕاندن
          </button>

          {/* Content Area */}
          <div className="p-8 pt-16 flex flex-col items-center text-center min-h-[360px] justify-center relative">
            
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 ${slide.bg} shadow-inner`}>
                  <Icon className={`w-12 h-12 ${slide.color}`} />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                  {slide.title}
                </h2>
                
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-[280px]">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Area */}
          <div className="p-8 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex flex-col items-center gap-6">
            
            {/* Dots */}
            <div className="flex gap-2">
              {SLIDES.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}
                />
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {currentSlide === SLIDES.length - 1 ? (
                <>
                  دەستپێکردن <CheckCircle2 className="w-5 h-5" />
                </>
              ) : (
                <>
                  دواتر <ChevronRight className="w-5 h-5 rotate-180" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
