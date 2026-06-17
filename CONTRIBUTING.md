# Contributing to Pluto-Sim

Thank you for your interest in contributing to the Drona Aviation PlutoX Simulator!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/DronaAviation/Pluto-Sim.git
cd Pluto-Sim/dronaviation-3d-world

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Project Architecture

```
src/
├── App.tsx                          # Root application layout & routing
├── main.tsx                         # React entry point
├── index.css                        # Global styles & utility animations
├── components/
│   ├── EnvironmentManager.tsx       # 3D environment lighting & skybox
│   ├── FlightScene.tsx              # Flight simulator camera & scene
│   ├── FloatingHotspots.tsx         # 3D component label overlays
│   ├── PlutoXModel.tsx              # PlutoX drone 3D model loader
│   ├── Scene.tsx                    # Avionics lab 3D scene
│   └── UI/
│       ├── ARSimulator.tsx          # AR passthrough simulator
│       ├── ComponentInfoPanel.tsx   # Drone part inspector panel
│       ├── HUD.tsx                  # Heads-up display overlay
│       ├── IntroOverlay.tsx         # Landing page / intro screen
│       ├── LearningWorkflow.tsx     # Guided learning component ID quiz
│       ├── TelemetryDashboard.tsx   # Real-time flight telemetry
│       ├── TrainingMissionSystem.tsx # Academy missions & objectives
│       └── VirtualJoysticks.tsx     # Touch-based mobile flight controls
├── data/
│   └── droneComponents.ts          # Component metadata & descriptions
├── store/
│   └── useDroneStore.ts            # Zustand global state management
├── tests/
│   └── academy.test.tsx            # Smoke tests for academy system
└── utils/
    ├── soundController.ts           # Web Audio API sound effects
    └── drone/
        ├── types.ts                 # Core TypeScript interfaces
        ├── PhysicsEngine.ts         # RK4 rigid body dynamics
        ├── FlightController.ts      # Cascaded PID control loops
        ├── InputSystem.ts           # Keyboard input processing
        ├── SensorSimulation.ts      # IMU/Baro/Mag noise models
        ├── TelemetryEngine.ts       # Telemetry aggregation
        ├── SimulatorOrchestrator.ts  # Master simulation loop
        ├── BatteryModel.ts          # LiPo OCV/SoC discharge model
        ├── WindSimulation.ts        # Atmospheric disturbance model
        ├── FlightLogger.ts          # Session data recorder
        └── FlightPerformanceAnalyzer.ts # Pilot scoring system
```

## Code Conventions

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): Short description
refactor(scope): Short description
fix(scope): Short description
style(scope): Short description
test(scope): Short description
docs(scope): Short description
chore(scope): Short description
```

### TypeScript

- Strict mode enabled
- All public methods must have JSDoc comments
- Interfaces over type aliases for object shapes
- No `any` — use `unknown` with type guards instead

### Physics Engine

- All physical quantities use **SI units** (meters, kg, seconds, radians)
- Constants are documented with their physical meaning and derivation
- RK4 integration — do not use Euler integration for the main simulation loop

### UI Components

- Use Tailwind CSS utility classes
- Dark mode support via `dark:` variants
- Responsive breakpoints: `md:` for desktop, default for mobile
- Inter font for UI text, JetBrains Mono for telemetry data

## Branching Strategy

- `main` — stable release
- `final-website-overview` — active development
- `feature/*` — individual feature branches
- `fix/*` — bug fix branches

## Testing

```bash
npm run test        # Run Vitest test suite
npm run build       # Verify production build
```

## Pull Request Checklist

- [ ] Code compiles without errors or warnings
- [ ] New features have corresponding tests
- [ ] Commit messages follow Conventional Commits format
- [ ] No `console.log` statements left in production code
- [ ] Dark mode works correctly for any UI changes
- [ ] Mobile responsiveness verified for UI changes
