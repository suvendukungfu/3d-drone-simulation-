import { useState, useEffect, useRef } from 'react';
import { useDroneStore } from '../../store/useDroneStore';
import { 
  ShieldAlert, Cpu, RotateCcw, Battery, Activity, Info, AlertTriangle, CheckCircle, Circle, XCircle, Award
} from 'lucide-react';
import { MISSIONS } from './TrainingMissionSystem';

interface TelemetryDashboardProps {
  onReset: () => void;
  onCalibrate: () => void;
  onToggleAltHold: (active: boolean) => void;
  stickState: { throttle: number; yaw: number; pitch: number; roll: number };
  onArm?: () => void;
  onDisarm?: () => void;
}

export function TelemetryDashboard({ onReset, onCalibrate, onToggleAltHold, stickState, onArm, onDisarm }: TelemetryDashboardProps) {
  const telemetry = useDroneStore((state) => state.telemetry);
  const warnings = useDroneStore((state) => state.warnings);
  const showTelemetryDashboard = useDroneStore((state) => state.showTelemetryDashboard);
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
  const flightEnvironment = useDroneStore((state) => state.flightEnvironment);
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

  const isInitChecking = !(isModelLoaded && isPhysicsInitialized && isDroneSpawned && isCameraLocked && isTelemetryReady);

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
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col gap-2 items-center">
          {notifications.map((n) => {
            let bg = 'bg-slate-900/95 border-slate-800 text-slate-200';
            let icon = <Info className="w-4 h-4 text-blue-400" />;
            if (n.type === 'success') {
              bg = 'bg-emerald-950/90 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]';
              icon = <CheckCircle className="w-4 h-4" />;
            } else if (n.type === 'warning') {
              bg = 'bg-amber-950/90 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
              icon = <AlertTriangle className="w-4 h-4" />;
            } else if (n.type === 'error') {
              bg = 'bg-red-950/90 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]';
              icon = <XCircle className="w-4 h-4" />;
            }
            return (
              <div 
                key={n.id} 
                className={`flex items-center gap-2.5 px-4 py-2 border rounded-xl text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md shadow-2xl transition-all duration-300 ${bg}`}
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
        <div className="absolute top-20 left-4 bg-slate-950/95 border border-slate-800 p-4 rounded-xl w-64 shadow-2xl pointer-events-auto z-20 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <Award className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
              {MISSIONS[activeMissionIndex].title}
            </span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
            {MISSIONS[activeMissionIndex].objectives.map((obj, idx) => {
              const completed = missionObjectivesCompleted[idx];
              return (
                <div key={idx} className="flex gap-2 items-start text-[10px] leading-relaxed">
                  {completed ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
                  )}
                  <span className={completed ? "text-emerald-400 font-semibold" : "text-slate-400"}>{obj}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 1. TOP TELEMETRY RIBBON & SYSTEM STATE */}
      <div className="w-full flex justify-between items-start pointer-events-auto gap-4">
        
        {/* Left Side: Diagnostics and Calibration Status */}
        {showTelemetryDashboard ? (
          <div className="flex flex-col gap-2">
            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 p-3.5 rounded-xl flex items-center gap-4 shadow-2xl">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Avionics System</h2>
                {telemetry.calibrationActive ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                    <span className="text-[9px] font-mono text-amber-400">
                      CALIBRATING IMU ({Math.round(telemetry.altitude * 0 + 50)}%)
                    </span>
                  </div>
                ) : telemetry.sensorError ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    <span className="text-[9px] font-mono text-red-500 font-bold">CALIBRATION FAILED</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[9px] font-mono text-slate-400">ONLINE / CALIBRATED</span>
                  </div>
                )}
              </div>
            </div>

            {/* Environmental Selection Quick-Mat (6 environments) */}
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 p-2 rounded-xl flex gap-1 shadow-xl text-[9px] font-bold uppercase tracking-wider flex-wrap max-w-[320px]">
              {(['room', 'lab', 'classroom', 'warehouse', 'field', 'course'] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => setFlightEnvironment(env)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    flightEnvironment === env
                      ? 'bg-blue-600 border border-blue-500 text-white font-bold shadow-md shadow-blue-500/20'
                      : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-900/30'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>
        ) : <div className="w-64" />}

        {/* Center: Heading Tape & Artificial Horizon Pitch indicators */}
        {showTelemetryDashboard ? (
          <div className="flex flex-col items-center flex-1 max-w-[400px]">
            {/* Compass Ribbon */}
            <div className="w-full bg-slate-950/80 backdrop-blur-md border border-slate-800 h-12 rounded-xl relative overflow-hidden flex flex-col justify-between items-center shadow-lg pt-1">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
              
              {/* Heading value */}
              <div className="text-[10px] font-mono font-bold text-blue-400">
                {Math.round(telemetry.heading)}°
              </div>

              {/* Ticks window */}
              <div className="w-full h-6 relative overflow-hidden flex justify-center">
                {/* Center tick indicator pointer */}
                <div 
                  className="absolute left-1/2 -translate-x-1/2 bottom-0 w-2.5 h-2 bg-blue-500 z-10"
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
                      <div className="w-px h-1.5 bg-slate-700"></div>
                      {/* Tick label */}
                      <span className={`text-[9px] font-mono mt-0.5 ${isCardinal ? 'text-white font-bold' : 'text-slate-500'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick flight diagnostics overlay */}
            <div className="mt-2 px-3 py-1 bg-slate-950/60 border border-slate-800 rounded-full text-[9px] font-mono text-slate-400">
              SPEED: {telemetry.speed.toFixed(1)} m/s | V.RATE: {telemetry.verticalSpeed.toFixed(1)} m/s
            </div>
          </div>
        ) : <div className="flex-1" />}

        {/* Right Side: Battery, Arm State, Camera presets */}
        <div className="flex flex-col items-end gap-2">
          {/* Battery Status Panel */}
          {showTelemetryDashboard && (
            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 p-3 rounded-xl flex items-center gap-3.5 shadow-2xl">
              <div className="text-right">
                <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase block leading-none mb-1">
                  LIPO BATTERY
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {getVoltage(telemetry.battery)}V ({telemetry.battery}%)
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Battery className={`w-5 h-5 ${telemetry.battery < 20 ? 'animate-bounce text-red-500' : ''}`} />
              </div>
            </div>
          )}

          {/* Camera View Switcher with Camera Mode Indicator badge */}
          <div className="flex flex-col items-end gap-1.5">
            <div className="bg-blue-950/70 border border-blue-500/30 px-3 py-1 rounded-full text-[9px] font-mono font-bold text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.25)] uppercase tracking-wider">
              CAM VIEW: {flightCameraView}
            </div>
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 p-1 rounded-xl flex gap-1 shadow-xl text-[10px] font-bold uppercase tracking-wider">
              {(['chase', 'fpv', 'orbit'] as const).map((view, idx) => (
                <button
                  key={view}
                  onClick={() => setFlightCameraView(view)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    flightCameraView === view
                      ? 'bg-blue-600 border border-blue-500 text-white font-bold shadow-md shadow-blue-500/20'
                      : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-900/30'
                  }`}
                >
                  {`${idx + 1}:${view}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC SCREEN WARNING FLASHER (CENTER SCREEN) */}
      <div className="flex-1 flex flex-col justify-center items-center pointer-events-none">
        {warnings.length > 0 && (
          <div className="space-y-2.5 flex flex-col items-center">
            {warnings.map((warn) => (
              <div 
                key={warn} 
                className="bg-red-950/90 border-2 border-red-500 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-[0_0_40px_rgba(239,68,68,0.3)] animate-pulse"
              >
                <ShieldAlert className="w-6 h-6 text-red-400" />
                <span className="text-sm font-bold text-red-200 font-mono tracking-widest uppercase">
                  ALERT: {warn}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collapsible Digital Twin AppLink Panel */}
      <div 
        className={`absolute right-4 top-24 bottom-36 w-[280px] pointer-events-auto flex flex-col z-20 transition-all duration-350`}
        style={{
          transform: linkOpen ? 'translateX(0)' : 'translateX(242px)'
        }}
      >
        <div className="flex items-stretch h-full">
          {/* Collapse toggle tab */}
          <button 
            onClick={() => setLinkOpen(!linkOpen)}
            className="w-8 bg-slate-950/95 backdrop-blur-md border-l border-t border-b border-slate-800/80 hover:bg-slate-900 rounded-l-xl flex flex-col items-center justify-center text-slate-400 hover:text-white transition-all shadow-2xl"
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
          <div className="flex-1 bg-slate-950/90 backdrop-blur-md border border-slate-800/80 p-4 rounded-r-xl flex flex-col justify-between shadow-2xl overflow-hidden">
            <div className="space-y-4 flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  Twin AppLink
                </span>
                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  appLinkStatus === 'connected' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : appLinkStatus === 'connecting'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
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
                      ? 'bg-red-950/20 border-red-500/30 text-red-400 hover:bg-red-950/45'
                      : appLinkStatus === 'connecting'
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-400 cursor-not-allowed'
                        : 'bg-cyan-600/10 border-cyan-500 text-cyan-400 hover:bg-cyan-600/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  }`}
                >
                  {appLinkStatus === 'connecting' ? (
                    <>
                      <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </>
                  ) : appLinkStatus === 'connected' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>Disconnect Twin</span>
                    </>
                  ) : (
                    <span>Establish Twin Link</span>
                  )}
                </button>
              </div>

              {/* NMEA Scrolling Console */}
              <div className="flex-1 flex flex-col min-h-0">
                <span className="text-[8px] text-slate-500 font-mono tracking-wider uppercase mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                  $PXTWIN Serial Stream (10Hz)
                </span>
                <div 
                  ref={terminalRef}
                  className="flex-1 bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-[9px] text-cyan-400 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900 leading-normal"
                >
                  {appLinkStatus === 'connected' ? (
                    appTelemetryPackets.length > 0 ? (
                      [...appTelemetryPackets].reverse().map((pkt, idx) => (
                        <div key={idx} className="hover:bg-slate-900/40 truncate select-text py-0.5 border-b border-slate-900/20">
                          {pkt}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-600 animate-pulse italic">Waiting for telemetry frames...</div>
                    )
                  ) : appLinkStatus === 'connecting' ? (
                    <div className="text-amber-500 animate-pulse">Negotiating link layer handshake...</div>
                  ) : (
                    <div className="text-slate-700 italic font-light leading-relaxed">
                      Applink disconnected. Press "Establish Twin Link" to sync hardware telemetry packets.
                    </div>
                  )}
                </div>
              </div>

              {/* Sensor Health Status Indicator list */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <span className="text-[8px] text-slate-500 font-mono tracking-wider uppercase block">
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
                        <span className="text-slate-400">{sensor.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            status === 'ok' 
                              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' 
                              : status === 'calibrating' 
                                ? 'bg-amber-500 animate-pulse' 
                                : 'bg-red-500 animate-ping'
                          }`} />
                          <span className={
                            status === 'ok' 
                              ? 'text-emerald-400' 
                              : status === 'calibrating' 
                                ? 'text-amber-400' 
                                : 'text-red-500 font-bold'
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

      {/* 3. BOTTOM PILOT CONTROLS HUD */}
      <div className="w-full flex justify-between items-end pointer-events-auto gap-4">
        
        {/* Left Side: Flight Mode Controller panel & HUD Toggles */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl w-[280px] shadow-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Flight Settings</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              telemetry.isArmed ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'
            }`}>
              {telemetry.isArmed ? 'ARMED' : 'DISARMED'}
            </span>
          </div>

          {/* Mode selections */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Altitude Hold (Auto-Level)</span>
              <button 
                onClick={() => onToggleAltHold(!telemetry.flightMode.includes('stabilize'))}
                disabled={telemetry.flightMode === 'failsafe'}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  telemetry.flightMode === 'althold' ? 'bg-blue-650' : 'bg-slate-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  telemetry.flightMode === 'althold' ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
            
            <div className="flex justify-between text-[11px] font-mono pt-1 text-slate-500">
              <span>ACTIVE MODE:</span>
              <span className="text-blue-400 font-bold">{getFlightModeLabel(telemetry.flightMode)}</span>
            </div>
          </div>

          {/* HUD settings toggle buttons */}
          <div className="space-y-2 border-t border-slate-800 pt-2 text-[11px] text-slate-400 font-mono font-bold">
            <div className="flex justify-between items-center">
              <span>TELEMETRY HUD (T)</span>
              <button 
                onClick={toggleTelemetryDashboard}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${showTelemetryDashboard ? 'bg-blue-600' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${showTelemetryDashboard ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              <span>CONTROLS HUD (H)</span>
              <button 
                onClick={toggleControlsOverlay}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${showControlsOverlay ? 'bg-blue-600' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${showControlsOverlay ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <span>CHECKLIST HUD (C)</span>
              <button 
                onClick={toggleChecklist}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${showChecklist ? 'bg-blue-600' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${showChecklist ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <span>SPAWN DEBUG (G)</span>
              <button 
                onClick={useDroneStore.getState().toggleSpawnDebugMode}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${isSpawnDebugMode ? 'bg-cyan-600' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${isSpawnDebugMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-1 border-t border-slate-800 pt-2.5">
            <button
              onClick={() => {
                if (telemetry.isArmed) {
                  onDisarm?.();
                } else {
                  onArm?.();
                }
              }}
              disabled={isInitChecking || droneInitFailed}
              className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border w-full ${
                telemetry.isArmed
                  ? 'bg-red-950/20 border-red-500 text-red-400 hover:bg-red-650 hover:text-white shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                  : 'bg-emerald-600/10 border-emerald-500 text-emerald-400 hover:bg-emerald-600 hover:text-white shadow-[0_0_12px_rgba(16,185,129,0.2)] disabled:opacity-40 disabled:hover:bg-slate-900 disabled:hover:text-slate-500 disabled:border-slate-800 disabled:shadow-none'
              }`}
            >
              {telemetry.isArmed ? 'Disarm Drone (Space)' : 'Arm Drone (Space)'}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onCalibrate}
                disabled={telemetry.isArmed || isInitChecking}
                className="py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-[10px] font-bold uppercase tracking-wider rounded-lg text-slate-300 transition"
              >
                Calibrate
              </button>
              <button
                onClick={onReset}
                className="py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-[10px] font-bold uppercase tracking-wider rounded-lg text-red-400 transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Sim
              </button>
            </div>
          </div>
        </div>

        {/* Center: Live Transmitter Virtual Stick Visualizer */}
        {showControlsOverlay ? (
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-2xl flex gap-6 items-center">
            
            {/* Left Stick: Throttle (Y) and Yaw (X) */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase mb-1.5">Left Stick (W/S, A/D)</span>
              <div className="w-24 h-24 bg-slate-900 rounded-xl relative border border-slate-800 flex items-center justify-center">
                {/* Grid axes */}
                <div className="absolute w-px h-full bg-slate-800/50"></div>
                <div className="absolute h-px w-full bg-slate-800/50"></div>
                {/* Virtual stick handle with floating percentage */}
                <div 
                  className="absolute w-5 h-5 bg-blue-500 rounded-full border border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-75 flex items-center justify-center"
                  style={{
                    transform: `translate(${stickState.yaw * 38}px, ${-stickState.throttle * 76 + 38}px)`
                  }}
                >
                  <span className="absolute left-6 text-[10px] font-mono text-blue-400 font-bold whitespace-nowrap">
                    {Math.round(stickState.throttle * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between w-full text-[9px] font-mono text-slate-500 mt-1">
                <span>YAW</span>
                <span>THR: {Math.round(stickState.throttle * 100)}%</span>
              </div>
            </div>

            <div className="w-px h-20 bg-slate-800"></div>

            {/* Right Stick: Pitch (Y) and Roll (X) */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase mb-1.5">Right Stick (Arrows)</span>
              <div className="w-24 h-24 bg-slate-900 rounded-xl relative border border-slate-800 flex items-center justify-center">
                {/* Grid axes */}
                <div className="absolute w-px h-full bg-slate-800/50"></div>
                <div className="absolute h-px w-full bg-slate-800/50"></div>
                {/* Virtual stick handle */}
                <div 
                  className="absolute w-5 h-5 bg-blue-500 rounded-full border border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-75"
                  style={{
                    transform: `translate(${stickState.roll * 38}px, ${stickState.pitch * 38}px)`
                  }}
                />
              </div>
              <div className="flex justify-between w-full text-[9px] font-mono text-slate-500 mt-1">
                <span>ROLL</span>
                <span>PITCH</span>
              </div>
            </div>
          </div>
        ) : <div className="flex-1" />}

        {/* Right Side: Drone Motor Status Visualizer */}
        {showTelemetryDashboard ? (
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 p-4 rounded-2xl w-[280px] shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Motor Diagnostics</span>
              <span className="text-[9px] text-slate-400 font-mono">
                TIME: {telemetry.flightTime}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              {telemetry.motorRPMs.map((rpm, idx) => {
                const cornerNames = ['FL (CCW)', 'FR (CW)', 'RL (CW)', 'RR (CCW)'];
                return (
                  <div key={idx} className="bg-slate-900/50 border border-slate-800/80 p-1.5 rounded-lg flex flex-col">
                    <span className="text-slate-500 text-[8px]">{cornerNames[idx]}</span>
                    <span className={`font-bold mt-0.5 ${rpm > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                      {rpm > 0 ? `${rpm.toLocaleString()} RPM` : 'STOPPED'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono pt-1 text-slate-500">
              <span>ALTITUDE:</span>
              <span className="text-white font-bold">{telemetry.altitude.toFixed(2)}m</span>
            </div>
          </div>
        ) : <div className="w-[280px]" />}

      </div>

      {/* Pre-Flight Startup Checklist Overlay */}
      {isInitChecking && !droneInitFailed && modelLoadStatus !== 'failed' && (
        <div className="absolute inset-0 bg-[#070a13]/70 backdrop-blur-md z-30 pointer-events-auto flex items-center justify-center font-mono">
          <div className="bg-slate-950/90 border border-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col gap-6">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <Cpu className="w-5 h-5 text-blue-400 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Pre-Flight Boot Diagnostics
              </span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">1. Model Loaded</span>
                {isModelLoaded ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">2. Physics Initialized</span>
                {!isModelLoaded ? (
                  <Circle className="w-4 h-4 text-slate-800" />
                ) : isPhysicsInitialized ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">3. Drone Spawned</span>
                {!isPhysicsInitialized ? (
                  <Circle className="w-4 h-4 text-slate-800" />
                ) : isDroneSpawned ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">4. Camera Auto-Focus</span>
                {!isDroneSpawned ? (
                  <Circle className="w-4 h-4 text-slate-800" />
                ) : isCameraLocked ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">5. Telemetry Ready</span>
                {!isCameraLocked ? (
                  <Circle className="w-4 h-4 text-slate-800" />
                ) : isTelemetryReady ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-3 text-center uppercase tracking-wider">
              System locking controls...
            </div>
          </div>
        </div>
      )}

      {/* Drone Spawning/Initialization Failed Failsafe Screen */}
      {droneInitFailed && modelLoadStatus !== 'failed' && (
        <div className="absolute inset-0 bg-[#070a13]/85 backdrop-blur-md z-40 pointer-events-auto flex items-center justify-center font-mono">
          <div className="bg-red-950/45 border border-red-500/30 p-8 rounded-2xl w-full max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col items-center text-center gap-5">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-md font-bold text-red-400 uppercase tracking-widest">
                DRONE INITIALIZATION FAILED
              </h2>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                The spawning sequence timed out or failed to verify coordinates. Flight controller armed states and mission academy controls are locked.
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-900 p-3 rounded-lg text-left text-[9px] text-slate-500 w-full font-mono">
              <span className="text-red-500 font-bold block mb-1">Fail Safe Log:</span>
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
              className="px-6 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-800/30 text-xs font-bold text-red-400 rounded-lg transition"
            >
              Force Reboot Simulator
            </button>
          </div>
        </div>
      )}

      {/* Spawn Debug Diagnostics Overlay */}
      {isSpawnDebugMode && droneSpawnDiagnostics && (
        <div className="absolute bottom-40 left-4 bg-slate-950/95 border border-cyan-500/30 p-4 rounded-xl w-72 shadow-2xl pointer-events-auto z-20 font-mono text-[9px] text-cyan-400 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 border-b border-slate-900 pb-1.5 justify-between">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
              <span className="font-bold text-white uppercase tracking-wider">Spawn Diagnostics</span>
            </div>
            <span className="text-[8px] bg-cyan-950 border border-cyan-500/20 px-1 rounded text-cyan-300 font-bold">DEBUG</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Drone Position:</span>
              <span className="text-slate-300">
                [{droneSpawnDiagnostics.dronePos.map((v: number) => v.toFixed(3)).join(', ')}]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Physics Position:</span>
              <span className="text-slate-300">
                [{droneSpawnDiagnostics.physicsPos.map((v: number) => v.toFixed(3)).join(', ')}]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Model Center Offset:</span>
              <span className="text-slate-300">
                [{droneSpawnDiagnostics.modelPos.map((v: number) => v.toFixed(3)).join(', ')}]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bounding Box Min Y:</span>
              <span className="text-slate-300">{droneSpawnDiagnostics.boxMinY.toFixed(4)}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ground Level (Pad):</span>
              <span className="text-slate-300">0.005m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Physics Floor Limit:</span>
              <span className="text-slate-300">{droneSpawnDiagnostics.groundHeight.toFixed(3)}m</span>
            </div>
            {useDroneStore.getState().modelDiagnostics && (
              <div className="border-t border-slate-900 pt-1.5 mt-1 text-[8px] text-slate-500 space-y-1">
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
