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
  
  // Rates of change
  private throttleRate = 0.25; // per second for continuous holding
  private springReturnSpeed = 6.0; // speed at which sticks return to center
  private stickSlewRate = 5.0; // speed of stick movement towards target
  
  // Callbacks
  private onArmToggle: (() => void) | null = null;
  private onTelemetryToggle: (() => void) | null = null;
  private onControlsToggle: (() => void) | null = null;
  private onChecklistToggle: (() => void) | null = null;
  private onAcademyToggle: (() => void) | null = null;
  private onCameraChange: ((camIndex: number) => void) | null = null;
  private onResetSim: (() => void) | null = null;
  
  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }
  
  public init(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.reset();
  }
  
  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
  
  public reset(): void {
    this.keys = {};
    this.stick = {
      throttle: 0.0,
      yaw: 0.0,
      pitch: 0.0,
      roll: 0.0
    };
  }
  
  public setCallbacks(callbacks: {
    onArmToggle?: () => void;
    onTelemetryToggle?: () => void;
    onControlsToggle?: () => void;
    onChecklistToggle?: () => void;
    onAcademyToggle?: () => void;
    onCameraChange?: (camIndex: number) => void;
    onResetSim?: () => void;
  }): void {
    if (callbacks.onArmToggle) this.onArmToggle = callbacks.onArmToggle;
    if (callbacks.onTelemetryToggle) this.onTelemetryToggle = callbacks.onTelemetryToggle;
    if (callbacks.onControlsToggle) this.onControlsToggle = callbacks.onControlsToggle;
    if (callbacks.onChecklistToggle) this.onChecklistToggle = callbacks.onChecklistToggle;
    if (callbacks.onAcademyToggle) this.onAcademyToggle = callbacks.onAcademyToggle;
    if (callbacks.onCameraChange) this.onCameraChange = callbacks.onCameraChange;
    if (callbacks.onResetSim) this.onResetSim = callbacks.onResetSim;
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
      const isArmed = useDroneStore.getState().telemetry.isArmed;
      
      // Flight stick inputs: only allowed when armed and not failed
      if (!droneInitFailed && isArmed) {
        if (key === 'w') {
          this.stick.throttle = Math.min(1.0, this.stick.throttle + 0.02);
        }
        if (key === 's') {
          this.stick.throttle = Math.max(0.0, this.stick.throttle - 0.02);
        }
      }
      
      // System controls: always available regardless of droneInitFailed
      if (key === ' ') {
        e.preventDefault();
        if (!droneInitFailed && this.onArmToggle) this.onArmToggle();
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
      if (key === 'r') {
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

    // 1. Throttle: accumulated (UAV standard)
    if (this.keys['w']) {
      this.stick.throttle = Math.min(1.0, this.stick.throttle + this.throttleRate * dt);
    }
    if (this.keys['s']) {
      this.stick.throttle = Math.max(0.0, this.stick.throttle - this.throttleRate * dt);
    }
    
    // 2. Yaw (A / D) - springs back to 0
    let targetYaw = 0.0;
    if (this.keys['a']) targetYaw = -1.0;
    if (this.keys['d']) targetYaw = 1.0;
    
    if (targetYaw !== 0) {
      this.stick.yaw += (targetYaw - this.stick.yaw) * this.stickSlewRate * dt;
    } else {
      this.stick.yaw -= this.stick.yaw * this.springReturnSpeed * dt;
    }
    
    // 3. Pitch (ArrowUp / ArrowDown) - springs back to 0
    let targetPitch = 0.0;
    if (this.keys['arrowup']) targetPitch = -1.0;
    if (this.keys['arrowdown']) targetPitch = 1.0;
    
    if (targetPitch !== 0) {
      this.stick.pitch += (targetPitch - this.stick.pitch) * this.stickSlewRate * dt;
    } else {
      this.stick.pitch -= this.stick.pitch * this.springReturnSpeed * dt;
    }
    
    // 4. Roll (ArrowLeft / ArrowRight) - springs back to 0
    let targetRoll = 0.0;
    if (this.keys['arrowleft']) targetRoll = -1.0;
    if (this.keys['arrowright']) targetRoll = 1.0;
    
    if (targetRoll !== 0) {
      this.stick.roll += (targetRoll - this.stick.roll) * this.stickSlewRate * dt;
    } else {
      this.stick.roll -= this.stick.roll * this.springReturnSpeed * dt;
    }
    
    // Clamp values for safety
    this.stick.yaw = Math.max(-1.0, Math.min(1.0, this.stick.yaw));
    this.stick.pitch = Math.max(-1.0, Math.min(1.0, this.stick.pitch));
    this.stick.roll = Math.max(-1.0, Math.min(1.0, this.stick.roll));
    
    return this.stick;
  }
  
  public getStickState(): FlightControlStick {
    return { ...this.stick };
  }
}
