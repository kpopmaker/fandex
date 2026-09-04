import assert from 'node:assert/strict';
import test from 'node:test';

import type { ArtistMetadata } from '../app/data/v4/charts/artistMetadata';
import type { ArtistMonthlyMetricPoint } from '../app/data/v4/metrics/fandexMetricTypes';
import { getProductDashboardArtistPresentation } from '../lib/product/presentation/dashboardPresentation';
import { getProductDashboard } from '../lib/product/queries/getProductDashboard';

const artists: readonly ArtistMetadata[] = [
  {
    artistId: 'finite',
    displayName: 'Finite',
    koreanName: '유한',
    ticker: 'FIN',
    groupType: 'solo',
    aliases: [],
  },
  {
    artistId: 'zero',
    displayName: 'Zero',
    koreanName: '제로',
    ticker: 'ZERO',
    groupType: 'solo',
    aliases: [],
  },
  {
    artistId: 'missing',
    displayName: 'Missing',
    koreanName: '미싱',
    ticker: 'MISS',
    groupType: 'solo',
    aliases: [],
  },
  {
    artistId: 'invalid',
    displayName: 'Invalid',
    koreanName: '인밸리드',
    ticker: 'INV',
    groupType: 'solo',
    aliases: [],
  },
];

function point(artistId: string, value: number): ArtistMonthlyMetricPoint {
  return {
    artistId,
    month: '2026-07',
    label: '26.07',
    fandexPoint: value,
    variables: {},
    sourceType: 'manual_seed',
    quality: 'tracked',
  };
}

const model = getProductDashboard({
  getArtists: () => artists,
  getArtistMonthlyMetrics: (artistId) => {
    if (artistId === 'finite') return [point(artistId, 1234.5)];
    if (artistId === 'zero') return [point(artistId, 0)];
    if (artistId === 'invalid') return [point(artistId, Number.NaN)];
    return [];
  },
});

function presentation(artistId: string) {
  const entry = model.entries.find(
    (candidate) => candidate.identity.artistId === artistId,
  );
  assert.ok(entry);
  return getProductDashboardArtistPresentation(entry);
}

test('Dashboard presentation distinguishes finite, zero, missing, and data issue', () => {
  assert.deepEqual(presentation('finite'), {
    state: 'available',
    valueText: '1,234.5pt',
  });
  assert.deepEqual(presentation('zero'), {
    state: 'available',
    valueText: '0pt',
  });
  assert.deepEqual(presentation('missing'), {
    state: 'missing',
    valueText: '관측 없음',
  });
  assert.deepEqual(presentation('invalid'), {
    state: 'data-issue',
    valueText: '데이터 확인 필요',
  });
});
