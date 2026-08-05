# Drona Aviation PlutoX 3D World Laboratory

[![Vite](https://img.shields.io/badge/Vite-5.2+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.2+-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r164+-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-1.4+-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://dronaviation-3d-world.vercel.app)

An industrial-grade, interactive 3D physics simulator and hardware telemetry suite for Drona Aviation's **PlutoX (Primus X2)** nano-quadcopter. Built with modern WebGL (Three.js / React Three Fiber), custom PID flight control dynamics, MultiWii Serial Protocol (MSP) hardware bridge support, Web Audio spatial Doppler synthesis, and automated Vitest validation.

---

## 🏗️ System Architecture & Data Flow

### 1. High-Level Modular Platform Architecture

The diagram below illustrates the reactive architecture connecting the React DOM HUD, Zustand Telemetry Stores, 60Hz Physics Integration Loop, WebGL Render Pipeline, Hardware Bridge, and Audio Engine:

```mermaid
graph TD
    subgraph UI ["Client UI Layer (DOM & Overlays)"]
        HUD["Telemetry HUD Overlay"]
        Tutorial["Interactive Flight Academy"]
        Controls["Virtual Joysticks / Key Mappings"]
        Advisory["Desktop Advisory Modal"]
    end

    subgraph Store ["Reactive State Layer (Zustand)"]
        FlightStore["useFlightStore (Telemetry, Arming, Modes)"]
        SettingsStore["useSettingsStore (Physics, Audio, Graphics)"]
        TutorialStore["useTutorialStore (Step State Machine)"]
    end

    subgraph Engine ["Core Engine Layer"]
        Physics["Physics Simulator Engine (60Hz Integration)"]
        PID["PID Flight Controller (Angle/Rate Loops)"]
        MSP["MSP Protocol Bridge (WebUSB/WebHID)"]
    end

    subgraph Graphics ["WebGL Render Layer (R3F / Three.js)"]
        Canvas["R3F Canvas Container"]
        DroneMesh["PlutoX 3D Model & Propellers"]
        Camera["FPV & Chase Camera System"]
        FX["Shadows, Bloom & Particles"]
    end

    subgraph Audio ["Sound Engine"]
        AudioSynth["Web Audio Doppler Synthesizer"]
    end

    %% Interactions
    Controls -->|Raw RC Channel Inputs| PID
    PID -->|Motor PWM Signals| Physics
    Physics -->|State: Pos, Rot, Velocity| FlightStore
    Physics -->|Position Matrix| DroneMesh
    Physics -->|Motor RPMs & Doppler Shift| AudioSynth

    HUD -->|Read Telemetry| FlightStore
    FlightStore -->|State Sync| HUD
    MSP -->|Hardware RC Injection| PID
    FlightStore -->|Trigger Step Validation| TutorialStore
    Canvas -->|Viewport Frame Updates| Camera
```

---

### 2. 60Hz Flight Dynamics & PID Control Cycle

The diagram below details the closed-loop flight dynamics integration executed on every physics tick:

```mermaid
sequenceDiagram
    autonumber
    participant Input as Input System / WebHID
    participant PID as PID Flight Controller
    participant Phys as Physics Integration Engine
    participant Store as Telemetry Store
    participant Render as Three.js Canvas
    participant Audio as Sound Synthesizer

    loop 60Hz Integration Loop (16.6ms)
        Input->>PID: Sample Pilot Stick Targets (Throttle, Roll, Pitch, Yaw)
        PID->>PID: Compute Error Vector & Apply Anti-Windup Clamping
        PID->>Phys: Output 4-Channel Motor PWM (1000us - 2000us)
        Phys->>Phys: Calculate Rotor Thrust, Ground Effect & Aero Drag
        Phys->>Phys: Integrate Velocity & Rotational Acceleration (RK4)
        Phys->>Store: Dispatch Telemetry Payload (Pitch, Roll, Yaw, Altitude)
        Phys->>Render: Update 3D Drone Matrix & Propeller Blur Rotations
        Phys->>Audio: Scale Motor Oscillator Frequency & Spatial Doppler Shift
    end
```

---

### 3. MultiWii Serial Protocol (MSP) Hardware Bridge

The sequence diagram below shows the hardware handshake and command injection flow for physical Pluto Controllers over Serial/WebUSB:

```mermaid
sequenceDiagram
    participant Controller as Physical Pluto Controller
    participant Serial as WebSerial / WebHID Bridge
    participant Parser as MSP Frame Parser
    participant Flight as Flight Controller Engine

    Controller->>Serial: Connect USB / Bluetooth Low Energy
    Serial->>Parser: Send MSP_IDENT Request (Code 100)
    Parser-->>Controller: Return Board Ident & Capabilities ACK
    
    loop Active RC Stream (50Hz)
        Controller->>Serial: Transmit MSP_SET_RAW_RC Packet (Code 200)
        Serial->>Parser: Validate CRC XOR Checksum
        alt Checksum Valid
            Parser->>Flight: Inject Roll, Pitch, Yaw, Throttle Channels
            Flight-->>Serial: Respond with MSP_STATUS (Code 101) Payload
        else Checksum Invalid
            Parser-->>Serial: Drop Corrupted Packet & Log Telemetry Warning
        end
    end
```

---

### 4. Web Audio Doppler & Engine Sound Pipeline

```mermaid
flowchart LR
    RPM["Motor RPM Telemetry"] -->|Normalize 0-100%| PitchScale["Frequency Pitch Multiplier"]
    PitchScale -->|Base 220Hz - 880Hz| Osc1["Web Audio OscillatorNode"]
    Vel["Relative Drone Velocity Vector"] -->|Doppler Factor| Panner["3D PannerNode (Camera Sync)"]
    
    Osc1 --> LowPass["BiquadFilterNode (Low-Pass Filter)"]
    LowPass --> Panner
    Panner --> Gain["Master GainNode"]
    Gain --> AudioOut["AudioContext Speaker Output"]
```

---

## ⚡ Core Engineering Features

1. **Quadcopter Physics & Kinematics Engine**:
   - 60Hz numerical integration with Runge-Kutta 4th Order (RK4) options.
   - Realistic ground proximity lift multipliers (Ground Effect Model).
   - Dynamic battery voltage sag simulation affecting motor thrust headroom.

2. **Three.js WebGL Graphics Pipeline**:
   - Adaptive shadow map resolution scaling (512px – 2048px) based on FPS performance.
   - Instanced particle buffer geometry for high-efficiency propeller wake trails.
   - Smooth quaternion (`Slerp`) interpolation for FPV and chase camera modes.

3. **MultiWii Serial Protocol (MSP) Hardware Bridge**:
   - Full MSP v1 packet parser with CRC XOR frame verification.
   - Non-linear exponential curve mapping and deadzone compensation for touch virtual joysticks.

4. **Interactive Flight Academy & Mission Machine**:
   - 5-step guided interactive tutorial with atomic state persistence.
   - Spatial waypoint proximity sphere triggers for mission completion validation.

5. **Automated Vitest Test Suite**:
   - 100% pass rate across 17 test suites (physics dynamics, MSP framing, spatial audio, frustum culling, HUD responsiveness, and crash recovery).

---

## 📁 Repository Directory Structure

```tree
dronaviation-3d-world/
├── public/
├── src/
│   ├── components/
│   │   ├── UI/
│   │   │   ├── controls/       # Virtual Joystick & Touch inputs
│   │   │   ├── hud/            # Horizon Ladder, Telemetry HUD, Flight Badges
│   │   │   └── tutorial/       # Interactive Flight Academy Context & Overlays
│   │   ├── EnvironmentManager.tsx
│   │   ├── FlightScene.tsx     # Main R3F Canvas Container
│   │   └── PlutoXModel.tsx     # 3D GLTF Mesh & Propeller Component
│   ├── store/
│   │   ├── flightStore.ts      # Zustand Telemetry & Arming Store
│   │   └── settingsSlice.ts    # Simulator & Physics Config Store
│   ├── tests/                  # Vitest Automated Test Suite (17 files)
│   │   ├── audioSpatial.test.ts
│   │   ├── hudResponsive.test.ts
│   │   ├── mspProtocol.test.ts
│   │   ├── physicsDynamics.test.ts
│   │   ├── renderFrustum.test.ts
│   │   └── tutorialTransitions.test.ts
│   ├── types/
│   │   └── telemetry.ts        # Immutable Telemetry Type Specifications
│   └── utils/
│       ├── controller/         # WebHID Joystick Listener Service
│       ├── drone/              # Physics Engine, PID Controller, Ground Effect Model
│       ├── msp/                # MultiWii Serial Protocol Builder & Parser
│       └── sound/              # Web Audio Node Pool & Sound Controller
├── docs/
│   └── PHYSICS_MODELS.md       # Quadcopter Mathematical Derivations
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 💻 Quick Start & Development

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Package Manager**: `npm` v9+

### 2. Setup & Execution

```bash
# Clone repository
git clone https://github.com/suvendukungfu/3d-drone-simulation-.git
cd dronaviation-3d-world

# Install dependencies
npm install

# Start development server
npm run dev

# Run automated Vitest suite
npm test

# Build production static bundle
npm run build
```

---

## 🛡️ License & Credits

- **License**: Open-source under the [MIT License](LICENSE).
- **Author**: Developed by [Suvendu Sahoo](https://github.com/suvendukungfu).
- **Inspired by**: Drona Aviation PlutoX nano-quadcopter platform.
