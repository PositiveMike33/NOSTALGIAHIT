import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Volume2,
  Sliders,
  Sparkles,
  Download,
  Copy,
  Check,
  Disc,
  Activity,
  Layers,
  FileText,
  DollarSign,
  Radio,
  Cpu,
  Mic,
  Music,
  Share2,
  Lock,
  RefreshCw,
  Zap,
  CheckCircle2,
  Flame,
  Award,
  ShieldCheck,
  ChevronRight,
  Info,
  SlidersHorizontal,
  Globe,
  Calendar,
  TrendingUp,
  Video,
  Smartphone,
  Hash,
  Clock,
  Eye,
  Send,
  Filter,
  Crown,
  CreditCard,
  Star,
  X,
  Shield,
  ArrowRight,
} from 'lucide-react';
import {
  audioEngine,
  MasteringSettings,
  MultibandSettings,
  StemToggles,
} from './audioEngine';
import { NOSTALGIA_PRESETS, PresetConfig } from './presets';

type ActiveTab = 'studio' | 'agents' | 'mastering' | 'sales';

interface FrequencyBandInfo {
  id: 'sub' | 'bass' | 'lowMid' | 'mid' | 'highMid' | 'air';
  name: string;
  range: string;
  minHz: number;
  maxHz: number;
  color: string;
  eqKey: 'subBassGain' | 'mudCutGain' | 'midGain' | 'clarityGain' | 'airBoostGain' | 'lowCutFreq';
  role: string;
  advice: string;
}

const FREQUENCY_BANDS: FrequencyBandInfo[] = [
  {
    id: 'sub',
    name: 'Sub-Bass',
    range: '20 - 60 Hz',
    minHz: 20,
    maxHz: 60,
    color: '#06B6D4',
    eqKey: 'subBassGain',
    role: 'Impact physique 808 & Poids subs',
    advice: 'Boost modéré (+1.5 à +3 dB) pour faire trembler les caissons sans saturer les petits haut-parleurs.',
  },
  {
    id: 'bass',
    name: 'Bas-Médiums / Kick',
    range: '60 - 250 Hz',
    minHz: 60,
    maxHz: 250,
    color: '#3B82F6',
    eqKey: 'lowCutFreq',
    role: 'Corps du Kick & Chaleur de la Basse',
    advice: 'Coupe-bas chirurgical à 28 Hz pour libérer le headroom dynamique et éviter la distorsion intermodulée.',
  },
  {
    id: 'lowMid',
    name: 'Mud / Boue',
    range: '250 - 500 Hz',
    minHz: 250,
    maxHz: 500,
    color: '#F43F5E',
    eqKey: 'mudCutGain',
    role: 'Résonance encombrante & Carton',
    advice: 'Atténuation chirurgicale (-2 à -4 dB à 320 Hz) pour purifier le mix et faire ressortir le vocal.',
  },
  {
    id: 'mid',
    name: 'Médiums / Voix',
    range: '500 - 2000 Hz',
    minHz: 500,
    maxHz: 2000,
    color: '#A855F7',
    eqKey: 'midGain',
    role: 'Corps vocal & Présence harmonique synthé',
    advice: 'Équilibre délicat pour assurer la clarté téléphonique et le timbre nostalgique.',
  },
  {
    id: 'highMid',
    name: 'Haut-Médiums / Attack',
    range: '2000 - 6000 Hz',
    minHz: 2000,
    maxHz: 6000,
    color: '#EAB308',
    eqKey: 'clarityGain',
    role: 'Attaque du Snare & Consonnes du chant',
    advice: 'Boost de netteté (+1 à +2 dB) pour garantir l’intelligibilité immédiate sur les smartphones.',
  },
  {
    id: 'air',
    name: 'Air & Brillance',
    range: '6000 - 20000 Hz',
    minHz: 6000,
    maxHz: 20000,
    color: '#10B981',
    eqKey: 'airBoostGain',
    role: 'Finition soyeuse & Sparkle AirPods',
    advice: 'High-shelf soyeux (+2 à +3 dB à 12.5 kHz) pour la signature sonore moderne type The Weeknd / Daft Punk.',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [selectedPreset, setSelectedPreset] = useState<PresetConfig>(NOSTALGIA_PRESETS[0]);

  // Audio Engine & Sequencer State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [bpm, setBpm] = useState<number>(NOSTALGIA_PRESETS[0].bpm);
  const [stems, setStems] = useState<StemToggles>({
    drums: true,
    bass: true,
    chords: true,
    lead: true,
  });

  // Surgical EQ Mastering parameters
  const [mastering, setMastering] = useState<MasteringSettings>({
    lowCutFreq: 28,
    subBassGain: 1.8,
    mudCutGain: -2.8,
    midGain: 0.5,
    clarityGain: 1.2,
    airBoostGain: 2.4,
    filterCutoff: 18000,
    masterVolume: 0.88,
    targetProfile: 'tiktok',
  });

  // Multiband Compressor parameters
  const [multiband, setMultiband] = useState<MultibandSettings>({
    enabled: true,
    lowThreshold: -18,
    lowRatio: 4.5,
    lowMakeup: 2.0,
    midThreshold: -15,
    midRatio: 3.2,
    midMakeup: 1.5,
    highThreshold: -12,
    highRatio: 2.5,
    highMakeup: 2.2,
  });

  // Multiband Gain Reduction live state
  const [reductions, setReductions] = useState({ low: 0, mid: 0, high: 0 });

  // Spectrum Analyzer Interactive State
  const [hoveredBand, setHoveredBand] = useState<FrequencyBandInfo | null>(null);
  const [selectedBand, setSelectedBand] = useState<FrequencyBandInfo>(FREQUENCY_BANDS[0]);
  const [liveBandDbs, setLiveBandDbs] = useState<Record<string, number>>({});

  // Live Canvas Oscilloscope & Spectrum
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // FFT Spectrum Analyzer Decay & Peak Hold Caps Refs (Realistic Analog VU Ballistics)
  const smoothedBarsRef = useRef<Float32Array>(new Float32Array(64));
  const peakCapsRef = useRef<Float32Array>(new Float32Array(64));
  const peakFallSpeedRef = useRef<Float32Array>(new Float32Array(64));

  // Meter states
  const [peakDb, setPeakDb] = useState<number>(-6.0);
  const [currentLufs, setCurrentLufs] = useState<number>(-9.2);

  // Pad pressed state for visual feedback
  const [activePad, setActivePad] = useState<number | null>(null);

  // Multi-Agent Swarm Orchestration State
  const [isOrchestrating, setIsOrchestrating] = useState<boolean>(false);
  const [orchestrationData, setOrchestrationData] = useState<any>(null);

  // Customization Inputs
  const [customRef, setCustomRef] = useState<string>(selectedPreset.artistRef);
  const [customStyle, setCustomStyle] = useState<string>(selectedPreset.targetStyle);
  const [customAudience, setCustomAudience] = useState<string>(selectedPreset.targetAudience);
  const [customOffer, setCustomOffer] = useState<string>(selectedPreset.defaultOffer);

  // Bilingual Lyrics Generator State (AGENT-VOICE)
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState<boolean>(false);
  const [lyricsData, setLyricsData] = useState<{
    songTitle: string;
    vibeStory: string;
    verse: Array<{ line: string; lang: 'FR' | 'EN'; syllables: number; rhythmFeel?: string }>;
    preChorus: Array<{ line: string; lang: 'FR' | 'EN'; syllables: number }>;
    chorus: Array<{ line: string; lang: 'FR' | 'EN'; syllables: number; earwormFactor?: string }>;
    hookChopAdlibs: string[];
    phoneticGuide: string;
    culturalNostalgiaTriggers: string[];
  }>({
    songTitle: 'One More Midnight (French Touch 2026 Flip)',
    vibeStory: 'Fusion nostalgique 2001 Daft Punk x Stromae réécrite pour la génération dopamine rush et afters électroniques.',
    verse: [
      { line: "Deux heures du mat', scrolling dans l'inconnu", lang: 'FR', syllables: 10, rhythmFeel: 'Syncopé 8th notes' },
      { line: 'Flashback 2000s, I remember what we knew', lang: 'EN', syllables: 11, rhythmFeel: 'Légat vocal' },
      { line: 'Ton regard néon coupe le son dans la ville', lang: 'FR', syllables: 11, rhythmFeel: 'Staccato sur le kick' },
      { line: 'One click, one look, got me so unstable', lang: 'EN', syllables: 10, rhythmFeel: 'Jersey bounce' },
    ],
    preChorus: [
      { line: "La basse monte, on n'a plus le choix", lang: 'FR', syllables: 8 },
      { line: "Just lose control, c'est que toi et moi", lang: 'FR', syllables: 9 },
      { line: "Feel the pressure drop inside your veins", lang: 'EN', syllables: 9 },
      { line: "Ce soir on efface toutes les peines", lang: 'FR', syllables: 8 },
    ],
    chorus: [
      { line: "One more night, donne-moi le tempo !", lang: 'FR', syllables: 9, earwormFactor: 'Maximum' },
      { line: "Nostalgia rush, on vit en stéréo !", lang: 'FR', syllables: 9, earwormFactor: 'Maximum' },
      { line: "Can you feel the love? Répète encore une fois", lang: 'EN', syllables: 11, earwormFactor: 'High' },
      { line: "T'es mon euphorie quand le monde a froid !", lang: 'FR', syllables: 10, earwormFactor: 'Maximum' },
    ],
    hookChopAdlibs: [
      'One more... (Drop !)',
      'Déjà minuit... (Let it roll !)',
      'Stay with me... (Hey !)',
      'C’est notre heure... (Bounce !)',
    ],
    phoneticGuide: '[wʌn mɔː naɪt] dɔn mwa lə tɑ̃po / [nɒsˈtældʒə rʌʃ] ɔ̃ vi ɑ̃ steʁeo / Cadence accentuée sur les temps 2 et 4.',
    culturalNostalgiaTriggers: [
      'Daft Punk Alive 2007 (Synth Sweeps)',
      'Minidisc / iPod Classic 2000s Nostalgia',
      'TikTok 2026 Night-Drive Aesthetic',
      'Stromae Melancholic Euphoria',
    ],
  });

  // Subscription Plans & Account State (Spotify & YouTube Music Architecture)
  type SubscriptionTier = 'free' | 'premium' | 'pro';
  type BillingCycle = 'monthly' | 'annual';
  const [userPlan, setUserPlan] = useState<SubscriptionTier>('free');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<SubscriptionTier>('premium');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('@AlexTikTok');
  const [clientNiche, setClientNiche] = useState<string>('Mode & Lifestyle');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'ach'>('stripe');
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [isRenderingWav, setIsRenderingWav] = useState<boolean>(false);

  // A/B Mastering & Loudness-Matched Gain Compensation State
  const [abMode, setAbMode] = useState<'A' | 'B'>('B'); // 'A' = Mix Brut, 'B' = Master Traité
  const [gainCompEnabled, setGainCompEnabled] = useState<boolean>(true);
  const [gainCompOffsetDb, setGainCompOffsetDb] = useState<number>(3.6);

  // 7-Day Viral Social Media Schedule State (TikTok, Instagram Reels)
  const [socialPlatformFilter, setSocialPlatformFilter] = useState<'all' | 'tiktok' | 'instagram'>('all');
  const [copiedSocialDay, setCopiedSocialDay] = useState<number | null>(null);
  const [copiedFullCalendar, setCopiedFullCalendar] = useState<boolean>(false);
  const [calendarAngleVariant, setCalendarAngleVariant] = useState<number>(0);
  const [activeCalendarDay, setActiveCalendarDay] = useState<number>(1);
  const [calendarViewMode, setCalendarViewMode] = useState<'focused' | 'grid'>('focused');

  // Sync Engine with Preset
  useEffect(() => {
    audioEngine.setProgression(selectedPreset.chords, selectedPreset.bassNotes, bpm);
  }, [selectedPreset, bpm]);

  // Sync Mastering & Multiband with Audio Engine
  useEffect(() => {
    audioEngine.updateMastering(mastering);
  }, [mastering]);

  useEffect(() => {
    audioEngine.updateMultiband(multiband);
  }, [multiband]);

  // Sync Stems
  useEffect(() => {
    audioEngine.setStems(stems);
  }, [stems]);

  // Keyboard Shortcuts for Jamming
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      const key = e.key.toLowerCase();
      if (key === ' ') {
        e.preventDefault();
        togglePlayLoop();
      } else if (key === 'a') triggerPad(0);
      else if (key === 's') triggerPad(1);
      else if (key === 'd') triggerPad(2);
      else if (key === 'f') triggerPad(3);
      else if (key === 'j') triggerPad(4);
      else if (key === 'k') triggerPad(5);
      else if (key === 'l') triggerPad(6);
      else if (key === ';') triggerPad(7);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPreset, isPlaying]);

  // Real-time Canvas Visualizer Loop + Frequency Bands Measurement
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const analyser = audioEngine.getAnalyser();
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Deep Studio Grid Background
      ctx.fillStyle = '#08080C';
      ctx.fillRect(0, 0, width, height);

      // Studio Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 45) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Interactive Frequency Band Columns
      const bandWidth = width / FREQUENCY_BANDS.length;
      FREQUENCY_BANDS.forEach((band, index) => {
        const startX = index * bandWidth;
        const isHovered = hoveredBand?.id === band.id;
        const isSelected = selectedBand?.id === band.id;

        // Band Background highlight
        if (isSelected) {
          ctx.fillStyle = 'rgba(168, 85, 247, 0.09)';
          ctx.fillRect(startX, 0, bandWidth, height);
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(startX, 0, bandWidth, height);
        } else if (isHovered) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.07)';
          ctx.fillRect(startX, 0, bandWidth, height);
        }

        // Zone Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, height);
        ctx.stroke();

        // Label Top of Band
        ctx.fillStyle = isSelected ? '#A855F7' : isHovered ? '#06B6D4' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px monospace';
        ctx.fillText(band.name, startX + 6, 16);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '8px monospace';
        ctx.fillText(band.range, startX + 6, 28);
      });

      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const timeData = new Uint8Array(bufferLength);
        const freqData = new Uint8Array(bufferLength);

        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        // Update live reduction values
        const mbReds = audioEngine.getCompressionReductions();
        setReductions(mbReds);

        // Calculate dynamic Peak & LUFS approximation
        let sumSquares = 0;
        let peakVal = 0;
        for (let i = 0; i < bufferLength; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSquares += norm * norm;
          if (Math.abs(norm) > peakVal) peakVal = Math.abs(norm);
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        const peakCalculated = peakVal > 0 ? 20 * Math.log10(peakVal) : -60;
        const lufsCalculated = rms > 0 ? -14 + 10 * Math.log10(rms * 1.8 + 0.001) : -45;

        setPeakDb(parseFloat(Math.max(-60, peakCalculated).toFixed(1)));
        setCurrentLufs(parseFloat(Math.max(-45, lufsCalculated).toFixed(1)));

        // Live energy calculation per frequency band
        const bandEnergyMap: Record<string, number> = {};
        const binsPerBand = Math.floor(bufferLength / FREQUENCY_BANDS.length);
        FREQUENCY_BANDS.forEach((band, idx) => {
          let energySum = 0;
          for (let b = idx * binsPerBand; b < (idx + 1) * binsPerBand; b++) {
            energySum += freqData[b] || 0;
          }
          const avg = energySum / binsPerBand;
          const bandDb = avg > 0 ? (avg / 255) * 60 - 45 : -60;
          bandEnergyMap[band.id] = parseFloat(bandDb.toFixed(1));
        });
        setLiveBandDbs(bandEnergyMap);

        // 1. Draw FFT Frequency Bars with Realistic Analog Decay & Peak Hold Caps
        const numBars = 64;
        const barWidth = width / numBars;
        const smoothed = smoothedBarsRef.current;
        const peakCaps = peakCapsRef.current;
        const peakSpeeds = peakFallSpeedRef.current;

        for (let i = 0; i < numBars; i++) {
          const rawAmp = (freqData[i * 2] || 0) / 255;
          const targetHeight = rawAmp * (height * 0.74);

          // Audio Meter Ballistics:
          // Fast Attack: bars instantly jump on dynamic transients (kick, snare, chords)
          // Smooth Analog Decay: bars smoothly glide down without any stuttering or jitter
          if (targetHeight > smoothed[i]) {
            smoothed[i] += (targetHeight - smoothed[i]) * 0.72;
          } else {
            // Fluid exponential decay (~4-6 dB falloff curve)
            smoothed[i] = Math.max(0, smoothed[i] * 0.905 - 0.45);
          }

          // Floating Peak Hold Caps with gravity acceleration
          if (smoothed[i] >= peakCaps[i]) {
            peakCaps[i] = smoothed[i];
            peakSpeeds[i] = 0;
          } else {
            peakSpeeds[i] += 0.22; // gravity acceleration
            peakCaps[i] = Math.max(0, peakCaps[i] - peakSpeeds[i]);
          }

          const currentHeight = smoothed[i];
          if (currentHeight > 0.5) {
            const x = i * barWidth;
            const y = height - currentHeight;

            const gradient = ctx.createLinearGradient(0, height, 0, y);
            gradient.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
            gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.45)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.85)');

            ctx.fillStyle = gradient;
            ctx.fillRect(x + 1, y, barWidth - 2, currentHeight);

            // Floating Peak Hold Cap indicator (precision studio meter style)
            const capY = height - peakCaps[i];
            if (capY < height - 1 && peakCaps[i] > 2) {
              ctx.fillStyle = '#34D399';
              ctx.shadowColor = '#10B981';
              ctx.shadowBlur = 4;
              ctx.fillRect(x + 1, Math.max(0, capY - 2), barWidth - 2, 2);
              ctx.shadowBlur = 0;
            }
          }
        }

        // 2. Draw Oscilloscope Waveform overlay
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#A855F7';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#A855F7';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Idle state: smoothly decay remaining bars down to 0
        const smoothed = smoothedBarsRef.current;
        const peakCaps = peakCapsRef.current;
        for (let i = 0; i < 64; i++) {
          smoothed[i] = Math.max(0, smoothed[i] * 0.9 - 0.5);
          peakCaps[i] = Math.max(0, peakCaps[i] - 1.2);
        }
        // Idle line
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [hoveredBand, selectedBand]);

  // Handle Canvas Mouse Move to identify hovered frequency band
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = x / rect.width;
    const bandIdx = Math.min(
      FREQUENCY_BANDS.length - 1,
      Math.floor(relativeX * FREQUENCY_BANDS.length)
    );
    setHoveredBand(FREQUENCY_BANDS[bandIdx]);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = x / rect.width;
    const bandIdx = Math.min(
      FREQUENCY_BANDS.length - 1,
      Math.floor(relativeX * FREQUENCY_BANDS.length)
    );
    setSelectedBand(FREQUENCY_BANDS[bandIdx]);
  };

  const handleSelectPreset = (preset: PresetConfig) => {
    setSelectedPreset(preset);
    setBpm(preset.bpm);
    setCustomRef(preset.artistRef);
    setCustomStyle(preset.targetStyle);
    setCustomAudience(preset.targetAudience);
    setCustomOffer(preset.defaultOffer);
    audioEngine.setProgression(preset.chords, preset.bassNotes, preset.bpm);
  };

  const togglePlayLoop = () => {
    audioEngine.ensureContext();
    if (isPlaying) {
      audioEngine.stopLoop();
      setIsPlaying(false);
      setActiveStep(-1);
    } else {
      audioEngine.startLoop((step) => {
        setActiveStep(step);
      });
      setIsPlaying(true);
    }
  };

  const triggerPad = (index: number) => {
    audioEngine.ensureContext();
    setActivePad(index);
    setTimeout(() => setActivePad(null), 180);

    // 0-3: Chords
    if (index >= 0 && index < 4) {
      const chord = selectedPreset.chords[index] || selectedPreset.chords[0];
      audioEngine.playChord(chord, 0.8);
    }
    // 4-5: 808 Sub-Bass
    else if (index === 4) {
      const bassNote = selectedPreset.bassNotes[0] || 43.65;
      audioEngine.play808(bassNote, 0.6);
    } else if (index === 5) {
      const bassNote = selectedPreset.bassNotes[1] || 34.65;
      audioEngine.play808(bassNote, 0.6);
    }
    // 6: Jersey Kick Stutter
    else if (index === 6) {
      audioEngine.playKick(true);
      setTimeout(() => audioEngine.playKick(false), 90);
    }
    // 7: Snare / Clap Snap
    else if (index === 7) {
      audioEngine.playSnareOrClap();
    }
  };

  // Switch Mastering Target Profile (-14 LUFS Spotify, -9.2 LUFS TikTok, -7.8 LUFS Ultra Club)
  const handleApplyMasteringProfile = (profile: 'spotify' | 'tiktok' | 'club_ultra') => {
    const result = audioEngine.applyMasteringProfile(profile);
    setMastering((prev) => ({
      ...prev,
      ...result.eq,
      targetProfile: profile,
    }));
    setMultiband(result.mb);
    // Sync gain compensation offset to current profile
    setGainCompOffsetDb(audioEngine.getGainCompensationOffset());
  };

  // Toggle A/B Mastering Mode ('A' = Mix Brut Original Bypass, 'B' = Master Traité)
  const handleToggleAbMode = (mode: 'A' | 'B') => {
    audioEngine.ensureContext();
    setAbMode(mode);
    audioEngine.setAbMode(mode);
  };

  // Toggle Loudness-Matched Gain Compensation
  const handleToggleGainComp = () => {
    audioEngine.ensureContext();
    const nextVal = !gainCompEnabled;
    setGainCompEnabled(nextVal);
    audioEngine.setGainCompensationEnabled(nextVal);
  };

  // Adjust Gain Compensation Offset manually
  const handleGainOffsetChange = (val: number) => {
    audioEngine.ensureContext();
    setGainCompOffsetDb(val);
    audioEngine.setGainCompensationOffset(val);
  };

  // Reset Gain Compensation Offset to profile default
  const handleResetGainCompToDefault = () => {
    const defaultOffset =
      mastering.targetProfile === 'spotify' ? 1.8 : mastering.targetProfile === 'tiktok' ? 3.6 : 4.8;
    handleGainOffsetChange(defaultOffset);
  };

  // Generate Bilingual Lyrics via AGENT-VOICE
  const handleGenerateBilingualLyrics = async () => {
    setIsGeneratingLyrics(true);
    try {
      const res = await fetch('/api/lyrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceTrack: customRef,
          targetStyle: customStyle,
          bpm: bpm,
          key: selectedPreset.key,
          vibe: 'Nostalgie Électrique & Euphorie Club',
          slangProfile: 'Millennials 21-40 & Gen Z Viral',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.verse && data.chorus) {
          setLyricsData(data);
          setIsGeneratingLyrics(false);
          return;
        }
      }
      throw new Error('Fallback needed');
    } catch (e) {
      // High-grade client fallback with fresh bilingual verses
      setTimeout(() => {
        setLyricsData({
          songTitle: `${selectedPreset.name} (Official 2026 Bilingual Flip)`,
          vibeStory: `Émulation nostalgique ${selectedPreset.artistRef} combinée à l'énergie TikTok/Club 2026.`,
          verse: [
            { line: "Deux heures du mat', scrolling dans l'inconnu", lang: 'FR', syllables: 10, rhythmFeel: 'Syncopé 8th notes' },
            { line: 'Flashback 2000s, I remember what we knew', lang: 'EN', syllables: 11, rhythmFeel: 'Légat vocal' },
            { line: 'Le filtre analogique embrasse ton regard', lang: 'FR', syllables: 11, rhythmFeel: 'Staccato sur le kick' },
            { line: "No sleep tonight, let's reset to the start", lang: 'EN', syllables: 10, rhythmFeel: 'Jersey bounce' },
          ],
          preChorus: [
            { line: "La basse monte, on n'a plus le choix", lang: 'FR', syllables: 8 },
            { line: "Just lose control, c'est que toi et moi", lang: 'FR', syllables: 9 },
            { line: 'Feel the pressure drop inside your veins', lang: 'EN', syllables: 9 },
            { line: 'Ce soir on efface toutes les peines', lang: 'FR', syllables: 8 },
          ],
          chorus: [
            { line: "One more night, donne-moi le tempo !", lang: 'FR', syllables: 9, earwormFactor: 'Maximum' },
            { line: "Nostalgia rush, on vit en stéréo !", lang: 'FR', syllables: 9, earwormFactor: 'Maximum' },
            { line: 'Can you feel the love? Répète encore une fois', lang: 'EN', syllables: 11, earwormFactor: 'High' },
            { line: "T'es mon euphorie quand le monde a froid !", lang: 'FR', syllables: 10, earwormFactor: 'Maximum' },
          ],
          hookChopAdlibs: [
            'One more... (Drop !)',
            'Déjà minuit... (Let it roll !)',
            'Stay with me... (Hey !)',
            'C’est notre heure... (Bounce !)',
          ],
          phoneticGuide: '[wʌn mɔː naɪt] dɔn mwa lə tɑ̃po / [nɒsˈtældʒə rʌʃ] ɔ̃ vi ɑ̃ steʁeo / Cadence accentuée sur les temps 2 et 4.',
          culturalNostalgiaTriggers: [
            'Daft Punk Alive 2007 (French Touch filtered sweep)',
            'Minidisc & iPod Classic 2000s Nostalgia',
            'TikTok 2026 Night-Drive Aesthetic & Delulu Vibe',
            'Stromae Melancholic Euphoria',
          ],
        });
        setIsGeneratingLyrics(false);
      }, 700);
    }
  };

  const handleExportWav = async () => {
    setIsRenderingWav(true);
    try {
      const blob = await audioEngine.renderWavFile(
        selectedPreset.chords,
        selectedPreset.bassNotes,
        bpm,
        15
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NostalgiaHit_${selectedPreset.id}_${bpm}BPM.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('WAV rendering error:', err);
    } finally {
      setIsRenderingWav(false);
    }
  };

  const handleCopyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleExportMarkdown = () => {
    const activeData = orchestrationData || {
      sessionTitle: `${selectedPreset.name} (Official 2026 Flip)`,
      orchMaestro: { key: selectedPreset.key, bpm: bpm, neuroHookTrigger: selectedPreset.neuroHookTrigger },
      agentBeat: selectedPreset.agentBeatPreview,
      agentVoice: selectedPreset.agentVoicePreview,
      agentSound: selectedPreset.agentSoundPreview,
      agentViral: selectedPreset.agentViralPreview,
    };

    const lyricsFormatted = `
### PAROLES BILINGUES OFFICIELLES (AGENT-VOICE)
**Couplet :**
${lyricsData.verse.map((v) => `- [${v.lang}] ${v.line} (${v.syllables} syllabes)`).join('\n')}

**Pré-Refrain :**
${lyricsData.preChorus.map((v) => `- [${v.lang}] ${v.line}`).join('\n')}

**Refrain Earworm :**
${lyricsData.chorus.map((v) => `- [${v.lang}] "${v.line}"`).join('\n')}

**Ad-Libs & Chops :** ${lyricsData.hookChopAdlibs.join(' • ')}
**Guide Phonétique :** ${lyricsData.phoneticGuide}
`;

    const content = `# 🎵 FICHE DE PRODUCTION OFFICIELLE : NOSTALGIAHIT STUDIO
**Titre :** ${activeData.sessionTitle || selectedPreset.name}
**Référence Nostalgie :** ${customRef}
**Style Moderne :** ${customStyle}
**BPM :** ${bpm} | **Tonalité :** ${selectedPreset.key}
**Standard Mastering :** ${mastering.targetProfile.toUpperCase()} (-9.2 LUFS TikTok / -14 LUFS Spotify)
**Date :** ${new Date().toLocaleDateString('fr-CA')}

---

## 1. DIRECTION ARTISTIQUE [ORCH-MAESTRO]
- **Tonalité :** ${selectedPreset.key}
- **Ancre Neurologique (1.2s) :** ${activeData.orchMaestro?.neuroHookTrigger || selectedPreset.neuroHookTrigger}
- **Verdict A&R :** Validé pour diffusion broadcast, club et plateformes de streaming.

## 2. DÉCONSTRUCTION HARMONIQUE & RYTHMIQUE [AGENT-BEAT]
- **Grille d'accords :** ${activeData.agentBeat?.chordProgression || selectedPreset.agentBeatPreview.progression}
- **Basse 808 / Moog :** ${activeData.agentBeat?.basslineArchitecture || selectedPreset.agentBeatPreview.bassType}
- **Pattern de Drums :** ${activeData.agentBeat?.drumPattern || selectedPreset.agentBeatPreview.drumStyle}

## 3. TOPLINE & PAROLES BILINGUES [AGENT-VOICE]
${lyricsFormatted}

## 4. MASTERING & PSYCHO-ACOUSTIQUE [AGENT-SOUND]
- **Profil Cible :** ${mastering.targetProfile}
- **Sub-Bass (55 Hz) :** ${mastering.subBassGain} dB
- **Mud Cut (320 Hz) :** ${mastering.mudCutGain} dB
- **Clarté (4.2 kHz) :** ${mastering.clarityGain} dB
- **Brillance Air (12.5 kHz) :** ${mastering.airBoostGain} dB
- **Compresseur Multibande :** Actif (3 Bandes Crossover 250Hz / 3.5kHz)

## 5. PACKAGING VIRAL & VENTES FAST CASH [AGENT-VIRAL]
- **Script Cold DM :**
${activeData.agentViral?.coldDmScript || selectedPreset.agentViralPreview.dmPitch}
- **Concept TikTok Avant/Après :** ${activeData.agentViral?.tiktokVideoConcept || selectedPreset.agentViralPreview.videoConcept}
- **Tarif Recommandé :** ${customOffer}

---
*Généré par NostalgiaHit Studio Multi-Agent - 0$ Infra, 100% Synthèse Web Audio.*
`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fiche_Production_${selectedPreset.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 7-Day Dynamic Social Media Schedule based on selectedPreset, lyricsData & marketing angle
  const socialSchedule = React.useMemo(() => {
    const artist = selectedPreset.artistRef;
    const style = selectedPreset.targetStyle;
    const song = lyricsData.songTitle;
    const chorusLine = lyricsData.chorus[0]?.line || 'One more night, donne-moi le tempo !';
    const tagBase = selectedPreset.id.replace(/-/g, '');

    const isUnderground = calendarAngleVariant === 1;
    const isStorytelling = calendarAngleVariant === 2;

    return [
      {
        day: 1,
        dayName: 'Jour 1',
        weekday: 'Lundi',
        timeSlot: '18h30 (Heure de Pointe Soirée)',
        platforms: ['TikTok', 'Instagram Reels'] as ('TikTok' | 'Instagram Reels' | 'Shorts')[],
        title: 'Transition "Split-Screen" Avant / Après (2000s vs 2026)',
        editingTheme: 'Écran partagé vertical (50/50) : clip/vinyle vintage en haut vs studio drop moderne en bas',
        cameraAndMontageInstructions: [
          '0:00 - 0:03 : Haut de l’écran : Pochette vinyle ou extrait clip Y2K avec filtre VHS grain 1999 + audio étouffé (Lowpass 600 Hz).',
          '0:03.2 : Transition White Flash + Zoom dynamique 1.2x vers la console studio en bas.',
          '0:03.2 - 0:15 : Déclenchement du drop à plein volume (-9.2 LUFS). Les cuts vidéo s’enchaînent sur chaque coup de snare.',
        ],
        visualHook0to1s: isUnderground
          ? `POV : Le club s’arrête quand ce drop de ${artist} frappe les enceintes 🚨`
          : `POV : Tu as 14 ans dans ta chambre en 2005 et ce sample sortait sur MTV... 🔥`,
        caption: `On a déconstruit l'accord mythique de ${artist} pour en faire le son le plus chaud de 2026 en version ${style} (${bpm} BPM). Tu préfères l'originale ou ce remix ? Commente ton année de naissance ! 👀 Son officiel dispo pour vos vidéos.`,
        callToAction: "Envoie 'FLIP' en DM pour recevoir le master WAV broadcast 16-bit libre de droits.",
        viralHashtags: [
          `#${tagBase}`,
          '#nostalgiamusic',
          '#sampleflip',
          '#frenchtouch',
          '#y2kaesthetic',
          '#remix2026',
          '#producertok',
          '#dropviral',
          '#pourtoi',
        ],
        audioTip: 'Audio original à 100% dans l’app, aucune voix off requise pour maximiser la rétention musicale.',
        targetObjective: 'Capter l’algorithme avec le choc nostalgique et générer 50+ commentaires sur le débat original vs 2026.',
        estimatedReach: '45 000 - 120 000 vues',
      },
      {
        day: 2,
        dayName: 'Jour 2',
        weekday: 'Mardi',
        timeSlot: '12h15 (Pause Déjeuner Active)',
        platforms: ['Instagram Reels', 'TikTok'] as ('TikTok' | 'Instagram Reels' | 'Shorts')[],
        title: 'Déconstruction Studio & Neuro-Hook Psycho-Acoustique',
        editingTheme: 'POV plongée au-dessus du clavier maître et de l’analyseur de spectre interactif',
        cameraAndMontageInstructions: [
          'Caméra fixée au-dessus des mains jouant les accords : ' + selectedPreset.chordNames.join(' → ') + '.',
          'Pop-up dynamique à chaque accord avec flèche néon vers la vibration du Sub 808.',
          'Zoom sur l’égaliseur chirurgical montrant le coupe-bas 28 Hz et la brillance à 12.5 kHz.',
        ],
        visualHook0to1s: isStorytelling
          ? `Pourquoi 90% des auditeurs ont des frissons sur cette progression d'accords ? 🧠`
          : `Pourquoi cette progression de 4 accords active instantanément la dopamine ? 🎹⚡`,
        caption: `Analyse du hook de "${song}" : 4 accords chargés d’émotion (${selectedPreset.key}) et une compression multibande chirurgicale. Les créateurs de contenu qui cherchent un audio avec plus de 75% de rétention : ce son est calibré pour stopper net le scroll.`,
        callToAction: 'Lien en bio : sécurise la licence exclusive (350 $ CAD) avec quittance broadcast.',
        viralHashtags: [
          '#musicproduction',
          '#beatmaking',
          '#producerlife',
          '#sounddesign',
          '#mixingandmastering',
          '#flstudio',
          '#ableton',
          '#audioengineer',
          '#beatmakerfr',
        ],
        audioTip: 'Voix off rapide (60% volume) pour expliquer la recette secrète avec l’audio du drop en fond sonore.',
        targetObjective: 'Asseoir l’autorité technique de producteur élite et convertir 3 prospects sur l’Offre C (Audit/Master).',
        estimatedReach: '25 000 - 65 000 vues',
      },
      {
        day: 3,
        dayName: 'Jour 3',
        weekday: 'Mercredi',
        timeSlot: '21h15 (Late Night Scrolling & Mood)',
        platforms: ['TikTok', 'Shorts'] as ('TikTok' | 'Instagram Reels' | 'Shorts')[],
        title: 'Night Drive Aesthetic (Pluie, Néons & DJ Filter Sweep)',
        editingTheme: 'Travelling cinématographique nocturne à travers le pare-brise sous la pluie avec néons flous',
        cameraAndMontageInstructions: [
          'Ralenti fluide (60fps à 0.6x) sur l’asphalte mouillé et les reflets néon magenta/cyan.',
          'Le DJ sweep (filtre passe-bas) commence fermé à 600 Hz et s’ouvre précisément à la seconde 0:04.',
          'Cut sec sur le premier coup de kick avec feux de stop de la voiture qui s’allument.',
        ],
        visualHook0to1s: isUnderground
          ? `Si tu roules seul à 2h du matin, mets tes AirPods et monte le volume 🌧️🏎️`
          : `Si tu roules seul la nuit sous la pluie, ce son est fait pour toi... 🌧️✨`,
        caption: `Night-drive vibe activée. Le remix 2026 de ${selectedPreset.name} en stéréo analogique. Ce genre de track qui te fait ressentir une nostalgie pour une époque que tu n’as même pas vécue. Partage à la personne avec qui tu ferais cette virée nocturne.`,
        callToAction: 'Utilise cet audio officiel sur tes vidéos de route, vlogs ou tenues nocturnes.',
        viralHashtags: [
          '#nightdrive',
          '#cartok',
          '#nostalgiavibes',
          '#aestheticvideo',
          '#frenchhouse',
          '#chillvibes',
          '#latenightthoughts',
          '#cyberpunk',
        ],
        audioTip: 'Audio original à 100% avec mise en valeur de la spatialisation stéréo 3D.',
        targetObjective: 'Maximiser les favoris (saves) et l’utilisation de l’audio comme modèle viral par les créateurs UGC.',
        estimatedReach: '60 000 - 150 000 vues',
      },
      {
        day: 4,
        dayName: 'Jour 4',
        weekday: 'Jeudi',
        timeSlot: '19h00 (Pic de Création & Interaction)',
        platforms: ['TikTok', 'Instagram Reels'] as ('TikTok' | 'Instagram Reels' | 'Shorts')[],
        title: 'Topline Challenge Bilingue FR / EN (Duo / Stitch)',
        editingTheme: 'Face caméra studio au micro avec sous-titres karaoké dynamique bilingues FR/EN',
        cameraAndMontageInstructions: [
          'Mode Duet / Duo expressément ouvert sur TikTok.',
          'Affichage karaoké bilingue : vers en français surlignés en bleu, anglais en rouge.',
          'Interruption à 0:08 avec texte clignotant : "À TOI DE JOUER : 3... 2... 1..."',
        ],
        visualHook0to1s: `Duo avec moi si tu sais poser ou chanter en anglais ET en français ! 🎤🔥`,
        caption: `Session topline bilingue avec AGENT-VOICE : on croise le flow French Touch et le groove US. Écoute le refrain : "${chorusLine}". Clique sur 'Duo' et pose ton couplet ou ta mélodie. Les 3 meilleurs freestyles recevront le multipiste complet offert !`,
        callToAction: 'Active le bouton Duo / Stitch et rejoins le mouvement.',
        viralHashtags: [
          '#duetwithme',
          '#topline',
          '#songwritersoftiktok',
          '#frenchtouch',
          '#lyricsedit',
          '#singersoftiktok',
          '#bilingual',
          '#freestylefr',
        ],
        audioTip: 'Laisse 8 mesures libres sans voix lead après le refrain pour que les duos puissent enregistrer.',
        targetObjective: 'Générer 20+ duos d’artistes et repérer 2 chanteurs/rappeurs acheteurs de l’Offre B (500 $ CAD).',
        estimatedReach: '30 000 - 80 000 vues',
      },
      {
        day: 5,
        dayName: 'Jour 5',
        weekday: 'Vendredi',
        timeSlot: '17h45 (Lancement de Fin de Semaine)',
        platforms: ['Instagram Reels', 'TikTok'] as ('TikTok' | 'Instagram Reels' | 'Shorts')[],
        title: 'Test Caisson de Basse & Réaction Spontanée en Voiture',
        editingTheme: 'Caméra embarquée / cachée captant la réaction authentique d’un ami lors du drop 808',
        cameraAndMontageInstructions: [
          'Plan fixe sur le siège passager : "Écoute ce master qu’on a calibré à -9.2 LUFS".',
          'Attente pendant l’intro de 5 secondes...',
          'Zoom rapide sur les yeux et le sourire au moment exact où la sub 808 frappe.',
        ],
        visualHook0to1s: `J'ai mis la basse à fond dans la voiture sans le prévenir... Regarde sa tête 🔊😂`,
        caption: `Le test du caisson de basses en voiture ne ment jamais. Le mastering multibande chirurgical à -9.2 LUFS fait littéralement vibrer les rétroviseurs. Qui avait reconnu le sample de ${artist} dès les premières notes ?`,
        callToAction: 'Disponible pour synchronisation vidéo exclusive et habillage sonore de trailers. DM ouvert.',
        viralHashtags: [
          '#bassboosted',
          '#subwoofer',
          '#reactionvideo',
          '#clubmusic',
          '#speakercheck',
          '#dropthebeat',
          '#bassline',
          '#carnostalgia',
        ],
        audioTip: 'Attention à ne pas saturer le micro du téléphone : filmer avec son synchronisé en post-prod.',
        targetObjective: 'Explosion des partages en messages privés (Dark Social) et conversion d’un créateur automobile/lifestyle.',
        estimatedReach: '50 000 - 140 000 vues',
      },
      {
        day: 6,
        dayName: 'Jour 6',
        weekday: 'Samedi',
        timeSlot: '20h30 (Pre-Drink & Soirée Club)',
        platforms: ['TikTok', 'Instagram Reels'] as ('TikTok' | 'Instagram Reels' | 'Shorts')[],
        title: 'Pre-Drink & GRWM (Getting Ready With Me) Années 2000',
        editingTheme: 'Montage dynamique calé au millième de seconde sur le tempo à ' + bpm + ' BPM',
        cameraAndMontageInstructions: [
          'Cuts ultra-rapides sur chaque snare/clap : parfum, veste rétro Y2K, lunettes teintées, flash.',
          'Esthétique vintage avec flash blanc et motion blur artistique.',
          'Fin du clip avec texte : "Prêts pour la nuit."',
        ],
        visualHook0to1s: `Le seul son autorisé avant de partir en after ce samedi soir 🍸🪩`,
        caption: `L’énergie club 2000s réincarnée pour ce soir. Rien de plus efficace qu'un flip nostalgique pour chauffer l'ambiance avant de sortir. Tague ton acolyte de soirée dans les commentaires !`,
        callToAction: 'Sauvegarde cet audio pour ta prochaine transition de soirée ou story festive.',
        viralHashtags: [
          '#grwm',
          '#partyoutfit',
          '#saturdaynight',
          '#clubbing',
          '#nostalgicvibes',
          '#y2kparty',
          '#nightout',
          '#frenchhouse',
        ],
        audioTip: 'Audio original à 100% avec drop synchronisé sur l’apparition de la tenue finale.',
        targetObjective: 'Pénétrer les algorithmes Lifestyle / Fashion et maximiser le nombre d’enregistrements d’audios.',
        estimatedReach: '40 000 - 110 000 vues',
      },
      {
        day: 7,
        dayName: 'Jour 7',
        weekday: 'Dimanche',
        timeSlot: '18h00 (Bilan de Semaine & Motivation Créateurs)',
        platforms: ['TikTok', 'Instagram Reels'] as ('TikTok' | 'Instagram Reels' | 'Shorts')[],
        title: 'Preuve Commerciale & Quittance Vendue (Bilan Fast Cash 1 000 $ CAD)',
        editingTheme: 'Behind-The-Scenes transparence totale : console studio, quittance signée et notification Stripe',
        cameraAndMontageInstructions: [
          'Capture d’écran de la console NostalgiaHit avec les pistes actives.',
          'Transition vers la notification de paiement (350.00 $ CAD) reçue avec quittance de droits.',
          'Voix off transparente : explication de comment la nostalgie convertit 4x mieux que les beats sans âme.',
        ],
        visualHook0to1s: `POV : Tu as vendu ce hook nostalgique 350$ en moins de 48h à un créateur 📈💸`,
        caption: `Bilan Fast Cash de la semaine : 3 créateurs ont sécurisé leur licence exclusive = 1 050 $ CAD encaissés. Pourquoi ? Parce que la nostalgie 1995-2015 convertit immédiatement les audiences. Tu veux un audio exclusif pour ton branding vidéo ? Mon agenda ouvre 2 créneaux pour la semaine prochaine.`,
        callToAction: "Envoie 'AUDIO' en DM pour réserver ton hook sur-mesure avant lundi.",
        viralHashtags: [
          '#producerlife',
          '#monetisation',
          '#sidehustle',
          '#contentcreator',
          '#musicbusiness',
          '#fastcash',
          '#businessenligne',
          '#indieproducer',
        ],
        audioTip: 'Voix off inspirante en premier plan avec l’instrumentale en fond doux (-14 dB).',
        targetObjective: 'Clôturer la vente finale pour dépasser l’objectif de 1 000 $ CAD et signer les clients de la semaine suivante.',
        estimatedReach: '35 000 - 95 000 vues',
      },
    ];
  }, [selectedPreset, lyricsData, bpm, calendarAngleVariant]);

  const filteredSocialSchedule = socialSchedule.filter((item) => {
    if (socialPlatformFilter === 'tiktok') return item.platforms.includes('TikTok');
    if (socialPlatformFilter === 'instagram') return item.platforms.includes('Instagram Reels');
    return true;
  });

  const handleCopySingleDay = (item: (typeof socialSchedule)[0]) => {
    const text =
      `📱 [${item.dayName.toUpperCase()} - ${item.weekday.toUpperCase()} | ${item.timeSlot}]\n` +
      `🔥 CONCEPT : ${item.title}\n` +
      `🎯 HOOK VIDÉO (0-1.2s) : "${item.visualHook0to1s}"\n\n` +
      `🎬 DIRECTIVES DE MONTAGE :\n${item.cameraAndMontageInstructions.map((c) => `• ${c}`).join('\n')}\n\n` +
      `✍️ CAPTION / DESCRIPTION :\n${item.caption}\n\n` +
      `🚀 CTA : ${item.callToAction}\n` +
      `#️⃣ HASHTAGS :\n${item.viralHashtags.join(' ')}\n` +
      `🎧 CONSEIL AUDIO : ${item.audioTip}\n` +
      `📈 OBJECTIF : ${item.targetObjective} (${item.estimatedReach})`;

    navigator.clipboard.writeText(text);
    setCopiedSocialDay(item.day);
    setTimeout(() => setCopiedSocialDay(null), 2000);
  };

  const handleCopyFullCalendar = () => {
    const text = [
      `📅 CALENDRIER DE PUBLICATION VIRAL 7 JOURS (TIKTOK & REELS)`,
      `Hook Nostalgique : ${selectedPreset.name} (${selectedPreset.artistRef} x ${selectedPreset.targetStyle})`,
      `BPM : ${bpm} • Tonalité : ${selectedPreset.key} • Objectif Fast Cash : 1 000 $ CAD`,
      '========================================================================',
      '',
      ...socialSchedule.map(
        (item) =>
          `[${item.dayName.toUpperCase()} - ${item.weekday.toUpperCase()} | ${item.timeSlot}] ${item.title}\n` +
          `PLATEFORMES : ${item.platforms.join(', ')}\n` +
          `HOOK VIDÉO (0-1.2s) : "${item.visualHook0to1s}"\n` +
          `MONTAGE : ${item.editingTheme}\n` +
          `DIRECTIVES :\n${item.cameraAndMontageInstructions.map((c) => `  - ${c}`).join('\n')}\n` +
          `CAPTION :\n${item.caption}\n` +
          `CTA : ${item.callToAction}\n` +
          `HASHTAGS : ${item.viralHashtags.join(' ')}\n` +
          `CONSEIL AUDIO : ${item.audioTip}\n` +
          `OBJECTIF : ${item.targetObjective} (${item.estimatedReach})\n`
      ),
    ].join('\n------------------------------------------------------------------------\n\n');

    navigator.clipboard.writeText(text);
    setCopiedFullCalendar(true);
    setTimeout(() => setCopiedFullCalendar(false), 2200);
  };

  const handleExportSocialCalendar = () => {
    const lines = [
      `# 📅 CALENDRIER DE PUBLICATION VIRAL 7 JOURS (TIKTOK & REELS)`,
      `**Hook Nostalgique :** ${selectedPreset.name} (${selectedPreset.artistRef} x ${selectedPreset.targetStyle})`,
      `**BPM :** ${bpm} | **Tonalité :** ${selectedPreset.key}`,
      `**Objectif Commercial :** 1 000 $ CAD en 10 jours`,
      `**Généré le :** ${new Date().toLocaleDateString('fr-FR')}`,
      '',
      '---',
      '',
      ...socialSchedule.map((item) => {
        return [
          `## ${item.weekday.toUpperCase()} - ${item.dayName.toUpperCase()} (${item.timeSlot})`,
          `* **Plateformes :** ${item.platforms.join(', ')}`,
          `* **Titre du Concept :** ${item.title}`,
          `* **Thème de Montage :** ${item.editingTheme}`,
          `* **Accroche Visuelle (0-1.2s) :** \`${item.visualHook0to1s}\``,
          `* **Directives de Montage Vidéo :**`,
          ...item.cameraAndMontageInstructions.map((c) => `  - ${c}`),
          `* **Description (Caption) :**\n> ${item.caption}`,
          `* **Call To Action :** ${item.callToAction}`,
          `* **Hashtags Viraux :** ${item.viralHashtags.join(' ')}`,
          `* **Conseil Audio :** ${item.audioTip}`,
          `* **Objectif de Conversion :** ${item.targetObjective}`,
          `* **Portée Estimée :** ${item.estimatedReach}`,
          '',
          '---',
          '',
        ].join('\n');
      }),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Calendrier_Viral_7Jours_${selectedPreset.id}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSelectPlan = (tier: SubscriptionTier) => {
    if (tier === 'free') {
      setUserPlan('free');
      return;
    }
    setSelectedPlanForModal(tier);
    setPaymentSuccess(false);
    setShowCheckoutModal(true);
  };

  const handleConfirmSubscription = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setUserPlan(selectedPlanForModal);
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
    }, 1000);
  };

  const handleDownloadInvoice = () => {
    const planName = selectedPlanForModal === 'pro' ? 'PROFESSIONNEL' : 'PREMIUM';
    const amount =
      billingCycle === 'monthly'
        ? selectedPlanForModal === 'pro'
          ? '39.99 $ CAD'
          : '14.99 $ CAD'
        : selectedPlanForModal === 'pro'
        ? '383.88 $ CAD'
        : '143.88 $ CAD';

    const invoiceContent = `# 🧾 QUITTANCE & FACTURE OFFICIELLE D'ABONNEMENT
**Plateforme :** NostalgiaHit Studio Pro
**Numéro de Transaction :** TX-${Math.floor(10000000 + Math.random() * 90000000)}
**Date d'émission :** ${new Date().toLocaleDateString('fr-CA')} à ${new Date().toLocaleTimeString('fr-CA')}
**Client :** ${clientName}
**Forfait Souscrit :** ${planName} (${billingCycle === 'monthly' ? 'Facturation Mensuelle' : 'Facturation Annuelle'})
**Montant Réglé :** ${amount}
**Mode de Règlement :** ${
      paymentMethod === 'stripe'
        ? 'Stripe & Link (Carte Bancaire / 3DS2)'
        : paymentMethod === 'paypal'
        ? 'PayPal v2 SDK'
        : 'Prélèvement Bancaire Direct ACH/SEPA'
    }
**Statut :** PAYÉ & CONFIRMÉ (ACID Transaction Ledger)

---

## DROITS ET LICENCES ACCORDÉES
1. **Accès Immédiat :** Moteur de mixage et mastering analogique DSP en qualité Master Lossless.
2. **Stems Multipistes :** Téléchargement illimité des 4 pistes séparées (Drums, Bass 808, Chords, Lead Pluck).
3. **Licence Commerciale Mondiale :** Exploitation libre de droits sur TikTok, YouTube, Instagram Reels, Spotify et podcasts sans redevance.
4. **Cession Exclusive :** Certificat d'antériorité et quittance de droits ISRC/ISWC sans restriction de territoire.

---
*Ce document fait office de quittance légale et de contrat de licence commercial certifié.*
`;

    const blob = new Blob([invoiceContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Quittance_Abonnement_${planName}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#08080C] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Studio Header */}
      <header className="border-b border-white/10 bg-[#0C0D14]/90 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#08080C] rounded-[10px] flex items-center justify-center">
              <Disc className="w-5 h-5 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
                NOSTALGIAHIT STUDIO
              </h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                DSP v3.9 Multiband
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Spectrum Interactif • Topline Bilingue • Mastering Multibande
            </p>
          </div>
        </div>

        {/* Global Transport & Quick Controls */}
        <div className="flex items-center gap-2.5">
          {/* Preset Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedPreset.id}
              onChange={(e) => {
                const found = NOSTALGIA_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleSelectPreset(found);
              }}
              className="bg-[#12131D] text-xs font-mono border border-white/10 rounded-lg px-3 py-2 text-purple-300 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {NOSTALGIA_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.bpm} BPM - {p.key})
                </option>
              ))}
            </select>
          </div>

          {/* Master Transport Button */}
          <button
            onClick={togglePlayLoop}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold tracking-wider transition-all duration-200 shadow-md ${
              isPlaying
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-500/20 hover:bg-rose-500/30'
                : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20 hover:scale-[1.02]'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                STOP
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                PLAY 15s HOOK
              </>
            )}
          </button>

          {/* Quick WAV Download */}
          <button
            onClick={handleExportWav}
            disabled={isRenderingWav}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-cyan-300 border border-cyan-500/30 transition-all hover:border-cyan-400 disabled:opacity-50"
            title="Exporter le hook audio en vrai fichier WAV 16-bit 44.1kHz"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">
              {isRenderingWav ? 'Synthèse...' : 'EXPORT WAV'}
            </span>
          </button>

          {/* Forfaits Premium Modal Trigger */}
          <button
            onClick={() => {
              setSelectedPlanForModal(userPlan === 'free' ? 'premium' : userPlan);
              setShowCheckoutModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-black font-semibold text-xs font-mono shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all border border-amber-300/40"
            title="Consulter les forfaits et options d'abonnement (Gratuit, Premium, Professionnel)"
          >
            <Crown className="w-4 h-4 stroke-[2.5]" />
            <span>FORFAITS PREMIUM</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Header Tabs */}
      <nav className="border-b border-white/5 bg-[#0A0B10] px-4 lg:px-8 flex items-center justify-between overflow-x-auto">
        <div className="flex gap-1 py-1.5">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === 'studio'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            Console Studio & Spectrum Interactif
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === 'agents'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            AGENT-VOICE : Topline Bilingue FR/EN
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          </button>
          <button
            onClick={() => setActiveTab('mastering')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === 'mastering'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            AGENT-SOUND : Mastering & A/B Loudness Match
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === 'sales'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            Forfaits & Abonnements Musicaux
            {userPlan !== 'free' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-black font-extrabold uppercase ml-1">
                {userPlan}
              </span>
            )}
          </button>
        </div>

        {/* Live Audio Metrics */}
        <div className="hidden md:flex items-center gap-4 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">PEAK:</span>
            <span className={`font-semibold ${peakDb > -1 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {peakDb} dBTP
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">LUFS:</span>
            <span className="text-cyan-400 font-semibold">{currentLufs}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">PROFIL:</span>
            <span className="text-purple-300 font-bold uppercase">{mastering.targetProfile}</span>
          </div>
        </div>
      </nav>

      {/* Main Studio Body */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* ===================== TAB 1: STUDIO & INTERACTIVE SPECTRUM ===================== */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* Top Interactive Spectrum Analyzer & Oscilloscope */}
            <div className="relative rounded-2xl bg-[#0D0E16] border border-white/10 p-4 shadow-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span className="font-semibold text-white">
                    ANALYSEUR DE SPECTRE FFT & OSCILLOSCOPE INTERACTIF
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-cyan-400">Survolez ou cliquez pour ajuster l'EQ</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-emerald-400 font-bold">6 BANDES DSP SÉLECTIONNABLES</span>
                </div>
              </div>

              {/* Canvas Visualizer with Interactive Zone Hover/Click */}
              <div className="relative w-full h-48 sm:h-60 rounded-xl overflow-hidden border border-white/5 bg-[#08080C] cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={960}
                  height={240}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={() => setHoveredBand(null)}
                  onClick={handleCanvasClick}
                  className="w-full h-full block"
                />

                {/* Overlaid 16-Step Beat Grid Display */}
                {isPlaying && (
                  <div className="absolute bottom-2 left-3 right-3 flex gap-1 justify-between pointer-events-none">
                    {Array.from({ length: 16 }).map((_, stepIdx) => (
                      <div
                        key={stepIdx}
                        className={`h-2 flex-1 rounded-sm transition-all duration-75 ${
                          activeStep === stepIdx
                            ? 'bg-purple-400 shadow-md shadow-purple-500 scale-y-125'
                            : stepIdx % 4 === 0
                            ? 'bg-white/20'
                            : 'bg-white/5'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Band Inspector & Live Control Bar */}
              <div className="rounded-xl bg-[#12131F] border border-white/5 p-3.5 font-mono text-xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedBand.color }}
                    />
                    <span className="text-white font-bold text-sm">
                      BANDE SÉLECTIONNÉE : {selectedBand.name} ({selectedBand.range})
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-cyan-400">
                      Niveau actuel : {liveBandDbs[selectedBand.id] || -45} dB
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">Ajustement Paramétrique :</span>
                    <span className="text-purple-300 font-bold text-sm">
                      {selectedBand.eqKey === 'lowCutFreq'
                        ? `${mastering.lowCutFreq} Hz`
                        : `${mastering[selectedBand.eqKey] > 0 ? `+${mastering[selectedBand.eqKey]}` : mastering[selectedBand.eqKey]} dB`}
                    </span>
                  </div>
                </div>

                {/* Slider for selected frequency band */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center pt-1 border-t border-white/5">
                  <div className="sm:col-span-3 flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      {selectedBand.eqKey === 'lowCutFreq' ? '20 Hz' : '-12 dB'}
                    </span>
                    <input
                      type="range"
                      min={selectedBand.eqKey === 'lowCutFreq' ? 20 : -12}
                      max={selectedBand.eqKey === 'lowCutFreq' ? 60 : 12}
                      step={selectedBand.eqKey === 'lowCutFreq' ? 1 : 0.5}
                      value={mastering[selectedBand.eqKey]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setMastering({ ...mastering, [selectedBand.eqKey]: val });
                      }}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-400">
                      {selectedBand.eqKey === 'lowCutFreq' ? '60 Hz' : '+12 dB'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (selectedBand.eqKey === 'subBassGain') setMastering({ ...mastering, subBassGain: 1.8 });
                      else if (selectedBand.eqKey === 'mudCutGain') setMastering({ ...mastering, mudCutGain: -2.8 });
                      else if (selectedBand.eqKey === 'midGain') setMastering({ ...mastering, midGain: 0.5 });
                      else if (selectedBand.eqKey === 'clarityGain') setMastering({ ...mastering, clarityGain: 1.2 });
                      else if (selectedBand.eqKey === 'airBoostGain') setMastering({ ...mastering, airBoostGain: 2.4 });
                      else if (selectedBand.eqKey === 'lowCutFreq') setMastering({ ...mastering, lowCutFreq: 28 });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 border border-white/10"
                  >
                    Réinitialiser Bande
                  </button>
                </div>

                {/* Psycho-acoustic Advice from AGENT-SOUND */}
                <div className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-200">Recommandation AGENT-SOUND : </strong>
                    {selectedBand.advice}
                  </span>
                </div>
              </div>

              {/* Global Transport Sliders: BPM, DJ Sweep, Master Volume */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/5 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>TEMPO (BPM)</span>
                    <span className="text-purple-300 font-bold">{bpm} BPM</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={155}
                    value={bpm}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setBpm(val);
                      audioEngine.setBpm(val);
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>FILTRE DJ SWEEP (LOWPASS)</span>
                    <span className="text-cyan-300 font-bold">{mastering.filterCutoff} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={400}
                    max={20000}
                    step={100}
                    value={mastering.filterCutoff}
                    onChange={(e) => {
                      setMastering({ ...mastering, filterCutoff: parseInt(e.target.value) });
                    }}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>VOLUME MASTER</span>
                    <span className="text-emerald-300 font-bold">
                      {Math.round(mastering.masterVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={mastering.masterVolume}
                    onChange={(e) => {
                      setMastering({ ...mastering, masterVolume: parseFloat(e.target.value) });
                    }}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Soundboard Jamming Touch Pads & Stems */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Soundboard Touch Pads (8 Pads) */}
              <div className="lg:col-span-2 rounded-2xl bg-[#0D0E16] border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-purple-400" />
                    <h2 className="font-mono text-sm font-bold text-white tracking-wide">
                      SOUNDBOARD NOSTALGIE & DRIFT PADS
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Raccourcis : [A, S, D, F, J, K, L, ;]
                  </span>
                </div>

                {/* 8 Touch Pads Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => triggerPad(0)}
                    className={`h-24 rounded-xl p-3 flex flex-col justify-between text-left font-mono border transition-all duration-100 ${
                      activePad === 0
                        ? 'bg-purple-500 text-white border-purple-300 scale-95 shadow-lg shadow-purple-500/40'
                        : 'bg-[#131422] border-purple-500/20 hover:border-purple-500/50 hover:bg-[#181a2e]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-purple-400 font-bold">ACCORD 1 [A]</span>
                      <Disc className="w-3 h-3 text-purple-400 opacity-60" />
                    </div>
                    <span className="text-sm font-bold text-white">{selectedPreset.chordNames[0]}</span>
                    <span className="text-[10px] text-slate-400">Pad Analogique</span>
                  </button>

                  <button
                    onClick={() => triggerPad(1)}
                    className={`h-24 rounded-xl p-3 flex flex-col justify-between text-left font-mono border transition-all duration-100 ${
                      activePad === 1
                        ? 'bg-purple-500 text-white border-purple-300 scale-95 shadow-lg shadow-purple-500/40'
                        : 'bg-[#131422] border-purple-500/20 hover:border-purple-500/50 hover:bg-[#181a2e]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-purple-400 font-bold">ACCORD 2 [S]</span>
                      <Disc className="w-3 h-3 text-purple-400 opacity-60" />
                    </div>
                    <span className="text-sm font-bold text-white">{selectedPreset.chordNames[1]}</span>
                    <span className="text-[10px] text-slate-400">Pad Analogique</span>
                  </button>

                  <button
                    onClick={() => triggerPad(2)}
                    className={`h-24 rounded-xl p-3 flex flex-col justify-between text-left font-mono border transition-all duration-100 ${
                      activePad === 2
                        ? 'bg-purple-500 text-white border-purple-300 scale-95 shadow-lg shadow-purple-500/40'
                        : 'bg-[#131422] border-purple-500/20 hover:border-purple-500/50 hover:bg-[#181a2e]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-purple-400 font-bold">ACCORD 3 [D]</span>
                      <Disc className="w-3 h-3 text-purple-400 opacity-60" />
                    </div>
                    <span className="text-sm font-bold text-white">{selectedPreset.chordNames[2]}</span>
                    <span className="text-[10px] text-slate-400">Pad Analogique</span>
                  </button>

                  <button
                    onClick={() => triggerPad(3)}
                    className={`h-24 rounded-xl p-3 flex flex-col justify-between text-left font-mono border transition-all duration-100 ${
                      activePad === 3
                        ? 'bg-purple-500 text-white border-purple-300 scale-95 shadow-lg shadow-purple-500/40'
                        : 'bg-[#131422] border-purple-500/20 hover:border-purple-500/50 hover:bg-[#181a2e]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-purple-400 font-bold">ACCORD 4 [F]</span>
                      <Disc className="w-3 h-3 text-purple-400 opacity-60" />
                    </div>
                    <span className="text-sm font-bold text-white">{selectedPreset.chordNames[3]}</span>
                    <span className="text-[10px] text-slate-400">Pad Analogique</span>
                  </button>

                  <button
                    onClick={() => triggerPad(4)}
                    className={`h-24 rounded-xl p-3 flex flex-col justify-between text-left font-mono border transition-all duration-100 ${
                      activePad === 4
                        ? 'bg-cyan-500 text-black border-cyan-300 scale-95 shadow-lg shadow-cyan-500/40'
                        : 'bg-[#101925] border-cyan-500/20 hover:border-cyan-500/50 hover:bg-[#142232]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-cyan-400 font-bold">808 ROOT [J]</span>
                      <Volume2 className="w-3 h-3 text-cyan-400 opacity-60" />
                    </div>
                    <span className="text-sm font-bold text-white">Sub Punch</span>
                    <span className="text-[10px] text-cyan-300/70">Pitch Drop ~44Hz</span>
                  </button>

                  <button
                    onClick={() => triggerPad(5)}
                    className={`h-24 rounded-xl p-3 flex flex-col justify-between text-left font-mono border transition-all duration-100 ${
                      activePad === 5
                        ? 'bg-cyan-500 text-black border-cyan-300 scale-95 shadow-lg shadow-cyan-500/40'
                        : 'bg-[#101925] border-cyan-500/20 hover:border-cyan-500/50 hover:bg-[#142232]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-cyan-400 font-bold">808 GLIDE [K]</span>
                      <Volume2 className="w-3 h-3 text-cyan-400 opacity-60" />
                    </div>
                    <span className="text-sm font-bold text-white">Sub Bass VI</span>
                    <span className="text-[10px] text-cyan-300/70">Saturateur Moog</span>
                  </button>

                  <button
                    onClick={() => triggerPad(6)}
                    className={`h-24 rounded-xl p-3 flex flex-col justify-between text-left font-mono border transition-all duration-100 ${
                      activePad === 6
                        ? 'bg-emerald-500 text-black border-emerald-300 scale-95 shadow-lg shadow-emerald-500/40'
                        : 'bg-[#0f1d19] border-emerald-500/20 hover:border-emerald-500/50 hover:bg-[#142823]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-emerald-400 font-bold">JERSEY KICK [L]</span>
                      <Radio className="w-3 h-3 text-emerald-400 opacity-60" />
                    </div>
                    <span className="text-sm font-bold text-white">Stutter Kick</span>
                    <span className="text-[10px] text-emerald-300/70">Club Punch 45Hz</span>
                  </button>

                  <button
                    onClick={() => triggerPad(7)}
                    className={`h-24 rounded-xl p-3 flex flex-col justify-between text-left font-mono border transition-all duration-100 ${
                      activePad === 7
                        ? 'bg-amber-500 text-black border-amber-300 scale-95 shadow-lg shadow-amber-500/40'
                        : 'bg-[#1d1910] border-amber-500/20 hover:border-amber-500/50 hover:bg-[#282214]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-amber-400 font-bold">SNAP CLAP [;]</span>
                      <Zap className="w-3 h-3 text-amber-400 opacity-60" />
                    </div>
                    <span className="text-sm font-bold text-white">Snare Crisp</span>
                    <span className="text-[10px] text-amber-300/70">1.2 kHz Snap</span>
                  </button>
                </div>
              </div>

              {/* Stem Channel Strips & Mutes */}
              <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <h2 className="font-mono text-sm font-bold text-white tracking-wide">
                      STEMS MULTIPISTES
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300">
                    Mute / Active
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${stems.chords ? 'bg-purple-400 shadow-sm shadow-purple-500' : 'bg-slate-600'}`} />
                      <div>
                        <div className="text-slate-200 font-semibold">Chords & Nappes</div>
                        <div className="text-[10px] text-slate-400">Juno / Rhodes Synth</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setStems({ ...stems, chords: !stems.chords })}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                        stems.chords ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {stems.chords ? 'ACTIF' : 'MUTED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${stems.bass ? 'bg-cyan-400 shadow-sm shadow-cyan-500' : 'bg-slate-600'}`} />
                      <div>
                        <div className="text-slate-200 font-semibold">808 & Moog Bass</div>
                        <div className="text-[10px] text-slate-400">Subsonique saturée</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setStems({ ...stems, bass: !stems.bass })}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                        stems.bass ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {stems.bass ? 'ACTIF' : 'MUTED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${stems.drums ? 'bg-emerald-400 shadow-sm shadow-emerald-500' : 'bg-slate-600'}`} />
                      <div>
                        <div className="text-slate-200 font-semibold">Drums & Jersey Stutter</div>
                        <div className="text-[10px] text-slate-400">Kick, Snare, Hats</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setStems({ ...stems, drums: !stems.drums })}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                        stems.drums ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {stems.drums ? 'ACTIF' : 'MUTED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${stems.lead ? 'bg-amber-400 shadow-sm shadow-amber-500' : 'bg-slate-600'}`} />
                      <div>
                        <div className="text-slate-200 font-semibold">Arpeggio & Lead Topline</div>
                        <div className="text-[10px] text-slate-400">Pluck synthétique</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setStems({ ...stems, lead: !stems.lead })}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                        stems.lead ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {stems.lead ? 'ACTIF' : 'MUTED'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: AGENT-VOICE BILINGUAL LYRICS ===================== */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            {/* Header for Agent-Voice Studio */}
            <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    [AGENT-VOICE] : STUDIO DE TOPLINE BILINGUE FR / EN
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Code-switching fluide, références nostalgiques 1995-2015 & slang viral Gen Z / 21-40 ans
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateBilingualLyrics}
                    disabled={isGeneratingLyrics}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:brightness-110 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isGeneratingLyrics ? 'animate-spin' : ''}`} />
                    {isGeneratingLyrics ? 'ÉCRITURE BILINGUE...' : 'GÉNÉRER NOUVELLES PAROLES'}
                  </button>

                  <button
                    onClick={handleExportMarkdown}
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all"
                  >
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>EXPORTER FICHE (.MD)</span>
                  </button>
                </div>
              </div>

              {/* Track Title and Cultural Story Banner */}
              <div className="bg-[#12131F] p-4 rounded-xl border border-white/5 space-y-1.5 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white tracking-wide">
                    {lyricsData.songTitle}
                  </span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                    BPM : {bpm} • {selectedPreset.key}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lyricsData.vibeStory}
                </p>
              </div>
            </div>

            {/* Bilingual Lyrics Content Display */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
              {/* Left Column: Couplet (Verse) & Pre-Chorus */}
              <div className="space-y-4">
                {/* Couplet Bilingue */}
                <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-cyan-400" />
                      COUPLET BILINGUE (VERSE)
                    </span>
                    <span className="text-[10px] text-slate-400">Code-Switching FR / EN</span>
                  </div>

                  <div className="space-y-2">
                    {lyricsData.verse.map((v, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <p className="text-slate-100 font-semibold">{v.line}</p>
                          <p className="text-[10px] text-slate-400">{v.rhythmFeel}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              v.lang === 'FR'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-red-500/20 text-rose-300'
                            }`}
                          >
                            {v.lang}
                          </span>
                          <span className="text-[10px] text-slate-500">{v.syllables}s</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pré-Refrain */}
                <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      MONTÉE D'ÉNERGIE (PRE-CHORUS)
                    </span>
                    <span className="text-[10px] text-slate-400">Tension Build-up</span>
                  </div>

                  <div className="space-y-2">
                    {lyricsData.preChorus.map((v, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between"
                      >
                        <p className="text-slate-100">{v.line}</p>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            v.lang === 'FR'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-red-500/20 text-rose-300'
                          }`}
                        >
                          {v.lang}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Earworm Chorus & Ad-Libs */}
              <div className="space-y-4">
                {/* Refrain Earworm Explosif */}
                <div className="rounded-2xl bg-gradient-to-br from-purple-950/30 to-[#0D0E16] border border-purple-500/30 p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400" />
                      REFRAIN EARWORM VIRAL (CHORUS)
                    </span>
                    <button
                      onClick={() =>
                        handleCopyText(
                          lyricsData.chorus.map((c) => c.line).join('\n'),
                          'chorus-copy'
                        )
                      }
                      className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1"
                    >
                      {copiedSection === 'chorus-copy' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" /> Copié
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copier Refrain
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {lyricsData.chorus.map((c, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/20 flex items-center justify-between"
                      >
                        <p className="text-white font-bold text-xs tracking-wide">
                          "{c.line}"
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          {c.earwormFactor || 'Rétention Max'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Vocal Chop Ad-Libs */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <span className="text-[10px] text-slate-400 block font-bold">
                      AD-LIBS & VOCAL CHOPS (POUR LE DROP) :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {lyricsData.hookChopAdlibs.map((ad, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-amber-300 border border-amber-500/20"
                        >
                          {ad}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Guide Phonétique et Déclencheurs Culturels */}
                <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 space-y-3">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-bold block mb-1">
                      GUIDE PHONÉTIQUE DE CHANT (CADENCE & FLOW) :
                    </span>
                    <p className="text-[11px] text-slate-300 bg-[#121320] p-2.5 rounded-lg border border-white/5 leading-relaxed">
                      {lyricsData.phoneticGuide}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-purple-400 font-bold block mb-1">
                      DÉCLENCHEURS NOSTALGIQUES 1995-2015 & SLANG GEN Z :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {lyricsData.culturalNostalgiaTriggers.map((trig, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30"
                        >
                          {trig}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: AGENT-SOUND ADVANCED MASTERING ===================== */}
        {activeTab === 'mastering' && (
          <div className="space-y-6">
            {/* Mastering Hub Header & Standard Profile Selector */}
            <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-400" />
                    [AGENT-SOUND] : COMPRESSEUR MULTIBANDE & CALIBRAGE LUFS
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Crossover Dynamique 3 Bandes + 6-Band Surgical Parametric EQ + Limiteur Brickwall
                  </p>
                </div>

                {/* Target Profile Switchers */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  <button
                    onClick={() => handleApplyMasteringProfile('spotify')}
                    className={`px-3 py-2 rounded-xl border transition-all ${
                      mastering.targetProfile === 'spotify'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold shadow-lg shadow-emerald-500/20'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎵 Spotify (-14 LUFS)
                  </button>
                  <button
                    onClick={() => handleApplyMasteringProfile('tiktok')}
                    className={`px-3 py-2 rounded-xl border transition-all ${
                      mastering.targetProfile === 'tiktok'
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500 font-bold shadow-lg shadow-purple-500/20'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🔥 TikTok & Club (-9.2 LUFS)
                  </button>
                  <button
                    onClick={() => handleApplyMasteringProfile('club_ultra')}
                    className={`px-3 py-2 rounded-xl border transition-all ${
                      mastering.targetProfile === 'club_ultra'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-lg shadow-amber-500/20'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚡ Ultra Club (-7.8 LUFS)
                  </button>
                </div>
              </div>

              {/* Master Meters Display */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/5 text-xs font-mono">
                <div className="bg-[#12131F] p-3.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[10px] block">LOUDNESS ACTUEL (LUFS)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-cyan-400">{currentLufs}</span>
                    <span className="text-slate-500">LUFS</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-cyan-400 h-full transition-all duration-100"
                      style={{ width: `${Math.min(100, Math.max(10, (currentLufs + 45) * 2.2))}%` }}
                    />
                  </div>
                </div>

                <div className="bg-[#12131F] p-3.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[10px] block">TRUE PEAK INDICATOR</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-bold ${peakDb > -0.5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {peakDb}
                    </span>
                    <span className="text-slate-500">dBTP</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-75 ${
                        peakDb > -1 ? 'bg-rose-500' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, (peakDb + 60) * 1.6))}%` }}
                    />
                  </div>
                </div>

                <div className="bg-[#12131F] p-3.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 text-[10px] block">CIBLES BROADCAST</span>
                  <div className="space-y-1 mt-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">TikTok & Club :</span>
                      <span className="text-purple-300 font-bold">-9.2 LUFS (-0.2 dBTP)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Spotify & Apple :</span>
                      <span className="text-emerald-300 font-bold">-14.0 LUFS (-1.0 dBTP)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* A/B MASTERING & GAIN-COMPENSATED LOUDNESS MATCHING CONSOLE */}
            <div className="rounded-2xl bg-gradient-to-b from-[#111322] to-[#0A0B14] border border-cyan-500/30 p-5 space-y-5 shadow-xl shadow-cyan-950/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-sm font-bold text-white tracking-wide">
                        OPTION A/B MASTERING : ANALYSE DU GAIN COMPENSÉ (LOUDNESS MATCH)
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase font-semibold">
                        Psycho-Acoustique Studio
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Comparez fidèlement le signal avant (A : Mix Brut) et après traitement (B : Master Final) sans biais de volume perçu.
                    </p>
                  </div>
                </div>

                {/* Instant A/B Flip Action */}
                <button
                  onClick={() => handleToggleAbMode(abMode === 'A' ? 'B' : 'A')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-mono font-bold text-white transition-all shadow-md active:scale-95"
                  title="Basculer instantanément entre le signal Brut (A) et le signal Traité (B)"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  BASCULER A ⇄ B
                </button>
              </div>

              {/* A/B Selector Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {/* SIGNAL A : Mix Brut Original */}
                <div
                  onClick={() => handleToggleAbMode('A')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    abMode === 'A'
                      ? 'bg-cyan-950/30 border-cyan-400 ring-2 ring-cyan-400/20 shadow-lg shadow-cyan-500/20'
                      : 'bg-[#121320]/60 border-white/10 opacity-70 hover:opacity-100 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          abMode === 'A'
                            ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/50'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        A
                      </span>
                      <span className="font-bold text-white text-sm">SIGNAL A : MIX BRUT ORIGINAL</span>
                    </div>
                    {abMode === 'A' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 font-bold animate-pulse">
                        EN ÉCOUTE
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 text-xs mt-2.5">
                    <strong className="text-cyan-300">Bypass DSP complet :</strong> Les 6 bandes d’égalisation chirurgicale, le compresseur multibande et le limiteur brickwall sont neutralisés.
                  </p>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Transitoires pures & dynamiques</span>
                    <span className="text-slate-300 font-semibold">Gain Référence (0.0 dB)</span>
                  </div>
                </div>

                {/* SIGNAL B : Master Traité */}
                <div
                  onClick={() => handleToggleAbMode('B')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    abMode === 'B'
                      ? 'bg-emerald-950/30 border-emerald-400 ring-2 ring-emerald-400/20 shadow-lg shadow-emerald-500/20'
                      : 'bg-[#121320]/60 border-white/10 opacity-70 hover:opacity-100 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          abMode === 'B'
                            ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/50'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        B
                      </span>
                      <span className="font-bold text-white text-sm">SIGNAL B : MASTER ANALOGIQUE TRAITÉ</span>
                    </div>
                    {abMode === 'B' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 font-bold animate-pulse">
                        EN ÉCOUTE
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 text-xs mt-2.5">
                    <strong className="text-emerald-300">Chaîne mastering complète :</strong> Égaliseur analogique, compresseur multibande 3 voies actif et limiteur saturateur à{' '}
                    <span className="text-amber-300 font-semibold">{mastering.targetProfile.toUpperCase()}</span>.
                  </p>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Densité harmonique & brillance</span>
                    <span className="text-emerald-300 font-semibold">
                      {gainCompEnabled ? `Gain compensé (-${gainCompOffsetDb} dB)` : 'Volume plein'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Loudness-Matched Gain Compensation Engine Details */}
              <div className="bg-[#0E101B] border border-white/10 rounded-xl p-4 space-y-4 font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-white font-bold">SYSTÈME DE COMPENSATION DE GAIN (LOUDNESS-MATCHING)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleGainComp}
                      className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all flex items-center gap-1.5 ${
                        gainCompEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${gainCompEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      {gainCompEnabled ? 'COMPENSATION ACTIVE' : 'COMPENSATION DÉSACTIVÉE'}
                    </button>
                    <button
                      onClick={handleResetGainCompToDefault}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[11px]"
                      title="Calibrer selon la cible LUFS du profil actif"
                    >
                      Calibrage Auto
                    </button>
                  </div>
                </div>

                {/* Technical / Psychoacoustic Explanation */}
                <div className="bg-black/30 rounded-lg p-3 border border-white/5 text-slate-300 text-[11px] leading-relaxed">
                  <span className="text-cyan-400 font-bold block mb-1">
                    🧠 Pourquoi l'évaluation en Gain Compensé est-elle indispensable ?
                  </span>
                  Le cerveau humain interprète instinctivement tout signal audio plus fort comme étant « meilleur, plus riche et plus ouvert » (phénomène d'isophonie et effet Fletcher-Munson).
                  {gainCompEnabled ? (
                    <span className="text-emerald-300 ml-1">
                      Avec la compensation active, le Signal B (Masterisé) est automatiquement atténué de{' '}
                      <strong>{gainCompOffsetDb} dB</strong> pour égaliser son volume sonore perçu sur le Signal A. Vous pouvez ainsi juger de la véritable qualité du traitement (définition des basses, aération des aigus, dynamique) sans être dupé par la simple augmentation de décibels.
                    </span>
                  ) : (
                    <span className="text-amber-300 ml-1">
                      Attention : La compensation est actuellement désactivée. Le Master Traité sonnera plus fort, ce qui peut fausser votre jugement comparatif.
                    </span>
                  )}
                </div>

                {/* Gain Offset Slider & Calibration Shortcuts */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Atténuation de compensation sur le Master (B) :</span>
                    <span className="text-cyan-400 font-bold text-sm">-{gainCompOffsetDb} dB</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.2"
                    value={gainCompOffsetDb}
                    onChange={(e) => handleGainOffsetChange(parseFloat(e.target.value))}
                    disabled={!gainCompEnabled}
                    className="w-full accent-cyan-400 bg-white/10 rounded-lg h-2 cursor-pointer disabled:opacity-40"
                  />

                  {/* Calibration shortcuts */}
                  <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>0.0 dB (Volume brut)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGainOffsetChange(1.8)}
                        className={`px-2 py-0.5 rounded border ${
                          gainCompOffsetDb === 1.8 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400' : 'bg-white/5 border-white/10'
                        }`}
                      >
                        Spotify (-1.8 dB)
                      </button>
                      <button
                        onClick={() => handleGainOffsetChange(3.6)}
                        className={`px-2 py-0.5 rounded border ${
                          gainCompOffsetDb === 3.6 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400' : 'bg-white/5 border-white/10'
                        }`}
                      >
                        TikTok & Club (-3.6 dB)
                      </button>
                      <button
                        onClick={() => handleGainOffsetChange(4.8)}
                        className={`px-2 py-0.5 rounded border ${
                          gainCompOffsetDb === 4.8 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400' : 'bg-white/5 border-white/10'
                        }`}
                      >
                        Ultra (-4.8 dB)
                      </button>
                    </div>
                    <span>-10.0 dB</span>
                  </div>
                </div>

                {/* Real-time Status Badge */}
                <div className="flex items-center justify-between bg-black/40 px-3.5 py-2.5 rounded-lg border border-white/5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-slate-400">FLUX D'ÉCOUTE EN DIRECT :</span>
                    <strong className="text-white">
                      {abMode === 'A' ? 'SIGNAL A (MIX BRUT ORIGINAL)' : 'SIGNAL B (MASTER ANALOGIQUE TRAITÉ)'}
                    </strong>
                  </div>
                  <div className="text-slate-400">
                    CALIBRAGE :{' '}
                    <strong className={gainCompEnabled ? 'text-emerald-400' : 'text-slate-400'}>
                      {gainCompEnabled ? `VOLUME PERÇU ALIGNÉ (-${gainCompOffsetDb} dB)` : 'VOLUME RÉEL MASTER'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 3-Band Dynamic Multiband Compressor Console */}
            <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-mono text-sm font-bold text-white tracking-wide">
                    COMPRESSEUR MULTIBANDE DYNAMIQUE (CROSSOVER 250 Hz & 3.5 kHz)
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  TRAITEMENT DSP TEMPS RÉEL ACTIF
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs">
                {/* Low Band Compressor (< 250 Hz) */}
                <div className="bg-[#121320] p-4 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400 font-bold">1. LOW BAND (&lt; 250 Hz)</span>
                    <span className="text-slate-400 text-[10px]">Sub & Kick</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Seuil (Threshold)</span>
                        <span className="text-white font-bold">{multiband.lowThreshold} dB</span>
                      </div>
                      <input
                        type="range"
                        min={-40}
                        max={0}
                        value={multiband.lowThreshold}
                        onChange={(e) =>
                          setMultiband({ ...multiband, lowThreshold: parseFloat(e.target.value) })
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Ratio</span>
                        <span className="text-white font-bold">{multiband.lowRatio}:1</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        step={0.5}
                        value={multiband.lowRatio}
                        onChange={(e) =>
                          setMultiband({ ...multiband, lowRatio: parseFloat(e.target.value) })
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Gain Makeup</span>
                        <span className="text-white font-bold">+{multiband.lowMakeup} dB</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={8}
                        step={0.5}
                        value={multiband.lowMakeup}
                        onChange={(e) =>
                          setMultiband({ ...multiband, lowMakeup: parseFloat(e.target.value) })
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Gain Reduction Meter */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Réduction de Gain :</span>
                    <span className="text-cyan-400 font-bold">-{reductions.low.toFixed(1)} dB</span>
                  </div>
                </div>

                {/* Mid Band Compressor (250 Hz - 3.5 kHz) */}
                <div className="bg-[#121320] p-4 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-400 font-bold">2. MID BAND (250 - 3.5k)</span>
                    <span className="text-slate-400 text-[10px]">Voix & Chords</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Seuil (Threshold)</span>
                        <span className="text-white font-bold">{multiband.midThreshold} dB</span>
                      </div>
                      <input
                        type="range"
                        min={-40}
                        max={0}
                        value={multiband.midThreshold}
                        onChange={(e) =>
                          setMultiband({ ...multiband, midThreshold: parseFloat(e.target.value) })
                        }
                        className="w-full accent-purple-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Ratio</span>
                        <span className="text-white font-bold">{multiband.midRatio}:1</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={0.5}
                        value={multiband.midRatio}
                        onChange={(e) =>
                          setMultiband({ ...multiband, midRatio: parseFloat(e.target.value) })
                        }
                        className="w-full accent-purple-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Gain Makeup</span>
                        <span className="text-white font-bold">+{multiband.midMakeup} dB</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={8}
                        step={0.5}
                        value={multiband.midMakeup}
                        onChange={(e) =>
                          setMultiband({ ...multiband, midMakeup: parseFloat(e.target.value) })
                        }
                        className="w-full accent-purple-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Réduction de Gain :</span>
                    <span className="text-purple-400 font-bold">-{reductions.mid.toFixed(1)} dB</span>
                  </div>
                </div>

                {/* High Band Compressor (> 3.5 kHz) */}
                <div className="bg-[#121320] p-4 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400 font-bold">3. HIGH BAND (&gt; 3.5 kHz)</span>
                    <span className="text-slate-400 text-[10px]">Air & Hats</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Seuil (Threshold)</span>
                        <span className="text-white font-bold">{multiband.highThreshold} dB</span>
                      </div>
                      <input
                        type="range"
                        min={-40}
                        max={0}
                        value={multiband.highThreshold}
                        onChange={(e) =>
                          setMultiband({ ...multiband, highThreshold: parseFloat(e.target.value) })
                        }
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Ratio</span>
                        <span className="text-white font-bold">{multiband.highRatio}:1</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={0.5}
                        value={multiband.highRatio}
                        onChange={(e) =>
                          setMultiband({ ...multiband, highRatio: parseFloat(e.target.value) })
                        }
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Gain Makeup</span>
                        <span className="text-white font-bold">+{multiband.highMakeup} dB</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={8}
                        step={0.5}
                        value={multiband.highMakeup}
                        onChange={(e) =>
                          setMultiband({ ...multiband, highMakeup: parseFloat(e.target.value) })
                        }
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Réduction de Gain :</span>
                    <span className="text-emerald-400 font-bold">-{reductions.high.toFixed(1)} dB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: MUSIC SUBSCRIPTIONS (GRATUIT, PREMIUM, PROFESSIONNEL) ===================== */}
        {activeTab === 'sales' && (
          <div className="space-y-8">
            {/* Subscription Hero Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#10121F] to-cyan-950/40 border border-white/10 p-6 lg:p-8 space-y-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    CATALOGUE & ACCÈS VIP TYPE SPOTIFY & YOUTUBE MUSIC
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                    Forfaits & Abonnements : Choisissez votre formule musicale
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans">
                    Profitez d’une expérience studio sans compromis : streaming audio Hi-Res, téléchargement des stems multipistes, mastering analogique DSP avec comparaison A/B gain-compensé et licences commerciales certifiées.
                  </p>
                </div>

                {/* Current Active Plan Badge */}
                <div className="bg-[#141624] border border-white/10 rounded-2xl p-4 text-right font-mono min-w-[200px] shadow-lg">
                  <span className="text-[11px] text-slate-400 block uppercase tracking-wider">Votre Forfait Actuel</span>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span
                      className={`text-lg font-extrabold uppercase ${
                        userPlan === 'pro'
                          ? 'text-cyan-400'
                          : userPlan === 'premium'
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {userPlan === 'pro' ? 'Professionnel' : userPlan === 'premium' ? 'Premium' : 'Gratuit'}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {userPlan === 'free'
                      ? 'Accès découverte illimité'
                      : userPlan === 'premium'
                      ? 'Licence commerciale active'
                      : 'Studio Élite & Cession de droits'}
                  </p>
                </div>
              </div>

              {/* Billing Cycle Switcher (Monthly vs Annual -20%) */}
              <div className="flex justify-center pt-2 relative z-10">
                <div className="inline-flex items-center bg-black/50 p-1.5 rounded-2xl border border-white/10 font-mono text-xs">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-5 py-2 rounded-xl transition-all font-semibold ${
                      billingCycle === 'monthly'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Facturation Mensuelle
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`px-5 py-2 rounded-xl transition-all font-semibold flex items-center gap-2 ${
                      billingCycle === 'annual'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Facturation Annuelle</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-extrabold border border-emerald-400/40">
                      -20% ÉCONOMIE
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* The 3 Subscription Tiers Cards Grid (Gratuit, Premium, Professionnel) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
              {/* TIER 1: GRATUIT */}
              <div
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all relative ${
                  userPlan === 'free'
                    ? 'bg-[#0E0F18] border-white/20 ring-1 ring-white/10 shadow-lg'
                    : 'bg-[#0B0C14] border-white/5 opacity-85 hover:opacity-100 hover:border-white/15'
                }`}
              >
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      NIVEAU 1 • DÉCOUVERTE
                    </span>
                    <h3 className="text-xl font-bold text-white">Gratuit</h3>
                    <p className="text-xs text-slate-400 font-sans">
                      Pour explorer le catalogue nostalgique et tester le synthétiseur en temps réel.
                    </p>
                  </div>

                  <div className="py-2 border-y border-white/5 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-white">0.00 $</span>
                    <span className="text-xs text-slate-400">CAD / mois</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Streaming audio AAC 128 kbps</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Accès aux 12 hits mythiques Y2K déconstruits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Clavier virtuel interactif et pads d’accords</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>2 exports MP3 basse résolution / mois</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-500">
                      <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      <span className="line-through">Pas d'accès aux Stems multipistes</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-500">
                      <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                      <span className="line-through">Pas de licence d'exploitation commerciale</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5">
                  {userPlan === 'free' ? (
                    <div className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      FORFAIT ACTUEL
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan('free')}
                      className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-all"
                    >
                      Rétrograder au forfait Gratuit
                    </button>
                  )}
                </div>
              </div>

              {/* TIER 2: PREMIUM (POPULAIRE) */}
              <div
                className={`rounded-2xl border-2 p-6 flex flex-col justify-between transition-all relative shadow-2xl ${
                  userPlan === 'premium'
                    ? 'bg-gradient-to-b from-[#181528] to-[#0D0E1A] border-amber-400 ring-2 ring-amber-400/20 shadow-amber-500/10'
                    : 'bg-gradient-to-b from-[#161324] to-[#0B0C15] border-amber-500/40 hover:border-amber-400 shadow-purple-950/30'
                }`}
              >
                {/* Popular Ribbon */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-black text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  ⭐ LE PLUS POPULAIRE • CRÉATEURS
                </div>

                <div className="space-y-5 pt-1">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      NIVEAU 2 • CRÉATEURS & ARTISTES
                    </span>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      Premium
                      <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </h3>
                    <p className="text-xs text-slate-300 font-sans">
                      Pour créateurs TikTok/Reels, YouTubers et artistes indépendants en quête de viralité.
                    </p>
                  </div>

                  <div className="py-2 border-y border-white/10 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-white">
                      {billingCycle === 'monthly' ? '14.99 $' : '11.99 $'}
                    </span>
                    <span className="text-xs text-slate-400">CAD / mois</span>
                    {billingCycle === 'annual' && (
                      <span className="text-[10px] text-emerald-400 font-semibold ml-1">
                        (143.88 $ facturé / an)
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Qualité Master Lossless Hi-Res</strong> (WAV 24-bit 48kHz + FLAC)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Exports audio illimités</strong> sans filigrane
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Accès aux 4 Stems multipistes</strong> (Drums, Bass, Chords, Lead)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>Générateur de Toplines bilingues FR/EN avec [AGENT-VOICE]</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Licence commerciale mondiale de synchronisation</strong> (TikTok, YouTube, Reels, podcasts)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>Calendrier viral de publication 7 jours inclus</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10">
                  {userPlan === 'premium' ? (
                    <div className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      ABONNEMENT PREMIUM ACTIF
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan('premium')}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <Crown className="w-4 h-4 stroke-[2.5]" />
                      S'ABONNER À PREMIUM ({billingCycle === 'monthly' ? '14.99 $' : '11.99 $'} CAD / MOIS)
                    </button>
                  )}
                </div>
              </div>

              {/* TIER 3: PROFESSIONNEL (STUDIO ÉLITE) */}
              <div
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all relative ${
                  userPlan === 'pro'
                    ? 'bg-gradient-to-b from-[#141b2a] to-[#0A0D15] border-cyan-400 ring-2 ring-cyan-400/20 shadow-cyan-500/10'
                    : 'bg-gradient-to-b from-[#101524] to-[#090C14] border-cyan-500/30 hover:border-cyan-400/70 shadow-xl'
                }`}
              >
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      NIVEAU 3 • STUDIOS & LABELS
                    </span>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      Professionnel
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                    </h3>
                    <p className="text-xs text-slate-300 font-sans">
                      Pour beatmakers certifiés, ingénieurs du son et labels exigeant la perfection analogique.
                    </p>
                  </div>

                  <div className="py-2 border-y border-white/10 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-white">
                      {billingCycle === 'monthly' ? '39.99 $' : '31.99 $'}
                    </span>
                    <span className="text-xs text-slate-400">CAD / mois</span>
                    {billingCycle === 'annual' && (
                      <span className="text-[10px] text-cyan-400 font-semibold ml-1">
                        (383.88 $ facturé / an)
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Tout ce qui est inclus dans le forfait Premium</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Console A/B Mastering avec Gain Compensé</strong> (Loudness Matching psycho-acoustique)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>Cibles broadcast illimitées (-14 Spotify, -9.2 TikTok, -7.8 Club)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Stems en WAV 32-bit float découpés + exports MIDI</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Cession de droits d’auteur exclusive</strong> certifiée (Quittance ISRC/ISWC sans royalties)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>Support ingénieur du son 24/7 en priorité absolue</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10">
                  {userPlan === 'pro' ? (
                    <div className="w-full py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-center text-xs font-bold text-cyan-300 flex items-center justify-center gap-2">
                      <Check className="w-4 h-4 text-cyan-400" />
                      ABONNEMENT PROFESSIONNEL ACTIF
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan('pro')}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 stroke-[2.5]" />
                      CHOISIR LE FORFAIT PRO ({billingCycle === 'monthly' ? '39.99 $' : '31.99 $'} CAD / MOIS)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Exhaustive Feature Matrix Comparison (Spotify & YouTube Music Style) */}
            <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 lg:p-6 space-y-4 font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    TABLEAU COMPARATIF COMPLET DES FONCTIONNALITÉS
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">Spécifications Audio Studio</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                      <th className="py-3 px-4 font-normal">FONCTIONNALITÉ</th>
                      <th className="py-3 px-4 text-center font-normal">GRATUIT</th>
                      <th className="py-3 px-4 text-center font-bold text-amber-400">PREMIUM</th>
                      <th className="py-3 px-4 text-center font-bold text-cyan-400">PROFESSIONNEL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    <tr>
                      <td className="py-3 px-4">Qualité audio streaming & synthèse</td>
                      <td className="py-3 px-4 text-center text-slate-400">AAC 128 kbps</td>
                      <td className="py-3 px-4 text-center text-white font-semibold">Lossless 24-bit / 48kHz</td>
                      <td className="py-3 px-4 text-center text-cyan-300 font-bold">Studio 32-bit Float</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">Exports WAV & MP3 téléchargeables</td>
                      <td className="py-3 px-4 text-center text-slate-400">2 / mois (avec filigrane)</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">Illimités (sans filigrane)</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">Illimités (sans filigrane)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">Stems multipistes séparés (Drums, Bass, Chords, Lead)</td>
                      <td className="py-3 px-4 text-center text-slate-600">✕</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ WAV Stems</td>
                      <td className="py-3 px-4 text-center text-cyan-300 font-bold">✓ WAV Stems + MIDI</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">Générateur de Paroles Bilingues FR/EN [AGENT-VOICE]</td>
                      <td className="py-3 px-4 text-center text-slate-400">3 essais</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Illimité</td>
                      <td className="py-3 px-4 text-center text-cyan-300 font-bold">✓ Illimité + phonétique</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">Module A/B Mastering avec Gain Compensé (Loudness-Match)</td>
                      <td className="py-3 px-4 text-center text-slate-600">✕</td>
                      <td className="py-3 px-4 text-center text-slate-400">Mode A/B simple</td>
                      <td className="py-3 px-4 text-center text-cyan-300 font-bold">✓ Analyse Gain Compensé</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">Cibles LUFS Broadcast personnalisées (-14, -9.2, -7.8)</td>
                      <td className="py-3 px-4 text-center text-slate-600">✕</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Spotify (-14) & TikTok (-9.2)</td>
                      <td className="py-3 px-4 text-center text-cyan-300 font-bold">✓ Toutes cibles + Ultra Club</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">Licence Commerciale de Synchronisation (Réseaux / Web)</td>
                      <td className="py-3 px-4 text-center text-slate-600">Usage privé</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ TikTok, YouTube, Reels</td>
                      <td className="py-3 px-4 text-center text-cyan-300 font-bold">✓ Mondiale Tout Médias</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">Contrat de cession légale et quittance ISRC/ISWC</td>
                      <td className="py-3 px-4 text-center text-slate-600">✕</td>
                      <td className="py-3 px-4 text-center text-slate-400">Attestation simple</td>
                      <td className="py-3 px-4 text-center text-cyan-300 font-bold">✓ Cession exclusive notariée</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Subscription & Billing Management Card */}
            <div className="rounded-2xl bg-[#0E101B] border border-white/10 p-5 space-y-4 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-bold">GESTION DU COMPTE & FACTURATION SÉCURISÉE</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                  Transactions chiffrées SSL / PCI-DSS v4.0
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-slate-400 text-[10px] block">STATUT DU COMPTE</span>
                  <div className="text-white font-bold text-sm uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Forfait {userPlan === 'pro' ? 'Professionnel' : userPlan === 'premium' ? 'Premium' : 'Gratuit'}
                  </div>
                  <p className="text-[10px] text-slate-500">Renouvellement automatique actif</p>
                </div>

                <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-slate-400 text-[10px] block">PASSERELLE DE PAIEMENT ACTIVE</span>
                  <div className="text-white font-bold text-sm">
                    {paymentMethod === 'stripe' ? 'Stripe & Link (3DS2)' : paymentMethod === 'paypal' ? 'PayPal v2 SDK' : 'ACH Direct Debit'}
                  </div>
                  <p className="text-[10px] text-slate-500">Clés d’idempotence vérifiées</p>
                </div>

                <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-slate-400 text-[10px] block">ACTIONS CLIENT</span>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <button
                      onClick={handleDownloadInvoice}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-[10px] flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3 h-3 text-cyan-400" />
                      Télécharger la Facture
                    </button>
                    <button
                      onClick={() => setShowCheckoutModal(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[10px] font-semibold"
                    >
                      Modifier mon Forfait
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ===================== 7-DAY VIRAL SOCIAL PUBLICATION CALENDAR ===================== */}
            <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 lg:p-6 space-y-6 font-mono">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-purple-500/30">
                      <Calendar className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                      CALENDRIER ÉDITORIAL VIRAL 7 JOURS (TIKTOK & REELS)
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                        Objectif : 1 000 $ CAD Fast Cash
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Séquence algorithmique optimisée sur le hook :{' '}
                    <span className="text-cyan-300 font-bold">{selectedPreset.name}</span> ({selectedPreset.artistRef} x{' '}
                    {selectedPreset.targetStyle}) pour maximiser la rétention et convertir les créateurs.
                  </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setCalendarAngleVariant((prev) => (prev + 1) % 3)}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 text-xs flex items-center gap-1.5 transition-all"
                    title="Changer l'angle d'accroche (Standard, Underground Club, Storytelling)"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      ANGLE :{' '}
                      {calendarAngleVariant === 0
                        ? 'STANDARD Y2K'
                        : calendarAngleVariant === 1
                        ? 'UNDERGROUND CLUB'
                        : 'NEURO-STORY'}
                    </span>
                  </button>

                  <button
                    onClick={handleCopyFullCalendar}
                    className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs flex items-center gap-1.5 transition-all"
                  >
                    {copiedFullCalendar ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">CALENDRIER COPIÉ !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>TOUT COPIER (.MD)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleExportSocialCalendar}
                    className="px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>EXPORTER PLANNING</span>
                  </button>
                </div>
              </div>

              {/* Filters & View Switcher Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Platform Filters */}
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-500 px-2 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> FILTRE :
                  </span>
                  <button
                    onClick={() => setSocialPlatformFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      socialPlatformFilter === 'all'
                        ? 'bg-purple-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tous (7 Posts)
                  </button>
                  <button
                    onClick={() => setSocialPlatformFilter('tiktok')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      socialPlatformFilter === 'tiktok'
                        ? 'bg-cyan-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    TikTok Focus
                  </button>
                  <button
                    onClick={() => setSocialPlatformFilter('instagram')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      socialPlatformFilter === 'instagram'
                        ? 'bg-pink-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Instagram Reels
                  </button>
                </div>

                {/* View Switcher: Focused Day vs Full Grid */}
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setCalendarViewMode('focused')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      calendarViewMode === 'focused'
                        ? 'bg-white/10 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Vue Détaillée (Jour par Jour)
                  </button>
                  <button
                    onClick={() => setCalendarViewMode('grid')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      calendarViewMode === 'grid'
                        ? 'bg-white/10 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Vue Semaine (7 Cartes)
                  </button>
                </div>
              </div>

              {/* Day Selector Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {socialSchedule.map((item) => {
                  const isDaySelected = activeCalendarDay === item.day;
                  const isFilteredOut =
                    (socialPlatformFilter === 'tiktok' && !item.platforms.includes('TikTok')) ||
                    (socialPlatformFilter === 'instagram' && !item.platforms.includes('Instagram Reels'));

                  return (
                    <button
                      key={item.day}
                      onClick={() => {
                        setActiveCalendarDay(item.day);
                        setCalendarViewMode('focused');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                        isDaySelected && calendarViewMode === 'focused'
                          ? 'bg-gradient-to-b from-purple-900/40 to-[#121320] border-purple-500 shadow-lg shadow-purple-500/10'
                          : 'bg-white/5 border-white/5 hover:border-white/20 text-slate-400'
                      } ${isFilteredOut ? 'opacity-40' : 'opacity-100'}`}
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`font-bold ${isDaySelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                          {item.dayName}
                        </span>
                        <span className="text-[9px] text-slate-500">{item.weekday.slice(0, 3)}</span>
                      </div>
                      <div className="text-[11px] font-bold text-white truncate mt-1">
                        {item.title.split(' ')[0]} {item.title.split(' ')[1] || ''}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 text-[9px] text-slate-400">
                        <Clock className="w-2.5 h-2.5 text-amber-400" />
                        <span>{item.timeSlot.split(' ')[0]}</span>
                      </div>
                      {isDaySelected && calendarViewMode === 'focused' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Main Content Area: Focused Day vs Grid View */}
              {calendarViewMode === 'focused' ? (
                // Focused Day Detailed Inspector
                (() => {
                  const currentDayItem =
                    socialSchedule.find((item) => item.day === activeCalendarDay) || socialSchedule[0];

                  return (
                    <div className="bg-[#121320] rounded-2xl border border-white/10 p-5 space-y-5">
                      {/* Top Header for Selected Day */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 text-xs">
                            {currentDayItem.dayName.toUpperCase()} • {currentDayItem.weekday.toUpperCase()}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {currentDayItem.timeSlot}
                          </span>
                          {currentDayItem.platforms.map((p) => (
                            <span
                              key={p}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p === 'TikTok'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              }`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {currentDayItem.estimatedReach}
                          </span>
                          <button
                            onClick={() => handleCopySingleDay(currentDayItem)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            {copiedSocialDay === currentDayItem.day ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>COPIÉ DANS LE PRESSE-PAPIER !</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>COPIER CE POST COMPLET</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Post Title */}
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <Video className="w-4 h-4 text-purple-400" />
                          {currentDayItem.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{currentDayItem.editingTheme}</p>
                      </div>

                      {/* 2-Column Inspector Details */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                        {/* Left Column: Visual Hook & Montage Instructions */}
                        <div className="space-y-4">
                          {/* Visual Hook Sticker */}
                          <div className="p-4 rounded-xl bg-black/50 border border-amber-500/30 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                              <span className="flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                ACCROCHE VISUELLE ÉCRAN (0 - 1.2s)
                              </span>
                              <span className="text-[10px] text-slate-500">Stop-Scroll Garanti</span>
                            </div>
                            <div className="p-3 rounded-lg bg-[#181a2b] border border-amber-500/20 text-white font-bold text-sm tracking-wide text-center shadow-inner">
                              « {currentDayItem.visualHook0to1s} »
                            </div>
                            <p className="text-[10px] text-slate-400 italic">
                              À superposer en gros caractères centrés avec fond noir translucide dans les 1.2 premières secondes.
                            </p>
                          </div>

                          {/* Video Montage & Camera Directives */}
                          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2.5">
                            <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                              DIRECTIVES DE MONTAGE (CAPCUT / PREMIERE)
                            </div>
                            <div className="space-y-2">
                              {currentDayItem.cameraAndMontageInstructions.map((inst, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-slate-300">
                                  <span className="text-cyan-400 font-bold shrink-0 mt-0.5">{idx + 1}.</span>
                                  <span className="leading-relaxed">{inst}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Audio Balance Guidance */}
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                              RÉGLAGE DU SON DANS L'APP :
                            </span>
                            <span className="text-emerald-300 font-semibold">{currentDayItem.audioTip}</span>
                          </div>
                        </div>

                        {/* Right Column: Caption, Hashtags, CTA */}
                        <div className="space-y-4">
                          {/* Caption / Description Box */}
                          <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-purple-400" />
                                DESCRIPTION (CAPTION) PRÊTE À POSTER
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(currentDayItem.caption);
                                  handleCopyText(currentDayItem.caption, `caption-${currentDayItem.day}`);
                                }}
                                className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                              >
                                {copiedSection === `caption-${currentDayItem.day}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>COPIÉ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>COPIER CAPTION</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="p-3 rounded-lg bg-[#181a2b] border border-white/5 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                              {currentDayItem.caption}
                            </div>
                          </div>

                          {/* Call To Action Banner */}
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                              <Send className="w-3 h-3" /> CALL TO ACTION (CONVERSION FAST CASH) :
                            </div>
                            <p className="text-white font-semibold text-xs">{currentDayItem.callToAction}</p>
                          </div>

                          {/* Viral Hashtags */}
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-300 flex items-center gap-1">
                                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                                HASHTAGS VIRAUX RECOMMANDÉS
                              </span>
                              <button
                                onClick={() => {
                                  const tagStr = currentDayItem.viralHashtags.join(' ');
                                  handleCopyText(tagStr, `tags-${currentDayItem.day}`);
                                }}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                              >
                                {copiedSection === `tags-${currentDayItem.day}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>COPIÉ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>COPIER HASHTAGS</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {currentDayItem.viralHashtags.map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  onClick={() => handleCopyText(tag, `tag-${tag}`)}
                                  className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 text-[11px] border border-white/5 transition-all cursor-pointer"
                                  title="Cliquer pour copier ce hashtag"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Commercial Goal & Navigation Footer */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="text-[10px] text-slate-400">
                              <span className="text-amber-400 font-bold">OBJECTIF : </span>
                              {currentDayItem.targetObjective}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                disabled={currentDayItem.day === 1}
                                onClick={() => setActiveCalendarDay((prev) => Math.max(1, prev - 1))}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs disabled:opacity-30 disabled:pointer-events-none"
                              >
                                ← J-{currentDayItem.day - 1}
                              </button>
                              <button
                                disabled={currentDayItem.day === 7}
                                onClick={() => setActiveCalendarDay((prev) => Math.min(7, prev + 1))}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs disabled:opacity-30 disabled:pointer-events-none"
                              >
                                J+{currentDayItem.day + 1} →
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                // Full 7-Day Grid View
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-xs">
                  {filteredSocialSchedule.map((item) => (
                    <div
                      key={item.day}
                      className="bg-[#121320] border border-white/10 hover:border-purple-500/40 rounded-xl p-4 space-y-3 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Day & Platform Badges */}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-[11px]">
                            {item.dayName.toUpperCase()} • {item.weekday.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.timeSlot.split(' ')[0]}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="text-white font-bold text-xs">{item.title}</div>

                        {/* Visual Hook Box */}
                        <div className="p-2.5 rounded-lg bg-black/40 border border-amber-500/20 text-slate-200 text-[11px] italic">
                          « {item.visualHook0to1s} »
                        </div>

                        {/* Editing Direction Summary */}
                        <div className="text-[10px] text-slate-400 line-clamp-2">{item.editingTheme}</div>

                        {/* Hashtags preview */}
                        <div className="flex flex-wrap gap-1">
                          {item.viralHashtags.slice(0, 4).map((tag, idx) => (
                            <span key={idx} className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          {item.viralHashtags.length > 4 && (
                            <span className="text-[10px] text-slate-500">+{item.viralHashtags.length - 4}</span>
                          )}
                        </div>
                      </div>

                      {/* Card Action Button */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setActiveCalendarDay(item.day);
                            setCalendarViewMode('focused');
                          }}
                          className="text-[10px] text-purple-400 hover:text-white underline"
                        >
                          Détails & Instructions →
                        </button>

                        <button
                          onClick={() => handleCopySingleDay(item)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1"
                        >
                          {copiedSocialDay === item.day ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>COPIÉ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>COPIER</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Unified Subscription & Checkout Modal (Spotify & YouTube Music Caliber) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0E16] border border-white/10 rounded-3xl max-w-xl w-full p-6 lg:p-7 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                  <Crown className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    PASSERELLE UNIFIÉE D'ABONNEMENT MUSICAL
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Infrastructure sécurisée Stripe, PayPal & ACH (Type Spotify & YouTube Music)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  setPaymentSuccess(false);
                }}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all font-mono"
              >
                ✕ FERMER
              </button>
            </div>

            {paymentSuccess ? (
              <div className="py-8 text-center space-y-4 font-mono">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-emerald-400 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    ABONNEMENT {selectedPlanForModal.toUpperCase()} CONFIRMÉ !
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Vos privilèges studio (Master Lossless, Stems multipistes, A/B Mastering) sont activés immédiatement.
                  </p>
                </div>

                <div className="bg-[#121422] p-4 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1.5 text-left max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span>Numéro de transaction :</span>
                    <span className="text-cyan-400 font-bold">TX-2026{Math.floor(100000 + Math.random() * 900000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Forfait souscrit :</span>
                    <span className="text-white font-bold uppercase">{selectedPlanForModal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cycle de facturation :</span>
                    <span className="text-slate-200">{billingCycle === 'monthly' ? 'Mensuel' : 'Annuel (-20%)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Statut transactionnel :</span>
                    <span className="text-emerald-400 font-bold">ACID Inscription Réussie</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <button
                    onClick={handleDownloadInvoice}
                    className="px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger la Facture / Quittance (.MD)
                  </button>
                  <button
                    onClick={() => {
                      setShowCheckoutModal(false);
                      setPaymentSuccess(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
                  >
                    Retour au Studio
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Plan Selection Buttons inside Modal */}
                <div className="space-y-2 font-mono">
                  <label className="text-[11px] text-slate-400 block uppercase">CHOISIR LA FORMULE MUSICALE :</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => setSelectedPlanForModal('premium')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedPlanForModal === 'premium'
                          ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/40 text-amber-300'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          PREMIUM
                        </span>
                        <span className="font-extrabold text-amber-300">
                          {billingCycle === 'monthly' ? '14.99 $' : '11.99 $'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Lossless Hi-Res, Stems & Toplines</p>
                    </button>

                    <button
                      onClick={() => setSelectedPlanForModal('pro')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedPlanForModal === 'pro'
                          ? 'bg-cyan-500/20 border-cyan-400 ring-1 ring-cyan-400/40 text-cyan-300'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          PROFESSIONNEL
                        </span>
                        <span className="font-extrabold text-cyan-300">
                          {billingCycle === 'monthly' ? '39.99 $' : '31.99 $'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">A/B Gain-Match & Cession Exclusif</p>
                    </button>
                  </div>
                </div>

                {/* Billing Summary Box */}
                <div className="bg-[#12131F] p-4 rounded-xl border border-white/5 font-mono text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>FORFAIT RETENU :</span>
                    <span className="text-white font-bold uppercase">
                      {selectedPlanForModal === 'pro' ? 'Studio Professionnel' : 'Artiste Premium'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>CADENCE :</span>
                    <span className="text-purple-300 font-bold">
                      {billingCycle === 'monthly' ? 'Mensuel sans engagement' : 'Annuel (2 mois offerts)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>TOTAL FACTURÉ :</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {billingCycle === 'monthly'
                        ? selectedPlanForModal === 'pro'
                          ? '39.99 $ CAD / mois'
                          : '14.99 $ CAD / mois'
                        : selectedPlanForModal === 'pro'
                        ? '383.88 $ CAD / an (31.99 $/mois)'
                        : '143.88 $ CAD / an (11.99 $/mois)'}
                    </span>
                  </div>
                </div>

                {/* Secure Gateway Options */}
                <div className="space-y-2 font-mono text-xs">
                  <span className="text-slate-400 block text-[10px]">MOYEN DE PAIEMENT SÉCURISÉ (UNIFIÉ) :</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPaymentMethod('stripe')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        paymentMethod === 'stripe'
                          ? 'bg-purple-600/25 border-purple-500 text-purple-300 font-bold shadow-md shadow-purple-600/20'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 mx-auto mb-1 text-purple-400" />
                      Stripe & Link
                    </button>
                    <button
                      onClick={() => setPaymentMethod('paypal')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        paymentMethod === 'paypal'
                          ? 'bg-cyan-600/25 border-cyan-500 text-cyan-300 font-bold shadow-md shadow-cyan-600/20'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
                      PayPal v2
                    </button>
                    <button
                      onClick={() => setPaymentMethod('ach')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        paymentMethod === 'ach'
                          ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-600/20'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
                      ACH / Virement
                    </button>
                  </div>
                </div>

                {/* Legal & Security Guarantee */}
                <div className="text-[10px] font-mono text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    GARANTIE & RÉSILIATION LIBRE :
                  </div>
                  <p>
                    Abonnement sans engagement, résiliable en 1 clic à tout moment. Facture certifiée avec quittance de licence de synchronisation commerciale mondiale.
                  </p>
                </div>

                {/* Confirm Payment Action Button */}
                <button
                  onClick={handleConfirmSubscription}
                  disabled={isProcessingPayment}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black font-mono font-extrabold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>SÉCURISATION DU PAIEMENT EN COURS...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 stroke-[3]" />
                      <span>
                        CONFIRMER L'ABONNEMENT {selectedPlanForModal.toUpperCase()} (
                        {billingCycle === 'monthly'
                          ? selectedPlanForModal === 'pro'
                            ? '39.99 $ CAD'
                            : '14.99 $ CAD'
                          : selectedPlanForModal === 'pro'
                          ? '383.88 $ CAD'
                          : '143.88 $ CAD'}
                        )
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Persistent Studio Bottom Status Bar */}
      <footer className="border-t border-white/5 bg-[#08080C] px-4 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-semibold">NOSTALGIAHIT STUDIO</span>
          <span>•</span>
          <span>DSP Multiband Crossover (250Hz / 3.5kHz)</span>
          <span>•</span>
          <span className="text-emerald-400">0$ Infra • Web Audio API</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>Formule Active :</span>
          <span
            className={`font-bold uppercase ${
              userPlan === 'pro' ? 'text-cyan-400' : userPlan === 'premium' ? 'text-amber-400' : 'text-slate-300'
            }`}
          >
            {userPlan === 'pro' ? 'Professionnel' : userPlan === 'premium' ? 'Premium' : 'Gratuit'}
          </span>
          <span>•</span>
          <span className="text-purple-400">Modèle d'Abonnement Professionnel (Spotify / YouTube Music)</span>
        </div>
      </footer>
    </div>
  );
}
