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
  const retryMessage = useDroneStore((state) => state.retryMessage);

  if (currentMode !== 'learning') return null;

  const targetId = guidedQuestions[guidedStep];
  const targetComponent = droneComponents[targetId];

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 font-sans select-none">
      
      {/* Left Sidebar Checklist (HUD Element - stays visible) */}
      {learningStatus === 'identifying' && (
        <div className="absolute left-6 top-24 bottom-6 w-64 bg-slate-900/85 backdrop-blur-xl border border-white/10 p-4 rounded-2xl hidden md:flex flex-col shadow-2xl pointer-events-auto">
          <h3 className="text-white font-mono font-extrabold text-[11px] tracking-wider uppercase border-b border-white/10 pb-2 mb-3">
            Anatomy Checklist
          </h3>
          <div className="flex-1 overflow-y-auto scrollbar-none pr-1 flex flex-col gap-2">
            {guidedQuestions.map((id, index) => {
              const component = droneComponents[id];
              const isCompleted = index < guidedStep;
              const isActive = index === guidedStep;
              
              let statusColor = 'text-white/30 border-white/10';
              let textColor = 'text-white/40';
              let icon = '○';
              
              if (isCompleted) {
                statusColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
                textColor = 'text-white/60 line-through';
                icon = '✓';
              } else if (isActive) {
                statusColor = 'text-amber-400 border-amber-500 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse';
                textColor = 'text-white font-bold';
                icon = '▶';
              }
              
              return (
                <div 
                  key={id}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-[10px] font-mono transition-all duration-300 ${statusColor}`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-extrabold">
                    {icon}
                  </span>
                  <span className={`truncate flex-1 ${textColor}`}>
                    {component?.name ?? id}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Exit Training action button inside checklist */}
          <div className="pt-3 border-t border-white/10 mt-3">
            <button
              onClick={resetGuided}
              className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-[0.98] text-[10px] font-extrabold uppercase tracking-widest transition-all duration-200"
            >
              Exit Training
            </button>
          </div>
        </div>
      )}

      {/* Top Banner showing training status */}
      <div className="w-full flex justify-center mt-20 pointer-events-auto learning-top-banner">
        {learningStatus === 'identifying' && targetComponent && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 p-5 rounded-2xl w-full max-w-[90vw] sm:w-[500px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col items-center text-center"
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
              <span>{Math.round((guidedStep / guidedQuestions.length) * 100)}% COMPLETE</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Guided Info Overlay (bottom center) */}
      <div className="w-full flex justify-center mt-auto pointer-events-auto learning-clue-overlay">
        <AnimatePresence mode="wait">
          {learningStatus === 'identifying' && targetComponent && (
            <motion.div
              key={targetId}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40 p-5 rounded-2xl w-full max-w-[90vw] md:w-[600px] shadow-[0_10px_35px_rgba(0,0,0,0.04)] flex gap-4 items-start"
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
                <p className="text-xs text-slate-655 dark:text-slate-400 leading-relaxed font-light mb-2">
                  {targetComponent.functionName}
                </p>
                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">Flight Tip:</span> {targetComponent.flightRole}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Training Finished Overlay (centered modal) */}
      <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center p-6">
        <AnimatePresence>
          {learningStatus === 'completed' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="pointer-events-auto bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-[90vw] sm:w-[580px] shadow-[0_15px_40px_rgba(0,0,0,0.04)] flex flex-col items-center text-center"
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

      {/* Wrong Selection / Retry Message Alert */}
      <AnimatePresence>
        {retryMessage && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-48 left-1/2 -translate-x-1/2 z-50 bg-rose-955/95 border border-rose-500/50 p-4 rounded-xl shadow-2xl flex items-center gap-3 w-full max-w-[90vw] sm:w-[400px] pointer-events-auto learning-retry-alert"
          >
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider">Incorrect Selection</p>
              <p className="text-[11px] text-slate-300 mt-0.5 font-sans leading-relaxed">{retryMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
