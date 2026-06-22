/**
 * Temporary debug component — mount inside Canvas to dump all node names
 * from the Pluto Blast View GLB to the browser console.
 */
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useEffect } from 'react';

export function DebugNodes() {
  const { scene } = useGLTF('/models/Pluto Blast View.glb');

  useEffect(() => {
    const nodes: { name: string; type: string; isMesh: boolean; depth: number }[] = [];
    function walk(obj: THREE.Object3D, depth = 0) {
      nodes.push({
        name: obj.name,
        type: obj.type,
        isMesh: obj instanceof THREE.Mesh,
        depth,
      });
      obj.children.forEach((c) => walk(c, depth + 1));
    }
    walk(scene);
    
    console.log('=== PLUTO BLAST VIEW — ALL NODES ===');
    console.log(`Total nodes: ${nodes.length}`);
    
    // Print unique named nodes only
    const named = nodes.filter(n => n.name && n.name.length > 0);
    console.log(`Named nodes: ${named.length}`);
    named.forEach(n => {
      console.log(`${'  '.repeat(n.depth)}[${n.type}${n.isMesh ? ' MESH' : ''}] "${n.name}"`);
    });

    // Also group mesh names for quick scanning
    const meshNames = nodes.filter(n => n.isMesh && n.name).map(n => n.name);
    console.log('\n=== MESH NAMES ONLY ===');
    meshNames.forEach(n => console.log(`  "${n}"`));

    // Non-mesh group/object names
    const groupNames = nodes.filter(n => !n.isMesh && n.name).map(n => n.name);
    console.log('\n=== GROUP / OBJECT NAMES ===');
    groupNames.forEach(n => console.log(`  "${n}"`));
  }, [scene]);

  return null;
}
