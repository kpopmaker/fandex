import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canDeterministicallyReplay,
  classifyActivityExposureRevision,
  createActivityExposureRawObservation,
  digestActivityExposureRawPayload,
  validateActivityExposureObservation,
} from '../lib/research/activityExposureObservation';

const base = {
  artistId: 'iu',
  sourceProvider: 'musicbrainz' as const,
  providerArtistId: 'b9545342-1e6d-4dae-84ac-013374ad8d7c',
  sourceEntityType: 'release-group',
  sourceEntityId: '066225ff-a8bd-4183-bff5-08329f0a063a',
  requestRef: 'musicbrainz:release-group:066225ff-a8bd-4183-bff5-08329f0a063a',
  responseCapturedAt: '2026-09-23T12:00:29Z',
  collectedAt: '2026-09-23T12:00:29Z',
  sourcePublishedAt: null,
  providerObservedAt: null,
  rawPayloadCanonical: '{"first-release-date":"2024-02-20","id":"066225ff-a8bd-4183-bff5-08329f0a063a"}',
  rawPayloadRetentionState: 'retained' as const,
  evidenceRef: 'https://musicbrainz.org/release-group/066225ff-a8bd-4183-bff5-08329f0a063a',
  authorizationState: 'research-allowed' as const,
  normalizedEventIds: ['activity:musicbrainz:release-group:066225ff-a8bd-4183-bff5-08329f0a063a'],
};

test('observation id and payload digest are deterministic', () => {
  const a = createActivityExposureRawObservation(base);
  const b = createActivityExposureRawObservation(base);
  assert.equal(a.rawPayloadDigest, b.rawPayloadDigest);
  assert.equal(a.observationId, b.observationId);
  assert.deepEqual(validateActivityExposureObservation(a), []);
});

test('same provider payload is unchanged-repeat', () => {
  const previous = createActivityExposureRawObservation(base);
  const digest = digestActivityExposureRawPayload(base.rawPayloadCanonical);
  assert.equal(classifyActivityExposureRevision(previous, digest), 'unchanged-repeat');
});

test('changed provider payload is revision evidence', () => {
  const previous = createActivityExposureRawObservation(base);
  const changedPayload = '{"first-release-date":"2024-02-21","id":"066225ff-a8bd-4183-bff5-08329f0a063a"}';
  const digest = digestActivityExposureRawPayload(changedPayload);
  assert.equal(classifyActivityExposureRevision(previous, digest), 'changed');

  const current = createActivityExposureRawObservation({
    ...base,
    collectedAt: '2026-09-24T12:00:29Z',
    responseCapturedAt: '2026-09-24T12:00:29Z',
    rawPayloadCanonical: changedPayload,
    priorObservationId: previous.observationId,
    supersedesObservationId: previous.observationId,
    revisionState: 'changed',
  });
  assert.deepEqual(validateActivityExposureObservation(current), []);
});

test('not-retained raw evidence blocks deterministic replay', () => {
  const observation = createActivityExposureRawObservation({
    ...base,
    rawPayloadRetentionState: 'not-retained',
  });
  assert.ok(
    validateActivityExposureObservation(observation)
      .includes('deterministic-replay-raw-evidence-not-retained'),
  );
  assert.equal(canDeterministicallyReplay([observation]), false);
});

test('retained observation stream is replay-capable without database writes', () => {
  const observation = createActivityExposureRawObservation(base);
  assert.equal(canDeterministicallyReplay([observation]), true);
});

test('changed revision requires prior observation lineage', () => {
  const observation = createActivityExposureRawObservation({
    ...base,
    revisionState: 'changed',
  });
  assert.ok(
    validateActivityExposureObservation(observation)
      .includes('changed-without-prior-observation'),
  );
});
