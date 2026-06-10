import * as THREE from 'three';
import { PIDGains, PIDControllerState, FlightControlStick, DroneSensorData } from './types';

export class FlightController {
  // PID Gains — tuned for stable, beginner-friendly PlutoX flight
  public rollAngleGains: PIDGains = { kp: 3.0, ki: 0.0, kd: 0.0, iMax: 0.0, dFilterHz: 0.0 };
  public pitchAngleGains: PIDGains = { kp: 3.0, ki: 0.0, kd: 0.0, iMax: 0.0, dFilterHz: 0.0 };
  
  public rollRateGains: PIDGains = { kp: 0.045, ki: 0.025, kd: 0.008, iMax: 0.3, dFilterHz: 25 };
  public pitchRateGains: PIDGains = { kp: 0.045, ki: 0.025, kd: 0.008, iMax: 0.3, dFilterHz: 25 };
  public yawRateGains: PIDGains = { kp: 0.12, ki: 0.04, kd: 0.003, iMax: 0.3, dFilterHz: 25 };
  
  public altitudeGains: PIDGains = { kp: 1.2, ki: 0.0, kd: 0.0, iMax: 0.0, dFilterHz: 0.0 };
  public climbRateGains: PIDGains = { kp: 0.18, ki: 0.08, kd: 0.012, iMax: 0.3, dFilterHz: 15 };
  
  // Controller States
  private rateState: PIDControllerState = {
    integral: new THREE.Vector3(0, 0, 0),
    prevError: new THREE.Vector3(0, 0, 0),
    prevDerivative: new THREE.Vector3(0, 0, 0)
  };
  
  private climbState = {
    integral: 0,
    prevError: 0,
    prevDerivative: 0
  };
  
  // Altitude hold tracker
  public isAltHoldActive = false;
  private lockedAltitude = 0.0;
  
  // Low-pass filter variables
  private filteredAltitude = 0.0;
  private isAltInitialized = false;
  private filteredClimbRate = 0.0;
  private smoothedRoll = 0.0;
  private smoothedPitch = 0.0;
  private smoothedYaw = 0.0;
  
  // Base hover throttle feedforward (corresponds to mass * gravity / maxTotalThrust)
  // mass = 0.055, gravity = 9.81, maxTotalThrust = 1.20 -> hover throttle ~ 0.45
  private hoverThrottleFeedforward = 0.45;
  
  constructor() {}
  
  public reset(): void {
    this.rateState = {
      integral: new THREE.Vector3(0, 0, 0),
      prevError: new THREE.Vector3(0, 0, 0),
      prevDerivative: new THREE.Vector3(0, 0, 0)
    };
    
    this.climbState = {
      integral: 0,
      prevError: 0,
      prevDerivative: 0
    };
    
    this.isAltHoldActive = false;
    this.lockedAltitude = 0.0;
    this.filteredAltitude = 0.0;
    this.isAltInitialized = false;
    this.filteredClimbRate = 0.0;
    this.smoothedRoll = 0.0;
    this.smoothedPitch = 0.0;
    this.smoothedYaw = 0.0;
  }
  
  // Apply PID calculations to compute motor outputs [m1, m2, m3, m4]
  public update(
    stick: FlightControlStick,
    sensorData: DroneSensorData,
    estAttitude: THREE.Euler, // Estimated Roll, Pitch, Yaw from sensors (radians)
    estVelocity: THREE.Vector3, // Estimated velocity (m/s)
    dt: number
  ): number[] {
    // Apply Low-pass filtering to barometer altitude
    if (!this.isAltInitialized) {
      this.filteredAltitude = sensorData.baroAltitude;
      this.isAltInitialized = true;
    } else {
      const altFilterAlpha = dt / (dt + 1.0 / (2.0 * Math.PI * 5.0)); // 5Hz filter
      this.filteredAltitude += altFilterAlpha * (sensorData.baroAltitude - this.filteredAltitude);
    }

    // Apply Low-pass filtering to vertical velocity feedback
    const climbFilterAlpha = dt / (dt + 1.0 / (2.0 * Math.PI * 10.0)); // 10Hz filter
    this.filteredClimbRate += climbFilterAlpha * (estVelocity.y - this.filteredClimbRate);

    // Smooth stick inputs (10Hz LPF)
    const stickFilterAlpha = dt / (dt + 1.0 / (2.0 * Math.PI * 10.0));
    this.smoothedRoll += stickFilterAlpha * (stick.roll - this.smoothedRoll);
    this.smoothedPitch += stickFilterAlpha * (stick.pitch - this.smoothedPitch);
    this.smoothedYaw += stickFilterAlpha * (stick.yaw - this.smoothedYaw);

    // 1. Altitude Hold Control Loop
    let mixedThrottle = stick.throttle;
    
    if (this.isAltHoldActive) {
      // 0% -> Motors Idle
      // 10%-40% -> Ground Effect Zone (Descent)
      // 45%-55% -> Hover Zone (Altitude Hold)
      // 60%-100% -> Climb Zone (Climb)
      
      const isThrottleNeutral = stick.throttle >= 0.45 && stick.throttle <= 0.55;
      let targetClimbRate = 0;
      
      if (isThrottleNeutral) {
        // Hold locked altitude using filtered altitude error
        const altError = this.lockedAltitude - this.filteredAltitude;
        targetClimbRate = THREE.MathUtils.clamp(altError * this.altitudeGains.kp, -1.0, 1.0);
      } else if (stick.throttle >= 0.60) {
        // Climb Zone (60% to 100%)
        // Scale climb rate from 0m/s (at 0.60) to 1.2m/s (at 1.00)
        targetClimbRate = ((stick.throttle - 0.60) / 0.40) * 1.2;
        this.lockedAltitude = this.filteredAltitude; // continuously update target
      } else if (stick.throttle >= 0.10 && stick.throttle < 0.45) {
        // Descent Zone (10% to 40%)
        // Scale descent rate from 0m/s (at 0.45) to -1.0m/s (at 0.10)
        targetClimbRate = ((stick.throttle - 0.45) / 0.35) * 1.0;
        this.lockedAltitude = this.filteredAltitude; // continuously update target
      } else {
        // Landing / Idle Zone (0% to 10%)
        // Descend gradually to the floor
        if (this.filteredAltitude > 0.25) {
          // Moderate descent if high up
          targetClimbRate = -0.8;
        } else {
          // Extremely gentle landing descent rate if close to ground
          targetClimbRate = -0.20;
        }
        this.lockedAltitude = this.filteredAltitude;
      }
      
      // Reset PID integration on the ground to prevent windup bouncing
      if (this.filteredAltitude < 0.05 && targetClimbRate <= 0) {
        this.climbState.integral = 0;
        this.climbState.prevError = 0;
        this.climbState.prevDerivative = 0;
      }
      
      // Climb Rate PID loop
      const climbError = targetClimbRate - this.filteredClimbRate;
      
      // Proportional
      const pTerm = climbError * this.climbRateGains.kp;
      
      // Integral (with anti-windup clamping)
      this.climbState.integral = THREE.MathUtils.clamp(
        this.climbState.integral + climbError * this.climbRateGains.ki * dt,
        -this.climbRateGains.iMax,
        this.climbRateGains.iMax
      );
      
      // Derivative (with filter)
      const rawD = (climbError - this.climbState.prevError) / dt;
      this.climbState.prevError = climbError;
      
      const rc = 1.0 / (2.0 * Math.PI * this.climbRateGains.dFilterHz);
      const alpha = dt / (dt + rc);
      const dTerm = this.climbState.prevDerivative + alpha * (rawD * this.climbRateGains.kd - this.climbState.prevDerivative);
      this.climbState.prevDerivative = dTerm;
      
      // Final throttle value
      mixedThrottle = this.hoverThrottleFeedforward + pTerm + this.climbState.integral + dTerm;
      mixedThrottle = THREE.MathUtils.clamp(mixedThrottle, 0.10, 0.95); // clamp down to 0.10 (idle spin)
    } else {
      // Manual throttle - lock target altitude to current whenever we transition back
      this.lockedAltitude = this.filteredAltitude;
    }
    
    // 2. Outer Angle Loop (Roll & Pitch Self-Leveling)
    // Convert stick inputs (-1 to 1) to target Euler angles (radians)
    const maxTiltAngle = 12.0 * (Math.PI / 180.0); // max 12 degrees tilt for slight, responsive movement
    const targetRoll = -this.smoothedRoll * maxTiltAngle;
    const targetPitch = -this.smoothedPitch * maxTiltAngle;
    
    // Angle Errors
    const rollAngleErr = targetRoll - estAttitude.z; // roll is stored in Euler.z
    const pitchAngleErr = targetPitch - estAttitude.x; // pitch is stored in Euler.x
    
    // Target rates (rad/s)
    const targetRollRate = rollAngleErr * this.rollAngleGains.kp;
    const targetPitchRate = pitchAngleErr * this.pitchAngleGains.kp;
    const targetYawRate = -this.smoothedYaw * 0.8; // max yaw rate: 0.8 rad/s (~45 deg/s) for slow controlled rotation
    
    const targetRates = new THREE.Vector3(targetPitchRate, targetYawRate, targetRollRate);
    
    // 3. Inner Rate Loop (Roll, Pitch, Yaw Angular Rates)
    // Angular rate errors
    const rateError = new THREE.Vector3().subVectors(targetRates, sensorData.gyro);
    
    // Proportional terms
    const P_torque = new THREE.Vector3(
      rateError.x * this.pitchRateGains.kp,
      rateError.y * this.yawRateGains.kp,
      rateError.z * this.rollRateGains.kp
    );
    
    // Integral terms (with anti-windup clamping)
    this.rateState.integral.x = THREE.MathUtils.clamp(
      this.rateState.integral.x + rateError.x * this.pitchRateGains.ki * dt,
      -this.pitchRateGains.iMax,
      this.pitchRateGains.iMax
    );
    this.rateState.integral.y = THREE.MathUtils.clamp(
      this.rateState.integral.y + rateError.y * this.yawRateGains.ki * dt,
      -this.yawRateGains.iMax,
      this.yawRateGains.iMax
    );
    this.rateState.integral.z = THREE.MathUtils.clamp(
      this.rateState.integral.z + rateError.z * this.rollRateGains.ki * dt,
      -this.rollRateGains.iMax,
      this.rollRateGains.iMax
    );
    
    // Derivative terms (with low-pass filter)
    const rawD = new THREE.Vector3().subVectors(rateError, this.rateState.prevError).multiplyScalar(1.0 / dt);
    this.rateState.prevError.copy(rateError);
    
    const dGains = new THREE.Vector3(this.pitchRateGains.kd, this.yawRateGains.kd, this.rollRateGains.kd);
    const dGainsRaw = new THREE.Vector3(rawD.x * dGains.x, rawD.y * dGains.y, rawD.z * dGains.z);
    
    const filterRc = 1.0 / (2.0 * Math.PI * 12.0); // 12Hz cutoff frequency (was 25Hz)
    const filterAlpha = dt / (dt + filterRc);
    
    const D_torque = new THREE.Vector3(
      this.rateState.prevDerivative.x + filterAlpha * (dGainsRaw.x - this.rateState.prevDerivative.x),
      this.rateState.prevDerivative.y + filterAlpha * (dGainsRaw.y - this.rateState.prevDerivative.y),
      this.rateState.prevDerivative.z + filterAlpha * (dGainsRaw.z - this.rateState.prevDerivative.z)
    );
    this.rateState.prevDerivative.copy(D_torque);
    
    // Total torque corrections
    const torqueCor = new THREE.Vector3()
      .add(P_torque)
      .add(this.rateState.integral)
      .add(D_torque);
      
    // 4. Motor Mixer (X Config)
    // Motor 0 (FL): CCW  |  Motor 1 (FR): CW
    // Motor 2 (RL): CW   |  Motor 3 (RR): CCW
    // +roll  → increase right (1,3), decrease left (0,2)
    // +pitch → increase rear (2,3), decrease front (0,1)
    // +yaw   → increase CW (1,2), decrease CCW (0,3)
    
    const u_p = torqueCor.x; // pitch correction
    const u_y = torqueCor.y; // yaw correction
    const u_r = torqueCor.z; // roll correction
    
    let m1 = mixedThrottle - u_r - u_p - u_y; // FL (CCW)
    let m2 = mixedThrottle + u_r - u_p + u_y; // FR (CW)
    let m3 = mixedThrottle - u_r + u_p + u_y; // RL (CW)
    let m4 = mixedThrottle + u_r + u_p - u_y; // RR (CCW)
    
    // Scale or normalize motor commands if they exceed [0, 1] to preserve control authority
    const motorMin = Math.min(m1, m2, m3, m4);
    if (motorMin < 0) {
      m1 -= motorMin;
      m2 -= motorMin;
      m3 -= motorMin;
      m4 -= motorMin;
    }
    
    const motorMax = Math.max(m1, m2, m3, m4);
    if (motorMax > 1.0) {
      m1 /= motorMax;
      m2 /= motorMax;
      m3 /= motorMax;
      m4 /= motorMax;
    }
    
    // Clamp to valid range [idleSpin, 1]
    const idleSpin = 0.10;
    return [
      Math.max(idleSpin, Math.min(1.0, m1)),
      Math.max(idleSpin, Math.min(1.0, m2)),
      Math.max(idleSpin, Math.min(1.0, m3)),
      Math.max(idleSpin, Math.min(1.0, m4))
    ];
  }
  
  public setAltitudeLock(alt: number): void {
    this.lockedAltitude = alt;
  }
}
