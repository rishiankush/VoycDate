import type { DocumentData } from 'firebase-admin/firestore';

export const DEFAULT_DISTANCE_KM = 40;
export const DEFAULT_AGE_RANGE = { min: 18, max: 80 };

/** Fields other people may see on a Discover card or full profile. */
export function publicCard(profile: DocumentData) {
  return {
    firstName: profile.firstName ?? '',
    gender: profile.gender?.showOnProfile ? profile.gender.identity : null,
    intent: profile.mode === 'date' ? (profile.intent ?? null) : null,
    heightCm: profile.heightCm ?? null,
    interests: profile.interests ?? [],
    values: profile.values ?? [],
    habits: profile.habits ?? {},
    family: profile.family ?? {},
    beliefs: profile.beliefs ?? {},
    photos: (profile.photos ?? []).map((p: DocumentData) => ({ url: p.url, width: p.width, height: p.height })),
    video:
      profile.videoIntro?.status === 'approved'
        ? {
            url: profile.videoIntro.url,
            posterUrl: profile.videoIntro.posterUrl ?? null,
            durationMs: profile.videoIntro.durationMs,
            transcript: profile.videoIntro.transcript ?? null,
          }
        : null,
    prompts: (profile.prompts ?? []).map((p: DocumentData) => ({ question: p.question, answer: p.answer })),
    bio: profile.bio ?? '',
    city: profile.location?.city ?? '',
    region: profile.location?.region ?? null,
    countryCode: profile.location?.countryCode ?? null,
    verified: profile.verification?.status === 'approved',
  };
}

export function isDiscoverable(user: DocumentData, profile: DocumentData) {
  return Boolean(
    user.status === 'active' &&
      user.onboarding?.status === 'completed' &&
      !user.paused &&
      user.birthDate &&
      profile.location?.geohash &&
      (profile.photos?.length ?? 0) > 0 &&
      profile.videoIntro?.status === 'approved',
  );
}

/** The private discovery record used by the feed query (without timestamps). */
export function buildDiscoveryDoc(uid: string, user: DocumentData, profile: DocumentData, prefs: DocumentData) {
  const location = profile.location;
  return {
    uid,
    active: isDiscoverable(user, profile),
    mode: profile.mode ?? 'date',
    geohash: location?.geohash ?? '',
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
    genderGroup: profile.gender?.group ?? null,
    showMe: prefs.showMe ?? 'everyone',
    ageRange: prefs.ageRange ?? DEFAULT_AGE_RANGE,
    maxDistanceKm: prefs.maxDistanceKm ?? DEFAULT_DISTANCE_KM,
    showAge: prefs.showAge !== false,
    showDistance: prefs.showDistance !== false,
    birthDate: user.birthDate ?? null,
    card: publicCard(profile),
  };
}

/** Stable JSON for change detection (key order independent). */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}
