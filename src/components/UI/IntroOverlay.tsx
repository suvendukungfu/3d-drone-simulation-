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

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans text-white">
      
      {/* 1. HOLOGRAPHIC CRT INTERACTIVE OVERLAY EFFECTS */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.2)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] pointer-events-none opacity-30 mix-blend-overlay" />
      
      {/* Holographic scanner laser line moving up & down */}
      <div 
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent pointer-events-none"
        style={{
          animation: 'scan-laser 6s ease-in-out infinite',
        }}
      />
      
      {/* Sci-fi dark radial vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#070a13]/20 to-[#070a13]/90 pointer-events-none" />

      {/* 2. ULTRAPREMIUM TOP NAV / LINK TELEMETRY BAR */}
      <header className="w-full flex flex-col md:flex-row gap-4 justify-between items-center pointer-events-auto bg-slate-950/45 border border-slate-800/40 backdrop-blur-xl px-6 py-4 rounded-3xl relative shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
        {/* Glow highlight */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent opacity-50 blur-[2px] pointer-events-none" />

        <div className="flex items-center gap-3.5 z-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center text-white font-black tracking-tighter shadow-[0_0_20px_rgba(0,163,255,0.4)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <Orbit className="w-5.5 h-5.5 animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold uppercase tracking-widest bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-1.5 leading-none">
              PlutoXR <span className="text-[8px] bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold px-1.5 py-0.5 rounded-full font-mono tracking-normal">ACTIVE TWIN</span>
            </h1>
            <span className="text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest block mt-1.5">
              3D Autonomous Aerospace Simulator
            </span>
          </div>
        </div>

        {/* Diagnostic Telemetry Stats */}
        <div className="flex items-center gap-6 font-mono text-[9px] text-slate-400 uppercase z-10">
          <div className="hidden lg:flex items-center gap-2 border-r border-slate-800/80 pr-6">
            <CpuIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>FCS Load: <strong className="text-white font-bold">{mockCpu}%</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-2 border-r border-slate-800/80 pr-6">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>Link Quality: <strong className="text-cyan-400 font-bold">{mockLinkQuality}% ({mockPing}ms)</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Battery: <strong className="text-slate-200 font-bold">12.6V (100%)</strong></span>
          </div>
        </div>
      </header>

      {/* 3. CENTER SLOGAN & TACTICAL CTA COMMAND MATRIX */}
      <div className="flex-1 flex flex-col justify-center items-center max-w-xl mx-auto text-center space-y-8 my-6">
        
        {/* Holographic Header Tag */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-950/20 text-[9px] font-mono font-bold tracking-widest text-cyan-400 uppercase animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Radio className="w-3 h-3 text-cyan-400 animate-ping" />
            AeroSys Console Linked
          </div>
          
          <h2 className="text-4xl font-extrabold tracking-tight uppercase leading-none md:text-5xl text-white">
            Explore. Train. <br/>
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(0,163,255,0.15)]">
              Fly PlutoX Nano.
            </span>
          </h2>
          
          <p className="text-xs text-slate-400 leading-relaxed font-light px-6">
            Step into the next-generation virtual cockpit of DronaAviation's flagship nano-drone. Dissect its 3D avionics in exploded mode, run live diagnostic sweeps, or take control in simulated flight environments.
          </p>
        </motion.div>

        {/* Futuristic CTA Card Deck */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full flex flex-col gap-3.5 pointer-events-auto px-4 z-10"
        >
          
          {/* CTA 1: ENTER FLIGHT SIM (Primary Action) */}
          <button
            onClick={handleEnterFlightSim}
            className="w-full flex items-center justify-between p-4.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold uppercase transition-all duration-300 shadow-[0_10px_25px_rgba(0,163,255,0.25)] hover:shadow-[0_0_35px_rgba(0,163,255,0.45)] group border border-cyan-400/25 relative overflow-hidden active:scale-[0.99]"
          >
            {/* Sliding white light highlight reflection on hover */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="flex items-center gap-3.5 z-10">
              <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <Gamepad2 className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="text-left">
                <span className="text-sm tracking-wider block leading-none font-extrabold">Enter Flight Sim</span>
                <span className="text-[8px] font-mono font-normal text-cyan-100 uppercase tracking-widest block mt-2">
                  AR passthrough overlay or closed virtual sim
                </span>
              </div>
            </div>
            
            <div className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all">
              →
            </div>
          </button>

          {/* CTA 2: EXPLORE ANATOMY */}
          <button
            onClick={handleExploreAnatomy}
            className="w-full flex items-center justify-between p-4.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900 border border-slate-850 hover:border-blue-500/50 text-slate-200 hover:text-white transition-all duration-300 backdrop-blur-md group relative overflow-hidden active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.08),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="flex items-center gap-3.5 z-10">
              <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30 shrink-0 group-hover:scale-110 transition-all duration-300">
                <Cpu className="w-5.5 h-5.5" />
              </div>
              <div className="text-left">
                <span className="text-sm tracking-wider block leading-none font-bold">Explore Anatomy</span>
                <span className="text-[8px] font-mono font-normal text-slate-500 group-hover:text-slate-400 uppercase tracking-widest block mt-2">
                  Dissect 3D parts & read aerospace descriptions
                </span>
              </div>
            </div>
            
            <div className="w-8 h-8 rounded-full border border-slate-800 group-hover:border-blue-500/30 bg-slate-900/40 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all">
              →
            </div>
          </button>

          {/* CTA 3: LEARN TO FLY PLUTO */}
          <button
            onClick={handleLearnToFly}
            className="w-full flex items-center justify-between p-4.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900 border border-slate-850 hover:border-emerald-500/50 text-slate-200 hover:text-white transition-all duration-300 backdrop-blur-md group relative overflow-hidden active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.08),transparent)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="flex items-center gap-3.5 z-10">
              <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 shrink-0 group-hover:scale-110 transition-all duration-300">
                <GraduationCap className="w-5.5 h-5.5" />
              </div>
              <div className="text-left">
                <span className="text-sm tracking-wider block leading-none font-bold">Learn to Fly Pluto</span>
                <span className="text-[8px] font-mono font-normal text-slate-500 group-hover:text-slate-400 uppercase tracking-widest block mt-2">
                  Clear pilot certification academy levels
                </span>
              </div>
            </div>
            
            <div className="w-8 h-8 rounded-full border border-slate-800 group-hover:border-emerald-500/30 bg-slate-900/40 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all">
              →
            </div>
          </button>
        </motion.div>
      </div>

      {/* 4. FOOTER: CONSOLE LOG INFO */}
      <footer className="w-full flex justify-between items-center text-[8px] font-mono text-slate-650 uppercase tracking-widest select-none pt-4 border-t border-slate-900/60 z-10">
        <div className="flex items-center gap-3">
          <span>SYS_LOC: 192.168.4.1</span>
          <span className="text-slate-800">//</span>
          <span className="text-cyan-500/50">PING: OK</span>
        </div>
        <div>DRONAVIA SIMCORE © 2026 // ALL RIGHTS RESERVED</div>
      </footer>

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
