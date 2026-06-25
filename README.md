# Drona Aviation PlutoX 3D World Laboratory

[![Vite](https://img.shields.io/badge/Vite-5.2+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.2+-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r164+-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vercel Status](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://dronaviation-3d-world.vercel.app)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://dronaviation-3d-world.vercel.app)

An interactive, high-fidelity 3D hardware simulation and educational training platform for Drona Aviation's **PlutoX (Primus X2)** nano-drone. This application allows students, engineers, and hobbyists to inspect, diagnose, and learn the physics and assembly of quadcopters in an immersive WebGL environment.

---

## 🚀 Key Features

### 1. Interactive 3D Telemetry Engine

- **High-fidelity 3D Rendering**: Powered by Three.js (`@react-three/fiber` and `@react-three/drei`) with realistic lighting, shadows, and materials.
- **Exploded View**: Instantly deconstruct the drone assembly to analyze internal routing, stack alignments, and mounting mechanics.
- **Component Isolation**: Focus on single hardware components (e.g., flight controller, battery, specific motors) by fading out the rest of the chassis.
- **Floating 3D Hotspots**: Clickable annotations anchored to real 3D coordinates highlighting critical structural zones.

### 2. STEM & Flight Physics Training

- **Explorer & Training Modes**: Toggle between sandbox exploration and structured, step-by-step training workflows.
- **Aerodynamic Visualizations**: Overlay rotation direction vectors (CW/CCW) to demonstrate torque-balancing principles.
- **Educational STEM Insights**: Contextual popups describing lift, thrust, yaw authority, reaction torques, and flight controller PID adjustments.

### 3. Motor Diagnostic Suite

- **Real-Time Speed Simulator**: Spin up individual brushless motors (FL, FR, RL, RR) with visual blade spinning matching simulated RPM speeds.
- **Individual/Global Diagnostic Testing**: Test individual motor channels or run a sequenced "Test All" loop to inspect telemetry.
- **Ambient Audio System**: Dynamically pitches motor hum sound frequencies based on active simulated RPM values.

### 4. Immersive Viewports

- **Cinematic 360° Free Look**: Auto-hides UI/HUD panels for pure cinematic exploration.
- **Stereoscopic SBS VR**: Split-screen side-by-side mode suitable for mobile VR headsets.

---

## 📊 Architecture & Data Flow

Below is a architectural overview of how user interaction, state management, audio generation, and the 3D graphics rendering pipeline connect within the application:

```mermaid
graph TD
    subgraph UI ["React UI Overlays (DOM)"]
        HUD["Diagnostic HUD"]
        LWF["Learning Workflow"]
        CIP["Component Info Panel"]
        IO["Intro Overlay"]
    end

    subgraph Store ["State Management"]
        ZS["Zustand Store (useDroneStore)"]
    end

    subgraph Audio ["Sound Engine"]
        SC["Sound Controller (Web Audio API)"]
    end

    subgraph Canvas3D ["3D WebGL Canvas (R3F/Three.js)"]
        Scene["Scene Canvas Container"]
        Model["PlutoX Model Component"]
        Props["Spinning Propellers Mesh"]
        Hotspots["Floating Hotspots Annotations"]
    end

    %% Interactions
    User((User)) -->|Interact| HUD
    User -->|Select Part / Orbit Rotate| Scene

    HUD -->|Toggle Motor / Change Mode| ZS
    LWF -->|Proceed Step| ZS
    CIP -->|Close / Select| ZS

    ZS -->|Active Motors & RPMs| Props
    ZS -->|Selected / Hovered Part| Model
    ZS -->|Telemetric State (Active Motors, RPMs)| SC

    SC -->|Generate dynamic motor hum (variable pitch)| User
    Scene -->|Render viewport update| User
    HUD -->|Read RPM / Status| ZS
    CIP -->|Read part details| ZS
```

---

## 🛠️ Technology Stack

- **Core**: React 18 (TypeScript) & Vite
- **Graphics Pipeline**: Three.js, React Three Fiber (R3F), `@react-three/drei` (GLTF loader, OrbitControls)
- **State Management**: Zustand (reactive central telemetry store)
- **Animations**: Framer Motion (smooth UI sidebar transitions) & Canvas-level animation loops
- **Styling**: Tailwind CSS & Lucide React (vector iconography)
- **Audio Logic**: Web Audio API (oscillators, panning, and gain nodes for realistic motor hums)

---

## 📁 Repository Structure

```tree
dronaviation-3d-world/
├── .vscode/               # Workspace configuration (linter overrides)
├── public/
│   └── models/            # Static assets
│       └── plutox.glb     # 3D model asset of PlutoX Drone
├── src/
│   ├── components/        # 3D Canvas & WebGL Components
│   │   ├── UI/            # Overlay HUDs, Legend, Component Inspect panels
│   │   │   ├── ComponentInfoPanel.tsx
│   │   │   ├── HUD.tsx
│   │   │   ├── IntroOverlay.tsx
│   │   │   └── LearningWorkflow.tsx
│   │   ├── FloatingHotspots.tsx
│   │   ├── PlutoXModel.tsx
│   │   └── Scene.tsx      # R3F Canvas Container & Lights setup
│   ├── data/
│   │   └── droneComponents.ts # Technical specs, safety warnings, & STEM tips
│   ├── store/
│   │   └── useDroneStore.ts   # Zustand state for active viewports, motors, & selections
│   ├── utils/
│   │   └── soundController.ts # Audio controller utilizing Web Audio API nodes
│   ├── App.tsx            # Main layout layout, sidebar, & overlay assembly
│   ├── index.css          # Tailwind base directives & custom scrollbars
│   └── main.tsx           # React bootstrap entry point
├── tailwind.config.js     # Tailwind presets & responsive breakpoints
├── tsconfig.json          # TypeScript compilation settings
├── vite.config.ts         # Vite build and plugins config
└── inspect-glb.js         # Command-line utility to analyze glb mesh node trees
```

---

## 💻 Getting Started

### Prerequisites

Ensure you have **Node.js (v18 or higher)** installed.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/suvendukungfu/3d-drone-simulation-.git
   cd dronaviation-3d-world
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the local development server:

   ```bash
   npm run dev
   ```

4. Build production static bundle:
   ```bash
   npm run build
   ```

---

## 🔧 Developer Tooling

If you customize or update the 3D asset `plutox.glb`, you can run the node analyzer to output a structured map of mesh names for configuration inside `PlutoXModel.tsx`:

```bash
node inspect-glb.js
```

This logs all child node names, hierarchy levels, material slots, and transform positions.

---

## 🛡️ License

This project is open-source and licensed under the MIT License.
Developed by [Suvendu Sahoo](https://github.com/suvendukungfu).
Inspired by the engineering designs of **Drona Aviation PlutoX**.

<!-- Architecture overview detailing state flow between Physics, Three.js, and HUD -->
 // Commit Entry #1019

<!-- Architecture overview detailing state flow between Physics, Three.js, and HUD -->
 // Commit Entry #1050

<!-- Architecture overview detailing state flow between Physics, Three.js, and HUD -->
 // Commit Entry #1081

<!-- Architecture overview detailing state flow between Physics, Three.js, and HUD -->
 // Commit Entry #1112

<!-- Architecture overview detailing state flow between Physics, Three.js, and HUD -->
 // Commit Entry #1143
