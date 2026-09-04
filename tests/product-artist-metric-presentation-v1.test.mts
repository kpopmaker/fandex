import assert from 'node:assert/strict';
import test from 'node:test';

import { getArtistMetricCardPresentation } from '../lib/product/presentation/artistMetricPresentation';

test('available finite metric displays the Product value', () => {
  assert.deepEqual(
    getArtistMetricCardPresentation({
      status: 'ok',
      model: {
        fact: { availability: 'available', value: 72.8 },
        presentation: 'standard',
      },
    }),
    {
      state: 'available',
      valueText: '72.8',
      showPreviewBadge: false,
    },
  );
});

test('available zero displays zero instead of an empty state', () => {
  assert.deepEqual(
    getArtistMetricCardPresentation({
      status: 'ok',
      model: {
        fact: { availability: 'available', value: 0 },
        presentation: 'standard',
      },
    }),
    {
      state: 'available',
      valueText: '0',
      showPreviewBadge: false,
    },
  );
});

test('missing metric displays 관측 없음 instead of zero', () => {
  assert.deepEqual(
    getArtistMetricCardPresentation({
      status: 'ok',
      model: {
        fact: { availability: 'missing', value: null },
        presentation: 'standard',
      },
    }),
    {
      state: 'missing',
      valueText: '관측 없음',
      showPreviewBadge: false,
    },
  );
});

test('not-tracked metric displays 미추적 distinctly from missing', () => {
  assert.deepEqual(
    getArtistMetricCardPresentation({
      status: 'ok',
      model: {
        fact: { availability: 'not-tracked', value: null },
        presentation: 'standard',
      },
    }),
    {
      state: 'not-tracked',
      valueText: '미추적',
      showPreviewBadge: false,
    },
  );
});

test('preview metric keeps its value and requests a preview badge', () => {
  assert.deepEqual(
    getArtistMetricCardPresentation({
      status: 'ok',
      model: {
        fact: { availability: 'available', value: 72.8 },
        presentation: 'preview',
      },
    }),
    {
      state: 'available',
      valueText: '72.8',
      showPreviewBadge: true,
    },
  );
});

test('data issue displays a public-safe message rather than internal codes', () => {
  assert.deepEqual(
    getArtistMetricCardPresentation({ status: 'data-issue' }),
    {
      state: 'data-issue',
      valueText: '데이터 확인 필요',
      showPreviewBadge: false,
    },
  );
});
