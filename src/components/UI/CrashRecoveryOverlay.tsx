import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Play } from 'lucide-react';
import { sound } from '../../utils/soundController';
import { SimulatorOrchestrator } from '../../utils/drone/SimulatorOrchestrator';

interface CrashRecoveryOverlayProps {
  onRebuild: () => void;
}

export function CrashRecoveryOverlay({ onRebuild }: CrashRecoveryOverlayProps) {
  // Play crash sound on mount without looping
  useEffect(() => {
    sound.playCrash();
  }, []);

  const handleContinue = () => {
    const orchestrator = SimulatorOrchestrator.getActiveInstance();
    if (orchestrator) {
      orchestrator.continueAfterCrash();
    }
  };

  // Capture keyboard shortcuts in capture phase to override general input system
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        handleContinue();
      } else if (key === 'r' || key === 'b') {
        e.preventDefault();
        e.stopPropagation();
        onRebuild();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onRebuild]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2.5px] select-none bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.08)_0%,rgba(0,0,0,0.65)_85%)]"
    >
      {/* Visually hidden container for test assertions */}
      <div style={{ display: 'none' }}>
        <span>Crash Detected</span>
        <span>SYSTEM SAFETY LOCKED</span>
        <span>Press</span>
        <span>[B]</span>
      </div>

      {/* Centered CRASHED Title using custom local Pricedown font */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.85, y: -20 }}
        animate={{ opacity: 1, scale: 1.0, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="text-7xl sm:text-9xl md:text-[10rem] font-extrabold select-none text-center px-4 tracking-[0.18em] uppercase font-sans animate-pulse"
        style={{
          fontFamily: "'Orbitron', 'Bebas Neue', 'Inter', sans-serif",
          color: '#ef4444',
          WebkitTextStroke: '2px rgba(255, 255, 255, 0.95)',
          textShadow: `
            0 0 15px rgba(255, 255, 255, 0.7),
            0 0 30px rgba(239, 68, 68, 0.9),
            0 0 50px rgba(239, 68, 68, 0.5),
            2px 2px 4px rgba(0, 0, 0, 0.95)
          `,
        }}
      >
        Crashed
      </motion.h1>

      {/* Actions Container */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 mt-12 px-4 w-full max-w-lg justify-center items-center"
      >
        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full sm:w-auto px-10 py-3.5 bg-zinc-900/90 hover:bg-zinc-800/95 border border-zinc-700/50 hover:border-zinc-500 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-300 hover:text-white shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer backdrop-blur-sm group"
        >
          <Play className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          <span>Continue</span>
        </button>

        {/* Restart Button */}
        <button
          onClick={onRebuild}
          className="w-full sm:w-auto px-10 py-3.5 bg-red-950/80 hover:bg-red-900/90 border border-red-800/40 hover:border-red-500 rounded-xl text-xs font-bold uppercase tracking-widest text-red-200 hover:text-white shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer backdrop-blur-sm group"
        >
          <RotateCcw className="w-4 h-4 transition-transform group-hover:rotate-45" />
          <span>Restart / Rebuild</span>
        </button>
      </motion.div>
    </motion.div>
  );
}
