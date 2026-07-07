import { useState, useEffect } from 'react';
import { useTutorial } from './TutorialContext';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, AlertCircle, Play, Eye } from 'lucide-react';

export function HintEngine() {
  const { currentStep, isTutorialActive, currentStepIndex } = useTutorial();
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [showTextHint, setShowTextHint] = useState(false);
  const [showDemoOffer, setShowDemoOffer] = useState(false);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  // Reset timer on step change
  useEffect(() => {
    setSecondsSpent(0);
    setShowTextHint(false);
    setShowDemoOffer(false);
    setIsPlayingDemo(false);
  }, [currentStepIndex, isTutorialActive]);

  // Tick seconds spent on current step
  useEffect(() => {
    if (!isTutorialActive || currentStep.validationType !== 'state') return;

    const timer = setInterval(() => {
      setSecondsSpent((s) => {
        const next = s + 1;
        if (next === 10) {
          setShowTextHint(true);
        }
        if (next === 20) {
          setShowDemoOffer(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTutorialActive, currentStep]);

  if (!isTutorialActive || currentStep.validationType !== 'state') return null;

  // Retrieve contextual hint message based on step
  const getContextualHint = () => {
    switch (currentStep.id) {
      case 'CONTROL_LEFT_STICK':
      case 'MISSION_THROTTLE':
        return "Coaching Hint: Tap 'W' or 'S' keys rapidly to deflect the Throttle stick. Keep your inputs small.";
      case 'CONTROL_RIGHT_STICK':
        return "Coaching Hint: Tap the Arrow Keys (Up, Down, Left, Right) to deflect the Pitch & Roll stick.";
      case 'MISSION_ARM':
        return "Coaching Hint: Verify that the simulator is calibrated. Hit the SPACEBAR to arm the motors.";
      case 'MISSION_TAKEOFF':
        return "Coaching Hint: Motors must be armed. Once armed, press the 'T' key or click Takeoff.";
      case 'MISSION_HOVER':
        return "Coaching Hint: Center the stick. Release W/S and Arrow keys; the Alt-Hold stabilizer will bring the drone to a level hover.";
      case 'MISSION_ROLL_LEFT':
        return "Coaching Hint: Slide sideways. Press and hold the ArrowLeft key or push the Right Joystick left.";
      case 'MISSION_ROLL_RIGHT':
        return "Coaching Hint: Press and hold the ArrowRight key or push the Right Joystick right.";
      case 'MISSION_PITCH_FORWARD':
        return "Coaching Hint: Fly forward. Press and hold ArrowUp or push the Right Joystick forward.";
      case 'MISSION_PITCH_BACKWARD':
        return "Coaching Hint: Slide backward. Press and hold ArrowDown or push the Right Joystick backward.";
      case 'MISSION_ROTATE_LEFT':
        return "Coaching Hint: Yaw rotation. Tap the 'A' key to rotate heading counter-clockwise.";
      case 'MISSION_ROTATE_RIGHT':
        return "Coaching Hint: Tap the 'D' key to rotate heading clockwise.";
      case 'MISSION_FLY_WAYPOINT':
        return "Coaching Hint: The waypoint is 3 meters ahead. Fly forward using ArrowUp. Maintain height around 1.2m.";
      case 'MISSION_FLY_GATE':
        return "Coaching Hint: Fly straight through the green ring gate in front of you. Tap 2 for FPV camera view.";
      case 'MISSION_RETURN':
        return "Coaching Hint: Turn around (yaw) or pitch backward (ArrowDown) to guide the drone back above the home pad.";
      case 'MISSION_LAND':
        return "Coaching Hint: Bring it down. Align directly over the pad, hover under 1m, and click LAND or press 'L'.";
      case 'MISSION_DISARM':
        return "Coaching Hint: The drone has touched down. Press SPACEBAR to disarm and complete the academy!";
      default:
        return "Coaching Hint: Follow the expected outcome instructions in the bubble panel.";
    }
  };

  return (
    <>
      {/* ── Text Hint Overlay ── */}
      <AnimatePresence>
        {showTextHint && !isPlayingDemo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed left-1/2 bottom-4 md:bottom-6 -translate-x-1/2 z-50 w-[90%] md:w-[440px] pointer-events-auto select-none"
          >
            <div className="bg-slate-900 border border-blue-500/30 text-blue-200 px-4 py-3 rounded-xl shadow-lg flex gap-3 items-center">
              <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 animate-pulse" />
              <span className="text-[10px] md:text-xs font-semibold leading-relaxed">
                {getContextualHint()}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Demonstration Offer ── */}
      <AnimatePresence>
        {showDemoOffer && !isPlayingDemo && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="fixed left-4 bottom-32 z-50 pointer-events-auto select-none hidden md:block"
          >
            <div className="bg-slate-950/90 border border-amber-500/25 rounded-2xl p-4 w-60 shadow-xl text-white flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-400">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Pilot Assistance
              </div>
              <p className="text-[9px] text-slate-350 leading-relaxed">
                You've been practicing this step for {secondsSpent}s. Would you like a slow-motion input demonstration?
              </p>
              <button
                onClick={() => setIsPlayingDemo(true)}
                className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-[10px] font-black uppercase text-slate-950 tracking-wider flex items-center justify-center gap-1.5 transition shadow-md"
              >
                <Eye className="w-3.5 h-3.5" />
                View Demo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Demo Visualizer Overlay ── */}
      <AnimatePresence>
        {isPlayingDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPlayingDemo(false)}
            className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center pointer-events-auto cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-white flex flex-col gap-4 text-center cursor-default"
            >
              <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Play className="w-4 h-4 text-amber-500 animate-ping" />
                Instructional Demo
              </h3>
              
              {/* Demonstration wireframe illustration */}
              <div className="h-32 bg-slate-950 border border-white/5 rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-2 left-2 text-[8px] text-slate-500 font-mono">PILOT STICK SIMULATION</div>
                
                {/* Visual Stick representation */}
                <div className="flex gap-8 items-center mt-2">
                  <div className="w-16 h-16 rounded-full border border-slate-700 relative flex items-center justify-center">
                    <div className="absolute top-0 bottom-0 w-px bg-slate-800" />
                    <div className="absolute left-0 right-0 h-px bg-slate-800" />
                    {/* Left stick motion */}
                    <motion.div 
                      animate={
                        currentStep.id.includes('YAW') || currentStep.id.includes('ROTATE')
                          ? { x: [-15, 15, -15] }
                          : currentStep.id.includes('THROTTLE')
                            ? { y: [-15, 15, -15] }
                            : { x: 0, y: 0 }
                      }
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-4 h-4 bg-amber-500 rounded-full border border-amber-300 absolute" 
                    />
                  </div>
                  <div className="w-16 h-16 rounded-full border border-slate-700 relative flex items-center justify-center">
                    <div className="absolute top-0 bottom-0 w-px bg-slate-800" />
                    <div className="absolute left-0 right-0 h-px bg-slate-800" />
                    {/* Right stick motion */}
                    <motion.div 
                      animate={
                        currentStep.id.includes('ROLL')
                          ? { x: [-15, 15, -15] }
                          : currentStep.id.includes('PITCH') || currentStep.id.includes('FORWARD') || currentStep.id.includes('WAYPOINT') || currentStep.id.includes('GATE')
                            ? { y: [-15, 15, -15] }
                            : { x: 0, y: 0 }
                      }
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-4 h-4 bg-amber-500 rounded-full border border-amber-300 absolute" 
                    />
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-350 leading-relaxed font-mono">
                {currentStep.id.includes('MISSION_') 
                  ? `For ${currentStep.title}, apply small control inputs like shown above to complete the objective.` 
                  : "Double check your keyboard shortcuts and trigger actions."
                }
              </div>

              <button
                onClick={() => setIsPlayingDemo(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-700 transition"
              >
                Close and Try
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
