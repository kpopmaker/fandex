import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDirectAlbumObservation,
  type DirectAlbumObservation,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  createAlbumResearchObservationIntakeGrant,
  planAlbumResearchObservationIntake,
} from '../lib/server/ingestion/albumResearchObservationIntake';
import { queryAlbumResearchObservationCurrentView } from '../lib/server/ingestion/albumResearchObservationCurrentView';

function observation(providerId: 'circle-chart' | 'hanteo-chart', value: number): DirectAlbumObservation {
  const circle = providerId === 'circle-chart';
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId,
    providerObservationId: circle ? null : '900562280|day:20260831',
    providerArtistId: circle ? null : '42116',
    providerReleaseId: circle ? null : '900562280',
    providerEditionId: null,
    providerSkuId: circle ? '8809954226502' : null,
    fandexArtistId: 'straykids',
    fandexReleaseId: 'straykids-this-and-that',
    fandexReleaseFamilyId: null,
    semantic: 'period-sale',
    value,
    unit: 'physical-units',
    territory: null,
    format: null,
    providerPeriod: 'day:20260831',
    providerPublishedAt: null,
    observedAt: '2026-09-01T01:28:16Z',
    collectedAt: '2026-09-01T01:28:16Z',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'current-research',
    scopeRole: 'standalone',
    parentObservationId: null,
    syntheticFixture: false,
  });
}

function grant(observations: readonly DirectAlbumObservation[]) {
  return createAlbumResearchObservationIntakeGrant({
    observations,
    authorizationEvidenceIds: ['current-view-test'],
  });
}

test('Circle and Hanteo heads coexist without being treated as a conflict', () => {
  const circle = observation('circle-chart', 100);
  const hanteo = observation('hanteo-chart', 200);
  const intake = planAlbumResearchObservationIntake({
    observations: [circle, hanteo],
    grant: grant([circle, hanteo]),
  });
  assert.equal(intake.status, 'planned');

  const view = queryAlbumResearchObservationCurrentView(intake.records);
  assert.equal(view.state, 'resolved');
  assert.equal(view.records.length, 2);
  assert.deepEqual(view.providerRecordCounts, {
    'circle-chart': 1,
    'hanteo-chart': 1,
  });
  assert.equal(view.conflictingSeriesKeys.length, 0);
  assert.equal(view.crossProviderAggregationAllowed, false);
  assert.equal(view.rawProviderSumAllowed, false);
});

test('revision replaces only its own provider-series head', () => {
  const circle = observation('circle-chart', 100);
  const hanteo = observation('hanteo-chart', 200);
  const first = planAlbumResearchObservationIntake({
    observations: [circle, hanteo],
    grant: grant([circle, hanteo]),
  });
  assert.equal(first.status, 'planned');

  const revisedCircle = buildDirectAlbumObservation({
    ...circle,
    value: 101,
    revisionId: 'circle-revision-current-view-test',
    revisionObservedAt: '2026-09-02T00:00:00Z',
    supersedesObservationId: circle.observationId,
    observationId: undefined,
    evidenceDigest: undefined,
  });
  const revisionIntake = planAlbumResearchObservationIntake({
    observations: [revisedCircle],
    existingRecords: first.records,
    grant: grant([revisedCircle]),
  });
  assert.equal(revisionIntake.status, 'planned');
  assert.equal(revisionIntake.persistencePlan?.revisionCount, 1);

  const view = queryAlbumResearchObservationCurrentView([
    ...first.records,
    ...revisionIntake.records,
  ]);
  assert.equal(view.state, 'resolved');
  assert.equal(view.records.length, 2);
  assert.equal(view.providerRecordCounts['circle-chart'], 1);
  assert.equal(view.providerRecordCounts['hanteo-chart'], 1);
  const circleHead = view.records.find(record => record.payload.providerId === 'circle-chart');
  assert.equal(circleHead?.payload.value, 101);
});
