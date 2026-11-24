import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { db } from './shared';

const BATCH_LIMIT = 400;

/** Expires matches where the first voice note was never sent within 48 hours. */
export const expireMatches = onSchedule('every 60 minutes', async () => {
  const firestore = db();
  const due = await firestore
    .collection('matches')
    .where('status', '==', 'active')
    .where('stage', '==', 'awaiting_first_voice')
    .where('expiresAt', '<=', Timestamp.now())
    .limit(BATCH_LIMIT)
    .get();

  if (due.empty) return;
  const batch = firestore.batch();
  due.docs.forEach((doc) =>
    batch.update(doc.ref, { status: 'expired', stage: 'expired', expiredAt: FieldValue.serverTimestamp() }),
  );
  await batch.commit();
});
