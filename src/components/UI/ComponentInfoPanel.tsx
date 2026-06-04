import { useDroneStore } from '../../store/useDroneStore';
import { droneComponents } from '../../data/droneComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, ShieldAlert, Wrench, Activity, HelpCircle } from 'lucide-react';

export function ComponentInfoPanel() {
  const selectedComponent = useDroneStore((state) => state.selectedComponent);
  const currentMode = useDroneStore((state) => state.currentMode);
  const selectComponent = useDroneStore((state) => state.selectComponent);

  const componentData = selectedComponent ? droneComponents[selectedComponent] : null;

  // Don't show this detailed side panel in learning mode (the learning module HUD will handle it)
  const isVisible = selectedComponent && currentMode !== 'learning';

  return (
    <AnimatePresence>
      {isVisible && componentData && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="absolute right-0 top-0 bottom-0 w-[420px] bg-slate-950/85 backdrop-blur-xl border-l border-blue-500/20 p-6 z-20 flex flex-col justify-between shadow-[-10px_0_30px_rgba(0,10,30,0.5)] font-sans"
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] text-pluto-accent font-mono tracking-widest uppercase">
                Hardware Inspector
              </span>
              <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
                {componentData.name}
              </h2>
            </div>
            <button
              onClick={() => selectComponent(null)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details Scroll Area */}
          <div className="flex-1 overflow-y-auto my-6 pr-2 space-y-5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            
            {/* Function / Description */}
            <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1.5">
                <Info className="w-4 h-4" />
                <span>Primary Function</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {componentData.functionName}
              </p>
            </div>

            {/* Working Principle */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                Working Principle
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                {componentData.workingPrinciple}
              </p>
            </div>

            {/* Role During Flight */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-slate-500" />
                Role During Flight
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                {componentData.flightRole}
              </p>
            </div>

            {/* Safety Guidelines */}
            <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>Safety Guidelines</span>
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                {componentData.safetyNotes}
              </p>
            </div>

            {/* Maintenance & Inspections */}
            <div className="bg-emerald-950/20 border border-emerald-900/30 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
                <Wrench className="w-4 h-4" />
                <span>Maintenance Profile</span>
              </div>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                {componentData.maintenanceNotes}
              </p>
            </div>

          </div>

          {/* Footer Metadata */}
          <div className="pt-4 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex justify-between">
            <span>REG ID: PX-{componentData.id.slice(0, 4).toUpperCase()}</span>
            <span>SYSTEM TYPE: PROPULSION</span>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
