import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Mic } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { AppText } from '@/components/ui';
import { clock } from '@/features/discover/labels';
import { VOICE_MAX_MS, VOICE_MIN_MS } from '@/features/onboarding/options';
import { VOICE_RECORDING_OPTIONS } from './recording';
import { colors, spacing } from '@/theme';

import type { RecordedClip } from './types';

const CANCEL_DISTANCE = 80;
const WAVEFORM_BARS = 40;
const SAMPLE_MS = 100;

function downsample(levels: number[]) {
  if (!levels.length) return [];
  return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
    const start = Math.floor((i / WAVEFORM_BARS) * levels.length);
    const end = Math.max(start + 1, Math.floor(((i + 1) / WAVEFORM_BARS) * levels.length));
    const slice = levels.slice(start, end);
    return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 100) / 100;
  });
}

// Metering is in dBFS: about -60 for silence up to 0 at full scale.
const normalise = (db: number | undefined) => Math.min(1, Math.max(0.05, ((db ?? -60) + 60) / 60));

type RecordButtonProps = {
  onRecorded: (clip: RecordedClip) => void;
};

export function RecordButton({ onRecorded }: RecordButtonProps) {
  const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, SAMPLE_MS);
  const [cancelling, setCancelling] = useState(false);
  const levels = useRef<number[]>([]);
  const sampler = useRef<ReturnType<typeof setInterval> | null>(null);
  const starting = useRef<Promise<boolean> | null>(null);
  const startY = useRef(0);
  const active = useRef(false);

  const recording = recorderState.isRecording;

  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone access needed', 'Allow microphone access in Settings to send voice notes.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return false;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      try {
        await recorder.prepareToRecordAsync(VOICE_RECORDING_OPTIONS);
      } catch {
        await recorder.prepareToRecordAsync({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
      }
      levels.current = [];
      recorder.record();
      sampler.current = setInterval(() => levels.current.push(normalise(recorder.getStatus().metering)), SAMPLE_MS);
      return true;
    } catch {
      Alert.alert('Couldn’t start recording', 'Check that no other app is using the microphone and try again.');
      return false;
    }
  };

  const stop = async (discard: boolean) => {
    if (!active.current) return;
    active.current = false;
    const started = await starting.current;
    starting.current = null;
    if (sampler.current) clearInterval(sampler.current);
    sampler.current = null;
    setCancelling(false);
    if (!started) return;

    const durationMs = Math.min(recorder.getStatus().durationMillis, VOICE_MAX_MS);
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (discard || !recorder.uri) return;
    if (durationMs < VOICE_MIN_MS) {
      Alert.alert('Too short', 'Hold for at least 3 seconds. Shorter notes don’t count.');
      return;
    }
    onRecorded({ uri: recorder.uri, durationMs, waveform: downsample(levels.current) });
  };

  useEffect(() => {
    if (recording && recorderState.durationMillis >= VOICE_MAX_MS) stop(false);
  });

  const onGrant = (e: GestureResponderEvent) => {
    active.current = true;
    startY.current = e.nativeEvent.pageY;
    starting.current = start();
  };

  const onMove = (e: GestureResponderEvent) => {
    const next = startY.current - e.nativeEvent.pageY > CANCEL_DISTANCE;
    if (next !== cancelling) setCancelling(next);
  };

  return (
    <View style={styles.wrapper}>
      <View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={() => stop(cancelling)}
        onResponderTerminate={() => stop(true)}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Hold to record a voice message"
        style={[styles.ring, recording && styles.ringActive, cancelling && styles.ringCancel]}>
        <View style={[styles.button, cancelling && styles.buttonCancel]}>
          <Mic size={30} color={colors.white} />
        </View>
      </View>
      <AppText variant="caption" color="text" align="center">
        {recording
          ? cancelling
            ? 'Release to cancel'
            : `${clock(recorderState.durationMillis)} · Slide up to cancel`
          : 'Hold to record · 3–30 sec'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  ring: {
    width: 92,
    height: 92,
    borderRadius: 46,
    padding: 6,
    backgroundColor: colors.pinkSoft,
  },
  ringActive: {
    backgroundColor: colors.pink,
    transform: [{ scale: 1.08 }],
  },
  ringCancel: {
    backgroundColor: colors.pinkBorder,
  },
  button: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: colors.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: colors.danger,
  },
});
