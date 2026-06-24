/**
 * FlightLogger.ts
 * ---------------
 * Session-scoped flight data recorder for the PlutoX Simulator.
 *
 * Responsibilities:
 *   - Record timestamped snapshots of telemetry data at a configurable Hz.
 *   - Compute derived per-session analytics (max altitude, max speed, flight phases).
 *   - Export the log as a JSON object for download or in-app review.
 *   - Implement ring-buffer semantics to cap memory at maxSamples.
 *
 * Design Principles:
 *   - Zero external dependencies beyond core simulator types.
 *   - Pure TypeScript — no React, no store imports (keep this layer reusable).
 *   - All public methods guard against bad state (never throw at runtime).
 */

import { TelemetryData } from './types';

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface FlightSample {
  /** Elapsed simulation time in seconds from session start */
  t: number;
  /** Altitude above ground in meters */
  alt: number;
  /** Horizontal ground speed in m/s */
  speed: number;
  /** Vertical speed in m/s (positive = climbing) */
  vSpeed: number;
  /** Roll angle in degrees */
  roll: number;
  /** Pitch angle in degrees */
  pitch: number;
  /** Heading in degrees (0-360) */
  heading: number;
  /** Battery percentage */
  battery: number;
  /** Active flight mode */
  mode: 'stabilize' | 'althold' | 'failsafe' | 'disarmed' | 'armed_idle';
  /** Average motor RPM across all four motors */
  avgRPM: number;
}

export interface FlightSessionSummary {
  /** Total flight time in seconds (armed duration only) */
  totalFlightTimeSec: number;
  /** Maximum altitude reached in meters */
  maxAltitudeM: number;
  /** Maximum horizontal speed reached in m/s */
  maxSpeedMs: number;
  /** Maximum descent rate in m/s */
  maxDescentRateMs: number;
  /** Maximum climb rate in m/s */
  maxClimbRateMs: number;
  /** Battery percentage consumed over session */
  batteryUsedPct: number;
  /** Number of arm/disarm cycles in session */
  armCycles: number;
  /** Percentage of flight time spent in altitude hold mode */
  altHoldUsagePct: number;
  /** Total number of samples recorded */
  sampleCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of samples to retain in memory (ring-buffer cap). */
const DEFAULT_MAX_SAMPLES = 6000; // 100 Hz * 60 s = 6 000 samples/min → ~5 min full detail

/** Default recording rate in Hz. */
const DEFAULT_RECORD_HZ = 10;

// ─── Class ────────────────────────────────────────────────────────────────────

export class FlightLogger {
  private samples: FlightSample[] = [];
  private maxSamples: number;
  private recordIntervalSec: number;
  private timeSinceLastRecord = 0;

  // Session-level accumulators
  private sessionStartTime = 0;
  private currentTime = 0;
  private wasArmed = false;
  private armCycles = 0;
  private altHoldFrames = 0;
  private totalArmedFrames = 0;
  private startBattery = 100;
  private endBattery = 100;

  // Rolling stat trackers
  private maxAlt = 0;
  private maxSpeed = 0;
  private maxClimb = 0;
  private maxDescent = 0;

  constructor(recordHz = DEFAULT_RECORD_HZ, maxSamples = DEFAULT_MAX_SAMPLES) {
    this.recordIntervalSec = 1.0 / Math.max(1, recordHz);
    this.maxSamples = Math.max(100, maxSamples);
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /** Reset all session data. Call this when the simulator is reset. */
  public reset(): void {
    this.samples = [];
    this.timeSinceLastRecord = 0;
    this.sessionStartTime = 0;
    this.currentTime = 0;
    this.wasArmed = false;
    this.armCycles = 0;
    this.altHoldFrames = 0;
    this.totalArmedFrames = 0;
    this.startBattery = 100;
    this.endBattery = 100;
    this.maxAlt = 0;
    this.maxSpeed = 0;
    this.maxClimb = 0;
    this.maxDescent = 0;
  }

  // ─── Per-Frame Update ───────────────────────────────────────────────────────

  /**
   * Called once per simulation frame. Records a sample at the configured rate
   * and updates rolling statistics.
   *
   * @param telemetry - Current telemetry snapshot from TelemetryEngine.
   * @param dt        - Frame delta time in seconds.
   */
  public update(telemetry: TelemetryData, dt: number): void {
    if (dt <= 0) return;

    this.currentTime += dt;

    // ── Arm/Disarm cycle tracking ──
    if (telemetry.isArmed && !this.wasArmed) {
      this.armCycles++;
      if (this.armCycles === 1) {
        this.sessionStartTime = this.currentTime;
        this.startBattery = telemetry.battery;
      }
      this.wasArmed = true;
    } else if (!telemetry.isArmed && this.wasArmed) {
      this.endBattery = telemetry.battery;
      this.wasArmed = false;
    }

    // ── Rolling stats (only track while armed) ──
    if (telemetry.isArmed) {
      this.totalArmedFrames++;
      if (telemetry.flightMode === 'althold') this.altHoldFrames++;

      if (telemetry.altitude > this.maxAlt) this.maxAlt = telemetry.altitude;
      if (telemetry.speed > this.maxSpeed) this.maxSpeed = telemetry.speed;
      if (telemetry.verticalSpeed > this.maxClimb) this.maxClimb = telemetry.verticalSpeed;
      if (telemetry.verticalSpeed < -this.maxDescent) this.maxDescent = -telemetry.verticalSpeed;
    }

    // ── Throttled sample recording ──
    this.timeSinceLastRecord += dt;
    if (this.timeSinceLastRecord >= this.recordIntervalSec) {
      this.timeSinceLastRecord = 0;

      const avgRPM =
        telemetry.motorRPMs.reduce((sum, r) => sum + r, 0) / telemetry.motorRPMs.length;

      const sample: FlightSample = {
        t: parseFloat(this.currentTime.toFixed(3)),
        alt: parseFloat(telemetry.altitude.toFixed(3)),
        speed: parseFloat(telemetry.speed.toFixed(3)),
        vSpeed: parseFloat(telemetry.verticalSpeed.toFixed(3)),
        roll: parseFloat(telemetry.roll.toFixed(2)),
        pitch: parseFloat(telemetry.pitch.toFixed(2)),
        heading: parseFloat(telemetry.heading.toFixed(1)),
        battery: telemetry.battery,
        mode: telemetry.flightMode,
        avgRPM: Math.round(avgRPM),
      };

      // Ring-buffer: drop oldest sample when cap is reached
      if (this.samples.length >= this.maxSamples) {
        this.samples.shift();
      }
      this.samples.push(sample);
    }
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  /** Returns a computed summary of the current session. */
  public getSessionSummary(): FlightSessionSummary {
    const totalFlightTimeSec = this.wasArmed
      ? this.currentTime - this.sessionStartTime
      : Math.max(0, this.currentTime - this.sessionStartTime);

    const altHoldUsagePct =
      this.totalArmedFrames > 0
        ? parseFloat(((this.altHoldFrames / this.totalArmedFrames) * 100).toFixed(1))
        : 0;

    const batteryUsedPct = Math.max(0, this.startBattery - this.endBattery);

    return {
      totalFlightTimeSec: parseFloat(totalFlightTimeSec.toFixed(1)),
      maxAltitudeM: parseFloat(this.maxAlt.toFixed(2)),
      maxSpeedMs: parseFloat(this.maxSpeed.toFixed(2)),
      maxClimbRateMs: parseFloat(this.maxClimb.toFixed(2)),
      maxDescentRateMs: parseFloat(this.maxDescent.toFixed(2)),
      batteryUsedPct: parseFloat(batteryUsedPct.toFixed(1)),
      armCycles: this.armCycles,
      altHoldUsagePct,
      sampleCount: this.samples.length,
    };
  }

  // ─── Data Access ────────────────────────────────────────────────────────────

  /** Returns a shallow copy of the recorded samples array. */
  public getSamples(): FlightSample[] {
    return [...this.samples];
  }

  /** Returns the most recent recorded sample, or null if empty. */
  public getLastSample(): FlightSample | null {
    return this.samples.length > 0 ? this.samples[this.samples.length - 1] : null;
  }

  /** Returns the number of samples currently in the buffer. */
  public getSampleCount(): number {
    return this.samples.length;
  }

  // ─── Export ─────────────────────────────────────────────────────────────────

  /**
   * Serialises the session log to a JSON string suitable for download.
   * The output is human-readable with 2-space indentation.
   */
  public exportJSON(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        summary: this.getSessionSummary(),
        samples: this.samples,
      },
      null,
      2
    );
  }

  /**
   * Triggers a browser download of the session JSON log.
   * No-ops in non-browser environments.
   */
  public downloadLog(filename = 'pluto_flight_log.json'): void {
    if (typeof window === 'undefined') return;
    try {
      const blob = new Blob([this.exportJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('[FlightLogger] downloadLog failed:', e);
    }
  }
}
