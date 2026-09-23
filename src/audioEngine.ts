/**
 * Native Web Audio API DSP Synthesis Engine
 * Enhanced with Surgical Parametric EQ & 3-Band Dynamic Multiband Compressor
 * Zero external MP3/audio files needed - 100% synthesized in-browser.
 */

export interface StemToggles {
  drums: boolean;
  bass: boolean;
  chords: boolean;
  lead: boolean;
}

export interface MultibandSettings {
  enabled: boolean;
  lowThreshold: number;  // dB (-40 to 0)
  lowRatio: number;      // 1 to 20
  lowMakeup: number;     // dB (-6 to +12)
  midThreshold: number;  // dB (-40 to 0)
  midRatio: number;      // 1 to 20
  midMakeup: number;     // dB (-6 to +12)
  highThreshold: number; // dB (-40 to 0)
  highRatio: number;     // 1 to 20
  highMakeup: number;    // dB (-6 to +12)
}

export interface SurgicalEqSettings {
  lowCutFreq: number;    // Hz (20 to 60)
  subBassGain: number;   // dB (-12 to +12) at 55Hz
  mudCutGain: number;    // dB (-12 to +12) at 320Hz
  midGain: number;       // dB (-12 to +12) at 1500Hz
  clarityGain: number;   // dB (-12 to +12) at 4200Hz
  airBoostGain: number;  // dB (-12 to +12) at 12500Hz
  filterCutoff: number;  // Hz (200 to 20000)
  masterVolume: number;  // 0.0 to 1.0
  targetProfile: 'spotify' | 'tiktok' | 'club_ultra';
}

export type MasteringSettings = SurgicalEqSettings;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private inputBus: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Surgical 6-Band Parametric EQ Nodes
  private lowCutFilter: BiquadFilterNode | null = null;
  private subEq: BiquadFilterNode | null = null;
  private mudEq: BiquadFilterNode | null = null;
  private midEq: BiquadFilterNode | null = null;
  private clarityEq: BiquadFilterNode | null = null;
  private airEq: BiquadFilterNode | null = null;
  private djFilter: BiquadFilterNode | null = null;

  // Dynamic 3-Band Multiband Compressor Nodes
  private crossoverLowSplit: BiquadFilterNode | null = null;
  private crossoverMidLowSplit: BiquadFilterNode | null = null;
  private crossoverMidHighSplit: BiquadFilterNode | null = null;
  private crossoverHighSplit: BiquadFilterNode | null = null;

  private compLow: DynamicsCompressorNode | null = null;
  private compMid: DynamicsCompressorNode | null = null;
  private compHigh: DynamicsCompressorNode | null = null;

  private gainLow: GainNode | null = null;
  private gainMid: GainNode | null = null;
  private gainHigh: GainNode | null = null;

  private multibandSum: GainNode | null = null;
  private limiterShaper: WaveShaperNode | null = null;

  // A/B Mastering and Loudness-Matched Gain Compensation Nodes
  private rawMixBypassGain: GainNode | null = null;
  private processedMasterGain: GainNode | null = null;
  private abSumGain: GainNode | null = null;
  private abMode: 'A' | 'B' = 'B'; // 'A' = Mix Brut, 'B' = Master Traité
  private gainCompEnabled: boolean = true;
  private gainCompOffsetDb: number = 3.6;

  // Sequencer loop state
  private isLooping: boolean = false;
  private loopTimer: number | null = null;
  private currentStep: number = 0;
  private bpm: number = 124;
  private stems: StemToggles = {
    drums: true,
    bass: true,
    chords: true,
    lead: true,
  };
  private onStepCallback: ((step: number) => void) | null = null;

  // Multiband State
  private mbSettings: MultibandSettings = {
    enabled: true,
    lowThreshold: -18,
    lowRatio: 4,
    lowMakeup: 1.5,
    midThreshold: -15,
    midRatio: 3,
    midMakeup: 1.0,
    highThreshold: -12,
    highRatio: 2.5,
    highMakeup: 2.0,
  };

  // Active chord frequencies
  private currentChords: number[][] = [
    [174.61, 207.65, 261.63, 311.13], // Fm7
    [138.59, 174.61, 207.65, 261.63], // Dbmaj7
    [207.65, 261.63, 311.13, 415.30], // Abmaj7
    [155.56, 196.00, 233.08, 311.13], // Eb
  ];
  private bassNotes: number[] = [43.65, 34.65, 51.91, 38.89];

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    const now = this.ctx.currentTime;

    // 1. Input Bus (all synth sources connect here)
    this.inputBus = this.ctx.createGain();
    this.inputBus.gain.setValueAtTime(1.0, now);

    // 2. Surgical 6-Band Parametric EQ Chain
    // Band 1: Low Cut (28 Hz)
    this.lowCutFilter = this.ctx.createBiquadFilter();
    this.lowCutFilter.type = 'highpass';
    this.lowCutFilter.frequency.setValueAtTime(28, now);
    this.lowCutFilter.Q.setValueAtTime(0.707, now);

    // Band 2: Sub-Bass Bell (55 Hz)
    this.subEq = this.ctx.createBiquadFilter();
    this.subEq.type = 'peaking';
    this.subEq.frequency.setValueAtTime(55, now);
    this.subEq.Q.setValueAtTime(1.2, now);
    this.subEq.gain.setValueAtTime(1.5, now);

    // Band 3: Mud Cut Notch (320 Hz)
    this.mudEq = this.ctx.createBiquadFilter();
    this.mudEq.type = 'peaking';
    this.mudEq.frequency.setValueAtTime(320, now);
    this.mudEq.Q.setValueAtTime(2.2, now);
    this.mudEq.gain.setValueAtTime(-2.8, now);

    // Band 4: Mid Presence (1500 Hz)
    this.midEq = this.ctx.createBiquadFilter();
    this.midEq.type = 'peaking';
    this.midEq.frequency.setValueAtTime(1500, now);
    this.midEq.Q.setValueAtTime(1.5, now);
    this.midEq.gain.setValueAtTime(0.5, now);

    // Band 5: High-Mid Clarity (4200 Hz)
    this.clarityEq = this.ctx.createBiquadFilter();
    this.clarityEq.type = 'peaking';
    this.clarityEq.frequency.setValueAtTime(4200, now);
    this.clarityEq.Q.setValueAtTime(1.6, now);
    this.clarityEq.gain.setValueAtTime(1.0, now);

    // Band 6: Air Brilliance Shelf (12500 Hz)
    this.airEq = this.ctx.createBiquadFilter();
    this.airEq.type = 'highshelf';
    this.airEq.frequency.setValueAtTime(12500, now);
    this.airEq.gain.setValueAtTime(2.2, now);

    // DJ Filter Sweep (Lowpass)
    this.djFilter = this.ctx.createBiquadFilter();
    this.djFilter.type = 'lowpass';
    this.djFilter.frequency.setValueAtTime(18000, now);
    this.djFilter.Q.setValueAtTime(1.0, now);

    // Connect Parametric EQ chain:
    // inputBus -> lowCut -> subEq -> mudEq -> midEq -> clarityEq -> airEq -> djFilter
    this.inputBus.connect(this.lowCutFilter);
    this.lowCutFilter.connect(this.subEq);
    this.subEq.connect(this.mudEq);
    this.mudEq.connect(this.midEq);
    this.midEq.connect(this.clarityEq);
    this.clarityEq.connect(this.airEq);
    this.airEq.connect(this.djFilter);

    // 3. 3-Band Multiband Dynamics Compressor
    // Crossover splits: Low (<250Hz), Mid (250Hz-3500Hz), High (>3500Hz)
    this.crossoverLowSplit = this.ctx.createBiquadFilter();
    this.crossoverLowSplit.type = 'lowpass';
    this.crossoverLowSplit.frequency.setValueAtTime(250, now);
    this.crossoverLowSplit.Q.setValueAtTime(0.707, now);

    this.crossoverMidLowSplit = this.ctx.createBiquadFilter();
    this.crossoverMidLowSplit.type = 'highpass';
    this.crossoverMidLowSplit.frequency.setValueAtTime(250, now);
    this.crossoverMidLowSplit.Q.setValueAtTime(0.707, now);

    this.crossoverMidHighSplit = this.ctx.createBiquadFilter();
    this.crossoverMidHighSplit.type = 'lowpass';
    this.crossoverMidHighSplit.frequency.setValueAtTime(3500, now);
    this.crossoverMidHighSplit.Q.setValueAtTime(0.707, now);

    this.crossoverHighSplit = this.ctx.createBiquadFilter();
    this.crossoverHighSplit.type = 'highpass';
    this.crossoverHighSplit.frequency.setValueAtTime(3500, now);
    this.crossoverHighSplit.Q.setValueAtTime(0.707, now);

    // 3 Dynamics Compressors
    this.compLow = this.ctx.createDynamicsCompressor();
    this.compLow.threshold.setValueAtTime(this.mbSettings.lowThreshold, now);
    this.compLow.knee.setValueAtTime(6, now);
    this.compLow.ratio.setValueAtTime(this.mbSettings.lowRatio, now);
    this.compLow.attack.setValueAtTime(0.012, now);
    this.compLow.release.setValueAtTime(0.12, now);

    this.compMid = this.ctx.createDynamicsCompressor();
    this.compMid.threshold.setValueAtTime(this.mbSettings.midThreshold, now);
    this.compMid.knee.setValueAtTime(4, now);
    this.compMid.ratio.setValueAtTime(this.mbSettings.midRatio, now);
    this.compMid.attack.setValueAtTime(0.006, now);
    this.compMid.release.setValueAtTime(0.14, now);

    this.compHigh = this.ctx.createDynamicsCompressor();
    this.compHigh.threshold.setValueAtTime(this.mbSettings.highThreshold, now);
    this.compHigh.knee.setValueAtTime(3, now);
    this.compHigh.ratio.setValueAtTime(this.mbSettings.highRatio, now);
    this.compHigh.attack.setValueAtTime(0.003, now);
    this.compHigh.release.setValueAtTime(0.08, now);

    // Band Makeup Gains
    this.gainLow = this.ctx.createGain();
    this.gainLow.gain.setValueAtTime(this.dbToGain(this.mbSettings.lowMakeup), now);

    this.gainMid = this.ctx.createGain();
    this.gainMid.gain.setValueAtTime(this.dbToGain(this.mbSettings.midMakeup), now);

    this.gainHigh = this.ctx.createGain();
    this.gainHigh.gain.setValueAtTime(this.dbToGain(this.mbSettings.highMakeup), now);

    // Multiband Summer Bus
    this.multibandSum = this.ctx.createGain();
    this.multibandSum.gain.setValueAtTime(1.0, now);

    // Routing from djFilter to Multiband Crossovers:
    // Low Band: djFilter -> crossoverLowSplit -> compLow -> gainLow -> multibandSum
    this.djFilter.connect(this.crossoverLowSplit);
    this.crossoverLowSplit.connect(this.compLow);
    this.compLow.connect(this.gainLow);
    this.gainLow.connect(this.multibandSum);

    // Mid Band: djFilter -> crossoverMidLowSplit -> crossoverMidHighSplit -> compMid -> gainMid -> multibandSum
    this.djFilter.connect(this.crossoverMidLowSplit);
    this.crossoverMidLowSplit.connect(this.crossoverMidHighSplit);
    this.crossoverMidHighSplit.connect(this.compMid);
    this.compMid.connect(this.gainMid);
    this.gainMid.connect(this.multibandSum);

    // High Band: djFilter -> crossoverHighSplit -> compHigh -> gainHigh -> multibandSum
    this.djFilter.connect(this.crossoverHighSplit);
    this.crossoverHighSplit.connect(this.compHigh);
    this.compHigh.connect(this.gainHigh);
    this.gainHigh.connect(this.multibandSum);

    // 4. Brickwall Soft-Limiter / Saturator Waveshaper
    this.limiterShaper = this.ctx.createWaveShaper();
    this.limiterShaper.curve = this.makeSoftClipCurve();
    this.limiterShaper.oversample = '2x';

    // 5. Master Gain, A/B Switcher & Analyser
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, now);

    this.rawMixBypassGain = this.ctx.createGain();
    this.processedMasterGain = this.ctx.createGain();
    this.abSumGain = this.ctx.createGain();

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;

    // Connect Path A (Raw Mix Bypass): inputBus -> rawMixBypassGain -> abSumGain
    this.inputBus.connect(this.rawMixBypassGain);
    this.rawMixBypassGain.connect(this.abSumGain);

    // Connect Path B (Processed Master Chain): multibandSum -> limiterShaper -> masterGain -> processedMasterGain -> abSumGain
    this.multibandSum.connect(this.limiterShaper);
    this.limiterShaper.connect(this.masterGain);
    this.masterGain.connect(this.processedMasterGain);
    this.processedMasterGain.connect(this.abSumGain);

    // Final output: abSumGain -> analyser -> destination
    this.abSumGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Set initial gains according to A/B mode
    this.updateAbRouting();
  }

  public ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getCompressionReductions(): { low: number; mid: number; high: number } {
    return {
      low: this.compLow ? Math.abs(this.compLow.reduction) : 0,
      mid: this.compMid ? Math.abs(this.compMid.reduction) : 0,
      high: this.compHigh ? Math.abs(this.compHigh.reduction) : 0,
    };
  }

  // ==================== A/B MASTERING & GAIN COMPENSATION ====================

  /**
   * Updates routing gains for A/B switching and loudness-matched compensation
   */
  public updateAbRouting() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const rampTime = 0.025; // Smooth pop-free transition

    if (this.abMode === 'A') {
      // MODE A : Raw Mix Brut (bypasses parametric EQ, multiband compression & limiter)
      if (this.rawMixBypassGain) {
        this.rawMixBypassGain.gain.setTargetAtTime(1.0, now, rampTime);
      }
      if (this.processedMasterGain) {
        this.processedMasterGain.gain.setTargetAtTime(0.0, now, rampTime);
      }
    } else {
      // MODE B : Master Traité (processed through full mastering chain)
      if (this.rawMixBypassGain) {
        this.rawMixBypassGain.gain.setTargetAtTime(0.0, now, rampTime);
      }
      if (this.processedMasterGain) {
        // When gain compensation is enabled, attenuate Master by gainCompOffsetDb
        // so that perceived loudness matches the unprocessed mix
        const targetGain = this.gainCompEnabled
          ? this.dbToGain(-this.gainCompOffsetDb)
          : 1.0;
        this.processedMasterGain.gain.setTargetAtTime(targetGain, now, rampTime);
      }
    }
  }

  public setAbMode(mode: 'A' | 'B') {
    this.abMode = mode;
    this.updateAbRouting();
  }

  public getAbMode(): 'A' | 'B' {
    return this.abMode;
  }

  public setGainCompensationEnabled(enabled: boolean) {
    this.gainCompEnabled = enabled;
    this.updateAbRouting();
  }

  public isGainCompensationEnabled(): boolean {
    return this.gainCompEnabled;
  }

  public setGainCompensationOffset(db: number) {
    this.gainCompOffsetDb = Math.max(0, Math.min(12, db));
    this.updateAbRouting();
  }

  public getGainCompensationOffset(): number {
    return this.gainCompOffsetDb;
  }

  public getAbState(): { mode: 'A' | 'B'; gainCompEnabled: boolean; gainCompOffsetDb: number } {
    return {
      mode: this.abMode,
      gainCompEnabled: this.gainCompEnabled,
      gainCompOffsetDb: this.gainCompOffsetDb,
    };
  }

  public updateMastering(settings: SurgicalEqSettings) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.lowCutFilter) this.lowCutFilter.frequency.setTargetAtTime(settings.lowCutFreq || 28, now, 0.05);
    if (this.subEq) this.subEq.gain.setTargetAtTime(settings.subBassGain, now, 0.05);
    if (this.mudEq) this.mudEq.gain.setTargetAtTime(settings.mudCutGain, now, 0.05);
    if (this.midEq) this.midEq.gain.setTargetAtTime(settings.midGain || 0, now, 0.05);
    if (this.clarityEq) this.clarityEq.gain.setTargetAtTime(settings.clarityGain || 0, now, 0.05);
    if (this.airEq) this.airEq.gain.setTargetAtTime(settings.airBoostGain, now, 0.05);
    if (this.djFilter) this.djFilter.frequency.setTargetAtTime(settings.filterCutoff, now, 0.05);
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(settings.masterVolume, now, 0.05);
  }

  public updateMultiband(settings: MultibandSettings) {
    this.mbSettings = { ...settings };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.compLow) {
      this.compLow.threshold.setTargetAtTime(settings.lowThreshold, now, 0.05);
      this.compLow.ratio.setTargetAtTime(settings.lowRatio, now, 0.05);
    }
    if (this.gainLow) {
      this.gainLow.gain.setTargetAtTime(this.dbToGain(settings.lowMakeup), now, 0.05);
    }
    if (this.compMid) {
      this.compMid.threshold.setTargetAtTime(settings.midThreshold, now, 0.05);
      this.compMid.ratio.setTargetAtTime(settings.midRatio, now, 0.05);
    }
    if (this.gainMid) {
      this.gainMid.gain.setTargetAtTime(this.dbToGain(settings.midMakeup), now, 0.05);
    }
    if (this.compHigh) {
      this.compHigh.threshold.setTargetAtTime(settings.highThreshold, now, 0.05);
      this.compHigh.ratio.setTargetAtTime(settings.highRatio, now, 0.05);
    }
    if (this.gainHigh) {
      this.gainHigh.gain.setTargetAtTime(this.dbToGain(settings.highMakeup), now, 0.05);
    }
  }

  public applyMasteringProfile(profile: 'spotify' | 'tiktok' | 'club_ultra'): {
    eq: Partial<SurgicalEqSettings>;
    mb: MultibandSettings;
    targetLufs: string;
    description: string;
  } {
    if (profile === 'spotify') {
      // -14 LUFS High Dynamic Range
      const eq = {
        subBassGain: 0.8,
        mudCutGain: -2.0,
        midGain: 0.2,
        clarityGain: 0.8,
        airBoostGain: 1.5,
        masterVolume: 0.78,
      };
      const mb: MultibandSettings = {
        enabled: true,
        lowThreshold: -15,
        lowRatio: 2.5,
        lowMakeup: 0.5,
        midThreshold: -12,
        midRatio: 2.0,
        midMakeup: 0.5,
        highThreshold: -10,
        highRatio: 2.0,
        highMakeup: 0.8,
      };
      this.updateMultiband(mb);
      this.gainCompOffsetDb = 1.8;
      this.updateAbRouting();
      return {
        eq,
        mb,
        targetLufs: '-14.0 LUFS (Spotify / Apple Music Standard)',
        description: 'Dynamique préservée, transitoires intactes, aération optimale pour casques hi-fi.',
      };
    } else if (profile === 'tiktok') {
      // -9.2 LUFS Punchy Hot Master
      const eq = {
        subBassGain: 2.5,
        mudCutGain: -3.2,
        midGain: 0.8,
        clarityGain: 2.0,
        airBoostGain: 3.2,
        masterVolume: 0.90,
      };
      const mb: MultibandSettings = {
        enabled: true,
        lowThreshold: -22,
        lowRatio: 4.5,
        lowMakeup: 2.5,
        midThreshold: -16,
        midRatio: 3.5,
        midMakeup: 1.8,
        highThreshold: -14,
        highRatio: 3.0,
        highMakeup: 2.5,
      };
      this.updateMultiband(mb);
      this.gainCompOffsetDb = 3.6;
      this.updateAbRouting();
      return {
        eq,
        mb,
        targetLufs: '-9.2 LUFS (TikTok & Club Ready Master)',
        description: 'Compression multibande agressive, 808 percutant et brillance air adaptée aux smartphones.',
      };
    } else {
      // -7.8 LUFS Ultra-Hot Festival / Phonk
      const eq = {
        subBassGain: 4.0,
        mudCutGain: -4.0,
        midGain: 1.2,
        clarityGain: 3.0,
        airBoostGain: 4.5,
        masterVolume: 0.98,
      };
      const mb: MultibandSettings = {
        enabled: true,
        lowThreshold: -26,
        lowRatio: 6.0,
        lowMakeup: 3.8,
        midThreshold: -20,
        midRatio: 4.5,
        midMakeup: 2.6,
        highThreshold: -18,
        highRatio: 4.0,
        highMakeup: 3.5,
      };
      this.updateMultiband(mb);
      this.gainCompOffsetDb = 4.8;
      this.updateAbRouting();
      return {
        eq,
        mb,
        targetLufs: '-7.8 LUFS (Ultra-Hot Festival / Phonk Peak)',
        description: 'Loudness maximale, impact physique immédiat, saturation harmonique dense.',
      };
    }
  }

  public setProgression(chords: number[][], bassNotes: number[], bpm: number) {
    this.currentChords = chords;
    this.bassNotes = bassNotes;
    this.bpm = bpm;
  }

  public setStems(stems: StemToggles) {
    this.stems = { ...stems };
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
    if (this.isLooping) {
      this.stopLoop();
      this.startLoop(this.onStepCallback);
    }
  }

  /**
   * Connect all synth voices into this.inputBus
   */
  private getSynthDestination(): AudioNode | null {
    return this.inputBus;
  }

  public playChord(frequencies: number[], duration = 1.2) {
    this.ensureContext();
    const dest = this.getSynthDestination();
    if (!this.ctx || !dest) return;

    const now = this.ctx.currentTime;
    const chordGain = this.ctx.createGain();
    chordGain.gain.setValueAtTime(0, now);
    chordGain.gain.linearRampToValueAtTime(0.28 / Math.sqrt(frequencies.length), now + 0.06);
    chordGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(1400, now);
    padFilter.frequency.linearRampToValueAtTime(2800, now + 0.15);
    padFilter.frequency.exponentialRampToValueAtTime(800, now + duration);
    padFilter.Q.setValueAtTime(2.0, now);

    frequencies.forEach((freq) => {
      [-5, 5].forEach((detune) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detune, now);
        osc.connect(padFilter);
        osc.start(now);
        osc.stop(now + duration);
      });
    });

    padFilter.connect(chordGain);
    chordGain.connect(dest);
  }

  public play808(baseFreq: number = 43.65, duration = 0.8) {
    this.ensureContext();
    const dest = this.getSynthDestination();
    if (!this.ctx || !dest) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 2.8, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.06);

    gainNode.gain.setValueAtTime(0.58, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const distortion = this.ctx.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(18);

    osc.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(dest);

    osc.start(now);
    osc.stop(now + duration);
  }

  public playKick(accent = false) {
    this.ensureContext();
    const dest = this.getSynthDestination();
    if (!this.ctx || !dest) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 160 : 130, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

    gain.gain.setValueAtTime(accent ? 0.78 : 0.62, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playSnareOrClap() {
    this.ensureContext();
    const dest = this.getSynthDestination();
    if (!this.ctx || !dest) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    whiteNoise.start(now);
  }

  public playHiHat(open = false) {
    this.ensureContext();
    const dest = this.getSynthDestination();
    if (!this.ctx || !dest) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * (open ? 0.18 : 0.05);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(open ? 0.22 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (open ? 0.18 : 0.05));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(now);
  }

  public playLeadPluck(freq: number, duration = 0.4) {
    this.ensureContext();
    const dest = this.getSynthDestination();
    if (!this.ctx || !dest) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + duration);
  }

  public startLoop(onStep?: ((step: number) => void) | null) {
    this.ensureContext();
    if (this.isLooping) return;
    this.isLooping = true;
    this.currentStep = 0;
    this.onStepCallback = onStep || null;

    const stepIntervalMs = (60 / this.bpm / 4) * 1000;

    const tick = () => {
      if (!this.isLooping) return;

      const step = this.currentStep % 16;
      const bar = Math.floor((this.currentStep % 64) / 16);
      const chordIndex = bar % this.currentChords.length;

      // Chords
      if (this.stems.chords && (step === 0 || step === 6 || step === 10)) {
        const chord = this.currentChords[chordIndex] || this.currentChords[0];
        this.playChord(chord, 0.4);
      }

      // 808 Bass
      if (this.stems.bass && (step === 0 || step === 3 || step === 8 || step === 11)) {
        const bassFreq = this.bassNotes[chordIndex] || this.bassNotes[0];
        this.play808(bassFreq, 0.45);
      }

      // Drums
      if (this.stems.drums) {
        if (step === 0 || step === 4 || step === 7 || step === 10 || step === 12) {
          this.playKick(step === 0);
        }
        if (step === 4 || step === 12) {
          this.playSnareOrClap();
        }
        if (step % 2 === 0 || step === 11 || step === 15) {
          this.playHiHat(step === 2 || step === 10);
        }
      }

      // Lead Pluck Arpeggio
      if (this.stems.lead && (step % 2 === 1)) {
        const chord = this.currentChords[chordIndex] || this.currentChords[0];
        const noteIndex = (step / 2) % chord.length;
        const note = chord[Math.floor(noteIndex)] * 2;
        this.playLeadPluck(note, 0.2);
      }

      if (this.onStepCallback) {
        this.onStepCallback(step);
      }

      this.currentStep = (this.currentStep + 1) % 64;
      this.loopTimer = window.setTimeout(tick, stepIntervalMs);
    };

    tick();
  }

  public stopLoop() {
    this.isLooping = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.onStepCallback) {
      this.onStepCallback(-1);
    }
  }

  public getIsLooping(): boolean {
    return this.isLooping;
  }

  private dbToGain(db: number): number {
    return Math.pow(10, db / 20);
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = typeof amount === 'number' ? amount : 50;
    const nSamples = 44100;
    const buffer = new ArrayBuffer(nSamples * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private makeSoftClipCurve(): Float32Array<ArrayBuffer> {
    const nSamples = 44100;
    const buffer = new ArrayBuffer(nSamples * 4);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      // Hyperbolic tangent soft saturation
      curve[i] = Math.tanh(x * 1.4) / 1.1;
    }
    return curve;
  }

  /**
   * Export synthesized 15-second hook directly to WAV audio file
   */
  public async renderWavFile(
    chords: number[][],
    bassNotes: number[],
    bpm: number,
    durationSec: number = 15
  ): Promise<Blob> {
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSec, sampleRate);

    // Setup offline master chain
    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0.88, 0);

    const subEq = offlineCtx.createBiquadFilter();
    subEq.type = 'lowshelf';
    subEq.frequency.setValueAtTime(60, 0);
    subEq.gain.setValueAtTime(1.8, 0);

    const airEq = offlineCtx.createBiquadFilter();
    airEq.type = 'highshelf';
    airEq.frequency.setValueAtTime(12000, 0);
    airEq.gain.setValueAtTime(2.2, 0);

    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-14, 0);
    comp.ratio.setValueAtTime(3.5, 0);
    comp.attack.setValueAtTime(0.005, 0);
    comp.release.setValueAtTime(0.1, 0);

    subEq.connect(airEq);
    airEq.connect(comp);
    comp.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    const stepInterval = 60 / bpm / 4;
    const totalSteps = Math.floor(durationSec / stepInterval);

    for (let step = 0; step < totalSteps; step++) {
      const time = step * stepInterval;
      const bar = Math.floor((step % 64) / 16);
      const chordIndex = bar % chords.length;
      const chord = chords[chordIndex] || chords[0];
      const bassFreq = bassNotes[chordIndex] || bassNotes[0];
      const localStep = step % 16;

      if (localStep === 0 || localStep === 6 || localStep === 10) {
        const chordGain = offlineCtx.createGain();
        chordGain.gain.setValueAtTime(0, time);
        chordGain.gain.linearRampToValueAtTime(0.25 / Math.sqrt(chord.length), time + 0.05);
        chordGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        chord.forEach((freq) => {
          [-4, 4].forEach((detune) => {
            const osc = offlineCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, time);
            osc.detune.setValueAtTime(detune, time);
            osc.connect(chordGain);
            osc.start(time);
            osc.stop(time + 0.55);
          });
        });
        chordGain.connect(subEq);
      }

      if (localStep === 0 || localStep === 3 || localStep === 8 || localStep === 11) {
        const bassOsc = offlineCtx.createOscillator();
        const bassGain = offlineCtx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(bassFreq * 2.5, time);
        bassOsc.frequency.exponentialRampToValueAtTime(bassFreq, time + 0.05);
        bassGain.gain.setValueAtTime(0.55, time);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

        bassOsc.connect(bassGain);
        bassGain.connect(subEq);
        bassOsc.start(time);
        bassOsc.stop(time + 0.42);
      }

      if (localStep === 0 || localStep === 4 || localStep === 7 || localStep === 10 || localStep === 12) {
        const kickOsc = offlineCtx.createOscillator();
        const kickGain = offlineCtx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, time);
        kickOsc.frequency.exponentialRampToValueAtTime(45, time + 0.08);
        kickGain.gain.setValueAtTime(0.68, time);
        kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        kickOsc.connect(kickGain);
        kickGain.connect(subEq);
        kickOsc.start(time);
        kickOsc.stop(time + 0.22);
      }

      if (localStep === 4 || localStep === 12) {
        const noiseBuffer = offlineCtx.createBuffer(1, Math.floor(sampleRate * 0.12), sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = offlineCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseFilter = offlineCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(1200, time);
        const noiseGain = offlineCtx.createGain();
        noiseGain.gain.setValueAtTime(0.38, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(subEq);
        noise.start(time);
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return this.audioBufferToWav(renderedBuffer);
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');

    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export const audioEngine = new AudioEngine();
