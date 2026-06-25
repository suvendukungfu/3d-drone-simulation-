import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useDroneStore } from '../../store/useDroneStore';
import { 
  Gamepad2, Cpu, GraduationCap, Camera, Box, X, 
  Database, ClipboardList, ArrowRight
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   ANIMATION VARIANTS — Orchestrated entrance system
   ═══════════════════════════════════════════════════════════════ */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardSlide = {
  hidden: { opacity: 0, x: -12, filter: 'blur(4px)' },
  visible: {
    opacity: 1, x: 0, filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const showcaseReveal = {
  hidden: { opacity: 0, scale: 0.88, filter: 'blur(12px)' },
  visible: {
    opacity: 1, scale: 1, filter: 'blur(0px)',
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 },
  },
};

/* ═══════════════════════════════════════════════════════════════
   SPOTLIGHT HOOK — Mouse-following ambient glow
   ═══════════════════════════════════════════════════════════════ */
function useSpotlight() {
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const springX = useSpring(x, { damping: 25, stiffness: 150 });
  const springY = useSpring(y, { damping: 25, stiffness: 150 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [x, y]);

  return { x: springX, y: springY };
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function IntroOverlay() {
  const isFlightSimModalOpen = useDroneStore((state) => state.isFlightSimModalOpen);
  const setFlightSimModalOpen = useDroneStore((state) => state.setFlightSimModalOpen);
  const setARActive = useDroneStore((state) => state.setARActive);
  const setMode = useDroneStore((state) => state.setMode);
  const selectMission = useDroneStore((state) => state.selectMission);

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      const isTouchOrMobile = (window.innerWidth <= 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
      setIsMobileDevice(isTouchOrMobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const spotlight = useSpotlight();
  const spotlightX = useTransform(spotlight.x, (v) => v - 300);
  const spotlightY = useTransform(spotlight.y, (v) => v - 300);

  // Mouse tilt variables for showcase frame
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const transX = useMotionValue(0);
  const transY = useMotionValue(0);

  const tiltXSpring = useSpring(tiltX, { stiffness: 120, damping: 20 });
  const tiltYSpring = useSpring(tiltY, { stiffness: 120, damping: 20 });
  const transXSpring = useSpring(transX, { stiffness: 120, damping: 20 });
  const transYSpring = useSpring(transY, { stiffness: 120, damping: 20 });

  const handleShowcaseMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Max rotation 12deg, Max translation 10px
    tiltX.set(-(y / (rect.height / 2)) * 12);
    tiltY.set((x / (rect.width / 2)) * 12);
    transX.set((x / (rect.width / 2)) * 10);
    transY.set((y / (rect.height / 2)) * 10);
  };

  const handleShowcaseMouseLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
    transX.set(0);
    transY.set(0);
  };

  const handleEnterFlightSim = () => { setFlightSimModalOpen(true); };
  const handleExploreAnatomy = () => { setMode('explore'); };
  const handleLearnToFly = () => {
    setMode('flight');
    selectMission(-1);
    const store = useDroneStore.getState();
    store.setAcademyMode(true);
    if (!store.isAcademyOpen) store.toggleAcademy();
  };
  const startARMode = () => { setFlightSimModalOpen(false); setARActive(true); };
  const startClosedSim = () => {
    setFlightSimModalOpen(false);
    setMode('flight');
    selectMission(-1);
    const store = useDroneStore.getState();
    store.setAcademyMode(false);
    if (store.isAcademyOpen) store.toggleAcademy();
  };

  const clickedCount = useDroneStore((state) => state.clickedParts?.length || 0);
  const unlockedCount = useDroneStore((state) => state.unlockedLevels?.filter(Boolean).length || 1);
  const appLinkStatus = useDroneStore((state) => state.appLinkStatus);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-20 pointer-events-auto flex flex-col overflow-y-auto md:overflow-hidden select-none bg-[#FAFBFD] dark:bg-[#07080e]"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}
    >

      {/* ═══ GLOBAL INLINE STYLES ═════════════════════════════════ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gradient-rotate {
          0% { --angle: 0deg; }
          100% { --angle: 360deg; }
        }
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .animated-border {
          animation: gradient-rotate 8s linear infinite;
          background: conic-gradient(from var(--angle),
            rgba(59,130,246,0.15),
            rgba(99,102,241,0.08),
            rgba(6,182,212,0.15),
            rgba(59,130,246,0.04),
            rgba(99,102,241,0.15),
            rgba(59,130,246,0.15)
          );
        }
        .dark .animated-border {
          background: conic-gradient(from var(--angle),
            rgba(6,182,212,0.25),
            rgba(59,130,246,0.1),
            rgba(168,85,247,0.2),
            rgba(6,182,212,0.05),
            rgba(59,130,246,0.2),
            rgba(6,182,212,0.25)
          );
        }
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .card-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 55%, transparent 100%);
          transform: translateX(-100%);
          transition: none;
          pointer-events: none;
        }
        .card-shimmer:hover::after {
          animation: shimmer-sweep 0.8s ease-out;
        }
        .noise-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.015'/%3E%3C/svg%3E");
          background-repeat: repeat;
        }
        .dark .noise-overlay {
          opacity: 0.4;
        }

        /* Radar & Waypoint Animations */
        @keyframes slow-radar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes waypoint-pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .animate-radar-sweep {
          transform-origin: center;
          animation: slow-radar 120s linear infinite;
        }
        .pulse-ring {
          transform-origin: center;
          animation: waypoint-pulse 4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }

        /* Animated Drone Keyframes */
        @keyframes patrol-horizontal {
          0% { transform: translate(250px, 150px) scale(0.55) rotate(90deg); }
          45% { transform: translate(950px, 150px) scale(0.55) rotate(90deg); }
          50% { transform: translate(950px, 150px) scale(0.55) rotate(270deg); }
          95% { transform: translate(250px, 150px) scale(0.55) rotate(270deg); }
          100% { transform: translate(250px, 150px) scale(0.55) rotate(450deg); }
        }
        @keyframes path-follow-1 {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
        @keyframes path-follow-2 {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hover-drift {
          0% { transform: translate(450px, 800px) scale(1.30) rotate(0deg); }
          20% { transform: translate(458px, 792px) scale(1.30) rotate(2deg); }
          40% { transform: translate(442px, 805px) scale(1.30) rotate(-3deg); }
          60% { transform: translate(455px, 808px) scale(1.30) rotate(1deg); }
          80% { transform: translate(446px, 795px) scale(1.30) rotate(-1deg); }
          100% { transform: translate(450px, 800px) scale(1.30) rotate(0deg); }
        }
        .drone-silhouette { transition: color 0.3s; }
        .drone-1 { color: #2563eb; opacity: 0.55; animation: patrol-horizontal 28s ease-in-out infinite; }
        .drone-2 { color: #2563eb; opacity: 0.65; offset-path: path('M 100,100 C 600,-50 1100,400 1800,150'); offset-rotate: auto 90deg; animation: path-follow-1 32s ease-in-out infinite alternate; }
        .drone-3 { color: #2563eb; opacity: 0.50; animation: orbit-spin 26s linear infinite; transform-origin: 0px 0px; }
        .drone-4 { color: #2563eb; opacity: 0.72; animation: hover-drift 22s ease-in-out infinite; }
        .drone-5 { color: #2563eb; opacity: 0.60; offset-path: path('M 150,950 C 450,600 1350,900 1750,100'); offset-rotate: auto 90deg; animation: path-follow-2 38s ease-in-out infinite alternate; }
        .dark .drone-1 { color: #06b6d4; opacity: 0.75; }
        .dark .drone-2 { color: #06b6d4; opacity: 0.88; }
        .dark .drone-3 { color: #06b6d4; opacity: 0.67; }
        .dark .drone-4 { color: #06b6d4; opacity: 0.96; }
        .dark .drone-5 { color: #06b6d4; opacity: 0.80; }
      ` }} />

      {/* ═══ LAYER 0: Noise texture ═══════════════════════════════ */}
      <div className="absolute inset-0 noise-overlay pointer-events-none z-[1]" />

      {/* ═══ LAYER 1: Ambient gradients ═══════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[25%] w-[60%] h-[65%] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.07),transparent_65%)]" />
        <div className="absolute bottom-[-15%] right-[-8%] w-[50%] h-[55%] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.03),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.04),transparent_65%)]" />
        <div className="absolute top-[40%] left-[-10%] w-[35%] h-[40%] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.02),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.03),transparent_70%)]" />
      </div>

      {/* ═══ LAYER 2: Blueprint dot-matrix ════════════════════════ */}
      <div className="absolute inset-0 bg-blueprint-grid pointer-events-none" />

      {/* ═══ LAYER 3: Mouse spotlight (desktop only) ══════════════ */}
      {!isMobileDevice && (
        <motion.div
          className="fixed w-[600px] h-[600px] rounded-full pointer-events-none z-[2]"
          style={{
            x: spotlightX,
            y: spotlightY,
            background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)',
          }}
        />
      )}

      {/* ═══ LAYER 4: Aerospace background SVG ════════════════════ */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none opacity-[0.16] dark:opacity-[0.10]">
        <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" className="w-full h-full text-slate-500/10 dark:text-cyan-500/10 fill-none">
          <defs>
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
            </linearGradient>
            <g id="drone-silhouette" fill="none">
              <line x1="-12" y1="-12" x2="-35" y2="-35" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12" y1="-12" x2="35" y2="-35" stroke="currentColor" strokeWidth="1.5" />
              <line x1="-12" y1="12" x2="-35" y2="35" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12" y1="12" x2="35" y2="35" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="-35" cy="-35" r="13" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="35" cy="-35" r="13" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="-35" cy="35" r="13" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="35" cy="35" r="13" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="-35" cy="-35" r="3" fill="currentColor" />
              <circle cx="35" cy="-35" r="3" fill="currentColor" />
              <circle cx="-35" cy="35" r="3" fill="currentColor" />
              <circle cx="35" cy="35" r="3" fill="currentColor" />
              <rect x="-10" y="-18" width="20" height="36" rx="8" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
              <path d="M -4,-18 L 4,-18 L 2,-23 L -2,-23 Z" fill="currentColor" />
              <circle cx="0" cy="-21" r="1.2" fill="white" />
            </g>
          </defs>

          {/* Radar */}
          <g transform="translate(960, 540)">
            <circle cx="0" cy="0" r="380" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
            <circle cx="0" cy="0" r="580" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
            <line x1="-620" y1="0" x2="620" y2="0" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            <line x1="0" y1="-620" x2="0" y2="620" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            <g className="animate-radar-sweep">
              <line x1="0" y1="0" x2="580" y2="0" stroke="currentColor" strokeWidth="0.8" opacity="0.8" />
              <path d="M 0,0 L 560,-150 A 580,580 0 0,0 580,0 Z" fill="url(#radarGradient)" opacity="0.25" />
            </g>
          </g>

          {/* Flight Trajectory Curves */}
          <path d="M 100,100 C 600,-50 1100,400 1800,150" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.5" />
          <path d="M 150,950 C 450,600 1350,900 1750,100" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.5" />

          {/* Waypoints */}
          {[
            { x: 100, y: 100, label: 'WP-01 [ALT: 2.0m]', lx: 10 },
            { x: 960, y: 240, label: 'WP-02 [ALT: 12.4m]', lx: 10 },
            { x: 1800, y: 150, label: 'WP-03 [END_HOLD]', lx: -95 },
            { x: 150, y: 950, label: 'NAV-START', lx: 10 },
            { x: 900, y: 750, label: 'NAV-CORR_01', lx: 10 },
            { x: 1750, y: 100, label: 'NAV-TARGET', lx: -80 },
          ].map((wp, i) => (
            <g key={i} transform={`translate(${wp.x}, ${wp.y})`} opacity="0.6">
              <circle cx="0" cy="0" r="4" fill="currentColor" />
              <circle cx="0" cy="0" r="4" stroke="currentColor" strokeWidth="1" className="pulse-ring" />
              <text x={wp.lx} y="4" fontSize="8" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.8">{wp.label}</text>
            </g>
          ))}

          {/* Technical graphics */}
          <g transform="translate(1700, 260)" opacity="0.5" stroke="currentColor" fill="none">
            <text x="0" y="-15" fontSize="8" fontFamily="monospace" stroke="none" fill="currentColor" opacity="0.6">IMU ACCELEROMETER/GYRO</text>
            <line x1="0" y1="0" x2="40" y2="0" strokeWidth="0.8" />
            <line x1="0" y1="0" x2="0" y2="-40" strokeWidth="0.8" />
            <line x1="0" y1="0" x2="-25" y2="25" strokeWidth="0.8" />
            <text x="45" y="2" fontSize="7" fontFamily="monospace" stroke="none" fill="currentColor">X</text>
            <text x="-2" y="-45" fontSize="7" fontFamily="monospace" stroke="none" fill="currentColor">Y</text>
            <text x="-32" y="32" fontSize="7" fontFamily="monospace" stroke="none" fill="currentColor">Z</text>
          </g>
          <g transform="translate(180, 700)" opacity="0.5" stroke="currentColor" fill="none">
            <text x="0" y="-15" fontSize="8" fontFamily="monospace" stroke="none" fill="currentColor" opacity="0.6">FLIGHT LEVEL CONTROLLER CONFIG</text>
            <rect x="0" y="0" width="80" height="50" rx="4" strokeWidth="0.8" />
            <text x="6" y="15" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">Kp: 1.25</text>
            <text x="6" y="27" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">Ki: 0.04</text>
            <text x="6" y="39" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">Kd: 0.12</text>
            <text x="46" y="15" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">ROLL: OK</text>
            <text x="46" y="27" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">PTCH: OK</text>
            <text x="46" y="39" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">YAW: OK</text>
          </g>

          {/* Animated Drones */}
          <g className="drone-1"><use href="#drone-silhouette" /></g>
          <g className="drone-2"><use href="#drone-silhouette" transform="scale(0.90)" /></g>
          <g transform="translate(960, 540)"><g className="drone-3"><use href="#drone-silhouette" transform="translate(380, 0) rotate(90deg) scale(0.70)" /></g></g>
          <g className="drone-4"><use href="#drone-silhouette" /></g>
          <g className="drone-5"><use href="#drone-silhouette" transform="scale(1.65)" /></g>
        </svg>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CONTENT LAYER
          ═══════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">

        {/* ── NAVBAR ──────────────────────────────────────────────── */}
        <header className="w-full flex justify-between items-center relative z-30 pointer-events-auto max-w-[1320px] mx-auto px-6 md:px-10 lg:px-14 pt-6 pb-2 md:pt-7 md:pb-0">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center"
          >
            <img 
              src="/drona_logo.png" 
              alt="Drona Aviation Logo" 
              className="h-[32px] w-auto object-contain dark:invert select-none opacity-80 hover:opacity-100 transition-opacity duration-400" 
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="hidden md:flex items-center gap-3 text-[10px] font-mono text-slate-400 dark:text-slate-500 tracking-wider select-none"
          >
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-slate-500 dark:text-slate-400">SYS ONLINE</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">│</span>
            <span className="text-slate-400 dark:text-slate-600">v4.2.1</span>
          </motion.div>
        </header>

        {/* ── HERO SPLIT-SCREEN GRID ─────────────────────────────── */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-y-8 md:gap-y-0 md:gap-x-8 lg:gap-x-12 xl:gap-x-16 items-center w-full max-w-[1320px] mx-auto px-6 md:px-10 lg:px-14 relative overflow-visible pointer-events-auto">
          
          {/* ── LEFT COLUMN ──────────────────────────────────────── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full md:col-span-5 flex flex-col justify-center space-y-5 md:space-y-8 text-left py-4 md:py-0 order-1"
          >
            {/* Eyebrow badge */}
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2.5 px-3.5 py-[7px] rounded-full bg-gradient-to-r from-blue-500/[0.06] to-indigo-500/[0.04] dark:from-cyan-500/[0.08] dark:to-blue-500/[0.05] border border-blue-200/30 dark:border-cyan-700/25 text-[10px] font-semibold tracking-[0.16em] text-blue-600 dark:text-cyan-400 uppercase select-none backdrop-blur-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 dark:bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500 dark:bg-cyan-400" />
                </span>
                Aerospace Training Platform
              </span>
            </motion.div>
            
            {/* Title */}
            <motion.div variants={fadeUp} className="space-y-3.5 md:space-y-5">
              <h1 className="text-[2.2rem] sm:text-[2.65rem] lg:text-[3.15rem] font-bold tracking-[-0.03em] leading-[1.08] text-slate-900 dark:text-white">
                Professional Drone Pilot<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 dark:from-cyan-400 dark:via-blue-400 dark:to-teal-400 font-extrabold">Training Platform</span>
              </h1>
              
              <p className="text-[13px] md:text-[14px] text-slate-500 dark:text-slate-400 leading-[1.75] font-[400] max-w-[440px] tracking-[-0.005em]">
                Welcome to the pilot academy for Drona Aviation's flagship PlutoX nano-drone. Dissect 3D avionics systems, perform hardware-in-the-loop diagnostics, and master flight controllers inside our high-fidelity physics simulator.
              </p>
            </motion.div>

            {/* Mobile-only Drone Showcase */}
            <motion.div 
              variants={fadeUp}
              className="block md:hidden w-full flex justify-center py-2 my-1"
            >
              <div className="w-full max-w-[280px] sm:max-w-[320px] aspect-[4/3] relative flex items-center justify-center rounded-2xl border border-slate-200/40 dark:border-slate-800/20 bg-white/40 dark:bg-[#0a0c14]/40 backdrop-blur-md overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                {/* Concentric engineering rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                  <div className="w-[85%] h-[85%] border border-dashed border-blue-400 dark:border-cyan-500 rounded-full animate-[spin_180s_linear_infinite]" />
                  <div className="absolute w-[55%] h-[55%] border border-slate-300 dark:border-slate-700 rounded-full" />
                </div>
                
                {/* Inner blueprint grid */}
                <div className="absolute inset-0 bg-blueprint-grid opacity-[0.08] dark:opacity-[0.04] pointer-events-none" />

                {/* Laser scan line */}
                <div className="absolute inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent dark:via-cyan-400/60 shadow-[0_0_8px_1px_rgba(59,130,246,0.3)] dark:shadow-[0_0_8px_1px_rgba(6,182,212,0.4)] animate-scan-laser pointer-events-none z-20" />

                {/* Ground shadow */}
                <div className="absolute bottom-[16%] left-1/2 w-[140px] h-[12px] pointer-events-none" style={{ transform: 'translateX(-50%) rotateX(75deg)' }}>
                  <div className="w-full h-full bg-slate-900/5 dark:bg-black/20 rounded-full blur-md animate-shadow-pulse" />
                </div>

                {/* Floating Drone Image */}
                <div className="absolute z-10 w-[65%] aspect-square flex items-center justify-center pointer-events-none animate-float-drone select-none">
                  <img
                    src="/plutox_new_home.png"
                    alt="PlutoX Nano Drone"
                    className="w-full h-auto object-contain select-none filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.05)] dark:drop-shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
                  />
                </div>
              </div>
            </motion.div>

            {/* ── CTA CARDS ──────────────────────────────────────── */}
            <motion.div variants={containerVariants} className="flex flex-col gap-2">

              {/* Card 1: Enter Flight Sim */}
              <motion.button
                variants={cardSlide}
                whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 17 } }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEnterFlightSim}
                className="card-shimmer w-full flex items-center justify-between px-4 py-[14px] rounded-[14px] border border-slate-200/50 dark:border-slate-800/40 bg-white/70 dark:bg-white/[0.025] backdrop-blur-md hover:bg-white/90 dark:hover:bg-white/[0.05] hover:border-blue-300/50 dark:hover:border-cyan-700/40 hover:shadow-[0_8px_32px_-6px_rgba(59,130,246,0.12)] dark:hover:shadow-[0_8px_32px_-6px_rgba(6,182,212,0.15)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group text-left relative overflow-hidden"
              >
                <div className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full bg-transparent group-hover:bg-gradient-to-b group-hover:from-blue-400 group-hover:to-indigo-500 dark:group-hover:from-cyan-400 dark:group-hover:to-blue-500 transition-all duration-400" />
                
                <div className="flex items-center gap-3.5 w-full relative z-[1]">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-cyan-400 group-hover:bg-blue-50 dark:group-hover:bg-cyan-950/30 group-hover:border-blue-200/50 dark:group-hover:border-cyan-800/30 transition-all duration-300 shrink-0 group-hover:shadow-[0_0_20px_-4px_rgba(59,130,246,0.2)] dark:group-hover:shadow-[0_0_20px_-4px_rgba(6,182,212,0.25)]">
                    <Gamepad2 className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-slate-800 dark:text-white leading-none tracking-[-0.01em]">Enter Flight Sim</span>
                      <span className="text-[8.5px] font-mono font-semibold px-1.5 py-[3px] rounded-md bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 uppercase tracking-wider leading-none">
                        {appLinkStatus === 'connected' ? 'Link Active' : 'Ready'}
                      </span>
                    </div>
                    <span className="text-[11.5px] text-slate-450 dark:text-slate-500 mt-1.5 block truncate leading-normal">
                      AR passthrough overlay or closed virtual sim
                    </span>
                  </div>
                </div>
                <div className="relative z-[1] w-7 h-7 rounded-lg bg-transparent group-hover:bg-blue-50 dark:group-hover:bg-cyan-950/30 flex items-center justify-center transition-all duration-300 shrink-0">
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-blue-500 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              </motion.button>

              {/* Card 2: Explore Anatomy */}
              <motion.button
                variants={cardSlide}
                whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 17 } }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExploreAnatomy}
                className="card-shimmer w-full flex items-center justify-between px-4 py-[14px] rounded-[14px] border border-slate-200/50 dark:border-slate-800/40 bg-white/70 dark:bg-white/[0.025] backdrop-blur-md hover:bg-white/90 dark:hover:bg-white/[0.05] hover:border-purple-300/50 dark:hover:border-purple-700/40 hover:shadow-[0_8px_32px_-6px_rgba(147,51,234,0.12)] dark:hover:shadow-[0_8px_32px_-6px_rgba(168,85,247,0.15)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group text-left relative overflow-hidden"
              >
                <div className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full bg-transparent group-hover:bg-gradient-to-b group-hover:from-purple-400 group-hover:to-violet-500 dark:group-hover:from-purple-400 dark:group-hover:to-fuchsia-500 transition-all duration-400" />

                <div className="flex items-center gap-3.5 w-full relative z-[1]">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:bg-purple-50 dark:group-hover:bg-purple-950/30 group-hover:border-purple-200/50 dark:group-hover:border-purple-800/30 transition-all duration-300 shrink-0 group-hover:shadow-[0_0_20px_-4px_rgba(147,51,234,0.2)] dark:group-hover:shadow-[0_0_20px_-4px_rgba(168,85,247,0.25)]">
                    <Cpu className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-slate-800 dark:text-white leading-none tracking-[-0.01em]">Explore Anatomy</span>
                      <span className="text-[8.5px] font-mono font-semibold px-1.5 py-[3px] rounded-md bg-blue-500/8 text-blue-600 dark:text-blue-400 border border-blue-500/10 uppercase tracking-wider leading-none">
                        {clickedCount > 0 ? `${clickedCount}/11 Explored` : '11 Avionics Nodes'}
                      </span>
                    </div>
                    <span className="text-[11.5px] text-slate-450 dark:text-slate-500 mt-1.5 block truncate leading-normal">
                      Dissect 3D parts &amp; read aerospace descriptions
                    </span>
                  </div>
                </div>
                <div className="relative z-[1] w-7 h-7 rounded-lg bg-transparent group-hover:bg-purple-50 dark:group-hover:bg-purple-950/30 flex items-center justify-center transition-all duration-300 shrink-0">
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-purple-500 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              </motion.button>

              {/* Card 3: Learn to Fly Pluto */}
              <motion.button
                variants={cardSlide}
                whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 17 } }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLearnToFly}
                className="card-shimmer w-full flex items-center justify-between px-4 py-[14px] rounded-[14px] border border-slate-200/50 dark:border-slate-800/40 bg-white/70 dark:bg-white/[0.025] backdrop-blur-md hover:bg-white/90 dark:hover:bg-white/[0.05] hover:border-amber-300/50 dark:hover:border-amber-700/40 hover:shadow-[0_8px_32px_-6px_rgba(245,158,11,0.12)] dark:hover:shadow-[0_8px_32px_-6px_rgba(251,191,36,0.15)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group text-left relative overflow-hidden"
              >
                <div className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full bg-transparent group-hover:bg-gradient-to-b group-hover:from-amber-400 group-hover:to-orange-500 dark:group-hover:from-amber-400 dark:group-hover:to-yellow-500 transition-all duration-400" />

                <div className="flex items-center gap-3.5 w-full relative z-[1]">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:bg-amber-50 dark:group-hover:bg-amber-950/30 group-hover:border-amber-200/50 dark:group-hover:border-amber-800/30 transition-all duration-300 shrink-0 group-hover:shadow-[0_0_20px_-4px_rgba(245,158,11,0.2)] dark:group-hover:shadow-[0_0_20px_-4px_rgba(251,191,36,0.25)]">
                    <GraduationCap className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-slate-800 dark:text-white leading-none tracking-[-0.01em]">Learn to Fly Pluto</span>
                      <span className="text-[8.5px] font-mono font-semibold px-1.5 py-[3px] rounded-md bg-amber-500/8 text-amber-600 dark:text-amber-400 border border-amber-500/10 uppercase tracking-wider leading-none">
                        Level {unlockedCount}/5 Unlocked
                      </span>
                    </div>
                    <span className="text-[11.5px] text-slate-450 dark:text-slate-500 mt-1.5 block truncate leading-normal">
                      Clear pilot certification academy levels
                    </span>
                  </div>
                </div>
                <div className="relative z-[1] w-7 h-7 rounded-lg bg-transparent group-hover:bg-amber-50 dark:group-hover:bg-amber-950/30 flex items-center justify-center transition-all duration-300 shrink-0">
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* ── RIGHT COLUMN: Drone showcase ──────────────────────── */}
          <motion.div
            variants={showcaseReveal}
            initial="hidden"
            animate="visible"
            className="hidden md:flex w-full md:col-span-7 items-center justify-center relative py-4 md:py-0 order-2 md:order-3"
          >
            <div 
              onMouseMove={handleShowcaseMouseMove}
              onMouseLeave={handleShowcaseMouseLeave}
              className="w-full max-w-[480px] lg:max-w-[520px] aspect-square relative flex items-center justify-center group"
              style={{ perspective: 1000 }}
            >
              
              {/* ── ANIMATED GRADIENT BORDER (Linear-style) ───────── */}
              <div className="absolute inset-[-1.5px] rounded-[30px] animated-border opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
              
              {/* Main showcase container */}
              <motion.div 
                style={{
                  rotateX: tiltXSpring,
                  rotateY: tiltYSpring,
                  transformStyle: 'preserve-3d',
                }}
                className="w-full h-full rounded-[28px] border-0 bg-white/60 dark:bg-[#0a0c14]/70 backdrop-blur-lg shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_24px_80px_-16px_rgba(0,0,0,0.05)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_80px_-16px_rgba(0,0,0,0.4)] group-hover:shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_40px_100px_-20px_rgba(59,130,246,0.1)] dark:group-hover:shadow-[0_0_0_1px_rgba(6,182,212,0.1),0_40px_100px_-20px_rgba(6,182,212,0.15)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden relative flex items-center justify-center"
              >
                
                {/* Inner noise texture */}
                <div className="absolute inset-0 noise-overlay pointer-events-none opacity-50" />
                
                {/* Inner blueprint grid */}
                <div className="absolute inset-0 bg-blueprint-grid opacity-10 dark:opacity-6 pointer-events-none" />

                {/* Concentric engineering rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
                  <div className="w-[88%] h-[88%] border border-dashed border-blue-400 dark:border-cyan-500 rounded-full animate-[spin_120s_linear_infinite]" />
                  <div className="absolute w-[62%] h-[62%] border border-slate-300 dark:border-slate-700 rounded-full" />
                  <div className="absolute w-[36%] h-[36%] border border-dashed border-slate-200 dark:border-slate-800 rounded-full animate-[spin_80s_linear_infinite_reverse]" />
                </div>

                {/* Cyberpunk Scanner Line */}
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/80 to-transparent dark:via-cyan-400/80 shadow-[0_0_12px_2px_rgba(59,130,246,0.5)] dark:shadow-[0_0_12px_2px_rgba(6,182,212,0.6)] animate-scan-laser pointer-events-none z-20" />

                {/* Spotlight glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-[radial-gradient(circle,rgba(59,130,246,0.04)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.06)_0%,transparent_70%)] pointer-events-none rounded-full group-hover:w-[380px] group-hover:h-[380px] transition-all duration-1000" />

                {/* Ground shadow */}
                <div className="absolute bottom-[16%] left-1/2 w-[200px] h-[18px] pointer-events-none" style={{ transform: 'translateX(-50%) rotateX(75deg)' }}>
                  <div className="w-full h-full bg-slate-900/5 dark:bg-black/25 rounded-full blur-lg animate-shadow-pulse" />
                </div>

                {/* Drone Hero Image */}
                <motion.div 
                  style={{
                    x: transXSpring,
                    y: transYSpring,
                    z: 50,
                    transformStyle: 'preserve-3d',
                  }}
                  className="absolute z-10 w-[80%] max-w-[340px] lg:max-w-[380px] aspect-square flex items-center justify-center pointer-events-none animate-float-drone select-none"
                >
                  <motion.img
                    src="/plutox_new_home.png"
                    alt="PlutoX Nano Drone"
                    initial={{ opacity: 0, scale: 0.9, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
                    className="w-full h-auto object-contain select-none filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_12px_28px_rgba(0,0,0,0.25)]"
                  />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* ── BOTTOM STATUS BAR ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="w-full max-w-[1320px] mx-auto px-6 md:px-10 lg:px-14 pb-5 pt-2 md:pb-6 pointer-events-none"
        >
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-350 dark:text-slate-600 tracking-[0.08em] select-none uppercase">
            <div className="flex items-center gap-5">
              <span className="hidden sm:inline">PLUTOX-SIM</span>
              <span className="hidden sm:inline text-slate-200 dark:text-slate-800">·</span>
              <span className="hidden sm:inline">6-DOF PHYSICS</span>
              <span className="hidden sm:inline text-slate-200 dark:text-slate-800">·</span>
              <span className="hidden sm:inline">HIL DIAGNOSTICS</span>
            </div>
            <div className="flex items-center gap-5">
              <span className="hidden md:inline">DRONA AVIATION PVT. LTD.</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FLIGHT SIM MODAL
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isFlightSimModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-12 md:pt-4 pointer-events-auto overflow-y-auto"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/20 dark:bg-black/40 backdrop-blur-xl"
              onClick={() => setFlightSimModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 180 }}
              className="relative max-w-2xl w-full overflow-hidden rounded-[28px] shrink-0 mb-8 md:mb-0"
              style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" }}
            >
              {/* Modal animated gradient border */}
              <div className="absolute inset-0 rounded-[28px] animated-border opacity-30" />
              
              {/* Modal content */}
              <div className="relative m-[1.5px] rounded-[27px] bg-white/97 dark:bg-[#0c0f18]/97 backdrop-blur-2xl p-8 flex flex-col space-y-6 overflow-hidden">
                <div className="absolute inset-0 noise-overlay pointer-events-none opacity-30" />
                <div className="absolute inset-0 bg-blueprint-grid opacity-[0.02] pointer-events-none" />
                
                <button
                  onClick={() => setFlightSimModalOpen(false)}
                  className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-white text-slate-400 transition-all duration-200 z-10 backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-3 pr-8 relative">
                  <div className="flex items-center gap-4 text-[9px] font-mono tracking-wider">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold">
                      <Database className="w-2.5 h-2.5 text-blue-500" /> Simulation Core Online
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      Flight Systems Ready
                    </span>
                  </div>
                  <h3 className="text-[1.65rem] font-bold tracking-[-0.025em] text-slate-900 dark:text-white leading-tight">
                    Mission mode selection
                  </h3>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 font-normal leading-[1.7]">
                    Configure simulation arena parameters. Authorize localized AR hardware pass-through telemetry or initialize the closed virtual 6-DOF physics sandbox environment.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative">
                  {/* AR Passthrough */}
                  <button
                    onClick={startARMode}
                    className="card-shimmer flex flex-col text-left p-5 rounded-2xl bg-white/80 dark:bg-white/[0.025] border border-slate-200/40 dark:border-slate-800/40 hover:border-blue-200/60 dark:hover:border-blue-700/40 hover:bg-white dark:hover:bg-white/[0.05] hover:shadow-[0_12px_40px_-8px_rgba(59,130,246,0.1)] hover:-translate-y-0.5 transition-all duration-300 ease-out group relative overflow-hidden active:scale-[0.98] flex-1 justify-between h-full"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(59,130,246,0.02)_45%,rgba(59,130,246,0.04)_50%,rgba(59,130,246,0.02)_55%,transparent_60%)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                    
                    <div>
                      <div className="flex justify-between items-start w-full mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/8 border border-blue-500/15 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_0_24px_-4px_rgba(59,130,246,0.4)] transition-all duration-300">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-[8.5px] font-semibold tracking-wider px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/30 bg-blue-50/80 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 uppercase">
                          Experimental
                        </span>
                      </div>

                      <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
                        AR Passthrough
                      </h4>
                      
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-[1.65] mt-2">
                        Stream your live room camera feed and steer the 3D model using floating virtual joystick knobs.
                      </p>

                      <div className="space-y-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 font-medium text-[8.5px] uppercase tracking-wider">Use Case</span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-normal leading-relaxed">View Pluto drone inside your physical room using camera passthrough.</p>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span>
                             <span className="text-slate-400 dark:text-slate-500 font-medium text-[8.5px] uppercase tracking-wider">Hardware: </span>
                            <strong className="text-slate-700 dark:text-slate-350 font-mono font-semibold">{isMobileDevice ? 'Device Camera' : 'Webcam'}</strong>
                          </span>
                          <span>
                            <span className="text-slate-400 dark:text-slate-500 font-medium text-[8.5px] uppercase tracking-wider">Diff: </span>
                            <strong className="text-slate-700 dark:text-slate-350 font-mono font-semibold">Intermediate</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-5 block group-hover:translate-x-1 transition-transform duration-300">
                      Launch Camera →
                    </span>
                  </button>

                  {/* Closed Simulator */}
                  <button
                    onClick={startClosedSim}
                    className="card-shimmer flex flex-col text-left p-5 rounded-2xl bg-gradient-to-br from-blue-50/30 to-indigo-50/20 dark:from-blue-950/15 dark:to-indigo-950/10 border border-blue-300/30 dark:border-blue-600/20 hover:border-blue-400/50 dark:hover:border-blue-400/35 hover:shadow-[0_12px_40px_-8px_rgba(59,130,246,0.12)] hover:-translate-y-0.5 transition-all duration-300 ease-out group relative overflow-hidden active:scale-[0.98] flex-1 justify-between h-full"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(59,130,246,0.03)_45%,rgba(59,130,246,0.05)_50%,rgba(59,130,246,0.03)_55%,transparent_60%)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                    
                    <div>
                      <div className="flex justify-between items-start w-full mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/8 border border-blue-500/15 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_0_24px_-4px_rgba(59,130,246,0.4)] transition-all duration-300">
                          <Box className="w-5 h-5" />
                        </div>
                        <span className="text-[8.5px] font-semibold tracking-wider px-2 py-0.5 rounded-md border border-emerald-500/15 dark:border-emerald-500/15 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 uppercase">
                          Recommended
                        </span>
                      </div>

                      <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
                        Closed Simulator
                      </h4>
                      
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-[1.65] mt-2">
                        Load detailed virtual environments (Warehouse, Lab, Hoop Arena) with full 6-DOF physics and {isMobileDevice ? 'virtual joystick flight loops.' : 'keyboard flight loops.'}
                      </p>

                      <div className="space-y-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 font-medium text-[8.5px] uppercase tracking-wider">Use Case</span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-normal leading-relaxed">Professional pilot training using virtual environments.</p>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span>
                            <span className="text-slate-400 dark:text-slate-500 font-medium text-[8.5px] uppercase tracking-wider">Hardware: </span>
                            <strong className="text-slate-700 dark:text-slate-350 font-mono font-semibold">{isMobileDevice ? 'Virtual Joysticks' : 'Keyboard'}</strong>
                          </span>
                          <span>
                            <span className="text-slate-400 dark:text-slate-500 font-medium text-[8.5px] uppercase tracking-wider">Diff: </span>
                            <strong className="text-slate-700 dark:text-slate-350 font-mono font-semibold">Beginner-Friendly</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 mt-5 block group-hover:translate-x-1 transition-transform duration-300">
                      Enter Sandbox →
                    </span>
                  </button>
                </div>

                <div className="flex gap-3 items-start p-4 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/25 dark:border-amber-900/20 rounded-xl text-slate-800 dark:text-slate-200 leading-relaxed relative overflow-hidden">
                  <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-semibold tracking-[-0.01em] text-amber-800 dark:text-amber-400 block">Mission Briefing &amp; Diagnostics</span>
                    <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 leading-[1.65]">
                      Camera permissions are strictly required for AR mode passthrough telemetry. Closed Simulator sandbox courses are recommended for training and level certification.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
