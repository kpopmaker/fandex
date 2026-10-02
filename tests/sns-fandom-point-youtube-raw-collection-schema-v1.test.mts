import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateSnsFandomYoutubeRawCollectionRecord,
} from '../lib/intelligence/snsFandomPointYoutubeRawCollectionSchema';

const validRecord = {
  providerId: 'youtube-data-api',
  providerResourceId: 'video-123',
  channelId: 'channel-123',
  artistIdentityRef: 'artist-123',
  observedAt: '2026-10-01T00:00:00.000Z',
  collectedAt: '2026-10-01T00:05:00.000Z',
  rawMetrics: {
    viewCount: 1000,
    likeCount: 100,
    commentCount: 10,
  },
  rightsState: 'authorized-and-collectable',
  evidenceRefs: ['youtube-response-evidence-1'],
};

test('valid raw YouTube observation record passes schema boundary', () => {
  const result = validateSnsFandomYoutubeRawCollectionRecord(validRecord);

  assert.equal(result.valid, true);
  assert.deepEqual(result.blockers, []);
});

test('missing artist binding blocks raw observation ingestion', () => {
  const result = validateSnsFandomYoutubeRawCollectionRecord({
    ...validRecord,
    artistIdentityRef: null,
  });

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('artist-identity-binding-missing'));
});

test('collection timestamp cannot replace observation timestamp', () => {
  const result = validateSnsFandomYoutubeRawCollectionRecord({
    ...validRecord,
    observedAt: null,
  });

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('observation-time-missing'));
});

test('rights blocked records cannot enter raw collection eligibility', () => {
  const result = validateSnsFandomYoutubeRawCollectionRecord({
    ...validRecord,
    rightsState: 'blocked-by-rights',
  });

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('provider-rights-not-authorized'));
});

test('raw collection schema rejects records without evidence lineage', () => {
  const result = validateSnsFandomYoutubeRawCollectionRecord({
    ...validRecord,
    evidenceRefs: [],
  });

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('evidence-reference-missing'));
});
