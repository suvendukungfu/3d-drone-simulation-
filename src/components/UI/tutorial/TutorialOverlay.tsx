import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useTutorial } from './TutorialContext';

export function TutorialOverlay() {
  const { currentStep, isTutorialActive } = useTutorial();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isTutorialActive) {
      setRect(null);
      return;
    }

    const updateSpotlight = () => {
      const selector = currentStep.targetSelector;
      if (!selector) {
        setRect(null);
        animationFrameRef.current = requestAnimationFrame(updateSpotlight);
        return;
      }

      let el = document.querySelector(selector) as HTMLElement;

      // Mobile fallback: if target selector (like settings switches) is inside a closed menu,
      // target the mobile menu button instead!
      if (!el && selector !== '#tutorial-mobile-menu-btn') {
        el = document.querySelector('#tutorial-mobile-menu-btn') as HTMLElement;
      }

      if (el) {
        const newRect = el.getBoundingClientRect();
        // Check if values actually changed to avoid unnecessary re-renders
        if (
          !rect ||
          rect.top !== newRect.top ||
          rect.left !== newRect.left ||
          rect.width !== newRect.width ||
          rect.height !== newRect.height
        ) {
          setRect(newRect);
          
          // Auto-scroll if element is out of viewport
          const isInViewport =
            newRect.top >= 0 &&
            newRect.left >= 0 &&
            newRect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            newRect.right <= (window.innerWidth || document.documentElement.clientWidth);

          if (!isInViewport) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } else {
        setRect(null);
      }

      animationFrameRef.current = requestAnimationFrame(updateSpotlight);
    };

    updateSpotlight();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentStep.targetSelector, isTutorialActive, rect]);

  if (!isTutorialActive) return null;

  // If no rect, darken and blur the entire screen (Welcome step)
  if (!rect) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-40 pointer-events-auto flex items-center justify-center transition-all duration-500" />
    );
  }

  // Calculate panel dimensions
  const topHeight = rect.top;
  const bottomTop = rect.bottom;
  const bottomHeight = `calc(100vh - ${rect.bottom}px)`;
  const leftWidth = rect.left;
  const rightLeft = rect.right;
  const rightWidth = `calc(100vw - ${rect.right}px)`;

  return (
    <>
      {/* ── INTERACTION BLOCKING BACKDROP PANELS (optimized for dark mode/mobile visibility) ── */}
      <div 
        className="fixed top-0 left-0 w-full bg-slate-900/10 dark:bg-slate-950/15 backdrop-blur-none md:backdrop-blur-[1.5px] z-40 pointer-events-auto transition-all duration-300"
        style={{ height: topHeight }}
      />
      <div 
        className="fixed left-0 w-full bg-slate-900/10 dark:bg-slate-950/15 backdrop-blur-none md:backdrop-blur-[1.5px] z-40 pointer-events-auto transition-all duration-300"
        style={{ top: bottomTop, height: bottomHeight }}
      />
      <div 
        className="fixed left-0 bg-slate-900/10 dark:bg-slate-950/15 backdrop-blur-none md:backdrop-blur-[1.5px] z-40 pointer-events-auto transition-all duration-300"
        style={{ top: rect.top, height: rect.height, width: leftWidth }}
      />
      <div 
        className="fixed bg-slate-900/10 dark:bg-slate-950/15 backdrop-blur-none md:backdrop-blur-[1.5px] z-40 pointer-events-auto transition-all duration-300"
        style={{ top: rect.top, height: rect.height, left: rightLeft, width: rightWidth }}
      />

      {/* ── SPOTLIGHT HIGHLIGHT DECORATION WITH FRAMER-MOTION BREATHING EFFECT ── */}
      <motion.div 
        animate={{ 
          scale: [1, 1.015, 1],
          borderColor: ['rgba(59, 130, 246, 0.7)', 'rgba(59, 130, 246, 0.95)', 'rgba(59, 130, 246, 0.7)'],
          boxShadow: [
            '0 0 15px rgba(59, 130, 246, 0.25), inset 0 0 8px rgba(59, 130, 246, 0.1)',
            '0 0 25px rgba(59, 130, 246, 0.4), inset 0 0 12px rgba(59, 130, 246, 0.2)',
            '0 0 15px rgba(59, 130, 246, 0.25), inset 0 0 8px rgba(59, 130, 246, 0.1)'
          ]
        }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="fixed z-40 pointer-events-none rounded-xl border-2 transition-all duration-300 ease-out"
        style={{
          top: rect.top - 5,
          left: rect.left - 5,
          width: rect.width + 10,
          height: rect.height + 10,
        }}
      >
        {/* Pointer Arrow Indicators */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
          <svg className="w-5 h-5 text-blue-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
          </svg>
        </div>
      </motion.div>
    </>
  );
}
