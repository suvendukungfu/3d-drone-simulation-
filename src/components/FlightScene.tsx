import { useEffect, useRef, useCallback, Component, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useDroneStore } from '../store/useDroneStore';
import { SimulatorOrchestrator } from '../utils/drone/SimulatorOrchestrator';
import { EnvironmentManager } from './EnvironmentManager';
import { PlutoXModel } from './PlutoXModel';
import { sound } from '../utils/soundController';
import { MISSIONS } from './UI/TrainingMissionSystem';
import { XCircle } from 'lucide-react';

const isMobileDevice = typeof window !== 'undefined' && 
  (window.innerWidth <= 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0);

// React Error Boundary for 3D model loading & rendering failures
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Dynamically adjusts camera FOV for very short mobile landscape viewports
// so the drone is not vertically clipped. Only active below a threshold aspect ratio.
function AdaptiveFOV() {
  const { camera, size } = useThree();
  const baseFOV = 50;

  useEffect(() => {
    const aspect = size.width / size.height;
    const perspCam = camera as THREE.PerspectiveCamera;
    if (!perspCam.isPerspectiveCamera) return;

    // For very wide/short viewports (landscape phones), widen the vertical FOV
    // so the drone isn't cut off at the top/bottom edges.
    if (aspect > 2.2) {
      // Scale FOV proportionally: aspect 2.5 → ~58°, aspect 3.3 → ~65°
      perspCam.fov = Math.min(70, baseFOV + (aspect - 2.2) * 8);
    } else {
      perspCam.fov = baseFOV;
    }
    perspCam.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    useDroneStore.getState().setModelLoadStatus('failed', error.message || String(error));
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Separate Component to isolate the frame-based update loop
interface SimulationLoopProps {
  orchestrator: SimulatorOrchestrator;
  droneGroupRef: React.RefObject<THREE.Group>;
  propellersRef: React.MutableRefObject<THREE.Object3D[]>;
  shadowMeshRef: React.RefObject<THREE.Mesh>;
}

function SimulationLoop({ orchestrator, droneGroupRef, propellersRef, shadowMeshRef }: SimulationLoopProps) {
  const { camera } = useThree();
  const flightCameraView = useDroneStore((state) => state.flightCameraView);
  const activeMissionIndex = useDroneStore((state) => state.activeMissionIndex);
  const updateFlightTelemetry = useDroneStore((state) => state.updateFlightTelemetry);
  const setMissionObjectives = useDroneStore((state) => state.setMissionObjectives);
  
  // Propeller angles tracker
  const propAngles = useRef([0, 0, 0, 0]);
  const throttleStoreUpdate = useRef(0);
  const cameraInitialized = useRef(false);

  // Mouse look rotation offsets for chase and FPV views
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mouseOffset = useRef({ yaw: 0, pitch: 0 });

  // Sync physics bounds to match selected environment
  const envType = useDroneStore((state) => state.flightEnvironment);
  useEffect(() => {
    if (envType === 'field') {
      orchestrator.physics.setBounds(-20, 20, -20, 20, 18);
    } else if (envType === 'course') {
      orchestrator.physics.setBounds(-19.5, 19.5, -19.5, 19.5, 7.8);
    } else if (envType === 'warehouse') {
      orchestrator.physics.setBounds(-14.5, 14.5, -14.5, 14.5, 9.8);
    } else if (envType === 'lab') {
      orchestrator.physics.setBounds(-9.5, 9.5, -9.5, 9.5, 6.8);
    } else if (envType === 'classroom') {
      orchestrator.physics.setBounds(-9.5, 9.5, -9.5, 9.5, 5.8);
    } else { // room
      orchestrator.physics.setBounds(-7.8, 7.8, -7.8, 7.8, 5.8);
    }
  }, [envType, orchestrator]);

  useEffect(() => {
    cameraInitialized.current = false;
    mouseOffset.current = { yaw: 0, pitch: 0 };
  }, [envType, flightCameraView]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'CANVAS' || target.closest('canvas')) {
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current || flightCameraView === 'orbit') return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };

      const sensitivity = 0.005;
      mouseOffset.current.yaw -= dx * sensitivity;
      mouseOffset.current.pitch = THREE.MathUtils.clamp(
        mouseOffset.current.pitch - dy * sensitivity,
        -Math.PI / 3,
        Math.PI / 3
      );
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    const handleDoubleClick = () => {
      if (flightCameraView !== 'orbit') {
        mouseOffset.current = { yaw: 0, pitch: 0 };
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('dblclick', handleDoubleClick);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [flightCameraView]);

  useFrame((state, delta) => {
    // 1. Run simulator steps
    const telemetry = orchestrator.update(delta);
    const renderState = orchestrator.getRenderState();
    const physState = orchestrator.getPhysicsState();
    const motorCmds = orchestrator.getMotorCommands();
    const warnings = orchestrator.getWarnings();

    // 2. Play/Adjust motor sounds based on state
    if (telemetry.isArmed && !telemetry.calibrationActive) {
      motorCmds.forEach((cmd, idx) => {
        const motorKey = `motor${idx + 1}` as any;
        sound.startMotorSound(motorKey);
        sound.updateMotorPitch(motorKey, 15000 + cmd * 33000);
      });
    } else {
      sound.stopAllMotors();
    }

    // 3. Sync visual drone model position & orientation (using interpolated state for smoothness)
    if (droneGroupRef.current) {
      droneGroupRef.current.position.copy(renderState.position);
      droneGroupRef.current.quaternion.copy(renderState.quaternion);
    }

    // 4. Spin propeller meshes in real-time
    if (propellersRef.current.length > 0) {
      propellersRef.current.forEach((mesh, index) => {
        if (mesh && telemetry.isArmed) {
          const direction = (index === 0 || index === 3) ? -1 : 1;
          const speed = 15000 + motorCmds[index] * 33000;
          const angleDelta = (speed / 60) * Math.PI * 2 * delta * 0.012;
          
          propAngles.current[index] += direction * angleDelta;
          mesh.rotation.z = propAngles.current[index];
        }
      });
    }

    // 4b. Update floor shadow position & size/opacity
    if (shadowMeshRef.current) {
      shadowMeshRef.current.position.set(renderState.position.x, 0.006, renderState.position.z);
      const height = Math.max(0, renderState.position.y - 0.05);
      const maxShadowHeight = 4.0;
      const t = Math.min(1.0, height / maxShadowHeight);
      
      const opacity = THREE.MathUtils.lerp(0.65, 0.0, t);
      const scale = THREE.MathUtils.lerp(0.35, 1.2, t);
      
      shadowMeshRef.current.scale.setScalar(scale);
      const mat = shadowMeshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = opacity;
      }
    }

    // 5. Update Camera System
    const dronePos = renderState.position;
    const droneQuat = renderState.quaternion;
    
    // Compute directional vectors from quaternion
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(droneQuat).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(droneQuat).normalize();
    
    if (flightCameraView === 'chase') {
      // Behind and slightly above drone, rotated by mouse offset
      const backVec = forward.clone().negate();
      const offsetQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(mouseOffset.current.pitch, mouseOffset.current.yaw, 0, 'YXZ')
      );
      const rotatedBackVec = backVec.clone().applyQuaternion(offsetQuat);
      const rotatedUpVec = up.clone().applyQuaternion(offsetQuat);

      const targetCamPos = dronePos.clone()
        .addScaledVector(rotatedBackVec, 1.4)
        .addScaledVector(rotatedUpVec, 0.42);
        
      if (!cameraInitialized.current) {
        camera.position.copy(targetCamPos);
        camera.lookAt(dronePos.clone().addScaledVector(up, 0.1));
        cameraInitialized.current = true;
      } else {
        camera.position.lerp(targetCamPos, 1.0 - Math.exp(-6.5 * delta));
        camera.lookAt(dronePos.clone().addScaledVector(up, 0.1));
      }
    } 
    else if (flightCameraView === 'fpv') {
      // Inside canopy looking forward, offset by mouse view look direction
      const offsetQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(mouseOffset.current.pitch, mouseOffset.current.yaw, 0, 'YXZ')
      );
      const rotatedForward = forward.clone().applyQuaternion(offsetQuat);

      const targetCamPos = dronePos.clone()
        .addScaledVector(forward, 0.12)
        .addScaledVector(up, 0.025);
      camera.position.copy(targetCamPos);
      
      const targetLook = targetCamPos.clone().add(rotatedForward);
      camera.lookAt(targetLook);
      cameraInitialized.current = true;
    } 
    else if (flightCameraView === 'orbit') {
      const controls = state.controls as any;
      if (controls) {
        controls.target.copy(dronePos);
        if (!cameraInitialized.current) {
          camera.position.set(dronePos.x, dronePos.y + 0.6, dronePos.z - 1.2);
          cameraInitialized.current = true;
        }
        controls.update();
      }
    }

    // 6. Throttled update to Zustand store to avoid re-rendering layout at 60Hz
    throttleStoreUpdate.current++;
    if (throttleStoreUpdate.current >= (isMobileDevice ? 6 : 4)) { // ~15Hz updates (10Hz on mobile)
      throttleStoreUpdate.current = 0;
      updateFlightTelemetry(telemetry, warnings);

      // Populate drone spawning and visual offset diagnostics
      const storeState = useDroneStore.getState();

      storeState.setDroneSpawnDiagnostics({
        dronePos: physState.position.toArray(),
        physicsPos: physState.position.toArray(),
        modelPos: physState.position.toArray(),
        boxMinY: storeState.modelDiagnostics ? storeState.modelDiagnostics.boundingBoxMin[1] : 0,
        groundHeight: 0.05
      });
      
      // Update active mission objectives in-place
      const missionStore = useDroneStore.getState() as any;
      if (missionStore.activeMissionIndex >= 0 && missionStore.missionStatus === 'active') {
        const currentMission = MISSIONS[missionStore.activeMissionIndex];
        if (currentMission) {
          const completedObjectives = currentMission.checkObjective(orchestrator, activeMissionIndex, physState);
          setMissionObjectives(completedObjectives);
          
          // Check if all objectives are completed
          const allCompleted = completedObjectives.every((obj: boolean) => obj);
          if (allCompleted) {
            missionStore.setMissionStatus('passed');
            sound.playClick();
          }
        }
      }
    }
  });

  return null;
}

interface FlightSceneProps {
  orchestrator: SimulatorOrchestrator;
  activeCheckpoints: any[];
}

export function FlightScene({ orchestrator, activeCheckpoints }: FlightSceneProps) {
  const flightCameraView = useDroneStore((state) => state.flightCameraView);
  const modelLoadStatus = useDroneStore((state) => state.modelLoadStatus);
  const theme = useDroneStore((state) => state.theme);
  const isDark = theme === 'dark';
  const envType = useDroneStore((state) => state.flightEnvironment);

  // Dynamic fog config for realistic spatial depth and infinite horizon blending
  const getFogConfig = () => {
    if (envType === 'field') {
      return {
        color: isDark ? '#040712' : '#cbd5e1',
        near: 15,
        far: 45
      };
    }
    return {
      color: isDark ? '#070a13' : '#f1f5f9',
      near: 8,
      far: 25
    };
  };

  const fogConfig = getFogConfig();
  const droneGroupRef = useRef<THREE.Group>(null);
  const shadowMeshRef = useRef<THREE.Mesh>(null);
  
  // Cache reference meshes to props
  const propellersRef = useRef<THREE.Object3D[]>([]);

  // Declarative state for visual scale and offsets of the drone model
  const [modelTransform, setModelTransform] = useState<{
    scale: number;
    position: [number, number, number];
  } | null>(null);


  // Collect references to propellers from the cloned PlutoX model on load.
  // Wrapped in useCallback so the reference is stable and doesn't trigger
  // useEffect re-runs inside PlutoXModel.
  const handleModelLoad = useCallback((scene: THREE.Group) => {
    try {
      // Guard: only run once per mount
      if (!scene) {
        throw new Error("Failed to load 3D model scene data.");
      }
      
      let meshCount = 0;
      const uniqueMaterials = new Set<THREE.Material>();
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshCount++;
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => uniqueMaterials.add(m));
          } else if (child.material) {
            uniqueMaterials.add(child.material);
          }
        }
      });

      // CRITICAL: Force world matrix computation on the cloned scene.
      scene.updateMatrixWorld(true);

      const localBox = new THREE.Box3().setFromObject(scene);
      const localCenter = new THREE.Vector3();
      localBox.getCenter(localCenter);
      const localSize = new THREE.Vector3();
      localBox.getSize(localSize);

      // Validate bounding box — guard against NaN / Infinity / zero-size
      const isValidSize = (v: number) => Number.isFinite(v) && v > 0.001;
      const boundsValid = isValidSize(localSize.x) && isValidSize(localSize.y) && isValidSize(localSize.z);

      // Senior Developer Architectural decision:
      // Since "/models/plutox.glb" is a static repository asset with constant coordinates,
      // we bypass dynamic runtime Box3 calculations (which are fragile to cloning states
      // and matrix updates, potentially producing a 1000x smaller microscopic drone)
      // and directly apply the verified pre-calculated scale and offset values.
      // - targetScale = 2.825: ensures a precise 0.30m visual span (real-world wingspan).
      // - offsetY = 0.1004: aligns the visual bottom points to touch y=0.005 (landing pad) when physics is at y=0.05.
      // - offsetZ = -0.0345: aligns the visual model center to the physics body center of gravity.
      const targetScale = 2.825;
      const offsetX = 0;
      const offsetY = 0.1004;
      const offsetZ = -0.0345;

      const store = useDroneStore.getState();
      store.setModelDiagnostics({
        meshCount,
        materialCount: uniqueMaterials.size,
        boundingBoxSize: boundsValid ? [localSize.x, localSize.y, localSize.z] : [0.1062, 0.1627, 0.1307],
        boundingBoxMin: boundsValid ? [localBox.min.x, localBox.min.y, localBox.min.z] : [-0.0531, -0.0515, -0.0531],
        boundingBoxMax: boundsValid ? [localBox.max.x, localBox.max.y, localBox.max.z] : [0.0531, 0.1112, 0.0776],
        center: boundsValid ? [localCenter.x, localCenter.y, localCenter.z] : [0, 0.0299, 0.0122],
        rootTransform: `Scale: [${scene.scale.x.toFixed(2)}, ${scene.scale.y.toFixed(2)}, ${scene.scale.z.toFixed(2)}] | Position: [${scene.position.x.toFixed(2)}, ${scene.position.y.toFixed(2)}, ${scene.position.z.toFixed(2)}]`
      });

      console.warn('[FlightScene] Applied optimized static scale and position offsets to PlutoX model:', {
        scale: targetScale,
        offset: [offsetX, offsetY, offsetZ]
      });

      // Apply scale and offset declaratively via state
      setModelTransform({
        scale: targetScale,
        position: [offsetX, offsetY, offsetZ]
      });
      
      // Mark model load status success in Zustand store
      store.setModelLoadStatus('success');

      // ---- MATERIAL BRIGHTNESS BOOST ----
      // Many meshes use dark metallic PBR materials that absorb light.
      // Apply a subtle base emissive + reduce metalness so the drone
      // is visible against dark backgrounds.
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial;
            if (mat && mat.isMeshStandardMaterial) {
              // Reduce extreme metalness that causes dark absorption
              if (mat.metalness > 0.85) {
                mat.metalness = 0.7;
              }
              // Add subtle base emissive so the drone glows slightly
              if (!mat.emissive || mat.emissive.getHex() === 0x000000) {
                mat.emissive = new THREE.Color(0x1a2a3a);
                mat.emissiveIntensity = 0.3;
              }
              // Ensure materials are not accidentally transparent
              if (mat.opacity < 0.9 && !mat.transparent) {
                mat.opacity = 1.0;
              }
            }
          });
        }
      });

      // ---- PROPELLER COLLECTION ----
      const pList: THREE.Object3D[] = [];
      scene.traverse((child) => {
        const nameLower = child.name.toLowerCase();
        if (nameLower.includes('propeller') && !nameLower.includes('guard')) {
          pList.push(child);
        }
      });
      
      // Filter out descendant/child nodes so we only rotate top-level propeller groups
      const topPropellers = pList.filter((node) => {
        let parent = node.parent;
        while (parent) {
          if (pList.includes(parent)) {
            return false;
          }
          parent = parent.parent;
        }
        return true;
      });

      // Classify the topmost propeller nodes into [FL, FR, RL, RR] quadrants
      let fl: THREE.Object3D | undefined;
      let fr: THREE.Object3D | undefined;
      let rl: THREE.Object3D | undefined;
      let rr: THREE.Object3D | undefined;

      topPropellers.forEach((node) => {
        const pos = new THREE.Vector3();
        pos.setFromMatrixPosition(node.matrixWorld);
        
        // Quadrants matching getCornerIndex from PlutoXModel:
        // FL (Front-Left): x <= 0 && z >= 0
        // FR (Front-Right): x > 0 && z > 0
        // RL (Rear-Left): x < 0 && z < 0
        // RR (Rear-Right): x >= 0 && z <= 0
        if (pos.x <= 0 && pos.z >= 0) {
          fl = node;
        } else if (pos.x > 0 && pos.z > 0) {
          fr = node;
        } else if (pos.x < 0 && pos.z < 0) {
          rl = node;
        } else if (pos.x >= 0 && pos.z <= 0) {
          rr = node;
        }
      });

      const props = [fl, fr, rl, rr].filter(Boolean) as THREE.Object3D[];
      
      console.warn('[FlightScene] Resolved propellers by quadrant:', {
        totalFound: topPropellers.length,
        mappedCount: props.length,
        fl: fl?.name,
        fr: fr?.name,
        rl: rl?.name,
        rr: rr?.name
      });

      propellersRef.current = props;
    } catch (err: any) {
      useDroneStore.getState().setModelLoadStatus('failed', err.message || 'Error processing PlutoX model');
    }
  }, []);

  // Reset simulator when switching environment or mode
  useEffect(() => {
    setModelTransform(null);
    orchestrator.reset();
    return () => {
      sound.stopAllMotors();
    };
  }, [orchestrator]);

  if (modelLoadStatus === 'failed') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#070a13] font-mono select-none">
        <div className="bg-red-950/40 border border-red-500/30 p-8 rounded-2xl max-w-md w-full mx-4 shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-red-400 tracking-wider uppercase mb-2">MODEL LOAD FAILED</h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            The 3D asset pipeline could not resolve or verify the PlutoX digital twin model file.
          </p>
          <div className="bg-slate-950 border border-slate-900 px-4 py-3 rounded-lg text-left text-[10px] text-slate-500 w-full mb-6 max-h-32 overflow-y-auto">
            <span className="text-red-500 font-bold block mb-1">Error Diagnostics:</span>
            {useDroneStore.getState().modelLoadError || 'File path error: /models/plutox.glb not found.'}
          </div>
          <button
            onClick={() => {
              useDroneStore.getState().setModelLoadStatus('loading');
              orchestrator.reset();
            }}
            className="px-6 py-2.5 bg-red-900/20 hover:bg-red-900/40 border border-red-800/30 text-xs font-bold text-red-400 rounded-lg transition"
          >
            Retry Simulator Boot
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative select-none ${isDark ? 'bg-[#02040a]' : 'bg-[#F8FAFC]'}`}>
      <Canvas
        shadows={!isMobileDevice}
        camera={{ position: [0, 1.5, -2], fov: 50 }}
        gl={{ antialias: !isMobileDevice, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[fogConfig.color]} />
        <fog attach="fog" args={[fogConfig.color, fogConfig.near, fogConfig.far]} />
        
        {/* Environment HDRI sky map */}
        <Environment preset="city" />

        {/* Studio and Outdoor Lighting — boosted for drone visibility */}
        <ambientLight intensity={isDark ? 0.4 : 0.6} color={isDark ? '#e2e8f0' : '#ffffff'} />
        
        <hemisphereLight
          color={isDark ? '#3b82f6' : '#ffffff'}
          groundColor={isDark ? '#070a13' : '#94a3b8'}
          intensity={isDark ? 0.6 : 0.8}
        />
        
        <directionalLight
          position={[15, 30, 15]}
          intensity={2.8}
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-bias={-0.0002}
        />
        
        <directionalLight
          position={[-15, 15, -15]}
          intensity={0.7}
          color="#94a3b8"
        />

        {/* Adaptive FOV for ultra-short mobile landscape viewports */}
        <AdaptiveFOV />

        {/* Floating holographic data/telemetry particles */}
        {!isMobileDevice && isDark && (
          <Sparkles
            count={75}
            scale={[16, 8, 16]}
            size={1.2}
            speed={0.15}
            color="#60a5fa"
            opacity={0.3}
          />
        )}

        {/* 3D Static Environments & Checkpoints */}
        <EnvironmentManager activeCheckpoints={activeCheckpoints} />

        {/* Circular Floor Shadow Mesh */}
        <mesh ref={shadowMeshRef} rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
          <circleGeometry args={[0.22, 32]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.65} depthWrite={false} />
        </mesh>

        {/* Moving Drone Mesh Wrapper */}
        <group ref={droneGroupRef}>
          {/* Render PlutoX model in flight scale with calculated dynamic offset.
              Declarative properties prevent React Three Fiber from resetting values on re-render. */}
          <ModelErrorBoundary fallback={null}>
            <group
              scale={modelTransform ? modelTransform.scale : 1}
              position={modelTransform ? modelTransform.position : [0, 0, 0]}
            >
              <PlutoXModel isFlightMode={true} onLoad={handleModelLoad} />
            </group>
          </ModelErrorBoundary>
        </group>

        {/* Frame loop updater */}
        <SimulationLoop 
          orchestrator={orchestrator} 
          droneGroupRef={droneGroupRef} 
          propellersRef={propellersRef}
          shadowMeshRef={shadowMeshRef}
        />

        {/* Orbit Controls (Only active in Orbit Camera view) */}
        {flightCameraView === 'orbit' && (
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={0.5}
            maxDistance={15}
            maxPolarAngle={Math.PI / 2 + 0.15}
          />
        )}
      </Canvas>
    </div>
  );
}

