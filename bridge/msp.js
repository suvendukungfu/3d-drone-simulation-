export const MSP = Object.freeze({
  SET_RAW_RC: 200,
  ATTITUDE: 108,
  ALTITUDE: 109,
  ANALOG: 110,
  FLIGHT_STATUS: 255,
});

const HEADER = Buffer.from('$M');
const VALID_DIRECTIONS = new Set(['<', '>']);

const clampInt = (value, min, max) => {
  const next = Number.isFinite(value) ? Math.round(value) : min;
  return Math.max(min, Math.min(max, next));
};

export function checksumFor(length, command, payload = Buffer.alloc(0)) {
  let checksum = length ^ command;
  for (const byte of payload) {
    checksum ^= byte;
  }
  return checksum & 0xff;
}

export function buildMspFrame(direction, command, payload = Buffer.alloc(0)) {
  if (!VALID_DIRECTIONS.has(direction)) {
    throw new Error(`Invalid MSP direction: ${direction}`);
  }

  const body = Buffer.from(payload);
  if (body.length > 255) {
    throw new Error(`MSP v1 payload too large: ${body.length}`);
  }

  const frame = Buffer.alloc(6 + body.length);
  frame[0] = HEADER[0];
  frame[1] = HEADER[1];
  frame[2] = direction.charCodeAt(0);
  frame[3] = body.length;
  frame[4] = command & 0xff;
  body.copy(frame, 5);
  frame[5 + body.length] = checksumFor(body.length, command & 0xff, body);
  return frame;
}

export function parseMspFrame(frame) {
  const buffer = Buffer.from(frame);
  if (buffer.length < 6) {
    throw new Error('MSP frame too short');
  }
  if (buffer[0] !== HEADER[0] || buffer[1] !== HEADER[1]) {
    throw new Error('Invalid MSP header');
  }

  const direction = String.fromCharCode(buffer[2]);
  if (!VALID_DIRECTIONS.has(direction)) {
    throw new Error(`Invalid MSP direction: ${direction}`);
  }

  const length = buffer[3];
  const expectedLength = 6 + length;
  if (buffer.length !== expectedLength) {
    throw new Error(`Invalid MSP frame length: expected ${expectedLength}, got ${buffer.length}`);
  }

  const command = buffer[4];
  const payload = buffer.subarray(5, 5 + length);
  const expectedChecksum = checksumFor(length, command, payload);
  const actualChecksum = buffer[5 + length];
  if (expectedChecksum !== actualChecksum) {
    throw new Error(
      `Invalid MSP checksum: expected 0x${expectedChecksum.toString(16)}, got 0x${actualChecksum.toString(16)}`,
    );
  }

  return { direction, length, command, payload };
}

export class MspStreamParser {
  #buffer = Buffer.alloc(0);
  #onFrame;
  #onError;

  constructor({ onFrame, onError = () => {} }) {
    this.#onFrame = onFrame;
    this.#onError = onError;
  }

  push(chunk) {
    this.#buffer = Buffer.concat([this.#buffer, Buffer.from(chunk)]);

    while (this.#buffer.length >= 2) {
      const start = this.#buffer.indexOf(HEADER);
      if (start === -1) {
        this.#buffer = this.#buffer.subarray(Math.max(0, this.#buffer.length - 1));
        return;
      }
      if (start > 0) {
        this.#buffer = this.#buffer.subarray(start);
      }
      if (this.#buffer.length < 6) {
        return;
      }
      if (!VALID_DIRECTIONS.has(String.fromCharCode(this.#buffer[2]))) {
        this.#onError(new Error(`Discarding MSP bytes with invalid direction 0x${this.#buffer[2].toString(16)}`));
        this.#buffer = this.#buffer.subarray(1);
        continue;
      }

      const length = this.#buffer[3];
      const totalLength = 6 + length;
      if (this.#buffer.length < totalLength) {
        return;
      }

      const frame = this.#buffer.subarray(0, totalLength);
      this.#buffer = this.#buffer.subarray(totalLength);
      try {
        this.#onFrame(parseMspFrame(frame));
      } catch (error) {
        this.#onError(error);
      }
    }
  }
}

export function parseRawRcPayload(payload) {
  const buffer = Buffer.from(payload);
  if (buffer.length < 16) {
    throw new Error(`MSP_SET_RAW_RC requires 16 payload bytes, got ${buffer.length}`);
  }

  const channels = [];
  for (let offset = 0; offset < 16; offset += 2) {
    channels.push(buffer.readUInt16LE(offset));
  }

  return {
    roll: channels[0],
    pitch: channels[1],
    throttle: channels[2],
    yaw: channels[3],
    aux1: channels[4],
    aux2: channels[5],
    aux3: channels[6],
    aux4: channels[7],
  };
}

export function buildRawRcPayload(rc) {
  const payload = Buffer.alloc(16);
  const channels = [
    rc.roll,
    rc.pitch,
    rc.throttle,
    rc.yaw,
    rc.aux1,
    rc.aux2,
    rc.aux3,
    rc.aux4,
  ];

  channels.forEach((value, index) => {
    payload.writeUInt16LE(clampInt(value, 900, 2100), index * 2);
  });

  return payload;
}

export function isSinglePowerOfTwo(value) {
  return Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0;
}

export function selectSingleStatus(value) {
  const status = clampInt(value, 0, 0xffff);
  if (isSinglePowerOfTwo(status)) {
    return status;
  }
  if (status > 0) {
    return status & -status;
  }
  return 8;
}

export function buildFlightStatusPayload(status) {
  const payload = Buffer.alloc(2);
  payload.writeUInt16LE(selectSingleStatus(status), 0);
  return payload;
}

export function buildAnalogPayload(telemetry = {}) {
  const payload = Buffer.alloc(10);
  payload.writeUInt16LE(clampInt(telemetry.vbat ?? 370, 0, 0xffff), 0);
  payload.writeUInt16LE(clampInt(telemetry.mAmpRaw ?? 0, 0, 0xffff), 2);
  payload.writeUInt16LE(clampInt(telemetry.mAhDrawn ?? 0, 0, 0xffff), 4);
  payload.writeUInt16LE(clampInt(telemetry.mAhRemain ?? 1000, 0, 0xffff), 6);
  payload.writeUInt8(clampInt(telemetry.soc ?? telemetry.battery ?? 90, 0, 100), 8);
  payload.writeUInt8(clampInt(telemetry.autoLandMode ?? 0, 0, 255), 9);
  return payload;
}

export function buildAttitudePayload(telemetry = {}) {
  const payload = Buffer.alloc(6);
  payload.writeInt16LE(clampInt((telemetry.roll ?? 0) * 10, -32768, 32767), 0);
  payload.writeInt16LE(clampInt((telemetry.pitch ?? 0) * 10, -32768, 32767), 2);
  payload.writeInt16LE(clampInt(telemetry.yaw ?? telemetry.heading ?? 0, -32768, 32767), 4);
  return payload;
}

export function buildAltitudePayload(telemetry = {}) {
  const payload = Buffer.alloc(6);
  payload.writeInt32LE(clampInt((telemetry.altitude ?? 0) * 100, -2147483648, 2147483647), 0);
  payload.writeInt16LE(clampInt((telemetry.verticalSpeed ?? 0) * 100, -32768, 32767), 4);
  return payload;
}

export function buildTelemetryResponse(command, telemetry = {}) {
  switch (command) {
    case MSP.FLIGHT_STATUS:
      return buildMspFrame('>', command, buildFlightStatusPayload(telemetry.status ?? 8));
    case MSP.ANALOG:
      return buildMspFrame('>', command, buildAnalogPayload(telemetry));
    case MSP.ATTITUDE:
      return buildMspFrame('>', command, buildAttitudePayload(telemetry));
    case MSP.ALTITUDE:
      return buildMspFrame('>', command, buildAltitudePayload(telemetry));
    default:
      return buildMspFrame('>', command, Buffer.alloc(0));
  }
}
