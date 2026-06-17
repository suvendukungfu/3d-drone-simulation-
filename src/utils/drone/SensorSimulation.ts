import * as THREE from 'three';
import { DroneSensorData, RigidBodyState } from './types';

export class SensorSimulation {
  // Sensor noise standards (std deviation)
  private gyroNoiseStd = 0.012; // rad/s
  private accelNoiseStd = 0.08; // m/s^2
  private baroNoiseStd = 0.04; // meters
  private magNoiseStd = 0.02; // normalized units
  
  // Random walk biases
  private gyroBias = new THREE.Vector3(0.015, -0.02, 0.008);
  private accelBias = new THREE.Vector3(-0.05, 0.09, -0.03);
  private baroDrift = 0.0;
  
  // Magnetic constants
  private earthMagneticField = new THREE.Vector3(0.0, 0.5, 0.85).normalize(); // normalized local magnetic north
  
  // Calibration states
  private isCalibrated = false;
  private calibrationSamples: { gyro: THREE.Vector3[]; accel: THREE.Vector3[] } = { gyro: [], accel: [] };
  private maxCalibrationSamples = 120; // 2 seconds at 60Hz
  private calibrationFailed = false;
  private totalCalibrationTime = 0.0;
  
  constructor() {
    this.reset();
  }
  
  public reset(): void {
    this.isCalibrated = false;
    this.calibrationSamples = { gyro: [], accel: [] };
    this.calibrationFailed = false;
    this.totalCalibrationTime = 0.0;
    this.baroDrift = (Math.random() - 0.5) * 0.1; // initial offset
    
    // Randomize initial biases slightly
    this.gyroBias.set(
      (Math.random() - 0.5) * 0.03,
      (Math.random() - 0.5) * 0.03,
      (Math.random() - 0.5) * 0.03
    );
    this.accelBias.set(
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.15
    );
  }
  
  // Box-Muller transform for Gaussian noise
  private getGaussianNoise(std: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  
  private addNoise3D(vec: THREE.Vector3, std: number): THREE.Vector3 {
    return new THREE.Vector3(
      vec.x + this.getGaussianNoise(std),
      vec.y + this.getGaussianNoise(std),
      vec.z + this.getGaussianNoise(std)
    );
  }
  
  public update(state: RigidBodyState, linearAccel: THREE.Vector3, dt: number): DroneSensorData {
    // 1. Accumulate random walk on biases
    const biasWalkSpeed = 0.005;
    this.gyroBias.x += this.getGaussianNoise(biasWalkSpeed * this.gyroNoiseStd) * dt;
    this.gyroBias.y += this.getGaussianNoise(biasWalkSpeed * this.gyroNoiseStd) * dt;
    this.gyroBias.z += this.getGaussianNoise(biasWalkSpeed * this.gyroNoiseStd) * dt;
    
    this.accelBias.x += this.getGaussianNoise(biasWalkSpeed * this.accelNoiseStd) * dt;
    this.accelBias.y += this.getGaussianNoise(biasWalkSpeed * this.accelNoiseStd) * dt;
    this.accelBias.z += this.getGaussianNoise(biasWalkSpeed * this.accelNoiseStd) * dt;
    
    this.baroDrift += this.getGaussianNoise(0.002) * dt;
    
    // 2. Compute true physical sensor readings
    // Gyroscope: body frame angular velocity
    const trueGyro = state.angularVelocity.clone();
    
    // Accelerometer: measures proper acceleration (acceleration - gravity) in body frame
    // Aaccel = R^T * (Aworld - gravity)
    const gravityWorld = new THREE.Vector3(0, -9.81, 0);
    const properAccelWorld = linearAccel.clone().sub(gravityWorld);
    
    const trueAccel = properAccelWorld.clone().applyQuaternion(state.quaternion.clone().conjugate());
    
    // Barometer: altitude above ground
    const trueAltitude = Math.max(0, state.position.y);
    
    // Magnetometer: earth magnetic field rotated to body frame
    const trueMag = this.earthMagneticField.clone().applyQuaternion(state.quaternion.clone().conjugate());
    
    // 3. Add biases and noise
    const noisyGyro = this.addNoise3D(trueGyro.clone().add(this.gyroBias), this.gyroNoiseStd);
    const noisyAccel = this.addNoise3D(trueAccel.clone().add(this.accelBias), this.accelNoiseStd);
    const noisyMag = this.addNoise3D(trueMag, this.magNoiseStd).normalize();
    const noisyAltitude = trueAltitude + this.baroDrift + this.getGaussianNoise(this.baroNoiseStd);
    
    // 4. Handle calibration sequence
    if (!this.isCalibrated && !this.calibrationFailed) {
      this.totalCalibrationTime += dt;
      
      // If drone is moving too much during calibration, trigger failure
      const speed = state.velocity.length();
      const rotSpeed = state.angularVelocity.length();
      if (speed > 0.05 || rotSpeed > 0.1) {
        this.calibrationFailed = true;
      } else {
        // Record samples
        this.calibrationSamples.gyro.push(noisyGyro.clone());
        this.calibrationSamples.accel.push(noisyAccel.clone());
        
        // Once we have enough samples, compute bias offsets and complete
        if (this.calibrationSamples.gyro.length >= this.maxCalibrationSamples) {
          const avgGyro = new THREE.Vector3(0, 0, 0);
          const avgAccel = new THREE.Vector3(0, 0, 0);
          
          this.calibrationSamples.gyro.forEach(g => avgGyro.add(g));
          this.calibrationSamples.accel.forEach(a => avgAccel.add(a));
          
          avgGyro.multiplyScalar(1.0 / this.maxCalibrationSamples);
          avgAccel.multiplyScalar(1.0 / this.maxCalibrationSamples);
          
          // The expected accel when level is [0, 9.81, 0].
          // Subtract that from the average to isolate the bias.
          avgAccel.y -= 9.81;
          
          // Store calibrated biases (we subtract these offsets from raw readings)
          this.gyroBias.copy(avgGyro);
          this.accelBias.copy(avgAccel);
          
          this.isCalibrated = true;
        }
      }
    }
    
    // 5. Apply Calibration Offsets to final output
    const calibratedGyro = noisyGyro.clone();
    const calibratedAccel = noisyAccel.clone();
    
    if (this.isCalibrated) {
      calibratedGyro.sub(this.gyroBias);
      calibratedAccel.sub(this.accelBias);
    }
    
    const progress = Math.min(1.0, this.calibrationSamples.gyro.length / this.maxCalibrationSamples);
    
    return {
      gyro: calibratedGyro,
      accel: calibratedAccel,
      mag: noisyMag,
      baroAltitude: Math.max(0, noisyAltitude),
      calibrationProgress: this.isCalibrated ? 1.0 : progress,
      isCalibrated: this.isCalibrated,
      hasError: this.calibrationFailed
    };
  }
  
  public forceCalibrate(): void {
    this.gyroBias.set(0, 0, 0);
    this.accelBias.set(0, 0, 0);
    this.baroDrift = 0.0;
    this.isCalibrated = true;
    this.calibrationFailed = false;
    this.calibrationSamples = { gyro: [], accel: [] };
  }
  
  public isSensorCalibrated(): boolean {
    return this.isCalibrated;
  }
  
  public hasCalibrationFailed(): boolean {
    return this.calibrationFailed;
  }
}
