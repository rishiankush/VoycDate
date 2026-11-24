import { FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

import { transcribe } from './transcription/groq';

export const transcribeVoiceMessage = onDocumentCreated(
  { document: 'matches/{matchId}/messages/{messageId}', timeoutSeconds: 60 },
  async (event) => {
    const message = event.data?.data();
    if (!event.data || message?.type !== 'voice' || !message.audioPath || message.transcript?.status !== 'pending') return;

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      logger.warn('GROQ_API_KEY not set; marking voice transcript as failed');
      await event.data.ref.update({ 'transcript.status': 'failed' });
      return;
    }

    try {
      const [audio] = await getStorage().bucket().file(message.audioPath).download();
      const result = await transcribe(audio, 'voice.m4a', 'audio/mp4', groqKey);
      await event.data.ref.update({
        transcript: { status: 'done', ...result, completedAt: FieldValue.serverTimestamp() },
      });
    } catch (error) {
      logger.error('Voice message transcription failed', { path: event.data.ref.path, error: String(error) });
      await event.data.ref.update({ 'transcript.status': 'failed' });
    }
  },
);
