import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateSnsFandomYoutubeRawCollectionRecord,
  type SnsFandomYoutubeRawCollectionRecord,
} from '../lib/intelligence/snsFandomPointYoutubeRawCollectionSchema';

function record(
  overrides: Partial<SnsFandomYoutubeRawCollectionRecord> = {},
): SnsFandomYoutubeRawCollectionRecord {
  return {
    schemaVersion: 'sns-fandom-youtube-raw-collection-schema-v1',
    provider: 'youtube-data-api',
    providerResourceId: 'video-123',
    channelId: 'channel-123',
    artistIdentityRef: 'artist-123',
    observationWindow: {
      startAt: '2026-10-01T00:00:00.000Z',
      endAt: '2026-10-01T00:00:00.000Z',
    },
    observedAt: '2026-10-01T00:00:00.000Z',
    collectedAt: '2026-10-01T00:05:00.000Z',
    metrics: {
      viewCount: '1000',
      likeCount: '100',
      commentCount: '10',
    },
    rightsState: 'authorized-and-collectable',
    evidenceRefs: ['youtube-response-evidence-1'],
    ...overrides,
  };
}

test('valid raw YouTube observation record passes schema boundary', () => {
  const result = validateSnsFandomYoutubeRawCollectionRecord(record());

  assert.equal(result.valid, true);
  assert.deepEqual(result.blockers, []);
});

test('missing artist binding blocks raw observation ingestion', () => {
  const result = validateSnsFandomYoutubeRawCollectionRecord(
    record({ artistIdentityRef: '' }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.includes('artist-identity-binding-missing'),
  );
});

test('collection timestamp cannot replace observation timestamp', () => {
  const result = validateSnsFandomYoutubeRawCollectionRecord(
    record({ observedAt: '' }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('observation-time-missing'));
});

test('rights blocked records cannot enter raw collection eligibility', () => {
  const result = validateSnsFandomYoutubeRawCollectionRecord(
    record({ rightsState: 'blocked-by-rights' }),
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.includes('provider-rights-not-authorized'),
  );
});

test('raw collection schema rejects records without evidence lineage', () => {
  const result = validateSnsFandomYoutubeRawCollectionRecord(
    record({ evidenceRefs: [] }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('evidence-reference-missing'));
});
