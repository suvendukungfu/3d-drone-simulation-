import { useState, useEffect, useRef, useCallback } from 'react';
import { useDroneStore } from '../../store/useDroneStore';
import { 
  ShieldAlert, Cpu, RotateCcw, Battery, Activity, Info, AlertTriangle, CheckCircle, Circle, XCircle, Award, HelpCircle,
  Pin, PinOff, ChevronDown, ChevronUp, Sliders, Tv, Settings, Camera
} from 'lucide-react';
import { MISSIONS } from './TrainingMissionSystem';

interface TelemetryDashboardProps {
  onReset: () => void;
  onCalibrate: () => void;
  onToggleAltHold: (active: boolean) => void;
  stickState: { throttle: number; yaw: number; pitch: number; roll: number };
  onArm?: () => void;
  onDisarm?: () => void;
  hasTakenOff?: boolean;
  isLandingActive?: boolean;
  isFlipArmed?: boolean;
  isFlipping?: boolean;
  onTakeoff?: () => void;
  onLand?: () => void;
  onFlip?: () => void;
}

export function TelemetryDashboard({
  onReset,
  onCalibrate,
  onToggleAltHold,
  stickState,
  onArm,
  onDisarm,
  hasTakenOff = false,
  isLandingActive = false,
  isFlipArmed = false,
  isFlipping = false,
  onTakeoff,
  onLand,
  onFlip
}: TelemetryDashboardProps) {
  const telemetry = useDroneStore((state) => state.telemetry);
  const flightEnvironment = useDroneStore((state) => state.flightEnvironment);
  const showTelemetryDashboard = useDroneStore((state) => state.showTelemetryDashboard);
  const closedEnvs = ['room', 'lab', 'classroom', 'warehouse'];
  const isClosedSimulation = closedEnvs.includes(flightEnvironment);
  const showTelemetry = isClosedSimulation ? false : showTelemetryDashboard;
  const toggleTelemetryDashboard = useDroneStore((state) => state.toggleTelemetryDashboard);
  const showControlsOverlay = useDroneStore((state) => state.showControlsOverlay);
  const toggleControlsOverlay = useDroneStore((state) => state.toggleControlsOverlay);
  const showChecklist = useDroneStore((state) => state.showChecklist);
  const toggleChecklist = useDroneStore((state) => state.toggleChecklist);
  const isAcademyOpen = useDroneStore((state) => state.isAcademyOpen);
  const notifications = useDroneStore((state) => state.notifications);
  const activeMissionIndex = useDroneStore((state) => state.activeMissionIndex);
  const missionObjectivesCompleted = useDroneStore((state) => state.missionObjectivesCompleted);
  const flightCameraView = useDroneStore((state) => state.flightCameraView);
  const setFlightCameraView = useDroneStore((state) => state.setFlightCameraView);
  const setFlightEnvironment = useDroneStore((state) => state.setFlightEnvironment);

  const appLinkStatus = useDroneStore((state) => state.appLinkStatus);
  const setAppLinkStatus = useDroneStore((state) => state.setAppLinkStatus);
  const appTelemetryPackets = useDroneStore((state) => state.appTelemetryPackets);
  const clearTelemetryPackets = useDroneStore((state) => state.clearTelemetryPackets);

  // Model loading and spawning checks
  const modelLoadStatus = useDroneStore((state) => state.modelLoadStatus);
  const droneSpawnDiagnostics = useDroneStore((state) => state.droneSpawnDiagnostics);
  const droneInitFailed = useDroneStore((state) => state.droneInitFailed);
  const isSpawnDebugMode = useDroneStore((state) => state.isSpawnDebugMode);

  const isModelLoaded = modelLoadStatus === 'success';
  const isPhysicsInitialized = isModelLoaded && telemetry !== null;
  const isDroneSpawned = isModelLoaded && droneSpawnDiagnostics !== null;
  const [isCameraLocked, setIsCameraLocked] = useState(false);
  const isTelemetryReady = isPhysicsInitialized && telemetry.battery > 0;

  // Auto Hide / Pin States for settings panel
  const [isPinned, setIsPinned] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isArmingTransition, setIsArmingTransition] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    flight: true,
    camera: true,
    controls: false,
    display: false,
    simulator: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    setIsCollapsed(false);

    if (!isPinned) {
      inactivityTimerRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 4000);
    }
  }, [isPinned]);

  // Expand and reset timer on stick state change (inputs)
  useEffect(() => {
    if (stickState.throttle !== 0 || stickState.yaw !== 0 || stickState.pitch !== 0 || stickState.roll !== 0) {
      resetInactivityTimer();
    }
  }, [stickState.throttle, stickState.yaw, stickState.pitch, stickState.roll, resetInactivityTimer]);

  // Listen to mousemove and keydown globally to reset timer and auto-expand
  useEffect(() => {
    const handleGlobalActivity = () => {
      resetInactivityTimer();
    };

    window.addEventListener('keydown', handleGlobalActivity);
    window.addEventListener('mousemove', handleGlobalActivity);
    
    return () => {
      window.removeEventListener('keydown', handleGlobalActivity);
      window.removeEventListener('mousemove', handleGlobalActivity);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // Clear transition state when armed status changes
  useEffect(() => {
    setIsArmingTransition(false);
  }, [telemetry?.isArmed]);

  const handleArmToggle = () => {
    if (isArmingTransition) return;
    setIsArmingTransition(true);
    if (telemetry?.isArmed) {
      onDisarm?.();
    } else {
      onArm?.();
    }
  };



  // Buzzer Alert for Critical Battery (play 1Hz electronic warning beep)
  useEffect(() => {
    if (isClosedSimulation) return;
    if (!telemetry || !telemetry.isArmed || telemetry.battery >= 20) return;

    let audioCtx: AudioContext | null = null;
    const playBuzzer = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtx) {
          audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, audioCtx.currentTime); // 2kHz
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime); // low volume
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch (e) {
        console.error('AudioContext error:', e);
      }
    };

    playBuzzer();
    const interval = setInterval(playBuzzer, 1000);

    return () => {
      clearInterval(interval);
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, [telemetry?.isArmed, telemetry?.battery, isClosedSimulation]);


  useEffect(() => {
    if (isDroneSpawned) {
      const timer = setTimeout(() => {
        setIsCameraLocked(true);
      }, 750);
      return () => clearTimeout(timer);
    } else {
      setIsCameraLocked(false);
    }
  }, [isDroneSpawned]);

  // Spawning Verification Timeout Failsafe
  useEffect(() => {
    if (modelLoadStatus === 'success' && droneSpawnDiagnostics === null) {
      const timer = setTimeout(() => {
        // Only set failed if diagnostics still haven't arrived
        if (useDroneStore.getState().droneSpawnDiagnostics === null) {
          useDroneStore.getState().setDroneInitFailed(true);
        }
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [modelLoadStatus, droneSpawnDiagnostics]);

  const isInitChecking = false;

  const [linkOpen, setLinkOpen] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  const pixelsPerDegree = 1.5;
  const compassTicks: { d: number; label: string; isCardinal: boolean }[] = [];
  for (let d = -180; d <= 540; d += 30) {
    const deg = (d + 360) % 360;
    let label = deg.toString();
    let isCardinal = false;
    if (deg === 0) { label = 'N'; isCardinal = true; }
    else if (deg === 90) { label = 'E'; isCardinal = true; }
    else if (deg === 180) { label = 'S'; isCardinal = true; }
    else if (deg === 270) { label = 'W'; isCardinal = true; }
    compassTicks.push({ d, label, isCardinal });
  }

  // Auto-scroll terminal console
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [appTelemetryPackets]);

  const getVoltage = (batteryPct: number) => {
    // 3S LiPo battery (11.1V nominal, 12.6V full, ~9.9V empty)
    const minVolts = 9.9;
    const maxVolts = 12.6;
    return (minVolts + (maxVolts - minVolts) * (batteryPct / 100)).toFixed(1);
  };

  const getFlightModeLabel = (mode: string) => {
    switch (mode) {
      case 'disarmed': return 'DISARMED';
      case 'armed_idle': return 'ARMED - IDLE';
      case 'armed - idle': return 'ARMED - IDLE';
      case 'althold': return 'ALTITUDE HOLD';
      case 'stabilize': return 'STABILIZE (ANGLE)';
      case 'failsafe': return 'FAILSAFE AUTO-LAND';
      default: return 'MANUAL';
    }
  };

  const handleToggleLink = () => {
    if (appLinkStatus === 'disconnected') {
      setAppLinkStatus('connecting');
      setTimeout(() => {
        setAppLinkStatus('connected');
      }, 1500);
    } else {
      setAppLinkStatus('disconnected');
      clearTelemetryPackets();
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 font-sans select-none flex flex-col justify-between p-4">
      
      {/* Toast Notification Stack */}
      {notifications.length > 0 && (
        <div className="desktop-notifications-stack absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col gap-2 items-center">
          {notifications.map((n) => {
            let bg = 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-md';
            let icon = <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
            if (n.type === 'success') {
              bg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 shadow-[0_8px_20px_rgba(16,185,129,0.06)]';
              icon = <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
            } else if (n.type === 'warning') {
              bg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900 text-amber-805 dark:text-amber-305 shadow-[0_8px_20px_rgba(245,158,11,0.06)]';
              icon = <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
            } else if (n.type === 'orange') {
              bg = 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-900 text-orange-800 dark:text-orange-300 shadow-[0_8px_20px_rgba(249,115,22,0.06)]';
              icon = <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
            } else if (n.type === 'error') {
              bg = 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-red-800 dark:text-red-300 shadow-[0_8px_20px_rgba(239,68,68,0.06)]';
              icon = <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
            }
            return (
              <div 
                key={n.id} 
                className={`flex items-center gap-2.5 px-4 py-2 border rounded-xl text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md transition-all duration-300 ${bg}`}
              >
                {icon}
                <span>{n.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Quest Checklist Overlay (visible when sidebar is closed) */}
      {activeMissionIndex >= 0 && !isAcademyOpen && showChecklist && (
        <div className="flex absolute top-[max(5rem,calc(3.5rem+env(safe-area-inset-top,0px)))] md:top-16 left-[max(1rem,calc(0.875rem+env(safe-area-inset-left,0px)))] bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 p-3 rounded-xl w-52 sm:w-60 shadow-[0_8px_25px_rgba(0,0,0,0.03)] pointer-events-auto z-20 flex-col gap-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/80 pb-1.5">
            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider truncate">
              {MISSIONS[activeMissionIndex].title}
            </span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin">
            {MISSIONS[activeMissionIndex].objectives.map((obj, idx) => {
              const completed = missionObjectivesCompleted[idx];
              return (
                <div key={idx} className="flex gap-2 items-start text-[9px] leading-relaxed">
                  {completed ? (
                    <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-3 h-3 text-slate-300 dark:text-slate-700 shrink-0 mt-0.5" />
                  )}
                  <span className={completed ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-slate-500 dark:text-slate-400"}>{obj}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Compact Telemetry Strip */}
      {showTelemetry && (
        <div className="md:hidden absolute top-[max(4rem,calc(3.5rem+var(--sat,0px))] left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border border-slate-800/80 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-[9px] sm:text-[10px] font-mono tracking-wider text-slate-300 pointer-events-auto z-20 max-w-[90vw] overflow-x-auto scrollbar-hide whitespace-nowrap">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <span>ALT: <strong className="text-white">{telemetry.altitude.toFixed(2)}m</strong></span>
          </div>
          <span className="text-slate-850 font-light">|</span>
          <div>
            <span>SPD: <strong className="text-white">{telemetry.speed.toFixed(1)}m/s</strong></span>
          </div>
          <span className="text-slate-850 font-light">|</span>
          <div className="flex items-center gap-1">
            <Battery className="w-3 h-3 text-orange-500 shrink-0" />
            <span>{getVoltage(telemetry.battery)}V</span>
          </div>
          <span className="text-slate-850 font-light">|</span>
          <div>
            <span className={telemetry.isArmed ? 'text-red-500 font-bold' : 'text-slate-500'}>
              {telemetry.isArmed ? 'ARMED' : 'DISARMED'}
            </span>
          </div>
        </div>
      )}


      
      {/* 1. TOP TELEMETRY RIBBON & SYSTEM STATE */}
      <div className="w-full flex justify-between items-start pointer-events-auto gap-4">
        
        {/* Left Side: Diagnostics and Calibration Status */}
        {showTelemetry ? (
          <div className="hidden md:flex flex-col gap-2">
            <div id="tutorial-telemetry-status" className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center gap-4 shadow-[0_8px_25px_rgba(0,0,0,0.02)]">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Avionics System</h2>
                {telemetry.calibrationActive ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                    <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400">
                      CALIBRATING IMU ({Math.round(telemetry.altitude * 0 + 50)}%)
                    </span>
                  </div>
                ) : telemetry.sensorError ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    <span className="text-[9px] font-mono text-red-600 dark:text-red-405 font-bold">CALIBRATION FAILED</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">ONLINE / CALIBRATED</span>
                  </div>
                )}
              </div>
            </div>

            {/* Environmental Selection (Room and Lab Segmented Control) */}
            <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl flex gap-1 shadow-[0_8px_25px_rgba(0,0,0,0.02)] text-[9px] font-bold uppercase tracking-wider w-full">
              {(['room', 'lab'] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => setFlightEnvironment(env)}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                    flightEnvironment === env
                      ? 'bg-blue-600 border border-blue-500 text-white font-bold shadow-md shadow-blue-500/10'
                      : 'text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>
        ) : <div className="hidden md:block w-64" />}

        {/* Center: Heading Tape & Artificial Horizon Pitch indicators */}
        {showTelemetry ? (
          <div className="hidden md:flex flex-col items-center flex-1 max-w-[400px]">
            {/* Compass Ribbon */}
            <div className="w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 h-12 rounded-xl relative overflow-hidden flex flex-col justify-between items-center shadow-[0_8px_25px_rgba(0,0,0,0.02)] pt-1">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
              
              {/* Heading value */}
              <div className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                {Math.round(telemetry.heading)}°
              </div>

              {/* Ticks window */}
              <div className="w-full h-6 relative overflow-hidden flex justify-center">
                {/* Center tick indicator pointer */}
                <div 
                  className="absolute left-1/2 -translate-x-1/2 bottom-0 w-2.5 h-2 bg-blue-600 dark:bg-blue-500 z-10"
                  style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
                ></div>
                
                {/* Sliding Tape */}
                <div 
                  className="absolute top-0 bottom-0 left-1/2 transition-none"
                  style={{ transform: `translateX(-${telemetry.heading * pixelsPerDegree}px)` }}
                >
                  {compassTicks.map(({ d, label, isCardinal }) => (
                    <div 
                      key={d} 
                      className="absolute -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${d * pixelsPerDegree}px`, width: '30px' }}
                    >
                      {/* Tick line */}
                      <div className="w-px h-1.5 bg-slate-300 dark:bg-slate-700"></div>
                      {/* Tick label */}
                      <span className={`text-[9px] font-mono mt-0.5 ${isCardinal ? 'text-slate-800 dark:text-slate-200 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick flight diagnostics overlay */}
            <div id="tutorial-telemetry-speed" className="mt-2 px-3 py-1 bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-full text-[9px] font-mono text-slate-500 dark:text-slate-400 shadow-sm">
              SPEED: {telemetry.speed.toFixed(1)} m/s | V.RATE: {telemetry.verticalSpeed.toFixed(1)} m/s
            </div>
          </div>
        ) : <div className="hidden md:block flex-1" />}

        {/* Right Side: Battery, Arm State, Camera presets */}
        <div className="flex flex-col items-end justify-start gap-2 pointer-events-auto">
          {/* Battery Status Panel */}
          {showTelemetry && (
            <div id="tutorial-telemetry-battery" className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.02)]">
              <div className="text-right">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase block leading-none mb-1">
                  LIPO BATTERY
                </span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {getVoltage(telemetry.battery)}V ({telemetry.battery}%)
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Battery className={`w-5 h-5 ${telemetry.battery < 20 ? 'animate-bounce text-red-500' : ''}`} />
              </div>
            </div>
          )}

          {/* Camera View Switcher with Camera Mode Indicator badge */}
          <div id="tutorial-camera-switcher" className="desktop-camera-switcher flex flex-col items-end gap-1.5">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 px-3 py-1 rounded-full text-[9px] font-mono font-bold text-blue-600 dark:text-blue-400 shadow-sm uppercase tracking-wider">
              CAM VIEW: {flightCameraView}
            </div>
            <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-1 rounded-xl flex gap-1 shadow-[0_8px_25px_rgba(0,0,0,0.02)] text-[10px] font-bold uppercase tracking-wider">
              {(['chase', 'fpv', 'orbit'] as const).map((view, idx) => (
                <button
                  key={view}
                  onClick={() => setFlightCameraView(view)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    flightCameraView === view
                      ? 'bg-blue-600 border border-blue-500 text-white font-bold shadow-md shadow-blue-500/10'
                      : 'text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-205 dark:hover:bg-slate-800'
                  }`}
                >
                  {`${idx + 1}:${view}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Collapsible Digital Twin AppLink Panel */}
      {!isClosedSimulation && (
        <div 
          className={`hidden md:flex absolute right-4 top-24 bottom-36 w-[280px] pointer-events-auto flex-col z-20 transition-all duration-350`}
          style={{
            transform: linkOpen ? 'translateX(0)' : 'translateX(242px)'
          }}
        >
          <div className="flex items-stretch h-full">
            {/* Collapse toggle tab */}
            <button 
              onClick={() => setLinkOpen(!linkOpen)}
              className="w-8 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-l border-t border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-l-xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-805 dark:hover:text-slate-200 transition-all shadow-md"
            >
              <span 
                className="text-[8px] font-mono font-bold uppercase tracking-widest mb-4 mt-2"
                style={{ writingMode: 'vertical-lr' as any, transform: 'rotate(180deg)' }}
              >
                DIGITAL TWIN
              </span>
              {linkOpen ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>

            {/* Main Panel Content */}
            <div className="flex-1 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-r-xl flex flex-col justify-between shadow-md overflow-hidden">
              <div className="space-y-4 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div id="tutorial-telemetry-signal" className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                    Twin AppLink
                  </span>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    appLinkStatus === 'connected' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900' 
                      : appLinkStatus === 'connecting'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900 animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}>
                    {appLinkStatus.toUpperCase()}
                  </span>
                </div>

                {/* Connection Toggle Button */}
                <div>
                  <button
                    onClick={handleToggleLink}
                    disabled={appLinkStatus === 'connecting'}
                    className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 border ${
                      appLinkStatus === 'connected'
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-655 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60'
                        : appLinkStatus === 'connecting'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-606 dark:text-amber-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    }`}
                  >
                    {appLinkStatus === 'connecting' ? (
                      <>
                        <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                      </>
                    ) : appLinkStatus === 'connected' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        <span>Disconnect Twin</span>
                      </>
                    ) : (
                      <span>Establish Twin Link</span>
                    )}
                  </button>
                </div>

                {/* NMEA Scrolling Console */}
                <div className="flex-1 flex flex-col min-h-0">
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono tracking-wider uppercase mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                    $PXTWIN Serial Stream (10Hz)
                  </span>
                  <div 
                    ref={terminalRef}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg font-mono text-[9px] text-slate-700 dark:text-slate-300 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 leading-normal"
                  >
                    {appLinkStatus === 'connected' ? (
                      appTelemetryPackets.length > 0 ? (
                        [...appTelemetryPackets].reverse().map((pkt, idx) => (
                          <div key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-800/80 truncate select-text py-0.5 border-b border-slate-100 dark:border-slate-800">
                            {pkt}
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 dark:text-slate-550 animate-pulse italic">Waiting for telemetry frames...</div>
                      )
                    ) : appLinkStatus === 'connecting' ? (
                      <div className="text-amber-600 dark:text-amber-400 animate-pulse">Negotiating link layer handshake...</div>
                    ) : (
                      <div className="text-slate-400 dark:text-slate-500 italic font-light leading-relaxed">
                        Applink disconnected. Press "Establish Twin Link" to sync hardware telemetry packets.
                      </div>
                    )}
                  </div>
                </div>

                {/* Sensor Health Status Indicator list */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono tracking-wider uppercase block">
                    Sensor Health Monitor
                  </span>
                  <div className="space-y-1.5">
                    {[
                      { name: 'IMU (Acc/Gyro)', key: 'imu' },
                      { name: 'Barometer (Altitude)', key: 'baro' },
                      { name: 'Magnetometer (Compass)', key: 'compass' }
                    ].map((sensor) => {
                      const status = telemetry.calibrationActive 
                        ? 'calibrating' 
                        : telemetry.sensorError 
                          ? 'error' 
                          : 'ok';
                      return (
                        <div key={sensor.key} className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-500 dark:text-slate-400">{sensor.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              status === 'ok' 
                                ? 'bg-emerald-500 shadow-sm' 
                                : status === 'calibrating' 
                                  ? 'bg-amber-500 animate-pulse' 
                                  : 'bg-red-500 animate-ping'
                            }`} />
                            <span className={
                              status === 'ok' 
                                ? 'text-emerald-700 dark:text-emerald-400 font-semibold' 
                                : status === 'calibrating' 
                                  ? 'text-amber-600 dark:text-amber-450 font-semibold' 
                                  : 'text-red-655 dark:text-red-400 font-bold'
                            }>
                              {status === 'ok' ? 'HEALTHY' : status === 'calibrating' ? 'CALIBRATING' : 'ERROR'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. BOTTOM PILOT CONTROLS HUD */}
      <div className="hidden md:flex hide-on-touch-landscape w-full justify-between items-end pointer-events-auto gap-4">
                {/* Left Side: Flight Mode Controller panel & HUD Toggles */}        <div 
          onMouseEnter={() => setIsCollapsed(false)}
          className={`bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-2xl w-[280px] shadow-[0_8px_25px_rgba(0,0,0,0.02)] flex flex-col transition-all duration-300 ease-in-out origin-bottom-left select-none relative ${
            isCollapsed ? 'h-[44px] overflow-hidden opacity-90' : 'h-[430px]'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 cursor-pointer flex-shrink-0" onClick={() => setIsCollapsed(!isCollapsed)}>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase font-black">Flight Settings</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPinned(!isPinned);
                }}
                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isPinned ? 'text-blue-500' : 'text-slate-400'}`}
                title={isPinned ? "Unpin panel (Auto Hide enabled)" : "Pin panel (Auto Hide disabled)"}
              >
                {isPinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
              </button>
            </div>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
              telemetry.isArmed ? 'bg-red-50 dark:bg-red-950/40 text-red-606 dark:text-red-400 border border-red-200 dark:border-red-900/60' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-202 dark:border-slate-800'
            }`}>
              {telemetry.isArmed ? 'ARMED' : 'DISARMED'}
            </span>
          </div>

          {/* Collapsible Accordion Sections */}
          <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1 scrollbar-thin">
            {/* 1. FLIGHT SECTION */}
            <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden">
              <button 
                onClick={() => toggleSection('flight')}
                className="w-full flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  <span>Flight</span>
                </div>
                {expandedSections.flight ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              
              {expandedSections.flight && (
                <div className="p-3 space-y-2.5 bg-white/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/60">
                  {/* Arm Toggle Button */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-mono tracking-wider font-bold">
                      <span>ARM STATE</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[8px] font-bold">[Space]</span>
                    </div>
                    <button
                      id="tutorial-arm-btn"
                      onClick={handleArmToggle}
                      disabled={isInitChecking || droneInitFailed || isArmingTransition}
                      className={`py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border w-full flex items-center justify-center gap-1.5 ${
                        telemetry.isArmed
                          ? 'bg-red-500 hover:bg-red-600 border-red-600 text-white shadow-md shadow-red-500/10'
                          : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/10 disabled:opacity-40'
                      }`}
                    >
                      {isArmingTransition ? 'Processing...' : telemetry.isArmed ? 'Disarm Drone' : 'Arm Drone'}
                    </button>
                  </div>

                  {telemetry.isArmed && (
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Commands</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          id="tutorial-takeoff-btn"
                          onClick={onTakeoff}
                          disabled={hasTakenOff}
                          className={`py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border text-center shadow-sm flex flex-col items-center justify-center leading-none ${
                            hasTakenOff
                              ? 'bg-slate-100 dark:bg-slate-900 border-slate-202 dark:border-slate-800 text-slate-400 dark:text-slate-655 cursor-not-allowed shadow-none'
                              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white'
                          }`}
                          title="Initiate auto-takeoff sequence"
                        >
                          <span>Takeoff</span>
                          <span className="text-[7px] opacity-60 mt-0.5 font-mono">[T]</span>
                        </button>
                        <button
                          id="tutorial-land-btn"
                          onClick={onLand}
                          disabled={!hasTakenOff || isLandingActive}
                          className={`py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border text-center shadow-sm flex flex-col items-center justify-center leading-none ${
                            !hasTakenOff || isLandingActive
                              ? 'bg-slate-100 dark:bg-slate-900 border-slate-202 dark:border-slate-800 text-slate-400 dark:text-slate-655 cursor-not-allowed shadow-none'
                              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white'
                          }`}
                          title="Initiate auto-landing sequence"
                        >
                          <span>Land</span>
                          <span className="text-[7px] opacity-60 mt-0.5 font-mono">[L]</span>
                        </button>
                        <button
                          id="tutorial-flip-btn"
                          onClick={onFlip}
                          disabled={!hasTakenOff || isFlipping}
                          className={`py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border text-center shadow-sm flex flex-col items-center justify-center leading-none ${
                            !hasTakenOff || isFlipping
                              ? 'bg-slate-100 dark:bg-slate-900 border-slate-202 dark:border-slate-800 text-slate-400 dark:text-slate-655 cursor-not-allowed shadow-none'
                              : isFlipArmed
                                ? 'bg-violet-600 border-violet-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                                : 'bg-violet-50 dark:bg-violet-950/40 border-violet-400 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white'
                          }`}
                          title="Arm Flip mode. Push direction stick to execute flip."
                        >
                          <span>{isFlipping ? 'Flipping' : 'Flip'}</span>
                          <span className="text-[7px] opacity-60 mt-0.5 font-mono">[F]</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-[10px] font-mono border-t border-slate-100 dark:border-slate-800/80 pt-2 text-slate-500">
                    <span>ACTIVE MODE:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{getFlightModeLabel(telemetry.flightMode)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. CAMERA SECTION */}
            <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden">
              <button 
                onClick={() => toggleSection('camera')}
                className="w-full flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-500" />
                  <span>Camera View</span>
                </div>
                {expandedSections.camera ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.camera && (
                <div className="p-3 bg-white/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['chase', 'fpv', 'orbit'] as const).map((view, idx) => (
                      <button
                        key={view}
                        onClick={() => setFlightCameraView(view)}
                        className={`py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border flex flex-col items-center justify-center leading-none ${
                          flightCameraView === view
                            ? 'bg-blue-600 border border-blue-500 text-white font-bold shadow-md shadow-blue-500/10'
                            : 'text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-250 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{view}</span>
                        <span className="text-[7px] opacity-60 mt-0.5 font-mono">[{idx + 1}]</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. CONTROLS SECTION */}
            <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden">
              <button 
                onClick={() => toggleSection('controls')}
                className="w-full flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-blue-500" />
                  <span>Controls</span>
                </div>
                {expandedSections.controls ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.controls && (
                <div className="p-3 space-y-3 bg-white/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Altitude Hold (Auto-Level)</span>
                    <button 
                      onClick={() => onToggleAltHold(telemetry.flightMode !== 'althold')}
                      disabled={telemetry.flightMode === 'failsafe'}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        telemetry.flightMode === 'althold' ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        telemetry.flightMode === 'althold' ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-1.5">
                      <span>HeadFree Mode</span>
                      <span className="text-[8px] font-mono text-slate-405 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold">[J]</span>
                    </span>
                    <button 
                      onClick={() => useDroneStore.getState().toggleHeadFree()}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none pointer-events-auto ${
                        useDroneStore((s) => s.headFree) ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        useDroneStore((s) => s.headFree) ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="font-medium">Speed Mode (Rate)</span>
                    <select 
                      value={useDroneStore.getState().gyroSensitivity}
                      onChange={(e) => useDroneStore.getState().setGyroSensitivity(parseFloat(e.target.value))}
                      className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 outline-none text-slate-700 dark:text-slate-300 pointer-events-auto"
                    >
                      <option value="0.8">Low (60%)</option>
                      <option value="1.2">Medium (100%)</option>
                      <option value="1.8">High (150%)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 4. DISPLAY SECTION */}
            <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden">
              <button 
                onClick={() => toggleSection('display')}
                className="w-full flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-blue-500" />
                  <span>Display HUD</span>
                </div>
                {expandedSections.display ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.display && (
                <div className="p-3 space-y-2 bg-white/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold">
                  {!isClosedSimulation && (
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <span>TELEMETRY HUD</span>
                        <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[8px] font-bold">[T]</span>
                      </span>
                      <button 
                        onClick={toggleTelemetryDashboard}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${showTelemetryDashboard ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${showTelemetryDashboard ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span>CONTROLS HUD</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[8px] font-bold">[H]</span>
                    </span>
                    <button 
                      onClick={toggleControlsOverlay}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${showControlsOverlay ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${showControlsOverlay ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span>CHECKLIST HUD</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[8px] font-bold">[C]</span>
                    </span>
                    <button 
                      onClick={toggleChecklist}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${showChecklist ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${showChecklist ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. SIMULATOR SECTION */}
            <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden">
              <button 
                onClick={() => toggleSection('simulator')}
                className="w-full flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-500" />
                  <span>Simulator Settings</span>
                </div>
                {expandedSections.simulator ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.simulator && (
                <div className="p-3 space-y-2.5 bg-white/40 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-455 font-mono font-bold">
                    <span className="flex items-center gap-1.5">
                      <span>SPAWN DEBUG</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[8px] font-bold">[G]</span>
                    </span>
                    <button 
                      onClick={useDroneStore.getState().toggleSpawnDebugMode}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${isSpawnDebugMode ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${isSpawnDebugMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={onCalibrate}
                      disabled={telemetry.isArmed || isInitChecking}
                      className="py-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 border border-slate-200 dark:border-slate-800 text-[9px] font-bold uppercase tracking-wider rounded-lg text-slate-700 dark:text-slate-350 transition flex flex-col items-center justify-center leading-none"
                    >
                      <span>Calibrate</span>
                      <span className="text-[7px] opacity-60 mt-0.5 font-mono">[C]</span>
                    </button>
                    <button
                      onClick={onReset}
                      className="py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/60 text-[9px] font-bold uppercase tracking-wider rounded-lg text-red-600 dark:text-red-450 transition flex flex-col items-center justify-center leading-none"
                    >
                      <span className="flex items-center gap-1"><RotateCcw className="w-2.5 h-2.5" />Reset</span>
                      <span className="text-[7px] opacity-60 mt-0.5 font-mono">[Shift+R]</span>
                    </button>
                  </div>
                  <button
                    onClick={() => useDroneStore.getState().startTutorial()}
                    className="w-full py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900/60 text-[9px] font-bold uppercase tracking-wider rounded-lg text-blue-600 dark:text-blue-450 transition flex items-center justify-center gap-1 shadow-sm mt-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    Replay Onboarding
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Live Transmitter Virtual Stick Visualizer (RC Remote carbon design) */}
        {showControlsOverlay ? (
          <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border-2 border-slate-700/80 p-5 rounded-3xl shadow-[0_12px_36px_rgba(0,0,0,0.5)] flex gap-8 items-center text-white relative overflow-hidden select-none hide-on-touch-landscape">
            
            {/* Ambient inner glow to reflect a futuristic dashboard */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-cyan-500/5 pointer-events-none" />

            {/* Left Stick: Throttle (Y) and Yaw (X) */}
            <div id="tutorial-left-joystick" className="flex flex-col items-center relative z-10">
              <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase mb-2 font-black">Left Stick (W/S, A/D)</span>
              
              <div className="w-24 h-24 bg-slate-950 rounded-full relative border-2 border-slate-800 flex items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)] overflow-hidden">
                {/* Concentric helper rings */}
                <div className="absolute w-16 h-16 rounded-full border border-slate-800/40 border-dashed" />
                <div className="absolute w-8 h-8 rounded-full border border-slate-800/60 border-dashed" />
                {/* Grid axes */}
                <div className="absolute w-px h-full bg-slate-800/60" />
                <div className="absolute h-px w-full bg-slate-800/60" />
                
                {/* Dynamic Vector Line Trail */}
                <svg className="absolute w-full h-full p-0 pointer-events-none" viewBox="0 0 100 100">
                  <line 
                    x1="50" 
                    y1="50" 
                    x2={50 + stickState.yaw * 38} 
                    y2={50 - stickState.throttle * 38} 
                    stroke="#22d3ee" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    className="opacity-75"
                  />
                </svg>

                {/* Machined Metal Stick Handle */}
                <div 
                  className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-500/40 shadow-[0_4px_10px_rgba(0,0,0,0.7)] flex items-center justify-center transition-all duration-75"
                  style={{
                    transform: `translate(${stickState.yaw * 38}px, ${-stickState.throttle * 38}px)`
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                </div>
              </div>

              <div className="flex justify-between w-full text-[9px] font-mono text-slate-400 mt-2 font-bold px-1">
                <span>YAW</span>
                <span className="text-cyan-400">THR: {Math.round(stickState.throttle * 100)}%</span>
              </div>
            </div>

            {/* Transmitter Center Status Window */}
            <div className="flex flex-col items-center justify-center border-x border-slate-800 px-4 h-24 text-center font-mono">
              <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black">TRANSMITTER</span>
              <span className="text-[10px] text-emerald-400 font-extrabold mt-1 tracking-wider">ONLINE</span>
              <span className="text-[8px] text-slate-400 mt-2">SYS CALIB: OK</span>
              <span className="text-[8px] text-slate-400">RATE: {Math.round(useDroneStore.getState().gyroSensitivity * 100)}%</span>
            </div>

            {/* Right Stick: Pitch (Y) and Roll (X) */}
            <div id="tutorial-right-joystick" className="flex flex-col items-center relative z-10">
              <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase mb-2 font-black">Right Stick (Arrows)</span>
              
              <div className="w-24 h-24 bg-slate-950 rounded-full relative border-2 border-slate-800 flex items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)] overflow-hidden">
                {/* Concentric helper rings */}
                <div className="absolute w-16 h-16 rounded-full border border-slate-800/40 border-dashed" />
                <div className="absolute w-8 h-8 rounded-full border border-slate-800/60 border-dashed" />
                {/* Grid axes */}
                <div className="absolute w-px h-full bg-slate-800/60" />
                <div className="absolute h-px w-full bg-slate-800/60" />

                {/* Dynamic Vector Line Trail */}
                <svg className="absolute w-full h-full p-0 pointer-events-none" viewBox="0 0 100 100">
                  <line 
                    x1="50" 
                    y1="50" 
                    x2={50 + stickState.roll * 38} 
                    y2={50 + stickState.pitch * 38} 
                    stroke="#a78bfa" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    className="opacity-75"
                  />
                </svg>

                {/* Machined Metal Stick Handle */}
                <div 
                  className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-500/40 shadow-[0_4px_10px_rgba(0,0,0,0.7)] flex items-center justify-center transition-all duration-75"
                  style={{
                    transform: `translate(${stickState.roll * 38}px, ${stickState.pitch * 38}px)`
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa]" />
                </div>
              </div>

              <div className="flex justify-between w-full text-[9px] font-mono text-slate-400 mt-2 font-bold px-1">
                <span>ROLL</span>
                <span>PITCH</span>
              </div>
            </div>
          </div>
        ) : <div className="flex-1" />}

        {/* Right Side: Drone Motor Status Visualizer */}
        {showTelemetry ? (
          <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-2xl w-[280px] shadow-[0_8px_25px_rgba(0,0,0,0.02)] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase">Motor Diagnostics</span>
              <span id="tutorial-telemetry-flighttime" className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                TIME: {telemetry.flightTime}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              {telemetry.motorRPMs.map((rpm, idx) => {
                const cornerNames = ['MB (FL)', 'MA (FR)', 'MA (RL)', 'MB (RR)'];
                return (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg flex flex-col">
                    <span className="text-slate-400 dark:text-slate-550 text-[8px]">{cornerNames[idx]}</span>
                    <span className={`font-bold mt-0.5 ${rpm > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {rpm > 0 ? `${rpm.toLocaleString()} RPM` : 'STOPPED'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div id="tutorial-telemetry-altitude" className="flex justify-between items-center text-[10px] font-mono pt-1 text-slate-500 dark:text-slate-400">
              <span>ALTITUDE:</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">{telemetry.altitude.toFixed(2)}m</span>
            </div>
          </div>
        ) : <div className="w-[280px]" />}

      </div>

      {/* Pre-Flight Startup Checklist Overlay */}
      {isInitChecking && !droneInitFailed && modelLoadStatus !== 'failed' && (
        <div className="absolute inset-0 bg-slate-900/25 dark:bg-slate-950/50 backdrop-blur-md z-30 pointer-events-auto flex items-center justify-center font-mono">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-xl flex flex-col gap-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Pre-Flight Boot Diagnostics
              </span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">1. Model Loaded</span>
                {isModelLoaded ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">2. Physics Initialized</span>
                {!isModelLoaded ? (
                  <Circle className="w-4 h-4 text-slate-200 dark:text-slate-700" />
                ) : isPhysicsInitialized ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">3. Drone Spawned</span>
                {!isPhysicsInitialized ? (
                  <Circle className="w-4 h-4 text-slate-200 dark:text-slate-700" />
                ) : isDroneSpawned ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">4. Camera Auto-Focus</span>
                {!isDroneSpawned ? (
                  <Circle className="w-4 h-4 text-slate-200 dark:text-slate-700" />
                ) : isCameraLocked ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">5. Telemetry Ready</span>
                {!isCameraLocked ? (
                  <Circle className="w-4 h-4 text-slate-200 dark:text-slate-700" />
                ) : isTelemetryReady ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3 text-center uppercase tracking-wider">
              System locking controls...
            </div>
          </div>
        </div>
      )}

      {/* Drone Spawning/Initialization Failed Failsafe Screen */}
      {droneInitFailed && modelLoadStatus !== 'failed' && (
        <div className="absolute inset-0 bg-slate-900/35 dark:bg-slate-950/60 backdrop-blur-md z-40 pointer-events-auto flex items-center justify-center font-mono">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-xl flex flex-col items-center text-center gap-5">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-655 dark:text-red-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-md font-bold text-red-600 dark:text-red-450 uppercase tracking-widest">
                DRONE INITIALIZATION FAILED
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                The spawning sequence timed out or failed to verify coordinates. Flight controller armed states and mission academy controls are locked.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-left text-[9px] text-slate-600 dark:text-slate-400 w-full font-mono">
              <span className="text-red-600 dark:text-red-450 font-bold block mb-1">Fail Safe Log:</span>
              - GLB loaded: {isModelLoaded ? 'YES' : 'NO'}<br />
              - Physics initialized: {isPhysicsInitialized ? 'YES' : 'NO'}<br />
              - Drone spawned: {isDroneSpawned ? 'YES' : 'NO'}<br />
              - Camera lock status: {isCameraLocked ? 'LOCKED' : 'NOT FOUND'}<br />
              - Telemetry online: {isTelemetryReady ? 'YES' : 'NO'}
            </div>
            <button
              onClick={() => {
                useDroneStore.getState().setDroneInitFailed(false);
                useDroneStore.getState().setModelLoadStatus('loading');
                onReset();
              }}
              className="px-6 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/60 text-xs font-bold text-red-600 dark:text-red-400 rounded-lg transition shadow-sm w-full"
            >
              Force Reboot Simulator
            </button>
          </div>
        </div>
      )}

      {/* Spawn Debug Diagnostics Overlay */}
      {isSpawnDebugMode && droneSpawnDiagnostics && (
        <div className="absolute bottom-40 left-4 bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 p-4 rounded-xl w-72 shadow-lg pointer-events-auto z-20 font-mono text-[9px] text-slate-700 dark:text-slate-300 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5 justify-between">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
              <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Spawn Diagnostics</span>
            </div>
            <span className="text-[8px] bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 px-1 rounded text-blue-600 dark:text-blue-400 font-bold">DEBUG</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">Drone Position:</span>
              <span className="text-slate-800 dark:text-slate-200">
                [{droneSpawnDiagnostics.dronePos.map((v: number) => v.toFixed(3)).join(', ')}]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">Physics Position:</span>
              <span className="text-slate-800 dark:text-slate-200">
                [{droneSpawnDiagnostics.physicsPos.map((v: number) => v.toFixed(3)).join(', ')}]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">Model Center Offset:</span>
              <span className="text-slate-800 dark:text-slate-200">
                [{droneSpawnDiagnostics.modelPos.map((v: number) => v.toFixed(3)).join(', ')}]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">Bounding Box Min Y:</span>
              <span className="text-slate-800 dark:text-slate-200">{droneSpawnDiagnostics.boxMinY.toFixed(4)}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">Ground Level (Pad):</span>
              <span className="text-slate-800 dark:text-slate-200">0.005m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500">Physics Floor Limit:</span>
              <span className="text-slate-800 dark:text-slate-200">{droneSpawnDiagnostics.groundHeight.toFixed(3)}m</span>
            </div>
            {useDroneStore.getState().modelDiagnostics && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1 text-[8px] text-slate-400 dark:text-slate-500 space-y-1">
                <div>Model Meshes: {useDroneStore.getState().modelDiagnostics?.meshCount}</div>
                <div>Model Materials: {useDroneStore.getState().modelDiagnostics?.materialCount}</div>
                <div>Box Size: [{useDroneStore.getState().modelDiagnostics?.boundingBoxSize.map((v: number) => v.toFixed(2)).join(', ')}]</div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
