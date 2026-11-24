import type { Href } from 'expo-router';

import type { Mode } from './types';

export type OnboardingStep = {
  id: string;
  route: Href;
  section: 1 | 2 | 3 | 4 | 5;
  optional?: boolean;
  appliesTo?: Mode;
};

export const STEPS: OnboardingStep[] = [
  { id: '1.1', route: '/onboarding/name', section: 1 },
  { id: '1.2', route: '/onboarding/birthday', section: 1 },
  { id: '1.3', route: '/onboarding/gender', section: 1 },
  { id: '1.4', route: '/onboarding/mode', section: 1 },
  { id: '2.1', route: '/onboarding/meet', section: 2 },
  { id: '2.2', route: '/onboarding/intent', section: 2, appliesTo: 'date' },
  { id: '3.1', route: '/onboarding/height', section: 3, optional: true },
  { id: '3.2', route: '/onboarding/interests', section: 3, optional: true },
  { id: '3.3', route: '/onboarding/values', section: 3, optional: true },
  { id: '3.4', route: '/onboarding/habits', section: 3, optional: true },
  { id: '3.5', route: '/onboarding/family', section: 3, optional: true },
  { id: '3.6', route: '/onboarding/beliefs', section: 3, optional: true },
  { id: '4.1', route: '/onboarding/photos', section: 4 },
  { id: '4.2', route: '/onboarding/video', section: 4 },
  { id: '4.3', route: '/onboarding/prompts', section: 4, optional: true },
  { id: '4.4', route: '/onboarding/about', section: 4, optional: true },
  { id: '5.1', route: '/onboarding/location', section: 5 },
  { id: '5.2', route: '/onboarding/notifications', section: 5, optional: true },
  { id: '5.4', route: '/onboarding/email', section: 5, optional: true },
  { id: '5.5', route: '/onboarding/promise', section: 5 },
  { id: '5.6', route: '/onboarding/done', section: 5 },
];

export const TOTAL_SECTIONS = 5;

function applicable(mode: Mode | undefined) {
  return STEPS.filter((s) => !s.appliesTo || s.appliesTo === (mode ?? 'date'));
}

export function stepById(id: string) {
  return STEPS.find((s) => s.id === id) ?? STEPS[0];
}

export function nextStep(id: string, mode: Mode | undefined) {
  const list = applicable(mode);
  const index = list.findIndex((s) => s.id === id);
  return list[index + 1] ?? null;
}

export function previousStep(id: string, mode: Mode | undefined) {
  const list = applicable(mode);
  const index = list.findIndex((s) => s.id === id);
  return index > 0 ? list[index - 1] : null;
}

/** How much of the step's section bar to fill while this step is shown. */
export function sectionProgress(id: string, mode: Mode | undefined) {
  const step = stepById(id);
  const inSection = applicable(mode).filter((s) => s.section === step.section);
  const index = inSection.findIndex((s) => s.id === id);
  return inSection.length ? (Math.max(index, 0) + 1) / inSection.length : 1;
}
