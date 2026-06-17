import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroneStore } from '../../store/useDroneStore';
import { 
  Gamepad2, Cpu, GraduationCap, Camera, Box, X, 
  Wifi, Cpu as CpuIcon, BatteryCharging, 
  Orbit, Database, Radio, ClipboardList, Sun, Moon
} from 'lucide-react';

export function IntroOverlay() {
  const currentMode = useDroneStore((state) => state.currentMode);
  const isFlightSimModalOpen = useDroneStore((state) => state.isFlightSimModalOpen);
  const setFlightSimModalOpen = useDroneStore((state) => state.setFlightSimModalOpen);
  const setARActive = useDroneStore((state) => state.setARActive);
  const setMode = useDroneStore((state) => state.setMode);
  const selectMission = useDroneStore((state) => state.selectMission);
  const theme = useDroneStore((state) => state.theme);
  const toggleTheme = useDroneStore((state) => state.toggleTheme);

  const [mockPing, setMockPing] = useState(12);
  const [mockCpu, setMockCpu] = useState(42);
  const [mockLinkQuality, setMockLinkQuality] = useState(98);

  useEffect(() => {
    if (currentMode !== 'home') return;
    const interval = setInterval(() => {
      setMockPing(Math.round(10 + Math.random() * 5));
      setMockCpu(Math.round(38 + Math.random() * 8));
      setMockLinkQuality(Math.round(96 + Math.random() * 4));
    }, 1500);
    return () => clearInterval(interval);
  }, [currentMode]);

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
      className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans text-slate-800 dark:text-slate-200"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(241,245,249,0.35)_95%)] dark:bg-[radial-gradient(circle_at_center,transparent_30%,rgba(7,10,19,0.55)_95%)] pointer-events-none" />

      <header className="w-full flex flex-col md:flex-row gap-4 justify-between items-center pointer-events-auto bg-white/90 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 backdrop-blur-xl px-6 py-3 rounded-2xl relative shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center text-white font-black tracking-tighter shadow-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <Orbit className="w-5 h-5 animate-spin" style={{ animationDuration: '12s' }} />
          </div>
          <div>
            <h1 className="text-md font-extrabold uppercase tracking-wider bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-350 bg-clip-text text-transparent flex items-center gap-1.5 leading-none">
              PlutoXR <span className="text-[7.5px] bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.5 rounded-full font-mono tracking-normal">ACTIVE TWIN</span>
            </h1>
            <span className="text-[7.5px] font-mono text-blue-600/80 dark:text-blue-450 uppercase tracking-widest block mt-1">
              3D Autonomous Aerospace Simulator
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-[9px] text-slate-500 dark:text-slate-400 uppercase z-10">
          <div className="hidden lg:flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-6">
            <CpuIcon className="w-3 h-3 text-blue-500" />
            <span>FCS Load: <strong className="text-slate-800 dark:text-slate-200 font-bold">{mockCpu}%</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-6">
            <Wifi className="w-3 h-3 text-blue-500" />
            <span>Link Quality: <strong className="text-blue-600 dark:text-blue-400 font-bold">{mockLinkQuality}% ({mockPing}ms)</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span>Battery: <strong className="text-slate-700 dark:text-slate-350 font-bold">12.6V (100%)</strong></span>
          </div>
          
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850 transition-all shadow-sm flex items-center justify-center shrink-0"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-row items-center justify-between gap-6 my-6 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full md:w-[420px] max-w-full flex flex-col justify-between h-full bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.03)] pointer-events-auto relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.003)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />

          <div className="space-y-6 my-auto z-10 relative">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-[8.5px] font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase shadow-sm">
                <Radio className="w-3 h-3 text-blue-500" />
                AeroSys Console Linked
              </div>
              
              <h2 className="text-3xl font-black tracking-tight uppercase leading-none text-slate-900 dark:text-white">
                EXPLORE. TRAIN.<br/>
                <span className="bg-gradient-to-r from-blue-600 via-blue-555 to-emerald-600 dark:from-blue-400 dark:via-blue-500 dark:to-emerald-500 bg-clip-text text-transparent">
                  FLY PLUTOX NANO.
                </span>
              </h2>
              
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                Welcome to the professional pilot curriculum for Drona Aviation's flagship nano-drone. Dissect 3D avionics, test components, and earn your pilot certification.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleEnterFlightSim}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-blue-50/50 to-white dark:from-blue-950/40 dark:via-blue-950/20 dark:to-slate-955 hover:from-blue-100/70 hover:via-blue-50 hover:to-white dark:hover:from-blue-900/30 dark:hover:via-blue-950/40 dark:hover:to-slate-955 text-slate-800 dark:text-slate-200 font-bold uppercase transition-all duration-300 shadow-sm border border-blue-150 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-800 relative overflow-hidden active:scale-[0.99] text-left group"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                <div className="flex items-center gap-3 z-10 w-full">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs tracking-wider block font-black text-slate-900 dark:text-white">Enter Flight Sim</span>
                      <span className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 tracking-wide uppercase scale-90 origin-right">
                        {appLinkStatus === 'connected' ? 'Link Active' : 'Ready'}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-normal text-slate-505 dark:text-slate-450 group-hover:text-slate-650 dark:group-hover:text-slate-350 tracking-wide block mt-1 truncate">
                      AR passthrough overlay or closed virtual sim
                    </span>
                  </div>
                </div>
                
                <div className="w-7 h-7 rounded-full border border-blue-100 dark:border-blue-900 bg-white dark:bg-slate-900 flex items-center justify-center text-blue-600 shadow-sm group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0">
                  →
                </div>
              </button>

              <button
                onClick={handleExploreAnatomy}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900/40 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 text-slate-800 dark:text-slate-200 transition-all duration-300 group relative overflow-hidden active:scale-[0.99] text-left"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.03),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                <div className="flex items-center gap-3 z-10 w-full">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 shrink-0 group-hover:scale-105 transition-all duration-300">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs tracking-wider block font-bold text-slate-900 dark:text-white">Explore Anatomy</span>
                      <span className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-650 dark:text-blue-400 border border-blue-500/20 tracking-wide uppercase scale-90 origin-right">
                        {clickedCount > 0 ? `${clickedCount}/11 Explored` : '11 Avionics Nodes'}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-normal text-slate-500 dark:text-slate-450 group-hover:text-slate-650 dark:group-hover:text-slate-350 tracking-wide block mt-1 truncate">
                      Dissect 3D parts & read aerospace descriptions
                    </span>
                  </div>
                </div>
                
                <div className="w-7 h-7 rounded-full border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-550 dark:text-slate-400 shadow-sm group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0">
                  →
                </div>
              </button>

              <button
                onClick={handleLearnToFly}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900/40 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 border border-slate-202 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 text-slate-800 dark:text-slate-200 transition-all duration-300 group relative overflow-hidden active:scale-[0.99] text-left"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.03),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                <div className="flex items-center gap-3 z-10 w-full">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-550 dark:text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-250 shrink-0 group-hover:scale-105 transition-all duration-300">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs tracking-wider block font-bold text-slate-900 dark:text-white">Learn to Fly Pluto</span>
                      <span className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-605 dark:text-emerald-400 border border-emerald-500/20 tracking-wide uppercase scale-90 origin-right">
                        Level {unlockedCount}/5 Unlocked
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-normal text-slate-500 dark:text-slate-450 group-hover:text-slate-650 dark:group-hover:text-slate-350 tracking-wide block mt-1 truncate">
                      Clear pilot certification academy levels
                    </span>
                  </div>
                </div>
                
                <div className="w-7 h-7 rounded-full border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-550 dark:text-slate-400 shadow-sm group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0">
                  →
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center text-[8px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest z-10 relative">
            <div className="flex items-center gap-2">
              <span>SYS_LOC: 192.168.4.1</span>
              <span className="text-slate-200 dark:text-slate-800">//</span>
              <span className="text-blue-500/80 dark:text-blue-400/80">PING: OK</span>
            </div>
            <div>DRONAVIA © 2026 // SIMCORE</div>
          </div>
        </motion.div>

        <div className="hidden md:flex flex-1 h-full items-center justify-center pointer-events-none relative">
          <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none translate-x-[40px] translate-y-[-20px]" />
        </div>
      </div>

      <AnimatePresence>
        {isFlightSimModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-[3px] pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 150 }}
              className="relative max-w-2xl w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col space-y-6"
            >
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.001)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.001)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.001)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.001)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />
              
              <button
                onClick={() => setFlightSimModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white text-slate-500 transition-all duration-300 z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-3 pr-8 relative">
                <div className="flex items-center gap-4 text-[8px] font-mono tracking-widest uppercase">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-605 dark:text-blue-400 font-bold">
                    <Database className="w-2.5 h-2.5 text-blue-500" /> Simulation Core Online
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Flight Systems Ready
                  </span>
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">
                  Mission Mode Selection
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-light leading-relaxed">
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
                      <span className="text-[7.5px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/30 text-blue-605 dark:text-blue-400 uppercase">
                        Experimental
                      </span>
                    </div>

                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-250 group-hover:text-slate-900 dark:group-hover:text-white">
                      AR Passthrough
                    </h4>
                    
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-light leading-relaxed mt-2">
                      Stream your live room camera feed and steer the 3D model using floating virtual joystick knobs.
                    </p>

                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-900 text-[8.5px] font-mono text-slate-500 dark:text-slate-450">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 uppercase">Use Case:</span>
                        <p className="text-slate-650 dark:text-slate-350 mt-0.5">View Pluto drone inside your physical room using camera passthrough.</p>
                      </div>
                      <div className="flex justify-between">
                        <span><span className="text-slate-400 dark:text-slate-500 uppercase">Hardware:</span> <strong className="text-slate-700 dark:text-slate-350">Webcam</strong></span>
                        <span><span className="text-slate-400 dark:text-slate-500 uppercase">Diff:</span> <strong className="text-slate-700 dark:text-slate-350">Intermediate</strong></span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[8px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-6 block group-hover:translate-x-1 transition-transform">
                    Launch Camera →
                  </span>
                </button>

                <button
                  onClick={startClosedSim}
                  className="flex flex-col text-left p-6 rounded-2xl bg-blue-50/25 dark:bg-blue-950/20 border-2 border-blue-500/25 dark:border-blue-500/20 hover:border-blue-500/60 dark:hover:border-blue-500 transition-all duration-300 group relative overflow-hidden active:scale-[0.98] flex-1 justify-between h-full"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.02),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <div>
                    <div className="flex justify-between items-start w-full mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <Box className="w-5 h-5" />
                      </div>
                      <span className="text-[7.5px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border border-emerald-500/20 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-605 dark:text-emerald-400 uppercase">
                        Recommended
                      </span>
                    </div>

                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-250 group-hover:text-slate-900 dark:group-hover:text-white">
                      Closed Simulator
                    </h4>
                    
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-light leading-relaxed mt-2">
                      Load detailed virtual environments (Warehouse, Lab, Hoop Arena) with full 6-DOF physics and keyboard flight loops.
                    </p>

                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-900 text-[8.5px] font-mono text-slate-500 dark:text-slate-455">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 uppercase">Use Case:</span>
                        <p className="text-slate-650 dark:text-slate-350 mt-0.5">Professional pilot training using virtual environments.</p>
                      </div>
                      <div className="flex justify-between">
                        <span><span className="text-slate-400 dark:text-slate-500 uppercase">Hardware:</span> <strong className="text-slate-700 dark:text-slate-350">Keyboard</strong></span>
                        <span><span className="text-slate-400 dark:text-slate-500 uppercase">Diff:</span> <strong className="text-slate-700 dark:text-slate-350">Beginner-Friendly</strong></span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[8px] font-mono text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 font-bold uppercase tracking-widest mt-6 block group-hover:translate-x-1 transition-transform">
                    Enter Sandbox →
                  </span>
                </button>
              </div>

              <div className="flex gap-3 items-start p-4 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-[9.5px] text-amber-800 dark:text-amber-300 leading-relaxed relative overflow-hidden">
                <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 block">Mission Briefing & Diagnostics</span>
                  <p className="font-light">
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
