import { INTENTS } from '@/features/onboarding/options';
import { formatDistance } from '@/features/onboarding/units';

import type { DiscoverCard } from './types';

export const intentLabel = (intent: string | null) => INTENTS.find((i) => i.value === intent)?.label ?? null;

export function placeLine(card: Pick<DiscoverCard, 'city' | 'region' | 'countryCode' | 'distanceKm'>) {
  const place = [card.city, card.countryCode === 'US' ? card.region : null].filter(Boolean).join(', ');
  const distance = card.distanceKm != null ? `${formatDistance(card.distanceKm)} away` : null;
  if (place && distance) return `${place} · ${distance}`;
  return place || distance || '';
}

export function nameAgeLine(card: Pick<DiscoverCard, 'firstName' | 'age'>) {
  return card.age != null ? `${card.firstName}, ${card.age}` : card.firstName;
}

export function clock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
