import { FieldValue, type DocumentData, type DocumentReference } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { db } from './shared';
import { deleteQuietly, FRAME_WIDTH, processVideo, uploadWithDownloadUrl } from './moderation/media';
import { annotateImages, hasClearFace, isUnsafe } from './moderation/vision';
import { GROQ_API_KEY } from './secrets';
import { transcribe } from './transcription/groq';

const MIN_FACE_FRAMES = 2;
const MIN_SPOKEN_WORDS = 3;

const REASONS = {
  unsafe: 'This video can’t be used because it may contain inappropriate content.',
  noFace: 'We couldn’t see your face clearly. Record facing the camera in good light.',
  noSpeech: 'We couldn’t hear you. Say your name, your age and where you’re from.',
  error: 'We couldn’t check your video right now. Please try again.',
};

const PHOTO_REJECTED = 'A photo was removed because it doesn’t meet our community guidelines.';

type VideoIntro = { path: string; durationMs: number; status: string; checkNonce?: number | string };

/** Verifies a new video intro shows a real person speaking, with no explicit or violent content. */
async function checkVideo(ref: DocumentReference, video: VideoIntro) {
  const { frames, audio, streamable } = await processVideo(video.path, video.durationMs);
  const annotations = await annotateImages(
    frames.map((f) => ({ content: f.toString('base64') })),
    ['FACE_DETECTION', 'SAFE_SEARCH_DETECTION'],
  );

  let transcript: string | null = null;
  if (audio) {
    try {
      transcript = (await transcribe(audio, 'intro.m4a', 'audio/mp4', GROQ_API_KEY.value())).text;
    } catch (error) {
      // A transcription outage shouldn't block a genuine user, so the speech check is skipped instead.
      logger.warn('Intro transcription unavailable', { error: String(error) });
    }
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

  const base = video.path.replace(/\.[^./]+$/, '');
  const published = reason
    ? null
    : {
        path: `${base}-web.mp4`,
        posterPath: `${base}-poster.jpg`,
        url: await uploadWithDownloadUrl(`${base}-web.mp4`, streamable, 'video/mp4'),
        posterUrl: await uploadWithDownloadUrl(`${base}-poster.jpg`, frames[1] ?? frames[0], 'image/jpeg'),
      };

  const applied = await db().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data()?.videoIntro;
    if (current?.path !== video.path) return false;
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
    });
    return true;
  });

  // The original upload is replaced by the streaming copy, or discarded when rejected.
  if (applied) await deleteQuietly(video.path);
  else if (published) await Promise.all([deleteQuietly(published.path), deleteQuietly(published.posterPath)]);
  logger.info('Video intro checked', { path: video.path, approved: !reason, faceFrames, unsafe, spokenWords });
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

export const moderateProfileMedia = onDocumentWritten(
  { document: 'profiles/{uid}', secrets: [GROQ_API_KEY], memory: '1GiB', timeoutSeconds: 120 },
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
        await after.ref.update({ 'videoIntro.status': 'error', 'videoIntro.rejectionReason': REASONS.error });
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
