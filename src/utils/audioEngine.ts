/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track } from '../types';

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Synthesizer nodes
  private synthNodes: AudioNode[] = [];
  private synthIntervalId: any = null;
  private isSynthPlaying = false;
  private currentGenre: string = 'ambient';
  private synthVolumeNode: GainNode | null = null;
  private volume: number = 0.8;

  // Callbacks
  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private timeUpdateInterval: any = null;

  constructor() {
    // Only initialize HTMLAudioElement initially
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.addEventListener('ended', () => {
        clearInterval(this.timeUpdateInterval);
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      });
    }
  }

  private initAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      // Create audio context
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      
      // Create and configure analyser
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.85;

      // Connect HTML audio element to analyzer
      if (this.audioElement) {
        try {
          this.mediaSource = this.audioCtx.createMediaElementSource(this.audioElement);
          this.mediaSource.connect(this.analyser);
          this.analyser.connect(this.audioCtx.destination);
        } catch (err) {
          console.warn('MediaElementSource integration error (might be already initialized):', err);
        }
      }

      // Create synth master volume node
      this.synthVolumeNode = this.audioCtx.createGain();
      this.synthVolumeNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.synthVolumeNode.connect(this.analyser);
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
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
    if (this.audioElement) {
      this.audioElement.volume = volume;
    }
    if (this.synthVolumeNode && this.audioCtx) {
      this.synthVolumeNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    this.initAudioContext();
    return this.analyser;
  }

  public play(track: Track) {
    this.initAudioContext();
    this.stopSynth();

    if (!track.isSynthesized) {
      // Local or uploaded file
      if (this.audioElement) {
        this.audioElement.src = track.url;
        this.audioElement.load();
        this.audioElement.play().catch((err) => {
          console.error('Audio element playback failed:', err);
        });

        // Set up feedback interval
        clearInterval(this.timeUpdateInterval);
        this.timeUpdateInterval = setInterval(() => {
          if (this.audioElement && this.onTimeUpdateCallback) {
            const current = this.audioElement.currentTime;
            const duration = this.audioElement.duration || track.duration || 0;
            this.onTimeUpdateCallback(current, duration);
          }
        }, 200);
      }
    } else {
      // Generative procedural tracker
      this.playSynth(track);
    }
  }

  public pause() {
    if (this.isSynthPlaying) {
      this.isSynthPlaying = false;
      // Pause synthesis ticking but remember we are paused.
      // For synths, pausing is just stopping sound generation nodes
      this.synthVolumeNode?.gain.setTargetAtTime(0, this.audioCtx?.currentTime || 0, 0.05);
    } else if (this.audioElement) {
      this.audioElement.pause();
    }
    clearInterval(this.timeUpdateInterval);
  }

  public resume() {
    this.initAudioContext();
    if (this.synthIntervalId && !this.isSynthPlaying) {
      this.isSynthPlaying = true;
      this.synthVolumeNode?.gain.setTargetAtTime(this.volume, this.audioCtx?.currentTime || 0, 0.05);
      
      // Start fake time updates for procedural tracks
      let elTime = 0;
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = setInterval(() => {
        if (this.isSynthPlaying && this.onTimeUpdateCallback) {
          elTime = (elTime + 0.25) % 180; // Synth loops at 180s
          this.onTimeUpdateCallback(elTime, 180);
        }
      }, 250);
    } else if (this.audioElement) {
      this.audioElement.play().catch((err) => console.error(err));
      
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = setInterval(() => {
        if (this.audioElement && this.onTimeUpdateCallback) {
          const current = this.audioElement.currentTime;
          const duration = this.audioElement.duration || 180;
          this.onTimeUpdateCallback(current, duration);
        }
      }, 250);
    }
  }

  public seek(seconds: number) {
    if (this.audioElement && this.audioElement.src) {
      this.audioElement.currentTime = seconds;
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(seconds, this.audioElement.duration || 120);
      }
    }
  }

  // Generative synthesizers
  private playSynth(track: Track) {
    this.initAudioContext();
    const ctx = this.audioCtx!;
    this.currentGenre = track.synthesizedGenre || 'ambient';
    this.isSynthPlaying = true;

    // Reset volume
    this.synthVolumeNode?.gain.setValueAtTime(this.volume, ctx.currentTime);

    const tempo = track.synthesizedTempo || 90;
    const beatDuration = 60 / tempo;

    // Remove any running intervals
    if (this.synthIntervalId) {
      clearInterval(this.synthIntervalId);
    }

    let beatCount = 0;
    let trackTime = 0;
    const totalTrackDuration = 180; // 3 minutes for loops

    // Synthesizer looping beat ticker
    const tickSynth = () => {
      if (!this.isSynthPlaying) return;

      const now = ctx.currentTime;
      
      // Generative logic depending on genre
      switch (this.currentGenre) {
        case 'ambient':
          this.triggerAmbientTick(ctx, now, beatCount);
          break;
        case 'lofi':
          this.triggerLofiTick(ctx, now, beatCount);
          break;
        case 'techno':
          this.triggerTechnoTick(ctx, now, beatCount);
          break;
        case 'space':
          this.triggerSpaceTick(ctx, now, beatCount);
          break;
      }

      beatCount = (beatCount + 1) % 32;
      trackTime += beatDuration;

      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(trackTime % totalTrackDuration, totalTrackDuration);
      }

      // Check ended
      if (trackTime >= totalTrackDuration) {
        trackTime = 0;
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      }
    };

    // Trigger first tick instantly
    tickSynth();
    this.synthIntervalId = setInterval(tickSynth, beatDuration * 1000);
  }

  private stopSynth() {
    this.isSynthPlaying = false;
    if (this.synthIntervalId) {
      clearInterval(this.synthIntervalId);
      this.synthIntervalId = null;
    }
  }

  // --- SCI-FI AMBIENT procedural beats ---
  private triggerAmbientTick(ctx: AudioContext, time: number, beat: number) {
    if (!this.synthVolumeNode) return;

    // Key ambient notes (C Pentatonic Scale: C3, D3, E3, G3, A3, C4, D4, E4, G4, A4)
    const scale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00];

    // Every 4 beats play a random soothing pad note
    if (beat % 4 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Lowpass Filter for warmer sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, time);

      osc.type = 'sine';
      // Pick lower root note
      const rndIndex = Math.floor(Math.random() * 5);
      osc.frequency.setValueAtTime(scale[rndIndex], time);

      // Pad Envelope (Swell)
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.synthVolumeNode);

      osc.start(time);
      osc.stop(time + 4.2);
    }

    // Star chimes occasionally on 1 and 3 beats
    if (beat % 3 === 0 && Math.random() > 0.4) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      // High star notes
      const rndIndex = 5 + Math.floor(Math.random() * 5);
      osc.frequency.setValueAtTime(scale[rndIndex], time);

      // Chime envelope (Pluck)
      gain.gain.setValueAtTime(0.04, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

      osc.connect(gain);
      gain.connect(this.synthVolumeNode);

      osc.start(time);
      osc.stop(time + 1.5);
    }
  }

  // --- LO-FI BEAT procedural synthesizer ---
  private triggerLofiTick(ctx: AudioContext, time: number, beat: number) {
    if (!this.synthVolumeNode) return;

    // Jazz chords sequence (Am7, Dm9, G7, Cmaj7)
    // Root frequencies:
    // Am7 notes: A2(110Hz), C3(130Hz), E3(164Hz), G3(196Hz)
    // Dm9 notes: D2(73Hz), F3(174Hz), A3(220Hz), C4(261Hz)
    // G7 notes:  G2(98Hz), B2(123Hz), D3(146Hz), F3(174Hz)
    // Cmaj7:     C2(65Hz), E3(164Hz), G3(196Hz), B3(246Hz)
    const chords = [
      [110.00, 130.81, 164.81, 196.00], // Am7
      [73.42, 174.61, 220.00, 261.63],  // Dm9
      [98.00, 123.47, 146.83, 174.61],  // G7
      [65.41, 164.81, 196.00, 246.94]   // Cmaj7
    ];

    const chordIndex = Math.floor(beat / 8) % chords.length;
    const currentChord = chords[chordIndex];

    // Play a electric piano chord on step 0 and 4 of each group
    if (beat % 4 === 0) {
      currentChord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        // Warm LP filter to feel "dusty"
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, time);

        // Soft EP envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.04, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.synthVolumeNode!);

        osc.start(time);
        osc.stop(time + 2.1);
      });
    }

    // Dusty Vinyl background crackle (simulated with white noise spikes on beat)
    if (Math.random() > 0.6) {
      const noise = ctx.createOscillator(); // we'll use a fast-modulating triangle as a dust sound
      const gain = ctx.createGain();
      noise.type = 'sawtooth';
      noise.frequency.setValueAtTime(4000 + Math.random() * 2000, time);
      
      gain.gain.setValueAtTime(0.0015, time);
      gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.05);

      noise.connect(gain);
      gain.connect(this.synthVolumeNode);
      noise.start(time);
      noise.stop(time + 0.06);
    }

    // Soft kick beat on step 0 and 5
    if (beat % 8 === 0 || beat % 8 === 5) {
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();

      kickOsc.frequency.setValueAtTime(150, time);
      kickOsc.frequency.exponentialRampToValueAtTime(50, time + 0.1);

      kickGain.gain.setValueAtTime(0.15, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      kickOsc.connect(kickGain);
      kickGain.connect(this.synthVolumeNode);
      kickOsc.start(time);
      kickOsc.stop(time + 0.2);
    }
  }

  // --- PROTO TECHNO driving beats ---
  private triggerTechnoTick(ctx: AudioContext, time: number, beat: number) {
    if (!this.synthVolumeNode) return;

    // Hard Techno Kick on 0, 4, 8, 12... (Four-on-the-floor!)
    if (beat % 4 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(120, time);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this.synthVolumeNode);

      osc.start(time);
      osc.stop(time + 0.2);
    }

    // Hi-hats on offbeats (2, 6, 10, 14...)
    if (beat % 4 === 2) {
      // Simulate metallic high-hat
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const hp = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(8000, time);

      hp.type = 'highpass';
      hp.frequency.setValueAtTime(4000, time);

      gain.gain.setValueAtTime(0.03, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(hp);
      hp.connect(gain);
      gain.connect(this.synthVolumeNode);

      osc.start(time);
      osc.stop(time + 0.1);
    }

    // Techno acid bassline step sequencer
    // Sequence of notes in Am: A1, A1, C2, A1, G1, A1, D2, E2
    const baseFreqs = [55.00, 55.00, 65.41, 55.00, 49.00, 55.00, 73.42, 82.41];
    const seqNote = baseFreqs[beat % baseFreqs.length];

    if (beat % 2 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(seqNote, time);

      filter.type = 'peaking';
      filter.frequency.setValueAtTime(250 + Math.sin(beat) * 100, time);
      filter.Q.setValueAtTime(6, time);

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.synthVolumeNode);

      osc.start(time);
      osc.stop(time + 0.25);
    }
  }

  // --- DEEP SPACE COSMIC chimes ---
  private triggerSpaceTick(ctx: AudioContext, time: number, beat: number) {
    if (!this.synthVolumeNode) return;

    // Chords: Gsus2, Bm7, Em7, Cmaj7
    const spatialChords = [
      [98.00, 146.83, 196.00, 293.66], // Gsus2
      [123.47, 164.81, 246.94, 293.66], // Bm7
      [82.41, 146.83, 196.00, 329.63], // Em7
      [130.81, 196.00, 261.63, 329.63] // Cmaj7
    ];

    const chordIdx = Math.floor(beat / 8) % spatialChords.length;
    const currentChord = spatialChords[chordIdx];

    // Ambient space rumble / drone (constant low frequency)
    if (beat % 16 === 0) {
      const lowOsc = ctx.createOscillator();
      const gain = ctx.createGain();
      lowOsc.type = 'sine';
      lowOsc.frequency.setValueAtTime(currentChord[0] / 2, time); // sub bass

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.08, time + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 3.8);

      lowOsc.connect(gain);
      gain.connect(this.synthVolumeNode);
      lowOsc.start(time);
      lowOsc.stop(time + 4.0);
    }

    // Dynamic space chime arpeggios
    if (beat % 2 === 0) {
      const arpeggioNotes = currentChord;
      const noteToPlay = arpeggioNotes[Math.floor(beat / 2) % arpeggioNotes.length];

      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      const pingPongDelay = ctx.createDelay();

      chimeOsc.type = 'triangle';
      chimeOsc.frequency.setValueAtTime(noteToPlay * 2, time); // Octave up

      pingPongDelay.delayTime.setValueAtTime(0.3, time);

      chimeGain.gain.setValueAtTime(0.035, time);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(pingPongDelay);
      pingPongDelay.connect(this.synthVolumeNode);
      chimeGain.connect(this.synthVolumeNode); // dry mix

      chimeOsc.start(time);
      chimeOsc.stop(time + 0.8);
    }
  }
}

export const audioEngine = new AudioEngine();
