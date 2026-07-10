import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe, beforeEach, afterEach } from 'vitest';
import { FlightControlsPanel } from '../components/UI/FlightControlsPanel';
import { useDroneStore } from '../store/useDroneStore';

describe('FlightControlsPanel Component Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    // Setup global window properties to look like a desktop
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });
    Object.defineProperty(navigator, 'maxTouchPoints', { writable: true, configurable: true, value: 0 });
    // Remove ontouchstart from window
    if ('ontouchstart' in window) {
      delete (window as any).ontouchstart;
    }
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('Renders compact controls panel and toggles collapsed state', () => {
    useDroneStore.setState({
      currentMode: 'flight',
      isAcademyMode: false,
      isTutorialActive: false,
    });

    render(<FlightControlsPanel />);

    // Renders expanded panel initially
    expect(screen.getByText('Controls Help')).toBeInTheDocument();
    expect(screen.getByText('Throttle / Yaw')).toBeInTheDocument();
    expect(screen.getByText('Pitch / Roll')).toBeInTheDocument();
    expect(screen.getByText('Camera View')).toBeInTheDocument();

    // Check click to collapse
    const hideBtn = screen.getByRole('button', { name: /hide/i });
    fireEvent.click(hideBtn);

    // Panel should collapse to "Controls" trigger tab
    expect(screen.queryByText('Throttle / Yaw')).not.toBeInTheDocument();
    const showBtn = screen.getByRole('button', { name: /controls/i });
    expect(showBtn).toBeInTheDocument();

    // Persistance check
    expect(localStorage.getItem('flightControlsCollapsed')).toBe('true');

    // Click show controls to expand again
    fireEvent.click(showBtn);
    expect(screen.getByText('Controls Help')).toBeInTheDocument();
    expect(screen.getByText('Throttle / Yaw')).toBeInTheDocument();
    expect(localStorage.getItem('flightControlsCollapsed')).toBe('false');
  });

  test('Does not render when tutorial is active', () => {
    useDroneStore.setState({
      currentMode: 'flight',
      isAcademyMode: false,
      isTutorialActive: true,
    });

    const { container } = render(<FlightControlsPanel />);
    expect(container.firstChild).toBeNull();
  });

  test('Does not render on mobile device sizes', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    useDroneStore.setState({
      currentMode: 'flight',
      isAcademyMode: false,
      isTutorialActive: false,
    });

    const { container } = render(<FlightControlsPanel />);
    expect(container.firstChild).toBeNull();
  });
});
