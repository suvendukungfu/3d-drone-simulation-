import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { sound } from '../../utils/soundController';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useDroneStore } from '../../store/useDroneStore';
import { PlutoXModel } from '../PlutoXModel';
import { 
  X, Activity, Battery, Radio, Sliders, Compass, RotateCcw, RotateCw, RefreshCw,
  Shield, ShieldOff, Zap, Play, Smartphone, Video, CheckCircle2, AlertCircle
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { createXRStore, XR, XRDomOverlay, useXRHitTest, useXRInputSourceEvent } from '@react-three/xr';

// Initialize the WebXR Store
const xrStore = createXRStore({
  emulate: false,
});

interface ARDroneProps {
  inputs: { throttle: number; yaw: number; pitch: number; roll: number };
  positionRef: React.MutableRefObject<THREE.Vector3>;
  rotationRef: React.MutableRefObject<THREE.Euler>;
  placedPos: React.MutableRefObject<THREE.Vector3>;
  isArmed: boolean;
  flightStage: 'disarmed' | 'armed-idle' | 'flying';
  setFlightStage: (stage: 'disarmed' | 'armed-idle' | 'flying') => void;
  flipDirection: 'forward' | 'back' | 'left' | 'right' | null;
  setFlipDirection: (dir: 'forward' | 'back' | 'left' | 'right' | null) => void;
  flipProgress: number;
  setFlipProgress: (progress: number) => void;
}

function ARDrone({ 
  inputs, 
  positionRef, 
  rotationRef,
  placedPos,
  isArmed,
  flightStage,
  setFlightStage,
  flipDirection,
  setFlipDirection,
  flipProgress,
  setFlipProgress
}: ARDroneProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Sync motor audio triggers to arm state
  useEffect(() => {
    if (isArmed) {
      useDroneStore.getState().testAllMotors();
    } else {
      useDroneStore.getState().stopAllMotors();
    }
    return () => {
      useDroneStore.getState().stopAllMotors();
    };
  }, [isArmed]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const floorY = placedPos.current.y;

    // 1. Stage: Disarmed -> Locked to ground surface
    if (flightStage === 'disarmed') {
      positionRef.current.copy(placedPos.current);
      rotationRef.current.set(0, 0, 0);
      groupRef.current.position.copy(placedPos.current);
      groupRef.current.rotation.set(0, 0, 0);

      // Tell store propellers are off
      useDroneStore.setState({
        activeMotors: { motor1: false, motor2: false, motor3: false, motor4: false },
        motorRPMs: { motor1: 0, motor2: 0, motor3: 0, motor4: 0 }
      });
      return;
    }

    // 2. Stage: Armed Idle -> Run propellers at low idle RPM on the floor
    if (flightStage === 'armed-idle') {
      positionRef.current.copy(placedPos.current);
      rotationRef.current.set(0, 0, 0);
      groupRef.current.position.copy(placedPos.current);
      groupRef.current.rotation.set(0, 0, 0);

      useDroneStore.setState({
        activeMotors: { motor1: true, motor2: true, motor3: true, motor4: true },
        motorRPMs: { motor1: 1200, motor2: 1200, motor3: 1200, motor4: 1200 }
      });

      // Throttle stick input upwards triggers takeoff
      if (inputs.throttle > 0.15) {
        setFlightStage('flying');
      }
      return;
    }

    // 3. Stage: Flying -> 6-DOF controls
    const speed = 2.2;
    const rotSpeed = 1.8;

    // Yaw (Left Stick X) -> Rotate model heading Y
    rotationRef.current.y -= inputs.yaw * rotSpeed * delta;

    // Pitch (Right Y) & Roll (Right X) -> Moves drone horizontally relative to heading
    const direction = new THREE.Vector3(inputs.roll, 0, -inputs.pitch);
    direction.applyEuler(new THREE.Euler(0, rotationRef.current.y, 0));
    positionRef.current.addScaledVector(direction, speed * delta);

    // Throttle (Left Y) -> Adjusts Y altitude
    positionRef.current.y += inputs.throttle * speed * delta;

    // Clamp Y relative to dynamic floor
    if (positionRef.current.y < floorY) {
      positionRef.current.y = floorY;
    }
    const maxAltitude = floorY + 4.5;
    if (positionRef.current.y > maxAltitude) {
      positionRef.current.y = maxAltitude;
    }

    // Smooth visual positioning LERP
    groupRef.current.position.lerp(positionRef.current, delta * 10);

    // Visual rotation tilts or flip override animation
    if (flipDirection !== null) {
      const nextProgress = flipProgress + delta * 3.5; // full 360 flip in ~0.3s
      if (nextProgress >= 1.0) {
        setFlipProgress(0);
        setFlipDirection(null);
        groupRef.current.rotation.x = inputs.pitch * 0.25;
        groupRef.current.rotation.z = -inputs.roll * 0.25;
      } else {
        setFlipProgress(nextProgress);
        const flipAngle = nextProgress * Math.PI * 2;

        if (flipDirection === 'forward') {
          groupRef.current.rotation.x = -flipAngle;
        } else if (flipDirection === 'back') {
          groupRef.current.rotation.x = flipAngle;
        } else if (flipDirection === 'left') {
          groupRef.current.rotation.z = -flipAngle;
        } else if (flipDirection === 'right') {
          groupRef.current.rotation.z = flipAngle;
        }

        // sin lift curve to pop up organic looking altitude boost during flips
        const lift = Math.sin(nextProgress * Math.PI) * 0.35;
        groupRef.current.position.y += lift;
      }
    } else {
      // Normal fly tilts: pitch / roll tilts
      const targetRoll = -inputs.roll * 0.25;
      const targetPitch = inputs.pitch * 0.25;
      
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetPitch, delta * 6);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRoll, delta * 6);
    }
    
    groupRef.current.rotation.y = rotationRef.current.y;

    // Subtle random aerodynamic hover vibration
    const time = state.clock.getElapsedTime();
    groupRef.current.position.y += Math.sin(time * 3) * 0.0015;
    groupRef.current.position.x += Math.cos(time * 2.5) * 0.001;

    // RPM calculations based on throttle + tilt adjustments
    const baseRPM = 3500 + inputs.throttle * 3500;
    useDroneStore.setState({
      activeMotors: { motor1: true, motor2: true, motor3: true, motor4: true },
      motorRPMs: {
        motor1: Math.max(1000, baseRPM - inputs.pitch * 600 + inputs.roll * 600 - inputs.yaw * 600),
        motor2: Math.max(1000, baseRPM - inputs.pitch * 600 - inputs.roll * 600 + inputs.yaw * 600),
        motor3: Math.max(1000, baseRPM + inputs.pitch * 600 + inputs.roll * 600 + inputs.yaw * 600),
        motor4: Math.max(1000, baseRPM + inputs.pitch * 600 - inputs.roll * 600 - inputs.yaw * 600),
      }
    });

    // Update sound frequencies
    for (let i = 1; i <= 4; i++) {
      const motorKey = `motor${i}` as 'motor1'|'motor2'|'motor3'|'motor4';
      sound.updateMotorPitch(motorKey, useDroneStore.getState().motorRPMs[motorKey]);
    }
  });

  return (
    <group ref={groupRef} scale={[2.2, 2.2, 2.2]}>
      <PlutoXModel isFlightMode={true} modelPath="/PlutoX [Primus X2 v1].glb" />
    </group>
  );
}

// Virtual Joystick subcomponent
interface JoystickProps {
  label: string;
  value: { x: number; y: number };
  subLabels: { up: string; down: string; left: string; right: string };
  onChange: (values: { x: number; y: number }) => void;
}

function VirtualJoystick({ label, value, subLabels, onChange }: JoystickProps) {
  const theme = useDroneStore((state) => state.theme);
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleStart = () => {
    setIsDragging(true);
  };

  // Synchronize visual knob position when external value changes (like keyboard controls)
  useEffect(() => {
    if (isDragging) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padRadius = rect.width / 2;
    // Map normalized value (-1 to 1) back to pixels
    setKnobPos({
      x: value.x * padRadius,
      y: -value.y * padRadius // invert Y for display
    });
  }, [value, isDragging]);

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
      <span className={`text-[9px] font-mono mb-2 tracking-widest uppercase ${isDark ? 'text-cyan-400/80' : 'text-cyan-600/85'}`}>
        {label}
      </span>
      <div 
        ref={containerRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        className={`w-32 h-32 rounded-full border-2 relative flex items-center justify-center cursor-crosshair transition-colors backdrop-blur-sm ${
          isDark 
            ? 'border-slate-700/60 bg-slate-950/60 shadow-[inset_0_0_15px_rgba(0,163,255,0.05)] active:border-cyan-500/40' 
            : 'border-slate-300 bg-white/60 shadow-[inset_0_0_15px_rgba(0,163,255,0.02)] active:border-cyan-600/40'
        }`}
      >
        {/* Helper directional arrows */}
        <span className="absolute top-1.5 text-[8px] font-mono text-slate-400 dark:text-slate-600 uppercase">{subLabels.up}</span>
        <span className="absolute bottom-1.5 text-[8px] font-mono text-slate-400 dark:text-slate-600 uppercase">{subLabels.down}</span>
        <span className="absolute left-1.5 text-[8px] font-mono text-slate-400 dark:text-slate-600 uppercase">{subLabels.left}</span>
        <span className="absolute right-1.5 text-[8px] font-mono text-slate-400 dark:text-slate-600 uppercase">{subLabels.right}</span>

        {/* Outer Ring Accent */}
        <div className="absolute inset-2 rounded-full border border-slate-300/40 dark:border-slate-800/40 pointer-events-none" />

        {/* Joystick Center Knob */}
        <div 
          className={`w-11 h-11 rounded-full border flex items-center justify-center transition-transform duration-75 active:scale-95 ${
            isDark 
              ? 'bg-gradient-to-tr from-slate-900 to-slate-800 border-slate-700/80 shadow-[0_4px_10px_rgba(0,0,0,0.5),0_0_8px_rgba(0,163,255,0.1)]' 
              : 'bg-gradient-to-tr from-slate-200 to-slate-100 border-slate-300 shadow-[0_4px_10px_rgba(0,0,0,0.1),0_0_8px_rgba(0,163,255,0.05)]'
          }`}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            borderColor: isDragging ? (isDark ? '#06b6d4' : '#0891b2') : undefined
          }}
        >
          <div className={`w-3.5 h-3.5 rounded-full ${
            isDragging 
              ? (isDark ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 'bg-cyan-600 shadow-[0_0_10px_rgba(8,145,178,0.5)]') 
              : (isDark ? 'bg-slate-700' : 'bg-slate-350')
          } transition-all`} />
        </div>
      </div>
    </div>
  );
}

// Helper to compute device orientation quaternion
const computeDeviceQuaternion = (alpha: number, beta: number, gamma: number, screenOrientationAngle: number, headingOffset: number = 0) => {
  const alphaRad = THREE.MathUtils.degToRad(alpha + headingOffset);
  const betaRad = THREE.MathUtils.degToRad(beta);
  const gammaRad = THREE.MathUtils.degToRad(gamma);
  const screenAngleRad = THREE.MathUtils.degToRad(screenOrientationAngle);

  // Euler angles in YXZ order for device orientation mapping
  const euler = new THREE.Euler(betaRad, alphaRad, -gammaRad, 'YXZ');
  const qDevice = new THREE.Quaternion().setFromEuler(euler);

  // Screen orientation rotation (Z-axis)
  const screenQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenAngleRad);
  
  // Camera looks down -Z but device flat on table faces screen +Z (up)
  const adjustQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

  // Combine orientations: qDevice * adjustQuat * screenQuat
  const q = new THREE.Quaternion()
    .copy(qDevice)
    .multiply(adjustQuat)
    .multiply(screenQuat);

  return q;
};

// Component to handle camera rotation via gyro state
function ARCameraController({
  deviceOrientation,
  screenOrientation,
  headingOffset,
  cameraMode,
  threeCameraRef
}: {
  deviceOrientation: { alpha: number; beta: number; gamma: number } | null;
  screenOrientation: number;
  headingOffset: number;
  cameraMode: 'orbit' | 'gyro';
  threeCameraRef: React.MutableRefObject<THREE.Camera | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    threeCameraRef.current = camera;
    return () => {
      threeCameraRef.current = null;
    };
  }, [camera, threeCameraRef]);

  useFrame(() => {
    if (cameraMode === 'gyro' && deviceOrientation) {
      const targetQuat = computeDeviceQuaternion(
        deviceOrientation.alpha,
        deviceOrientation.beta,
        deviceOrientation.gamma,
        screenOrientation,
        headingOffset
      );
      // Smooth interpolation to prevent jitter
      camera.quaternion.slerp(targetQuat, 0.15);
      // Position camera at center origin for fixed-coordinate background passthrough
      camera.position.set(0, 0, 0);
    }
  });

  return null;
}

// Component to track drone coordinates and provide NDC projection
function DroneTracker({
  dronePosRef,
  onUpdate
}: {
  dronePosRef: React.MutableRefObject<THREE.Vector3>;
  onUpdate: (state: { visible: boolean; distance: number; angle: number } | null) => void;
}) {
  const { camera } = useThree();
  const frustum = useRef(new THREE.Frustum());
  const cameraViewProjectionMatrix = useRef(new THREE.Matrix4());

  useFrame(() => {
    if (!camera) return;

    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    cameraViewProjectionMatrix.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.current.setFromProjectionMatrix(cameraViewProjectionMatrix.current);

    const pos = dronePosRef.current;
    const distance = camera.position.distanceTo(pos);

    const screenPos = pos.clone().project(camera);
    const isOut = Math.abs(screenPos.x) > 0.95 || Math.abs(screenPos.y) > 0.95 || screenPos.z > 1;

    if (isOut) {
      let x = screenPos.x;
      let y = screenPos.y;
      if (screenPos.z > 1) {
        x = -x;
        y = -y;
      }
      
      const angleRad = Math.atan2(y, x);
      const angleDeg = angleRad * (180 / Math.PI);
      
      onUpdate({
        visible: true,
        distance,
        angle: angleDeg
      });
    } else {
      onUpdate({
        visible: false,
        distance,
        angle: 0
      });
    }
  });

  return null;
}

// Subcomponent to handle hit-test ground placement inside WebXR sessions
function XRPlacement({ 
  isPlaced, 
  setIsPlaced, 
  placedPos, 
  dronePos 
}: { 
  isPlaced: boolean; 
  setIsPlaced: (val: boolean) => void;
  placedPos: React.MutableRefObject<THREE.Vector3>;
  dronePos: React.MutableRefObject<THREE.Vector3>;
}) {
  const reticleRef = useRef<THREE.Mesh>(null);
  const [reticleVisible, setReticleVisible] = useState(false);
  const hitPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());

  // Continuous hit testing relative to viewer camera
  useXRHitTest((results, getWorldMatrix) => {
    if (isPlaced) {
      setReticleVisible(false);
      return;
    }
    if (results.length > 0) {
      const matrix = new THREE.Matrix4();
      getWorldMatrix(matrix, results[0]);
      hitPositionRef.current.setFromMatrixPosition(matrix);
      if (reticleRef.current) {
        reticleRef.current.position.copy(hitPositionRef.current);
        reticleRef.current.rotation.set(-Math.PI / 2, 0, 0);
      }
      setReticleVisible(true);
    } else {
      setReticleVisible(false);
    }
  }, 'viewer');

  // Trigger placement on select/tap
  useXRInputSourceEvent('all', 'select', () => {
    if (!isPlaced && reticleVisible) {
      dronePos.current.copy(hitPositionRef.current);
      placedPos.current.copy(hitPositionRef.current);
      setIsPlaced(true);
      setReticleVisible(false);
    }
  }, [isPlaced, reticleVisible]);

  if (isPlaced || !reticleVisible) return null;

  return (
    <mesh ref={reticleRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.07, 0.09, 32]} />
      <meshBasicMaterial color="#00ffcc" transparent opacity={0.8} depthWrite={false} />
    </mesh>
  );
}

// Subcomponent to handle click-to-place floor grid in Desktop/Mobile WebXR fallbacks
function FallbackPlacement({
  isPlaced,
  setIsPlaced,
  placedPos,
  dronePos,
  isDark
}: {
  isPlaced: boolean;
  setIsPlaced: (val: boolean) => void;
  placedPos: React.MutableRefObject<THREE.Vector3>;
  dronePos: React.MutableRefObject<THREE.Vector3>;
  isDark: boolean;
}) {
  const reticleRef = useRef<THREE.Mesh>(null);
  const [reticleVisible, setReticleVisible] = useState(true);

  if (isPlaced) return null;

  return (
    <>
      {/* Interactive invisible floor plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.5, 0]}
        onClick={(e) => {
          e.stopPropagation();
          dronePos.current.copy(e.point);
          placedPos.current.copy(e.point);
          setIsPlaced(true);
        }}
        onPointerMove={(e) => {
          if (reticleRef.current) {
            reticleRef.current.position.copy(e.point);
            setReticleVisible(true);
          }
        }}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Ground Grid Helpers */}
      <gridHelper args={[30, 30, isDark ? '#005555' : '#cbd5e1', isDark ? '#161d2a' : '#e2e8f0']} position={[0, -0.5, 0]} />
      <polarGridHelper args={[15, 16, 8, 64, isDark ? '#004444' : '#94a3b8', isDark ? '#0d1522' : '#cbd5e1']} position={[0, -0.49, 0]} />

      {/* Reticle guide */}
      {reticleVisible && (
        <mesh ref={reticleRef} position={[0, -0.48, -2]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.07, 0.09, 32]} />
          <meshBasicMaterial color="#00a3ff" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}

export function ARSimulator() {
  const isARActive = useDroneStore((state) => state.isARActive);
  const setARActive = useDroneStore((state) => state.setARActive);
  const theme = useDroneStore((state) => state.theme);
  const isDark = theme === 'light' ? false : true; // Enforced light theme support
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const uiContainerRef = useRef<HTMLDivElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  // WebXR and Flight stage states
  const [arSessionStarted, setArSessionStarted] = useState(isTestEnv);
  const [isWebXRAvailable, setIsWebXRAvailable] = useState<boolean | null>(null);
  const [isPlaced, setIsPlaced] = useState(isTestEnv);
  const [isArmed, setIsArmed] = useState(false);
  const [flightStage, setFlightStage] = useState<'disarmed' | 'armed-idle' | 'flying'>('disarmed');
  const [flipDirection, setFlipDirection] = useState<'forward' | 'back' | 'left' | 'right' | null>(null);
  const [flipProgress, setFlipProgress] = useState(0);

  // Camera state variables
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Gyroscope tracking state
  const [deviceOrientation, setDeviceOrientation] = useState<{ alpha: number; beta: number; gamma: number } | null>(null);
  const [screenOrientation, setScreenOrientation] = useState<number>(0);
  const [headingOffset, setHeadingOffset] = useState<number>(0);
  const [gyroPermissionGranted, setGyroPermissionGranted] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'gyro'>('orbit');

  // R3F Camera reference
  const threeCamera = useRef<THREE.Camera | null>(null);

  // Out of view drone indicator
  const [droneIndicator, setDroneIndicator] = useState<{ visible: boolean; distance: number; angle: number } | null>(null);

  // Interactive inputs from joysticks / keyboard
  const [joystickLeft, setJoystickLeft] = useState({ x: 0, y: 0 });
  const [joystickRight, setJoystickRight] = useState({ x: 0, y: 0 });

  // 3D coordinate tracker references
  const dronePos = useRef(new THREE.Vector3(0, -0.5, -2));
  const droneRot = useRef(new THREE.Euler(0, 0, 0));
  const placedPos = useRef(new THREE.Vector3(0, -0.5, -2));

  const [telemetry, setTelemetry] = useState({ alt: 1.0, pitch: 0, roll: 0, yaw: 0 });

  // WebXR support check on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        setIsWebXRAvailable(supported);
      }).catch(() => {
        setIsWebXRAvailable(false);
      });
    } else {
      setIsWebXRAvailable(false);
    }
  }, []);

  // Request Camera Stream with fallback
  const initCamera = async (deviceId?: string) => {
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access is not supported on this browser (requires HTTPS).");
      return;
    }

    // Stop existing stream first
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const facingModeIdeal = isMobile ? 'environment' : 'user';

    const constraints: MediaStreamConstraints = {
      video: deviceId 
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: facingModeIdeal }, width: { ideal: 1280 }, height: { ideal: 720 } }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          const playPromise = videoRef.current?.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => console.error("Video play error on metadata load:", e));
          }
        };
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.error("Initial video play error:", e));
        }
      }

      // Enumerate available video inputs
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setAvailableDevices(videoDevices);
      
      const activeVideoTrack = stream.getVideoTracks()[0];
      if (activeVideoTrack) {
        const settings = activeVideoTrack.getSettings();
        if (settings.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        }
      }
    } catch (err: any) {
      console.warn("Primary camera acquisition failed, trying fallback:", err);
      
      // Determine error messaging
      let errMsg = "Unable to access camera.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = "Camera permission denied. Please enable camera access in browser/system settings and try again.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = "No camera was found on this device.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = "Camera is already in use by another tab or application.";
      } else {
        errMsg = `Camera Error: ${err.message || err.name}`;
      }
      setCameraError(errMsg);

      // If permission wasn't denied, try a generic video constraint as fallback
      if (err.name !== 'NotAllowedError' && err.name !== 'PermissionDeniedError') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraStream(fallbackStream);
          setCameraError(null);
          
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.onloadedmetadata = () => {
              const playPromise = videoRef.current?.play();
              if (playPromise !== undefined) {
                playPromise.catch(e => console.error("Fallback video play error on metadata:", e));
              }
            };
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => console.error("Fallback video play error:", e));
            }
          }

          const devices = await navigator.mediaDevices.enumerateDevices();
          setAvailableDevices(devices.filter(d => d.kind === 'videoinput'));
          
          const activeVideoTrack = fallbackStream.getVideoTracks()[0];
          if (activeVideoTrack) {
            const settings = activeVideoTrack.getSettings();
            if (settings.deviceId) {
              setSelectedDeviceId(settings.deviceId);
            }
          }
        } catch (fallbackErr) {
          console.warn("Fallback camera failed:", fallbackErr);
        }
      }
    }
  };

  const handleCameraChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    initCamera(deviceId);
  };

  const handleFindDrone = () => {
    if (!deviceOrientation || !dronePos.current) return;
    const pos = dronePos.current.clone();
    
    // Target yaw heading from camera to drone in horizontal plane
    // atan2(-x, -z) gives rotation around Y axis in Three.js coordinates
    const targetYaw = Math.atan2(-pos.x, -pos.z) * (180 / Math.PI);
    
    // We want the final camera alpha (corrected for headingOffset) to match targetYaw:
    // deviceOrientation.alpha + headingOffset = targetYaw
    // So headingOffset = targetYaw - deviceOrientation.alpha
    const newOffset = targetYaw - deviceOrientation.alpha;
    setHeadingOffset(newOffset);
  };

  const handleRecenterDrone = () => {
    // Project new position 2m in front of the current camera vector
    const dir = new THREE.Vector3(0, 0, -1);
    if (threeCamera.current) {
      dir.applyQuaternion(threeCamera.current.quaternion);
    }
    const newPos = dir.normalize().multiplyScalar(2);
    
    // Clamp height to physical bounds
    newPos.y = THREE.MathUtils.clamp(newPos.y, -1.5, 3.0);
    
    // Place drone relative to camera height (0) and preserve ground limits
    dronePos.current.copy(newPos);
    placedPos.current.copy(newPos);
    droneRot.current.set(0, 0, 0);
  };

  const handleRestartARSession = () => {
    setIsPlaced(false);
    setIsArmed(false);
    setFlightStage('disarmed');
    dronePos.current.set(0, -0.5, -2);
    placedPos.current.set(0, -0.5, -2);
    droneRot.current.set(0, 0, 0);
    if (deviceOrientation) {
      setHeadingOffset(-deviceOrientation.alpha);
    } else {
      setHeadingOffset(0);
    }
    if (!isPresenting) {
      initCamera();
    }
  };

  const handleRefreshTracking = async () => {
    const success = await requestGyroPermission();
    if (success && deviceOrientation) {
      setHeadingOffset(-deviceOrientation.alpha);
    } else {
      setHeadingOffset(0);
    }
  };

  // CV Hand Gesture Controls
  const [cvEnabled, setCvEnabled] = useState(false);
  const [cvOverlayOpen, setCvOverlayOpen] = useState(false);
  const [leftCentroid, setLeftCentroid] = useState<{ x: number; y: number } | null>(null);
  const [rightCentroid, setRightCentroid] = useState<{ x: number; y: number } | null>(null);

  const cvCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!offscreenCanvasRef.current && typeof document !== 'undefined') {
    offscreenCanvasRef.current = document.createElement('canvas');
    offscreenCanvasRef.current.width = 160;
    offscreenCanvasRef.current.height = 120;
  }

  // Ctrl + Shift listener to toggle CV config panel
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        setCvOverlayOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // CV image processing loop (Skin-Color Detection centroid tracking)
  useEffect(() => {
    if (!isARActive || !cameraStream || !cvEnabled) return;

    let active = true;
    const video = videoRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!video || !offscreen) return;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    const processFrame = () => {
      if (!active || !cvEnabled) return;

      try {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
          const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
          const data = imgData.data;
          const w = offscreen.width;
          const h = offscreen.height;

          // Left Zone: X in [0.1, 0.4], Y in [0.2, 0.8]
          // Right Zone: X in [0.6, 0.9], Y in [0.2, 0.8]
          const leftBound = { x1: Math.floor(w * 0.1), x2: Math.floor(w * 0.4), y1: Math.floor(h * 0.2), y2: Math.floor(h * 0.8) };
          const rightBound = { x1: Math.floor(w * 0.6), x2: Math.floor(w * 0.9), y1: Math.floor(h * 0.2), y2: Math.floor(h * 0.8) };

          let leftSumX = 0, leftSumY = 0, leftCount = 0;
          let rightSumX = 0, rightSumY = 0, rightCount = 0;

          const diagCanvas = cvCanvasRef.current;
          let diagCtx: CanvasRenderingContext2D | null = null;
          let diagImgData: ImageData | null = null;
          if (diagCanvas) {
            diagCtx = diagCanvas.getContext('2d');
            if (diagCtx) {
              diagImgData = diagCtx.createImageData(w, h);
            }
          }

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];

              // HSV-like skin color thresholding
              const isSkin = r > 80 && g > 35 && b > 15 &&
                             r > g && r > b &&
                             (r - Math.min(g, b)) > 15 &&
                             Math.abs(r - g) > 10;

              if (diagImgData) {
                const diagIdx = (y * w + x) * 4;
                if (isSkin) {
                  diagImgData.data[diagIdx] = 0;
                  diagImgData.data[diagIdx + 1] = 240;
                  diagImgData.data[diagIdx + 2] = 255;
                  diagImgData.data[diagIdx + 3] = 255;
                } else {
                  diagImgData.data[diagIdx] = 3;
                  diagImgData.data[diagIdx + 1] = 7;
                  diagImgData.data[diagIdx + 2] = 18;
                  diagImgData.data[diagIdx + 3] = 180;
                }
              }

              if (isSkin) {
                if (x >= leftBound.x1 && x <= leftBound.x2 && y >= leftBound.y1 && y <= leftBound.y2) {
                  leftSumX += x;
                  leftSumY += y;
                  leftCount++;
                }
                if (x >= rightBound.x1 && x <= rightBound.x2 && y >= rightBound.y1 && y <= rightBound.y2) {
                  rightSumX += x;
                  rightSumY += y;
                  rightCount++;
                }
              }
            }
          }

          if (diagCtx && diagImgData) {
            diagCtx.putImageData(diagImgData, 0, 0);
            diagCtx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
            diagCtx.lineWidth = 1;
            diagCtx.strokeRect(leftBound.x1, leftBound.y1, leftBound.x2 - leftBound.x1, leftBound.y2 - leftBound.y1);
            diagCtx.strokeRect(rightBound.x1, rightBound.y1, rightBound.x2 - rightBound.x1, rightBound.y2 - rightBound.y1);
          }

          const minPixels = 80;
          if (leftCount > minPixels) {
            const cx = leftSumX / leftCount;
            const cy = leftSumY / leftCount;
            const zcX = (leftBound.x1 + leftBound.x2) / 2;
            const zcY = (leftBound.y1 + leftBound.y2) / 2;
            const dx = (cx - zcX) / ((leftBound.x2 - leftBound.x1) / 2);
            const dy = -(cy - zcY) / ((leftBound.y2 - leftBound.y1) / 2);
            
            setJoystickLeft((prev) => ({
              x: prev.x * 0.65 + THREE.MathUtils.clamp(dx * 1.5, -1, 1) * 0.35,
              y: prev.y * 0.65 + THREE.MathUtils.clamp(dy * 1.5, -1, 1) * 0.35
            }));
            setLeftCentroid({ x: cx / w, y: cy / h });
          } else {
            setJoystickLeft((prev) => ({ x: prev.x * 0.8, y: prev.y * 0.8 }));
            setLeftCentroid(null);
          }

          if (rightCount > minPixels) {
            const cx = rightSumX / rightCount;
            const cy = rightSumY / rightCount;
            const zcX = (rightBound.x1 + rightBound.x2) / 2;
            const zcY = (rightBound.y1 + rightBound.y2) / 2;
            const dx = (cx - zcX) / ((rightBound.x2 - rightBound.x1) / 2);
            const dy = -(cy - zcY) / ((rightBound.y2 - rightBound.y1) / 2);

            setJoystickRight((prev) => ({
              x: prev.x * 0.65 + THREE.MathUtils.clamp(dx * 1.5, -1, 1) * 0.35,
              y: prev.y * 0.65 + THREE.MathUtils.clamp(dy * 1.5, -1, 1) * 0.35
            }));
            setRightCentroid({ x: cx / w, y: cy / h });
          } else {
            setJoystickRight((prev) => ({ x: prev.x * 0.8, y: prev.y * 0.8 }));
            setRightCentroid(null);
          }
        }
      } catch (err) {
        console.error("Error in CV processing loop:", err);
      }

      if (active) {
        requestAnimationFrame(processFrame);
      }
    };

    requestAnimationFrame(processFrame);

    return () => {
      active = false;
    };
  }, [isARActive, cameraStream, cvEnabled]);

  // Request Gyroscope permissions (iOS 13+)
  const requestGyroPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-ignore
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        // @ts-ignore
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          setGyroPermissionGranted(true);
          return true;
        } else {
          setGyroPermissionGranted(false);
          return false;
        }
      } catch (err: any) {
        console.error("Error requesting gyro permission:", err);
        return false;
      }
    } else {
      // Android / Desktop
      if (typeof window.DeviceOrientationEvent !== 'undefined') {
        setGyroPermissionGranted(true);
        return true;
      } else {
        return false;
      }
    }
  };

  const [isPresenting, setIsPresenting] = useState(false);
  useEffect(() => {
    return xrStore.subscribe((state) => {
      setIsPresenting(!!state.session);
    });
  }, []);

  // 1. Manage camera lifecycle based on active state
  useEffect(() => {
    if (isARActive && arSessionStarted && !isPresenting) {
      initCamera();
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isARActive, arSessionStarted, isPresenting]);

  // 2. Auto-detect mobile and request sensor tracking
  useEffect(() => {
    if (!isARActive || !arSessionStarted || isPresenting) return;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      setCameraMode('gyro');
      requestGyroPermission();
    } else {
      setCameraMode('orbit');
    }
  }, [isARActive, arSessionStarted, isPresenting]);

  // 3. Listen to device orientation changes
  useEffect(() => {
    if (!isARActive || !gyroPermissionGranted || isPresenting) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // For iOS, webkitCompassHeading provides absolute magnetic compass heading.
      // For Android absolute event, e.alpha is already absolute magnetic heading.
      const anyEvent = e as any;
      const alpha = anyEvent.webkitCompassHeading !== undefined 
        ? 360 - anyEvent.webkitCompassHeading 
        : (anyEvent.absolute ? anyEvent.alpha : anyEvent.alpha);
      
      if (alpha !== null && e.beta !== null && e.gamma !== null) {
        setDeviceOrientation({ alpha, beta: e.beta, gamma: e.gamma });
      }
    };

    const handleScreenOrientation = () => {
      const angle = window.screen?.orientation?.angle ?? (window.orientation as number) ?? 0;
      setScreenOrientation(angle);
    };

    // Prefer deviceorientationabsolute on Android Chrome/Samsung Internet for correct north alignment
    const hasAbsoluteEvent = 'ondeviceorientationabsolute' in window;
    
    if (hasAbsoluteEvent) {
      window.addEventListener('deviceorientationabsolute', handleOrientation);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    window.addEventListener('orientationchange', handleScreenOrientation);
    
    handleScreenOrientation();

    return () => {
      if (hasAbsoluteEvent) {
        window.removeEventListener('deviceorientationabsolute', handleOrientation);
      } else {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      window.removeEventListener('orientationchange', handleScreenOrientation);
    };
  }, [isARActive, gyroPermissionGranted]);

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

  // Prevent WebXR hit-test select events when clicking on HTML overlay UI elements
  useEffect(() => {
    const ui = uiContainerRef.current;
    if (!ui) return;
    const preventSelect = (e: Event) => {
      e.stopPropagation();
    };
    ui.addEventListener('beforexrselect', preventSelect);
    return () => {
      ui.removeEventListener('beforexrselect', preventSelect);
    };
  }, [arSessionStarted]);

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
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsArmed((prev) => {
          const next = !prev;
          if (next) {
            setFlightStage('armed-idle');
          } else {
            setFlightStage('disarmed');
          }
          return next;
        });
      }
      if (e.key === 'Enter' || e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (flightStage === 'armed-idle') {
          setFlightStage('flying');
          dronePos.current.y = placedPos.current.y + 0.3;
        }
      }
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (flightStage === 'flying' && flipDirection === null) {
          setFlipDirection('forward');
          setFlipProgress(0);
        }
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
  }, [isARActive, flightStage, flipDirection]);

  // Trigger telemetry display polling
  useEffect(() => {
    if (!isARActive) return;

    const interval = setInterval(() => {
      const floorY = placedPos.current.y;
      setTelemetry({
        alt: Math.max(0, (dronePos.current.y - floorY) * 2.0), // height relative to floor Y
        pitch: Math.round(droneRot.current.x * (180 / Math.PI)),
        roll: Math.round(droneRot.current.z * (180 / Math.PI)),
        yaw: Math.round(((droneRot.current.y * (180 / Math.PI)) % 360 + 360) % 360)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isARActive]);

  if (!isARActive) return null;

  const handleExit = () => {
    // End WebXR session if active
    const session = xrStore.getState().session;
    if (session) {
      session.end().catch((err) => console.warn("Failed to end WebXR session:", err));
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setARActive(false);
  };

  // Lobby landing page overlay when AR session hasn't started yet
  if (!arSessionStarted) {
    return (
      <div className={`fixed inset-0 z-40 flex items-center justify-center p-4 overflow-y-auto uppercase ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
        <div className={`absolute inset-0 pointer-events-none bg-[size:32px_32px] ${isDark ? 'bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)]' : 'bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)]'}`} />
        
        <div className={`w-[440px] relative z-10 p-6 rounded-3xl border backdrop-blur-xl shadow-2xl space-y-6 font-mono text-[9px] ${
          isDark 
            ? 'bg-slate-900/80 border-cyan-500/20 shadow-cyan-950/20' 
            : 'bg-white/90 border-slate-200 shadow-slate-300/30'
        }`}>
          {/* Header */}
          <div className="text-center space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className={`text-sm font-bold tracking-[0.2em] ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
              PlutoX WebXR AR Simulator
            </h2>
            <p className="text-[8px] text-slate-400">Ready for spatial flight telemetry</p>
          </div>

          {/* System Check Status */}
          <div className="space-y-3">
            <span className="font-bold text-[8.5px] text-slate-400 block tracking-widest">Hardware / Sensor Calibration Checklist</span>
            
            {/* 1. WebXR Check */}
            <div className={`flex justify-between items-center p-3 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Smartphone className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <div className="flex flex-col">
                  <span className="font-bold">WebXR Immersive AR</span>
                  <span className="text-[7px] text-slate-400 leading-none">Native 3D room-scale tracking</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                {isWebXRAvailable === null ? (
                  <span className="text-slate-400 animate-pulse">Checking...</span>
                ) : isWebXRAvailable ? (
                  <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Supported</span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Unavailable</span>
                )}
              </div>
            </div>

            {/* 2. Webcam Check */}
            <div className={`flex justify-between items-center p-3 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Video className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <div className="flex flex-col">
                  <span className="font-bold">Webcam Passthrough</span>
                  <span className="text-[7px] text-slate-400 leading-none">Real-world visual overlay</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                {cameraStream ? (
                  <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>
                ) : (
                  <span className="text-slate-400">Needs Consent</span>
                )}
              </div>
            </div>

            {/* 3. Gyro Check */}
            <div className={`flex justify-between items-center p-3 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Compass className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <div className="flex flex-col">
                  <span className="font-bold">Motion Sensors</span>
                  <span className="text-[7px] text-slate-400 leading-none">Gyroscope and compass alignment</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                {gyroPermissionGranted ? (
                  <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Calibrated</span>
                ) : (
                  <span className="text-slate-400">Needs Permission</span>
                )}
              </div>
            </div>
          </div>

          {/* Guidelines info */}
          <div className={`p-3 rounded-xl border text-[7.5px] leading-relaxed lowercase ${isDark ? 'bg-cyan-950/10 border-cyan-900/40 text-cyan-400/80' : 'bg-cyan-50 border-cyan-100 text-cyan-600'}`}>
            <span className="font-bold block mb-0.5 uppercase">Developer Advisory:</span>
            For a true WebXR immersive-ar experience with automatic ground plane tracking, use an Android Chrome browser. iOS Safari and Desktop environments will load in AR Preview Mode with mouse OrbitControls and webcam overlay.
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={async () => {
                // Request camera permission
                await initCamera();
                // Request gyroscope permission
                await requestGyroPermission();
                
                if (isWebXRAvailable) {
                  // Enter immersive-ar WebXR
                  try {
                    await xrStore.enterAR();
                    setArSessionStarted(true);
                  } catch (err) {
                    console.error("WebXR session failed, starting preview fallback:", err);
                    setArSessionStarted(true);
                  }
                } else {
                  // Fallback to desktop/mobile preview
                  setArSessionStarted(true);
                }
              }}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/20 text-center tracking-widest text-[10px] animate-pulse active:scale-95 transition"
            >
              {isWebXRAvailable ? "START AR EXPERIENCE" : "START AR PREVIEW"}
            </button>
            
            <button
              onClick={handleExit}
              className={`w-full py-2.5 rounded-xl border text-center transition font-bold ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              Cancel & Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeInputs = {
    throttle: joystickLeft.y,
    yaw: joystickLeft.x,
    pitch: joystickRight.y,
    roll: joystickRight.x
  };

  const renderHUD = () => {
    return (
      <div 
        ref={uiContainerRef} 
        className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none"
      >
        {/* Out of view drone indicator */}
        {droneIndicator && droneIndicator.visible && isPlaced && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
            <div 
              className="absolute bg-slate-950/85 border border-cyan-500/40 text-cyan-400 font-mono text-[9px] px-3 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse pointer-events-auto"
              style={{
                transform: `translate(${Math.cos(droneIndicator.angle * Math.PI / 180) * 110}px, ${-Math.sin(droneIndicator.angle * Math.PI / 180) * 110}px)`
              }}
            >
              <span 
                style={{ 
                  display: 'inline-block',
                  transform: `rotate(${-droneIndicator.angle}deg)`
                }}
              >
                ➔
              </span>
              <span>Drone {droneIndicator.distance.toFixed(1)}m</span>
            </div>
          </div>
        )}

        {/* Prompt to place drone on floor */}
        {!isPlaced && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs pointer-events-none text-center">
            <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl px-6 py-4 shadow-2xl max-w-xs animate-bounce font-mono text-[10px] text-cyan-400 uppercase tracking-widest leading-relaxed">
              <Smartphone className="w-5 h-5 mx-auto mb-2 text-cyan-400 animate-pulse" />
              {isPresenting 
                ? "Scan floor, then tap the reticle to place PlutoX drone" 
                : "Click on the grid floor to place the PlutoX drone"
              }
            </div>
          </div>
        )}

        {/* Top HUD Status Ribbon */}
        <div className="w-full p-4 flex justify-between items-start pointer-events-none">
          
          {/* Actions Button Panel */}
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={handleExit}
              className="p-2.5 rounded-xl bg-white/85 dark:bg-slate-950/75 border border-slate-200 dark:border-slate-800 backdrop-blur-md hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition shadow-2xl flex items-center gap-2"
            >
              <X className="w-4.5 h-4.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Exit AR</span>
            </button>

            {/* Prompt/Shortcut key indicator */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-md text-[8px] font-mono font-bold uppercase tracking-wider ${isDark ? 'bg-slate-950/75 border-slate-800/80 text-cyan-400' : 'bg-white/85 border-slate-200 text-cyan-605'}`}>
              <Radio className={`w-3.5 h-3.5 animate-pulse ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <span>Keyboard: <kbd className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded">Space</kbd> Arm // <kbd className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded">Enter</kbd> Takeoff // <kbd className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded">F</kbd> Flip</span>
            </div>

            {/* Mode Watermark */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-md text-[8px] font-mono font-bold uppercase tracking-wider ${isDark ? 'bg-slate-950/75 border-slate-800/80 text-cyan-400' : 'bg-white/85 border-slate-200 text-cyan-605'}`}>
              {isPresenting ? (
                <span className="text-emerald-400 font-bold animate-pulse">WebXR Immersive AR</span>
              ) : (
                <span className="text-amber-400 font-bold">AR Preview Mode</span>
              )}
            </div>
          </div>

          {/* Real-Time Telemetry HUD panel */}
          <div className="bg-white/85 dark:bg-slate-950/75 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md rounded-2xl p-4 w-60 shadow-2xl font-mono text-[9px] text-slate-700 dark:text-slate-300 uppercase space-y-2">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className={`font-bold tracking-widest flex items-center gap-1.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                <Activity className="w-3.5 h-3.5" /> Telemetry HUD
              </span>
              <span className={`text-[7px] px-1 rounded ${isArmed ? 'bg-red-950 text-red-400' : 'bg-cyan-50 text-cyan-600 border border-cyan-200/50'}`}>
                {isArmed ? (flightStage === 'armed-idle' ? 'ARMED_IDLE' : 'FLYING') : 'DISARMED'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-1">
              <span>Altitude:</span>
              <span className="text-right text-slate-900 dark:text-white font-bold">{telemetry.alt.toFixed(2)} m</span>

              <span>Pitch:</span>
              <span className="text-right text-slate-900 dark:text-white font-bold">{telemetry.pitch}°</span>

              <span>Roll:</span>
              <span className="text-right text-slate-900 dark:text-white font-bold">{telemetry.roll}°</span>

              <span>Yaw Heading:</span>
              <span className="text-right text-slate-900 dark:text-white font-bold">{telemetry.yaw}°</span>
            </div>
            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[8px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><Battery className="w-3 h-3 text-emerald-400" /> 100%</span>
              <span className="text-slate-500 dark:text-slate-450">Signal: 98%</span>
            </div>
          </div>

        </div>

        {/* AR Session Toolbox (Left Panel) */}
        <div className="absolute left-4 top-24 z-20 pointer-events-auto flex flex-col gap-3 w-52 bg-white/85 dark:bg-slate-950/75 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md rounded-2xl p-4 shadow-2xl font-mono text-[9px] text-slate-700 dark:text-slate-300 uppercase">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <span className={`font-bold tracking-widest flex items-center gap-1.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
              <Sliders className="w-3.5 h-3.5" /> AR Toolbox
            </span>
            <span className={`text-[7px] px-1 rounded ${cameraMode === 'gyro' ? 'bg-cyan-950 text-cyan-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
              {cameraMode === 'gyro' ? 'Gyro active' : 'Orbit mode'}
            </span>
          </div>

          {/* Camera Selection Dropdown (Only for fallback webcam mode) */}
          {!isPresenting && (
            <div className="flex flex-col gap-1">
              <label className="text-[7.5px] text-slate-500 dark:text-slate-400">Select Video Input</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded px-2 py-1 text-slate-800 dark:text-white"
              >
                {availableDevices.length > 0 ? (
                  availableDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default Camera</option>
                )}
              </select>
            </div>
          )}

          {/* Camera Error / Permission retry if applicable */}
          {!isPresenting && cameraError && (
            <div className="text-[7.5px] text-red-500 bg-red-500/10 p-1.5 rounded border border-red-500/20 lowercase">
              {cameraError}
            </div>
          )}

          {/* Flight Controls Section (Only available once drone is placed) */}
          {isPlaced && (
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
              <span className="text-[7.5px] text-slate-500 dark:text-slate-400">Flight Controls</span>
              
              <button
                onClick={() => {
                  setIsArmed((prev) => {
                    const next = !prev;
                    if (next) {
                      setFlightStage('armed-idle');
                    } else {
                      setFlightStage('disarmed');
                    }
                    return next;
                  });
                }}
                className={`w-full py-1.5 border font-bold rounded flex items-center justify-center gap-1.5 transition ${
                  isArmed 
                    ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30' 
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                }`}
              >
                {isArmed ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                {isArmed ? 'Disarm Drone' : 'Arm Drone'}
              </button>

              <button
                onClick={() => {
                  if (flightStage === 'armed-idle') {
                    setFlightStage('flying');
                    dronePos.current.y = placedPos.current.y + 0.3; // lift off slightly
                  } else if (flightStage === 'flying') {
                    setFlightStage('armed-idle');
                    dronePos.current.y = placedPos.current.y; // land
                  }
                }}
                disabled={!isArmed}
                className={`w-full py-1.5 border font-bold rounded flex items-center justify-center gap-1.5 transition ${
                  !isArmed
                    ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 opacity-50 cursor-not-allowed'
                    : flightStage === 'armed-idle'
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30'
                      : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                {flightStage === 'flying' ? 'Land Drone' : 'Takeoff'}
              </button>

              <button
                onClick={() => {
                  if (flightStage === 'flying' && flipDirection === null) {
                    setFlipDirection('forward');
                    setFlipProgress(0);
                  }
                }}
                disabled={flightStage !== 'flying' || flipDirection !== null}
                className={`w-full py-1.5 border font-bold rounded flex items-center justify-center gap-1.5 transition ${
                  flightStage === 'flying' && flipDirection === null
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 opacity-50 cursor-not-allowed'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Perform Flip
              </button>
            </div>
          )}

          {/* AR Recovery Tools Section */}
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
            <span className="text-[7.5px] text-slate-500 dark:text-slate-400">Recovery Tools</span>
            
            <button
              onClick={handleFindDrone}
              className="w-full py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded flex items-center justify-center gap-1.5 transition"
            >
              <Compass className="w-3.5 h-3.5" /> Find Drone
            </button>

            <button
              onClick={handleRecenterDrone}
              className="w-full py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Recenter Drone
            </button>

            <button
              onClick={handleRestartARSession}
              className="w-full py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded flex items-center justify-center gap-1.5 transition"
            >
              <RotateCw className="w-3.5 h-3.5" /> Restart Session
            </button>

            {!isPresenting && (
              <button
                onClick={handleRefreshTracking}
                className="w-full py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Tracking
              </button>
            )}
          </div>
        </div>

        {/* Interactive virtual joysticks at the bottom (Only when drone is placed) */}
        {isPlaced ? (
          <div className="w-full p-8 flex justify-between items-end bg-gradient-to-t from-slate-950/70 via-slate-950/30 to-transparent pointer-events-none">
            
            {/* Left Joystick: Throttle (Altitude Y) & Yaw (Rotation Y) */}
            <VirtualJoystick 
              label="Left Stick"
              value={joystickLeft}
              subLabels={{ up: 'Climb', down: 'Descend', left: 'Yaw L', right: 'Yaw R' }}
              onChange={(vals) => setJoystickLeft(vals)}
            />

            {/* Warning / Guidance Alert */}
            <div className="hidden lg:flex flex-col items-center max-w-xs text-center space-y-1 pointer-events-auto bg-white/85 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/85 backdrop-blur px-4 py-2.5 rounded-xl shadow-xl">
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                {flightStage === 'disarmed' ? 'DRONE DISARMED' : flightStage === 'armed-idle' ? 'MOTORS IDLING' : 'FLIGHT CONTROLS ACTIVE'}
              </span>
              <p className="text-[8px] text-slate-500 dark:text-slate-400 font-mono leading-relaxed">
                {flightStage === 'disarmed'
                  ? 'Click ARM DRONE (or Spacebar) to spin up motors.'
                  : flightStage === 'armed-idle'
                    ? 'Push left stick up (or press W) to take off.'
                    : 'Steer with joysticks / WASD + Arrow Keys. Spacebar disarms instantly.'
                }
              </p>
            </div>

            {/* Right Joystick: Pitch (Z axis forward/back) & Roll (X axis left/right) */}
            <VirtualJoystick 
              label="Right Stick"
              value={joystickRight}
              subLabels={{ up: 'Pitch Fwd', down: 'Pitch Back', left: 'Roll L', right: 'Roll R' }}
              onChange={(vals) => setJoystickRight(vals)}
            />

          </div>
        ) : (
          <div className="h-20" />
        )}
      </div>
    );
  };

  const renderCanvasContent = () => {
    const sceneContent = (
      <>
        {/* Transparent scene setup */}
        <ambientLight intensity={isDark ? 0.8 : 1.2} color="#ffffff" />
        <directionalLight position={[5, 10, 3]} intensity={isDark ? 1.0 : 1.5} color="#ffffff" />
        <directionalLight position={[-5, 5, -3]} intensity={isDark ? 0.3 : 0.5} color="#cbd5e1" />
        
        <Environment preset="city" />

        {!isPresenting && cameraMode === 'orbit' && (
          <OrbitControls makeDefault enableDamping minDistance={1} maxDistance={8} />
        )}

        {!isPresenting && (
          <ARCameraController
            deviceOrientation={deviceOrientation}
            screenOrientation={screenOrientation}
            headingOffset={headingOffset}
            cameraMode={cameraMode}
            threeCameraRef={threeCamera}
          />
        )}

        <DroneTracker
          dronePosRef={dronePos}
          onUpdate={setDroneIndicator}
        />

        {/* WebXR Native Ground Plane Hit-Testing & Placement */}
        {isPresenting && (
          <XRPlacement
            isPlaced={isPlaced}
            setIsPlaced={setIsPlaced}
            placedPos={placedPos}
            dronePos={dronePos}
          />
        )}

        {/* WebXR Fallback Grid Floor Placement (desktop/mobile fallback) */}
        {!isPresenting && (
          <FallbackPlacement
            isPlaced={isPlaced}
            setIsPlaced={setIsPlaced}
            placedPos={placedPos}
            dronePos={dronePos}
            isDark={isDark}
          />
        )}

        {/* 3D Drone Model */}
        {isPlaced && (
          <ARDrone 
            inputs={activeInputs}
            positionRef={dronePos}
            rotationRef={droneRot}
            placedPos={placedPos}
            isArmed={isArmed}
            flightStage={flightStage}
            setFlightStage={setFlightStage}
            flipDirection={flipDirection}
            setFlipDirection={setFlipDirection}
            flipProgress={flipProgress}
            setFlipProgress={setFlipProgress}
          />
        )}
      </>
    );

    if (isTestEnv) {
      return sceneContent;
    }

    return (
      <XR store={xrStore}>
        {sceneContent}
        {/* WebXR DOM Overlay */}
        <XRDomOverlay>
          {renderHUD()}
        </XRDomOverlay>
      </XR>
    );
  };

  return (
    <div className="fixed inset-0 z-40 bg-black overflow-hidden flex flex-col justify-between">
      
      {/* 1. BACKGROUND LAYER: Webcam passthrough for fallback preview mode */}
      {!isPresenting && cameraStream && (
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              const playPromise = video.play();
              if (playPromise !== undefined) {
                playPromise.catch(err => console.warn("Video autoplay failed, retrying on interaction:", err));
              }
            }}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Live OpenCV skin threshold hand tracking centroid overlays (Only for fallback stream) */}
      {!isPresenting && cvEnabled && cameraStream && (
        <div className="absolute inset-0 z-20 pointer-events-none font-mono text-[8px]">
          {/* Left Hand Zone */}
          <div className="absolute left-[10%] top-[20%] w-[30%] h-[60%] border-2 border-cyan-500/40 bg-cyan-950/5 rounded-2xl flex flex-col justify-between p-3 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
            <div className="flex justify-between items-center text-cyan-400 font-bold tracking-widest">
              <span>CV_ZONE_L // FLIGHT CONTROL</span>
              <span className={leftCentroid ? "text-emerald-400 animate-pulse" : "text-cyan-600"}>
                {leftCentroid ? "• DETECTED" : "• SEARCHING"}
              </span>
            </div>
            <div className="flex-1 relative flex items-center justify-center">
              <div className="w-full h-px bg-cyan-500/10 border-dashed" />
              <div className="h-full w-px bg-cyan-500/10 border-dashed" />
              
              {leftCentroid && (
                <div 
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-75"
                  style={{ left: `${(leftCentroid.x - 0.1) / 0.3 * 100}%`, top: `${(leftCentroid.y - 0.2) / 0.6 * 100}%` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping absolute" />
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                  <div className="w-8 h-8 border border-dashed border-cyan-400/60 rounded-full absolute animate-spin" style={{ animationDuration: '6s' }} />
                </div>
              )}
            </div>
            <div className="flex justify-between text-slate-400">
              <span>THROTTLE: {(joystickLeft.y * 100).toFixed(0)}%</span>
              <span>YAW: {(joystickLeft.x * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Right Hand Zone */}
          <div className="absolute right-[10%] top-[20%] w-[30%] h-[60%] border-2 border-cyan-500/40 bg-cyan-950/5 rounded-2xl flex flex-col justify-between p-3 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
            <div className="flex justify-between items-center text-cyan-400 font-bold tracking-widest">
              <span>CV_ZONE_R // ATTITUDE</span>
              <span className={rightCentroid ? "text-emerald-400 animate-pulse" : "text-cyan-600"}>
                {rightCentroid ? "• DETECTED" : "• SEARCHING"}
              </span>
            </div>
            <div className="flex-1 relative flex items-center justify-center">
              <div className="w-full h-px bg-cyan-500/10 border-dashed" />
              <div className="h-full w-px bg-cyan-500/10 border-dashed" />

              {rightCentroid && (
                <div 
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-75"
                  style={{ left: `${(rightCentroid.x - 0.6) / 0.3 * 100}%`, top: `${(rightCentroid.y - 0.2) / 0.6 * 100}%` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping absolute" />
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                  <div className="w-8 h-8 border border-dashed border-cyan-400/60 rounded-full absolute animate-spin" style={{ animationDuration: '6s' }} />
                </div>
              )}
            </div>
            <div className="flex justify-between text-slate-400">
              <span>PITCH: {(joystickRight.y * 100).toFixed(0)}%</span>
              <span>ROLL: {(joystickRight.x * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. MIDDLE LAYER: Transparent Three.js WebGL Canvas */}
      <div className="absolute inset-0 z-10">
        <Canvas
          camera={{ position: [0, 0.6, 2.2], fov: 60 }}
          gl={{ alpha: true, antialias: true }}
          onCreated={({ gl }) => {
            gl.xr.enabled = true; // Required by WebXR standard
          }}
        >
          {renderCanvasContent()}
        </Canvas>
      </div>

      {/* Fallback Overlay rendering outside WebXR context */}
      {!isPresenting && renderHUD()}

      {/* AI CV Gesture Settings Panel (Ctrl + Shift to open) */}
      <AnimatePresence>
        {cvOverlayOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm pointer-events-auto">
            <div className="w-[340px] bg-white/95 dark:bg-slate-950/90 border border-slate-250 dark:border-cyan-500/30 rounded-2xl p-6 shadow-2xl dark:shadow-[0_0_30px_rgba(6,182,212,0.2)] relative font-mono text-[9px] text-slate-700 dark:text-slate-300 uppercase space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className={`font-bold tracking-widest flex items-center gap-1.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  <Activity className="w-3.5 h-3.5" /> AI Gesture Control (OpenCV)
                </span>
                <button 
                  onClick={() => setCvOverlayOpen(false)}
                  className="p-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-805">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Enable Hand Gestures</span>
                  <button
                    onClick={() => setCvEnabled(!cvEnabled)}
                    className={`px-3 py-1 rounded text-[8px] font-bold transition-all ${
                      cvEnabled 
                        ? 'bg-cyan-600 border border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                        : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {cvEnabled ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>
              </div>

              <div className="text-[7.5px] text-slate-550 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 p-2.5 border border-slate-200 dark:border-slate-900 rounded-xl leading-relaxed">
                <span className={`font-bold block mb-1 ${isDark ? 'text-cyan-400/80' : 'text-cyan-600'}`}>Shortcut Key Info:</span>
                Press <kbd className="bg-slate-100 dark:bg-slate-850 px-1 border border-slate-300 dark:border-slate-800 rounded text-cyan-600 dark:text-cyan-400">Ctrl + Shift</kbd> at any time to open/close this settings panel.
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
