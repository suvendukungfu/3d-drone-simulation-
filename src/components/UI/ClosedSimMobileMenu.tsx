import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroneStore } from '../../store/useDroneStore';
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
} from 'lucide-react';

interface ClosedSimMobileMenuProps {
  onReset: () => void;
  onArm?: () => void;
  onDisarm?: () => void;
  onToggleAltHold: (active: boolean) => void;
  onRecenterCamera?: () => void;
  stickState: { throttle: number; yaw: number; pitch: number; roll: number };
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

// ─── Main Component ───────────────────────────────────────────────────────────
export function ClosedSimMobileMenu({
  onReset,
  onArm,
  onDisarm,
  onToggleAltHold,
  onRecenterCamera,
  stickState,
}: ClosedSimMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const telemetry = useDroneStore((s) => s.telemetry);
  const flightEnvironment = useDroneStore((s) => s.flightEnvironment);
  const setFlightEnvironment = useDroneStore((s) => s.setFlightEnvironment);
  const flightCameraView = useDroneStore((s) => s.flightCameraView);
  const setFlightCameraView = useDroneStore((s) => s.setFlightCameraView);
  const showTelemetryDashboard = useDroneStore((s) => s.showTelemetryDashboard);
  const toggleTelemetryDashboard = useDroneStore((s) => s.toggleTelemetryDashboard);
  const showControlsOverlay = useDroneStore((s) => s.showControlsOverlay);
  const toggleControlsOverlay = useDroneStore((s) => s.toggleControlsOverlay);
  const showChecklist = useDroneStore((s) => s.showChecklist);
  const toggleChecklist = useDroneStore((s) => s.toggleChecklist);
  const isAcademyMode = useDroneStore((s) => s.isAcademyMode);
  const modelLoadStatus = useDroneStore((s) => s.modelLoadStatus);
  const droneSpawnDiagnostics = useDroneStore((s) => s.droneSpawnDiagnostics);

  const setMode = useDroneStore((s) => s.setMode);
  const activeMissionIndex = useDroneStore((s) => s.activeMissionIndex);
  const missionStatus = useDroneStore((s) => s.missionStatus);
  const addNotification = useDroneStore((s) => s.addNotification);

  const isReady = modelLoadStatus === 'success' && droneSpawnDiagnostics !== null;

  const closedEnvs = ['room', 'lab', 'classroom', 'warehouse'] as const;
  const isClosedSim = closedEnvs.includes(flightEnvironment as any);

  // Only show on mobile in closed simulation
  if (!isClosedSim) return null;

  const getVoltage = (pct: number) => {
    const min = 9.9; const max = 12.6;
    return (min + (max - min) * (pct / 100)).toFixed(1);
  };

  const getBattColor = (pct: number) =>
    pct < 20 ? 'text-red-400' : pct < 40 ? 'text-amber-400' : 'text-emerald-400';

  const handleToggleHeadFree = () => {
    // HeadFree is controlled via flight mode; not a direct toggle but triggerable via key
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
  };

  const handleGoHome = () => {
    if (activeMissionIndex >= 0 && missionStatus !== 'passed') {
      addNotification('Please complete or abort the current lesson first.', 'warning');
      return;
    }
    close();
    setMode('home');
  };

  const close = () => setIsOpen(false);

  return (
    <>
      {/* ── Hamburger Button (always visible, top-left) ── */}
      <button
        id="closed-sim-menu-btn"
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-3.5 left-3.5 z-[60] w-12 h-12 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg hover:border-blue-500/50 hover:bg-slate-900 active:scale-90 transition-all duration-300 touch-manipulation group animate-pulse-cyan"
        aria-label="Open menu"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Menu className="w-5 h-5 text-white/80 group-hover:text-white transition-colors duration-300" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* ── Backdrop ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-[65] bg-black/60 backdrop-blur-[3px]"
              onClick={close}
            />

            {/* ── Drawer ── */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-[70] w-80 max-w-[85vw] flex flex-col bg-[#050814]/92 backdrop-blur-3xl border-r border-white/10 shadow-[8px_0_40px_rgba(0,0,0,0.6)]"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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

              {/* Home Navigation button */}
              <div className="px-4 py-3 shrink-0 border-b border-white/5">
                <button
                  onClick={handleGoHome}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[11px] font-extrabold uppercase tracking-widest transition-all duration-300 active:scale-[0.97]"
                >
                  <Home className="w-4 h-4" />
                  Exit to Home Page
                </button>
              </div>

              {/* Arm Status Badge */}
              <div className="px-4 py-3 shrink-0">
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

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3.5 scrollbar-thin">

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
                    <ActionBtn
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      label="Reset Drone"
                      onClick={() => { onReset(); close(); }}
                      variant="warning"
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
                      active={false}
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
              </div>

              {/* Footer */}
              <div className="px-4 py-4 border-t border-white/5 shrink-0 bg-[#02040b]/80">
                <p className="text-[9px] text-white/20 font-mono text-center uppercase tracking-widest font-semibold">
                  Pluto Controller — Closed Sim v1.0
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
