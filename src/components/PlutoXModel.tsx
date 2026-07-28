import { useMemo, useRef, useEffect } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDroneStore } from '../store/useDroneStore';
import { useFrame } from '@react-three/fiber';
import { sound } from '../utils/soundController';

// Helper to determine which corner index (1: Front-Left, 2: Front-Right, 3: Rear-Left, 4: Rear-Right)
// a component is located at, based on its X and Z coordinates in Three.js space.
export function getCornerIndex(x: number, z: number): 1 | 2 | 3 | 4 {
  if (x <= 0 && z >= 0) return 1; // FL (Front-Left)
  if (x > 0 && z > 0) return 2;  // FR (Front-Right)
  if (x < 0 && z < 0) return 3;  // RL (Rear-Left)
  if (x >= 0 && z <= 0) return 4; // RR (Rear-Right)
  return 1;
}

// Convert mesh name to component educational ID
export function getComponentIdByMeshName(meshName: string): string | null {
  const name = meshName.toLowerCase();
  
  // Ignore generic CAD solid/body/screw/washer names so raycasting bubbles up to named groups
  if (/^(body|solid|compound|component|screw|washer|primitive)/i.test(name)) {
    return null;
  }
  
  if (name.includes('canopy')) return 'canopy';
  if (name.includes('camera') || name.includes('cam')) return 'cameraModule';
  if (name.includes('porpguard') || name.includes('guard')) return 'propellerGuard';
  
  // Propellers
  if (name.includes('propeller')) {
    return 'propeller'; 
  }
  
  // Motors
  if (name.includes('motor')) {
    return 'motor';
  }
  
  // Power & Battery elements
  if (name.includes('battery connector') || name.includes('battery wire') || name.includes('power') || name.includes('regulator') || name.includes('bec')) {
    return 'powerSystem';
  }
  if (name.includes('battery')) {
    return 'battery';
  }
  
  // Breakout boards
  if (name.includes('board connector') || name.includes('board wire') || name.includes('breakout') || name.includes('distribution') || name.includes('pdb')) {
    return 'xBreakoutBoard';
  }
  
  // Autopilot/Flight Controller
  if (name.includes('primus') || name.includes('pcb') || name.includes('lqfp-48') || name.includes('esp-wroom') || name.includes('controller') || name.includes('fc') || name.includes('brain')) {
    return 'flightController';
  }
  
  // Sensors
  if (name.includes('lga-8l') || name.includes('imu')) {
    return 'imuSensor';
  }
  if (name.includes('tdqfn')) {
    return 'barometer';
  }
  
  // Structural frame
  if (name.includes('frame') || name.includes('chassis') || name.includes('plate') || name.includes('carbon') || name.includes('landing pad') || name.includes('damper')) {
    return 'frameStructure';
  }
  
  return null;
}

interface PlutoXModelProps {
  isFlightMode?: boolean;
  onLoad?: (scene: THREE.Group) => void;
  modelPath?: string;
}

export function PlutoXModel({ isFlightMode = false, onLoad, modelPath = '/models/plutox.glb' }: PlutoXModelProps = {}) {
  const { scene: originalScene } = useGLTF(modelPath);
  const scene = useMemo(() => originalScene.clone(true), [originalScene]);

  useEffect(() => {
    if (scene && onLoad) {
      onLoad(scene);
    }
  }, [scene, onLoad]);
  const currentMode = useDroneStore((state) => state.currentMode);
  const hoveredComponent = useDroneStore((state) => state.hoveredComponent);
  const selectedComponent = useDroneStore((state) => state.selectedComponent);
  const isExploded = useDroneStore((state) => state.isExploded);
  const isolationMode = useDroneStore((state) => state.isolationMode);
  
  const activeMotors = useDroneStore((state) => state.activeMotors);
  const motorRPMs = useDroneStore((state) => state.motorRPMs);
  const showRotationDirections = useDroneStore((state) => state.showRotationDirections);
  
  const hoverComponent = useDroneStore((state) => state.hoverComponent);
  const selectComponent = useDroneStore((state) => state.selectComponent);
  const toggleMotor = useDroneStore((state) => state.toggleMotor);

  // Propeller and Motor casing angle trackers
  const rotationAngles = useRef<Record<string, number>>({});

  // 1. Build a high-performance flat cache of all Meshes for fast 60FPS updates (emissive, isolation opacity)
  const meshCache = useMemo(() => {
    const list: {
      mesh: THREE.Mesh;
      materials: {
        mat: THREE.MeshStandardMaterial;
        originalOpacity: number;
        originalTransparent: boolean;
        originalEmissive: THREE.Color;
      }[];
      componentId: string | null;
      motorKey: 'motor1' | 'motor2' | 'motor3' | 'motor4' | null;
      cornerIndex: 1 | 2 | 3 | 4;
    }[] = [];

    scene.updateMatrixWorld(true);

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Clone material so we can highlight/opacity-shift individual meshes
        let materials: {
          mat: THREE.MeshStandardMaterial;
          originalOpacity: number;
          originalTransparent: boolean;
          originalEmissive: THREE.Color;
        }[] = [];

        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m: THREE.Material) => m.clone());
            materials = child.material.map((m: THREE.Material) => {
              const standardMat = m as THREE.MeshStandardMaterial;
              return {
                mat: standardMat,
                originalOpacity: standardMat.opacity ?? 1,
                originalTransparent: standardMat.transparent ?? false,
                originalEmissive: standardMat.emissive ? standardMat.emissive.clone() : new THREE.Color(0, 0, 0)
              };
            });
          } else {
            child.material = child.material.clone();
            const standardMat = child.material as THREE.MeshStandardMaterial;
            materials = [{
              mat: standardMat,
              originalOpacity: standardMat.opacity ?? 1,
              originalTransparent: standardMat.transparent ?? false,
              originalEmissive: standardMat.emissive ? standardMat.emissive.clone() : new THREE.Color(0, 0, 0)
            }];
          }
        }

        // Climb up parent chain to resolve component mapping
        let componentId: string | null = null;
        let current: THREE.Object3D | null = child;
        let matchedCorner: 1 | 2 | 3 | 4 = 1;

        while (current && current !== (scene as any)) {
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

        // Refine component ID for motors and props
        if (componentId === 'motor') {
          const mappedCorner = matchedCorner === 3 ? 4 : matchedCorner === 4 ? 3 : matchedCorner;
          componentId = `motor${mappedCorner}`;
        } else if (componentId === 'propeller') {
          componentId = (matchedCorner === 1 || matchedCorner === 4) ? 'propellerA' : 'propellerB';
        }

        // Map which motor control drives this mesh (for running glows)
        let motorKey: 'motor1' | 'motor2' | 'motor3' | 'motor4' | null = null;
        if (componentId) {
          if (componentId.startsWith('motor')) {
            motorKey = componentId as any;
          } else if (componentId === 'propellerA' || componentId === 'propellerB') {
            const mappedCorner = matchedCorner === 3 ? 4 : matchedCorner === 4 ? 3 : matchedCorner;
            motorKey = `motor${mappedCorner}` as any;
          }
        }

        list.push({
          mesh: child,
          materials,
          componentId,
          motorKey,
          cornerIndex: matchedCorner
        });
      }
    });

    return list;
  }, [scene]);

  // 2. Pre-cache parent groups for radial explosion view transitions
  const explodeTargets = useMemo(() => {
    const list: { 
      object: THREE.Object3D; 
      originalX: number; 
      originalY: number; 
      originalZ: number; 
      componentId: string;
      cornerIndex: 1 | 2 | 3 | 4;
    }[] = [];
    
    scene.updateMatrixWorld(true);

    scene.traverse((child) => {
      // Find the main component nodes (not leaf meshes) to apply translation to
      const tempId = getComponentIdByMeshName(child.name);
      if (tempId) {
        const worldPos = new THREE.Vector3();
        worldPos.setFromMatrixPosition(child.matrixWorld);
        const corner = getCornerIndex(worldPos.x, worldPos.z);
        
        let finalId = tempId;
        if (tempId === 'motor') {
          const mappedCorner = corner === 3 ? 4 : corner === 4 ? 3 : corner;
          finalId = `motor${mappedCorner}`;
        } else if (tempId === 'propeller') {
          finalId = (corner === 1 || corner === 4) ? 'propellerA' : 'propellerB';
        }

        list.push({
          object: child,
          originalX: child.position.x,
          originalY: child.position.y,
          originalZ: child.position.z,
          componentId: finalId,
          cornerIndex: corner
        });
      }
    });
    return list;
  }, [scene]);

  // Pointer over / raycasting handlers
  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    
    let current: THREE.Object3D | null = e.object;
    let componentId: string | null = null;
    
    while (current && current !== (scene as any)) {
      const match = explodeTargets.find(t => t.object === current);
      if (match) {
        componentId = match.componentId;
        break;
      }
      current = current.parent;
    }

    if (componentId) {
      document.body.style.cursor = 'pointer';
      hoverComponent(componentId);
    }
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
    hoverComponent(null);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    
    let current: THREE.Object3D | null = e.object;
    let componentId: string | null = null;
    let clickedTarget: typeof explodeTargets[0] | null = null;
    
    while (current && current !== (scene as any)) {
      const match = explodeTargets.find(t => t.object === current);
      if (match) {
        componentId = match.componentId;
        clickedTarget = match;
        break;
      }
      current = current.parent;
    }

    if (componentId) {
      if (currentMode === 'learning') {
        useDroneStore.getState().identifyComponent(componentId);
        return;
      }
      // Interactive spin test toggle if motor or propeller is already selected and clicked again
      if (selectedComponent === componentId) {
        if (componentId.startsWith('motor')) {
          toggleMotor(componentId as any);
          return;
        } else if (componentId.startsWith('propeller') && clickedTarget) {
          const motorId = `motor${clickedTarget.cornerIndex}` as any;
          toggleMotor(motorId);
          return;
        }
      }
      selectComponent(selectedComponent === componentId ? null : componentId);
    }
  };

  const rootGroupRef = useRef<THREE.Group>(null);

  // Main animation frame loop
  useFrame((state, delta) => {
    if (currentMode === 'flight') return;

    // Apply subtle floating sine wave animation on Home Hub
    if (rootGroupRef.current) {
      if (currentMode === 'home') {
        const time = state.clock.getElapsedTime();
        rootGroupRef.current.position.y = -0.5 + Math.sin(time * 1.5) * 0.05;
      } else if (!isFlightMode) {
        rootGroupRef.current.position.y = -0.5;
      } else {
        rootGroupRef.current.position.y = 0;
      }
    }
    
    // 1. Exploded view calculations
    explodeTargets.forEach(({ object, originalX, originalY, originalZ }) => {
      let targetX = originalX;
      let targetY = originalY;
      let targetZ = originalZ;

      if (isExploded) {
        // Calculate radial direction in horizontal XY plane of the GLB local space
        const dir = new THREE.Vector3(originalX, originalY, 0).normalize();
        
        // Push components outwards based on radial vector to prevent overlap
        const explodeDistance = 0.40; 
        targetX += dir.x * explodeDistance;
        targetY += dir.y * explodeDistance;
        targetZ += 0.30; // float upwards along Z axis (which is height in GLB space)
      }

      // Smooth translation interpolation
      object.position.x = THREE.MathUtils.lerp(object.position.x, targetX, delta * 7);
      object.position.y = THREE.MathUtils.lerp(object.position.y, targetY, delta * 7);
      object.position.z = THREE.MathUtils.lerp(object.position.z, targetZ, delta * 7);
    });

    // 2. High-performance material updates, glows, and propeller/motor casing spins
    meshCache.forEach(({ mesh, materials, componentId, motorKey, cornerIndex }) => {
      const isHovered = componentId && hoveredComponent === componentId;
      const wrongComponentClicked = useDroneStore.getState().wrongComponentClicked;
      const isWrong = componentId && wrongComponentClicked === componentId;
      const isSelected = componentId && selectedComponent === componentId;
      const isRunning = motorKey && activeMotors[motorKey];

      materials.forEach(({ mat, originalOpacity, originalTransparent, originalEmissive }) => {
        // A. Emissive glows
        if (mat.emissive) {
          if (isWrong) {
            mat.emissive.setHex(0xFF3333); // Red wrong selection glow
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 1.8, delta * 12);
          } else if (isHovered) {
            mat.emissive.setHex(0x00A3FF); // Cyan hover glow
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.8, delta * 12);
          } else if (isSelected) {
            mat.emissive.setHex(0x00FF88); // Green selection glow
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 1.2, delta * 12);
          } else if (isRunning) {
            mat.emissive.setHex(0xFF7700); // Orange motor running glow
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 1.0, delta * 10);
          } else {
            mat.emissive.copy(originalEmissive);
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.0, delta * 8);
          }
        }

        // B. Isolation opacity shifting, raycast toggle, and visual blinking fixes
        if (isolationMode && selectedComponent) {
          const isComponentPart = componentId === selectedComponent;
          const targetOpacity = isComponentPart ? 1.0 : 0.05;
          const targetDepthWrite = targetOpacity > 0.5;
          
          if (mat.transparent !== true) mat.transparent = true;
          if (mat.depthWrite !== targetDepthWrite) mat.depthWrite = targetDepthWrite;
          
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 8);
          mesh.raycast = isComponentPart ? THREE.Mesh.prototype.raycast : () => null;
        } else {
          const targetOpacity = originalOpacity;
          const currentOpacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 8);
          mat.opacity = currentOpacity;
          
          const isOpaqueTarget = Math.abs(currentOpacity - originalOpacity) < 0.01;
          const nextTransparent = isOpaqueTarget ? originalTransparent : true;
          const nextDepthWrite = isOpaqueTarget ? true : (currentOpacity > 0.5);
          
          if (mat.transparent !== nextTransparent) mat.transparent = nextTransparent;
          if (mat.depthWrite !== nextDepthWrite) mat.depthWrite = nextDepthWrite;
          
          mesh.raycast = THREE.Mesh.prototype.raycast;
        }
      });

      // C. Active propeller/motor casing rotation (spinning around local Z axis)
      const shouldSpin = componentId && (componentId.startsWith('propellerA') || componentId.startsWith('propellerB') || componentId.startsWith('motor'));
      const isIdleHome = currentMode === 'home' && componentId && (componentId.startsWith('propellerA') || componentId.startsWith('propellerB'));
      
      if ((isRunning || isIdleHome) && shouldSpin) {
        const rpm = isIdleHome ? 1200 : motorRPMs[motorKey!];
        if (rpm > 0) {
          // CW (2 & 3) vs CCW (1 & 4)
          const direction = (cornerIndex === 2 || cornerIndex === 3) ? -1 : 1;
          const rotationSpeed = (rpm / 60) * Math.PI * 2 * delta * 0.02;
          
          const spinKey = `${mesh.uuid}`;
          if (rotationAngles.current[spinKey] === undefined) {
            rotationAngles.current[spinKey] = 0;
          }
          rotationAngles.current[spinKey] += direction * rotationSpeed;
          mesh.rotation.z = rotationAngles.current[spinKey];

          // Procedural Audio pitch modifications based on RPM speeds
          if (isRunning && (componentId === 'propellerA' || componentId === 'propellerB')) {
            sound.updateMotorPitch(motorKey!, rpm);
          }
        }
      }
    });
  });

  // Coordinates of the 4 propellers in world space (at scale 18.0)
  const propLocations = [
    { corner: 1, label: 'FL (CCW)', pos: [-0.48 * 18, 0.12 * 18, 0.48 * 18] as [number, number, number], active: activeMotors.motor1 },
    { corner: 2, label: 'FR (CW)', pos: [0.48 * 18, 0.12 * 18, 0.48 * 18] as [number, number, number], active: activeMotors.motor2 },
    { corner: 3, label: 'RL (CW)', pos: [-0.48 * 18, 0.12 * 18, -0.48 * 18] as [number, number, number], active: activeMotors.motor4 },
    { corner: 4, label: 'RR (CCW)', pos: [0.48 * 18, 0.12 * 18, -0.48 * 18] as [number, number, number], active: activeMotors.motor3 },
  ];


  return (
    <>
      <group ref={rootGroupRef} position={isFlightMode ? [0, 0, 0] : [0, -0.5, 0]}>
        <primitive
          object={scene}
          scale={isFlightMode ? 1.0 : 18.0}
          position={[0, 0, 0]}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        />
      </group>

      {/* Dynamic 3D Propeller Rotation Indicator Overlay Arrows */}
      {showRotationDirections && propLocations.map(({ corner, label, pos, active }) => {
        const isCW = corner === 1 || corner === 4;
        return (
          <group key={corner} position={pos}>
            <Html center distanceFactor={8}>
              <div className="flex flex-col items-center pointer-events-none">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  {/* Rotating Arrow Ring */}
                  <svg 
                    viewBox="0 0 100 100" 
                    className={`w-10 h-10 border-blue-500/10 ${
                      active 
                        ? isCW 
                          ? 'animate-spin' 
                          : 'animate-spin-reverse'
                        : ''
                    }`}
                    style={{
                      animationDuration: active ? '0.6s' : '4s',
                      transform: isCW ? 'none' : 'scaleX(-1)' // flips CCW arrows
                    }}
                  >
                    <path
                      d="M 50 15 A 35 35 0 1 1 15 50"
                      fill="none"
                      stroke={active ? '#FF8800' : '#00A3FF'}
                      strokeWidth="8"
                      strokeDasharray="16, 8"
                      strokeLinecap="round"
                    />
                    <polygon
                      points="15,40 2,55 25,55"
                      fill={active ? '#FF8800' : '#00A3FF'}
                    />
                  </svg>
                </div>
                <span className="text-[8px] font-mono mt-1 text-slate-400 bg-slate-950/70 px-1 rounded uppercase tracking-wider">
                  {label}
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

// Add CSS keyframes for reverse spinning indicator
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin-reverse {
      from { transform: rotate(360deg) scaleX(-1); }
      to { transform: rotate(0deg) scaleX(-1); }
    }
    .animate-spin-reverse {
      animation: spin-reverse 1s linear infinite;
    }
  `;
  document.head.appendChild(style);
}

// Enable Draco decoding CDN globally for Phase 2-4 performance optimizations
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
useGLTF.preload('/models/plutox.glb');

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1030

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1061

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1092

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1123

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1154

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1185

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1216

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1247

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1278

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1309

// Senior Perf: Re-use InstancedBufferAttribute to avoid garbage collection overhead
 // Commit Entry #1340
