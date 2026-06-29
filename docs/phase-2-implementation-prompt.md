# Phase 2 Senior Developer Implementation Prompt

Implement the PlutoController Phase 2 local dev/test rig in this existing React + Three.js simulator without changing the mobile PlutoController app.

Use the existing simulator as the `/sim` implementation. Do not replace the current physics/rendering stack with a toy Three.js page. Add the missing bridge and protocol integration around it.

## Requirements

- Add a standalone Node bridge under `/bridge`.
- Bridge must listen for JSON-over-WebSocket on `ws://localhost:8080`.
- Bridge must listen for MSP-over-TCP on port `23`, because the unmodified app connects to `192.168.4.1:23`.
- Keep the browser WebSocket URL in exactly one config variable. Default to `ws://localhost:8080` and allow `VITE_PLUTO_BRIDGE_WS_URL` to override it.
- Implement MSP v1 framing exactly: `$`, `M`, direction, payload length, command, payload, checksum. Checksum is XOR of length, command, and every payload byte. Multi-byte values are little-endian.
- Parse incoming `MSP_SET_RAW_RC` into 8 channels. AUX4 is channel index 7. Treat `aux4 >= 1400` as armed.
- Broadcast bridge-to-sim stick input using this JSON contract:

```json
{
  "type": "RC_INPUT",
  "data": {
    "roll": 1500,
    "pitch": 1500,
    "throttle": 1000,
    "yaw": 1500,
    "aux1": 1000,
    "aux2": 1000,
    "aux3": 1000,
    "aux4": 1200
  }
}
```

- Send sim-to-bridge telemetry using this JSON contract:

```json
{
  "type": "TELEMETRY",
  "data": {
    "roll": 0,
    "pitch": 0,
    "yaw": 0,
    "altitude": 0,
    "vbat": 370,
    "status": 8
  }
}
```

- Build MSP responses for:
  - `MSP_FLIGHT_STATUS` command `255`, payload uint16 little-endian.
  - `MSP_ANALOG` version 1 layout: `vBatComp`, `mAmpRaw`, `mAhDrawn`, `mAhRemain`, `soc_Fused`, `auto_LandMode`.
  - `MSP_ATTITUDE` and `MSP_ALTITUDE` using standard MSP defaults, with constants isolated so they can be corrected after checking the PlutoController source.
- Send exactly one power-of-two flight status at a time. Coerce combined flags to the lowest set bit if a bad value enters the bridge.
- Add a fake app script that sends scripted `RC_INPUT` frames every 50 ms through WebSocket.
- Add unit tests for MSP parser/builder behavior before running the phone end-to-end.

## Local Runbook

```bash
npm install
npm run test:bridge
npm run dev
sudo npm run bridge
npm run bridge:fake
```

For phone testing, put the Mac and phone on the same Wi-Fi, make sure the phone is not connected to a real Pluto drone AP, then bind the drone IP on macOS:

```bash
sudo ifconfig en0 alias 192.168.4.1 255.255.255.0
```

When done:

```bash
sudo ifconfig en0 -alias 192.168.4.1
```
