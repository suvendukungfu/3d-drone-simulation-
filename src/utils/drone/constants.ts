/**
 * constants.ts
 * ────────────
 * Centralised physical constants and simulation configuration for the PlutoX
 * simulator. Eliminates magic numbers scattered across engine files and
 * provides a single source of truth for tuning.
 *
 * Groupings:
 *   PHYSICS  — gravitational, aerodynamic, and material constants
 *   DRONE    — PlutoX Nano platform specifications
 *   SIM      — simulation loop and rendering parameters
 *   SAFETY   — crash detection thresholds and failsafe limits
 */

// ─── Physics Constants ────────────────────────────────────────────────────────

/** Standard gravitational acceleration (m/s²) */
export const GRAVITY = 9.81;

/** Air density at sea level, ISA conditions (kg/m³) */
export const AIR_DENSITY_SEA_LEVEL = 1.225;

/** Atmospheric lapse rate for barometric altitude (K/m) */
export const LAPSE_RATE = 0.0065;

// ─── PlutoX Drone Platform ───────────────────────────────────────────────────

/** All-up weight including battery (kg) */
export const DRONE_MASS_KG = 0.055;

/** Motor-to-motor half wheelbase (m) */
export const MOTOR_ARM_LENGTH_M = 0.042;

/** Maximum single-motor thrust at full throttle (N) */
export const MAX_MOTOR_THRUST_N = 0.30;

/** Maximum total thrust at full throttle (N) — 4 motors × MAX_MOTOR_THRUST */
export const MAX_TOTAL_THRUST_N = MAX_MOTOR_THRUST_N * 4;

/** Thrust-to-weight ratio at max throttle */
export const THRUST_TO_WEIGHT = MAX_TOTAL_THRUST_N / (DRONE_MASS_KG * GRAVITY);

/** Hover throttle feedforward (0–1) — mass × gravity ÷ maxTotalThrust */
export const HOVER_THROTTLE = (DRONE_MASS_KG * GRAVITY) / MAX_TOTAL_THRUST_N;

/** Idle motor spin command (0–1) — prevents ESC desync */
export const IDLE_MOTOR_SPIN = 0.10;

/** Drone collision radius for obstacle detection (m) */
export const DRONE_COLLISION_RADIUS_M = 0.08;

/** Maximum tilt angle for self-leveling control (radians) */
export const MAX_TILT_ANGLE_RAD = 30.0 * (Math.PI / 180.0);

/** Crash detection angle threshold (radians, ~78°) */
export const CRASH_ANGLE_RAD = 1.36;

// ─── Battery Specifications ─────────────────────────────────────────────────

/** Battery chemistry: 1S LiHV */
export const BATTERY_CHEMISTRY = '1S_LiHV';

/** Nominal capacity (mAh) */
export const BATTERY_CAPACITY_MAH = 550;

/** Fully charged voltage (V) */
export const BATTERY_FULL_VOLTAGE = 4.35;

/** Cut-off voltage — ESC protection triggers below this (V) */
export const BATTERY_CUTOFF_VOLTAGE = 3.00;

/** Low-battery warning voltage (V) */
export const BATTERY_CRITICAL_VOLTAGE = 3.40;

/** Internal resistance (Ω) */
export const BATTERY_INTERNAL_R = 0.065;

/** Maximum continuous discharge current (A) */
export const BATTERY_MAX_CURRENT_A = 8.0;

// ─── Simulation Parameters ─────────────────────────────────────────────────

/** Fixed physics timestep (s) — 60 Hz */
export const FIXED_TIMESTEP_S = 1.0 / 60.0;

/** Maximum frame time clamped to prevent simulation explosions (s) */
export const MAX_FRAME_TIME_S = 0.1;

/** Maximum physics steps per frame to prevent death spirals */
export const MAX_STEPS_PER_FRAME = 3;

/** Default flight data recording rate (Hz) */
export const FLIGHT_LOG_HZ = 10;

/** Maximum flight log samples retained in ring buffer */
export const FLIGHT_LOG_MAX_SAMPLES = 6000;

// ─── Safety Thresholds ──────────────────────────────────────────────────────

/** Hard landing velocity threshold (m/s downward) */
export const HARD_LANDING_VELOCITY_MS = 1.45;

/** Soft landing velocity threshold — below this, no bounce (m/s) */
export const SOFT_LANDING_VELOCITY_MS = 0.5;

/** Wall collision warning speed (m/s horizontal) */
export const WALL_COLLISION_SPEED_MS = 0.6;

/** Failsafe boundary distance from center (m) */
export const FAILSAFE_BOUNDARY_M = 14.5;

/** Failsafe boundary height (m) */
export const FAILSAFE_CEILING_M = 11.5;

/** Failsafe battery SoC threshold (%) */
export const FAILSAFE_BATTERY_PCT = 2.0;

/** Takeoff detection altitude (m above pad) */
export const TAKEOFF_DETECT_ALT_M = 0.15;

// ─── Environment Defaults ───────────────────────────────────────────────────

/** Default environment bounds (m) */
export const ENV_BOUNDS = {
  minX: -15, maxX: 15,
  minY: 0.05, maxY: 12,
  minZ: -15, maxZ: 15,
} as const;

/** Ground effect altitude threshold (m) */
export const GROUND_EFFECT_ALT_M = 0.30;

/** Ground effect thrust bonus coefficient */
export const GROUND_EFFECT_COEF = 0.22;

// ─── Motor RPM Simulation ───────────────────────────────────────────────────

/** Motor idle RPM when armed */
export const MOTOR_IDLE_RPM = 15000;

/** Motor max RPM at full throttle */
export const MOTOR_MAX_RPM = 48000;

/** Motor RPM range mapped from throttle command */
export const MOTOR_RPM_RANGE = MOTOR_MAX_RPM - MOTOR_IDLE_RPM;
