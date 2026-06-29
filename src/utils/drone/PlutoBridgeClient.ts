import { PLUTO_BRIDGE_WS_URL } from '../../config/phase2Bridge';
import { useDroneStore } from '../../store/useDroneStore';
import { RawRcInput, TelemetryData } from './types';
import { SimulatorOrchestrator } from './SimulatorOrchestrator';

const STATUS = {
  READY_TO_ARM: 8,
  IN_FLIGHT: 4,
  FLAT_SURFACE: 16,
  CRASHED: 64,
  LOW_BATTERY_IN_FLIGHT: 128,
  LOW_BATTERY: 256
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isRawRcInput = (value: unknown): value is RawRcInput => {
  if (!isRecord(value)) return false;
  return ['roll', 'pitch', 'throttle', 'yaw', 'aux1', 'aux2', 'aux3', 'aux4']
    .every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]));
};

const nowMs = () => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

export function derivePlutoFlightStatus(telemetry: TelemetryData, orchestrator: SimulatorOrchestrator): number {
  if (orchestrator.getIsCrashed()) {
    return STATUS.CRASHED;
  }
  if (telemetry.isBatteryCritical || telemetry.battery <= 15) {
    return telemetry.isArmed && orchestrator.getHasTakenOff()
      ? STATUS.LOW_BATTERY_IN_FLIGHT
      : STATUS.LOW_BATTERY;
  }
  if (telemetry.calibrationActive || telemetry.sensorError) {
    return STATUS.FLAT_SURFACE;
  }
  if (telemetry.isArmed && (orchestrator.getHasTakenOff() || telemetry.altitude > 0.08)) {
    return STATUS.IN_FLIGHT;
  }
  return STATUS.READY_TO_ARM;
}

export class PlutoBridgeClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private started = false;
  private lastTelemetrySentAt = 0;
  private lastRcPacketLoggedAt = 0;

  constructor(private readonly orchestrator: SimulatorOrchestrator) {}

  public start(): void {
    if (this.started) return;
    this.started = true;
    this.connect();
  }

  public stop(): void {
    this.started = false;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.orchestrator.clearExternalRcInput();
    this.socket?.close();
    this.socket = null;
    useDroneStore.getState().setAppLinkStatus('disconnected');
  }

  public sendTelemetry(telemetry: TelemetryData): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const now = nowMs();
    if (now - this.lastTelemetrySentAt < 50) {
      return;
    }
    this.lastTelemetrySentAt = now;

    const message = {
      type: 'TELEMETRY',
      data: {
        roll: telemetry.roll,
        pitch: telemetry.pitch,
        yaw: telemetry.heading,
        altitude: Math.max(0, telemetry.altitude),
        verticalSpeed: telemetry.verticalSpeed,
        vbat: Math.round(telemetry.batteryVoltage * 100),
        soc: telemetry.battery,
        status: derivePlutoFlightStatus(telemetry, this.orchestrator)
      }
    };

    this.socket.send(JSON.stringify(message));
  }

  private connect(): void {
    if (!this.started || typeof WebSocket === 'undefined') {
      return;
    }

    useDroneStore.getState().setAppLinkStatus('connecting');

    try {
      this.socket = new WebSocket(PLUTO_BRIDGE_WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      useDroneStore.getState().setAppLinkStatus('connected');
      this.socket?.send(JSON.stringify({
        type: 'HELLO',
        data: {
          client: 'plutox-three-sim',
          contract: 'phase-2-json-v1'
        }
      }));
    });

    this.socket.addEventListener('message', (event) => this.handleMessage(event.data));
    this.socket.addEventListener('close', () => {
      this.socket = null;
      this.orchestrator.clearExternalRcInput();
      if (this.started) {
        useDroneStore.getState().setAppLinkStatus('disconnected');
        this.scheduleReconnect();
      }
    });
    this.socket.addEventListener('error', () => {
      this.socket?.close();
    });
  }

  private handleMessage(raw: unknown): void {
    let message: unknown;
    try {
      message = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (!isRecord(message) || message.type !== 'RC_INPUT' || !isRawRcInput(message.data)) {
      return;
    }

    const rcInput = message.data;
    this.orchestrator.applyExternalRcInput(rcInput);

    const now = nowMs();
    if (now - this.lastRcPacketLoggedAt >= 500) {
      this.lastRcPacketLoggedAt = now;
      useDroneStore.getState().addTelemetryPacket(
        `RC roll=${rcInput.roll} pitch=${rcInput.pitch} thr=${rcInput.throttle} yaw=${rcInput.yaw} aux4=${rcInput.aux4}`,
      );
    }
  }

  private scheduleReconnect(): void {
    if (!this.started || this.reconnectTimer !== null) {
      return;
    }

    const delay = Math.min(5000, 500 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
