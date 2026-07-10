import React, { useRef, useEffect } from 'react';
import { useDroneStore } from '../../store/useDroneStore';
import { SimulatorOrchestrator } from '../../utils/drone/SimulatorOrchestrator';

interface JoystickProps {
  side: 'left' | 'right';
  onChange: (x: number, y: number) => void;
  label: string;
  disabled?: boolean;
}

const Joystick = ({ side, onChange, label, disabled }: JoystickProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.TouchEvent | TouchEvent | React.MouseEvent | MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    if (!containerRef.current || !stickRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2;

    let clientX, clientY;

    if ('touches' in e || 'targetTouches' in e) {
      // Use targetTouches to isolate touch points per joystick, fallback to touches
      const touch = (e as TouchEvent).targetTouches[0] || (e as TouchEvent).touches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      if (e.buttons !== 1) return; // Only process if left click is held down
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Independent clamping for X and Y so inputs don't interfere
    let dx = clientX - centerX;
    let dy = clientY - centerY;

    dx = Math.max(-maxRadius, Math.min(maxRadius, dx));
    dy = Math.max(-maxRadius, Math.min(maxRadius, dy));

    stickRef.current.style.transform = `translate(${dx}px, ${dy}px)`;

    // Normalize values between -1 and 1
    const nx = dx / maxRadius;
    const ny = -(dy / maxRadius); // Invert Y so up is positive

    onChange(nx, ny);
  };

  const handleEnd = (e: React.TouchEvent | TouchEvent | React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    if (stickRef.current) {
      stickRef.current.style.transform = `translate(0px, 0px)`;
    }
    onChange(0, 0); // Reset to center
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use non-passive listeners so we can call preventDefault() and stop browser scrolling/zooming
    container.addEventListener('touchmove', handleMove, { passive: false });
    container.addEventListener('touchend', handleEnd, { passive: false });
    container.addEventListener('touchcancel', handleEnd, { passive: false });

    return () => {
      container.removeEventListener('touchmove', handleMove);
      container.removeEventListener('touchend', handleEnd);
      container.removeEventListener('touchcancel', handleEnd);
    };
  }, []);

  return (
    <div className={`flex flex-col items-center pointer-events-auto joystick-${side}`}>
      <span className="text-[9px] text-slate-400 dark:text-slate-550 font-mono font-bold mb-2 uppercase tracking-widest bg-slate-900/50 dark:bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
        {label}
      </span>
      <div
        ref={containerRef}
        className={`pluto-joystick-outer ${disabled ? 'opacity-40 select-none' : ''}`}
        onMouseDown={handleMove}
        onMouseMove={(e) => e.buttons === 1 && handleMove(e)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleMove}
      >
        {/* Vector Outer Ring, Guidelines, and Cardinal Indicators */}
        <svg className="absolute w-full h-full pointer-events-none" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
          {/* Clean solid outer guide ring */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="#8a94a6" strokeWidth="3" />

          {/* Specific Side Decorations */}
          {side === 'left' ? (
            <>
              {/* Throttle Chevrons (Top & Bottom) */}
              <path d="M 40,21 L 50,14 L 60,21" fill="none" stroke="#8a94a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 40,27 L 50,20 L 60,27" fill="none" stroke="#8a94a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              <path d="M 40,79 L 50,86 L 60,79" fill="none" stroke="#8a94a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 40,73 L 50,80 L 60,73" fill="none" stroke="#8a94a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Yaw curved arrows (Left & Right) */}
              <path d="M 30,52 A 6.5,6.5 0 0,0 23,47" fill="none" stroke="#8a94a6" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 27,44 L 23,47 L 24,52" fill="none" stroke="#8a94a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

              <path d="M 70,52 A 6.5,6.5 0 0,1 77,47" fill="none" stroke="#8a94a6" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 73,44 L 77,47 L 76,52" fill="none" stroke="#8a94a6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : (
            <>
              {/* 4 outward-pointing triangles (cardinals) */}
              <polygon points="50,2 45,8 55,8" fill="#8a94a6" />
              <polygon points="50,98 45,92 55,92" fill="#8a94a6" />
              <polygon points="2,50 8,45 8,55" fill="#8a94a6" />
              <polygon points="98,50 92,45 92,55" fill="#8a94a6" />
            </>
          )}
        </svg>

        {/* Joystick Handle Wrapper */}
        <div
          ref={stickRef}
          className="pluto-joystick-handle-wrapper"
          style={{ transition: 'transform 0.08s ease-out' }}
        >
          {/* White control knob with the thick orange-pink gradient border */}
          <div className="pluto-joystick-handle-gradient-ring">
            <div className="pluto-joystick-handle-white-knob" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function VirtualJoysticks({ orchestrator }: { orchestrator?: SimulatorOrchestrator }) {
  const currentMode = useDroneStore((state) => state.currentMode);
  const updateStickInputTested = useDroneStore((state) => state.updateStickInputTested);
  const gyroPilot = useDroneStore((state) => state.gyroPilot);

  const isARActive = useDroneStore((state) => state.isARActive);

  const leftStick = useRef({ x: 0, y: 0 });
  const rightStick = useRef({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      orchestrator?.input.clearAnalogInput();
    };
  }, [orchestrator]);

  const flightEnvironment = useDroneStore((state) => state.flightEnvironment);
  const closedEnvs = ['room', 'lab', 'classroom', 'warehouse'] as const;
  const isClosedSim = closedEnvs.includes(flightEnvironment as any);

  if (currentMode !== 'flight' || isARActive || isClosedSim) return null;

  const handleLeftStick = (nx: number, ny: number) => {
    leftStick.current = { x: nx, y: ny };
    
    // Pass analog values directly to the input system
    orchestrator?.input.setAnalogStickValues(
      leftStick.current.x,
      leftStick.current.y,
      rightStick.current.x,
      rightStick.current.y
    );

    // Y-axis: Throttle Up (w) / Down (s)
    if (ny > 0.25) {
      updateStickInputTested('throttleUp');
    } else if (ny < -0.25) {
      updateStickInputTested('throttleDown');
    }

    // X-axis: Yaw Left (a) / Right (d)
    if (nx > 0.25) {
      updateStickInputTested('yawRight');
    } else if (nx < -0.25) {
      updateStickInputTested('yawLeft');
    }
  };

  const handleRightStick = (nx: number, ny: number) => {
    rightStick.current = { x: nx, y: ny };
    
    // Pass analog values directly to the input system
    orchestrator?.input.setAnalogStickValues(
      leftStick.current.x,
      leftStick.current.y,
      rightStick.current.x,
      rightStick.current.y
    );

    // Y-axis: Pitch Forward (ArrowUp) / Back (ArrowDown)
    if (ny > 0.25) {
      updateStickInputTested('pitchForward');
    } else if (ny < -0.25) {
      updateStickInputTested('pitchBack');
    }

    // X-axis: Roll Left (ArrowLeft) / Right (ArrowRight)
    if (nx > 0.25) {
      updateStickInputTested('rollRight');
    } else if (nx < -0.25) {
      updateStickInputTested('rollLeft');
    }
  };

  return (
    <div className="virtual-joysticks select-none flex justify-between items-end">
      {/* Left Group: Joystick + ARM Button */}
      <div className="flex items-end gap-3 pointer-events-auto">
        <Joystick side="left" onChange={handleLeftStick} label="YAW / THROTTLE" />
        <button 
          onClick={() => {
            if (orchestrator) {
              if (orchestrator.getIsArmed()) {
                orchestrator.disarm();
              } else {
                orchestrator.arm();
              }
            } else {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
            }
          }}
          className="w-12 h-12 rounded-full bg-red-600/85 hover:bg-red-500 border border-red-400/50 shadow-[0_0_12px_rgba(220,38,38,0.5)] flex flex-col items-center justify-center font-bold text-[8px] text-white active:scale-95 transition-transform uppercase tracking-wider leading-none mb-1"
        >
          <span>ARM</span>
          <span className="text-[6px] opacity-70 mt-0.5">SPACE</span>
        </button>
      </div>
      
      {/* Right Group: RESET Button + Joystick */}
      <div className="flex items-end gap-3 pointer-events-auto">
        <button 
          onClick={() => {
            if (orchestrator) {
              orchestrator.reset();
            } else {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
            }
          }}
          className="w-12 h-12 rounded-full bg-slate-800/85 hover:bg-slate-700 border border-slate-700/50 shadow-[0_0_8px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center font-bold text-[8px] text-slate-300 active:scale-95 transition-transform uppercase tracking-wider leading-none mb-1"
        >
          <span>RESET</span>
          <span className="text-[5px] opacity-70 mt-0.5">R KEY</span>
        </button>
        <Joystick 
          side="right" 
          onChange={handleRightStick} 
          label={gyroPilot ? "ROLL / PITCH (GYRO)" : "ROLL / PITCH"} 
          disabled={gyroPilot}
        />
      </div>
    </div>
  );
}
