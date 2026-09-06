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

test('Artist entry surface derives current FANDEX truth from Product contracts', () => {
  assert.match(artistSource, /getProductDashboardArtistEntry/);
  assert.match(artistSource, /getProductDashboardArtistPresentation/);
  assert.match(artistSource, /shouldShowProductDashboardPreviewBadge/);
  assert.match(artistSource, /currentFandexSourceTimeLabel/);
  assert.match(artistSource, /showCurrentFandexPreviewBadge/);
  assert.doesNotMatch(
    artistSource,
    /formatPoint\(latestPoint\.fandexPoint\)/,
  );
});

test('Artist Launch surface does not publish legacy direction or confidence states', () => {
  assert.doesNotMatch(artistSource, /getIndexTrendBand/);
  assert.doesNotMatch(artistSource, /trendBandLabels/);
  assert.doesNotMatch(artistSource, /trendSummaryLabels/);
  assert.doesNotMatch(artistSource, /latestPoint\.confidenceLevel/);
  assert.doesNotMatch(artistSource, /latestPoint\.dataStatus/);
  assert.match(artistSource, /source-native 월 라벨/);
});
