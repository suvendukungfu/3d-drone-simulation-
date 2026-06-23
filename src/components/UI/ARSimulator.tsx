import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useDroneStore } from '../../store/useDroneStore';
import { PlutoXModel } from '../PlutoXModel';
import { 
  X, CameraOff, Activity, Battery, Radio, Sliders, Compass, RotateCcw, RotateCw, RefreshCw
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

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

export function ARSimulator() {
  const isARActive = useDroneStore((state) => state.isARActive);
  const setARActive = useDroneStore((state) => state.setARActive);
  const theme = useDroneStore((state) => state.theme);
  const isDark = theme === 'dark';
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Camera state variables
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  // Gyroscope tracking state
  const [deviceOrientation, setDeviceOrientation] = useState<{ alpha: number; beta: number; gamma: number } | null>(null);
  const [screenOrientation, setScreenOrientation] = useState<number>(0);
  const [headingOffset, setHeadingOffset] = useState<number>(0);
  const [gyroPermissionGranted, setGyroPermissionGranted] = useState<boolean>(false);
  const [gyroError, setGyroError] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'gyro'>('orbit');

  // R3F Camera reference
  const threeCamera = useRef<THREE.Camera | null>(null);

  // Out of view drone indicator
  const [droneIndicator, setDroneIndicator] = useState<{ visible: boolean; distance: number; angle: number } | null>(null);

  // Interactive inputs from joysticks / keyboard
  const [joystickLeft, setJoystickLeft] = useState({ x: 0, y: 0 });
  const [joystickRight, setJoystickRight] = useState({ x: 0, y: 0 });

  // 3D coordinate tracker references (start drone 2m in front of camera)
  const dronePos = useRef(new THREE.Vector3(0, -0.5, -2));
  const droneRot = useRef(new THREE.Euler(0, 0, 0));

  const [telemetry, setTelemetry] = useState({ alt: 1.0, pitch: 0, roll: 0, yaw: 0 });

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

    const constraints: MediaStreamConstraints = {
      video: deviceId 
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setPermissionDenied(false);

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
        setPermissionDenied(true);
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
          setPermissionDenied(false);
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
    droneRot.current.set(0, 0, 0);
  };

  const handleRestartARSession = () => {
    dronePos.current.set(0, -0.5, -2);
    droneRot.current.set(0, 0, 0);
    if (deviceOrientation) {
      setHeadingOffset(-deviceOrientation.alpha);
    } else {
      setHeadingOffset(0);
    }
    initCamera();
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
          setGyroError(null);
          return true;
        } else {
          setGyroPermissionGranted(false);
          setGyroError("Gyroscope permission denied.");
          return false;
        }
      } catch (err: any) {
        console.error("Error requesting gyro permission:", err);
        setGyroError("Failed to request gyroscope permission.");
        return false;
      }
    } else {
      // Android / Desktop
      if (typeof window.DeviceOrientationEvent !== 'undefined') {
        setGyroPermissionGranted(true);
        setGyroError(null);
        return true;
      } else {
        setGyroError("DeviceOrientation is not supported on this device.");
        return false;
      }
    }
  };

  // 1. Manage camera lifecycle based on active state
  useEffect(() => {
    if (isARActive) {
      initCamera();
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isARActive]);

  // 2. Auto-detect mobile and request sensor tracking
  useEffect(() => {
    if (!isARActive) return;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      setCameraMode('gyro');
      requestGyroPermission();
    } else {
      setCameraMode('orbit');
    }
  }, [isARActive]);

  // 3. Listen to device orientation changes
  useEffect(() => {
    if (!isARActive || !gyroPermissionGranted) return;

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
      
      {/* Motion Sensor User Gesture Grant Banner for Mobile iOS/Android */}
      {cameraMode === 'gyro' && !gyroPermissionGranted && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4 pointer-events-auto">
          <div className="p-4 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400">
            <Compass className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2 max-w-xs">
            <h3 className="text-sm font-mono font-bold tracking-widest text-white uppercase">Sensor Access Required</h3>
            <p className="text-[10px] font-mono text-slate-400 leading-relaxed uppercase">
              This simulator requires gyroscope and compass access to track the drone in real space.
            </p>
          </div>
          <button
            onClick={async () => {
              const success = await requestGyroPermission();
              if (success) {
                initCamera();
              }
            }}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-[10px] font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition active:scale-95 uppercase tracking-wider"
          >
            Enable Motion Sensors
          </button>
        </div>
      )}

      {/* 1. BACKGROUND LAYER: Webcam Stream or Cyber Grid Mockup */}
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
          className={`w-full h-full object-cover ${cameraStream ? 'block' : 'hidden'}`}
        />
        {!cameraStream && (
          /* Mock AR Camera Viewport */
          <div className={`w-full h-full relative flex flex-col items-center justify-center overflow-hidden border-2 ${isDark ? 'bg-[#030712] border-cyan-500/10' : 'bg-[#F8FAFC] border-slate-200'}`}>
            {/* Tech Grid Backdrop */}
            <div className={`absolute inset-0 pointer-events-none bg-[size:32px_32px] ${isDark ? 'bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)]' : 'bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)]'}`} />
            
            {/* Sci-Fi Matrix Lines & Noise Overlay */}
            <div className={`absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.25)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] pointer-events-none opacity-30 mix-blend-overlay ${isDark ? 'block' : 'hidden'}`} />
            <div className={`absolute inset-0 ${isDark ? 'bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1)_0%,transparent_80%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(148,163,184,0.15)_0%,transparent_80%)]'}`} />
            
            {/* Holographic Radar Ring */}
            <div className={`w-80 h-80 rounded-full border flex items-center justify-center relative animate-spin ${isDark ? 'border-cyan-500/10' : 'border-slate-200'}`} style={{ animationDuration: '40s' }}>
              <div className={`absolute inset-4 rounded-full border border-dashed ${isDark ? 'border-cyan-500/20' : 'border-slate-305'}`} />
              <div className={`absolute inset-8 rounded-full border ${isDark ? 'border-cyan-500/5' : 'border-slate-100'}`} />
              <div className={`absolute w-full h-px ${isDark ? 'bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent' : 'bg-gradient-to-r from-transparent via-slate-300/40 to-transparent'}`} />
              <div className={`absolute h-full w-px ${isDark ? 'bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent' : 'bg-gradient-to-b from-transparent via-slate-300/40 to-transparent'}`} />
            </div>

            {/* Corner Tech Brackets */}
            <div className={`absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 ${isDark ? 'border-cyan-500/30' : 'border-slate-300'}`} />
            <div className={`absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 ${isDark ? 'border-cyan-500/30' : 'border-slate-300'}`} />
            <div className={`absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 ${isDark ? 'border-cyan-500/30' : 'border-slate-300'}`} />
            <div className={`absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 ${isDark ? 'border-cyan-500/30' : 'border-slate-300'}`} />

            <div className="absolute flex flex-col items-center justify-center mt-2 text-center space-y-3 z-10">
              <div className={`p-4 rounded-full animate-pulse border ${isDark ? 'bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'bg-slate-100 border-slate-300'}`}>
                <CameraOff className={`w-8 h-8 ${isDark ? 'text-cyan-400' : 'text-slate-400'}`} />
              </div>
              <div className="space-y-1">
                <span className={`text-xs font-mono font-bold tracking-[0.25em] uppercase block ${isDark ? 'text-cyan-400' : 'text-slate-700'}`}>
                  Camera Passthrough Offline
                </span>
                <p className={`text-[8px] font-mono tracking-widest uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Using 3D Virtual Tracking Space Grid // Ready to Arm
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live OpenCV skin threshold hand tracking centroid feedback overlays */}
        {cvEnabled && cameraStream && (
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
      </div>

      {/* AR Session Toolbox (Left Panel) */}
      {isARActive && (
        <div className="absolute left-4 top-24 z-20 pointer-events-auto flex flex-col gap-3 w-52 bg-white/85 dark:bg-slate-950/75 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md rounded-2xl p-4 shadow-2xl font-mono text-[9px] text-slate-700 dark:text-slate-300 uppercase">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <span className={`font-bold tracking-widest flex items-center gap-1.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
              <Sliders className="w-3.5 h-3.5" /> AR Toolbox
            </span>
            <span className={`text-[7px] px-1 rounded ${cameraMode === 'gyro' ? 'bg-cyan-950 text-cyan-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
              {cameraMode === 'gyro' ? 'Gyro active' : 'Orbit mode'}
            </span>
          </div>

          {/* Camera Selection Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[7.5px] text-slate-500 dark:text-slate-400">Select Video Input</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => handleCameraChange(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-white"
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

          {/* Camera Error / Permission retry if applicable */}
          {cameraError && (
            <div className="text-[7.5px] text-red-500 bg-red-500/10 p-1.5 rounded border border-red-500/20 lowercase">
              {cameraError}
            </div>
          )}

          {gyroError && (
            <div className="text-[7.5px] text-amber-500 bg-amber-500/10 p-1.5 rounded border border-amber-500/20 lowercase">
              {gyroError}
            </div>
          )}

          {permissionDenied && (
            <button
              onClick={() => initCamera()}
              className="w-full py-1 bg-red-650/20 border border-red-500/30 hover:bg-red-600/30 text-red-400 font-bold rounded"
            >
              Retry Camera Permission
            </button>
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

            <button
              onClick={handleRefreshTracking}
              className="w-full py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Tracking
            </button>
          </div>
        </div>
      )}

      {/* Out of view drone indicator */}
      {droneIndicator && droneIndicator.visible && (
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

      {/* 2. MIDDLE LAYER: Transparent Three.js WebGL Canvas */}
      <div className="absolute inset-0 z-10">
        <Canvas
          camera={{ position: [0, 0.6, 2.2], fov: 60 }}
          gl={{ alpha: true, antialias: true }}
        >
          {/* Transparent scene setup */}
          <ambientLight intensity={isDark ? 0.8 : 1.2} color="#ffffff" />
          <directionalLight position={[5, 10, 3]} intensity={isDark ? 1.0 : 1.5} color="#ffffff" />
          <directionalLight position={[-5, 5, -3]} intensity={isDark ? 0.3 : 0.5} color="#cbd5e1" />
          
          <Environment preset="city" />

          {cameraMode === 'orbit' && (
            <OrbitControls makeDefault enableDamping minDistance={1} maxDistance={8} />
          )}

          <ARCameraController
            deviceOrientation={deviceOrientation}
            screenOrientation={screenOrientation}
            headingOffset={headingOffset}
            cameraMode={cameraMode}
            threeCameraRef={threeCamera}
          />

          <DroneTracker
            dronePosRef={dronePos}
            onUpdate={setDroneIndicator}
          />

          {!cameraStream && (
            <>
              <gridHelper args={[30, 30, isDark ? '#005555' : '#cbd5e1', isDark ? '#161d2a' : '#e2e8f0']} position={[0, -1.5, 0]} />
              <polarGridHelper args={[15, 16, 8, 64, isDark ? '#004444' : '#94a3b8', isDark ? '#0d1522' : '#cbd5e1']} position={[0, -1.49, 0]} />
            </>
          )}

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
            <span>AI Gesture Config: <kbd className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded">Ctrl + Shift</kbd></span>
          </div>
        </div>

        {/* Real-Time Telemetry HUD panel */}
        <div className="bg-white/85 dark:bg-slate-950/75 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md rounded-2xl p-4 w-60 shadow-2xl font-mono text-[9px] text-slate-700 dark:text-slate-300 uppercase space-y-2">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <span className={`font-bold tracking-widest flex items-center gap-1.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
              <Activity className="w-3.5 h-3.5" /> Telemetry HUD
            </span>
            <span className={`text-[7px] px-1 rounded ${isDark ? 'bg-cyan-950 text-cyan-400' : 'bg-cyan-50 text-cyan-600 border border-cyan-200/50'}`}>
              {cvEnabled ? 'AI CV Active' : 'AR Link'}
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

      {/* Interactive virtual joysticks at the bottom */}
      <div className="w-full p-8 z-20 flex justify-between items-end bg-gradient-to-t from-slate-950/70 via-slate-950/30 to-transparent pointer-events-none">
        
        {/* Left Joystick: Throttle (Altitude Y) & Yaw (Rotation Y) */}
        <VirtualJoystick 
          label="Left Stick"
          value={joystickLeft}
          subLabels={{ up: 'Climb', down: 'Descend', left: 'Yaw L', right: 'Yaw R' }}
          onChange={(vals) => setJoystickLeft(vals)}
        />

        {/* Dynamic Warning Alert Overlay */}
        <div className="hidden lg:flex flex-col items-center max-w-xs text-center space-y-1 pointer-events-auto bg-white/85 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/85 backdrop-blur px-4 py-2.5 rounded-xl shadow-xl">
          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
            {cvEnabled ? 'AI OpenCV GESTURE FLIGHT' : 'Controls Active'}
          </span>
          <p className="text-[8px] text-slate-500 dark:text-slate-400 font-mono leading-relaxed">
            {cvEnabled 
              ? 'Move hands inside the webcam zones. Left: Climb/Yaw. Right: Pitch/Roll.' 
              : 'Drag the virtual knobs to steer PlutoX. Keyboard fallback active (W/S, A/D, Arrows).'
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
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
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

                {cvEnabled && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 space-y-2">
                    <span className="text-slate-500 dark:text-slate-400 text-[8px]">Live Thresholded Computer Vision Mask</span>
                    <div className="flex justify-center bg-black rounded p-1 border border-slate-200 dark:border-slate-900">
                      <canvas 
                        ref={cvCanvasRef} 
                        width={160} 
                        height={120} 
                        className="w-[160px] h-[120px] bg-slate-950 dark:bg-black rounded"
                      />
                    </div>
                    <p className="text-[7.5px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                      Skin-tone segmentation (RGB range) isolating your hand. Place hands inside the overlay zones.
                    </p>
                  </div>
                )}
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
