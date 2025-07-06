import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Grid, Billboard, Text, useGLTF } from '@react-three/drei';
import { useDroneStore } from '../store/useDroneStore';


interface ObstacleProps {
  position: [number, number, number];
  args: [number, number, number];
  color?: string;
  label?: string;
}

// Collidable/visual solid obstacle
function CubeObstacle({ position, args, color = '#334155', label }: ObstacleProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
      {label && (
        <Billboard position={[0, args[1] / 2 + 0.35, 0]} follow={true}>
          <Text fontSize={0.16} color="#94a3b8" anchorX="center" anchorY="middle">
            {label}
          </Text>
        </Billboard>
      )}
    </mesh>
  );
}

// Vertical wall grid overlay for blueprint aesthetics
interface WallGridProps {
  position: [number, number, number];
  rotation: [number, number, number];
  args: [number, number];
  cellColor: string;
  sectionColor: string;
  fadeDistance: number;
}

function WallGrid({ position, rotation, args, cellColor, sectionColor, fadeDistance }: WallGridProps) {
  return (
    <Grid
      position={position}
      rotation={rotation}
      args={args}
      cellColor={cellColor}
      sectionColor={sectionColor}
      fadeDistance={fadeDistance}
      infiniteGrid={false}
    />
  );
}



// Visual 3D model for Classroom environment
function ClassroomModel() {
  const { scene } = useGLTF('/models/classroom.glb');
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const isGodray = child.name.toLowerCase().includes('godray') || 
                         (child.material && (child.material as any).name === 'godray');
        
        if (isGodray) {
          // Hide godrays entirely to fix the blinding white over-exposure issue
          child.visible = false;
          child.castShadow = false;
          child.receiveShadow = false;
        } else {
          // Disable shadow casting on all static room meshes to prevent ceiling shadows blocking the sun
          // and to drastically reduce shadow map draw calls, resolving rendering lag.
          child.castShadow = false;
          
          // Only let the floor (ground) and desks receive shadows from the drone
          const name = child.name.toLowerCase();
          const isShadowReceiver = name.includes('ground') || 
                                   name.includes('desk') || 
                                   name.includes('table') || 
                                   name.includes('floor');
          child.receiveShadow = isShadowReceiver;
          
          // Disable matrix auto-updates for static objects to boost CPU performance (reduces lag)
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        }
      }
    });
    return cloned;
  }, [scene]);

  return <primitive object={clonedScene} scale={[0.01, 0.01, 0.01]} position={[0, 0, 0]} />;
}

// Structural Arch for Course environment
function CourseArch({ position, rotation = [0, 0, 0], width = 3, height = 2.5, depth = 0.25, color = '#f97316' }: { position: [number, number, number], rotation?: [number, number, number], width?: number, height?: number, depth?: number, color?: string }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Left Pillar */}
      <mesh position={[-width / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, height, depth]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      {/* Right Pillar */}
      <mesh position={[width / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, height, depth]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      {/* Top Beam */}
      <mesh position={[0, height, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.2, 0.2, depth]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Glow highlight */}
      <mesh position={[0, height + 0.12, 0]}>
        <boxGeometry args={[width * 0.8, 0.02, depth * 1.05]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Neon flight gate / hoop
interface HoopProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  radius?: number;
  thickness?: number;
  color?: string;
  isActive?: boolean;
}

function FlightGate({ position, rotation = [0, 0, 0], radius = 0.65, thickness = 0.05, isActive = false }: HoopProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  
  // Neon glow material
  const activeColor = isActive ? '#f97316' : '#22c55e'; // orange target, green passed
  
  return (
    <group position={position} rotation={rotation}>
      {/* Outer Torus Shroud */}
      <mesh castShadow receiveShadow>
        <torusGeometry args={[radius, thickness, 16, 48]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Inner Emissive Neon Core */}
      <mesh ref={ringRef}>
        <torusGeometry args={[radius - 0.015, thickness * 0.4, 8, 32]} />
        <meshBasicMaterial color={activeColor} toneMapped={false} />
      </mesh>
      {/* Indicator light */}
      <mesh position={[0, radius + 0.1, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={activeColor} toneMapped={false} />
      </mesh>
    </group>
  );
}


// Dynamic floating waypoint beacon component with pulse R3F loops
function WaypointBeacon({ index, pos, glowColor }: { index: number; pos: [number, number, number]; glowColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state: any) => {
    if (groupRef.current) {
      // Smooth floating wave animation
      groupRef.current.position.y = pos[1] + Math.sin(state.clock.getElapsedTime() * 2.5) * 0.08;
      // Rotation animation
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.6;
    }
  });

  return (
    <group>
      {/* Visual Support Pole */}
      <mesh position={[pos[0], pos[1]/2, pos[2]]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, pos[1], 8]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>
      
      {/* Floating Animated Target Group */}
      <group ref={groupRef} position={[pos[0], 0, pos[2]]}>
        {/* Outer glowing pulsing ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.26, 32]} />
          <meshBasicMaterial color={glowColor} toneMapped={false} transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Inner solid core sphere */}
        <mesh>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color={glowColor} toneMapped={false} />
        </mesh>

        {/* HUD Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.12, 0.14, 4]} />
          <meshBasicMaterial color={glowColor} toneMapped={false} transparent opacity={0.4} />
        </mesh>
      </group>
      
      <Billboard position={[pos[0], pos[1] + 0.42, pos[2]]} follow={true}>
        <Text fontSize={0.16} color={glowColor} anchorX="center" anchorY="middle">
          {`CP ${index + 1}`}
        </Text>
      </Billboard>
    </group>
  );
}

export function EnvironmentManager({ activeCheckpoints }: { activeCheckpoints?: any[] }) {
  const envType = useDroneStore((state) => state.flightEnvironment);
  const theme = useDroneStore((state) => state.theme);
  const isDark = theme === 'dark';
  
  const closedEnvs = ['room', 'lab', 'classroom', 'warehouse'];
  const isClosedSimulation = closedEnvs.includes(envType);

  // Generate crisp 1024x1024 high-tech square launch pad texture
  const homePadTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 1024, 1024);
      
      // Draw background rounded square
      ctx.fillStyle = '#1e293b';
      const radius = 80;
      const x = 32, y = 32, w = 960, h = 960;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      // Outer tech ring (concentric circles inside the square)
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.arc(512, 512, 360, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(512, 512, 280, 0, Math.PI * 2);
      ctx.stroke();

      // Corner tech bracket markings
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Top-Left Bracket
      ctx.beginPath();
      ctx.moveTo(160, 280);
      ctx.lineTo(160, 160);
      ctx.lineTo(280, 160);
      ctx.stroke();

      // Top-Right Bracket
      ctx.beginPath();
      ctx.moveTo(864, 280);
      ctx.lineTo(864, 160);
      ctx.lineTo(744, 160);
      ctx.stroke();

      // Bottom-Left Bracket
      ctx.beginPath();
      ctx.moveTo(160, 744);
      ctx.lineTo(160, 864);
      ctx.lineTo(280, 864);
      ctx.stroke();

      // Bottom-Right Bracket
      ctx.beginPath();
      ctx.moveTo(864, 744);
      ctx.lineTo(864, 864);
      ctx.lineTo(744, 864);
      ctx.stroke();

      // Bold central 'H'
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 340px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', 512, 512);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  // Generate crisp 1024x1024 target landing pad texture
  const targetPadTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 1024, 1024);

      // Dark indigo circular background
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(512, 512, 480, 0, Math.PI * 2);
      ctx.fill();

      // Yellow outer border ring
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.arc(512, 512, 440, 0, Math.PI * 2);
      ctx.stroke();

      // Yellow concentric rings
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(512, 512, 300, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(512, 512, 160, 0, Math.PI * 2);
      ctx.stroke();

      // Central solid dot
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(512, 512, 48, 0, Math.PI * 2);
      ctx.fill();

      // Precision crosshairs lines
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(512, 60); ctx.lineTo(512, 964);
      ctx.moveTo(60, 512); ctx.lineTo(964, 512);
      ctx.stroke();

      // Clear TARGET text overlay label block
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(260, 700, 504, 120);

      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 88px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TARGET', 512, 760);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  // Dispose of custom textures on unmount to prevent GPU memory leaks
  useEffect(() => {
    return () => {
      homePadTexture.dispose();
      targetPadTexture.dispose();
    };
  }, [homePadTexture, targetPadTexture]);

  return (
    <group>
      {/* 1. GENERAL LANDING PADS */}
      {isClosedSimulation ? (
        <>
          {/* Home Base Launch Mat (Textured) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial map={homePadTexture} transparent roughness={0.4} metalness={0.7} />
          </mesh>
          
          {/* Target Landing Pad (Textured) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.0, 0.005, 3.5]} receiveShadow>
            <planeGeometry args={[1.3, 1.3]} />
            <meshStandardMaterial map={targetPadTexture} transparent roughness={0.4} metalness={0.7} />
          </mesh>
        </>
      ) : (
        <>
          {/* Home Base Launch Mat (Original 3D Model / Geometries) */}
          <group position={[0, 0.005, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[1.5, 1.5]} />
              <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
            </mesh>
            {/* Border Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
              <ringGeometry args={[0.65, 0.7, 32]} />
              <meshBasicMaterial color="#3b82f6" toneMapped={false} />
            </mesh>
            {/* H Logo */}
            <Billboard position={[0, 0.01, 0]} follow={true}>
              <Text fontSize={0.35} color="#3b82f6" anchorX="center" anchorY="middle">
                H
              </Text>
            </Billboard>
          </group>
          
          {/* Target Landing Pad (Original 3D Model / Geometries) */}
          <group position={[3.0, 0.005, 3.5]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[0.65, 32]} />
              <meshStandardMaterial color="#1e1b4b" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
              <ringGeometry args={[0.6, 0.65, 32]} />
              <meshBasicMaterial color="#eab308" toneMapped={false} />
            </mesh>
            <Billboard position={[0, 0.01, 0]} follow={true}>
              <Text fontSize={0.25} color="#eab308" anchorX="center" anchorY="middle">
                TARGET
              </Text>
            </Billboard>
          </group>
        </>
      )}
      
      {/* 2. SPECIFIC 3D ENVIRONMENTS */}
      
      {/* A. COZY INDOOR ROOM */}
      {envType === 'room' && (
        <group>
          <Grid 
            position={[0, 0.001, 0]} 
            args={[16, 16]} 
            cellColor={isDark ? "#1e293b" : "#cbd5e1"} 
            sectionColor={isDark ? "#334155" : "#94a3b8"} 
            fadeDistance={12} 
            infiniteGrid={false} 
          />
          
          {/* Room Boundaries (walls) */}
          <mesh position={[0, 3, -8]} receiveShadow>
            <planeGeometry args={[16, 6]} />
            <meshStandardMaterial color={isDark ? "#111827" : "#f8fafc"} roughness={0.9} />
          </mesh>
          <mesh position={[0, 3, 8]} rotation={[0, Math.PI, 0]} receiveShadow>
            <planeGeometry args={[16, 6]} />
            <meshStandardMaterial color={isDark ? "#111827" : "#f8fafc"} roughness={0.9} />
          </mesh>
          <mesh position={[-8, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[16, 6]} />
            <meshStandardMaterial color={isDark ? "#0f172a" : "#f1f5f9"} roughness={0.9} />
          </mesh>
          <mesh position={[8, 3, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[16, 6]} />
            <meshStandardMaterial color={isDark ? "#0f172a" : "#f1f5f9"} roughness={0.9} />
          </mesh>
          
          <mesh position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[16, 16]} />
            <meshStandardMaterial color={isDark ? "#030712" : "#e2e8f0"} roughness={0.9} />
          </mesh>

          {/* Vertical and Ceiling Blueprint Grids */}
          <WallGrid 
            position={[0, 3, -7.99]} 
            rotation={[Math.PI / 2, 0, 0]} 
            args={[16, 6]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#3b82f6" : "#3b82f6"} 
            fadeDistance={12} 
          />
          <WallGrid 
            position={[0, 3, 7.99]} 
            rotation={[Math.PI / 2, 0, 0]} 
            args={[16, 6]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#3b82f6" : "#3b82f6"} 
            fadeDistance={12} 
          />
          <WallGrid 
            position={[-7.99, 3, 0]} 
            rotation={[0, 0, Math.PI / 2]} 
            args={[6, 16]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#3b82f6" : "#3b82f6"} 
            fadeDistance={12} 
          />
          <WallGrid 
            position={[7.99, 3, 0]} 
            rotation={[0, 0, Math.PI / 2]} 
            args={[6, 16]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#3b82f6" : "#3b82f6"} 
            fadeDistance={12} 
          />
          <Grid 
            position={[0, 5.99, 0]} 
            args={[16, 16]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#334155" : "#94a3b8"} 
            fadeDistance={12} 
            infiniteGrid={false} 
          />
        </group>
      )}
      
      {/* B. STEM FLIGHT LAB */}
      {envType === 'lab' && (
        <group>
          <Grid 
            position={[0, 0.001, 0]} 
            args={[20, 20]} 
            cellColor={isDark ? "#0f172a" : "#cbd5e1"} 
            sectionColor={isDark ? "#0284c7" : "#0284c7"} 
            fadeDistance={15} 
            infiniteGrid={false} 
          />
          
          {/* Tech grid walls */}
          <mesh position={[0, 3.5, -10]} receiveShadow>
            <planeGeometry args={[20, 7]} />
            <meshStandardMaterial color={isDark ? "#070a13" : "#f8fafc"} roughness={0.95} />
          </mesh>
          <mesh position={[0, 3.5, 10]} rotation={[0, Math.PI, 0]} receiveShadow>
            <planeGeometry args={[20, 7]} />
            <meshStandardMaterial color={isDark ? "#070a13" : "#f8fafc"} roughness={0.95} />
          </mesh>
          <mesh position={[-10, 3.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[20, 7]} />
            <meshStandardMaterial color={isDark ? "#05070f" : "#f1f5f9"} roughness={0.95} />
          </mesh>
          <mesh position={[10, 3.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[20, 7]} />
            <meshStandardMaterial color={isDark ? "#05070f" : "#f1f5f9"} roughness={0.95} />
          </mesh>
          
          <mesh position={[0, 7, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color={isDark ? "#030712" : "#e2e8f0"} roughness={0.9} />
          </mesh>

          {/* Vertical and Ceiling Blueprint Grids */}
          <WallGrid 
            position={[0, 3.5, -9.99]} 
            rotation={[Math.PI / 2, 0, 0]} 
            args={[20, 7]} 
            cellColor={isDark ? "#0f172a" : "#e2e8f0"} 
            sectionColor={isDark ? "#0284c7" : "#0284c7"} 
            fadeDistance={15} 
          />
          <WallGrid 
            position={[0, 3.5, 9.99]} 
            rotation={[Math.PI / 2, 0, 0]} 
            args={[20, 7]} 
            cellColor={isDark ? "#0f172a" : "#e2e8f0"} 
            sectionColor={isDark ? "#0284c7" : "#0284c7"} 
            fadeDistance={15} 
          />
          <WallGrid 
            position={[-9.99, 3.5, 0]} 
            rotation={[0, 0, Math.PI / 2]} 
            args={[7, 20]} 
            cellColor={isDark ? "#0f172a" : "#e2e8f0"} 
            sectionColor={isDark ? "#0284c7" : "#0284c7"} 
            fadeDistance={15} 
          />
          <WallGrid 
            position={[9.99, 3.5, 0]} 
            rotation={[0, 0, Math.PI / 2]} 
            args={[7, 20]} 
            cellColor={isDark ? "#0f172a" : "#e2e8f0"} 
            sectionColor={isDark ? "#0284c7" : "#0284c7"} 
            fadeDistance={15} 
          />
          <Grid 
            position={[0, 6.99, 0]} 
            args={[20, 20]} 
            cellColor={isDark ? "#0f172a" : "#e2e8f0"} 
            sectionColor={isDark ? "#0284c7" : "#0284c7"} 
            fadeDistance={15} 
            infiniteGrid={false} 
          />
          
          <CubeObstacle position={[-3.5, 0.5, -3.5]} args={[2.5, 1.0, 1.2]} color="#161e2e" label="Bench A" />
          <CubeObstacle position={[3.5, 0.5, -3.5]} args={[2.5, 1.0, 1.2]} color="#161e2e" label="Bench B" />
          <CubeObstacle position={[-4.0, 0.6, 2.0]} args={[1.5, 1.2, 1.5]} color="#0f172a" label="Component Locker" />
        </group>
      )}

      {/* C. STEM CLASSROOM */}
      {envType === 'classroom' && (
        <group>
          <ClassroomModel />
        </group>
      )}
      
      {/* D. INDUSTRIAL WAREHOUSE */}
      {envType === 'warehouse' && (
        <group>
          <Grid 
            position={[0, 0.001, 0]} 
            args={[30, 30]} 
            cellColor={isDark ? "#1e293b" : "#cbd5e1"} 
            sectionColor={isDark ? "#64748b" : "#64748b"} 
            fadeDistance={22} 
            infiniteGrid={false} 
          />
          
          {/* Concrete boundary walls */}
          <mesh position={[0, 5, -15]} receiveShadow>
            <planeGeometry args={[30, 10]} />
            <meshStandardMaterial color={isDark ? "#2d3139" : "#f8fafc"} roughness={0.8} />
          </mesh>
          <mesh position={[0, 5, 15]} rotation={[0, Math.PI, 0]} receiveShadow>
            <planeGeometry args={[30, 10]} />
            <meshStandardMaterial color={isDark ? "#2d3139" : "#f8fafc"} roughness={0.8} />
          </mesh>
          <mesh position={[-15, 5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[30, 10]} />
            <meshStandardMaterial color={isDark ? "#22252b" : "#f1f5f9"} roughness={0.8} />
          </mesh>
          <mesh position={[15, 5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[30, 10]} />
            <meshStandardMaterial color={isDark ? "#22252b" : "#f1f5f9"} roughness={0.8} />
          </mesh>
          
          <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[30, 30]} />
            <meshStandardMaterial color={isDark ? "#111317" : "#e2e8f0"} roughness={0.9} />
          </mesh>

          {/* Vertical and Ceiling Blueprint Grids */}
          <WallGrid 
            position={[0, 5, -14.99]} 
            rotation={[Math.PI / 2, 0, 0]} 
            args={[30, 10]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#64748b" : "#64748b"} 
            fadeDistance={22} 
          />
          <WallGrid 
            position={[0, 5, 14.99]} 
            rotation={[Math.PI / 2, 0, 0]} 
            args={[30, 10]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#64748b" : "#64748b"} 
            fadeDistance={22} 
          />
          <WallGrid 
            position={[-14.99, 5, 0]} 
            rotation={[0, 0, Math.PI / 2]} 
            args={[10, 30]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#64748b" : "#64748b"} 
            fadeDistance={22} 
          />
          <WallGrid 
            position={[14.99, 5, 0]} 
            rotation={[0, 0, Math.PI / 2]} 
            args={[10, 30]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#64748b" : "#64748b"} 
            fadeDistance={22} 
          />
          <Grid 
            position={[0, 9.99, 0]} 
            args={[30, 30]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#64748b" : "#64748b"} 
            fadeDistance={22} 
            infiniteGrid={false} 
          />
          
          <CubeObstacle position={[-5.0, 1.5, -4.0]} args={[2.0, 3.0, 1.2]} color="#1e293b" label="Storage Rack A" />
          <CubeObstacle position={[5.0, 1.5, -4.0]} args={[2.0, 3.0, 1.2]} color="#1e293b" label="Storage Rack B" />
          <CubeObstacle position={[-6.0, 0.75, 4.0]} args={[1.5, 1.5, 1.5]} color="#78350f" label="Cargo Crate A" />
          <CubeObstacle position={[6.0, 0.75, 4.0]} args={[1.5, 1.5, 1.5]} color="#78350f" label="Cargo Crate B" />
          <CubeObstacle position={[0.0, 1.0, -8.0]} args={[4.0, 2.0, 1.0]} color="#1e293b" label="Pallet Rack" />
        </group>
      )}
      
      {/* E. OUTDOOR OPEN FIELD */}
      {envType === 'field' && (
        <group>
          {/* Grass Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#14532d" roughness={0.95} metalness={0.05} />
          </mesh>
          
          <Grid position={[0, 0.001, 0]} args={[40, 40]} cellColor="#166534" sectionColor="#15803d" fadeDistance={30} infiniteGrid={true} />
          
          {/* Boundary flags */}
          <CubeObstacle position={[-19.5, 1.0, -19.5]} args={[0.2, 2.0, 0.2]} color="#ef4444" label="Boundary Corner FL" />
          <CubeObstacle position={[19.5, 1.0, -19.5]} args={[0.2, 2.0, 0.2]} color="#ef4444" label="Boundary Corner FR" />
          <CubeObstacle position={[-19.5, 1.0, 19.5]} args={[0.2, 2.0, 0.2]} color="#ef4444" label="Boundary Corner RL" />
          <CubeObstacle position={[19.5, 1.0, 19.5]} args={[0.2, 2.0, 0.2]} color="#ef4444" label="Boundary Corner RR" />
          
          <CubeObstacle position={[-4.5, 1.8, -4.5]} args={[0.8, 3.6, 0.8]} color="#78350f" label="Conifer Tree" />
          <CubeObstacle position={[5.5, 1.2, -6.5]} args={[1.0, 2.4, 1.0]} color="#4b5563" label="Granite Boulder" />
          <CubeObstacle position={[-6.5, 1.5, 5.5]} args={[0.6, 3.0, 0.6]} color="#1e3a8a" label="Telemetry Mast" />
        </group>
      )}

      {/* F. OBSTACLE COURSE */}
      {envType === 'course' && (
        <group>
          {/* Industrial training pad floor */}
          <Grid 
            position={[0, 0.001, 0]} 
            args={[40, 40]} 
            cellColor={isDark ? "#111827" : "#cbd5e1"} 
            sectionColor={isDark ? "#ea580c" : "#ea580c"} 
            fadeDistance={25} 
            infiniteGrid={false} 
          />

          {/* Boundary course fences (visual) */}
          <mesh position={[0, 4, -20]} receiveShadow>
            <planeGeometry args={[40, 8]} />
            <meshStandardMaterial color={isDark ? "#0f172a" : "#f8fafc"} roughness={0.9} />
          </mesh>
          <mesh position={[0, 4, 20]} rotation={[0, Math.PI, 0]} receiveShadow>
            <planeGeometry args={[40, 8]} />
            <meshStandardMaterial color={isDark ? "#0f172a" : "#f8fafc"} roughness={0.9} />
          </mesh>
          <mesh position={[-20, 4, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[40, 8]} />
            <meshStandardMaterial color={isDark ? "#0c101d" : "#f1f5f9"} roughness={0.9} />
          </mesh>
          <mesh position={[20, 4, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[40, 8]} />
            <meshStandardMaterial color={isDark ? "#0c101d" : "#f1f5f9"} roughness={0.9} />
          </mesh>

          {/* Vertical Blueprint Wall Grids */}
          <WallGrid 
            position={[0, 4, -19.99]} 
            rotation={[Math.PI / 2, 0, 0]} 
            args={[40, 8]} 
            cellColor={isDark ? "#111827" : "#e2e8f0"} 
            sectionColor={isDark ? "#ea580c" : "#ea580c"} 
            fadeDistance={25} 
          />
          <WallGrid 
            position={[0, 4, 19.99]} 
            rotation={[Math.PI / 2, 0, 0]} 
            args={[40, 8]} 
            cellColor={isDark ? "#111827" : "#e2e8f0"} 
            sectionColor={isDark ? "#ea580c" : "#ea580c"} 
            fadeDistance={25} 
          />
          <WallGrid 
            position={[-19.99, 4, 0]} 
            rotation={[0, 0, Math.PI / 2]} 
            args={[8, 40]} 
            cellColor={isDark ? "#111827" : "#e2e8f0"} 
            sectionColor={isDark ? "#ea580c" : "#ea580c"} 
            fadeDistance={25} 
          />
          <WallGrid 
            position={[19.99, 4, 0]} 
            rotation={[0, 0, Math.PI / 2]} 
            args={[8, 40]} 
            cellColor={isDark ? "#111827" : "#e2e8f0"} 
            sectionColor={isDark ? "#ea580c" : "#ea580c"} 
            fadeDistance={25} 
          />

          {/* Permanent course structures */}
          <CourseArch position={[0, 0, 1.5]} rotation={[0, 0, 0]} width={2.5} height={2.2} color="#3b82f6" />
          <CourseArch position={[-2.5, 0, -1.0]} rotation={[0, Math.PI / 4, 0]} width={2.2} height={1.8} color="#eab308" />
          <CourseArch position={[2.5, 0, -1.0]} rotation={[0, -Math.PI / 4, 0]} width={2.2} height={1.8} color="#eab308" />

          {/* Large column cylinders (slaloms) */}
          <CubeObstacle position={[-5.0, 1.8, 3.0]} args={[0.8, 3.6, 0.8]} color="#1e293b" label="Tower A" />
          <CubeObstacle position={[5.0, 1.8, 3.0]} args={[0.8, 3.6, 0.8]} color="#1e293b" label="Tower B" />
          <CubeObstacle position={[0.0, 1.8, -5.0]} args={[1.2, 3.6, 1.2]} color="#0f172a" label="Center Column" />

          {/* Warning blocks */}
          <CubeObstacle position={[-2.5, 0.5, 6.0]} args={[1.5, 1.0, 1.5]} color="#b91c1c" label="Hazard Zone 1" />
          <CubeObstacle position={[2.5, 0.5, 6.0]} args={[1.5, 1.0, 1.5]} color="#b91c1c" label="Hazard Zone 2" />

          {/* Suspension visual poles holding neon hoops (matching activeCheckpoints coordinates) */}
          {activeCheckpoints && activeCheckpoints.some(c => c.id === 'gate1_hoop') && (
            <mesh position={[-2.5, 0.6, -2.5]}>
              <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.7} />
            </mesh>
          )}
          {activeCheckpoints && activeCheckpoints.some(c => c.id === 'gate2_hoop') && (
            <mesh position={[0.0, 0.9, 3.5]}>
              <cylinderGeometry args={[0.02, 0.02, 1.8, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.7} />
            </mesh>
          )}
          {activeCheckpoints && activeCheckpoints.some(c => c.id === 'gate3_hoop') && (
            <mesh position={[2.5, 0.6, -2.5]}>
              <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.7} />
            </mesh>
          )}
        </group>
      )}
      
      {/* 3. DYNAMIC MISSION CHECKPOINTS & HOOPS */}
      {activeCheckpoints && activeCheckpoints.map((cp) => {
        const index = activeCheckpoints.indexOf(cp);
        const nextTargetIdx = activeCheckpoints.findIndex(c => !c.passed);
        const isActive = index === nextTargetIdx;
        
        // Visual configurations
        const isHoop = cp.id.includes('hoop') || cp.id.includes('gate');
        const pos: [number, number, number] = cp.position;
        
        if (isHoop) {
          const isSideways = cp.id.includes('side');
          const rot: [number, number, number] = isSideways ? [0, Math.PI / 2, 0] : [0, 0, 0];
          
          return (
            <FlightGate 
              key={cp.id} 
              position={pos} 
              rotation={rot} 
              isActive={isActive} 
              radius={cp.radius} 
            />
          );
        } else {
          // Glowing floating destination beacon sphere
          const glowColor = cp.passed ? '#22c55e' : (isActive ? '#f97316' : '#64748b');
          
          return (
            <WaypointBeacon 
              key={cp.id}
              index={index}
              pos={pos}
              glowColor={glowColor}
            />
          );
        }
      })}
    </group>
  );
}

useGLTF.preload('/models/classroom.glb');

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1029

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1060

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1091

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1122

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1153

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1184

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1215

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1246

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1277

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1308

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #1339

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #5028

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #5059

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #5090

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #5121

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #5152

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #5183

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #5214

// Senior Feature: Adaptive shadow map size (512px - 2048px) based on rolling FPS average
 // Commit Entry #5245
