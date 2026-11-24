import type { Timestamp } from 'firebase/firestore';

export type Transcript = {
  status: 'pending' | 'done' | 'failed';
  text?: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  type: 'voice' | 'text' | 'photo';
  text?: string;
  audioUrl?: string;
  audioPath?: string;
  durationMs?: number;
  waveform?: number[];
  counts?: boolean;
  transcript?: Transcript;
  photoUrl?: string;
  photoPath?: string;
  width?: number | null;
  height?: number | null;
  createdAt: Timestamp | null;
  /** Present only on messages still being sent from this device. */
  local?: { uri: string; status: 'sending' | 'failed' };
};

export type RecordedClip = { uri: string; durationMs: number; waveform: number[] };
export type UnlockDecision = 'yes' | 'keep_voice';
