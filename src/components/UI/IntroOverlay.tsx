import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroneStore } from '../../store/useDroneStore';
import { 
  Gamepad2, Cpu, GraduationCap, Camera, Box, X, 
  Database, ClipboardList, Sun, Moon, ArrowRight
} from 'lucide-react';

export function IntroOverlay() {
  const isFlightSimModalOpen = useDroneStore((state) => state.isFlightSimModalOpen);
  const setFlightSimModalOpen = useDroneStore((state) => state.setFlightSimModalOpen);
  const setARActive = useDroneStore((state) => state.setARActive);
  const setMode = useDroneStore((state) => state.setMode);
  const selectMission = useDroneStore((state) => state.selectMission);
  const theme = useDroneStore((state) => state.theme);
  const toggleTheme = useDroneStore((state) => state.toggleTheme);

  // Mobile / Tablet touch detection
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



  const handleEnterFlightSim = () => {
    setFlightSimModalOpen(true);
  };

  const handleExploreAnatomy = () => {
    setMode('explore');
  };

  const handleLearnToFly = () => {
    setMode('flight');
    selectMission(-1);
  };

  const startARMode = () => {
    setFlightSimModalOpen(false);
    setARActive(true);
  };

  const startClosedSim = () => {
    setFlightSimModalOpen(false);
    setMode('flight');
    selectMission(-1);
    useDroneStore.getState().toggleAcademy();
  };

  const clickedCount = useDroneStore((state) => state.clickedParts?.length || 0);
  const unlockedCount = useDroneStore((state) => state.unlockedLevels?.filter(Boolean).length || 1);
  const appLinkStatus = useDroneStore((state) => state.appLinkStatus);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-20 pointer-events-auto flex flex-col justify-between p-6 overflow-y-auto md:overflow-hidden select-none font-sans text-slate-800 dark:text-slate-200 bg-blueprint-grid bg-[#F8FAFC] dark:bg-[#070a13]"
    >
      {/* Subtle Radial Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.02),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_30%,rgba(6,182,212,0.04),transparent_70%)] pointer-events-none" />

      {/* Dynamic Ambient Aerospace Layer (Ultra-subtle blueprint, trajectory, waypoints, radar) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none opacity-[0.32] dark:opacity-[0.24]">
        <style dangerouslySetInnerHTML={{ __html: `
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

          /* Drone Silhouette Styles */
          .drone-silhouette {
            transition: color 0.3s;
          }
          
          /* Light Mode Colors (Aerospace Blue) and Opacities (Increased for high visibility) */
          .drone-1 {
            color: #2563eb;
            opacity: 0.55; /* Net: ~17.6% */
            animation: patrol-horizontal 28s ease-in-out infinite;
          }
          .drone-2 {
            color: #2563eb;
            opacity: 0.65; /* Net: ~20.8% */
            offset-path: path('M 100,100 C 600,-50 1100,400 1800,150');
            offset-rotate: auto 90deg;
            animation: path-follow-1 32s ease-in-out infinite alternate;
          }
          .drone-3 {
            color: #2563eb;
            opacity: 0.50; /* Net: ~16% */
            animation: orbit-spin 26s linear infinite;
            transform-origin: 0px 0px;
          }
          .drone-4 {
            color: #2563eb;
            opacity: 0.72; /* Net: ~23% */
            animation: hover-drift 22s ease-in-out infinite;
          }
          .drone-5 {
            color: #2563eb;
            opacity: 0.60; /* Net: ~19.2% */
            offset-path: path('M 150,950 C 450,600 1350,900 1750,100');
            offset-rotate: auto 90deg;
            animation: path-follow-2 38s ease-in-out infinite alternate;
          }

          /* Dark Mode Colors and Opacities (Increased for high visibility) */
          .dark .drone-1 { color: #06b6d4; opacity: 0.75; } /* Net: ~18.0% */
          .dark .drone-2 { color: #06b6d4; opacity: 0.88; } /* Net: ~21.1% */
          .dark .drone-3 { color: #06b6d4; opacity: 0.67; } /* Net: ~16.0% */
          .dark .drone-4 { color: #06b6d4; opacity: 0.96; } /* Net: ~23.0% */
          .dark .drone-5 { color: #06b6d4; opacity: 0.80; } /* Net: ~19.2% */
        ` }} />

        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full text-slate-500/10 dark:text-cyan-500/10 fill-none"
        >
          <defs>
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
            </linearGradient>

            {/* Reusable Quadcopter Blueprint Outline */}
            <g id="drone-blueprint" stroke="currentColor" fill="none">
              {/* Central core ring */}
              <circle cx="0" cy="0" r="18" strokeWidth="1" />
              <circle cx="0" cy="0" r="8" strokeWidth="0.6" strokeDasharray="1 1" />
              {/* Arms */}
              <line x1="-12" y1="-12" x2="-45" y2="-45" strokeWidth="1" />
              <line x1="12" y1="-12" x2="45" y2="-45" strokeWidth="1" />
              <line x1="-12" y1="12" x2="-45" y2="45" strokeWidth="1" />
              <line x1="12" y1="12" x2="45" y2="45" strokeWidth="1" />
              {/* Motors */}
              <circle cx="-45" cy="-45" r="10" strokeWidth="0.8" />
              <circle cx="45" cy="-45" r="10" strokeWidth="0.8" />
              <circle cx="-45" cy="45" r="10" strokeWidth="0.8" />
              <circle cx="45" cy="45" r="10" strokeWidth="0.8" />
              {/* Propellers */}
              <circle cx="-45" cy="-45" r="32" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.6" />
              <circle cx="45" cy="-45" r="32" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.6" />
              <circle cx="-45" cy="45" r="32" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.6" />
              <circle cx="45" cy="45" r="32" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.6" />
              {/* Propeller blades */}
              <path d="M -77,-45 L -13,-45" strokeWidth="0.6" opacity="0.8" />
              <path d="M 13,-45 L 77,-45" strokeWidth="0.6" opacity="0.8" />
              <path d="M -77,45 L -13,45" strokeWidth="0.6" opacity="0.8" />
              <path d="M 13,45 L 77,45" strokeWidth="0.6" opacity="0.8" />
              {/* Forward arrow */}
              <path d="M 0,-28 L -5,-20 L 5,-20 Z" strokeWidth="1" />
              {/* IMU Vectors */}
              <line x1="0" y1="0" x2="0" y2="-60" strokeWidth="0.8" strokeDasharray="2 2" />
              <line x1="0" y1="0" x2="60" y2="0" strokeWidth="0.8" strokeDasharray="2 2" />
              <text x="5" y="-50" fontSize="8" fontFamily="monospace" stroke="none" fill="currentColor" opacity="0.6">Y+(FPV)</text>
              <text x="45" y="12" fontSize="8" fontFamily="monospace" stroke="none" fill="currentColor" opacity="0.6">X+(LAT)</text>
            </g>

            {/* Reusable Quadcopter Silhouette (Glassmorphism style) */}
            <g id="drone-silhouette" fill="none">
              {/* Drone arms */}
              <line x1="-12" y1="-12" x2="-35" y2="-35" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12" y1="-12" x2="35" y2="-35" stroke="currentColor" strokeWidth="1.5" />
              <line x1="-12" y1="12" x2="-35" y2="35" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12" y1="12" x2="35" y2="35" stroke="currentColor" strokeWidth="1.5" />
              
              {/* Propeller guard rings */}
              <circle cx="-35" cy="-35" r="13" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="35" cy="-35" r="13" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="-35" cy="35" r="13" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="35" cy="35" r="13" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" />

              {/* Propeller sweep lines */}
              <circle cx="-35" cy="-35" r="11" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
              <circle cx="35" cy="-35" r="11" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
              <circle cx="-35" cy="35" r="11" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
              <circle cx="35" cy="35" r="11" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />

              {/* Motors */}
              <circle cx="-35" cy="-35" r="3" fill="currentColor" />
              <circle cx="35" cy="-35" r="3" fill="currentColor" />
              <circle cx="-35" cy="35" r="3" fill="currentColor" />
              <circle cx="35" cy="35" r="3" fill="currentColor" />

              {/* Central fuselage body */}
              <rect x="-10" y="-18" width="20" height="36" rx="8" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
              
              {/* Inner electronics/battery block - translucent white highlight */}
              <rect x="-6" y="-10" width="12" height="20" rx="3" fill="white" fillOpacity="0.25" stroke="currentColor" strokeWidth="0.6" />

              {/* Camera nose */}
              <path d="M -4,-18 L 4,-18 L 2,-23 L -2,-23 Z" fill="currentColor" />
              <circle cx="0" cy="-21" r="1.2" fill="white" />
            </g>
          </defs>

          {/* 1. Radar Sweep */}
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

          {/* 2. Flight Trajectory Curves */}
          <path d="M 100,100 C 600,-50 1100,400 1800,150" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.5" />
          <path d="M 150,950 C 450,600 1350,900 1750,100" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.5" />

          {/* 3. Navigation Waypoints & Pulsing rings */}
          {/* Waypoint 1 */}
          <g transform="translate(100, 100)" opacity="0.6">
            <circle cx="0" cy="0" r="4" fill="currentColor" />
            <circle cx="0" cy="0" r="4" stroke="currentColor" strokeWidth="1" className="pulse-ring" />
            <text x="10" y="4" fontSize="8" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.8">WP-01 [ALT: 2.0m]</text>
          </g>
          {/* Waypoint 2 */}
          <g transform="translate(960, 240)" opacity="0.6">
            <circle cx="0" cy="0" r="4" fill="currentColor" />
            <circle cx="0" cy="0" r="4" stroke="currentColor" strokeWidth="1" className="pulse-ring" />
            <text x="10" y="4" fontSize="8" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.8">WP-02 [ALT: 12.4m]</text>
          </g>
          {/* Waypoint 3 */}
          <g transform="translate(1800, 150)" opacity="0.6">
            <circle cx="0" cy="0" r="4" fill="currentColor" />
            <circle cx="0" cy="0" r="4" stroke="currentColor" strokeWidth="1" className="pulse-ring" />
            <text x="-95" y="4" fontSize="8" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.8">WP-03 [END_HOLD]</text>
          </g>
          {/* Waypoint 4 */}
          <g transform="translate(150, 950)" opacity="0.6">
            <circle cx="0" cy="0" r="4" fill="currentColor" />
            <circle cx="0" cy="0" r="4" stroke="currentColor" strokeWidth="1" className="pulse-ring" />
            <text x="10" y="4" fontSize="8" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.8">NAV-START</text>
          </g>
          {/* Waypoint 5 */}
          <g transform="translate(900, 750)" opacity="0.6">
            <circle cx="0" cy="0" r="4" fill="currentColor" />
            <circle cx="0" cy="0" r="4" stroke="currentColor" strokeWidth="1" className="pulse-ring" />
            <text x="10" y="4" fontSize="8" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.8">NAV-CORR_01</text>
          </g>
          {/* Waypoint 6 */}
          <g transform="translate(1750, 100)" opacity="0.6">
            <circle cx="0" cy="0" r="4" fill="currentColor" />
            <circle cx="0" cy="0" r="4" stroke="currentColor" strokeWidth="1" className="pulse-ring" />
            <text x="-80" y="4" fontSize="8" fontFamily="monospace" fill="currentColor" stroke="none" opacity="0.8">NAV-TARGET</text>
          </g>

          {/* 4. Technical Blueprint Graphics */}
          <g transform="translate(1700, 260)" opacity="0.5" stroke="currentColor" fill="none">
            <text x="0" y="-15" fontSize="8" fontFamily="monospace" stroke="none" fill="currentColor" opacity="0.6">IMU ACCELEROMETER/GYRO</text>
            <line x1="0" y1="0" x2="40" y2="0" strokeWidth="0.8" />
            <line x1="0" y1="0" x2="0" y2="-40" strokeWidth="0.8" />
            <line x1="0" y1="0" x2="-25" y2="25" strokeWidth="0.8" />
            <text x="45" y="2" fontSize="7" fontFamily="monospace" stroke="none" fill="currentColor">X</text>
            <text x="-2" y="-45" fontSize="7" fontFamily="monospace" stroke="none" fill="currentColor">Y</text>
            <text x="-32" y="32" fontSize="7" fontFamily="monospace" stroke="none" fill="currentColor">Z</text>
            <circle cx="0" cy="0" r="3" fill="none" strokeWidth="0.8" />
            <path d="M -15,-15 A 20,20 0 0,1 15,-15" strokeWidth="0.6" strokeDasharray="1 1" />
          </g>

          <g transform="translate(180, 700)" opacity="0.5" stroke="currentColor" fill="none">
            <text x="0" y="-15" fontSize="8" fontFamily="monospace" stroke="none" fill="currentColor" opacity="0.6">FLIGHT LEVEL CONTROLLER CONFIG</text>
            <rect x="0" y="0" width="80" height="50" rx="4" strokeWidth="0.8" />
            <line x1="40" y1="0" x2="40" y2="50" strokeWidth="0.6" strokeDasharray="2 2" />
            <circle cx="40" cy="25" r="10" strokeWidth="0.8" />
            <text x="6" y="15" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">Kp: 1.25</text>
            <text x="6" y="27" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">Ki: 0.04</text>
            <text x="6" y="39" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">Kd: 0.12</text>
            <text x="46" y="15" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">ROLL: OK</text>
            <text x="46" y="27" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">PTCH: OK</text>
            <text x="46" y="39" fontSize="6" fontFamily="monospace" stroke="none" fill="currentColor">YAW: OK</text>
          </g>

          {/* 5. Animated Drone Silhouettes (3 to 5 total, opacities 5%-12% net, glassmorphism style) */}
          {/* Drone 1: Slow horizontal patrol */}
          <g className="drone-1">
            <use href="#drone-silhouette" />
          </g>

          {/* Drone 2: Waypoint navigation path */}
          <g className="drone-2">
            <use href="#drone-silhouette" transform="scale(0.90)" />
          </g>

          {/* Drone 3: Circular orbit */}
          <g transform="translate(960, 540)">
            <g className="drone-3">
              <use href="#drone-silhouette" transform="translate(380, 0) rotate(90deg) scale(0.70)" />
            </g>
          </g>

          {/* Drone 4: Hover drift */}
          <g className="drone-4">
            <use href="#drone-silhouette" />
          </g>

          {/* Drone 5: Diagonal route */}
          <g className="drone-5">
            <use href="#drone-silhouette" transform="scale(1.65)" />
          </g>
        </svg>
      </div>

      {/* 1. REFINED NAVBAR */}
      <header className="w-full h-14 flex justify-between items-center relative z-30 max-w-7xl mx-auto pointer-events-auto border-b border-slate-200/30 dark:border-slate-800/35 px-4 md:px-6">
        <div className="flex items-center">
          <img 
            src="/drona_logo.png" 
            alt="Drona Aviation Logo" 
            className="h-9 w-auto object-contain dark:invert select-none" 
          />
        </div>
        {/* Theme Toggle */}
        <div className="flex items-center">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition-colors flex items-center justify-center shrink-0"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 2. SPLIT-SCREEN LAYOUT */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-8 lg:gap-12 my-6 md:my-8 w-full max-w-7xl mx-auto px-4 md:px-6 relative z-10 overflow-visible pointer-events-auto">
        
        {/* A. LEFT COLUMN: Content, Headline, and Minimal CTA Cards (40% width) */}
        <div className="w-full md:w-[40%] flex flex-col justify-center space-y-6 text-left py-4 md:py-0">
          <div className="space-y-3">
            <div className="text-[10px] font-mono font-bold tracking-widest text-blue-600 dark:text-cyan-400 uppercase">
              Aerospace Training Platform
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-bold tracking-tight leading-[1.15] text-slate-900 dark:text-white font-sans">
              Professional Drone Pilot<br />
              <span className="text-blue-600 dark:text-cyan-400 font-extrabold">Training Platform</span>
            </h1>
            
            <p className="text-xs sm:text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal max-w-md">
              Welcome to the pilot academy for Drona Aviation's flagship PlutoX nano-drone. Dissect 3D avionics systems, perform hardware-in-the-loop diagnostics, and master flight controllers inside our high-fidelity physics simulator.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            {/* Card 1: Enter Flight Sim */}
            <button
              onClick={handleEnterFlightSim}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200/40 dark:border-slate-800/45 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 hover:border-slate-300/60 dark:hover:border-slate-700/60 transition-all duration-200 group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3 w-full">
                <Gamepad2 className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors shrink-0" />
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Enter Flight Sim</span>
                    <span className="text-[8px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 uppercase tracking-wider scale-90 origin-left">
                      {appLinkStatus === 'connected' ? 'Link Active' : 'Ready'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 block truncate font-light">
                    AR passthrough overlay or closed virtual sim
                  </span>
                </div>
              </div>
              
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
            </button>

            {/* Card 2: Explore Anatomy */}
            <button
              onClick={handleExploreAnatomy}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200/40 dark:border-slate-800/45 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 hover:border-slate-300/60 dark:hover:border-slate-700/60 transition-all duration-200 group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3 w-full">
                <Cpu className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 group-hover:text-purple-650 dark:group-hover:text-purple-400 transition-colors shrink-0" />
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Explore Anatomy</span>
                    <span className="text-[8px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15 uppercase tracking-wider scale-90 origin-left">
                      {clickedCount > 0 ? `${clickedCount}/11 Explored` : '11 Avionics Nodes'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 block truncate font-light">
                    Dissect 3D parts & read aerospace descriptions
                  </span>
                </div>
              </div>
              
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
            </button>

            {/* Card 3: Learn to Fly Pluto */}
            <button
              onClick={handleLearnToFly}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200/40 dark:border-slate-800/45 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 hover:border-slate-300/60 dark:hover:border-slate-700/60 transition-all duration-200 group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3 w-full">
                <GraduationCap className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-650 dark:group-hover:text-emerald-450 transition-colors shrink-0" />
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Learn to Fly Pluto</span>
                    <span className="text-[8px] font-mono font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 uppercase tracking-wider scale-90 origin-left">
                      Level {unlockedCount}/5 Unlocked
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 block truncate font-light">
                    Clear pilot certification academy levels
                  </span>
                </div>
              </div>
              
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
            </button>
          </div>
        </div>

        {/* B. RIGHT COLUMN: Centered static drone showcase frame (60% width) */}
        <div className="w-full md:w-[60%] flex items-center justify-center relative py-4 md:py-0">
          <div className="w-full max-w-[450px] aspect-square relative flex items-center justify-center overflow-hidden rounded-3xl border border-slate-200/35 dark:border-slate-800/45 bg-slate-50/10 dark:bg-slate-950/15 backdrop-blur-[2px]">
            {/* Subtle Blueprint Grid Pattern */}
            <div className="absolute inset-0 bg-blueprint-grid opacity-60 dark:opacity-40 pointer-events-none" />

            {/* Spotlight Glow Effect projection */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[380px] bg-gradient-to-b from-blue-500/[0.03] dark:from-cyan-500/[0.04] to-transparent blur-2xl pointer-events-none rounded-full" />

            {/* Soft Shadow Underneath */}
            <div className="absolute bottom-[23%] left-1/2 w-[240px] h-[24px] pointer-events-none" style={{ transform: 'translateX(-50%) rotateX(75deg)' }}>
              <div className="w-full h-full bg-slate-950/10 dark:bg-black/35 rounded-full blur-md animate-shadow-pulse" />
            </div>

            {/* Static Centered Drone Hero Image */}
            <div className="absolute z-10 w-[85%] max-w-[380px] lg:max-w-[430px] aspect-square flex items-center justify-center pointer-events-none animate-float-drone">
              <motion.img
                src="/plutox_new_home.png"
                alt="PlutoX Nano Drone"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="w-full h-auto object-contain select-none"
              />
            </div>
          </div>
        </div>
      </div>


      <AnimatePresence>
        {isFlightSimModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-12 md:pt-4 bg-slate-900/30 backdrop-blur-[3px] pointer-events-auto overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 150 }}
              className="relative max-w-2xl w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col space-y-6 shrink-0 mb-8 md:mb-0"
            >
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.001)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.001)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.001)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.001)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />
              
              <button
                onClick={() => setFlightSimModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white text-slate-500 transition-all duration-300 z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-3 pr-8 relative">
                <div className="flex items-center gap-4 text-[9px] font-mono tracking-wide">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-605 dark:text-blue-400 font-semibold">
                    <Database className="w-2.5 h-2.5 text-blue-500" /> Simulation Core Online
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Flight Systems Ready
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
                  Mission mode selection
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed font-sans">
                  Configure simulation arena parameters. Authorize localized AR hardware pass-through telemetry or initialize the closed virtual 6-DOF physics sandbox environment.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={startARMode}
                  className="flex flex-col text-left p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-550 hover:shadow-[0_10px_20px_rgba(59,130,246,0.04)] transition-all duration-300 group relative overflow-hidden active:scale-[0.98] flex-1 justify-between h-full"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.01),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <div>
                    <div className="flex justify-between items-start w-full mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-sans font-semibold tracking-normal px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/30 text-blue-605 dark:text-blue-400">
                        Experimental
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold tracking-normal text-slate-800 dark:text-slate-250 group-hover:text-slate-900 dark:group-hover:text-white font-sans">
                      AR Passthrough
                    </h4>
                    
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 font-normal leading-relaxed mt-2 font-sans">
                      Stream your live room camera feed and steer the 3D model using floating virtual joystick knobs.
                    </p>

                    <div className="space-y-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-sans font-medium text-[9px] uppercase tracking-normal">Use Case</span>
                        <p className="text-[11px] text-slate-650 dark:text-slate-350 mt-0.5 font-sans font-normal leading-relaxed">View Pluto drone inside your physical room using camera passthrough.</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span>
                          <span className="text-slate-400 dark:text-slate-500 font-sans font-medium text-[9px] uppercase tracking-normal">Hardware: </span>
                          <strong className="text-slate-700 dark:text-slate-350 font-mono font-semibold">{isMobileDevice ? 'Device Camera' : 'Webcam'}</strong>
                        </span>
                        <span>
                          <span className="text-slate-400 dark:text-slate-500 font-sans font-medium text-[9px] uppercase tracking-normal">Diff: </span>
                          <strong className="text-slate-700 dark:text-slate-350 font-mono font-semibold">Intermediate</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-sans font-semibold text-blue-600 dark:text-blue-400 mt-6 block group-hover:translate-x-1 transition-transform">
                    Launch Camera →
                  </span>
                </button>

                <button
                  onClick={startClosedSim}
                  className="flex flex-col text-left p-6 rounded-2xl bg-blue-55/25 dark:bg-blue-95/20 border-2 border-blue-500/25 dark:border-blue-500/20 hover:border-blue-500/60 dark:hover:border-blue-550 transition-all duration-300 group relative overflow-hidden active:scale-[0.98] flex-1 justify-between h-full"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.02),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <div>
                    <div className="flex justify-between items-start w-full mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <Box className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-sans font-semibold tracking-normal px-2 py-0.5 rounded border border-emerald-500/20 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-605 dark:text-emerald-400">
                        Recommended
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold tracking-normal text-slate-800 dark:text-slate-250 group-hover:text-slate-900 dark:group-hover:text-white font-sans">
                      Closed Simulator
                    </h4>
                    
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 font-normal leading-relaxed mt-2 font-sans">
                      Load detailed virtual environments (Warehouse, Lab, Hoop Arena) with full 6-DOF physics and {isMobileDevice ? 'virtual joystick flight loops.' : 'keyboard flight loops.'}
                    </p>

                    <div className="space-y-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                      <div>
                        <span className="text-slate-400 dark:text-slate-555 font-sans font-medium text-[9px] uppercase tracking-normal">Use Case</span>
                        <p className="text-[11px] text-slate-650 dark:text-slate-350 mt-0.5 font-sans font-normal leading-relaxed">Professional pilot training using virtual environments.</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span>
                          <span className="text-slate-400 dark:text-slate-555 font-sans font-medium text-[9px] uppercase tracking-normal">Hardware: </span>
                          <strong className="text-slate-700 dark:text-slate-350 font-mono font-semibold">{isMobileDevice ? 'Virtual Joysticks' : 'Keyboard'}</strong>
                        </span>
                        <span>
                          <span className="text-slate-400 dark:text-slate-555 font-sans font-medium text-[9px] uppercase tracking-normal">Diff: </span>
                          <strong className="text-slate-700 dark:text-slate-350 font-mono font-semibold">Beginner-Friendly</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-sans font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 mt-6 block group-hover:translate-x-1 transition-transform">
                    Enter Sandbox →
                  </span>
                </button>
              </div>

              <div className="flex gap-3 items-start p-4 bg-amber-50 dark:bg-amber-955/25 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-slate-800 dark:text-slate-200 leading-relaxed relative overflow-hidden">
                <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-505 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-sans text-xs font-semibold tracking-normal text-amber-850 dark:text-amber-400 block">Mission Briefing & Diagnostics</span>
                  <p className="font-sans text-[11px] font-normal text-amber-800/95 dark:text-amber-300/90 leading-relaxed">
                    Camera permissions are strictly required for AR mode passthrough telemetry. Closed Simulator sandbox courses are recommended for training and level certification.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
