import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const listSource = readFileSync(
  new URL('../app/components/product/ProductEvidenceList.tsx', import.meta.url),
  'utf8',
);
const detailSource = readFileSync(
  new URL(
    '../app/artists/[artistId]/evidence/[evidenceId]/page.tsx',
    import.meta.url,
  ),
  'utf8',
);
const launchSurfaceSource = `${listSource}\n${detailSource}`;

test('Evidence list exposes truthful state and an artist-scoped CTA', () => {
  assert.match(listSource, /관련 근거/);
  assert.match(listSource, /미리보기/);
  assert.match(listSource, /합성 데이터/);
  assert.match(listSource, /근거 보기/);
  assert.match(
    listSource,
    /\/artists\/\$\{evidence\.identity\.artistId\}\/evidence\/\$\{evidence\.identity\.evidenceId\}/,
  );
  assert.match(listSource, /break-words/);
  assert.match(listSource, /min-w-0/);
});

test('Evidence detail shows only supported source and time semantics', () => {
  assert.match(detailSource, /관련 아티스트/);
  assert.match(detailSource, /관련 변수/);
  assert.match(detailSource, /출처/);
  assert.match(detailSource, /데이터 기준/);
  assert.match(detailSource, /관측 시점 미확정/);
  assert.doesNotMatch(detailSource, /providerPeriod/);
  assert.doesNotMatch(detailSource, /sourceUrl/);
  assert.doesNotMatch(detailSource, /원문 보기/);
});

test('Evidence launch copy contains no causal or unproven quality claim', () => {
  for (const prohibitedCopy of [
    '상승 원인',
    '핵심 원인',
    'Main Driver',
    'Contribution',
    'Verified',
    'Trusted',
    'Strong Evidence',
  ]) {
    assert.equal(launchSurfaceSource.includes(prohibitedCopy), false);
  }
});
