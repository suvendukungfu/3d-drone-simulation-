import { useDroneStore } from '../../store/useDroneStore';
import { droneComponents } from '../../data/droneComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, AlertTriangle, ArrowRight } from 'lucide-react';

export function LearningWorkflow() {
  const currentMode = useDroneStore((state) => state.currentMode);
  const guidedStep = useDroneStore((state) => state.guidedStep);
  const guidedQuestions = useDroneStore((state) => state.guidedQuestions);
  const learningStatus = useDroneStore((state) => state.learningStatus);
  const resetGuided = useDroneStore((state) => state.resetGuided);
  const setMode = useDroneStore((state) => state.setMode);

  if (currentMode !== 'learning') return null;

  const targetId = guidedQuestions[guidedStep];
  const targetComponent = droneComponents[targetId];

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 font-sans select-none">
      
      {/* Top Banner showing training status */}
      <div className="w-full flex justify-center mt-20 pointer-events-auto">
        {learningStatus === 'identifying' && targetComponent && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 p-5 rounded-2xl w-[500px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col items-center text-center"
          >
            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 font-mono tracking-widest px-2.5 py-1 rounded-full uppercase mb-2">
              Phase 1: Pre-Flight Identification
            </span>
            <h3 className="text-slate-800 dark:text-slate-300 text-xs font-mono mb-2">
              Step {guidedStep + 1} of {guidedQuestions.length}
            </h3>
            
            <p className="text-sm text-slate-700 dark:text-slate-200 font-light mb-4">
              Locate and click the <span className="text-amber-600 font-bold underline">{targetComponent.name}</span> on the 3D model.
            </p>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${(guidedStep / guidedQuestions.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between w-full text-[9px] font-mono text-slate-400 dark:text-slate-500">
              <span>0%</span>
              <span>100% COMPLETE</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Guided Info Overlay (bottom center) */}
      <div className="w-full flex justify-center mt-auto pointer-events-auto">
        <AnimatePresence mode="wait">
          {learningStatus === 'identifying' && targetComponent && (
            <motion.div
              key={targetId}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40 p-5 rounded-2xl w-[600px] shadow-[0_10px_35px_rgba(0,0,0,0.04)] flex gap-4 items-start"
            >
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase">
                  Clue & Educational Details
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 uppercase tracking-wide">
                  {targetComponent.name}
                </h4>
                <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-light mb-2">
                  {targetComponent.functionName}
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">Flight Tip:</span> {targetComponent.flightRole}
                </div>
              </div>
            </motion.div>
          )}

          {/* Training Finished Overlay */}
          {learningStatus === 'completed' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-3xl w-[580px] shadow-[0_15px_40px_rgba(0,0,0,0.04)] flex flex-col items-center text-center max-w-full"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <Award className="w-10 h-10 animate-bounce" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                Diagnostics Cert Completed
              </h2>
              <p className="text-sm text-slate-655 dark:text-slate-400 font-light leading-relaxed max-w-md mb-6">
                Excellent work! You have successfully identified all core avionics, sensors, and structural assemblies of the Pluto X.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={resetGuided}
                  className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"
                >
                  Go Back
                </button>

                <button
                  onClick={() => {
                    resetGuided();
                    setMode('explore');
                  }}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:brightness-110 transition animate-pulse"
                >
                  <span>Complete & Exit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
