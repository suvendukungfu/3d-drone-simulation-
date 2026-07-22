import React, { useState } from 'react';
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
          className="fixed top-16 right-4 z-45 w-[280px] pointer-events-none select-none antialiased"
        >
          {isCollapsed ? (
            /* Collapsed trigger tab */
            <div className="flex justify-end">
              <button
                onClick={toggleCollapse}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/75 hover:bg-white text-[#111827] border border-slate-200 shadow-sm transition-all text-[10px] font-extrabold uppercase tracking-widest active:scale-95 cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5 text-[#111827] shrink-0" strokeWidth={2} />
                <span>Controls</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#111827] opacity-60 shrink-0" />
              </button>
            </div>
          ) : (
            /* Redesigned Floating HUD Overlay (No card background, Dark slate text on light backgrounds) */
            <div className="p-2 flex flex-col gap-3 font-sans pointer-events-auto w-[280px]">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-black/5 select-none">
                <div className="flex items-center gap-1.5 bg-white/75 px-1.5 py-0.5 rounded shadow-sm border border-slate-100">
                  <Keyboard className="w-3.5 h-3.5 text-[#111827] shrink-0" strokeWidth={2} />
                  <span className="text-[11px] text-[#111827] font-extrabold uppercase tracking-widest leading-none">
                    Controls Help
                  </span>
                </div>
                <button
                  onClick={toggleCollapse}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/60 hover:bg-white/95 text-[9px] text-[#6B7280] hover:text-[#111827] font-bold tracking-widest transition-all cursor-pointer uppercase shadow-sm border border-slate-150"
                >
                  <EyeOff className="w-3 h-3 text-[#6B7280] shrink-0" strokeWidth={2} />
                  <span>HIDE</span>
                </button>
              </div>

              {/* Spaced Control Rows */}
              <div className="flex flex-col">
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
    <div className="flex items-center justify-between gap-4 py-2 border-b border-black/5 last:border-0 last:pb-0 first:pt-0">
      <div className="flex flex-col min-w-0 flex-1 items-start">
        <span className="px-1.5 py-0.5 rounded bg-white/75 text-[#111827] text-[12px] font-bold tracking-wide leading-none select-none border border-slate-100/50">
          {label}
        </span>
        {description && (
          <span className="px-1.5 py-0.5 rounded bg-white/60 text-[#4B5563] text-[9.5px] font-medium leading-none mt-1 select-none border border-slate-100/30">
            {description}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end max-w-[130px]">
        {keys.map((k, i) => (
          <Keycap key={i} keyStr={k} />
        ))}
      </div>
    </div>
  );
}

function Keycap({ keyStr }: { keyStr: string }) {
  // If it's a combined keystroke group like Shift+F
  if (keyStr.includes('+')) {
    const parts = keyStr.split('+');
    return (
      <div className="flex items-center gap-1 bg-slate-200/60 px-1 py-0.5 rounded border border-slate-300 shadow-inner shrink-0">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-[9px] text-[#4B5563] font-bold font-sans">+</span>}
            <kbd className="px-1.5 py-0.5 min-w-[20px] h-[20px] flex items-center justify-center bg-white border border-slate-200 border-b-[2.5px] border-b-slate-400 rounded font-mono text-[9px] font-extrabold text-[#111827] shadow-[0_1px_1px_rgba(0,0,0,0.15)] shrink-0">
              {part}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    );
  }

  const isLargeKey = keyStr.toLowerCase() === 'space';
  return (
    <kbd className={`px-1.5 py-0.5 ${isLargeKey ? 'min-w-[44px]' : 'min-w-[20px]'} h-[20px] flex items-center justify-center bg-white border border-slate-200 border-b-[2.5px] border-b-slate-400 rounded font-mono text-[9px] font-extrabold text-[#111827] shadow-[0_1px_1px_rgba(0,0,0,0.15)] shrink-0`}>
      {keyStr}
    </kbd>
  );
}
