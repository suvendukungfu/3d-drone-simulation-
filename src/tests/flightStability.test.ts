import { expect, test, describe, vi } from 'vitest';
import { SimulatorOrchestrator } from '../utils/drone/SimulatorOrchestrator';
import { useDroneStore } from '../store/useDroneStore';
import * as THREE from 'three';

// Mock the Zustand store hooks to prevent React UI rendering side-effects during headless tests
vi.mock('../store/useDroneStore', () => {
  let storeState = {
    droneInitFailed: false,
    flightEnvironment: 'room',
    activeMissionIndex: 0,
    telemetry: {
      isArmed: false,
      altitude: 0.0,
      flightMode: 'althold',
      flightTime: 0
    },
    notifications: [] as any[],
    addNotification: (text: string, type: string) => {
      storeState.notifications.push({ text, type });
    },
    setDroneInitFailed: (val: boolean) => {
      storeState.droneInitFailed = val;
    },
    setDroneSpawnDiagnostics: () => {}
  };

  const useDroneStoreMock = (selector: any) => {
    if (typeof selector === 'function') {
      return selector(storeState);
    }
    return storeState;
  };

  (useDroneStoreMock as any).getState = () => storeState;
  (useDroneStoreMock as any).setState = (fnOrObj: any) => {
    if (typeof fnOrObj === 'function') {
      storeState = { ...storeState, ...fnOrObj(storeState) };
    } else {
      storeState = { ...storeState, ...fnOrObj };
    }
  };

  return {
    useDroneStore: useDroneStoreMock
  };
});

describe('PlutoX Flight Simulator Control and Stability Integration Tests', () => {
  const syncStoreTelemetry = (orchestrator: SimulatorOrchestrator) => {
    const currentPos = orchestrator.getPhysicsState().position;
    useDroneStore.getState().telemetry.altitude = currentPos.y - 0.05;
    useDroneStore.getState().telemetry.isArmed = orchestrator.getIsArmed();
  };


  test('Takeoff sequence, hover auto-centering, and stabilization', () => {
    const orchestrator = new SimulatorOrchestrator();
    orchestrator.init();

    // 1. Initial State Check (should start disarmed on the pad Y=0.05)
    expect(orchestrator.getIsArmed()).toBe(false);
    expect(orchestrator.getPhysicsState().position.y).toBeCloseTo(0.05, 4);

    // Run update loop for 125 steps (2.08 seconds) to let calibration complete
    const dt = 1.0 / 60.0;
    for (let i = 0; i < 125; i++) {
      orchestrator.update(dt);
    }
    expect((orchestrator as any).isCalibrating).toBe(false);

    // 2. Arming with Space/S
    orchestrator.arm();
    expect(orchestrator.getIsArmed()).toBe(true);

    // Trigger throttle down to start the motors
    (orchestrator.input as any).hasAnalogInput = true;
    (orchestrator.input as any).analogLeft = { x: 0, y: -1.0 };
    orchestrator.update(dt);
    (orchestrator.input as any).clearAnalogInput();

    // Propellers should spin at idle speed (0.08 once calibration is complete), drone stays flat on the pad
    const motorCommandsIdle = orchestrator.getMotorCommands();
    expect(motorCommandsIdle[0]).toBeCloseTo(0.08, 2);
    expect(orchestrator.getPhysicsState().position.y).toBeCloseTo(0.05, 4);

    // 3. Simulating throttle up (holding W)
    (orchestrator.input as any).keys['w'] = true;

    // Run the update loop for 1.2 seconds of climb (72 frames at 60Hz)
    for (let i = 0; i < 72; i++) {
      orchestrator.update(dt);
      const currentPos = orchestrator.getPhysicsState().position;
      const rot = orchestrator.getPhysicsState().quaternion;
      const euler = new THREE.Euler().setFromQuaternion(rot, 'YXZ');
      const rollDeg = euler.z * (180.0 / Math.PI);
      const pitchDeg = euler.x * (180.0 / Math.PI);
      const ctrl = orchestrator.controller;
      const ur = ctrl.lastTorqueCor.z;
      const up = ctrl.lastTorqueCor.x;
      const uy = ctrl.lastTorqueCor.y;
      const mt = ctrl.lastMixedThrottle;
      console.log(`Frame ${i}: Y=${currentPos.y.toFixed(4)}, roll=${rollDeg.toFixed(2)}, pitch=${pitchDeg.toFixed(2)}, mt=${mt.toFixed(3)}, ur=${ur.toFixed(4)}, up=${up.toFixed(4)}, uy=${uy.toFixed(4)}, m0=${orchestrator.getMotorCommands()[0].toFixed(4)}`);
      // Synchronize the mock store state with the physical simulation
      useDroneStore.getState().telemetry.altitude = currentPos.y - 0.05;
      useDroneStore.getState().telemetry.isArmed = orchestrator.getIsArmed();
    }

    // Drone should have cleanly taken off
    expect(orchestrator.getPhysicsState().position.y).toBeGreaterThan(0.08);
    
    // Release throttle stick (simulate releasing 'w', throttle centers to 0.50 hover)
    (orchestrator.input as any).keys['w'] = false;

    // Run for another 2.5 seconds to let hover stabilization settle
    for (let i = 0; i < 150; i++) {
      orchestrator.update(dt);
      const currentPos = orchestrator.getPhysicsState().position;
      useDroneStore.getState().telemetry.altitude = currentPos.y - 0.05;
      useDroneStore.getState().telemetry.isArmed = orchestrator.getIsArmed();
    }

    // Verify hover altitude hold is holding height and is perfectly stable (no crash/wobble)
    const finalPos = orchestrator.getPhysicsState().position;
    const finalVel = orchestrator.getPhysicsState().velocity;
    const finalRot = orchestrator.getPhysicsState().quaternion;
    const warnings = orchestrator.getWarnings();

    const finalEuler = new THREE.Euler().setFromQuaternion(finalRot, 'YXZ');
    console.log(`Final hover state: Y=${finalPos.y.toFixed(4)}, Pos=(${finalPos.x.toFixed(4)}, ${finalPos.y.toFixed(4)}, ${finalPos.z.toFixed(4)}), Vel=(${finalVel.x.toFixed(4)}, ${finalVel.y.toFixed(4)}, ${finalVel.z.toFixed(4)}), Euler=(${(finalEuler.z * 180 / Math.PI).toFixed(2)}, ${(finalEuler.x * 180 / Math.PI).toFixed(2)}, ${(finalEuler.y * 180 / Math.PI).toFixed(2)})`);

    expect(finalPos.y).toBeGreaterThan(0.15); // hovering high
    expect(finalVel.length()).toBeLessThan(0.6); // speed stabilized
    expect(Math.abs(finalRot.x)).toBeLessThan(0.05); // pitch deviation close to 0
    expect(Math.abs(finalRot.z)).toBeLessThan(0.05); // roll deviation close to 0
    expect(warnings).not.toContain('CRASH DETECTED');

    // 4. Test Flip Mode
    orchestrator.toggleFlipArmed();
    
    // Pushing pitch stick forward to trigger flip
    (orchestrator.input as any).keys['arrowup'] = true;
    // Allow slew rate to reach triggering threshold
    for (let i = 0; i < 20; i++) {
      orchestrator.update(dt);
      if ((orchestrator as any).isFlipping) {
        break;
      }
    }
    (orchestrator.input as any).keys['arrowup'] = false;
    
    // Check that flipping has engaged
    expect((orchestrator as any).isFlipping).toBe(true);
    expect((orchestrator as any).flipType).toBe('front');
    
    // Run until flip finishes (0.45 seconds = 27 frames)
    for (let i = 0; i < 30; i++) {
      orchestrator.update(dt);
    }
    
    // Flip should have finished and recovered
    expect((orchestrator as any).isFlipping).toBe(false);
    expect(orchestrator.getWarnings()).not.toContain('CRASH DETECTED');

    orchestrator.destroy();
  });

  test('Forward pitch input moves the closed simulator drone forward', () => {
    const orchestrator = new SimulatorOrchestrator();
    orchestrator.init();

    const dt = 1.0 / 60.0;
    for (let i = 0; i < 125; i++) {
      orchestrator.update(dt);
      syncStoreTelemetry(orchestrator);
    }

    orchestrator.arm();
    orchestrator.triggerAutoTakeoff();

    for (let i = 0; i < 180; i++) {
      orchestrator.update(dt);
      syncStoreTelemetry(orchestrator);
    }

    expect(orchestrator.getHasTakenOff()).toBe(true);
    const baselineZ = orchestrator.getPhysicsState().position.z;

    orchestrator.input.setAnalogStickValues(0, 0, 0, 1);
    for (let i = 0; i < 90; i++) {
      orchestrator.update(dt);
      syncStoreTelemetry(orchestrator);
    }
    orchestrator.input.clearAnalogInput();

    expect(orchestrator.getPhysicsState().position.z).toBeGreaterThan(baselineZ + 0.1);
    expect(orchestrator.getWarnings()).not.toContain('CRASH DETECTED');

    orchestrator.destroy();
  });

  test('Low-speed and high-speed collision physics and notifications', () => {
    const orchestrator = new SimulatorOrchestrator();
    orchestrator.init();

    // Fast-forward calibration
    const dt = 1.0 / 60.0;
    for (let i = 0; i < 125; i++) {
      orchestrator.update(dt);
    }
    
    // Arm the drone
    orchestrator.arm();
    orchestrator.update(dt);
    expect(orchestrator.getIsArmed()).toBe(true);

    // Mock store's addNotification function to track notifications
    const triggeredNotifications: { text: string; type: string }[] = [];
    const mockStore = useDroneStore.getState() as any;
    mockStore.addNotification = (text: string, type: string) => {
      triggeredNotifications.push({ text, type });
    };
    mockStore.notifications = [];

    // Force takeoff to allow proximity alerts and normal flights
    (orchestrator as any).hasTakenOff = true;
    useDroneStore.setState({ flightEnvironment: 'lab' });

    // --- TEST 1: Stage 2 - Light contact (< 1.5 m/s) with Bench A ---
    let physState = orchestrator.getPhysicsState();
    physState.position.set(-2.18, 0.5, -3.5);
    physState.velocity.set(-1.0, 0, 0);

    orchestrator.update(dt);
    physState = orchestrator.getPhysicsState();

    expect(physState.velocity.x).toBeGreaterThan(0); // Bounced
    expect(orchestrator.getIsArmed()).toBe(true); // Stays armed
    expect(triggeredNotifications.some(n => n.text === 'CAUTION: OBSTACLE CONTACT' && n.type === 'warning')).toBe(true);

    triggeredNotifications.length = 0;

    // --- TEST 2: Stage 3 - Moderate impact (1.5 - 4.0 m/s) ---
    physState = orchestrator.getPhysicsState();
    physState.position.set(-2.18, 0.5, -3.5);
    physState.velocity.set(-2.5, 0, 0);

    orchestrator.update(dt);
    expect(orchestrator.getIsArmed()).toBe(true); // Stays armed
    expect((orchestrator as any).recoveryTimer).toBeGreaterThan(0); // Wobble active
    expect(triggeredNotifications.some(n => n.text === 'WARNING: IMPACT DETECTED' && n.type === 'orange')).toBe(true);

    triggeredNotifications.length = 0;

    // --- TEST 3: Stage 4 - Major impact (4.0 - 6.0 m/s) ---
    physState = orchestrator.getPhysicsState();
    physState.position.set(-2.18, 0.5, -3.5);
    physState.velocity.set(-5.0, 0, 0);

    orchestrator.update(dt);
    expect(orchestrator.getIsArmed()).toBe(true); // Stays armed (Stage 4 is critical but recovery attempted)
    expect((orchestrator as any).destabilizeTimer).toBeGreaterThan(0); // Large wobble/drift active
    expect(triggeredNotifications.some(n => n.text === 'CRITICAL IMPACT' && n.type === 'error')).toBe(true);

    triggeredNotifications.length = 0;

    // --- TEST 4: Stage 5 - Crash Event (> 6.0 m/s) ---
    physState = orchestrator.getPhysicsState();
    physState.position.set(-2.18, 0.5, -3.5);
    physState.velocity.set(-7.0, 0, 0);

    orchestrator.update(dt);
    expect(orchestrator.getIsArmed()).toBe(false); // Disarmed!
    expect(triggeredNotifications.some(n => n.text === 'CRASH DETECTED' && n.type === 'error')).toBe(true);
    expect(triggeredNotifications.some(n => n.text === 'MOTORS DISARMED' && n.type === 'info')).toBe(true);
    expect(triggeredNotifications.some(n => n.text === 'RESET SIM' && n.type === 'warning')).toBe(true);
    expect(triggeredNotifications.some(n => n.text === 'RE-ARM DRONE' && n.type === 'warning')).toBe(true);
    expect(orchestrator.getWarnings()).toContain('RESET SIM');
    expect(orchestrator.getWarnings()).toContain('RE-ARM DRONE');

    triggeredNotifications.length = 0;

    // --- TEST 5: Stage 1 - Raycast Proximity Warnings ---
    orchestrator.arm();
    (orchestrator as any).hasTakenOff = true;
    orchestrator.update(dt);
    
    // Position drone 0.35m away from Bench A (radius = 0.08, so center = -2.25 + 0.08 + 0.35 = -1.82)
    physState = orchestrator.getPhysicsState();
    physState.position.set(-1.82, 0.5, -3.5);
    physState.velocity.set(0, 0, 0);
    orchestrator.update(dt);
    expect(triggeredNotifications.some(n => n.text === 'CAUTION: OBSTACLE AHEAD' && n.type === 'warning')).toBe(true);

    triggeredNotifications.length = 0;

    // Position drone 0.15m away (center = -2.25 + 0.08 + 0.15 = -2.02)
    physState = orchestrator.getPhysicsState();
    physState.position.set(-2.02, 0.5, -3.5);
    orchestrator.update(dt);
    expect(triggeredNotifications.some(n => n.text === 'WARNING: CLOSE PROXIMITY' && n.type === 'orange')).toBe(true);

    triggeredNotifications.length = 0;

    // --- TEST 6: Ground Impact System ---
    // Safe landing: downward speed < 0.5 m/s, throttle low
    (orchestrator.input as any).stick.throttle = 0.0;
    physState = orchestrator.getPhysicsState();
    physState.position.set(0, 0.05, 0);
    physState.velocity.set(0, -0.2, 0);
    orchestrator.update(dt);
    expect(orchestrator.getIsArmed()).toBe(true); // stays armed
    expect((orchestrator as any).hasTakenOff).toBe(false); // not flying (idle)
    expect(triggeredNotifications.some(n => n.text === 'SAFE LANDING' && n.type === 'success')).toBe(true);

    triggeredNotifications.length = 0;

    // Hard landing: downward speed 0.5 - 1.5 m/s
    orchestrator.arm();
    (orchestrator as any).hasTakenOff = true;
    physState = orchestrator.getPhysicsState();
    physState.position.set(0, 0.05, 0);
    physState.velocity.set(0, -0.8, 0);
    (orchestrator.input as any).stick.throttle = 0.0;
    orchestrator.update(dt);
    expect(orchestrator.getIsArmed()).toBe(true); // stays armed
    expect((orchestrator as any).hasTakenOff).toBe(false); // not flying (idle)
    expect(triggeredNotifications.some(n => n.text === 'HARD LANDING' && n.type === 'warning')).toBe(true);

    triggeredNotifications.length = 0;

    // Crash landing: downward speed > 1.5 m/s
    orchestrator.arm();
    (orchestrator as any).hasTakenOff = true;
    physState = orchestrator.getPhysicsState();
    physState.position.set(0, 0.05, 0);
    physState.velocity.set(0, -2.0, 0);
    orchestrator.update(dt);
    expect(orchestrator.getIsArmed()).toBe(false); // disarms
    expect(triggeredNotifications.some(n => n.text === 'CRASH LANDING' && n.type === 'error')).toBe(true);
    expect(triggeredNotifications.some(n => n.text === 'RESET SIM' && n.type === 'warning')).toBe(true);
    expect(triggeredNotifications.some(n => n.text === 'RE-ARM DRONE' && n.type === 'warning')).toBe(true);
    expect(orchestrator.getWarnings()).toContain('RESET SIM');
    expect(orchestrator.getWarnings()).toContain('RE-ARM DRONE');

    orchestrator.destroy();
  });

  test('Rotated box collision and low-speed resting stabilization', () => {
    const orchestrator = new SimulatorOrchestrator();
    orchestrator.init();

    // Fast-forward calibration
    const dt = 1.0 / 60.0;
    for (let i = 0; i < 125; i++) {
      orchestrator.update(dt);
    }
    
    // Set environment to 'course' for rotated arches
    const mockStore = useDroneStore.getState() as any;
    mockStore.flightEnvironment = 'course';
    mockStore.activeMissionIndex = 9;

    // Arch 2 is at [-2.5, 0, -1.0] rotated by Math.PI / 4
    // Let's place the drone near Arch 2 Left Pillar (world center x = -3.2778, z = -0.2221)
    let physState = orchestrator.getPhysicsState();
    physState.position.set(-3.23, 0.5, -0.22);
    physState.velocity.set(-1.0, 0, 0);

    orchestrator.update(dt);
    physState = orchestrator.getPhysicsState();

    // Collision should be detected
    expect(orchestrator.physics.lastCollision).not.toBeNull();
    expect(orchestrator.physics.lastCollision?.collided).toBe(true);

    // --- TEST 2: Low-speed resting stabilization on desk ---
    mockStore.flightEnvironment = 'lab';
    
    // Bench A is at [-3.5, 0.5, -3.5] with size [2.5, 1.0, 1.2].
    // Top face is at y = 1.0.
    physState.position.set(-3.5, 1.02, -3.5);
    physState.velocity.set(0, -0.1, 0);
    physState.quaternion.setFromEuler(new THREE.Euler(0.2, 0.1, 0.3));
    physState.angularVelocity.set(1.0, 2.0, 3.0);

    // Run physics step
    orchestrator.update(dt);
    physState = orchestrator.getPhysicsState();

    // Drone should be stabilized on the top face
    expect(physState.position.y).toBeCloseTo(1.08, 4); // 1.0 + radius (0.08) = 1.08
    expect(physState.velocity.y).toBeCloseTo(0, 4);
    
    // Pitch/roll should be zeroed
    const euler = new THREE.Euler().setFromQuaternion(physState.quaternion);
    expect(euler.x).toBeCloseTo(0, 4);
    expect(euler.z).toBeCloseTo(0, 4);
    expect(physState.angularVelocity.x).toBe(0);
    expect(physState.angularVelocity.z).toBe(0);

    orchestrator.destroy();
  });

  test('Closed simulation startup workflow (ARMED -> MOTOR IDLE -> TAKEOFF)', () => {
    const orchestrator = new SimulatorOrchestrator();
    orchestrator.init();

    // Set flightEnvironment to a closed environment and reset mock store state
    const mockStore = useDroneStore.getState() as any;
    mockStore.flightEnvironment = 'room';
    mockStore.telemetry.altitude = 0.0;
    mockStore.telemetry.isArmed = false;

    // Fast-forward calibration
    const dt = 1.0 / 60.0;
    for (let i = 0; i < 125; i++) {
      orchestrator.update(dt);
    }

    // 1. DISARMED: Initial State Check (should start disarmed on the pad Y=0.05)
    expect(orchestrator.getIsArmed()).toBe(false);
    expect(orchestrator.getMotorCommands()).toEqual([0, 0, 0, 0]);

    // 2. ARMED + MOTOR IDLE: Arm the drone
    orchestrator.arm();
    expect(orchestrator.getIsArmed()).toBe(true);
    expect((orchestrator as any).motorsStarted).toBe(false);

    // Trigger throttle down to start the motors
    (orchestrator.input as any).hasAnalogInput = true;
    (orchestrator.input as any).analogLeft = { x: 0, y: -1.0 };
    orchestrator.update(dt);
    (orchestrator.input as any).clearAnalogInput();
    expect((orchestrator as any).motorsStarted).toBe(true);

    // Motor commands must immediately spin at idle (0.08) on the ground when throttle is 0
    expect(orchestrator.getMotorCommands()[0]).toBeCloseTo(0.08, 2);
    expect(orchestrator.getPhysicsState().position.y).toBeCloseTo(0.05, 4);

    // 3. MANUAL TAKEOFF: Simulate pressing 'w' to throttle up. With improved keyboard response, 
    // it quickly passes the 15% takeoff threshold.
    (orchestrator.input as any).keys['w'] = true;
    orchestrator.update(dt);

    // The motor command increases immediately as takeoff initiates
    expect(orchestrator.getMotorCommands()[0]).toBeGreaterThan(0.08);
    expect(orchestrator.getPhysicsState().position.y).toBeGreaterThanOrEqual(0.05);

    // 4. CLIMB: Run more steps so the drone climbs
    for (let i = 0; i < 20; i++) {
      orchestrator.update(dt);
    }
    
    // The drone should have lifted off/started climbing
    expect(orchestrator.getPhysicsState().position.y).toBeGreaterThan(0.05);

    orchestrator.destroy();
  });

  test('Closed simulation keyboard auto-takeoff (t key)', () => {
    const orchestrator = new SimulatorOrchestrator();
    orchestrator.init();

    // Set flightEnvironment to a closed environment
    const mockStore = useDroneStore.getState() as any;
    mockStore.flightEnvironment = 'room';

    // Fast-forward calibration
    const dt = 1.0 / 60.0;
    for (let i = 0; i < 125; i++) {
      orchestrator.update(dt);
    }

    // Arm the drone first
    orchestrator.arm();
    expect(orchestrator.getIsArmed()).toBe(true);

    // Trigger auto-takeoff
    orchestrator.triggerAutoTakeoff();
    expect((orchestrator as any).isAutoTakeoffActive).toBe(true);

    // Run updates until takeoff completes
    // The drone climbs to 0.18m (target altitude relative to ground minY=0.05, so position.y ~ 0.23m)
    let steps = 0;
    while ((orchestrator as any).isAutoTakeoffActive && steps < 300) {
      orchestrator.update(dt);
      
      // Update mock altitude for the auto takeoff checks if necessary
      const currentPos = orchestrator.getPhysicsState().position;
      const isArmed = orchestrator.getIsArmed();
      const motorsStarted = (orchestrator as any).motorsStarted;
      const hasTakenOff = (orchestrator as any).hasTakenOff;
      const commands = orchestrator.getMotorCommands();
      console.log(`Step ${steps}: y=${currentPos.y.toFixed(4)}, hasTakenOff=${hasTakenOff}, motorsStarted=${motorsStarted}, isArmed=${isArmed}, commands=${commands.map(c => c.toFixed(2)).join(',')}`);
      useDroneStore.getState().telemetry.altitude = currentPos.y - 0.05;
      steps++;
    }

    // Auto-takeoff should be complete and active state returned to false
    expect((orchestrator as any).isAutoTakeoffActive).toBe(false);
    expect(orchestrator.getPhysicsState().position.y).toBeCloseTo(0.23, 1);

    orchestrator.destroy();
  });
});
