export type Mode = 'date' | 'friends';
export type GenderGroup = 'woman' | 'man' | 'nonbinary';
export type ShowMe = 'women' | 'men' | 'everyone';

export type ProfilePhoto = {
  id: string;
  path: string;
  url: string;
  width: number;
  height: number;
};

export type VideoIntroStatus = 'pending' | 'approved' | 'rejected' | 'error';

export type VideoIntro = {
  path: string;
  url: string;
  durationMs: number;
  status: VideoIntroStatus;
  /** Bumped by the client to re-run moderation on the same file. */
  checkNonce?: number;
  /** Written by the moderation function only. */
  posterUrl?: string | null;
  posterPath?: string | null;
  rejectionReason?: string | null;
  transcript?: string | null;
};

export type ProfilePrompt = {
  id: string;
  question: string;
  answer: string;
};

export type ProfileLocation = {
  city: string;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  geohash: string;
  lat: number;
  lng: number;
  source: 'device' | 'manual';
};

export type Profile = {
  firstName?: string;
  gender?: { identity: string; group: GenderGroup; showOnProfile: boolean };
  mode?: Mode;
  intent?: string;
  heightCm?: number | null;
  interests?: string[];
  values?: string[];
  habits?: { drinking?: string; smoking?: string; exercise?: string };
  family?: { haveKids?: string; wantKids?: string };
  beliefs?: { religion?: string; politics?: string };
  photos?: ProfilePhoto[];
  videoIntro?: VideoIntro | null;
  prompts?: ProfilePrompt[];
  bio?: string;
  location?: ProfileLocation;
  /** Written by the moderation function only. */
  moderation?: { lastRejection?: { reason: string; at: { toMillis(): number } | null } };
};

export type NotificationPrefs = {
  newMatch?: boolean;
  voiceMessage?: boolean;
  textPhoto?: boolean;
  unlock?: boolean;
  expiry?: boolean;
};

export type Preferences = {
  showMe?: ShowMe;
  ageRange?: { min: number; max: number };
  maxDistanceKm?: number;
  /** When false, others don’t see your age on Discover. */
  showAge?: boolean;
  /** When false, others don’t see how far away you are. */
  showDistance?: boolean;
  notifications?: NotificationPrefs;
};
