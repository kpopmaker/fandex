import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const DRAFT = 'docs/fandex-music-album-luminate-demo-submission-draft.md';
const INTAKE = 'docs/fandex-music-album-luminate-sales-response-intake.md';

test('demo submission draft routes FANDEX to data licensing, not music registration', async () => {
  const text = await readFile(DRAFT, 'utf8');
  assert.match(text, /Do you want to register your music\?" must be answered \*\*No\*\*/);
  assert.match(text, /requesting licensed access to Luminate data/);
  assert.match(text, /not registering music or applying to become an Official Luminate Reporter/);
});

test('demo submission draft names the bounded FANDEX scope without claiming rights', async () => {
  const text = await readFile(DRAFT, 'utf8');
  for (const required of [
    'The Winning (2024-02-20)',
    'Pieces (2021-12-29)',
    'one US or CA territory lane',
    'REPORTED_QUANTITY',
    'TRANSACTION_TYPE',
    'REPORT_DATE',
    'MODIFIED_AT',
    'derived metric only',
  ]) {
    assert.ok(text.includes(required), `missing outreach scope: ${required}`);
  }
  assert.match(text, /not submitted/);
});

test('demo submission draft forbids credential and raw licensed-data disclosure', async () => {
  const text = await readFile(DRAFT, 'utf8').then((value) => value.toLowerCase());
  for (const required of [
    'snowflake credentials',
    'passwords',
    'api keys/tokens',
    'private keys',
    'database urls',
    'raw licensed quantities',
    'neon connection details',
  ]) {
    assert.ok(text.includes(required), `missing forbidden disclosure: ${required}`);
  }
});

test('sales response intake does not convert a demo, quote, reply or technical scope into authorization', async () => {
  const text = await readFile(INTAKE, 'utf8');
  assert.match(text, /do not populate agreementEvidenceId/);
  assert.match(text, /do not set licenseActive=true/);
  assert.match(text, /Technical confirmation alone does not create usage\/publication rights/);
  assert.match(text, /A demo, quote, email promise, technical sample, or account creation is not equivalent to an executed rights grant/);
});

test('only executed agreement proceeds to the existing bootstrap CLI', async () => {
  const text = await readFile(INTAKE, 'utf8');
  assert.match(text, /Only an executed order form or separate writing may populate/);
  assert.match(text, /ingestion:luminate:review-licensed-bootstrap/);
  assert.match(text, /ready-for-licensed-extraction-review/);
});
