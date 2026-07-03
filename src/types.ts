export interface DubSegment {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  chinese: string;
  khmer: string;
  emotion: 'cheerful' | 'serious' | 'calm' | 'excited' | 'sad' | string;
  audioUrl?: string; // Blobs or base64 data URLs
  isSynthesizing?: boolean;
  error?: string;
}

export interface VoiceConfig {
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  displayName: string;
  gender: 'male' | 'female';
  pitch: number; // 0.5 to 2.0 (handled in client play speed/pitch or metadata)
  speed: number; // 0.5 to 2.0
}

export interface SampleVideo {
  id: string;
  title: string;
  titleKhmer: string;
  description: string;
  descriptionKhmer: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: string;
  duration: string;
  prebuiltSegments: DubSegment[];
}
