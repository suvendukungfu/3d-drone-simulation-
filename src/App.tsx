import { useRef, useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { ClosedSimMobileMenu } from './components/UI/ClosedSimMobileMenu';
import { TrainingMissionSystem } from './components/UI/TrainingMissionSystem';
import { useDroneStore } from './store/useDroneStore';
import { IntroOverlay } from './components/UI/IntroOverlay';
import VirtualJoysticks from './components/UI/VirtualJoysticks';
import { LearningWorkflow } from './components/UI/LearningWorkflow';
import { InteractiveTutorial } from './components/UI/InteractiveTutorial';
import { CrashRecoveryOverlay } from './components/UI/CrashRecoveryOverlay';
import { FlightControlsPanel } from './components/UI/FlightControlsPanel';
import { droneComponents } from './data/droneComponents';
import { SimulatorOrchestrator } from './utils/drone/SimulatorOrchestrator';
import { PlutoBridgeClient } from './utils/drone/PlutoBridgeClient';
import { Checkpoint, TelemetryData } from './utils/drone/types';

// Lazy loaded 3D viewports and overlay simulations for phase 2-4 performance optimizations
const Scene = lazy(() => import('./components/Scene').then(m => ({ default: m.Scene })));
const FlightScene = lazy(() => import('./components/FlightScene').then(m => ({ default: m.FlightScene })));
const ARSimulator = lazy(() => import('./components/UI/ARSimulator').then(m => ({ default: m.ARSimulator })));
import { 
  Layers, Info, ShieldAlert, Wrench, Activity, ChevronRight, ChevronDown, ChevronUp,
  Eye, Cpu, Power, CheckCircle, RefreshCcw, Gamepad2, ScanLine, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@react-three/drei';

/** Returns true when viewport width is below the given breakpoint */
function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener('change', handler as any);
    return () => mql.removeEventListener('change', handler as any);
  }, [breakpoint]);
  return isMobile;
}

function App() {
  const controlsRef = useRef<any>(null);
  const leftControlsRef = useRef<any>(null);
  const rightControlsRef = useRef<any>(null);
  
  // Loading progress of 3D GLTF assets
  const { active: isLoading, progress } = useProgress();

  // Unified Flight Simulator Orchestrator Instance
  const orchestratorRef = useRef<SimulatorOrchestrator | null>(null);
  if (!orchestratorRef.current) {
    orchestratorRef.current = new SimulatorOrchestrator();
  }
  const bridgeClientRef = useRef<PlutoBridgeClient | null>(null);

  // Active checkpoints to render in the environment
  const [activeCheckpoints, setActiveCheckpoints] = useState<Checkpoint[]>([]);

  const handleCheckpointsUpdated = useCallback((cps: Checkpoint[]) => {
    setActiveCheckpoints(cps);
  }, []);

  const handleTelemetryFrame = useCallback((telemetry: TelemetryData) => {
    bridgeClientRef.current?.sendTelemetry(telemetry);
  }, []);

  // State of keyboard sticks for UI visualizer
  const [stickState, setStickState] = useState({ throttle: 0, yaw: 0, pitch: 0, roll: 0 });

  const [orchestratorState, setOrchestratorState] = useState({
    hasTakenOff: false,
    isLandingActive: false,
    isFlipArmed: false,
    isFlipping: false
  });

  // Zustand Store mappings
  const currentMode = useDroneStore((state) => state.currentMode);
  const hoveredComponent = useDroneStore((state) => state.hoveredComponent);
  const selectedComponent = useDroneStore((state) => state.selectedComponent);
  const isExploded = useDroneStore((state) => state.isExploded);
  const isolationMode = useDroneStore((state) => state.isolationMode);
  const showAnatomyExploded = useDroneStore((state) => state.showAnatomyExploded);
  const activeMissionIndex = useDroneStore((state) => state.activeMissionIndex);
  const missionStatus = useDroneStore((state) => state.missionStatus);
  const addNotification = useDroneStore((state) => state.addNotification);
  const cameraView = useDroneStore((state) => state.cameraView);
  const autoRotate = useDroneStore((state) => state.autoRotate);
  const immersiveMode = useDroneStore((state) => state.immersiveMode);
  const vrMode = useDroneStore((state) => state.vrMode);
  const activeMotors = useDroneStore((state) => state.activeMotors);
  const isTestingSequence = useDroneStore((state) => state.isTestingSequence);
  const activeTestMotor = useDroneStore((state) => state.activeTestMotor);
  const motorRPMs = useDroneStore((state) => state.motorRPMs);
  const showRotationDirections = useDroneStore((state) => state.showRotationDirections);
  const isAcademyMode = useDroneStore((state) => state.isAcademyMode);
  const isARActive = useDroneStore((state) => state.isARActive);
  const telemetry = useDroneStore((state) => state.telemetry);
  const warnings = useDroneStore((state) => state.warnings);

  const hoverComponent = useDroneStore((state) => state.hoverComponent);
  const selectComponent = useDroneStore((state) => state.selectComponent);
  const toggleExploded = useDroneStore((state) => state.toggleExploded);
  const toggleIsolation = useDroneStore((state) => state.toggleIsolation);
  const toggleAnatomyExploded = useDroneStore((state) => state.toggleAnatomyExploded);
  const setCameraView = useDroneStore((state) => state.setCameraView);
  const toggleAutoRotate = useDroneStore((state) => state.toggleAutoRotate);
  const toggleImmersiveMode = useDroneStore((state) => state.toggleImmersiveMode);
  const toggleVrMode = useDroneStore((state) => state.toggleVrMode);
  
  const toggleMotor = useDroneStore((state) => state.toggleMotor);
  const testAllMotors = useDroneStore((state) => state.testAllMotors);
  const stopAllMotors = useDroneStore((state) => state.stopAllMotors);
  const setShowRotationDirections = useDroneStore((state) => state.setShowRotationDirections);
  const setMode = useDroneStore((state) => state.setMode);
  const startLearning = useDroneStore((state) => state.startLearning);
  const selectMission = useDroneStore((state) => state.selectMission);
  const theme = useDroneStore((state) => state.theme);
  const isDark = theme === 'dark';

  // ── Mobile Anatomy Lab Panel State ─────────────────────────────────────────
  const isMobile = useIsMobile();
  const [mobileAnatomyOpen, setMobileAnatomyOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<'camera' | 'immersive' | 'motor' | null>('camera');

  // ── Portrait Mode check for Mobile/Tablet Flight Simulator ─────────────
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  useEffect(() => {
    const checkOrientation = () => {
      const isTouchOrMobile = (window.innerWidth <= 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
      let isPortrait = false;
      if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.type) {
        isPortrait = screen.orientation.type.includes('portrait');
      } else {
        isPortrait = window.innerHeight > window.innerWidth;
      }
      setIsPortraitMobile(isTouchOrMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    if (typeof screen !== 'undefined' && screen.orientation) {
      screen.orientation.addEventListener('change', checkOrientation);
    }
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (typeof screen !== 'undefined' && screen.orientation) {
        screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, []);

  // Safe auto-disarm when pilot rotates device to portrait mid-flight
  useEffect(() => {
    if (isPortraitMobile && currentMode === 'flight' && orchestratorRef.current) {
      if (orchestratorRef.current.getIsArmed()) {
        orchestratorRef.current.disarm();
        addNotification('Flight suspended: rotated to portrait.', 'warning');
      }
    }
  }, [isPortraitMobile, currentMode, addNotification]);

  // Close mobile panel when switching away from explore mode
  useEffect(() => {
    if (currentMode !== 'explore' || immersiveMode) setMobileAnatomyOpen(false);
  }, [currentMode, immersiveMode]);

  const toggleAccordion = useCallback((key: 'camera' | 'immersive' | 'motor') => {
    setOpenAccordion((prev) => (prev === key ? null : key));
  }, []);

  const selectedData = selectedComponent ? droneComponents[selectedComponent] : null;

  const btnActiveStyle = 'bg-blue-500/10 border-blue-500 text-blue-600 shadow-[0_4px_12px_rgba(59,130,246,0.08)] dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-400';
  const btnInactiveStyle = 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';

  // Determine if a motor or propeller is selected to inject educational STEM highlights
  const isPropSelected = selectedComponent === 'propellerA' || selectedComponent === 'propellerB';
  const isMotorSelected = selectedComponent && selectedComponent.includes('motor');

  // URL Hash-Routing Synchronization Loop
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/';
      const state = useDroneStore.getState();
      
      // Enforce active lesson lock
      if (state.activeMissionIndex >= 0 && state.missionStatus !== 'passed') {
        // Form the hash corresponding to the active mission
        const activeHash = state.activeMissionIndex <= 3 ? '#/anatomy' : `#/sim/mission/${state.activeMissionIndex}`;
        if (hash !== activeHash) {
          window.location.hash = activeHash;
          state.addNotification('Please complete or abort the current lesson first.', 'warning');
          return;
        }
      }
      
      if (hash === '#/' || hash === '') {
        if (state.currentMode !== 'home') state.setMode('home');
      } else if (hash === '#/anatomy') {
        if (state.currentMode !== 'explore') state.setMode('explore');
        if (state.activeMissionIndex !== -1) state.selectMission(-1);
      } else if (hash === '#/learn') {
        if (state.currentMode !== 'flight') state.setMode('flight');
        if (state.activeMissionIndex !== -1) state.selectMission(-1);
        state.setAcademyMode(true);
      } else if (hash === '#/sandbox' || hash === '#/sim' || hash === '#/sim/') {
        if (state.currentMode !== 'flight') state.setMode('flight');
        if (state.activeMissionIndex !== -1) state.selectMission(-1);
        state.setAcademyMode(false);
      } else if (hash.startsWith('#/sim/mission/')) {
        const indexStr = hash.replace('#/sim/mission/', '');
        const index = parseInt(indexStr, 10);
        if (!isNaN(index)) {
          if (state.currentMode !== 'flight') state.setMode('flight');
          if (state.activeMissionIndex !== index) state.selectMission(index);
          state.setAcademyMode(true);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initialize hash routing state on page load
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Register / Unregister Keyboard Input System for Simulator Mode
  useEffect(() => {
    if (currentMode === 'flight' && orchestratorRef.current) {
      orchestratorRef.current.init();
      
      // Pull stick inputs for visual overlay at 20Hz
      const interval = setInterval(() => {
        if (orchestratorRef.current) {
          const sticks = orchestratorRef.current.input.getStickState();
          setStickState(sticks);
          setOrchestratorState({
            hasTakenOff: orchestratorRef.current.getHasTakenOff(),
            isLandingActive: orchestratorRef.current.getIsLandingActive(),
            isFlipArmed: orchestratorRef.current.getIsFlipArmed(),
            isFlipping: orchestratorRef.current.getIsFlipping()
          });
        }
      }, 50);
      
      return () => {
        clearInterval(interval);
        if (orchestratorRef.current) {
          orchestratorRef.current.destroy();
        }
      };
    }
  }, [currentMode]);

  useEffect(() => {
    if (currentMode !== 'flight' || !orchestratorRef.current) {
      bridgeClientRef.current?.stop();
      bridgeClientRef.current = null;
      return;
    }

    bridgeClientRef.current = new PlutoBridgeClient(orchestratorRef.current);
    bridgeClientRef.current.start();

    return () => {
      bridgeClientRef.current?.stop();
      bridgeClientRef.current = null;
    };
  }, [currentMode]);

  // Immersive mode (hide navbar/sidebar layout) during flight, restore after landing/disarm
  useEffect(() => {
    if (currentMode === 'flight') {
      const isFlying = orchestratorState.hasTakenOff;
      const store = useDroneStore.getState();
      if (isFlying && !store.immersiveMode) {
        store.setImmersiveMode(true);
      } else if (!isFlying && store.immersiveMode) {
        store.setImmersiveMode(false);
      }
    }
  }, [currentMode, orchestratorState.hasTakenOff]);

  // Synchronize App Mode & Environment with Active Training Module
  useEffect(() => {
    if (activeMissionIndex >= 0) {
      if (activeMissionIndex <= 3) {
        if (currentMode !== 'explore') {
          setMode('explore');
        }
      } else {
        if (currentMode !== 'flight') {
          setMode('flight');
        }
        
        // Sync environment to match mission theme
        const envs: Record<number, any> = {
          4: 'room',        // Module 5
          5: 'lab',         // Module 6
          6: 'lab',         // Module 7
          7: 'room',        // Module 8
          8: 'lab',         // Module 9
          9: 'lab',         // Module 10
          10: 'lab'         // Module 11
        };
        const targetEnv = envs[activeMissionIndex];
        if (targetEnv) {
          useDroneStore.getState().setFlightEnvironment(targetEnv);
        }
      }
    }
  }, [activeMissionIndex, currentMode, setMode]);

  // Reset all camera/scene attributes to default
  const handleResetAll = () => {
    selectComponent(null);
    setCameraView('orbit');
    stopAllMotors();
    if (isExploded) toggleExploded();
    if (isolationMode) toggleIsolation();
    if (showAnatomyExploded) toggleAnatomyExploded();
    setShowRotationDirections(false);
    if (immersiveMode) toggleImmersiveMode();
    if (vrMode) toggleVrMode();
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    if (leftControlsRef.current) {
      leftControlsRef.current.reset();
    }
  };

  const handleResetSimulator = () => {
    if (orchestratorRef.current) {
      if (orchestratorRef.current.getIsCrashTumbling?.()) {
        orchestratorRef.current.crashSequenceActive = false;
      }
      // Clear failure flags first so keyboard input is unblocked
      useDroneStore.getState().setDroneInitFailed(false);
      useDroneStore.getState().setModelLoadStatus('loading');
      orchestratorRef.current.reset();
      const missionIdx = useDroneStore.getState().activeMissionIndex;
      selectMission(missionIdx); // restarts mission
    }
  };

  const handleCalibrateSensors = () => {
    if (orchestratorRef.current) {
      orchestratorRef.current.calibrate(); // force-calibrate sensors immediately
    }
  };

  const handleToggleAltHold = (active: boolean) => {
    if (orchestratorRef.current) {
      orchestratorRef.current.setAltitudeHold(active);
    }
  };

  const handleModeSwitch = (targetMode: any) => {
    if (activeMissionIndex >= 0 && missionStatus !== 'passed') {
      addNotification('Please complete or abort the current lesson before changing modes.', 'warning');
      return;
    }
    setMode(targetMode);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#F8FAFC] dark:bg-[#070a13] font-sans antialiased text-slate-800 dark:text-white select-none flex app-shell" style={currentMode === 'flight' ? undefined : { paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
      {isARActive && (
        <Suspense fallback={null}>
          <ARSimulator />
        </Suspense>
      )}
      <LearningWorkflow />
      
      {/* 1. IMMERSIVE GLB LOADING PROGRESS BAR */}
      <AnimatePresence>
        {isLoading && currentMode === 'flight' && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#F8FAFC] dark:bg-[#070a13] z-50 flex flex-col items-center justify-center p-6 select-none app-shell"
          >
            <div className="flex flex-col items-center text-center space-y-6 max-w-md w-full px-4">
              {/* Floating Robot Drone */}
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center animate-float-drone">
                {/* Drone Arms & Motors */}
                <svg viewBox="0 0 200 200" className="w-full h-full absolute top-0 left-0 text-slate-300 dark:text-slate-700 pointer-events-none">
                  {/* Arms */}
                  <line x1="100" y1="100" x2="40" y2="40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  <line x1="100" y1="100" x2="160" y2="40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  <line x1="100" y1="100" x2="40" y2="160" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  <line x1="100" y1="100" x2="160" y2="160" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Motors (Dark grey/black circles) */}
                  <circle cx="40" cy="40" r="10" fill="#1e293b" />
                  <circle cx="160" cy="40" r="10" fill="#1e293b" />
                  <circle cx="40" cy="160" r="10" fill="#1e293b" />
                  <circle cx="160" cy="160" r="10" fill="#1e293b" />
                </svg>
                
                {/* Propeller Blur Rings & Spins (CSS Animated Overlay) */}
                {/* Top Left Propeller */}
                <div className="absolute top-[25px] left-[25px] w-[30px] h-[30px] border border-slate-300/30 dark:border-slate-600/30 rounded-full animate-spin-fast flex items-center justify-center">
                  <div className="w-[32px] h-[2px] bg-slate-400/40 dark:bg-slate-500/40" />
                </div>
                {/* Top Right Propeller */}
                <div className="absolute top-[25px] right-[25px] w-[30px] h-[30px] border border-slate-300/30 dark:border-slate-600/30 rounded-full animate-spin-fast-reverse flex items-center justify-center">
                  <div className="w-[32px] h-[2px] bg-slate-400/40 dark:bg-slate-500/40" />
                </div>
                {/* Bottom Left Propeller */}
                <div className="absolute bottom-[25px] left-[25px] w-[30px] h-[30px] border border-slate-300/30 dark:border-slate-600/30 rounded-full animate-spin-fast-reverse flex items-center justify-center">
                  <div className="w-[32px] h-[2px] bg-slate-400/40 dark:bg-slate-500/40" />
                </div>
                {/* Bottom Right Propeller */}
                <div className="absolute bottom-[25px] right-[25px] w-[30px] h-[30px] border border-slate-300/30 dark:border-slate-600/30 rounded-full animate-spin-fast flex items-center justify-center">
                  <div className="w-[32px] h-[2px] bg-slate-400/40 dark:bg-slate-500/40" />
                </div>

                {/* Blue Fuselage Body with face and box shadow glow */}
                <div className="absolute w-20 h-20 bg-blue-500 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_35px_rgba(59,130,246,0.65)] border border-blue-400/30">
                  {/* Eyes (Rounded capsules) */}
                  <div className="flex justify-between w-10 mb-2.5">
                    <div className="w-3.5 h-3.5 bg-white rounded-full" />
                    <div className="w-3.5 h-3.5 bg-white rounded-full" />
                  </div>
                  {/* Smile */}
                  <svg width="22" height="10" viewBox="0 0 24 12" fill="none">
                    <path d="M 2,2 C 2,2 6,10 12,10 C 18,10 22,2 22,2" stroke="white" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Text and Loader Dots */}
              <div className="space-y-4 pt-4">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-805 dark:text-slate-100 font-sans">
                  Preparing for Takeoff
                </h2>
                
                {/* Bouncing Dot Loader */}
                <div className="flex justify-center items-center gap-1.5 h-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-dot-1" />
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-dot-2" />
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-dot-3" />
                </div>
              </div>

              {/* Micro-Progress Telemetry Indicator */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  Loading Labs: {Math.round(progress)}%
                </span>
                {/* Small linear progress bar */}
                <div className="w-32 bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden mx-auto">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* 2. LEFT SIDEBAR: Conditional rendering depending on Avionics Lab vs Flight Simulator */}
      <AnimatePresence mode="wait">
        {isAcademyMode && (currentMode === 'flight' || activeMissionIndex >= 0) ? (
          // A. PILOT TRAINING MISSION LIST (FLIGHT MODE)
          <TrainingMissionSystem 
            key="flight-sidebar"
            orchestrator={orchestratorRef.current!} 
            onCheckpointsUpdated={handleCheckpointsUpdated}
          />
        ) : (
          // B. PRE-FLIGHT AVIONICS DIAGNOSTICS PANELS (INSPECTION MODE)
          currentMode !== 'home' && currentMode !== 'flight' && !immersiveMode && (
            <>
            {/* ── Mobile Floating Anatomy Menu FAB ───────────────────── */}
            {isMobile && !mobileAnatomyOpen && (
              <motion.button
                key="anatomy-fab"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setMobileAnatomyOpen(true)}
                className="anatomy-fab"
                title="Open Anatomy Controls"
              >
                <Menu className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-wider leading-none">Controls</span>
              </motion.button>
            )}

            {/* ── Mobile Backdrop Overlay ─────────────────────────────── */}
            {isMobile && mobileAnatomyOpen && (
              <motion.div
                key="anatomy-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileAnatomyOpen(false)}
                className="anatomy-backdrop"
              />
            )}

            <motion.div
              key="explore-sidebar"
              initial={isMobile ? { y: '100%', opacity: 1 } : { width: 0, opacity: 0 }}
              animate={isMobile
                ? { y: mobileAnatomyOpen ? '0%' : '100%', opacity: 1 }
                : { width: 320, opacity: 1 }
              }
              exit={isMobile ? { y: '100%', opacity: 1 } : { width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              style={isMobile ? undefined : { overflow: 'hidden' }}
              className={isMobile
                ? 'anatomy-mobile-sheet'
                : 'h-full pt-16 bg-white/95 dark:bg-slate-950/80 backdrop-blur-md border-r border-slate-200 dark:border-slate-800/80 z-10 flex flex-col justify-between shrink-0'
              }
            >
              {/* Mobile sheet drag handle + close */}
              {isMobile && (
                <div className="anatomy-sheet-header">
                  <div className="anatomy-sheet-handle" />
                  <div className="flex items-center justify-between px-4 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Anatomy Controls</span>
                    <button
                      onClick={() => setMobileAnatomyOpen(false)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              <div className={isMobile
                ? 'anatomy-sheet-body'
                : 'w-[320px] p-5 h-full flex flex-col justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800'
              }>
                <div className="space-y-4">
                  {/* Mode Switcher Tabs */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                      <button
                        onClick={() => setMode('explore')}
                        className={`flex-1 py-1.5 rounded transition ${
                          currentMode === 'explore'
                            ? 'bg-blue-600 text-white shadow shadow-blue-500/10'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        Explorer
                      </button>
                      <button
                        onClick={() => startLearning()}
                        className={`flex-1 py-1.5 rounded transition ${
                          currentMode === 'learning'
                            ? 'bg-amber-600 text-white shadow shadow-amber-500/10'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        Training
                      </button>
                    </div>
                    <button 
                      onClick={handleResetAll}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition shrink-0"
                      title="Reset Workspace"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* SECTION A: Camera Presets */}
                  <div className="space-y-2.5">
                    <button
                      onClick={() => isMobile && toggleAccordion('camera')}
                      className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      Camera Angles
                      {isMobile && (
                        <span className="ml-auto">
                          {openAccordion === 'camera' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                      )}
                    </button>
                    {(!isMobile || openAccordion === 'camera') && (
                    <div className="anatomy-camera-grid text-[11px] font-bold uppercase tracking-wider">
                      <button
                        onClick={() => { setCameraView('orbit'); if (isMobile) setMobileAnatomyOpen(false); }}
                        className={`anatomy-camera-orbit py-2 rounded-lg border transition ${
                          cameraView === 'orbit' ? btnActiveStyle : btnInactiveStyle
                        }`}
                      >
                        Free Orbit Look
                      </button>
                      <button
                        onClick={() => { setCameraView('top'); if (isMobile) setMobileAnatomyOpen(false); }}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'top' ? btnActiveStyle : btnInactiveStyle
                        }`}
                      >
                        Top View
                      </button>
                      <button
                        onClick={() => { setCameraView('bottom'); if (isMobile) setMobileAnatomyOpen(false); }}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'bottom' ? btnActiveStyle : btnInactiveStyle
                        }`}
                      >
                        Bottom View
                      </button>
                      <button
                        onClick={() => { setCameraView('left'); if (isMobile) setMobileAnatomyOpen(false); }}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'left' ? btnActiveStyle : btnInactiveStyle
                        }`}
                      >
                        Left Side
                      </button>
                      <button
                        onClick={() => { setCameraView('right'); if (isMobile) setMobileAnatomyOpen(false); }}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'right' ? btnActiveStyle : btnInactiveStyle
                        }`}
                      >
                        Right Side
                      </button>
                      <button
                        onClick={() => { setCameraView('front'); if (isMobile) setMobileAnatomyOpen(false); }}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'front' ? btnActiveStyle : btnInactiveStyle
                        }`}
                      >
                        Front Nose
                      </button>
                      <button
                        onClick={() => { setCameraView('back'); if (isMobile) setMobileAnatomyOpen(false); }}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'back' ? btnActiveStyle : btnInactiveStyle
                        }`}
                      >
                        Back Tail
                      </button>
                    </div>
                    )}
                    {/* Auto Rotate Toggle */}
                    <button
                      onClick={toggleAutoRotate}
                      className={`w-full py-2 border rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                        autoRotate
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.08)]'
                          : btnInactiveStyle
                      }`}
                    >
                      Auto Rotate View: {autoRotate ? 'ON' : 'OFF'}
                    </button>
 
                    {/* Environment & VR Views */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                      <button
                        onClick={() => isMobile && toggleAccordion('immersive')}
                        className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        Immersive Modes
                        {isMobile && (
                          <span className="ml-auto">
                            {openAccordion === 'immersive' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </button>
                      {(!isMobile || openAccordion === 'immersive') && (
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                        <button
                          onClick={toggleImmersiveMode}
                          className={`py-2 px-1 rounded-lg border transition flex flex-col items-center justify-center gap-0.5 ${
                            immersiveMode 
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400 shadow-[0_4px_12px_rgba(59,130,246,0.08)]' 
                              : btnInactiveStyle
                          }`}
                          title="Cinematic 360° Free Look (Hides HUD)"
                        >
                          <span>Cinematic 360°</span>
                          <span className="text-[8px] opacity-60 font-medium">Free Look</span>
                        </button>
                        <button
                          onClick={toggleVrMode}
                          className={`py-2 px-1 rounded-lg border transition flex flex-col items-center justify-center gap-0.5 ${
                            vrMode 
                              ? 'bg-purple-50 dark:bg-purple-950/35 border-purple-500 text-purple-650 dark:text-purple-400 shadow-[0_4px_12px_rgba(168,85,247,0.08)]' 
                              : btnInactiveStyle
                          }`}
                          title="Stereoscopic VR Split-screen Mode"
                        >
                          <span>Stereoscopic VR</span>
                          <span className="text-[8px] opacity-60 font-medium">SBS Split</span>
                        </button>
                      </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION B: Motor Demonstrator Systems */}
                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => isMobile && toggleAccordion('motor')}
                        className="flex-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"
                      >
                        <Power className="w-3.5 h-3.5 text-blue-500" />
                        Motor Diagnostic Test
                        {isMobile && (
                          <span className="ml-auto mr-2">
                            {openAccordion === 'motor' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setShowRotationDirections(!showRotationDirections)}
                        className={`px-2 py-0.5 rounded border text-[9px] font-bold transition ${
                          showRotationDirections
                            ? 'bg-orange-50 border-orange-500 text-orange-600 dark:bg-orange-950/30 dark:border-orange-500 dark:text-orange-400'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        Directions
                      </button>
                    </div>
                    
                    {(!isMobile || openAccordion === 'motor') && (
                    <div className="space-y-1.5">
                      {(['motor1', 'motor2', 'motor3', 'motor4'] as const).map((id, index) => {
                        const active = activeMotors[id];
                        const rpm = motorRPMs[id];
                        const plutoLabels = [
                          'M4 (FL CW)',
                          'M2 (FR CCW)',
                          'M1 (RR CW)',
                          'M3 (RL CCW)'
                        ];
                        
                        return (
                           <div key={id} className="anatomy-motor-row">
                            <button
                              onClick={() => toggleMotor(id)}
                              disabled={isTestingSequence}
                              className={`flex-1 flex justify-between items-center anatomy-motor-btn rounded-lg border text-xs font-bold uppercase tracking-wider transition ${
                                activeTestMotor === id
                                  ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-[0_4px_12px_rgba(59,130,246,0.15)] dark:bg-blue-900/40 dark:border-blue-400 dark:text-blue-300'
                                  : active 
                                    ? 'bg-orange-50 border-orange-500 text-orange-600 shadow-[0_4px_12px_rgba(249,115,22,0.08)] dark:bg-orange-950/30 dark:border-orange-500 dark:text-orange-400' 
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                              } ${isTestingSequence && activeTestMotor !== id ? 'opacity-50' : 'opacity-100'}`}
                            >
                              <span>{plutoLabels[index]}</span>
                              <span className="text-[9px] font-mono opacity-80">{activeTestMotor === id ? 'TESTING' : active ? 'RUNNING' : 'STOPPED'}</span>
                            </button>
                            {active && (
                              <div className="anatomy-motor-rpm">
                                {rpm} RPM
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}

                    {/* Sticky bottom action buttons on mobile */}
                    <div className={isMobile ? 'anatomy-sticky-actions' : 'grid grid-cols-2 gap-2 pt-1.5'}>
                      <button
                        onClick={testAllMotors}
                        disabled={isTestingSequence}
                        className={`py-2.5 text-white text-xs font-bold uppercase rounded-lg transition ${
                          isTestingSequence ? 'bg-blue-400 cursor-not-allowed flex items-center justify-center gap-2' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isTestingSequence ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Testing...
                          </>
                        ) : 'Test All'}
                      </button>
                      <button
                        onClick={stopAllMotors}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 text-xs font-bold uppercase rounded-lg transition"
                      >
                        Stop All
                      </button>
                    </div>
                  </div>

                  {/* SECTION C: Component Legend */}
                  <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Component Registry
                    </h3>
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                      {Object.values(droneComponents).map((comp) => {
                        const isHovered = hoveredComponent === comp.id;
                        const isSelected = selectedComponent === comp.id;
                        
                        return (
                          <button
                            key={comp.id}
                            onMouseEnter={() => hoverComponent(comp.id)}
                            onMouseLeave={() => hoverComponent(null)}
                            onClick={() => selectComponent(isSelected ? null : comp.id)}
                            className={`w-full text-left px-3 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wider transition-all flex items-center justify-between border ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-600 font-bold dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-400'
                                : isHovered
                                  ? 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200'
                                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                          >
                            <span>{comp.name}</span>
                            <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-90 text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Brand Credit */}
                <div className="text-[8px] font-mono text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-200 dark:border-slate-800">
                  Telemetry Link Status: Secure
                </div>
              </div>
            </motion.div>
            </>
          )
        )}
      </AnimatePresence>

      {/* 3. CENTER: 3D Scene Viewport (Conditional between Lab inspection vs Pilot simulator) */}
      <div className={`flex-1 h-full relative z-0 flex ${isDark ? 'bg-[#070a13]' : 'bg-[#F8FAFC]'}`}>
        <Suspense fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070a13] font-mono text-xs text-slate-450 gap-4 w-full h-full">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" />
            <span>CONNECTING TELEMETRY LINK...</span>
          </div>
        }>
          {currentMode === 'home' ? (
            null
          ) : currentMode === 'flight' ? (
            // PILOT SIMULATOR FLIGHT VIEWPORT
            <FlightScene 
              orchestrator={orchestratorRef.current!} 
              activeCheckpoints={activeCheckpoints}
              onTelemetryFrame={handleTelemetryFrame}
              stickState={stickState}
            />
          ) : (
            // CORE AVIONICS EXPLORER VIEWPORT (including split-screen VR SBS)
            vrMode ? (
              <>
                <div className="w-1/2 h-full relative border-r border-slate-950">
                  <Scene controlsRef={leftControlsRef} vrEye="left" />
                </div>
                <div className="w-1/2 h-full relative">
                  <Scene controlsRef={rightControlsRef} vrEye="right" />
                </div>
              </>
            ) : (
              <Scene controlsRef={controlsRef} />
            )
          )}
        </Suspense>

        {/* BOTTOM CONTROLS: Anatomy Exploded and isolate view controls (Only visible in explorer mode) */}
        <AnimatePresence>
          {currentMode !== 'home' && currentMode !== 'flight' && !immersiveMode && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="absolute bottom-6 left-6 pointer-events-auto z-10 flex gap-3 max-md:bottom-[max(1.5rem,var(--sab,1.5rem))] max-md:left-[max(1rem,var(--sal,1rem))] max-md:right-[max(1rem,var(--sar,1rem))] max-md:flex-col max-md:items-stretch"
            >
              {/* ── ANATOMY EXPLODED button ─────────────────────────── */}
              <button
                onClick={toggleAnatomyExploded}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border shadow-sm relative overflow-hidden max-md:justify-center max-md:py-3 ${
                  showAnatomyExploded
                    ? 'bg-violet-50 border-violet-500 text-violet-700 shadow-[0_0_18px_rgba(139,92,246,0.25)] dark:bg-violet-950/40 dark:border-violet-500 dark:text-violet-300'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-violet-700 hover:border-violet-300 dark:bg-slate-950/80 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:border-violet-700'
                }`}
                title="Full anatomy exploded view with detailed engineering labels (Pluto Blast View)"
              >
                {showAnatomyExploded && (
                  <span className="absolute inset-0 pointer-events-none">
                    <span className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent animate-pulse" />
                    <span className="absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent animate-pulse" />
                  </span>
                )}
                <ScanLine className="w-4 h-4" />
                <span className="max-md:hidden">Anatomy Exploded</span>
              </button>

              <button
                onClick={toggleIsolation}
                disabled={!selectedComponent}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border shadow-sm max-md:justify-center max-md:py-3 ${
                  !selectedComponent
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600'
                    : isolationMode
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-950/80 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="max-md:hidden">Isolate Component</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>


        {currentMode === 'flight' && !isARActive && !isLoading && (
          <InteractiveTutorial 
            telemetry={telemetry} 
            stickState={stickState} 
            orchestrator={orchestratorRef.current!}
            onCheckpointsUpdated={handleCheckpointsUpdated}
          />
        )}
        {currentMode === 'flight' && !isARActive && !isLoading && (
          <FlightControlsPanel />
        )}
      </div>      {/* 4. RIGHT SIDEBAR: Avionics Info Inspector (Only in Avionics Lab mode) */}
      <AnimatePresence>
        {currentMode !== 'flight' && selectedData && !immersiveMode && (
          <>
            {isMobile && (
              <motion.div
                key="inspector-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => selectComponent(null)}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] pointer-events-auto"
              />
            )}
            <motion.div
              key="inspector-sidebar"
              initial={isMobile ? { x: '100%', opacity: 1 } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0, opacity: 1 } : { width: 380, opacity: 1 }}
              exit={isMobile ? { x: '100%', opacity: 1 } : { width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              style={isMobile ? undefined : { overflow: 'hidden' }}
              className={isMobile 
                ? "fixed right-0 top-0 h-full w-full max-w-[92vw] sm:max-w-[380px] bg-white/95 dark:bg-slate-950/95 pt-16 border-l border-slate-200 dark:border-slate-800 z-50 flex flex-col justify-between shadow-2xl pointer-events-auto" 
                : "h-full pt-16 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 z-10 flex flex-col justify-between shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]"
              }
            >
              <div className="w-full sm:w-[380px] p-4 sm:p-6 h-full flex flex-col justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                
                {/* Header */}
                <div className="pb-4 border-b border-slate-100">
                  <span className="text-[9px] text-blue-600 font-mono tracking-widest uppercase">Hardware Profile</span>
                  <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider mt-1">{selectedData.name}</h2>
                </div>

                {/* STEM Educational Overlay: Inject CW/CCW physical principles when a propeller is selected */}
                {isPropSelected && (() => {
                  const associatedMotors = selectedComponent === 'propellerA' ? ['motor1', 'motor4'] as const : ['motor2', 'motor3'] as const;
                  const isSpinning = activeMotors[associatedMotors[0]] || activeMotors[associatedMotors[1]];
                  
                  const handleToggleProp = () => {
                    associatedMotors.forEach(m => {
                      toggleMotor(m);
                    });
                  };

                  return (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg space-y-3 shadow-sm">
                      <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                        STEM Insights: Aerodynamic Balance
                      </h4>
                      <div className="text-[11px] text-slate-600 leading-relaxed font-light space-y-1.5">
                        <p>
                          <strong>Rotation Direction:</strong> {selectedComponent === 'propellerA' ? 'Clockwise (CW)' : 'Counter-Clockwise (CCW)'}
                        </p>
                        <p>
                          <strong>Torque Balancing:</strong> A quadcopter requires adjacent propellers to rotate in opposite directions. As the CW motors (M4/M1) spin their blades CW, they exert an opposite CCW reaction torque on the chassis. By spinning the CCW motors (M2/M3) CCW, their reaction torque balances out, preventing the drone from spinning uncontrollably.
                        </p>
                        <p>
                          <strong>Yaw Authority:</strong> To turn left or right (yaw), the flight controller speeds up the CW pair while slowing down the CCW pair. The net imbalance in reactive torque rotates the drone without changing overall altitude.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-blue-100">
                        <button
                          onClick={handleToggleProp}
                          className={`w-full py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            isSpinning
                              ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>
                            {isSpinning
                              ? `Stop Propellers (${motorRPMs[associatedMotors[0]] || motorRPMs[associatedMotors[1]]} RPM)`
                              : `Spin Propeller (${selectedComponent === 'propellerA' ? 'CW' : 'CCW'})`}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* STEM Educational Overlay: Inject Motor flight contribution details when a motor is selected */}
                {isMotorSelected && (() => {
                  const motorId = selectedComponent as keyof typeof activeMotors;
                  const active = activeMotors[motorId];
                  const rpm = motorRPMs[motorId];
                  return (
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg space-y-3 shadow-sm">
                      <h4 className="text-[10px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-orange-600" />
                        STEM Insights: Thrust & Lift
                      </h4>
                      <div className="text-[11px] text-slate-600 leading-relaxed font-light space-y-1.5">
                        <p>
                          <strong>Motor-Propeller Relationship:</strong> Brushless motors convert battery current into rapid rotational torque. The propeller behaves as an airfoil: as it spins, it shapes air velocity, creating a low-pressure zone above the blade and pushing air downwards.
                        </p>
                        <p>
                          <strong>Flight Stability:</strong> Precise flight control is achieved by micro-modifying individual motor RPMs:
                        </p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li><strong>Roll:</strong> Speed up left motors, slow down right motors.</li>
                          <li><strong>Pitch:</strong> Speed up rear motors, slow down front motors.</li>
                          <li><strong>Throttle:</strong> Speed up or slow down all 4 motors equally.</li>
                        </ul>
                      </div>

                      <div className="pt-2 border-t border-orange-100">
                        <button
                          onClick={() => toggleMotor(motorId)}
                          className={`w-full py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            active
                              ? 'bg-orange-600 border-orange-500 text-white hover:bg-orange-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>
                            {active
                              ? `Stop Motor (${rpm} RPM)`
                              : 'Spin Test Motor'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Function */}
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    Primary Function
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed font-light">{selectedData.functionName}</p>
                </div>

                {/* Working Principle */}
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                    Working Principle
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed font-light">{selectedData.workingPrinciple}</p>
                </div>

                {/* Role During Flight */}
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                    Flight Operations Role
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed font-light">{selectedData.flightRole}</p>
                </div>

                {/* Safety */}
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg shadow-sm">
                  <h3 className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Safety Warnings
                  </h3>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-light">{selectedData.safetyNotes}</p>
                </div>

                {/* Maintenance */}
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg shadow-sm">
                  <h3 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <Wrench className="w-3.5 h-3.5" />
                    Maintenance Notes
                  </h3>
                  <p className="text-[11px] text-emerald-800 leading-relaxed font-light">{selectedData.maintenanceNotes}</p>
                </div>
              </div>

              {/* Footer Close Panel */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => selectComponent(null)}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold uppercase tracking-widest border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 transition shadow-sm"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. IMMERSIVE / VR HUD OVERLAY (Only for Avionics Lab free look) */}
      <AnimatePresence>
        {currentMode !== 'flight' && immersiveMode && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-4 bg-slate-950/90 border border-slate-800/85 px-6 py-3 rounded-full backdrop-blur-md shadow-2xl"
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${vrMode ? 'bg-purple-500 animate-pulse' : 'bg-blue-500 animate-pulse'}`} />
              <span className="text-xs font-mono tracking-widest text-slate-300 uppercase">
                {vrMode ? 'STEREOSCOPIC VR LAB ACTIVE' : 'CINEMATIC 360° FREE LOOK ACTIVE'}
              </span>
            </div>
            
            <div className="h-4 w-px bg-slate-800" />
            
            <div className="flex items-center gap-2">
              {vrMode && (
                <button
                  onClick={toggleVrMode}
                  className="px-3.5 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-400 text-[10px] font-bold uppercase tracking-wider hover:bg-purple-900/30 transition-all duration-300"
                >
                  Exit VR
                </button>
              )}
              <button
                onClick={() => {
                  if (vrMode) toggleVrMode();
                  if (immersiveMode) toggleImmersiveMode();
                }}
                className="px-3.5 py-1.5 rounded-full bg-red-950/45 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider hover:bg-red-950 hover:text-red-300 transition-all duration-300"
              >
                Exit Free Look
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. MODE SELECTION HEADER BAR (Visible in normal panels) */}
      <AnimatePresence>
        {!immersiveMode && currentMode !== 'home' && currentMode !== 'flight' && (
          <motion.header
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            className={`absolute top-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between pointer-events-auto z-20 shadow-sm ${
              (currentMode as string) === 'flight' ? 'hidden md:flex' : ''
            }`}
          >
            {/* Left: Brand logo & Navigation Back */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (activeMissionIndex >= 0 && missionStatus !== 'passed') {
                    addNotification('Please complete or abort the current lesson first.', 'warning');
                    return;
                  }
                  setMode('home');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
              >
                ← Menu
              </button>
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <img 
                  src="/drona_logo.png" 
                  alt="Drona Aviation" 
                  className="h-7 sm:h-9 w-auto object-contain dark:invert select-none cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => {
                    if (activeMissionIndex >= 0 && missionStatus !== 'passed') {
                      addNotification('Please complete or abort the current lesson first.', 'warning');
                      return;
                    }
                    setMode('home');
                  }}
                />
                <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700 font-light">//</span>
                <span className="hidden sm:inline-block text-slate-800 dark:text-slate-200 text-[10px] font-extrabold uppercase tracking-widest">
                  {(currentMode as string) === 'flight' ? (isAcademyMode ? 'PILOT ACADEMY' : 'CLOSED SIMULATOR') : 'ANATOMY LAB'}
                </span>
              </div>
            </div>

            {/* Center: Mode switcher ribbon integrated nicely */}
            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex gap-1 text-[9px] font-bold uppercase tracking-wider">
              <button
                onClick={() => handleModeSwitch('explore')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                  currentMode === 'explore' || currentMode === 'learning' || currentMode === 'inspect'
                    ? 'bg-blue-600 text-white shadow shadow-blue-500/10'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                } ${activeMissionIndex >= 0 && missionStatus !== 'passed' ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Anatomy<span className="hidden sm:inline"> Lab</span></span>
              </button>
              <button
                onClick={() => handleModeSwitch('flight')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                  (currentMode as string) === 'flight'
                    ? 'bg-orange-600 text-white shadow shadow-orange-500/10'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                } ${activeMissionIndex >= 0 && missionStatus !== 'passed' ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Flight<span className="hidden sm:inline"> Sim</span></span>
              </button>
            </div>

            {/* Right side status indicators */}
            <div className="hidden sm:flex items-center gap-4 text-[9px] font-mono text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="uppercase tracking-widest text-[8px] font-bold text-slate-500 dark:text-slate-400">Telemetry: Link Active</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-slate-400 dark:text-slate-700">//</span>
                <span className="uppercase tracking-widest text-[8px] font-bold text-slate-400 dark:text-slate-500">SYS_OK</span>
              </div>

            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* 7. HOME SCREEN MAIN NAVIGATION HUB */}
      <AnimatePresence>
        {currentMode === 'home' && <IntroOverlay />}
      </AnimatePresence>

      {/* 8. VIRTUAL JOYSTICKS FOR MOBILE DEVICES */}
      {!isLoading && <VirtualJoysticks orchestrator={orchestratorRef.current!} />}

      {/* PLUTO CONTROLLER MOBILE MENU (Closed Simulation only, mobile only) */}
      {currentMode === 'flight' && !isARActive && !isLoading && (
        <ClosedSimMobileMenu
          onReset={handleResetSimulator}
          onCalibrate={handleCalibrateSensors}
          onToggleAltHold={handleToggleAltHold}
          stickState={stickState}
          onArm={() => orchestratorRef.current?.arm()}
          onDisarm={() => orchestratorRef.current?.disarm()}
          hasTakenOff={orchestratorState.hasTakenOff}
          isLandingActive={orchestratorState.isLandingActive}
          isFlipArmed={orchestratorState.isFlipArmed}
          isFlipping={orchestratorState.isFlipping}
          onTakeoff={() => orchestratorRef.current?.triggerAutoTakeoff()}
          onLand={() => orchestratorRef.current?.triggerLanding()}
          onFlip={() => orchestratorRef.current?.triggerDirectForwardFlip()}
          orchestrator={orchestratorRef.current!}
        />
      )}

      {/* Crash recovery overlay at root level so it covers all joysticks/HUD elements */}
      {currentMode === 'flight' && !isARActive && !isLoading && warnings.includes('CRASH DETECTED') && (
        <CrashRecoveryOverlay onRebuild={handleResetSimulator} />
      )}

      {/* 9. PORTRAIT ORIENTATION LOCK OVERLAY FOR MOBILE/TABLET FLIGHT SIMULATOR */}
      <AnimatePresence>
        {currentMode === 'flight' && !isARActive && isPortraitMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="flex flex-col items-center max-w-sm space-y-6">
              {/* Rotating Device Icon Visual */}
              <div className="relative w-24 h-24 flex items-center justify-center bg-blue-500/10 rounded-full border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <svg
                  viewBox="0 0 100 100"
                  className="w-16 h-16 text-blue-500 animate-device-rotate"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="30" y="10" width="40" height="80" rx="6" />
                  <line x1="45" y1="18" x2="55" y2="18" />
                  <circle cx="50" cy="80" r="3" />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-extrabold tracking-wider uppercase text-white">
                  Rotate Device
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The pilot flight simulator requires landscape orientation. Please rotate your device to begin.
                </p>
                <p className="text-[11px] text-amber-400 font-semibold mt-4">
                  Note: If rotating physically doesn't unlock the screen, please check if "Auto-Rotate" or "Portrait Orientation Lock" is disabled/enabled in your device's system settings.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative top-edge accent line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none z-10" />
    </div>
  );
}

export default App;
