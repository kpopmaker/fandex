import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildActivityExposureProductView,
  type ActivityExposureProviderCoverage,
} from '../lib/research/activityExposureProductView';
import {
  createActivityExposureRawObservation,
} from '../lib/research/activityExposureObservation';
import type { ActivityExposureEvent } from '../lib/research/activityExposure';

const event: ActivityExposureEvent = Object.freeze({
  artistId: 'iu',
  eventId: 'activity:youtube:video:kHW-UVXOcLU',
  eventFamily: 'official_content',
  eventType: 'official_video_publication',
  lifecycleState: 'observed',
  announcedAt: null,
  scheduledStartAt: null,
  scheduledEndAt: null,
  occurredAt: '2024-02-20T09:00:00Z',
  occurredAtPrecision: 'timestamp',
  sourcePublishedAt: '2024-02-20T09:00:00Z',
  collectedAt: '2026-09-24T07:00:00Z',
  sourceProvider: 'youtube',
  sourceEntityType: 'video',
  sourceEntityId: 'kHW-UVXOcLU',
  canonicalFamilyId: null,
  providerArtistId: 'UC3SyT4_WLHzN7JmHQwKQZww',
  evidenceRef: 'https://www.youtube.com/watch?v=kHW-UVXOcLU',
  identityState: 'resolved_for_research',
  missingState: 'covered',
  evidenceState: 'direct_provider_evidence',
  conflictState: 'clear',
  timeZoneState: 'provider_iso8601_timestamp',
  revisionId: 'research-collection',
  supersedesRevisionId: null,
  title: "IU 'Shopper' MV",
});

const retainedObservation = createActivityExposureRawObservation({
  artistId: 'iu',
  sourceProvider: 'youtube',
  providerArtistId: 'UC3SyT4_WLHzN7JmHQwKQZww',
  sourceEntityType: 'video',
  sourceEntityId: 'kHW-UVXOcLU',
  requestRef: 'youtube:videos:snippet:kHW-UVXOcLU',
  responseCapturedAt: '2026-09-24T07:00:00Z',
  collectedAt: '2026-09-24T07:00:00Z',
  sourcePublishedAt: '2024-02-20T09:00:00Z',
  providerObservedAt: '2024-02-20T09:00:00Z',
  rawPayloadCanonical: '{"id":"kHW-UVXOcLU"}',
  rawPayloadRetentionState: 'retained',
  evidenceRef: 'https://www.youtube.com/watch?v=kHW-UVXOcLU',
  authorizationState: 'research-allowed',
  normalizedEventIds: [event.eventId],
});

const completeCoverage: ActivityExposureProviderCoverage[] = [
  {
    provider: 'youtube',
    state: 'complete',
    reason: 'visible uploads inventory exhausted',
    coverageObservedAt: '2026-09-24T07:00:00Z',
    coverageScope: 'current_visible_inventory',
    eventTimeStart: null,
    eventTimeEnd: null,
    observationBasis: 'provider_inventory',
  },
];

test('product view exposes timeline evidence without inventing a numeric score', () => {
  const view = buildActivityExposureProductView({
    artistId: 'iu',
    events: [event],
    observations: [retainedObservation],
    coverage: completeCoverage,
  });

  assert.equal(view.construct, 'Activity Exposure');
  assert.equal(view.availability, 'available');
  assert.equal(view.numericScore, null);
  assert.equal(view.numericScoreState, 'not_justified');
  assert.equal(view.timeline.length, 1);
  assert.equal(view.timeline[0].evidenceTrace.length, 1);
  assert.equal(
    view.timeline[0].evidenceTrace[0].storedEvidenceState,
    'retained_payload',
  );
  assert.deepEqual(view.truthSemantics, {
    missingIsZero: false,
    missingIsInactive: false,
    observationTimeEqualsCollectionTime: false,
    crossFamilyRawAggregationAllowed: false,
    completeMeansCompleteWithinDeclaredScope: true,
  });
});

test('partial provider coverage remains partial even when events exist', () => {
  const view = buildActivityExposureProductView({
    artistId: 'iu',
    events: [event],
    observations: [retainedObservation],
    coverage: [{
      ...completeCoverage[0],
      state: 'partial',
      reason: 'historical deleted/private inventory may be absent',
    }],
  });

  assert.equal(view.availability, 'partial');
  assert.equal(view.timeline[0].missingState, 'covered');
});

test('provider unavailable with no events is unavailable, not zero activity', () => {
  const view = buildActivityExposureProductView({
    artistId: 'iu',
    events: [],
    observations: [],
    coverage: [{
      provider: 'youtube',
      state: 'provider_unavailable',
      reason: 'provider request failed',
      coverageObservedAt: null,
      coverageScope: 'not_available',
      eventTimeStart: null,
      eventTimeEnd: null,
      observationBasis: 'not_available',
    }],
  });

  assert.equal(view.availability, 'unavailable');
  assert.equal(view.numericScore, null);
  assert.equal(view.timeline.length, 0);
  assert.equal(view.truthSemantics.missingIsZero, false);
});

test('invalid coverage becomes data_issue instead of unavailable or zero', () => {
  const view = buildActivityExposureProductView({
    artistId: 'iu',
    events: [],
    observations: [],
    coverage: [{
      provider: 'musicbrainz',
      state: 'invalid',
      reason: 'provider payload failed contract validation',
      coverageObservedAt: '2026-09-24T07:00:00Z',
      coverageScope: 'bounded_provider_query',
      eventTimeStart: '2024-01-01',
      eventTimeEnd: '2024-12-31',
      observationBasis: 'provider_query',
    }],
  });

  assert.equal(view.availability, 'data_issue');
});

test('digest-only evidence is distinguishable from retained Stored Evidence', () => {
  const digestOnly = createActivityExposureRawObservation({
    artistId: 'iu',
    sourceProvider: 'youtube',
    providerArtistId: 'UC3SyT4_WLHzN7JmHQwKQZww',
    sourceEntityType: 'video',
    sourceEntityId: 'kHW-UVXOcLU',
    requestRef: 'youtube:videos:snippet:kHW-UVXOcLU',
    responseCapturedAt: '2026-09-24T07:00:00Z',
    collectedAt: '2026-09-24T07:00:00Z',
    sourcePublishedAt: '2024-02-20T09:00:00Z',
    providerObservedAt: '2024-02-20T09:00:00Z',
    rawPayloadCanonical: '{"id":"kHW-UVXOcLU"}',
    rawPayloadRetentionState: 'digest-only',
    evidenceRef: 'https://www.youtube.com/watch?v=kHW-UVXOcLU',
    authorizationState: 'research-allowed',
    normalizedEventIds: [event.eventId],
  });

  const view = buildActivityExposureProductView({
    artistId: 'iu',
    events: [event],
    observations: [digestOnly],
    coverage: completeCoverage,
  });

  assert.equal(
    view.timeline[0].evidenceTrace[0].storedEvidenceState,
    'digest_only',
  );
});


test('complete coverage with zero events is an available empty timeline, not a zero score', () => {
  const view = buildActivityExposureProductView({
    artistId: 'iu',
    events: [],
    observations: [],
    coverage: completeCoverage,
  });

  assert.equal(view.availability, 'available');
  assert.equal(view.timeline.length, 0);
  assert.equal(view.numericScore, null);
  assert.equal(view.numericScoreState, 'not_justified');
});


test('complete coverage is complete only within its declared scope', () => {
  const view = buildActivityExposureProductView({
    artistId: 'iu',
    events: [event],
    observations: [retainedObservation],
    coverage: completeCoverage,
  });

  assert.equal(view.coverage[0].state, 'complete');
  assert.equal(view.coverage[0].coverageScope, 'current_visible_inventory');
  assert.equal(
    view.truthSemantics.completeMeansCompleteWithinDeclaredScope,
    true,
  );
});

test('complete or partial coverage requires an observation timestamp', () => {
  const view = buildActivityExposureProductView({
    artistId: 'iu',
    events: [],
    observations: [],
    coverage: [{
      provider: 'musicbrainz',
      state: 'complete',
      reason: 'invalid synthetic completeness claim',
      coverageObservedAt: null,
      coverageScope: 'current_visible_inventory',
      eventTimeStart: null,
      eventTimeEnd: null,
      observationBasis: 'provider_inventory',
    }],
  });

  assert.equal(view.availability, 'data_issue');
});

test('bounded provider query must declare an event-time boundary', () => {
  const view = buildActivityExposureProductView({
    artistId: 'iu',
    events: [],
    observations: [],
    coverage: [{
      provider: 'musicbrainz',
      state: 'partial',
      reason: 'query executed without explicit event-time boundary',
      coverageObservedAt: '2026-09-24T07:00:00Z',
      coverageScope: 'bounded_provider_query',
      eventTimeStart: null,
      eventTimeEnd: null,
      observationBasis: 'provider_query',
    }],
  });

  assert.equal(view.availability, 'data_issue');
});
