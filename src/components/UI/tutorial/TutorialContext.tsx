import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDroneStore } from '../../../store/useDroneStore';
import * as THREE from 'three';

export type StepId =
  | 'WELCOME'
  | 'MISSION_ARM'
  | 'MISSION_THROTTLE_DOWN'
  | 'MISSION_THROTTLE_UP'
  | 'MISSION_HOVER'
  | 'MISSION_YAW_LEFT'
  | 'MISSION_YAW_RIGHT'
  | 'MISSION_ROLL_LEFT'
  | 'MISSION_ROLL_RIGHT'
  | 'MISSION_PITCH_FWD'
  | 'MISSION_PITCH_BWD'
  | 'MISSION_FLIP_FWD'
  | 'MISSION_FLIP_BWD'
  | 'MISSION_FLY_WAYPOINT'
  | 'MISSION_LAND'
  | 'MISSION_DISARM';

export interface TutorialStep {
  id: StepId;
  title: string;
  description: string;
  whyMatters: string;
  tips?: string;
  warnings?: string;
  expectedOutcome: string;
  commonMistakes?: string;
  targetSelector: string; // CSS selector to highlight
  validationType: 'manual' | 'state';
  illustration: string;
  validate?: (state: {
    telemetry: any;
    stickState: any;
    position: THREE.Vector3 | null;
    velocity: THREE.Vector3 | null;
    checkpoints: any[];
    hoverTime: number;
    orchestrator?: any;
    stepStartValue: any;
    setStepStartValue: (val: any) => void;
    hasStartedFlipRef: React.MutableRefObject<boolean>;
  }) => boolean;
}

interface TutorialContextType {
  steps: TutorialStep[];
  currentStepIndex: number;
  currentStep: TutorialStep;
  isTutorialActive: boolean;
  startTutorial: () => void;
  stopTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
  setStepById: (id: StepId) => void;
  completedStepsCount: number;
  elapsedTime: number;
  accuracy: number;
  flightScore: number;
  hasSkipped: boolean;
  hoverProgress: number; // 0 to 1 for the 2s hover
  isStepCompleted: boolean;
  continueStep: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'drona_academy_tutorial_progress';
const LOCAL_STORAGE_SKIPPED = 'drona_academy_tutorial_skipped';

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'WELCOME',
    title: 'Welcome Pilot!',
    description: 'Welcome to the Drona Academy. In this guided checklist training, you will master the flight controls of the PlutoX nano-drone.',
    whyMatters: 'Completing the flight checklist builds core muscle memory for stable and safe operation.',
    expectedOutcome: 'Press Enter or click Begin to open the controls.',
    targetSelector: '',
    validationType: 'manual',
    illustration: 'welcome'
  },
  {
    id: 'MISSION_ARM',
    title: 'Step 1: Arm Drone',
    description: 'Press the SPACEBAR (or tap the ARM button) to arm the flight system.',
    whyMatters: 'Arming activates the motors and prepares them for throttle lift commands. Keep disarmed when not flying.',
    expectedOutcome: 'Telemetry updates status to ARMED.',
    targetSelector: '#tutorial-arm-btn',
    validationType: 'state',
    validate: ({ telemetry }) => telemetry?.isArmed === true,
    illustration: 'arm'
  },
  {
    id: 'MISSION_THROTTLE_DOWN',
    title: 'Step 2: Start Propellers',
    description: 'Hold Throttle Down (S key or left joystick down) to spin up the motors to idle speed.',
    whyMatters: 'Safe takeoff starts from zero applied throttle. Applying throttle immediately after arming can cause sudden climbs.',
    expectedOutcome: 'Motors start spinning at idle speed.',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ telemetry, orchestrator }) =>
      telemetry?.isArmed === true && orchestrator?.motorsStarted === true,
    illustration: 'left_stick'
  },
  {
    id: 'MISSION_THROTTLE_UP',
    title: 'Step 3: Takeoff',
    description: 'Push Throttle Up (W key or left joystick up) to take off and climb into the air.',
    whyMatters: 'Ascending safely requires a smooth application of throttle.',
    expectedOutcome: 'Climb above 0.45 meters.',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ telemetry }) =>
      telemetry?.isArmed === true && (telemetry?.altitude ?? 0) > 0.45,
    illustration: 'left_stick'
  },
  {
    id: 'MISSION_HOVER',
    title: 'Step 4: Hover for 2 Seconds',
    description: 'Maintain a stable hover between 0.5m and 2.5m for 2 consecutive seconds.',
    whyMatters: 'Stable hovering is the core flight baseline for translation maneuvers.',
    expectedOutcome: 'Maintain steady altitude for 2 seconds.',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ hoverTime }) => hoverTime >= 2.0,
    illustration: 'hover'
  },
  {
    id: 'MISSION_YAW_LEFT',
    title: 'Step 5: Yaw Left',
    description: 'Rotate the drone left (A key or left joystick left) by at least 15 degrees.',
    whyMatters: 'Yaw controls the heading direction of the drone.',
    expectedOutcome: 'Rotate left by 15 degrees.',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ telemetry, stickState, stepStartValue, setStepStartValue }) => {
      if (telemetry?.heading === undefined) return false;
      if (stepStartValue === null) {
        setStepStartValue(telemetry.heading);
        return false;
      }
      let diff = telemetry.heading - stepStartValue;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      return stickState.yaw < -0.15 && Math.abs(diff) >= 15;
    },
    illustration: 'left_stick'
  },
  {
    id: 'MISSION_YAW_RIGHT',
    title: 'Step 6: Yaw Right',
    description: 'Rotate the drone right (D key or left joystick right) by at least 15 degrees.',
    whyMatters: 'Yaw rotation changes the direction of the camera and sensors.',
    expectedOutcome: 'Rotate right by 15 degrees.',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ telemetry, stickState, stepStartValue, setStepStartValue }) => {
      if (telemetry?.heading === undefined) return false;
      if (stepStartValue === null) {
        setStepStartValue(telemetry.heading);
        return false;
      }
      let diff = telemetry.heading - stepStartValue;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      return stickState.yaw > 0.15 && Math.abs(diff) >= 15;
    },
    illustration: 'left_stick'
  },
  {
    id: 'MISSION_ROLL_LEFT',
    title: 'Step 7: Roll Left',
    description: 'Tilt the drone left (ArrowLeft or right joystick left) to translate left by 0.3 meters.',
    whyMatters: 'Roll controls lateral side-to-side translation.',
    expectedOutcome: 'Move left by 0.3 meters.',
    targetSelector: '#tutorial-right-joystick',
    validationType: 'state',
    validate: ({ position, stickState, stepStartValue, setStepStartValue }) => {
      if (!position) return false;
      if (stepStartValue === null) {
        setStepStartValue(position.clone());
        return false;
      }
      const startPos = stepStartValue as THREE.Vector3;
      return stickState.roll < -0.15 && position.x < startPos.x - 0.3;
    },
    illustration: 'right_stick'
  },
  {
    id: 'MISSION_ROLL_RIGHT',
    title: 'Step 8: Roll Right',
    description: 'Tilt the drone right (ArrowRight or right joystick right) to translate right by 0.3 meters.',
    whyMatters: 'Roll translation is useful for side maneuvers.',
    expectedOutcome: 'Move right by 0.3 meters.',
    targetSelector: '#tutorial-right-joystick',
    validationType: 'state',
    validate: ({ position, stickState, stepStartValue, setStepStartValue }) => {
      if (!position) return false;
      if (stepStartValue === null) {
        setStepStartValue(position.clone());
        return false;
      }
      const startPos = stepStartValue as THREE.Vector3;
      return stickState.roll > 0.15 && position.x > startPos.x + 0.3;
    },
    illustration: 'right_stick'
  },
  {
    id: 'MISSION_PITCH_FWD',
    title: 'Step 9: Pitch Forward',
    description: 'Tilt the drone forward (ArrowUp or right joystick up) to translate forward by 0.3 meters.',
    whyMatters: 'Pitch controls forward and backward translation.',
    expectedOutcome: 'Move forward by 0.3 meters.',
    targetSelector: '#tutorial-right-joystick',
    validationType: 'state',
    validate: ({ position, stickState, stepStartValue, setStepStartValue }) => {
      if (!position) return false;
      if (stepStartValue === null) {
        setStepStartValue(position.clone());
        return false;
      }
      const startPos = stepStartValue as THREE.Vector3;
      return stickState.pitch > 0.15 && position.z > startPos.z + 0.3;
    },
    illustration: 'right_stick'
  },
  {
    id: 'MISSION_PITCH_BWD',
    title: 'Step 10: Pitch Backward',
    description: 'Tilt the drone backward (ArrowDown or right joystick down) to translate backward by 0.3 meters.',
    whyMatters: 'Pitch control is vital for backing away from obstacles.',
    expectedOutcome: 'Move backward by 0.3 meters.',
    targetSelector: '#tutorial-right-joystick',
    validationType: 'state',
    validate: ({ position, stickState, stepStartValue, setStepStartValue }) => {
      if (!position) return false;
      if (stepStartValue === null) {
        setStepStartValue(position.clone());
        return false;
      }
      const startPos = stepStartValue as THREE.Vector3;
      return stickState.pitch < -0.15 && position.z < startPos.z - 0.3;
    },
    illustration: 'right_stick'
  },
  {
    id: 'MISSION_FLIP_FWD',
    title: 'Step 11: Flip Forward',
    description: 'Arm the flip modifier (press F or tap Flip button) and tilt Forward (ArrowUp or right joystick up) to execute a Forward Flip.',
    whyMatters: 'Flips show the aerobatic maneuverability of the Pluto drone.',
    expectedOutcome: 'Complete a Forward Flip.',
    targetSelector: '#tutorial-flip-btn',
    validationType: 'state',
    validate: ({ orchestrator, hasStartedFlipRef }) => {
      if (orchestrator?.isFlipping && orchestrator?.flipDir === 'forward') {
        hasStartedFlipRef.current = true;
      }
      return hasStartedFlipRef.current && !orchestrator?.isFlipping;
    },
    illustration: 'right_stick'
  },
  {
    id: 'MISSION_FLIP_BWD',
    title: 'Step 12: Flip Backward',
    description: 'Arm the flip modifier (press F or tap Flip button) and tilt Backward (ArrowDown or right joystick down) to execute a Backward Flip.',
    whyMatters: 'Aerobatics require pitch precision and altitude recovery space.',
    expectedOutcome: 'Complete a Backward Flip.',
    targetSelector: '#tutorial-flip-btn',
    validationType: 'state',
    validate: ({ orchestrator, hasStartedFlipRef }) => {
      if (orchestrator?.isFlipping && orchestrator?.flipDir === 'backward') {
        hasStartedFlipRef.current = true;
      }
      return hasStartedFlipRef.current && !orchestrator?.isFlipping;
    },
    illustration: 'right_stick'
  },
  {
    id: 'MISSION_FLY_WAYPOINT',
    title: 'Step 13: Checkpoint',
    description: 'A blue floating checkpoint has spawned 3 meters ahead. Fly through it using your controls.',
    whyMatters: 'Teaches simultaneous 3D coordinate translation and orientation alignment.',
    expectedOutcome: 'Fly through the blue checkpoint target ring.',
    targetSelector: '#tutorial-right-joystick',
    validationType: 'state',
    validate: ({ position }) => {
      if (!position) return false;
      const target = new THREE.Vector3(0.0, 1.2, 3.0);
      return position.distanceTo(target) <= 0.8;
    },
    illustration: 'waypoint'
  },
  {
    id: 'MISSION_LAND',
    title: 'Step 14: Manual Landing',
    description: 'Fly back near the center and land the drone safely (press L or hold Throttle Down). Keep the drone armed.',
    whyMatters: 'Touchdowns must be smooth and controlled. Propellers continue spinning at idle on touchdown.',
    expectedOutcome: 'Landed safely on ground while remaining ARMED.',
    targetSelector: '#tutorial-land-btn',
    validationType: 'state',
    validate: ({ telemetry, orchestrator }) => {
      const altitude = telemetry?.altitude ?? 0;
      return orchestrator?.hasTakenOff === false && altitude < 0.08 && telemetry?.isArmed === true;
    },
    illustration: 'land'
  },
  {
    id: 'MISSION_DISARM',
    title: 'Step 15: Disarm Drone',
    description: 'Now that the drone has landed, press SPACEBAR (or tap the ARM button) to disarm the ESCs and stop the propellers.',
    whyMatters: 'Safe landing procedure always ends with disarming to safe the motors.',
    expectedOutcome: 'Motors stopped and drone disarmed.',
    targetSelector: '#tutorial-arm-btn',
    validationType: 'state',
    validate: ({ telemetry }) => telemetry?.isArmed === false,
    illustration: 'arm'
  }
];

export function TutorialProvider({ 
  children, 
  telemetry, 
  stickState, 
  orchestrator,
  onCheckpointsUpdated 
}: { 
  children: React.ReactNode; 
  telemetry: any; 
  stickState: any;
  orchestrator: any;
  onCheckpointsUpdated: (cps: any[]) => void;
}) {
  const storeStartTutorial = useDroneStore((s) => s.startTutorial);
  const storeStopTutorial = useDroneStore((s) => s.stopTutorial);
  const isTutorialActive = useDroneStore((s) => s.isTutorialActive);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStartValue, setStepStartValue] = useState<any>(null);
  const hasStartedFlipRef = React.useRef<boolean>(false);

  const [hasSkipped, setHasSkipped] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [crashes, setCrashes] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);
  const [isStepCompleted, setIsStepCompleted] = useState(false);

  // Synchronize store's tutorialStep with currentStepIndex
  useEffect(() => {
    if (isTutorialActive) {
      useDroneStore.setState({ tutorialStep: currentStepIndex });
    }
  }, [currentStepIndex, isTutorialActive]);

  // Reset starting values when index changes
  useEffect(() => {
    setStepStartValue(null);
    hasStartedFlipRef.current = false;
    setIsStepCompleted(false);
  }, [currentStepIndex, isTutorialActive]);

  // Synchronize/reset metrics when tutorial becomes active
  useEffect(() => {
    if (isTutorialActive) {
      setElapsedTime(0);
      setCrashes(0);
      setHoverTime(0);
    } else {
      onCheckpointsUpdated([]);
    }
  }, [isTutorialActive, onCheckpointsUpdated]);

  // Persistent storage load
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const skipped = localStorage.getItem(LOCAL_STORAGE_SKIPPED);
    if (skipped === 'true') {
      setHasSkipped(true);
    }
    if (saved) {
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < TUTORIAL_STEPS.length) {
        setCurrentStepIndex(idx);
      }
    }
  }, []);

  // Track crashes during tutorial
  useEffect(() => {
    if (isTutorialActive && telemetry?.flightMode === 'failsafe') {
      setCrashes((c) => c + 1);
    }
  }, [telemetry?.flightMode, isTutorialActive]);

  // Elapsed time counter
  useEffect(() => {
    let timer: any = null;
    if (isTutorialActive) {
      timer = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTutorialActive, currentStepIndex]);

  // Dynamic Checkpoint Spawning depending on FSM State
  useEffect(() => {
    if (!isTutorialActive) return;
    const stepId = TUTORIAL_STEPS[currentStepIndex].id;

    if (stepId === 'MISSION_FLY_WAYPOINT') {
      // Spawn waypoint checkpoint ring 3 meters ahead
      onCheckpointsUpdated([
        { id: 'tutorial_waypoint', position: [0.0, 1.2, 3.0], radius: 0.6, passed: false }
      ]);
    } else {
      onCheckpointsUpdated([]);
    }
  }, [currentStepIndex, isTutorialActive]);

  // FSM Step Validation Loop
  useEffect(() => {
    if (!isTutorialActive) return;
    const step = TUTORIAL_STEPS[currentStepIndex];
    if (step.validationType !== 'state' || !step.validate) return;

    let physPos: THREE.Vector3 | null = null;
    let physVel: THREE.Vector3 | null = null;
    if (orchestrator && typeof orchestrator.getPhysicsState === 'function') {
      try {
        const phys = orchestrator.getPhysicsState();
        if (phys) {
          physPos = phys.position;
          physVel = phys.velocity;
        }
      } catch (err) {
        console.error("Physics retrieval error:", err);
      }
    }

    const interval = setInterval(() => {
      // Manage 2s hover timer inside validation loop
      const stepId = step.id;
      let currentHoverTime = hoverTime;
      if (stepId === 'MISSION_HOVER') {
        const altitude = telemetry?.altitude ?? 0;
        const speed = telemetry?.speed ?? 0;
        const inHoverWindow = altitude >= 0.5 && altitude <= 2.5 && speed < 1.5;
        if (inHoverWindow) {
          currentHoverTime += 0.1;
          setHoverTime(currentHoverTime);
        } else {
          currentHoverTime = 0;
          setHoverTime(0);
        }
      }

      // Check current checkpoints
      if (orchestrator && typeof orchestrator.getPhysicsState === 'function') {
        try {
          const phys = orchestrator.getPhysicsState();
          if (phys) {
            physPos = phys.position;
            physVel = phys.velocity;
          }
        } catch (e) {}
      }

      const isValid = step.validate!({
        telemetry,
        stickState,
        position: physPos,
        velocity: physVel,
        checkpoints: [],
        hoverTime: currentHoverTime,
        orchestrator,
        stepStartValue,
        setStepStartValue,
        hasStartedFlipRef
      });

      if (isValid) {
        clearInterval(interval);
        // Clear hover timer for next runs
        setHoverTime(0);
        setIsStepCompleted(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentStepIndex, isTutorialActive, telemetry, stickState, hoverTime, orchestrator, stepStartValue]);

  const startTutorial = () => {
    storeStartTutorial();
  };

  const stopTutorial = () => {
    storeStopTutorial();
  };

  const nextStep = () => {
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < TUTORIAL_STEPS.length) {
      setCurrentStepIndex(nextIdx);
      localStorage.setItem(LOCAL_STORAGE_KEY, nextIdx.toString());
    } else {
      stopTutorial();
      setCurrentStepIndex(0);
      localStorage.setItem(LOCAL_STORAGE_KEY, '0');
    }
  };

  const continueStep = () => {
    setIsStepCompleted(false);
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < TUTORIAL_STEPS.length) {
      setCurrentStepIndex(nextIdx);
      localStorage.setItem(LOCAL_STORAGE_KEY, nextIdx.toString());
    } else {
      stopTutorial();
      setCurrentStepIndex(0);
      localStorage.setItem(LOCAL_STORAGE_KEY, '0');
    }
  };

  const prevStep = () => {
    const prevIdx = Math.max(0, currentStepIndex - 1);
    setCurrentStepIndex(prevIdx);
    localStorage.setItem(LOCAL_STORAGE_KEY, prevIdx.toString());
  };

  const skipTutorial = () => {
    setHasSkipped(true);
    localStorage.setItem(LOCAL_STORAGE_SKIPPED, 'true');
    stopTutorial();
  };

  const restartTutorial = () => {
    setCurrentStepIndex(0);
    localStorage.setItem(LOCAL_STORAGE_KEY, '0');
    startTutorial();
  };

  const setStepById = (id: StepId) => {
    const idx = TUTORIAL_STEPS.findIndex((s) => s.id === id);
    if (idx !== -1) {
      setCurrentStepIndex(idx);
      localStorage.setItem(LOCAL_STORAGE_KEY, idx.toString());
    }
  };

  // Score Calculation Formulas
  const baseScore = 1000;
  const timePenalty = elapsedTime * 2;
  const crashPenalty = crashes * 150;
  const flightScore = Math.max(100, baseScore - timePenalty - crashPenalty);
  const accuracy = Math.max(10, Math.round(((TUTORIAL_STEPS.length - crashes) / TUTORIAL_STEPS.length) * 100));
  const hoverProgress = Math.min(1, hoverTime / 2.0);

  return (
    <TutorialContext.Provider
      value={{
        steps: TUTORIAL_STEPS,
        currentStepIndex,
        currentStep: TUTORIAL_STEPS[currentStepIndex],
        isTutorialActive,
        startTutorial,
        stopTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        restartTutorial,
        setStepById,
        completedStepsCount: currentStepIndex,
        elapsedTime,
        accuracy,
        flightScore,
        hasSkipped,
        hoverProgress,
        isStepCompleted,
        continueStep
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
