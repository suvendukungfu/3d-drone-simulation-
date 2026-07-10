import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDroneStore } from '../../../store/useDroneStore';
import * as THREE from 'three';

export type StepId =
  | 'WELCOME'
  | 'MISSION_ARM'
  | 'MISSION_THROTTLE'
  | 'MISSION_HOVER'
  | 'MISSION_FLY_WAYPOINT'
  | 'MISSION_LAND';

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
  hoverProgress: number; // 0 to 1 for the 3s hover
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
    description: 'Welcome to the Drona Academy. In this guided 5-step onboarding, you will learn the essentials of piloting the PlutoX nano-drone.',
    whyMatters: 'Completing the flight checklist builds core muscle memory for stable and safe operation.',
    expectedOutcome: 'Press Enter or click Begin to open the controls.',
    targetSelector: '',
    validationType: 'manual',
    illustration: 'welcome'
  },
  {
    id: 'MISSION_ARM',
    title: 'Step 1: Arm the Motors',
    description: 'To prepare the drone for flight, press the SPACEBAR key to arm the ESCs.',
    whyMatters: 'Arming activates the motors and prepares them for throttle lift commands. Keep disarmed when not flying.',
    expectedOutcome: 'Telemetry updates status to ARMED.',
    targetSelector: '#tutorial-arm-btn',
    validationType: 'state',
    validate: ({ telemetry }) => telemetry?.isArmed === true,
    illustration: 'arm'
  },
  {
    id: 'MISSION_THROTTLE',
    title: 'Step 2: Start Propellers',
    description: 'Press and hold Throttle Down to start the propellers.',
    whyMatters: 'Safe takeoff starts from zero applied throttle. Applying throttle immediately after arming can cause sudden climbs.',
    expectedOutcome: 'Throttle level registers at minimum (<= 5%).',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ telemetry, orchestrator }) => telemetry?.isArmed === true && orchestrator?.motorsStarted === true,
    illustration: 'left_stick'
  },
  {
    id: 'MISSION_HOVER',
    title: 'Step 3: Takeoff & Hover',
    description: 'Once the propellers are spinning, press and hold Throttle Up to take off.',
    whyMatters: 'Stable hovering is the core flight baseline for translation maneuvers.',
    expectedOutcome: 'Maintain steady altitude for 2 seconds.',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ telemetry, hoverTime, orchestrator }) => 
      telemetry?.isArmed === true && orchestrator?.motorsStarted === true && (telemetry?.altitude ?? 0) > 0.5 && hoverTime >= 2.0,
    illustration: 'hover'
  },
  {
    id: 'MISSION_FLY_WAYPOINT',
    title: 'Step 4: Checkpoint',
    description: 'A blue floating checkpoint has spawned 3 meters ahead. Use the Arrow keys (Pitch/Roll) and A/D keys (Yaw) to navigate through it.',
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
    title: 'Step 5: Land & Disarm',
    description: 'Excellent! Fly back near the center and click the LAND button (or press L). Once the drone touches down on the ground, press the SPACEBAR or click DISARM to safe the motors.',
    whyMatters: 'Safe landings and prompt disarming prevent tip-over crashes and motor burnout.',
    expectedOutcome: 'Touchdown and disarm (altitude < 0.15m and disarmed).',
    targetSelector: '#tutorial-land-btn',
    validationType: 'state',
    validate: ({ telemetry }) => telemetry?.isArmed === false && (telemetry?.altitude ?? 0) < 0.15,
    illustration: 'land'
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
  const [hasSkipped, setHasSkipped] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [crashes, setCrashes] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);
  const [isStepCompleted, setIsStepCompleted] = useState(false);

  // Reset step completed status whenever step or active state changes
  useEffect(() => {
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
      // Spawn waypoint checkpoint in front of pilot
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
      // Manage 3s hover timer inside validation loop
      const stepId = step.id;
      let currentHoverTime = hoverTime;
      if (stepId === 'MISSION_HOVER') {
        const altitude = telemetry?.altitude ?? 0;
        const speed = telemetry?.speed ?? 0;
        const inHoverWindow = altitude >= 0.5 && altitude <= 3.0 && speed < 1.5;
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
        orchestrator
      });

      if (isValid) {
        clearInterval(interval);
        // Clear hover timer for next runs
        setHoverTime(0);
        setIsStepCompleted(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentStepIndex, isTutorialActive, telemetry, stickState, hoverTime, orchestrator]);

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
