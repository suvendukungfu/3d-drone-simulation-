import { useState } from 'react';
import { useDroneStore } from '../../store/useDroneStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, ChevronDown, EyeOff } from 'lucide-react';

export function FlightControlsPanel() {
  const currentMode = useDroneStore((state) => state.currentMode);
  const isAcademyMode = useDroneStore((state) => state.isAcademyMode);
  const isTutorialActive = useDroneStore((state) => state.isTutorialActive);

  // Read collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('flightControlsCollapsed') === 'true';
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newVal = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('flightControlsCollapsed', String(newVal));
      }
      return newVal;
    });
  };

  // Desktop check
  const isDesktop = typeof window !== 'undefined' && 
    window.innerWidth > 1024 && 
    !('ontouchstart' in window) && 
    navigator.maxTouchPoints === 0;

  const shouldShow = currentMode === 'flight' && !isAcademyMode && isDesktop && !isTutorialActive;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed top-16 right-4 z-45 w-[250px] pointer-events-none select-none"
        >
          {isCollapsed ? (
            /* Collapsed trigger tab */
            <div className="flex justify-end">
              <button
                onClick={toggleCollapse}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full pluto-glass bg-slate-950/40 hover:bg-slate-950/70 border border-white/8 text-white/90 hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5 text-orange-400" />
                <span>Controls</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </div>
          ) : (
            /* Ultra-Compact Expanded Panel */
            <div className="pluto-glass p-3 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/8 bg-slate-950/35 flex flex-col gap-2 font-sans text-xs pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[10px] text-white font-extrabold uppercase tracking-widest leading-none">
                    Controls Help
                  </span>
                </div>
                <button
                  onClick={toggleCollapse}
                  className="flex items-center gap-1 text-[8.5px] text-white/40 hover:text-white/80 font-mono tracking-wider transition-colors cursor-pointer"
                >
                  <EyeOff className="w-3 h-3" />
                  <span>HIDE</span>
                </button>
              </div>

              {/* Compact Rows */}
              <div className="flex flex-col gap-1.5">
                <ControlRow label="Arm / Land" keys={['Space', 'L']} />
                <ControlRow label="Throttle / Yaw" keys={['W', 'S', 'A', 'D']} description="W/S: Alt, A/D: Turn" />
                <ControlRow label="Pitch / Roll" keys={['↑', '↓', '←', '→']} description="Arrows: Lean/Tilt" />
                <ControlRow label="Flip (Fwd/Bwd)" keys={['F', 'Shift+F']} />
                <ControlRow label="Camera View" keys={['1', '2', '3']} description="Chase, FPV, Orbit" />
                <ControlRow label="Recover / Reset" keys={['C', 'R']} description="C: Cont, R: Restart" />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ControlRowProps {
  label: string;
  keys: string[];
  description?: string;
}

function ControlRow({ label, keys, description }: ControlRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 last:border-0 pb-1.5 last:pb-0">
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-white/90 font-bold tracking-wide text-[10px] uppercase leading-none">{label}</span>
        {description && (
          <span className="text-[8px] text-white/35 leading-none mt-1 font-mono truncate">{description}</span>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0 font-mono text-[9.5px] font-black text-amber-400 tracking-wider uppercase">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center">
            {k}
            {i < keys.length - 1 && <span className="text-white/15 mx-1.5 font-normal">/</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
