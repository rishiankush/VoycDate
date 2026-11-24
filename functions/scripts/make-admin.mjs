#!/usr/bin/env node
/**
 * Grant admin dashboard access to a Firebase Auth user.
 * Usage: node scripts/make-admin.mjs <uid-or-email>
 *
 * Uses your Firebase CLI login (not a service-account JSON).
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applicationDefault, initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'voyc-date';
const target = process.argv[2];
if (!target || target.includes('your-admin@') || target.includes('example.com')) {
  console.error('Usage: node scripts/make-admin.mjs <uid-or-email>');
  console.error('Example: node scripts/make-admin.mjs ankushrishi5@gmail.com');
  process.exit(1);
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const globalRoot = execSync('npm root -g').toString().trim();
const req = createRequire(join(globalRoot, 'firebase-tools', 'package.json'));
const account = req('./lib/auth.js').getProjectDefaultAccount(repoRoot);
const creds = JSON.parse(readFileSync(await req('./lib/defaultCredentials.js').getCredentialPathAsync(account), 'utf8'));
const keyFile = join(tmpdir(), `voyc-admin-${process.pid}.json`);
writeFileSync(keyFile, JSON.stringify({ ...creds, quota_project_id: PROJECT_ID }));
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile;

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

const auth = getAuth();
const user = target.includes('@') ? await auth.getUserByEmail(target) : await auth.getUser(target);
await getFirestore().doc(`admins/${user.uid}`).set(
  {
    role: 'admin',
    email: user.email ?? null,
    phoneNumber: user.phoneNumber ?? null,
    createdAt: new Date(),
  },
  { merge: true },
);
console.log(`Admin granted: ${user.uid} (${user.email || user.phoneNumber || 'no contact'})`);
console.log('Sign in at https://voyc-date.web.app with that email/password.');
