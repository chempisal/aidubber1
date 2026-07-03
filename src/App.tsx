import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import SampleSelection from "./components/SampleSelection";
import VideoPreviewPlayer from "./components/VideoPreviewPlayer";
import VoiceConfiguration from "./components/VoiceConfiguration";
import DubbingTimeline from "./components/DubbingTimeline";
import { SAMPLE_VIDEOS } from "./data/samples";
import { DubSegment, SampleVideo } from "./types";
import { 
  Sparkles, AudioLines, AlertCircle, Info, CheckCircle, 
  Settings, Layers, Music, Film, User, Cpu, FileVideo 
} from "lucide-react";

export default function App() {
  // Current active video source & state
  const [selectedVideo, setSelectedVideo] = useState<SampleVideo>(SAMPLE_VIDEOS[0]);
  const [videoUrl, setVideoUrl] = useState<string>(SAMPLE_VIDEOS[0].videoUrl);
  
  // Custom uploaded file state
  const [customFileBase64, setCustomFileBase64] = useState<string>("");
  const [customFileMimeType, setCustomFileMimeType] = useState<string>("");
  const [customFilename, setCustomFilename] = useState<string>("");

  // Timeline segments state
  const [segments, setSegments] = useState<DubSegment[]>(SAMPLE_VIDEOS[0].prebuiltSegments);

  // Voice configurations state
  const [voiceName, setVoiceName] = useState<any>("Kore");
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.9);

  // Playback/Timeline syncing states
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [useDubbing, setUseDubbing] = useState<boolean>(true);

  // Loading/Processing states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSynthesizingAll, setIsSynthesizingAll] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keep a mutable ref to always access the latest segments inside asynchronous loops/callbacks
  const segmentsRef = React.useRef<DubSegment[]>(segments);
  React.useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // Auto-synthesize initial segments on app load
  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleSynthesizeAll(SAMPLE_VIDEOS[0].prebuiltSegments);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Hook up video reload whenever sample selection shifts
  const handleSelectSample = (video: SampleVideo) => {
    setSelectedVideo(video);
    setVideoUrl(video.videoUrl);
    const copiedSegments = JSON.parse(JSON.stringify(video.prebuiltSegments));
    setSegments(copiedSegments);
    setCustomFileBase64("");
    setCustomFileMimeType("");
    setCustomFilename("");
    setCurrentTime(0);
    setErrorMessage(null);
    setStatusMessage(null);

    // Auto-synthesize the prebuilt segments for immediate 100% voice experience
    setTimeout(() => {
      handleSynthesizeAll(copiedSegments);
    }, 300);
  };

  // Helper handler for changing voices to clear old audio and trigger automatic synthesis
  const handleVoiceChange = (newVoice: string) => {
    setVoiceName(newVoice);
    setSegments(prev => {
      const cleared = prev.map(s => ({ ...s, audioUrl: undefined, error: undefined }));
      setTimeout(() => {
        handleSynthesizeAll(cleared, newVoice);
      }, 200);
      return cleared;
    });
  };

  // Hook up custom video upload
  const handleCustomVideoLoaded = (
    url: string, 
    base64Data: string, 
    mimeType: string, 
    filename: string
  ) => {
    setVideoUrl(url);
    setCustomFileBase64(base64Data);
    setCustomFileMimeType(mimeType);
    setCustomFilename(filename);
    
    // Clear segments since it's a new video - wait for user to click AI transcribe
    setSegments([]);
    setCurrentTime(0);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  // Convert Base64 payload back to browser Blob URL for Audio tags
  const convertBase64ToBlobUrl = (base64: string, mimeType = "audio/wav") => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Base64 decoding failed:", e);
      return "";
    }
  };

  // Trigger TTS synthesis for a single timeline segment
  const handleSynthesizeSegment = async (id: number, activeVoiceName?: string) => {
    const currentSegments = segmentsRef.current;
    const segmentIndex = currentSegments.findIndex(s => s.id === id);
    if (segmentIndex === -1) return;

    // Use current voiceName if no specific voiceName is passed
    const targetVoice = activeVoiceName || voiceName;

    // Update segment state to indicate active loading via functional state to prevent overwriting
    setSegments(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(s => s.id === id);
      if (idx !== -1) {
        copy[idx] = {
          ...copy[idx],
          isSynthesizing: true,
          error: undefined
        };
      }
      return copy;
    });
    setErrorMessage(null);

    try {
      const segment = currentSegments[segmentIndex];
      const response = await fetch("/api/dub/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: segment.khmer,
          voiceName: targetVoice
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.audio) {
        const audioBlobUrl = convertBase64ToBlobUrl(data.audio);
        
        setSegments(prev => prev.map(s => {
          if (s.id === id) {
            return {
              ...s,
              audioUrl: audioBlobUrl,
              isSynthesizing: false
            };
          }
          return s;
        }));
      } else {
        throw new Error(data.error || "Failed to parse synthesized audio");
      }
    } catch (error: any) {
      console.error(`Error synthesizing segment ${id}:`, error);
      setSegments(prev => prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            isSynthesizing: false,
            error: error.message || "Synthesis failed"
          };
        }
        return s;
      }));
      setErrorMessage(`ការសំយោគសំឡេងសម្រាប់ផ្នែកទី ${id} បានបរាជ័យ៖ ` + (error.message || "Unknown error"));
    }
  };

  // Synthesize all segments in sequence (Batch dubbing)
  const handleSynthesizeAll = async (targetSegments?: DubSegment[], activeVoiceName?: string) => {
    const listToSynthesize = targetSegments || segmentsRef.current;
    if (listToSynthesize.length === 0) return;

    setIsSynthesizingAll(true);
    setStatusMessage("កំពុងចាប់ផ្តើមសំយោគសំឡេងទាំងអស់គ្នាជាបន្តបន្ទាប់... (Synthesizing entire timeline)");
    setErrorMessage(null);

    try {
      // Loop sequentially to avoid overloading model parallel rates and preserve state order
      for (const seg of listToSynthesize) {
        setStatusMessage(`កំពុងសំយោគសំឡេងសម្រាប់ផ្នែក៖ ${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s...`);
        await handleSynthesizeSegment(seg.id, activeVoiceName);
      }
      setStatusMessage("អបអរសាទរ! សំឡេងខ្មែរទាំងអស់ត្រូវបានសំយោគ និងផ្គូផ្គងជាមួយបន្ទាត់ម៉ោងរួចរាល់។ (Dubbing complete!)");
    } catch (err: any) {
      console.error("Batch synthesis aborted:", err);
      setErrorMessage("ការសំយោគជាក្រុមត្រូវបានអាក់ខាន៖ " + err.message);
    } finally {
      setIsSynthesizingAll(false);
      setTimeout(() => setStatusMessage(null), 8000);
    }
  };

  // Generate automated translation timeline from uploaded Chinese video via Gemini
  const handleGenerateTimelineFromMedia = async () => {
    if (!customFileBase64) {
      setErrorMessage("សូមបង្ហោះអូឌីយ៉ូ ឬវីដេអូចិនជាមុនសិន។ Please upload a media file first.");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("AI កំពុងស្កែនសំឡេងចិន បកប្រែ និងកំណត់ម៉ោង... (Gemini processing media - usually takes 10-15s)");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dub/transcribe-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioData: customFileBase64,
          mimeType: customFileMimeType,
          prompt: "Please transcribe this Chinese audio file, translate it into natural spoken Khmer language, and generate highly accurate start and end segment timestamps in seconds. Ensure output strictly follows the JSON format requirements."
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.segments)) {
        // Map the parsed segments into our state
        const mappedSegments: DubSegment[] = data.segments.map((seg: any, idx: number) => ({
          id: seg.id || (idx + 1),
          start: typeof seg.start === "number" ? seg.start : parseFloat(seg.start) || 0,
          end: typeof seg.end === "number" ? seg.end : parseFloat(seg.end) || 0,
          chinese: seg.chinese || "",
          khmer: seg.khmer || "",
          emotion: seg.emotion || "calm"
        }));

        setSegments(mappedSegments);
        setStatusMessage(`ជោគជ័យ! រកឃើញ ${mappedSegments.length} ផ្នែកសំឡេង។ AI កំពុងចាប់ផ្តើមសំយោគសម្លេងខ្មែរទាំងអស់ដោយស្វ័យប្រវត្ត...`);
        
        // Auto-trigger the TTS synthesis for these custom video segments!
        setTimeout(() => {
          handleSynthesizeAll(mappedSegments);
        }, 300);
      } else {
        throw new Error(data.error || "Invalid response format from translation backend");
      }
    } catch (error: any) {
      console.error("Failed to generate AI timeline:", error);
      setErrorMessage("ការវិភាគវីដេអូដោយ AI បានបរាជ័យ៖ " + (error.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Segment Management
  const handleUpdateSegment = (id: number, updated: Partial<DubSegment>) => {
    setSegments(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, ...updated };
      }
      return s;
    }));
  };

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1];
    const newStart = lastSeg ? lastSeg.end + 0.5 : 0;
    const newEnd = newStart + 3.0;

    const newSegment: DubSegment = {
      id: Date.now(), // safe unique ID
      start: newStart,
      end: newEnd,
      chinese: "请输入中文转录 text here",
      khmer: "សូមបញ្ចូលអត្ថបទបកប្រែជាភាសាខ្មែរនៅទីនេះ",
      emotion: "calm"
    };

    setSegments([...segments, newSegment]);
  };

  const handleRemoveSegment = (id: number) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  };

  // Seeks player to segment timing and loops playback
  const handlePlaySegmentInVideo = (start: number, end: number) => {
    const video = document.querySelector("video");
    if (video) {
      video.currentTime = start;
      video.play().catch(e => {});
      setCurrentTime(start);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Universal Header */}
      <Header />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Video selection and Custom Player (Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Custom Dynamic Video Player HUD */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-amber-500" />
                ផ្ទាំងចាក់វីដេអូសាកល្បង (Video Preview Player)
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>
                  {customFilename ? `លក្ខណៈផ្ទាល់ខ្លួន: ${customFilename}` : `វីដេអូគំរូ: ${selectedVideo.titleKhmer}`}
                </span>
              </div>
            </div>
            
            <VideoPreviewPlayer
              videoUrl={videoUrl}
              segments={segments}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              dubVolume={volume}
              useDubbing={useDubbing}
              onUseDubbingToggle={setUseDubbing}
            />
          </section>

          {/* Video Selector Panel (Uploads, Presets, Links) */}
          <section>
            <SampleSelection
              selectedVideoId={selectedVideo.id}
              onSelectSample={handleSelectSample}
              onCustomVideoLoaded={handleCustomVideoLoaded}
              isProcessing={isProcessing}
            />
          </section>

          {/* Quick tips & info card */}
          <section className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-400">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-slate-300">ព័ត៌មានបច្ចេកទេសសំខាន់ៗ (Ducking Technology):</span>
              <p>
                ប្រព័ន្ធបញ្ចូលសំឡេងស្វ័យប្រវត្តិនេះដំណើរការដោយក្បួនដោះស្រាយ <span className="text-amber-400 font-semibold">Audio Ducking</span> ពិសេស។ រាល់ពេលដែលតួអង្គចិននិយាយ សំឡេងផ្ទៃក្រោយរបស់វីដេអូចិនដើមនឹងត្រូវបានបន្ទាបចុះដោយស្វ័យប្រវត្តិចំនួន <span className="text-slate-200">៨៥%</span> ដើម្បីទុកឱកាសឱ្យសំឡេងស្មារតីសិប្បនិម្មិត (AI Khmer Voice) បន្លឺឡើងយ៉ាងច្បាស់។
              </p>
            </div>
          </section>
        </div>

        {/* Right Side: Configuration and Timeline Management (Span 5) */}
        <div className="lg:col-span-5 space-y-6 h-full flex flex-col">
          
          {/* Feedback Messages */}
          {statusMessage && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl flex items-start gap-2.5 text-xs animate-fade-in shadow-lg">
              <Sparkles className="w-4.5 h-4.5 shrink-0 text-amber-400 animate-spin" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2.5 text-xs animate-fade-in shadow-lg">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Voice configuration parameters */}
          <section>
            <VoiceConfiguration
              selectedVoice={voiceName}
              onVoiceChange={handleVoiceChange}
              speed={speed}
              onSpeedChange={setSpeed}
              pitch={pitch}
              onPitchChange={setPitch}
              volume={volume}
              onVolumeChange={setVolume}
            />
          </section>

          {/* Timeline and Segment Synthesis Controls */}
          <section className="flex-1 flex flex-col">
            <DubbingTimeline
              segments={segments}
              onUpdateSegment={handleUpdateSegment}
              onAddSegment={handleAddSegment}
              onRemoveSegment={handleRemoveSegment}
              onPlaySegmentInVideo={handlePlaySegmentInVideo}
              onSynthesizeSegment={handleSynthesizeSegment}
              onSynthesizeAll={handleSynthesizeAll}
              isProcessing={isProcessing}
              isSynthesizingAll={isSynthesizingAll}
              onGenerateTimelineFromMedia={handleGenerateTimelineFromMedia}
              hasMediaToProcess={!!customFileBase64}
              customFilename={customFilename}
            />
          </section>

        </div>
      </main>
    </div>
  );
}
