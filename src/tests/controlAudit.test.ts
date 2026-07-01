/**
 * PlutoX Drone Control Audit
 * 
 * Real PlutoX controller convention (Mode 2):
 *   Left stick:  Y = Throttle (up=climb), X = Yaw (right=CW rotation when viewed from above)
 *   Right stick: Y = Pitch (up=forward), X = Roll (right=bank right & fly right)
 *
 * Three.js coordinate system:
 *   +X = Right,  +Y = Up,  +Z = Forward (drone's nose points toward +Z)
 *
 * Expected behavior:
 *   1. stick.pitch = +1 (push up) → drone tilts nose down → flies FORWARD (+Z)
 *   2. stick.roll  = +1 (push right) → drone banks right → flies RIGHT (+X)
 *   3. stick.yaw   = +1 (push right) → drone rotates CW → heading decreases
 *   4. stick.throttle = 1.0 → drone climbs (+Y)
 */

import { describe, test, expect, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../store/useDroneStore', () => {
  let storeState = {
    droneInitFailed: false,
    flightEnvironment: 'room',
    activeMissionIndex: 0,
    telemetry: {
      isArmed: false,
      altitude: 0.0,
      heading: 0,
      flightMode: 'althold',
      flightTime: 0,
      rollAngle: 0,
      pitchAngle: 0,
    },
    headFree: false,
    gyroPilot: false,
    gyroSensitivity: 1.2,
    modelDiagnostics: null,
    spawnDebugMode: false,
    showControlsOverlay: false,
    notifications: [] as any[],
    addNotification: (text: string, type: string) => {
      storeState.notifications.push({ text, type });
    },
    setDroneInitFailed: (val: boolean) => {
      storeState.droneInitFailed = val;
    },
    setDroneSpawnDiagnostics: () => {},
    toggleSpawnDebugMode: () => {},
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

import { SimulatorOrchestrator } from '../utils/drone/SimulatorOrchestrator';
import { useDroneStore } from '../store/useDroneStore';

const syncStore = (orch: SimulatorOrchestrator) => {
  const pos = orch.getPhysicsState().position;
  useDroneStore.getState().telemetry.altitude = pos.y - 0.05;
  useDroneStore.getState().telemetry.isArmed = orch.getIsArmed();
};

function takeoffAndHover(orch: SimulatorOrchestrator, dt = 1/60) {
  for (let i = 0; i < 125; i++) { orch.update(dt); syncStore(orch); }
  orch.arm();
  orch.triggerAutoTakeoff();
  for (let i = 0; i < 200; i++) { orch.update(dt); syncStore(orch); }
}

describe('PlutoX Real-World Control Mapping Audit', () => {
  const dt = 1/60;

  test('PITCH: Right stick UP → drone flies FORWARD (+Z)', () => {
    const orch = new SimulatorOrchestrator(); orch.init();
    takeoffAndHover(orch, dt);
    expect(orch.getHasTakenOff()).toBe(true);

    const baseZ = orch.getPhysicsState().position.z;
    orch.input.setAnalogStickValues(0, 0, 0, 1);
    for (let i = 0; i < 120; i++) { orch.update(dt); syncStore(orch); }
    orch.input.clearAnalogInput();

    const finalZ = orch.getPhysicsState().position.z;
    console.log(`PITCH TEST: baseZ=${baseZ.toFixed(4)}, finalZ=${finalZ.toFixed(4)}, delta=${(finalZ-baseZ).toFixed(4)}`);
    expect(finalZ).toBeGreaterThan(baseZ + 0.05);
    orch.destroy();
  });

  test('ROLL: Right stick RIGHT → drone flies RIGHT (+X)', () => {
    const orch = new SimulatorOrchestrator(); orch.init();
    takeoffAndHover(orch, dt);
    expect(orch.getHasTakenOff()).toBe(true);

    const baseX = orch.getPhysicsState().position.x;
    orch.input.setAnalogStickValues(0, 0, 1, 0);
    for (let i = 0; i < 120; i++) { orch.update(dt); syncStore(orch); }
    orch.input.clearAnalogInput();

    const finalX = orch.getPhysicsState().position.x;
    console.log(`ROLL TEST: baseX=${baseX.toFixed(4)}, finalX=${finalX.toFixed(4)}, delta=${(finalX-baseX).toFixed(4)}`);
    expect(finalX).toBeGreaterThan(baseX + 0.05);
    orch.destroy();
  });

  test('YAW: Left stick RIGHT → drone rotates CW (negative Y rotation)', () => {
    const orch = new SimulatorOrchestrator(); orch.init();
    takeoffAndHover(orch, dt);

    const euler0 = new THREE.Euler().setFromQuaternion(orch.getPhysicsState().quaternion, 'YXZ');
    const heading0 = euler0.y;

    orch.input.setAnalogStickValues(1, 0, 0, 0);
    for (let i = 0; i < 120; i++) { orch.update(dt); syncStore(orch); }
    orch.input.clearAnalogInput();

    const euler1 = new THREE.Euler().setFromQuaternion(orch.getPhysicsState().quaternion, 'YXZ');
    const heading1 = euler1.y;

    console.log(`YAW TEST: heading0=${(heading0*180/Math.PI).toFixed(2)}, heading1=${(heading1*180/Math.PI).toFixed(2)}, delta=${((heading1-heading0)*180/Math.PI).toFixed(2)}`);
    // CW rotation from above = negative Y rotation in Three.js
    expect(heading1).toBeLessThan(heading0 - 0.05);
    orch.destroy();
  });

  test('THROTTLE: Left stick UP → drone climbs (+Y)', () => {
    const orch = new SimulatorOrchestrator(); orch.init();
    takeoffAndHover(orch, dt);

    const baseY = orch.getPhysicsState().position.y;
    orch.input.setAnalogStickValues(0, 1, 0, 0);
    for (let i = 0; i < 60; i++) { orch.update(dt); syncStore(orch); }
    orch.input.clearAnalogInput();

    const finalY = orch.getPhysicsState().position.y;
    console.log(`THROTTLE TEST: baseY=${baseY.toFixed(4)}, finalY=${finalY.toFixed(4)}, delta=${(finalY-baseY).toFixed(4)}`);
    expect(finalY).toBeGreaterThan(baseY + 0.1);
    orch.destroy();
  });

  test('THROTTLE: Left stick DOWN → drone descends (-Y)', () => {
    const orch = new SimulatorOrchestrator(); orch.init();
    takeoffAndHover(orch, dt);

    const baseY = orch.getPhysicsState().position.y;
    // Left stick Y=-1 (push down = descend)
    orch.input.setAnalogStickValues(0, -1, 0, 0);
    for (let i = 0; i < 60; i++) { orch.update(dt); syncStore(orch); }
    orch.input.clearAnalogInput();

    const finalY = orch.getPhysicsState().position.y;
    console.log(`THROTTLE DOWN TEST: baseY=${baseY.toFixed(4)}, finalY=${finalY.toFixed(4)}, delta=${(finalY-baseY).toFixed(4)}`);
    expect(finalY).toBeLessThan(baseY - 0.1);
    orch.destroy();
  });
});
