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
            className="bg-slate-950/90 backdrop-blur-md border border-amber-500/30 p-5 rounded-2xl w-[500px] shadow-2xl flex flex-col items-center text-center"
          >
            <span className="text-[10px] bg-amber-500/10 text-amber-400 font-mono tracking-widest px-2.5 py-1 rounded-full uppercase mb-2">
              Phase 1: Pre-Flight Identification
            </span>
            <h3 className="text-white text-xs font-mono mb-2">
              Step {guidedStep + 1} of {guidedQuestions.length}
            </h3>
            
            <p className="text-sm text-slate-300 font-light mb-4">
              Locate and click the <span className="text-amber-400 font-bold underline">{targetComponent.name}</span> on the 3D model.
            </p>

            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-1">
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${(guidedStep / guidedQuestions.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between w-full text-[9px] font-mono text-slate-500">
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
              className="bg-slate-950/85 backdrop-blur-md border border-blue-500/20 p-5 rounded-2xl w-[600px] shadow-2xl flex gap-4 items-start"
            >
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                  Clue & Educational Details
                </span>
                <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wide">
                  {targetComponent.name}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-light mb-2">
                  {targetComponent.functionName}
                </p>
                <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400">
                  <span className="text-amber-400/80">Flight Tip:</span> {targetComponent.flightRole}
                </div>
              </div>
            </motion.div>
          )}

          {/* Training Finished Overlay */}
          {learningStatus === 'completed' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-950/90 backdrop-blur-xl border border-emerald-500/40 p-8 rounded-3xl w-[580px] shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col items-center text-center max-w-full"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <Award className="w-10 h-10 animate-bounce" />
              </div>

              <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">
                Diagnostics Cert Completed
              </h2>
              <p className="text-sm text-slate-300 font-light leading-relaxed max-w-md mb-6">
                Excellent work! You have successfully identified all core avionics, sensors, and structural assemblies of the Pluto X.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={resetGuided}
                  className="px-6 py-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 font-semibold text-sm hover:text-white hover:bg-slate-800 transition"
                >
                  Go Back
                </button>

                <button
                  onClick={() => {
                    resetGuided();
                    setMode('explore');
                  }}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/35 hover:brightness-115 transition"
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
