import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BRAND_FIT_YOUTUBE_VIDEOS_ENDPOINT,
  buildBrandFitYouTubeApiRequestDescriptor,
  parseBrandFitYouTubeApiObservation,
} from '../lib/intelligence/brandFitYouTubeApiRequest';

function response(overrides: Record<string, unknown> = {}) {
  return {
    items: [{
      id: '39CUlBDuRSo',
      snippet: {
        channelId: 'UCUeEq2B8Cx3Sdjj0Zva7uRA',
        title: 'Estée Lauder X IU | NEW Sleep Drama On-air',
        description: '에스티 로더와 아이유가 함께한 NEW 나이트 캠페인',
        publishedAt: '2025-08-03T00:00:00Z',
        ...overrides,
      },
    }],
  };
}

test('request descriptor is a single bounded videos.list snippet lookup', () => {
  const request = buildBrandFitYouTubeApiRequestDescriptor();

  assert.equal(request.method, 'GET');
  assert.equal(request.endpoint, BRAND_FIT_YOUTUBE_VIDEOS_ENDPOINT);
  assert.deepEqual(request.query, {
    part: 'snippet',
    id: '39CUlBDuRSo',
  });
  assert.equal(
    request.credentialTransport,
    'query-key-injected-by-production-operations',
  );
  assert.equal(request.credentialPersistedInPlan, false);
});

test('exact provider response becomes a bounded observation', () => {
  const result = parseBrandFitYouTubeApiObservation(
    response(),
    '2026-10-01T02:05:00.000Z',
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.observation.videoId, '39CUlBDuRSo');
  assert.equal(
    result.observation.channelId,
    'UCUeEq2B8Cx3Sdjj0Zva7uRA',
  );
  assert.equal(result.observation.publishedAt, '2025-08-03T00:00:00Z');
});

test('rendered day precision cannot substitute for provider publishedAt', () => {
  const result = parseBrandFitYouTubeApiObservation(
    response({ publishedAt: '2025-08-03' }),
    '2026-10-01T02:05:00.000Z',
  );
  assert.deepEqual(result, {
    status: 'blocked',
    contractVersion: 'brand-fit-youtube-api-request-v1',
    reason: 'published-at-invalid',
  });
});

test('missing video is not interpreted as no campaign', () => {
  const result = parseBrandFitYouTubeApiObservation(
    { items: [] },
    '2026-10-01T02:05:00.000Z',
  );
  assert.deepEqual(result, {
    status: 'blocked',
    contractVersion: 'brand-fit-youtube-api-request-v1',
    reason: 'video-not-unique',
  });
});

test('multiple returned videos are rejected at the bounded observation boundary', () => {
  const item = response().items[0];
  const result = parseBrandFitYouTubeApiObservation(
    { items: [item, item] },
    '2026-10-01T02:05:00.000Z',
  );
  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'video-not-unique');
});

test('unexpected video id cannot replace the reviewed campaign source', () => {
  const payload = response();
  payload.items[0].id = 'vl0FzlZicOs';

  const result = parseBrandFitYouTubeApiObservation(
    payload,
    '2026-10-01T02:05:00.000Z',
  );
  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'video-id-mismatch');
});

test('invalid channel id fails before Brand identity interpretation', () => {
  const result = parseBrandFitYouTubeApiObservation(
    response({ channelId: 'not-a-channel' }),
    '2026-10-01T02:05:00.000Z',
  );
  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'channel-id-invalid');
});

test('collection time is exact provider-handling time and cannot predate publication', () => {
  assert.equal(
    parseBrandFitYouTubeApiObservation(
      response(),
      '2025-08-02T23:59:59.000Z',
    ).status,
    'blocked',
  );

  const invalid = parseBrandFitYouTubeApiObservation(
    response(),
    '2026-10-01',
  );
  assert.equal(invalid.status, 'blocked');
  if (invalid.status !== 'blocked') return;
  assert.equal(invalid.reason, 'collection-time-invalid');
});
