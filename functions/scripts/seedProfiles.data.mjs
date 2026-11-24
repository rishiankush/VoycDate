// Test profiles for development. Photos are AI-generated and video intros combine them with macOS text-to-speech,
// so none of them depict real people.

const ALL_STEPS = ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '4.1', '4.2', '4.3', '4.4', '5.1', '5.2', '5.4', '5.5', '5.6'];

export const COMPLETED_ONBOARDING = { status: 'completed', currentStep: '5.6', completedSteps: ALL_STEPS };

/** distanceKm and bearing place each profile around the centre point. */
export const SEED_PROFILES = [
  {
    key: 'olivia', firstName: 'Olivia', birthDate: '1997-04-12', gender: ['woman', 'woman'], showMe: 'men',
    intent: 'long-term', heightCm: 168, distanceKm: 3, bearing: 20, likesYou: true, voiceMs: 11940,
    interests: ['Hiking', 'Coffee runs', 'Photography', 'Road trips'], values: ['Curiosity', 'Kindness', 'Humour'],
    habits: { drinking: 'Socially', smoking: 'Never', exercise: 'Often' }, family: { haveKids: 'No kids', wantKids: 'Want kids' },
    beliefs: { religion: 'Spiritual' },
    bio: 'Product designer who would rather be on a trail. Weekends are for Marin hikes and finding the perfect flat white.',
    prompts: [
      ['My perfect Sunday is…', 'Sunrise hike, long brunch, then a nap I refuse to apologise for.'],
      ['A green flag I look for…', 'You ask follow-up questions and actually listen to the answers.'],
    ],
  },
  {
    key: 'maya', firstName: 'Maya', birthDate: '1999-08-03', gender: ['woman', 'woman'], showMe: 'everyone',
    intent: 'dating', heightCm: 162, distanceKm: 5, bearing: 110, likesYou: true, voiceMs: 11646,
    interests: ['Yoga', 'Cooking', 'Travel', 'Brunch'], values: ['Empathy', 'Honesty', 'Family'],
    habits: { drinking: 'Rarely', smoking: 'Never', exercise: 'Every day' }, family: { haveKids: 'No kids', wantKids: 'Open to kids' },
    bio: 'ER nurse by night, yoga person by morning. I make a mean pozole and I will judge your taco order (lovingly).',
    prompts: [['The way to win me over is…', 'Bring snacks. Remember my coffee order. Be nice to waiters.']],
  },
  {
    key: 'sofia', firstName: 'Sofia', birthDate: '1995-01-22', gender: ['woman', 'woman'], showMe: 'men',
    intent: 'long-term', heightCm: 165, distanceKm: 7, bearing: 200,
    interests: ['Museums', 'Art', 'Design', 'Live music'], values: ['Curiosity', 'Ambition', 'Open-mindedness'],
    habits: { drinking: 'Socially', smoking: 'Never', exercise: 'Sometimes' }, family: { haveKids: 'No kids', wantKids: 'Not sure yet' },
    bio: 'Architect. I notice buildings before people, so please stand somewhere with good light.',
    prompts: [
      ['I geek out on…', 'Mid-century modern houses and anyone who can explain jazz to me.'],
      ['Together, we could…', 'Spend a whole Saturday at SFMOMA and then argue about it over dinner.'],
    ],
  },
  {
    key: 'priya', firstName: 'Priya', birthDate: '1998-06-30', gender: ['woman', 'woman'], showMe: 'men',
    intent: 'life-partner', heightCm: 160, distanceKm: 4, bearing: 70, likesYou: true, voiceMs: 11998,
    interests: ['Running', 'Books', 'Food spots', 'Podcasts'], values: ['Honesty', 'Ambition', 'Family'],
    habits: { drinking: 'Rarely', smoking: 'Never', exercise: 'Every day' }, family: { haveKids: 'No kids', wantKids: 'Want kids' },
    beliefs: { religion: 'Hindu' },
    bio: 'Software engineer, morning runner, aspiring dumpling expert. Looking for my favourite person to try new restaurants with.',
    prompts: [['My simple pleasures…', 'Chai on a foggy morning, a good audiobook and a perfectly ripe mango.']],
  },
  {
    key: 'chloe', firstName: 'Chloe', birthDate: '2001-02-14', gender: ['woman', 'woman'], showMe: 'everyone',
    intent: 'not-sure', heightCm: 170, distanceKm: 9, bearing: 300,
    interests: ['Concerts', 'Film', 'Board games', 'Comedy'], values: ['Humour', 'Loyalty', 'Curiosity'],
    habits: { drinking: 'Socially', smoking: 'Never', exercise: 'Sometimes' }, family: { haveKids: 'No kids', wantKids: 'Not sure yet' },
    bio: 'Grad student, part-time festival goer, full-time quoter of movies nobody else has seen.',
    prompts: [['Two truths and a lie…', 'I have seen Phoebe Bridgers live 7 times, I can juggle, I hate popcorn.']],
  },
  {
    key: 'hannah', firstName: 'Hannah', birthDate: '1993-10-05', gender: ['woman', 'woman'], showMe: 'men',
    intent: 'long-term', heightCm: 172, distanceKm: 12, bearing: 160, voiceMs: 10703,
    interests: ['Baking', 'Dogs', 'Gardening', 'Books'], values: ['Kindness', 'Patience', 'Family'],
    habits: { drinking: 'Rarely', smoking: 'Never', exercise: 'Often' }, family: { haveKids: 'No kids', wantKids: 'Want kids' },
    beliefs: { religion: 'Christian' },
    bio: 'Third-grade teacher. My golden retriever Biscuit is the real catch here. I come with sourdough.',
    prompts: [
      ['I’m looking for someone who…', 'Wants a home full of plants, dogs and slightly burnt bread.'],
      ['My most irrational fear…', 'Running out of flour on a Sunday.'],
    ],
  },
  {
    key: 'aisha', firstName: 'Aisha', birthDate: '1996-03-18', gender: ['woman', 'woman'], showMe: 'men',
    intent: 'dating', heightCm: 167, distanceKm: 6, bearing: 240, likesYou: true, voiceMs: 10004,
    interests: ['Travel', 'Languages', 'Brunch', 'Museums'], values: ['Confidence', 'Generosity', 'Humour'],
    habits: { drinking: 'Socially', smoking: 'Never', exercise: 'Often' }, family: { haveKids: 'No kids', wantKids: 'Open to kids' },
    beliefs: { religion: 'Muslim' },
    bio: 'Resident physician. I have 14 countries on my list for the next five years and room for a travel buddy.',
    prompts: [['The best trip I ever took…', 'Two weeks in Morocco with nothing planned and zero regrets.']],
  },
  {
    key: 'emma', firstName: 'Emma', birthDate: '2000-11-09', gender: ['woman', 'woman'], showMe: 'everyone',
    intent: 'casual', heightCm: 158, distanceKm: 8, bearing: 340,
    interests: ['Music making', 'Live music', 'Cats', 'Coffee runs'], values: ['Open-mindedness', 'Kindness', 'Curiosity'],
    habits: { drinking: 'Socially', smoking: 'Never', exercise: 'Rarely' }, family: { haveKids: 'No kids', wantKids: 'Not sure yet' },
    bio: 'Barista by day, songwriter by night. My cat Miso approves every date in advance.',
    prompts: [['A shower thought I recently had…', 'Every song is a love song if you sing it to a cat.']],
  },
  {
    key: 'jordan', firstName: 'Jordan', birthDate: '1997-07-21', gender: ['man', 'man'], showMe: 'women',
    intent: 'long-term', heightCm: 183, distanceKm: 3, bearing: 150, likesYou: true, voiceMs: 10158,
    interests: ['Climbing', 'Hiking', 'Coffee runs', 'Camping'], values: ['Honesty', 'Curiosity', 'Loyalty'],
    habits: { drinking: 'Socially', smoking: 'Never', exercise: 'Every day' }, family: { haveKids: 'No kids', wantKids: 'Want kids' },
    bio: 'Climbing gym regular, trail runner, collector of camping stories. Looking for my next adventure partner.',
    prompts: [['Two truths and a lie…', 'I once got lost on Mount Tam, I can cook a great risotto, I have never had a cavity.']],
  },
  {
    key: 'daniel', firstName: 'Daniel', birthDate: '1994-05-02', gender: ['man', 'man'], showMe: 'women',
    intent: 'dating', heightCm: 178, distanceKm: 10, bearing: 30, voiceMs: 10885,
    interests: ['Cooking', 'Food spots', 'Cycling', 'Travel'], values: ['Generosity', 'Humour', 'Family'],
    habits: { drinking: 'Socially', smoking: 'Never', exercise: 'Often' }, family: { haveKids: 'No kids', wantKids: 'Open to kids' },
    bio: 'Chef at a small spot in Hayes Valley. Yes, I will cook for you. No, I will not eat at chain restaurants.',
    prompts: [['The way to win me over is…', 'Tell me the best thing you ate this year and why.']],
  },
  {
    key: 'marcus', firstName: 'Marcus', birthDate: '1998-09-14', gender: ['man', 'man'], showMe: 'everyone',
    intent: 'friends-first', heightCm: 185, distanceKm: 5, bearing: 260, voiceMs: 10350,
    interests: ['Gym', 'Podcasts', 'Running', 'Comedy'], values: ['Loyalty', 'Confidence', 'Humour'],
    habits: { drinking: 'Rarely', smoking: 'Never', exercise: 'Every day' }, family: { haveKids: 'No kids', wantKids: 'Want kids' },
    bio: 'Physical therapist, podcast addict, Dolores Park regular whenever the sun is out.',
    prompts: [['My simple pleasures…', 'A sunny park, a cold brew and a podcast that makes me laugh out loud.']],
  },
  {
    key: 'alex', firstName: 'Alex', birthDate: '1999-12-01', gender: ['nonbinary', 'nonbinary'], showMe: 'everyone',
    intent: 'not-sure', heightCm: 170, distanceKm: 6, bearing: 90,
    interests: ['Art', 'Theatre', 'Volunteering', 'Photography'], values: ['Empathy', 'Open-mindedness', 'Kindness'],
    habits: { drinking: 'Socially', smoking: 'Never', exercise: 'Sometimes' }, family: { haveKids: 'No kids', wantKids: 'Not sure yet' },
    bio: 'Muralist and community theatre nerd. Will drag you to an open-mic and make it fun.',
    prompts: [['Together, we could…', 'Paint a mural, see a show and end the night with dumplings.']],
  },
];
