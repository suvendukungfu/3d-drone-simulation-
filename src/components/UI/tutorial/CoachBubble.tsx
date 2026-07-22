import { useDroneStore } from '../../../store/useDroneStore';
import { useEffect } from 'react';
import { useTutorial } from './TutorialContext';
import { sound } from '../../../utils/soundController';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024 || 'ontouchstart' in window;
};


const getAcademyStepTitle = (
  stepId: string,
  isArmed: boolean,
  isAirborne: boolean,
  isLanded: boolean,
  defaultTitle: string
): string => {
  switch (stepId) {
    case 'WELCOME': 
      return 'Welcome Pilot';
    case 'MISSION_ARM': 
      return isArmed ? 'Start Motors (Idle Speed)' : 'Arm Flight System';
    case 'MISSION_TAKE_OFF': 
      return isAirborne ? 'Maintain Hover' : 'Take Off';
    case 'MISSION_LEARN_CONTROLS': 
      return 'Test Flight Controls';
    case 'MISSION_FLY_WAYPOINT': 
      return 'Navigate to Checkpoint';
    case 'MISSION_LAND_DISARM': 
      return isLanded ? 'Disarm Flight System' : 'Land Drone';
    default: 
      return defaultTitle;
  }
};

const getAcademyStepInstruction = (
  stepId: string,
  isMobile: boolean,
  appLinkStatus: string,
  isArmed: boolean,
  defaultDesc: string
): string => {
  const isBridge = appLinkStatus === 'connected';

  switch (stepId) {
    case 'WELCOME': 
      return 'Master basic flight controls of the PlutoX drone.';
    case 'MISSION_ARM': 
      if (isArmed) {
        if (isBridge) return 'Pull transmitter throttle stick fully down to start the motors.';
        if (isMobile) return 'Drag the left virtual joystick fully down to start the motors.';
        return 'Press S (throttle down) to start the motors.';
      }
      if (isBridge) return 'Toggle the AUX4 switch on your transmitter to arm the flight system.';
      if (isMobile) return 'Tap the ARM switch to prepare flight system.';
      return 'Press Spacebar to arm the flight system.';
    case 'MISSION_TAKE_OFF': 
      if (isBridge) return 'Push transmitter throttle stick up to take off and hover.';
      if (isMobile) return 'Drag the left virtual joystick up to take off and hover.';
      return 'Push Throttle Up (W key) to take off and hover.';
    case 'MISSION_LEARN_CONTROLS': 
      if (isBridge) return 'Use your transmitter sticks to test all four control axes.';
      if (isMobile) return 'Use the virtual joysticks to test all four control axes.';
      return 'Use W/S/A/D and Arrow keys to test all four control axes.';
    case 'MISSION_FLY_WAYPOINT': 
      if (isBridge) return 'Fly through the blue target ring using your transmitter.';
      if (isMobile) return 'Fly through the blue target ring using the virtual joysticks.';
      return 'Fly through the blue target ring using W/S/A/D and Arrow keys.';
    case 'MISSION_LAND_DISARM': 
      if (isBridge) return 'Lower transmitter throttle stick to touch down, then toggle AUX4 switch down to disarm.';
      if (isMobile) return 'Lower virtual throttle to touch down, then tap ARM to disarm.';
      return 'Lower throttle (S key) to touch down, then press Spacebar to disarm.';
    default: 
      return defaultDesc;
  }
};



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
    hoverProgress,
    isStepCompleted,
    continueStep,
    stepStartValue
  } = useTutorial();

  const telemetry = useDroneStore((s) => s.telemetry);
  const orchestratorStore = useDroneStore((s) => (s as any).orchestrator);
  const appLinkStatus = useDroneStore((s) => s.appLinkStatus);
  const isArmed = telemetry?.isArmed === true;
  const motorsStarted = orchestratorStore?.motorsStarted === true;
  const isAirborne = (telemetry?.altitude ?? 0) > 0.08;
  const isLanded = (telemetry?.altitude ?? 0) < 0.08;

  // Accessibility keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopTutorial();
      } else if (e.key === 'Enter') {
        if (isStepCompleted) {
          continueStep();
        } else if (currentStep.validationType === 'manual') {
          nextStep();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, nextStep, stopTutorial, isStepCompleted, continueStep]);

  
  // Sound trigger on completion
  useEffect(() => {
    if (isStepCompleted) {
      try {
        sound.playClick();
      } catch (err) {}
    }
  }, [isStepCompleted]);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const isMobile = isMobileDevice();
  const title = getAcademyStepTitle(
    currentStep.id,
    isArmed,
    isAirborne,
    isLanded,
    currentStep.title
  );
  const instruction = getAcademyStepInstruction(
    currentStep.id,
    isMobile,
    appLinkStatus,
    isArmed,
    currentStep.description
  );

  return (
    <AnimatePresence>
      <div className="fixed left-1/2 top-[max(44px,calc(12px+env(safe-area-inset-top)))] md:top-20 -translate-x-1/2 w-[88%] max-w-[360px] md:w-[410px] z-50 pointer-events-auto select-none">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={`tutorial-bubble-card bg-white/95 dark:bg-slate-955/95 backdrop-blur-lg border rounded-2xl p-4 md:p-5 text-slate-800 dark:text-slate-200 flex flex-col gap-3 transition-all duration-300 ${
            isStepCompleted 
              ? 'border-emerald-500/50 shadow-[0_12px_36px_rgba(16,185,129,0.12)]' 
              : 'border-slate-200/80 dark:border-slate-850 shadow-[0_12px_28px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.4)]'
          }`}
        >
          {/* FSM Step Index & Progress Dots */}
          <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase font-extrabold pb-1 border-b border-slate-100 dark:border-white/[0.04]">
            <span>ACADEMY PHASE {currentStepIndex > 0 ? currentStepIndex : 'START'}</span>
            <div className="flex gap-1.5 items-center">
              {[0, 1, 2, 3, 4].map((idx) => {
                const isCompleted = idx < (currentStepIndex - 1);
                const isActive = idx === (currentStepIndex - 1);
                return (
                  <span
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      isCompleted 
                        ? 'w-1 bg-emerald-500' 
                        : isActive 
                          ? 'w-3.5 bg-blue-500' 
                          : 'w-1 bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Title & Natural Single Sentence Instruction */}
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight flex items-center justify-between">
              {title}
            </h3>
            <p className="text-xs text-slate-655 dark:text-slate-400 font-medium leading-relaxed">
              {instruction}
            </p>
          </div>

          {/* STEP-SPECIFIC LIVE CHECKLISTS & PROGRESS (MINIMALIST UX) */}
          {!isStepCompleted && (
            <>
              {/* Step 2 Checklist */}
              {currentStep.id === 'MISSION_ARM' && (
                <div className="mt-2 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className={`flex items-center gap-2 transition-all duration-300 ${isArmed ? 'text-emerald-500 font-semibold' : ''}`}>
                    <span className={`flex items-center justify-center w-4 h-4 rounded-full border text-[9px] transition-all duration-300 ${isArmed ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold scale-110' : 'border-slate-300 dark:border-slate-700'}`}>
                      {isArmed ? '✓' : ''}
                    </span>
                    Drone Armed
                  </div>
                  <div className={`flex items-center gap-2 transition-all duration-300 ${motorsStarted ? 'text-emerald-500 font-semibold' : ''}`}>
                    <span className={`flex items-center justify-center w-4 h-4 rounded-full border text-[9px] transition-all duration-300 ${motorsStarted ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold scale-110' : 'border-slate-300 dark:border-slate-700'}`}>
                      {motorsStarted ? '✓' : ''}
                    </span>
                    Motors Started (Idle Speed)
                  </div>
                </div>
              )}

              {/* Step 3 Checklist */}
              {currentStep.id === 'MISSION_TAKE_OFF' && (
                <div className="mt-2 flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className={`flex items-center gap-2 transition-all duration-300 ${isAirborne ? 'text-emerald-500 font-semibold' : ''}`}>
                    <span className={`flex items-center justify-center w-4 h-4 rounded-full border text-[9px] transition-all duration-300 ${isAirborne ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold scale-110' : 'border-slate-300 dark:border-slate-700'}`}>
                      {isAirborne ? '✓' : ''}
                    </span>
                    Altitude Reached (&gt;0.45m)
                  </div>
                  <div className={`flex items-center gap-2 transition-all duration-300 ${hoverProgress >= 1.0 ? 'text-emerald-500 font-semibold' : ''}`}>
                    <span className={`flex items-center justify-center w-4 h-4 rounded-full border text-[9px] transition-all duration-300 ${hoverProgress >= 1.0 ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold scale-110' : 'border-slate-300 dark:border-slate-700'}`}>
                      {hoverProgress >= 1.0 ? '✓' : ''}
                    </span>
                    Hover Maintained (2s)
                  </div>
                  {hoverProgress > 0 && hoverProgress < 1.0 && (
                    <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-1.5 rounded-full overflow-hidden mt-1 relative flex items-center shadow-inner">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-75 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                        style={{ width: `${hoverProgress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 4 Live Checklist */}
              {currentStep.id === 'MISSION_LEARN_CONTROLS' && stepStartValue && (
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                  {['Throttle', 'Yaw', 'Pitch', 'Roll', 'Flip'].map((axis) => {
                    const key = axis.toLowerCase();
                    const checked = stepStartValue[key] === true;
                    return (
                      <div
                        key={axis}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-300 ${
                          checked
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400 font-semibold shadow-[0_0_8px_rgba(16,185,129,0.06)]'
                            : 'bg-slate-900/5 border-slate-100 text-slate-400 dark:bg-slate-900/40 dark:border-slate-800'
                        }`}
                      >
                        <span className={`flex items-center justify-center w-4.5 h-4.5 rounded-full border text-[9px] transition-all duration-300 ${
                          checked ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold scale-110 shadow-[0_0_6px_rgba(16,185,129,0.2)]' : 'border-slate-300 dark:border-slate-700'
                        }`}>
                          {checked ? '✓' : ''}
                        </span>
                        <span>{axis}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 6 Checklist */}
              {currentStep.id === 'MISSION_LAND_DISARM' && (
                <div className="mt-2 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className={`flex items-center gap-2 transition-all duration-300 ${isLanded ? 'text-emerald-500 font-semibold' : ''}`}>
                    <span className={`flex items-center justify-center w-4 h-4 rounded-full border text-[9px] transition-all duration-300 ${isLanded ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold scale-110' : 'border-slate-300 dark:border-slate-700'}`}>
                      {isLanded ? '✓' : ''}
                    </span>
                    Drone Landed
                  </div>
                  <div className={`flex items-center gap-2 transition-all duration-300 ${!isArmed ? 'text-emerald-500 font-semibold' : ''}`}>
                    <span className={`flex items-center justify-center w-4 h-4 rounded-full border text-[9px] transition-all duration-300 ${!isArmed ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold scale-110' : 'border-slate-300 dark:border-slate-700'}`}>
                      {!isArmed ? '✓' : ''}
                    </span>
                    Flight System Disarmed (Manual Spacebar)
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-white/[0.04]">
            <div className="flex gap-2">
              <button
                onClick={restartTutorial}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-455 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-200 bg-white dark:bg-slate-900 flex items-center gap-1 shadow-sm"
                aria-label="Restart Academy training"
              >
                <RefreshCw className="w-3 h-3" />
                Restart
              </button>
              <button
                onClick={skipTutorial}
                className="px-2.5 py-1.5 rounded-lg border border-transparent text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-all duration-200"
                aria-label="Skip flight Academy"
              >
                Skip
              </button>
            </div>

            <div className="flex gap-2 items-center">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 bg-white dark:bg-slate-900 flex items-center gap-1 shadow-sm"
                  aria-label="Go to previous step"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}

              {isStepCompleted ? (
                <button
                  onClick={continueStep}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[9px] font-extrabold uppercase tracking-wider text-white transition flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse"
                  aria-label="Continue to next step"
                >
                  {isLastStep ? 'Finish' : 'Continue'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : currentStep.validationType === 'manual' ? (
                <button
                  onClick={nextStep}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[9px] font-extrabold uppercase tracking-wider text-white transition flex items-center gap-1 shadow-sm"
                  aria-label={isLastStep ? "Finish onboarding" : "Advance step"}
                >
                  {isLastStep ? "Finish" : "Next"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="px-4 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-[9px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5 select-none">
                  <div className="w-2.5 h-2.5 border border-slate-450 dark:border-slate-600 border-t-transparent rounded-full animate-spin shrink-0" />
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
