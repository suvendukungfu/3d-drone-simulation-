import * as THREE from 'three';

export interface RigidBodyState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  angularVelocity: THREE.Vector3; // in body frame
}

export interface DroneSensorData {
  gyro: THREE.Vector3;          // rad/s, body frame
  accel: THREE.Vector3;         // m/s^2, body frame, includes gravity
  mag: THREE.Vector3;           // normalized body magnetic field
  baroAltitude: number;         // m, above ground
  calibrationProgress: number;  // 0 to 1
  isCalibrated: boolean;
  hasError: boolean;
}

export interface PIDGains {
  kp: number;
  ki: number;
  kd: number;
  iMax: number;
  dFilterHz: number;
}

export interface PIDControllerState {
  integral: THREE.Vector3;
  prevError: THREE.Vector3;
  prevDerivative: THREE.Vector3;
}

export interface FlightControlStick {
  throttle: number;             // 0 to 1, accumulated (stays where left)
  yaw: number;                  // -1 to 1, springs back to 0
  pitch: number;                // -1 to 1, springs back to 0
  roll: number;                 // -1 to 1, springs back to 0
}

export interface RawRcInput {
  roll: number;
  pitch: number;
  throttle: number;
  yaw: number;
  aux1: number;
  aux2: number;
  aux3: number;
  aux4: number;
}

export interface TelemetryData {
  isArmed: boolean;
  flightMode: 'stabilize' | 'althold' | 'failsafe' | 'disarmed' | 'armed_idle';
  altitude: number;
  verticalSpeed: number;
  speed: number;
  pitch: number;                // degrees
  roll: number;                 // degrees
  yaw: number;                  // degrees
  heading: number;              // degrees (0-360)
  motorRPMs: [number, number, number, number];

  // ── Battery (enhanced) ────────────────────────────────────────────────────
  battery: number;              // 0 to 100 (State of Charge %)
  batteryVoltage: number;       // Terminal voltage under load (Volts)
  batteryCurrent: number;       // Estimated current draw (Amperes)
  batteryMahUsed: number;       // Cumulative mAh consumed
  isBatteryCritical: boolean;   // True when voltage < 3.40V

  // ── Timing ────────────────────────────────────────────────────────────────
  flightTime: number;           // seconds

  // ── System Health ─────────────────────────────────────────────────────────
  sensorError: boolean;
  calibrationActive: boolean;
  linkQuality: number;          // 0-100 RSSI-like link quality
  gpsSatsLocked: number;        // 0-8 GPS satellite count
}

export interface Checkpoint {
  id: string;
  position: [number, number, number];
  radius: number;
  passed: boolean;
}

export interface MissionDef {
  title: string;
  description: string;
  objectives: string[];
  checkObjective: (
    orchestrator: any,
    currentStep: number,
    state: any
  ) => boolean[];
  checkpoints?: Checkpoint[];
}
