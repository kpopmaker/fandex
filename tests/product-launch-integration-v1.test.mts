import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const navbarSource = readFileSync(
  new URL('../app/components/Navbar.tsx', import.meta.url),
  'utf8',
);
const artistSource = readFileSync(
  new URL('../app/artists/[artistId]/page.tsx', import.meta.url),
  'utf8',
);

test('global Launch navigation does not frame FANDEX as a canonical market index', () => {
  assert.doesNotMatch(navbarSource, /K-pop Market Index/);
  assert.doesNotMatch(navbarSource, /Mock Market v4/);
  assert.match(navbarSource, /K-pop Research Metrics/);
  assert.match(navbarSource, /Preview Research v4/);
});

test('Artist entry surface discloses synthetic preview truth beside its headline', () => {
  assert.match(
    artistSource,
    /현재 FANDEX 값과 변수·근거는 합성 데이터 기반 미리보기입니다/,
  );
  assert.match(artistSource, /실제 관측 Production 데이터가 아니며/);
});

test('Artist Launch surface does not publish legacy direction or confidence states', () => {
  assert.doesNotMatch(artistSource, /getIndexTrendBand/);
  assert.doesNotMatch(artistSource, /trendBandLabels/);
  assert.doesNotMatch(artistSource, /trendSummaryLabels/);
  assert.doesNotMatch(artistSource, /latestPoint\.confidenceLevel/);
  assert.doesNotMatch(artistSource, /latestPoint\.dataStatus/);
  assert.match(artistSource, /source-native 월 라벨/);
});
