import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroneStore } from '../../store/useDroneStore';
import { 
  Gamepad2, Cpu, GraduationCap, Camera, Box, X, 
  Wifi, ShieldAlert, Cpu as CpuIcon, BatteryCharging, 
  Orbit, Database, Radio
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

  if (currentMode !== 'home') return null;

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
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans text-white">
      
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 380 }}
              className="relative max-w-xl w-full bg-slate-950/90 border border-slate-800/80 rounded-[2rem] p-8 shadow-2xl overflow-hidden flex flex-col space-y-7"
            >
              {/* Glossy inner glow border */}
              <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-b from-slate-800/30 to-transparent pointer-events-none" />

              {/* Scanlines inside modal */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.2)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] pointer-events-none opacity-20 mix-blend-overlay" />
              
              {/* Close Button */}
              <button
                onClick={() => setFlightSimModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:bg-slate-800 hover:text-white text-slate-400 transition-all duration-300"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              <div className="space-y-2 pr-8">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-950/20 text-[8px] font-mono font-bold tracking-widest text-blue-400 uppercase">
                  <Database className="w-2.5 h-2.5" /> Simulation Core
                </span>
                <h3 className="text-2xl font-extrabold uppercase tracking-wider text-white">Select Flight Arena</h3>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  Choose your cockpit view. Authorize device video hardware to project PlutoX into your living space, or enter the closed virtual simulation courses.
                </p>
              </div>

              {/* Grid Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* OPTION A: AR PASSTHROUGH */}
                <button
                  onClick={startARMode}
                  className="flex flex-col text-left p-5.5 rounded-2xl bg-gradient-to-b from-blue-950/30 to-blue-950/5 border border-blue-900/40 hover:border-blue-500 hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300 group relative overflow-hidden active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.05),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-115 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-[0_0_12px_rgba(59,130,246,0.1)] mb-4">
                    <Camera className="w-5.5 h-5.5" />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 group-hover:text-white">
                    AR Passthrough
                  </h4>
                  <p className="text-[10px] text-slate-400 font-light leading-relaxed mt-2.5">
                    Stream your live room camera feed and steer the 3D model using floating virtual joystick knobs.
                  </p>
                  <span className="text-[8px] font-mono text-cyan-400 font-bold uppercase tracking-widest mt-6 block">
                    Launch Camera →
                  </span>
                </button>

                {/* OPTION B: CLOSED SIMULATOR */}
                <button
                  onClick={startClosedSim}
                  className="flex flex-col text-left p-5.5 rounded-2xl bg-gradient-to-b from-slate-900/50 to-slate-900/10 border border-slate-800/80 hover:border-cyan-500 hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] transition-all duration-300 group relative overflow-hidden active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(6,182,212,0.05),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-115 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.1)] mb-4">
                    <Box className="w-5.5 h-5.5" />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 group-hover:text-white">
                    Closed Simulator
                  </h4>
                  <p className="text-[10px] text-slate-400 font-light leading-relaxed mt-2.5">
                    Load detailed virtual environments (Warehouse, Lab, Hoop Arena) with full 6-DOF physics and keyboard flight loops.
                  </p>
                  <span className="text-[8px] font-mono text-cyan-400 font-bold uppercase tracking-widest mt-6 block">
                    Enter Sandbox →
                  </span>
                </button>

              </div>

              {/* Warning Alert banner */}
              <div className="flex gap-3 items-start p-4 bg-amber-950/15 border border-amber-900/35 rounded-2xl text-[10px] text-amber-300 leading-relaxed">
                <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="font-light">
                  <strong>Hardware Warning:</strong> AR mode depends on client web camera authorization. For precision stabilization testing, Keyboard pilot binds inside the Closed Sim are recommended.
                </p>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
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
