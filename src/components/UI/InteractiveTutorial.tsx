import { TutorialProvider, useTutorial } from './tutorial/TutorialContext';
import { TutorialOverlay } from './tutorial/TutorialOverlay';
import { CoachBubble } from './tutorial/CoachBubble';
import { ObjectiveTracker } from './tutorial/ObjectiveTracker';
import { HintEngine } from './tutorial/HintEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Timer, Target, Sparkles, RefreshCw, LogOut } from 'lucide-react';

interface InteractiveTutorialProps {
  telemetry: any;
  stickState: any;
  orchestrator: any;
  onCheckpointsUpdated: (cps: any[]) => void;
}

export function InteractiveTutorial({ 
  telemetry, 
  stickState, 
  orchestrator,
  onCheckpointsUpdated 
}: InteractiveTutorialProps) {
  return (
    <TutorialProvider
      telemetry={telemetry}
      stickState={stickState}
      orchestrator={orchestrator}
      onCheckpointsUpdated={onCheckpointsUpdated}
    >
      <TutorialSubContainer />
    </TutorialProvider>
  );
}

function TutorialSubContainer() {
  const { isTutorialActive, currentStep, stopTutorial, restartTutorial, elapsedTime, accuracy, flightScore } = useTutorial();

  if (!isTutorialActive) return null;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* ── Spotlight and Backdrop ── */}
      <TutorialOverlay />

      {/* ── SMART COACH ONBOARDING CARD ── */}
      {currentStep.id !== 'COMPLETE' && <CoachBubble />}

      {/* ── PERSISTENT FLIGHT OBJECTIVE HUD ── */}
      <ObjectiveTracker />

      {/* ── ADAPTIVE HELP ENGINE ── */}
      <HintEngine />

      {/* ── COMPLETION CELEBRATION MODAL ── */}
      <AnimatePresence>
        {currentStep.id === 'COMPLETE' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
              className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_20px_50px_rgba(245,158,11,0.15)] text-white flex flex-col items-center text-center gap-6"
            >
              {/* Confetti / Sparkles effect */}
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="w-20 h-20 bg-amber-500/10 rounded-full border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                >
                  <Award className="w-10 h-10" />
                </motion.div>
                <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-300 animate-pulse" />
                <Sparkles className="absolute -bottom-1 -left-1 w-4 h-4 text-amber-400 animate-ping" />
              </div>

              {/* Title & Badge */}
              <div className="space-y-1.5">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-amber-400">
                  Academy Certified!
                </h2>
                <div className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase bg-slate-950 border border-white/5 px-3 py-1 rounded-full inline-block">
                  FAA COMPLIANT REMOTE PILOT
                </div>
              </div>

              <p className="text-xs text-slate-350 leading-relaxed px-2">
                Congratulations Pilot! You have completed the Drona Flight Academy checkride. Your skills are officially certified for autonomous simulation zones.
              </p>

              {/* Score / Metrics breakdown */}
              <div className="grid grid-cols-3 gap-2.5 w-full mt-2 text-left">
                <div className="bg-slate-900 border border-white/5 p-3 rounded-2xl flex flex-col gap-0.5 shadow-inner">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Timer className="w-3 h-3 text-blue-400" />
                    Time
                  </span>
                  <span className="text-sm font-extrabold text-slate-100 font-mono tabular-nums">
                    {formatTime(elapsedTime)}
                  </span>
                </div>
                <div className="bg-slate-900 border border-white/5 p-3 rounded-2xl flex flex-col gap-0.5 shadow-inner">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Target className="w-3 h-3 text-emerald-400" />
                    Accuracy
                  </span>
                  <span className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                    {accuracy}%
                  </span>
                </div>
                <div className="bg-slate-900 border border-white/5 p-3 rounded-2xl flex flex-col gap-0.5 shadow-inner">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Score
                  </span>
                  <span className="text-sm font-extrabold text-amber-400 font-mono tabular-nums">
                    {flightScore}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 w-full border-t border-white/10 pt-5 mt-2">
                <button
                  onClick={restartTutorial}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center justify-center gap-1.5"
                  aria-label="Replay academy flight tutorial checkride"
                >
                  <RefreshCw className="w-4 h-4" />
                  Replay
                </button>
                <button
                  onClick={stopTutorial}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-xs font-black uppercase tracking-wider text-slate-950 transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
                  aria-label="Finish and close academy certification dialog"
                >
                  <LogOut className="w-4 h-4" />
                  Finish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
