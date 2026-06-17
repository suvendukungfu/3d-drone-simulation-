import * as THREE from 'three';
import { RigidBodyState } from './types';

export class PhysicsEngine {
  // Drone physical parameters (micro-quadcopter like PlutoX)
  public mass = 0.055; // kg
  public gravity = 9.81; // m/s^2
  
  // Distances from center of gravity to motor axis
  public L = 0.042; // meters (half-span of motor wheelbase)
  
  // Propeller coefficients
  public maxMotorThrust = 0.30; // Newtons per motor at full throttle (1.20N total, T:W ~2.22)
  public yawTorqueCoef = 0.006; // Nm torque per Newton of thrust generated
  
  // Moment of Inertia tensor values (kg * m^2)
  public Ixx = 5.8e-5;
  public Iyy = 9.5e-5; // Yaw axis
  public Izz = 5.8e-5;
  
  // Damping coefficients
  public linearDragCoef = 0.20; // N/(m/s) — reduces drift during hover
  public angularDragCoef = 0.008; // Nm/(rad/s) — damps rotation for stability
  
  // Boundary properties
  public environmentBounds = {
    minX: -15, maxX: 15,
    minY: 0.02, maxY: 12, // minY is drone radius offset
    minZ: -15, maxZ: 15
  };
  
  // Ground rebound parameters
  public groundRestitution = 0.15; // low bounce for soft landings
  public frictionCoef = 0.4;
  
  constructor() {}
  
  // Calculate derivatives for RK4
  private getDerivatives(state: RigidBodyState, motorCommands: number[]): {
    velocity: THREE.Vector3;
    acceleration: THREE.Vector3;
    dq: THREE.Quaternion;
    angularAcceleration: THREE.Vector3;
  } {
    // 1. Calculate Motor Forces (Thrusts)
    const F = motorCommands.map(cmd => Math.max(0, Math.min(1, cmd)) * this.maxMotorThrust);
    
    // Total thrust along body vertical (Y) axis
    let totalThrust = F[0] + F[1] + F[2] + F[3];
    
    // Apply Ground Effect: lift increases when hovering very close to the floor (y < 0.30m)
    const altitude = state.position.y;
    if (altitude < 0.30) {
      const x = Math.max(0, 1.0 - altitude / 0.30);
      totalThrust *= (1.0 + 0.22 * x * x);
    }
    
    // 2. Compute forces in body space, then rotate to world space
    const bodyThrustForce = new THREE.Vector3(0, totalThrust, 0);
    const worldThrustForce = bodyThrustForce.clone().applyQuaternion(state.quaternion);
    
    // Add gravity
    const gravityForce = new THREE.Vector3(0, -this.mass * this.gravity, 0);
    
    // Add linear drag
    const dragForce = state.velocity.clone().multiplyScalar(-this.linearDragCoef);
    
    // Net force and acceleration
    const netForce = new THREE.Vector3()
      .add(worldThrustForce)
      .add(gravityForce)
      .add(dragForce);
      
    const acceleration = netForce.multiplyScalar(1.0 / this.mass);
    
    // 3. Torques in body space (X configuration)
    // Motor layout (0-indexed, matching FlightController mixer):
    //   Motor 0 (FL): [-L, +L]  CCW prop → CW reaction torque
    //   Motor 1 (FR): [+L, +L]  CW prop  → CCW reaction torque
    //   Motor 2 (RL): [-L, -L]  CW prop  → CCW reaction torque
    //   Motor 3 (RR): [+L, -L]  CCW prop → CW reaction torque
    // Roll  (Z-axis): Right motors (1,3) vs Left motors (0,2)
    // Pitch (X-axis): Rear motors  (2,3) vs Front motors (0,1)
    // Yaw   (Y-axis): CW motors    (1,2) vs CCW motors   (0,3)
    
    const rollTorque = this.L * ((F[1] + F[3]) - (F[0] + F[2]));  // +roll = left bank
    const pitchTorque = this.L * ((F[2] + F[3]) - (F[0] + F[1]));  // +pitch = nose down (forward)
    const yawTorque = this.yawTorqueCoef * ((F[1] + F[2]) - (F[0] + F[3])); // +yaw = CCW from above
    
    const bodyTorque = new THREE.Vector3(pitchTorque, yawTorque, rollTorque);
    
    // Gyroscopic torque: omega x (I * omega)
    const IOmega = new THREE.Vector3(
      this.Ixx * state.angularVelocity.x,
      this.Iyy * state.angularVelocity.y,
      this.Izz * state.angularVelocity.z
    );
    const gyroTorque = new THREE.Vector3().crossVectors(state.angularVelocity, IOmega);
    
    // Angular drag
    const angularDrag = state.angularVelocity.clone().multiplyScalar(-this.angularDragCoef);
    
    // Net torque
    const netTorque = new THREE.Vector3()
      .add(bodyTorque)
      .sub(gyroTorque)
      .add(angularDrag);
      
    // Angular acceleration: Torque / Inertia
    const angularAcceleration = new THREE.Vector3(
      netTorque.x / this.Ixx,
      netTorque.y / this.Iyy,
      netTorque.z / this.Izz
    );
    
    // 4. Quaternion derivative: dq/dt = 0.5 * q * (0, omega)
    // Three.js Quaternion constructor: new Quaternion(x, y, z, w)
    const q = state.quaternion;
    const w = state.angularVelocity;
    const dq = new THREE.Quaternion(
      0.5 * ( q.w * w.x + q.y * w.z - q.z * w.y),  // dx
      0.5 * ( q.w * w.y - q.x * w.z + q.z * w.x),  // dy
      0.5 * ( q.w * w.z + q.x * w.y - q.y * w.x),  // dz
      0.5 * (-q.x * w.x - q.y * w.y - q.z * w.z)   // dw
    );
    
    return {
      velocity: state.velocity.clone(),
      acceleration,
      dq,
      angularAcceleration
    };
  }
  
  // RK4 Integration step
  public step(state: RigidBodyState, motorCommands: number[], dt: number): RigidBodyState {
    const s1 = state;
    const k1 = this.getDerivatives(s1, motorCommands);
    
    // s2 = s1 + 0.5 * dt * k1
    const s2: RigidBodyState = {
      position: s1.position.clone().addScaledVector(k1.velocity, 0.5 * dt),
      velocity: s1.velocity.clone().addScaledVector(k1.acceleration, 0.5 * dt),
      quaternion: new THREE.Quaternion(
        s1.quaternion.x + k1.dq.x * 0.5 * dt,
        s1.quaternion.y + k1.dq.y * 0.5 * dt,
        s1.quaternion.z + k1.dq.z * 0.5 * dt,
        s1.quaternion.w + k1.dq.w * 0.5 * dt
      ).normalize(),
      angularVelocity: s1.angularVelocity.clone().addScaledVector(k1.angularAcceleration, 0.5 * dt)
    };
    const k2 = this.getDerivatives(s2, motorCommands);
    
    // s3 = s1 + 0.5 * dt * k2
    const s3: RigidBodyState = {
      position: s1.position.clone().addScaledVector(k2.velocity, 0.5 * dt),
      velocity: s1.velocity.clone().addScaledVector(k2.acceleration, 0.5 * dt),
      quaternion: new THREE.Quaternion(
        s1.quaternion.x + k2.dq.x * 0.5 * dt,
        s1.quaternion.y + k2.dq.y * 0.5 * dt,
        s1.quaternion.z + k2.dq.z * 0.5 * dt,
        s1.quaternion.w + k2.dq.w * 0.5 * dt
      ).normalize(),
      angularVelocity: s1.angularVelocity.clone().addScaledVector(k2.angularAcceleration, 0.5 * dt)
    };
    const k3 = this.getDerivatives(s3, motorCommands);
    
    // s4 = s1 + dt * k3
    const s4: RigidBodyState = {
      position: s1.position.clone().addScaledVector(k3.velocity, dt),
      velocity: s1.velocity.clone().addScaledVector(k3.acceleration, dt),
      quaternion: new THREE.Quaternion(
        s1.quaternion.x + k3.dq.x * dt,
        s1.quaternion.y + k3.dq.y * dt,
        s1.quaternion.z + k3.dq.z * dt,
        s1.quaternion.w + k3.dq.w * dt
      ).normalize(),
      angularVelocity: s1.angularVelocity.clone().addScaledVector(k3.angularAcceleration, dt)
    };
    const k4 = this.getDerivatives(s4, motorCommands);
    
    // Final state integration
    const nextPosition = s1.position.clone()
      .addScaledVector(k1.velocity, dt / 6.0)
      .addScaledVector(k2.velocity, dt / 3.0)
      .addScaledVector(k3.velocity, dt / 3.0)
      .addScaledVector(k4.velocity, dt / 6.0);
      
    const nextVelocity = s1.velocity.clone()
      .addScaledVector(k1.acceleration, dt / 6.0)
      .addScaledVector(k2.acceleration, dt / 3.0)
      .addScaledVector(k3.acceleration, dt / 3.0)
      .addScaledVector(k4.acceleration, dt / 6.0);
      
    const nextQuaternion = new THREE.Quaternion(
      s1.quaternion.x + (k1.dq.x + 2 * k2.dq.x + 2 * k3.dq.x + k4.dq.x) * (dt / 6.0),
      s1.quaternion.y + (k1.dq.y + 2 * k2.dq.y + 2 * k3.dq.y + k4.dq.y) * (dt / 6.0),
      s1.quaternion.z + (k1.dq.z + 2 * k2.dq.z + 2 * k3.dq.z + k4.dq.z) * (dt / 6.0),
      s1.quaternion.w + (k1.dq.w + 2 * k2.dq.w + 2 * k3.dq.w + k4.dq.w) * (dt / 6.0)
    ).normalize();
    
    const nextAngularVelocity = s1.angularVelocity.clone()
      .addScaledVector(k1.angularAcceleration, dt / 6.0)
      .addScaledVector(k2.angularAcceleration, dt / 3.0)
      .addScaledVector(k3.angularAcceleration, dt / 3.0)
      .addScaledVector(k4.angularAcceleration, dt / 6.0);
      
    const nextState = {
      position: nextPosition,
      velocity: nextVelocity,
      quaternion: nextQuaternion,
      angularVelocity: nextAngularVelocity
    };
    
    // Apply collision and boundaries
    this.handleCollisions(nextState);
    
    return nextState;
  }
  
  // Boundary constraints & rebound calculations
  private handleCollisions(state: RigidBodyState): void {
    const bounds = this.environmentBounds;
    
    // 1. Ground Collision (drone radius is ~0.04m, so bottom of landing gear is 0.04m below position)
    if (state.position.y <= bounds.minY) {
      state.position.y = bounds.minY;
      
      // If we are crashing downwards, bounce!
      if (state.velocity.y < 0) {
        // If landing gently (velocity.y > -0.5 m/s), don't bounce at all!
        if (state.velocity.y > -0.5) {
          state.velocity.y = 0;
        } else {
          state.velocity.y = -state.velocity.y * this.groundRestitution;
        }
        
        // Apply ground friction (damp lateral velocities)
        state.velocity.x *= (1.0 - this.frictionCoef);
        state.velocity.z *= (1.0 - this.frictionCoef);
      }
      
      // Damp rotations on contact
      state.angularVelocity.multiplyScalar(0.7);
    }
    
    // 2. Ceiling boundary
    if (state.position.y >= bounds.maxY) {
      state.position.y = bounds.maxY;
      if (state.velocity.y > 0) {
        state.velocity.y = -state.velocity.y * 0.1; // small damp rebound
      }
    }
    
    // 3. Walls (X boundary)
    if (state.position.x <= bounds.minX) {
      state.position.x = bounds.minX;
      if (state.velocity.x < 0) state.velocity.x = -state.velocity.x * this.groundRestitution;
      state.angularVelocity.multiplyScalar(0.8);
    } else if (state.position.x >= bounds.maxX) {
      state.position.x = bounds.maxX;
      if (state.velocity.x > 0) state.velocity.x = -state.velocity.x * this.groundRestitution;
      state.angularVelocity.multiplyScalar(0.8);
    }
    
    // 4. Walls (Z boundary)
    if (state.position.z <= bounds.minZ) {
      state.position.z = bounds.minZ;
      if (state.velocity.z < 0) state.velocity.z = -state.velocity.z * this.groundRestitution;
      state.angularVelocity.multiplyScalar(0.8);
    } else if (state.position.z >= bounds.maxZ) {
      state.position.z = bounds.maxZ;
      if (state.velocity.z > 0) state.velocity.z = -state.velocity.z * this.groundRestitution;
      state.angularVelocity.multiplyScalar(0.8);
    }
  }
  
  public reset(): void {
    // Initial static values reset if needed
  }
  
  // Dynamic bounds updates for different environment scales
  public setBounds(minX: number, maxX: number, minZ: number, maxZ: number, maxY = 12): void {
    this.environmentBounds.minX = minX;
    this.environmentBounds.maxX = maxX;
    this.environmentBounds.minZ = minZ;
    this.environmentBounds.maxZ = maxZ;
    this.environmentBounds.maxY = maxY;
  }
}
