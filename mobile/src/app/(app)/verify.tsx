import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { router } from 'expo-router';
import { BadgeCheck, ShieldCheck, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { AppText, Button, IconButton, Screen } from '@/components/ui';
import { useSession } from '@/features/auth/SessionProvider';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { prepareVerification, submitVerificationVideo } from '@/features/verification/verification';
import { colors, radii, spacing } from '@/theme';

type Phase = 'intro' | 'ready' | 'countdown' | 'recording' | 'review' | 'uploading' | 'done';
type Recording = { uri: string; durationMs: number };

const MIN_MS = 5_000;
const MAX_MS = 15_000;

export default function VerifyScreen() {
  const { user } = useSession();
  const { profile } = useMyProfile();
  const uid = user?.uid ?? '';
  const status = profile.verification?.status ?? 'none';

  const [phase, setPhase] = useState<Phase>(status === 'pending' || status === 'approved' ? 'done' : 'intro');
  const [challenge, setChallenge] = useState<{ challengeId: string; code: string; action: string } | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const next = await prepareVerification();
      setChallenge({ challengeId: next.challengeId, code: next.code, action: next.action });
      setPhase('ready');
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: string }).message)
          : 'Couldn’t start verification.';
      Alert.alert('Not right now', message.replace(/^.*?:\s*/, ''));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!recording || !challenge || !uid) return;
    setPhase('uploading');
    setProgress(0);
    try {
      await submitVerificationVideo(uid, challenge.challengeId, recording, setProgress);
      setPhase('done');
    } catch {
      Alert.alert('Upload failed', 'Check your connection and try again.');
      setPhase('review');
    }
  };

  if (phase === 'done' || status === 'approved' || status === 'pending') {
    const approved = (profile.verification?.status ?? status) === 'approved';
    const pending = (profile.verification?.status ?? status) === 'pending' || phase === 'done';
    return (
      <Screen
        header={
          <View style={styles.header}>
            <AppText variant="heading">Verification</AppText>
            <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
          </View>
        }>
        <View style={styles.statusCard}>
          {approved ? <BadgeCheck size={40} color={colors.plum} fill={colors.pink} /> : <ShieldCheck size={40} color={colors.plum} />}
          <AppText variant="title" color="plum">
            {approved ? 'You’re verified' : 'Under review'}
          </AppText>
          <AppText variant="body" color="textMuted" align="center">
            {approved
              ? 'Your Verified badge shows on Discover and your profile.'
              : 'We usually review within 24–48 hours. We’ll notify you when it’s done.'}
          </AppText>
          {!approved && profile.verification?.status === 'rejected' ? (
            <AppText variant="body" color="danger" align="center">
              {profile.verification.rejectionReason ?? 'Please try again.'}
            </AppText>
          ) : null}
          {approved || pending ? <Button title="Done" onPress={router.back} /> : null}
        </View>
      </Screen>
    );
  }

  if (status === 'rejected' && phase === 'intro') {
    // fall through to intro with reason
  }

  if (phase === 'intro') {
    return (
      <Screen
        header={
          <View style={styles.header}>
            <AppText variant="heading">Get verified</AppText>
            <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
          </View>
        }
        footer={<Button title="Start" onPress={start} loading={busy} />}>
        <View style={styles.intro}>
          <ShieldCheck size={36} color={colors.plum} />
          <AppText variant="bodyLarge">
            Record a short video with a code we show you. Our team checks it against your photos within 24–48 hours.
          </AppText>
          <AppText variant="body" color="textMuted">
            Verified profiles get more visibility and more likes. You can try up to 3 times per week.
          </AppText>
          {status === 'rejected' && profile.verification?.rejectionReason ? (
            <View style={styles.rejectBox}>
              <AppText variant="label" color="danger">
                Last attempt
              </AppText>
              <AppText variant="body" color="text">
                {profile.verification.rejectionReason}
              </AppText>
            </View>
          ) : null}
        </View>
      </Screen>
    );
  }

  if ((phase === 'ready' || phase === 'countdown' || phase === 'recording') && challenge) {
    return (
      <SafeAreaView style={styles.cameraRoot} edges={['top', 'bottom']}>
        <CameraStage
          phase={phase}
          code={challenge.code}
          action={challenge.action}
          onPhaseChange={setPhase}
          onRecorded={(r) => {
            setRecording(r);
            setPhase('review');
          }}
          onCancel={router.back}
        />
      </SafeAreaView>
    );
  }

  if (phase === 'review' && recording) {
    return (
      <Screen
        header={
          <View style={styles.header}>
            <AppText variant="heading">Review</AppText>
            <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
          </View>
        }
        footer={
          <View style={styles.row}>
            <Button title="Re-record" variant="secondary" onPress={() => { setRecording(null); setPhase('ready'); }} style={styles.flex} />
            <Button title="Submit" onPress={submit} style={styles.flex} />
          </View>
        }>
        <Playback uri={recording.uri} />
        {challenge ? (
          <AppText variant="caption" color="textMuted" style={styles.hint}>
            Code {challenge.code} · {challenge.action}
          </AppText>
        ) : null}
      </Screen>
    );
  }

  if (phase === 'uploading') {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.plum} />
          <AppText variant="bodyStrong" color="plum">
            Uploading… {Math.round(progress * 100)}%
          </AppText>
        </View>
      </Screen>
    );
  }

  return null;
}

function Playback({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });
  return (
    <View style={styles.preview}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
    </View>
  );
}

function CameraStage({
  phase,
  code,
  action,
  onPhaseChange,
  onRecorded,
  onCancel,
}: {
  phase: Phase;
  code: string;
  action: string;
  onPhaseChange: (p: Phase) => void;
  onRecorded: (r: Recording) => void;
  onCancel: () => void;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!camPerm?.granted) void requestCam();
    if (!micPerm?.granted) void requestMic();
  }, [camPerm?.granted, micPerm?.granted, requestCam, requestMic]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          onPhaseChange('recording');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (phase !== 'recording') return;
    let cancelled = false;
    startedAt.current = Date.now();
    setElapsed(0);
    const tick = setInterval(() => setElapsed(Date.now() - startedAt.current), 200);

    (async () => {
      try {
        const cam = cameraRef.current;
        if (!cam) return;
        const result = await cam.recordAsync({ maxDuration: MAX_MS / 1000 });
        if (cancelled || !result?.uri) return;
        const durationMs = Date.now() - startedAt.current;
        if (durationMs < MIN_MS) {
          Alert.alert('Too short', 'Record at least 5 seconds.');
          onPhaseChange('ready');
          return;
        }
        onRecorded({ uri: result.uri, durationMs: Math.min(durationMs, MAX_MS) });
      } catch {
        if (!cancelled) {
          Alert.alert('Recording failed', 'Try again.');
          onPhaseChange('ready');
        }
      }
    })();

    const autoStop = setTimeout(() => cameraRef.current?.stopRecording(), MAX_MS);

    return () => {
      cancelled = true;
      clearInterval(tick);
      clearTimeout(autoStop);
      cameraRef.current?.stopRecording();
    };
  }, [phase, onPhaseChange, onRecorded]);

  if (!camPerm?.granted || !micPerm?.granted) {
    return (
      <View style={styles.centered}>
        <AppText variant="body" align="center">
          Camera and microphone access are required to verify.
        </AppText>
        <Button title="Open settings" onPress={() => Linking.openSettings()} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={styles.cameraRoot}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" mode="video" />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.challengeBanner}>
          <AppText variant="title" color="white" align="center">
            {code}
          </AppText>
          <AppText variant="body" color="onDarkMuted" align="center">
            {action}
          </AppText>
        </View>
        {phase === 'countdown' ? (
          <AppText variant="title" color="white" align="center" style={styles.count}>
            {countdown}
          </AppText>
        ) : null}
        {phase === 'recording' ? (
          <AppText variant="label" color="white" align="center">
            {Math.min(15, Math.ceil(elapsed / 1000))}s / 15s
          </AppText>
        ) : null}
        <View style={styles.cameraActions}>
          {phase === 'ready' ? (
            <Button title="Record" onPress={() => onPhaseChange('countdown')} />
          ) : phase === 'recording' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop recording"
              onPress={() => cameraRef.current?.stopRecording()}
              style={styles.stopBtn}>
              <View style={styles.stopSquare} />
            </Pressable>
          ) : null}
          <Button title="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intro: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  rejectBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(194, 51, 77, 0.08)',
  },
  statusCard: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  cameraRoot: {
    flex: 1,
    backgroundColor: colors.plumDeep,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  challengeBanner: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  count: {
    fontSize: 64,
  },
  cameraActions: {
    gap: spacing.sm,
  },
  stopBtn: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  preview: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.plumDeep,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  hint: {
    marginTop: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
});
