import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { ClosedSimMobileMenu } from '../components/UI/ClosedSimMobileMenu';
import { useDroneStore } from '../store/useDroneStore';

describe('ClosedSimMobileMenu Component Tests', () => {
  const defaultStickState = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };
  beforeEach(() => {
    localStorage.clear();
  });

  beforeEach(() => {

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

  test('Local closed simulator controls are available without AppLink connection', () => {
    useDroneStore.setState({ appLinkStatus: 'disconnected' as any });
    const onArmSpy = vi.fn();
    const setAnalogStickValues = vi.fn();

    render(
      <ClosedSimMobileMenu
        onReset={() => {}}
        onArm={onArmSpy}
        onToggleAltHold={() => {}}
        stickState={defaultStickState}
        orchestrator={{
          input: { setAnalogStickValues },
          getIsCrashed: () => false,
        } as any}
      />
    );

    expect(screen.getByText(/SIM READY/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Connect$/i)).not.toBeInTheDocument();

    const armButton = screen.getByText(/^ARM$/i).parentElement?.querySelector('button');
    expect(armButton).toBeInTheDocument();
    fireEvent.click(armButton!);
    expect(onArmSpy).toHaveBeenCalledTimes(1);
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

  test('Renders and triggers Takeoff, Land, and Flip buttons when armed', () => {
    // Set isArmed to true
    useDroneStore.setState({
      telemetry: {
        ...useDroneStore.getState().telemetry,
        isArmed: true,
      } as any
    });

    const onTakeoffSpy = vi.fn();
    const onLandSpy = vi.fn();
    const onFlipSpy = vi.fn();

    render(
      <ClosedSimMobileMenu
        onReset={() => {}}
        onToggleAltHold={() => {}}
        stickState={defaultStickState}
        hasTakenOff={false}
        isLandingActive={false}
        isFlipArmed={false}
        isFlipping={false}
        onTakeoff={onTakeoffSpy}
        onLand={onLandSpy}
        onFlip={onFlipSpy}
      />
    );

    // Open menu
    fireEvent.click(screen.getByRole('button', { name: /Open menu/i }));

    // Find and click Takeoff Drone button
    const takeoffBtn = screen.getByRole('button', { name: /Takeoff Drone/i });
    expect(takeoffBtn).toBeInTheDocument();
    expect(takeoffBtn).not.toBeDisabled();
    fireEvent.click(takeoffBtn);
    expect(onTakeoffSpy).toHaveBeenCalledTimes(1);

    // The rest (Land and Flip) should be disabled since hasTakenOff is false
    const landBtn = screen.getByRole('button', { name: /Land Drone/i });
    const flipBtn = screen.getByRole('button', { name: /Flip Forward/i });
    expect(landBtn).toBeDisabled();
    expect(flipBtn).toBeDisabled();
  });

  test('Enables and triggers Land and Flip buttons when airborne (hasTakenOff=true)', () => {
    // Set isArmed to true
    useDroneStore.setState({
      telemetry: {
        ...useDroneStore.getState().telemetry,
        isArmed: true,
      } as any
    });

    const onTakeoffSpy = vi.fn();
    const onLandSpy = vi.fn();
    const onFlipSpy = vi.fn();

    render(
      <ClosedSimMobileMenu
        onReset={() => {}}
        onToggleAltHold={() => {}}
        stickState={defaultStickState}
        hasTakenOff={true}
        isLandingActive={false}
        isFlipArmed={false}
        isFlipping={false}
        onTakeoff={onTakeoffSpy}
        onLand={onLandSpy}
        onFlip={onFlipSpy}
      />
    );

    // Open menu
    fireEvent.click(screen.getByRole('button', { name: /Open menu/i }));

    // Takeoff button should be disabled when already taken off
    const takeoffBtn = screen.getByRole('button', { name: /Takeoff Drone/i });
    expect(takeoffBtn).toBeDisabled();

    // Land button should be active and triggerable
    const landBtn = screen.getByRole('button', { name: /Land Drone/i });
    expect(landBtn).not.toBeDisabled();
    fireEvent.click(landBtn);
    expect(onLandSpy).toHaveBeenCalledTimes(1);

    // Flip button should be active and triggerable
    const flipBtn = screen.getByRole('button', { name: /Flip Forward/i });
    expect(flipBtn).not.toBeDisabled();
    fireEvent.click(flipBtn);
    expect(onFlipSpy).toHaveBeenCalledTimes(1);
  });
});
