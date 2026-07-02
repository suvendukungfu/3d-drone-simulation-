import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MSP,
  MspStreamParser,
  buildAnalogPayload,
  buildAltitudePayload,
  buildAttitudePayload,
  buildFlightStatusPayload,
  buildMspFrame,
  buildRawRcPayload,
  buildTelemetryResponse,
  parseMspFrame,
  parseRawRcPayload,
  selectSingleStatus,
} from './msp.js';

describe('MSP v1 frame helpers', () => {
  it('parses a hand-crafted MSP_SET_RAW_RC frame into 8 channels', () => {
    const frame = Buffer.from('244d3c10c8dc05dc05e803dc05e803e803e803dc05d8', 'hex');
    const parsed = parseMspFrame(frame);

    assert.equal(parsed.direction, '<');
    assert.equal(parsed.command, MSP.SET_RAW_RC);
    assert.equal(parsed.length, 16);
    assert.deepEqual(parseRawRcPayload(parsed.payload), {
      roll: 1500,
      pitch: 1500,
      throttle: 1000,
      yaw: 1500,
      aux1: 1000,
      aux2: 1000,
      aux3: 1000,
      aux4: 1500,
    });
  });

  it('builds the verified command 255 flight status response with one status bit', () => {
    const response = buildTelemetryResponse(MSP.FLIGHT_STATUS, { status: 8 });
    assert.deepEqual([...response], [0x24, 0x4d, 0x3e, 0x02, 0xff, 0x08, 0x00, 0xf5]);
  });

  it('coerces combined app status flags to the lowest set bit', () => {
    assert.equal(selectSingleStatus(12), 4);
    assert.deepEqual([...buildFlightStatusPayload(12)], [4, 0]);
  });

  it('builds analog v1 telemetry payload in the PlutoController field order', () => {
    const payload = buildAnalogPayload({
      vbat: 370,
      mAmpRaw: 0,
      mAhDrawn: 0,
      mAhRemain: 1000,
      soc: 90,
      autoLandMode: 0,
    });

    assert.equal(payload.length, 10);
    assert.equal(payload.readUInt16LE(0), 370);
    assert.equal(payload.readUInt16LE(6), 1000);
    assert.equal(payload.readUInt8(8), 90);
    assert.equal(payload.readUInt8(9), 0);
  });

  it('builds attitude in tenths of degrees and altitude in centimeters', () => {
    const attitude = buildAttitudePayload({ roll: 1.2, pitch: -3.4, yaw: 90 });
    assert.equal(attitude.readInt16LE(0), 12);
    assert.equal(attitude.readInt16LE(2), -34);
    assert.equal(attitude.readInt16LE(4), 90);

    const altitude = buildAltitudePayload({ altitude: 1.23, verticalSpeed: -0.45 });
    assert.equal(altitude.readInt32LE(0), 123);
    assert.equal(altitude.readInt16LE(4), -45);
  });

  it('parses split TCP chunks without losing MSP frame boundaries', () => {
    const rc = {
      roll: 1500,
      pitch: 1500,
      throttle: 1300,
      yaw: 1500,
      aux1: 1000,
      aux2: 1000,
      aux3: 1000,
      aux4: 1500,
    };
    const frame = buildMspFrame('<', MSP.SET_RAW_RC, buildRawRcPayload(rc));
    const frames = [];
    const parser = new MspStreamParser({
      onFrame: (parsed) => frames.push(parsed),
      onError: (error) => {
        throw error;
      },
    });

    parser.push(frame.subarray(0, 3));
    parser.push(frame.subarray(3, 11));
    parser.push(frame.subarray(11));

    assert.equal(frames.length, 1);
    assert.deepEqual(parseRawRcPayload(frames[0].payload), rc);
  });

  it('rejects bad checksums', () => {
    const badFrame = Buffer.from('244d3e02ff080000', 'hex');
    assert.throws(() => parseMspFrame(badFrame), /checksum/i);
  });

  it('builds valid IDENT, STATUS, and RAW_IMU handshake payloads', () => {
    const ident = buildTelemetryResponse(MSP.IDENT);
    const parsedIdent = parseMspFrame(ident);
    assert.equal(parsedIdent.length, 7);
    assert.equal(parsedIdent.payload.readUInt8(0), 230);
    assert.equal(parsedIdent.payload.readUInt8(1), 3);

    const status = buildTelemetryResponse(MSP.STATUS, { status: 8 });
    const parsedStatus = parseMspFrame(status);
    assert.equal(parsedStatus.length, 11);
    assert.equal(parsedStatus.payload.readUInt16LE(0), 1000);
    assert.equal(parsedStatus.payload.readUInt16LE(4), 15);
    assert.equal(parsedStatus.payload.readUInt32LE(6), 8);

    const rawImu = buildTelemetryResponse(MSP.RAW_IMU);
    const parsedRawImu = parseMspFrame(rawImu);
    assert.equal(parsedRawImu.length, 18);
    assert.equal(parsedRawImu.payload.readInt16LE(4), 512);
  });
});
