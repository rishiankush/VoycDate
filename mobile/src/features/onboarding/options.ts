import type { GenderGroup, Mode, ShowMe } from './types';

export type Option<T extends string = string> = { value: T; label: string; description?: string };

export const GENDERS: (Option & { group: GenderGroup })[] = [
  { value: 'woman', label: 'Woman', group: 'woman' },
  { value: 'man', label: 'Man', group: 'man' },
  { value: 'nonbinary', label: 'Non-binary', group: 'nonbinary' },
];

export const MORE_GENDERS: (Option & { group: GenderGroup })[] = [
  { value: 'agender', label: 'Agender', group: 'nonbinary' },
  { value: 'bigender', label: 'Bigender', group: 'nonbinary' },
  { value: 'genderfluid', label: 'Genderfluid', group: 'nonbinary' },
  { value: 'genderqueer', label: 'Genderqueer', group: 'nonbinary' },
  { value: 'intersex', label: 'Intersex', group: 'nonbinary' },
  { value: 'pangender', label: 'Pangender', group: 'nonbinary' },
  { value: 'trans-woman', label: 'Trans woman', group: 'woman' },
  { value: 'trans-man', label: 'Trans man', group: 'man' },
  { value: 'two-spirit', label: 'Two-spirit', group: 'nonbinary' },
  { value: 'questioning', label: 'Questioning', group: 'nonbinary' },
];

export const MODES: Option<Mode>[] = [
  { value: 'date', label: 'Date', description: 'Find a partner or see where things go' },
  { value: 'friends', label: 'Friends', description: 'Meet new people for friendship' },
];

export const SHOW_ME: Option<ShowMe>[] = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'everyone', label: 'Everyone' },
];

export const INTENTS: Option[] = [
  { value: 'long-term', label: 'Long-term partner', description: 'Something that lasts' },
  { value: 'life-partner', label: 'Life partner', description: 'Ready to build a life together' },
  { value: 'dating', label: 'Dating', description: 'See where it goes' },
  { value: 'casual', label: 'Something casual', description: 'Fun, easy-going dates' },
  { value: 'friends-first', label: 'Friends first', description: 'Start with a real connection' },
  { value: 'not-sure', label: 'Not sure yet', description: 'Open to anything' },
];

export const INTEREST_CATEGORIES: { title: string; options: string[] }[] = [
  {
    title: 'Going out',
    options: ['Live music', 'Concerts', 'Comedy', 'Theatre', 'Museums', 'Bars', 'Coffee runs', 'Brunch'],
  },
  {
    title: 'Staying in',
    options: ['Cooking', 'Baking', 'Books', 'Film', 'Gaming', 'Board games', 'Podcasts', 'Gardening'],
  },
  {
    title: 'Active',
    options: ['Hiking', 'Running', 'Yoga', 'Gym', 'Cycling', 'Swimming', 'Climbing', 'Dancing'],
  },
  {
    title: 'Creative',
    options: ['Photography', 'Art', 'Writing', 'Design', 'Music making', 'Fashion', 'DIY'],
  },
  {
    title: 'Exploring',
    options: ['Travel', 'Road trips', 'Camping', 'Beaches', 'Food spots', 'Languages', 'Volunteering'],
  },
  {
    title: 'Pets',
    options: ['Dogs', 'Cats', 'Animals'],
  },
];

export const MAX_INTERESTS = 8;

export const VALUES: string[] = [
  'Honesty',
  'Kindness',
  'Humour',
  'Ambition',
  'Loyalty',
  'Curiosity',
  'Empathy',
  'Confidence',
  'Generosity',
  'Open-mindedness',
  'Patience',
  'Family',
];

export const MAX_VALUES = 3;

export const HABITS = {
  drinking: {
    label: 'Drinking',
    options: ['Never', 'Rarely', 'Socially', 'Often', 'Sober', 'Prefer not to say'],
  },
  smoking: {
    label: 'Smoking',
    options: ['Never', 'Socially', 'Regularly', 'Trying to quit', 'Prefer not to say'],
  },
  exercise: {
    label: 'Exercise',
    options: ['Every day', 'Often', 'Sometimes', 'Rarely', 'Prefer not to say'],
  },
} as const;

export const FAMILY = {
  haveKids: {
    label: 'Do you have kids?',
    options: ['No kids', 'Have kids', 'Prefer not to say'],
  },
  wantKids: {
    label: 'Do you want kids?',
    options: ['Want kids', 'Open to kids', 'Don’t want kids', 'Not sure yet', 'Prefer not to say'],
  },
} as const;

export const BELIEFS = {
  religion: {
    label: 'Religion',
    options: [
      'Agnostic',
      'Atheist',
      'Buddhist',
      'Christian',
      'Hindu',
      'Jewish',
      'Muslim',
      'Sikh',
      'Spiritual',
      'Other',
      'Prefer not to say',
    ],
  },
  politics: {
    label: 'Politics',
    options: ['Apolitical', 'Liberal', 'Moderate', 'Conservative', 'Other', 'Prefer not to say'],
  },
} as const;

export const PROMPTS: string[] = [
  'My perfect Sunday is…',
  'The way to win me over is…',
  'I’m weirdly attracted to…',
  'A shower thought I recently had…',
  'My most irrational fear…',
  'I geek out on…',
  'Two truths and a lie…',
  'The best trip I ever took…',
  'I’m looking for someone who…',
  'My simple pleasures…',
  'A green flag I look for…',
  'Together, we could…',
];

export const MAX_PROMPTS = 3;
export const PROMPT_ANSWER_MAX = 150;
export const BIO_MAX = 300;
export const MAX_PHOTOS = 6;
export const MIN_PHOTOS = 1;
export const VOICE_MIN_MS = 3_000;
export const VOICE_MAX_MS = 30_000;
export const VIDEO_MAX_SECONDS = 10;
export const VIDEO_MIN_SECONDS = 3;

export const AGE_MIN = 18;
export const AGE_MAX = 80;
export const DISTANCE_MIN_KM = 2;
export const DISTANCE_MAX_KM = 160;
export const DISTANCE_DEFAULT_KM = 40;
export const HEIGHT_MIN_CM = 140;
export const HEIGHT_MAX_CM = 215;
