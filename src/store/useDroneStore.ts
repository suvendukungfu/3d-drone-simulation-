import { create } from 'zustand';
import { sound } from '../utils/soundController';

export type AppMode = 'explore' | 'inspect' | 'learning';
export type CameraView = 'orbit' | 'inspect' | 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

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

interface DroneState {
  // Mode & Interactions
  currentMode: AppMode;
  hoveredComponent: string | null;
  selectedComponent: string | null;
  isExploded: boolean;
  isolationMode: boolean;
  
  // Camera & Scene Settings
  cameraView: CameraView;
  autoRotate: boolean;
  immersiveMode: boolean;
  vrMode: boolean;
  vrCameraPosition: [number, number, number];
  vrCameraTarget: [number, number, number];
  
  // Motor Test Systems
  activeMotors: MotorState;
  motorRPMs: MotorRPMState;
  showRotationDirections: boolean;

  // Learning Workflow State
  guidedStep: number;
  completedIdentifiers: string[];
  guidedQuestions: string[];
  learningStatus: 'idle' | 'identifying' | 'completed';

  // Actions
  setMode: (mode: AppMode) => void;
  hoverComponent: (id: string | null) => void;
  selectComponent: (id: string | null) => void;
  toggleExploded: () => void;
  toggleIsolation: () => void;
  
  // Camera Actions
  setCameraView: (view: CameraView) => void;
  toggleAutoRotate: () => void;
  toggleImmersiveMode: () => void;
  toggleVrMode: () => void;
  setImmersiveMode: (val: boolean) => void;
  setVrMode: (val: boolean) => void;
  setVrCamera: (position: [number, number, number], target: [number, number, number]) => void;
  
  // Motor Test Actions
  toggleMotor: (motorId: keyof MotorState) => void;
  testAllMotors: () => void;
  stopAllMotors: () => void;
  setShowRotationDirections: (show: boolean) => void;

  // Learning Workflow Actions
  startLearning: () => void;
  identifyComponent: (id: string) => boolean;
  nextGuidedStep: () => void;
  resetGuided: () => void;
}

export const useDroneStore = create<DroneState>((set, get) => ({
  currentMode: 'explore',
  hoveredComponent: null,
  selectedComponent: null,
  isExploded: false,
  isolationMode: false,
  
  cameraView: 'orbit',
  autoRotate: false,
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

  setMode: (mode) => set({ 
    currentMode: mode, 
    selectedComponent: null,
    isolationMode: false,
    hoveredComponent: null,
    isExploded: false,
    cameraView: 'orbit',
    autoRotate: false,
    learningStatus: mode === 'learning' ? 'identifying' : 'idle'
  }),

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
    return { 
      selectedComponent: id,
      cameraView: id ? 'inspect' : 'orbit',
      isolationMode: id ? state.isolationMode : false 
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
  })
}));

// Periodically fluctuate RPM of active motors to simulate realistic micro-throttle PID corrections
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useDroneStore.getState();
    let changed = false;
    const nextRPMs = { ...state.motorRPMs };
    
    (Object.keys(state.activeMotors) as (keyof MotorState)[]).forEach((motorId) => {
      const active = state.activeMotors[motorId];
      if (active) {
        // Fluctuate between 48,000 and 50,000 RPM (average 49,000)
        const base = 48000;
        const target = base + Math.floor(Math.random() * 2000);
        
        // Lerp/smooth transition
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
  }, 100);
}
