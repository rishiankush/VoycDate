import { Redirect, router } from 'expo-router';
import { parsePhoneNumber } from 'libphonenumber-js';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, ScreenHeader } from '@/components/ui';
import { authErrorMessage } from '@/features/auth/authErrors';
import { OtpInput } from '@/features/auth/OtpInput';
import {
  confirmVerificationCode,
  getPendingVerification,
  RESEND_COOLDOWN_SECONDS,
  sendVerificationCode,
} from '@/features/auth/phoneVerification';
import { useRecaptchaVerifier } from '@/features/auth/RecaptchaProvider';
import { fontFamily, spacing } from '@/theme';

const CODE_LENGTH = 6;

function secondsLeft(sentAt: number) {
  return Math.max(0, RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - sentAt) / 1000));
}

function displayNumber(e164: string) {
  const parsed = parsePhoneNumber(e164);
  return `+${parsed.countryCallingCode} ${parsed.formatNational()}`;
}

export default function VerifyScreen() {
  const getVerifier = useRecaptchaVerifier();
  const [pending, setPending] = useState(getPendingVerification);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string>();
  const [cooldown, setCooldown] = useState(() => (pending ? secondsLeft(pending.sentAt) : 0));

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setCooldown(secondsLeft(pending.sentAt)), 1000);
    return () => clearInterval(timer);
  }, [pending]);

  if (!pending) return <Redirect href="/phone" />;

  const verify = async (value = code) => {
    if (value.length !== CODE_LENGTH || verifying) return;
    setVerifying(true);
    setError(undefined);
    try {
      await confirmVerificationCode(value);
    } catch (e) {
      setError(authErrorMessage(e));
      setVerifying(false);
    }
  };

  const onChangeCode = (value: string) => {
    setCode(value);
    setError(undefined);
    if (value.length === CODE_LENGTH) verify(value);
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(undefined);
    try {
      const next = await sendVerificationCode(pending.phoneNumber, getVerifier());
      setPending(next);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode('');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setResending(false);
    }
  };

  const mm = Math.floor(cooldown / 60);
  const ss = String(cooldown % 60).padStart(2, '0');

  return (
    <Screen header={<ScreenHeader title="VOYC" onBack={router.back} />}>
      <View style={styles.copy}>
        <AppText variant="display">Enter your code</AppText>
        <AppText variant="bodyLarge">
          We sent a {CODE_LENGTH}-digit code to {displayNumber(pending.phoneNumber)}.
        </AppText>
      </View>

      <View style={styles.form}>
        <View style={styles.codeBlock}>
          <OtpInput value={code} onChange={onChangeCode} length={CODE_LENGTH} error={Boolean(error)} />
          {error ? (
            <AppText variant="caption" color="danger">
              {error}
            </AppText>
          ) : cooldown > 0 ? (
            <AppText variant="caption" color="text">
              Resend code in{' '}
              <AppText variant="caption" color="text" style={styles.bold}>
                {mm}:{ss}
              </AppText>
            </AppText>
          ) : null}
        </View>

        <Button
          title="Verify"
          onPress={() => verify()}
          disabled={code.length !== CODE_LENGTH}
          loading={verifying}
          style={styles.verify}
        />

        <View style={styles.resendRow}>
          <AppText variant="caption">Didn’t get it? </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: cooldown > 0 || resending }}
            disabled={cooldown > 0 || resending}
            onPress={resend}
            hitSlop={8}>
            <AppText variant="caption" color={cooldown > 0 ? 'placeholder' : 'plum'} style={styles.bold}>
              {resending ? 'Sending…' : 'Resend code'}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  form: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  codeBlock: {
    gap: spacing.xs,
  },
  verify: {
    marginTop: spacing.lg,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bold: {
    fontFamily: fontFamily.sansBold,
  },
});
