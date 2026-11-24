import { Redirect, type Href } from 'expo-router';

import { useSession, type SessionStatus } from '@/features/auth/SessionProvider';

const DESTINATION: Partial<Record<SessionStatus, Href>> = {
  signedOut: '/welcome',
  onboarding: '/onboarding',
  active: '/discover',
  suspended: '/suspended',
};

export default function Index() {
  const { status } = useSession();
  const href = DESTINATION[status];
  return href ? <Redirect href={href} /> : null;
}
