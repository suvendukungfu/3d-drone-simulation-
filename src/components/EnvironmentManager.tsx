import { useRef } from 'react';
import * as THREE from 'three';
import { Grid, Billboard, Text } from '@react-three/drei';
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

// Visual school desk for Classroom environment
function ClassroomDesk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Desk top */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.05, 0.6]} />
        <meshStandardMaterial color="#b45309" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Desk Drawer shelf */}
      <mesh position={[0, 0.55, 0]} receiveShadow>
        <boxGeometry args={[0.9, 0.02, 0.5]} />
        <meshStandardMaterial color="#451a03" roughness={0.8} />
      </mesh>
      {/* Desk Legs */}
      <mesh position={[-0.48, 0.35, -0.24]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0.48, 0.35, -0.24]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[-0.48, 0.35, 0.24]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0.48, 0.35, 0.24]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Chair */}
      <group position={[0, 0, -0.45]}>
        {/* Seat */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.42, 0.04, 0.42]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        {/* Leg support */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.4, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.7} />
        </mesh>
        {/* Chair Backrest */}
        <mesh position={[0, 0.68, -0.19]} castShadow>
          <boxGeometry args={[0.38, 0.28, 0.03]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
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

export function EnvironmentManager({ activeCheckpoints }: { activeCheckpoints?: any[] }) {
  const envType = useDroneStore((state) => state.flightEnvironment);
  const theme = useDroneStore((state) => state.theme);
  const isDark = theme === 'dark';
  
  return (
    <group>
      {/* 1. GENERAL LANDING PADS */}
      {/* Home Base Launch Mat */}
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
      
      {/* Target Landing Pad (for precision landing missions) */}
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
          
          <CubeObstacle position={[-2.5, 0.4, -2.5]} args={[1.5, 0.8, 1.5]} color="#1e293b" label="Desk Table" />
          <CubeObstacle position={[2.5, 0.6, -1.0]} args={[0.8, 1.2, 0.8]} color="#0f172a" label="Book Shelf" />
          <CubeObstacle position={[-3.0, 0.45, 2.5]} args={[1.2, 0.9, 1.2]} color="#1e293b" label="Cabinet" />
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
          <Grid 
            position={[0, 0.001, 0]} 
            args={[20, 20]} 
            cellColor={isDark ? "#1e293b" : "#cbd5e1"} 
            sectionColor={isDark ? "#4f46e5" : "#4f46e5"} 
            fadeDistance={15} 
            infiniteGrid={false} 
          />

          {/* Classroom Walls */}
          <mesh position={[0, 3.0, -10]} receiveShadow>
            <planeGeometry args={[20, 6]} />
            <meshStandardMaterial color={isDark ? "#0f172a" : "#f8fafc"} roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.0, 10]} rotation={[0, Math.PI, 0]} receiveShadow>
            <planeGeometry args={[20, 6]} />
            <meshStandardMaterial color={isDark ? "#0f172a" : "#f8fafc"} roughness={0.9} />
          </mesh>
          <mesh position={[-10, 3.0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[20, 6]} />
            <meshStandardMaterial color={isDark ? "#0b0f19" : "#f1f5f9"} roughness={0.9} />
          </mesh>
          <mesh position={[10, 3.0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[20, 6]} />
            <meshStandardMaterial color={isDark ? "#0b0f19" : "#f1f5f9"} roughness={0.9} />
          </mesh>

          {/* Classroom ceiling */}
          <mesh position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color={isDark ? "#030712" : "#e2e8f0"} roughness={0.95} />
          </mesh>

          {/* Vertical and Ceiling Blueprint Grids */}
          <WallGrid 
            position={[0, 3, -9.99]} 
            rotation={[Math.PI / 2, 0, 0]} 
            args={[20, 6]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#4f46e5" : "#4f46e5"} 
            fadeDistance={15} 
          />
          <WallGrid 
            position={[0, 3, 9.99]} 
            rotation={[Math.PI / 2, 0, 0]} 
            args={[20, 6]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#4f46e5" : "#4f46e5"} 
            fadeDistance={15} 
          />
          <WallGrid 
            position={[-9.99, 3, 0]} 
            rotation={[0, 0, Math.PI / 2]} 
            args={[6, 20]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#4f46e5" : "#4f46e5"} 
            fadeDistance={15} 
          />
          <WallGrid 
            position={[9.99, 3, 0]} 
            rotation={[0, 0, Math.PI / 2]} 
            args={[6, 20]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#4f46e5" : "#4f46e5"} 
            fadeDistance={15} 
          />
          <Grid 
            position={[0, 5.99, 0]} 
            args={[20, 20]} 
            cellColor={isDark ? "#1e293b" : "#e2e8f0"} 
            sectionColor={isDark ? "#4f46e5" : "#4f46e5"} 
            fadeDistance={15} 
            infiniteGrid={false} 
          />

          {/* Whiteboard with STEM equations at the front */}
          <group position={[0, 1.9, -9.8]}>
            {/* Board */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[4.5, 2.2, 0.06]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.1} />
            </mesh>
            {/* Frame */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[4.62, 2.32, 0.04]} />
              <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.8} />
            </mesh>
            {/* Whiteboard content */}
            <Text
              position={[0, 0.75, 0.04]}
              fontSize={0.18}
              color="#0f172a"
              anchorX="center"
              anchorY="middle"
              font="monospace"
            >
              PlutoX Flight Dynamics Lab
            </Text>
            <Text
              position={[-2.1, 0.15, 0.04]}
              fontSize={0.08}
              color="#1e293b"
              anchorX="left"
              anchorY="middle"
              font="monospace"
              maxWidth={4.2}
            >
              {"1. Pitch Control: Up = Kp * ep + Ki * S ep dt + Kd * dep/dt\n" +
               "2. Torque Balance: Tz = d * (F1 - F2 + F3 - F4)\n" +
               "3. Angular Accel: J * w_dot = Tb - w x (J * w)"}
            </Text>
          </group>

          {/* Teacher's Desk */}
          <CubeObstacle position={[0, 0.45, -6.5]} args={[1.6, 0.9, 0.8]} color="#1e3a8a" label="Teacher's Desk" />

          {/* Students Desks Grid (3x2) */}
          <ClassroomDesk position={[-2.5, 0, -2.5]} />
          <ClassroomDesk position={[0, 0, -2.5]} />
          <ClassroomDesk position={[2.5, 0, -2.5]} />
          
          <ClassroomDesk position={[-2.5, 0, 1.5]} />
          <ClassroomDesk position={[0, 0, 1.5]} />
          <ClassroomDesk position={[2.5, 0, 1.5]} />

          {/* Storage Cabinet on the side */}
          <CubeObstacle position={[-7.5, 1.0, 4.0]} args={[1.2, 2.0, 0.8]} color="#475569" label="Bookshelf" />
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
            <group key={cp.id} position={pos}>
              <mesh position={[0, -pos[1]/2, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, pos[1], 8]} />
                <meshStandardMaterial color="#334155" roughness={0.7} />
              </mesh>
              
              <mesh castShadow>
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshBasicMaterial color={glowColor} toneMapped={false} transparent opacity={0.65} />
              </mesh>
              
              <mesh>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial color={glowColor} toneMapped={false} />
              </mesh>
              
              <Billboard position={[0, 0.42, 0]} follow={true}>
                <Text fontSize={0.16} color={glowColor} anchorX="center" anchorY="middle">
                  {`CP ${index + 1}`}
                </Text>
              </Billboard>
            </group>
          );
        }
      })}
    </group>
  );
}
