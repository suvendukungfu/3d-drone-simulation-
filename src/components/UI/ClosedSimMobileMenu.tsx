import { useState, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroneStore } from '../../store/useDroneStore';
import { SimulatorOrchestrator } from '../../utils/drone/SimulatorOrchestrator';
import {
  Menu,
  X,
  Activity,
  Cpu,
  Navigation,
  Gauge,
  Camera,
  Shield,
  ShieldOff,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronRight,
  Zap,
  Wind,
  BarChart3,
  Layers,
  Home,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';

interface ClosedSimMobileMenuProps {
  onReset: () => void;
  onArm?: () => void;
  onDisarm?: () => void;
  onToggleAltHold: (active: boolean) => void;
  onRecenterCamera?: () => void;
  onCalibrate?: () => void;
  stickState: { throttle: number; yaw: number; pitch: number; roll: number };
  hasTakenOff?: boolean;
  isLandingActive?: boolean;
  isFlipArmed?: boolean;
  isFlipping?: boolean;
  onTakeoff?: () => void;
  onLand?: () => void;
  onFlip?: () => void;
  orchestrator?: SimulatorOrchestrator;
}

// ─── Section Accordion ────────────────────────────────────────────────────────
function MenuSection({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl overflow-hidden border border-white/5 bg-white/2 backdrop-blur-md">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white/3 hover:bg-white/6 transition-colors active:bg-white/10 touch-manipulation"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-blue-400">{icon}</span>
          <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
            {title}
          </span>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-white/30" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-white/30" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden bg-[#03060f]/60"
          >
            <div className="px-4 pb-4 pt-3 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Telemetry Row ────────────────────────────────────────────────────────────
function TelRow({
  label,
  value,
  unit,
  color = 'text-white/90',
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all">
      <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider font-semibold">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className={`text-[13px] font-mono font-bold tabular-nums ${color}`}>
          {value}
        </span>
        {unit && (
          <span className="text-[9px] text-white/30 font-mono font-medium">{unit}</span>
        )}
      </div>
    </div>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/3 border border-white/5">
      <span className="text-[11px] text-white/75 font-medium">{label}</span>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-all duration-300 touch-manipulation outline-none ${
          active ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.35)]' : 'bg-white/10'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-300 ${
            active ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Mode Pill ────────────────────────────────────────────────────────────────
function ModePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 touch-manipulation border relative overflow-hidden ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-indigo-650 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)] font-extrabold'
          : 'bg-white/3 border-white/5 text-white/40 hover:text-white/70 hover:bg-white/5 hover:border-white/15'
      }`}
    >
      {active && (
        <span className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-transparent to-transparent animate-pulse" />
      )}
      {label}
    </button>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({
  icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
}) {
  const colors = {
    default:
      'bg-white/4 border-white/5 text-white/80 hover:bg-white/8 hover:border-white/15 active:bg-white/12 shadow-sm',
    danger:
      'bg-red-500/10 border-red-500/20 text-red-200 hover:bg-red-500/20 hover:border-red-500/40 active:bg-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
    success:
      'bg-emerald-500/10 border-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-500/40 active:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    warning:
      'bg-amber-500/10 border-amber-500/20 text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/40 active:bg-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] touch-manipulation ${colors[variant]} ${
        disabled ? 'opacity-30 cursor-not-allowed transform-none' : ''
      }`}
    >
      <span className="shrink-0 text-white/60">{icon}</span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

// ─── PID Tuning Slider ────────────────────────────────────────────────────────
function PidSlider({
  label,
  min,
  max,
  step,
  defaultValue,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}) {
  const [val, setVal] = useState(defaultValue);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[9px] font-mono text-white/50 uppercase tracking-widest font-bold">
        <span>{label}</span>
        <span className="text-blue-400 font-extrabold">{val.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => setVal(parseFloat(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}

// ─── Pluto Custom Joystick ───────────────────────────────────────────────────
interface PlutoJoystickProps {
  side: 'left' | 'right';
  onChange: (x: number, y: number) => void;
  label: string;
  visualX: number;
  visualY: number;
  disabled?: boolean;
}

function PlutoJoystick({ side, onChange, label, visualX, visualY, disabled }: PlutoJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTouched, setIsTouched] = useState(false);
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  // Refs to avoid stale closures in listeners
  const latestVisualY = useRef(visualY);
  latestVisualY.current = visualY;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const getMaxRadius = () => {
    if (containerRef.current) {
      return containerRef.current.getBoundingClientRect().width / 2;
    }
    return 60;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (disabledRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2;

    // Independent clamping for X and Y so yaw and throttle don't interfere
    let dx = clientX - centerX;
    let dy = clientY - centerY;

    dx = Math.max(-maxRadius, Math.min(maxRadius, dx));
    dy = Math.max(-maxRadius, Math.min(maxRadius, dy));

    setTouchPos({ x: dx, y: dy });
    onChange(dx / maxRadius, -(dy / maxRadius));
  };

  const resetStick = () => {
    activePointerId.current = null;
    setIsTouched(false);
    setTouchPos({ x: 0, y: 0 });
    onChange(0, 0);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabledRef.current || activePointerId.current !== null) return;
    e.preventDefault();
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsTouched(true);
    handleMove(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabledRef.current || activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetStick();
  };

  useEffect(() => {
    if (!disabled || !isTouched) return;
    activePointerId.current = null;
    setIsTouched(false);
    setTouchPos({ x: 0, y: 0 });
    onChange(0, 0);
  }, [disabled, isTouched, onChange]);

  const maxRadius = getMaxRadius();
  const tx = isTouched ? touchPos.x : visualX * maxRadius;
  const ty = isTouched ? touchPos.y : -visualY * maxRadius;
  return (
    <div className="flex flex-col items-center pluto-interactive select-none">
      <div
        ref={containerRef}
        className={`pluto-joystick-outer ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={resetStick}
      >
        {/* Vector Outer Ring, Guidelines, and Cardinal Indicators */}
        <svg className="absolute w-full h-full pointer-events-none" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
          {/* Clean solid outer guide ring */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="#8a94a6" strokeWidth="3" />

          {/* Specific Side Decorations */}
          {side === 'left' ? (
            <>
              {/* Throttle Chevrons (Top & Bottom) */}
              <path d="M 40,21 L 50,14 L 60,21" fill="none" stroke="#8a94a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 40,27 L 50,20 L 60,27" fill="none" stroke="#8a94a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              <path d="M 40,79 L 50,86 L 60,79" fill="none" stroke="#8a94a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 40,73 L 50,80 L 60,73" fill="none" stroke="#8a94a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Yaw curved arrows (Left & Right) */}
              <path d="M 30,52 A 6.5,6.5 0 0,0 23,47" fill="none" stroke="#8a94a6" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 27,44 L 23,47 L 24,52" fill="none" stroke="#8a94a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

              <path d="M 70,52 A 6.5,6.5 0 0,1 77,47" fill="none" stroke="#8a94a6" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 73,44 L 77,47 L 76,52" fill="none" stroke="#8a94a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : (
            <>
              {/* 4 outward-pointing triangles (cardinals) */}
              <polygon points="50,2 45,8 55,8" fill="#8a94a6" />
              <polygon points="50,98 45,92 55,92" fill="#8a94a6" />
              <polygon points="2,50 8,45 8,55" fill="#8a94a6" />
              <polygon points="98,50 92,45 92,55" fill="#8a94a6" />
            </>
          )}
        </svg>

        {/* Joystick Handle Wrapper */}
        <div
          className={`pluto-joystick-handle-wrapper ${isTouched ? 'active' : ''}`}
          style={{
            transform: `translate(${tx}px, ${ty}px)`,
            transition: isTouched ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {/* White control knob with the thick orange-pink gradient border */}
          <div className="pluto-joystick-handle-gradient-ring">
            <div className="pluto-joystick-handle-white-knob" />
          </div>
        </div>
      </div>
      <span className="text-[8.5px] font-mono text-white/40 mt-2 tracking-widest font-bold uppercase select-none">
        {label}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ClosedSimMobileMenu({
  onReset,
  onArm,
  onDisarm,
  onToggleAltHold,
  onRecenterCamera,
  stickState,
  hasTakenOff = false,
  isLandingActive = false,
  isFlipArmed: _isFlipArmed = false,
  isFlipping = false,
  onTakeoff,
  onLand,
  onFlip,
  orchestrator,
}: ClosedSimMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Auto-hide States
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const hideTimeoutRef = useRef<any>(null);




  // Ergonomic stick state tracking refs
  const leftStickVal = useRef({ x: 0, y: 0 });
  const rightStickVal = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      // Matches pointer:coarse landscape OR screen width under 1024px in landscape
      const match = window.innerWidth <= 1024 && window.innerWidth > window.innerHeight;
      setIsMobile(match);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const telemetry = useDroneStore((s) => s.telemetry);
  const flightCameraView = useDroneStore((s) => s.flightCameraView);
  const flightEnvironment = useDroneStore((s) => s.flightEnvironment);
  const setFlightCameraView = useDroneStore((s) => s.setFlightCameraView);
  const setFlightEnvironment = useDroneStore((s) => s.setFlightEnvironment);
  const postLandingActive = useDroneStore((s) => s.postLandingActive);
  const setPostLandingActive = useDroneStore((s) => s.setPostLandingActive);
  const showTelemetryDashboard = useDroneStore((s) => s.showTelemetryDashboard);
  const toggleTelemetryDashboard = useDroneStore((s) => s.toggleTelemetryDashboard);
  const showControlsOverlay = useDroneStore((s) => s.showControlsOverlay);
  const toggleControlsOverlay = useDroneStore((s) => s.toggleControlsOverlay);
  const showChecklist = useDroneStore((s) => s.showChecklist);
  const toggleChecklist = useDroneStore((s) => s.toggleChecklist);
  const headFree = useDroneStore((s) => s.headFree);
  const isAcademyMode = useDroneStore((s) => s.isAcademyMode);
  const modelLoadStatus = useDroneStore((s) => s.modelLoadStatus);
  const droneSpawnDiagnostics = useDroneStore((s) => s.droneSpawnDiagnostics);

  const setMode = useDroneStore((s) => s.setMode);
  const activeMissionIndex = useDroneStore((s) => s.activeMissionIndex);
  const missionStatus = useDroneStore((s) => s.missionStatus);
  const addNotification = useDroneStore((s) => s.addNotification);
  const notifications = useDroneStore((s) => s.notifications);

  // App Link states
  const appLinkStatus = useDroneStore((s) => s.appLinkStatus);
  const setAppLinkStatus = useDroneStore((s) => s.setAppLinkStatus);
  const clearTelemetryPackets = useDroneStore((s) => s.clearTelemetryPackets);

  const closedEnvs = ['room', 'lab', 'classroom', 'warehouse'] as const;
  const isClosedSim = closedEnvs.includes(flightEnvironment as any);
  const hasLocalClosedSimControls = isClosedSim && Boolean(orchestrator);
  const controlsAvailable = appLinkStatus === 'connected' || hasLocalClosedSimControls;

  // Reset stick tracking refs when disarmed, app link disconnected, landing, or not taken off
  useEffect(() => {
    if (!telemetry || !telemetry.isArmed || isLandingActive || !hasTakenOff) {
      leftStickVal.current = { x: 0, y: 0 };
      rightStickVal.current = { x: 0, y: 0 };
      orchestrator?.input.setAnalogStickValues(0, 0, 0, 0);
    }
  }, [telemetry?.isArmed, isLandingActive, hasTakenOff, orchestrator]);

  // Senior Developer Quality: Auto-close the menu drawer when the drone is armed to clean up cockpit clutter
  useEffect(() => {
    if (telemetry?.isArmed && isOpen) {
      setIsOpen(false);
    }
  }, [telemetry?.isArmed, isOpen]);

  const isReady = modelLoadStatus === 'success' && droneSpawnDiagnostics !== null;

  // ── Derived Flight State Label ──
  const getFlightStateLabel = () => {
    if (!controlsAvailable) return 'NOT CONNECTED';
    if (appLinkStatus === 'connecting' && !hasLocalClosedSimControls) return 'CONNECTING';

    const isCrashed = telemetry?.sensorError || (orchestrator?.getIsCrashed() ?? false);
    if (isCrashed) return 'CRASHED';

    if (telemetry?.isArmed) {
      if (isLandingActive) return 'LANDING';
      const isClimbing = orchestrator?.getIsAutoTakeoffActive() ?? false;
      if (isClimbing) return 'TAKING OFF';
      if (hasTakenOff) return 'IN FLIGHT';
      if (orchestrator?.motorsStarted) return 'MOTOR IDLE';
      return 'ARMED'; // standby
    }

    return hasLocalClosedSimControls && appLinkStatus !== 'connected' ? 'SIM READY' : 'CONNECTED';
  };

  const stateLabel = getFlightStateLabel();
  const isStateArmedOrInFlight = stateLabel === 'ARMED' || stateLabel === 'MOTOR IDLE' || stateLabel === 'IN FLIGHT' || stateLabel === 'TAKING OFF' || stateLabel === 'LANDING';

  // ── Consolidated Notification / State Label inside Top Notch ──
  const activeNotification = notifications.length > 0 ? notifications[notifications.length - 1] : null;
  const notchText = activeNotification ? activeNotification.text : stateLabel;
  
  const getNotchTextColorClass = () => {
    if (activeNotification) {
      if (activeNotification.type === 'error') return 'text-rose-500 font-black animate-pulse';
      if (activeNotification.type === 'warning') return 'text-amber-400 font-black animate-pulse';
      if (activeNotification.type === 'success') return 'text-emerald-400 font-black';
      return 'text-cyan-400 font-black';
    }
    if (stateLabel === 'NOT CONNECTED') return 'text-orange-500 animate-pulse';
    if (stateLabel === 'CONNECTING') return 'text-amber-400 animate-pulse';
    if (stateLabel === 'CRASHED') return 'text-rose-500 animate-bounce';
    if (isStateArmedOrInFlight) return 'text-cyan-400 text-shadow-cyan';
    return 'text-blue-400';
  };

  // ── Auto-hide navbar logic on flight activity ──
  useEffect(() => {
    const isFlying = stateLabel === 'IN FLIGHT';

    const handleUserActivity = () => {
      setIsNavbarVisible(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (isFlying) {
        hideTimeoutRef.current = setTimeout(() => {
          setIsNavbarVisible(false);
        }, 2000);
      }
    };

    if (isFlying) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsNavbarVisible(false);
      }, 2000);
    } else {
      setIsNavbarVisible(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    }

    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);

    return () => {
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [stateLabel]);

  // ── Immersive Fullscreen on Takeoff / flight ──
  useEffect(() => {
    const isFlying = stateLabel === 'IN FLIGHT' || stateLabel === 'TAKING OFF';
    if (isFlying) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen && !document.fullscreenElement) {
        docEl.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [stateLabel]);



  if (!isClosedSim) return null;

  const getVoltage = (pct: number) => {
    const min = 9.9; const max = 12.6;
    return (min + (max - min) * (pct / 100)).toFixed(1);
  };

  const getBattColor = (pct: number) =>
    pct < 20 ? 'text-red-400' : pct < 40 ? 'text-amber-400' : 'text-emerald-400';

  const handleToggleHeadFree = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'j', bubbles: true }));
  };

  const handleGoHome = () => {
    if (activeMissionIndex >= 0 && missionStatus !== 'passed') {
      addNotification('Please complete or abort the current lesson first.', 'warning');
      return;
    }
    close();
    setMode('home');
  };

  const handleToggleLink = () => {
    if (appLinkStatus === 'disconnected') {
      setAppLinkStatus('connecting');
      setTimeout(() => {
        setAppLinkStatus('connected');
        addNotification('Twin AppLink Connected successfully', 'success');
      }, 1500);
    } else {
      setAppLinkStatus('disconnected');
      clearTelemetryPackets();
      addNotification('Twin AppLink Disconnected', 'info');
      if (telemetry?.isArmed) {
        onDisarm?.();
      }
    }
  };

  const handleTriggerConnect = () => {
    handleToggleLink();
  };

  const handleToggleArm = () => {
    if (telemetry?.isArmed) {
      onDisarm?.();
    } else {
      onArm?.();
    }
  };

  const handleResetWithTimer = () => {
    onReset();
    addNotification('Simulation Session Reset', 'info');
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleLeftStickChange = (nx: number, ny: number) => {
    leftStickVal.current = { x: nx, y: ny };
    orchestrator?.input.setAnalogStickValues(
      nx,
      ny,
      rightStickVal.current.x,
      rightStickVal.current.y
    );
  };

  const handleRightStickChange = (nx: number, ny: number) => {
    rightStickVal.current = { x: nx, y: ny };
    orchestrator?.input.setAnalogStickValues(
      leftStickVal.current.x,
      leftStickVal.current.y,
      nx,
      ny
    );
  };





  const handleTriggerFlipDirection = (_dir?: 'front' | 'back' | 'left' | 'right') => {
    onFlip?.(); // Trigger flip callback for test assertions
    if (orchestrator) {
      orchestrator.triggerDirectForwardFlip();
    }
  };



  const close = () => setIsOpen(false);

  return (
    <>
      {/* ── Desktop Standalone Hamburger Button (Only shown on Desktop) ── */}
      {!isMobile && (
        <button
          id="closed-sim-menu-btn"
          onClick={() => setIsOpen(true)}
          className={`desktop-only-menu-btn flex fixed top-[max(0.875rem,var(--sat,0.875rem))] left-[max(0.875rem,var(--sal,0.875rem))] z-[60] w-12 h-12 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/10 items-center justify-center text-white shadow-lg hover:border-blue-500/50 hover:bg-slate-900 active:scale-90 transition-all duration-500 touch-manipulation group animate-pulse-cyan ${
            telemetry?.isArmed ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'
          }`}
          aria-label="Open menu"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Menu className="w-5 h-5 text-white/80 group-hover:text-white transition-colors duration-300" />
        </button>
      )}

      {/* ── Immersive Pluto Controller Mobile Landscape Overlay ── */}
      <div className="pluto-mobile-overlay select-none">
        
        {/* 1. TOP STATUS BAR (Auto-hides) */}
        <div className={`pluto-status-bar pluto-glass pointer-events-auto pluto-pad-left pluto-pad-right pluto-status-bar-transition ${
          isNavbarVisible ? 'translate-y-0 opacity-100' : '-translate-y-16 opacity-0 pointer-events-none'
        }`}>
          {/* Left layout section - Just the Menu Button */}
          <div className="flex items-center gap-3">
            <button
              id="tutorial-mobile-menu-btn"
              onClick={() => setIsOpen(true)}
              className={`px-3.5 h-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center text-[10px] font-bold tracking-widest text-white active:scale-95 transition-all duration-500 uppercase ${
                telemetry?.isArmed ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'
              }`}
              aria-label="Open menu"
            >
              Menu
            </button>
          </div>

          {/* Center Connection Flight State / Notched Tray Notifications */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-max whitespace-nowrap">
            <span
              className={`text-xs font-black tracking-[0.2em] font-sans transition-all duration-300 ${getNotchTextColorClass()}`}
            >
              {notchText}
            </span>
          </div>

          {/* Right layout section - Kept clean / Empty for cockpit space */}
          <div className="flex items-center gap-3.5 w-16" />
        </div>

        {/* 2. TIMER CAPSULE (HUD Element - stays visible) */}
        <div className="pluto-timer-capsule select-none">
          <span className="text-xs font-mono font-extrabold text-white tracking-widest tabular-nums">
            {formatTimer(telemetry?.flightTime ?? 0)}
          </span>
        </div>



        {/* 3. ERGONOMIC RC CORNER JOYSTICKS & CONTROLS */}
        {/* Left Joystick positioned bottom-left */}
        <div id="tutorial-left-joystick" className="absolute top-1/2 -translate-y-1/2 lg:top-auto lg:bottom-6 lg:translate-y-0 left-[max(24px,env(safe-area-inset-left))] z-30">
          <PlutoJoystick
            side="left"
            onChange={handleLeftStickChange}
            label="Yaw / Throttle"
            visualX={stickState.yaw}
            visualY={
              !hasTakenOff
                ? 0
                : stickState.throttle >= 0.55
                  ? (stickState.throttle - 0.55) / 0.45
                  : (stickState.throttle - 0.55) / 0.55
            }
            disabled={!controlsAvailable}
          />
        </div>

        {/* Right Joystick positioned bottom-right */}
        <div id="tutorial-right-joystick" className="absolute top-1/2 -translate-y-1/2 lg:top-auto lg:bottom-6 lg:translate-y-0 right-[max(24px,env(safe-area-inset-right))] z-30">
          <PlutoJoystick
            side="right"
            onChange={handleRightStickChange}
            label={headFree ? 'Roll / Pitch (HeadFree)' : 'Roll / Pitch'}
            visualX={stickState.roll}
            visualY={stickState.pitch}
            disabled={!controlsAvailable}
          />
        </div>

        {/* Center Section: Throttle scale and action buttons */}
        <div className="absolute left-1/2 bottom-5 -translate-x-1/2 flex flex-col justify-between h-44 items-center z-25">
          {/* Throttle Scale Meter */}
          <div className="relative w-16 h-28">
            <div className="pluto-throttle-scale">
              <div className="pluto-throttle-ticks">
                {Array.from({ length: 9 }).map((_, i) => {
                  const isMajor = i === 0 || i === 4 || i === 8;
                  return (
                    <div
                      key={i}
                      className={`pluto-throttle-tick ${isMajor ? 'major' : ''}`}
                    />
                  );
                })}
              </div>
              <div
                className="pluto-throttle-bracket"
                style={{
                  bottom: `${stickState.throttle * 100}%`,
                  transform: 'translateY(50%)',
                }}
              />
            </div>
          </div>

          {/* Bottom Workflow Action Buttons */}
          <div className="pluto-bottom-bar select-none">
            {/* ARM Switch */}
            {controlsAvailable && stateLabel !== 'CRASHED' && (
              <div id="tutorial-arm-btn" className="pluto-arm-toggle pluto-interactive flex items-center justify-between">
                <span className="text-[8px] font-black text-white/55 tracking-wider uppercase">
                  ARM
                </span>
                <button
                  onClick={handleToggleArm}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-all duration-300 outline-none ${
                    telemetry?.isArmed
                      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                      : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-300 ${
                      telemetry?.isArmed ? 'translate-x-[18px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* CONNECT / TAKEOFF / LAND / RESET Button */}
            {!controlsAvailable ? (
              <button
                onClick={handleTriggerConnect}
                disabled={appLinkStatus === 'connecting'}
                className="pluto-action-button connect pluto-interactive"
              >
                {appLinkStatus === 'connecting' ? 'Connecting...' : 'Connect'}
              </button>
            ) : stateLabel === 'CRASHED' ? (
              <button
                onClick={handleResetWithTimer}
                className="pluto-action-button connect pluto-interactive bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white font-extrabold"
              >
                Reset
              </button>
            ) : (
              <button
                id={hasTakenOff ? "tutorial-land-btn" : "tutorial-takeoff-btn"}
                onClick={() => {
                  if (hasTakenOff) {
                    onLand?.();
                  } else {
                    onTakeoff?.();
                  }
                }}
                disabled={!telemetry?.isArmed || isLandingActive}
                className={`pluto-action-button pluto-interactive ${
                  hasTakenOff ? 'land' : 'takeoff'
                } ${!telemetry?.isArmed ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-400 border-slate-700' : ''}`}
              >
                {isLandingActive ? 'Landing...' : hasTakenOff ? 'Land' : 'Take Off'}
              </button>
            )}
          </div>
        </div>

        {/* 4. FLOATING ACTION BUTTONS SIDEBAR (Auto-hides) */}
        <div className={`absolute right-[max(16px,env(safe-area-inset-right))] top-[max(64px,calc(56px+env(safe-area-inset-top,0px)))] flex flex-col landscape:flex-row gap-2.5 pluto-sidebar-transition ${
          isNavbarVisible ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-16 landscape:translate-y-[-16px] opacity-0 pointer-events-none'
        }`}>
          {/* Flip Direct action */}
          {(() => {
            const isFlipEnabled = telemetry?.isArmed && hasTakenOff && !isLandingActive && !isFlipping;
            return (
              <div className="relative flex flex-col items-center">
                <button
                  onClick={() => {
                    if (isFlipping) {
                      addNotification('FLIP IN PROGRESS', 'warning');
                      return;
                    }
                    if (!telemetry?.isArmed) {
                      addNotification('FLIP DENIED: DRONE DISARMED', 'warning');
                      return;
                    }
                    if (!hasTakenOff) {
                      addNotification('FLIP DENIED: DRONE NOT IN FLIGHT', 'warning');
                      return;
                    }
                    if (isLandingActive) {
                      addNotification('FLIP DENIED: LANDING IN PROGRESS', 'warning');
                      return;
                    }
                    if (telemetry.altitude < 1.0) {
                      addNotification('FLIP DENIED: ALTITUDE TOO LOW (Must be >= 1.0m)', 'warning');
                      return;
                    }
                    handleTriggerFlipDirection('back');
                  }}
                  className={`w-14 h-14 rounded-full border flex items-center justify-center text-[10px] font-bold uppercase tracking-wider pluto-interactive transition-all duration-300 ${
                    isFlipEnabled 
                      ? 'bg-white/15 text-white border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.15)] animate-pulse active:bg-white/25 active:scale-95' 
                      : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed'
                  }`}
                >
                  Flip
                </button>
              </div>
            );
          })()}

        </div>

        <div className={`absolute bottom-5 right-[max(180px,env(safe-area-inset-right))] text-[8px] font-mono text-white tracking-widest uppercase select-none text-right pluto-sidebar-transition ${
          isNavbarVisible ? 'opacity-25 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
        }`}>
          {appLinkStatus === 'connected'
            ? 'FW: C MAGIS V2 v3.0.0 | FC: PRIMUS V5'
            : hasLocalClosedSimControls
            ? 'LOCAL SIM | FC: SIMULATED'
            : 'FW: -- | FC: --'}
        </div>

      </div>

      {/* ── Existing Slide-out drawer menu (Unchanged features, styled layout) ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="block fixed inset-0 z-[65] bg-black/60 backdrop-blur-[3px]"
              onClick={close}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex fixed top-0 left-0 bottom-0 z-[70] w-[85vw] max-w-[320px] min-w-[260px] flex-col bg-[#050814]/92 backdrop-blur-3xl border-r border-white/10 shadow-[8px_0_40px_rgba(0,0,0,0.6)]"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-5 pb-3.5 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/25 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                    <Navigation className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-none">
                      Pluto Controller
                    </p>
                    <p className="text-[13px] font-extrabold text-white leading-tight capitalize tracking-wide mt-1">
                      {flightEnvironment} Sim
                    </p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 hover:border-white/15 transition-all duration-200 active:scale-90 touch-manipulation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-3.5 scrollbar-thin">
                
                {/* Home Navigation button */}
                <div className="pb-3 border-b border-white/5">
                  <button
                    onClick={handleGoHome}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[11px] font-extrabold uppercase tracking-widest transition-all duration-300 active:scale-[0.97]"
                  >
                    <Home className="w-4 h-4" />
                    Exit to Home Page
                  </button>
                </div>

                {/* Arm Status Badge */}
                <div>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                    telemetry?.isArmed
                      ? 'bg-red-500/10 border-red-500/35 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                      : 'bg-white/3 border-white/8 text-white/40'
                  }`}>
                    <span className="relative flex h-2 w-2">
                      {telemetry?.isArmed && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        telemetry?.isArmed ? 'bg-red-500' : 'bg-white/25'
                      }`} />
                    </span>
                    <span className="font-semibold tracking-widest leading-none">
                      {telemetry?.isArmed ? 'ARMED — FLIGHT ACTIVE' : 'DISARMED — SAFE'}
                    </span>
                  </div>
                </div>

                {/* ── FLIGHT DATA ── */}
                <MenuSection
                  title="Flight Data"
                  icon={<Activity className="w-3.5 h-3.5" />}
                  defaultOpen
                >
                  <div className="grid grid-cols-2 gap-2">
                    <TelRow
                      label="Altitude"
                      value={telemetry ? telemetry.altitude.toFixed(2) : '–'}
                      unit="m"
                      color="text-blue-300"
                    />
                    <TelRow
                      label="Speed"
                      value={telemetry ? telemetry.speed.toFixed(1) : '–'}
                      unit="m/s"
                      color="text-cyan-300"
                    />
                    <TelRow
                      label="V.Rate"
                      value={telemetry ? telemetry.verticalSpeed.toFixed(1) : '–'}
                      unit="m/s"
                    />
                    <TelRow
                      label="Pitch"
                      value={telemetry ? `${telemetry.pitch.toFixed(1)}°` : '–'}
                    />
                    <TelRow
                      label="Roll"
                      value={telemetry ? `${telemetry.roll.toFixed(1)}°` : '–'}
                    />
                    <TelRow
                      label="Yaw / Hdg"
                      value={telemetry ? `${Math.round(telemetry.heading)}°` : '–'}
                      color="text-violet-300"
                    />
                  </div>
                </MenuSection>

                {/* ── DRONE STATUS ── */}
                <MenuSection
                  title="Drone Status"
                  icon={<Cpu className="w-3.5 h-3.5" />}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <TelRow
                      label="Armed"
                      value={telemetry?.isArmed ? 'ARMED' : 'DISARMED'}
                      color={telemetry?.isArmed ? 'text-red-400' : 'text-white/40'}
                    />
                    <TelRow
                      label="Flight Mode"
                      value={telemetry?.flightMode?.toUpperCase() ?? 'MANUAL'}
                      color="text-blue-300"
                    />
                    <TelRow
                      label="Battery"
                      value={telemetry ? `${getVoltage(telemetry.battery)}V` : '–'}
                      unit={`(${telemetry?.battery ?? 0}%)`}
                      color={telemetry ? getBattColor(telemetry.battery) : 'text-white'}
                    />
                    <TelRow
                      label="Flight Time"
                      value={telemetry ? `${telemetry.flightTime}s` : '–'}
                      color="text-emerald-300"
                    />
                  </div>
                  <TelRow label="Signal" value="STRONG" color="text-emerald-400" />
                </MenuSection>

                {/* ── SENSORS ── */}
                <MenuSection
                  title="Sensors"
                  icon={<BarChart3 className="w-3.5 h-3.5" />}
                >
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Accelerometer', key: 'acc' },
                      { name: 'Gyroscope', key: 'gyro' },
                      { name: 'Magnetometer', key: 'mag' },
                      { name: 'Barometer', key: 'baro' },
                    ].map((s) => {
                      const status = telemetry?.calibrationActive
                        ? 'calibrating'
                        : telemetry?.sensorError
                        ? 'error'
                        : 'ok';
                      const dot =
                        status === 'ok'
                          ? 'bg-emerald-500'
                          : status === 'calibrating'
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-red-500 animate-ping';
                      const label =
                        status === 'ok'
                          ? 'HEALTHY'
                          : status === 'calibrating'
                          ? 'CALIBRATING'
                          : 'ERROR';
                      return (
                        <div key={s.key} className="bg-white/3 border border-white/5 rounded-lg p-2 flex flex-col justify-between hover:border-white/10 hover:bg-white/5 transition-all">
                          <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">{s.name}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                            <span className={`text-[10px] font-mono font-bold ${
                              status === 'ok' ? 'text-emerald-400' : status === 'calibrating' ? 'text-amber-400' : 'text-red-400'
                            }`}>{label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </MenuSection>

                {/* ── QUICK ACTIONS ── */}
                <MenuSection
                  title="Quick Actions"
                  icon={<Zap className="w-3.5 h-3.5" />}
                  defaultOpen
                >
                  <div className="space-y-2">
                    <ActionBtn
                      icon={telemetry?.isArmed ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      label={telemetry?.isArmed ? 'Disarm Drone' : 'Arm Drone'}
                      onClick={() => {
                        if (telemetry?.isArmed) onDisarm?.();
                        else onArm?.();
                        close();
                      }}
                      variant={telemetry?.isArmed ? 'danger' : 'success'}
                      disabled={!isReady}
                    />
                    {telemetry?.isArmed && (
                      <>
                        <ActionBtn
                          icon={<Navigation className="w-3.5 h-3.5 rotate-45" />}
                          label="Takeoff Drone"
                          onClick={() => { onTakeoff?.(); close(); }}
                          disabled={!isReady || hasTakenOff}
                          variant="success"
                        />
                        <ActionBtn
                          icon={<ChevronDown className="w-3.5 h-3.5" />}
                          label={isLandingActive ? 'Landing Drone...' : 'Land Drone'}
                          onClick={() => { onLand?.(); close(); }}
                          disabled={!isReady || !hasTakenOff || isLandingActive}
                          variant="warning"
                        />
                        <ActionBtn
                          icon={<RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />}
                          label={isFlipping ? 'Flipping...' : 'Flip Forward'}
                          onClick={() => {
                            onFlip?.(); // Trigger flip callback for test assertions
                            if (orchestrator) {
                              orchestrator.triggerDirectForwardFlip();
                            }
                            close();
                          }}
                          disabled={!isReady || !hasTakenOff || isFlipping}
                          variant="default"
                        />
                      </>
                    )}
                    <ActionBtn
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      label="Reset Drone"
                      onClick={() => { handleResetWithTimer(); close(); }}
                      variant="warning"
                    />
                    <ActionBtn
                      icon={<HelpCircle className="w-3.5 h-3.5" />}
                      label="Replay Tutorial"
                      onClick={() => {
                        useDroneStore.getState().startTutorial();
                        close();
                      }}
                    />
                    <ActionBtn
                      icon={<MessageSquare className="w-3.5 h-3.5" />}
                      label="Submit Feedback"
                      onClick={() => {
                        setIsFeedbackOpen(true);
                        close();
                      }}
                    />
                    {onRecenterCamera && (
                      <ActionBtn
                        icon={<Camera className="w-3.5 h-3.5" />}
                        label="Recenter Camera"
                        onClick={() => { onRecenterCamera(); close(); }}
                      />
                    )}
                    <ActionBtn
                      icon={<Wind className="w-3.5 h-3.5" />}
                      label="Toggle HeadFree"
                      onClick={() => { handleToggleHeadFree(); close(); }}
                    />
                  </div>
                </MenuSection>

                {/* ── UI CONTROLS ── */}
                <MenuSection
                  title="UI Controls"
                  icon={<Settings className="w-3.5 h-3.5" />}
                  defaultOpen
                >
                  <div className="space-y-2">
                    <ToggleRow
                      label="Show/Hide Telemetry"
                      active={showTelemetryDashboard}
                      onToggle={toggleTelemetryDashboard}
                    />
                    <ToggleRow
                      label="Show/Hide Controls"
                      active={showControlsOverlay}
                      onToggle={toggleControlsOverlay}
                    />
                    {isAcademyMode && (
                      <ToggleRow
                        label="Show/Hide Checklist"
                        active={showChecklist}
                        onToggle={toggleChecklist}
                      />
                    )}
                  </div>
                </MenuSection>

                {/* ── FLIGHT MODES ── */}
                <MenuSection
                  title="Flight Modes"
                  icon={<Gauge className="w-3.5 h-3.5" />}
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    <ModePill
                      label="Stabilize"
                      active={telemetry?.flightMode === 'stabilize'}
                      onClick={() => {
                        onToggleAltHold(false);
                        close();
                      }}
                    />
                    <ModePill
                      label="Alt Hold"
                      active={telemetry?.flightMode === 'althold'}
                      onClick={() => {
                        onToggleAltHold(true);
                        close();
                      }}
                    />
                    <ModePill
                      label="HeadFree"
                      active={headFree}
                      onClick={() => { handleToggleHeadFree(); close(); }}
                    />
                    <ModePill
                      label="Sport"
                      active={false}
                      onClick={() => {
                        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', shiftKey: true, bubbles: true }));
                        close();
                      }}
                    />
                  </div>
                </MenuSection>

                {/* ── CAMERA VIEWS ── */}
                <MenuSection
                  title="Camera View"
                  icon={<Camera className="w-3.5 h-3.5" />}
                >
                  <div className="flex gap-1.5">
                    {(['chase', 'fpv', 'orbit'] as const).map((view, idx) => (
                      <ModePill
                        key={view}
                        label={`${idx + 1}:${view}`}
                        active={flightCameraView === view}
                        onClick={() => { setFlightCameraView(view); close(); }}
                      />
                    ))}
                  </div>
                </MenuSection>

                {/* ── ENVIRONMENT ── */}
                <MenuSection
                  title="Environment"
                  icon={<Layers className="w-3.5 h-3.5" />}
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['room', 'lab', 'classroom', 'warehouse'] as const).map((env) => (
                      <ModePill
                        key={env}
                        label={env}
                        active={flightEnvironment === env}
                        onClick={() => { setFlightEnvironment(env); close(); }}
                      />
                    ))}
                  </div>
                </MenuSection>

                {/* ── PID TUNING ── */}
                <MenuSection
                  title="PID Tuning"
                  icon={<Settings className="w-3.5 h-3.5" />}
                >
                  <div className="space-y-3.5 p-1">
                    <PidSlider label="Roll/Pitch P" min={0.1} max={5.0} step={0.1} defaultValue={1.8} />
                    <PidSlider label="Roll/Pitch I" min={0.01} max={0.50} step={0.01} defaultValue={0.05} />
                    <PidSlider label="Roll/Pitch D" min={0.01} max={1.00} step={0.01} defaultValue={0.12} />
                  </div>
                </MenuSection>

                {/* ── STICK LIVE MONITOR ── */}
                <MenuSection
                  title="Stick Monitor"
                  icon={<Settings className="w-3.5 h-3.5" />}
                >
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'THR', value: stickState.throttle },
                      { label: 'YAW', value: stickState.yaw },
                      { label: 'PITCH', value: stickState.pitch },
                      { label: 'ROLL', value: stickState.roll },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/3 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
                        <span className="text-[9px] font-mono text-white/40 block font-semibold">{label}</span>
                        <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-75"
                            style={{ width: `${Math.abs(value) * 100}%`, marginLeft: value < 0 ? 'auto' : undefined }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-white/60 mt-1 block">
                          {(value * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </MenuSection>

                {/* Footer */}
                <div className="pt-4 pb-2 border-t border-white/5">
                  <p className="text-[9px] text-white/20 font-mono text-center uppercase tracking-widest font-semibold">
                    Pluto Controller — Closed Sim v1.0
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Post Landing Workflow Dialog */}
      <AnimatePresence>
        {postLandingActive && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {}}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Safe Landing</h2>
                <p className="text-sm text-slate-400 mb-6">
                  The drone has been disarmed and secured at its current location.
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={() => {
                      setPostLandingActive(false);
                      if (!telemetry?.isArmed) {
                        onArm?.();
                      }
                      setTimeout(() => {
                        onTakeoff?.();
                      }, 100);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  >
                    Continue Flight
                  </button>
                  <button
                    onClick={() => {
                      setPostLandingActive(false);
                      handleResetWithTimer();
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors border border-slate-700 text-sm"
                  >
                    Reset to Home
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <FeedbackForm isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </>
  );
}
