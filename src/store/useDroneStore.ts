import { create } from 'zustand';
import { sound } from '../utils/soundController';
import { TelemetryData } from '../utils/drone/types';

const syncHashFromState = (mode: string, missionIndex: number) => {
  if (typeof window === 'undefined') return;
  let targetHash = '#/';
  if (mode === 'explore' || mode === 'learning') {
    targetHash = '#/anatomy';
  } else if (mode === 'flight') {
    if (missionIndex >= 0) {
      targetHash = `#/sim/mission/${missionIndex}`;
    } else {
      targetHash = '#/learn';
    }
  } else if (mode === 'home') {
    targetHash = '#/';
  }
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
};

const getSafeTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
    return window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  }
  return 'light';
};

const setSafeTheme = (theme: 'light' | 'dark') => {
  if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
    window.localStorage.setItem('theme', theme);
  }
};

export type AppMode = 'home' | 'explore' | 'inspect' | 'learning' | 'flight';
export type CameraView = 'orbit' | 'inspect' | 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
export type FlightCameraView = 'chase' | 'fpv' | 'orbit';
export type FlightEnvironment = 'room' | 'lab' | 'classroom' | 'warehouse' | 'field' | 'course';
export type AppLinkStatus = 'disconnected' | 'connecting' | 'connected';

export interface MotorState {
  motor1: boolean;
  motor2: boolean;
  motor3: boolean;
  motor4: boolean;
}

export interface MotorRPMState {
  motor1: number;
  motor2: number;
  motor3: number;
  motor4: number;
}

const GUIDED_QUESTIONS = [
  'canopy',
  'cameraModule',
  'propellerGuard',
  'propellerA',
  'propellerB',
  'motor1',
  'flightController',
  'imuSensor',
  'barometer',
  'battery',
  'frameStructure'
];

const DEFAULT_TELEMETRY: TelemetryData = {
  isArmed: false,
  flightMode: 'althold',
  altitude: 0.0,
  verticalSpeed: 0.0,
  speed: 0.0,
  pitch: 0.0,
  roll: 0.0,
  yaw: 0.0,
  heading: 0.0,
  motorRPMs: [0, 0, 0, 0],
  battery: 100,
  flightTime: 0,
  sensorError: false,
  calibrationActive: true
};

interface DroneState {
  // Mode & Interactions (Avionics Lab)
  currentMode: AppMode;
  hoveredComponent: string | null;
  selectedComponent: string | null;
  isExploded: boolean;
  isolationMode: boolean;
  
  // Camera & Scene Settings (Avionics Lab)
  cameraView: CameraView;
  autoRotate: boolean;
  immersiveMode: boolean;
  vrMode: boolean;
  vrCameraPosition: [number, number, number];
  vrCameraTarget: [number, number, number];
  
  // Motor Test Systems (Avionics Lab)
  activeMotors: MotorState;
  motorRPMs: MotorRPMState;
  showRotationDirections: boolean;

  // Learning Workflow State (Avionics Lab)
  guidedStep: number;
  completedIdentifiers: string[];
  guidedQuestions: string[];
  learningStatus: 'idle' | 'identifying' | 'completed';

  // --- FLIGHT SIMULATOR MODE STATES ---
  flightCameraView: FlightCameraView;
  showTelemetryDashboard: boolean;
  showControlsOverlay: boolean;
  flightEnvironment: FlightEnvironment;
  activeMissionIndex: number;
  missionStatus: 'idle' | 'active' | 'failed' | 'passed';
  missionObjectivesCompleted: boolean[];
  certificationEarned: boolean;
  telemetry: TelemetryData;
  warnings: string[];
  isAcademyOpen: boolean;
  showChecklist: boolean;
  notifications: { id: string; text: string; type: string }[];

  // --- SPAWN & DIAGNOSTIC STATES ---
  modelLoadStatus: 'loading' | 'success' | 'failed';
  modelLoadError: string | null;
  modelDiagnostics: {
    meshCount: number;
    materialCount: number;
    boundingBoxSize: [number, number, number];
    boundingBoxMin: [number, number, number];
    boundingBoxMax: [number, number, number];
    center: [number, number, number];
    rootTransform: string;
  } | null;
  droneSpawnDiagnostics: {
    dronePos: [number, number, number];
    physicsPos: [number, number, number];
    modelPos: [number, number, number];
    boxMinY: number;
    groundHeight: number;
  } | null;
  droneInitFailed: boolean;
  isSpawnDebugMode: boolean;
  setModelLoadStatus: (status: 'loading' | 'success' | 'failed', error?: string | null) => void;
  setModelDiagnostics: (diagnostics: any) => void;
  setDroneSpawnDiagnostics: (diagnostics: any) => void;
  setDroneInitFailed: (failed: boolean) => void;
  toggleSpawnDebugMode: () => void;

  // --- DIGITAL TWIN & APP LINK STATES ---
  appLinkStatus: AppLinkStatus;
  appTelemetryPackets: string[];

  // --- ACADEMY BENCH TEST STATES ---
  stickInputsTested: {
    throttleUp: boolean;
    throttleDown: boolean;
    rollLeft: boolean;
    rollRight: boolean;
    pitchForward: boolean;
    pitchBack: boolean;
    yawLeft: boolean;
    yawRight: boolean;
  };
  updateStickInputTested: (input: string) => void;
  resetStickInputsTested: () => void;
  motorsTested: boolean[];
  setMotorTested: (index: number, tested: boolean) => void;
  resetMotorsTested: () => void;
  clickedParts: string[];
  addClickedPart: (part: string) => void;
  resetClickedParts: () => void;

  // Actions
  setMode: (mode: AppMode) => void;
  hoverComponent: (id: string | null) => void;
  selectComponent: (id: string | null) => void;
  toggleExploded: () => void;
  toggleIsolation: () => void;
  
  // Camera Actions (Avionics Lab)
  setCameraView: (view: CameraView) => void;
  toggleAutoRotate: () => void;
  toggleImmersiveMode: () => void;
  toggleVrMode: () => void;
  setImmersiveMode: (val: boolean) => void;
  setVrMode: (val: boolean) => void;
  setVrCamera: (position: [number, number, number], target: [number, number, number]) => void;
  
  // Motor Test Actions (Avionics Lab)
  toggleMotor: (motorId: keyof MotorState) => void;
  testAllMotors: () => void;
  stopAllMotors: () => void;
  setShowRotationDirections: (show: boolean) => void;

  // Learning Workflow Actions (Avionics Lab)
  startLearning: () => void;
  identifyComponent: (id: string) => boolean;
  nextGuidedStep: () => void;
  resetGuided: () => void;

  // --- FLIGHT SIMULATOR ACTIONS ---
  setFlightCameraView: (view: FlightCameraView) => void;
  toggleTelemetryDashboard: () => void;
  toggleControlsOverlay: () => void;
  toggleAcademy: () => void;
  toggleChecklist: () => void;
  addNotification: (text: string, type?: string) => void;
  clearNotifications: () => void;
  setFlightEnvironment: (env: FlightEnvironment) => void;
  selectMission: (index: number) => void;
  setMissionStatus: (status: 'idle' | 'active' | 'failed' | 'passed') => void;
  setMissionObjectives: (completed: boolean[]) => void;
  earnCertification: (earned: boolean) => void;
  updateFlightTelemetry: (telemetry: TelemetryData, warnings: string[]) => void;

  // --- DIGITAL TWIN ACTIONS ---
  setAppLinkStatus: (status: AppLinkStatus) => void;
  addTelemetryPacket: (packet: string) => void;
  clearTelemetryPackets: () => void;
  // --- LEVEL PROGRESSION & MODAL STATES ---
  unlockedLevels: boolean[];
  completeLevelAction: (levelIndex: number) => void;
  isFlightSimModalOpen: boolean;
  setFlightSimModalOpen: (open: boolean) => void;
  isARActive: boolean;
  setARActive: (active: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useDroneStore = create<DroneState>((set, get) => ({
  // Core Exploration Lab
  currentMode: 'home',
  hoveredComponent: null,
  selectedComponent: null,
  isExploded: false,
  isolationMode: false,

  unlockedLevels: [true, false, false, false, false],
  isFlightSimModalOpen: false,
  isARActive: false,
  theme: getSafeTheme(),
  
  cameraView: 'orbit',
  autoRotate: true,
  immersiveMode: false,
  vrMode: false,
  vrCameraPosition: [5.0, 3.5, 6.0],
  vrCameraTarget: [0, 0, 0],
  
  activeMotors: {
    motor1: false,
    motor2: false,
    motor3: false,
    motor4: false,
  },
  motorRPMs: {
    motor1: 0,
    motor2: 0,
    motor3: 0,
    motor4: 0,
  },
  showRotationDirections: false,

  guidedStep: 0,
  completedIdentifiers: [],
  guidedQuestions: GUIDED_QUESTIONS,
  learningStatus: 'idle',

  // --- FLIGHT SIMULATOR INITIAL STATE ---
  flightCameraView: 'chase',
  showTelemetryDashboard: true,
  showControlsOverlay: true,
  flightEnvironment: 'room',
  activeMissionIndex: -1, // start at menu
  missionStatus: 'idle',
  missionObjectivesCompleted: [],
  certificationEarned: false,
  telemetry: DEFAULT_TELEMETRY,
  warnings: [],
  isAcademyOpen: true,
  showChecklist: true,
  notifications: [],

  // --- SPAWN & DIAGNOSTIC INITIAL STATE ---
  modelLoadStatus: 'loading',
  modelLoadError: null,
  modelDiagnostics: null,
  droneSpawnDiagnostics: null,
  droneInitFailed: false,
  isSpawnDebugMode: false,

  // --- DIGITAL TWIN INITIAL STATE ---
  appLinkStatus: 'disconnected',
  appTelemetryPackets: [],

  // --- ACADEMY BENCH TEST INITIAL STATES ---
  stickInputsTested: {
    throttleUp: false,
    throttleDown: false,
    rollLeft: false,
    rollRight: false,
    pitchForward: false,
    pitchBack: false,
    yawLeft: false,
    yawRight: false,
  },
  motorsTested: [false, false, false, false],
  clickedParts: [],

  setMode: (mode) => {
    sound.playClick();
    
    // Stop diagnostic motors when switching out of explore/learning
    if (mode !== 'explore' && mode !== 'learning') {
      get().stopAllMotors();
    }
    
    set({ 
      currentMode: mode, 
      selectedComponent: null,
      isolationMode: false,
      hoveredComponent: null,
      isExploded: false,
      cameraView: 'orbit',
      autoRotate: mode === 'home',
      learningStatus: mode === 'learning' ? 'identifying' : 'idle'
    });
    
    syncHashFromState(mode, get().activeMissionIndex);
  },

  hoverComponent: (id) => {
    const prev = get().hoveredComponent;
    if (id !== prev) {
      if (id) {
        sound.playHover();
      }
      set({ hoveredComponent: id });
    }
  },

  selectComponent: (id) => set((state) => {
    sound.playClick();
    const nextClickedParts = id && !state.clickedParts.includes(id)
      ? [...state.clickedParts, id]
      : state.clickedParts;
    return { 
      selectedComponent: id,
      cameraView: id ? 'inspect' : 'orbit',
      isolationMode: id ? state.isolationMode : false,
      clickedParts: nextClickedParts
    };
  }),

  toggleExploded: () => set((state) => {
    sound.playClick();
    const nextExploded = !state.isExploded;
    return { 
      isExploded: nextExploded,
      isolationMode: nextExploded ? false : state.isolationMode,
      autoRotate: nextExploded ? false : state.autoRotate,
      cameraView: nextExploded ? 'orbit' : state.cameraView
    };
  }),

  toggleIsolation: () => set((state) => {
    sound.playClick();
    return { 
      isolationMode: !state.isolationMode,
      isExploded: state.isolationMode ? state.isExploded : false
    };
  }),

  setCameraView: (view) => {
    sound.playClick();
    set((state) => ({ 
      cameraView: view,
      autoRotate: view === 'orbit' ? state.autoRotate : false,
      selectedComponent: view === 'inspect' ? state.selectedComponent : null
    }));
  },

  toggleAutoRotate: () => {
    sound.playClick();
    set((state) => ({ autoRotate: !state.autoRotate }));
  },

  toggleImmersiveMode: () => {
    sound.playClick();
    set((state) => ({ immersiveMode: !state.immersiveMode }));
  },

  toggleVrMode: () => {
    sound.playClick();
    const nextVr = !get().vrMode;
    set({
      vrMode: nextVr,
      immersiveMode: nextVr ? true : get().immersiveMode
    });
  },

  setImmersiveMode: (val) => set({ immersiveMode: val }),
  setVrMode: (val) => set({ vrMode: val }),
  setVrCamera: (position, target) => set({
    vrCameraPosition: position,
    vrCameraTarget: target
  }),

  toggleMotor: (motorId) => {
    const currentState = get().activeMotors[motorId];
    const nextState = !currentState;
    
    sound.playClick();
    
    if (nextState) {
      sound.startMotorSound(motorId);
      // Mark motor as tested when toggled ON
      const motorIndex = parseInt(motorId.replace('motor', '')) - 1;
      if (!isNaN(motorIndex)) {
        get().setMotorTested(motorIndex, true);
      }
    } else {
      sound.stopMotorSound(motorId);
    }

    set((state) => ({
      activeMotors: {
        ...state.activeMotors,
        [motorId]: nextState
      },
      motorRPMs: {
        ...state.motorRPMs,
        [motorId]: nextState ? 48000 : 0
      }
    }));
  },

  testAllMotors: () => {
    sound.playClick();
    const active = get().activeMotors;
    const allOn = active.motor1 && active.motor2 && active.motor3 && active.motor4;
    
    if (allOn) {
      get().stopAllMotors();
    } else {
      sound.startMotorSound('motor1');
      sound.startMotorSound('motor2');
      sound.startMotorSound('motor3');
      sound.startMotorSound('motor4');
      
      set({
        activeMotors: {
          motor1: true,
          motor2: true,
          motor3: true,
          motor4: true,
        },
        motorRPMs: {
          motor1: 48000,
          motor2: 48000,
          motor3: 48000,
          motor4: 48000,
        }
      });
    }
  },

  stopAllMotors: () => {
    sound.stopAllMotors();
    set({
      activeMotors: {
        motor1: false,
        motor2: false,
        motor3: false,
        motor4: false,
      },
      motorRPMs: {
        motor1: 0,
        motor2: 0,
        motor3: 0,
        motor4: 0,
      }
    });
  },

  setShowRotationDirections: (show) => {
    sound.playClick();
    set({ showRotationDirections: show });
  },

  startLearning: () => set({
    currentMode: 'learning',
    learningStatus: 'identifying',
    guidedStep: 0,
    completedIdentifiers: [],
    selectedComponent: null,
    isolationMode: false,
    isExploded: false
  }),

  identifyComponent: (id) => {
    const { guidedQuestions, guidedStep, completedIdentifiers } = get();
    const targetId = guidedQuestions[guidedStep];
    
    if (id === targetId) {
      const nextStep = guidedStep + 1;
      const isFinished = nextStep >= guidedQuestions.length;
      
      set({
        completedIdentifiers: [...completedIdentifiers, id],
        selectedComponent: id, 
      });

      setTimeout(() => {
        if (isFinished) {
          set({ learningStatus: 'completed' });
        } else {
          set({ 
            guidedStep: nextStep,
            selectedComponent: null
          });
        }
      }, 1500);
      
      return true;
    }
    return false;
  },

  nextGuidedStep: () => set((state) => ({
    guidedStep: Math.min(state.guidedStep + 1, state.guidedQuestions.length - 1)
  })),

  resetGuided: () => set({
    guidedStep: 0,
    completedIdentifiers: [],
    learningStatus: 'idle',
    currentMode: 'explore',
    selectedComponent: null
  }),

  // --- FLIGHT SIMULATOR ACTIONS ---
  setFlightCameraView: (view) => {
    sound.playClick();
    set({ flightCameraView: view });
  },
  
  toggleTelemetryDashboard: () => {
    sound.playClick();
    set((state) => ({ showTelemetryDashboard: !state.showTelemetryDashboard }));
  },

  toggleControlsOverlay: () => {
    sound.playClick();
    set((state) => ({ showControlsOverlay: !state.showControlsOverlay }));
  },
  
  toggleAcademy: () => {
    sound.playClick();
    set((state) => ({ isAcademyOpen: !state.isAcademyOpen }));
  },

  toggleChecklist: () => {
    sound.playClick();
    set((state) => ({ showChecklist: !state.showChecklist }));
  },

  addNotification: (text, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      notifications: [...state.notifications, { id, text, type }]
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      }));
    }, 4000);
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },
  
  setFlightEnvironment: (env) => {
    sound.playClick();
    set({ flightEnvironment: env });
  },
  
  selectMission: (index) => {
    sound.playClick();
    if (index >= 0) {
      const levelIndex = [4, 6, 8, 7, 10].indexOf(index);
      if (levelIndex >= 0) {
        const isUnlocked = get().unlockedLevels[levelIndex];
        if (!isUnlocked) {
          console.warn(`Attempted to select locked mission index: ${index}`);
          return;
        }
      }
    }
    set({
      activeMissionIndex: index,
      missionStatus: index >= 0 ? 'active' : 'idle',
      missionObjectivesCompleted: []
    });
    
    syncHashFromState(get().currentMode, index);
  },
  
  setMissionStatus: (status) => set({ missionStatus: status }),
  
  setMissionObjectives: (completed) => set({ missionObjectivesCompleted: completed }),
  
  earnCertification: (earned) => {
    if (earned) {
      sound.playClick();
    }
    set({ certificationEarned: earned });
  },
  
  updateFlightTelemetry: (telemetry, warnings) => {
    // Generate digital twin serial telemetry UDP strings on the fly with XOR checksum!
    if (get().appLinkStatus === 'connected') {
      const timeStr = telemetry.flightTime.toFixed(2);
      const rollStr = telemetry.roll.toFixed(1);
      const pitchStr = telemetry.pitch.toFixed(1);
      const yawStr = telemetry.heading.toFixed(1);
      const altStr = telemetry.altitude.toFixed(2);
      const batStr = telemetry.battery.toString();
      
      const dataStr = `PXTWIN,${timeStr},${rollStr},${pitchStr},${yawStr},${altStr},${batStr}`;
      let checksum = 0;
      for (let i = 0; i < dataStr.length; i++) {
        checksum ^= dataStr.charCodeAt(i);
      }
      const csStr = checksum.toString(16).toUpperCase().padStart(2, '0');
      const packet = `$${dataStr}*${csStr}`;
      
      get().addTelemetryPacket(packet);
    }
    set({ telemetry, warnings });
  },

  // --- ACADEMY BENCH TEST ACTIONS ---
  updateStickInputTested: (input) => set((state) => ({
    stickInputsTested: {
      ...state.stickInputsTested,
      [input]: true
    }
  })),
  resetStickInputsTested: () => set({
    stickInputsTested: {
      throttleUp: false,
      throttleDown: false,
      rollLeft: false,
      rollRight: false,
      pitchForward: false,
      pitchBack: false,
      yawLeft: false,
      yawRight: false,
    }
  }),
  setMotorTested: (index, tested) => set((state) => {
    const copy = [...state.motorsTested];
    copy[index] = tested;
    return { motorsTested: copy };
  }),
  resetMotorsTested: () => set({ motorsTested: [false, false, false, false] }),
  addClickedPart: (part) => set((state) => {
    if (state.clickedParts.includes(part)) return {};
    return { clickedParts: [...state.clickedParts, part] };
  }),
  resetClickedParts: () => set({ clickedParts: [] }),

  // --- DIGITAL TWIN ACTIONS ---
  setAppLinkStatus: (status) => {
    sound.playClick();
    set({ appLinkStatus: status });
    if (status === 'disconnected') {
      set({ appTelemetryPackets: [] });
    }
  },

  addTelemetryPacket: (packet) => set((state) => {
    const nextQueue = [packet, ...state.appTelemetryPackets];
    if (nextQueue.length > 18) {
      nextQueue.pop(); // keep last 18 packets in circular buffer
    }
    return { appTelemetryPackets: nextQueue };
  }),

  clearTelemetryPackets: () => set({ appTelemetryPackets: [] }),

  // --- SPAWN & DIAGNOSTIC ACTIONS ---
  setModelLoadStatus: (status, error = null) => set({ modelLoadStatus: status, modelLoadError: error, droneInitFailed: status === 'failed' }),
  setModelDiagnostics: (diagnostics) => set({ modelDiagnostics: diagnostics }),
  setDroneSpawnDiagnostics: (diagnostics) => set({ droneSpawnDiagnostics: diagnostics }),
  setDroneInitFailed: (failed) => set({ droneInitFailed: failed }),
  toggleSpawnDebugMode: () => set((state) => ({ isSpawnDebugMode: !state.isSpawnDebugMode })),
  
  // --- LEVEL PROGRESSION & MODAL ACTIONS ---
  completeLevelAction: (levelIndex) => set((state) => {
    const nextLevels = [...state.unlockedLevels];
    if (levelIndex + 1 < nextLevels.length) {
      nextLevels[levelIndex + 1] = true;
    }
    return { unlockedLevels: nextLevels };
  }),
  setFlightSimModalOpen: (open) => {
    sound.playClick();
    set({ isFlightSimModalOpen: open });
  },
  setARActive: (active) => {
    sound.playClick();
    set({ isARActive: active });
  },
  setTheme: (theme) => {
    setSafeTheme(theme);
    if (typeof window !== 'undefined' && document.documentElement) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },
  toggleTheme: () => {
    sound.playClick();
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(nextTheme);
  }
}));

// Apply initial theme from localStorage on load
if (typeof window !== 'undefined' && document.documentElement) {
  const initialTheme = getSafeTheme();
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Fluctuates RPM of active diagnostic motors in Explore mode
if (typeof window !== 'undefined' && typeof (globalThis as any).vitest === 'undefined' && (globalThis as any).process?.env?.NODE_ENV !== 'test') {
  setInterval(() => {
    const state = useDroneStore.getState();
    if (state.currentMode === 'explore' || state.currentMode === 'learning') {
      let changed = false;
      const nextRPMs = { ...state.motorRPMs };
      
      (Object.keys(state.activeMotors) as (keyof MotorState)[]).forEach((motorId) => {
        const active = state.activeMotors[motorId];
        if (active) {
          const base = 48000;
          const target = base + Math.floor(Math.random() * 2000);
          nextRPMs[motorId] = Math.round(nextRPMs[motorId] + (target - nextRPMs[motorId]) * 0.4);
          changed = true;
        } else {
          if (nextRPMs[motorId] > 0) {
            nextRPMs[motorId] = 0;
            changed = true;
          }
        }
      });
      
      if (changed) {
        useDroneStore.setState({ motorRPMs: nextRPMs });
      }
    }
  }, 100);
}
