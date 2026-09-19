import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const artistPageSource = readFileSync(
  new URL('../app/artists/[artistId]/page.tsx', import.meta.url),
  'utf8',
);
const metricComponentSource = readFileSync(
  new URL(
    '../app/components/product/ArtistMetricOverview.tsx',
    import.meta.url,
  ),
  'utf8',
);
const variableComponentSource = readFileSync(
  new URL(
    '../app/components/product/ArtistProductVariableDetail.tsx',
    import.meta.url,
  ),
  'utf8',
);

test('Artist route resolves metrics through the canonical Product query', () => {
  assert.match(artistPageSource, /getArtistProductMetricCollection\(\{/);
  assert.match(artistPageSource, /<ArtistMetricOverview collection=/);
  assert.doesNotMatch(artistPageSource, /getMetricValueCoverage/);
  assert.doesNotMatch(artistPageSource, /getResolvedMetricScore/);
  assert.doesNotMatch(artistPageSource, /getLatestArtistMetricBreakdown/);
  assert.doesNotMatch(artistPageSource, /artistMonthlyMetricHelpers/);
  assert.doesNotMatch(artistPageSource, /\?\? 0/);
});

test('Artist route preserves the existing variable chart deep-link target', () => {
  assert.match(variableComponentSource, /#variable-chart/);
  assert.match(variableComponentSource, /id="variable-chart"/);
  assert.match(artistPageSource, /searchParams/);
});

test('Product metric component exposes launch states without internal issue codes', () => {
  assert.match(metricComponentSource, /미리보기/);
  assert.match(metricComponentSource, /데이터 기준/);
  assert.match(metricComponentSource, /sm:grid-cols-2 xl:grid-cols-3/);
  assert.doesNotMatch(metricComponentSource, /invalid-source-value/);
  assert.doesNotMatch(metricComponentSource, /fallback-source/);
  assert.doesNotMatch(metricComponentSource, /source-state-conflict/);
});
