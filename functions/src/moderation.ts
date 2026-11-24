import { randomUUID } from 'node:crypto';

import { FieldValue, type DocumentData, type DocumentReference } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';

import { db, requireUid } from './shared';
import { deleteQuietly, FRAME_WIDTH, processVideo, uploadWithDownloadUrl } from './moderation/media';
import { annotateImages, hasClearFace, isUnsafe } from './moderation/vision';
import { transcribe } from './transcription/groq';

const MIN_FACE_FRAMES = 2;
const MIN_SPOKEN_WORDS = 3;
const CLAIM_TTL_MS = 150_000;

const REASONS = {
  unsafe: 'This video can’t be used because it may contain inappropriate content.',
  noFace: 'We couldn’t see your face clearly. Record facing the camera in good light.',
  noSpeech: 'We couldn’t hear you. Say your name, your age and where you’re from.',
  error: 'We couldn’t check your video right now. Please try again.',
};

const PHOTO_REJECTED = 'A photo was removed because it doesn’t meet our community guidelines.';

type VideoIntro = {
  path: string;
  durationMs: number;
  status: string;
  checkNonce?: number | string;
  checkClaim?: string;
  checkClaimedAt?: { toMillis(): number };
};

/** Only one of callable + Firestore trigger should process the same pending upload. */
async function claimVideoCheck(ref: DocumentReference, video: VideoIntro) {
  const claimId = randomUUID();
  return db().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data()?.videoIntro as VideoIntro | undefined;
    if (!current || current.path !== video.path || current.status !== 'pending') return null;
    const claimedAt = current.checkClaimedAt?.toMillis?.() ?? 0;
    if (current.checkClaim && Date.now() - claimedAt < CLAIM_TTL_MS) return null;
    tx.update(ref, {
      'videoIntro.checkClaim': claimId,
      'videoIntro.checkClaimedAt': FieldValue.serverTimestamp(),
    });
    return claimId;
  });
}

/** Verifies a new video intro shows a real person speaking, with no explicit or violent content. */
async function checkVideo(ref: DocumentReference, video: VideoIntro) {
  const claimId = await claimVideoCheck(ref, video);
  if (!claimId) {
    logger.info('Video intro check skipped (already claimed)', { path: video.path });
    return;
  }

  const { frames, audio, streamable } = await processVideo(video.path, video.durationMs);
  const annotations = await annotateImages(
    frames.map((f) => ({ content: f.toString('base64') })),
    ['FACE_DETECTION', 'SAFE_SEARCH_DETECTION'],
  );

  let transcript: string | null = null;
  const groqKey = process.env.GROQ_API_KEY;
  if (audio && groqKey) {
    try {
      transcript = (await transcribe(audio, 'intro.m4a', 'audio/mp4', groqKey)).text;
    } catch (error) {
      // A transcription outage shouldn't block a genuine user, so the speech check is skipped instead.
      logger.warn('Intro transcription unavailable', { error: String(error) });
    }
  } else if (audio && !groqKey) {
    logger.warn('GROQ_API_KEY not set; skipping intro speech check');
  }

  const unsafe = annotations.some((a) => isUnsafe(a.safeSearchAnnotation));
  const faceFrames = annotations.filter((a) => hasClearFace(a, FRAME_WIDTH)).length;
  const spokenWords = transcript?.split(/\s+/).filter(Boolean).length ?? null;

  const reason = unsafe
    ? REASONS.unsafe
    : faceFrames < MIN_FACE_FRAMES
      ? REASONS.noFace
      : spokenWords !== null && spokenWords < MIN_SPOKEN_WORDS
        ? REASONS.noSpeech
        : null;

  // Unique publish paths so a losing concurrent run never deletes the winner's files.
  const base = video.path.replace(/\.[^./]+$/, '');
  const publishId = `${video.checkNonce ?? Date.now()}-${claimId.slice(0, 8)}`;
  const published = reason
    ? null
    : {
        path: `${base}-${publishId}-web.mp4`,
        posterPath: `${base}-${publishId}-poster.jpg`,
        url: await uploadWithDownloadUrl(`${base}-${publishId}-web.mp4`, streamable, 'video/mp4'),
        posterUrl: await uploadWithDownloadUrl(
          `${base}-${publishId}-poster.jpg`,
          frames[1] ?? frames[0],
          'image/jpeg',
        ),
      };

  const applied = await db().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data()?.videoIntro as VideoIntro | undefined;
    if (current?.path !== video.path || current?.checkClaim !== claimId) return false;
    tx.update(ref, {
      ...(published && {
        'videoIntro.path': published.path,
        'videoIntro.url': published.url,
        'videoIntro.posterPath': published.posterPath,
        'videoIntro.posterUrl': published.posterUrl,
      }),
      'videoIntro.status': reason ? 'rejected' : 'approved',
      'videoIntro.rejectionReason': reason,
      'videoIntro.transcript': transcript,
      'videoIntro.checks': { faceFrames, unsafe, spokenWords },
      'videoIntro.checkedAt': FieldValue.serverTimestamp(),
      'videoIntro.checkClaim': FieldValue.delete(),
      'videoIntro.checkClaimedAt': FieldValue.delete(),
    });
    return true;
  });

  if (applied) await deleteQuietly(video.path);
  else if (published) await Promise.all([deleteQuietly(published.path), deleteQuietly(published.posterPath)]);
  logger.info('Video intro checked', { path: video.path, approved: !reason, faceFrames, unsafe, spokenWords, applied });
}

/** Removes newly added photos that contain explicit or violent content. */
async function checkPhotos(ref: DocumentReference, photos: DocumentData[]) {
  const bucket = getStorage().bucket().name;
  const annotations = await annotateImages(
    photos.map((p) => ({ source: { gcsImageUri: `gs://${bucket}/${p.path}` } })),
    ['SAFE_SEARCH_DETECTION'],
  );
  const rejected = photos.filter((_, i) => isUnsafe(annotations[i].safeSearchAnnotation));

  await db().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() ?? {};
    const rejectedIds = new Set(rejected.map((p) => p.id));
    const update: Record<string, unknown> = {
      'moderation.checkedPhotoIds': FieldValue.arrayUnion(...photos.map((p) => p.id)),
    };
    if (rejected.length) {
      update.photos = (current.photos ?? []).filter((p: DocumentData) => !rejectedIds.has(p.id));
      update['moderation.lastRejection'] = { reason: PHOTO_REJECTED, at: FieldValue.serverTimestamp() };
    }
    tx.update(ref, update);
  });
  await Promise.all(rejected.map((p) => deleteQuietly(p.path)));
  if (rejected.length) logger.info('Photos removed by moderation', { profile: ref.path, count: rejected.length });
}

async function runPendingVideoCheck(uid: string) {
  const ref = db().doc(`profiles/${uid}`);
  const snap = await ref.get();
  const video = snap.data()?.videoIntro as VideoIntro | undefined;
  if (!snap.exists || video?.status !== 'pending' || !video.path) {
    return { status: video?.status ?? null };
  }
  try {
    await checkVideo(ref, video);
  } catch (error) {
    logger.error('Video intro check failed', { uid, error: String(error) });
    await ref.update({
      'videoIntro.status': 'error',
      'videoIntro.rejectionReason': REASONS.error,
      'videoIntro.checkClaim': FieldValue.delete(),
      'videoIntro.checkClaimedAt': FieldValue.delete(),
    });
  }
  const latest = (await ref.get()).data()?.videoIntro as VideoIntro | undefined;
  return { status: latest?.status ?? null };
}

/** Client-invoked check so onboarding does not depend only on Eventarc Firestore triggers. */
export const checkVideoIntro = onCall({ memory: '1GiB', timeoutSeconds: 120 }, async (request) => {
  const uid = requireUid(request);
  return runPendingVideoCheck(uid);
});

export const moderateProfileMedia = onDocumentWritten(
  { document: 'profiles/{uid}', memory: '1GiB', timeoutSeconds: 120 },
  async (event) => {
    const after = event.data?.after;
    const data = after?.data();
    if (!after?.exists || !data) return;
    const before = event.data?.before.data();

    const video = data.videoIntro as VideoIntro | undefined;
    const beforeVideo = before?.videoIntro as VideoIntro | undefined;
    // New upload, or an explicit client retry (same file, bumped checkNonce).
    const isNewPendingVideo =
      video?.status === 'pending' &&
      Boolean(video.path) &&
      (beforeVideo?.path !== video.path ||
        beforeVideo?.status !== 'pending' ||
        beforeVideo?.checkNonce !== video.checkNonce);

    if (isNewPendingVideo) {
      try {
        await checkVideo(after.ref, video);
      } catch (error) {
        logger.error('Video intro check failed', { uid: event.params.uid, error: String(error) });
        await after.ref.update({
          'videoIntro.status': 'error',
          'videoIntro.rejectionReason': REASONS.error,
          'videoIntro.checkClaim': FieldValue.delete(),
          'videoIntro.checkClaimedAt': FieldValue.delete(),
        });
      }
    }

    const checked = new Set<string>(data.moderation?.checkedPhotoIds ?? []);
    const newPhotos = (data.photos ?? []).filter((p: DocumentData) => p?.id && p.path && !checked.has(p.id));
    if (newPhotos.length) {
      try {
        await checkPhotos(after.ref, newPhotos);
      } catch (error) {
        logger.error('Photo moderation failed', { uid: event.params.uid, error: String(error) });
      }
    }
  },
);
