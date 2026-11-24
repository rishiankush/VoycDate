#!/usr/bin/env node
/**
 * Adds a project-level exception to the organisation's "Domain restricted sharing" policies so callable
 * functions can be invoked by the app. Applies to the tung-c01e2 project only.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'tung-c01e2';
const CONSTRAINTS = ['iam.allowedPolicyMemberDomains', 'iam.managed.allowedPolicyMembers'];
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const globalRoot = execSync('npm root -g').toString().trim();
const req = createRequire(join(globalRoot, 'firebase-tools', 'package.json'));
const account = req('./lib/auth.js').getProjectDefaultAccount(repoRoot);
const creds = JSON.parse(readFileSync(await req('./lib/defaultCredentials.js').getCredentialPathAsync(account), 'utf8'));
const keyFile = join(tmpdir(), `tung-orgpolicy-${process.pid}.json`);
writeFileSync(keyFile, JSON.stringify({ ...creds, quota_project_id: PROJECT_ID }));
const client = await new GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient();

const base = `https://orgpolicy.googleapis.com/v2/projects/${PROJECT_ID}/policies`;

for (const constraint of CONSTRAINTS) {
  const name = `projects/${PROJECT_ID}/policies/${constraint}`;
  const managed = constraint.startsWith('iam.managed.');
  const policy = { name, spec: { rules: managed ? [{ enforce: false }] : [{ allowAll: true }] } };
  try {
    const { data: effective } = await client.request({ url: `${base}/${constraint}:getEffectivePolicy` });
    const rules = effective.spec?.rules ?? [];
    const restricted = rules.some((r) => r.values || r.denyAll || r.enforce === true);
    if (!restricted) {
      console.log(`  not restricting: ${constraint}`);
      continue;
    }
    try {
      await client.request({ url: `${base}/${constraint}`, method: 'PATCH', data: policy });
    } catch (error) {
      if (error.response?.status !== 404) throw error;
      await client.request({ url: base, method: 'POST', data: policy });
    }
    console.log(`  exception added: ${constraint}`);
  } catch (error) {
    console.log(`  failed: ${constraint} — ${error.response?.data?.error?.message ?? error.message}`);
  }
}
