import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { ClosedSimMobileMenu } from '../components/UI/ClosedSimMobileMenu';
import { useDroneStore } from '../store/useDroneStore';

describe('ClosedSimMobileMenu Component Tests', () => {
  const defaultStickState = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };

  beforeEach(() => {
    // Mock local storage
    let store: Record<string, string> = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
    vi.stubGlobal('localStorage', localStorageMock);

    // Reset store state (defaulting to Free Flight Closed Simulation)
    useDroneStore.setState({
      flightEnvironment: 'room',
      showTelemetryDashboard: true,
      showControlsOverlay: true,
      showChecklist: true,
      isAcademyMode: false,
      modelLoadStatus: 'success',
      droneSpawnDiagnostics: {} as any,
      telemetry: {
        altitude: 1.5,
        speed: 0.5,
        verticalSpeed: 0,
        pitch: 2.1,
        roll: -1.2,
        heading: 90,
        isArmed: false,
        flightMode: 'stabilize',
        battery: 80,
        flightTime: 12,
        calibrationActive: false,
        sensorError: false,
      } as any,
    });
  });

  test('Renders hamburger button in closed simulation environment', () => {
    render(
      <ClosedSimMobileMenu
        onReset={() => {}}
        onToggleAltHold={() => {}}
        stickState={defaultStickState}
      />
    );

    // Hamburger button should be in the DOM
    const btn = screen.getByRole('button', { name: /Open menu/i });
    expect(btn).toBeInTheDocument();
  });

  test('Does NOT render hamburger button in non-closed simulation environment', () => {
    useDroneStore.setState({ flightEnvironment: 'field' }); // non-closed env

    render(
      <ClosedSimMobileMenu
        onReset={() => {}}
        onToggleAltHold={() => {}}
        stickState={defaultStickState}
      />
    );

    const btn = screen.queryByRole('button', { name: /Open menu/i });
    expect(btn).not.toBeInTheDocument();
  });

  test('Hides checklist toggle inside mobile menu when not in academy mode', () => {
    useDroneStore.setState({ isAcademyMode: false });

    render(
      <ClosedSimMobileMenu
        onReset={() => {}}
        onToggleAltHold={() => {}}
        stickState={defaultStickState}
      />
    );

    // Open menu
    fireEvent.click(screen.getByRole('button', { name: /Open menu/i }));

    // Verify Show/Hide Checklist is not rendered
    expect(screen.queryByText(/Show\/Hide Checklist/i)).not.toBeInTheDocument();
  });

  test('Opens drawer on hamburger click and shows sections', () => {
    render(
      <ClosedSimMobileMenu
        onReset={() => {}}
        onToggleAltHold={() => {}}
        stickState={defaultStickState}
      />
    );

    // Click hamburger
    const btn = screen.getByRole('button', { name: /Open menu/i });
    fireEvent.click(btn);

    // Verify header title and sections are rendered (using getAllByText because it appears in header and footer)
    expect(screen.getAllByText(/Pluto Controller/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Flight Data/i)).toBeInTheDocument();
    expect(screen.getByText(/Drone Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Sensors/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument();
    expect(screen.getByText(/UI Controls/i)).toBeInTheDocument();

    // Verify UI Controls contains standard toggles
    expect(screen.getByText(/Show\/Hide Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/Show\/Hide Controls/i)).toBeInTheDocument();
  });

  test('Checklist toggle updates the store in academy mode', () => {
    // Explicitly set academy mode to true so checklist toggle renders
    useDroneStore.setState({ isAcademyMode: true });

    render(
      <ClosedSimMobileMenu
        onReset={() => {}}
        onToggleAltHold={() => {}}
        stickState={defaultStickState}
      />
    );

    // Open menu
    fireEvent.click(screen.getByRole('button', { name: /Open menu/i }));

    // Toggle Checklist
    const initialChecklistState = useDroneStore.getState().showChecklist;
    const checklistToggle = screen.getByText(/Show\/Hide Checklist/i).closest('div')?.querySelector('button');
    expect(checklistToggle).toBeInTheDocument();

    fireEvent.click(checklistToggle!);
    expect(useDroneStore.getState().showChecklist).toBe(!initialChecklistState);
  });

  test('Clicking exit to home page navigates to home mode', () => {
    render(
      <ClosedSimMobileMenu
        onReset={() => {}}
        onToggleAltHold={() => {}}
        stickState={defaultStickState}
      />
    );

    // Open menu
    fireEvent.click(screen.getByRole('button', { name: /Open menu/i }));

    // Click Exit to Home Page
    const exitBtn = screen.getByRole('button', { name: /Exit to Home Page/i });
    expect(exitBtn).toBeInTheDocument();

    fireEvent.click(exitBtn);
    expect(useDroneStore.getState().currentMode).toBe('home');
  });
});

