import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import { CrashRecoveryOverlay } from '../components/UI/CrashRecoveryOverlay';
import { useDroneStore } from '../store/useDroneStore';

describe('CrashRecoveryOverlay Component Tests', () => {
  beforeEach(() => {
    useDroneStore.setState({
      telemetry: {
        altitude: 1.45,
        speed: 3.2,
        roll: 45,
        pitch: -12,
        isArmed: false,
      } as any,
      warnings: ['CRASH DETECTED'],
    });
  });

  test('Renders crash recovery dialog with diagnostics and rebuild button', () => {
    const onRebuildSpy = vi.fn();
    render(<CrashRecoveryOverlay onRebuild={onRebuildSpy} />);

    // Verify dialog header/title
    expect(screen.getByText(/Crash Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/SYSTEM SAFETY LOCKED/i)).toBeInTheDocument();
    
    // Diagnostics snapshot section was removed from design per requirements.

    // Verify key binding text
    expect(screen.getByText(/Press/i)).toBeInTheDocument();
    expect(screen.getByText('[B]')).toBeInTheDocument();

    // Verify and trigger rebuild button
    const rebuildBtn = screen.getByRole('button', { name: /Rebuild/i });
    expect(rebuildBtn).toBeInTheDocument();
    fireEvent.click(rebuildBtn);
    expect(onRebuildSpy).toHaveBeenCalledTimes(1);
  });
});
