import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  createActivityExposureProviderObservation,
  validateActivityExposureProviderObservation,
  YOUTUBE_NON_AUTHORIZED_DATA_MAX_RETENTION_DAYS,
} from '../lib/server/ingestion/activityExposureContracts';

const youtubeChannelId = 'UC3SyT4_WLHzN7JmHQwKQZww';
const collectedAt = '2026-09-24T00:00:00.000Z';

test('YouTube retained raw metadata has a provider-policy refresh deadline and keeps time semantics separate', () => {
  const observation = createActivityExposureProviderObservation({
    artistId: 'iu',
    sourceProvider: 'youtube',
    providerArtistId: youtubeChannelId,
    sourceEntityType: 'video',
    sourceEntityId: 'kHW-UVXOcLU',
    requestRef: 'youtube:videos:snippet:kHW-UVXOcLU',
    responseCapturedAt: collectedAt,
    collectedAt,
    sourcePublishedAt: '2024-02-20T09:00:00Z',
    providerObservedAt: '2024-02-20T09:00:00Z',
    rawPayloadCanonical: '{"id":"kHW-UVXOcLU"}',
    rawPayloadRetentionState: 'retained',
    retentionPolicyVersion: 'youtube-non-authorized-data-v1',
    retainedAt: collectedAt,
    refreshDueAt: '2026-10-23T00:00:00.000Z',
    evidenceRef: 'https://www.youtube.com/watch?v=kHW-UVXOcLU',
    authorizationState: 'review-required',
    normalizedEventIds: ['activity:youtube:video:kHW-UVXOcLU'],
  });

  assert.deepEqual(validateActivityExposureProviderObservation(observation), []);
  assert.equal(observation.sourcePublishedAt, '2024-02-20T09:00:00Z');
  assert.equal(observation.collectedAt, collectedAt);
  assert.notEqual(observation.sourcePublishedAt, observation.collectedAt);
  assert.equal(YOUTUBE_NON_AUTHORIZED_DATA_MAX_RETENTION_DAYS, 30);
});

test('YouTube retained raw metadata cannot exceed the provider-policy refresh boundary', () => {
  const observation = createActivityExposureProviderObservation({
    artistId: 'iu',
    sourceProvider: 'youtube',
    providerArtistId: youtubeChannelId,
    sourceEntityType: 'video',
    sourceEntityId: 'too-late',
    requestRef: 'youtube:videos:snippet:too-late',
    responseCapturedAt: collectedAt,
    collectedAt,
    rawPayloadCanonical: '{"id":"too-late"}',
    rawPayloadRetentionState: 'retained',
    retentionPolicyVersion: 'youtube-non-authorized-data-v1',
    retainedAt: collectedAt,
    refreshDueAt: '2026-10-25T00:00:00.000Z',
    evidenceRef: 'youtube:video:too-late',
    authorizationState: 'review-required',
  });

  assert.ok(
    validateActivityExposureProviderObservation(observation).includes(
      'youtube-refresh-boundary-too-late',
    ),
  );
});

test('blocked acquisition authorization is explicit and never becomes zero activity', () => {
  const observation = createActivityExposureProviderObservation({
    artistId: 'iu',
    sourceProvider: 'musicbrainz',
    providerArtistId: 'b9545342-1e6d-4dae-84ac-013374ad8d7c',
    sourceEntityType: 'release-group',
    sourceEntityId: 'blocked',
    requestRef: 'musicbrainz:release-group:blocked',
    responseCapturedAt: collectedAt,
    collectedAt,
    rawPayloadCanonical: '{"id":"blocked"}',
    rawPayloadRetentionState: 'digest-only',
    retentionPolicyVersion: 'musicbrainz-review-v1',
    evidenceRef: 'musicbrainz:release-group:blocked',
    authorizationState: 'blocked',
  });

  assert.ok(
    validateActivityExposureProviderObservation(observation).includes(
      'authorization-blocked',
    ),
  );
  assert.equal('value' in observation, false);
  assert.equal('inactive' in observation, false);
});

test('changed observations require revision lineage', () => {
  const observation = createActivityExposureProviderObservation({
    artistId: 'iu',
    sourceProvider: 'musicbrainz',
    providerArtistId: 'b9545342-1e6d-4dae-84ac-013374ad8d7c',
    sourceEntityType: 'release-group',
    sourceEntityId: 'changed',
    requestRef: 'musicbrainz:release-group:changed',
    responseCapturedAt: collectedAt,
    collectedAt,
    rawPayloadCanonical: '{"id":"changed","v":2}',
    rawPayloadRetentionState: 'digest-only',
    retentionPolicyVersion: 'musicbrainz-review-v1',
    evidenceRef: 'musicbrainz:release-group:changed',
    authorizationState: 'review-required',
    revisionState: 'changed',
  });

  assert.ok(
    validateActivityExposureProviderObservation(observation).includes(
      'changed-without-prior-observation',
    ),
  );
});

test('ingestion contract has no numeric Activity methodology fields', () => {
  const source = readFileSync(
    new URL('../lib/server/ingestion/activityExposureContracts.ts', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(
    source,
    /\b(?:comebackActivityPoint|activityCount|aggregateCount|weight|decay|activeWindowDays)\b/,
  );
});
