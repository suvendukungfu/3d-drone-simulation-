import React, { useRef, useEffect } from 'react';
import { useDroneStore } from '../../store/useDroneStore';

interface JoystickProps {
  side: 'left' | 'right';
  onChange: (x: number, y: number) => void;
  label: string;
}

const Joystick = ({ side, onChange, label }: JoystickProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.TouchEvent | TouchEvent | React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current || !stickRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2;

    let clientX, clientY;

    if ('touches' in e) {
      // Find the touch associated with this joystick
      const touch = e.touches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      if (e.buttons !== 1) return; // Only process if left click is held down
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

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
      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-bold mb-2 uppercase tracking-widest bg-slate-900/50 dark:bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
        {label}
      </span>
      <div
        ref={containerRef}
        className="w-28 h-28 bg-slate-900/70 dark:bg-slate-950/80 border-2 border-slate-700/60 rounded-full relative flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] touch-none"
        onMouseDown={handleMove}
        onMouseMove={(e) => e.buttons === 1 && handleMove(e)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleMove}
      >
        {/* Crosshair guidelines */}
        <div className="absolute top-0 bottom-0 w-[1px] bg-slate-700/30" />
        <div className="absolute left-0 right-0 h-[1px] bg-slate-700/30" />
        
        {/* Joystick Handle */}
        <div
          ref={stickRef}
          className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-300 absolute transition-transform duration-75 ease-out"
        />
      </div>
    </div>
  );
};

export default function VirtualJoysticks() {
  const currentMode = useDroneStore((state) => state.currentMode);
  const updateStickInputTested = useDroneStore((state) => state.updateStickInputTested);

  if (currentMode !== 'flight') return null;

  const handleLeftStick = (nx: number, ny: number) => {
    // Left stick: Yaw (nx) and Throttle (ny)
    
    // Y-axis: Throttle Up (w) / Down (s)
    if (ny > 0.25) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      updateStickInputTested('throttleUp');
    } else if (ny < -0.25) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      updateStickInputTested('throttleDown');
    } else {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 's' }));
    }

    // X-axis: Yaw Left (a) / Right (d)
    if (nx > 0.25) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
      updateStickInputTested('yawRight');
    } else if (nx < -0.25) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      updateStickInputTested('yawLeft');
    } else {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
    }
  };

  const handleRightStick = (nx: number, ny: number) => {
    // Right stick: Roll (nx) and Pitch (ny)

    // Y-axis: Pitch Forward (ArrowUp) / Back (ArrowDown)
    if (ny > 0.25) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      updateStickInputTested('pitchForward');
    } else if (ny < -0.25) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      updateStickInputTested('pitchBack');
    } else {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
    }

    // X-axis: Roll Left (ArrowLeft) / Right (ArrowRight)
    if (nx > 0.25) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      updateStickInputTested('rollRight');
    } else if (nx < -0.25) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      updateStickInputTested('rollLeft');
    } else {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
    }
  };

  return (
    <div className="virtual-joysticks select-none">
      <Joystick side="left" onChange={handleLeftStick} label="YAW / THROTTLE" />
      
      {/* Center Arm & Reset controls */}
      <div className="flex flex-col justify-end gap-3 pb-1 pointer-events-auto">
        <button 
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))}
          className="w-12 h-12 rounded-full bg-red-600/85 hover:bg-red-500 border border-red-400/50 shadow-[0_0_12px_rgba(220,38,38,0.5)] flex flex-col items-center justify-center font-bold text-[8px] text-white active:scale-95 transition-transform uppercase tracking-wider leading-none"
        >
          <span>ARM</span>
          <span className="text-[6px] opacity-70 mt-0.5">SPACE</span>
        </button>
        <button 
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))}
          className="w-10 h-10 mx-auto rounded-full bg-slate-800/85 hover:bg-slate-700 border border-slate-700/50 shadow-[0_0_8px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center font-bold text-[8px] text-slate-300 active:scale-95 transition-transform uppercase tracking-wider leading-none"
        >
          <span>RESET</span>
          <span className="text-[5px] opacity-70 mt-0.5">R KEY</span>
        </button>
      </div>

      <Joystick side="right" onChange={handleRightStick} label="ROLL / PITCH" />
    </div>
  );
}
