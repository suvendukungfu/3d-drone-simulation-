import { useEffect } from 'react';
import { useTutorial } from './TutorialContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, HelpCircle, AlertTriangle, Lightbulb, 
  Target, Info, RefreshCw, X, Award
} from 'lucide-react';

export function CoachBubble() {
  const { 
    currentStep, 
    currentStepIndex, 
    steps, 
    nextStep, 
    prevStep, 
    skipTutorial, 
    restartTutorial, 
    stopTutorial,
    hoverProgress
  } = useTutorial();

  // Accessibility keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopTutorial();
      } else if (e.key === 'Enter' && currentStep.validationType === 'manual') {
        nextStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, nextStep, stopTutorial]);

  const renderIllustration = () => {
    switch (currentStep.illustration) {
      case 'welcome':
        return (
          <div className="relative w-16 h-16 flex items-center justify-center bg-blue-500/10 rounded-full border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <svg className="w-10 h-10 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        );
      case 'camera':
        return (
          <div className="relative w-16 h-16 bg-cyan-500/10 rounded-xl border border-cyan-500/20 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-25">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border-[0.5px] border-cyan-400" />)}
            </div>
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="text-cyan-400 z-10"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </motion.div>
          </div>
        );
      case 'battery':
        return (
          <div className="relative w-16 h-16 flex items-center justify-center bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-emerald-400"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.div>
          </div>
        );
      case 'signal':
        return (
          <div className="relative w-16 h-16 flex items-center justify-center bg-blue-500/10 rounded-full border border-blue-500/20">
            <div className="flex gap-0.5 items-end justify-center h-8">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ height: [`${i * 6}px`, `${i * 8}px`, `${i * 6}px`] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                  className="w-1.5 bg-blue-400 rounded-t"
                />
              ))}
            </div>
          </div>
        );
      case 'altitude':
        return (
          <div className="relative w-16 h-16 flex items-center justify-center bg-amber-500/10 rounded-full border border-amber-500/20">
            <motion.div
              animate={{ y: [8, -8, 8] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="text-amber-400"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18" />
              </svg>
            </motion.div>
          </div>
        );
      case 'speed':
        return (
          <div className="relative w-16 h-16 flex items-center justify-center bg-purple-500/10 rounded-full border border-purple-500/20">
            <motion.div
              animate={{ rotate: [-45, 90, -45] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              style={{ originX: '50%', originY: '50%' }}
              className="text-purple-400"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.div>
          </div>
        );
      case 'left_stick':
        return (
          <div className="relative w-16 h-16 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center">
            <div className="absolute w-full h-[1px] bg-slate-800" />
            <div className="absolute h-full w-[1px] bg-slate-800" />
            <motion.div
              animate={{ x: [-12, 12, 0, 0, -12], y: [0, 0, -12, 12, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-5 h-5 bg-blue-500 rounded-full border border-blue-300 shadow-md z-10"
            />
            <span className="absolute bottom-1 text-[7px] text-slate-500 font-mono">L-STICK</span>
          </div>
        );
      case 'right_stick':
        return (
          <div className="relative w-16 h-16 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center">
            <div className="absolute w-full h-[1px] bg-slate-800" />
            <div className="absolute h-full w-[1px] bg-slate-800" />
            <motion.div
              animate={{ x: [0, 0, -12, 12, 0], y: [-12, 12, 0, 0, -12] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-5 h-5 bg-cyan-500 rounded-full border border-cyan-300 shadow-md z-10"
            />
            <span className="absolute bottom-1 text-[7px] text-slate-500 font-mono">R-STICK</span>
          </div>
        );
      case 'hover':
        return (
          <div className="relative w-16 h-16 flex flex-col items-center justify-center bg-blue-500/5 border border-blue-500/10 rounded-xl">
            {/* Hover ring */}
            <div className="w-12 h-2.5 rounded-full border border-blue-500/30 animate-pulse mt-8" />
            <motion.div
              animate={{ y: [-18, -24, -18] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute text-blue-400"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </motion.div>
          </div>
        );
      case 'waypoint':
        return (
          <div className="relative w-16 h-16 flex items-center justify-center bg-blue-500/10 rounded-xl border border-blue-500/20">
            <motion.div
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-8 h-8 rounded-full border-4 border-dashed border-blue-400 flex items-center justify-center"
            >
              <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-ping" />
            </motion.div>
          </div>
        );
      case 'gate':
        return (
          <div className="relative w-16 h-16 flex items-center justify-center bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <motion.div
              animate={{ rotateY: [0, 180, 360] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-4 border-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <div className="w-px h-full bg-emerald-500" />
            </motion.div>
          </div>
        );
      case 'complete':
        return (
          <div className="relative w-16 h-16 flex items-center justify-center bg-amber-500/10 rounded-full border border-amber-500/20">
            <motion.div
              animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="text-amber-400"
            >
              <Award className="w-9 h-9" />
            </motion.div>
          </div>
        );
      default:
        return (
          <div className="relative w-16 h-16 flex items-center justify-center bg-blue-500/10 rounded-full border border-blue-500/20">
            <HelpCircle className="w-8 h-8 text-blue-400" />
          </div>
        );
    }
  };

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed left-1/2 bottom-28 md:bottom-32 -translate-x-1/2 w-[90%] md:w-[480px] z-50 pointer-events-auto select-none">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="bg-slate-950/90 backdrop-blur-xl border border-blue-500/25 rounded-2xl p-4 md:p-5 shadow-[0_15px_45px_rgba(59,130,246,0.18)] text-white flex flex-col gap-4"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                Academy Step {currentStepIndex + 1} of {steps.length}
              </h4>
            </div>
            <button 
              onClick={stopTutorial} 
              className="text-slate-400 hover:text-white transition p-1 hover:bg-white/5 rounded-lg"
              title="Close Tutorial"
              aria-label="Close tutorial and return to flight simulator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Info */}
          <div className="flex gap-4 items-start">
            {renderIllustration()}

            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-white leading-tight flex items-center gap-2">
                {currentStep.title}
                {currentStep.validationType === 'state' && (
                  <span className="text-[9px] bg-blue-950 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    Auto check
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-200 font-medium leading-relaxed mt-1.5">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Smart Coach Tabs (Collapsible / scrolling content) */}
          <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/40 border border-white/5 rounded-xl p-3">
            <div className="flex flex-col gap-1 pr-2 border-r border-white/5">
              <span className="font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3 h-3" />
                Why this matters
              </span>
              <span className="text-slate-350 leading-relaxed">{currentStep.whyMatters}</span>
            </div>

            <div className="flex flex-col gap-1 pl-2">
              <span className="font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3" />
                Tip
              </span>
              <span className="text-slate-350 leading-relaxed">{currentStep.tips}</span>
            </div>

            {currentStep.warnings && (
              <div className="col-span-2 border-t border-white/5 pt-2 mt-1.5 flex gap-2 items-start">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-extrabold text-amber-500 uppercase tracking-wider text-[8px]">Warning</span>
                  <span className="text-slate-350 text-[9px] leading-relaxed">{currentStep.warnings}</span>
                </div>
              </div>
            )}
          </div>

          {/* Hover target progress bar */}
          {currentStep.id === 'MISSION_HOVER' && hoverProgress > 0 && (
            <div className="w-full bg-slate-900 border border-white/5 h-2 rounded-full overflow-hidden mt-1 relative flex items-center">
              <div 
                className="bg-emerald-500 h-full transition-all duration-75"
                style={{ width: `${hoverProgress * 100}%` }}
              />
              <span className="absolute right-3 text-[8px] font-mono font-bold text-white uppercase tracking-wider">
                Holding: {Math.round(hoverProgress * 3)}s
              </span>
            </div>
          )}

          {/* Expected Outcome Indicator */}
          <div className="flex gap-2 items-center text-[10px] bg-blue-950/30 border border-blue-500/10 px-3 py-2 rounded-xl">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-blue-300 font-semibold leading-snug">
              <strong>Expected:</strong> {currentStep.expectedOutcome}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center mt-1 pt-3 border-t border-white/5">
            <div className="flex gap-2">
              <button
                onClick={restartTutorial}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1"
                aria-label="Restart tutorial to step 1"
              >
                <RefreshCw className="w-3 h-3" />
                Restart
              </button>
              <button
                onClick={skipTutorial}
                className="px-2.5 py-1.5 rounded-lg border border-transparent text-[9px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition"
                aria-label="Skip academy onboarding"
              >
                Skip
              </button>
            </div>

            <div className="flex gap-2 items-center">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-extrabold uppercase tracking-wider text-white hover:bg-white/5 transition flex items-center gap-1"
                  aria-label="Go to previous step"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}

              {currentStep.validationType === 'manual' ? (
                <button
                  onClick={nextStep}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-[9px] font-extrabold uppercase tracking-wider text-white transition flex items-center gap-1 shadow-md shadow-blue-500/10"
                  aria-label={isLastStep ? "Finish tutorial onboarding" : "Advance to next onboarding step"}
                >
                  {isLastStep ? "Finish" : "Next"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 select-none">
                  <div className="w-2.5 h-2.5 border border-slate-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  Waiting
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
