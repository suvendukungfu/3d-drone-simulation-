/**
 * PlutoAnatomyExploded.tsx
 *
 * Senior-level 3D anatomy overlay for the "Pluto Blast View.glb" bombarded model.
 *
 * Design philosophy:
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ Default state: clean exploded drone view — no labels, no clutter.  │
 *   │ On hover:      a premium floating label card fades in at the       │
 *   │                hovered part showing name, specs, and description.  │
 *   │                All OTHER parts dim to ~20% opacity.                │
 *   │ On click:      the label locks open until clicked again.           │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * The node matching is derived from a GLTF parse of the actual
 * "Pluto Blast View.glb" node hierarchy (see dump-glb-nodes.cjs).
 * Group ancestor traversal is used to map generic mesh names
 * (Body1.xxx) to semantic component groups (canopy, motor, etc.).
 */

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useDroneStore } from '../store/useDroneStore';

// ─── Category palette ─────────────────────────────────────────────────────────
type Category = 'structure' | 'power' | 'avionics' | 'propulsion' | 'sensors';

const CAT_ACCENT: Record<Category, string> = {
  structure:  '#94a3b8',
  power:      '#fbbf24',
  avionics:   '#60a5fa',
  propulsion: '#fb923c',
  sensors:    '#34d399',
};

const CAT_LABEL: Record<Category, string> = {
  structure:  'STRUCTURE',
  power:      'POWER',
  avionics:   'AVIONICS',
  propulsion: 'PROPULSION',
  sensors:    'SENSOR',
};

const CAT_ICON: Record<Category, string> = {
  structure:  '◇',
  power:      '⚡',
  avionics:   '◈',
  propulsion: '⟡',
  sensors:    '◎',
};

// ─── Label definitions ────────────────────────────────────────────────────────
// nodeMatch patterns are derived from actual node names in the GLB file.
// Matching traverses the mesh → parent hierarchy until a named group matches.

interface LabelDef {
  id: string;
  name: string;
  spec: string;
  detail: string;
  category: Category;
  /** Exact match test against THREE.Object3D.name (group names in GLTF) */
  nodeMatch: (nodeName: string) => boolean;
  /** World-unit offset from mesh bounding-box centre to the label anchor */
  offset: [number, number, number];
}

const LABELS: LabelDef[] = [
  // ── Canopy ─────────────────────────────────────────────────────────────────
  {
    id: 'canopy',
    name: 'Canopy Shell',
    spec: 'ABS · UV-stabilised · 1.8 g',
    detail:
      'Aerodynamic impact-absorbing cover. Clips over the FC stack to deflect EMI and protect against debris.',
    category: 'structure',
    nodeMatch: (n) => n.startsWith('canopy for draft final'),
    offset: [0, 6, 0],
  },

  // ── Prop Guards ─────────────────────────────────────────────────────────────
  {
    id: 'propGuard1',
    name: 'Prop Guard — FL',
    spec: 'PP · Ø 70 mm · 360° shroud',
    detail:
      'Physical barrier rated for 45 km/h lateral blade-strike. Allows safe indoor flight with ≈92% free-air thrust.',
    category: 'structure',
    nodeMatch: (n) => n === 'porpguard11 v1' || n === 'porpguard11 v1:1',
    offset: [-8, 3, 8],
  },
  {
    id: 'propGuard2',
    name: 'Prop Guard — FR',
    spec: 'PP · Ø 70 mm · 360° shroud',
    detail: 'Symmetrical snap-fit mount. No tools required for field replacement.',
    category: 'structure',
    nodeMatch: (n) => n === 'porpguard11 v1(Mirror)' || n === 'porpguard11 v1(Mirror):1',
    offset: [8, 3, -8],
  },
  {
    id: 'propGuard3',
    name: 'Prop Guard — RL',
    spec: 'PP · Ø 70 mm · 360° shroud',
    detail: 'Symmetrical snap-fit mount. No tools required for field replacement.',
    category: 'structure',
    nodeMatch: (n) => n === 'porpguard11 v1(Mirror) (1)' || n === 'porpguard11 v1(Mirror) (1):1',
    offset: [-8, 3, -8],
  },
  {
    id: 'propGuard4',
    name: 'Prop Guard — RR',
    spec: 'PP · Ø 70 mm · 360° shroud',
    detail: 'Symmetrical snap-fit mount. No tools required for field replacement.',
    category: 'structure',
    nodeMatch: (n) => n === 'porpguard11 v1(Mirror)(Mirror)' || n === 'porpguard11 v1(Mirror)(Mirror):1',
    offset: [8, 3, 8],
  },

  // ── Propellers ──────────────────────────────────────────────────────────────
  {
    id: 'propFL',
    name: 'Propeller A · FL (CCW)',
    spec: '55 mm · 2-blade GF · 4.5″ pitch',
    detail:
      'Glass-fibre bi-blade. Spins counter-clockwise. Self-locking reverse-thread nut at 48 000 RPM.',
    category: 'propulsion',
    nodeMatch: (n) => n === 'propeller 2 v1(Mirror) (1)' || n === 'propeller 2 v1(Mirror) (1):1',
    offset: [-7, 2, 7],
  },
  {
    id: 'propFR',
    name: 'Propeller B · FR (CW)',
    spec: '55 mm · 2-blade GF · 4.5″ pitch',
    detail: 'Clockwise prop. Hover lift ≈47 gf. Phase-reversed wiring ensures correct torque balance.',
    category: 'propulsion',
    nodeMatch: (n) => n === 'propeller 2 v1(Mirror) (1)(Mirror)' || n === 'propeller 2 v1(Mirror) (1)(Mirror):1',
    offset: [7, 2, -7],
  },
  {
    id: 'propRL',
    name: 'Propeller B · RL (CW)',
    spec: '55 mm · 2-blade GF · 4.5″ pitch',
    detail: 'Rear-left CW prop. Speed differential vs FR generates pitch moments.',
    category: 'propulsion',
    nodeMatch: (n) => n === 'propeller 2 v1(Mirror) (1)(Mirror) (1)' || n === 'propeller 2 v1(Mirror) (1)(Mirror) (1):1',
    offset: [-7, 2, -7],
  },
  {
    id: 'propRR',
    name: 'Propeller A · RR (CCW)',
    spec: '55 mm · 2-blade GF · 4.5″ pitch',
    detail: 'Rear-right CCW prop. Speed modulation vs Prop A controls yaw authority.',
    category: 'propulsion',
    nodeMatch: (n) => n === 'propeller 2 v1(Mirror) (1)(Mirror)(Mirror)' || n === 'propeller 2 v1(Mirror) (1)(Mirror)(Mirror):1',
    offset: [7, 2, 7],
  },

  // ── Motors ──────────────────────────────────────────────────────────────────
  {
    id: 'motorFL',
    name: 'Motor B · FL',
    spec: '720 kV · 1S · 48 000 RPM · 7 g',
    detail:
      'Brushless DC 4-pole internal rotor. ESC drives via 3-phase PWM at ≤50 kHz. Neodymium magnets.',
    category: 'propulsion',
    nodeMatch: (n) => n === 'pluto motor v5(Mirror) (1)' || n === 'pluto motor v5(Mirror) (1):1',
    offset: [-8, -1, 8],
  },
  {
    id: 'motorFR',
    name: 'Motor A · FR',
    spec: '720 kV · 1S · 48 000 RPM · 7 g',
    detail: 'Phase-reversed wiring relative to M1 for opposing rotation. Identical mechanical spec.',
    category: 'propulsion',
    nodeMatch: (n) => n === 'pluto motor v5(Mirror)(Mirror)' || n === 'pluto motor v5(Mirror)(Mirror):1',
    offset: [8, -1, -8],
  },
  {
    id: 'motorRL',
    name: 'Motor A · RL',
    spec: '720 kV · 1S · 48 000 RPM · 7 g',
    detail: 'RPM differential vs M2 (FR) generates pitch axis moment for forward/backward flight.',
    category: 'propulsion',
    nodeMatch: (n) => n === 'pluto motor v5(Mirror)' || n === 'pluto motor v5(Mirror):1',
    offset: [-8, -1, -8],
  },
  {
    id: 'motorRR',
    name: 'Motor B · RR',
    spec: '720 kV · 1S · 48 000 RPM · 7 g',
    detail: 'Motor orientation determined by PCB phase wiring order only.',
    category: 'propulsion',
    nodeMatch: (n) => n === 'pluto motor v5' || n === 'pluto motor v5:1',
    offset: [8, -1, 8],
  },

  // ── LiPo Battery Pack ──────────────────────────────────────────────────────
  {
    id: 'battery',
    name: 'LiPo Battery Pack',
    spec: '3.7 V · 1S · 550 mAh · 30 C · 10.3 g',
    detail:
      'Lithium-polymer cell. Full charge 4.2 V, cutoff 3.0 V. Peak discharge 16.5 A. Store at 3.85 V.',
    category: 'power',
    // The "battery lipo" group is the parent that contains the battery cell + connector + wires
    nodeMatch: (n) => n === 'battery lipo' || n === 'battery lipo:1',
    offset: [0, -7.5, 0],
  },

  // ── Battery Connector ──────────────────────────────────────────────────────
  {
    id: 'batConnector',
    name: 'Power Connector — JST-PH 2.0',
    spec: 'JST-PH 2.0 mm · 3 A · Gold-plated',
    detail:
      'Keyed main power inlet. Gold contacts ensure <4 mΩ resistance. Polarisation prevents reverse insertion.',
    category: 'power',
    nodeMatch: (n) => n === 'battery connector' || n === 'battery connector:1',
    offset: [5, -5, 5],
  },

  // ── Battery Wires ──────────────────────────────────────────────────────────
  {
    id: 'batWires',
    name: 'Battery Power Leads',
    spec: '28 AWG · Silicone · 5 A cont. · 100 mm',
    detail:
      'High-strand-count silicone wire. Flexible down to −20 °C. Strain-relieved at JST crimp.',
    category: 'power',
    nodeMatch: (n) =>
      n.startsWith('battery wire') || n.startsWith('Battery wire'),
    offset: [-5, -5, 5],
  },

  // ── Board Harness ──────────────────────────────────────────────────────────
  {
    id: 'boardHarness',
    name: 'Signal & Power Harness',
    spec: '30 AWG FFC · 3.3 V logic · 50 mm',
    detail:
      'Flex-flat cable routing 3-phase motor PWM signals and 3.3 V logic from FC to motor drivers.',
    category: 'avionics',
    nodeMatch: (n) =>
      n === 'board connector' || n === 'board connector:1' ||
      n.startsWith('board wire'),
    offset: [5, 1, -5],
  },

  // ── Frame ──────────────────────────────────────────────────────────────────
  {
    id: 'frame',
    name: 'Structural Frame',
    spec: 'PA12-GF30 Nylon · CNC · 7.5 g',
    detail:
      '30% glass-fibre nylon unibody with integrated motor mounts, PCB retention pillars and battery bay.',
    category: 'structure',
    nodeMatch: (n) => n === 'Frame' || n === 'Frame:1',
    offset: [0, -3.5, 0],
  },

  // ── Flight Controller (whole PCB assembly) ─────────────────────────────────
  {
    id: 'fc',
    name: 'Primus X2 Flight Controller',
    spec: 'STM32F405 · 168 MHz · 1 MB Flash',
    detail:
      'Main processor board running PID flight loops at 8 kHz. Hosts the STM32 MCU and regulates core power rails.',
    category: 'avionics',
    nodeMatch: (n) =>
      n.startsWith('04-Primus-V5') || n.startsWith('PRIMUS-X2-HW_PCB') ||
      n === 'LQFP-48' || n === 'LQFP-48:1',
    offset: [0, 5, 0],
  },

  // ── Wi-Fi Module ───────────────────────────────────────────────────────────
  {
    id: 'wifiModule',
    name: 'Wi-Fi Module — ESP-WROOM-02D',
    spec: '2.4 GHz · +20 dBm · TCP/IP',
    detail:
      'Espressif Wi-Fi chip. Handles real-time telemetry downlink and firmware upload.',
    category: 'avionics',
    nodeMatch: (n) => n.startsWith('ESP-WROOM'),
    offset: [0, 5, 4],
  },

  // ── USB-C Port ─────────────────────────────────────────────────────────────
  {
    id: 'usbPort',
    name: 'USB-C Programming Port',
    spec: 'USB 2.0 · 480 Mbps · ESD protected',
    detail:
      'Onboard USB for firmware updates, ESC calibration and debugging via STM32 VCP.',
    category: 'avionics',
    nodeMatch: (n) => n.startsWith('CON-USB-C'),
    offset: [0, 4, -6],
  },

  // ── IMU Sensor ─────────────────────────────────────────────────────────────
  {
    id: 'imu',
    name: 'IMU · MPU-6050',
    spec: '6-DOF · ±2000 °/s · ±16 g · 8 kHz',
    detail:
      'MEMS gyro + accelerometer sampled at 8 kHz. Feeds the PID attitude loop. Requires vibration dampening.',
    category: 'sensors',
    nodeMatch: (n) => n.startsWith('LGA-8L'),
    offset: [-6, 5, 0],
  },

  // ── Barometer ──────────────────────────────────────────────────────────────
  {
    id: 'baro',
    name: 'Barometer · BMP280',
    spec: '±1 Pa · SPI · Altitude hold',
    detail:
      'Piezoresistive pressure sensor. ≈8 cm altitude resolution. Cover with foam to isolate from propwash.',
    category: 'sensors',
    nodeMatch: (n) => n.startsWith('TDQFN'),
    offset: [6, 5, 0],
  },

  // ── MEMS Resonator ─────────────────────────────────────────────────────────
  {
    id: 'xtal',
    name: 'MEMS Resonator — CSTNE',
    spec: '16 MHz · ±100 ppm · Murata',
    detail:
      'Ceramic MEMS resonator providing MCU system clock. Improved shock resistance vs quartz crystal.',
    category: 'sensors',
    nodeMatch: (n) => n.startsWith('CSTNE'),
    offset: [0, 5, -5],
  },

  // ── Landing Pads ───────────────────────────────────────────────────────────
  {
    id: 'landingPads',
    name: 'Landing Pads & Dampers',
    spec: 'TPU 95A · 4 mm clearance',
    detail:
      'Thermoplastic polyurethane shock-absorber feet. Dampen vibration spikes on landing to protect IMU.',
    category: 'structure',
    nodeMatch: (n) => n.startsWith('landing pad') || n.startsWith('damper'),
    offset: [0, -6, 0],
  },

  // ── Screws ─────────────────────────────────────────────────────────────────
  {
    id: 'screws',
    name: 'Assembly Screws',
    spec: 'M1.6 × 5 mm · Phillips · SS304',
    detail:
      'Stainless steel fasteners securing the frame and motor mounts. Torque: 0.08 N·m.',
    category: 'structure',
    nodeMatch: (n) => n.startsWith('screw'),
    offset: [5, -2, 5],
  },
];

// ─── CSS Styles (injected once) ───────────────────────────────────────────────

const STYLE_ID = 'anatomy-label-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes anatomyPulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    @keyframes anatomySlideIn {
      from { opacity: 0; transform: translateY(6px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes anatomyGlowPulse {
      0%, 100% { box-shadow: 0 0 12px var(--glow-color, rgba(96,165,250,0.3)); }
      50%      { box-shadow: 0 0 22px var(--glow-color, rgba(96,165,250,0.5)); }
    }
    .anatomy-label-card {
      animation: anatomySlideIn 0.25s cubic-bezier(0.16,1,0.3,1) both;
      font-family: 'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif;
    }
    .anatomy-dot-ping {
      animation: anatomyPulse 2s cubic-bezier(0.4,0,0.6,1) infinite;
    }
  `;
  document.head.appendChild(style);
}

// ─── Label Card (HTML overlay) ────────────────────────────────────────────────

interface LabelCardProps {
  label: LabelDef;
  isLocked: boolean;
  onToggleLock: () => void;
}

function LabelCard({ label, isLocked, onToggleLock }: LabelCardProps) {
  const accent = CAT_ACCENT[label.category];
  const catTxt = CAT_LABEL[label.category];
  const icon   = CAT_ICON[label.category];
  const theme  = useDroneStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onToggleLock();
      }}
      className="anatomy-label-card"
      style={{
        '--glow-color': accent + '55',
        border: `1.5px solid ${accent}`,
        borderRadius: 14,
        background: isDark
          ? 'rgba(6,10,28,0.94)'
          : 'rgba(250,252,255,0.96)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        minWidth: 190,
        maxWidth: 270,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: `0 0 18px ${accent}44, 0 8px 32px rgba(0,0,0,0.45)`,
        animation: isLocked
          ? 'anatomySlideIn 0.25s cubic-bezier(0.16,1,0.3,1) both, anatomyGlowPulse 2.5s ease-in-out infinite'
          : 'anatomySlideIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
        userSelect: 'none',
      } as React.CSSProperties}
    >
      {/* Category header strip */}
      <div
        style={{
          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: '0.18em',
          color: 'rgba(0,0,0,0.7)',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
        }}>
          {icon} {catTxt}
        </span>
        {isLocked && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 8,
            color: 'rgba(0,0,0,0.5)',
            fontFamily: 'monospace',
            letterSpacing: '0.15em',
          }}>
            🔒 LOCKED
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '8px 12px 10px' }}>
        {/* Component name */}
        <p style={{
          color: accent,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: '"Inter", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          lineHeight: 1.3,
          margin: '0 0 6px 0',
        }}>
          {label.name}
        </p>

        {/* Spec badge */}
        <div style={{
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 6,
          padding: '4px 8px',
          marginBottom: 6,
        }}>
          <p style={{
            fontSize: 9,
            fontFamily: 'monospace',
            color: isDark ? '#cbd5e1' : '#475569',
            lineHeight: 1.5,
            margin: 0,
          }}>
            {label.spec}
          </p>
        </div>

        {/* Description */}
        <p style={{
          fontSize: 9,
          fontFamily: '"Inter", sans-serif',
          color: isDark ? '#94a3b8' : '#64748b',
          lineHeight: 1.55,
          margin: 0,
        }}>
          {label.detail}
        </p>

        {/* Footer hint */}
        <p style={{
          fontSize: 7,
          fontFamily: 'monospace',
          color: isLocked ? accent : (isDark ? '#475569' : '#94a3b8'),
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          textAlign: 'right',
          margin: '6px 0 0 0',
          transition: 'color 0.2s',
        }}>
          {isLocked ? '▲ click to unlock' : '▼ click to lock'}
        </p>
      </div>
    </div>
  );
}

// ─── Leader-Line mesh (Three.js Line primitive) ───────────────────────────────

function LeaderLine({
  from,
  to,
  color,
  opacity,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  opacity: number;
}) {
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([from.x, from.y, from.z, to.x, to.y, to.z]),
        3
      )
    );
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      depthWrite: false,
    });
    return new THREE.Line(geo, mat);
  }, [from, to, color, opacity]);

  // Cleanup
  useEffect(() => {
    return () => {
      lineObj.geometry.dispose();
      (lineObj.material as THREE.Material).dispose();
    };
  }, [lineObj]);

  return <primitive object={lineObj} />;
}

// ─── Cached Material Interface ────────────────────────────────────────────────

interface CachedMaterial {
  material: THREE.MeshStandardMaterial;
  labelId: string | null;
  category: Category | null;
  originalOpacity: number;
  originalTransparent: boolean;
  originalEmissive: THREE.Color;
  originalEmissiveIntensity: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const MODEL_PATH = '/models/Pluto Blast View.glb';

export function PlutoAnatomyExploded() {
  const { scene: raw } = useGLTF(MODEL_PATH);

  // Inject CSS once
  useEffect(() => { injectStyles(); }, []);

  // Clone scene + materials so we can mutate them
  const propRefs = useRef<{
    motor1: THREE.Object3D[];
    motor2: THREE.Object3D[];
    motor3: THREE.Object3D[];
    motor4: THREE.Object3D[];
  }>({ motor1: [], motor2: [], motor3: [], motor4: [] });

  const currentRPMs = useRef({ motor1: 0, motor2: 0, motor3: 0, motor4: 0 });

  const scene = useMemo(() => {
    const cloned = raw.clone(true);
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => m.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });
    return cloned;
  }, [raw]);

  const rootRef = useRef<THREE.Group>(null);

  // Interaction states
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [lockedId, setLockedId] = useState<string | null>(null);

  const toggleLock = useCallback((id: string) => {
    setLockedId((prev) => (prev === id ? null : id));
  }, []);

  // The "visible" label is whichever is hovered or locked
  const visibleId = hoveredId ?? lockedId;

  // ── Gentle float animation + material interpolation ──────────────────────
  useFrame((state, delta) => {
    if (rootRef.current) {
      const t = state.clock.getElapsedTime();
      rootRef.current.position.y = -0.5 + Math.sin(t * 0.5) * 0.05;
    }

    // Smooth material transitions at 60 FPS
    const isAnyActive = visibleId !== null;
    const lerpSpeed = delta * 6;

    cachedMaterials.forEach((item) => {
      const { material, labelId, category, originalOpacity, originalEmissive } = item;

      let targetOpacity: number;
      let targetEmissiveIntensity: number;
      let targetEmissiveColor = originalEmissive;

      if (!isAnyActive) {
        // Default: everything fully visible
        targetOpacity = originalOpacity;
        targetEmissiveIntensity = 0.15;
      } else if (labelId === visibleId) {
        // Active part: full opacity + vibrant glow
        targetOpacity = 1.0;
        if (category) {
          targetEmissiveColor = new THREE.Color(CAT_ACCENT[category]);
          targetEmissiveIntensity = 1.4;
        } else {
          targetEmissiveIntensity = 0.6;
        }
      } else {
        // Inactive: dim significantly
        targetOpacity = 0.12;
        targetEmissiveIntensity = 0.02;
      }

      // Special overrides for diagnostic test active motor highlighting
      const { activeTestMotor } = useDroneStore.getState();
      if (activeTestMotor) {
        // When diagnostic test is running, dim everything EXCEPT the active motor and its prop
        const activeMotorLabel = activeTestMotor === 'motor1' ? 'motorFL' :
                                 activeTestMotor === 'motor2' ? 'motorFR' :
                                 activeTestMotor === 'motor3' ? 'motorRR' :
                                 activeTestMotor === 'motor4' ? 'motorRL' : null;
                                 
        const activePropLabel = activeTestMotor === 'motor1' ? 'propFL' :
                                activeTestMotor === 'motor2' ? 'propFR' :
                                activeTestMotor === 'motor3' ? 'propRR' :
                                activeTestMotor === 'motor4' ? 'propRL' : null;

        if (labelId === activeMotorLabel || labelId === activePropLabel) {
          // Highlight active motor components
          targetOpacity = 1.0;
          targetEmissiveColor = new THREE.Color('#3b82f6'); // Blue glow
          targetEmissiveIntensity = 1.2;
        } else {
          // Dim inactive components heavily during testing
          targetOpacity = Math.min(targetOpacity, 0.1);
          targetEmissiveIntensity = 0;
        }
      }

      const targetDepthWrite = targetOpacity > 0.5;
      if (material.transparent !== true) material.transparent = true;
      if (material.depthWrite !== targetDepthWrite) material.depthWrite = targetDepthWrite;
      
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, lerpSpeed);
      material.emissive.lerp(targetEmissiveColor, lerpSpeed);
      material.emissiveIntensity = THREE.MathUtils.lerp(
        material.emissiveIntensity,
        targetEmissiveIntensity,
        lerpSpeed
      );
    });

    // Spin Propellers based on motorRPMs state
    const { motorRPMs } = useDroneStore.getState();
    const rpmKeys: (keyof typeof motorRPMs)[] = ['motor1', 'motor2', 'motor3', 'motor4'];
    
    // Rotation directions based on Pluto configuration
    // motor1(FL)=CCW(-), motor2(FR)=CW(+), motor3(RR)=CCW(-), motor4(RL)=CW(+)
    const directions = { motor1: -1, motor2: 1, motor3: -1, motor4: 1 };
    
    rpmKeys.forEach((key) => {
      // Lerp current RPM towards target RPM for smooth spool up/down
      currentRPMs.current[key] = THREE.MathUtils.lerp(currentRPMs.current[key], motorRPMs[key], delta * 4);
      
      const speed = (currentRPMs.current[key] / 60) * Math.PI * 2 * delta;
      const rotDelta = speed * directions[key];
      
      propRefs.current[key].forEach((mesh) => {
        mesh.rotateY(rotDelta);
      });
    });
  });

  // ── Build material cache, mapping each mesh material → label ──────────────
  const cachedMaterials = useMemo(() => {
    const list: CachedMaterial[] = [];
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.material) return;

      // Walk up the ancestor tree to find the first matching label
      let labelId: string | null = null;
      let category: Category | null = null;
      let current: THREE.Object3D | null = child;
      while (current && current !== scene) {
        const match = LABELS.find((l) => l.nodeMatch(current!.name));
        if (match) {
          labelId = match.id;
          category = match.category;
          break;
        }
        current = current.parent;
      }

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        const sm = m as THREE.MeshStandardMaterial;
        if (sm.isMeshStandardMaterial) {
          if (labelId === 'propFL' && child instanceof THREE.Mesh) propRefs.current.motor1.push(child);
          if (labelId === 'propFR' && child instanceof THREE.Mesh) propRefs.current.motor2.push(child);
          if (labelId === 'propRR' && child instanceof THREE.Mesh) propRefs.current.motor3.push(child);
          if (labelId === 'propRL' && child instanceof THREE.Mesh) propRefs.current.motor4.push(child);

          list.push({
            material: sm,
            labelId,
            category,
            originalOpacity: sm.opacity ?? 1,
            originalTransparent: sm.transparent ?? false,
            originalEmissive: sm.emissive ? sm.emissive.clone() : new THREE.Color(0, 0, 0),
            originalEmissiveIntensity: sm.emissiveIntensity ?? 0,
          });
        }
      });
    });
    return list;
  }, [scene]);

  // ── Compute bounding-box centres for every label's matching meshes ────────
  const SCALE = 18;

  const labelData = useMemo(() => {
    scene.updateMatrixWorld(true);

    return LABELS.map((label) => {
      const box = new THREE.Box3();
      let hit = false;

      scene.traverse((child) => {
        // Check this node AND all ancestors for a match
        let current: THREE.Object3D | null = child;
        let matched = false;
        while (current && current !== scene) {
          if (label.nodeMatch(current.name)) {
            matched = true;
            break;
          }
          current = current.parent;
        }
        if (!matched) return;
        if (!(child instanceof THREE.Mesh)) return;

        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        if (!child.geometry.boundingBox) return;
        const b = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);
        if (!hit) { box.copy(b); hit = true; }
        else box.union(b);
      });

      if (!hit) return null;

      const centre = new THREE.Vector3();
      box.getCenter(centre);

      // Scale offset to match model scale
      const [ox, oy, oz] = label.offset;
      const labelPos = new THREE.Vector3(
        centre.x + ox,
        centre.y + oy,
        centre.z + oz,
      );

      return { label, centre, labelPos };
    }).filter(Boolean) as {
      label: LabelDef;
      centre: THREE.Vector3;
      labelPos: THREE.Vector3;
    }[];
  }, [scene]);

  // ── Raycast: find which label the pointer is on ───────────────────────────
  const findLabelId = useCallback(
    (object: THREE.Object3D): string | null => {
      let current: THREE.Object3D | null = object;
      while (current && current !== scene) {
        const match = LABELS.find((l) => l.nodeMatch(current!.name));
        if (match) return match.id;
        current = current.parent;
      }
      return null;
    },
    [scene]
  );

  const handlePointerOver = useCallback(
    (e: any) => {
      e.stopPropagation();
      const id = findLabelId(e.object);
      if (id) {
        setHoveredId(id);
        document.body.style.cursor = 'pointer';
      }
    },
    [findLabelId]
  );

  const handlePointerOut = useCallback(
    (e: any) => {
      e.stopPropagation();
      setHoveredId(null);
      document.body.style.cursor = 'default';
    },
    []
  );

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      const id = findLabelId(e.object);
      if (id) toggleLock(id);
    },
    [findLabelId, toggleLock]
  );

  return (
    <group ref={rootRef} position={[0, -0.5, 0]}>
      {/* ── 3D Model ─────────────────────────────────────────────────────── */}
      <primitive
        object={scene}
        scale={SCALE}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />

      {/* ── Small anchor dots always visible at each component centre ──── */}
      {labelData.map(({ label, centre }) => {
        const accent = CAT_ACCENT[label.category];
        const isActive = visibleId === label.id;
        return (
          <mesh key={`dot-${label.id}`} position={centre}>
            <sphereGeometry args={[isActive ? 0.12 : 0.06, 12, 12]} />
            <meshBasicMaterial
              color={accent}
              transparent
              opacity={isActive ? 1.0 : 0.35}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* ── Labels + Leader Lines (only for visible/active label) ──────── */}
      {labelData.map(({ label, centre, labelPos }) => {
        const isActive = visibleId === label.id;
        if (!isActive) return null;

        const accent = CAT_ACCENT[label.category];
        const lineEnd = centre.clone().lerp(labelPos, 0.15);

        return (
          <group key={`label-${label.id}`}>
            {/* Leader line */}
            <LeaderLine
              from={labelPos}
              to={lineEnd}
              color={accent}
              opacity={0.9}
            />

            {/* Anchor dot at component end */}
            <mesh position={lineEnd}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshBasicMaterial color={accent} depthWrite={false} />
            </mesh>

            {/* HTML Label card */}
            <group position={[labelPos.x, labelPos.y, labelPos.z]}>
              <Html
                distanceFactor={5}
                center
                style={{ pointerEvents: 'auto' }}
                zIndexRange={[10, 200]}
              >
                <LabelCard
                  label={label}
                  isLocked={lockedId === label.id}
                  onToggleLock={() => toggleLock(label.id)}
                />
              </Html>
            </group>
          </group>
        );
      })}
    </group>
  );
}

// Pre-load asset
useGLTF.preload(MODEL_PATH);
