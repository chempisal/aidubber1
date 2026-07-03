import React, { useRef, useState, useEffect } from "react";
import { DubSegment } from "../types";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Maximize, Languages, AudioLines, Captions } from "lucide-react";

interface VideoPreviewPlayerProps {
  videoUrl: string;
  segments: DubSegment[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  dubVolume: number;
  useDubbing: boolean;
  onUseDubbingToggle: (val: boolean) => void;
}

export default function VideoPreviewPlayer({
  videoUrl,
  segments,
  currentTime,
  onTimeUpdate,
  dubVolume,
  useDubbing,
  onUseDubbingToggle,
}: VideoPreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioCacheRef = useRef<Record<number, HTMLAudioElement>>({});
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoVolume, setVideoVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState<DubSegment | null>(null);
  const [showSubtitles, setShowSubtitles] = useState(true);
  
  // Track currently playing audio to pause/resume/stop
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);

  // Synchronize audio elements with segments
  useEffect(() => {
    // Clear audio elements that no longer have audioUrls or are removed
    const segmentIds = new Set(segments.map(s => s.id));
    Object.keys(audioCacheRef.current).forEach((key) => {
      const id = parseInt(key);
      if (!segmentIds.has(id)) {
        audioCacheRef.current[id].pause();
        delete audioCacheRef.current[id];
      }
    });

    // Load or update audio URLs for segments
    segments.forEach((seg) => {
      if (seg.audioUrl) {
        if (!audioCacheRef.current[seg.id] || audioCacheRef.current[seg.id].src !== seg.audioUrl) {
          if (audioCacheRef.current[seg.id]) {
            audioCacheRef.current[seg.id].pause();
          }
          const audio = new Audio(seg.audioUrl);
          audio.preload = "auto";
          audioCacheRef.current[seg.id] = audio;
        }
      }
    });
  }, [segments]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      (Object.values(audioCacheRef.current) as HTMLAudioElement[]).forEach(audio => audio.pause());
    };
  }, []);

  // Monitor playback and synchronize Khmer audio tracks (DUBBING)
  useEffect(() => {
    if (!useDubbing) {
      // If dubbing is disabled, restore normal volume and stop any playing audio
      if (playingAudioId !== null) {
        audioCacheRef.current[playingAudioId]?.pause();
        setPlayingAudioId(null);
      }
      if (videoRef.current) {
        videoRef.current.volume = isMuted ? 0 : videoVolume;
      }
      setActiveSegment(null);
      return;
    }

    // Find the segment matching the current playback time
    const currentSegment = segments.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    );

    setActiveSegment(currentSegment || null);

    if (currentSegment) {
      const audio = audioCacheRef.current[currentSegment.id];

      if (audio && currentSegment.audioUrl) {
        // Set volume of the dubbing track
        audio.volume = dubVolume;

        if (playingAudioId !== currentSegment.id) {
          // Stop any other playing audio
          if (playingAudioId !== null && playingAudioId !== currentSegment.id) {
            audioCacheRef.current[playingAudioId]?.pause();
          }

          // Compute start offset in case they skipped/seeked into the middle of a segment
          const segmentOffset = currentTime - currentSegment.start;
          try {
            audio.currentTime = Math.max(0, segmentOffset);
            if (isPlaying) {
              audio.play().catch(err => console.log("Audio play deferred:", err));
            } else {
              audio.pause();
            }
          } catch (e) {
            console.error("Audio seek failed:", e);
          }
          setPlayingAudioId(currentSegment.id);
        } else {
          // Sync audio play/pause state with video state
          if (isPlaying && audio.paused) {
            audio.play().catch(e => {});
          } else if (!isPlaying && !audio.paused) {
            audio.pause();
          }

          // Drift correction: if audio drift is > 0.3s, align with video time
          if (isPlaying && !audio.paused) {
            const expectedAudioTime = currentTime - currentSegment.start;
            if (Math.abs(audio.currentTime - expectedAudioTime) > 0.3) {
              audio.currentTime = Math.max(0, expectedAudioTime);
            }
          }
        }

        // Duck (reduce) the native video volume to let Khmer audio shine!
        if (videoRef.current) {
          // Original volume ducked to 15%
          videoRef.current.volume = isMuted ? 0 : videoVolume * 0.12;
        }
      } else {
        // No audio generated yet for this active segment - keep video audio normal
        if (playingAudioId !== null) {
          audioCacheRef.current[playingAudioId]?.pause();
          setPlayingAudioId(null);
        }
        if (videoRef.current) {
          videoRef.current.volume = isMuted ? 0 : videoVolume;
        }
      }
    } else {
      // Outside any dubbing segments - stop playing any active dub track, restore video volume
      if (playingAudioId !== null) {
        audioCacheRef.current[playingAudioId]?.pause();
        audioCacheRef.current[playingAudioId].currentTime = 0;
        setPlayingAudioId(null);
      }
      if (videoRef.current) {
        videoRef.current.volume = isMuted ? 0 : videoVolume;
      }
    }
  }, [currentTime, isPlaying, useDubbing, playingAudioId, dubVolume, videoVolume, isMuted, segments]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(err => console.error(err));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      onTimeUpdate(time);
      
      // Stop all currently playing audio tracks immediately on seek so they can reposition
      if (playingAudioId !== null) {
        audioCacheRef.current[playingAudioId]?.pause();
        setPlayingAudioId(null);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVideoVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : activeSegment && activeSegment.audioUrl && useDubbing ? vol * 0.12 : vol;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.volume = newMuted ? 0 : activeSegment && activeSegment.audioUrl && useDubbing ? videoVolume * 0.12 : videoVolume;
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      onTimeUpdate(0);
      if (playingAudioId !== null) {
        audioCacheRef.current[playingAudioId]?.pause();
        setPlayingAudioId(null);
      }
      if (!isPlaying) {
        videoRef.current.play().catch(e => {});
        setIsPlaying(true);
      }
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Format time (e.g. 1.5 -> "00:01.5")
  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${ms}`;
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative group/player">
      
      {/* Video Container with Dual Subtitles Overlay */}
      <div className="aspect-video w-full bg-black relative flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />

        {/* Dynamic Dual Subtitles HUD */}
        {showSubtitles && activeSegment && (
          <div className="absolute bottom-12 left-4 right-4 text-center pointer-events-none select-none z-10 space-y-2">
            <div className="inline-block bg-black/75 border border-slate-800/80 px-4 py-2 rounded-xl backdrop-blur-md max-w-[90%] transition-all duration-300 transform scale-100 shadow-xl">
              {/* Khmer text (Large, High Contrast) */}
              <p className="text-amber-400 font-sans text-sm md:text-base lg:text-lg font-medium leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {activeSegment.khmer}
              </p>
              {/* Chinese text (Small, secondary) */}
              <p className="text-slate-300 font-sans text-xs md:text-sm mt-1 opacity-90 tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {activeSegment.chinese}
              </p>
            </div>
          </div>
        )}

        {/* Quick Voice overlay status (top right) */}
        {useDubbing && activeSegment && activeSegment.audioUrl && (
          <div className="absolute top-4 right-4 bg-amber-500/90 text-slate-950 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce z-10 backdrop-blur">
            <AudioLines className="w-3.5 h-3.5" />
            <span>កំពុងបញ្ចូលសម្លេងខ្មែរ...</span>
          </div>
        )}
      </div>

      {/* Custom Media Controls Bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-3">
        {/* Progress Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <span className="text-xs font-mono text-slate-400">{formatTime(duration)}</span>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className={`p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                isPlaying 
                  ? "bg-slate-800 text-slate-200 hover:bg-slate-700" 
                  : "bg-amber-500 text-slate-950 hover:bg-amber-400 hover:scale-105 shadow-md shadow-amber-500/10"
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 stroke-[2.5]" /> : <Play className="w-4 h-4 stroke-[2.5]" />}
            </button>

            {/* Restart */}
            <button
              onClick={restartVideo}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition-colors"
              title="ចាក់ឡើងវិញ (Restart)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5 ml-2 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
              <button onClick={toggleMute} className="text-slate-400 hover:text-slate-200 transition-colors">
                {isMuted || videoVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={videoVolume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Dubbing Mode */}
            <button
              onClick={() => onUseDubbingToggle(!useDubbing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all duration-200 ${
                useDubbing
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
              }`}
              title={useDubbing ? "បិទការបញ្ចូលសម្លេងខ្មែរ" : "បើកការបញ្ចូលសម្លេងខ្មែរ"}
            >
              <AudioLines className={`w-3.5 h-3.5 ${useDubbing ? "animate-pulse text-amber-400" : ""}`} />
              <span className="hidden sm:inline">សម្លេងខ្មែរ (Dubbing)</span>
            </button>

            {/* Toggle Subtitles */}
            <button
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`p-2 rounded-xl border cursor-pointer transition-all duration-200 ${
                showSubtitles
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-slate-950 border-slate-800/80 text-slate-500"
              }`}
              title="អក្សររត់ក្រោមរូបភាព (Subtitles)"
            >
              <Captions className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer transition-colors"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
