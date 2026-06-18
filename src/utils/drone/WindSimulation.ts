/**
 * WindSimulation.ts
 * -----------------
 * Simulates realistic atmospheric wind disturbances for the PlutoX flight sim.
 *
 * Features:
 *   - Steady-state base wind with configurable magnitude and direction.
 *   - Perlin-like layered noise for turbulence (no external deps).
 *   - Wind gusts: randomized short-duration bursts with bell-shaped profiles.
 *   - Ground effect attenuation: wind intensity tapers to zero near the floor.
 *   - Altitude gradient: wind strengthens logarithmically with height (ABL model).
 *
 * The output is a THREE.Vector3 force (Newtons) in world frame, ready to be
 * added to the net force in PhysicsEngine.getDerivatives() or injected via
 * SimulatorOrchestrator.
 *
 * Usage:
 *   const wind = new WindSimulation();
 *   wind.setConditions('moderate');
 *   const forceN = wind.getForce(position, droneMassKg, dt);
 */

import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WindPreset = 'calm' | 'light' | 'moderate' | 'strong' | 'storm';

export interface WindState {
  /** Current steady-wind vector in world frame (m/s) */
  steadyWind: THREE.Vector3;
  /** Current turbulence vector (m/s) */
  turbulence: THREE.Vector3;
  /** Active gust magnitude (m/s) — 0 when no gust */
  gustMagnitude: number;
}

// ─── Noise Helper ─────────────────────────────────────────────────────────────

/**
 * A lightweight, seedable pseudo-Perlin value noise function.
 * Produces smooth, differentiable noise in range [-1, 1].
 * Uses hash-based interpolation — no lookup tables required.
 */
function smoothNoise(t: number, seed: number): number {
  const i = Math.floor(t);
  const f = t - i;
  // Smooth-step (cubic Hermite) to avoid discontinuities
  const u = f * f * (3 - 2 * f);
  const a = Math.sin((i + seed) * 127.1 + 311.7) * 43758.5453;
  const b = Math.sin((i + 1 + seed) * 127.1 + 311.7) * 43758.5453;
  return ((a - Math.floor(a)) * 2 - 1) * (1 - u) + ((b - Math.floor(b)) * 2 - 1) * u;
}

/** Layered (fractal) noise — 3 octaves for natural-looking turbulence. */
function turbulenceNoise(t: number, seed: number): number {
  return (
    smoothNoise(t * 1.0, seed) * 0.60 +
    smoothNoise(t * 2.1, seed + 17) * 0.25 +
    smoothNoise(t * 4.3, seed + 31) * 0.15
  );
}

// ─── Preset Definitions ───────────────────────────────────────────────────────

interface WindPresetConfig {
  /** Steady wind speed in m/s */
  steadySpeed: number;
  /** Turbulence amplitude in m/s (RMS) */
  turbAmplitude: number;
  /** Mean time between gusts (seconds) */
  gustIntervalSec: number;
  /** Gust peak magnitude in m/s */
  gustPeakMs: number;
}

const WIND_PRESETS: Record<WindPreset, WindPresetConfig> = {
  calm:     { steadySpeed: 0.1,  turbAmplitude: 0.05, gustIntervalSec: 60, gustPeakMs: 0.3 },
  light:    { steadySpeed: 0.8,  turbAmplitude: 0.20, gustIntervalSec: 25, gustPeakMs: 1.5 },
  moderate: { steadySpeed: 2.0,  turbAmplitude: 0.60, gustIntervalSec: 12, gustPeakMs: 3.5 },
  strong:   { steadySpeed: 4.5,  turbAmplitude: 1.40, gustIntervalSec:  6, gustPeakMs: 7.0 },
  storm:    { steadySpeed: 9.0,  turbAmplitude: 3.00, gustIntervalSec:  3, gustPeakMs: 14.0 },
};

// ─── Class ────────────────────────────────────────────────────────────────────

export class WindSimulation {
  // Settings
  private preset: WindPreset = 'calm';
  private config: WindPresetConfig = WIND_PRESETS['calm'];

  /** Steady-wind direction as a unit vector (world XZ plane) */
  private windDirection = new THREE.Vector3(1, 0, 0);

  // Simulation time
  private time = 0;

  // Unique noise seed per axis to prevent correlated gusts
  private seedX = Math.random() * 100;
  private seedY = Math.random() * 100;
  private seedZ = Math.random() * 100;

  // Gust state
  private nextGustAt = 5; // seconds until next gust
  private gustActive = false;
  private gustTimer = 0;
  private gustDuration = 2.0;
  private gustDir = new THREE.Vector3(1, 0, 0);
  private gustPeak = 0;

  // Cached output state for external inspection
  private _state: WindState = {
    steadyWind: new THREE.Vector3(),
    turbulence: new THREE.Vector3(),
    gustMagnitude: 0,
  };

  constructor() {}

  // ─── Configuration ──────────────────────────────────────────────────────────

  /**
   * Apply a named wind preset.
   * @param preset - One of: 'calm' | 'light' | 'moderate' | 'strong' | 'storm'
   */
  public setConditions(preset: WindPreset): void {
    this.preset = preset;
    this.config = WIND_PRESETS[preset];
    // Schedule a new gust cycle
    this.nextGustAt = this.randomGustInterval();
  }

  /**
   * Set the steady wind direction (horizontal only — vertical component is ignored).
   * @param dir - Arbitrary non-zero vector; will be normalised internally.
   */
  public setDirection(dir: THREE.Vector3): void {
    const flat = new THREE.Vector3(dir.x, 0, dir.z);
    if (flat.lengthSq() > 0.0001) {
      this.windDirection.copy(flat.normalize());
    }
  }

  /** Reset to initial calm state. */
  public reset(): void {
    this.time = 0;
    this.nextGustAt = 5;
    this.gustActive = false;
    this.gustTimer = 0;
    this.seedX = Math.random() * 100;
    this.seedY = Math.random() * 100;
    this.seedZ = Math.random() * 100;
    this._state.steadyWind.set(0, 0, 0);
    this._state.turbulence.set(0, 0, 0);
    this._state.gustMagnitude = 0;
  }

  // ─── Per-Frame Update ───────────────────────────────────────────────────────

  /**
   * Compute the wind disturbance force vector for the current frame.
   *
   * @param dronePosition - Current drone position in world space.
   * @param droneMass     - Drone mass in kilograms (scales force from acceleration).
   * @param dt            - Frame delta time in seconds.
   * @returns Force vector in Newtons, world frame.
   */
  public getForce(
    dronePosition: THREE.Vector3,
    droneMass: number,
    dt: number
  ): THREE.Vector3 {
    this.time += dt;

    const altitude = Math.max(0, dronePosition.y);

    // ── Altitude gradient (logarithmic ABL profile) ──────────────────────────
    // Wind at reference altitude (zRef = 10m). Drones near ground experience less wind.
    const zRef = 10.0;
    const zMin = 0.3; // below this, wind tails to zero (ground effect attenuation)
    const altitudeFactor = altitude < zMin
      ? altitude / zMin
      : Math.min(2.0, 1.0 + 0.3 * Math.log(1.0 + (altitude - zMin) / zRef));

    // ── Steady wind ──────────────────────────────────────────────────────────
    const steadySpeed = this.config.steadySpeed * altitudeFactor;
    const steady = this.windDirection.clone().multiplyScalar(steadySpeed);
    this._state.steadyWind.copy(steady);

    // ── Turbulence (layered noise per axis) ──────────────────────────────────
    const turbAmp = this.config.turbAmplitude * altitudeFactor;
    const turbX = turbulenceNoise(this.time * 0.7, this.seedX) * turbAmp;
    const turbY = turbulenceNoise(this.time * 0.4, this.seedY) * turbAmp * 0.25; // less vertical
    const turbZ = turbulenceNoise(this.time * 0.7, this.seedZ) * turbAmp;
    const turb = new THREE.Vector3(turbX, turbY, turbZ);
    this._state.turbulence.copy(turb);

    // ── Gust system ──────────────────────────────────────────────────────────
    let gustForce = new THREE.Vector3();

    if (!this.gustActive) {
      this.nextGustAt -= dt;
      if (this.nextGustAt <= 0) {
        this.gustActive = true;
        this.gustTimer = 0;
        this.gustDuration = 1.5 + Math.random() * 2.5;
        this.gustPeak = this.config.gustPeakMs * (0.7 + Math.random() * 0.6) * altitudeFactor;
        // Slightly skewed gust direction
        const angle = (Math.random() - 0.5) * (Math.PI / 3); // ±30 deg
        const rotated = this.windDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        this.gustDir.copy(rotated);
        this.nextGustAt = this.randomGustInterval();
      }
    }

    if (this.gustActive) {
      this.gustTimer += dt;
      const progress = this.gustTimer / this.gustDuration;

      if (progress >= 1.0) {
        this.gustActive = false;
        this._state.gustMagnitude = 0;
      } else {
        // Bell-curve profile: peaks at midpoint, tapers at edges
        const bell = Math.sin(progress * Math.PI);
        const gustSpeed = this.gustPeak * bell;
        this._state.gustMagnitude = gustSpeed;
        gustForce = this.gustDir.clone().multiplyScalar(gustSpeed);
      }
    } else {
      this._state.gustMagnitude = 0;
    }

    // ── Total wind velocity → force (F = m * a_wind) ─────────────────────────
    const totalWindVelocity = steady.clone().add(turb).add(gustForce);

    // Convert wind velocity to aerodynamic drag-like force on the drone body.
    // Simple model: F_wind = mass * wind_accel_equivalent.
    // A calm wind should apply ~0.02–0.06g lateral acceleration on the drone.
    // Scale factor: 0.12 maps m/s wind to m/s^2 equivalent for a 55g drone.
    const windAccelScale = 0.12;
    const force = totalWindVelocity.multiplyScalar(droneMass * windAccelScale);

    return force;
  }

  // ─── Accessors ──────────────────────────────────────────────────────────────

  public getState(): Readonly<WindState> {
    return this._state;
  }

  public getPreset(): WindPreset {
    return this.preset;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private randomGustInterval(): number {
    // Add 30% random jitter to prevent perfectly periodic gusts
    return this.config.gustIntervalSec * (0.7 + Math.random() * 0.6);
  }
}
