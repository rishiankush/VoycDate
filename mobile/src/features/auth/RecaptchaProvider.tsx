import { getLocales } from 'expo-localization';
import type { ApplicationVerifier } from 'firebase/auth';
import { X } from 'lucide-react-native';
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { AppText, IconButton } from '@/components/ui';
import { firebaseConfig, usingEmulators } from '@/lib/firebase';
import { colors, radii, spacing } from '@/theme';

import { recaptchaHtml } from './recaptchaHtml';

const VERIFY_TIMEOUT_MS = 30_000;

export class RecaptchaCancelledError extends Error {
  code = 'auth/captcha-cancelled';
}

class RecaptchaFailedError extends Error {
  code = 'auth/captcha-check-failed';
}

type Phase = 'idle' | 'verifying' | 'challenge';
type Pending = { resolve: (token: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

const RecaptchaContext = createContext<(() => ApplicationVerifier) | null>(null);

export function RecaptchaProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [sessionKey, setSessionKey] = useState(0);
  const pending = useRef<Pending | null>(null);

  const html = useMemo(
    () => recaptchaHtml(firebaseConfig, getLocales()[0]?.languageCode ?? 'en'),
    [],
  );

  const settle = useCallback((outcome: { token: string } | { error: Error }) => {
    const current = pending.current;
    pending.current = null;
    setPhase('idle');
    if (!current) return;
    clearTimeout(current.timer);
    if ('token' in outcome) current.resolve(outcome.token);
    else current.reject(outcome.error);
  }, []);

  const requestToken = useCallback(() => {
    if (usingEmulators) return Promise.resolve('emulator-recaptcha-token');
    if (pending.current) {
      clearTimeout(pending.current.timer);
      pending.current.reject(new RecaptchaCancelledError('Superseded by a new verification'));
    }
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => settle({ error: new RecaptchaFailedError('reCAPTCHA timed out') }),
        VERIFY_TIMEOUT_MS,
      );
      pending.current = { resolve, reject, timer };
      setSessionKey((k) => k + 1);
      setPhase('verifying');
    });
  }, [settle]);

  const getVerifier = useCallback(() => {
    // The Firebase JS SDK calls verify() for a reCAPTCHA v2 token and _reset() afterwards.
    const verifier = { type: 'recaptcha', verify: requestToken, _reset: () => {} };
    return verifier as ApplicationVerifier;
  }, [requestToken]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = JSON.parse(event.nativeEvent.data) as
        | { type: 'token'; token: string }
        | { type: 'challenge' }
        | { type: 'expired' }
        | { type: 'error'; message: string };
      if (message.type === 'challenge') setPhase('challenge');
      else if (message.type === 'token') settle({ token: message.token });
      else if (message.type === 'expired') settle({ error: new RecaptchaFailedError('reCAPTCHA expired') });
      else settle({ error: new RecaptchaFailedError(message.message) });
    },
    [settle],
  );

  const cancel = useCallback(
    () => settle({ error: new RecaptchaCancelledError('Verification cancelled') }),
    [settle],
  );

  const challenge = phase === 'challenge';

  return (
    <RecaptchaContext value={getVerifier}>
      {children}
      <Modal visible={phase !== 'idle'} transparent animationType="none" onRequestClose={cancel}>
        <View style={[styles.backdrop, challenge && styles.backdropVisible]}>
          <View
            style={[styles.sheet, !challenge && styles.hidden]}
            pointerEvents={challenge ? 'auto' : 'none'}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <AppText variant="bodyStrong" color="plum">
                  Quick security check
                </AppText>
                <AppText variant="caption">This keeps VOYC free of bots.</AppText>
              </View>
              <IconButton
                accessibilityLabel="Cancel verification"
                onPress={cancel}
                size={36}
                icon={<X size={18} color={colors.plum} />}
              />
            </View>
            <View style={styles.webviewFrame}>
              {phase !== 'idle' ? (
                <WebView
                  key={sessionKey}
                  originWhitelist={['*']}
                  source={{ html, baseUrl: `https://${firebaseConfig.authDomain}` }}
                  onMessage={onMessage}
                  javaScriptEnabled
                  style={styles.webview}
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </RecaptchaContext>
  );
}

export function useRecaptchaVerifier() {
  const getVerifier = use(RecaptchaContext);
  if (!getVerifier) throw new Error('useRecaptchaVerifier must be used inside RecaptchaProvider');
  return getVerifier;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdropVisible: {
    backgroundColor: 'rgba(42, 11, 43, 0.45)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  hidden: {
    opacity: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  webviewFrame: {
    height: 480,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});
