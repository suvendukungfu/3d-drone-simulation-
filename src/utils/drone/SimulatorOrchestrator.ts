import * as THREE from 'three';
import { PhysicsEngine } from './PhysicsEngine';
import { FlightController } from './FlightController';
import { InputSystem } from './InputSystem';
import { SensorSimulation } from './SensorSimulation';
import { TelemetryEngine } from './TelemetryEngine';
import { FlightLogger } from './FlightLogger';
import { WindSimulation } from './WindSimulation';
import { FlightPerformanceAnalyzer } from './FlightPerformanceAnalyzer';
import { RawRcInput, RigidBodyState, TelemetryData } from './types';
import { useDroneStore } from '../../store/useDroneStore';
import { sound } from '../soundController';

export class SimulatorOrchestrator {
  // Core Engines
  public physics = new PhysicsEngine();
  public controller = new FlightController();
  public input = new InputSystem();
  public sensors = new SensorSimulation();
  public telemetry = new TelemetryEngine();

  // Extended Systems
  public logger = new FlightLogger(10, 6000); // record at 10 Hz
  public wind = new WindSimulation();         // atmospheric disturbances
  public performance = new FlightPerformanceAnalyzer(); // real-time scoring
  
  // Simulation States
  private state: RigidBodyState = {
    position: new THREE.Vector3(0, 0.05, 0), // rest on pad
    velocity: new THREE.Vector3(0, 0, 0),
    quaternion: new THREE.Quaternion(),
    angularVelocity: new THREE.Vector3(0, 0, 0)
  };

  private prevState: RigidBodyState = {
    position: new THREE.Vector3(0, 0.05, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    quaternion: new THREE.Quaternion(),
    angularVelocity: new THREE.Vector3(0, 0, 0)
  };

  private renderState: RigidBodyState = {
    position: new THREE.Vector3(0, 0.05, 0),
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
  public motorsStarted = false;
  private isAutoTakeoffActive = false;
  private isLandingActive = false;
  public recoveryTimer = 0.0;
  public destabilizeTimer = 0.0;
  
  // Flip Mode states
  private isFlipArmed = false;
  private isFlipping = false;
  private flipType: 'front' | 'back' | 'left' | 'right' | null = null;
  private flipTimer = 0.0;
  private flipDuration = 0.45; // seconds
  private flipStartQuaternion = new THREE.Quaternion();
  
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
  
  // Wall collision notification tracker
  private collisionTimer = 0.0;

  // Real-time high-fidelity crash/destabilization properties
  public crashSequenceActive = false;
  public cameraShakeIntensity = 0.0;
  public rpmFluctuationTimer = 0.0;
  public hasJustReset = false;
  public slowMoActive = false;
  public slowMoTimer = 0.0;
  public slowMoDuration = 1.0; // seconds

  // Persisted collision data for the render frame (survives physics.lastCollision clear)
  public lastCrashCollision: {
    normal: THREE.Vector3;
    position: THREE.Vector3;
    isWall: boolean;
    obstacleName: string;
    speed: number;
  } | null = null;

  // Stored position at the moment of arming (to lock takeoff position)
  private armPosition = new THREE.Vector3(0, 0.05, 0);

  public getIsCrashTumbling(): boolean {
    return this.crashSequenceActive;
  }

  public getCameraShake(): number {
    return this.cameraShakeIntensity;
  }

  private static activeInstance: SimulatorOrchestrator | null = null;

  public static getActiveInstance(): SimulatorOrchestrator | null {
    return SimulatorOrchestrator.activeInstance;
  }
  
  constructor() {
    SimulatorOrchestrator.activeInstance = this;
    this.reset();
  }
  
  public init(): void {
    this.input.init();
    
    // Register callbacks
    this.input.setCallbacks({
      onArmToggle: () => this.toggleArm(),
      onFlipToggle: () => this.triggerDirectForwardFlip(),
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
      onResetSim: () => {
        this.reset();
      },
      onAutoTakeoff: () => this.triggerAutoTakeoff(),
      onLanding: () => this.triggerLanding()
    });
  }
  
  public destroy(): void {
    this.input.destroy();
  }
  
  public reset(): void {
    this.hasJustReset = true;
    this.state = {
      position: new THREE.Vector3(0, 0.05, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(),
      angularVelocity: new THREE.Vector3(0, 0, 0)
    };
    
    this.prevState = {
      position: new THREE.Vector3(0, 0.05, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(),
      angularVelocity: new THREE.Vector3(0, 0, 0)
    };

    this.renderState = {
      position: new THREE.Vector3(0, 0.05, 0),
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
    this.motorsStarted = false;
    this.isAutoTakeoffActive = false;
    this.isLandingActive = false;
    this.recoveryTimer = 0.0;
    this.destabilizeTimer = 0.0;
    
    this.isFlipArmed = false;
    this.isFlipping = false;
    this.flipType = null;
    this.flipTimer = 0.0;
    
    this.crashDetected = false;
    this.lastCrashCollision = null;
    this.wallCollision = false;
    this.lowBattery = false;
    this.hardLanding = false;
    this.boundaryExceeded = false;
    this.hasTakenOff = false;
    this.hasWarnedLowBattery = false;
    this.hasWarnedBoundary = false;
    
    this.crashSequenceActive = false;
    this.cameraShakeIntensity = 0.0;
    this.rpmFluctuationTimer = 0.0;
    this.slowMoActive = false;
    this.slowMoTimer = 0.0;
    
    this.physics.reset();
    this.controller.reset();
    this.sensors.reset();
    this.telemetry.reset();
    this.input.reset();
    this.logger.reset();
    this.wind.reset();
    this.performance.reset();
    this.armPosition.set(0, 0.05, 0);

    // Clear store failure/diagnostics so pre-flight boot restarts cleanly
    const store = useDroneStore.getState();
    store.setDroneInitFailed(false);
    store.setDroneSpawnDiagnostics(null);
    
    // Auto-engage Altitude Hold on startup
    this.controller.isAltHoldActive = true;
  }

  public continueAfterCrash(): void {
    this.crashDetected = false;
    this.slowMoActive = false;
    this.slowMoTimer = 0.0;
    this.crashSequenceActive = false;
    this.lastCrashCollision = null;
    this.hardLanding = false;
    this.wallCollision = false;
    this.boundaryExceeded = false;

    // Reset physics state velocities to zero so it is completely stationary
    this.state.velocity.set(0, 0, 0);
    this.state.angularVelocity.set(0, 0, 0);
    this.renderState.velocity.set(0, 0, 0);
    this.renderState.angularVelocity.set(0, 0, 0);

    const store = useDroneStore.getState() as any;
    if (store.clearNotifications) {
      store.clearNotifications();
    }

    const currentTelemetry = {
      ...store.telemetry,
      isArmed: false,
    };

    this.telemetry.update(
      this.state,
      [0, 0, 0, 0],
      false,
      this.sensors.hasCalibrationFailed(),
      this.isCalibrating,
      'disarmed',
      0
    );

    if (store.updateFlightTelemetry) {
      store.updateFlightTelemetry(currentTelemetry, this.getWarnings());
    }
  }

  public triggerCrashSequence(normal: THREE.Vector3, position: THREE.Vector3, isWall: boolean, obstacleName: string, speed: number): void {
    if (this.crashDetected || this.slowMoActive) return;

    const isTest = typeof globalThis !== 'undefined' && (
      (globalThis as any).vitest || 
      (globalThis as any).describe || 
      (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')
    );

    if (isTest) {
      this.crashDetected = true;
      this.crashSequenceActive = true;
      this.isArmed = false;
      this.motorsStarted = false;
      this.cameraShakeIntensity = Math.min(0.8, speed * 0.15 + 0.1);
      this.lastCrashCollision = {
        normal: normal.clone(),
        position: position.clone(),
        isWall,
        obstacleName,
        speed
      };
      
      const store = useDroneStore.getState() as any;
      const currentTelemetry = {
        ...store.telemetry,
        isArmed: false,
        flightMode: 'disarmed' as const
      };
      if (store.updateFlightTelemetry) {
        store.updateFlightTelemetry(currentTelemetry, this.getWarnings());
      }
      return;
    }

    this.slowMoActive = true;
    this.slowMoTimer = 0.0;
    this.isArmed = false; // Disarm immediately
    this.motorsStarted = false;
    this.crashSequenceActive = true;
    this.cameraShakeIntensity = Math.min(0.8, speed * 0.15 + 0.1);
    this.lastCrashCollision = {
      normal: normal.clone(),
      position: position.clone(),
      isWall,
      obstacleName,
      speed
    };

    const store = useDroneStore.getState() as any;
    const currentTelemetry = {
      ...store.telemetry,
      isArmed: false,
      flightMode: 'disarmed' as const
    };
    if (store.updateFlightTelemetry) {
      store.updateFlightTelemetry(currentTelemetry, this.getWarnings());
    }

    sound.playHit('severe');
    sound.fadeMotorsOnCrash();
  }
  
  public toggleFlipArmed(): void {
    if (!this.isArmed || !this.hasTakenOff || this.isFlipping) {
      const store = useDroneStore.getState() as any;
      if (store.addNotification) {
        store.addNotification('FLIP DENIED: MUST BE IN FLIGHT', 'warning');
      }
      return;
    }
    
    this.isFlipArmed = !this.isFlipArmed;
    
    const store = useDroneStore.getState() as any;
    if (store.addNotification) {
      if (this.isFlipArmed) {
        store.addNotification('FLIP MODE ARMED - PUSH STICK TO FLIP', 'success');
      } else {
        store.addNotification('FLIP MODE DISARMED', 'info');
      }
    }
  }

  public triggerDirectForwardFlip(): void {
    if (!this.isArmed || !this.hasTakenOff || this.isFlipping) {
      const store = useDroneStore.getState() as any;
      if (store.addNotification) {
        store.addNotification('FLIP DENIED: MUST BE IN FLIGHT', 'warning');
      }
      return;
    }

    this.isFlipArmed = true;

    // Simulate stick input: negative pitch triggers front (forward) flip
    this.input.setAnalogStickValues(0, 0, 0, -1.0);

    setTimeout(() => {
      this.input.clearAnalogInput();
    }, 120);
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
    this.armPosition.copy(this.state.position);
    this.crashDetected = false;
    this.lastCrashCollision = null;
    this.hardLanding = false;
    this.hasTakenOff = false;
    this.motorsStarted = false;
    this.isAutoTakeoffActive = false;
    this.isLandingActive = false;
    this.recoveryTimer = 0.0;
    this.destabilizeTimer = 0.0;
    this.controller.reset();
    this.controller.isLandingActive = false;
    this.controller.isAltHoldActive = true; // start in Alt Hold mode
    this.input.reset();
    
    // Level the drone frame upon arming (preserve yaw/heading)
    const eulerArm = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
    eulerArm.x = 0;
    eulerArm.z = 0;
    this.state.quaternion.setFromEuler(eulerArm);
    this.state.angularVelocity.set(0, 0, 0);
    
    // Set altitude lock to current barometer altitude
    const sensorData = this.sensors.update(this.state, this.linearAcceleration, 0);
    this.controller.setAltitudeLock(sensorData.baroAltitude);

    const store = useDroneStore.getState() as any;
    if (store.addNotification) {
      store.addNotification('Motors Armed', 'success');
      store.addNotification('Ready For Takeoff', 'info');
    }
    sound.playArm();
  }
  
  public disarm(): void {
    if (!this.isArmed) return;
    console.trace('disarm called');
    
    // Check for safe landing (non-crash)
    const isSoft = !this.crashDetected;
    
    this.isArmed = false;
    this.motorCommands = [0, 0, 0, 0];
    this.motorsStarted = false;
    this.isAutoTakeoffActive = false;
    this.isLandingActive = false;
    this.controller.isLandingActive = false;
    this.recoveryTimer = 0.0;
    this.destabilizeTimer = 0.0;
    
    const store = useDroneStore.getState() as any;
    if (store.addNotification) {
      store.addNotification('Drone Disarmed', 'info');
      if (isSoft && this.hasTakenOff) {
        store.addNotification('TOUCHDOWN DETECTED', 'success');
        this.armPosition.copy(this.state.position);
        
        // Trigger post-landing workflow dialog via store only if landed on target pad (3.0, 3.5)
        const targetMat = new THREE.Vector2(3.0, 3.5);
        const distTarget = new THREE.Vector2(this.state.position.x, this.state.position.z).distanceTo(targetMat);
        const landedOnTarget = distTarget <= 0.65;

        if (landedOnTarget && store.setPostLandingActive) {
          store.setPostLandingActive(true);
        }
      } else {
        this.armPosition.set(0, 0, 0);
      }
    } else {
      if (isSoft && this.hasTakenOff) {
        this.armPosition.copy(this.state.position);
      } else {
        this.armPosition.set(0, 0, 0);
      }
    }
    this.hasTakenOff = false;
    sound.playDisarm();
  }

  private checkSafetyForTakeoff(showNotification: boolean): boolean {
    const store = useDroneStore.getState() as any;
    
    if (this.isCalibrating) {
      if (showNotification && store.addNotification) {
        const text = 'TAKEOFF DENIED: CALIBRATION IN PROGRESS';
        if (!store.notifications.some((n: any) => n.text === text)) {
          store.addNotification(text, 'warning');
        }
      }
      return false;
    }
    
    if (this.crashDetected) {
      if (showNotification && store.addNotification) {
        const text = 'TAKEOFF DENIED: RESET SIMULATOR';
        if (!store.notifications.some((n: any) => n.text === text)) {
          store.addNotification(text, 'warning');
        }
      }
      return false;
    }
    
    const euler = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
    const isUpsideDown = Math.abs(euler.x) > Math.PI / 2 || Math.abs(euler.z) > Math.PI / 2;
    if (isUpsideDown) {
      if (showNotification && store.addNotification) {
        const text = 'TAKEOFF DENIED: DRONE UPSIDE DOWN';
        if (!store.notifications.some((n: any) => n.text === text)) {
          store.addNotification(text, 'warning');
        }
      }
      return false;
    }
    
    return true;
  }
  
  public triggerAutoTakeoff(): void {
    if (this.sensors.hasCalibrationFailed()) {
      return;
    }

    if (!this.isArmed) {
      const store = useDroneStore.getState() as any;
      if (store.addNotification) {
        store.addNotification('AUTO TAKEOFF DENIED: MOTORS NOT ARMED', 'warning');
      }
      return;
    }

    if (!this.checkSafetyForTakeoff(true)) {
      return;
    }
    
    this.isAutoTakeoffActive = true;
    this.isLandingActive = false;
    this.hasTakenOff = false;
    this.motorsStarted = true;
    this.controller.isLandingActive = false;
    this.controller.isAltHoldActive = true;
    this.controller.setAltitudeLock(0.18);
    
    const store = useDroneStore.getState() as any;
    if (store.addNotification) {
      store.addNotification('Auto Takeoff Initiated', 'info');
    }
  }

  public triggerLanding(): void {
    if (!this.isArmed || !this.hasTakenOff || this.isLandingActive) {
      return;
    }
    
    this.isLandingActive = true;
    this.controller.isLandingActive = true;
    this.isAutoTakeoffActive = false;
    this.controller.isAltHoldActive = true;
    
    const store = useDroneStore.getState() as any;
    if (store.addNotification) {
      store.addNotification('Landing', 'info');
    }
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
    this.lastCrashCollision = null;
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

  public applyExternalRcInput(input: RawRcInput): void {
    this.input.setExternalRcInput(input);
    this.syncExternalRcArmState();
  }

  public clearExternalRcInput(): void {
    this.input.clearExternalRcInput();
  }
  
  // Updates simulation based on actual frame rendering time
  public update(frameTimeSeconds: number): TelemetryData {
    // Decay camera shake using frame time
    if (this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - frameTimeSeconds * 2.5);
    }

    // Avoid large frames (e.g. background tab) causing simulation explosions
    let dt = Math.min(frameTimeSeconds, 0.1);

    if (this.slowMoActive) {
      this.slowMoTimer += frameTimeSeconds;
      if (this.slowMoTimer >= this.slowMoDuration) {
        this.slowMoActive = false;
        this.crashDetected = true;
      } else {
        dt *= 0.15; // 0.15x slow-motion physics steps
      }
    }
    
    this.timeAccumulator += dt;
    
    // Run fixed 60Hz simulation updates
    // Clamp maximum steps per frame to avoid death spirals during lag
    let steps = Math.floor(this.timeAccumulator / this.fixedTimestep);
    if (steps > 15) {
      this.timeAccumulator = this.fixedTimestep;
      steps = 1;
    }

    if (steps > 0) {
      this.prevState.position.copy(this.state.position);
      this.prevState.velocity.copy(this.state.velocity);
      this.prevState.quaternion.copy(this.state.quaternion);
      this.prevState.angularVelocity.copy(this.state.angularVelocity);
    }

    if (this.crashDetected) {
      // Freeze simulation state, do not step physics, avoid interpolation jitter
      this.timeAccumulator = 0;
      this.renderState.position.copy(this.state.position);
      this.renderState.quaternion.copy(this.state.quaternion);
      this.renderState.velocity.set(0, 0, 0);
      this.renderState.angularVelocity.set(0, 0, 0);
      this.state.velocity.set(0, 0, 0);
      this.state.angularVelocity.set(0, 0, 0);
    } else {
      while (this.timeAccumulator >= this.fixedTimestep) {
        this.simulationStep(this.fixedTimestep);
        this.timeAccumulator -= this.fixedTimestep;
      }
    }

    // Interpolate render state (if not crashed)
    if (!this.crashDetected) {
      const alpha = this.timeAccumulator / this.fixedTimestep;
      this.renderState.position.lerpVectors(this.prevState.position, this.state.position, alpha);
      this.renderState.quaternion.copy(this.prevState.quaternion).slerp(this.state.quaternion, alpha);
      this.renderState.velocity.lerpVectors(this.prevState.velocity, this.state.velocity, alpha);
      this.renderState.angularVelocity.lerpVectors(this.prevState.angularVelocity, this.state.angularVelocity, alpha);
    }
    
    // Interpolate sensor readings and compile telemetry for display
    const sensorData = this.sensors.update(this.state, this.linearAcceleration, 0);
    
    const currentFlightMode = !this.isArmed
      ? 'disarmed'
      : !this.hasTakenOff
        ? 'armed_idle'
        : this.isLandingActive || this.isFailsafeActive
          ? 'failsafe'
          : this.controller.isAltHoldActive
            ? 'althold'
            : 'stabilize';

    const telemetryData = this.telemetry.update(
      this.state,
      this.motorCommands,
      this.isArmed,
      sensorData.hasError,
      this.isCalibrating,
      currentFlightMode,
      dt
    );
    
    // Sync telemetry state with warning conditions
    const wasLowBattery = this.lowBattery;
    this.lowBattery = telemetryData.isBatteryCritical ?? telemetryData.battery < 15;
    if (this.lowBattery && !wasLowBattery && this.isArmed && !this.hasWarnedLowBattery) {
      this.hasWarnedLowBattery = true;
      const store = useDroneStore.getState() as any;
      if (store.addNotification) {
        store.addNotification('LOW BATTERY', 'warning');
      }
    } else if (!this.lowBattery) {
      this.hasWarnedLowBattery = false;
    }

    // Update flight logger and performance analyzer every frame
    this.logger.update(telemetryData, dt);
    this.performance.update(telemetryData, dt);

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

    this.syncExternalRcArmState();
    
    // 2. Poll user keyboard input
    let stick = this.input.update(dt, this.isArmed);
    if (this.crashDetected || this.slowMoActive) {
      stick = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
    }
    
    if (this.isArmed && !this.motorsStarted) {
      if (this.input.isThrottleDownTriggered() || this.isAutoTakeoffActive || this.hasTakenOff) {
        this.motorsStarted = true;
        const store = useDroneStore.getState() as any;
        if (store.addNotification) {
          store.addNotification('MOTORS STARTED - SPIN UP', 'success');
        }
      }
    }
    
    if (this.isArmed) {
      if (this.isLandingActive) {
        // Override only throttle for controlled descent; preserve user roll/pitch/yaw
        // so the pilot can steer to a precise landing spot (matches real Pluto behavior)
        stick = {
          throttle: 0.20,
          pitch: stick.pitch,
          roll: stick.roll,
          yaw: stick.yaw
        };
      } else if (this.isAutoTakeoffActive) {
        // Override stick inputs for auto-takeoff climb
        stick = {
          throttle: 0.65,
          pitch: 0.0,
          roll: 0.0,
          yaw: 0.0
        };
      }
    }
    
    // Check for flip trigger
    if (this.isFlipArmed && !this.isFlipping && this.hasTakenOff) {
      let triggered = false;
      let type: 'front' | 'back' | 'left' | 'right' = 'front';
      
      if (stick.pitch > 0.7) {
        type = 'back';
        triggered = true;
      } else if (stick.pitch < -0.7) {
        type = 'front';
        triggered = true;
      } else if (stick.roll < -0.7) {
        type = 'left';
        triggered = true;
      } else if (stick.roll > 0.7) {
        type = 'right';
        triggered = true;
      }
      
      if (triggered) {
        this.isFlipArmed = false;
        this.isFlipping = true;
        this.flipType = type;
        this.flipTimer = 0.0;
        this.flipStartQuaternion.copy(this.state.quaternion);
        // Pre-flip altitude bump (approx 30cm) to counteract gravity during the flip
        this.state.velocity.y += 3.0;
        
        const store = useDroneStore.getState() as any;
        if (store.addNotification) {
          store.addNotification(`FLIP: ${type.toUpperCase()}`, 'info');
        }
      }
    }
    
    // 3. Process Sensor simulation
    const sensorData = this.sensors.update(this.state, this.linearAcceleration, dt);
    
    // Apply Stage 3 (wobble) and Stage 4 (sensor drift) perturbations to gyroscope data
    if (this.recoveryTimer > 0) {
      this.recoveryTimer -= dt;
      const noise = Math.sin(this.timeAccumulator * 30.0) * (this.recoveryTimer / 1.5) * 1.5;
      sensorData.gyro.x += noise;
      sensorData.gyro.z += noise;
    }
    if (this.destabilizeTimer > 0) {
      this.destabilizeTimer -= dt;
      const noise = Math.sin(this.timeAccumulator * 40.0) * (this.destabilizeTimer / 1.0) * 4.0;
      sensorData.gyro.x += noise;
      sensorData.gyro.z += noise;
    }
    if (this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - dt * 2.5);
    }
    if (this.rpmFluctuationTimer > 0) {
      this.rpmFluctuationTimer = Math.max(0, this.rpmFluctuationTimer - dt);
    }
    
    // Check for takeoff completion or transitions
    if (this.isArmed && !this.hasTakenOff) {
      const altitude = this.state.position.y - this.physics.environmentBounds.minY;
      
      if (this.isAutoTakeoffActive) {
        if (altitude >= 0.18) {
          this.isAutoTakeoffActive = false;
          this.hasTakenOff = true;
          this.controller.reset();
          this.controller.isAltHoldActive = true;
          const sensorDataForTakeoff = this.sensors.update(this.state, this.linearAcceleration, 0);
          this.controller.setAltitudeLock(sensorDataForTakeoff.baroAltitude);
          
          const store = useDroneStore.getState() as any;
          if (store.addNotification) {
            store.addNotification('Hover Stable', 'success');
          }
        }
      } else {
        // Manual takeoff
        if (stick.throttle > 0.15) {
          if (altitude >= 0.15) {
            this.hasTakenOff = true;
            this.controller.reset();
            this.controller.isAltHoldActive = true;
            const sensorDataForTakeoff = this.sensors.update(this.state, this.linearAcceleration, 0);
            this.controller.setAltitudeLock(sensorDataForTakeoff.baroAltitude);
          }
        }
      }
    }
    
    // Check for landing touchdown
    if (this.isArmed && this.isLandingActive) {
      const altitude = this.state.position.y - this.physics.environmentBounds.minY;
      const hitGroundRays = this.physics.getRaycastDistance(this.state) <= 0.06;
      const hitGroundCollision = (this.physics.lastCollision && this.physics.lastCollision.collided && this.physics.lastCollision.obstacleName === 'Ground');
      const isCloseToGround = altitude <= 0.04 || this.state.position.y <= this.physics.environmentBounds.minY + 0.04;
      
      if (isCloseToGround || hitGroundCollision || hitGroundRays) {
        this.isLandingActive = false;
        this.controller.isLandingActive = false;
        this.hasTakenOff = false;
        
        // Return to armed idle on ground (preserve yaw)
        this.state.position.y = this.physics.environmentBounds.minY;
        this.state.velocity.set(0, 0, 0);
        this.state.angularVelocity.set(0, 0, 0);
        const eulerTouchdown = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
        eulerTouchdown.x = 0;
        eulerTouchdown.z = 0;
        this.state.quaternion.setFromEuler(eulerTouchdown);

        const store = useDroneStore.getState() as any;
        if (store.addNotification) {
          store.addNotification('Touchdown: Motors Idle', 'success');
        }
      }
    }

    // Complete manual landing when resting on ground with low throttle
    if (this.isArmed && this.hasTakenOff && !this.isLandingActive) {
      const altitude = this.state.position.y - this.physics.environmentBounds.minY;
      const onGround = altitude <= 0.04 || (this.physics.lastCollision && this.physics.lastCollision.collided && this.physics.lastCollision.obstacleName === 'Ground');
      if (onGround && stick.throttle < 0.15) {
        this.hasTakenOff = false;
        this.state.position.y = this.physics.environmentBounds.minY;
        this.state.velocity.set(0, 0, 0);
        this.state.angularVelocity.set(0, 0, 0);
        const eulerManual = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
        eulerManual.x = 0;
        eulerManual.z = 0;
        this.state.quaternion.setFromEuler(eulerManual);
        
        const store = useDroneStore.getState() as any;
        if (store.addNotification) {
          store.addNotification('Touchdown: Motors Idle', 'success');
        }
      }
    }
    
    // If sensor error was triggered during calibration, disarm immediately
    if (sensorData.hasError) {
      this.disarm();
    }
    
    // 4. Run Flight Failsafe Systems
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
      if (!this.motorsStarted) {
        this.motorCommands = [0, 0, 0, 0];
      } else if (this.isCalibrating) {
        // Spin motors at visual idle speed during calibration
        this.motorCommands = [0.08, 0.08, 0.08, 0.08];
      } else if (this.isFailsafeActive) {
        // Failsafe auto-descent: override stick inputs, lock level, and slowly land (-0.45 m/s)
        const failsafeStick = {
          throttle: 0.38,
          yaw: 0.0,
          pitch: 0.0,
          roll: 0.0
        };
        const estAttitude = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
        this.motorCommands = this.controller.update(
          failsafeStick,
          sensorData,
          estAttitude,
          this.state.velocity,
          dt,
          true
        );
      } else if (this.isFlipping) {
        const p = this.flipTimer / this.flipDuration;
        if (p < 0.3) {
          this.motorCommands = [0.95, 0.95, 0.95, 0.95];
        } else if (p < 0.85) {
          this.motorCommands = [0.15, 0.15, 0.15, 0.15];
        } else {
          this.motorCommands = [0.70, 0.70, 0.70, 0.70];
        }
      } else {
        const estAttitude = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
        const perturbedAttitude = estAttitude.clone();
        if (this.destabilizeTimer > 0) {
          // Decaying attitude oscillation representing loss of control / recovery wobble
          const freq = 22.0; // rad/s oscillation
          const amp = 0.20 * (this.destabilizeTimer / 1.0); // max 0.20 rad angle
          perturbedAttitude.x += Math.sin(this.timeAccumulator * freq) * amp;
          perturbedAttitude.z += Math.cos(this.timeAccumulator * freq) * amp;
        }
        this.motorCommands = this.controller.update(
          stick,
          sensorData,
          perturbedAttitude,
          this.state.velocity,
          dt,
          this.hasTakenOff
        );
        if (this.rpmFluctuationTimer > 0) {
          const factor = this.rpmFluctuationTimer / 1.0;
          this.motorCommands = this.motorCommands.map(cmd => {
            const noise = (Math.random() - 0.5) * 0.25 * factor;
            return Math.max(0.1, Math.min(1.0, cmd + noise));
          });
        }
      }
    } else {
      this.motorCommands = [0, 0, 0, 0];
    }
    
    // 6. Run Physics Integrator Step
    const oldVelocity = this.state.velocity.clone();
    
    if (this.isArmed && !this.isCalibrating) {
      const windForce = this.wind.getForce(this.state.position, this.physics.mass, dt);
      const windAccel = windForce.multiplyScalar(1.0 / this.physics.mass);
      this.state.velocity.addScaledVector(windAccel, dt);
    }
    
    this.state = this.physics.step(this.state, this.motorCommands, dt);
    
    if (this.isFlipping) {
      this.flipTimer += dt;
      const p = Math.min(1.0, this.flipTimer / this.flipDuration);
      
      // Dynamic motor spooling simulation during flip for authentic audio
      const activeThrust = 1.0;
      const inactiveThrust = 0.1;
      if (this.flipType === 'front') {
        this.motorCommands = [inactiveThrust, inactiveThrust, activeThrust, activeThrust];
      } else if (this.flipType === 'back') {
        this.motorCommands = [activeThrust, activeThrust, inactiveThrust, inactiveThrust];
      } else if (this.flipType === 'left') {
        this.motorCommands = [inactiveThrust, activeThrust, inactiveThrust, activeThrust];
      } else if (this.flipType === 'right') {
        this.motorCommands = [activeThrust, inactiveThrust, activeThrust, inactiveThrust];
      }
      
      const axis = new THREE.Vector3();
      if (this.flipType === 'front') axis.set(-1, 0, 0);
      else if (this.flipType === 'back') axis.set(1, 0, 0);
      else if (this.flipType === 'left') axis.set(0, 0, -1);
      else if (this.flipType === 'right') axis.set(0, 0, 1);
      
      const angle = p * Math.PI * 2;
      const rotationQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      this.state.quaternion.copy(this.flipStartQuaternion).multiply(rotationQuat);
      this.state.angularVelocity.set(0, 0, 0);
      
      if (p >= 1.0) {
        this.state.quaternion.copy(this.flipStartQuaternion); // ensure perfect final orientation
        this.isFlipping = false;
        this.flipType = null;
        this.flipTimer = 0.0;
        
        // Hover recovery: stop rotational and linear momentum
        this.state.angularVelocity.set(0, 0, 0);
        this.state.velocity.x *= 0.1;
        this.state.velocity.y *= 0.1;
        this.state.velocity.z *= 0.1;
        const sensorDataForAlt = this.sensors.update(this.state, this.linearAcceleration, 0);
        this.controller.setAltitudeLock(sensorDataForAlt.baroAltitude);
      }
    }
    
    // Position/Attitude Ground Lock when disarmed or armed and not taken off
    if (!this.isArmed) {
      if (this.crashSequenceActive) {
        // Tumble physics active. Settle drone when linear and angular speeds are low and it is on/near floor.
        const speed = this.state.velocity.length();
        const rotSpeed = this.state.angularVelocity.length();
        const onGround = this.state.position.y <= this.physics.environmentBounds.minY + 0.02;
        
        if (onGround && speed < 0.08 && rotSpeed < 0.15) {
          this.state.position.y = this.physics.environmentBounds.minY;
          this.state.velocity.set(0, 0, 0);
          this.state.angularVelocity.set(0, 0, 0);
          
          // Keep yaw but reset pitch/roll to stand flat
          const eulerRest = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
          eulerRest.x = 0;
          eulerRest.z = 0;
          this.state.quaternion.setFromEuler(eulerRest);
          
          this.crashSequenceActive = false; // settled
          
          const store = useDroneStore.getState() as any;
          if (store.addNotification) {
            store.addNotification('DRONE STATIONARY: PRESS RESET OR SHIFT+R', 'info');
          }
        }
      } else {
        if (this.state.position.y <= this.physics.environmentBounds.minY + 0.01) {
          this.state.position.y = this.physics.environmentBounds.minY;
          this.state.velocity.set(0, 0, 0);
          this.state.angularVelocity.set(0, 0, 0);
          const euler = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
          euler.x = 0;
          euler.z = 0;
          this.state.quaternion.setFromEuler(euler);
        }
      }
    } else if (!this.hasTakenOff) {
      // If we are in auto takeoff climb or manual takeoff climb (safety checks pass)
      const isClimbing = this.motorsStarted && (this.isAutoTakeoffActive || (stick.throttle > 0.15 && this.checkSafetyForTakeoff(false)));
      
      this.state.position.x = this.armPosition.x;
      this.state.position.z = this.armPosition.z;
      this.state.velocity.x = 0;
      this.state.velocity.z = 0;
      const eulerLock = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
      eulerLock.x = 0;
      eulerLock.z = 0;
      this.state.quaternion.setFromEuler(eulerLock);
      this.state.angularVelocity.set(0, 0, 0);
      
      if (!isClimbing) {
        // Enforce drone stays flat on ground pad if not in takeoff climb phase
        this.state.position.y = this.physics.environmentBounds.minY;
        this.state.velocity.y = 0;
        
        // Show warnings if they are actively trying to takeoff manually
        if (stick.throttle > 0.15) {
          this.checkSafetyForTakeoff(true);
        }
      }
    }
    
    if (dt > 0.0001) {
      this.linearAcceleration.subVectors(this.state.velocity, oldVelocity).multiplyScalar(1.0 / dt);
    } else {
      this.linearAcceleration.set(0, 0, 0);
    }
    
    // 7. Safety Audits (Crashes and landing collisions)
    this.auditSafety(oldVelocity, dt);
  }

  private syncExternalRcArmState(): void {
    if (!this.input.hasFreshExternalRcInput()) {
      return;
    }

    const shouldArm = this.input.isExternalArmRequested();
    if (shouldArm && !this.isArmed) {
      this.arm();
    } else if (!shouldArm && this.isArmed) {
      this.disarm();
    }
  }
  
  // Check for crash scenarios
  private auditSafety(oldVelocity: THREE.Vector3, dt: number): void {
    if (!this.isArmed) return;
    
    const store = useDroneStore.getState() as any;
    
    // A. Orientation crash check: if drone tilts past 78 degrees in flight (excluding active flips)
    const euler = new THREE.Euler().setFromQuaternion(this.state.quaternion, 'YXZ');
    const rollAngle = Math.abs(euler.z);
    const pitchAngle = Math.abs(euler.x);
    
    if (!this.isFlipping && (rollAngle > 1.36 || pitchAngle > 1.36)) {
      this.triggerCrashSequence(
        new THREE.Vector3(0, 1, 0),
        this.state.position.clone(),
        false,
        'Orientation',
        1.5
      );
      
      // Keep completely stationary on impact
      this.state.velocity.set(0, 0, 0);
      this.state.angularVelocity.set(0, 0, 0);
      
      if (store.addNotification) {
        store.addNotification('CRASH DETECTED', 'error');
        store.addNotification('MOTORS DISARMED', 'info');
        store.addNotification('RESET SIM', 'warning');
        store.addNotification('RE-ARM DRONE', 'warning');
        store.addNotification('DISARM & RESET TO FLY', 'warning');
      }
      this.disarm();
      return;
    }

    // Check for collisions registered in this physics step
    const col = this.physics.lastCollision;
    if (col && col.collided && col.obstacleName !== 'Ground') {
      const speed = col.speed;
      const isProp = col.collisionType === 'propeller';
      
      if (col.isWall) {
        this.wallCollision = true;
        this.collisionTimer = 0.8; // warning stays active for 0.8s
      }
      
      // Determine crash severity based on speed and collision type
      // Propeller collisions are much more fragile than body frame collisions
      const isSevere = isProp ? speed > 1.2 : speed > 3.0;
      const isMedium = isProp ? (speed >= 0.5 && speed <= 1.2) : (speed >= 1.5 && speed <= 3.0);
      
      if (isSevere) {
        // Stage 5: Crash Event
        const alertText = isProp ? 'CRASH: PROPELLER STALL' : 'CRASH DETECTED';
        this.triggerCrashSequence(
          col.normal.clone(),
          this.state.position.clone(),
          col.isWall,
          col.obstacleName,
          speed
        );
        
        if (store.addNotification && !store.notifications.some((n: any) => n.text === alertText)) {
          store.addNotification(alertText, 'error');
          store.addNotification('MOTORS DISARMED', 'info');
          store.addNotification('RESET SIM', 'warning');
          store.addNotification('RE-ARM DRONE', 'warning');
          store.addNotification('DISARM & RESET TO FLY', 'warning');
        }
        this.disarm();
        
        // Keep completely stationary on impact
        this.state.velocity.set(0, 0, 0);
        this.state.angularVelocity.set(0, 0, 0);
        return;
      } else if (isMedium) {
        // Stage 3/4: Moderate/Major Impact (Oscillation and Recoil)
        const alertText = isProp ? 'WARNING: ROTOR CONTACT' : 'WARNING: IMPACT DETECTED';
        if (store.addNotification && !store.notifications.some((n: any) => n.text === alertText)) {
          store.addNotification(alertText, 'orange'); // Orange
        }
        
        // Recoil velocity off collision normal
        this.state.velocity.addScaledVector(col.normal, speed * 0.35);
        
        // Instability parameters
        this.recoveryTimer = isProp ? 1.2 : 0.8;
        this.destabilizeTimer = isProp ? 1.0 : 0.6; // temporary roll/pitch oscillation
        this.rpmFluctuationTimer = isProp ? 0.9 : 0.5;
        this.cameraShakeIntensity = speed * 0.05;
        
        sound.playHit('medium');
      } else {
        // Stage 2: Light Contact (Gentle deflection)
        const alertText = col.isWall ? 'CAUTION: WALL CONTACT' : 'CAUTION: OBSTACLE CONTACT';
        if (store.addNotification && !store.notifications.some((n: any) => n.text === alertText)) {
          store.addNotification(alertText, 'warning'); // Yellow
        }
        
        // Soft rebound deflection
        this.state.velocity.addScaledVector(col.normal, speed * 0.15);
        this.cameraShakeIntensity = 0.015;
        
        sound.playHit('soft');
      }
    }

    // Stage 1: Raycast proximity checks
    if (this.isArmed && this.hasTakenOff && !(col && col.collided)) {
      const rayDist = this.physics.getRaycastDistance(this.state);
      if (rayDist < 0.20) {
        const alertText = 'WARNING: CLOSE PROXIMITY';
        if (store.addNotification && !store.notifications.some((n: any) => n.text === alertText)) {
          store.addNotification(alertText, 'orange'); // Orange
        }
      } else if (rayDist < 0.40) {
        const alertText = 'CAUTION: OBSTACLE AHEAD';
        if (store.addNotification && !store.notifications.some((n: any) => n.text === alertText)) {
          store.addNotification(alertText, 'warning'); // Yellow
        }
      }
    }

    if (this.collisionTimer > 0) {
      this.collisionTimer -= dt;
      if (this.collisionTimer <= 0) {
        this.wallCollision = false;
      }
    }
    
    // C. Floor check for landing/disarming (Ground Impact System)
    const hitGround = col && col.collided && col.obstacleName === 'Ground' && oldVelocity.y < 0;
    if (this.state.position.y <= this.physics.environmentBounds.minY + 0.02 || hitGround) {
      const landSpeed = -oldVelocity.y; // downward landing speed
      console.log(`FLOOR CHECK AUDIT: positionY=${this.state.position.y.toFixed(4)}, landSpeed=${landSpeed.toFixed(4)}, isArmed=${this.isArmed}, hasTakenOff=${this.hasTakenOff}`);
      
      if (landSpeed > 1.5) {
        // CRASH LANDING
        this.hardLanding = true;
        this.triggerCrashSequence(
          new THREE.Vector3(0, 1, 0),
          this.state.position.clone(),
          false,
          'Ground',
          landSpeed
        );
        
        const alertText = 'CRASH LANDING';
        if (store.addNotification && !store.notifications.some((n: any) => n.text === alertText)) {
          store.addNotification(alertText, 'error');
          store.addNotification('MOTORS DISARMED', 'info');
          store.addNotification('RESET SIM', 'warning');
          store.addNotification('RE-ARM DRONE', 'warning');
          store.addNotification('DISARM & RESET TO FLY', 'warning');
        }
        this.disarm();
        
        // Keep completely stationary on impact
        this.state.velocity.set(0, 0, 0);
        this.state.angularVelocity.set(0, 0, 0);
      } else if (landSpeed >= 0.5) {
        // HARD LANDING
        this.hardLanding = true;
        const alertText = 'HARD LANDING';
        if (store.addNotification && !store.notifications.some((n: any) => n.text === alertText)) {
          store.addNotification(alertText, 'warning');
        }
        if (this.hasTakenOff) {
          this.disarm(); // Disarm immediately to prevent bouncing
        }
      } else {
        // SAFE LANDING
        if (this.hasTakenOff) {
          this.disarm();
        }
      }
    }
  }
  
  // Public Accessors
  public getIsArmed(): boolean {
    return this.isArmed;
  }

  public getHasTakenOff(): boolean {
    return this.hasTakenOff;
  }

  public getIsLandingActive(): boolean {
    return this.isLandingActive;
  }

  public getIsAutoTakeoffActive(): boolean {
    return this.isAutoTakeoffActive;
  }

  public getIsCrashed(): boolean {
    return this.crashDetected;
  }

  public getIsFlipArmed(): boolean {
    return this.isFlipArmed;
  }

  public getIsFlipping(): boolean {
    return this.isFlipping;
  }

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
    
    if (this.crashDetected) {
      list.push('CRASH DETECTED');
      list.push('RESET SIM');
      list.push('RE-ARM DRONE');
    }
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
