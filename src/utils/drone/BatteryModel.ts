/**
 * BatteryModel.ts
 * ---------------
 * High-fidelity LiPo battery discharge model for the PlutoX Simulator.
 *
 * Motivation:
 *   The original TelemetryEngine uses a simple linear drain. Real LiPo batteries
 *   exhibit three distinct discharge regimes and voltage sag under load — behaviours
 *   that affect both the on-screen voltage readout and, more importantly, motor
 *   thrust (as real ESCs reduce thrust when bus voltage drops).
 *
 * Model:
 *   Based on a simplified Shepherd equation adapted for LiHV 1S (3.7V nominal)
 *   chemistry typical of the PlutoX Nano.
 *
 *   Voltage = OCV(SoC) - R_internal * I_load
 *
 *   Where:
 *     OCV    = Open-circuit voltage lookup (polynomial fit to discharge curve)
 *     SoC    = State of Charge (0.0 – 1.0)
 *     R_int  = Internal resistance (increases as battery ages)
 *     I_load = Estimated current draw from motor commands
 *
 * Integration:
 *   Replace the battery section in TelemetryEngine with a call to
 *   BatteryModel.update(motorCommands, dt) and read getVoltage() / getSoC().
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BatterySnapshot {
  /** State of Charge 0.0 – 1.0 */
  soc: number;
  /** Percentage (rounded) 0 – 100 */
  percentage: number;
  /** Terminal voltage under load (Volts) */
  voltage: number;
  /** Estimated current draw (Amperes) */
  currentA: number;
  /** Cumulative mAh consumed */
  mAhUsed: number;
  /** True when voltage < CRITICAL_VOLTAGE */
  isCritical: boolean;
  /** True when SoC < 0.05 (emergency land) */
  isEmpty: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Nominal capacity of a PlutoX 1S LiHV pouch cell (mAh) */
const CAPACITY_MAH = 550;

/** Fully charged LiHV voltage */
const FULL_VOLTAGE = 4.35;

/** Cut-off voltage (ESC protection triggers below this) */
const CUTOFF_VOLTAGE = 3.00;

/** Critical voltage for low-battery warning */
const CRITICAL_VOLTAGE = 3.40;

/** Internal resistance in Ohms (fresh cell at room temp) */
const R_INTERNAL = 0.065;

/**
 * Maximum continuous current draw (A) when all four motors are at full throttle.
 * PlutoX draws ≈ 8A peak from a 1S cell.
 */
const MAX_CURRENT_A = 8.0;

/** Idle current draw even when motors are at minimum spin */
const IDLE_CURRENT_A = 0.18;

// ─── OCV Lookup ──────────────────────────────────────────────────────────────

/**
 * Piecewise linear approximation of the OCV-SoC discharge curve for a LiHV 1S cell.
 * Measured at 0.5C discharge rate (representative of light hovering).
 *
 * Format: [SoC_fraction, OCV_volts]
 * SoC is monotonically decreasing left-to-right.
 */
const OCV_TABLE: [number, number][] = [
  [1.00, 4.35],
  [0.95, 4.20],
  [0.85, 4.08],
  [0.70, 3.90],
  [0.55, 3.78],
  [0.40, 3.68],
  [0.25, 3.58],
  [0.15, 3.48],
  [0.08, 3.35],
  [0.02, 3.10],
  [0.00, 3.00],
];

function ocvFromSoC(soc: number): number {
  const clamped = Math.max(0, Math.min(1, soc));
  // Walk table from top
  for (let i = 0; i < OCV_TABLE.length - 1; i++) {
    const [s1, v1] = OCV_TABLE[i];
    const [s2, v2] = OCV_TABLE[i + 1];
    if (clamped >= s2 && clamped <= s1) {
      const t = (clamped - s2) / (s1 - s2);
      return v2 + t * (v1 - v2);
    }
  }
  return OCV_TABLE[OCV_TABLE.length - 1][1];
}

// ─── Class ────────────────────────────────────────────────────────────────────

export class BatteryModel {
  /** Internal SoC 0.0 – 1.0 (not snapped to percentage steps) */
  private soc = 1.0;

  /** Cumulative charge extracted in mAh */
  private mAhConsumed = 0;

  constructor() {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  public reset(): void {
    this.soc = 1.0;
    this.mAhConsumed = 0;
  }

  // ─── Per-Frame Update ───────────────────────────────────────────────────────

  /**
   * Advances the battery model by one simulation step.
   *
   * @param motorCommands - Array of 4 motor throttle values [0.0 – 1.0].
   * @param isArmed       - True when the drone is armed (motors active).
   * @param dt            - Frame delta time in seconds.
   * @returns             - Full BatterySnapshot for this frame.
   */
  public update(motorCommands: number[], isArmed: boolean, dt: number): BatterySnapshot {
    // ── 1. Estimate current draw ─────────────────────────────────────────────
    let currentA = 0;
    if (isArmed) {
      const totalLoad = motorCommands.reduce((s, v) => s + Math.max(0, Math.min(1, v)), 0) / 4;
      currentA = IDLE_CURRENT_A + totalLoad * (MAX_CURRENT_A - IDLE_CURRENT_A);
    }

    // ── 2. Integrate charge (Coulomb counting) ───────────────────────────────
    // Coulomb counting: integrate mAh consumed and derive SoC
    const deltaAh = currentA * (dt / 3600); // seconds → hours
    this.mAhConsumed = Math.min(CAPACITY_MAH, this.mAhConsumed + deltaAh * 1000);
    this.soc = Math.max(0, 1.0 - this.mAhConsumed / CAPACITY_MAH);

    // ── 3. Compute terminal voltage ──────────────────────────────────────────
    const ocv = ocvFromSoC(this.soc);
    const voltageSag = currentA * R_INTERNAL;
    const voltage = Math.max(CUTOFF_VOLTAGE, ocv - voltageSag);

    // ── 4. Build snapshot ────────────────────────────────────────────────────
    return {
      soc: parseFloat(this.soc.toFixed(4)),
      percentage: Math.round(this.soc * 100),
      voltage: parseFloat(voltage.toFixed(3)),
      currentA: parseFloat(currentA.toFixed(2)),
      mAhUsed: parseFloat(this.mAhConsumed.toFixed(1)),
      isCritical: voltage <= CRITICAL_VOLTAGE,
      isEmpty: this.soc <= 0.02,
    };
  }

  // ─── Accessors ──────────────────────────────────────────────────────────────

  public getSoC(): number {
    return this.soc;
  }

  /** Percentage 0–100 (rounded). Equivalent to TelemetryData.battery. */
  public getPercentage(): number {
    return Math.round(this.soc * 100);
  }

  public getMahConsumed(): number {
    return this.mAhConsumed;
  }

  /**
   * Thrust derating factor [0.0 – 1.0] based on current voltage.
   * At full voltage → 1.0. At cut-off → ~0.70.
   * Multiply motor thrust by this value to simulate voltage sag.
   */
  public getThrustDerateFactor(): number {
    const ocv = ocvFromSoC(this.soc);
    const normalised = (ocv - CUTOFF_VOLTAGE) / (FULL_VOLTAGE - CUTOFF_VOLTAGE);
    // Map to [0.70, 1.0] range
    return 0.70 + 0.30 * Math.max(0, Math.min(1, normalised));
  }
}
