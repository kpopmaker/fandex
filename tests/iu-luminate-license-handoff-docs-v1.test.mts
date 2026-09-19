import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  runIuLuminateLicensedBootstrapReview,
} from '../lib/alternative-evidence/iuLuminateLicensedBootstrapCommandResearch';

const TEMPLATE_PATH = 'docs/examples/iu-luminate-licensed-bootstrap.template.json';

test('checked-in handoff template is intentionally blocked until real licensed evidence is entered', async () => {
  const template = await readFile(TEMPLATE_PATH, 'utf8');
  const summary = await runIuLuminateLicensedBootstrapReview(
    ['--input', TEMPLATE_PATH],
    { readFileText: async () => template },
  );

  assert.equal(summary.status, 'blocked');
  assert.equal(summary.currentExtractionPlan, null);
  assert.equal(summary.baselineExtractionPlan, null);
  assert.ok(summary.blockers.includes('luminate-explicit-fandex-permitted-use-writing-missing'));
  assert.ok(summary.blockers.includes('luminate-license-not-active'));
  assert.ok(summary.blockers.includes('iu-luminate-bootstrap-data-share-access-evidence-missing'));
  assert.ok(summary.blockers.includes('iu-luminate-current-mrelg-unresolved'));
  assert.ok(summary.blockers.includes('iu-luminate-baseline-mrelg-unresolved'));
});

test('handoff template contains no credential-bearing field names', async () => {
  const template = await readFile(TEMPLATE_PATH, 'utf8');
  const normalized = template.toLowerCase();
  for (const forbidden of [
    '"password"',
    '"token"',
    '"apikey"',
    '"api_key"',
    '"secret"',
    '"clientsecret"',
    '"privatekey"',
    '"private_key"',
    '"connectionstring"',
    '"connection_string"',
    '"databaseurl"',
    '"database_url"',
  ]) {
    assert.equal(normalized.includes(forbidden), false, `forbidden key present: ${forbidden}`);
  }
});
