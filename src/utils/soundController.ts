class SoundController {
  private ctx: AudioContext | null = null;
  private motorOscillators: Record<string, { osc: OscillatorNode; gain: GainNode }> = {};

  private initCtx() {
    if (!this.ctx) {
      // Browsers restrict audio context until user interaction, which fits our onClick handlers perfectly
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playHover() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // high frequency pip
      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {
      console.warn('Web Audio API playHover failed:', e);
    }
  }

  playClick() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(330, this.ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.09);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Web Audio API playClick failed:', e);
    }
  }

  playArm() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      // Double beep for arming
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
      
      gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.2);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {
      // Ignore
    }
  }

  playDisarm() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      // Descending beep for disarm
      osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.5);
    } catch (e) {
      // Ignore
    }
  }

  playCrash() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds of noise
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      
      const gain = this.ctx.createGain();
      gain.gain.value = 0.5;
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      noise.start();
    } catch (e) {
      // Ignore
    }
  }

  startMotorSound(motorId: string) {
    try {
      this.initCtx();
      if (!this.ctx) return;

      if (this.motorOscillators[motorId]) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Bandpass filter to make it sound smaller and less buzzy, like a real micro prop
      filter.type = 'bandpass';
      filter.Q.value = 1.5;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      
      // Start with arming/idle hum
      osc.frequency.setValueAtTime(40, this.ctx.currentTime);
      filter.frequency.setValueAtTime(100, this.ctx.currentTime);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.015, this.ctx.currentTime + 0.3);

      osc.start();

      this.motorOscillators[motorId] = { osc, gain, filter } as any;
    } catch (e) {
      console.warn(`Web Audio API startMotorSound for ${motorId} failed:`, e);
    }
  }

  updateMotorPitch(motorId: string, rpm: number) {
    try {
      const active: any = this.motorOscillators[motorId];
      if (!active || !this.ctx) return;

      // Realistic PlutoX Micro Quadcopter RPM mapping
      // Idle is ~10,000 RPM, Hover is ~30,000 RPM, Max is ~50,000 RPM
      // Frequency mapping: 60Hz to 400Hz
      const normalizedRpm = Math.max(0, Math.min(1, rpm / 50000));
      const baseFreq = 60 + (normalizedRpm * 340);
      
      // Aerodynamic load / turbulence simulation (propeller wash noise)
      // Wobble increases as RPM increases
      const wobble = Math.sin(Date.now() / 1000 * 25) * (normalizedRpm * 8);
      const targetFreq = baseFreq + wobble;
      
      // Filter frequency tracks the pitch but higher to emphasize the whine
      const filterFreq = Math.min(targetFreq * 2.5, 20000);

      // Smooth interpolations using time constants (exponential decay approach)
      active.osc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.03);
      active.filter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);
      
      // Volume mapping: exponential curve to make high RPMs sound much more aggressive
      const targetVolume = 0.005 + Math.pow(normalizedRpm, 1.5) * 0.035;
      active.gain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.03);
    } catch (e) {
      // Fail silently
    }
  }

  stopMotorSound(motorId: string) {
    try {
      const active: any = this.motorOscillators[motorId];
      if (!active || !this.ctx) return;

      active.gain.gain.setValueAtTime(active.gain.gain.value, this.ctx.currentTime);
      active.gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);

      setTimeout(() => {
        try {
          active.osc.stop();
          active.osc.disconnect();
          active.filter.disconnect();
          active.gain.disconnect();
        } catch (err) {}
      }, 600);

      delete this.motorOscillators[motorId];
    } catch (e) {
      // Fail silently
    }
  }

  stopAllMotors() {
    Object.keys(this.motorOscillators).forEach((id) => this.stopMotorSound(id));
  }
}

export const sound = new SoundController();
export default sound;
