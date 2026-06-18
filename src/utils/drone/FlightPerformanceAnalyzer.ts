/**
 * FlightPerformanceAnalyzer.ts
 * ----------------------------
 * Real-time flight quality scoring and instructor feedback for the PlutoX Sim.
 *
 * Purpose:
 *   Provides structured, quantitative feedback to trainee pilots — exactly what
 *   an AI flight instructor would surface between missions. Scores are computed
 *   from live telemetry and rolled into a GPA-style composite.
 *
 * Scoring Dimensions (each 0 – 100):
 *   1. Attitude Stability  — penalises excessive roll/pitch oscillation
 *   2. Altitude Control    — penalises large altitude error during alt-hold
 *   3. Speed Management    — rewards smooth, deliberate velocity profiles
 *   4. Heading Precision   — penalises unintended yaw drift
 *   5. Landing Quality     — based on descent rate at touchdown
 *
 * Usage:
 *   const perf = new FlightPerformanceAnalyzer();
 *   perf.update(telemetry, dt);                   // in flight loop
 *   const score = perf.getCompositeScore();       // 0-100
 *   const tips = perf.getCoachingTips();          // string[]
 */

import { TelemetryData } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DimensionScore {
  score: number;       // 0 – 100
  label: string;
  description: string;
}

export interface PerformanceReport {
  composite: number;
  dimensions: {
    attitudeStability: DimensionScore;
    altitudeControl: DimensionScore;
    speedManagement: DimensionScore;
    headingPrecision: DimensionScore;
    landingQuality: DimensionScore;
  };
  tips: string[];
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max acceptable roll/pitch angle (deg) for a smooth hover */
const STABLE_ANGLE_DEG = 8;
/** Max roll/pitch for harsh penalty */
const HARSH_ANGLE_DEG = 25;

/** Altitude deviation (m) that starts reducing score */
const ALT_CONTROL_WINDOW_M = 0.15;
/** Altitude deviation (m) for full penalty */
const ALT_HARSH_WINDOW_M = 1.5;

/** Desired max horizontal speed (m/s) for smooth flight */
const SMOOTH_SPEED_MS = 1.5;

/** Heading drift threshold (deg) for precision penalty */
const HEADING_DRIFT_DEG = 10;

/** Good landing descent rate (m/s) */
const GOOD_LANDING_MS = 0.4;
/** Hard landing descent rate (m/s) */
const HARD_LANDING_MS = 1.2;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gradeFromScore(score: number): PerformanceReport['grade'] {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

/** Linearly maps a value from [lo, hi] to [100, 0], clamped. */
function penaltyScore(value: number, lo: number, hi: number): number {
  if (value <= lo) return 100;
  if (value >= hi) return 0;
  return 100 * (1 - (value - lo) / (hi - lo));
}

/** Exponential moving average helper */
function ema(prev: number, next: number, alpha: number): number {
  return prev + alpha * (next - prev);
}

// ─── Class ────────────────────────────────────────────────────────────────────

export class FlightPerformanceAnalyzer {
  // EMA scores (smoothed, not per-frame jumpy)
  private emaAttitude = 100;
  private emaAltitude = 100;
  private emaSpeed    = 100;
  private emaHeading  = 100;

  // Landing quality: evaluated on touchdown event
  private landingScore = 100;
  private lastHeading = 0;
  private referenceHeading: number | null = null;
  private headingSetTimer = 0;

  // Active flight tracking
  private wasArmed = false;
  private wasAirborne = false;

  // Frame time accumulator for smoothing
  private frameAlpha = 0; // set per-frame based on dt

  constructor() {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  public reset(): void {
    this.emaAttitude = 100;
    this.emaAltitude = 100;
    this.emaSpeed    = 100;
    this.emaHeading  = 100;
    this.landingScore = 100;
    this.lastHeading = 0;
    this.referenceHeading = null;
    this.headingSetTimer = 0;
    this.wasArmed = false;
    this.wasAirborne = false;
  }

  // ─── Per-Frame Update ───────────────────────────────────────────────────────

  /**
   * Update scoring with current telemetry. Call once per sim frame.
   */
  public update(tel: TelemetryData, dt: number): void {
    if (!tel.isArmed) {
      this.wasArmed = false;
      return;
    }

    // Only score when in flight (altitude > 0.1m)
    const isAirborne = tel.altitude > 0.1;

    // ── Landing event detection ──
    if (this.wasAirborne && !isAirborne && tel.isArmed) {
      // Drone just touched down — evaluate descent rate at moment of touchdown
      const descentRate = Math.abs(tel.verticalSpeed);
      this.landingScore = penaltyScore(descentRate, GOOD_LANDING_MS, HARD_LANDING_MS);
    }

    this.wasAirborne = isAirborne;
    this.wasArmed = true;

    if (!isAirborne) return; // don't score pre-takeoff idle

    // ── EMA smoothing coefficient (5s time constant) ──
    this.frameAlpha = Math.min(1, dt / 5.0);

    // ── 1. Attitude Stability ──────────────────────────────────────────────────
    const maxAngle = Math.max(Math.abs(tel.roll), Math.abs(tel.pitch));
    const attFrame = penaltyScore(maxAngle, STABLE_ANGLE_DEG, HARSH_ANGLE_DEG);
    this.emaAttitude = ema(this.emaAttitude, attFrame, this.frameAlpha);

    // ── 2. Altitude Control (only meaningful in alt-hold mode) ──────────────
    if (tel.flightMode === 'althold') {
      const altErr = Math.abs(tel.verticalSpeed); // proxy: large vSpeed = fighting alt
      const altFrame = penaltyScore(altErr, ALT_CONTROL_WINDOW_M, ALT_HARSH_WINDOW_M);
      this.emaAltitude = ema(this.emaAltitude, altFrame, this.frameAlpha);
    }

    // ── 3. Speed Management ──────────────────────────────────────────────────
    const speedFrame = penaltyScore(tel.speed, SMOOTH_SPEED_MS, SMOOTH_SPEED_MS * 3.5);
    this.emaSpeed = ema(this.emaSpeed, speedFrame, this.frameAlpha);

    // ── 4. Heading Precision ─────────────────────────────────────────────────
    // Capture reference heading 1 second after takeoff
    this.headingSetTimer += dt;
    if (this.referenceHeading === null && this.headingSetTimer > 1.0) {
      this.referenceHeading = tel.heading;
    }

    if (this.referenceHeading !== null) {
      let headingDrift = Math.abs(tel.heading - this.referenceHeading);
      if (headingDrift > 180) headingDrift = 360 - headingDrift;
      const headFrame = penaltyScore(headingDrift, HEADING_DRIFT_DEG, 60);
      this.emaHeading = ema(this.emaHeading, headFrame, this.frameAlpha);
    }

    this.lastHeading = tel.heading;
  }

  // ─── Report ─────────────────────────────────────────────────────────────────

  /** Build and return the full performance report. */
  public getReport(): PerformanceReport {
    const attScore  = Math.round(this.emaAttitude);
    const altScore  = Math.round(this.emaAltitude);
    const spdScore  = Math.round(this.emaSpeed);
    const hdgScore  = Math.round(this.emaHeading);
    const lndScore  = Math.round(this.landingScore);

    // Weighted composite
    const composite = Math.round(
      attScore  * 0.30 +
      altScore  * 0.25 +
      spdScore  * 0.20 +
      hdgScore  * 0.15 +
      lndScore  * 0.10
    );

    const tips = this.buildTips(attScore, altScore, spdScore, hdgScore, lndScore);

    return {
      composite,
      grade: gradeFromScore(composite),
      dimensions: {
        attitudeStability: {
          score: attScore,
          label: 'Attitude Stability',
          description: 'Penalises excessive roll and pitch oscillations during flight.',
        },
        altitudeControl: {
          score: altScore,
          label: 'Altitude Control',
          description: 'Measures how smoothly the drone maintains altitude in alt-hold mode.',
        },
        speedManagement: {
          score: spdScore,
          label: 'Speed Management',
          description: 'Rewards deliberate, controlled movement; penalises aggressive acceleration.',
        },
        headingPrecision: {
          score: hdgScore,
          label: 'Heading Precision',
          description: 'Tracks unintended yaw drift from the heading at takeoff.',
        },
        landingQuality: {
          score: lndScore,
          label: 'Landing Quality',
          description: 'Evaluates descent rate at the moment of touchdown.',
        },
      },
      tips,
    };
  }

  /** Convenience accessor — returns composite score 0–100. */
  public getCompositeScore(): number {
    return this.getReport().composite;
  }

  /** Returns coaching tip strings for low-scoring dimensions. */
  public getCoachingTips(): string[] {
    const r = this.getReport();
    return r.tips;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private buildTips(att: number, alt: number, spd: number, hdg: number, lnd: number): string[] {
    const tips: string[] = [];

    if (att < 70) {
      tips.push('Reduce stick deflection amplitude — smaller, deliberate inputs create smoother flight.');
    }
    if (alt < 70) {
      tips.push('Avoid pumping the throttle. In alt-hold, let the autopilot maintain height.');
    }
    if (spd < 70) {
      tips.push('Fly at 30–50% throttle inputs for cinematic, controlled movement.');
    }
    if (hdg < 70) {
      tips.push('Keep yaw centred unless intentionally rotating. Unwanted yaw drift wastes battery.');
    }
    if (lnd < 70) {
      tips.push('Reduce descent rate before touchdown. Aim for < 0.4 m/s for a soft landing.');
    }
    if (tips.length === 0) {
      tips.push('Excellent technique! Maintain this level of precision for advanced maneuvers.');
    }

    return tips;
  }
}
