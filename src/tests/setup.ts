import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';
import * as THREE from 'three';

// Mock Web Audio API
class AudioContextMock {
  currentTime = 0;
  state = 'running';
  destination = {};
  createOscillator() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      type: 'sine',
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        setTargetAtTime: () => {},
      },
    };
  }
  createGain() {
    return {
      connect: () => {},
      gain: {
        value: 0,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        setTargetAtTime: () => {},
      },
    };
  }
  resume() {
    return Promise.resolve();
  }
}
vi.stubGlobal('AudioContext', AudioContextMock);

// Mock window.matchMedia
vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})));

// Mock R3F and Drei
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-canvas' }, children),
  useFrame: () => {},
  useThree: () => ({ camera: {}, scene: {}, gl: {} }),
}));

const useGLTFMock = vi.fn().mockReturnValue({ scene: new THREE.Group() });
(useGLTFMock as any).setDecoderPath = () => {};
(useGLTFMock as any).preload = () => {};

vi.mock('@react-three/drei', () => {
  return {
    useProgress: () => ({ active: false, progress: 100 }),
    Html: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-html' }, children),
    useGLTF: useGLTFMock,
    OrbitControls: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-orbitcontrols' }, children),
    Environment: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-environment' }, children),
    Grid: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-grid' }, children),
    ContactShadows: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-contactshadows' }, children),
    Center: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-center' }, children),
    Billboard: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-billboard' }, children),
    Text: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-text' }, children),
  };
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

// Stub WebGL2RenderingContext to prevent iwer/XR emulator errors in jsdom
vi.stubGlobal('WebGL2RenderingContext', class WebGL2RenderingContextMock {});
vi.stubGlobal('WebGLRenderingContext', class WebGLRenderingContextMock {});

// Mock HTMLCanvasElement.prototype.getContext to return a dummy WebGL context
const glMock = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'canvas') return document.createElement('canvas');
    if (prop === 'getParameter') {
      return (p: number) => {
        // 7938: gl.VERSION, 7936: gl.VENDOR, 7937: gl.RENDERER, 35724: gl.SHADING_LANGUAGE_VERSION
        if (p === 7938 || p === 7936 || p === 7937 || p === 35724) {
          return 'WebGL 2.0';
        }
        // MAX_TEXTURE_SIZE, etc.
        return 2048;
      };
    }
    if (prop === 'getExtension') return () => null;
    if (prop === 'getShaderPrecisionFormat') {
      return () => ({ rangeMin: 1, rangeMax: 1, precision: 1 });
    }
    // WebGL constants are uppercase. Return appropriate numeric values.
    if (typeof prop === 'string' && prop === prop.toUpperCase()) {
      if (prop === 'VERSION') return 7938;
      if (prop === 'VENDOR') return 7936;
      if (prop === 'RENDERER') return 7937;
      if (prop === 'SHADING_LANGUAGE_VERSION') return 35724;
      return 1;
    }
    // Default fallback to a dummy function
    return () => {};
  }
});

HTMLCanvasElement.prototype.getContext = function (contextId: string) {
  if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
    return glMock as any;
  }
  return null;
} as any;
// Stub pointer capture APIs for jsdom compatibility
if (typeof Element !== 'undefined') {
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function() {};
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || function() {};
}
