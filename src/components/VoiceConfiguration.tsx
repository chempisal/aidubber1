import React, { useState } from "react";
import { AVAILABLE_VOICES } from "../data/samples";
import { Volume2, VolumeX, Speech, Play, Loader2, Music, Check, Settings2 } from "lucide-react";

interface VoiceConfigurationProps {
  selectedVoice: string;
  onVoiceChange: (voice: any) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  pitch: number;
  onPitchChange: (pitch: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export default function VoiceConfiguration({
  selectedVoice,
  onVoiceChange,
  speed,
  onSpeedChange,
  pitch,
  onPitchChange,
  volume,
  onVolumeChange,
}: VoiceConfigurationProps) {
  const [isPreviewing, setIsPreviewing] = useState<string | null>(null);

  const activeVoice = AVAILABLE_VOICES.find(v => v.voiceName === selectedVoice) || AVAILABLE_VOICES[0];

  const handlePreviewVoice = async (voice: typeof AVAILABLE_VOICES[number]) => {
    try {
      setIsPreviewing(voice.voiceName);
      
      const sampleText = `សួស្តី! ខ្ញុំជាសំឡេងសិប្បនិម្មិត ${voice.displayName}។ ខ្ញុំរីករាយណាស់ដែលបានមកជួយបកប្រែវីដេអូចិនជូនលោកអ្នក។`;
      
      const response = await fetch("/api/dub/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sampleText,
          voiceName: voice.voiceName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to synthesize preview");
      }

      const data = await response.json();
      if (data.success && data.audio) {
        const audioBytes = atob(data.audio);
        const arrayBuffer = new ArrayBuffer(audioBytes.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < audioBytes.length; i++) {
          uint8Array[i] = audioBytes.charCodeAt(i);
        }
        
        // Gemini TTS typically returns raw audio or wav. Play as Blob URL
        const blob = new Blob([arrayBuffer], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(blob);
        
        const audio = new Audio(audioUrl);
        audio.volume = volume;
        audio.playbackRate = speed;
        await audio.play();
        
        audio.onended = () => {
          setIsPreviewing(null);
          URL.revokeObjectURL(audioUrl);
        };
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error previewing voice:", error);
      setIsPreviewing(null);
      
      // Fallback: Browser Web Speech synthesis
      try {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance("សួស្តី! ខ្ញុំជាសំឡេងជំនួសរបស់កម្មវិធីរុករក។");
        utterance.lang = "km-KH";
        utterance.rate = speed;
        utterance.volume = volume;
        synth.speak(utterance);
      } catch (e) {
        console.error("Browser speech failed as well");
      }
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
        <Settings2 className="w-5 h-5 text-amber-500" />
        <h3 className="font-display text-lg tracking-wide text-slate-100 uppercase">
          ការកំណត់សំឡេងស្រែកឡើយ (Voice Config)
        </h3>
      </div>

      {/* Voice Selection Grid */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
          ជ្រើសរើសសំឡេង AI (Select Voice Actor)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AVAILABLE_VOICES.map((voice) => {
            const isSelected = voice.voiceName === selectedVoice;
            return (
              <button
                key={voice.voiceName}
                onClick={() => onVoiceChange(voice.voiceName)}
                className={`group relative text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`font-semibold text-sm ${isSelected ? "text-amber-400" : "text-slate-200"}`}>
                      {voice.displayName}
                    </h4>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 mt-1 inline-block">
                      {voice.gender === "female" ? "ស្រី (Female)" : "ប្រុស (Male)"}
                    </span>
                  </div>
                  
                  {/* Preview / Selection Marker */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewVoice(voice);
                      }}
                      disabled={isPreviewing !== null}
                      className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                        isSelected 
                          ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30" 
                          : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      }`}
                      title="ស្តាប់សម្លេងសាកល្បង (Test Voice)"
                    >
                      {isPreviewing === voice.voiceName ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {isSelected && (
                      <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-slate-950">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 line-clamp-1 group-hover:text-slate-300 transition-colors">
                  {voice.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Sliders */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        {/* Speed / Pace */}
        <div>
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Speech className="w-4 h-4 text-slate-400" />
              ល្បឿននិយាយ (Speech Speed)
            </span>
            <span className="font-mono bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">
              {speed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.8"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>យឺត (Slow)</span>
            <span>ធម្មតា (Normal)</span>
            <span>លឿន (Fast)</span>
          </div>
        </div>

        {/* Volume */}
        <div>
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              {volume === 0 ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-slate-400" />
              )}
              កម្រិតសំឡេង (Dubbing Volume)
            </span>
            <span className="font-mono bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>
    </div>
  );
}
