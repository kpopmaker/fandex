import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activityExposureRetentionDecision,
  canRetainActivityExposureReplayPayloadAt,
} from '../lib/research/activityExposureRetentionPolicy';
import {
  createActivityExposureRawObservation,
} from '../lib/research/activityExposureObservation';

function observation(provider: 'musicbrainz' | 'youtube') {
  return createActivityExposureRawObservation({
    artistId: 'iu',
    sourceProvider: provider,
    providerArtistId:
      provider === 'musicbrainz'
        ? 'b9545342-1e6d-4dae-84ac-013374ad8d7c'
        : 'UC3SyT4_WLHzN7JmHQwKQZww',
    sourceEntityType: provider === 'musicbrainz' ? 'release-group' : 'video',
    sourceEntityId:
      provider === 'musicbrainz'
        ? '066225ff-a8bd-4183-bff5-08329f0a063a'
        : 'kHW-UVXOcLU',
    requestRef: 'research:test',
    responseCapturedAt: '2026-09-25T00:00:00Z',
    collectedAt: '2026-09-25T00:00:01Z',
    rawPayloadCanonical: '{"provider":"test"}',
    rawPayloadRetentionState: 'retained',
    evidenceRef: 'https://example.test/evidence',
    authorizationState: 'research-allowed',
  });
}

test('YouTube retained replay payload has a 30-day refresh/delete boundary', () => {
  const decision = activityExposureRetentionDecision({
    provider: 'youtube',
    responseCapturedAt: '2026-09-25T00:00:00Z',
  });

  assert.equal(decision.refreshOrDeleteRequired, true);
  assert.equal(decision.refreshOrDeleteBy, '2026-10-25T00:00:00.000Z');
  assert.equal(decision.persistentReplayClaimAllowed, false);
});

test('YouTube retained replay payload is not eligible beyond retention deadline', () => {
  const obs = observation('youtube');

  assert.equal(
    canRetainActivityExposureReplayPayloadAt(obs, '2026-10-24T23:59:59Z'),
    true,
  );
  assert.equal(
    canRetainActivityExposureReplayPayloadAt(obs, '2026-10-25T00:00:01Z'),
    false,
  );
});

test('MusicBrainz minimized replay subset has no 30-day refresh/delete rule', () => {
  const decision = activityExposureRetentionDecision({
    provider: 'musicbrainz',
    responseCapturedAt: '2026-09-25T00:00:00Z',
  });

  assert.equal(decision.refreshOrDeleteRequired, false);
  assert.equal(decision.refreshOrDeleteBy, null);
  assert.equal(decision.persistentReplayClaimAllowed, true);
  assert.equal(
    canRetainActivityExposureReplayPayloadAt(
      observation('musicbrainz'),
      '2027-09-25T00:00:00Z',
    ),
    true,
  );
});
