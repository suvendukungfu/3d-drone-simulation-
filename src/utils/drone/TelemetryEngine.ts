import * as THREE from 'three';
import { RigidBodyState, TelemetryData } from './types';
import { BatteryModel } from './BatteryModel';

export class TelemetryEngine {
  // ── Battery model (replaces simple linear drain) ──────────────────────────
  private batteryModel = new BatteryModel();

  // ── Flight timing ────────────────────────────────────────────────────────
  private flightTime = 0.0;

  // ── Compass calibration offset ───────────────────────────────────────────
  private yawOffset = 0.0;

  // ── Link Quality simulation (RSSI-like 0–100) ─────────────────────────────
  // Degrades stochastically when altitude > 8m or speed > 3 m/s
  private linkQuality = 100;
  private linkNoiseTime = 0;

  // ── GPS lock simulation ───────────────────────────────────────────────────
  // Satellites locked increase from 0 → 8 over first 20 s of session.
  private gpsSatsLocked = 0;
  private gpsTimer = 0;

  constructor() {}

  public reset(): void {
    this.batteryModel.reset();
    this.flightTime = 0.0;
    this.yawOffset = 0.0;
    this.linkQuality = 100;
    this.linkNoiseTime = 0;
    this.gpsSatsLocked = 0;
    this.gpsTimer = 0;
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
    flightMode: 'stabilize' | 'althold' | 'failsafe' | 'disarmed' | 'armed_idle',
    dt: number
  ): TelemetryData {
    // 1. Flight time increments when armed
    if (isArmed && !calibrationActive) {
      this.flightTime += dt;
    }

    // 2. Physics-accurate battery drain via LiPo OCV/SoC model
    const batterySnapshot = this.batteryModel.update(motorCommands, isArmed && !calibrationActive, dt);

    // 3. GPS satellite acquisition (simulates cold-start lock)
    this.gpsTimer += dt;
    if (this.gpsSatsLocked < 8) {
      this.gpsSatsLocked = Math.min(8, Math.floor(this.gpsTimer / 2.5));
    }

    // 4. Link quality simulation — mild stochastic noise
    this.linkNoiseTime += dt;
    const altitudePenalty = Math.max(0, (state.position.y - 8) * 2.0);
    const speedPenalty = Math.max(0, (new THREE.Vector3(state.velocity.x, 0, state.velocity.z).length() - 3) * 3.0);
    const baseLink = Math.max(60, 100 - altitudePenalty - speedPenalty);
    const linkNoise = Math.sin(this.linkNoiseTime * 3.7) * 3 + Math.sin(this.linkNoiseTime * 11.3) * 2;
    this.linkQuality = Math.round(Math.max(60, Math.min(100, baseLink + linkNoise)));
    
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
      altitude: state.position.y - 0.05, // adjust for bottom offset
      verticalSpeed,
      speed,
      pitch: pitchDeg,
      roll: rollDeg,
      yaw: yawDeg,
      heading,
      motorRPMs: rpms,
      battery: batterySnapshot.percentage,
      batteryVoltage: batterySnapshot.voltage,
      batteryCurrent: batterySnapshot.currentA,
      batteryMahUsed: batterySnapshot.mAhUsed,
      isBatteryCritical: batterySnapshot.isCritical,
      flightTime: Math.round(this.flightTime),
      sensorError,
      calibrationActive,
      linkQuality: this.linkQuality,
      gpsSatsLocked: this.gpsSatsLocked,
    };
  }
  
  /** Returns battery percentage (0–100) for orchestrator failsafe checks. */
  public getBattery(): number {
    return this.batteryModel.getPercentage();
  }

  /** Returns motor thrust derate factor [0.7–1.0] due to voltage sag. */
  public getThrustDerateFactor(): number {
    return this.batteryModel.getThrustDerateFactor();
  }
}
