import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useDroneStore } from '../../store/useDroneStore';
import { PlutoXModel } from '../PlutoXModel';
import { 
  X, CameraOff, Activity, Battery 
} from 'lucide-react';

// Self-contained 3D Drone component inside AR canvas
function ARDrone({ 
  inputs, 
  positionRef, 
  rotationRef 
}: { 
  inputs: { throttle: number; yaw: number; pitch: number; roll: number };
  positionRef: React.MutableRefObject<THREE.Vector3>;
  rotationRef: React.MutableRefObject<THREE.Euler>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Arm motors on mount
  useEffect(() => {
    // Start motor audio/spin visual representation
    useDroneStore.getState().testAllMotors();
    return () => {
      useDroneStore.getState().stopAllMotors();
    };
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // 1. Simple physics/movement calculations for AR flight
    const speed = 2.5; // movement speed multiplier
    const rotSpeed = 2.0; // rotation speed multiplier

    // Yaw (Left Joystick X) -> Rotate model around Y axis
    rotationRef.current.y -= inputs.yaw * rotSpeed * delta;

    // Pitch (Right Joystick Y) -> Move along local forward/backward vector
    // Roll (Right Joystick X) -> Move along local left/right vector
    const direction = new THREE.Vector3(inputs.roll, 0, -inputs.pitch);
    direction.applyEuler(rotationRef.current);
    positionRef.current.addScaledVector(direction, speed * delta);

    // Throttle (Left Joystick Y) -> Adjust Y (altitude) between ground bounds
    positionRef.current.y += inputs.throttle * speed * delta;
    if (positionRef.current.y < -1.5) positionRef.current.y = -1.5; // ground limit
    if (positionRef.current.y > 3.0) positionRef.current.y = 3.0; // ceiling limit

    // Smoothly apply position and rotation to the 3D Group
    groupRef.current.position.lerp(positionRef.current, delta * 8);
    
    // Add subtle hover tilt when pitching/rolling
    const targetRoll = -inputs.roll * 0.25;
    const targetPitch = inputs.pitch * 0.25;
    
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetPitch, delta * 6);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRoll, delta * 6);
    groupRef.current.rotation.y = rotationRef.current.y;

    // Add gentle random floating noise to simulate wind/air turbulence
    const time = Date.now() * 0.003;
    groupRef.current.position.y += Math.sin(time) * 0.0015;
    groupRef.current.position.x += Math.cos(time * 0.8) * 0.001;
  });

  return (
    <group ref={groupRef}>
      <PlutoXModel isFlightMode={true} />
    </group>
  );
}

// Virtual Joystick subcomponent
interface JoystickProps {
  label: string;
  subLabels: { up: string; down: string; left: string; right: string };
  onChange: (values: { x: number; y: number }) => void;
}

function VirtualJoystick({ label, subLabels, onChange }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleStart = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const padRadius = rect.width / 2;
      const centerX = rect.left + padRadius;
      const centerY = rect.top + padRadius;

      // Get pointer absolute coords
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Displacement from center
      let dx = clientX - centerX;
      let dy = clientY - centerY;

      // Clamp to pad bounds
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > padRadius) {
        dx = (dx / distance) * padRadius;
        dy = (dy / distance) * padRadius;
      }

      setKnobPos({ x: dx, y: dy });

      // Normalized outputs (-1 to +1)
      onChange({
        x: dx / padRadius,
        y: -dy / padRadius // invert Y so upwards is positive
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
      setKnobPos({ x: 0, y: 0 });
      onChange({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, onChange]);

  return (
    <div className="flex flex-col items-center select-none shrink-0 pointer-events-auto">
      <span className="text-[9px] font-mono text-cyan-400/80 mb-2 tracking-widest uppercase">
        {label}
      </span>
      <div 
        ref={containerRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        className="w-32 h-32 rounded-full border-2 border-slate-700/60 bg-slate-950/60 backdrop-blur-sm relative flex items-center justify-center cursor-crosshair shadow-[inset_0_0_15px_rgba(0,163,255,0.05)] active:border-cyan-500/40 transition-colors"
      >
        {/* Helper directional arrows */}
        <span className="absolute top-1.5 text-[8px] font-mono text-slate-600 uppercase">{subLabels.up}</span>
        <span className="absolute bottom-1.5 text-[8px] font-mono text-slate-600 uppercase">{subLabels.down}</span>
        <span className="absolute left-1.5 text-[8px] font-mono text-slate-600 uppercase">{subLabels.left}</span>
        <span className="absolute right-1.5 text-[8px] font-mono text-slate-600 uppercase">{subLabels.right}</span>

        {/* Outer Ring Accent */}
        <div className="absolute inset-2 rounded-full border border-slate-800/40 pointer-events-none" />

        {/* Joystick Center Knob */}
        <div 
          className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700/80 shadow-[0_4px_10px_rgba(0,0,0,0.5),0_0_8px_rgba(0,163,255,0.1)] flex items-center justify-center transition-transform duration-75 active:scale-95"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            borderColor: isDragging ? '#06b6d4' : undefined
          }}
        >
          <div className={`w-3.5 h-3.5 rounded-full ${isDragging ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 'bg-slate-700'} transition-all`} />
        </div>
      </div>
    </div>
  );
}

export function ARSimulator() {
  const isARActive = useDroneStore((state) => state.isARActive);
  const setARActive = useDroneStore((state) => state.setARActive);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Interactive inputs from joysticks / keyboard
  const [joystickLeft, setJoystickLeft] = useState({ x: 0, y: 0 });
  const [joystickRight, setJoystickRight] = useState({ x: 0, y: 0 });

  // 3D coordinate tracker references
  const dronePos = useRef(new THREE.Vector3(0, 0, -2.5));
  const droneRot = useRef(new THREE.Euler(0, 0, 0));

  const [telemetry, setTelemetry] = useState({ alt: 1.0, pitch: 0, roll: 0, yaw: 0 });

  // Request Camera Stream on activation
  useEffect(() => {
    if (!isARActive) return;

    navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment', width: 1280, height: 720 } 
    })
      .then((stream) => {
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.warn("Camera access denied or unavailable: ", err);
      });

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      setCameraStream(null);
    };
  }, [isARActive]);

  // Hook keyboard inputs as fallback controls
  useEffect(() => {
    if (!isARActive) return;

    const keys = { w: false, s: false, a: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys) {
        // @ts-ignore
        keys[e.key] = true;
        updateControls();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys) {
        // @ts-ignore
        keys[e.key] = false;
        updateControls();
      }
    };

    const updateControls = () => {
      // Map keyboard to mock stick inputs
      const throttle = keys.w ? 0.8 : keys.s ? -0.8 : 0;
      const yaw = keys.a ? -0.8 : keys.d ? 0.8 : 0;
      const pitch = keys.ArrowUp ? 0.8 : keys.ArrowDown ? -0.8 : 0;
      const roll = keys.ArrowLeft ? -0.8 : keys.ArrowRight ? 0.8 : 0;

      setJoystickLeft({ x: yaw, y: throttle });
      setJoystickRight({ x: roll, y: pitch });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isARActive]);

  // Trigger telemetry display polling
  useEffect(() => {
    if (!isARActive) return;

    const interval = setInterval(() => {
      // Convert 3D position vectors into HUD telemetry values
      setTelemetry({
        alt: Math.max(0, (dronePos.current.y + 1.5) * 0.8), // map -1.5..3 to 0..3.6 meters
        pitch: Math.round(droneRot.current.x * (180 / Math.PI)),
        roll: Math.round(droneRot.current.z * (180 / Math.PI)),
        yaw: Math.round(((droneRot.current.y * (180 / Math.PI)) % 360 + 360) % 360)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isARActive]);

  if (!isARActive) return null;

  const handleExit = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setARActive(false);
  };

  // Map inputs combined (keyboard overrides active joystick resting state)
  const activeInputs = {
    throttle: joystickLeft.y,
    yaw: joystickLeft.x,
    pitch: joystickRight.y,
    roll: joystickRight.x
  };

  return (
    <div className="fixed inset-0 z-40 bg-black overflow-hidden flex flex-col justify-between">
      
      {/* 1. BACKGROUND LAYER: Webcam Stream or Cyber Grid Mockup */}
      <div className="absolute inset-0 z-0">
        {cameraStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          /* Mock AR Camera Viewport */
          <div className="w-full h-full bg-[#080d19] relative flex flex-col items-center justify-center border-2 border-cyan-500/10">
            {/* Sci-Fi Matrix Lines & Noise Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.25)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] pointer-events-none opacity-40 mix-blend-overlay" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.15)_0%,transparent_75%)]" />
            
            <div className="w-72 h-72 rounded-full border border-cyan-500/10 flex items-center justify-center animate-pulse">
              <div className="w-48 h-48 rounded-full border border-cyan-500/20 flex items-center justify-center">
                <CameraOff className="w-12 h-12 text-cyan-500/40" />
              </div>
            </div>
            <div className="mt-6 text-center space-y-1.5 z-10">
              <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase block animate-pulse">
                Camera Passthrough Offline
              </span>
              <p className="text-[9px] text-slate-500 font-mono uppercase">
                Using Virtual Tracking Space Grid // Ready to arm
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. MIDDLE LAYER: Transparent Three.js WebGL Canvas */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <Canvas
          camera={{ position: [0, 0, 0], fov: 60 }}
          gl={{ alpha: true, antialias: true }}
        >
          {/* Transparent scene setup */}
          <ambientLight intensity={1.2} color="#ffffff" />
          <directionalLight position={[5, 10, 3]} intensity={1.5} color="#ffffff" />
          <directionalLight position={[-5, 5, -3]} intensity={0.5} color="#cbd5e1" />
          
          <Environment preset="city" />

          {/* Render 3D Drone */}
          <ARDrone 
            inputs={activeInputs}
            positionRef={dronePos}
            rotationRef={droneRot}
          />
        </Canvas>
      </div>

      {/* 3. FOREGROUND LAYER: Cyber Telemetry HUD & Interactive Joysticks */}
      
      {/* Top HUD Status Ribbon */}
      <div className="w-full p-4 z-20 flex justify-between items-start pointer-events-none">
        
        {/* Back Button */}
        <button
          onClick={handleExit}
          className="pointer-events-auto p-2.5 rounded-xl bg-slate-950/75 border border-slate-800 backdrop-blur-md hover:bg-slate-900 text-slate-400 hover:text-white transition shadow-2xl flex items-center gap-2"
        >
          <X className="w-4.5 h-4.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Exit AR</span>
        </button>

        {/* Real-Time Telemetry HUD panel */}
        <div className="bg-slate-950/75 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 w-60 shadow-2xl font-mono text-[9px] text-slate-300 uppercase space-y-2">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
            <span className="text-cyan-400 font-bold tracking-widest flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Telemetry HUD
            </span>
            <span className="text-[7px] bg-cyan-950 text-cyan-400 px-1 rounded">AR Link</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1">
            <span>Altitude:</span>
            <span className="text-right text-white font-bold">{telemetry.alt.toFixed(2)} m</span>

            <span>Pitch:</span>
            <span className="text-right text-white font-bold">{telemetry.pitch}°</span>

            <span>Roll:</span>
            <span className="text-right text-white font-bold">{telemetry.roll}°</span>

            <span>Yaw Heading:</span>
            <span className="text-right text-white font-bold">{telemetry.yaw}°</span>
          </div>
          <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[8px]">
            <span className="flex items-center gap-1"><Battery className="w-3 h-3 text-emerald-400" /> 100%</span>
            <span className="text-slate-500">Signal: 98%</span>
          </div>
        </div>

      </div>

      {/* Interactive virtual joysticks at the bottom */}
      <div className="w-full p-8 z-20 flex justify-between items-end bg-gradient-to-t from-slate-950/70 via-slate-950/30 to-transparent pointer-events-none">
        
        {/* Left Joystick: Throttle (Altitude Y) & Yaw (Rotation Y) */}
        <VirtualJoystick 
          label="Left Stick"
          subLabels={{ up: 'Climb', down: 'Descend', left: 'Yaw L', right: 'Yaw R' }}
          onChange={(vals) => setJoystickLeft(vals)}
        />

        {/* Dynamic Warning Alert Overlay */}
        <div className="hidden lg:flex flex-col items-center max-w-xs text-center space-y-1 pointer-events-auto bg-slate-950/80 border border-slate-800/85 backdrop-blur px-4 py-2.5 rounded-xl">
          <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Controls Active</span>
          <p className="text-[8px] text-slate-500 font-mono leading-relaxed">
            Drag the virtual knobs to steer PlutoX. Keyboard fallback active (W/S, A/D, Arrows).
          </p>
        </div>

        {/* Right Joystick: Pitch (Z axis forward/back) & Roll (X axis left/right) */}
        <VirtualJoystick 
          label="Right Stick"
          subLabels={{ up: 'Pitch Fwd', down: 'Pitch Back', left: 'Roll L', right: 'Roll R' }}
          onChange={(vals) => setJoystickRight(vals)}
        />

      </div>

    </div>
  );
}
