import { Track } from '../types';

/**
 * Minimal audio engine — plain HTMLAudioElement only.
 * No Web Audio API. No AudioContext. No analyser.
 * This avoids all autoplay-policy / suspended-context issues on macOS.
 */
class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private volume: number = 0.8;
  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private tickInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.volume = this.volume;
      this.audio.preload = 'auto';

      this.audio.addEventListener('ended', () => {
        this.stopTick();
        this.onEndedCallback?.();
      });

      this.audio.addEventListener('error', (e) => {
        console.error('Audio error:', (e.target as HTMLAudioElement).error);
      });
    }
  }

  public setCallbacks(
    onTimeUpdate: (time: number, duration: number) => void,
    onEnded: () => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onEndedCallback = onEnded;
  }

  public setVolume(volume: number) {
    this.volume = volume;
    if (this.audio) this.audio.volume = volume;
  }

  public play(track: Track) {
    if (!this.audio) return;
    this.stopTick();

    if (track.isSynthesized || !track.url) {
      console.warn('Synthesized / empty URL tracks are not supported in simple mode.');
      return;
    }

    this.audio.src = track.url;
    this.audio.volume = this.volume;
    this.audio.currentTime = 0;
    this.audio.load();

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.error('Playback failed:', err);
      });
    }

    this.startTick();
  }

  public pause() {
    this.audio?.pause();
    this.stopTick();
  }

  public resume() {
    if (!this.audio) return;
    const p = this.audio.play();
    if (p !== undefined) {
      p.catch((err) => console.error('Resume failed:', err));
    }
    this.startTick();
  }

  public seek(seconds: number) {
    if (!this.audio) return;
    this.audio.currentTime = seconds;
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(seconds, this.audio.duration || 0);
    }
  }

  /** @deprecated No analyser in simple mode */
  public getAnalyserNode(): null {
    return null;
  }

  private startTick() {
    this.stopTick();
    this.tickInterval = setInterval(() => {
      if (!this.audio || !this.onTimeUpdateCallback) return;
      const t = this.audio.currentTime;
      const d = this.audio.duration || 0;
      this.onTimeUpdateCallback(t, d);
    }, 200);
  }

  private stopTick() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}

export const audioEngine = new AudioEngine();
