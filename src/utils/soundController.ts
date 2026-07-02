class SoundController {
  private ctx: AudioContext | null = null;
  private baseBuffer: AudioBuffer | null = null;
  private isLoading = false;
  private isVisible = true;
  private baseAudioUrl = '/audio/drone_sound.mp3';

  // Active motor source nodes and gain nodes
  private motorSources: Record<string, { source: AudioBufferSourceNode; gainNode: GainNode; biquadFilter: BiquadFilterNode }> = {};
  
  // Track target/current RPMs for interpolation if needed
  private targetRPMs: Record<string, number> = {};
  private currentRPMs: Record<string, number> = {};

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        
        // Immediately synthesize a high-fidelity buffer synchronously so we have zero startup latency
        this.baseBuffer = this.createSyntheticMotorBuffer();
        
        // Register tab visibility listener
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Try to load correct audio recording asynchronously
        this.loadBaseBuffer();
      }
    }
    
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private handleVisibilityChange() {
    if (!this.ctx) return;
    
    if (document.hidden) {
      this.isVisible = false;
      this.ctx.suspend().catch(() => {});
    } else {
      this.isVisible = true;
      this.ctx.resume().catch(() => {});
    }
  }

  private async loadBaseBuffer() {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      const response = await fetch(this.baseAudioUrl);
      if (!response.ok) throw new Error('File not found');
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await this.ctx!.decodeAudioData(arrayBuffer);
      this.baseBuffer = decoded;
      
      // Recreate active motor nodes to use the new high-quality recording buffer
      Object.keys(this.motorSources).forEach(motorId => {
        this.recreateMotorSource(motorId);
      });
      console.log('Successfully loaded base drone audio recording.');
    } catch (e) {
      // Keep using synthetic buffer
    } finally {
      this.isLoading = false;
    }
  }

  private recreateMotorSource(motorId: string) {
    const active = this.motorSources[motorId];
    if (!active || !this.ctx || !this.baseBuffer) return;
    
    try {
      const oldSource = active.source;
      const oldGain = active.gainNode;
      const oldFilter = active.biquadFilter;
      
      // Create new source
      const newSource = this.ctx.createBufferSource();
      newSource.buffer = this.baseBuffer;
      newSource.loop = true;
      
      // Create new gain and filter to prevent clicks during transition
      const newGainNode = this.ctx.createGain();
      newGainNode.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      
      const newFilter = this.ctx.createBiquadFilter();
      newFilter.type = 'lowpass';
      newFilter.frequency.value = oldFilter.frequency.value;
      
      newSource.connect(newFilter);
      newFilter.connect(newGainNode);
      newGainNode.connect(this.ctx.destination);
      
      // Set current playback rate
      newSource.playbackRate.value = oldSource.playbackRate.value;
      
      // Start playing
      const offset = Math.random() * this.baseBuffer.duration;
      newSource.start(0, offset);
      
      // Crossfade old to new
      const crossfadeTime = 0.1; // 100ms
      newGainNode.gain.linearRampToValueAtTime(oldGain.gain.value, this.ctx.currentTime + crossfadeTime);
      oldGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + crossfadeTime);
      
      // Stop old source after crossfade
      setTimeout(() => {
        try {
          oldSource.stop();
          oldSource.disconnect();
          oldFilter.disconnect();
          oldGain.disconnect();
        } catch (err) {}
      }, crossfadeTime * 1000 + 50);
      
      // Update tracking object
      this.motorSources[motorId] = {
        source: newSource,
        gainNode: newGainNode,
        biquadFilter: newFilter
      };
    } catch (e) {
      console.warn(`Failed to recreate motor source for ${motorId}:`, e);
    }
  }

  private createSyntheticMotorBuffer(): AudioBuffer {
    const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
    const duration = 2.0; // 2 seconds to make loop seamless without repetition pattern artifacts
    const buffer = this.ctx!.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    const baseFreq = 200.0; // Base frequency of the recording
    
    // Generate pink noise filter variables (simple approximation)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // Fundamental + harmonics
      const f = Math.sin(2 * Math.PI * baseFreq * t);
      const h1 = 0.6 * Math.sin(2 * Math.PI * baseFreq * 2 * t);
      const h2 = 0.3 * Math.sin(2 * Math.PI * baseFreq * 3 * t);
      const h3 = 0.15 * Math.sin(2 * Math.PI * baseFreq * 4 * t);
      
      // Sub-harmonic for deeper rumble (chassis vibration)
      const sub = 0.15 * Math.sin(2 * Math.PI * (baseFreq / 2) * t);
      
      // High frequency whine
      const whine = 0.08 * Math.sin(2 * Math.PI * 1500 * t);
      
      // White noise generator
      const white = Math.random() * 2.0 - 1.0;
      
      // Pink noise filter (Paul Kellet's refined method)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      
      // Modulate the noise by the propeller rotation (blade passage)
      const noiseMod = (0.5 + 0.5 * Math.sin(2 * Math.PI * baseFreq * 2 * t));
      const propNoise = pink * 0.15 * noiseMod;
      
      // Combine components
      let sample = f + h1 + h2 + h3 + sub + whine + propNoise;
      
      // Normalize slightly to prevent clipping in buffer
      sample *= 0.35;
      
      data[i] = sample;
    }
    
    // Crossfade the ends of the buffer to ensure it loops seamlessly without a click
    const fadeSamples = Math.floor(sampleRate * 0.05); // 50ms fade
    for (let i = 0; i < fadeSamples; i++) {
      const alpha = i / fadeSamples;
      const startIdx = i;
      const endIdx = data.length - fadeSamples + i;
      
      const startSample = data[startIdx];
      const endSample = data[endIdx];
      
      data[startIdx] = endSample * (1 - alpha) + startSample * alpha;
      data[endIdx] = endSample * alpha + startSample * (1 - alpha);
    }
    
    return buffer;
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
      if (!this.ctx || !this.baseBuffer) return;

      if (this.motorSources[motorId]) return;

      const source = this.ctx.createBufferSource();
      source.buffer = this.baseBuffer;
      source.loop = true;

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, this.ctx.currentTime); // Start quiet

      const biquadFilter = this.ctx.createBiquadFilter();
      biquadFilter.type = 'lowpass';
      biquadFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

      source.connect(biquadFilter);
      biquadFilter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      // Start looping at a random phase offset to avoid flanging with other motors
      const offset = Math.random() * this.baseBuffer.duration;
      source.start(0, offset);

      this.motorSources[motorId] = { source, gainNode, biquadFilter };
      
      this.targetRPMs[motorId] = 10000;
      this.currentRPMs[motorId] = 10000;
    } catch (e) {
      console.warn(`Web Audio API startMotorSound for ${motorId} failed:`, e);
    }
  }

  updateMotorPitch(motorId: string, rpm: number) {
    try {
      const active = this.motorSources[motorId];
      if (!active || !this.ctx || !this.isVisible) return;

      // Realistic PlutoX Micro Quadcopter RPM mapping:
      // Idle is ~10,000 RPM, Hover is ~30,000 RPM, Max is ~50,000 RPM
      // Frequency mapping: 80Hz to 550Hz
      const normalizedRpm = Math.max(0, Math.min(1, rpm / 50000));
      const targetFreq = 80 + (normalizedRpm * 470);
      
      // Dynamic vibration / RPM wobbling modulation to simulate aerodynamic load & turbulence
      const vibrationFreq = 22; // Hz vibration frequency
      const vibrationAmp = 1.5 + normalizedRpm * 6.5; // Up to 8Hz of frequency wobble
      const vibration = Math.sin(this.ctx.currentTime * Math.PI * 2 * vibrationFreq) * vibrationAmp;
      
      const playbackRate = (targetFreq + vibration) / 200.0; // Base buffer loops at 200Hz

      // Smooth interpolations using exponential ramps (setTargetAtTime) to prevent clicking
      active.source.playbackRate.setTargetAtTime(playbackRate, this.ctx.currentTime, 0.04);
      
      // Volumetric envelope: exponential curve makes high RPM whine sound much more aggressive
      const targetVolume = 0.003 + Math.pow(normalizedRpm, 1.4) * 0.042;
      active.gainNode.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.04);

      // Dynamic lowpass filter to cut high buzzing when idle, opening up on acceleration
      const filterFreq = 350 + normalizedRpm * 2500; // 350Hz to 2850Hz lowpass filter
      active.biquadFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.06);
    } catch (e) {
      // Fail silently
    }
  }

  stopMotorSound(motorId: string) {
    try {
      const active = this.motorSources[motorId];
      if (!active || !this.ctx) return;

      const source = active.source;
      const gainNode = active.gainNode;
      const filter = active.biquadFilter;

      gainNode.gain.setValueAtTime(gainNode.gain.value, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);

      setTimeout(() => {
        try {
          source.stop();
          source.disconnect();
          filter.disconnect();
          gainNode.disconnect();
        } catch (err) {}
      }, 500);

      delete this.motorSources[motorId];
    } catch (e) {
      // Fail silently
    }
  }

  stopAllMotors() {
    Object.keys(this.motorSources).forEach((id) => this.stopMotorSound(id));
  }
}

export const sound = new SoundController();
export default sound;
