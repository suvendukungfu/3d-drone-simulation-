import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroneStore } from '../../store/useDroneStore';
import { 
  CheckCircle2, ArrowRight, X
} from 'lucide-react';

interface TutorialStepData {
  title: string;
  instruction: string;
  keys: string[];
  mobileAction: string;
  trigger: (telemetry: any, stick: any) => boolean;
}

export function InteractiveTutorial({ telemetry, stickState }: { telemetry: any; stickState: any }) {
  const isTutorialActive = useDroneStore((state) => state.isTutorialActive);
  const tutorialStep = useDroneStore((state) => state.tutorialStep);
  const stopTutorial = useDroneStore((state) => state.stopTutorial);
  const setTutorialStep = useDroneStore((state) => state.setTutorialStep);
  
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(new Array(8).fill(false));

  const steps: TutorialStepData[] = [
    {
      title: "Welcome Pilot!",
      instruction: "Welcome to the Pluto Flight Academy! Let's learn how to pilot this high-performance nano-drone. Click 'Begin' or press Enter to start.",
      keys: ["Enter"],
      mobileAction: "Tap Begin",
      trigger: () => false // manual next
    },
    {
      title: "1. Arm the Motors",
      instruction: "Safety first! Arm the flight controller to start the motors. Press the Spacebar or tap the 'ARM' button.",
      keys: ["Spacebar"],
      mobileAction: "Tap ARM",
      trigger: (tel) => tel?.isArmed === true
    },
    {
      title: "2. Launch / Takeoff",
      instruction: "Great! Let's get airborne. Press 'T' or tap the 'TAKEOFF' button to perform a controlled hover takeoff.",
      keys: ["T"],
      mobileAction: "Tap TAKEOFF",
      trigger: (tel) => tel?.altitude > 0.05
    },
    {
      title: "3. Throttle Climb & Descend",
      instruction: "Use throttle to climb or descend. Hold 'W' (Climb) or 'S' (Descend) for a second, or push the Left Joystick up/down.",
      keys: ["W", "S"],
      mobileAction: "Move Left Stick Up/Down",
      trigger: (tel, stick) => Math.abs(stick?.throttle - 0.55) > 0.15 || tel?.verticalSpeed > 0.2 || tel?.verticalSpeed < -0.2
    },
    {
      title: "4. Yaw (Rotation)",
      instruction: "Rotate the heading of the drone. Press 'A' (left rotation) or 'D' (right rotation) or move the Left Joystick left/right.",
      keys: ["A", "D"],
      mobileAction: "Move Left Stick Left/Right",
      trigger: (_tel, stick) => Math.abs(stick?.yaw) > 0.2
    },
    {
      title: "5. Pitch & Roll (Directional Travel)",
      instruction: "Fly in any direction using Pitch (forward/back) and Roll (sideways). Use the keyboard Arrow Keys or move the Right Joystick.",
      keys: ["Arrow Keys"],
      mobileAction: "Move Right Stick",
      trigger: (_tel, stick) => Math.abs(stick?.pitch) > 0.15 || Math.abs(stick?.roll) > 0.15
    },
    {
      title: "6. Landing Complete",
      instruction: "Bring it down! Hover near the ground and hold 'S' or tap the 'LAND' button until motors return to idle touchdown.",
      keys: ["L", "S"],
      mobileAction: "Tap LAND",
      trigger: (tel) => tel?.altitude < 0.05 && tel?.speed < 0.15
    },
    {
      title: "7. Academy Certification",
      instruction: "Superb piloting! You have mastered the core controls. Remember: if you crash, press Shift+R to reset instantly.",
      keys: ["Shift+R"],
      mobileAction: "Tap Reset Sim",
      trigger: () => false // manual end
    }
  ];

  // Check triggers to complete steps (does not manage auto-advance timer)
  useEffect(() => {
    if (!isTutorialActive || tutorialStep < 1 || tutorialStep > steps.length) return;
    const currentStepIndex = tutorialStep - 1;
    const currentStep = steps[currentStepIndex];
    
    if (completedSteps[currentStepIndex]) return;
    
    if (currentStep.trigger(telemetry, stickState)) {
      setCompletedSteps((prev) => {
        const next = [...prev];
        next[currentStepIndex] = true;
        return next;
      });
    }
  }, [telemetry, stickState, tutorialStep, isTutorialActive, completedSteps]);

  // Handle advancing the step after a delay when it is completed
  useEffect(() => {
    if (!isTutorialActive) return;
    const currentStepIndex = tutorialStep - 1;
    if (currentStepIndex < 0 || currentStepIndex >= steps.length) return;
    
    if (completedSteps[currentStepIndex]) {
      const timer = setTimeout(() => {
        if (tutorialStep < steps.length) {
          setTutorialStep(tutorialStep + 1);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [completedSteps, tutorialStep, isTutorialActive, steps.length]);

  const currentStepIndex = Math.min(steps.length - 1, Math.max(0, tutorialStep - 1));
  const currentStep = steps[currentStepIndex];
  const isLastStep = tutorialStep === steps.length;
  const isStepCleared = completedSteps[currentStepIndex];

  return (
    <AnimatePresence>
      {isTutorialActive && (
        <div className="interactive-tutorial-wrapper absolute left-1/2 -translate-x-1/2 pointer-events-none z-40 flex justify-center">
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            className="interactive-tutorial-panel bg-slate-950/85 backdrop-blur-xl border border-blue-500/35 rounded-2xl p-5 shadow-[0_12px_40px_rgba(59,130,246,0.18)] pointer-events-auto"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400">
                  Interactive Tutorial (Step {tutorialStep} of {steps.length})
                </h4>
              </div>
              <button 
                onClick={stopTutorial} 
                className="text-slate-400 hover:text-white transition p-0.5 rounded-lg hover:bg-white/5"
                title="Exit Tutorial"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                {currentStep.title}
                {isStepCleared && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-emerald-400"
                  >
                    <CheckCircle2 className="w-4 h-4 fill-emerald-500/10" />
                  </motion.span>
                )}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
                {currentStep.instruction}
              </p>
            </div>

            {/* Action / Keyboard hints */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Controls:</span>
                <div className="flex gap-1.5 items-center">
                  {currentStep.keys.map((k) => (
                    <kbd key={k} className="px-2 py-0.5 rounded bg-white/10 text-white border border-white/10 text-[9px] font-mono font-bold shadow-sm">
                      {k}
                    </kbd>
                  ))}
                  <span className="text-[10px] text-slate-455 font-medium font-mono">/</span>
                  <span className="text-[10px] text-slate-400 font-medium font-mono">
                    {currentStep.mobileAction}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(tutorialStep === 1 || isLastStep || isStepCleared) ? (
                  <button
                    onClick={() => {
                      if (isLastStep) {
                        stopTutorial();
                      } else {
                        setTutorialStep(tutorialStep + 1);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition ${
                      isStepCleared 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {tutorialStep === 1 ? "Begin" : isLastStep ? "Finish" : "Next"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setTutorialStep(tutorialStep + 1)}
                    className="text-slate-500 hover:text-slate-300 text-[10px] font-bold uppercase tracking-wider transition"
                  >
                    Skip Step
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
