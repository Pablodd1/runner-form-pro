/**
 * Real-Time Auditory Biofeedback & Metronome Engine
 * Uses the Web Audio API for sub-millisecond scheduling precision.
 * Provides live treadmill cadence pacing and clinical biofeedback alerts.
 */

class AudioBiofeedbackService {
  private ctx: AudioContext | null = null;
  private isMetronomeActive: boolean = false;
  private bpm: number = 172;
  private timerId: number | null = null;
  private nextNoteTime: number = 0;
  private readonly lookaheadMs: number = 25.0; // How frequently to call scheduler (ms)
  private readonly scheduleAheadTime: number = 0.1; // How far ahead to schedule audio (sec)

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Schedule a single metronome click at exact audio clock time
   */
  private scheduleClick(time: number, isAccent: boolean = false) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1200 : 880, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(isAccent ? 0.35 : 0.22, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.04);
  }

  /**
   * Web Audio lookahead scheduler loop
   */
  private scheduler = () => {
    const ctx = this.getAudioContext();
    if (!ctx || !this.isMetronomeActive) return;

    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleClick(this.nextNoteTime);
      const secondsPerBeat = 60.0 / this.bpm;
      this.nextNoteTime += secondsPerBeat;
    }

    this.timerId = window.setTimeout(this.scheduler, this.lookaheadMs);
  };

  /**
   * Starts or updates live audio metronome
   */
  public startMetronome(targetBpm: number) {
    this.bpm = Math.max(120, Math.min(240, targetBpm));
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (!this.isMetronomeActive) {
      this.isMetronomeActive = true;
      this.nextNoteTime = ctx.currentTime + 0.05;
      this.scheduler();
    }
  }

  /**
   * Stops live audio metronome
   */
  public stopMetronome() {
    this.isMetronomeActive = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public setBpm(newBpm: number) {
    this.bpm = Math.max(120, Math.min(240, newBpm));
  }

  public getIsActive(): boolean {
    return this.isMetronomeActive;
  }

  public getBpm(): number {
    return this.bpm;
  }

  /**
   * Plays a biofeedback chime (success, warning, or cadence reminder)
   */
  public playChime(type: 'success' | 'warning' | 'alert') {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'success') {
      // Pleasant high two-tone chord
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.12); // A5
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (type === 'warning') {
      // Low descending two-tone warning
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(280, t + 0.15);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.start(t);
      osc.stop(t + 0.3);
    } else {
      // Sharp quick alert
      osc.frequency.setValueAtTime(750, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.15);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
  }

  /**
   * Spoken voice cue for hands-free treadmill biofeedback
   */
  public speakCue(message: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1.15;
        utterance.pitch = 1.05;
        utterance.volume = 0.85;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Ignore speech synthesis failures
      }
    }
  }
}

export const audioFeedback = new AudioBiofeedbackService();
