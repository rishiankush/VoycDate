import { Stack } from 'expo-router';

import { RecaptchaProvider } from '@/features/auth/RecaptchaProvider';
import { colors } from '@/theme';

export default function AuthLayout() {
  return (
    <RecaptchaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }} />
    </RecaptchaProvider>
  );
}
