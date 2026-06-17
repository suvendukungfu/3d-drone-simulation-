import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import App from '../App';
import { useDroneStore } from '../store/useDroneStore';

vi.mock('../components/Scene', () => ({
  Scene: () => React.createElement('div', { 'data-testid': 'mock-scene' }, 'Mock Scene')
}));

vi.mock('../components/FlightScene', () => ({
  FlightScene: () => React.createElement('div', { 'data-testid': 'mock-flight-scene' }, 'Mock Flight Scene')
}));

describe('PlutoXR UAV Academy Smoke Tests', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useDroneStore.setState({
      currentMode: 'home',
      activeMissionIndex: -1,
      missionStatus: 'idle',
      unlockedLevels: [true, false, false, false, false],
      isFlightSimModalOpen: false,
      isARActive: false,
      clickedParts: [],
    });
    // Reset window hash
    window.location.hash = '#/';
  });

  test('1. Landing page renders with brand headers and three CTAs', () => {
    render(<App />);
    
    // Check main title
    expect(screen.getByText(/EXPLORE. TRAIN./i)).toBeInTheDocument();
    expect(screen.getByText(/FLY PLUTOX NANO./i)).toBeInTheDocument();
    
    // Check CTAs
    expect(screen.getByText(/Enter Flight Sim/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore Anatomy/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn to Fly Pluto/i)).toBeInTheDocument();
  });

  test('2. Clicking "Explore Anatomy" switches mode and opens the Anatomy Lab', () => {
    render(<App />);
    
    const anatomyBtn = screen.getByText(/Explore Anatomy/i).closest('button');
    expect(anatomyBtn).toBeInTheDocument();
    fireEvent.click(anatomyBtn!);
    
    // Mode should be updated
    expect(useDroneStore.getState().currentMode).toBe('explore');
    expect(window.location.hash).toBe('#/anatomy');
  });

  test('3. Clicking "Learn to Fly" switches mode and opens Flight Academy levels menu', () => {
    render(<App />);
    
    const learnBtn = screen.getByText(/Learn to Fly Pluto/i).closest('button');
    expect(learnBtn).toBeInTheDocument();
    fireEvent.click(learnBtn!);
    
    expect(useDroneStore.getState().currentMode).toBe('flight');
    expect(useDroneStore.getState().activeMissionIndex).toBe(-1);
    expect(window.location.hash).toBe('#/learn');
    
    // Levels menu should show Levels 1 to 5
    expect(screen.getByText(/Level 1: Pre-Flight Check/i)).toBeInTheDocument();
    expect(screen.getByText(/Level 2: Liftoff & Hover/i)).toBeInTheDocument();
    expect(screen.getByText(/Level 5: The Final Exam/i)).toBeInTheDocument();
  });

  test('4. Level progression unlocking triggers', () => {
    render(<App />);
    
    // Initially, Level 1 is unlocked, Level 2 is locked
    const state = useDroneStore.getState();
    expect(state.unlockedLevels[0]).toBe(true);
    expect(state.unlockedLevels[1]).toBe(false);
    
    // Complete Level 1 (index 0 corresponding to Level 1, levelNumber 1)
    useDroneStore.getState().completeLevelAction(0);
    
    // Level 2 should now be unlocked
    const updatedState = useDroneStore.getState();
    expect(updatedState.unlockedLevels[1]).toBe(true);
  });

  test('5. Hash routing navigation lock when active mission is in progress', async () => {
    render(<App />);
    
    // Start Level 1 (Module index 4)
    useDroneStore.getState().setMode('flight');
    useDroneStore.getState().selectMission(4);
    
    expect(useDroneStore.getState().activeMissionIndex).toBe(4);
    expect(window.location.hash).toBe('#/sim/mission/4');
    
    // Try to navigate manually by changing window hash to #/
    window.location.hash = '#/';
    
    // Reverts back to active mission hash due to navigation lock!
    await waitFor(() => {
      expect(window.location.hash).toBe('#/sim/mission/4');
    });
  });
});
