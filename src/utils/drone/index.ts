/**
 * index.ts
 * ────────
 * Barrel export for the drone simulation engine.
 *
 * Consumers can import all engine modules from a single path:
 *   import { SimulatorOrchestrator, FlightController, PhysicsEngine } from '@/utils/drone';
 */

// ─── Core Engine ────────────────────────────────────────────────────────────
export { SimulatorOrchestrator } from './SimulatorOrchestrator';
export { PhysicsEngine } from './PhysicsEngine';
export { FlightController } from './FlightController';
export { InputSystem } from './InputSystem';
export { SensorSimulation } from './SensorSimulation';
export { TelemetryEngine } from './TelemetryEngine';

// ─── Extended Systems ───────────────────────────────────────────────────────
export { BatteryModel } from './BatteryModel';
export { WindSimulation } from './WindSimulation';
export type { WindPreset, WindState } from './WindSimulation';
export { FlightLogger } from './FlightLogger';
export type { FlightSample, FlightSessionSummary } from './FlightLogger';
export { FlightPerformanceAnalyzer } from './FlightPerformanceAnalyzer';
export type { DimensionScore, PerformanceReport } from './FlightPerformanceAnalyzer';

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  RigidBodyState,
  DroneSensorData,
  PIDGains,
  PIDControllerState,
  FlightControlStick,
  TelemetryData,
  Checkpoint,
  MissionDef,
} from './types';

// ─── Constants ──────────────────────────────────────────────────────────────
export * from './constants';
