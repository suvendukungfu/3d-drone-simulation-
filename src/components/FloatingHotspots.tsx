import { Html } from '@react-three/drei';
import { useDroneStore } from '../store/useDroneStore';
import { droneComponents } from '../data/droneComponents';
import { motion } from 'framer-motion';
import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { getComponentIdByMeshName, getCornerIndex } from './PlutoXModel';

const SEARCH_ID_MAP: Record<string, string> = {
  accelerometer: 'imuSensor',
  magnetometer: 'flightController',
};

export function FloatingHotspots() {
  const hoveredComponent = useDroneStore((state) => state.hoveredComponent);
  const selectedComponent = useDroneStore((state) => state.selectedComponent);
  const currentMode = useDroneStore((state) => state.currentMode);
  
  const activeId = hoveredComponent || (currentMode !== 'learning' ? selectedComponent : null);
  const componentData = activeId ? droneComponents[activeId] : null;

  const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const targetObjects = useRef<THREE.Mesh[]>([]);

  // Update target objects based on activeId
  const updateTargetObjects = () => {
    if (!activeId) {
      targetObjects.current = [];
      return;
    }
    
    const searchId = SEARCH_ID_MAP[activeId] || activeId;
    const temp: THREE.Mesh[] = [];
    
    // Ensure world matrices are computed before reading positions
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
          componentId = `motor${matchedCorner}`;
        } else if (componentId === 'propeller') {
          componentId = (matchedCorner === 1 || matchedCorner === 4) ? 'propellerA' : 'propellerB';
        }

        if (componentId === searchId) {
          temp.push(child);
        }
      }
    });
    
    targetObjects.current = temp;
  };

  // Re-cache matching meshes when the active component changes
  useMemo(() => {
    updateTargetObjects();
  }, [activeId, scene]);

  useFrame(() => {
    if (!groupRef.current || !componentData) return;

    // Self-healing check: if meshes are not yet cached, attempt retrieval
    if (activeId && targetObjects.current.length === 0) {
      updateTargetObjects();
    }

    const avgPos = new THREE.Vector3();
    let hasValidMesh = false;

    if (targetObjects.current.length > 0) {
      const box = new THREE.Box3();
      targetObjects.current.forEach((obj) => {
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
        avgPos.set(
          (box.min.x + box.max.x) / 2,
          box.max.y + 0.18, // Float exactly 18cm above the highest mesh boundary in world coordinates
          (box.min.z + box.max.z) / 2
        );

        // Apply visual offset separation for sub-sensors sharing reference meshes
        if (activeId === 'accelerometer') {
          avgPos.x += 0.12;
          avgPos.z += 0.08;
        } else if (activeId === 'magnetometer') {
          avgPos.x += 0.12;
          avgPos.z -= 0.12;
        }
      }
    }

    // Fallback if no meshes are present
    if (!hasValidMesh) {
      const [hx, hy, hz] = componentData.hotspotPosition;
      avgPos.set(hx * 18.0, hy * 18.0 - 0.5, hz * 18.0);
    }

    // Transform world position to parent's local space to handle nested <Center> translations cleanly
    if (groupRef.current.parent) {
      groupRef.current.parent.worldToLocal(avgPos);
    }
    groupRef.current.position.copy(avgPos);
  });

  if (!componentData) return null;

  return (
    <group ref={groupRef}>
      <Html distanceFactor={4} center>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 bg-slate-950/90 backdrop-blur-md border border-blue-500/40 px-3.5 py-2 rounded-lg pointer-events-none whitespace-nowrap shadow-[0_0_15px_rgba(0,163,255,0.25)]"
        >
          {/* Glowing dot indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>

          <div className="flex flex-col">
            <span className="text-[9px] text-blue-400 font-mono tracking-widest uppercase leading-none mb-0.5">
              Target Component
            </span>
            <span className="text-xs font-bold text-white uppercase tracking-wide">
              {componentData.name}
            </span>
          </div>
        </motion.div>
      </Html>
    </group>
  );
}
