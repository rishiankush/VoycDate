#!/usr/bin/env node
/** Explains why each test profile is or isn't in a real user's Discover feed: node scripts/diagnose-feed.mjs */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { distanceBetween } from 'geofire-common';

import shared from '../lib/shared.js';

const PROJECT_ID = 'voyc-date';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const globalRoot = execSync('npm root -g').toString().trim();
const req = createRequire(join(globalRoot, 'firebase-tools', 'package.json'));
const account = req('./lib/auth.js').getProjectDefaultAccount(repoRoot);
const creds = JSON.parse(readFileSync(await req('./lib/defaultCredentials.js').getCredentialPathAsync(account), 'utf8'));
const file = join(tmpdir(), `tung-diag-${process.pid}.json`);
writeFileSync(file, JSON.stringify({ ...creds, quota_project_id: PROJECT_ID }));
process.env.GOOGLE_APPLICATION_CREDENTIALS = file;

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

const users = (await db.collection('users').where('onboarding.status', '==', 'completed').get()).docs.filter(
  (d) => !d.id.startsWith('seed_'),
);
const seeds = (await db.collection('discovery').where('active', '==', true).get()).docs.filter((d) => d.id.startsWith('seed_'));

for (const user of users) {
  const [meSnap, prefsSnap] = await db.getAll(db.doc(`discovery/${user.id}`), db.doc(`preferences/${user.id}`));
  const me = meSnap.data();
  const prefs = prefsSnap.data() ?? {};
  console.log(`\nUser ${user.id}`);
  if (!me) {
    console.log('  No discovery record yet (it is created on the first Discover request).');
    continue;
  }
  const myAge = shared.ageFromBirthDate(me.birthDate);
  const showMe = prefs.showMe ?? me.showMe;
  const range = prefs.ageRange ?? me.ageRange;
  const maxKm = prefs.maxDistanceKm ?? me.maxDistanceKm;
  const myMode = me.mode === 'friends' ? 'friends' : 'date';
  console.log(`  active=${me.active} mode=${myMode} gender=${me.genderGroup} showMe=${showMe} age=${myAge} range=${range.min}-${range.max} distance=${maxKm}km at ${me.lat},${me.lng}`);
  if (seeds.length === 0) console.log('  (no active seed_ discovery docs — run npm run seed)');

  for (const s of seeds) {
    const c = s.data();
    const theirMode = c.mode === 'friends' ? 'friends' : 'date';
    const reasons = [];
    if (theirMode !== myMode) reasons.push(`mode ${theirMode}`);
    const km = distanceBetween([me.lat, me.lng], [c.lat, c.lng]);
    if (km > maxKm) reasons.push(`${km.toFixed(1)}km > your ${maxKm}km`);
    if (!shared.wantsToSee(showMe, c.genderGroup)) reasons.push(`you show ${showMe}, they are ${c.genderGroup}`);
    if (!shared.wantsToSee(c.showMe, me.genderGroup)) reasons.push(`they show ${c.showMe}, you are ${me.genderGroup}`);
    const age = shared.ageFromBirthDate(c.birthDate);
    if (age < range.min || (range.max < 80 && age > range.max)) reasons.push(`age ${age} outside your ${range.min}-${range.max}`);
    const [modeSwipe, legacySwipe] = await db.getAll(
      db.doc(`swipes/${user.id}/outgoing/${s.id}_${myMode}`),
      db.doc(`swipes/${user.id}/outgoing/${s.id}`),
    );
    if (modeSwipe.exists || (myMode === 'date' && legacySwipe.exists)) reasons.push('already swiped');
    console.log(`  ${reasons.length ? '✗' : '✓'} ${c.card.firstName} (${age}, ${c.genderGroup}, ${km.toFixed(1)}km)${reasons.length ? ` — ${reasons.join('; ')}` : ''}`);
  }
}
