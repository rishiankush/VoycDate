import type { Persistence } from 'firebase/auth';

// getAuth() on web already persists sessions in the browser.
export const authPersistence: Persistence | null = null;
