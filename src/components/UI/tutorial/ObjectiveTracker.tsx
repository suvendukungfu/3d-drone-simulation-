import { useTutorial } from './TutorialContext';
import { motion } from 'framer-motion';
import { Award, Timer, Target, CheckCircle2, Circle } from 'lucide-react';

export function ObjectiveTracker() {
  const { 
    currentStepIndex, 
    steps, 
    isTutorialActive, 
    elapsedTime, 
    accuracy,
    currentStep
  } = useTutorial();

  if (!isTutorialActive || currentStep.id === 'COMPLETE') return null;

  const totalSteps = steps.length;
  const progressPercent = Math.round((currentStepIndex / totalSteps) * 100);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine current mission sub-header
  const isMissionStep = currentStep.id.startsWith('MISSION_');

  return (
    <div className="absolute top-20 right-4 z-30 pointer-events-auto select-none hidden md:block">
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-64 shadow-[0_8px_30px_rgba(0,0,0,0.4)] text-white flex flex-col gap-3.5"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">
            Academy Objective HUD
          </span>
        </div>

        {/* Mission Type Badge */}
        <div className="flex justify-between items-center bg-slate-900/60 border border-white/5 px-2.5 py-1.5 rounded-lg">
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Current Mission</span>
          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono ${
            isMissionStep 
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' 
              : 'bg-blue-950 text-blue-400 border border-blue-500/20'
          }`}>
            {isMissionStep ? 'Flight Training' : 'Avionics Onboarding'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>PROGRESS: {progressPercent}%</span>
            <span>{currentStepIndex}/{totalSteps} STEPS</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="bg-slate-900/30 border border-white/5 p-2 rounded-xl flex flex-col gap-0.5">
            <span className="text-slate-500 text-[8px] flex items-center gap-1 uppercase">
              <Timer className="w-2.5 h-2.5 text-blue-400" />
              Time
            </span>
            <span className="font-extrabold text-slate-200 tabular-nums">
              {formatTime(elapsedTime)}
            </span>
          </div>
          <div className="bg-slate-900/30 border border-white/5 p-2 rounded-xl flex flex-col gap-0.5">
            <span className="text-slate-500 text-[8px] flex items-center gap-1 uppercase">
              <Target className="w-2.5 h-2.5 text-emerald-400" />
              Success
            </span>
            <span className="font-extrabold text-emerald-400 tabular-nums">
              {accuracy}%
            </span>
          </div>
        </div>

        {/* Checklist preview */}
        <div className="border-t border-white/10 pt-2 mt-0.5 space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-thin">
          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
            Checklist Breakdown
          </div>
          <div className="space-y-1">
            {steps.slice(Math.max(0, currentStepIndex - 1), currentStepIndex + 3).map((step) => {
              const globalIdx = steps.indexOf(step);
              const completed = globalIdx < currentStepIndex;
              const isActive = globalIdx === currentStepIndex;
              
              return (
                <div 
                  key={step.id} 
                  className={`flex gap-2 items-center text-[9px] ${
                    isActive 
                      ? 'text-blue-400 font-extrabold border-l-2 border-blue-500 pl-1.5' 
                      : completed 
                        ? 'text-emerald-500' 
                        : 'text-slate-500'
                  }`}
                >
                  {completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400 animate-pulse' : 'text-slate-700'}`} />
                  )}
                  <span className="truncate">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
