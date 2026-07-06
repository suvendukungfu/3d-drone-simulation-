import { useState, useEffect } from 'react';
import { useDroneStore } from '../../store/useDroneStore';
import { droneComponents } from '../../data/droneComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, ShieldAlert, Wrench, Activity, HelpCircle, ChevronDown } from 'lucide-react';

export function ComponentInfoPanel() {
  const selectedComponent = useDroneStore((state) => state.selectedComponent);
  const currentMode = useDroneStore((state) => state.currentMode);
  const selectComponent = useDroneStore((state) => state.selectComponent);

  const componentData = selectedComponent ? droneComponents[selectedComponent] : null;

  const [expandedSection, setExpandedSection] = useState<'function' | 'principle' | 'role' | 'safety' | 'maintenance' | null>('function');

  useEffect(() => {
    if (selectedComponent) {
      setExpandedSection('function');
    }
  }, [selectedComponent]);

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
          <div className="flex-1 overflow-y-auto my-6 pr-2 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            
            {/* Accordion Item: Function */}
            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/40">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'function' ? null : 'function')}
                className="w-full flex justify-between items-center p-4 text-xs font-bold text-blue-400 uppercase tracking-wider hover:bg-slate-800/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Info className="w-4 h-4" />
                  <span>Primary Function</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-205 ${expandedSection === 'function' ? 'rotate-180 text-blue-400' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {expandedSection === 'function' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <div className="p-4 pt-0 text-sm text-slate-300 leading-relaxed border-t border-slate-950/20">
                      {componentData.functionName}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion Item: Working Principle */}
            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/20">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'principle' ? null : 'principle')}
                className="w-full flex justify-between items-center p-4 text-xs font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-800/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>Working Principle</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-205 ${expandedSection === 'principle' ? 'rotate-180 text-slate-400' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {expandedSection === 'principle' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <div className="p-4 pt-0 text-sm text-slate-300 leading-relaxed border-t border-slate-950/20 font-light">
                      {componentData.workingPrinciple}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion Item: Role During Flight */}
            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/20">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'role' ? null : 'role')}
                className="w-full flex justify-between items-center p-4 text-xs font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-800/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4" />
                  <span>Role During Flight</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-205 ${expandedSection === 'role' ? 'rotate-180 text-slate-400' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {expandedSection === 'role' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <div className="p-4 pt-0 text-sm text-slate-300 leading-relaxed border-t border-slate-950/20 font-light">
                      {componentData.flightRole}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion Item: Safety Guidelines */}
            <div className="border border-amber-900/30 rounded-xl overflow-hidden bg-amber-950/10">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'safety' ? null : 'safety')}
                className="w-full flex justify-between items-center p-4 text-xs font-bold text-amber-400 uppercase tracking-wider hover:bg-amber-900/10 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Safety Guidelines</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-205 ${expandedSection === 'safety' ? 'rotate-180 text-amber-400' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {expandedSection === 'safety' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <div className="p-4 pt-0 text-xs text-amber-200/80 leading-relaxed border-t border-amber-900/10">
                      {componentData.safetyNotes}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion Item: Maintenance Profile */}
            <div className="border border-emerald-900/30 rounded-xl overflow-hidden bg-emerald-950/10">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === 'maintenance' ? null : 'maintenance')}
                className="w-full flex justify-between items-center p-4 text-xs font-bold text-emerald-400 uppercase tracking-wider hover:bg-emerald-900/10 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className="w-4 h-4" />
                  <span>Maintenance Profile</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-205 ${expandedSection === 'maintenance' ? 'rotate-180 text-emerald-400' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {expandedSection === 'maintenance' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <div className="p-4 pt-0 text-xs text-emerald-200/80 leading-relaxed border-t border-emerald-900/10">
                      {componentData.maintenanceNotes}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
