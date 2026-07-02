import { render, screen } from '@testing-library/react';
import React from 'react';
import { expect, test, describe, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { ARSimulator } from '../components/UI/ARSimulator';
import { useDroneStore } from '../store/useDroneStore';

// Mock R3F specifically for this test file
vi.mock('@react-three/fiber', () => {
  const cameraMock = {
    quaternion: new THREE.Quaternion(),
    position: new THREE.Vector3(),
    updateMatrixWorld: vi.fn(),
    matrixWorld: new THREE.Matrix4(),
    matrixWorldInverse: new THREE.Matrix4(),
    projectionMatrix: new THREE.Matrix4(),
  };
  return {
    Canvas: ({ children }: any) => React.createElement('div', { 'data-testid': 'mock-canvas' }, children),
    useFrame: () => {},
    useThree: () => ({
      camera: cameraMock,
      scene: {},
      gl: {}
    })
  };
});

// Mock PlutoXModel to avoid GLTF load issues
vi.mock('../PlutoXModel', () => ({
  PlutoXModel: () => React.createElement('div', { 'data-testid': 'mock-plutox' }, 'Mock PlutoX Model')
}));

describe('ARSimulator Desktop Inline Warning Tests', () => {
  let originalUserAgent: string;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    vi.stubEnv('NODE_ENV', 'development');

    // Reset store state
    useDroneStore.setState({
      isARActive: true,
      currentMode: 'home',
      activeMissionIndex: 1,
      isAcademyMode: true,
      isAcademyOpen: true,
      theme: 'dark'
    });

    // Mock mediaDevices API
    const mockMediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [
          { stop: vi.fn() }
        ],
        getVideoTracks: () => [
          { getSettings: () => ({ deviceId: 'test-device-id' }) }
        ]
      }),
      enumerateDevices: vi.fn().mockResolvedValue([
        { kind: 'videoinput', deviceId: 'test-device-id', label: 'Test Camera 1' }
      ])
    };

    vi.stubGlobal('navigator', {
      userAgent: originalUserAgent,
      mediaDevices: mockMediaDevices
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test('Renders desktop inline warning banner when user is on a Desktop device', async () => {
    // Stub a desktop user agent (no Android/iPhone/iPad/iPod)
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      mediaDevices: navigator.mediaDevices
    });

    render(<ARSimulator />);

    // Verify checklist lobby is immediately visible
    expect(screen.getByText(/Hardware \/ Sensor Calibration Checklist/i)).toBeInTheDocument();

    // Verify inline desktop advisory banner is present
    expect(screen.getByText(/desktop preview mode active/i)).toBeInTheDocument();
  });

  test('Bypasses warning banner when user is on a Mobile device', async () => {
    // Stub a mobile user agent
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      mediaDevices: navigator.mediaDevices
    });

    render(<ARSimulator />);

    // Checklist lobby should be displayed
    expect(screen.getByText(/Hardware \/ Sensor Calibration Checklist/i)).toBeInTheDocument();

    // Inline desktop warning banner should NOT be present
    expect(screen.queryByText(/desktop preview mode active/i)).not.toBeInTheDocument();
  });
});
