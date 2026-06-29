import net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';
import {
  MSP,
  MspStreamParser,
  buildTelemetryResponse,
  parseRawRcPayload,
  selectSingleStatus,
} from './msp.js';

const tcpHost = process.env.PLUTO_TCP_HOST ?? '0.0.0.0';
const tcpPort = Number(process.env.PLUTO_TCP_PORT ?? 23);
const wsHost = process.env.PLUTO_WS_HOST ?? '0.0.0.0';
const wsPort = Number(process.env.PLUTO_WS_PORT ?? 8080);
const logFrames = process.env.PLUTO_BRIDGE_DEBUG === '1';

const defaultRc = {
  roll: 1500,
  pitch: 1500,
  throttle: 1000,
  yaw: 1500,
  aux1: 1000,
  aux2: 1000,
  aux3: 1000,
  aux4: 1200,
};

let latestTelemetry = {
  roll: 0,
  pitch: 0,
  yaw: 0,
  heading: 0,
  altitude: 0,
  verticalSpeed: 0,
  vbat: 370,
  soc: 90,
  status: 8,
};

let latestRc = { ...defaultRc };
let lastTelemetryLogAt = 0;

const normalizeTelemetry = (data = {}) => {
  const status = selectSingleStatus(data.status ?? latestTelemetry.status ?? 8);
  return {
    ...latestTelemetry,
    roll: Number(data.roll ?? latestTelemetry.roll ?? 0),
    pitch: Number(data.pitch ?? latestTelemetry.pitch ?? 0),
    yaw: Number(data.yaw ?? latestTelemetry.yaw ?? 0),
    heading: Number(data.heading ?? data.yaw ?? latestTelemetry.heading ?? 0),
    altitude: Number(data.altitude ?? latestTelemetry.altitude ?? 0),
    verticalSpeed: Number(data.verticalSpeed ?? latestTelemetry.verticalSpeed ?? 0),
    vbat: Number(data.vbat ?? latestTelemetry.vbat ?? 370),
    soc: Number(data.soc ?? data.battery ?? latestTelemetry.soc ?? 90),
    status,
  };
};

const safeJson = (raw) => {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
};

const wss = new WebSocketServer({ host: wsHost, port: wsPort });

function broadcastJson(message, exceptSocket = null) {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client !== exceptSocket && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function handleWsMessage(socket, raw) {
  const message = safeJson(raw);
  if (!message || typeof message.type !== 'string') {
    return;
  }

  if (message.type === 'HELLO') {
    socket.send(JSON.stringify({
      type: 'HELLO_ACK',
      data: {
        bridge: 'plutocontroller-phase-2',
        tcpPort,
        wsPort,
      },
    }));
    return;
  }

  if (message.type === 'RC_INPUT') {
    latestRc = { ...defaultRc, ...(message.data ?? {}) };
    broadcastJson({ type: 'RC_INPUT', data: latestRc }, socket);
    return;
  }

  if (message.type === 'TELEMETRY') {
    latestTelemetry = normalizeTelemetry(message.data);
    const now = Date.now();
    if (now - lastTelemetryLogAt > 1000) {
      lastTelemetryLogAt = now;
      console.log(
        `[ws] telemetry status=${latestTelemetry.status} alt=${latestTelemetry.altitude.toFixed(2)}m ` +
        `att=R${latestTelemetry.roll.toFixed(1)} P${latestTelemetry.pitch.toFixed(1)} Y${latestTelemetry.yaw.toFixed(1)} ` +
        `vbat=${latestTelemetry.vbat}`,
      );
    }
  }
}

wss.on('connection', (socket, req) => {
  console.log(`[ws] simulator/fake client connected from ${req.socket.remoteAddress}`);
  socket.send(JSON.stringify({ type: 'RC_INPUT', data: latestRc }));
  socket.on('message', (raw) => handleWsMessage(socket, raw));
  socket.on('close', () => console.log('[ws] client disconnected'));
});

wss.on('listening', () => {
  console.log(`[ws] JSON bridge listening on ws://${wsHost}:${wsPort}`);
});

const tcpServer = net.createServer((socket) => {
  const remote = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[tcp] PlutoController connected from ${remote}`);

  const parser = new MspStreamParser({
    onFrame: (frame) => {
      if (logFrames) {
        console.log(`[tcp] MSP dir=${frame.direction} cmd=${frame.command} len=${frame.length}`);
      }

      if (frame.direction !== '<') {
        return;
      }

      if (frame.command === MSP.SET_RAW_RC) {
        try {
          latestRc = parseRawRcPayload(frame.payload);
          broadcastJson({ type: 'RC_INPUT', data: latestRc });
        } catch (error) {
          console.warn(`[tcp] invalid MSP_SET_RAW_RC payload: ${error.message}`);
        }
        return;
      }

      const response = buildTelemetryResponse(frame.command, latestTelemetry);
      socket.write(response);
    },
    onError: (error) => {
      console.warn(`[tcp] MSP parse error: ${error.message}`);
    },
  });

  socket.on('data', (chunk) => parser.push(chunk));
  socket.on('error', (error) => console.warn(`[tcp] socket error from ${remote}: ${error.message}`));
  socket.on('close', () => console.log(`[tcp] PlutoController disconnected from ${remote}`));
});

tcpServer.on('error', (error) => {
  if (error.code === 'EACCES') {
    console.error(
      `[tcp] Cannot bind port ${tcpPort}. Port 23 is privileged on macOS; run the bridge with sudo or set PLUTO_TCP_PORT for local tests.`,
    );
  } else if (error.code === 'EADDRINUSE') {
    console.error(`[tcp] Port ${tcpPort} is already in use.`);
  } else {
    console.error(`[tcp] server error: ${error.message}`);
  }
  process.exitCode = 1;
});

tcpServer.listen(tcpPort, tcpHost, () => {
  console.log(`[tcp] MSP-over-TCP bridge listening on ${tcpHost}:${tcpPort}`);
  console.log('[tcp] Expected PlutoController target: 192.168.4.1:23');
});

process.on('SIGINT', () => {
  console.log('\n[bridge] shutting down');
  tcpServer.close();
  wss.close();
});
