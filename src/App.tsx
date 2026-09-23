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

  // Fast Cash Sales State
  const [clientName, setClientName] = useState<string>('@AlexTikTok');
  const [clientNiche, setClientNiche] = useState<string>('Mode & Lifestyle');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [revenueGoal, setRevenueGoal] = useState<number>(350);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'ach'>('stripe');
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [isRenderingWav, setIsRenderingWav] = useState<boolean>(false);

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

        // 1. Draw FFT Frequency Bars in background
        const barWidth = width / 64;
        for (let i = 0; i < 64; i++) {
          const barHeight = (freqData[i * 2] / 255) * (height * 0.72);
          const x = i * barWidth;
          const y = height - barHeight;

          const gradient = ctx.createLinearGradient(0, height, 0, y);
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
          gradient.addColorStop(0.6, 'rgba(168, 85, 247, 0.45)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.85)');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth - 2, barHeight);
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

  const handleSimulatePayment = () => {
    setPaymentSuccess(true);
    setRevenueGoal((prev) => Math.min(1000, prev + 350));
    setTimeout(() => {
      setPaymentSuccess(false);
      setShowCheckoutModal(false);
    }, 2200);
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

          {/* Fast Cash Modal Trigger */}
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold text-xs font-mono shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all"
          >
            <DollarSign className="w-4 h-4 stroke-[3]" />
            <span>ENCAISSER (1 000$)</span>
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
            AGENT-SOUND : Compresseur Multibande (-9.2 LUFS)
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === 'sales'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            Opérations Fast Cash (1 000$ CAD)
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

        {/* ===================== TAB 4: FAST CASH OPERATIONS ===================== */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#15121c] to-yellow-950/40 border border-amber-500/30 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
                    <h2 className="text-base font-bold font-mono text-white">
                      OBJECTIF COMMERCIAL : 1 000 $ CAD EN MOINS DE 10 JOURS
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    Stratégie One-Shot : Monétisation immédiate des flips nostalgiques auprès de créateurs à fort trafic.
                  </p>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs text-slate-400">TOTAL SÉCURISÉ :</div>
                  <div className="text-2xl font-extrabold text-amber-400">{revenueGoal} $ CAD / 1 000 $</div>
                </div>
              </div>

              <div>
                <div className="w-full bg-black/40 h-3.5 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-md shadow-amber-500/30"
                    style={{ width: `${Math.min(100, (revenueGoal / 1000) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1.5">
                  <span>0 $ CAD (Départ)</span>
                  <span className="text-amber-300 font-bold">{Math.round((revenueGoal / 1000) * 100)}% Complété</span>
                  <span className="text-emerald-400 font-bold">1 000 $ CAD (Objectif)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 block text-[10px]">OPTION 1 : 2 CLIENTS</span>
                  <span className="text-white font-bold">2 x 500 $ CAD</span>
                  <p className="text-[10px] text-slate-400">Offre B (VIP Flip & Stems)</p>
                </div>
                <div className="bg-black/30 p-2.5 rounded-lg border border-amber-500/20">
                  <span className="text-amber-400 block text-[10px]">OPTION 2 : 3 CLIENTS (RECOMMANDÉ)</span>
                  <span className="text-amber-300 font-bold">3 x 350 $ CAD = 1 050 $</span>
                  <p className="text-[10px] text-slate-400">Offre A (Audio Drop 15-30s)</p>
                </div>
                <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <span className="text-slate-400 block text-[10px]">OPTION 3 : 4 CLIENTS</span>
                  <span className="text-white font-bold">4 x 250 $ CAD</span>
                  <p className="text-[10px] text-slate-400">Offre C (Audit & Master Express)</p>
                </div>
              </div>
            </div>

            {/* Cold DM Generator & High-Ticket Offers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-purple-400" />
                    <h3 className="font-mono text-sm font-bold text-white tracking-wide">
                      GÉNÉRATEUR DE COLD DM INSTAGRAM / TIKTOK
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      const dmText = `Hey ${clientName} ! J'ai vu ton contenu sur ${clientNiche}. J'ai flipé le hook de ${selectedPreset.artistRef} dans une version ${selectedPreset.targetStyle} calibrée sur ton univers visuel. Écoute l'extrait de 15s ci-joint. Si tu veux l'exclusivité avec le master broadcast pour tes prochaines vidéos : 350 $ CAD clés en main avec quittance de droits immédiate.`;
                      handleCopyText(dmText, 'custom-dm');
                    }}
                    className="px-3 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-mono text-xs border border-purple-500/30 flex items-center gap-1 transition-all"
                  >
                    {copiedSection === 'custom-dm' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        COPIÉ !
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        COPIER LE DM
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">PSEUDO DU CRÉATEUR</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-[#131422] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">NICHE / THÉMATIQUE</label>
                    <input
                      type="text"
                      value={clientNiche}
                      onChange={(e) => setClientNiche(e.target.value)}
                      className="w-full bg-[#131422] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="bg-[#121320] p-4 rounded-xl border border-white/5 font-mono text-xs text-slate-300 leading-relaxed">
                  <p>
                    Hey <span className="text-purple-400 font-bold">{clientName}</span> ! J'ai vu ton contenu sur{' '}
                    <span className="text-cyan-400 font-bold">{clientNiche}</span>. J'ai flipé le hook de{' '}
                    <span className="text-amber-400 font-bold">{selectedPreset.artistRef}</span> dans une version{' '}
                    <span className="text-emerald-400 font-bold">{selectedPreset.targetStyle}</span> calibrée sur ton univers visuel.
                    Écoute l'extrait de 15s ci-joint. Si tu veux l'exclusivité avec le master broadcast pour tes prochaines vidéos :{' '}
                    <span className="text-white font-bold underline">350 $ CAD</span> clés en main avec quittance de droits immédiate.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#0D0E16] border border-white/10 p-5 space-y-3 font-mono">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    LES 3 OFFRES FAST CASH PRÊTES À VENDRE
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-purple-300">Offre A : Viral Nostalgia Audio Drop</span>
                      <span className="text-emerald-400 font-bold">350 $ à 500 $ CAD</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Hook de 15 à 30 secondes pour podcasts, transitions Reels/TikTok et stories sponsorisées.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cyan-300">Offre B : VIP Artist Flip & Topline</span>
                      <span className="text-emerald-400 font-bold">500 $ à 750 $ CAD</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Déconstruction harmonique, paroles bilingues, stems multipistes et guide phonétique.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-300">Offre C : Audit & Masterisation Express</span>
                      <span className="text-emerald-400 font-bold">150 $ à 250 $ CAD</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Calibration spectrale, compression multibande, brillance air et calibrage strict -9.2 ou -14 LUFS.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowCheckoutModal(true)}
                  className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <DollarSign className="w-4 h-4 stroke-[3]" />
                  OUVRIR LA MODALE D'ENCAISSEMENT DIRECT
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Checkout / Billing Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0E16] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">ENCAISSEMENT IMMÉDIAT & QUITTANCE</h3>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-white/5"
              >
                FERMER ✕
              </button>
            </div>

            {paymentSuccess ? (
              <div className="py-8 text-center space-y-3 font-mono">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-white">TRANSACTION CONFIRMÉE AVEC SUCCÈS</h4>
                <p className="text-xs text-slate-400">
                  +350 $ CAD enregistrés dans le registre de production. Quittance de droits générée.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-[#12131F] p-4 rounded-xl border border-white/5 font-mono text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>CLIENT :</span>
                    <span className="text-white font-bold">{clientName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>PRODUIT :</span>
                    <span className="text-purple-300 font-bold">{selectedPreset.name} Flip</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>MONTANT À RÉGLER :</span>
                    <span className="text-emerald-400 font-bold text-sm">350.00 $ CAD</span>
                  </div>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <span className="text-slate-400 block text-[10px]">PASSERELLE SÉCURISÉE :</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPaymentMethod('stripe')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        paymentMethod === 'stripe'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Stripe & Link
                    </button>
                    <button
                      onClick={() => setPaymentMethod('paypal')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        paymentMethod === 'paypal'
                          ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 font-bold'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      PayPal v2
                    </button>
                    <button
                      onClick={() => setPaymentMethod('ach')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        paymentMethod === 'ach'
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      ACH / Virement
                    </button>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 bg-white/5 p-3 rounded-lg border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    QUITTANCE DE DROITS ET CESSION BROADCAST :
                  </div>
                  <p>
                    La validation libère le contrat de cession d'exploitation commerciale exclusive pour TikTok,
                    Instagram, YouTube et podcasts sans royalties récurrentes.
                  </p>
                </div>

                <button
                  onClick={handleSimulatePayment}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <DollarSign className="w-4 h-4 stroke-[3]" />
                  CONFIRMER LE PAIEMENT (350 $ CAD)
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
          <span>Objectif : 1 000 $ CAD Fast Cash</span>
          <span>•</span>
          <span className="text-purple-400 font-bold">{revenueGoal} $ CAD Réalisés</span>
        </div>
      </footer>
    </div>
  );
}
