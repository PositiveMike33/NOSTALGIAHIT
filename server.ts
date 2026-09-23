import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/orchestrate', async (req, res) => {
  const {
    referenceTrack = 'Daft Punk - One More Time',
    targetStyle = 'Jersey Club / Nu-Disco 2026',
    bpm = 128,
    key = 'F Minor',
    targetAudience = '21-40 ans & TikTok Creators',
    offerType = 'Viral Nostalgia Audio Drop (350$ CAD)',
    notes = '',
  } = req.body;

  if (!ai) {
    return res.status(200).json({
      fallback: true,
      message: 'Using built-in autonomous algorithmic studio engine',
    });
  }

  try {
    const prompt = `
Tu es le Super-Orchestrateur du Studio Multi-Agentique NostalgiaHit (Hit-Record Producer, Lead DSP Audio Engineer & Growth Hacker).
Orchestre la production d'un remix/flip viral nostalgique en coordonnant 4 agents spécialisés :
- [ORCH-MAESTRO] : Direction artistique, analyse de la dopamine en 1.2s, tonalité et cohérence globale.
- [AGENT-BEAT] : Déconstruction harmonique (accords romains), basse 808/Moog, patterns de drums (kick stutter Jersey, afro-groove ou phonk), BPM.
- [AGENT-VOICE] : Écriture de la topline vocale inédite (paroles bilingues percutantes français/anglais), guide phonétique, cadence d'accroche (earworm).
- [AGENT-SOUND] : Chaîne de mastering psycho-acoustique (fréquences chirurgicales sous 30Hz, 250-400Hz, 10-14kHz, compression, LUFS cible).
- [AGENT-VIRAL] : Script de cold DM Instagram/TikTok personnalisé, storyboard vidéo de transition (before/after), quittance de droits et tarification Fast Cash 1 000$ CAD.

Paramètres de session :
- Référence Nostalgique : ${referenceTrack}
- Style Cible Moderne : ${targetStyle}
- BPM : ${bpm}
- Tonalité : ${key}
- Cible : ${targetAudience}
- Offre : ${offerType}
- Notes spécifiques : ${notes}

Réponds STRICTEMENT avec un objet JSON valide suivant exactement cette structure :
{
  "sessionTitle": "Titre percutant du flip (ex: One More Time - Jersey Touch 2026)",
  "vibeDescription": "Courte description de l'ambiance et du levier émotionnel",
  "orchMaestro": {
    "key": "${key}",
    "bpm": ${bpm},
    "neuroHookTrigger": "Explication de pourquoi le cerveau reconnaît le gimmick en 1.2 seconde",
    "artisticVerdict": "Verdict du Maestro sur l'impact en club et streaming",
    "status": "APPROVED"
  },
  "agentBeat": {
    "chordProgression": "ex: Fm - Db - Ab - Eb (i - VI - III - VII)",
    "basslineArchitecture": "Détails de la sous-basse 808 glide et du synthé Moog analogique",
    "drumPattern": "Description du pattern rythmique (ex: Kick stutter Jersey sur temps 2&4)",
    "instrumentLayers": ["808 Sub-Bass", "Analog Juno 106 Pad", "French Filtered Guitar Gimmick", "Jersey Club Kick & Bed Squeak", "Crisp Tape Hats"],
    "status": "COMPLETED"
  },
  "agentVoice": {
    "earwormChorus": "Refrain court et hypnotique (bilingue FR/EN)",
    "phoneticGuide": "Guide phonétique de prononciation pour maximiser le punch sonore",
    "vocalDeliveryStyle": "Style d'interprétation conseillé (ex: Autotune suave pitched-down façon The Weeknd / Stromae)",
    "flowBpmFit": "Analyse du placement rythmique sur le BPM ${bpm}",
    "status": "COMPLETED"
  },
  "agentSound": {
    "subBassHz": "High-pass coupe-bas sous 28 Hz pour libérer le headroom",
    "mudCutHz": "Atténuation chirurgicale -2.8dB à 320 Hz pour clarifier le bas-médium",
    "airBoostHz": "High-shelf soyeux +2.2dB à 12.5 kHz pour la brillance moderne",
    "targetLufs": "-9.2 LUFS (Club & TikTok Ready) / -14 LUFS (Spotify Standard)",
    "masterChain": ["FabFilter Pro-Q3 Linear Phase", "SSL G-Master Bus Compressor 4:1", "Soothe2 Resonance Tamer", "Ozone Maximizer IRC IV"],
    "status": "MASTERED"
  },
  "agentViral": {
    "coldDmScript": "Script complet de cold DM prêt à envoyer à un influenceur ou artiste",
    "tiktokVideoConcept": "Concept de vidéo TikTok / Reel avec la transition nostalgique avant/après",
    "fastCashPricing": "${offerType}",
    "rightsQuittance": "Quittance légale simplifiée confirmant l'exclusivité et la conformité libre de droits",
    "status": "READY_TO_PITCH"
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const jsonText = response.text?.trim() || '{}';
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini Orchestration error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate orchestration',
      fallback: true,
    });
  }
});

app.post('/api/lyrics/generate', async (req, res) => {
  const {
    referenceTrack = 'Daft Punk - One More Time',
    targetStyle = 'Jersey Club / Nu-Disco 2026',
    bpm = 124,
    key = 'F Minor',
    vibe = 'Nostalgie Électrique & Euphorie Club',
    slangProfile = 'Millennials 21-40 & Gen Z Viral',
  } = req.body;

  if (!ai) {
    return res.status(200).json({
      fallback: true,
      message: 'Using built-in autonomous bilingual lyric engine',
    });
  }

  try {
    const prompt = `
Tu es [AGENT-VOICE], le Topliner Vocal Élite & Parolier Bilingue Français-Anglais du Studio NostalgiaHit.
Ta mission est d'écrire des paroles bilingues percutantes (French & English seamless blending) pour un flip nostalgique viral.
Le morceau s'inspire de la nostalgie 1995-2015 (${referenceTrack}), avec un traitement ultra-moderne 2026 (${targetStyle}) à ${bpm} BPM en tonalité ${key}.
Public cible : 21-40 ans (nostalgie doudou, souvenirs clubs 2000s, Walkman/iPod, début de la French Touch) et Gen Z (TikTok, slang percutant, viral hooks, rétention maximale).

Consignes strictes :
- Alterne naturellement l'anglais et le français au sein des phrases (code-switching fluide façon Stromae, The Weeknd, Christine & the Queens, Daft Punk).
- Utilise des images fortes : néon, club à 3h du matin, dopamine rush, scrolling infini, delulu vibe, nostalgie Y2K, flashs analogiques.
- Calibre la métrique syllabique sur le tempo ${bpm} BPM (phrases courtes, punchy, percussives).

Réponds STRICTEMENT sous forme de JSON valide :
{
  "songTitle": "Titre bilingue percutant",
  "vibeStory": "Histoire émotionnelle derrière les paroles",
  "verse": [
    { "line": "Texte de la ligne en anglais ou français", "lang": "FR|EN", "syllables": 8, "rhythmFeel": "Staccato sur le temps" }
  ],
  "preChorus": [
    { "line": "Ligne de montée d'énergie", "lang": "FR|EN", "syllables": 7 }
  ],
  "chorus": [
    { "line": "Refrain earworm explosif", "lang": "FR|EN", "syllables": 8, "earwormFactor": "High" }
  ],
  "hookChopAdlibs": ["One more night...", "Déjà minuit...", "Don't let it slip..."],
  "phoneticGuide": "Guide phonétique de prononciation pour le chant",
  "culturalNostalgiaTriggers": ["iPod Classic / Minidisc", "Daft Punk Alive 2007", "French Touch filtered sweep", "Gen Z TikTok loop"]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Lyrics generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate lyrics', fallback: true });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NostalgiaHit Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
