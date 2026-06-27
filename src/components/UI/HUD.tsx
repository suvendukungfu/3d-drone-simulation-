import { useDroneStore } from '../../store/useDroneStore';
import { Layers, Compass, Play, RotateCcw, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export function HUD() {
  const currentMode = useDroneStore((state) => state.currentMode);
  const isExploded = useDroneStore((state) => state.isExploded);
  const isolationMode = useDroneStore((state) => state.isolationMode);
  const selectedComponent = useDroneStore((state) => state.selectedComponent);
  
  const setMode = useDroneStore((state) => state.setMode);
  const toggleExploded = useDroneStore((state) => state.toggleExploded);
  const toggleIsolation = useDroneStore((state) => state.toggleIsolation);
  const selectComponent = useDroneStore((state) => state.selectComponent);
  const startLearning = useDroneStore((state) => state.startLearning);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-6 z-10 select-none font-sans app-shell">
      
      {/* Top HUD Bar */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full flex flex-col sm:flex-row justify-between items-start gap-3 pointer-events-auto"
      >
        {/* Branding & Status */}
        <div className="flex items-center gap-3 sm:gap-4 bg-slate-950/80 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(0,163,255,0.1)]">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/30 text-pluto-accent">
            <Cpu className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white">
              Pluto X <span className="text-pluto-accent hidden sm:inline">Diagnostics</span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-widest flex items-center gap-1.5 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
              <span className="hidden sm:inline">Core System: Online</span>
              <span className="sm:hidden">Online</span>
            </p>
          </div>
        </div>

        {/* Mode Selector Dashboard */}
        <div className="flex gap-2 bg-slate-950/80 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-blue-500/20">
          <button
            onClick={() => setMode('explore')}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
              currentMode === 'explore'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Interactive Explorer</span>
            <span className="sm:hidden">Explore</span>
          </button>
          
          <button
            onClick={startLearning}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
              currentMode === 'learning'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Flight Training Lab</span>
            <span className="sm:hidden">Training</span>
          </button>
        </div>
      </motion.header>

      {/* Center Left Diagnostic Stream */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="self-start pointer-events-auto flex flex-col gap-4 mt-16 sm:mt-20 max-md:hidden"
      >
        <div className="bg-slate-950/80 backdrop-blur-md p-4 rounded-xl border border-blue-500/20 w-64 shadow-2xl">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-pluto-accent uppercase mb-3 pb-2 border-b border-slate-800">
            <Activity className="w-4 h-4" />
            <span>Real-time Telemetry</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">ATTITUDE</span>
              <span className="text-white">P: 0.0° R: 0.0° Y: 12.4°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">PROP ROTATION</span>
              <span className="text-emerald-400">8,450 RPM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">BATTERY VOLTAGE</span>
              <span className="text-white">11.4 V (3S Pack)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">TEMP MODULE</span>
              <span className="text-amber-400">32.6 °C</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom Tool Bar Controls */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="w-full flex flex-col sm:flex-row justify-between items-end gap-3 pointer-events-auto mt-auto"
      >
        {/* Reset Selection Button */}
        <div>
          {selectedComponent && currentMode !== 'learning' && (
            <button
              onClick={() => selectComponent(null)}
              className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition-all shadow-xl"
            >
              <RotateCcw className="w-4 h-4" />
              Reset View
            </button>
          )}
        </div>

        {/* 3D Visual Modes */}
        {currentMode !== 'learning' && (
          <div className="flex gap-2 sm:gap-3 bg-slate-950/80 backdrop-blur-md p-1.5 sm:p-2 rounded-xl border border-blue-500/20 shadow-2xl">
            <button
              onClick={toggleExploded}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                isExploded
                  ? 'bg-blue-600/25 border border-blue-500 text-pluto-accent shadow-[0_0_15px_rgba(0,163,255,0.15)]'
                  : 'bg-slate-900/50 border border-transparent text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Exploded View</span>
              <span className="sm:hidden">Explode</span>
            </button>

            <button
              onClick={toggleIsolation}
              disabled={!selectedComponent}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                !selectedComponent 
                  ? 'opacity-40 cursor-not-allowed text-slate-600'
                  : isolationMode
                    ? 'bg-emerald-600/25 border border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-900/50 border border-transparent text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">Isolate Component</span>
              <span className="sm:hidden">Isolate</span>
            </button>
          </div>
        )}
      </motion.div>

    </div>
  );
}
