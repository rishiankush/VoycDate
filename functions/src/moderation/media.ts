import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { getStorage } from 'firebase-admin/storage';
import ffmpegPath from 'ffmpeg-static';

const run = promisify(execFile);

export const FRAME_WIDTH = 480;

async function ffmpeg(args: string[]) {
  if (!ffmpegPath) throw new Error('ffmpeg binary unavailable');
  await run(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { timeout: 30_000 });
}

/**
 * Downloads a video once and derives everything moderation needs: evenly spaced JPEG frames, the audio track,
 * and a streaming-friendly MP4 (moov atom first, no re-encode) so playback starts before the file finishes loading.
 */
export async function processVideo(storagePath: string, durationMs: number, frameCount = 3) {
  const dir = await mkdtemp(join(tmpdir(), 'tung-video-'));
  try {
    const input = join(dir, 'input');
    await getStorage().bucket().file(storagePath).download({ destination: input });

    const seconds = Math.max(durationMs / 1000, 1);
    const frames: Buffer[] = [];
    for (let i = 0; i < frameCount; i += 1) {
      const t = ((i + 1) * seconds) / (frameCount + 1);
      const out = join(dir, `frame-${i}.jpg`);
      await ffmpeg(['-ss', t.toFixed(2), '-i', input, '-frames:v', '1', '-vf', `scale=${FRAME_WIDTH}:-2`, '-q:v', '4', out]);
      frames.push(await readFile(out));
    }

    let audio: Buffer | null = null;
    try {
      const out = join(dir, 'audio.m4a');
      await ffmpeg(['-i', input, '-vn', '-ac', '1', '-c:a', 'aac', '-b:a', '64k', out]);
      audio = await readFile(out);
    } catch {
      audio = null;
    }

    const streamable = join(dir, 'stream.mp4');
    await ffmpeg(['-i', input, '-c', 'copy', '-movflags', '+faststart', streamable]);
    return { frames, audio, streamable: await readFile(streamable) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Uploads bytes with a Firebase download token and returns the public download URL. */
export async function uploadWithDownloadUrl(path: string, data: Buffer, contentType: string) {
  const bucket = getStorage().bucket();
  const token = randomUUID();
  await bucket.file(path).save(data, {
    contentType,
    metadata: { cacheControl: 'public, max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

export async function deleteQuietly(path: string) {
  await getStorage().bucket().file(path).delete({ ignoreNotFound: true }).catch(() => {});
}
