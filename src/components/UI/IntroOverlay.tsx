import { motion, AnimatePresence } from 'framer-motion';
import { useDroneStore } from '../../store/useDroneStore';
import { 
  Gamepad2, Cpu, GraduationCap, Camera, Box, X, 
  Wifi, ShieldAlert, Cpu as CpuIcon, BatteryCharging 
} from 'lucide-react';

export function IntroOverlay() {
  const currentMode = useDroneStore((state) => state.currentMode);
  const isFlightSimModalOpen = useDroneStore((state) => state.isFlightSimModalOpen);
  const setFlightSimModalOpen = useDroneStore((state) => state.setFlightSimModalOpen);
  const setARActive = useDroneStore((state) => state.setARActive);
  const setMode = useDroneStore((state) => state.setMode);
  const selectMission = useDroneStore((state) => state.selectMission);

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
    // Set to free flight / main arena
    selectMission(-1);
    useDroneStore.getState().toggleAcademy(); // Close academy panel to let user fly freely
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 overflow-hidden">
      
      {/* Sci-Fi CRT Scanline & Grid Background effects (Visual wow factor) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.25)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] pointer-events-none opacity-30 mix-blend-overlay" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#070a13]/30 to-[#070a13]/85 pointer-events-none" />

      {/* 1. FUTURISTIC TELEMETRY HEADER STATUS PANEL */}
      <header className="w-full flex justify-between items-center pointer-events-auto bg-slate-950/40 border border-slate-800/50 backdrop-blur-md px-6 py-3.5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black tracking-tighter shadow-[0_0_15px_rgba(0,163,255,0.3)]">
            P
          </div>
          <div>
            <h1 className="text-base font-extrabold uppercase tracking-widest bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              PlutoXR
            </h1>
            <span className="text-[8px] font-mono text-cyan-400/80 uppercase tracking-widest block">
              3D Autonomous Twin v4.5
            </span>
          </div>
        </div>

        {/* Telemetry Status Bar */}
        <div className="flex items-center gap-6 font-mono text-[9px] text-slate-400 uppercase">
          <div className="hidden md:flex items-center gap-2 border-r border-slate-800/80 pr-6">
            <CpuIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>FCS Status: <strong className="text-emerald-400">ONLINE</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-2 border-r border-slate-800/80 pr-6">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>Telemetry link: <strong className="text-cyan-400">98% (12ms)</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
            <span>Drone Batt: <strong className="text-slate-200">12.6V (100%)</strong></span>
          </div>
        </div>
      </header>

      {/* 2. CENTER PANEL: SLOGAN & CTA COMMAND MODULE */}
      <div className="flex-1 flex flex-col justify-center items-center max-w-lg mx-auto text-center space-y-8 my-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-3"
        >
          <div className="inline-block px-3 py-1 rounded-full border border-blue-500/20 bg-blue-950/20 text-[9px] font-mono font-bold tracking-widest text-cyan-400 uppercase animate-pulse">
            Next-Gen UAV Cockpit
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight uppercase leading-none md:text-5xl text-white">
            Explore. Train. <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400 bg-clip-text text-transparent">Fly Pluto.</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed font-light px-4">
            Step into the virtual lab of DronaAviation's flagship nano-drone. Dissect its avionics in 3D exploded view, inspect physical flight states, or test your skills in the simulator.
          </p>
        </motion.div>

        {/* The 3 CTAs Navigation Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full flex flex-col gap-3.5 pointer-events-auto px-4"
        >
          {/* CTA 1: ENTER FLIGHT SIM */}
          <button
            onClick={handleEnterFlightSim}
            className="w-full flex items-center justify-between p-4.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold uppercase transition duration-300 shadow-[0_0_30px_rgba(0,163,255,0.25)] hover:shadow-[0_0_40px_rgba(0,163,255,0.4)] group border border-cyan-400/20"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-sm tracking-wider block leading-none">Enter Flight Sim</span>
                <span className="text-[9px] font-mono font-light text-cyan-100 uppercase tracking-widest block mt-1.5">
                  Launch AR passthrough or virtual sandbox
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              →
            </div>
          </button>

          {/* CTA 2: EXPLORE ANATOMY */}
          <button
            onClick={handleExploreAnatomy}
            className="w-full flex items-center justify-between p-4.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/50 text-slate-200 hover:text-white transition duration-300 backdrop-blur-md group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30 shrink-0 group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-sm tracking-wider block leading-none">Explore Anatomy</span>
                <span className="text-[9px] font-mono font-light text-slate-500 group-hover:text-slate-400 uppercase tracking-widest block mt-1.5">
                  Dissect 3D parts & inspect hardware schematics
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border border-slate-800 group-hover:border-blue-500/30 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              →
            </div>
          </button>

          {/* CTA 3: LEARN TO FLY PLUTO */}
          <button
            onClick={handleLearnToFly}
            className="w-full flex items-center justify-between p-4.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/50 text-slate-200 hover:text-white transition duration-300 backdrop-blur-md group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 shrink-0 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-sm tracking-wider block leading-none">Learn to Fly Pluto</span>
                <span className="text-[9px] font-mono font-light text-slate-500 group-hover:text-slate-400 uppercase tracking-widest block mt-1.5">
                  Complete pilot training curriculum missions
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border border-slate-800 group-hover:border-emerald-500/30 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              →
            </div>
          </button>
        </motion.div>
      </div>

      {/* 3. SCI-FI CORNER DECORATIVE ACCENTS */}
      <footer className="w-full flex justify-between items-center text-[8px] font-mono text-slate-600 uppercase tracking-wider select-none">
        <div>SYS_LOC: 192.168.4.1 // PORT: 8080</div>
        <div>DRONAVIA 3D CORE SYSTEM ENGINE © 2026</div>
      </footer>

      {/* 4. ENTER FLIGHT SIM MODAL DIALOG (GLASSMORPHISM POPUP) */}
      <AnimatePresence>
        {isFlightSimModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative max-w-lg w-full bg-slate-950/85 border border-slate-800/90 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col space-y-6"
            >
              {/* Scanlines inside modal */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.25)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] pointer-events-none opacity-20 mix-blend-overlay" />
              
              {/* Close Button */}
              <button
                onClick={() => setFlightSimModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:text-white text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1.5 pr-8">
                <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest block">Simulation Dispatcher</span>
                <h3 className="text-xl font-extrabold uppercase tracking-wide text-white">Select Flight Arena</h3>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  Choose your simulation layout. Launch the device camera for an Augmented Reality experience or select the virtual enclosed arena.
                </p>
              </div>

              {/* Options Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* OPTION A: AR MODE CARD */}
                <button
                  onClick={startARMode}
                  className="flex flex-col text-left p-5 rounded-2xl bg-gradient-to-b from-blue-950/30 to-blue-950/10 border border-blue-900/40 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300 group relative"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform mb-4 shadow-[0_0_12px_rgba(59,130,246,0.1)]">
                    <Camera className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 group-hover:text-white">
                    AR Passthrough
                  </h4>
                  <p className="text-[10px] text-slate-400 font-light leading-relaxed mt-2.5">
                    Projects the PlutoX model onto your real-world room camera stream. Includes virtual HUD controls.
                  </p>
                  <span className="text-[8px] font-mono text-cyan-400 font-bold uppercase tracking-widest mt-6 block">
                    Launch Camera →
                  </span>
                </button>

                {/* OPTION B: CLOSED SIM CARD */}
                <button
                  onClick={startClosedSim}
                  className="flex flex-col text-left p-5 rounded-2xl bg-gradient-to-b from-slate-900/50 to-slate-900/10 border border-slate-800/80 hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 group relative"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform mb-4 shadow-[0_0_12px_rgba(6,182,212,0.1)]">
                    <Box className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 group-hover:text-white">
                    Closed Simulator
                  </h4>
                  <p className="text-[10px] text-slate-400 font-light leading-relaxed mt-2.5">
                    Loads fully modeled 3D environments (Warehouse, Classroom, Arena) with obstacles and full keyboard pilot binds.
                  </p>
                  <span className="text-[8px] font-mono text-cyan-400 font-bold uppercase tracking-widest mt-6 block">
                    Enter Sandbox →
                  </span>
                </button>

              </div>

              {/* Warning Alert */}
              <div className="flex gap-3 items-start p-3 bg-amber-950/15 border border-amber-900/30 rounded-xl text-[10px] text-amber-300 leading-normal">
                <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="font-light">
                  <strong>Device Note:</strong> AR mode requires webcam or mobile camera authorization. For the best physical piloting mechanics, standard Keyboard controls are recommended in Closed Sim.
                </p>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
