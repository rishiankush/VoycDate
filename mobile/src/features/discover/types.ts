export type DiscoverCard = {
  uid: string;
  firstName: string;
  age: number | null;
  distanceKm: number | null;
  gender: string | null;
  intent: string | null;
  heightCm: number | null;
  interests: string[];
  values: string[];
  habits: { drinking?: string; smoking?: string; exercise?: string };
  family: { haveKids?: string; wantKids?: string };
  beliefs: { religion?: string; politics?: string };
  photos: { url: string; width: number; height: number }[];
  video: { url: string; posterUrl: string | null; durationMs: number; transcript: string | null } | null;
  prompts: { question: string; answer: string }[];
  bio: string;
  city: string;
  region: string | null;
  countryCode: string | null;
  verified: boolean;
  /** Date vs Friends — only same-mode people appear in each feed. */
  mode?: 'date' | 'friends';
};

export type SwipeAction = 'like' | 'pass' | 'save';

export type MatchResult = {
  matchId: string;
  firstSenderId: string;
  other: { uid: string; firstName: string; photoUrl: string | null };
};
