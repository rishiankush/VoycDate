import { RecordingPresets, type RecordingOptions } from 'expo-audio';

/** Mono AAC at 64 kbps: clear speech at roughly 240 KB for a 30-second voice note. */
export const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
};
