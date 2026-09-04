import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const artistPageSource = readFileSync(
  new URL('../app/artists/[artistId]/page.tsx', import.meta.url),
  'utf8',
);
const variableComponentSource = readFileSync(
  new URL(
    '../app/components/product/ArtistProductVariableDetail.tsx',
    import.meta.url,
  ),
  'utf8',
);

test('Artist route resolves selected Variables only through the Product query', () => {
  assert.match(artistPageSource, /getArtistProductVariable\(\{/);
  assert.match(artistPageSource, /<ArtistProductVariableDetail/);
  assert.doesNotMatch(artistPageSource, /getSelectedVariableSeries/);
  assert.doesNotMatch(artistPageSource, /getVariableSeries/);
  assert.doesNotMatch(artistPageSource, /getVariableContributionSummary/);
  assert.doesNotMatch(artistPageSource, /\?\? 0/);
});

test('existing deep-link target now lands on the Product Variable surface', () => {
  assert.match(variableComponentSource, /#variable-chart/);
  assert.match(variableComponentSource, /id="variable-chart"/);
  assert.match(artistPageSource, /searchParams/);
  assert.match(artistPageSource, /parseRequestedProductVariableIds/);
});

test('Product Variable surface exposes safe states without inference copy', () => {
  assert.match(variableComponentSource, /미리보기/);
  assert.match(variableComponentSource, /지원되지 않는 변수|presentation\.valueText/);
  assert.match(variableComponentSource, /소스 월 라벨별 시계열/);
  assert.match(variableComponentSource, /xl:grid-cols-2/);
  assert.doesNotMatch(variableComponentSource, /기여도/);
  assert.doesNotMatch(variableComponentSource, /Main Driver/);
  assert.doesNotMatch(variableComponentSource, /Top Contributor/);
  assert.doesNotMatch(variableComponentSource, /상승 원인/);
  assert.doesNotMatch(variableComponentSource, /sixMonthDelta/);
  assert.doesNotMatch(variableComponentSource, /percent change/i);
});
