import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroneStore } from '../../store/useDroneStore';
import { 
  Gamepad2, Cpu, GraduationCap, Camera, Box, X, 
  Wifi, Cpu as CpuIcon, BatteryCharging, 
  Orbit, Database, Radio, ClipboardList
} from 'lucide-react';

export function IntroOverlay() {
  const currentMode = useDroneStore((state) => state.currentMode);
  const isFlightSimModalOpen = useDroneStore((state) => state.isFlightSimModalOpen);
  const setFlightSimModalOpen = useDroneStore((state) => state.setFlightSimModalOpen);
  const setARActive = useDroneStore((state) => state.setARActive);
  const setMode = useDroneStore((state) => state.setMode);
  const selectMission = useDroneStore((state) => state.selectMission);

  // Live fluctuating telemetry values for FAANG-level HUD realism
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
    selectMission(-1); // Opens UAV Academy lesson selection
  };

  const startARMode = () => {
    setFlightSimModalOpen(false);
    setARActive(true);
  };

  const startClosedSim = () => {
    setFlightSimModalOpen(false);
    setMode('flight');
    selectMission(-1);
    useDroneStore.getState().toggleAcademy(); // Close academy panel
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
      className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans text-white"
    >
      
      {/* 1. HOLOGRAPHIC CRT INTERACTIVE OVERLAY EFFECTS */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.25)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] pointer-events-none opacity-25 mix-blend-overlay" />
      
      {/* Holographic scanner laser line moving up & down */}
      <div 
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none"
        style={{
          animation: 'scan-laser 8s ease-in-out infinite',
        }}
      />
      
      {/* Sci-fi dark radial vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#030712]/30 to-[#030712]/85 pointer-events-none" />

      {/* 2. ULTRAPREMIUM TOP NAV / LINK TELEMETRY BAR */}
      <header className="w-full flex flex-col md:flex-row gap-4 justify-between items-center pointer-events-auto bg-slate-950/65 border border-slate-800/40 backdrop-blur-xl px-6 py-3.5 rounded-2xl relative shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
        {/* Glow highlight */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent opacity-50 blur-[2px] pointer-events-none" />

        <div className="flex items-center gap-3.5 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center text-white font-black tracking-tighter shadow-[0_0_15px_rgba(0,163,255,0.3)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <Orbit className="w-5 h-5 animate-spin" style={{ animationDuration: '12s' }} />
          </div>
          <div>
            <h1 className="text-md font-extrabold uppercase tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-1.5 leading-none">
              PlutoXR <span className="text-[7.5px] bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold px-1.5 py-0.5 rounded-full font-mono tracking-normal">ACTIVE TWIN</span>
            </h1>
            <span className="text-[7.5px] font-mono text-cyan-400/80 uppercase tracking-widest block mt-1">
              3D Autonomous Aerospace Simulator
            </span>
          </div>
        </div>

        {/* Diagnostic Telemetry Stats */}
        <div className="flex items-center gap-6 font-mono text-[9px] text-slate-400 uppercase z-10">
          <div className="hidden lg:flex items-center gap-2 border-r border-slate-800/80 pr-6">
            <CpuIcon className="w-3 h-3 text-blue-400" />
            <span>FCS Load: <strong className="text-white font-bold">{mockCpu}%</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-2 border-r border-slate-800/80 pr-6">
            <Wifi className="w-3 h-3 text-cyan-400" />
            <span>Link Quality: <strong className="text-cyan-400 font-bold">{mockLinkQuality}% ({mockPing}ms)</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Battery: <strong className="text-slate-200 font-bold">12.6V (100%)</strong></span>
          </div>
        </div>
      </header>

      {/* 3. TWO-COLUMN COMMAND CONSOLE & VIEWPORT */}
      <div className="flex-1 flex flex-row items-center justify-between gap-6 my-6 overflow-hidden">
        
        {/* LEFT COLUMN: COMMAND CARD & PANEL (Pointer Events Auto) */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full md:w-[420px] max-w-full flex flex-col justify-between h-full bg-slate-950/60 border border-slate-800/40 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_25px_50px_rgba(0,0,0,0.5)] pointer-events-auto relative overflow-hidden"
        >
          {/* Glow border highlight */}
          <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent opacity-40 blur-[1px] pointer-events-none" />
          
          {/* Subtle grid background inside left card */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />

          <div className="space-y-6 my-auto z-10 relative">
            {/* Holographic Header Tag */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/15 text-[8.5px] font-mono font-bold tracking-widest text-cyan-400 uppercase animate-pulse shadow-[0_0_12px_rgba(6,182,212,0.12)]">
                <Radio className="w-3 h-3 text-cyan-400 animate-ping" />
                AeroSys Console Linked
              </div>
              
              <h2 className="text-3xl font-black tracking-tight uppercase leading-none text-white">
                EXPLORE. TRAIN.<br/>
                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,163,255,0.2)]">
                  FLY PLUTOX NANO.
                </span>
              </h2>
              
              <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                Welcome to the professional pilot curriculum for Drona Aviation's flagship nano-drone. Dissect 3D avionics, test components, and earn your pilot certification.
              </p>
            </div>

            {/* CTA Card Deck */}
            <div className="flex flex-col gap-3">
              
              {/* CTA CARD 1: ENTER FLIGHT SIM */}
              <button
                onClick={handleEnterFlightSim}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-cyan-500/5 hover:from-blue-600/30 hover:via-blue-500/20 hover:to-cyan-500/10 text-white font-bold uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_0_25px_rgba(0,163,255,0.25)] group border border-blue-500/20 hover:border-cyan-400/50 relative overflow-hidden active:scale-[0.99] text-left"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                <div className="flex items-center gap-3.5 z-10 w-full">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-[0_0_10px_rgba(0,163,255,0.1)]">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs tracking-wider block font-black text-slate-100">Enter Flight Sim</span>
                      <span className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 tracking-wide uppercase scale-90 origin-right">
                        {appLinkStatus === 'connected' ? 'Link Active' : 'Ready'}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-normal text-slate-400 group-hover:text-slate-300 tracking-wide block mt-1 truncate">
                      AR passthrough overlay or closed virtual sim
                    </span>
                  </div>
                </div>
                
                <div className="w-7 h-7 rounded-full border border-slate-800 bg-slate-900/50 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0">
                  →
                </div>
              </button>

              {/* CTA CARD 2: EXPLORE ANATOMY */}
              <button
                onClick={handleExploreAnatomy}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-900/60 border border-slate-800/60 hover:border-blue-500/40 text-slate-200 hover:text-white transition-all duration-300 backdrop-blur-md group relative overflow-hidden active:scale-[0.99] text-left"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.05),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                <div className="flex items-center gap-3.5 z-10 w-full">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30 shrink-0 group-hover:scale-105 transition-all duration-300">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs tracking-wider block font-bold">Explore Anatomy</span>
                      <span className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 tracking-wide uppercase scale-90 origin-right">
                        {clickedCount > 0 ? `${clickedCount}/11 Explored` : '11 Avionics Nodes'}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-normal text-slate-500 group-hover:text-slate-400 tracking-wide block mt-1 truncate">
                      Dissect 3D parts & read aerospace descriptions
                    </span>
                  </div>
                </div>
                
                <div className="w-7 h-7 rounded-full border border-slate-800 bg-slate-900/50 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0">
                  →
                </div>
              </button>

              {/* CTA CARD 3: LEARN TO FLY PLUTO */}
              <button
                onClick={handleLearnToFly}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-900/60 border border-slate-800/60 hover:border-emerald-500/40 text-slate-200 hover:text-white transition-all duration-300 backdrop-blur-md group relative overflow-hidden active:scale-[0.99] text-left"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.05),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                <div className="flex items-center gap-3.5 z-10 w-full">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 shrink-0 group-hover:scale-105 transition-all duration-300">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs tracking-wider block font-bold">Learn to Fly Pluto</span>
                      <span className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 tracking-wide uppercase scale-90 origin-right">
                        Level {unlockedCount}/5 Unlocked
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-normal text-slate-500 group-hover:text-slate-400 tracking-wide block mt-1 truncate">
                      Clear pilot certification academy levels
                    </span>
                  </div>
                </div>
                
                <div className="w-7 h-7 rounded-full border border-slate-800 bg-slate-900/50 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0">
                  →
                </div>
              </button>

            </div>
          </div>

          {/* Left panel footer */}
          <div className="mt-4 pt-4 border-t border-slate-900/60 flex justify-between items-center text-[8px] font-mono text-slate-500 uppercase tracking-widest z-10 relative">
            <div className="flex items-center gap-2">
              <span>SYS_LOC: 192.168.4.1</span>
              <span className="text-slate-800">//</span>
              <span className="text-cyan-500/50">PING: OK</span>
            </div>
            <div>DRONAVIA © 2026 // SIMCORE</div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: PLACEHOLDER FOR CENTERED-RIGHT 3D DRONE */}
        <div className="hidden md:flex flex-1 h-full items-center justify-center pointer-events-none relative">
          {/* Subtle volumetric glow centered where the drone is */}
          <div className="absolute w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none translate-x-[40px] translate-y-[-20px]" />
        </div>

      </div>

      {/* 5. ENTER FLIGHT SIM DISPATCHER MODAL DIALOG */}
      <AnimatePresence>
        {isFlightSimModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[3px] pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 380 }}
              className="relative max-w-2xl w-full bg-[#050814]/95 border border-blue-900/50 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,163,255,0.15)] overflow-hidden flex flex-col space-y-6"
            >
              {/* Glossy inner glow border */}
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-blue-500/10 via-slate-800/10 to-transparent pointer-events-none" />

              {/* Subtle aerospace blueprint lines in modal background */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />

              {/* Scanlines inside modal */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.15)_50%,rgba(0,0,0,0.2)_50%)] bg-[size:100%_4px] pointer-events-none opacity-20 mix-blend-overlay" />
              
              {/* Close Button */}
              <button
                onClick={() => setFlightSimModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:bg-slate-800 hover:text-white text-slate-400 transition-all duration-300 z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Aerospace Header */}
              <div className="space-y-3 pr-8 relative">
                <div className="flex items-center gap-4 text-[8px] font-mono tracking-widest uppercase">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-blue-500/30 bg-blue-950/30 text-blue-400 font-bold">
                    <Database className="w-2.5 h-2.5 text-cyan-400" /> Simulation Core Online
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Flight Systems Ready
                  </span>
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-white">
                  Mission Mode Selection
                </h3>
                <p className="text-[10px] text-slate-400 font-light leading-relaxed">
                  Configure simulation arena parameters. Authorize localized AR hardware pass-through telemetry or initialize the closed virtual 6-DOF physics sandbox environment.
                </p>
              </div>

              {/* Grid Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* MISSION CARD A: AR PASSTHROUGH */}
                <button
                  onClick={startARMode}
                  className="flex flex-col text-left p-6 rounded-2xl bg-slate-950/40 border border-slate-850 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 group relative overflow-hidden active:scale-[0.98] flex-1 justify-between h-full"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(6,182,212,0.02),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <div>
                    {/* Header Info Line */}
                    <div className="flex justify-between items-start w-full mb-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[7.5px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-950/20 text-cyan-400 uppercase">
                        Experimental
                      </span>
                    </div>

                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-100 group-hover:text-white">
                      AR Passthrough
                    </h4>
                    
                    <p className="text-[9.5px] text-slate-450 font-light leading-relaxed mt-2">
                      Stream your live room camera feed and steer the 3D model using floating virtual joystick knobs.
                    </p>

                    {/* Technical metadata blocks */}
                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-900/60 text-[8.5px] font-mono text-slate-400">
                      <div>
                        <span className="text-slate-500 uppercase">Use Case:</span>
                        <p className="text-slate-300 mt-0.5">View Pluto drone inside your physical room using camera passthrough.</p>
                      </div>
                      <div className="flex justify-between">
                        <span><span className="text-slate-500 uppercase">Hardware:</span> <strong className="text-slate-350">Webcam</strong></span>
                        <span><span className="text-slate-500 uppercase">Diff:</span> <strong className="text-slate-350">Intermediate</strong></span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[8px] font-mono text-cyan-400 font-bold uppercase tracking-widest mt-6 block group-hover:translate-x-1 transition-transform">
                    Launch Camera →
                  </span>
                </button>

                {/* MISSION CARD B: CLOSED SIMULATOR (VISUALLY DOMINANT) */}
                <button
                  onClick={startClosedSim}
                  className="flex flex-col text-left p-6 rounded-2xl bg-blue-950/10 border-2 border-blue-500/40 hover:border-blue-405 hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] transition-all duration-300 group relative overflow-hidden active:scale-[0.98] flex-1 justify-between h-full"
                >
                  {/* Glowing background hint */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.04),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <div>
                    {/* Header Info Line */}
                    <div className="flex justify-between items-start w-full mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                        <Box className="w-5 h-5" />
                      </div>
                      <span className="text-[7.5px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 uppercase animate-pulse">
                        Recommended
                      </span>
                    </div>

                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      Closed Simulator
                    </h4>
                    
                    <p className="text-[9.5px] text-slate-350 font-light leading-relaxed mt-2">
                      Load detailed virtual environments (Warehouse, Lab, Hoop Arena) with full 6-DOF physics and keyboard flight loops.
                    </p>

                    {/* Technical metadata blocks */}
                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-900/60 text-[8.5px] font-mono text-slate-300">
                      <div>
                        <span className="text-slate-400 uppercase">Use Case:</span>
                        <p className="text-slate-200 mt-0.5">Professional pilot training using virtual environments.</p>
                      </div>
                      <div className="flex justify-between">
                        <span><span className="text-slate-400 uppercase">Hardware:</span> <strong className="text-white">Keyboard</strong></span>
                        <span><span className="text-slate-400 uppercase">Diff:</span> <strong className="text-white">Beginner-Friendly</strong></span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[8px] font-mono text-blue-400 group-hover:text-cyan-400 font-bold uppercase tracking-widest mt-6 block group-hover:translate-x-1 transition-transform">
                    Enter Sandbox →
                  </span>
                </button>

              </div>

              {/* Mission Briefing Panel (Caution warning redesigned) */}
              <div className="flex gap-3.5 items-start p-4 bg-amber-950/10 border border-amber-500/20 rounded-2xl text-[9.5px] text-amber-300 leading-relaxed relative overflow-hidden">
                {/* Cyber alert corner lines */}
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-amber-500/30" />
                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-amber-500/30" />
                <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-amber-500/30" />
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-amber-500/30" />

                <ClipboardList className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-amber-400 block">Mission Briefing & Diagnostics</span>
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

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes scan-laser {
      0% { top: 0%; opacity: 0; }
      10% { opacity: 0.6; }
      90% { opacity: 0.6; }
      100% { top: 100%; opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
