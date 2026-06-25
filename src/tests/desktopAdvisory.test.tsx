import { render, screen, fireEvent } from '@testing-library/react';
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

describe('ARSimulator Desktop Advisory Tests', () => {
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

  test('Renders desktop warning modal when user is on a Desktop device', async () => {
    // Stub a desktop user agent (no Android/iPhone/iPad/iPod)
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      mediaDevices: navigator.mediaDevices
    });

    render(<ARSimulator />);

    // Verify advisory elements are present
    expect(screen.getByText(/AR Experience Works Best on Mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/Feature Support Status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch to Closed Simulator/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Desktop Preview/i })).toBeInTheDocument();
  });

  test('Bypasses warning modal when user is on a Mobile device', async () => {
    // Stub a mobile user agent
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      mediaDevices: navigator.mediaDevices
    });

    render(<ARSimulator />);

    // Warning should NOT be present
    expect(screen.queryByText(/AR Experience Works Best on Mobile/i)).not.toBeInTheDocument();

    // Checklist lobby should be displayed
    expect(screen.getByText(/Hardware \/ Sensor Calibration Checklist/i)).toBeInTheDocument();
  });

  test('Clicking "Switch to Closed Simulator" correctly updates global store state', async () => {
    // Stub desktop
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      mediaDevices: navigator.mediaDevices
    });

    render(<ARSimulator />);

    const switchBtn = screen.getByRole('button', { name: /Switch to Closed Simulator/i });
    fireEvent.click(switchBtn);

    const state = useDroneStore.getState();
    expect(state.isARActive).toBe(false);
    expect(state.currentMode).toBe('flight');
    expect(state.activeMissionIndex).toBe(-1);
    expect(state.isAcademyMode).toBe(false);
    expect(state.isAcademyOpen).toBe(false);
  });

  test('Clicking "Continue with Desktop Preview" dismisses the modal and shows the lobby', async () => {
    // Stub desktop
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      mediaDevices: navigator.mediaDevices
    });

    render(<ARSimulator />);

    // Click continue
    const continueBtn = screen.getByRole('button', { name: /Continue with Desktop Preview/i });
    fireEvent.click(continueBtn);

    // Advisory warning should be gone
    expect(screen.queryByText(/AR Experience Works Best on Mobile/i)).not.toBeInTheDocument();

    // Standard lobby should now be visible
    expect(screen.getByText(/Hardware \/ Sensor Calibration Checklist/i)).toBeInTheDocument();
  });
});
