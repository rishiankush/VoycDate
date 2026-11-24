#!/usr/bin/env node
/**
 * Seeds realistic test profiles into the TUNG Firebase project.
 *
 *   node scripts/seed-test-profiles.mjs          # create or refresh the test profiles
 *   node scripts/seed-test-profiles.mjs --clean  # remove every test profile and its files
 *
 * Authenticates with the account you are signed into with the Firebase CLI (no service-account keys).
 */
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { geohashForLocation } from 'geofire-common';

import discoveryDoc from '../lib/discoveryDoc.js';
import { COMPLETED_ONBOARDING, SEED_PROFILES } from './seedProfiles.data.mjs';

const PROJECT_ID = 'tung-c01e2';
const BUCKET = 'tung-c01e2.firebasestorage.app';
const SEED_PREFIX = 'seed_';
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194, city: 'San Francisco', region: 'California', country: 'United States', countryCode: 'US' };

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const assets = join(here, 'seed-assets');

async function useFirebaseCliCredentials() {
  const globalRoot = execSync('npm root -g').toString().trim();
  const require = createRequire(join(globalRoot, 'firebase-tools', 'package.json'));
  const auth = require('./lib/auth.js');
  const { getCredentialPathAsync } = require('./lib/defaultCredentials.js');
  const account = auth.getProjectDefaultAccount(repoRoot);
  if (!account) throw new Error('Sign in first: firebase login');
  const credentials = JSON.parse(readFileSync(await getCredentialPathAsync(account), 'utf8'));
  const file = join(tmpdir(), `tung-seed-${process.pid}.json`);
  writeFileSync(file, JSON.stringify({ ...credentials, quota_project_id: PROJECT_ID }));
  process.env.GOOGLE_APPLICATION_CREDENTIALS = file;
  console.log(`Using Firebase CLI account ${account.user.email}`);
}

function offset({ lat, lng }, distanceKm, bearingDeg) {
  const R = 6371;
  const b = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const d = distanceKm / R;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(b));
  const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  const round = (n) => Math.round(n * 100) / 100;
  return { lat: round((φ2 * 180) / Math.PI), lng: round((λ2 * 180) / Math.PI) };
}

const ffmpegPath = createRequire(import.meta.url)('ffmpeg-static');

function videoDurationMs(file) {
  let output = '';
  try {
    execSync(`"${ffmpegPath}" -hide_banner -i "${file}"`, { stdio: 'pipe' });
  } catch (error) {
    output = String(error.stderr);
  }
  const match = /Duration: (\d+):(\d+):([\d.]+)/.exec(output);
  return match ? Math.round((Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000) : 9000;
}

/**
 * Seed "intro-*.mp4" files were near-static photos + voiceover, so Discover looked like an image.
 * Rebuild a clearly moving 9:16 intro from the profile photo and that audio.
 */
function buildIntroVideo(photoFile, audioSourceFile) {
  const dir = mkdtempSync(join(tmpdir(), 'tung-seed-video-'));
  const audio = join(dir, 'audio.m4a');
  const streamable = join(dir, 'intro.mp4');
  const poster = join(dir, 'poster.jpg');
  let seconds = 7;
  try {
    execSync(
      `"${ffmpegPath}" -hide_banner -loglevel error -y -i "${audioSourceFile}" -vn -c:a aac -b:a 96k "${audio}"`,
      { stdio: 'pipe' },
    );
    seconds = Math.min(Math.max(videoDurationMs(audioSourceFile) / 1000, 5), 10);
  } catch {
    execSync(
      `"${ffmpegPath}" -hide_banner -loglevel error -y -f lavfi -i anullsrc=r=22050:cl=mono -t ${seconds} -c:a aac "${audio}"`,
      { stdio: 'pipe' },
    );
  }
  const frames = Math.round(seconds * 30);
  // Strong zoom + pan so the card is unmistakably video, not a still.
  const vf = [
    'scale=720:1280:force_original_aspect_ratio=increase',
    'crop=720:1280',
    `zoompan=z='1.08+0.34*on/${frames}':x='iw/2-(iw/zoom/2)+70*sin(2*PI*on/${frames})':y='ih/2-(ih/zoom/2)+45*cos(2*PI*on/${frames})':d=${frames}:s=720x1280:fps=30`,
  ].join(',');
  execSync(
    `"${ffmpegPath}" -hide_banner -loglevel error -y -loop 1 -i "${photoFile}" -i "${audio}" -vf "${vf}" -c:v libx264 -pix_fmt yuv420p -t ${seconds.toFixed(2)} -c:a aac -shortest -movflags +faststart "${streamable}"`,
    { stdio: 'pipe' },
  );
  execSync(
    `"${ffmpegPath}" -hide_banner -loglevel error -y -ss 1.2 -i "${streamable}" -frames:v 1 -q:v 3 "${poster}"`,
    { stdio: 'pipe' },
  );
  return { dir, streamable, poster, durationMs: Math.round(seconds * 1000) };
}

async function upload(bucket, localPath, destination, contentType) {
  const token = randomUUID();
  await bucket.upload(localPath, {
    destination,
    metadata: { contentType, cacheControl: 'public, max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
}

async function realUsers(db) {
  const snap = await db.collection('users').where('onboarding.status', '==', 'completed').get();
  return snap.docs.filter((d) => !d.id.startsWith(SEED_PREFIX) && !d.data().seed);
}

async function findCenter(db, users) {
  // Prefer the most recently updated real profile so seed mode/location match who is testing now.
  let best = null;
  for (const user of users) {
    const profile = (await db.doc(`profiles/${user.id}`).get()).data();
    if (profile?.location?.lat == null) continue;
    const updated = profile.updatedAt?.toMillis?.() ?? user.data().updatedAt?.toMillis?.() ?? 0;
    if (!best || updated > best.updated) {
      best = {
        ...DEFAULT_CENTER,
        ...profile.location,
        owner: profile.firstName,
        mode: profile.mode ?? 'date',
        updated,
      };
    }
  }
  return best ?? { ...DEFAULT_CENTER, mode: 'date' };
}

async function clean(db, bucket) {
  const ids = SEED_PROFILES.map((p) => `${SEED_PREFIX}${p.key}`);
  const writer = db.bulkWriter();
  for (const id of ids) {
    for (const col of ['users', 'profiles', 'preferences', 'discovery']) writer.delete(db.doc(`${col}/${id}`));
    const matches = await db.collection('matches').where('members', 'array-contains', id).get();
    for (const m of matches.docs) {
      const messages = await m.ref.collection('messages').get();
      messages.docs.forEach((msg) => writer.delete(msg.ref));
      writer.delete(m.ref);
    }
    const swipes = await db.collection(`swipes/${id}/outgoing`).get();
    for (const s of swipes.docs) {
      writer.delete(s.ref);
      writer.delete(db.doc(`likesReceived/${s.id}/from/${id}`));
    }
  }
  await writer.close();
  await bucket.deleteFiles({ prefix: 'seed/' });
  console.log(`Removed ${ids.length} test profiles and their files.`);
}

async function seed(db, bucket) {
  const users = await realUsers(db);
  const center = await findCenter(db, users);
  // Discover only shows people in the same mode, so match the real account's Date or Friends mode.
  const mode = center.mode;
  console.log(`Placing ${mode}-mode profiles around ${center.city}${center.owner ? ` (${center.owner}'s location)` : ''}.`);

  for (const p of SEED_PROFILES) {
    const uid = `${SEED_PREFIX}${p.key}`;
    const photoFile = join(assets, `seed-${p.key}.jpg`);
    const photoUrl = await upload(bucket, photoFile, `seed/${uid}/photo-1.jpg`, 'image/jpeg');
    const prepared = buildIntroVideo(photoFile, join(assets, `intro-${p.key}.mp4`));
    const videoPath = `seed/${uid}/intro.mp4`;
    const posterPath = `seed/${uid}/intro-poster.jpg`;
    const videoUrl = await upload(bucket, prepared.streamable, videoPath, 'video/mp4');
    const posterUrl = await upload(bucket, prepared.poster, posterPath, 'image/jpeg');
    rmSync(prepared.dir, { recursive: true, force: true });

    const point = offset(center, p.distanceKm, p.bearing);
    const user = {
      phoneNumber: '',
      status: 'active',
      onboarding: { ...COMPLETED_ONBOARDING, updatedAt: FieldValue.serverTimestamp() },
      birthDate: p.birthDate,
      seed: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const profile = {
      firstName: p.firstName,
      gender: { identity: p.gender[0], group: p.gender[1], showOnProfile: true },
      mode,
      intent: p.intent,
      heightCm: p.heightCm,
      interests: p.interests,
      values: p.values,
      habits: p.habits,
      family: p.family,
      beliefs: p.beliefs ?? {},
      photos: [{ id: 'photo-1', path: `seed/${uid}/photo-1.jpg`, url: photoUrl, width: 864, height: 1152 }],
      // Seed intros are pre-made; mark approved so Discover cards play video immediately (live users still go through moderation).
      videoIntro: {
        path: videoPath,
        url: videoUrl,
        posterPath,
        posterUrl,
        durationMs: prepared.durationMs,
        status: 'approved',
        transcript: null,
      },
      prompts: p.prompts.map(([question, answer], i) => ({ id: `prompt-${i + 1}`, question, answer })),
      bio: p.bio,
      location: {
        city: center.city,
        region: center.region ?? null,
        country: center.country ?? null,
        countryCode: center.countryCode ?? null,
        geohash: geohashForLocation([point.lat, point.lng]),
        lat: point.lat,
        lng: point.lng,
        source: 'manual',
      },
      seed: true,
    };
    const prefs = { showMe: p.showMe, ageRange: { min: 18, max: 80 }, maxDistanceKm: 80 };

    const batch = db.batch();
    batch.set(db.doc(`users/${uid}`), user);
    batch.set(db.doc(`profiles/${uid}`), { ...profile, updatedAt: FieldValue.serverTimestamp() });
    batch.set(db.doc(`preferences/${uid}`), { ...prefs, updatedAt: FieldValue.serverTimestamp() });
    batch.set(db.doc(`discovery/${uid}`), {
      ...discoveryDoc.buildDiscoveryDoc(uid, user, profile, prefs),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (p.likesYou) {
      for (const real of users) {
        batch.set(db.doc(`swipes/${uid}/outgoing/${real.id}`), { action: 'like', mode, createdAt: FieldValue.serverTimestamp() });
        batch.set(db.doc(`likesReceived/${real.id}/from/${uid}`), { mode, createdAt: FieldValue.serverTimestamp() });
      }
    }
    await batch.commit();
    console.log(`  ✓ ${p.firstName} (video intro ready)${p.likesYou ? ' (already likes you)' : ''}`);
  }
  console.log(`Seeded ${SEED_PROFILES.length} profiles. Real accounts that will get likes: ${users.length}.`);
}

const matchIdFor = (a, b) => [a, b].sort().join('_');
const summary = (p) => ({ firstName: p.firstName, photoUrl: p.photos?.[0]?.url ?? null });

/**
 * Test conversations for each real account: one where Hannah has already sent a voice note (the live
 * transcription function captions it) and one where the real user sends the first voice note to Sofia.
 */
async function seedChats(db, bucket) {
  const users = await realUsers(db);
  for (const real of users) {
    const realProfile = (await db.doc(`profiles/${real.id}`).get()).data() ?? {};
    const mode = realProfile.mode ?? 'date';

    for (const [key, realSendsFirst] of [['hannah', false], ['sofia', true]]) {
      const seedId = `${SEED_PREFIX}${key}`;
      const seedProfile = (await db.doc(`profiles/${seedId}`).get()).data();
      if (!seedProfile) throw new Error('Run npm run seed first.');
      const matchId = matchIdFor(real.id, seedId);
      const matchRef = db.doc(`matches/${matchId}`);
      if ((await matchRef.get()).exists) {
        console.log(`  – chat with ${seedProfile.firstName} already exists`);
        continue;
      }

      const match = {
        members: [real.id, seedId].sort(),
        people: { [real.id]: summary(realProfile), [seedId]: summary(seedProfile) },
        mode,
        firstSenderId: realSendsFirst ? real.id : seedId,
        stage: 'awaiting_first_voice',
        status: 'active',
        voice: { qualifiedCount: 0, perUser: {} },
        unread: {},
        lastMessageAt: null,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
      };

      if (!realSendsFirst) {
        const messageId = `seed${Date.now().toString(36)}`;
        const path = `matches/${matchId}/voice/${messageId}.m4a`;
        const url = await upload(bucket, join(assets, `message-${key}.m4a`), path, 'audio/mp4');
        const durationMs = 10011;
        Object.assign(match, {
          stage: 'voice',
          expiresAt: null,
          voice: { qualifiedCount: 1, perUser: { [seedId]: 1 }, totalDurationMs: durationMs },
          unread: { [real.id]: 1 },
          lastMessage: { senderId: seedId, type: 'voice', durationMs },
          lastMessageAt: FieldValue.serverTimestamp(),
        });
        await matchRef.set(match);
        await matchRef.collection('messages').doc(messageId).set({
          senderId: seedId,
          type: 'voice',
          audioPath: path,
          audioUrl: url,
          durationMs,
          waveform: [],
          counts: true,
          transcript: { status: 'pending' },
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        await matchRef.set(match);
      }
      console.log(`  ✓ chat with ${seedProfile.firstName}${realSendsFirst ? ' (you send first)' : ' (voice note waiting for you)'}`);
    }
  }
}

await useFirebaseCliCredentials();
initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID, storageBucket: BUCKET });
const db = getFirestore();
const bucket = getStorage().bucket();

if (process.argv.includes('--clean')) await clean(db, bucket);
else if (process.argv.includes('--chats')) await seedChats(db, bucket);
else await seed(db, bucket);
