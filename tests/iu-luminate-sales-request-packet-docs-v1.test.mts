import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PACKET = 'docs/fandex-music-album-luminate-sales-request-packet.md';
const CHECKLIST = 'docs/fandex-music-album-luminate-sales-call-checklist.md';

test('sales packet is a data-license request, not a sales-provider registration request', async () => {
  const text = await readFile(PACKET, 'utf8');
  assert.match(text, /Snowflake Music Data Share/);
  assert.match(text, /not asking to become a Luminate sales-reporting provider/);
  assert.match(text, /derived metric only/);
});

test('sales packet carries the minimum FANDEX rights questions', async () => {
  const text = await readFile(PACKET, 'utf8');
  for (const required of [
    'Commercial use of the normalized observations inside the FANDEX product',
    'public publication of a derived FANDEX metric',
    'Post-termination treatment',
    'normalized FANDEX observation records',
    'Snowflake Music Data Share access for recurring programmatic queries',
  ]) {
    assert.ok(text.includes(required), `missing required rights question: ${required}`);
  }
});

test('sales packet requests the two Golden-path release windows and required Data Share objects', async () => {
  const text = await readFile(PACKET, 'utf8');
  for (const required of [
    '2024-02-20 through 2024-02-26',
    '2021-12-29 through 2022-01-04',
    'VW_DAILY_FACT_MRELG_DETAIL_DS',
    'VW_MUSICAL_RELEASE_GROUP_DS',
    'VW_FACT_VALUES_DS',
    'REPORTED_QUANTITY',
    'TRANSACTION_TYPE',
    'MODIFIED_AT',
  ]) {
    assert.ok(text.includes(required), `missing data request: ${required}`);
  }
});

test('sales packet does not invent public pricing or commit to purchase', async () => {
  const text = await readFile(PACKET, 'utf8');
  assert.match(text, /No price assumption should be made/);
  assert.doesNotMatch(text, /\$\d+[\d,]*(?:\.\d+)?\s*(?:\/\s*month|per month|monthly)/i);
  assert.doesNotMatch(text, /we agree to purchase/i);
});

test('concise sales checklist preserves commercial, rights, data, semantics and onboarding sections', async () => {
  const text = await readFile(CHECKLIST, 'utf8');
  for (const heading of [
    '## Commercial product',
    '## Rights',
    '## Data',
    '## Semantics',
    '## Onboarding',
  ]) {
    assert.ok(text.includes(heading), `missing checklist heading: ${heading}`);
  }
});
