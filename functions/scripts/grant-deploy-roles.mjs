#!/usr/bin/env node
/**
 * One-time setup: grants the Google-managed service accounts the roles that 2nd gen Cloud Functions need
 * to build and receive Firestore/scheduler events. Run as a project admin: node scripts/grant-deploy-roles.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'voyc-date';
const PROJECT_NUMBER = '543361386420';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const compute = `serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com`;
const REQUIRED = [
  [compute, 'roles/cloudbuild.builds.builder'],
  [compute, 'roles/run.invoker'],
  [compute, 'roles/eventarc.eventReceiver'],
  // Runtime access for the functions themselves (the org policy blocks Google's automatic grants).
  [compute, 'roles/datastore.user'],
  [compute, 'roles/storage.objectAdmin'],
  [compute, 'roles/firebasecloudmessaging.admin'],
  [compute, 'roles/logging.logWriter'],
  // Lets the functions call Cloud Vision (face and explicit-content checks) on this project's quota.
  [compute, 'roles/serviceusage.serviceUsageConsumer'],
  [`serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com`, 'roles/iam.serviceAccountTokenCreator'],
  [`serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-eventarc.iam.gserviceaccount.com`, 'roles/eventarc.serviceAgent'],
];

const globalRoot = execSync('npm root -g').toString().trim();
const req = createRequire(join(globalRoot, 'firebase-tools', 'package.json'));
const account = req('./lib/auth.js').getProjectDefaultAccount(repoRoot);
const creds = JSON.parse(readFileSync(await req('./lib/defaultCredentials.js').getCredentialPathAsync(account), 'utf8'));
const keyFile = join(tmpdir(), `tung-iam-${process.pid}.json`);
writeFileSync(keyFile, JSON.stringify({ ...creds, quota_project_id: PROJECT_ID }));

const client = await new GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient();
const base = `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT_ID}`;

for (const service of ['vision.googleapis.com']) {
  await client.request({
    url: `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/${service}:enable`,
    method: 'POST',
  });
  console.log(`  enabled:     ${service}`);
}

const { data: policy } = await client.request({
  url: `${base}:getIamPolicy`,
  method: 'POST',
  data: { options: { requestedPolicyVersion: 3 } },
});

let added = 0;
for (const [member, role] of REQUIRED) {
  let binding = policy.bindings.find((b) => b.role === role && !b.condition);
  if (!binding) {
    binding = { role, members: [] };
    policy.bindings.push(binding);
  }
  if (binding.members.includes(member)) {
    console.log(`  already set: ${role} → ${member}`);
    continue;
  }
  binding.members.push(member);
  added += 1;
  console.log(`  granting:    ${role} → ${member}`);
}

if (added) {
  policy.version = 3;
  await client.request({ url: `${base}:setIamPolicy`, method: 'POST', data: { policy } });
  console.log(`Granted ${added} role(s) as ${account.user.email}.`);
} else {
  console.log('Nothing to change.');
}
