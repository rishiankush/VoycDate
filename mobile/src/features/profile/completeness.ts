import type { Profile } from '@/features/onboarding/types';

type Check = { id: string; label: string; done: boolean };

export function profileChecks(profile: Profile): Check[] {
  return [
    { id: 'photo', label: 'Photo', done: (profile.photos?.length ?? 0) > 0 },
    { id: 'video', label: 'Video intro', done: profile.videoIntro?.status === 'approved' },
    { id: 'bio', label: 'About me', done: Boolean(profile.bio?.trim()) },
    { id: 'prompts', label: 'Prompts', done: (profile.prompts?.length ?? 0) > 0 },
    { id: 'interests', label: 'Interests', done: (profile.interests?.length ?? 0) > 0 },
    { id: 'values', label: 'Values', done: (profile.values?.length ?? 0) > 0 },
    { id: 'height', label: 'Height', done: profile.heightCm != null },
    { id: 'habits', label: 'Lifestyle', done: Boolean(profile.habits?.drinking || profile.habits?.smoking || profile.habits?.exercise) },
  ];
}

export function profileCompleteness(profile: Profile) {
  const checks = profileChecks(profile);
  const done = checks.filter((c) => c.done).length;
  return { checks, done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
}
