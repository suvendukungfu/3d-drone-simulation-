import * as THREE from 'three';
import { PhysicsEngine } from './PhysicsEngine';
import { FlightController } from './FlightController';
import { InputSystem } from './InputSystem';
import { SensorSimulation } from './SensorSimulation';
import { TelemetryEngine } from './TelemetryEngine';
import { RigidBodyState, TelemetryData } from './types';
import { useDroneStore } from '../../store/useDroneStore';

export class SimulatorOrchestrator {
  // Core Engines
  public physics = new PhysicsEngine();
  public controller = new FlightController();
  public input = new InputSystem();
  public sensors = new SensorSimulation();
  public telemetry = new TelemetryEngine();
  
  // Simulation States
  private state: RigidBodyState = {
    position: new THREE.Vector3(0, 0.02, 0), // rest on pad
    velocity: new THREE.Vector3(0, 0, 0),
    quaternion: new THREE.Quaternion(),
    angularVelocity: new THREE.Vector3(0, 0, 0)
  };

  private prevState: RigidBodyState = {
    position: new THREE.Vector3(0, 0.02, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    quaternion: new THREE.Quaternion(),
    angularVelocity: new THREE.Vector3(0, 0, 0)
  };

  private renderState: RigidBodyState = {
    position: new THREE.Vector3(0, 0.02, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    quaternion: new THREE.Quaternion(),
    angularVelocity: new THREE.Vector3(0, 0, 0)
  };
  
  private linearAcceleration = new THREE.Vector3(0, 0, 0);
  private motorCommands: number[] = [0, 0, 0, 0];
  
  // Timing variables
  private fixedTimestep = 1.0 / 60.0; // 60Hz
  private timeAccumulator = 0.0;
  
  // System Flags
  private isArmed = false;
  private isCalibrating = true;
  private calibrationTimer = 0.0;
  private isFailsafeActive = false;
  
  // Warning Systems
  private crashDetected = false;
  private wallCollision = false;
  private lowBattery = false;
  private hardLanding = false;
  private boundaryExceeded = false;
  
  // Notification states
  private hasTakenOff = false;
  private hasWarnedLowBattery = false;
  private hasWarnedBoundary = false;
  private hasWarnedWallCollision = false;
  
  // Wall collision notification tracker
  private collisionTimer = 0.0;
  
  constructor() {
    this.reset();
  }
  
  public init(): void {
    this.input.init();
    
    // Register callbacks
    this.input.setCallbacks({
      onArmToggle: () => this.toggleArm(),
      onTelemetryToggle: () => {
        const store = useDroneStore.getState() as any;
        if (store.toggleTelemetryDashboard) {
          store.toggleTelemetryDashboard();
        }
      },
      onControlsToggle: () => {
        const store = useDroneStore.getState() as any;
        if (store.toggleControlsOverlay) {
          store.toggleControlsOverlay();
        }
      },
      onChecklistToggle: () => {
        const store = useDroneStore.getState() as any;
        if (store.toggleChecklist) {
          store.toggleChecklist();
        }
      },
      onAcademyToggle: () => {
        const store = useDroneStore.getState() as any;
        if (store.toggleAcademy) {
          store.toggleAcademy();
        }
      },
      onCameraChange: (camIndex) => {
        const store = useDroneStore.getState() as any;
        const views = ['chase', 'fpv', 'orbit'];
        if (store.setFlightCameraView) {
          store.setFlightCameraView(views[camIndex - 1]);
        }
      },
      onResetSim: () => this.reset()
    });
  }
  
  public destroy(): void {
    this.input.destroy();
  }
  
  public reset(): void {
    this.state = {
      position: new THREE.Vector3(0, 0.02, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(),
      angularVelocity: new THREE.Vector3(0, 0, 0)
    };
    
    this.prevState = {
      position: new THREE.Vector3(0, 0.02, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(),
      angularVelocity: new THREE.Vector3(0, 0, 0)
    };

    this.renderState = {
      position: new THREE.Vector3(0, 0.02, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(),
      angularVelocity: new THREE.Vector3(0, 0, 0)
    };
    
    this.linearAcceleration.set(0, 0, 0);
    this.motorCommands = [0, 0, 0, 0];
    this.timeAccumulator = 0.0;
    
    this.isArmed = false;
    this.isCalibrating = true;
    this.calibrationTimer = 0.0;
    this.isFailsafeActive = false;
    
    this.crashDetected = false;
    this.wallCollision = false;
    this.lowBattery = false;
    this.hardLanding = false;
    this.boundaryExceeded = false;
    this.hasTakenOff = false;
    this.hasWarnedLowBattery = false;
    this.hasWarnedBoundary = false;
    this.hasWarnedWallCollision = false;
    
    this.physics.reset();
    this.controller.reset();
    this.sensors.reset();
    this.telemetry.reset();
    this.input.reset();
    
    // Clear store failure/diagnostics so pre-flight boot restarts cleanly
    const store = useDroneStore.getState();
    store.setDroneInitFailed(false);
    store.setDroneSpawnDiagnostics(null);
    
    // Auto-engage Altitude Hold on startup
    this.controller.isAltHoldActive = true;
  }
  
  private toggleArm(): void {
    // Cannot arm if sensors failed calibration
    if (this.sensors.hasCalibrationFailed()) {
      return;
    }
    
    if (this.isArmed) {
      this.disarm();
    } else {
      this.arm();
    }
  }
  
  public arm(): void {
    if (this.isArmed) return;
    this.isArmed = true;
    this.crashDetected = false;
    this.hardLanding = false;
    this.hasTakenOff = false;
    this.controller.reset();
    this.controller.isAltHoldActive = true; // start in Alt Hold mode
    
    // Set altitude lock to current barometer altitude
    const sensorData = this.sensors.update(this.state, this.linearAcceleration, 0);
    this.controller.setAltitudeLock(sensorData.baroAltitude);

    const store = useDroneStore.getState() as any;
    if (store.addNotification) {
      store.addNotification('ARMED', 'success');
    }
  }
  
  public disarm(): void {
    if (!this.isArmed) return;
    
    // Check for safe landing
    const altitude = this.state.position.y - 0.02;
    const vSpeed = this.state.velocity.y;
    const isSoft = altitude < 0.02 && vSpeed > -0.8;
    
    this.isArmed = false;
    this.motorCommands = [0, 0, 0, 0];
    
    const store = useDroneStore.getState() as any;
    if (store.addNotification) {
      store.addNotification('DISARMED', 'info');
      if (isSoft && this.hasTakenOff) {
        store.addNotification('SAFE LANDING', 'success');
      }
    }
    this.hasTakenOff = false;
  }
  
  public calibrate(): void {
    // 1. Force calibration in sensor simulator
    this.sensors.forceCalibrate();
    
    // 2. Zero drone pitch and roll, keep yaw
    const euler = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
    euler.x = 0;
    euler.z = 0;
    this.state.quaternion.setFromEuler(euler);
    
    // 3. Set relative yawOffset matching current yaw
    const yawDeg = euler.y * (180.0 / Math.PI);
    this.telemetry.setYawOffset(-yawDeg);
    
    // 4. Zero angular velocities
    this.state.angularVelocity.set(0, 0, 0);
    
    // 5. Reset orchestrator calibration flags
    this.isCalibrating = false;
    this.calibrationTimer = 2.0; // finish calibrating sequence
    this.crashDetected = false;
    this.hardLanding = false;
    this.boundaryExceeded = false;
    this.lowBattery = false;
    this.wallCollision = false;
    this.collisionTimer = 0;
    
    // 6. Notify store
    const store = useDroneStore.getState() as any;
    if (store.addNotification) {
      store.addNotification('CALIBRATION SUCCESSFUL', 'success');
    }
  }
  
  // Updates simulation based on actual frame rendering time
  public update(frameTimeSeconds: number): TelemetryData {
    // Avoid large frames (e.g. background tab) causing simulation explosions
    const dt = Math.min(frameTimeSeconds, 0.1);
    this.timeAccumulator += dt;
    
    // Run fixed 60Hz simulation updates
    // Clamp maximum steps per frame to avoid death spirals during lag
    let steps = Math.floor(this.timeAccumulator / this.fixedTimestep);
    if (steps > 3) {
      this.timeAccumulator = this.fixedTimestep;
      steps = 1;
    }

    if (steps > 0) {
      this.prevState.position.copy(this.state.position);
      this.prevState.velocity.copy(this.state.velocity);
      this.prevState.quaternion.copy(this.state.quaternion);
      this.prevState.angularVelocity.copy(this.state.angularVelocity);
    }

    while (this.timeAccumulator >= this.fixedTimestep) {
      this.simulationStep(this.fixedTimestep);
      this.timeAccumulator -= this.fixedTimestep;
    }

    // Interpolate render state
    const alpha = this.timeAccumulator / this.fixedTimestep;
    this.renderState.position.lerpVectors(this.prevState.position, this.state.position, alpha);
    this.renderState.quaternion.copy(this.prevState.quaternion).slerp(this.state.quaternion, alpha);
    this.renderState.velocity.lerpVectors(this.prevState.velocity, this.state.velocity, alpha);
    this.renderState.angularVelocity.lerpVectors(this.prevState.angularVelocity, this.state.angularVelocity, alpha);
    
    // Interpolate sensor readings and compile telemetry for display
    const sensorData = this.sensors.update(this.state, this.linearAcceleration, 0);
    
    const telemetryData = this.telemetry.update(
      this.state,
      this.motorCommands,
      this.isArmed,
      sensorData.hasError,
      this.isCalibrating,
      this.isFailsafeActive ? 'failsafe' : (this.controller.isAltHoldActive ? 'althold' : 'stabilize'),
      dt
    );
    
    // Sync telemetry state with warning conditions
    const wasLowBattery = this.lowBattery;
    this.lowBattery = telemetryData.battery < 15;
    if (this.lowBattery && !wasLowBattery && this.isArmed && !this.hasWarnedLowBattery) {
      this.hasWarnedLowBattery = true;
      const store = useDroneStore.getState() as any;
      if (store.addNotification) {
        store.addNotification('LOW BATTERY', 'warning');
      }
    } else if (!this.lowBattery) {
      this.hasWarnedLowBattery = false;
    }
    
    return telemetryData;
  }
  
  // Single discrete step of the simulation pipeline
  private simulationStep(dt: number): void {
    // 1. Process calibration timing
    if (this.isCalibrating) {
      this.calibrationTimer += dt;
      if (this.calibrationTimer >= 2.0) {
        this.isCalibrating = false;
      }
    }
    
    // 2. Poll user keyboard input
    const stick = this.input.update(dt, this.isArmed);
    
    // 3. Process Sensor simulation
    const sensorData = this.sensors.update(this.state, this.linearAcceleration, dt);
    
    // Check for takeoff detected
    if (this.isArmed && !this.hasTakenOff) {
      const altitude = this.state.position.y - 0.02;
      if (altitude > 0.15) {
        this.hasTakenOff = true;
        const store = useDroneStore.getState() as any;
        if (store.addNotification) {
          store.addNotification('TAKEOFF DETECTED', 'info');
        }
      }
    }
    
    // If sensor error was triggered during calibration, disarm immediately
    if (sensorData.hasError) {
      this.disarm();
    }
    
    // 4. Run Flight Failsafe Systems
    // Auto-engage failsafe landing if battery is empty, boundary exceeded, or sensor fails
    if (this.isArmed && !this.isFailsafeActive) {
      const distance = new THREE.Vector3(this.state.position.x, 0, this.state.position.z).length();
      const height = this.state.position.y;
      
      const isOutOfBounds = distance > 14.5 || height > 11.5;
      const isBatteryDead = this.telemetry.getBattery() <= 2.0;
      
      if (isOutOfBounds || isBatteryDead || sensorData.hasError) {
        this.isFailsafeActive = true;
        this.boundaryExceeded = isOutOfBounds;
        if (isOutOfBounds && !this.hasWarnedBoundary) {
          this.hasWarnedBoundary = true;
          const store = useDroneStore.getState() as any;
          if (store.addNotification) {
            store.addNotification('BOUNDARY EXCEEDED', 'error');
          }
        }
      }
    }
    
    // 5. Compute motor outputs via flight controller
    if (this.isArmed) {
      if (this.isCalibrating) {
        // Spin motors at visual idle speed during calibration
        this.motorCommands = [0.08, 0.08, 0.08, 0.08];
      } else if (this.isFailsafeActive) {
        // Failsafe auto-descent: override stick inputs, lock level, and slowly land (-0.45 m/s)
        const failsafeStick = {
          throttle: 0.38, // descending throttle
          yaw: 0.0,
          pitch: 0.0,
          roll: 0.0
        };
        
        // Feed direct horizontal damping
        const estAttitude = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
        
        this.motorCommands = this.controller.update(
          failsafeStick,
          sensorData,
          estAttitude,
          this.state.velocity,
          dt
        );
      } else {
        // Standard Pilot Flight Mode
        const estAttitude = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
        
        this.motorCommands = this.controller.update(
          stick,
          sensorData,
          estAttitude,
          this.state.velocity,
          dt
        );
      }
    } else {
      this.motorCommands = [0, 0, 0, 0];
    }
    
    // 6. Run Physics Integrator Step
    const oldVelocity = this.state.velocity.clone();
    
    this.state = this.physics.step(this.state, this.motorCommands, dt);
    
    // Calculate acceleration vector for sensors: dv/dt
    this.linearAcceleration.subVectors(this.state.velocity, oldVelocity).multiplyScalar(1.0 / dt);
    
    // 7. Safety Audits (Crashes and landing collisions)
    this.auditSafety(oldVelocity, dt);
  }
  
  // Check for crash scenarios
  private auditSafety(oldVelocity: THREE.Vector3, dt: number): void {
    if (!this.isArmed) return;
    
    // A. Orientation crash check: if drone tilts past 78 degrees close to boundaries or floor
    const euler = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
    const rollAngle = Math.abs(euler.z);
    const pitchAngle = Math.abs(euler.x);
    
    if (rollAngle > 1.36 || pitchAngle > 1.36) { // ~78 degrees
      // If we are inverted/tilted near the floor (altitude < 0.15m), trigger immediate crash disarm
      if (this.state.position.y < 0.15) {
        this.crashDetected = true;
        const store = useDroneStore.getState() as any;
        if (store.addNotification) {
          store.addNotification('CRASH DETECTED', 'error');
        }
        this.disarm();
        return;
      }
    }

    // A2. Obstacle & Hoop Collision Detection (Phase 2-4 real obstacle physics)
    const store = useDroneStore.getState() as any;
    const envType = store.flightEnvironment;
    const droneRadius = 0.08; // 8cm clearance radius around drone center

    // Box Obstacles depending on active environment
    let boxObstacles: { c: [number, number, number]; s: [number, number, number]; label: string }[] = [];
    if (envType === 'room') {
      boxObstacles = [
        { c: [-2.5, 0.4, -2.5], s: [1.5, 0.8, 1.5], label: 'Desk Table' },
        { c: [2.5, 0.6, -1.0], s: [0.8, 1.2, 0.8], label: 'Book Shelf' },
        { c: [-3.0, 0.45, 2.5], s: [1.2, 0.9, 1.2], label: 'Cabinet' }
      ];
    } else if (envType === 'lab') {
      boxObstacles = [
        { c: [-3.5, 0.5, -3.5], s: [2.5, 1.0, 1.2], label: 'Bench A' },
        { c: [3.5, 0.5, -3.5], s: [2.5, 1.0, 1.2], label: 'Bench B' },
        { c: [-4.0, 0.6, 2.0], s: [1.5, 1.2, 1.5], label: 'Component Locker' }
      ];
    } else if (envType === 'classroom') {
      boxObstacles = [
        { c: [0, 0.45, -6.5], s: [1.6, 0.9, 0.8], label: "Teacher's Desk" },
        { c: [-2.5, 0.375, -2.5], s: [1.1, 0.75, 0.6], label: 'Student Desk 1' },
        { c: [0, 0.375, -2.5], s: [1.1, 0.75, 0.6], label: 'Student Desk 2' },
        { c: [2.5, 0.375, -2.5], s: [1.1, 0.75, 0.6], label: 'Student Desk 3' },
        { c: [-2.5, 0.375, 1.5], s: [1.1, 0.75, 0.6], label: 'Student Desk 4' },
        { c: [0, 0.375, 1.5], s: [1.1, 0.75, 0.6], label: 'Student Desk 5' },
        { c: [2.5, 0.375, 1.5], s: [1.1, 0.75, 0.6], label: 'Student Desk 6' },
        { c: [-7.5, 1.0, 4.0], s: [1.2, 2.0, 0.8], label: 'Bookshelf' }
      ];
    } else if (envType === 'warehouse') {
      boxObstacles = [
        { c: [-5.0, 1.5, -4.0], s: [2.0, 3.0, 1.2], label: 'Storage Rack A' },
        { c: [5.0, 1.5, -4.0], s: [2.0, 3.0, 1.2], label: 'Storage Rack B' },
        { c: [-6.0, 0.75, 4.0], s: [1.5, 1.5, 1.5], label: 'Cargo Crate A' },
        { c: [6.0, 0.75, 4.0], s: [1.5, 1.5, 1.5], label: 'Cargo Crate B' },
        { c: [0.0, 1.0, -8.0], s: [4.0, 2.0, 1.0], label: 'Pallet Rack' }
      ];
    } else if (envType === 'field') {
      boxObstacles = [
        { c: [-4.5, 1.8, -4.5], s: [0.8, 3.6, 0.8], label: 'Conifer Tree' },
        { c: [5.5, 1.2, -6.5], s: [1.0, 2.4, 1.0], label: 'Granite Boulder' },
        { c: [-6.5, 1.5, 5.5], s: [0.6, 3.0, 0.6], label: 'Telemetry Mast' }
      ];
    } else if (envType === 'course') {
      boxObstacles = [
        { c: [-5.0, 1.8, 3.0], s: [0.8, 3.6, 0.8], label: 'Tower A' },
        { c: [5.0, 1.8, 3.0], s: [0.8, 3.6, 0.8], label: 'Tower B' },
        { c: [0.0, 1.8, -5.0], s: [1.2, 3.6, 1.2], label: 'Center Column' },
        { c: [-2.5, 0.5, 6.0], s: [1.5, 1.0, 1.5], label: 'Hazard Zone 1' },
        { c: [2.5, 0.5, 6.0], s: [1.5, 1.0, 1.5], label: 'Hazard Zone 2' },
        { c: [-1.25, 1.1, 1.5], s: [0.2, 2.2, 0.25], label: 'Arch 1 Left Pillar' },
        { c: [1.25, 1.1, 1.5], s: [0.2, 2.2, 0.25], label: 'Arch 1 Right Pillar' },
        { c: [0, 2.2, 1.5], s: [2.7, 0.2, 0.25], label: 'Arch 1 Beam' }
      ];
    }

    // Check box collisions
    for (const box of boxObstacles) {
      const hX = box.s[0] / 2;
      const hY = box.s[1] / 2;
      const hZ = box.s[2] / 2;
      const minX = box.c[0] - hX;
      const maxX = box.c[0] + hX;
      const minY = box.c[1] - hY;
      const maxY = box.c[1] + hY;
      const minZ = box.c[2] - hZ;
      const maxZ = box.c[2] + hZ;

      const closestX = Math.max(minX, Math.min(this.state.position.x, maxX));
      const closestY = Math.max(minY, Math.min(this.state.position.y, maxY));
      const closestZ = Math.max(minZ, Math.min(this.state.position.z, maxZ));

      const dx = this.state.position.x - closestX;
      const dy = this.state.position.y - closestY;
      const dz = this.state.position.z - closestZ;

      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < droneRadius * droneRadius) {
        this.crashDetected = true;
        if (store.addNotification) {
          store.addNotification(`CRASHED INTO ${box.label.toUpperCase()}`, 'error');
        }
        this.disarm();
        return;
      }
    }

    // Hoop/Ring Obstacles in Course environment
    if (envType === 'course') {
      const activeMissionIndex = store.activeMissionIndex;
      if (activeMissionIndex === 9 || activeMissionIndex === 10) {
        const hoops = [
          { id: 'gate1_hoop', c: [-2.5, 1.2, -2.5], r: 0.65, t: 0.05 },
          { id: 'gate2_hoop', c: [0.0, 1.8, 3.5], r: 0.65, t: 0.05 },
          { id: 'gate3_hoop', c: [2.5, 1.2, -2.5], r: 0.65, t: 0.05 }
        ];

        for (const hoop of hoops) {
          const distPlane = Math.abs(this.state.position.z - hoop.c[2]);
          if (distPlane < hoop.t + droneRadius) {
            const distRadial = Math.sqrt(
              (this.state.position.x - hoop.c[0]) ** 2 +
              (this.state.position.y - hoop.c[1]) ** 2
            );

            const innerLimit = hoop.r - hoop.t - droneRadius;
            const outerLimit = hoop.r + hoop.t + droneRadius;

            if (distRadial >= innerLimit && distRadial <= outerLimit) {
              this.crashDetected = true;
              if (store.addNotification) {
                store.addNotification('CRASHED INTO GATE FRAME', 'error');
              }
              this.disarm();
              return;
            }
          }
        }
      }
    }
    
    // B. Wall collision detection: check if position snapped back from walls in PhysicsEngine
    const b = this.physics.environmentBounds;
    const isAtWall = 
      this.state.position.x <= b.minX || this.state.position.x >= b.maxX ||
      this.state.position.z <= b.minZ || this.state.position.z >= b.maxZ;
      
    if (isAtWall) {
      // If we hit with significant velocity (horizontal speed > 0.6 m/s), trigger warning
      const horizSpeedOld = Math.sqrt(oldVelocity.x * oldVelocity.x + oldVelocity.z * oldVelocity.z);
      if (horizSpeedOld > 0.6) {
        this.wallCollision = true;
        this.collisionTimer = 0.8; // warning stays active for 0.8s
        if (!this.hasWarnedWallCollision) {
          this.hasWarnedWallCollision = true;
          const store = useDroneStore.getState() as any;
          if (store.addNotification) {
            store.addNotification('WALL COLLISION', 'warning');
          }
        }
      }
    } else {
      this.hasWarnedWallCollision = false;
    }
    
    if (this.collisionTimer > 0) {
      this.collisionTimer -= dt;
      if (this.collisionTimer <= 0) {
        this.wallCollision = false;
      }
    }
    
    // C. Hard Landing Check: if we hit the floor (alt <= minY) with high descent rate
    if (this.state.position.y <= this.physics.environmentBounds.minY + 0.005) {
      const stick = this.input.getStickState();
      
      if (oldVelocity.y < -1.45) { // landing faster than 1.45m/s downward
        this.hardLanding = true;
        const store = useDroneStore.getState() as any;
        if (store.addNotification) {
          store.addNotification('CRASH DETECTED', 'error');
        }
        this.disarm();
      } else if (oldVelocity.y < -0.1) {
        // Soft landing: disarm naturally if pilot keeps pulling throttle down on floor
        if (stick.throttle < 0.05 && this.hasTakenOff) {
          this.disarm();
        }
      } else {
        // Auto-disarm if resting on the pad and throttle is held at zero
        if (stick.throttle < 0.05 && this.hasTakenOff) {
          this.disarm();
        }
      }
    }
  }
  
  // Public Accessors
  public getPhysicsState(): RigidBodyState {
    return this.state;
  }

  public getRenderState(): RigidBodyState {
    return this.renderState;
  }
  
  public getMotorCommands(): number[] {
    return this.motorCommands;
  }
  
  public getWarnings(): string[] {
    const list: string[] = [];
    if (this.sensors.hasCalibrationFailed()) list.push('SENSOR ERROR');
    else if (this.isCalibrating) list.push('SENSOR CALIBRATING');
    
    if (this.crashDetected) list.push('CRASH DETECTED');
    if (this.hardLanding) list.push('HARD LANDING');
    if (this.wallCollision) list.push('WALL COLLISION');
    if (this.lowBattery) list.push('LOW BATTERY');
    if (this.boundaryExceeded) list.push('BOUNDARY EXCEEDED');
    
    return list;
  }
  
  public setAltitudeHold(active: boolean): void {
    this.controller.isAltHoldActive = active;
    if (active) {
      const sensorData = this.sensors.update(this.state, this.linearAcceleration, 0);
      this.controller.setAltitudeLock(sensorData.baroAltitude);
    }
  }
  
  public isAltHold(): boolean {
    return this.controller.isAltHoldActive;
  }
}
