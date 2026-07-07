import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDroneStore } from '../../../store/useDroneStore';
import * as THREE from 'three';

export type StepId =
  | 'WELCOME'
  | 'FLIGHT_MODES'
  | 'TELEMETRY_BATTERY'
  | 'TELEMETRY_SIGNAL'
  | 'TELEMETRY_ALTITUDE'
  | 'TELEMETRY_SPEED'
  | 'TELEMETRY_FLIGHT_TIME'
  | 'TELEMETRY_STATUS'
  | 'TELEMETRY_FLIGHT_MODE'
  | 'CONTROL_LEFT_STICK'
  | 'CONTROL_RIGHT_STICK'
  | 'CONTROL_ARM'
  | 'CONTROL_DISARM'
  | 'CONTROL_TAKEOFF'
  | 'CONTROL_LAND'
  | 'CONTROL_FLIP'
  | 'CONTROL_CAMERA'
  | 'CONTROL_SPEED_MODE'
  | 'CONTROL_HEADFREE'
  | 'MISSION_ARM'
  | 'MISSION_THROTTLE'
  | 'MISSION_TAKEOFF'
  | 'MISSION_HOVER'
  | 'MISSION_ROLL_LEFT'
  | 'MISSION_ROLL_RIGHT'
  | 'MISSION_PITCH_FORWARD'
  | 'MISSION_PITCH_BACKWARD'
  | 'MISSION_ROTATE_LEFT'
  | 'MISSION_ROTATE_RIGHT'
  | 'MISSION_FLY_WAYPOINT'
  | 'MISSION_FLY_GATE'
  | 'MISSION_RETURN'
  | 'MISSION_LAND'
  | 'MISSION_DISARM'
  | 'COMPLETE';

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
  illustration: 'welcome' | 'camera' | 'battery' | 'signal' | 'altitude' | 'speed' | 'time' | 'status' | 'mode' | 'left_stick' | 'right_stick' | 'arm' | 'disarm' | 'takeoff' | 'land' | 'flip' | 'headfree' | 'speed_mode' | 'hover' | 'waypoint' | 'gate' | 'complete';
  validate?: (state: {
    telemetry: any;
    stickState: any;
    position: THREE.Vector3 | null;
    velocity: THREE.Vector3 | null;
    checkpoints: any[];
    hoverTime: number;
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
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'drona_academy_tutorial_progress';
const LOCAL_STORAGE_SKIPPED = 'drona_academy_tutorial_skipped';

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
    if (isTutorialActive && TUTORIAL_STEPS[currentStepIndex].id !== 'COMPLETE') {
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
    } else if (stepId === 'MISSION_FLY_GATE') {
      // Spawn gate hoop checkpoint
      onCheckpointsUpdated([
        { id: 'tutorial_gate', position: [0.0, 1.8, 5.0], radius: 0.65, passed: false }
      ]);
    } else if (stepId === 'MISSION_RETURN') {
      // Spawn home base landing pad target ring
      onCheckpointsUpdated([
        { id: 'tutorial_return', position: [0.0, 0.05, 0.0], radius: 0.8, passed: false }
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
        const inHoverWindow = altitude >= 0.8 && altitude <= 1.8 && speed < 0.6;
        if (inHoverWindow) {
          currentHoverTime += 0.1;
          setHoverTime(currentHoverTime);
        } else {
          currentHoverTime = 0;
          setHoverTime(0);
        }
      }

      // Check current checkpoints
      let activeCps: any[] = [];
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
        checkpoints: activeCps, // Will check coordinates directly
        hoverTime: currentHoverTime
      });

      if (isValid) {
        clearInterval(interval);
        // Clear hover timer for next runs
        setHoverTime(0);
        
        // Auto advance
        setTimeout(() => {
          const nextIdx = currentStepIndex + 1;
          if (nextIdx < TUTORIAL_STEPS.length) {
            setCurrentStepIndex(nextIdx);
            localStorage.setItem(LOCAL_STORAGE_KEY, nextIdx.toString());
          }
        }, 800);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentStepIndex, isTutorialActive, telemetry, stickState, hoverTime]);

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
  const hoverProgress = Math.min(1, hoverTime / 3.0);

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
        hoverProgress
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

// ─── 31-STEP FSM DEFINITIONS ────────────────────────────────────────────────
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'WELCOME',
    title: 'Welcome Pilot!',
    description: 'Welcome to the Drona Academy. In this guided onboarding, you will learn how to pilot the high-performance PlutoX nano-drone.',
    whyMatters: 'Flight onboarding ensures you understand motor mechanics and flight dynamics safely without crash damages.',
    tips: 'Ensure your keyboard is focused. Hover and movements will require WASD/Arrow combinations.',
    warnings: 'Do not throttle up too rapidly. Maintain controlled inputs.',
    expectedOutcome: 'Press Enter or click Begin to open the onboarding manual.',
    commonMistakes: 'Clicking away from the screen or ignoring the keys legend.',
    targetSelector: '',
    validationType: 'manual',
    illustration: 'welcome'
  },
  {
    id: 'FLIGHT_MODES',
    title: 'Flight Camera Presets',
    description: 'The simulator supports three active camera view angles: Chase (third-person view), FPV (first-person pilot view), and Orbit (focused spectator view). Try clicking Chase, FPV, or Orbit in the camera switcher.',
    whyMatters: 'Different angles provide situational awareness or direct pilot views for precise obstacle navigation.',
    tips: 'Use Orbit (3) to inspect drone structure, Chase (1) for general flight, and FPV (2) for gate hoops.',
    warnings: 'Flying in FPV mode requires steady altitude hold inputs.',
    expectedOutcome: 'Click one of the CAM VIEW buttons or press 1, 2, or 3.',
    commonMistakes: 'Sticking to Orbit view during rapid vertical climbs.',
    targetSelector: '#tutorial-camera-switcher',
    validationType: 'state',
    validate: () => {
      return true; // Simple click-through validation
    },
    illustration: 'camera'
  },
  {
    id: 'TELEMETRY_BATTERY',
    title: 'Avionics: LiPo Battery Meter',
    description: 'Monitors the flight battery state of charge. Nano-drones operate on a 3S LiPo battery (~11.1V nominal). The dashboard displays live cell voltage and remaining capacity.',
    whyMatters: 'LiPo batteries lose cell balance if discharged below critical limits (under 9.9V), causing permanent core damage.',
    tips: 'Plan landing maneuvers when the battery falls below 20% or displays orange alerts.',
    warnings: 'Critical alarms sound when battery is under 15% cell capacity.',
    expectedOutcome: 'Observe the battery state card. Click Next to proceed.',
    commonMistakes: 'Ignoring low battery alerts, leading to failsafe auto-land.',
    targetSelector: '#tutorial-telemetry-battery',
    validationType: 'manual',
    illustration: 'battery'
  },
  {
    id: 'TELEMETRY_SIGNAL',
    title: 'Avionics: Telemetry Link State',
    description: 'Displays the live AppLink connection strength between the ground transmitter and the internal PlutoX flight controller module.',
    whyMatters: 'A weak telemetry signal causes control latency or failsafe signal loss, triggering auto-landing safety protocols.',
    tips: 'Keep line-of-sight clear of structural barriers to maintain high signal packet decibels.',
    warnings: 'Disconnecting the twin applink blocks remote flight commands.',
    expectedOutcome: 'Observe the connection status panel. Click Next.',
    commonMistakes: 'Flying beyond signal range boundaries.',
    targetSelector: '#tutorial-telemetry-signal',
    validationType: 'manual',
    illustration: 'signal'
  },
  {
    id: 'TELEMETRY_ALTITUDE',
    title: 'Avionics: Altitude sensor',
    description: 'Reads the real-time altitude in meters using the onboard ultrasonic sonar sensor and barometer data fusion.',
    whyMatters: 'Altitude stability is necessary to perform level coordinate navigation without ground-effect turbulence.',
    tips: 'Ground-effect drafts occur under 0.15 meters, making the drone unstable.',
    warnings: 'Sonar sensors can lose accuracy over carpeted surfaces.',
    expectedOutcome: 'Observe the altitude readout. Click Next.',
    commonMistakes: 'Confusing vertical coordinate velocity with altitude.',
    targetSelector: '#tutorial-telemetry-altitude',
    validationType: 'manual',
    illustration: 'altitude'
  },
  {
    id: 'TELEMETRY_SPEED',
    title: 'Avionics: Horizontal Speed',
    description: 'Gives the current horizontal flight speed in meters per second (m/s) as calculated by the physics state sensors.',
    whyMatters: 'Higher speed requires longer braking pitch angles to stop the drone before collision boundaries.',
    tips: 'Keep speed under 1.5 m/s when learning basic translation moves.',
    warnings: 'Fast translation pitch inputs can result in rapid height losses.',
    expectedOutcome: 'Observe the speed gauge. Click Next.',
    commonMistakes: 'Accelerating into walls without counter-pitch braking.',
    targetSelector: '#tutorial-telemetry-speed',
    validationType: 'manual',
    illustration: 'speed'
  },
  {
    id: 'TELEMETRY_FLIGHT_TIME',
    title: 'Avionics: Flight Duration',
    description: 'Tracks the elapsed time in seconds since the flight controller motors were armed.',
    whyMatters: 'Essential for estimating real battery draw rates and logging flight logs.',
    tips: 'Average indoor nano-drone flights range from 5 to 7 minutes.',
    warnings: 'Extended hover draws constant current, depleting cells faster.',
    expectedOutcome: 'Observe the timer. Click Next.',
    commonMistakes: 'Leaving motors armed at idle for long periods.',
    targetSelector: '#tutorial-telemetry-flighttime',
    validationType: 'manual',
    illustration: 'time'
  },
  {
    id: 'TELEMETRY_STATUS',
    title: 'Avionics: IMU Calibration',
    description: 'Shows the diagnostic state of the Inertial Measurement Unit (accel/gyro) sensor calibration.',
    whyMatters: 'Uncalibrated IMUs cause the drone to drift rapidly in roll or pitch immediately upon takeoff.',
    tips: 'Calibrate the drone on a flat, level surface before arming.',
    warnings: 'Never move the drone during the boot sensor calibration sequence.',
    expectedOutcome: 'Observe the online status indicator. Click Next.',
    commonMistakes: 'Arming immediately after boot without verifying calibration.',
    targetSelector: '#tutorial-telemetry-status',
    validationType: 'manual',
    illustration: 'status'
  },
  {
    id: 'TELEMETRY_FLIGHT_MODE',
    title: 'Avionics: Active Flight Mode',
    description: 'Displays whether the flight controller is in ALTITUDE HOLD (Auto-Leveling) mode, STABILIZE (Angle) mode, or FAILSAFE mode.',
    whyMatters: 'Altitude hold uses barometer feedback to maintain height, making it much easier for beginner pilots.',
    tips: 'Keep Altitude Hold enabled while practicing joystick coordinate control.',
    warnings: 'Failsafe mode is automatically activated when battery falls to critical.',
    expectedOutcome: 'Observe the mode status indicator. Click Next.',
    commonMistakes: 'Switching to stabilizer mode prematurely without stick mastery.',
    targetSelector: '#tutorial-telemetry-flightmode',
    validationType: 'manual',
    illustration: 'mode'
  },
  {
    id: 'CONTROL_LEFT_STICK',
    title: 'Transmitter: Left Joystick',
    description: 'Controls the THROTTLE (Vertical lift: W/S keys) and YAW (Heading rotation: A/D keys). deflecting left/right spins the drone.',
    whyMatters: 'Yaw changes which way is forward. Throttle changes overall vertical flight height.',
    tips: 'Hold W or S momentarily to observe the throttle stick indicator react in the transmitter panel.',
    warnings: 'Extreme yaw rotation inputs can disorient your pitch reference.',
    expectedOutcome: 'Deflect the left stick by holding W, S, A, or D.',
    commonMistakes: 'Holding throttle keys too long, causing the drone to hit the ceiling.',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ stickState }) => {
      return Math.abs(stickState.throttle - 0.5) > 0.15 || Math.abs(stickState.yaw) > 0.15;
    },
    illustration: 'left_stick'
  },
  {
    id: 'CONTROL_RIGHT_STICK',
    title: 'Transmitter: Right Joystick',
    description: 'Controls PITCH (Forward/Backward: ArrowUp/ArrowDown keys) and ROLL (Sideways left/right: ArrowLeft/ArrowRight keys).',
    whyMatters: 'Roll and pitch control translation travel. Roll moves sideways, pitch moves forward or backward.',
    tips: 'Hold any Arrow key for a split second to see the right stick handle deflect.',
    warnings: 'Always center the stick (release arrow keys) to stabilize translation drift.',
    expectedOutcome: 'Deflect the right stick by pressing any Arrow key.',
    commonMistakes: 'Holding direction arrows down continuously without letting go to level.',
    targetSelector: '#tutorial-right-joystick',
    validationType: 'state',
    validate: ({ stickState }) => {
      return Math.abs(stickState.pitch) > 0.15 || Math.abs(stickState.roll) > 0.15;
    },
    illustration: 'right_stick'
  },
  {
    id: 'CONTROL_SPEED_MODE',
    title: 'Control: Speed Mode (Rates)',
    description: 'Changes the pilot control sensitivity scale (Low, Medium, High). Low sensitivity is best for beginners to learn steady movements.',
    whyMatters: 'High sensitivity allows aggressive rolls and flips but requires highly precise stick corrections.',
    tips: 'Start with Low (60% rates) to minimize overshoot oscillations.',
    warnings: 'High rates make the controls extremely sensitive to keyboard taps.',
    expectedOutcome: 'Observe the Speed Mode dropdown. Click Next.',
    commonMistakes: 'Selecting High rates before learning stable hovering.',
    targetSelector: '#tutorial-speed-mode-select',
    validationType: 'manual',
    illustration: 'speed_mode'
  },
  {
    id: 'CONTROL_HEADFREE',
    title: 'Control: HeadFree Mode',
    description: 'If active, the drone travels relative to the pilot view direction rather than the front nose of the drone. Toggled with "J" key.',
    whyMatters: 'If the drone is facing you, controls are inverted. HeadFree mode prevents control inversion disorientation.',
    tips: 'Keep HeadFree ON if you lose track of the drone heading direction.',
    warnings: 'In HeadFree, turning the camera changes the control orientation reference.',
    expectedOutcome: 'Observe the HeadFree switch. Click Next.',
    commonMistakes: 'Panicking when controls invert, instead of using HeadFree.',
    targetSelector: '#tutorial-headfree-switch',
    validationType: 'manual',
    illustration: 'headfree'
  },
  {
    id: 'CONTROL_FLIP',
    title: 'Control: 3D Acro Flip',
    description: 'Arms the flip sequence. Pressing "F" prepares a 3D acro roll. Deflecting the direction stick then executes an automated flip.',
    whyMatters: 'Flips require high motor torque reserves and altitude clearance to recover flight lift post-maneuver.',
    tips: 'Always perform flips above 1.5 meters altitude for safety.',
    warnings: 'Do not flip when the battery is under 20% cell level.',
    expectedOutcome: 'Observe the Flip button. Click Next.',
    commonMistakes: 'Triggering flips near ground levels, resulting in hard impacts.',
    targetSelector: '#tutorial-flip-btn',
    validationType: 'manual',
    illustration: 'flip'
  },
  {
    id: 'CONTROL_CAMERA',
    title: 'Control: Camera Presets',
    description: 'Provides quick keys (1, 2, 3) to toggle camera mount presets.',
    whyMatters: 'Enables quick switching of viewpoint references during complex obstacles.',
    tips: 'Toggling camera views does not reset your active stick inputs.',
    warnings: 'Changing cameras during climbs can temporarily disrupt spatial reference.',
    expectedOutcome: 'Observe camera presets. Click Next.',
    commonMistakes: 'Flying only in orbit view and crashing into hidden obstructions.',
    targetSelector: '#tutorial-camera-switcher',
    validationType: 'manual',
    illustration: 'camera'
  },
  {
    id: 'CONTROL_ARM',
    title: 'Academy Prep: Arm Motors',
    description: 'Arming is the initial safety step. Pressing Spacebar activates the ESCs and spins the motors at idle speed.',
    whyMatters: 'An armed drone is active and will fly when throttle is applied. Keep disarmed when safe.',
    tips: 'Ensure your stick inputs are centered before arming.',
    warnings: 'Keep clear of propellers when arming physical quads.',
    expectedOutcome: 'Observe the Arm button on screen. Click Next.',
    commonMistakes: 'Assuming the drone will fly without arming the motors.',
    targetSelector: '#tutorial-arm-btn',
    validationType: 'manual',
    illustration: 'arm'
  },
  {
    id: 'CONTROL_DISARM',
    title: 'Academy Prep: Disarm Switch',
    description: 'Disarming cuts motor power immediately. Press Spacebar when landed to secure the quadcopter.',
    whyMatters: 'Safe disarming prevents flyaways or motor burnout if the propellers get caught in a crash.',
    tips: 'Disarming also acts as an emergency stop in flight.',
    warnings: 'Disarming in mid-air will cause the drone to fall like a stone.',
    expectedOutcome: 'Observe the Arm/Disarm button. Click Next.',
    commonMistakes: 'Forgetting to disarm after landing, draining the cells.',
    targetSelector: '#tutorial-arm-btn',
    validationType: 'manual',
    illustration: 'disarm'
  },
  {
    id: 'CONTROL_TAKEOFF',
    title: 'Academy Prep: Takeoff Button',
    description: 'Autopilot Takeoff climbs the drone to a stable 1.0m hover automatically. Initiated with the "T" key.',
    whyMatters: 'Saves battery and avoids ground-effect turbulence drift during initial launch climbs.',
    tips: 'Verify calibration status is Online before launching.',
    expectedOutcome: 'Observe the Takeoff button. Click Next.',
    commonMistakes: 'Holding the key instead of a single press.',
    targetSelector: '#tutorial-takeoff-btn',
    validationType: 'manual',
    illustration: 'takeoff'
  },
  {
    id: 'CONTROL_LAND',
    title: 'Academy Prep: Land Button',
    description: 'Autopilot Landing performs a controlled vertical descent, detects touchdown, and disarms motors automatically. Initiated with "L" key.',
    whyMatters: 'Ensures a smooth touchdown, avoiding hard landing rebounds.',
    tips: 'Fly close to the landing pad before triggering landing.',
    expectedOutcome: 'Observe the Land button. Click Next to start the flight mission!',
    commonMistakes: 'Triggering landing from 4 meters high, which takes longer to descend.',
    targetSelector: '#tutorial-land-btn',
    validationType: 'manual',
    illustration: 'land'
  },
  // ─── TRAINING MISSION FLIGHT TASKS ──────────────────────────────────────────
  {
    id: 'MISSION_ARM',
    title: 'Task 1: Arm the Motors',
    description: 'Press the SPACEBAR or tap the ARM button to arm the flight controller. Propellers will spin at idle speed.',
    whyMatters: 'Prepares the ESCs to receive throttle inputs for liftoff.',
    tips: 'Ensure your throttle input is at 0 (or W key is not held).',
    warnings: 'Motors are active. Do not touch other controls yet.',
    expectedOutcome: 'Telemetry changes state to ARMED.',
    commonMistakes: 'Tapping spacebar multiple times, which arms and then instantly disarms.',
    targetSelector: '#tutorial-arm-btn',
    validationType: 'state',
    validate: ({ telemetry }) => telemetry?.isArmed === true,
    illustration: 'arm'
  },
  {
    id: 'MISSION_THROTTLE',
    title: 'Task 2: Increase Throttle',
    description: 'Spool up the motors. Hold the W key (or move Left Joystick up) to increase the throttle input.',
    whyMatters: 'Increasing throttle generates lift by spinning propellers faster.',
    tips: 'Just apply a brief input to test the throttle response.',
    warnings: 'Too much throttle will launch the drone rapidly.',
    expectedOutcome: 'Throttle level on screen climbs past 52%.',
    commonMistakes: 'Holding W down too long, hitting the ceiling.',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ stickState }) => stickState.throttle > 0.52,
    illustration: 'left_stick'
  },
  {
    id: 'MISSION_TAKEOFF',
    title: 'Task 3: Execute Takeoff',
    description: 'Perform a controlled launch. Press the T key or click the TAKEOFF button to hover at 1.0m.',
    whyMatters: 'Launches the drone safely above the ground ground-effect zone.',
    tips: 'Let the autopilot finish the climb before adjusting sticks.',
    warnings: 'Keep hands on keys in case of translation drift.',
    expectedOutcome: 'Altitude climbs above 0.15 meters.',
    commonMistakes: 'Applying horizontal pitch keys during active takeoff climbs.',
    targetSelector: '#tutorial-takeoff-btn',
    validationType: 'state',
    validate: ({ telemetry }) => (telemetry?.altitude ?? 0) > 0.15,
    illustration: 'takeoff'
  },
  {
    id: 'MISSION_HOVER',
    title: 'Task 4: Stable Hover',
    description: 'Maintain a stable hover between 0.8m and 1.8m for 3 consecutive seconds. Release all translation keys.',
    whyMatters: 'Hovering builds a steady baseline reference for all directional flight maneuvers.',
    tips: 'Center the sticks! In Alt-Hold, the drone stabilizes itself if left alone.',
    warnings: 'Avoid continuous over-corrections. Let auto-level settle.',
    expectedOutcome: 'Maintain height for 3 seconds.',
    commonMistakes: 'Constantly tapping keys, creating high drift oscillations.',
    targetSelector: '',
    validationType: 'state',
    validate: ({ hoverTime }) => hoverTime >= 3.0,
    illustration: 'hover'
  },
  {
    id: 'MISSION_ROLL_LEFT',
    title: 'Task 5: Roll Left',
    description: 'Practice translation. Press ArrowLeft or move the Right Joystick left to fly sideways.',
    whyMatters: 'Roll tilts the drone horizontally, translating it without rotating the heading.',
    tips: 'Use short, quick key taps to maintain position control.',
    warnings: 'Rolling also changes your vertical height slightly; compensate if needed.',
    expectedOutcome: 'Roll input deflects left.',
    commonMistakes: 'Holding the roll key, accelerating out of control.',
    targetSelector: '#tutorial-right-joystick',
    validationType: 'state',
    validate: ({ stickState }) => stickState.roll < -0.1,
    illustration: 'right_stick'
  },
  {
    id: 'MISSION_ROLL_RIGHT',
    title: 'Task 6: Roll Right',
    description: 'Press ArrowRight or move the Right Joystick right to roll sideways.',
    whyMatters: 'Translates the drone rightward.',
    tips: 'Keep altitude steady above 0.8 meters.',
    expectedOutcome: 'Roll input deflects right.',
    commonMistakes: 'Tapping left instead of right due to confusion.',
    targetSelector: '#tutorial-right-joystick',
    validationType: 'state',
    validate: ({ stickState }) => stickState.roll > 0.1,
    illustration: 'right_stick'
  },
  {
    id: 'MISSION_PITCH_FORWARD',
    title: 'Task 7: Pitch Forward',
    description: 'Fly forward. Press ArrowUp or move the Right Joystick up to pitch forward.',
    whyMatters: 'Pitch angles the nose down, generating horizontal thrust forward.',
    tips: 'Center the stick quickly to halt forward travel.',
    expectedOutcome: 'Pitch input deflects forward (positive/negative depending on model direction).',
    targetSelector: '#tutorial-right-joystick',
    validationType: 'state',
    validate: ({ stickState }) => Math.abs(stickState.pitch) > 0.1,
    illustration: 'right_stick'
  },
  {
    id: 'MISSION_PITCH_BACKWARD',
    title: 'Task 8: Pitch Backward',
    description: 'Fly backward. Press ArrowDown or move the Right Joystick down.',
    whyMatters: 'Angles the tail down, accelerating the drone backward.',
    expectedOutcome: 'Pitch stick deflects backward.',
    targetSelector: '#tutorial-right-joystick',
    validationType: 'state',
    validate: ({ stickState }) => Math.abs(stickState.pitch) > 0.1,
    illustration: 'right_stick'
  },
  {
    id: 'MISSION_ROTATE_LEFT',
    title: 'Task 9: Rotate Left (Yaw)',
    description: 'Change drone direction. Press A or move the Left Joystick left to rotate heading.',
    whyMatters: 'Yaw rotates the drone frame, changing which direction is forward.',
    tips: 'Watch the heading compass ribbon rotate on the dashboard.',
    expectedOutcome: 'Yaw stick deflects left.',
    commonMistakes: 'Confusing yaw (heading spin) with roll (sideways slide).',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ stickState }) => stickState.yaw < -0.1,
    illustration: 'left_stick'
  },
  {
    id: 'MISSION_ROTATE_RIGHT',
    title: 'Task 10: Rotate Right (Yaw)',
    description: 'Press D or move the Left Joystick right to rotate heading.',
    whyMatters: 'Rotates the heading clockwise.',
    expectedOutcome: 'Yaw stick deflects right.',
    targetSelector: '#tutorial-left-joystick',
    validationType: 'state',
    validate: ({ stickState }) => stickState.yaw > 0.1,
    illustration: 'left_stick'
  },
  {
    id: 'MISSION_FLY_WAYPOINT',
    title: 'Task 11: Fly to Checkpoint',
    description: 'A blue waypoint ring has spawned 3 meters ahead in the arena. Fly the PlutoX through this checkpoint.',
    whyMatters: 'Trains coordinate precision and pathfinding control.',
    tips: 'Use pitch (ArrowUp) to fly forward, maintaining altitude at ~1.2m.',
    warnings: 'Do not overshoot the ring. Fly slowly.',
    expectedOutcome: 'Pass close to the blue hoop center.',
    commonMistakes: 'Accelerating too fast and missing the hoop boundary.',
    targetSelector: '',
    validationType: 'state',
    validate: ({ position }) => {
      if (!position) return false;
      const target = new THREE.Vector3(0.0, 1.2, 3.0);
      return position.distanceTo(target) <= 0.8;
    },
    illustration: 'waypoint'
  },
  {
    id: 'MISSION_FLY_GATE',
    title: 'Task 12: Pass Through Gate',
    description: 'An elevated neon green ring gate has spawned 5 meters ahead. Navigate through the center of this gate.',
    whyMatters: 'Obstacle penetration checks your simultaneous altitude and translation control.',
    tips: 'Use FPV camera view (press 2) for better aim through the center.',
    warnings: 'Hitting the frame will crash the drone. Keep aligned.',
    expectedOutcome: 'Pass through the center of the ring.',
    commonMistakes: 'Drifting down and hitting the bottom hoop frame.',
    targetSelector: '',
    validationType: 'state',
    validate: ({ position }) => {
      if (!position) return false;
      const target = new THREE.Vector3(0.0, 1.8, 5.0);
      return position.distanceTo(target) <= 0.85;
    },
    illustration: 'gate'
  },
  {
    id: 'MISSION_RETURN',
    title: 'Task 13: Return to Launch Pad',
    description: 'Excellent flying! Now turn back and fly the drone back to hover directly above the home landing pad.',
    whyMatters: 'Landing at designated target coordinates secures flight control completion.',
    tips: 'Use pitch (ArrowDown) to fly backward, keeping altitude at ~1.0m.',
    expectedOutcome: 'Hover above the launch pad within 0.8m radius.',
    commonMistakes: 'Hovering too high above pad, which delays landing.',
    targetSelector: '',
    validationType: 'state',
    validate: ({ position }) => {
      if (!position) return false;
      const horizontalDist = Math.sqrt(position.x * position.x + position.z * position.z);
      return horizontalDist <= 0.85 && position.y <= 1.25;
    },
    illustration: 'waypoint'
  },
  {
    id: 'MISSION_LAND',
    title: 'Task 14: Land the Drone',
    description: 'Tap L or click LAND to trigger auto-landing. The drone will descend and disarm after touchdown.',
    whyMatters: 'Controlled touchdown prevents tip-overs or propeller strikes.',
    tips: 'Wait for the props to stop spinning completely.',
    expectedOutcome: 'Altitude registers under 0.08 meters.',
    commonMistakes: 'Tapping reset during touchdown sequence.',
    targetSelector: '#tutorial-land-btn',
    validationType: 'state',
    validate: ({ telemetry }) => (telemetry?.altitude ?? 0) < 0.08 && telemetry?.speed < 0.15,
    illustration: 'land'
  },
  {
    id: 'MISSION_DISARM',
    title: 'Task 15: Disarm Flight Controller',
    description: 'Press SPACEBAR or click DISARM to safe the controller electronics.',
    whyMatters: 'Safe-state locking ensures no accidental throttle spools occur.',
    tips: 'Check the status bar to verify the "DISARMED" state.',
    expectedOutcome: 'Motors disarm completely.',
    commonMistakes: 'Leaving battery connected in disarmed states.',
    targetSelector: '#tutorial-arm-btn',
    validationType: 'state',
    validate: ({ telemetry }) => telemetry?.isArmed === false,
    illustration: 'disarm'
  },
  {
    id: 'COMPLETE',
    title: 'Academy Certification!',
    description: 'Congratulations Pilot! You have completed the Pluto Academy flight checklist.',
    whyMatters: 'Certifies you for advanced autonomous flight zones.',
    tips: 'Press Replay to retake the test or Esc to return to flight sim.',
    expectedOutcome: 'Earn your Academy Badge!',
    commonMistakes: 'None!',
    targetSelector: '',
    validationType: 'manual',
    illustration: 'complete'
  }
];
