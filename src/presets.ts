export interface PresetConfig {
  id: string;
  name: string;
  artistRef: string;
  originalEra: string;
  targetStyle: string;
  bpm: number;
  key: string;
  targetAudience: string;
  defaultOffer: string;
  chordNames: string[];
  chords: number[][]; // Frequencies in Hz
  bassNotes: number[]; // Frequencies in Hz
  neuroHookTrigger: string;
  agentBeatPreview: {
    progression: string;
    bassType: string;
    drumStyle: string;
    stems: string[];
  };
  agentVoicePreview: {
    lyrics: string;
    phonetics: string;
    flow: string;
  };
  agentSoundPreview: {
    subHz: string;
    mudCut: string;
    airHz: string;
    lufs: string;
  };
  agentViralPreview: {
    dmPitch: string;
    videoConcept: string;
    recommendedPrice: number;
  };
}

export const NOSTALGIA_PRESETS: PresetConfig[] = [
  {
    id: 'french-touch-2026',
    name: 'French Touch 2026',
    artistRef: 'Daft Punk (One More Time) / Stromae (Alors on danse)',
    originalEra: '2001 - 2010 (French Touch / Euro House)',
    targetStyle: 'Nu-Disco Afrobeat 124 BPM & Filtered Funk',
    bpm: 124,
    key: 'F Minor',
    targetAudience: '21-40 ans Nostalgiques & Créateurs TikTok Lifestyle/Mode',
    defaultOffer: 'Offre A — Le "Viral Nostalgia Audio Drop" (350 $ CAD)',
    chordNames: ['Fm7 (i)', 'Dbmaj7 (VI)', 'Abmaj7 (III)', 'Eb (VII)'],
    // Fm7, Dbmaj7, Abmaj7, Eb7
    chords: [
      [174.61, 207.65, 261.63, 311.13], // Fm7 (F3, Ab3, C4, Eb4)
      [138.59, 174.61, 207.65, 261.63], // Dbmaj7 (Db3, F3, Ab3, C4)
      [207.65, 261.63, 311.13, 415.30], // Abmaj7 (Ab3, C4, Eb4, Ab4)
      [155.56, 196.00, 233.08, 311.13], // Eb (Eb3, G3, Bb3, Eb4)
    ],
    bassNotes: [43.65, 34.65, 51.91, 38.89], // F1, Db1, Ab1, Eb1
    neuroHookTrigger:
      "La progression i - VI - III - VII libère une décharge de dopamine en 1.2s : le cerveau des 21-40 ans reconnaît instantanément l'euphorie club 2000, réactualisée par les percussions syncopées Afro-House.",
    agentBeatPreview: {
      progression: 'Fm7 - Dbmaj7 - Abmaj7 - Eb (i - VI - III - VII)',
      bassType: 'Sub-bass Moog analogique avec glide doux + saturation harmonique de bande',
      drumStyle: 'Afro-House 124 BPM avec kick rond 4x4, shakers organiques et rimshots décalés',
      stems: ['Moog Bassline', 'French Filtered Rhodes Pad', 'Afro Shaker Loop', 'Vocal Stutter Chop', 'Sidechain Pump'],
    },
    agentVoicePreview: {
      lyrics: "One more night dans le club / Rien n'arrête le son, on danse encore / Feel the rhythm taking over / Juste un instant jusqu'à l'aurore",
      phonetics: "[Wʌn mɔːr naɪt dɑ̃ lə klœb / ʁjɛ̃ na.ʁɛt lə sɔ̃ ɔ̃ dɑ̃s ɑ̃.kɔʁ]",
      flow: 'Cadence syncopée bilingue avec autotune subtil à 15ms et réinjection de délai stéréo en croche pointée',
    },
    agentSoundPreview: {
      subHz: 'High-pass raide 24dB/oct à 28 Hz pour maximiser le headroom des enceintes smartphones',
      mudCut: 'Coupure chirurgicale -3.1dB à 320 Hz pour éliminer la boue spectrale des pads',
      airHz: 'High-shelf d’air soyeux +2.4dB à 12.5 kHz pour scintiller sur AirPods et TikTok',
      lufs: '-9.2 LUFS (Club & Reels Peak Master) / -14 LUFS (Spotify Compliant)',
    },
    agentViralPreview: {
      dmPitch:
        "Hey ! J'ai vu ton contenu sur [Lifestyle/Musique]. J'ai flipé le hook légendaire de Daft Punk dans une version Nu-Disco Afrobeat 124 BPM calibrée sur ton univers visuel. Écoute l'extrait de 15s ci-joint. Si tu veux l'exclusivité avec le master broadcast pour tes prochains Reels : 350 $ CAD clés en main avec quittance de droits immédiate.",
      videoConcept:
        "Transition vidéo avant/après : Début avec extrait lo-fi vinyle 2001 (écouteurs filaires) -> Drop brutal à 0:03 avec transition caméra zoom et étalonnage néon cyber 2026.",
      recommendedPrice: 350,
    },
  },
  {
    id: 'millennium-cyber-pop',
    name: 'Millennium Cyber-Pop',
    artistRef: 'Britney Spears (Toxic) / Timbaland & Nelly Furtado (Promiscuous)',
    originalEra: '2003 - 2007 (Y2K Pop & Timbaland Bounce)',
    targetStyle: 'Jersey Club / Phonk Mélodique 138 BPM',
    bpm: 138,
    key: 'C Minor',
    targetAudience: 'Gen Z & Millennials (TikTok Dance, Fitness & Streetwear)',
    defaultOffer: 'Offre B — Le "VIP Artist Flip & Vocal Topline" (500 $ CAD)',
    chordNames: ['Cm (i)', 'Ab (VI)', 'Eb (III)', 'G7 (V)'],
    chords: [
      [130.81, 155.56, 196.00, 261.63], // Cm (C3, Eb3, G3, C4)
      [103.83, 130.81, 164.81, 207.65], // Ab (Ab2, C3, E3, Ab3)
      [155.56, 196.00, 233.08, 311.13], // Eb (Eb3, G3, Bb3, Eb4)
      [98.00, 123.47, 146.83, 174.61],  // G7 (G2, B2, D3, F3)
    ],
    bassNotes: [32.70, 51.91, 38.89, 49.00], // C1, Ab1, Eb1, G1
    neuroHookTrigger:
      "La tension harmonique du G7 vers Cm active le réflexe de récompense immédiat, tandis que le rythme Jersey Club kick-stutter génère une urgence motrice irrésistible.",
    agentBeatPreview: {
      progression: 'Cm - Ab - Eb - G7 (i - VI - III - V)',
      bassType: '808 Distorsion saturée avec pitch glides agressifs façon Phonk Drift',
      drumStyle: 'Jersey Club stutter sur temps 3&4, bed-squeak sample synthétique et snap reverb',
      stems: ['808 Distorted Sub', 'Jersey Kick Stutter', 'Pizzicato String Hook', 'Snare Roll Stutter', 'Y2K FX Swoosh'],
    },
    agentVoicePreview: {
      lyrics: "Too late baby, got me in a spiral / Un regard toxique et le son devient viral / I'm intoxicated, je perds le signal / Promiscuous vibe, impact maximal",
      phonetics: "[Tuː leɪt ˈbeɪbi ɡɑt mi ɪn ə ˈspaɪrəl / œ̃ ʁə.ɡaʁ tɔk.sik e lə sɔ̃ də.vjɛ̃ vi.ʁal]",
      flow: 'Staccato vocal punchy calé sur le stutter kick avec vocal chops pitchés à +12 demi-tons',
    },
    agentSoundPreview: {
      subHz: 'Coupe-bas strict à 30 Hz avec saturation de 2e harmonique à 60-80 Hz',
      mudCut: 'Dégagement à 280 Hz pour donner tout l’espace aux kicks Jersey mitraillés',
      airHz: 'Présence tranchante à 4.8 kHz pour le lead et ouverture 14 kHz brillante',
      lufs: '-8.8 LUFS (Ultra-Hot TikTok & Club Master)',
    },
    agentViralPreview: {
      dmPitch:
        "Yo ! J'ai concocté un flip hybride Jersey Club x Toxic de Britney à 138 BPM qui cartonne sur les formats courts. Parfait pour dynamiser tes transitions ou tes lancements produits. Fiche technique, stems séparés et topline exclusive inclus : 500 $ CAD avec cession des droits d'exploitation.",
      videoConcept:
        "POV : Tu pensais que 2004 était mort... Drop à 0:02 avec accélération Jersey Club et danse freestyle synchronisée.",
      recommendedPrice: 500,
    },
  },
  {
    id: 'nostalgie-rock-electro',
    name: 'Nostalgie Rock-Electro',
    artistRef: "Indochine (L'Aventurier) / The Prodigy (Breathe)",
    originalEra: '1996 - 2004 (French Wave & Big Beat)',
    targetStyle: 'Synthwave Cyberpunk & D&B Hybrid 130 BPM',
    bpm: 130,
    key: 'A Minor',
    targetAudience: '25-45 ans Gamers, Tech Influencers & Podcasters',
    defaultOffer: 'Offre A — Le "Viral Nostalgia Audio Drop" (350 $ CAD)',
    chordNames: ['Am (i)', 'F (VI)', 'C (III)', 'G (VII)'],
    chords: [
      [110.00, 130.81, 164.81, 220.00], // Am (A2, C3, E3, A3)
      [87.31, 110.00, 130.81, 174.61],  // F (F2, A2, C3, F3)
      [130.81, 164.81, 196.00, 261.63], // C (C3, E3, G3, C4)
      [98.00, 123.47, 146.83, 196.00],  // G (G2, B2, D3, G3)
    ],
    bassNotes: [27.50, 43.65, 32.70, 49.00], // A0, F1, C1, G1
    neuroHookTrigger:
      "La séquence mythique de guitare new-wave d'Indochine transposée en synthé supersaw délivre un sentiment d'aventure et de conquête épique.",
    agentBeatPreview: {
      progression: 'Am - F - C - G (i - VI - III - VII)',
      bassType: 'Rolling Bassline synthwave 16th notes inspirée des légendes electro-rock',
      drumStyle: 'Breakbeat Big Beat lourd fusionné avec clap analogique 909 et crash filtrée',
      stems: ['Rolling Synthwave Bass', 'Supersaw Cyber Lead', 'Big Beat Acoustic Kick', 'Gritty Overdrive Layer'],
    },
    agentVoicePreview: {
      lyrics: "Au bout de la nuit le signal s'allume / Cyber aventurier bravant la brume / Breathe in the fire, no surrender / Gravé dans la mémoire pour toujours",
      phonetics: "[o bu də la nɥi lə si.ɲal sa.lym / ˈsaɪ.bɚ əd.vɛn.tʃɚ.ɚ]",
      flow: 'Chant parlé héroïque mi-français mi-anglais avec résonance de réverbe cathédrale',
    },
    agentSoundPreview: {
      subHz: 'High-pass 32 Hz, contrôle dynamique du bas avec multiband sidechain',
      mudCut: '-2.8dB à 400 Hz pour aérer les grosses nappes supersaw',
      airHz: '+3dB à 10 kHz pour donner le grain néon des productions cyberpunk',
      lufs: '-9.5 LUFS (Standard Podcast Dynamic & Video Impact)',
    },
    agentViralPreview: {
      dmPitch:
        "Hello ! Ton podcast/chaîne a une identité forte. J'ai conçu un intro drop surpuissant inspiré d'Indochine / The Prodigy en version Cyberpunk 2026. L'intro de 15s accroche instantanément tes auditeurs. Pack complet audio + licence exclusive : 350 $ CAD.",
      videoConcept:
        "Écran de veille vintage 1998 qui glitch et se transforme en dashboard holographique néon.",
      recommendedPrice: 350,
    },
  },
  {
    id: 'french-rnb-gold',
    name: 'French R&B Gold 2000s',
    artistRef: 'K-Maro (Femme Like U) / Alliance Ethnik (Simple & Funky)',
    originalEra: '1995 - 2004 (French R&B & G-Funk)',
    targetStyle: 'Chill Afro-Trap & Melodic Drill 112 BPM',
    bpm: 112,
    key: 'D Minor',
    targetAudience: 'Millennials & Gen Z R&B Lovers',
    defaultOffer: 'Offre C — L\'Audit & Masterisation Express (250 $ CAD)',
    chordNames: ['Dm7 (i)', 'Bbmaj7 (VI)', 'Fmaj7 (III)', 'C7 (VII)'],
    chords: [
      [146.83, 174.61, 220.00, 261.63], // Dm7 (D3, F3, A3, C4)
      [116.54, 146.83, 174.61, 220.00], // Bbmaj7 (Bb2, D3, F3, A3)
      [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
      [130.81, 164.81, 196.00, 233.08], // C7 (C3, E3, G3, Bb3)
    ],
    bassNotes: [36.71, 29.14, 43.65, 32.70], // D1, Bb0, F1, C1
    neuroHookTrigger:
      "La nostalgie douce et chaleureuse du R&B 2004 crée un attachement émotionnel immédiat, propice aux contenus intimes et esthétiques.",
    agentBeatPreview: {
      progression: 'Dm7 - Bbmaj7 - Fmaj7 - C7 (i - VI - III - VII)',
      bassType: 'Sub 808 chaleureux avec légère rondeur à 50 Hz',
      drumStyle: 'Hi-hats glissants en triolets et percussions afrobeats veloutées',
      stems: ['Rhodes R&B Chords', 'Warm 808', 'Triplet Hats', 'Acoustic Guitar Lick'],
    },
    agentVoicePreview: {
      lyrics: "Donne-moi ton cœur baby femme like you / Rien que toi et moi quand le jour s'échoue / Just you and me cruising down the coast / Ce souvenir d'été qui nous manque le plus",
      phonetics: "[dɔn mwa tɔ̃ kœʁ ˈbeɪbi fɑm laɪk ju]",
      flow: 'Chant feutré, ad-libs R&B harmonisés à la tierce avec delay stéréo',
    },
    agentSoundPreview: {
      subHz: 'High-pass 26 Hz, réhaussement généreux du bas-médium velouté',
      mudCut: 'Nettoyage ciblé à 350 Hz pour préserver la chaleur de la voix',
      airHz: 'Présence soyeuse à 12 kHz sans agressivité',
      lufs: '-11.5 LUFS (Warm Streaming Mix)',
    },
    agentViralPreview: {
      dmPitch:
        "Hello ! J'ai retravaillé le classique de K-Maro en version chill afro-trap mélodique, taillée sur mesure pour tes reels voyages & outfits. Master finalisé + autorisation : 250 $ CAD.",
      videoConcept: "Vlog esthétique slow-motion avec texte nostalgique et transition de coucher de soleil.",
      recommendedPrice: 250,
    },
  },
  {
    id: 'edm-anthem-uplift',
    name: 'EDM Anthem Euphoria',
    artistRef: 'Avicii (Levels) / Rihanna (We Found Love)',
    originalEra: '2011 - 2014 (Golden Festival Progressive)',
    targetStyle: 'Neo-Euphoria 128 BPM & Stutter Lead',
    bpm: 128,
    key: 'E Minor',
    targetAudience: 'Festivals, Fitness Creators & Brand Commercials',
    defaultOffer: 'Offre B — Le "VIP Artist Flip & Vocal Topline" (750 $ CAD)',
    chordNames: ['Em (i)', 'C (VI)', 'G (III)', 'D (VII)'],
    chords: [
      [164.81, 196.00, 246.94, 329.63], // Em (E3, G3, B3, E4)
      [130.81, 164.81, 196.00, 261.63], // C (C3, E3, G3, C4)
      [98.00, 123.47, 146.83, 196.00],  // G (G2, B2, D3, G3)
      [146.83, 185.00, 220.00, 293.66], // D (D3, F#3, A3, D4)
    ],
    bassNotes: [41.20, 32.70, 49.00, 36.71], // E1, C1, G1, D1
    neuroHookTrigger:
      "La progression euphorique de l'âge d'or du festival déclenche un frisson immédiat (goosebumps) et une envie irrépressible de sauter.",
    agentBeatPreview: {
      progression: 'Em - C - G - D (i - VI - III - VII)',
      bassType: 'Donk Bass percutante empilée sur un sub subsonique 45 Hz',
      drumStyle: 'Clap festival stadium 4x4, buildup snare roll et risers d’énergie',
      stems: ['Progressive Pluck', 'Stadium Kick', 'Supersaw Chords', 'White Noise Riser'],
    },
    agentVoicePreview: {
      lyrics: "We found the light in the deepest night / Des milliers de cœurs qui battent sous le même ciel / Never let it go, we take flight / Plus rien ne nous arrête, c'est irréel",
      phonetics: "[wi faʊnd ðə laɪt ɪn ðə ˈdiːpɪst naɪt]",
      flow: 'Topline hymne de festival portée par des harmonies à l’unisson et un chorus étendu',
    },
    agentSoundPreview: {
      subHz: 'High-pass 28 Hz avec sidechain compression féroce sur le master kick',
      mudCut: 'Coupure à 300 Hz pour laisser respirer la réverbe',
      airHz: '+3.5dB à 13 kHz pour le maximum de brillance',
      lufs: '-9.0 LUFS (Festival & TikTok Ready)',
    },
    agentViralPreview: {
      dmPitch:
        "Salut ! Ton compte a une énergie folle. J'ai flipé la mélodie mythique d'Avicii en version 2026 ultra-énergétique, pensée pour faire exploser tes stats d'engagement. Pack VIP complet (stems, topline, master broadcast) : 750 $ CAD.",
      videoConcept: "Compte à rebours 3-2-1 avant le drop avec caméra plongeante au milieu d'une foule en délire.",
      recommendedPrice: 750,
    },
  },
];
