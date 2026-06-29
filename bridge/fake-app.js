import WebSocket from 'ws';

const url = process.env.PLUTO_BRIDGE_WS_URL ?? 'ws://localhost:8080';
const intervalMs = Number(process.env.PLUTO_FAKE_APP_INTERVAL_MS ?? 50);

const neutral = {
  roll: 1500,
  pitch: 1500,
  throttle: 1000,
  yaw: 1500,
  aux1: 1000,
  aux2: 1000,
  aux3: 1000,
  aux4: 1200,
};

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

function scriptedRc(elapsedSeconds) {
  const rc = { ...neutral };

  if (elapsedSeconds < 1.0) {
    return rc;
  }

  rc.aux4 = 1500;

  if (elapsedSeconds < 4.0) {
    rc.throttle = Math.round(lerp(1000, 1700, (elapsedSeconds - 1.0) / 3.0));
  } else if (elapsedSeconds < 7.0) {
    rc.throttle = 1560;
    rc.roll = 1650;
  } else if (elapsedSeconds < 10.0) {
    rc.throttle = 1560;
    rc.roll = 1500;
    rc.pitch = 1350;
  } else if (elapsedSeconds < 13.0) {
    rc.throttle = 1450;
    rc.pitch = 1500;
    rc.yaw = 1650;
  } else if (elapsedSeconds < 16.0) {
    rc.throttle = Math.round(lerp(1450, 1000, (elapsedSeconds - 13.0) / 3.0));
    rc.yaw = 1500;
  } else {
    rc.aux4 = 1200;
    rc.throttle = 1000;
  }

  return rc;
}

const socket = new WebSocket(url);
let timer = null;
let startedAt = 0;

socket.on('open', () => {
  console.log(`[fake-app] connected to ${url}`);
  socket.send(JSON.stringify({ type: 'HELLO', data: { client: 'fake-plutocontroller' } }));
  startedAt = Date.now();
  timer = setInterval(() => {
    const elapsedSeconds = (Date.now() - startedAt) / 1000;
    const data = scriptedRc(elapsedSeconds);
    socket.send(JSON.stringify({ type: 'RC_INPUT', data }));
  }, intervalMs);
});

socket.on('message', (raw) => {
  const message = raw.toString();
  if (message.includes('HELLO_ACK')) {
    console.log(`[fake-app] ${message}`);
  }
});

socket.on('close', () => {
  if (timer) {
    clearInterval(timer);
  }
  console.log('[fake-app] disconnected');
});

socket.on('error', (error) => {
  console.error(`[fake-app] ${error.message}`);
});

process.on('SIGINT', () => {
  if (timer) {
    clearInterval(timer);
  }
  socket.close();
});
