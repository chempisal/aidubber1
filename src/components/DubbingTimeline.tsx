import React, { useState } from "react";
import { DubSegment } from "../types";
import { 
  Sparkles, AudioLines, Play, Pause, Plus, Trash2, Edit2, Check, 
  Loader2, RefreshCw, Volume2, Save, HelpCircle, Eye 
} from "lucide-react";

interface DubbingTimelineProps {
  segments: DubSegment[];
  onUpdateSegment: (id: number, updated: Partial<DubSegment>) => void;
  onAddSegment: () => void;
  onRemoveSegment: (id: number) => void;
  onPlaySegmentInVideo: (start: number, end: number) => void;
  onSynthesizeSegment: (id: number) => Promise<void>;
  onSynthesizeAll: () => Promise<void>;
  isProcessing: boolean;
  isSynthesizingAll: boolean;
  onGenerateTimelineFromMedia: () => void;
  hasMediaToProcess: boolean;
  customFilename?: string;
}

export default function DubbingTimeline({
  segments,
  onUpdateSegment,
  onAddSegment,
  onRemoveSegment,
  onPlaySegmentInVideo,
  onSynthesizeSegment,
  onSynthesizeAll,
  isProcessing,
  isSynthesizingAll,
  onGenerateTimelineFromMedia,
  hasMediaToProcess,
  customFilename,
}: DubbingTimelineProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editKhmerText, setEditKhmerText] = useState("");
  const [editChineseText, setEditChineseText] = useState("");
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);
  
  // Quick play local audio preview
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);

  const startEditing = (seg: DubSegment) => {
    setEditingId(seg.id);
    setEditKhmerText(seg.khmer);
    setEditChineseText(seg.chinese);
    setEditStart(seg.start);
    setEditEnd(seg.end);
  };

  const saveEditing = (id: number) => {
    onUpdateSegment(id, {
      khmer: editKhmerText,
      chinese: editChineseText,
      start: editStart,
      end: editEnd,
      // Clear audio on edit so they know they need to re-synthesize!
      audioUrl: undefined, 
    });
    setEditingId(null);
  };

  const playLocalAudio = (seg: DubSegment) => {
    if (!seg.audioUrl) return;
    
    if (playingAudioId === seg.id) {
      setPlayingAudioId(null);
      return;
    }

    const audio = new Audio(seg.audioUrl);
    setPlayingAudioId(seg.id);
    audio.play().catch(e => console.error(e));
    
    audio.onended = () => {
      setPlayingAudioId(null);
    };
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion?.toLowerCase()) {
      case "cheerful": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "excited": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "calm": return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "serious": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      case "sad": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default: return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const getEmotionEmoji = (emotion: string) => {
    switch (emotion?.toLowerCase()) {
      case "cheerful": return "😌 សប្បាយ";
      case "excited": return "🔥 ស្វាហាប់";
      case "calm": return "🍃 ស្រទន់";
      case "serious": return "🎭 ម៉ឺងម៉ាត់";
      case "sad": return "😢 ក្រៀមក្រំ";
      default: return "🗣️ ធម្មតា";
    }
  };

  // Calculate synthesis progress
  const synthesizedCount = segments.filter(s => !!s.audioUrl).length;
  const totalCount = segments.length;
  const progressPercent = totalCount > 0 ? Math.round((synthesizedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <AudioLines className="w-5 h-5 text-amber-500" />
            <h3 className="font-display text-lg tracking-wide text-slate-100 uppercase">
              បន្ទាត់ម៉ោងបកប្រែ (Translation Timeline)
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            គ្រប់គ្រងអត្ថបទ បញ្ចូលម៉ោង និងសំយោគសម្លេងខ្មែរសម្រាប់ផ្នែកនីមួយៗ
          </p>
        </div>

        {/* Generate Timeline for Uploaded Custom Videos */}
        {hasMediaToProcess && (
          <button
            onClick={onGenerateTimelineFromMedia}
            disabled={isProcessing}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer hover:shadow-lg hover:shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shrink-0"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>បកប្រែដោយស្វ័យប្រវត្តិតាម AI</span>
          </button>
        )}
      </div>

      {/* Progress & Batch Controls */}
      {totalCount > 0 && (
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <span>វឌ្ឍនភាពសំយោគសម្លេង (Synthesis Progress)</span>
                <span className="font-mono bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">
                  {synthesizedCount}/{totalCount} segments
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {synthesizedCount === totalCount 
                  ? "រួចរាល់! វីដេអូរបស់អ្នកត្រូវបានបញ្ចូលសម្លេងខ្មែរ ១០០%។" 
                  : "ចុចប៊ូតុងខាងស្តាំដើម្បីសំយោគសំឡេងទាំងអស់គ្នាដោយស្វ័យប្រវត្តិ។"}
              </p>
            </div>

            <button
              onClick={onSynthesizeAll}
              disabled={isSynthesizingAll || totalCount === 0}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 text-slate-200 font-semibold text-xs rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1.5 self-end sm:self-auto"
            >
              {isSynthesizingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>សំយោគសម្លេងទាំងអស់ (Dub All)</span>
            </button>
          </div>

          {/* Master Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Timeline List Scroll Area */}
      <div className="flex-1 overflow-y-auto max-h-[480px] space-y-3 pr-1.5 custom-scrollbar min-h-[250px]">
        {segments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-950/40 border border-slate-800/80 border-dashed rounded-xl">
            <AudioLines className="w-10 h-10 text-slate-600 mb-2.5 stroke-[1.5]" />
            {customFilename ? (
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-slate-300">
                  បានបង្ហោះរួចរាល់៖ {customFilename}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  ចុចប៊ូតុង <span className="text-amber-400 font-semibold">"បកប្រែដោយស្វ័យប្រវត្តិតាម AI"</span> ខាងលើ ដើម្បីអនុញ្ញាតឱ្យ Gemini វិភាគ និងបង្កើតបន្ទាត់ម៉ោងស្វ័យប្រវត្តិ។
                </p>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-semibold text-slate-300">មិនទាន់មានបន្ទាត់ម៉ោងនៅឡើយទេ</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
                  សូមជ្រើសរើសវីដេអូចិនគំរូ ឬបង្ហោះវីដេអូ ដើម្បីបង្កើតបន្ទាត់ម៉ោងបកប្រែ។
                </p>
              </div>
            )}
          </div>
        ) : (
          segments.map((seg, idx) => {
            const isEditing = editingId === seg.id;
            return (
              <div 
                key={seg.id}
                className={`relative p-3.5 rounded-xl border transition-all duration-200 ${
                  seg.audioUrl 
                    ? "bg-slate-950/60 border-slate-800 hover:border-slate-800" 
                    : "bg-slate-950/20 border-slate-800/40 hover:border-slate-700"
                }`}
              >
                {/* Segment Meta Info Header */}
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-800 rounded text-center text-[10px] font-mono font-bold text-slate-400 flex items-center justify-center border border-slate-700/60">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-mono font-semibold text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                      {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({(seg.end - seg.start).toFixed(1)}s duration)
                    </span>
                  </div>

                  {/* Emotion Tag & Controls */}
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getEmotionColor(seg.emotion)}`}>
                      {getEmotionEmoji(seg.emotion)}
                    </span>
                    
                    {/* Trash */}
                    <button
                      onClick={() => onRemoveSegment(seg.id)}
                      className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                      title="លុបបន្ទាត់ម៉ោងនេះ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content Block */}
                {isEditing ? (
                  <div className="space-y-3 p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                      <div>
                        <label className="block mb-1">Start Time (s):</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={editStart} 
                          onChange={(e) => setEditStart(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block mb-1">End Time (s):</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={editEnd} 
                          onChange={(e) => setEditEnd(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1 font-semibold">អត្ថបទចិន (Chinese Transcription):</label>
                      <input
                        type="text"
                        value={editChineseText}
                        onChange={(e) => setEditChineseText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-sans focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1 font-semibold">ប្រែជាខ្មែរ (Khmer Dub Translation):</label>
                      <textarea
                        rows={2}
                        value={editKhmerText}
                        onChange={(e) => setEditKhmerText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-sans focus:outline-none leading-relaxed"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1.5 bg-slate-800 text-slate-400 rounded text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEditing(seg.id)}
                        className="px-2.5 py-1.5 bg-amber-500 text-slate-950 font-bold rounded text-[11px] cursor-pointer flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {/* Chinese Source Text */}
                    <p className="text-xs text-slate-400 font-sans italic">
                      CN: {seg.chinese}
                    </p>
                    {/* Khmer Translated Text */}
                    <div className="flex items-start justify-between gap-4 bg-slate-950/40 p-2 rounded-lg border border-slate-800/30">
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        KH: <span className="text-slate-100">{seg.khmer}</span>
                      </p>
                      
                      {/* Inline edit button */}
                      <button
                        onClick={() => startEditing(seg)}
                        className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="កែសម្រួលអត្ថបទបកប្រែ"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Segment Action Hub */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900 mt-2">
                      <div className="flex items-center gap-1.5">
                        {/* Play original timing */}
                        <button
                          onClick={() => onPlaySegmentInVideo(seg.start, seg.end)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded-md cursor-pointer transition-colors flex items-center gap-1"
                          title="ចាក់ផ្នែកនេះក្នុងវីដេអូ (Play segment)"
                        >
                          <Eye className="w-3 h-3" />
                          <span>ចាក់វីដេអូ</span>
                        </button>

                        {/* Play Khmer voice (only if synthesized) */}
                        {seg.audioUrl && (
                          <button
                            onClick={() => playLocalAudio(seg)}
                            className={`px-2 py-1 text-[10px] font-medium rounded-md cursor-pointer transition-all flex items-center gap-1 ${
                              playingAudioId === seg.id
                                ? "bg-amber-500 text-slate-950"
                                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                            title="ស្តាប់សម្លេងខ្មែរដែលបានសំយោគរួច"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{playingAudioId === seg.id ? "កំពុងចាក់" : "ស្តាប់សម្លេង"}</span>
                          </button>
                        )}
                      </div>

                      {/* Synthesis Actions */}
                      <button
                        onClick={() => onSynthesizeSegment(seg.id)}
                        disabled={seg.isSynthesizing || isSynthesizingAll}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-all flex items-center gap-1 ${
                          seg.audioUrl 
                            ? "bg-slate-800 text-slate-400 hover:text-amber-400" 
                            : "bg-amber-500 hover:bg-amber-400 text-slate-950 hover:scale-105"
                        }`}
                      >
                        {seg.isSynthesizing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        <span>{seg.audioUrl ? "សំយោគម្តងទៀត" : "សំយោគសម្លេង"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add manually footer */}
      {segments.length > 0 && (
        <button
          onClick={onAddSegment}
          className="w-full mt-4 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>បន្ថែមចន្លោះម៉ោងថ្មី (Add Segment)</span>
        </button>
      )}
    </div>
  );
}
