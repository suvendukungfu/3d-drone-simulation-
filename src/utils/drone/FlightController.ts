/**
 * FlightController.ts
 * ───────────────────
 * Cascaded PID flight controller for the PlutoX Nano.
 *
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Altitude Loop  →  Climb Rate Loop  →  Throttle Command    │
 *   │  Angle Loop     →  Rate Loop        →  Torque Corrections  │
 *   │  Motor Mixer    →  [m1, m2, m3, m4] motor outputs          │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Control Loops:
 *   1. Altitude Hold    — Outer altitude P → inner climb rate PID
 *   2. Self-Leveling    — Outer angle P → inner angular rate PID
 *   3. Yaw Rate         — Direct rate PID from pilot yaw stick input
 *   4. Motor Mixer      — X-config mixing of throttle + roll/pitch/yaw corrections
 *
 * All PID loops use:
 *   - Anti-windup integral clamping (iMax)
 *   - Low-pass filtered derivative term (configurable cutoff frequency)
 *   - Low-pass filtered stick inputs (10 Hz) for pilot comfort
 */
import * as THREE from 'three';
import { PIDGains, FlightControlStick, DroneSensorData } from './types';

export class FlightController {
  // PID Gains — tuned for responsive, locked-in PlutoX flight
  public rollAngleGains: PIDGains = { kp: 4.0, ki: 0.0, kd: 0.0, iMax: 0.0, dFilterHz: 0.0 };
  public pitchAngleGains: PIDGains = { kp: 4.0, ki: 0.0, kd: 0.0, iMax: 0.0, dFilterHz: 0.0 };
  
  public rollRateGains: PIDGains = { kp: 0.06, ki: 0.03, kd: 0.001, iMax: 0.3, dFilterHz: 25 };
  public pitchRateGains: PIDGains = { kp: 0.06, ki: 0.03, kd: 0.001, iMax: 0.3, dFilterHz: 25 };
  public yawRateGains: PIDGains = { kp: 0.10, ki: 0.03, kd: 0.001, iMax: 0.3, dFilterHz: 25 };
  
  public altitudeGains: PIDGains = { kp: 1.2, ki: 0.0, kd: 0.0, iMax: 0.0, dFilterHz: 0.0 };
  public climbRateGains: PIDGains = { kp: 0.18, ki: 0.08, kd: 0.012, iMax: 0.3, dFilterHz: 15 };
  
  // Controller States
  private rateState = {
    integral: new THREE.Vector3(0, 0, 0),
    prevError: new THREE.Vector3(0, 0, 0),
    prevDerivative: new THREE.Vector3(0, 0, 0),
    prevGyro: new THREE.Vector3(0, 0, 0)
  };
  
  private climbState = {
    integral: 0,
    prevError: 0,
    prevDerivative: 0,
    prevClimbRate: 0
  };
  
  // Altitude hold tracker
  public isAltHoldActive = false;
  public isLandingActive = false;
  private lockedAltitude = 0.0;
  
  // Diagnostic fields
  public lastTorqueCor = new THREE.Vector3();
  public lastMixedThrottle = 0;
  
  // Low-pass filter variables
  private filteredAltitude = 0.0;
  private isAltInitialized = false;
  private filteredClimbRate = 0.0;
  private smoothedRoll = 0.0;
  private smoothedPitch = 0.0;
  private smoothedYaw = 0.0;
  private hoverTime = 0.0; // Track time for natural oscillations
  
  // Base hover throttle feedforward (corresponds to mass * gravity / maxTotalThrust)
  // mass = 0.055, gravity = 9.81, maxTotalThrust = 1.20 -> hover throttle ~ 0.55 (tuned per spec)
  private hoverThrottleFeedforward = 0.55;

  // Position Hold PID states for active hover stabilization
  private hoverPosX = 0.0;
  private hoverPosZ = 0.0;
  private hoverPosActiveX = false;
  private hoverPosActiveZ = false;
  private hoverPosIntX = 0.0;
  private hoverPosIntZ = 0.0;
  
  // Yaw Lock (Heading Hold) states
  private lockedYaw = 0.0;
  private isYawInitialized = false;
  
  constructor() {}
  
  public reset(): void {
    this.rateState = {
      integral: new THREE.Vector3(0, 0, 0),
      prevError: new THREE.Vector3(0, 0, 0),
      prevDerivative: new THREE.Vector3(0, 0, 0),
      prevGyro: new THREE.Vector3(0, 0, 0)
    };
    
    this.climbState = {
      integral: 0,
      prevError: 0,
      prevDerivative: 0,
      prevClimbRate: 0
    };
    
    this.isAltHoldActive = false;
    this.isLandingActive = false;
    this.lockedAltitude = 0.0;
    this.filteredAltitude = 0.0;
    this.isAltInitialized = false;
    this.filteredClimbRate = 0.0;
    this.smoothedRoll = 0.0;
    this.smoothedPitch = 0.0;
    this.smoothedYaw = 0.0;

    this.hoverPosX = 0.0;
    this.hoverPosZ = 0.0;
    this.hoverPosActiveX = false;
    this.hoverPosActiveZ = false;
    this.hoverPosIntX = 0.0;
    this.hoverPosIntZ = 0.0;
    this.hoverTime = 0.0;
    this.lockedYaw = 0.0;
    this.isYawInitialized = false;
  }
  
  // Apply PID calculations to compute motor outputs [m1, m2, m3, m4]
  public update(
    stick: FlightControlStick,
    sensorData: DroneSensorData,
    estAttitude: THREE.Euler, // Estimated Roll, Pitch, Yaw from sensors (radians)
    estVelocity: THREE.Vector3, // Estimated velocity (m/s)
    dt: number,
    hasTakenOff: boolean = true
  ): number[] {
    this.hoverTime += dt;

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

    // Smooth stick inputs (40Hz LPF for ultra-responsive control)
    const stickFilterAlpha = dt / (dt + 1.0 / (2.0 * Math.PI * 40.0));
    this.smoothedRoll += stickFilterAlpha * (stick.roll - this.smoothedRoll);
    this.smoothedPitch += stickFilterAlpha * (stick.pitch - this.smoothedPitch);
    this.smoothedYaw += stickFilterAlpha * (stick.yaw - this.smoothedYaw);

    // 1. Altitude Hold Control Loop
    let mixedThrottle = stick.throttle;
    
    if (this.isAltHoldActive) {
      let targetClimbRate = 0;
      
      if (!hasTakenOff) {
        // Safe takeoff control: keep motors at idle spin if on ground and throttle <= 15%
        if (stick.throttle > 0.15) {
          // Commanded takeoff: apply climbing rate and slight takeoff throttle thrust
          targetClimbRate = 0.4; // smooth 0.3-0.5 m/s lift rate
          mixedThrottle = this.hoverThrottleFeedforward + 0.05;
        } else {
          // Keep resting flat on landing pad
          mixedThrottle = 0.08 + (stick.throttle / 0.15) * 0.07; // visual spin scales with throttle 0-15%
          this.climbState.integral = 0;
          this.climbState.prevError = 0;
          this.climbState.prevDerivative = 0;
          this.climbState.prevClimbRate = this.filteredClimbRate;
          this.lockedAltitude = this.filteredAltitude;
          
          // Return visual spin command (no physics authority, locked on ground by orchestrator)
          return [mixedThrottle, mixedThrottle, mixedThrottle, mixedThrottle];
        }
      } else {
        // Standard Pilot Flight Altitude Hold Loop
        if (this.isLandingActive) {
          targetClimbRate = -0.35; // smooth controlled descent rate
        } else {
          const isThrottleNeutral = stick.throttle >= 0.50 && stick.throttle <= 0.60;
          
          if (isThrottleNeutral) {
            // Hold locked altitude using filtered altitude error (bobbing oscillation removed)
            const altError = this.lockedAltitude - this.filteredAltitude;
            targetClimbRate = THREE.MathUtils.clamp(altError * this.altitudeGains.kp, -1.0, 1.0);
          } else if (stick.throttle > 0.60) {
            // Climb Zone (60% to 100%) - continuous
            targetClimbRate = ((stick.throttle - 0.60) / 0.40) * 2.2;
            this.lockedAltitude = this.filteredAltitude;
          } else if (stick.throttle >= 0.0 && stick.throttle < 0.50) {
            // Descent Zone (0% to 50%) - continuous down to max -2.0 m/s
            targetClimbRate = ((stick.throttle - 0.50) / 0.50) * 2.0;
            this.lockedAltitude = this.filteredAltitude;
          }
        }
        
        // Reset PID integration on the ground to prevent windup bouncing
        if (this.filteredAltitude < 0.05 && targetClimbRate <= 0) {
          this.climbState.integral = 0;
          this.climbState.prevError = 0;
          this.climbState.prevDerivative = 0;
          this.climbState.prevClimbRate = this.filteredClimbRate;
        }
        
        // Climb Rate PID loop
        const climbError = targetClimbRate - this.filteredClimbRate;
        const pTerm = climbError * this.climbRateGains.kp;
        this.climbState.integral = THREE.MathUtils.clamp(
          this.climbState.integral + climbError * this.climbRateGains.ki * dt,
          -this.climbRateGains.iMax,
          this.climbRateGains.iMax
        );
        let dTerm = 0;
        if (dt > 0.0001) {
          // Calculate derivative on measurement (prevents derivative kick on throttle change)
          const rawD = -(this.filteredClimbRate - this.climbState.prevClimbRate) / dt;
          this.climbState.prevClimbRate = this.filteredClimbRate;
          this.climbState.prevError = climbError;
          
          const rc = 1.0 / (2.0 * Math.PI * this.climbRateGains.dFilterHz);
          const alpha = dt / (dt + rc);
          dTerm = this.climbState.prevDerivative + alpha * (rawD * this.climbRateGains.kd - this.climbState.prevDerivative);
          this.climbState.prevDerivative = dTerm;
        } else {
          dTerm = this.climbState.prevDerivative;
        }
        
        mixedThrottle = this.hoverThrottleFeedforward + pTerm + this.climbState.integral + dTerm;
        mixedThrottle = THREE.MathUtils.clamp(mixedThrottle, 0.10, 0.95);
      }
    } else {
      this.lockedAltitude = this.filteredAltitude;
    }
    
    // 2. Outer Angle Loop (Roll & Pitch Self-Leveling)
    // Convert stick inputs (-1 to 1) to target Euler angles (radians)
    const maxTiltAngle = 30.0 * (Math.PI / 180.0); // max 30 degrees tilt for fast, responsive movement
    // During landing: allow reduced roll/pitch authority (40% of max) so pilot can steer to landing spot
    const landingAttenuate = this.isLandingActive ? 0.4 : 1.0;
    let targetRoll = this.smoothedRoll * maxTiltAngle * landingAttenuate;
    let targetPitch = this.smoothedPitch * maxTiltAngle * landingAttenuate;
    
    // Hover stabilization (active position hold / drift damping) when sticks are neutral in flight
    if (hasTakenOff && !this.isLandingActive) {
      const isRollStickNeutral = Math.abs(this.smoothedRoll) < 0.05;
      const isPitchStickNeutral = Math.abs(this.smoothedPitch) < 0.05;
      
      const q = new THREE.Quaternion().setFromEuler(estAttitude);
      const bodyVel = estVelocity.clone().applyQuaternion(q.invert());
      
      if (isRollStickNeutral) {
        if (!this.hoverPosActiveX) {
          this.hoverPosX = 0.0;
          this.hoverPosIntX = 0.0;
          this.hoverPosActiveX = true;
        }
        // Integrate lateral displacement
        this.hoverPosX += bodyVel.x * dt;
        const pTerm = this.hoverPosX * 0.12;
        const dTerm = bodyVel.x * 0.18;
        this.hoverPosIntX = THREE.MathUtils.clamp(this.hoverPosIntX + this.hoverPosX * dt * 0.05, -0.02, 0.02);
        targetRoll = THREE.MathUtils.clamp(pTerm + dTerm + this.hoverPosIntX, -0.22, 0.22);
      } else {
        this.hoverPosActiveX = false;
        this.hoverPosX = 0.0;
        this.hoverPosIntX = 0.0;
      }
      
      if (isPitchStickNeutral) {
        if (!this.hoverPosActiveZ) {
          this.hoverPosZ = 0.0;
          this.hoverPosIntZ = 0.0;
          this.hoverPosActiveZ = true;
        }
        // Integrate longitudinal displacement
        this.hoverPosZ += bodyVel.z * dt;
        const pTerm = -this.hoverPosZ * 0.12;
        const dTerm = -bodyVel.z * 0.18;
        this.hoverPosIntZ = THREE.MathUtils.clamp(this.hoverPosIntZ - this.hoverPosZ * dt * 0.05, -0.02, 0.02);
        targetPitch = THREE.MathUtils.clamp(pTerm + dTerm + this.hoverPosIntZ, -0.22, 0.22);
      } else {
        this.hoverPosActiveZ = false;
        this.hoverPosZ = 0.0;
        this.hoverPosIntZ = 0.0;
      }
    }
    
    // Angle Errors
    const rollAngleErr = targetRoll - estAttitude.z; // roll is stored in Euler.z
    const pitchAngleErr = targetPitch - estAttitude.x; // pitch is stored in Euler.x
    
    // Target rates (rad/s)
    const targetRollRate = rollAngleErr * this.rollAngleGains.kp;
    const targetPitchRate = pitchAngleErr * this.pitchAngleGains.kp;
    
    // Heading Hold on Yaw (Angle Lock when sticks are neutral)
    if (!hasTakenOff) {
      this.isYawInitialized = false;
    }
    
    if (!this.isYawInitialized) {
      this.lockedYaw = estAttitude.y;
      this.isYawInitialized = true;
    }
    
    let targetYawRate = 0.0;
    const isYawStickActive = Math.abs(this.smoothedYaw) > 0.02;
    
    if (isYawStickActive) {
      this.lockedYaw = estAttitude.y;
      targetYawRate = -this.smoothedYaw * 2.2; // max rate: 2.2 rad/s
    } else {
      // Calculate shortest angle path error
      let yawError = this.lockedYaw - estAttitude.y;
      while (yawError > Math.PI) yawError -= Math.PI * 2;
      while (yawError < -Math.PI) yawError += Math.PI * 2;
      
      // Proportional controller for yaw lock
      targetYawRate = yawError * 3.0;
    }
    
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
    if (!hasTakenOff) {
      this.rateState.integral.set(0, 0, 0);
      this.rateState.prevError.set(0, 0, 0);
      this.rateState.prevDerivative.set(0, 0, 0);
      this.rateState.prevGyro.copy(sensorData.gyro);
    } else {
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
    }
    
    // Derivative terms (with low-pass filter)
    const D_torque = new THREE.Vector3(0, 0, 0);
    if (dt > 0.0001) {
      // Calculate derivative on measurement (prevents derivative kick when pilot commands change)
      const rawD = new THREE.Vector3().subVectors(this.rateState.prevGyro, sensorData.gyro).multiplyScalar(1.0 / dt);
      this.rateState.prevGyro.copy(sensorData.gyro);
      this.rateState.prevError.copy(rateError);
      
      const dGains = new THREE.Vector3(this.pitchRateGains.kd, this.yawRateGains.kd, this.rollRateGains.kd);
      const dGainsRaw = new THREE.Vector3(rawD.x * dGains.x, rawD.y * dGains.y, rawD.z * dGains.z);
      
      const filterRc = 1.0 / (2.0 * Math.PI * 25.0); // 25Hz cutoff frequency (reduced phase lag)
      const filterAlpha = dt / (dt + filterRc);
      
      D_torque.set(
        this.rateState.prevDerivative.x + filterAlpha * (dGainsRaw.x - this.rateState.prevDerivative.x),
        this.rateState.prevDerivative.y + filterAlpha * (dGainsRaw.y - this.rateState.prevDerivative.y),
        this.rateState.prevDerivative.z + filterAlpha * (dGainsRaw.z - this.rateState.prevDerivative.z)
      );
      this.rateState.prevDerivative.copy(D_torque);
    } else {
      D_torque.copy(this.rateState.prevDerivative);
    }
    
    // Total torque corrections
    const torqueCor = new THREE.Vector3()
      .add(P_torque)
      .add(this.rateState.integral)
      .add(D_torque);
      
    this.lastTorqueCor.copy(torqueCor);
    this.lastMixedThrottle = mixedThrottle;

    if (hasTakenOff) {
      // console.log(`[FC roll] rollAngleErr=${rollAngleErr.toFixed(4)}, targetRollRate=${targetRollRate.toFixed(4)}, gyroZ=${sensorData.gyro.z.toFixed(4)}, rateErrorZ=${rateError.z.toFixed(4)}, P=${P_torque.z.toFixed(4)}, I=${this.rateState.integral.z.toFixed(4)}, D=${D_torque.z.toFixed(4)}, total=${torqueCor.z.toFixed(4)}`);
    }
      
    // 4. Motor Mixer (X Config)
    // Motor 0 (FL): CCW  |  Motor 1 (FR): CW
    // Motor 2 (RL): CW   |  Motor 3 (RR): CCW
    // +roll  → increase right (1,3), decrease left (0,2)
    // +pitch → increase rear (2,3), decrease front (0,1)
    // +yaw   → increase CW (1,2), decrease CCW (0,3)
    
    const u_p = torqueCor.x; // pitch correction
    const u_y = THREE.MathUtils.clamp(torqueCor.y, -0.22, 0.22); // yaw correction clamped to prevent saturation
    const u_r = torqueCor.z; // roll correction
    
    let m1 = mixedThrottle - u_r - u_p - u_y; // FL (CCW)
    let m2 = mixedThrottle + u_r - u_p + u_y; // FR (CW)
    let m3 = mixedThrottle - u_r + u_p + u_y; // RL (CW)
    let m4 = mixedThrottle + u_r + u_p - u_y; // RR (CCW)
    
    // Prioritize attitude control by shifting throttle down when maximum command exceeds 1.0
    // (preserves differential torque/stabilizing authority, unlike dividing/scaling)
    const motorMax = Math.max(m1, m2, m3, m4);
    if (motorMax > 1.0) {
      const excess = motorMax - 1.0;
      m1 -= excess;
      m2 -= excess;
      m3 -= excess;
      m4 -= excess;
    }
    
    // Shift up if minimum command goes below 0.0 to prevent motor stalling
    const motorMin = Math.min(m1, m2, m3, m4);
    if (motorMin < 0) {
      m1 -= motorMin;
      m2 -= motorMin;
      m3 -= motorMin;
      m4 -= motorMin;
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
