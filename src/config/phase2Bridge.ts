const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const PLUTO_BRIDGE_WS_URL = env.VITE_PLUTO_BRIDGE_WS_URL || 'ws://localhost:8080';
