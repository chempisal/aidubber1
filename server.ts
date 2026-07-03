import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Set up large payload limits for handling base64 audio/video uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize GoogleGenAI SDK with server-side API Key and User-Agent
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY is not defined in the environment. AI features may fail.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AI Video Dubber Server is running." });
});

/**
 * API: /api/dub/transcribe-translate
 * Transcribes Chinese speech from the video/audio and translates it to Khmer segments with timing.
 */
app.post("/api/dub/transcribe-translate", async (req, res) => {
  try {
    const { audioData, mimeType, prompt } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: "Missing audioData" });
    }

    const systemInstruction = `You are an expert AI video dubbing translator specializing in translating Chinese spoken media to natural Khmer audio segments.
Your task is to analyze the uploaded media (audio/video), transcribe the spoken Chinese segments, and translate them to natural, engaging Khmer speech.
For each spoken segment, output a structured JSON array containing:
- id: sequence number starting from 1
- start: start time of the segment in seconds (decimal number, e.g. 1.5)
- end: end time of the segment in seconds (decimal number, e.g. 4.2)
- chinese: exact Chinese transcription of what was said
- khmer: high-quality Khmer translation that matches the tone, context, and length of the segment (ensure it can be naturally spoken within the duration of the segment)
- emotion: suggested tone or emotion (e.g., 'cheerful', 'serious', 'calm', 'excited', 'sad')

Ensure the JSON is correctly formatted. Do not include any markdown backticks or explanation text outside the JSON. Return only a valid JSON array.`;

    const userPrompt = prompt || "Transcribe and translate this Chinese video audio to Khmer segments with exact timestamps.";

    const contentPart = {
      inlineData: {
        mimeType: mimeType || "audio/mp3",
        data: audioData
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        contentPart,
        { text: userPrompt }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    // Clean response text just in case (though responseMimeType: "application/json" is set)
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.substring(7);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    cleanedText = cleanedText.trim();

    const segments = JSON.parse(cleanedText);
    res.json({ success: true, segments });
  } catch (error: any) {
    console.error("Error transcribing and translating:", error);
    res.status(500).json({ error: error.message || "Failed to process audio" });
  }
});

/**
 * API: /api/dub/tts
 * Synthesizes Khmer text using Gemini 3.1 TTS model.
 */
app.post("/api/dub/tts", async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    // Default voice is Kore, other voices include Puck, Charon, Fenrir, Zephyr
    const selectedVoice = voiceName || "Kore";

    // Call Gemini Text-To-Speech
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Failed to generate speech with Gemini TTS");
    }

    res.json({ success: true, audio: base64Audio });
  } catch (error: any) {
    console.error("Error generating speech:", error);
    res.status(500).json({ error: error.message || "Failed to generate speech" });
  }
});

// Setup Vite Dev server middleware or serve production client bundle
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite integration.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode.");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
