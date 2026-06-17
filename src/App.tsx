import { useRef, useEffect, useState } from 'react';
import { Scene } from './components/Scene';
import { FlightScene } from './components/FlightScene';
import { TelemetryDashboard } from './components/UI/TelemetryDashboard';
import { TrainingMissionSystem } from './components/UI/TrainingMissionSystem';
import { useDroneStore } from './store/useDroneStore';
import { IntroOverlay } from './components/UI/IntroOverlay';
import { ARSimulator } from './components/UI/ARSimulator';
import { droneComponents } from './data/droneComponents';
import { SimulatorOrchestrator } from './utils/drone/SimulatorOrchestrator';
import { Checkpoint } from './utils/drone/types';
import { 
  Layers, Info, ShieldAlert, Wrench, Activity, ChevronRight, 
  Eye, Cpu, Power, CheckCircle, RefreshCcw, Gamepad2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@react-three/drei';

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

  // Active checkpoints to render in the environment
  const [activeCheckpoints, setActiveCheckpoints] = useState<Checkpoint[]>([]);

  // State of keyboard sticks for UI visualizer
  const [stickState, setStickState] = useState({ throttle: 0, yaw: 0, pitch: 0, roll: 0 });

  // Zustand Store mappings
  const currentMode = useDroneStore((state) => state.currentMode);
  const hoveredComponent = useDroneStore((state) => state.hoveredComponent);
  const selectedComponent = useDroneStore((state) => state.selectedComponent);
  const isExploded = useDroneStore((state) => state.isExploded);
  const isolationMode = useDroneStore((state) => state.isolationMode);
  const activeMissionIndex = useDroneStore((state) => state.activeMissionIndex);
  
  const cameraView = useDroneStore((state) => state.cameraView);
  const autoRotate = useDroneStore((state) => state.autoRotate);
  const immersiveMode = useDroneStore((state) => state.immersiveMode);
  const vrMode = useDroneStore((state) => state.vrMode);
  const activeMotors = useDroneStore((state) => state.activeMotors);
  const motorRPMs = useDroneStore((state) => state.motorRPMs);
  const showRotationDirections = useDroneStore((state) => state.showRotationDirections);

  const hoverComponent = useDroneStore((state) => state.hoverComponent);
  const selectComponent = useDroneStore((state) => state.selectComponent);
  const toggleExploded = useDroneStore((state) => state.toggleExploded);
  const toggleIsolation = useDroneStore((state) => state.toggleIsolation);
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

  const selectedData = selectedComponent ? droneComponents[selectedComponent] : null;

  // Determine if a motor or propeller is selected to inject educational STEM highlights
  const isPropSelected = selectedComponent === 'propellerA' || selectedComponent === 'propellerB';
  const isMotorSelected = selectedComponent && selectedComponent.includes('motor');

  // Register / Unregister Keyboard Input System for Simulator Mode
  useEffect(() => {
    if (currentMode === 'flight' && orchestratorRef.current) {
      orchestratorRef.current.init();
      
      // Pull stick inputs for visual overlay at 20Hz
      const interval = setInterval(() => {
        if (orchestratorRef.current) {
          const sticks = orchestratorRef.current.input.getStickState();
          setStickState(sticks);
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
          7: 'classroom',   // Module 8
          8: 'field',       // Module 9
          9: 'warehouse',   // Module 10
          10: 'course'      // Module 11
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

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#070a13] font-sans antialiased text-white select-none flex">
      <ARSimulator />
      
      {/* 1. IMMERSIVE GLB LOADING PROGRESS BAR */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#070a13] z-50 flex flex-col items-center justify-center p-6"
          >
            <div className="max-w-md w-full flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(0,163,255,0.15)] animate-pulse">
                <Cpu className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold uppercase tracking-wider text-white">Loading Drone Laboratory</h2>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">
                  Retrieving high-res Pluto X GLB Asset
                </p>
              </div>
              
              {/* Progress Slider */}
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <span className="text-sm font-mono text-blue-400 font-bold">{Math.round(progress)}% Complete</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. LEFT SIDEBAR: Conditional rendering depending on Avionics Lab vs Flight Simulator */}
      <AnimatePresence mode="wait">
        {currentMode === 'flight' || activeMissionIndex >= 0 ? (
          // A. PILOT TRAINING MISSION LIST (FLIGHT MODE)
          <TrainingMissionSystem 
            key="flight-sidebar"
            orchestrator={orchestratorRef.current!} 
            onCheckpointsUpdated={(cps) => setActiveCheckpoints(cps)}
          />
        ) : (
          // B. PRE-FLIGHT AVIONICS DIAGNOSTICS PANELS (INSPECTION MODE)
          currentMode !== 'home' && !immersiveMode && (
            <motion.div
              key="explore-sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              style={{ overflow: 'hidden' }}
              className="h-full bg-slate-950/80 backdrop-blur-md border-r border-slate-800/80 z-10 flex flex-col justify-between shrink-0"
            >
              <div className="w-[320px] p-5 h-full flex flex-col justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-slate-850">
                <div className="space-y-4">
                  {/* Back to Home CTA */}
                  <button
                    onClick={() => setMode('home')}
                    className="w-full py-2 bg-slate-950 border border-slate-850 hover:bg-slate-900 hover:border-slate-800 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    ← Back to Main Menu
                  </button>

                  {/* Mode Switcher Tabs */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex bg-slate-900/60 p-1 rounded-lg border border-slate-850 text-[10px] font-bold uppercase tracking-wider">
                      <button
                        onClick={() => setMode('explore')}
                        className={`flex-1 py-1.5 rounded transition ${
                          currentMode === 'explore'
                            ? 'bg-blue-600 text-white shadow shadow-blue-500/10'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Explorer
                      </button>
                      <button
                        onClick={() => startLearning()}
                        className={`flex-1 py-1.5 rounded transition ${
                          currentMode === 'learning'
                            ? 'bg-amber-600 text-white shadow shadow-amber-500/10'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Training
                      </button>
                    </div>
                    <button 
                      onClick={handleResetAll}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-white transition shrink-0"
                      title="Reset Workspace"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* SECTION A: Camera Presets */}
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      Camera Angles
                    </h3>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                      <button
                        onClick={() => setCameraView('orbit')}
                        className={`col-span-2 py-2 rounded-lg border transition ${
                          cameraView === 'orbit' 
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]' 
                            : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Free Orbit Look
                      </button>
                      <button
                        onClick={() => setCameraView('top')}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'top' 
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                            : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Top View
                      </button>
                      <button
                        onClick={() => setCameraView('bottom')}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'bottom' 
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                            : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Bottom View
                      </button>
                      <button
                        onClick={() => setCameraView('left')}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'left' 
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                            : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Left Side
                      </button>
                      <button
                        onClick={() => setCameraView('right')}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'right' 
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                            : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Right Side
                      </button>
                      <button
                        onClick={() => setCameraView('front')}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'front' 
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                            : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Front Nose
                      </button>
                      <button
                        onClick={() => setCameraView('back')}
                        className={`py-2 rounded-lg border transition ${
                          cameraView === 'back' 
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                            : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Back Tail
                      </button>
                    </div>
                    {/* Auto Rotate Toggle */}
                    <button
                      onClick={toggleAutoRotate}
                      className={`w-full py-2 border rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                        autoRotate
                          ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                          : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Auto Rotate View: {autoRotate ? 'ON' : 'OFF'}
                    </button>

                    {/* Environment & VR Views */}
                    <div className="pt-3 border-t border-slate-900/60 space-y-2.5">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        Immersive Modes
                      </h3>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                        <button
                          onClick={toggleImmersiveMode}
                          className={`py-2 px-1 rounded-lg border transition flex flex-col items-center justify-center gap-0.5 ${
                            immersiveMode 
                              ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]' 
                              : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
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
                              ? 'bg-purple-600/10 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.15)]' 
                              : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}
                          title="Stereoscopic VR Split-screen Mode"
                        >
                          <span>Stereoscopic VR</span>
                          <span className="text-[8px] opacity-60 font-medium">SBS Split</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SECTION B: Motor Demonstrator Systems */}
                  <div className="space-y-3 pt-4 border-t border-slate-900">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Power className="w-3.5 h-3.5 text-blue-400" />
                        Motor Diagnostic Test
                      </h3>
                      <button
                        onClick={() => setShowRotationDirections(!showRotationDirections)}
                        className={`px-2 py-0.5 rounded border text-[9px] font-bold transition ${
                          showRotationDirections
                            ? 'bg-orange-600/10 border-orange-500 text-orange-400'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        Directions
                      </button>
                    </div>
                    
                    <div className="space-y-1.5">
                      {(['motor1', 'motor2', 'motor3', 'motor4'] as const).map((id, index) => {
                        const active = activeMotors[id];
                        const rpm = motorRPMs[id];
                        const cornerNames = ['FL (CW)', 'FR (CCW)', 'RL (CCW)', 'RR (CW)'];
                        
                        return (
                          <div key={id} className="flex gap-2 items-center">
                            <button
                              onClick={() => toggleMotor(id)}
                              className={`flex-1 flex justify-between items-center px-3.5 py-2.5 rounded-lg border text-xs font-bold uppercase transition ${
                                active 
                                  ? 'bg-orange-600/10 border-orange-500 text-orange-400' 
                                  : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <span>Motor {index + 1} ({cornerNames[index]})</span>
                              <span className="text-[9px] font-mono opacity-80">{active ? 'RUNNING' : 'STOPPED'}</span>
                            </button>
                            {active && (
                              <div className="w-16 text-center font-mono text-[10px] text-orange-400 border border-orange-500/20 bg-orange-950/10 py-1.5 rounded">
                                {rpm} RPM
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5">
                      <button
                        onClick={testAllMotors}
                        className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 text-xs font-bold uppercase rounded-lg transition"
                      >
                        Test All
                      </button>
                      <button
                        onClick={stopAllMotors}
                        className="py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold uppercase rounded-lg transition"
                      >
                        Kill All
                      </button>
                    </div>
                  </div>

                  {/* SECTION C: Component Legend */}
                  <div className="space-y-2 pt-4 border-t border-slate-900">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Component Registry
                    </h3>
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-900">
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
                                ? 'bg-blue-600/10 border-blue-500 text-blue-400 font-bold'
                                : isHovered
                                  ? 'bg-slate-900/50 border-slate-800 text-white'
                                  : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <span>{comp.name}</span>
                            <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-90 text-blue-400' : 'text-slate-600'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Brand Credit */}
                <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest pt-4 border-t border-slate-900">
                  Telemetry Link Status: Secure
                </div>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* 3. CENTER: 3D Scene Viewport (Conditional between Lab inspection vs Pilot simulator) */}
      <div className="flex-1 h-full relative z-0 flex bg-[#070a13]">
        {currentMode === 'flight' ? (
          // PILOT SIMULATOR FLIGHT VIEWPORT
          <FlightScene 
            orchestrator={orchestratorRef.current!} 
            activeCheckpoints={activeCheckpoints}
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

        {/* BOTTOM CONTROLS: Simple exploded and isolate view controls (Only visible in explorer mode) */}
        <AnimatePresence>
          {currentMode !== 'flight' && !immersiveMode && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="absolute bottom-6 left-6 pointer-events-auto z-10 flex gap-3"
            >
              <button
                onClick={toggleExploded}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                  isExploded
                    ? 'bg-blue-600/15 border-blue-500 text-blue-400'
                    : 'bg-slate-950/90 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Exploded View</span>
              </button>

              <button
                onClick={toggleIsolation}
                disabled={!selectedComponent}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                  !selectedComponent
                    ? 'opacity-40 cursor-not-allowed bg-slate-950/50 border-slate-900 text-slate-600'
                    : isolationMode
                      ? 'bg-emerald-600/15 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950/90 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Isolate Component</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DYNAMIC TELEMETRY HUD & DASHBOARD OVERLAY (Visible in Flight mode) */}
        {currentMode === 'flight' && (
          <TelemetryDashboard 
            onReset={handleResetSimulator}
            onCalibrate={handleCalibrateSensors}
            onToggleAltHold={handleToggleAltHold}
            stickState={stickState}
            onArm={() => orchestratorRef.current?.arm()}
            onDisarm={() => orchestratorRef.current?.disarm()}
          />
        )}
      </div>

      {/* 4. RIGHT SIDEBAR: Avionics Info Inspector (Only in Avionics Lab mode) */}
      <AnimatePresence>
        {currentMode !== 'flight' && selectedData && !immersiveMode && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            style={{ overflow: 'hidden' }}
            className="h-full bg-slate-950/80 backdrop-blur-md border-l border-slate-800/80 z-10 flex flex-col justify-between shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
          >
            <div className="w-[380px] p-6 h-full flex flex-col justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-slate-850">
              <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin scrollbar-thumb-slate-850">
                
                {/* Header */}
                <div className="pb-4 border-b border-slate-850">
                  <span className="text-[9px] text-blue-400 font-mono tracking-widest uppercase">Hardware Profile</span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider mt-1">{selectedData.name}</h2>
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
                    <div className="bg-blue-950/20 border border-blue-500/30 p-3 rounded-lg space-y-3">
                      <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                        STEM Insights: Aerodynamic Balance
                      </h4>
                      <div className="text-[11px] text-slate-300 leading-relaxed font-light space-y-1.5">
                        <p>
                          <strong>Rotation Direction:</strong> {selectedComponent === 'propellerA' ? 'Clockwise (CW)' : 'Counter-Clockwise (CCW)'}
                        </p>
                        <p>
                          <strong>Torque Balancing:</strong> A quadcopter requires adjacent propellers to rotate in opposite directions. As motor 1 spins its blade CW, it exerts an opposite CCW reaction torque on the chassis. By spinning motor 2 CCW, its reaction torque balances out, preventing the drone from spinning uncontrollably.
                        </p>
                        <p>
                          <strong>Yaw Authority:</strong> To turn left or right (yaw), the flight controller speeds up the CW pair while slowing down the CCW pair. The net imbalance in reactive torque rotates the drone without changing overall altitude.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-blue-500/20">
                        <button
                          onClick={handleToggleProp}
                          className={`w-full py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            isSpinning
                              ? 'bg-blue-650 border-blue-550 text-white hover:bg-blue-700 shadow-[0_0_15px_rgba(0,163,255,0.25)]'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
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
                    <div className="bg-orange-950/20 border border-orange-500/30 p-3 rounded-lg space-y-3">
                      <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-orange-400" />
                        STEM Insights: Thrust & Lift
                      </h4>
                      <div className="text-[11px] text-slate-300 leading-relaxed font-light space-y-1.5">
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

                      <div className="pt-2 border-t border-orange-500/20">
                        <button
                          onClick={() => toggleMotor(motorId)}
                          className={`w-full py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            active
                              ? 'bg-orange-600 border-orange-500 text-white hover:bg-orange-700 shadow-[0_0_15px_rgba(255,119,0,0.25)]'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
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
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    Primary Function
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">{selectedData.functionName}</p>
                </div>

                {/* Working Principle */}
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    Working Principle
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">{selectedData.workingPrinciple}</p>
                </div>

                {/* Role During Flight */}
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                    Flight Operations Role
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">{selectedData.flightRole}</p>
                </div>

                {/* Safety */}
                <div className="bg-amber-950/10 border border-amber-900/30 p-3 rounded-lg">
                  <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Safety Warnings
                  </h3>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed font-light">{selectedData.safetyNotes}</p>
                </div>

                {/* Maintenance */}
                <div className="bg-emerald-950/10 border border-emerald-900/30 p-3 rounded-lg">
                  <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <Wrench className="w-3.5 h-3.5" />
                    Maintenance Notes
                  </h3>
                  <p className="text-[11px] text-emerald-200/80 leading-relaxed font-light">{selectedData.maintenanceNotes}</p>
                </div>
              </div>

              {/* Footer Close Panel */}
              <div className="pt-4 border-t border-slate-900">
                <button
                  onClick={() => selectComponent(null)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold uppercase tracking-widest border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 transition"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </motion.div>
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

      {/* 6. MODE SELECTION OVERHEAD RIBBON (Visible in normal panels) */}
      <AnimatePresence>
        {!immersiveMode && currentMode !== 'home' && (
          <motion.header
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 p-1.5 rounded-2xl flex gap-1.5 pointer-events-auto z-20 shadow-2xl"
          >
            <button
              onClick={() => setMode('explore')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                currentMode === 'explore' || currentMode === 'learning' || currentMode === 'inspect'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Avionics & Component Lab</span>
            </button>
            <button
              onClick={() => setMode('flight')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                currentMode === 'flight'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Pilot Simulator</span>
            </button>
          </motion.header>
        )}
      </AnimatePresence>

      {/* 7. HOME SCREEN MAIN NAVIGATION HUB */}
      <IntroOverlay />

      {/* Decorative top-edge accent line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500/25 to-transparent pointer-events-none z-10" />
    </div>
  );
}

export default App;
