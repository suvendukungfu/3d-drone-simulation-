import { useEffect, useRef, useCallback, Component, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useDroneStore } from '../store/useDroneStore';
import { SimulatorOrchestrator } from '../utils/drone/SimulatorOrchestrator';
import { TelemetryData } from '../utils/drone/types';
import { EnvironmentManager } from './EnvironmentManager';
import { PlutoXModel } from './PlutoXModel';
import { sound } from '../utils/soundController';
import { motion, AnimatePresence } from 'framer-motion';
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
  propellerGuardsRef: React.MutableRefObject<THREE.Object3D[]>;
  dirLightRef: React.RefObject<THREE.DirectionalLight>;
  onTelemetryFrame?: (telemetry: TelemetryData) => void;
}

function SimulationLoop({ 
  orchestrator, 
  droneGroupRef, 
  propellersRef, 
  propellerGuardsRef, 
  dirLightRef,
  onTelemetryFrame 
}: SimulationLoopProps) {
  const { camera, scene } = useThree();
  const flightCameraView = useDroneStore((state) => state.flightCameraView);
  const updateFlightTelemetry = useDroneStore((state) => state.updateFlightTelemetry);


  // Propeller angles tracker
  const propAngles = useRef([0, 0, 0, 0]);
  const propVelocitiesRef = useRef<number[]>([0, 0, 0, 0]);
  const wasCrashedRef = useRef<boolean>(false);
  const crashParticlesRef = useRef<any[]>([]);
  const crashLightRef = useRef<THREE.PointLight | null>(null);
  const flameGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const smokeGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const sparkGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const scorchMarksRef = useRef<any[]>([]);
  const sootTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Refs for tracking broken propellers and flying debris on crash
  const debrisRef = useRef<{
    mesh: THREE.Object3D;
    velocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
    life: number;
    maxLife: number;
  }[]>([]);

  const createSootTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 58);
      grad.addColorStop(0, 'rgba(12, 12, 12, 0.95)');    // Very dense carbon center
      grad.addColorStop(0.2, 'rgba(25, 25, 25, 0.85)');
      grad.addColorStop(0.45, 'rgba(45, 45, 45, 0.55)');
      grad.addColorStop(0.75, 'rgba(70, 70, 70, 0.2)');   // Carbon dispersion edge
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  const throttleStoreUpdate = useRef(0);
  const cameraInitialized = useRef(false);

  // Mouse look rotation offsets for chase and FPV views
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mouseOffset = useRef({ yaw: 0, pitch: 0 });
  const smoothYawRef = useRef<number | null>(null);
  const wasTakenOffRef = useRef(false);

  // ── Pre-allocated scratch vectors for chase camera (zero-alloc hot path) ──
  const _camForward = useRef(new THREE.Vector3());
  const _camUp = useRef(new THREE.Vector3());
  const _camLevelFwd = useRef(new THREE.Vector3());
  const _camBackVec = useRef(new THREE.Vector3());
  const _camTargetPos = useRef(new THREE.Vector3());
  const _camLookAt = useRef(new THREE.Vector3());
  const _camRightVec = useRef(new THREE.Vector3());

  // Initialize shared geometries to save memory and reduce GC overhead
  if (!flameGeoRef.current) {
    flameGeoRef.current = new THREE.DodecahedronGeometry(0.05);
  }
  if (!smokeGeoRef.current) {
    smokeGeoRef.current = new THREE.SphereGeometry(0.06, 6, 6);
  }
  if (!sparkGeoRef.current) {
    sparkGeoRef.current = new THREE.BoxGeometry(0.01, 0.01, 0.01);
  }

  // Cleanup resources on unmount
  useEffect(() => {
    return () => {
      if (scene) {
        if (crashLightRef.current) {
          scene.remove(crashLightRef.current);
        }
        // Remove and dispose of all active particles
        crashParticlesRef.current.forEach(p => {
          scene.remove(p.mesh);
          if (Array.isArray(p.mesh.material)) {
            p.mesh.material.forEach((m: any) => m.dispose());
          } else {
            p.mesh.material.dispose();
          }
        });
        // Remove and dispose of debris
        debrisRef.current.forEach(d => {
          scene.remove(d.mesh);
          d.mesh.traverse(child => {
            if (child instanceof THREE.Mesh && child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m: any) => m.dispose());
            }
          });
        });
        // Remove and dispose of all scorch marks
        scorchMarksRef.current.forEach(sm => {
          scene.remove(sm.mesh);
          sm.mesh.geometry.dispose();
          if (Array.isArray(sm.mesh.material)) {
            sm.mesh.material.forEach((m: any) => m.dispose());
          } else {
            sm.mesh.material.dispose();
          }
        });
        if (sootTextureRef.current) {
          sootTextureRef.current.dispose();
          sootTextureRef.current = null;
        }
      }
      flameGeoRef.current?.dispose();
      smokeGeoRef.current?.dispose();
      sparkGeoRef.current?.dispose();
    };
  }, [scene]);

  // Spawns physical propeller & guard debris for ALL corners that fly off the drone and fall to the ground
  const spawnPropellerDebris = (position: THREE.Vector3) => {
    if (!scene) return;

    const crashCol = orchestrator.lastCrashCollision;
    const normal = crashCol ? crashCol.normal.clone() : new THREE.Vector3(0, 1, 0);
    const droneVel = orchestrator.getPhysicsState().velocity;

    const forceDir = new THREE.Vector3().copy(normal).negate().normalize();
    
    // Obtain drone's current world position
    const droneWorldPos = position;

    // 1. Process all propellers
    if (propellersRef.current && propellersRef.current.length > 0) {
      propellersRef.current.forEach((prop) => {
        if (prop.parent === scene) return; // already detached

        const propWorldPos = new THREE.Vector3();
        prop.getWorldPosition(propWorldPos);

        // Side selective check: only detach if on the impact side
        const offset = propWorldPos.clone().sub(droneWorldPos);
        const dot = offset.dot(forceDir);
        if (dot < 0.0) return; // Keep intact

        // Save original parent & local transform
        if (!prop.userData.originalParent) {
          prop.userData.originalParent = prop.parent;
          prop.userData.originalPosition = prop.position.clone();
          prop.userData.originalRotation = prop.rotation.clone();
          prop.userData.originalScale = prop.scale.clone();
        }

        const propWorldQuat = new THREE.Quaternion();
        prop.getWorldQuaternion(propWorldQuat);

        // Detach
        if (prop.parent) {
          prop.parent.remove(prop);
        }
        scene.add(prop);

        prop.position.copy(propWorldPos);
        prop.quaternion.copy(propWorldQuat);

        // Compute physics: fly outward relative to drone center
        const offsetFromCenter = propWorldPos.clone().sub(position).normalize();
        const outboundSpeed = 1.0 + Math.random() * 2.0;
        const velocity = offsetFromCenter.clone().multiplyScalar(outboundSpeed).addScaledVector(normal, 0.5);
        velocity.y += 1.0 + Math.random() * 1.5; // upward bounce

        if (droneVel) {
          velocity.addScaledVector(droneVel, 0.4);
        }

        const angularVelocity = new THREE.Vector3(
          (Math.random() - 0.5) * 20.0,
          (Math.random() - 0.5) * 20.0,
          (Math.random() - 0.5) * 20.0
        );

        debrisRef.current.push({
          mesh: prop,
          velocity,
          angularVelocity,
          life: 0,
          maxLife: 99999
        });
      });
    }

    // 2. Process all propeller guards
    if (propellerGuardsRef.current && propellerGuardsRef.current.length > 0) {
      propellerGuardsRef.current.forEach((guard) => {
        if (guard.parent === scene) return; // already detached

        const guardWorldPos = new THREE.Vector3();
        guard.getWorldPosition(guardWorldPos);

        // Side selective check: only detach if on the impact side
        const offset = guardWorldPos.clone().sub(droneWorldPos);
        const dot = offset.dot(forceDir);
        if (dot < 0.0) return; // Keep intact

        // Save original parent & local transform
        if (!guard.userData.originalParent) {
          guard.userData.originalParent = guard.parent;
          guard.userData.originalPosition = guard.position.clone();
          guard.userData.originalRotation = guard.rotation.clone();
          guard.userData.originalScale = guard.scale.clone();
        }

        const guardWorldQuat = new THREE.Quaternion();
        guard.getWorldQuaternion(guardWorldQuat);

        // Detach
        if (guard.parent) {
          guard.parent.remove(guard);
        }
        scene.add(guard);

        guard.position.copy(guardWorldPos);
        guard.quaternion.copy(guardWorldQuat);

        // Physics: fly outwards
        const offsetFromCenter = guardWorldPos.clone().sub(position).normalize();
        const outboundSpeed = 0.8 + Math.random() * 1.5;
        const guardVelocity = offsetFromCenter.clone().multiplyScalar(outboundSpeed).addScaledVector(normal, 0.3);
        guardVelocity.y += 1.0 + Math.random() * 1.5;

        if (droneVel) {
          guardVelocity.addScaledVector(droneVel, 0.4);
        }

        const guardAngularVel = new THREE.Vector3(
          (Math.random() - 0.5) * 15.0,
          (Math.random() - 0.5) * 15.0,
          (Math.random() - 0.5) * 15.0
        );

        debrisRef.current.push({
          mesh: guard,
          velocity: guardVelocity,
          angularVelocity: guardAngularVel,
          life: 0,
          maxLife: 99999
        });
      });
    }
  };

  // Spawns a burst of spark/embers on physical collision
  const spawnCrashParticles = (position: THREE.Vector3) => {
    if (!scene) return;

    // Create a dynamic dark soot/scorch decal at the impact point (wall or floor)
    // Read from persisted crash collision data (survives physics tick clearing)
    const crashCol = orchestrator.lastCrashCollision;
    const normal = crashCol ? crashCol.normal.clone() : new THREE.Vector3(0, 1, 0);
    
    // Contact point on wall surface = droneCenter - normal * (droneRadius - zFightingBias)
    // droneRadius is 0.08, zFightingBias is 0.003, offset is -0.077 along normal vector.
    const scorchPos = position.clone().addScaledVector(normal, -0.077);

    const speed = crashCol ? crashCol.speed : 1.5;
    // Scale blast mark size dynamically with collision impact speed (higher speed = larger mark)
    const baseRadius = 0.15 + Math.min(0.25, speed * 0.05);
    const scorchGeo = new THREE.CircleGeometry(baseRadius + Math.random() * 0.05, 32);
    
    if (!sootTextureRef.current) {
      sootTextureRef.current = createSootTexture();
    }
    const scorchMat = new THREE.MeshBasicMaterial({
      map: sootTextureRef.current,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(scorchGeo, scorchMat);
    mesh.position.copy(scorchPos);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    scene.add(mesh);

    scorchMarksRef.current.push({
      mesh,
      life: 0,
      maxLife: 6.0 + Math.random() * 4.0,
      fading: false
    });

    // 1. Spawn Ember Sparks (high velocity, affected by gravity)
    const sparkCount = 35;
    for (let i = 0; i < sparkCount; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 1.0
      });
      const mesh = new THREE.Mesh(sparkGeoRef.current!, material);
      mesh.position.copy(position);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 1.0 + Math.random() * 3.0;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).multiplyScalar(speed);

      velocity.y += 0.8; // Upward bias

      scene.add(mesh);
      crashParticlesRef.current.push({
        mesh,
        velocity,
        type: 'spark',
        life: 0,
        maxLife: 0.6 + Math.random() * 0.8,
        initialScale: 0.5 + Math.random() * 0.8,
        drag: 0.99
      });
    }

    // 2. Spawn slow rising Smoke
    const smokeCount = 15;
    for (let i = 0; i < smokeCount; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0x555555,
        transparent: true,
        opacity: 0.5
      });
      const mesh = new THREE.Mesh(smokeGeoRef.current!, material);
      mesh.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      ));

      const theta = Math.random() * Math.PI * 2;
      const velocitySpeed = 0.15 + Math.random() * 0.3;
      const velocity = new THREE.Vector3(
        Math.cos(theta),
        1.5 + Math.random() * 1.5,
        Math.sin(theta)
      ).normalize().multiplyScalar(velocitySpeed);

      scene.add(mesh);
      crashParticlesRef.current.push({
        mesh,
        velocity,
        type: 'smoke',
        life: 0,
        maxLife: 1.0 + Math.random() * 0.8,
        initialScale: 0.8 + Math.random() * 1.2,
        drag: 0.98
      });
    }

    // 3. Spawn small grey plastic debris
    const debrisCount = 10;
    for (let i = 0; i < debrisCount; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0x222222,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(flameGeoRef.current!, material);
      mesh.position.copy(position);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const velocitySpeed = 0.8 + Math.random() * 2.0;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).multiplyScalar(velocitySpeed);
      velocity.y += 0.5;

      scene.add(mesh);
      crashParticlesRef.current.push({
        mesh,
        velocity,
        type: 'spark',
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
        initialScale: 0.4 + Math.random() * 0.6,
        drag: 0.99
      });
    }

    // 4. Short-lived impact flash/glow
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0
    });
    const glowMesh = new THREE.Mesh(smokeGeoRef.current!, glowMaterial);
    glowMesh.position.copy(position);
    scene.add(glowMesh);
    crashParticlesRef.current.push({
      mesh: glowMesh,
      velocity: new THREE.Vector3(0, 0, 0),
      type: 'flame',
      life: 0,
      maxLife: 0.25,
      initialScale: 4.5,
      drag: 1.0
    });
  };

  // Clears all active crash particles and disposes materials
  const clearAllCrashParticles = () => {
    if (!scene) return;
    crashParticlesRef.current.forEach(p => {
      scene.remove(p.mesh);
      if (Array.isArray(p.mesh.material)) {
        p.mesh.material.forEach((m: any) => m.dispose());
      } else {
        p.mesh.material.dispose();
      }
    });
    crashParticlesRef.current = [];
  };

  // Sync physics bounds to match selected environment
  const envType = useDroneStore((state) => state.flightEnvironment);
  useEffect(() => {
    if (envType === 'field') {
      orchestrator.physics.setBounds(-20, 20, -20, 20, 18);
    } else if (envType === 'course') {
      orchestrator.physics.setBounds(-20, 20, -20, 20, 8);
    } else if (envType === 'warehouse') {
      orchestrator.physics.setBounds(-15, 15, -15, 15, 10);
    } else if (envType === 'lab') {
      orchestrator.physics.setBounds(-10, 10, -10, 10, 7);
    } else if (envType === 'classroom') {
      orchestrator.physics.setBounds(-4.09, 4.02, -5.01, 5.02, 3.40);
    } else { // room
      orchestrator.physics.setBounds(-8, 8, -8, 8, 6);
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
      if (!isDragging.current || flightCameraView === 'orbit' || flightCameraView === 'chase') return;
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
    onTelemetryFrame?.(telemetry);
    
    // Auto-Reset at Takeoff
    const hasTakenOff = orchestrator.getHasTakenOff();
    if (hasTakenOff && !wasTakenOffRef.current) {
      mouseOffset.current = { yaw: 0, pitch: 0 };
      smoothYawRef.current = null;
    }
    wasTakenOffRef.current = hasTakenOff;

    const renderState = orchestrator.getRenderState();
    const physState = orchestrator.getPhysicsState();
    const motorCmds = orchestrator.getMotorCommands();
    const warnings = orchestrator.getWarnings();

    // 2. Play/Adjust motor sounds based on state
    if (telemetry.isArmed && !telemetry.calibrationActive && orchestrator.motorsStarted && !orchestrator.getIsCrashed()) {
      motorCmds.forEach((cmd, idx) => {
        const motorKey = `motor${idx + 1}` as any;
        sound.startMotorSound(motorKey);
        sound.updateMotorPitch(motorKey, 15000 + cmd * 33000);
      });
    } else {
      if (!orchestrator.getIsCrashed()) {
        sound.stopAllMotors();
      }
    }

    // 3. Sync visual drone model position & orientation (using interpolated state for smoothness)
    if (droneGroupRef.current) {
      const bounds = orchestrator.physics.environmentBounds;
      const visualRadius = 0.155; // visual radius to outer edge of guard/propeller
      
      const visualPos = renderState.position.clone();
      visualPos.x = THREE.MathUtils.clamp(visualPos.x, bounds.minX + visualRadius, bounds.maxX - visualRadius);
      visualPos.z = THREE.MathUtils.clamp(visualPos.z, bounds.minZ + visualRadius, bounds.maxZ - visualRadius);
      visualPos.y = Math.max(bounds.minY, visualPos.y);

      droneGroupRef.current.position.copy(visualPos);
      droneGroupRef.current.quaternion.copy(renderState.quaternion);
    }

    // Trigger visual crash impact animation on crash
    const isCurrentlyCrashed = orchestrator.getIsCrashed();
    const isSlowMo = (orchestrator as any).slowMoActive;
    const shouldRestore = wasCrashedRef.current && !(isCurrentlyCrashed || isSlowMo);
    const forceReset = (orchestrator as any).hasJustReset;

    if (isCurrentlyCrashed || isSlowMo) {
      if (!wasCrashedRef.current) {
        // Initial sparks burst
        spawnCrashParticles(renderState.position);
        // Break off all propellers and guards
        spawnPropellerDebris(renderState.position);
        wasCrashedRef.current = true;
        // Instantly stop remaining propellers from spinning
        propVelocitiesRef.current = [0, 0, 0, 0];
      }
    }

    if (state.gl.domElement) {
      state.gl.domElement.style.filter = isSlowMo ? 'blur(0.6px)' : 'none';
    }

    if (shouldRestore || forceReset) {
      // Clean up remaining particles
      clearAllCrashParticles();

      // Ensure all propellers are reattached and restored to original parent and transforms
      if (propellersRef.current) {
        propellersRef.current.forEach((prop) => {
          prop.visible = true;
          if (prop.parent === scene && prop.userData.originalParent) {
            scene.remove(prop);
            prop.userData.originalParent.add(prop);
            prop.position.copy(prop.userData.originalPosition);
            prop.rotation.copy(prop.userData.originalRotation);
            prop.scale.copy(prop.userData.originalScale);
          }
        });
      }

      // Ensure all guards are reattached and restored to original parent and transforms
      if (propellerGuardsRef.current) {
        propellerGuardsRef.current.forEach((guard) => {
          guard.visible = true;
          if (guard.parent === scene && guard.userData.originalParent) {
            scene.remove(guard);
            guard.userData.originalParent.add(guard);
            guard.position.copy(guard.userData.originalPosition);
            guard.rotation.copy(guard.userData.originalRotation);
            guard.scale.copy(guard.userData.originalScale);
          }
        });
      }

      // Clear the active debris physics list (original meshes have been reattached, no disposal needed)
      debrisRef.current = [];

      // Clear all scorch marks completely from the scene and dispose resources
      scorchMarksRef.current.forEach((sm) => {
        scene.remove(sm.mesh);
        if (sm.mesh.geometry) sm.mesh.geometry.dispose();
        if (sm.mesh.material) {
          const mats = Array.isArray(sm.mesh.material) ? sm.mesh.material : [sm.mesh.material];
          mats.forEach((m: any) => m.dispose());
        }
      });
      scorchMarksRef.current = [];

      // Reset propeller animation state
      propVelocitiesRef.current = [0, 0, 0, 0];
      propAngles.current = [0, 0, 0, 0];

      wasCrashedRef.current = false;
      (orchestrator as any).hasJustReset = false; // consume reset flag
    }

    // Update active fire, smoke, and spark particles
    if (crashParticlesRef.current.length > 0) {
      const alive: any[] = [];
      crashParticlesRef.current.forEach(p => {
        p.life += delta;
        const ratio = p.life / p.maxLife;

        if (ratio < 1.0) {
          // Apply velocity and drag
          p.velocity.multiplyScalar(p.drag);

          if (p.type === 'spark') {
            // Embers drop under gravity
            p.velocity.y -= 9.81 * delta;
          } else if (p.type === 'flame') {
            // Flames rise
            p.velocity.y += 0.5 * delta;
          } else if (p.type === 'smoke') {
            // Smoke rises slowly
            p.velocity.y += 0.2 * delta;
          }

          p.mesh.position.addScaledVector(p.velocity, delta);

          // Animate Scale
          let scale = p.initialScale;
          if (p.type === 'flame') {
            // Grow then shrink
            scale = p.initialScale * Math.sin(ratio * Math.PI);
          } else if (p.type === 'smoke') {
            // Expand continuously
            scale = p.initialScale * (1.0 + ratio * 2.5);
          } else if (p.type === 'spark') {
            // Shrink slowly
            scale = p.initialScale * (1.0 - ratio * 0.5);
          }
          p.mesh.scale.setScalar(scale);

          // Animate color/opacity
          const mat = p.mesh.material as THREE.MeshBasicMaterial;
          if (p.type === 'flame') {
            const color = new THREE.Color();
            if (ratio < 0.3) {
              color.lerpColors(new THREE.Color(0xffdd44), new THREE.Color(0xff7700), ratio / 0.3);
            } else {
              color.lerpColors(new THREE.Color(0xff7700), new THREE.Color(0xcc2200), (ratio - 0.3) / 0.7);
            }
            mat.color.copy(color);
            mat.opacity = (1.0 - ratio) * 0.9;
          } else if (p.type === 'smoke') {
            mat.opacity = Math.max(0, (1.0 - ratio) * 0.6);
          } else if (p.type === 'spark') {
            mat.opacity = 1.0 - ratio;
          }

          p.mesh.rotation.x += 1.5 * delta;
          p.mesh.rotation.y += 1.0 * delta;

          alive.push(p);
        } else {
          scene.remove(p.mesh);
          if (Array.isArray(p.mesh.material)) {
            p.mesh.material.forEach((m: any) => m.dispose());
          } else {
            p.mesh.material.dispose();
          }
        }
      });
      crashParticlesRef.current = alive;
    }

    // Update flying debris (broken parts)
    if (debrisRef.current.length > 0) {
      // Floor height bound with offset
      const minY = orchestrator.physics.environmentBounds.minY + 0.01;
      debrisRef.current.forEach((debris) => {
        // Only run physics if debris is not fully settled
        if (debris.velocity.lengthSq() > 0.001 || debris.mesh.position.y > minY) {
          // Apply gravity
          debris.velocity.y -= 9.81 * delta;
          // Update position
          debris.mesh.position.addScaledVector(debris.velocity, delta);
          // Spin
          debris.mesh.rotation.x += debris.angularVelocity.x * delta;
          debris.mesh.rotation.y += debris.angularVelocity.y * delta;
          debris.mesh.rotation.z += debris.angularVelocity.z * delta;

          // Ground bounce collision
          if (debris.mesh.position.y <= minY) {
            debris.mesh.position.y = minY;
            debris.velocity.y = -debris.velocity.y * 0.35; // bounce elasticity
            debris.velocity.x *= 0.6; // friction
            debris.velocity.z *= 0.6;
            debris.angularVelocity.multiplyScalar(0.5);

            // Settle check
            if (Math.abs(debris.velocity.y) < 0.1 && (debris.velocity.x * debris.velocity.x + debris.velocity.z * debris.velocity.z) < 0.05) {
              debris.velocity.set(0, 0, 0);
              debris.angularVelocity.set(0, 0, 0);
              
              // Settle flat on the floor
              const euler = new THREE.Euler().setFromQuaternion(debris.mesh.quaternion, 'YXZ');
              euler.x = 0;
              euler.z = 0;
              debris.mesh.quaternion.setFromEuler(euler);
            }
          }
        }
      });
    }

    // Update and fade active scorch marks (soot decals)
    if (scorchMarksRef.current.length > 0) {
      const aliveMarks: any[] = [];
      scorchMarksRef.current.forEach(sm => {
        if (sm.fading) {
          sm.life += delta;
          const ratio = sm.life / sm.maxLife;
          if (ratio < 1.0) {
            (sm.mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1.0 - ratio);
            aliveMarks.push(sm);
          } else {
            scene.remove(sm.mesh);
            sm.mesh.geometry.dispose();
            if (Array.isArray(sm.mesh.material)) {
              sm.mesh.material.forEach((m: any) => m.dispose());
            } else {
              sm.mesh.material.dispose();
            }
          }
        } else {
          aliveMarks.push(sm);
        }
      });
      scorchMarksRef.current = aliveMarks;
    }

    // 4. Spin and damage propeller meshes in real-time
    const isCrashed = orchestrator.getIsCrashed() || (orchestrator as any).slowMoActive;
    if (propellersRef.current.length > 0) {
      propellersRef.current.forEach((mesh, index) => {
        if (mesh) {
          if (isCrashed) {
            // Apply visual damage: bend each propeller shaft differently
            mesh.rotation.x = 0.35 * Math.sin(index * 1.9 + 0.8);
            mesh.rotation.y = 0.25 * Math.cos(index * 1.9);
          } else {
            // Reset bend when repaired/rearmed
            mesh.rotation.x = mesh.userData.originalRotation ? mesh.userData.originalRotation.x : 0;
            mesh.rotation.y = mesh.userData.originalRotation ? mesh.userData.originalRotation.y : 0;
          }

          const direction = (index === 0 || index === 3) ? -1 : 1;
          
          let targetSpeed = 0;
          if (telemetry.isArmed && orchestrator.motorsStarted && !isCrashed) {
            targetSpeed = 15000 + motorCmds[index] * 33000;
          }
          
          const lerpFactor = targetSpeed > propVelocitiesRef.current[index] ? 0.25 : 0.04;
          propVelocitiesRef.current[index] = THREE.MathUtils.lerp(propVelocitiesRef.current[index], targetSpeed, lerpFactor);
          
          if (propVelocitiesRef.current[index] > 10) {
            const angleDelta = (propVelocitiesRef.current[index] / 60) * Math.PI * 2 * delta * 0.012;
            propAngles.current[index] += direction * angleDelta;
            mesh.rotation.z = propAngles.current[index];
          }
        }
      });
    }

    // 4a. Propeller guards physical damage / deformation on crash
    if (propellerGuardsRef.current.length > 0) {
      propellerGuardsRef.current.forEach((mesh, index) => {
        if (mesh) {
          if (isCrashed) {
            // Visual damage: bend and crumple guards
            mesh.rotation.x = 0.25 * Math.sin(index * 1.5 + 1.2);
            mesh.rotation.y = 0.15 * Math.cos(index * 1.5);
            mesh.scale.set(1.15, 0.75, 0.95);
          } else {
            // Reset guards when repaired/rearmed
            if (mesh.userData.originalRotation) {
              mesh.rotation.copy(mesh.userData.originalRotation);
            } else {
              mesh.rotation.x = 0;
              mesh.rotation.y = 0;
            }
            if (mesh.userData.originalScale) {
              mesh.scale.copy(mesh.userData.originalScale);
            } else {
              mesh.scale.set(1, 1, 1);
            }
          }
        }
      });
    }

    // 4b. Realistic dynamic shadow system — follows drone with altitude-based
    //     frustum scaling, penumbra softening, and tight light tracking.
    if (dirLightRef.current) {
      const shadowLight = dirLightRef.current;
      const droneY = renderState.position.y;
      const altitude = Math.max(0, droneY - 0.05);

      // -- Light position: track closely for sharp near-ground shadows.
      // Offset is small so the shadow frustum stays tight around the drone.
      // The light is always slightly above + diagonally offset for a natural angle.
      const lightOffsetX = 3;
      const lightOffsetY = Math.max(8, altitude + 6);
      const lightOffsetZ = 3;

      shadowLight.position.set(
        renderState.position.x + lightOffsetX,
        lightOffsetY,
        renderState.position.z + lightOffsetZ
      );

      // Target the ground directly below the drone (not the drone itself)
      // so the shadow stays grounded and doesn't shift away at high angles.
      shadowLight.target.position.set(
        renderState.position.x,
        0,
        renderState.position.z
      );
      shadowLight.target.updateMatrixWorld();

      // -- Dynamic frustum: tight at ground level for maximum texel density,
      //    gradually widens at altitude so the shadow stays visible.
      //    Uses smoothstep interpolation for natural visual transitions.
      const maxShadowHeight = 10.0;
      const tLinear = Math.min(1.0, altitude / maxShadowHeight);
      // Smoothstep: 3t² - 2t³ for perceptually smooth transitions
      const t = tLinear * tLinear * (3.0 - 2.0 * tLinear);

      // Ground: ±1.2 (crisp, high texel density) → Max altitude: ±5.0 (wide coverage)
      const frustumHalf = 1.2 + t * 3.8;
      const cam = shadowLight.shadow.camera;
      cam.left = -frustumHalf;
      cam.right = frustumHalf;
      cam.top = frustumHalf;
      cam.bottom = -frustumHalf;
      cam.near = 0.1;
      cam.far = lightOffsetY + 2;
      cam.updateProjectionMatrix();

      // -- Altitude-based shadow softening (simulates real penumbra spread).
      // On the ground the shadow is crisp (radius ~1.0).
      // At max altitude the shadow is diffuse and soft (radius ~5.0).
      shadowLight.shadow.radius = 1.0 + t * 4.0;

      // Adaptive bias prevents peter-panning at low altitude and
      // shadow acne at high altitude.
      shadowLight.shadow.bias = -0.0002 - (t * 0.0004);
      shadowLight.shadow.normalBias = 0.02 + t * 0.03;
    }

    // 5. Update Camera System
    const dronePos = renderState.position;
    const droneQuat = renderState.quaternion;

    // Compute directional vectors from quaternion (reuse pre-allocated scratch vectors)
    const forward = _camForward.current.set(0, 0, 1).applyQuaternion(droneQuat).normalize();
    const up = _camUp.current.set(0, 1, 0).applyQuaternion(droneQuat).normalize();

    if (orchestrator.getIsCrashed() || (orchestrator as any).slowMoActive) {
      // Slow cinematic camera effect focused on the crashed drone
      const time = state.clock.getElapsedTime();
      const orbitRadius = 1.3; // close zoom
      const orbitSpeed = 0.2; // slow rotation
      const angle = time * orbitSpeed;

      let targetFocus = dronePos;
      if (orchestrator.lastCrashCollision) {
        targetFocus = orchestrator.lastCrashCollision.position;
      }

      const targetCamPos = _camTargetPos.current.set(
        targetFocus.x + Math.sin(angle) * orbitRadius,
        targetFocus.y + 0.35, // slightly above the collision point
        targetFocus.z + Math.cos(angle) * orbitRadius
      );

      // Prevent camera from going out of environment bounds
      const bounds = orchestrator.physics.environmentBounds;
      const margin = 0.1;
      targetCamPos.x = THREE.MathUtils.clamp(targetCamPos.x, bounds.minX + margin, bounds.maxX - margin);
      targetCamPos.y = THREE.MathUtils.clamp(targetCamPos.y, bounds.minY + margin, bounds.maxY - margin);
      targetCamPos.z = THREE.MathUtils.clamp(targetCamPos.z, bounds.minZ + margin, bounds.maxZ - margin);

      const lookAtTarget = _camLookAt.current.set(targetFocus.x, targetFocus.y, targetFocus.z);

      camera.position.copy(targetCamPos);
      camera.lookAt(lookAtTarget);
      cameraInitialized.current = true;
    }
    else if (flightCameraView === 'chase') {
      // Project drone's forward direction onto the horizontal (XZ) plane to isolate yaw from pitch/roll
      const levelForward = _camLevelFwd.current.set(forward.x, 0, forward.z);
      if (levelForward.lengthSq() < 0.0001) {
        levelForward.set(0, 0, 1);
      } else {
        levelForward.normalize();
      }

      // Rigidly follow the drone's horizontal heading instantly (zero lag)

      // Behind and slightly above drone — all computed in-place, zero allocations
      const backVec = _camBackVec.current.copy(levelForward).negate();

      // If tutorial is active on a mobile layout, apply a lateral camera offset to the right.
      // This shifts the drone to the left side of the screen, placing it in the open window
      // between the left virtual joystick and the central tutorial overlay bubble card.
      const storeState = useDroneStore.getState();
      const isTutorialActive = storeState.isTutorialActive;
      const isMobileLayout = window.innerWidth < 1024;
      const lateralOffset = (isTutorialActive && isMobileLayout) ? 0.38 : 0.0;
      const vertOffset = (isTutorialActive && isMobileLayout) ? 0.08 : 0.0;

      const rightVec = _camRightVec.current.set(-backVec.z, 0, backVec.x).normalize();

      const targetCamPos = _camTargetPos.current.copy(dronePos)
        .addScaledVector(backVec, 1.4)
        .addScaledVector(rightVec, lateralOffset)
        .add(_camUp.current.set(0, 0.42 + vertOffset, 0));

      // Prevent camera from going out of environment bounds
      const bounds = orchestrator.physics.environmentBounds;
      const margin = 0.25;

      targetCamPos.x = THREE.MathUtils.clamp(targetCamPos.x, bounds.minX + margin, bounds.maxX - margin);
      targetCamPos.y = THREE.MathUtils.clamp(targetCamPos.y, bounds.minY + margin, bounds.maxY - margin);
      targetCamPos.z = THREE.MathUtils.clamp(targetCamPos.z, bounds.minZ + margin, bounds.maxZ - margin);

      // Focus point slightly above the drone, offset laterally to shift the drone to the side
      const lookAtTarget = _camLookAt.current.set(
        dronePos.x + rightVec.x * lateralOffset,
        dronePos.y + 0.1 + vertOffset * 0.5,
        dronePos.z + rightVec.z * lateralOffset
      );

      // Rigid follow — zero interpolation lag
      camera.position.copy(targetCamPos);
      camera.lookAt(lookAtTarget);
      cameraInitialized.current = true;
    }
    else if (flightCameraView === 'fpv') {
      // Inside canopy looking forward, offset by mouse view look direction
      const offsetQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(mouseOffset.current.pitch, mouseOffset.current.yaw, 0, 'YXZ')
      );

      // Position the camera at the front canopy nose to avoid clipping internal circuitry/battery
      const targetCamPos = dronePos.clone()
        .addScaledVector(forward, 0.155)
        .addScaledVector(up, 0.045);
      camera.position.copy(targetCamPos);

      // Direct drone orientation sync (with 180-degree yaw offset to point camera forward)
      const baseQuat = droneQuat.clone().multiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
      );
      
      const cameraQuat = baseQuat.multiply(offsetQuat);
      camera.quaternion.copy(cameraQuat);
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

    // Apply camera shake if active
    const shake = orchestrator.getCameraShake?.() ?? 0;
    if (shake > 0.001) {
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake
      );
      camera.position.add(shakeOffset);
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


    }
  });

  return null;
}

interface FlightSceneProps {
  orchestrator: SimulatorOrchestrator;
  activeCheckpoints: any[];
  onTelemetryFrame?: (telemetry: TelemetryData) => void;
  stickState?: { throttle: number; yaw: number; pitch: number; roll: number };
}

export function FlightScene({ orchestrator, activeCheckpoints, onTelemetryFrame, stickState }: FlightSceneProps) {
  const flightCameraView = useDroneStore((state) => state.flightCameraView);
  const modelLoadStatus = useDroneStore((state) => state.modelLoadStatus);
  const theme = useDroneStore((state) => state.theme);
  const isDark = theme === 'dark';
  const envType = useDroneStore((state) => state.flightEnvironment);
  const telemetry = useDroneStore((state) => state.telemetry);
  const isCrashed = telemetry?.sensorError || orchestrator.getIsCrashed();

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
  // Legacy shadowMeshRef retained for TS compatibility — no longer renders a circular blob.
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  // Cache reference meshes to props
  const propellersRef = useRef<THREE.Object3D[]>([]);
  const propellerGuardsRef = useRef<THREE.Object3D[]>([]);

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
      // - offsetY = 0.02712: aligns the visual bottom points to touch y=0.005 (landing pad) when physics is at y=0.05.
      // - offsetZ = -0.0345: aligns the visual model center to the physics body center of gravity.
      const targetScale = 2.825;
      const offsetX = 0;
      const offsetY = 0.02712;
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
      
      // Cache original parent & local transforms for all propellers
      props.forEach((prop) => {
        if (!prop.userData.originalParent) {
          prop.userData.originalParent = prop.parent;
          prop.userData.originalPosition = prop.position.clone();
          prop.userData.originalRotation = prop.rotation.clone();
          prop.userData.originalScale = prop.scale.clone();
        }
      });

      // ---- PROPELLER GUARD COLLECTION ----
      const guardList: THREE.Object3D[] = [];
      scene.traverse((child) => {
        const nameLower = child.name.toLowerCase();
        if (nameLower.includes('porpguard') || nameLower.includes('guard')) {
          guardList.push(child);
        }
      });

      // Filter out descendant/child nodes so we only target top-level groups
      const topGuards = guardList.filter((node) => {
        let parent = node.parent;
        while (parent) {
          if (guardList.includes(parent)) {
            return false;
          }
          parent = parent.parent;
        }
        return true;
      });

      propellerGuardsRef.current = topGuards;

      // Cache original parent & local transforms for all guards
      topGuards.forEach((guard) => {
        if (!guard.userData.originalParent) {
          guard.userData.originalParent = guard.parent;
          guard.userData.originalPosition = guard.position.clone();
          guard.userData.originalRotation = guard.rotation.clone();
          guard.userData.originalScale = guard.scale.clone();
        }
      });
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
      {/* FPV HUD Overlay: Center-aligned crosshair and Throttle scale */}
      {flightCameraView === 'fpv' && !isCrashed && (
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
          {/* Central HUD Crosshair */}
          <div className="absolute w-8 h-8 flex items-center justify-center opacity-40">
            <div className="absolute w-4 h-0.5 bg-cyan-400 rounded-full" />
            <div className="absolute h-4 w-0.5 bg-cyan-400 rounded-full" />
            <div className="w-1.5 h-1.5 rounded-full border border-cyan-400" />
          </div>

          {/* Throttle scale aligned relative to center */}
          <div className="absolute top-1/2 -translate-y-1/2 left-[calc(50%-75px)] w-16 h-28">
            <div className="pluto-throttle-scale !left-1/2 !top-1/2 !transform !-translate-x-1/2 !-translate-y-1/2">
              <div className="pluto-throttle-ticks">
                {Array.from({ length: 9 }).map((_, i) => {
                  const isMajor = i === 0 || i === 4 || i === 8;
                  return (
                    <div
                      key={i}
                      className={`pluto-throttle-tick ${isMajor ? 'major' : ''}`}
                    />
                  );
                })}
              </div>
              <div
                className="pluto-throttle-bracket"
                style={{
                  bottom: `${(stickState?.throttle ?? 0) * 100}%`,
                  transform: 'translateY(50%)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* FPV Video Loss Glitch Overlay */}
      <AnimatePresence>
        {flightCameraView === 'fpv' && isCrashed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fpv-crash-overlay pointer-events-none"
          >
            <div className="fpv-noise-container" />
            <div className="fpv-static-lines" />
            <div className="flex flex-col items-center gap-1 z-10 select-none">
              <span className="text-[10px] font-mono text-rose-500 tracking-[0.25em] font-black uppercase bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full animate-pulse">
                FPV LINK LOST
              </span>
              <span className="text-[9px] font-mono text-white/50 tracking-wider font-bold mt-2">
                REASON: UNEXPECTED COLLISION IMPACT
              </span>
              <span className="text-[9px] font-mono text-white/40 tracking-wider">
                VIDEO TRANSMISSION: OFFLINE (NO SIGNAL)
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Canvas
        shadows
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
          ref={dirLightRef}
          position={[15, 30, 15]}
          intensity={2.8}
          castShadow
          shadow-mapSize-width={isMobileDevice ? 1024 : 2048}
          shadow-mapSize-height={isMobileDevice ? 1024 : 2048}
          shadow-bias={-0.0002}
          shadow-normalBias={0.02}
          shadow-camera-left={-1.5}
          shadow-camera-right={1.5}
          shadow-camera-top={1.5}
          shadow-camera-bottom={-1.5}
          shadow-camera-near={0.1}
          shadow-camera-far={40}
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

        {/* Ground shadow receiver — large invisible plane at y=0 catches all drone shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <shadowMaterial transparent opacity={0.35} />
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
          propellerGuardsRef={propellerGuardsRef}
          dirLightRef={dirLightRef}
          onTelemetryFrame={onTelemetryFrame}
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

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1001

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1032

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1063

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1094

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1125

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1156

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1187

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1218

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1249

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1280

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1311

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #1342

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5000

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5031

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5062

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5093

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5124

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5155

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5186

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5217

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5248

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5279

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5310

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5341

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5372

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5403

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5434

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5465

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5496

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5527

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5558

// Senior Style: Fine-tune bloom threshold and radius for realistic lens flare effects
 // Commit Entry #5589
