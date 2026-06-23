import { expect, test, describe, vi } from 'vitest';
import { SimulatorOrchestrator } from '../utils/drone/SimulatorOrchestrator';
import { useDroneStore } from '../store/useDroneStore';
import * as THREE from 'three';

// Mock the Zustand store hooks to prevent React UI rendering side-effects during headless tests
vi.mock('../../store/useDroneStore', () => {
  const storeState = {
    droneInitFailed: false,
    flightEnvironment: 'room',
    activeMissionIndex: 0,
    telemetry: {
      isArmed: false,
      altitude: 0.0,
      flightMode: 'althold',
      flightTime: 0
    },
    addNotification: () => {}
  };
  return {
    useDroneStore: {
      getState: () => storeState
    }
  };
});

describe('PlutoX Flight Simulator Control and Stability Integration Tests', () => {


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

    // Run one update step to propagate the arm state to motor commands
    orchestrator.update(dt);

    // Propellers should spin at idle speed (0.10 once calibration is complete), drone stays flat on the pad
    const motorCommandsIdle = orchestrator.getMotorCommands();
    expect(motorCommandsIdle[0]).toBe(0.10);
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
});
