import * as THREE from 'three';
import { RigidBodyState, TelemetryData } from './types';

export class TelemetryEngine {
  private batteryPct = 100.0;
  private flightTime = 0.0;
  private maxFlightDuration = 480.0; // 8 minutes max flight time
  private yawOffset = 0.0;
  
  constructor() {}
  
  public reset(): void {
    this.batteryPct = 100.0;
    this.flightTime = 0.0;
    this.yawOffset = 0.0;
  }
  
  public setYawOffset(offset: number): void {
    this.yawOffset = offset;
  }
  
  public update(
    state: RigidBodyState,
    motorCommands: number[],
    isArmed: boolean,
    sensorError: boolean,
    calibrationActive: boolean,
    flightMode: 'stabilize' | 'althold' | 'failsafe',
    dt: number
  ): TelemetryData {
    // 1. Flight time increments when armed
    if (isArmed && !calibrationActive) {
      this.flightTime += dt;
      
      // 2. Battery drainage: idle draw is small, full motor draw is large
      const totalMotorLoad = motorCommands.reduce((sum, val) => sum + val, 0); // 0 to 4
      const baseConsumptionRate = 100.0 / this.maxFlightDuration; // ~0.208% per sec at average load
      const currentConsumption = baseConsumptionRate * (0.15 + 0.85 * (totalMotorLoad / 4.0));
      
      this.batteryPct = Math.max(0.0, this.batteryPct - currentConsumption * dt);
    }
    
    // 3. Compute pitch, roll, yaw (in degrees) from quaternion
    const euler = new THREE.Euler().setFromQuaternion(state.quaternion, 'YXZ');
    
    // Convert Euler to degrees
    const pitchDeg = euler.x * (180.0 / Math.PI);
    const yawDeg = euler.y * (180.0 / Math.PI);
    const rollDeg = euler.z * (180.0 / Math.PI);
    
    // Heading: 0 to 360 degrees. 0 = North, 90 = East, 180 = South, 270 = West.
    // In Three.js, +Z is Forward (let's treat +Z as North).
    // Let's compute yaw angle relative to +Z.
    let heading = -yawDeg - this.yawOffset;
    while (heading < 0) heading += 360;
    while (heading >= 360) heading -= 360;
    
    // 4. Velocities
    const speed = new THREE.Vector3(state.velocity.x, 0, state.velocity.z).length();
    const verticalSpeed = state.velocity.y;
    
    // 5. Motor RPMs (simulate realistic brushless motors)
    // Idle at 15000 RPM, max at 50000 RPM
    const rpms: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      if (isArmed) {
        const baseRPM = 15000 + motorCommands[i] * 33000;
        // Add high frequency electrical flutter noise
        const flutter = (Math.random() - 0.5) * 450;
        rpms[i] = Math.round(baseRPM + flutter);
      } else {
        rpms[i] = 0;
      }
    }
    
    return {
      isArmed,
      flightMode,
      altitude: state.position.y - 0.02, // adjust for bottom offset
      verticalSpeed,
      speed,
      pitch: pitchDeg,
      roll: rollDeg,
      yaw: yawDeg,
      heading,
      motorRPMs: rpms,
      battery: Math.round(this.batteryPct),
      flightTime: Math.round(this.flightTime),
      sensorError,
      calibrationActive
    };
  }
  
  public getBattery(): number {
    return this.batteryPct;
  }
}
