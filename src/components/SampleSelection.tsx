import React, { useState, useRef } from "react";
import { SAMPLE_VIDEOS } from "../data/samples";
import { SampleVideo } from "../types";
import { Upload, Link, Film, Play, Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";

interface SampleSelectionProps {
  selectedVideoId: string;
  onSelectSample: (video: SampleVideo) => void;
  onCustomVideoLoaded: (url: string, base64Data: string, mimeType: string, filename: string) => void;
  isProcessing: boolean;
}

export default function SampleSelection({
  selectedVideoId,
  onSelectSample,
  onCustomVideoLoaded,
  isProcessing,
}: SampleSelectionProps) {
  const [activeTab, setActiveTab] = useState<"preset" | "upload" | "link">("preset");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectSampleVideo = (video: SampleVideo) => {
    onSelectSample(video);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    // Validate file size (max 25MB to prevent memory/payload limits)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("ទំហំឯកសារធំពេក (អតិបរមា 25MB)។ File size must be under 25MB.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        if (!result) throw new Error("Failed to read file");

        // Extract base64 and mimeType
        const commaIndex = result.indexOf(",");
        const base64Data = result.substring(commaIndex + 1);
        const mimeType = file.type || "video/mp4";

        // Create local object URL for instant, smooth video tag playback
        const objectUrl = URL.createObjectURL(file);
        
        onCustomVideoLoaded(objectUrl, base64Data, mimeType, file.name);
        setIsUploading(false);
      } catch (err: any) {
        setUploadError("មានបញ្ហាក្នុងការអានឯកសារ៖ " + err.message);
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setUploadError("មានបញ្ហាក្នុងការបង្ហោះឯកសារ។");
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleLoadUrl = () => {
    if (!videoUrlInput) return;
    setUploadError(null);
    
    // Check if it's a valid looking URL
    if (!videoUrlInput.startsWith("http://") && !videoUrlInput.startsWith("https://")) {
      setUploadError("សូមបញ្ចូលអាសយដ្ឋាន URL ត្រឹមត្រូវ (http:// ឬ https://)។");
      return;
    }

    // Pass URL directly. Since we don't have base64 audio extracted yet, 
    // the user will be able to transcribe it using prompt instructions or simulated mode,
    // but preset samples remain the ideal 100% stable pipeline.
    onCustomVideoLoaded(videoUrlInput, "", "video/mp4", "Web Video Link");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-800 mb-5">
        <button
          onClick={() => setActiveTab("preset")}
          className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "preset"
              ? "border-amber-500 text-amber-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Film className="w-4 h-4" />
          <span>វីដេអូចិនគំរូ (Preset Samples)</span>
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "upload"
              ? "border-amber-500 text-amber-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>បង្ហោះវីដេអូផ្ទាល់ខ្លួន (Upload Video)</span>
        </button>
        <button
          onClick={() => setActiveTab("link")}
          className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "link"
              ? "border-amber-500 text-amber-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Link className="w-4 h-4" />
          <span>ភ្ជាប់លីងវីដេអូ (Video Link)</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "preset" && (
        <div className="space-y-3.5">
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            ជ្រើសរើសវីដេអូចិនគំរូខាងក្រោម ដើម្បីធ្វើការសាកល្បងសំយោគសម្លេងខ្មែរភ្លាមៗ (Preset timelines pre-configured):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_VIDEOS.map((video) => {
              const isSelected = video.id === selectedVideoId;
              return (
                <button
                  key={video.id}
                  onClick={() => handleSelectSampleVideo(video)}
                  disabled={isProcessing}
                  className={`group text-left rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/20"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video w-full bg-slate-900 relative overflow-hidden">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-2 bg-amber-500 text-slate-950 rounded-full">
                        <Play className="w-4 h-4 fill-slate-950 stroke-[3]" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">
                      {video.duration}
                    </span>
                    <span className="absolute top-2 left-2 bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider">
                      {video.category}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h4 className={`font-semibold text-xs leading-snug line-clamp-1 ${isSelected ? "text-amber-400" : "text-slate-200"}`}>
                      {video.titleKhmer}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {video.descriptionKhmer}
                    </p>
                    <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {video.prebuiltSegments.length} segments
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" /> កំពុងជ្រើសរើស
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900/40 rounded-xl p-8 text-center cursor-pointer transition-all duration-200"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="video/*,audio/*"
              className="hidden"
            />
            {isUploading ? (
              <div className="space-y-3">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-300">កំពុងបង្ហោះ និងអានឯកសារ...</p>
                <p className="text-xs text-slate-500">សូមរង់ចាំបន្តិច ឯកសារកំពុងបំលែងជាទម្រង់ឌីជីថល</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-900 rounded-full w-fit mx-auto text-slate-400 group-hover:text-amber-400 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">
                  អូស ឬ ចុចដើម្បីបង្ហោះវីដេអូ ឬអូឌីយ៉ូចិន (Upload File)
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  គាំទ្រទម្រង់វីដេអូ MP4, WebM ឬ អូឌីយ៉ូ MP3, WAV (ទំហំអតិបរមា 25MB)។ AI នឹងទាញយកសំឡេងដើម្បីបកប្រែ។
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "link" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            ប្រសិនបើអ្នកមានលីងវីដេអូចិនដែលផ្ទុកនៅលើអ៊ីនធឺណិត (Direct MP4, Cloud Storage ល) អ្នកអាចបិទភ្ជាប់វានៅទីនេះ៖
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/chinese_video.mp4"
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/60 font-mono"
            />
            <button
              onClick={handleLoadUrl}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs cursor-pointer transition-colors"
            >
              ទាញយក (Load)
            </button>
          </div>
        </div>
      )}

      {/* Error & Success Messages */}
      {uploadError && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-xs">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
