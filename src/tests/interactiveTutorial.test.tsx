import { render, act } from '@testing-library/react';
import { expect, test, describe, beforeEach, afterEach, vi } from 'vitest';
import { TutorialProvider, useTutorial } from '../components/UI/tutorial/TutorialContext';
import { useDroneStore } from '../store/useDroneStore';

// Mock SoundController
vi.mock('../utils/soundController', () => ({
  sound: {
    playClick: vi.fn(),
    playHit: vi.fn(),
    fadeMotorsOnCrash: vi.fn(),
    startMotorSound: vi.fn(),
    stopAllMotors: vi.fn(),
    updateMotorPitch: vi.fn(),
  }
}));

describe('InteractiveTutorial Flight Academy 5-Step Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    useDroneStore.setState({
      isTutorialActive: true,
      tutorialStep: 0,
      tutorialHint: null,
    });
  });

  afterEach(() => {
    useDroneStore.setState({
      isTutorialActive: false,
      tutorialStep: 0,
      tutorialHint: null,
    });
  });

  test('1. Verify tutorial has 6 items in total (Welcome + 5 Steps)', () => {
    let loadedSteps: any[] = [];
    const TestComponent = () => {
      const { steps } = useTutorial();
      loadedSteps = steps;
      return null;
    };

    render(
      <TutorialProvider
        telemetry={{}}
        stickState={{}}
        orchestrator={{}}
        onCheckpointsUpdated={() => {}}
      >
        <TestComponent />
      </TutorialProvider>
    );

    expect(loadedSteps.length).toBe(6);
    expect(loadedSteps[0].id).toBe('WELCOME');
    expect(loadedSteps[1].id).toBe('MISSION_ARM');
    expect(loadedSteps[2].id).toBe('MISSION_TAKE_OFF');
    expect(loadedSteps[3].id).toBe('MISSION_LEARN_CONTROLS');
    expect(loadedSteps[4].id).toBe('MISSION_FLY_WAYPOINT');
    expect(loadedSteps[5].id).toBe('MISSION_LAND_DISARM');
  });

  test('2. Verify skipTutorial advances the current step index instead of exiting', () => {
    let skipFn: any;
    let index: number = -1;
    let isActive: boolean = false;

    const TestComponent = () => {
      const { skipTutorial, currentStepIndex, isTutorialActive } = useTutorial();
      skipFn = skipTutorial;
      index = currentStepIndex;
      isActive = isTutorialActive;
      return null;
    };

    render(
      <TutorialProvider
        telemetry={{}}
        stickState={{}}
        orchestrator={{}}
        onCheckpointsUpdated={() => {}}
      >
        <TestComponent />
      </TutorialProvider>
    );

    // Starts at step 0 (Welcome)
    expect(index).toBe(0);
    expect(isActive).toBe(true);

    // Skip the first step inside act()
    act(() => {
      skipFn();
    });

    expect(index).toBe(1);
    expect(isActive).toBe(true);
  });

  test('3. Verify Step 1 (MISSION_ARM) validates only when armed AND motors started', () => {
    let steps: any[] = [];
    const TestComponent = () => {
      const val = useTutorial();
      steps = val.steps;
      return null;
    };

    render(
      <TutorialProvider
        telemetry={{}}
        stickState={{}}
        orchestrator={{}}
        onCheckpointsUpdated={() => {}}
      >
        <TestComponent />
      </TutorialProvider>
    );

    const step1 = steps[1];
    expect(step1.id).toBe('MISSION_ARM');

    // Case A: Not armed -> invalid
    let isValid = step1.validate!({
      telemetry: { isArmed: false },
      stickState: {},
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      stepStartValue: null,
      setStepStartValue: () => {},
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);

    // Case B: Armed but motors not started -> invalid
    isValid = step1.validate!({
      telemetry: { isArmed: true },
      stickState: {},
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      orchestrator: { motorsStarted: false },
      stepStartValue: null,
      setStepStartValue: () => {},
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);

    // Case C: Armed and motors started -> valid!
    isValid = step1.validate!({
      telemetry: { isArmed: true },
      stickState: {},
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      orchestrator: { motorsStarted: true },
      stepStartValue: null,
      setStepStartValue: () => {},
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(true);
  });

  test('4. Verify Step 2 (MISSION_TAKE_OFF) validates only when altitude is reached and hover is maintained', () => {
    let steps: any[] = [];
    const TestComponent = () => {
      const val = useTutorial();
      steps = val.steps;
      return null;
    };

    render(
      <TutorialProvider
        telemetry={{}}
        stickState={{}}
        orchestrator={{}}
        onCheckpointsUpdated={() => {}}
      >
        <TestComponent />
      </TutorialProvider>
    );

    const step2 = steps[2];
    expect(step2.id).toBe('MISSION_TAKE_OFF');

    // Case A: Disarmed -> invalid
    let isValid = step2.validate!({
      telemetry: { isArmed: false, altitude: 0.8 },
      stickState: {},
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 2.5,
      stepStartValue: null,
      setStepStartValue: () => {},
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);

    // Case B: Armed but altitude low -> invalid
    isValid = step2.validate!({
      telemetry: { isArmed: true, altitude: 0.2 },
      stickState: {},
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 2.5,
      stepStartValue: null,
      setStepStartValue: () => {},
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);

    // Case C: Armed, altitude high, but hover time low -> invalid
    isValid = step2.validate!({
      telemetry: { isArmed: true, altitude: 0.8 },
      stickState: {},
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 1.0,
      stepStartValue: null,
      setStepStartValue: () => {},
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);

    // Case D: Armed, altitude high, and hover time achieved -> valid!
    isValid = step2.validate!({
      telemetry: { isArmed: true, altitude: 0.8 },
      stickState: {},
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 2.1,
      stepStartValue: null,
      setStepStartValue: () => {},
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(true);
  });

  test('5. Verify Step 3 (MISSION_LEARN_CONTROLS) validates only when all 4 axes are moved', () => {
    let steps: any[] = [];
    const TestComponent = () => {
      const val = useTutorial();
      steps = val.steps;
      return null;
    };

    render(
      <TutorialProvider
        telemetry={{}}
        stickState={{}}
        orchestrator={{}}
        onCheckpointsUpdated={() => {}}
      >
        <TestComponent />
      </TutorialProvider>
    );

    const step3 = steps[3];
    expect(step3.id).toBe('MISSION_LEARN_CONTROLS');
    expect(step3.validate).toBeDefined();

    let stepStartValue: any = null;
    const setStepStartValue = (val: any) => {
      stepStartValue = val;
    };

    // First call with null start value -> should initialize to false for all axes
    let isValid = step3.validate!({
      telemetry: {},
      stickState: { throttle: 0.5, yaw: 0.0, pitch: 0.0, roll: 0.0 },
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      stepStartValue,
      setStepStartValue,
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);
    expect(stepStartValue).toEqual({ throttle: false, yaw: false, pitch: false, roll: false });

    // Move throttle
    isValid = step3.validate!({
      telemetry: {},
      stickState: { throttle: 0.8, yaw: 0.0, pitch: 0.0, roll: 0.0 },
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      stepStartValue,
      setStepStartValue,
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);
    expect(stepStartValue.throttle).toBe(true);
    expect(stepStartValue.yaw).toBe(false);

    // Move yaw
    isValid = step3.validate!({
      telemetry: {},
      stickState: { throttle: 0.5, yaw: 0.5, pitch: 0.0, roll: 0.0 },
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      stepStartValue,
      setStepStartValue,
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);
    expect(stepStartValue.yaw).toBe(true);

    // Move pitch
    isValid = step3.validate!({
      telemetry: {},
      stickState: { throttle: 0.5, yaw: 0.0, pitch: 0.5, roll: 0.0 },
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      stepStartValue,
      setStepStartValue,
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);
    expect(stepStartValue.pitch).toBe(true);

    // Move roll -> now all 4 axes are tested, should validate!
    isValid = step3.validate!({
      telemetry: {},
      stickState: { throttle: 0.5, yaw: 0.0, pitch: 0.0, roll: 0.5 },
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      stepStartValue,
      setStepStartValue,
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(true);
    expect(stepStartValue.roll).toBe(true);
  });

  test('6. Verify Step 5 (MISSION_LAND_DISARM) validates only when landed and disarmed', () => {
    let steps: any[] = [];
    const TestComponent = () => {
      const val = useTutorial();
      steps = val.steps;
      return null;
    };

    render(
      <TutorialProvider
        telemetry={{}}
        stickState={{}}
        orchestrator={{}}
        onCheckpointsUpdated={() => {}}
      >
        <TestComponent />
      </TutorialProvider>
    );

    const step5 = steps[5];
    expect(step5.id).toBe('MISSION_LAND_DISARM');
    expect(step5.validate).toBeDefined();

    // Case A: Armed and altitude 0.5m -> invalid
    let isValid = step5.validate!({
      telemetry: { isArmed: true, altitude: 0.5 },
      stickState: {},
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      stepStartValue: null,
      setStepStartValue: () => {},
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);

    // Case B: Armed and altitude 0.02m (touchdown, but not disarmed) -> invalid
    isValid = step5.validate!({
      telemetry: { isArmed: true, altitude: 0.02 },
      stickState: {},
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      stepStartValue: null,
      setStepStartValue: () => {},
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(false);

    // Case C: Disarmed and altitude 0.02m -> valid!
    isValid = step5.validate!({
      telemetry: { isArmed: false, altitude: 0.02 },
      stickState: {},
      position: null,
      velocity: null,
      checkpoints: [],
      hoverTime: 0,
      stepStartValue: null,
      setStepStartValue: () => {},
      hasStartedFlipRef: { current: false }
    });
    expect(isValid).toBe(true);
  });
});
