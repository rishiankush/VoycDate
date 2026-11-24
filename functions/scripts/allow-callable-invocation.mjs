#!/usr/bin/env node
/**
 * Callable functions must accept unauthenticated HTTP requests at the Cloud Run level; each function then
 * verifies the caller's Firebase ID token itself. Run as a project admin: node scripts/allow-callable-invocation.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'voyc-date';
const REGION = 'us-central1';
const CALLABLES = ['ping', 'getDiscoveryFeed', 'swipe', 'sendVoiceMessage', 'markMatchRead'];
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const globalRoot = execSync('npm root -g').toString().trim();
const req = createRequire(join(globalRoot, 'firebase-tools', 'package.json'));
const account = req('./lib/auth.js').getProjectDefaultAccount(repoRoot);
const creds = JSON.parse(readFileSync(await req('./lib/defaultCredentials.js').getCredentialPathAsync(account), 'utf8'));
const keyFile = join(tmpdir(), `tung-run-${process.pid}.json`);
writeFileSync(keyFile, JSON.stringify({ ...creds, quota_project_id: PROJECT_ID }));
const client = await new GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient();

for (const name of CALLABLES) {
  const service = `https://run.googleapis.com/v2/projects/${PROJECT_ID}/locations/${REGION}/services/${name.toLowerCase()}`;
  try {
    const { data: policy } = await client.request({ url: `${service}:getIamPolicy` });
    const bindings = policy.bindings ?? [];
    let invoker = bindings.find((b) => b.role === 'roles/run.invoker');
    if (!invoker) {
      invoker = { role: 'roles/run.invoker', members: [] };
      bindings.push(invoker);
    }
    if (invoker.members.includes('allUsers')) {
      console.log(`  already public: ${name}`);
      continue;
    }
    invoker.members.push('allUsers');
    await client.request({ url: `${service}:setIamPolicy`, method: 'POST', data: { policy: { ...policy, bindings } } });
    console.log(`  made invokable: ${name}`);
  } catch (error) {
    console.log(`  failed: ${name} — ${error.response?.data?.error?.message ?? error.message}`);
  }
}
