import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useDroneStore } from '../../store/useDroneStore';
import { Award, CheckCircle, Circle, AlertCircle, Sparkles, Navigation, ChevronLeft, ChevronRight } from 'lucide-react';
import { MissionDef, Checkpoint } from '../../utils/drone/types';
import { SimulatorOrchestrator } from '../../utils/drone/SimulatorOrchestrator';

// Define the 11 guided academy modules
export const MISSIONS: MissionDef[] = [
  {
    title: 'Module 1: Drone Anatomy (Lab Bench)',
    description: 'Learn the primary hardware structure of the PlutoX nano-drone. Click on each of the designated components on the 3D model to inspect their functionality.',
    objectives: [
      'Inspect Canopy (Protective casing)',
      'Inspect Camera Module (FPV Video)',
      'Inspect Propeller Guards (Safety guards)',
      'Inspect Battery (Power source)',
      'Inspect Frame Structure (Chassis plate)'
    ],
    checkObjective: (_orchestrator, _currentStep, _state) => {
      const clicked = useDroneStore.getState().clickedParts;
      return [
        clicked.includes('canopy'),
        clicked.includes('cameraModule'),
        clicked.includes('propellerGuard'),
        clicked.includes('battery'),
        clicked.includes('frameStructure')
      ];
    }
  },
  {
    title: 'Module 2: Sensors & Electronics (Lab Bench)',
    description: 'Explore the silicon components driving the drone autopilot. Click the internal circuits in Exploded View to understand flight stabilization sensors.',
    objectives: [
      'Inspect Flight Controller IC (Autopilot Brain)',
      'Inspect IMU Sensor (Inertial Measurement Unit)',
      'Inspect Barometer (Altitude sensor)'
    ],
    checkObjective: (_orchestrator, _currentStep, _state) => {
      const clicked = useDroneStore.getState().clickedParts;
      return [
        clicked.includes('flightController'),
        clicked.includes('imuSensor'),
        clicked.includes('barometer')
      ];
    }
  },
  {
    title: 'Module 3: Transmitter Stick Check (Lab)',
    description: 'Test the visual RC transmitter stick limits on your console. Deflect all sticks using the keyboard to confirm control authority.',
    objectives: [
      'Deflect Throttle stick up/down (W / S keys)',
      'Deflect Yaw stick left/right (A / D keys)',
      'Deflect Pitch stick forward/back (ArrowUp / ArrowDown)',
      'Deflect Roll stick left/right (ArrowLeft / ArrowRight)'
    ],
    checkObjective: (_orchestrator, _currentStep, _state) => {
      const sticks = useDroneStore.getState().stickInputsTested;
      return [
        sticks.throttleUp && sticks.throttleDown,
        sticks.yawLeft && sticks.yawRight,
        sticks.pitchForward && sticks.pitchBack,
        sticks.rollLeft && sticks.rollRight
      ];
    }
  },
  {
    title: 'Module 4: Motor Mixer Diagnostic (Lab)',
    description: 'Verify CW and CCW motor directions. Run motor diagnostic spins from the sidebar panel to check mixer torque balance.',
    objectives: [
      'Test spin Motor 1 (Front-Left CW)',
      'Test spin Motor 2 (Front-Right CCW)',
      'Test spin Motor 3 (Rear-Left CCW)',
      'Test spin Motor 4 (Rear-Right CW)'
    ],
    checkObjective: (_orchestrator, _currentStep, _state) => {
      const motors = useDroneStore.getState().motorsTested;
      return [
        motors[0],
        motors[1],
        motors[2],
        motors[3]
      ];
    }
  },
  {
    title: 'Module 5: Arm & Disarm (Simulator)',
    description: 'Switch to the flight arena. Learn to safe and arm the PlutoX drone. Operating the arm switch is the critical first step of any flight.',
    objectives: [
      'Toggle SPACEBAR to ARM the drone',
      'Keep armed at idle speed for 3 seconds',
      'Toggle SPACEBAR again to DISARM the drone'
    ],
    checkObjective: (orchestrator, _currentStep, _state) => {
      const isArmed = orchestrator.telemetry.isArmed;
      const flightTime = orchestrator.telemetry.flightTime;
      const isCalibrated = orchestrator.sensors.isSensorCalibrated();
      
      const obj1 = isCalibrated && isArmed;
      const obj2 = isArmed && flightTime >= 3.0;
      const obj3 = !isArmed && flightTime >= 3.0;
      
      return [obj1, obj2, obj3];
    }
  },
  {
    title: 'Module 6: Takeoff Arena (Simulator)',
    description: 'Arm the drone and apply throttle (W) to liftoff. Climb smoothly and stabilize between 1.0 and 1.5 meters.',
    objectives: [
      'Arm the drone (Space)',
      'Increase throttle (W) to takeoff',
      'Climb and hold altitude above 1.0 meter'
    ],
    checkObjective: (orchestrator, _currentStep, _state) => {
      const isArmed = orchestrator.telemetry.isArmed;
      const altitude = orchestrator.telemetry.altitude;
      
      const obj1 = isArmed;
      const obj2 = isArmed && altitude > 0.15;
      const obj3 = isArmed && altitude >= 1.0;
      
      return [obj1, obj2, obj3];
    }
  },
  {
    title: 'Module 7: Hover Arena (Simulator)',
    description: 'Stabilize the drone inside the hover cylinder. Maintain altitude (1.0m to 1.5m) and keep within 1 meter of the landing pad.',
    objectives: [
      'Maintain altitude between 1.0m and 1.5m',
      'Hover within 1.0m radius of the launch pad',
      'Maintain position for 5 consecutive seconds'
    ],
    checkObjective: (orchestrator, _currentStep, state) => {
      const altitude = orchestrator.telemetry.altitude;
      const distance = new THREE.Vector2(state.position.x, state.position.z).length();
      
      const inAltRange = altitude >= 0.95 && altitude <= 1.55;
      const inPosRange = distance <= 1.05;
      
      return [inAltRange, inPosRange, false]; // Handled by component timer
    }
  },
  {
    title: 'Module 8: Yaw Arena (Simulator)',
    description: 'Test your heading authority. While hovering at 1.0 meter, use A and D to rotate the drone to face North, East, South, and West.',
    objectives: [
      'Maintain altitude above 0.8 meters',
      'Face North (Heading 0° / 360°)',
      'Rotate to face East (Heading 90°)',
      'Rotate to face South (Heading 180°)',
      'Rotate to face West (Heading 270°)'
    ],
    checkObjective: (orchestrator, _currentStep, _state) => {
      const altitude = orchestrator.telemetry.altitude;
      const heading = orchestrator.telemetry.heading;
      
      const obj1 = altitude >= 0.8;
      const obj2 = heading < 18 || heading > 342; // North
      const obj3 = heading >= 72 && heading <= 108; // East
      const obj4 = heading >= 162 && heading <= 198; // South
      const obj5 = heading >= 252 && heading <= 288; // West
      
      return [obj1, obj2, obj3, obj4, obj5];
    }
  },
  {
    title: 'Module 9: Translation Arena (Simulator)',
    description: 'Fly using Pitch/Roll keys. Climb to 1.0m, navigate to the forward waypoint (3m ahead) and return back to the home base.',
    objectives: [
      'Climb and hover above 0.8 meters',
      'Reach the forward waypoint (3.0m in front)',
      'Fly back and hover within 0.8m of home pad'
    ],
    checkpoints: [
      { id: 'waypoint1', position: [0.0, 1.2, 3.0], radius: 0.5, passed: false }
    ],
    checkObjective: (orchestrator, _currentStep, _state) => {
      const altitude = orchestrator.telemetry.altitude;
      const obj1 = altitude >= 0.8;
      return [obj1, false, false]; // Rest handled in timer loop
    }
  },
  {
    title: 'Module 10: Obstacle Arena (Simulator)',
    description: 'Test your pathfinding skills. Fly the PlutoX through 3 elevated neon ring gates placed in the arena.',
    objectives: [
      'Fly through Gate 1 (Left)',
      'Fly through Gate 2 (Center)',
      'Fly through Gate 3 (Right)'
    ],
    checkpoints: [
      { id: 'gate1_hoop', position: [-2.5, 1.2, -2.5], radius: 0.65, passed: false },
      { id: 'gate2_hoop', position: [0.0, 1.8, 3.5], radius: 0.65, passed: false },
      { id: 'gate3_hoop', position: [2.5, 1.2, -2.5], radius: 0.65, passed: false }
    ],
    checkObjective: (_orchestrator, _currentStep, _state) => {
      return [false, false, false]; // Handled by checkpoints
    }
  },
  {
    title: 'Module 11: Certification Assessment (Sim)',
    description: 'The ultimate flight test. Under a 60-second limit, take off, navigate all 3 Gates in order, and land safely on the target pad.',
    objectives: [
      'Pass Gate 1, Gate 2, and Gate 3 in order',
      'Land on the TARGET landing pad',
      'Complete all objectives within 60 seconds'
    ],
    checkpoints: [
      { id: 'gate1_hoop', position: [-2.5, 1.2, -2.5], radius: 0.65, passed: false },
      { id: 'gate2_hoop', position: [0.0, 1.8, 3.5], radius: 0.65, passed: false },
      { id: 'gate3_hoop', position: [2.5, 1.2, -2.5], radius: 0.65, passed: false }
    ],
    checkObjective: (_orchestrator, _currentStep, _state) => {
      return [false, false, false]; // Handled by checkpoints
    }
  }
];

export function TrainingMissionSystem({ 
  orchestrator, 
  onCheckpointsUpdated 
}: { 
  orchestrator: SimulatorOrchestrator; 
  onCheckpointsUpdated: (cps: Checkpoint[]) => void 
}) {
  const activeMissionIndex = useDroneStore((state) => state.activeMissionIndex);
  const selectMission = useDroneStore((state) => state.selectMission);
  const missionStatus = useDroneStore((state) => state.missionStatus);
  const setMissionStatus = useDroneStore((state) => state.setMissionStatus);
  const telemetry = useDroneStore((state) => state.telemetry);
  const certificationEarned = useDroneStore((state) => state.certificationEarned);
  const earnCertification = useDroneStore((state) => state.earnCertification);
  const isAcademyOpen = useDroneStore((state) => state.isAcademyOpen);
  const toggleAcademy = useDroneStore((state) => state.toggleAcademy);
  const droneInitFailed = useDroneStore((state) => state.droneInitFailed);
  
  // Bench states
  const stickInputsTested = useDroneStore((state) => state.stickInputsTested);
  const motorsTested = useDroneStore((state) => state.motorsTested);
  const activeMotors = useDroneStore((state) => state.activeMotors);
  const toggleMotor = useDroneStore((state) => state.toggleMotor);
  const resetClickedParts = useDroneStore((state) => state.resetClickedParts);
  const resetStickInputsTested = useDroneStore((state) => state.resetStickInputsTested);
  const resetMotorsTested = useDroneStore((state) => state.resetMotorsTested);

  const [objectives, setObjectives] = useState<boolean[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const hoverTimer = useRef(0.0);
  const targetCompletedRef = useRef<boolean[]>([]);
  
  // Mission 11 (Certification) Timer
  const [examTimer, setExamTimer] = useState(60);
  const examTimerRef = useRef<any>(null);

  // Keyboard listener for Module 3 Stick Checks
  useEffect(() => {
    if (activeMissionIndex !== 2 || missionStatus !== 'active') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const updateStick = useDroneStore.getState().updateStickInputTested;
      
      if (key === 'w') updateStick('throttleUp');
      if (key === 's') updateStick('throttleDown');
      if (key === 'a') updateStick('yawLeft');
      if (key === 'd') updateStick('yawRight');
      if (e.key === 'ArrowUp' || key === 'i') updateStick('pitchForward');
      if (e.key === 'ArrowDown' || key === 'k') updateStick('pitchBack');
      if (e.key === 'ArrowLeft' || key === 'j') updateStick('rollLeft');
      if (e.key === 'ArrowRight' || key === 'l') updateStick('rollRight');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMissionIndex, missionStatus]);

  // Reset bench state when starting specific modules
  useEffect(() => {
    if (activeMissionIndex === 0 || activeMissionIndex === 1) {
      resetClickedParts();
    } else if (activeMissionIndex === 2) {
      resetStickInputsTested();
    } else if (activeMissionIndex === 3) {
      resetMotorsTested();
      useDroneStore.getState().stopAllMotors();
    }
  }, [activeMissionIndex]);

  // Initialize mission checkpoints and states on selection
  useEffect(() => {
    if (activeMissionIndex >= 0) {
      const mission = MISSIONS[activeMissionIndex];
      const initialObjs = new Array(mission.objectives.length).fill(false);
      setObjectives(initialObjs);
      targetCompletedRef.current = initialObjs;
      
      const cps = mission.checkpoints ? JSON.parse(JSON.stringify(mission.checkpoints)) : [];
      setCheckpoints(cps);
      onCheckpointsUpdated(cps);
      hoverTimer.current = 0.0;
      
      // Start countdown timer for Module 11 (Certification)
      if (activeMissionIndex === 10) {
        setExamTimer(60);
        if (examTimerRef.current) clearInterval(examTimerRef.current);
        examTimerRef.current = setInterval(() => {
          setExamTimer(t => {
            if (t <= 1) {
              clearInterval(examTimerRef.current);
              setMissionStatus('failed');
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      } else {
        if (examTimerRef.current) {
          clearInterval(examTimerRef.current);
          examTimerRef.current = null;
        }
      }
    } else {
      setObjectives([]);
      setCheckpoints([]);
      onCheckpointsUpdated([]);
      if (examTimerRef.current) {
        clearInterval(examTimerRef.current);
        examTimerRef.current = null;
      }
    }
    
    return () => {
      if (examTimerRef.current) clearInterval(examTimerRef.current);
    };
  }, [activeMissionIndex, selectMission, onCheckpointsUpdated, setMissionStatus]);

  // Periodic objective evaluation
  useEffect(() => {
    if (activeMissionIndex < 0 || missionStatus !== 'active') return;

    const interval = setInterval(() => {
      const physState = orchestrator.getPhysicsState();
      const mission = MISSIONS[activeMissionIndex];
      const currentObjs = [...targetCompletedRef.current];

      // A. Evaluate general logic objectives
      const baseCheck = mission.checkObjective(orchestrator, activeMissionIndex, physState);
      baseCheck.forEach((val, idx) => {
        if (val) currentObjs[idx] = true;
      });

      // B. Evaluate Checkpoint Collisions (Only for simulator flight modules 9, 10, 11)
      let checkpointsChanged = false;
      const updatedCheckpoints = checkpoints.map((cp) => {
        if (cp.passed) return cp;
        
        const cpPos = new THREE.Vector3(...cp.position);
        const distance = physState.position.distanceTo(cpPos);
        
        if (distance <= cp.radius) {
          checkpointsChanged = true;
          return { ...cp, passed: true };
        }
        return cp;
      });

      if (checkpointsChanged) {
        setCheckpoints(updatedCheckpoints);
        onCheckpointsUpdated(updatedCheckpoints);
      }

      // C. Mission-Specific Custom Timers / Logic
      const currentAltitude = telemetry.altitude;
      
      // Module 7: 5 Seconds Hover check
      if (activeMissionIndex === 6) {
        const distFromMat = new THREE.Vector2(physState.position.x, physState.position.z).length();
        const hoverOk = currentAltitude >= 0.95 && currentAltitude <= 1.55 && distFromMat <= 1.05;
        
        if (hoverOk && telemetry.isArmed) {
          hoverTimer.current += 0.2;
          if (hoverTimer.current >= 5.0) {
            currentObjs[2] = true;
          }
        } else {
          hoverTimer.current = 0.0;
        }
      }

      // Module 9: Waypoint checks
      if (activeMissionIndex === 8) {
        if (updatedCheckpoints[0].passed) {
          currentObjs[1] = true;
        }
        const returnedMat = distanceToBase(physState) < 0.65 && currentAltitude >= 0.8;
        if (updatedCheckpoints[0].passed && returnedMat) {
          currentObjs[2] = true;
        }
      }

      // Module 10: Obstacles
      if (activeMissionIndex === 9) {
        currentObjs[0] = updatedCheckpoints[0].passed;
        currentObjs[1] = updatedCheckpoints[1].passed;
        currentObjs[2] = updatedCheckpoints[2].passed;
      }

      // Module 11: Certification test
      if (activeMissionIndex === 10) {
        currentObjs[0] = updatedCheckpoints.every(c => c.passed);
        
        const touchedDown = currentAltitude <= 0.05 && !telemetry.isArmed;
        const targetMat = new THREE.Vector2(3.0, 3.5);
        const distTarget = new THREE.Vector2(physState.position.x, physState.position.z).distanceTo(targetMat);
        
        if (touchedDown && distTarget <= 0.65 && !orchestrator.getWarnings().includes('HARD LANDING')) {
          currentObjs[1] = true;
        }
        
        if (examTimer > 0) {
          currentObjs[2] = true;
        }
      }

      // Update State
      setObjectives(currentObjs);
      targetCompletedRef.current = currentObjs;

      // D. Verify if all objectives are completed
      const allCompleted = currentObjs.every(obj => obj);
      if (allCompleted) {
        setMissionStatus('passed');
        clearInterval(interval);
        if (examTimerRef.current) clearInterval(examTimerRef.current);
        
        // Award Pilot Certification upon Module 11 completion!
        if (activeMissionIndex === 10) {
          earnCertification(true);
        }
      }
      
      // If drone crashed or boundary warning disarms it, fail the active flight mission (Modules 5-11)
      const isCrashed = orchestrator.getWarnings().includes('CRASH DETECTED') || orchestrator.getWarnings().includes('HARD LANDING');
      if (isCrashed && activeMissionIndex >= 4) {
        setMissionStatus('failed');
        clearInterval(interval);
        if (examTimerRef.current) clearInterval(examTimerRef.current);
      }

    }, 200);

    return () => clearInterval(interval);
  }, [activeMissionIndex, checkpoints, missionStatus, examTimer, earnCertification, telemetry.isArmed, telemetry.altitude]);

  const handleNextMission = () => {
    if (activeMissionIndex < 10) {
      selectMission(activeMissionIndex + 1);
    }
  };

  const handleRestartMission = () => {
    if (activeMissionIndex >= 4) {
      orchestrator.reset();
    } else {
      if (activeMissionIndex === 0 || activeMissionIndex === 1) resetClickedParts();
      else if (activeMissionIndex === 2) resetStickInputsTested();
      else if (activeMissionIndex === 3) resetMotorsTested();
    }
    selectMission(activeMissionIndex);
  };

  const distanceToBase = (state: any) => {
    return new THREE.Vector2(state.position.x, state.position.z).length();
  };

  const firstUncompletedIdx = objectives.findIndex(completed => !completed);

  return (
    <div className={`absolute top-0 left-0 bottom-0 w-[320px] bg-slate-950/80 backdrop-blur-md border-r border-slate-800/80 h-full flex flex-col justify-between p-5 z-20 transition-transform duration-300 ease-in-out pointer-events-auto ${
      isAcademyOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      
      {/* Vertical Toggle Tab sticking out on the right edge */}
      <button
        onClick={toggleAcademy}
        className="absolute top-1/2 -right-8 -translate-y-1/2 w-8 h-24 bg-slate-950/90 hover:bg-slate-900 backdrop-blur-md border-y border-r border-slate-800/80 rounded-r-xl flex flex-col items-center justify-center gap-1 group transition-all duration-300 cursor-pointer shadow-[6px_0_15px_rgba(0,0,0,0.5)] z-30"
        title={isAcademyOpen ? "Collapse Academy Panel (TAB)" : "Expand Academy Panel (TAB)"}
      >
        <Award className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors animate-pulse" />
        {isAcademyOpen ? (
          <ChevronLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 animate-bounce" style={{ animationDuration: '1.5s' }} />
        )}
        <span className="text-[7px] font-mono font-bold tracking-widest text-slate-500 group-hover:text-blue-400 [writing-mode:vertical-lr] rotate-180 uppercase select-none mt-1">
          {isAcademyOpen ? "HIDE" : "SHOW"}
        </span>
      </button>

      <div className="space-y-6 flex-1 overflow-y-auto pr-1 scrollbar-thin">
        
        {/* Title */}
        <div className="flex justify-between items-center border-b border-slate-850 pb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4.5 h-4.5 text-blue-400" />
            UAV Flight Academy
          </h2>
        </div>

        {/* 1. MISSION LIST */}
        {activeMissionIndex < 0 ? (
          <div className="space-y-2.5">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase block mb-1">
              Select Lesson
            </span>
            <div className="space-y-1.5">
              {MISSIONS.map((mission, idx) => (
                <button
                  key={idx}
                  onClick={() => selectMission(idx)}
                  disabled={droneInitFailed}
                  className="w-full text-left p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-850/80 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-3 disabled:opacity-40 disabled:hover:bg-slate-900/40 disabled:hover:text-slate-500 disabled:border-slate-900 disabled:cursor-not-allowed"
                >
                  <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="font-semibold uppercase tracking-wide truncate">{mission.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* 2. ACTIVE LESSON DETAIL PANEL */
          <div className="space-y-5">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850">
              <span className="text-[9px] text-blue-400 font-mono tracking-widest uppercase">
                Active Training Module
              </span>
              <h3 className="text-sm font-bold text-white uppercase mt-1 leading-snug">
                {MISSIONS[activeMissionIndex].title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-light mt-2 animate-fade-in">
                {MISSIONS[activeMissionIndex].description}
              </p>
              
              {/* Progress Bar */}
              {(() => {
                const completedCount = objectives.filter(Boolean).length;
                const totalCount = objectives.length;
                const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                return (
                  <div className="mt-3 pt-3 border-t border-slate-800/40 space-y-1.5">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>MODULE PROGRESS</span>
                      <span className="text-blue-400 font-bold">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850/60">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
              
              {activeMissionIndex === 10 && missionStatus === 'active' && (
                <div className="mt-3.5 bg-red-950/20 border border-red-500/20 p-2 rounded-lg flex items-center justify-between font-mono">
                  <span className="text-[10px] text-red-400">TIME REMAINING:</span>
                  <span className="text-xs font-bold text-red-500 animate-pulse">{examTimer}s</span>
                </div>
              )}
            </div>

            {/* Visual widgets for Bench Diagnostics */}
            {activeMissionIndex === 2 && (
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-3 mt-2">
                <span className="text-[9px] text-amber-400 font-mono tracking-widest uppercase block">
                  Visual Transmitter Check
                </span>
                <div className="flex justify-around items-center gap-3">
                  {/* Left Stick (Throttle & Yaw) */}
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-slate-500 font-mono uppercase mb-1">Left (W/S, A/D)</span>
                    <div className="w-16 h-16 bg-slate-950 rounded-lg relative border border-slate-800 flex items-center justify-center">
                      <div className="absolute w-px h-full bg-slate-900/60"></div>
                      <div className="absolute h-px w-full bg-slate-900/60"></div>
                      <div 
                        className="absolute w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                        style={{
                          transform: `translate(${
                            (stickInputsTested.yawRight ? 18 : stickInputsTested.yawLeft ? -18 : 0)
                          }px, ${
                            (stickInputsTested.throttleUp ? -18 : stickInputsTested.throttleDown ? 18 : 0)
                          }px)`
                        }}
                      />
                    </div>
                    <div className="flex gap-2 text-[8px] font-mono text-slate-500 mt-1">
                      <span className={stickInputsTested.yawLeft && stickInputsTested.yawRight ? 'text-emerald-400 font-bold' : ''}>YAW</span>
                      <span className={stickInputsTested.throttleUp && stickInputsTested.throttleDown ? 'text-emerald-400 font-bold' : ''}>THR</span>
                    </div>
                  </div>
                  {/* Right Stick (Pitch & Roll) */}
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-slate-500 font-mono uppercase mb-1">Right (Arrows)</span>
                    <div className="w-16 h-16 bg-slate-950 rounded-lg relative border border-slate-800 flex items-center justify-center">
                      <div className="absolute w-px h-full bg-slate-900/60"></div>
                      <div className="absolute h-px w-full bg-slate-900/60"></div>
                      <div 
                        className="absolute w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                        style={{
                          transform: `translate(${
                            (stickInputsTested.rollRight ? 18 : stickInputsTested.rollLeft ? -18 : 0)
                          }px, ${
                            (stickInputsTested.pitchForward ? -18 : stickInputsTested.pitchBack ? 18 : 0)
                          }px)`
                        }}
                      />
                    </div>
                    <div className="flex gap-2 text-[8px] font-mono text-slate-500 mt-1">
                      <span className={stickInputsTested.rollLeft && stickInputsTested.rollRight ? 'text-emerald-400 font-bold' : ''}>ROLL</span>
                      <span className={stickInputsTested.pitchForward && stickInputsTested.pitchBack ? 'text-emerald-400 font-bold' : ''}>PITCH</span>
                    </div>
                  </div>
                </div>
                <p className="text-[8px] text-slate-500 leading-relaxed font-light text-center">
                  Press keys to deflect sticks and confirm limits.
                </p>
              </div>
            )}

            {activeMissionIndex === 3 && (
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-3 mt-2">
                <span className="text-[9px] text-orange-400 font-mono tracking-widest uppercase block">
                  Motor Mixer Diagnostics
                </span>
                <div className="grid grid-cols-2 gap-3 justify-items-center relative p-2">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-800/40 -translate-y-1/2"></div>
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-800/40 -translate-x-1/2"></div>
                  
                  <button
                    onClick={() => toggleMotor('motor1')}
                    className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center transition-all ${
                      activeMotors.motor1 
                        ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.3)] font-bold' 
                        : motorsTested[0]
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="text-[9px] font-bold">M1</span>
                    <span className="text-[7px] font-mono uppercase">FL (CW)</span>
                  </button>

                  <button
                    onClick={() => toggleMotor('motor2')}
                    className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center transition-all ${
                      activeMotors.motor2 
                        ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.3)] font-bold' 
                        : motorsTested[1]
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="text-[9px] font-bold">M2</span>
                    <span className="text-[7px] font-mono uppercase">FR (CCW)</span>
                  </button>

                  <button
                    onClick={() => toggleMotor('motor3')}
                    className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center transition-all ${
                      activeMotors.motor3 
                        ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.3)] font-bold' 
                        : motorsTested[2]
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="text-[9px] font-bold">M3</span>
                    <span className="text-[7px] font-mono uppercase">RL (CCW)</span>
                  </button>

                  <button
                    onClick={() => toggleMotor('motor4')}
                    className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center transition-all ${
                      activeMotors.motor4 
                        ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.3)] font-bold' 
                        : motorsTested[3]
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="text-[9px] font-bold">M4</span>
                    <span className="text-[7px] font-mono uppercase">RR (CW)</span>
                  </button>
                </div>
                <p className="text-[8px] text-slate-500 leading-relaxed font-light text-center">
                  Click a motor node to spin-test in diagnostics.
                </p>
              </div>
            )}

            {/* Objectives list */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase block mb-1">
                Lesson Objectives
              </span>
              
              <div className="space-y-2">
                {MISSIONS[activeMissionIndex].objectives.map((obj, idx) => {
                  const completed = objectives[idx];
                  const isFirstUncompleted = idx === firstUncompletedIdx;
                  
                  // Handle custom timer string display on Module 7 Hover
                  let label = obj;
                  if (activeMissionIndex === 6 && idx === 2 && hoverTimer.current > 0 && hoverTimer.current < 5.0) {
                    label = `${obj} (${hoverTimer.current.toFixed(1)}s)`;
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-3 items-start p-3 rounded-lg border text-xs leading-relaxed transition-all duration-300 ${
                        completed
                          ? 'bg-emerald-950/15 border-emerald-500/30 text-emerald-300'
                          : isFirstUncompleted
                            ? 'bg-blue-950/25 border-blue-500 text-slate-200 shadow-[0_0_12px_rgba(0,163,255,0.15)] animate-pulse'
                            : 'bg-slate-900/20 border-slate-850 text-slate-400'
                      }`}
                    >
                      {completed ? (
                        <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : isFirstUncompleted ? (
                        <Circle className="w-4.5 h-4.5 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 text-slate-700 shrink-0 mt-0.5" />
                      )}
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checkpoint Status Indicator */}
            {checkpoints.length > 0 && (
              <div className="bg-slate-900/20 p-3 rounded-lg border border-slate-850/80 space-y-2">
                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-slate-500" />
                  Flight Checkpoints
                </span>
                <div className="flex gap-2">
                  {checkpoints.map((cp, idx) => (
                    <div 
                      key={cp.id} 
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border ${
                        cp.passed 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                      title={cp.id}
                    >
                      {idx + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mission status prompts */}
            {missionStatus === 'passed' && (
              <div className="bg-emerald-950/20 border border-emerald-500/40 p-4 rounded-xl flex flex-col items-center text-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-400 animate-bounce" />
                <h4 className="text-sm font-bold text-emerald-300 uppercase">Lesson Completed!</h4>
                <p className="text-xs text-slate-400">Lesson cleared. You are ready to advance.</p>
                <div className="w-full mt-1">
                  {activeMissionIndex < 10 ? (
                    <button
                      onClick={handleNextMission}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase shadow-md shadow-emerald-700/20 text-center transition-colors duration-300"
                    >
                      Next Lesson
                    </button>
                  ) : (
                    <button
                      onClick={() => selectMission(-1)}
                      className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase text-center transition-colors duration-300"
                    >
                      Main Menu
                    </button>
                  )}
                </div>
              </div>
            )}

            {missionStatus === 'failed' && (
              <div className="bg-red-950/20 border border-red-500/40 p-4 rounded-xl flex flex-col items-center text-center gap-2">
                <AlertCircle className="w-8 h-8 text-red-400 animate-pulse" />
                <h4 className="text-sm font-bold text-red-300 uppercase">Lesson Failed</h4>
                <p className="text-xs text-slate-400">Failed check, triggered crash, or timed out.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. FINAL PILOT CERTIFICATION DISPLAY */}
      {certificationEarned && activeMissionIndex === -1 && (
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500 p-5 rounded-2xl flex flex-col items-center text-center relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.15)] mt-4">
          <div className="absolute -right-4 -top-4 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl"></div>
          <Sparkles className="w-8 h-8 text-emerald-400 animate-bounce mb-2" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            PlutoX UAV Certification
          </h3>
          <p className="text-[10px] text-slate-400 leading-relaxed font-light mt-1.5">
            Congratulations! You have completed all 11 training modules and passed the certification exam.
          </p>
          <div className="border border-emerald-500/20 bg-emerald-950/10 py-1.5 px-3 rounded-lg text-[9px] font-mono text-emerald-400 mt-3.5 uppercase tracking-widest font-bold">
            UAV PILOT CERTIFIED
          </div>
          <button 
            onClick={() => earnCertification(false)}
            className="text-[9px] font-mono text-slate-500 uppercase tracking-widest hover:text-slate-300 mt-4 underline decoration-slate-700 decoration-dotted"
          >
            Clear Certificate
          </button>
        </div>
      )}

      {/* Persistent Restart & Abort Controls at bottom when inside a lesson */}
      {activeMissionIndex >= 0 && (
        <div className="pt-4 mt-4 border-t border-slate-900 flex gap-2">
          <button
            onClick={handleRestartMission}
            className="flex-1 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:text-white rounded-lg text-slate-400 text-xs font-bold uppercase tracking-wider transition-all duration-300"
          >
            Restart Module
          </button>
          <button
            onClick={() => selectMission(-1)}
            className="flex-1 py-2 border border-red-950 bg-red-950/20 hover:bg-red-900/30 rounded-lg text-red-400 text-xs font-bold uppercase tracking-wider transition-all duration-300"
          >
            Abort
          </button>
        </div>
      )}

      {/* Bottom Brand */}
      {activeMissionIndex < 0 && (
        <div className="text-[8px] font-mono text-slate-600 uppercase tracking-widest pt-4 border-t border-slate-900">
          UAV Flight Academy v2.0.0
        </div>
      )}
    </div>
  );
}
