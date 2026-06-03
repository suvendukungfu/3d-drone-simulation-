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

  startMotorSound(motorId: string) {
    try {
      this.initCtx();
      if (!this.ctx) return;

      // Stop if already running
      this.stopMotorSound(motorId);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      
      // Start with low hum and pitch up
      osc.frequency.setValueAtTime(40, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, this.ctx.currentTime + 0.8);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 0.4);

      osc.start();

      this.motorOscillators[motorId] = { osc, gain };
    } catch (e) {
      console.warn(`Web Audio API startMotorSound for ${motorId} failed:`, e);
    }
  }

  updateMotorPitch(motorId: string, rpm: number) {
    try {
      const active = this.motorOscillators[motorId];
      if (!active || !this.ctx) return;

      // Map RPM (e.g. 0 to 50000) to Frequency (e.g. 80Hz to 350Hz)
      const baseFreq = 80 + (rpm / 50000) * 270;
      
      // Add slight jitter/vibration sound to simulate active quadcopter propeller
      const noise = (Math.random() - 0.5) * 5;
      
      active.osc.frequency.setTargetAtTime(baseFreq + noise, this.ctx.currentTime, 0.05);
      
      // Set volume relative to speed
      const targetVolume = 0.01 + (rpm / 50000) * 0.025;
      active.gain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.05);
    } catch (e) {
      // Fail silently
    }
  }

  stopMotorSound(motorId: string) {
    try {
      const active = this.motorOscillators[motorId];
      if (!active || !this.ctx) return;

      active.gain.gain.setValueAtTime(active.gain.gain.value, this.ctx.currentTime);
      active.gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);

      setTimeout(() => {
        try {
          active.osc.stop();
          active.osc.disconnect();
          active.gain.disconnect();
        } catch (err) {}
      }, 500);

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
