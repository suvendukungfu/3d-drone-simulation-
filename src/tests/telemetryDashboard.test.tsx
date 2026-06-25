import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { TelemetryDashboard } from '../components/UI/TelemetryDashboard';
import { useDroneStore } from '../store/useDroneStore';

describe('TelemetryDashboard Component Tests', () => {
  const defaultStickState = { throttle: 0, yaw: 0, pitch: 0, roll: 0 };

  beforeEach(() => {
    // Reset store state
    useDroneStore.setState({
      flightEnvironment: 'room',
      telemetry: {
        altitude: 0,
        speed: 0,
        verticalSpeed: 0,
        pitch: 0,
        roll: 0,
        heading: 0,
        isArmed: false,
        flightMode: 'stabilize',
        battery: 100,
        flightTime: 0,
        calibrationActive: false,
        sensorError: false,
      } as any,
      warnings: [],
    });
  });

  test('Does not render flight control buttons (Takeoff, Land, Flip) when drone is disarmed', () => {
    render(
      <TelemetryDashboard
        onReset={() => {}}
        onCalibrate={() => {}}
        onToggleAltHold={() => {}}
        stickState={defaultStickState}
      />
    );

    expect(screen.queryByRole('button', { name: /Takeoff/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Land/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Flip/i })).not.toBeInTheDocument();
  });

  test('Renders and triggers Takeoff, Land, and Flip buttons when armed', () => {
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
      <TelemetryDashboard
        onReset={() => {}}
        onCalibrate={() => {}}
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

    // Takeoff should be active
    const takeoffBtn = screen.getByRole('button', { name: /Takeoff/i });
    expect(takeoffBtn).toBeInTheDocument();
    expect(takeoffBtn).not.toBeDisabled();
    fireEvent.click(takeoffBtn);
    expect(onTakeoffSpy).toHaveBeenCalledTimes(1);

    // Land and Flip should be disabled
    const landBtn = screen.getByRole('button', { name: /Land/i });
    const flipBtn = screen.getByRole('button', { name: /Flip/i });
    expect(landBtn).toBeDisabled();
    expect(flipBtn).toBeDisabled();
  });

  test('Enables and triggers Land and Flip buttons when airborne (hasTakenOff=true)', () => {
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
      <TelemetryDashboard
        onReset={() => {}}
        onCalibrate={() => {}}
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

    // Takeoff should be disabled
    const takeoffBtn = screen.getByRole('button', { name: /Takeoff/i });
    expect(takeoffBtn).toBeDisabled();

    // Land should be enabled and triggerable
    const landBtn = screen.getByRole('button', { name: /Land/i });
    expect(landBtn).not.toBeDisabled();
    fireEvent.click(landBtn);
    expect(onLandSpy).toHaveBeenCalledTimes(1);

    // Flip should be enabled and triggerable
    const flipBtn = screen.getByRole('button', { name: /Flip/i });
    expect(flipBtn).not.toBeDisabled();
    fireEvent.click(flipBtn);
    expect(onFlipSpy).toHaveBeenCalledTimes(1);
  });
});
