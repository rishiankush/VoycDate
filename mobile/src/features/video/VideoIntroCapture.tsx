import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import { CheckCircle2, RotateCcw, ShieldAlert } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { VIDEO_MAX_SECONDS, VIDEO_MIN_SECONDS } from '@/features/onboarding/options';
import type { VideoIntro } from '@/features/onboarding/types';
import { colors, fontFamily, radii, spacing } from '@/theme';

import { requestVideoCheck, retryVideoCheck, submitVideoIntro } from './videoIntro';

// 720p at ~1.2 Mbit/s keeps a 10-second intro around 1.5 MB on every phone, so no server transcoding is needed.
const VIDEO_BITRATE = 1_200_000;
const PROMPT = 'Face the camera. Say your name, your age and where you’re from.';

type Phase = 'camera' | 'countdown' | 'recording' | 'review' | 'uploading' | 'status';
type Recording = { uri: string; durationMs: number };

type VideoIntroCaptureProps = {
  uid: string;
  videoIntro: VideoIntro | null | undefined;
};

export function VideoIntroCapture({ uid, videoIntro }: VideoIntroCaptureProps) {
  const [phase, setPhase] = useState<Phase>(videoIntro ? 'status' : 'camera');
  const [recording, setRecording] = useState<Recording | null>(null);
  const [progress, setProgress] = useState(0);

  const submit = async () => {
    if (!recording) return;
    setPhase('uploading');
    setProgress(0);
    try {
      await submitVideoIntro(uid, recording, videoIntro, setProgress);
      setPhase('status');
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
      const detail =
        code === 'storage/unauthorized'
          ? 'Storage permission was denied. Sign in again, or ask us to redeploy Storage rules.'
          : code === 'storage/canceled'
            ? 'Upload was canceled.'
            : code === 'storage/retry-limit-exceeded'
              ? 'The connection kept dropping. Try again on Wi‑Fi.'
              : 'We couldn’t upload your video. Check your connection and try again.';
      console.warn('Video intro upload failed', code || error);
      Alert.alert('Upload failed', detail);
      setPhase('review');
    }
  };

  const recordAgain = () => {
    setRecording(null);
    setPhase('camera');
  };

  if (phase === 'camera' || phase === 'countdown' || phase === 'recording') {
    return (
      <CameraStage
        phase={phase}
        onPhaseChange={setPhase}
        onRecorded={(r) => {
          setRecording(r);
          setPhase('review');
        }}
      />
    );
  }

  if (phase === 'review' && recording) {
    return (
      <View style={styles.stack}>
        <Playback uri={recording.uri} />
        <View style={styles.row}>
          <Button title="Re-record" variant="secondary" onPress={recordAgain} style={styles.flex} />
          <Button title="Use this video" onPress={submit} style={styles.flex} />
        </View>
      </View>
    );
  }

  if (phase === 'uploading') {
    return (
      <View style={[styles.frame, styles.centered]}>
        <ActivityIndicator color={colors.plum} />
        <AppText variant="bodyStrong" color="plum">
          Uploading… {Math.round(progress * 100)}%
        </AppText>
      </View>
    );
  }

  return <CheckStatus uid={uid} videoIntro={videoIntro} onRecordAgain={recordAgain} />;
}

function CameraStage({
  phase,
  onPhaseChange,
  onRecorded,
}: {
  phase: Phase;
  onPhaseChange: (phase: Phase) => void;
  onRecorded: (recording: Recording) => void;
}) {
  const camera = useRef<CameraView>(null);
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const granted = cameraPermission?.granted && micPermission?.granted;

  const askPermissions = async () => {
    const cam = cameraPermission?.granted ? cameraPermission : await requestCamera();
    const mic = micPermission?.granted ? micPermission : await requestMic();
    if ((!cam.granted && !cam.canAskAgain) || (!mic.granted && !mic.canAskAgain)) {
      Alert.alert('Camera access needed', 'Allow camera and microphone access in Settings to record your intro.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
    }
  };

  const record = async () => {
    onPhaseChange('recording');
    startedAt.current = Date.now();
    setElapsedMs(0);
    const ticker = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 100);
    try {
      const result = await camera.current?.recordAsync({
        maxDuration: VIDEO_MAX_SECONDS,
        ...(Platform.OS === 'ios' ? { codec: 'avc1' as const } : {}),
      });
      const durationMs = Math.min(Date.now() - startedAt.current, VIDEO_MAX_SECONDS * 1000);
      if (!result?.uri) throw new Error('No video recorded');
      if (durationMs < VIDEO_MIN_SECONDS * 1000) {
        Alert.alert('Too short', `Record at least ${VIDEO_MIN_SECONDS} seconds so people can get to know you.`);
        onPhaseChange('camera');
        return;
      }
      onRecorded({ uri: result.uri, durationMs });
    } catch {
      Alert.alert('Recording failed', 'Something went wrong while recording. Please try again.');
      onPhaseChange('camera');
    } finally {
      clearInterval(ticker);
    }
  };

  const startCountdown = () => {
    setCount(3);
    onPhaseChange('countdown');
    timers.current = [
      setTimeout(() => setCount(2), 800),
      setTimeout(() => setCount(1), 1600),
      setTimeout(() => record(), 2400),
    ];
  };

  if (!granted) {
    return (
      <View style={[styles.frame, styles.centered, styles.padded]}>
        <AppText variant="bodyStrong" color="plum" align="center">
          Allow camera and microphone
        </AppText>
        <AppText variant="body" align="center">
          Your intro is recorded right here in the app so everyone on VOYC is real.
        </AppText>
        <Button title="Allow access" onPress={askPermissions} style={styles.stretch} />
      </View>
    );
  }

  const fraction = Math.min(elapsedMs / (VIDEO_MAX_SECONDS * 1000), 1);

  return (
    <View style={styles.stack}>
      <View style={styles.frame}>
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="video"
          videoQuality="720p"
          videoBitrate={VIDEO_BITRATE}
          onCameraReady={() => setReady(true)}
        />
        {phase === 'recording' ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${fraction * 100}%` }]} />
          </View>
        ) : null}
        <View style={styles.promptBubble}>
          <AppText variant="label" color="white" align="center">
            {phase === 'recording' ? `${Math.ceil(VIDEO_MAX_SECONDS - elapsedMs / 1000)}s · ${PROMPT}` : PROMPT}
          </AppText>
        </View>
        {phase === 'countdown' ? (
          <View style={[StyleSheet.absoluteFill, styles.centered]}>
            <AppText style={styles.countdown}>{count || ''}</AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.centered}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={phase === 'recording' ? 'Stop recording' : 'Start recording'}
          disabled={!ready || phase === 'countdown'}
          onPress={phase === 'recording' ? () => camera.current?.stopRecording() : startCountdown}
          style={[styles.recordRing, (!ready || phase === 'countdown') && styles.disabled]}>
          <View style={phase === 'recording' ? styles.stopSquare : styles.recordDot} />
        </Pressable>
        <AppText variant="caption" color="text">
          {phase === 'recording' ? 'Tap to stop' : `Up to ${VIDEO_MAX_SECONDS} seconds`}
        </AppText>
      </View>
    </View>
  );
}

function Playback({ uri, muted = false }: { uri: string; muted?: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    p.play();
  });
  return (
    <View style={styles.frame}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
    </View>
  );
}

function CheckStatus({
  uid,
  videoIntro,
  onRecordAgain,
}: {
  uid: string;
  videoIntro: VideoIntro | null | undefined;
  onRecordAgain: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const [canRetryPending, setCanRetryPending] = useState(false);

  useEffect(() => {
    if (videoIntro?.status !== 'pending') {
      setCanRetryPending(false);
      return;
    }
    // Kick the callable check immediately for uploads that predate a working trigger.
    void requestVideoCheck().catch((error) => console.warn('Video check request failed', error));
    const timer = setTimeout(() => setCanRetryPending(true), 20_000);
    return () => clearTimeout(timer);
  }, [videoIntro?.status, videoIntro?.path, videoIntro?.checkNonce]);

  if (!videoIntro || videoIntro.status === 'pending') {
    const retryPending = async () => {
      if (!videoIntro) return;
      setRetrying(true);
      setCanRetryPending(false);
      try {
        await retryVideoCheck(uid, videoIntro);
      } finally {
        setRetrying(false);
      }
    };

    return (
      <View style={[styles.frame, styles.centered, styles.padded]}>
        <ActivityIndicator color={colors.plum} />
        <AppText variant="bodyStrong" color="plum" align="center">
          Checking your video…
        </AppText>
        <AppText variant="body" align="center">
          We make sure every intro shows a real person. This usually takes a few seconds.
        </AppText>
        {canRetryPending ? (
          <Button title="Still waiting? Check again" variant="secondary" onPress={retryPending} loading={retrying} style={styles.stretch} />
        ) : null}
      </View>
    );
  }

  if (videoIntro.status === 'approved') {
    return (
      <View style={styles.stack}>
        <Playback uri={videoIntro.url} muted />
        <View style={styles.statusRow}>
          <CheckCircle2 size={20} color={colors.success} />
          <AppText variant="bodyStrong" color="text">
            Looking good! Your intro is approved.
          </AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={onRecordAgain} style={styles.link}>
          <RotateCcw size={16} color={colors.plum} />
          <AppText variant="label" color="plum">
            Record a new intro
          </AppText>
        </Pressable>
      </View>
    );
  }

  const retry = async () => {
    setRetrying(true);
    try {
      await retryVideoCheck(uid, videoIntro);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={[styles.frame, styles.centered, styles.padded]}>
      <ShieldAlert size={36} color={colors.danger} />
      <AppText variant="bodyStrong" color="text" align="center">
        {videoIntro.rejectionReason ?? 'This video couldn’t be used.'}
      </AppText>
      <Button title="Record again" onPress={onRecordAgain} style={styles.stretch} />
      {videoIntro.status === 'error' ? (
        <Button title="Check the same video again" variant="secondary" onPress={retry} loading={retrying} style={styles.stretch} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  stretch: {
    alignSelf: 'stretch',
  },
  frame: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.plumDeep,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  padded: {
    padding: spacing.lg,
    backgroundColor: colors.pinkTint,
  },
  promptBubble: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(42, 11, 43, 0.6)',
  },
  progressTrack: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.pink,
  },
  countdown: {
    fontFamily: fontFamily.serifBold,
    fontSize: 96,
    lineHeight: 104,
    color: colors.white,
  },
  recordRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.danger,
  },
  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    alignSelf: 'center',
  },
});
