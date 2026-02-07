
export interface SoundSettings {
  music: boolean;
  sfx: boolean;
  volume: number;
}

class SoundService {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private settings: SoundSettings = {
    music: true,
    sfx: true,
    volume: 80,
  };

  private bgmIntervalId: number | null = null;
  private bgmStep: number = 0;
  private bgmBaseTempo: number = 130;
  private bgmScaleMultiplier: number = 1.0;

  private melody = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 196.00];
  private bassLine = [130.81, 130.81, 164.81, 164.81, 196.00, 196.00, 130.81, 98.00];

  init() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.connect(this.audioCtx.destination);
    
    this.musicGain = this.audioCtx.createGain();
    this.musicGain.connect(this.masterGain);
    
    this.updateVolume();
  }

  updateSettings(newSettings: Partial<SoundSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.updateVolume();
    if (this.musicGain && this.audioCtx) {
        if (!this.settings.music) {
            this.musicGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
        } else {
            this.musicGain.gain.setTargetAtTime(0.5, this.audioCtx.currentTime, 0.1);
        }
    }
  }

  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  private updateVolume() {
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.settings.volume / 100, this.audioCtx.currentTime, 0.1);
    }
  }

  private playTone(freqs: number[], duration: number, type: OscillatorType = 'sine') {
    if (!this.settings.sfx || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();

    osc.type = type;
    osc.connect(g);
    g.connect(this.masterGain!);

    const now = this.audioCtx.currentTime;
    osc.frequency.setValueAtTime(freqs[0], now);
    if (freqs.length > 1) {
      osc.frequency.exponentialRampToValueAtTime(freqs[1], now + duration);
    }

    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.start();
    osc.stop(now + duration);
  }

  playCatch() { this.playTone([440, 880], 0.15, 'triangle'); }
  playMiss() { this.playTone([200, 50], 0.3, 'sawtooth'); }
  playBoost() { this.playTone([300, 1200], 0.4, 'sine'); }

  playButtonClick() { 
    this.playTone([1200, 800], 0.05, 'sine'); 
  }

  playGameOver() {
    if (!this.settings.sfx) return;
    // Sad descending tones
    this.playTone([300, 250], 0.4, 'sawtooth');
    setTimeout(() => this.playTone([250, 200], 0.4, 'sawtooth'), 300);
    setTimeout(() => this.playTone([200, 50], 0.6, 'sawtooth'), 600);
  }

  playLevelComplete() {
    this.playStageClear();
  }

  playStageClear() {
    const now = this.audioCtx?.currentTime || 0;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone([freq, freq * 1.1], 0.2, 'sine'), i * 150);
    });
  }

  startBGM() {
    if (this.bgmIntervalId !== null) return;
    this.init();
    if (this.audioCtx?.state === 'suspended') this.audioCtx.resume();
    this.bgmStep = 0;
    this.scheduleNextBGMStep();
  }

  stopBGM() {
    if (this.bgmIntervalId) {
      clearTimeout(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  setBGMScale(multiplier: number) {
    this.bgmScaleMultiplier = multiplier;
  }

  private scheduleNextBGMStep() {
    if (!this.audioCtx) return;
    const bpm = this.bgmBaseTempo * this.bgmScaleMultiplier;
    const stepDuration = (60 / bpm) * 0.5 * 1000;
    this.playBgmStep();
    this.bgmIntervalId = window.setTimeout(() => {
      this.bgmStep = (this.bgmStep + 1) % this.melody.length;
      this.scheduleNextBGMStep();
    }, stepDuration);
  }

  private playBgmStep() {
    if (!this.settings.music || !this.audioCtx || !this.musicGain) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    const now = this.audioCtx.currentTime;
    const duration = (60 / (this.bgmBaseTempo * this.bgmScaleMultiplier)) * 0.4;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(this.melody[this.bgmStep], now);
    osc.connect(g);
    g.connect(this.musicGain);
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
    if (this.bgmStep % 2 === 0) {
      const bassOsc = this.audioCtx.createOscillator();
      const bassG = this.audioCtx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(this.bassLine[this.bgmStep], now);
      bassOsc.connect(bassG);
      bassG.connect(this.musicGain);
      bassG.gain.setValueAtTime(0.1, now);
      bassG.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.5);
      bassOsc.start(now);
      bassOsc.stop(now + duration * 1.5);
    }
  }
}
export const soundService = new SoundService();
