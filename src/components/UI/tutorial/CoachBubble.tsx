import { useEffect } from 'react';
import { useTutorial } from './TutorialContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, RefreshCw, X } from 'lucide-react';

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024 || 'ontouchstart' in window;
};

const getTitle = (stepId: string) => {
  switch (stepId) {
    case 'WELCOME':
      return "Welcome Pilot!";
    case 'MISSION_ARM':
      return "Step 1: Arm Drone";
    case 'MISSION_THROTTLE_DOWN':
      return "Step 2: Start Propellers";
    case 'MISSION_THROTTLE_UP':
      return "Step 3: Takeoff";
    case 'MISSION_HOVER':
      return "Step 4: Hover for 2 Seconds";
    case 'MISSION_YAW_LEFT':
      return "Step 5: Yaw Left";
    case 'MISSION_YAW_RIGHT':
      return "Step 6: Yaw Right";
    case 'MISSION_ROLL_LEFT':
      return "Step 7: Roll Left";
    case 'MISSION_ROLL_RIGHT':
      return "Step 8: Roll Right";
    case 'MISSION_PITCH_FWD':
      return "Step 9: Pitch Forward";
    case 'MISSION_PITCH_BWD':
      return "Step 10: Pitch Backward";
    case 'MISSION_FLIP_FWD':
      return "Step 11: Flip Forward";
    case 'MISSION_FLIP_BWD':
      return "Step 12: Flip Backward";
    case 'MISSION_FLY_WAYPOINT':
      return "Step 13: Checkpoint";
    case 'MISSION_LAND':
      return "Step 14: Manual Landing";
    case 'MISSION_DISARM':
      return "Step 15: Disarm Drone";
    default:
      return "";
  }
};

const getInstruction = (stepId: string, isMobile: boolean) => {
  switch (stepId) {
    case 'WELCOME':
      return "Let's complete your Drona Academy flight training checkride.";
    case 'MISSION_ARM':
      return isMobile
        ? "Tap the ARM switch at the bottom of the screen to arm the flight system."
        : "Press the SPACEBAR to arm the flight system.";
    case 'MISSION_THROTTLE_DOWN':
      return isMobile
        ? "Drag and hold the left joystick downward to start the propellers."
        : "Hold Throttle Down (S key) to start the propellers.";
    case 'MISSION_THROTTLE_UP':
      return isMobile
        ? "Drag and hold the left joystick upward to take off."
        : "Push Throttle Up (W key) to take off and climb.";
    case 'MISSION_HOVER':
      return "Hold a stable hover between 0.5m and 2.5m for 2 consecutive seconds.";
    case 'MISSION_YAW_LEFT':
      return isMobile
        ? "Drag the left joystick left to rotate the drone left by 15 degrees."
        : "Press A to rotate the drone left by 15 degrees.";
    case 'MISSION_YAW_RIGHT':
      return isMobile
        ? "Drag the left joystick right to rotate the drone right by 15 degrees."
        : "Press D to rotate the drone right by 15 degrees.";
    case 'MISSION_ROLL_LEFT':
      return isMobile
        ? "Drag the right joystick left to roll the drone left by 0.3 meters."
        : "Press ArrowLeft to roll the drone left by 0.3 meters.";
    case 'MISSION_ROLL_RIGHT':
      return isMobile
        ? "Drag the right joystick right to roll the drone right by 0.3 meters."
        : "Press ArrowRight to roll the drone right by 0.3 meters.";
    case 'MISSION_PITCH_FWD':
      return isMobile
        ? "Drag the right joystick upward to pitch the drone forward by 0.3 meters."
        : "Press ArrowUp to pitch the drone forward by 0.3 meters.";
    case 'MISSION_PITCH_BWD':
      return isMobile
        ? "Drag the right joystick downward to pitch the drone backward by 0.3 meters."
        : "Press ArrowDown to pitch the drone backward by 0.3 meters.";
    case 'MISSION_FLIP_FWD':
      return isMobile
        ? "Tap the FLIP button, then drag the right joystick upward to execute a Forward Flip."
        : "Press F, then press ArrowUp to execute a Forward Flip.";
    case 'MISSION_FLIP_BWD':
      return isMobile
        ? "Tap the FLIP button, then drag the right joystick downward to execute a Backward Flip."
        : "Press F, then press ArrowDown to execute a Backward Flip.";
    case 'MISSION_FLY_WAYPOINT':
      return isMobile
        ? "A blue checkpoint ring has spawned ahead. Use your joysticks to fly through it."
        : "A blue checkpoint ring has spawned ahead. Use W/S/A/D and Arrow keys to fly through it.";
    case 'MISSION_LAND':
      return isMobile
        ? "Fly back near the center and tap the LAND button (or hold left joystick down). Keep the drone armed."
        : "Fly back near the center and press L (or hold S key) to land safely. Keep the drone armed.";
    case 'MISSION_DISARM':
      return isMobile
        ? "Now that you have landed, tap the ARM switch to disarm the drone and stop the motors."
        : "Now that you have landed, press the SPACEBAR to disarm the drone and stop the motors.";
    default:
      return "";
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
    continueStep
  } = useTutorial();

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

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const isMobile = isMobileDevice();
  const title = getTitle(currentStep.id) || currentStep.title;
  const instruction = getInstruction(currentStep.id, isMobile) || currentStep.description;

  return (
    <AnimatePresence>
      <div className="fixed left-1/2 top-[max(44px,calc(12px+env(safe-area-inset-top)))] md:top-20 -translate-x-1/2 w-[85%] max-w-[350px] md:w-[400px] z-50 pointer-events-auto select-none">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border rounded-2xl p-3 md:p-4 text-slate-800 dark:text-slate-200 flex flex-col gap-2 md:gap-3 transition-all duration-300 ${
            isStepCompleted 
              ? 'border-emerald-500/60 shadow-[0_12px_32px_rgba(16,185,129,0.2)]' 
              : 'border-slate-200 dark:border-slate-800 shadow-[0_12px_28px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.35)]'
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              {isStepCompleted && (
                <>
                  <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500 text-white text-[7px] font-black shrink-0">
                    ✓
                  </span>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">
                    Step Completed!
                  </h4>
                </>
              )}
            </div>
            <button 
              onClick={stopTutorial} 
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              title="Close Tutorial"
              aria-label="Close tutorial and return to flight simulator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Info */}
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-2 flex-wrap">
              {title}
              {currentStepIndex > 0 && (
                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                  Step {currentStepIndex} of 15
                </span>
              )}
              {currentStep.validationType === 'state' && !isStepCompleted && (
                <span className="text-[8px] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  Auto check
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-450 font-semibold leading-relaxed mt-1">
              {instruction}
            </p>
          </div>

          {/* Expected Outcome & Validation Status */}
          {currentStepIndex > 0 && (
            <div className="flex flex-col gap-1 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800 mt-1">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                Expected Outcome:
              </span>
              <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                {currentStep.expectedOutcome}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                  Status:
                </span>
                <span className={`text-[10px] font-bold ${isStepCompleted ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`}>
                  {isStepCompleted ? 'COMPLETED' : 'WAITING FOR ACTION'}
                </span>
              </div>
            </div>
          )}

          {/* Hover target progress bar */}
          {currentStep.id === 'MISSION_HOVER' && hoverProgress > 0 && !isStepCompleted && (
            <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-2.5 rounded-full overflow-hidden mt-1 relative flex items-center shadow-inner">
              <div 
                className="bg-blue-600 h-full transition-all duration-75 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                style={{ width: `${hoverProgress * 100}%` }}
              />
              <span className="absolute right-3 text-[8px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Holding: {Math.round(hoverProgress * 2)}s
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between items-center mt-1 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              <button
                onClick={restartTutorial}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition bg-white dark:bg-slate-900 flex items-center gap-1 shadow-sm"
                aria-label="Restart tutorial to step 1"
              >
                <RefreshCw className="w-3 h-3" />
                Restart
              </button>
              <button
                onClick={skipTutorial}
                className="px-2.5 py-1.5 rounded-lg border border-transparent text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                aria-label="Skip academy onboarding"
              >
                Skip
              </button>
            </div>

            <div className="flex gap-2 items-center">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition bg-white dark:bg-slate-900 flex items-center gap-1 shadow-sm"
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
                  aria-label={isLastStep ? "Finish tutorial onboarding" : "Advance to next onboarding step"}
                >
                  {isLastStep ? "Finish" : "Next"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="px-4 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
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
