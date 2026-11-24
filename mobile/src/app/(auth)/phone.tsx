import { router } from 'expo-router';
import {
  AsYouType,
  isPossiblePhoneNumber,
  parsePhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';
import { ChevronDown, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, ScreenHeader, TextField } from '@/components/ui';
import { authErrorMessage } from '@/features/auth/authErrors';
import { COUNTRIES } from '@/features/auth/countries';
import { CountryPickerModal } from '@/features/auth/CountryPickerModal';
import { flagEmoji } from '@/features/auth/flag';
import { sendVerificationCode } from '@/features/auth/phoneVerification';
import { useRecaptchaVerifier } from '@/features/auth/RecaptchaProvider';
import { colors, spacing } from '@/theme';

function defaultCountry(): CountryCode {
  // VOYC Date launches in India — always start on +91; users can still pick another country.
  return 'IN';
}

export default function PhoneScreen() {
  const getVerifier = useRecaptchaVerifier();
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [digits, setDigits] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  const dialCode = COUNTRIES.find((c) => c.iso === country)?.dialCode ?? '';
  const formatted = new AsYouType(country).input(digits);
  // Length check only: Firebase test numbers (e.g. 555 numbers) fail strict validation,
  // and Firebase rejects genuinely invalid numbers with auth/invalid-phone-number.
  const valid = isPossiblePhoneNumber(digits, country);

  const onChangeText = (text: string) => {
    let next = text.replace(/\D/g, '');
    // Deleting a formatting character such as ")" leaves the digits unchanged; drop a digit instead.
    if (next === digits && text.length < formatted.length) next = next.slice(0, -1);
    setDigits(next);
    setError(undefined);
  };

  const onSend = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(undefined);
    try {
      await sendVerificationCode(parsePhoneNumber(digits, country).number, getVerifier());
      router.push('/verify');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title="VOYC" onBack={router.back} />}>
      <View style={styles.copy}>
        <AppText variant="eyebrow">Sign in or create account</AppText>
        <AppText variant="display">{'Let’s get\nyou started!'}</AppText>
        <AppText variant="bodyLarge">Enter your phone number to continue with VOYC</AppText>
      </View>

      <View style={styles.form}>
        <TextField
          label="Phone Number"
          placeholder="Enter phone number"
          value={formatted}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onSend}
          error={error}
          leading={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Country code plus ${dialCode}. Change country`}
              onPress={() => setPickerOpen(true)}
              hitSlop={8}
              style={styles.countryButton}>
              <AppText variant="bodyLarge" color="textMuted">
                +{dialCode}
              </AppText>
              <AppText style={styles.flag}>{flagEmoji(country)}</AppText>
              <ChevronDown size={14} color={colors.textMuted} />
            </Pressable>
          }
        />

        <Button title="Send Code" onPress={onSend} disabled={!valid} loading={sending} style={styles.send} />

        <View style={styles.privacy}>
          <Lock size={14} color={colors.textMuted} style={styles.lockIcon} />
          <AppText variant="caption" style={styles.privacyText}>
            Your number is private. It’s only used to verify you and is never shown on your profile.
          </AppText>
        </View>
      </View>

      <CountryPickerModal
        visible={pickerOpen}
        selected={country}
        onClose={() => setPickerOpen(false)}
        onSelect={(c) => {
          setCountry(c.iso);
          setPickerOpen(false);
          setError(undefined);
        }}
      />
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
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: spacing.xs,
  },
  flag: {
    fontSize: 18,
  },
  send: {
    marginTop: spacing.xl,
  },
  privacy: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  lockIcon: {
    marginTop: 1,
  },
  privacyText: {
    flex: 1,
  },
});
