import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ARSimulator } from '../components/UI/ARSimulator';
import { useDroneStore } from '../store/useDroneStore';

// Mock R3F specifically for this test file to have a proper camera object
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

describe('ARSimulator Component Tests', () => {
  beforeEach(() => {
    useDroneStore.setState({
      isARActive: true,
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
      ...navigator,
      mediaDevices: mockMediaDevices
    });
  });

  test('Renders Exit AR, Telemetry HUD, and Joysticks when active', async () => {
    render(<ARSimulator />);

    // Exit Button
    expect(screen.getByText(/Exit AR/i)).toBeInTheDocument();

    // Telemetry HUD
    expect(screen.getByText(/Telemetry HUD/i)).toBeInTheDocument();
    expect(screen.getByText(/Altitude:/i)).toBeInTheDocument();

    // Joysticks
    expect(screen.getByText(/Left Stick/i)).toBeInTheDocument();
    expect(screen.getByText(/Right Stick/i)).toBeInTheDocument();
  });

  test('Renders AR Toolbox and handles camera devices', async () => {
    render(<ARSimulator />);

    // Wait for camera mock stream to load devices
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('test-device-id');
    });
  });

  test('Recovery buttons are functional', async () => {
    render(<ARSimulator />);

    await waitFor(() => {
      expect(screen.getByText(/AR Toolbox/i)).toBeInTheDocument();
    });

    // Find Drone Button
    const findBtn = screen.getByRole('button', { name: /Find Drone/i });
    expect(findBtn).toBeInTheDocument();
    fireEvent.click(findBtn);

    // Recenter Drone Button
    const recenterBtn = screen.getByRole('button', { name: /Recenter Drone/i });
    expect(recenterBtn).toBeInTheDocument();
    fireEvent.click(recenterBtn);

    // Restart Session Button
    const restartBtn = screen.getByRole('button', { name: /Restart Session/i });
    expect(restartBtn).toBeInTheDocument();
    fireEvent.click(restartBtn);

    // Refresh Tracking Button
    const refreshBtn = screen.getByRole('button', { name: /Refresh Tracking/i });
    expect(refreshBtn).toBeInTheDocument();
    fireEvent.click(refreshBtn);
  });
});
