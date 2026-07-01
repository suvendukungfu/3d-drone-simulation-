import { useRef, useEffect, lazy, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useDroneStore } from '../store/useDroneStore';
import { droneComponents } from '../data/droneComponents';
import { PlutoXModel, getComponentIdByMeshName, getCornerIndex } from './PlutoXModel';
import { FloatingHotspots } from './FloatingHotspots';

const PlutoAnatomyExploded = lazy(() => import('./PlutoAnatomyExploded').then(m => ({ default: m.PlutoAnatomyExploded })));

const SEARCH_ID_MAP: Record<string, string> = {
  accelerometer: 'imuSensor',
  magnetometer: 'flightController',
};

interface CameraControllerProps {
  controlsRef: React.MutableRefObject<any>;
  vrEye?: 'left' | 'right';
  floorGroupRef: React.RefObject<THREE.Group>;
}

// Camera view transition controller
function CameraController({ controlsRef, vrEye, floorGroupRef }: CameraControllerProps) {
  const { camera, scene } = useThree();
  const selectedComponent = useDroneStore((state) => state.selectedComponent);
  const isExploded = useDroneStore((state) => state.isExploded);
  const isolationMode = useDroneStore((state) => state.isolationMode);
  const cameraView = useDroneStore((state) => state.cameraView);
  const currentMode = useDroneStore((state) => state.currentMode);

  const vrCameraPosition = useDroneStore((state) => state.vrCameraPosition);
  const vrCameraTarget = useDroneStore((state) => state.vrCameraTarget);
  const setVrCamera = useDroneStore((state) => state.setVrCamera);

  // Focus target values
  const targetCamPos = useRef(new THREE.Vector3(5.0, 3.5, 6.0));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  
  // Track if camera is smoothly gliding to a preset
  const isTransitioning = useRef(true);

  // Cache target meshes for camera tracking during active transitions
  const inspectTargetMeshes = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (vrEye === 'right') return;

    isTransitioning.current = true;
    const scaleFactor = 18.0;

    // Cache component meshes if inspecting
    if (cameraView === 'inspect' && selectedComponent) {
      const temp: THREE.Mesh[] = [];
      const searchId = SEARCH_ID_MAP[selectedComponent] || selectedComponent;
      
      scene.updateMatrixWorld(true);
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          let componentId: string | null = null;
          let current: THREE.Object3D | null = child;
          let matchedCorner: 1 | 2 | 3 | 4 = 1;

          while (current && current !== scene) {
            const tempId = getComponentIdByMeshName(current.name);
            if (tempId) {
              componentId = tempId;
              const worldPos = new THREE.Vector3();
              worldPos.setFromMatrixPosition(current.matrixWorld);
              matchedCorner = getCornerIndex(worldPos.x, worldPos.z);
              break;
            }
            current = current.parent;
          }

          if (componentId === 'motor') {
            const mappedCorner = matchedCorner === 3 ? 4 : matchedCorner === 4 ? 3 : matchedCorner;
            componentId = `motor${mappedCorner}`;
          } else if (componentId === 'propeller') {
            componentId = (matchedCorner === 1 || matchedCorner === 4) ? 'propellerA' : 'propellerB';
          }

          if (componentId === searchId) {
            temp.push(child);
          }
        }
      });
      inspectTargetMeshes.current = temp;
    } else {
      inspectTargetMeshes.current = [];
    }

    // 1. Initial lookAt estimates as a static fallback
    if (cameraView === 'inspect' && selectedComponent) {
      const comp = droneComponents[selectedComponent];
      if (comp) {
        const [hx, hy, hz] = comp.hotspotPosition;
        targetLookAt.current.set(hx * scaleFactor, hy * scaleFactor, hz * scaleFactor);
        
        if (isolationMode) {
          targetCamPos.current.set(hx * scaleFactor, hy * scaleFactor + 0.3, hz * scaleFactor + 2.2);
        } else {
          targetCamPos.current.set(hx * scaleFactor + 2.5, hy * scaleFactor + 1.5, hz * scaleFactor + 3.0);
        }
      }
      return;
    }

    // 2. Preset Orthogonal View Calculations
    switch (cameraView) {
      case 'top':
        targetCamPos.current.set(0, 7.5, 0.01); // positive Z offset ensures nose (+Z) points UP without mirroring L/R
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'bottom':
        targetCamPos.current.set(0, -7.5, 0.01); // tiny Z offset to avoid Gimbal Lock
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'left':
        targetCamPos.current.set(-7.0, 0.5, 0);
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'right':
        targetCamPos.current.set(7.0, 0.5, 0);
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'front':
        targetCamPos.current.set(0, 0.5, 7.0);
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'back':
        targetCamPos.current.set(0, 0.5, -7.0);
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'orbit':
      default:
        if (isExploded) {
          targetCamPos.current.set(7.0, 5.0, 8.0);
          targetLookAt.current.set(0, 0.5, 0);
        } else {
          if (currentMode === 'home') {
            // Shift target lookAt and move camera closer to make drone larger and more obvious
            targetCamPos.current.set(3.2, 1.8, 4.0);
            targetLookAt.current.set(-1.0, -0.2, 0);
          } else {
            targetCamPos.current.set(5.0, 3.5, 6.0);
            targetLookAt.current.set(0, 0, 0);
          }
        }
        break;
    }
  }, [selectedComponent, isExploded, isolationMode, cameraView, vrEye, scene, currentMode]);

  useFrame((_, delta) => {
    // Hide floor elements when camera goes below y = -0.5 (underview exploration)
    if (floorGroupRef.current) {
      floorGroupRef.current.visible = camera.position.y >= -0.5;
    }

    if (vrEye === 'right') {
      if (vrCameraPosition && vrCameraTarget) {
        const basePos = new THREE.Vector3(...vrCameraPosition);
        const targetVal = new THREE.Vector3(...vrCameraTarget);

        camera.position.copy(basePos);
        camera.lookAt(targetVal);
        camera.updateMatrixWorld();

        // Offset right eye camera by 0.08 units along its local right axis
        const rightVec = new THREE.Vector3(0.08, 0, 0);
        rightVec.applyQuaternion(camera.quaternion);

        camera.position.add(rightVec);

        // Keep optical axes parallel to avoid eye strain
        camera.lookAt(targetVal.clone().add(rightVec));
        camera.updateMatrixWorld();
      }
      return;
    }

    // Left eye / standard view
    if (isTransitioning.current) {
      // Dynamic precise bounding box tracking during inspection camera glide
      if (cameraView === 'inspect' && selectedComponent && inspectTargetMeshes.current.length > 0) {
        const box = new THREE.Box3();
        let hasValidMesh = false;
        inspectTargetMeshes.current.forEach((obj) => {
          if (!obj.geometry.boundingBox) {
            obj.geometry.computeBoundingBox();
          }
          if (obj.geometry.boundingBox) {
            const tempBox = obj.geometry.boundingBox.clone();
            tempBox.applyMatrix4(obj.matrixWorld);
            if (!hasValidMesh) {
              box.copy(tempBox);
              hasValidMesh = true;
            } else {
              box.union(tempBox);
            }
          }
        });

        if (hasValidMesh) {
          const cx = (box.min.x + box.max.x) / 2;
          const cy = (box.min.y + box.max.y) / 2;
          const cz = (box.min.z + box.max.z) / 2;
          
          targetLookAt.current.set(cx, cy, cz);
          
          if (isolationMode) {
            targetCamPos.current.set(cx, cy + 0.3, cz + 2.2);
          } else {
            targetCamPos.current.set(cx + 2.5, cy + 1.5, cz + 3.0);
          }
        }
      }

      camera.position.lerp(targetCamPos.current, delta * 4);
      
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLookAt.current, delta * 4);
        controlsRef.current.update();
      }

      // Snapped close enough, let OrbitControls handle it freely
      if (camera.position.distanceTo(targetCamPos.current) < 0.05) {
        isTransitioning.current = false;
      }
    } else {
      if (controlsRef.current) {
        controlsRef.current.update();
      }
    }

    // Synchronize current coordinates to Zustand store for right canvas
    if (controlsRef.current) {
      setVrCamera(
        [camera.position.x, camera.position.y, camera.position.z],
        [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z]
      );
    }
  });

  return null;
}

interface SceneProps {
  controlsRef: React.MutableRefObject<any>;
  vrEye?: 'left' | 'right';
}

export function Scene({ controlsRef, vrEye }: SceneProps) {
  const autoRotate = useDroneStore((state) => state.autoRotate);
  const cameraView = useDroneStore((state) => state.cameraView);
  const theme = useDroneStore((state) => state.theme);
  const isDark = theme === 'dark';
  const showAnatomyExploded = useDroneStore((state) => state.showAnatomyExploded);
  const floorGroupRef = useRef<THREE.Group>(null);

  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        shadows
        camera={{ position: [5.0, 3.5, 6.0], fov: 45 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[isDark ? '#070a13' : '#F8FAFC']} />

        {/* Realistic HDRI warehouse backdrop with reflections enabled */}
        <Environment preset="warehouse" />

        {/* Ambient & Soft Directional Lighting representing warehouse skylights */}
        <ambientLight intensity={isDark ? 0.4 : 0.8} color={isDark ? '#dbeafe' : '#ffffff'} />
        
        <directionalLight
          position={[12, 20, 8]}
          intensity={isDark ? 0.8 : 1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />
        
        {/* Volumetric cyber spotlight focused on the drone */}
        <spotLight
          position={[0, 8, 0]}
          angle={0.45}
          penumbra={0.8}
          intensity={isDark ? 6 : 10}
          color={isDark ? '#00A3FF' : '#3D82F5'}
          castShadow
          shadow-bias={-0.0001}
        />
        
        {/* Soft fill light representing reflective surfaces in the warehouse */}
        <directionalLight
          position={[-10, 8, -10]}
          intensity={isDark ? 0.2 : 0.4}
          color={isDark ? '#00A3FF' : '#38bdf8'}
        />

        {/* Environment floor elements */}
        <group ref={floorGroupRef}>
          {/* Realistic industrial concrete floor with high specular reflection */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial 
              color={isDark ? '#080c16' : '#F1F5F9'} 
              roughness={isDark ? 0.2 : 0.4} 
              metalness={isDark ? 0.7 : 0.1} 
            />
          </mesh>

          {/* Muted industrial grid lines for spatial alignment */}
          <Grid
            position={[0, -0.59, 0]}
            args={[30, 30]}
            cellSize={1.0}
            cellThickness={0.5}
            cellColor={isDark ? '#0044cc' : '#cbd5e1'}
            sectionSize={5.0}
            sectionThickness={1.2}
            sectionColor={isDark ? '#00a3ff' : '#3D82F5'}
            fadeDistance={20}
            fadeStrength={1.2}
            infiniteGrid
          />

          {/* Circular landing pad target */}
          <group position={[0, -0.58, 0]}>
            {/* Metallic landing plate */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[2.5, 64]} />
              <meshStandardMaterial 
                color={isDark ? '#0b1329' : '#FFFFFF'} 
                roughness={isDark ? 0.35 : 0.5} 
                metalness={isDark ? 0.85 : 0.2} 
              />
            </mesh>
            {/* Painted cyber cyan border ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
              <ringGeometry args={[2.4, 2.5, 64]} />
              <meshBasicMaterial color={isDark ? '#00a3ff' : '#3D82F5'} toneMapped={false} />
            </mesh>
            {/* Blueprint concentric rings */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
              <ringGeometry args={[1.5, 1.54, 64]} />
              <meshBasicMaterial color={isDark ? '#0055ff' : '#3D82F5'} transparent opacity={0.35} toneMapped={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
              <ringGeometry args={[3.5, 3.54, 64]} />
              <meshBasicMaterial color={isDark ? '#0055ff' : '#3D82F5'} transparent opacity={0.15} toneMapped={false} />
            </mesh>
            {/* Inner crosshairs target */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
              <ringGeometry args={[0.0, 0.4, 4]} />
              <meshBasicMaterial color={isDark ? '#00a3ff' : '#3D82F5'} toneMapped={false} transparent opacity={0.4} />
            </mesh>
          </group>

          {/* Soft ground shadows sitting directly on the landing pad */}
          <ContactShadows
            position={[0, -0.57, 0]}
            opacity={0.85}
            scale={5}
            blur={1.8}
            far={10}
            resolution={1024}
          />
        </group>

        {/* Center the group & render model */}
        <Center>
          {showAnatomyExploded
            ? (
              <Suspense fallback={null}>
                <PlutoAnatomyExploded />
              </Suspense>
            )
            : (
              <>
                <PlutoXModel />
                <FloatingHotspots />
              </>
            )
          }
        </Center>

        {/* Smooth dynamic camera controllers */}
        <CameraController controlsRef={controlsRef} vrEye={vrEye} floorGroupRef={floorGroupRef} />

        {vrEye !== 'right' && (
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={1.2}
            maxDistance={8.5}
            maxPolarAngle={cameraView === 'bottom' ? Math.PI : Math.PI / 2 + 0.1} // Allow looking from underneath
            autoRotate={autoRotate}
            autoRotateSpeed={3.0} // Faster auto rotate
          />
        )}
      </Canvas>

      {/* Decorative Sci-Fi Border Elements */}
      <div className="absolute top-0 left-0 w-full h-full border border-blue-500/10 pointer-events-none rounded-lg" />
      <div className="absolute top-4 left-4 text-xs font-mono text-blue-400/30 uppercase tracking-widest pointer-events-none">
        AeroSys Diagnostics v4.2.1
      </div>
      <div className="absolute bottom-4 right-4 text-xs font-mono text-blue-400/30 uppercase tracking-widest pointer-events-none">
        Telemetry Stream: Connected
      </div>
    </div>
  );
}
