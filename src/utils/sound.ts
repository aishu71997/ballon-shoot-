// Web Audio API Synthesizer for Retro Arcade Sound Effects
class SoundSynth {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Initializer is lazy to comply with browser autoplay security policies
  }

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted: boolean) {
    this.muted = muted;
  }

  isMuted() {
    return this.muted;
  }

  // Quick crisp balloon pop sound
  playPop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    
    // Sweep frequency rapidly from high to low for "pop" characteristic
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

    // Fade out gain quickly
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Sound for golden/bonus balloons (high pitch sweet sweep)
  playGoldenPop() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(2200, now + 0.15);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1000, now);
    osc2.frequency.exponentialRampToValueAtTime(3000, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
  }

  // Heavy blast explosion sound when popping a bomb balloon
  playExplosion() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Very low pitch sweep with rapid frequency drop to simulate rumble
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    // Add high frequency crackle to make it feel like an authentic explosion
    const noiseOsc = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    noiseOsc.type = 'triangle';
    noiseOsc.frequency.setValueAtTime(120, now);
    // Random frequency modulations
    for (let i = 0; i < 10; i++) {
      noiseOsc.frequency.setValueAtTime(30 + Math.random() * 500, now + i * 0.04);
    }
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    noiseOsc.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(now);
    noiseOsc.start(now);
    osc.stop(now + 0.5);
    noiseOsc.stop(now + 0.5);
  }

  // Ice block/Freeze sound (delicate high frequency chime slide downward)
  playFreeze() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.3);

    // Tremolo (vibrato amplitude) to represent icy shivering
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 15; // 15 Hz
    lfoGain.gain.value = 600; // Tremolo depth

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.4);
    osc.stop(now + 0.4);
  }

  // Sweet dual pop sound for healing
  playHeal() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3); // C6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Upgrade or purchase sound
  playUpgrade() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.18); // E6

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Level or highscore milestone chime
  playMilestone() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc1.frequency.setValueAtTime(783.99, now + 0.2); // G5
    osc1.frequency.setValueAtTime(1046.50, now + 0.3); // C6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(261.63, now); // C4
    osc2.frequency.setValueAtTime(329.63, now + 0.1); // E4
    osc2.frequency.setValueAtTime(392.00, now + 0.2); // G4
    osc2.frequency.setValueAtTime(523.25, now + 0.3); // C5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.setValueAtTime(0.15, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  }

  // Sad sliding game-over drone
  playGameOver() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, now); // E3
    osc.frequency.linearRampToValueAtTime(220, now + 0.2); // A3
    osc.frequency.linearRampToValueAtTime(147, now + 0.5); // D3
    osc.frequency.linearRampToValueAtTime(98, now + 0.9); // G2

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.25);
  }
}

export const sounds = new SoundSynth();
