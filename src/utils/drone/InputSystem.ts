import { FlightControlStick } from './types';
import { useDroneStore } from '../../store/useDroneStore';

export class InputSystem {
  private keys: Record<string, boolean> = {};
  
  // Virtual Stick Values
  private stick: FlightControlStick = {
    throttle: 0.0, // starts at zero
    yaw: 0.0,
    pitch: 0.0,
    roll: 0.0
  };

  // Analog Joystick Inputs
  private analogLeft = { x: 0, y: 0 };
  private analogRight = { x: 0, y: 0 };
  private hasAnalogInput = false;

  // Gyroscope Pilot Control Properties
  private latestOrientation: { alpha: number; beta: number; gamma: number } | null = null;
  private neutralBeta: number | null = null;
  private neutralGamma: number | null = null;
  private gyroPitch = 0;
  private gyroRoll = 0;
  private lastGyroPilotState = false;

  // Rates of change
  private springReturnSpeed = 6.0; // speed at which sticks return to center
  private stickSlewRate = 5.0; // speed of stick movement towards target
  
  // Callbacks
  private onArmToggle: (() => void) | null = null;
  private onFlipToggle: (() => void) | null = null;
  private onTelemetryToggle: (() => void) | null = null;
  private onControlsToggle: (() => void) | null = null;
  private onChecklistToggle: (() => void) | null = null;
  private onAcademyToggle: (() => void) | null = null;
  private onCameraChange: ((camIndex: number) => void) | null = null;
  private onResetSim: (() => void) | null = null;
  
  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleOrientation = this.handleOrientation.bind(this);
  }
  
  public init(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('deviceorientation', this.handleOrientation);
    this.reset();
  }
  
  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('deviceorientation', this.handleOrientation);
  }

  private handleBlur(): void {
    this.keys = {};
  }

  private handleOrientation(e: DeviceOrientationEvent): void {
    if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
      this.latestOrientation = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
    }
  }

  private calibrateGyroNeutral(): void {
    if (this.latestOrientation) {
      this.neutralBeta = this.latestOrientation.beta;
      this.neutralGamma = this.latestOrientation.gamma;
    } else {
      this.neutralBeta = null;
      this.neutralGamma = null;
    }
    this.gyroPitch = 0;
    this.gyroRoll = 0;
  }
  
  public reset(): void {
    this.keys = {};
    this.stick = {
      throttle: 0.0,
      yaw: 0.0,
      pitch: 0.0,
      roll: 0.0
    };
    this.analogLeft = { x: 0, y: 0 };
    this.analogRight = { x: 0, y: 0 };
    this.hasAnalogInput = false;
  }
  
  public setCallbacks(callbacks: {
    onArmToggle?: () => void;
    onFlipToggle?: () => void;
    onTelemetryToggle?: () => void;
    onControlsToggle?: () => void;
    onChecklistToggle?: () => void;
    onAcademyToggle?: () => void;
    onCameraChange?: (camIndex: number) => void;
    onResetSim?: () => void;
  }): void {
    if (callbacks.onArmToggle) this.onArmToggle = callbacks.onArmToggle;
    if (callbacks.onFlipToggle) this.onFlipToggle = callbacks.onFlipToggle;
    if (callbacks.onTelemetryToggle) this.onTelemetryToggle = callbacks.onTelemetryToggle;
    if (callbacks.onControlsToggle) this.onControlsToggle = callbacks.onControlsToggle;
    if (callbacks.onChecklistToggle) this.onChecklistToggle = callbacks.onChecklistToggle;
    if (callbacks.onAcademyToggle) this.onAcademyToggle = callbacks.onAcademyToggle;
    if (callbacks.onCameraChange) this.onCameraChange = callbacks.onCameraChange;
    if (callbacks.onResetSim) this.onResetSim = callbacks.onResetSim;
  }

  public setAnalogStickValues(leftX: number, leftY: number, rightX: number, rightY: number): void {
    this.analogLeft.x = leftX;
    this.analogLeft.y = leftY;
    this.analogRight.x = rightX;
    this.analogRight.y = rightY;
    this.hasAnalogInput = true;
  }

  public clearAnalogInput(): void {
    this.hasAnalogInput = false;
    this.analogLeft = { x: 0, y: 0 };
    this.analogRight = { x: 0, y: 0 };
  }

  private applyDeadzoneAndExpo(value: number, deadzone: number = 0.05, expo: number = 0.4): number {
    const absVal = Math.abs(value);
    if (absVal < deadzone) return 0;
    
    // Smooth transition from deadzone boundary to 1
    const normalized = (absVal - deadzone) / (1 - deadzone);
    const sign = Math.sign(value);
    
    // Cubic expo curve: (1-expo)*x + expo*x^3
    const expoVal = (1 - expo) * normalized + expo * Math.pow(normalized, 3);
    return sign * expoVal;
  }
  
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = e.key.toLowerCase();
    
    // Check if key was already pressed (prevents repeats)
    const wasPressed = this.keys[key];
    this.keys[key] = true;
    
    if (!wasPressed) {
      // Toggle Spawn Debug Mode on 'g' keypress (avoid 'd' which is yaw-right)
      if (key === 'g') {
        useDroneStore.getState().toggleSpawnDebugMode();
      }

      const droneInitFailed = useDroneStore.getState().droneInitFailed;
      
      // System controls: always available regardless of droneInitFailed
      if (key === ' ') {
        e.preventDefault();
        if (!droneInitFailed && this.onArmToggle) this.onArmToggle();
      }

      if (key === 'f') {
        if (this.onFlipToggle) this.onFlipToggle();
      }
      if (key === 'tab') {
        e.preventDefault();
        if (this.onAcademyToggle) this.onAcademyToggle();
      }
      if (key === 't') {
        if (this.onTelemetryToggle) this.onTelemetryToggle();
      }
      if (key === 'h') {
        if (this.onControlsToggle) this.onControlsToggle();
      }
      if (key === 'c') {
        if (this.onChecklistToggle) this.onChecklistToggle();
      }
      if (key === 'r' && e.shiftKey) {
        if (this.onResetSim) this.onResetSim();
      }
      if (key === '1') {
        if (this.onCameraChange) this.onCameraChange(1);
      }
      if (key === '2') {
        if (this.onCameraChange) this.onCameraChange(2);
      }
      if (key === '3') {
        if (this.onCameraChange) this.onCameraChange(3);
      }
    }
    
    // Prevent default scroll behaviors for arrow keys
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault();
    }
  }
  
  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keys[key] = false;
  }
  
  // Updates the virtual stick inputs
  public update(dt: number, isArmed: boolean): FlightControlStick {
    const droneInitFailed = useDroneStore.getState().droneInitFailed;
    if (droneInitFailed || !isArmed) {
      this.stick = {
        throttle: 0.0,
        yaw: 0.0,
        pitch: 0.0,
        roll: 0.0
      };
      return this.stick;
    }

    const storeState = useDroneStore.getState();
    const currentGyroPilot = storeState.gyroPilot;
    const gyroSensitivity = storeState.gyroSensitivity || 1.2;

    // Detect toggle-on to calibrate neutral orientation
    if (currentGyroPilot && !this.lastGyroPilotState) {
      this.calibrateGyroNeutral();
    }
    this.lastGyroPilotState = currentGyroPilot;

    if (currentGyroPilot && this.latestOrientation) {
      if (this.neutralBeta === null || this.neutralGamma === null) {
        this.neutralBeta = this.latestOrientation.beta;
        this.neutralGamma = this.latestOrientation.gamma;
      }

      const screenAngle = window.orientation !== undefined ? Number(window.orientation) : 90;
      const isLandscapeSecondary = screenAngle === -90 || screenAngle === 270;

      let rawPitch = this.latestOrientation.gamma; // long axis tilt
      let rawRoll = this.latestOrientation.beta;   // short axis tilt

      if (isLandscapeSecondary) {
        rawPitch = -rawPitch;
        rawRoll = -rawRoll;
      }

      const deltaRoll = rawRoll - (this.neutralBeta || 0);
      const deltaPitch = -(rawPitch - (this.neutralGamma || 0));

      const deadzone = 2.0;
      let targetPitchInput = 0;
      let targetRollInput = 0;

      if (Math.abs(deltaPitch) > deadzone) {
        targetPitchInput = (deltaPitch - Math.sign(deltaPitch) * deadzone) * (gyroSensitivity * 0.05);
      }
      if (Math.abs(deltaRoll) > deadzone) {
        targetRollInput = (deltaRoll - Math.sign(deltaRoll) * deadzone) * (gyroSensitivity * 0.05);
      }

      targetPitchInput = Math.max(-1.0, Math.min(1.0, targetPitchInput));
      targetRollInput = Math.max(-1.0, Math.min(1.0, targetRollInput));

      // Apply smooth low-pass filter (15% per frame)
      this.gyroPitch = this.gyroPitch + (targetPitchInput - this.gyroPitch) * 0.15;
      this.gyroRoll = this.gyroRoll + (targetRollInput - this.gyroRoll) * 0.15;
    }

    if (this.hasAnalogInput) {
      // 1. Throttle:
      let throttleInput = this.analogLeft.y; // -1 to 1 from joystick
      if (Math.abs(throttleInput) < 0.08) {
        throttleInput = 0; // deadzone around center hover position
      }
      // Map smoothly to [0, 1] range: center (0) is 0.5 hover throttle
      const targetThrottle = 0.5 + throttleInput * 0.5;
      this.stick.throttle += (targetThrottle - this.stick.throttle) * 8.0 * dt; // smooth slew to target
      
      // 2. Yaw:
      const targetYaw = this.applyDeadzoneAndExpo(this.analogLeft.x, 0.05, 0.4);
      this.stick.yaw += (targetYaw - this.stick.yaw) * 12.0 * dt;
      
      // 3. Pitch
      let targetPitch = 0;
      if (currentGyroPilot && this.latestOrientation) {
        targetPitch = this.gyroPitch;
      } else {
        targetPitch = this.applyDeadzoneAndExpo(-this.analogRight.y, 0.05, 0.4);
      }
      this.stick.pitch += (targetPitch - this.stick.pitch) * 12.0 * dt;
      
      // 4. Roll:
      let targetRoll = 0;
      if (currentGyroPilot && this.latestOrientation) {
        targetRoll = this.gyroRoll;
      } else {
        targetRoll = this.applyDeadzoneAndExpo(this.analogRight.x, 0.05, 0.4);
      }
      this.stick.roll += (targetRoll - this.stick.roll) * 12.0 * dt;
    } else {
      // Keyboard input fallback (Desktop)
      // 1. Throttle: auto-centering for keyboard flight comfort
      const telemetry = useDroneStore.getState().telemetry;
      const hasTakenOff = telemetry && telemetry.altitude > 0.08;
      
      let targetThrottle = hasTakenOff ? 0.50 : 0.0; // default hover center in air, zero on ground
      if (this.keys['w']) {
        targetThrottle = 0.80; // commanded climb throttle
      } else if (this.keys['s']) {
        targetThrottle = 0.15; // commanded descent throttle
      }
      
      this.stick.throttle += (targetThrottle - this.stick.throttle) * 4.5 * dt;
      
      // 2. Yaw (A / D) - springs back to 0
      let targetYaw = 0.0;
      if (this.keys['a']) targetYaw = -1.0;
      if (this.keys['d']) targetYaw = 1.0;
      
      if (targetYaw !== 0) {
        this.stick.yaw += (targetYaw - this.stick.yaw) * this.stickSlewRate * dt;
      } else {
        this.stick.yaw -= this.stick.yaw * this.springReturnSpeed * dt;
      }
      
      // 3. Pitch
      if (currentGyroPilot && this.latestOrientation) {
        this.stick.pitch = this.gyroPitch;
      } else {
        let targetPitch = 0.0;
        if (this.keys['arrowup']) targetPitch = -1.0;
        if (this.keys['arrowdown']) targetPitch = 1.0;
        
        if (targetPitch !== 0) {
          this.stick.pitch += (targetPitch - this.stick.pitch) * this.stickSlewRate * dt;
        } else {
          this.stick.pitch -= this.stick.pitch * this.springReturnSpeed * dt;
        }
      }
      
      // 4. Roll
      if (currentGyroPilot && this.latestOrientation) {
        this.stick.roll = this.gyroRoll;
      } else {
        let targetRoll = 0.0;
        if (this.keys['arrowleft']) targetRoll = -1.0;
        if (this.keys['arrowright']) targetRoll = 1.0;
        
        if (targetRoll !== 0) {
          this.stick.roll += (targetRoll - this.stick.roll) * this.stickSlewRate * dt;
        } else {
          this.stick.roll -= this.stick.roll * this.springReturnSpeed * dt;
        }
      }
    }
    
    // Clamp values for safety
    this.stick.throttle = Math.max(0.0, Math.min(1.0, this.stick.throttle));
    this.stick.yaw = Math.max(-1.0, Math.min(1.0, this.stick.yaw));
    this.stick.pitch = Math.max(-1.0, Math.min(1.0, this.stick.pitch));
    this.stick.roll = Math.max(-1.0, Math.min(1.0, this.stick.roll));
    
    return this.stick;
  }
  
  public getStickState(): FlightControlStick {
    return { ...this.stick };
  }
}
