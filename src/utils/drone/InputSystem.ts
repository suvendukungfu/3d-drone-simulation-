import { FlightControlStick } from './types';
import { useDroneStore } from '../../store/useDroneStore';

/**
 * InputSystem.ts
 * ──────────────
 * Translates raw keyboard / analog joystick / gyroscope inputs into
 * a normalized FlightControlStick (-1…1 for pitch/roll/yaw, 0…1 for throttle).
 *
 * Design goals (matched to real PlutoX controller feel):
 *   • Fast ramp-up on key press  (τ ≈ 60 ms)  — feels instant, no perceptible lag.
 *   • Smooth self-centering       (τ ≈ 80 ms)  — prevents jitter / oscillation on release.
 *   • Continuous throttle curve   (τ ≈ 100 ms) — no sudden jumps, realistic spool feel.
 *   • Progressive expo curve      (30 %)       — fine control near center, full authority at edges.
 *   • Light 20 Hz LPF on analog  — removes touch pointer jitter, stays ahead of FC's 10 Hz stick filter.
 *   • All axes independent        — simultaneous Throttle + Pitch + Roll + Yaw works correctly.
 *   • Frame-rate independent      — uses 1 - e^(-dt/τ) instead of dt*k, stable at any FPS.
 */
export class InputSystem {
  private keys: Record<string, boolean> = {};
  
  // Virtual Stick Values
  private stick: FlightControlStick = {
    throttle: 0.0,
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

  // ── Tuning Constants ──────────────────────────────────────────────
  // Time constants (seconds) — lower = faster response
  private readonly KBD_RAMP_TAU   = 0.06;  // key-press ramp-up speed
  private readonly KBD_CENTER_TAU = 0.08;  // self-center speed on key release
  private readonly ANALOG_LPF_HZ  = 20.0;  // analog stick low-pass filter cutoff
  private readonly KBD_EXPO       = 0.30;  // expo curve strength for keyboard

  // HeadFree mode state
  private prevArmed = false;
  private lockedHeading = 0;
  private prevHeadFree = false;
  
  // Callbacks
  private onArmToggle: (() => void) | null = null;
  private onFlipToggle: (() => void) | null = null;
  private onTelemetryToggle: (() => void) | null = null;
  private onControlsToggle: (() => void) | null = null;
  private onChecklistToggle: (() => void) | null = null;
  private onAcademyToggle: (() => void) | null = null;
  private onCameraChange: ((camIndex: number) => void) | null = null;
  private onResetSim: (() => void) | null = null;
  private onAutoTakeoff: (() => void) | null = null;
  private onLanding: (() => void) | null = null;
  
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
    onAutoTakeoff?: () => void;
    onLanding?: () => void;
  }): void {
    if (callbacks.onArmToggle) this.onArmToggle = callbacks.onArmToggle;
    if (callbacks.onFlipToggle) this.onFlipToggle = callbacks.onFlipToggle;
    if (callbacks.onTelemetryToggle) this.onTelemetryToggle = callbacks.onTelemetryToggle;
    if (callbacks.onControlsToggle) this.onControlsToggle = callbacks.onControlsToggle;
    if (callbacks.onChecklistToggle) this.onChecklistToggle = callbacks.onChecklistToggle;
    if (callbacks.onAcademyToggle) this.onAcademyToggle = callbacks.onAcademyToggle;
    if (callbacks.onCameraChange) this.onCameraChange = callbacks.onCameraChange;
    if (callbacks.onResetSim) this.onResetSim = callbacks.onResetSim;
    if (callbacks.onAutoTakeoff) this.onAutoTakeoff = callbacks.onAutoTakeoff;
    if (callbacks.onLanding) this.onLanding = callbacks.onLanding;
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

  public isThrottleDownTriggered(): boolean {
    return this.keys['s'] || (this.hasAnalogInput && this.analogLeft.y < -0.8);
  }

  // ── Frame-rate-independent exponential smoothing ──────────────────
  // Returns α for `current += α * (target - current)` matching `1 - e^(-dt/τ)`.
  private expAlpha(dt: number, tau: number): number {
    if (tau <= 0) return 1.0;
    return Math.min(1.0, 1.0 - Math.exp(-dt / tau));
  }

  // ── LPF alpha from cutoff frequency ───────────────────────────────
  private lpfAlpha(dt: number, cutoffHz: number): number {
    const rc = 1.0 / (2.0 * Math.PI * cutoffHz);
    return dt / (dt + rc);
  }

  // ── Deadzone + expo curve (analog sticks) ─────────────────────────
  private applyDeadzoneAndExpo(value: number, deadzone: number = 0.05, expo: number = 0.4): number {
    const absVal = Math.abs(value);
    if (absVal < deadzone) return 0;
    
    const normalized = (absVal - deadzone) / (1 - deadzone);
    const sign = Math.sign(value);
    
    // Cubic expo: (1-expo)*x + expo*x³
    const expoVal = (1 - expo) * normalized + expo * Math.pow(normalized, 3);
    return sign * expoVal;
  }

  // ── Keyboard expo (lighter curve for digital input) ───────────────
  private applyKeyboardExpo(value: number): number {
    const e = this.KBD_EXPO;
    return Math.sign(value) * ((1 - e) * Math.abs(value) + e * Math.pow(Math.abs(value), 3));
  }
  
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = e.key.toLowerCase();
    
    // Prevent key repeats
    const wasPressed = this.keys[key];
    this.keys[key] = true;
    
    if (!wasPressed) {
      if (key === 'g') {
        useDroneStore.getState().toggleSpawnDebugMode();
      }

      const droneInitFailed = useDroneStore.getState().droneInitFailed;
      
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
        const isArmed = useDroneStore.getState().telemetry.isArmed;
        if (isArmed && this.onAutoTakeoff) {
          this.onAutoTakeoff();
        } else {
          if (this.onTelemetryToggle) this.onTelemetryToggle();
        }
      }
      if (key === 'l') {
        if (this.onLanding) this.onLanding();
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
      if (key === 'j') {
        useDroneStore.getState().toggleHeadFree();
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
  
  // ══════════════════════════════════════════════════════════════════
  //  UPDATE — called every simulation frame
  // ══════════════════════════════════════════════════════════════════
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

    // ── Gyroscope processing ────────────────────────────────────────
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

      let rawPitch = this.latestOrientation.gamma;
      let rawRoll = this.latestOrientation.beta;

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

      // Smooth low-pass filter (15% per frame)
      this.gyroPitch = this.gyroPitch + (targetPitchInput - this.gyroPitch) * 0.15;
      this.gyroRoll = this.gyroRoll + (targetRollInput - this.gyroRoll) * 0.15;
    }

    // ── Throttle mapping ──────────────────────────────────────────────
    // The stick throttle is mapped directly from joystick deflection or keys.
    // Center/Release = 0.55 hover throttle (if taken off), or 0.0 (if grounded).
    const telemetry = useDroneStore.getState().telemetry;
    const hasTakenOff = telemetry && telemetry.altitude > 0.08;

    // ── Input source: Analog virtual joysticks (mobile) ─────────────
    if (this.hasAnalogInput) {
      const aLpf = this.lpfAlpha(dt, this.ANALOG_LPF_HZ);

      // 1. Throttle — mapped around 0.55 hover center
      if (hasTakenOff) {
        const rawY = this.analogLeft.y; // -1 to 1
        if (rawY > 0.01) {
          const targetThrottle = 0.55 + rawY * 0.40; // climb: 0.55 to 0.95
          this.stick.throttle += aLpf * (targetThrottle - this.stick.throttle);
        } else if (rawY < -0.01) {
          const targetThrottle = 0.55 + rawY * 0.55; // descend: 0.0 to 0.55
          this.stick.throttle += aLpf * (targetThrottle - this.stick.throttle);
        } else {
          // Centered: bypass filter to instantly lock altitude and snap joystick knob
          this.stick.throttle = 0.55;
        }
      } else {
        const rawY = this.analogLeft.y;
        if (Math.abs(rawY) > 0.01) {
          const targetThrottle = Math.max(0.0, 0.5 + rawY * 0.5);
          this.stick.throttle += aLpf * (targetThrottle - this.stick.throttle);
        } else {
          this.stick.throttle = 0.0;
        }
      }

      // 2. Yaw
      const targetYaw = this.applyDeadzoneAndExpo(this.analogLeft.x, 0.05, 0.4);
      this.stick.yaw += aLpf * (targetYaw - this.stick.yaw);
      
      // 3. Pitch
      let targetPitch = 0;
      if (currentGyroPilot && this.latestOrientation) {
        targetPitch = this.gyroPitch;
      } else {
        targetPitch = this.applyDeadzoneAndExpo(-this.analogRight.y, 0.05, 0.4);
      }
      this.stick.pitch += aLpf * (targetPitch - this.stick.pitch);
      
      // 4. Roll
      let targetRoll = 0;
      if (currentGyroPilot && this.latestOrientation) {
        targetRoll = this.gyroRoll;
      } else {
        targetRoll = this.applyDeadzoneAndExpo(this.analogRight.x, 0.05, 0.4);
      }
      this.stick.roll += aLpf * (targetRoll - this.stick.roll);

    // ── Input source: Keyboard (desktop) ────────────────────────────
    } else {
      // 1. Throttle — keyboard mapped around 0.55 hover center
      if (hasTakenOff) {
        if (this.keys['w']) {
          const targetThrottle = 0.85; // climb
          const tAlpha = this.expAlpha(dt, this.KBD_RAMP_TAU);
          this.stick.throttle += tAlpha * (targetThrottle - this.stick.throttle);
        } else if (this.keys['s']) {
          const targetThrottle = 0.15; // descend
          const tAlpha = this.expAlpha(dt, this.KBD_RAMP_TAU);
          this.stick.throttle += tAlpha * (targetThrottle - this.stick.throttle);
        } else {
          // Instantly lock at hover when keys are released
          this.stick.throttle = 0.55;
        }
      } else {
        if (this.keys['w']) {
          const targetThrottle = 0.65;
          const tAlpha = this.expAlpha(dt, this.KBD_RAMP_TAU);
          this.stick.throttle += tAlpha * (targetThrottle - this.stick.throttle);
        } else {
          this.stick.throttle = 0.0;
        }
      }
      
      // 2. Yaw (A / D)
      let rawYaw = 0.0;
      if (this.keys['a']) rawYaw -= 1.0;
      if (this.keys['d']) rawYaw += 1.0;
      const targetYaw = this.applyKeyboardExpo(rawYaw);
      const yAlpha = this.expAlpha(dt, rawYaw !== 0 ? this.KBD_RAMP_TAU : this.KBD_CENTER_TAU);
      this.stick.yaw += yAlpha * (targetYaw - this.stick.yaw);
      
      // 3. Pitch (ArrowUp / ArrowDown)
      if (currentGyroPilot && this.latestOrientation) {
        this.stick.pitch = this.gyroPitch;
      } else {
        let rawPitch = 0.0;
        if (this.keys['arrowup'])   rawPitch -= 1.0;
        if (this.keys['arrowdown']) rawPitch += 1.0;
        const targetPitch = this.applyKeyboardExpo(rawPitch);
        const pAlpha = this.expAlpha(dt, rawPitch !== 0 ? this.KBD_RAMP_TAU : this.KBD_CENTER_TAU);
        this.stick.pitch += pAlpha * (targetPitch - this.stick.pitch);
      }
      
      // 4. Roll (ArrowLeft / ArrowRight)
      if (currentGyroPilot && this.latestOrientation) {
        this.stick.roll = this.gyroRoll;
      } else {
        let rawRoll = 0.0;
        if (this.keys['arrowleft'])  rawRoll -= 1.0;
        if (this.keys['arrowright']) rawRoll += 1.0;
        const targetRoll = this.applyKeyboardExpo(rawRoll);
        const rAlpha = this.expAlpha(dt, rawRoll !== 0 ? this.KBD_RAMP_TAU : this.KBD_CENTER_TAU);
        this.stick.roll += rAlpha * (targetRoll - this.stick.roll);
      }
    }
    
    // ── Clamp values for safety ─────────────────────────────────────
    this.stick.throttle = Math.max(0.0, Math.min(1.0, this.stick.throttle));
    this.stick.yaw = Math.max(-1.0, Math.min(1.0, this.stick.yaw));
    this.stick.pitch = Math.max(-1.0, Math.min(1.0, this.stick.pitch));
    this.stick.roll = Math.max(-1.0, Math.min(1.0, this.stick.roll));

    // ── HeadFree heading hold ───────────────────────────────────────
    const headFree = useDroneStore.getState().headFree;
    const isArmedNow = isArmed;

    if (isArmedNow) {
      if (!this.prevArmed || (headFree && !this.prevHeadFree)) {
        const h = useDroneStore.getState().telemetry?.heading;
        if (typeof h === 'number' && !isNaN(h)) {
          this.lockedHeading = h;
        }
      }
    }

    this.prevArmed = isArmedNow;
    this.prevHeadFree = headFree;

    if (headFree && isArmedNow) {
      const currentHeading = useDroneStore.getState().telemetry?.heading;
      if (typeof currentHeading === 'number' && !isNaN(currentHeading)) {
        let error = this.lockedHeading - currentHeading;
        while (error > 180) error -= 360;
        while (error < -180) error += 360;
        if (Math.abs(this.stick.yaw) < 0.15) {
          const rawCorrection = error * 0.006;
          const correction = Math.max(-0.4, Math.min(0.4, rawCorrection));
          this.stick.yaw = Math.max(-1.0, Math.min(1.0, this.stick.yaw + correction));
        } else {
          this.lockedHeading = currentHeading;
        }
      }
    }
    
    return this.stick;
  }
  
  public getStickState(): FlightControlStick {
    return { ...this.stick };
  }
}
