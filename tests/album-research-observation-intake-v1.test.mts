import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDirectAlbumObservation,
  type DirectAlbumObservation,
} from '../lib/alternative-evidence/directAlbumProvider';
import { queryCurrentResearch } from '../lib/alternative-evidence/persistenceContracts';
import {
  ALBUM_RESEARCH_OBSERVATION_RECORD_TYPE,
  buildAlbumResearchObservationSeriesKey,
  createAlbumResearchObservationIntakeGrant,
  planAlbumResearchObservationIntake,
} from '../lib/server/ingestion/albumResearchObservationIntake';

function circleObservation(overrides: Partial<DirectAlbumObservation> = {}): DirectAlbumObservation {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: null,
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: '8809954226502',
    fandexArtistId: 'straykids',
    fandexReleaseId: 'straykids-this-and-that',
    fandexReleaseFamilyId: null,
    semantic: 'period-sale',
    value: 123,
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
    ...overrides,
  });
}

function hanteoObservation(overrides: Partial<DirectAlbumObservation> = {}): DirectAlbumObservation {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'hanteo-chart',
    providerObservationId: '900562280|day:집계 기준 (KST) : 2026.08.31',
    providerArtistId: '42116',
    providerReleaseId: '900562280',
    providerEditionId: null,
    providerSkuId: null,
    fandexArtistId: 'straykids',
    fandexReleaseId: 'straykids-this-and-that',
    fandexReleaseFamilyId: null,
    semantic: 'period-sale',
    value: 456,
    unit: 'physical-units',
    territory: null,
    format: null,
    providerPeriod: 'day:집계 기준 (KST) : 2026.08.31',
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
    ...overrides,
  });
}

function grant(observations: readonly DirectAlbumObservation[]) {
  return createAlbumResearchObservationIntakeGrant({
    observations,
    authorizationEvidenceIds: Object.freeze([
      'album-reviewed-identity-live-validation-v1:33458837843',
      'album-research-observation-intake-v1:explicit-technical-research-storage',
    ]),
  });
}

test('missing grant blocks intake with zero effects', () => {
  const observation = circleObservation();
  const result = planAlbumResearchObservationIntake({ observations: [observation] });

  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.reasons, ['research-intake-grant-required']);
  assert.equal(result.persistencePlan, null);
  assert.equal(result.executionAuthorized, false);
  assert.deepEqual(result.effects, {
    databaseReads: 0,
    databaseWrites: 0,
    externalCalls: 0,
    scheduleMutations: 0,
    environmentMutations: 0,
  });
});

test('grant is exact-observation and exact-provider scoped', () => {
  const circle = circleObservation();
  const hanteo = hanteoObservation();
  const circleOnlyGrant = grant([circle]);

  const result = planAlbumResearchObservationIntake({
    observations: [circle, hanteo],
    grant: circleOnlyGrant,
  });

  assert.equal(result.status, 'blocked');
  assert.ok(result.reasons.includes('research-intake-observation-set-mismatch'));
  assert.ok(result.reasons.includes('research-intake-provider-set-mismatch'));
});

test('two providers remain separate research records and plan append only', () => {
  const circle = circleObservation();
  const hanteo = hanteoObservation();
  const observations = Object.freeze([circle, hanteo]);
  const result = planAlbumResearchObservationIntake({
    observations,
    grant: grant(observations),
  });

  assert.equal(result.status, 'planned');
  assert.equal(result.candidateRecordCount, 2);
  assert.deepEqual(result.providerRecordCounts, {
    'circle-chart': 1,
    'hanteo-chart': 1,
  });
  assert.notEqual(
    buildAlbumResearchObservationSeriesKey(circle),
    buildAlbumResearchObservationSeriesKey(hanteo),
  );
  assert.equal(result.records.every(record => record.recordType === ALBUM_RESEARCH_OBSERVATION_RECORD_TYPE), true);
  assert.equal(result.records.every(record => record.persistenceScope === 'research'), true);
  assert.equal(result.records.every(record => record.syntheticOnly === false), true);
  assert.equal(result.records.every(record => record.authorizationSnapshot.rawStorage === 'blocked'), true);
  assert.equal(result.records.every(record => record.authorizationSnapshot.normalizedStorage === 'technical-research-only'), true);
  assert.equal(result.records.every(record => record.authorizationSnapshot.commercialUse === 'blocked'), true);
  assert.equal(result.records.every(record => record.authorizationSnapshot.derivedPublication === 'blocked'), true);
  assert.equal(result.persistencePlan?.appendCount, 2);
  assert.equal(result.persistencePlan?.duplicateNoopCount, 0);
  assert.deepEqual(result.persistencePlan?.effects, {
    databaseReads: 0,
    databaseWrites: 0,
    externalCalls: 0,
  });
  assert.equal(result.executionAuthorized, false);
});

test('same persisted observation becomes duplicate-noop', () => {
  const observation = circleObservation();
  const first = planAlbumResearchObservationIntake({
    observations: [observation],
    grant: grant([observation]),
  });
  assert.equal(first.status, 'planned');

  const second = planAlbumResearchObservationIntake({
    observations: [observation],
    existingRecords: first.records,
    grant: grant([observation]),
  });

  assert.equal(second.status, 'planned');
  assert.equal(second.persistencePlan?.appendCount, 0);
  assert.equal(second.persistencePlan?.duplicateNoopCount, 1);
});

test('changed value on same provider series requires explicit revision', () => {
  const original = circleObservation();
  const first = planAlbumResearchObservationIntake({
    observations: [original],
    grant: grant([original]),
  });
  const changed = circleObservation({ value: 124 });

  assert.equal(
    buildAlbumResearchObservationSeriesKey(original),
    buildAlbumResearchObservationSeriesKey(changed),
  );

  const result = planAlbumResearchObservationIntake({
    observations: [changed],
    existingRecords: first.records,
    grant: grant([changed]),
  });

  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.reasons, ['changed-observation-requires-explicit-revision']);
  assert.equal(result.persistencePlan, null);
});

test('revision cannot append when superseded observation record is missing', () => {
  const original = circleObservation();
  const revision = circleObservation({
    value: 125,
    revisionId: 'circle-local-revision-1',
    revisionObservedAt: '2026-09-02T00:00:00Z',
    supersedesObservationId: original.observationId,
  });

  const result = planAlbumResearchObservationIntake({
    observations: [revision],
    existingRecords: [],
    grant: grant([revision]),
  });

  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.reasons, ['album_research_intake_supersession_target_missing']);
  assert.equal(result.persistencePlan, null);
});

test('valid revision maps superseded observation to superseded research record', () => {
  const original = circleObservation();
  const first = planAlbumResearchObservationIntake({
    observations: [original],
    grant: grant([original]),
  });
  assert.equal(first.status, 'planned');
  const originalRecord = first.records[0];

  const revision = circleObservation({
    value: 125,
    revisionId: 'circle-local-revision-1',
    revisionObservedAt: '2026-09-02T00:00:00Z',
    supersedesObservationId: original.observationId,
  });
  const result = planAlbumResearchObservationIntake({
    observations: [revision],
    existingRecords: first.records,
    grant: grant([revision]),
  });

  assert.equal(result.status, 'planned');
  assert.equal(result.persistencePlan?.revisionCount, 1);
  assert.equal(result.persistencePlan?.appendCount, 1);
  assert.equal(result.records[0].supersedesRecordId, originalRecord.recordId);
  assert.equal(result.records[0].recordState, 'revised');
  assert.deepEqual(result.records[0].createdFromRecordIds, [originalRecord.recordId]);

  const current = queryCurrentResearch([...first.records, ...result.records]);
  assert.equal(current.records.length, 1);
  assert.equal((current.records[0].payload as DirectAlbumObservation).value, 125);
});

test('revision across a different logical provider series fails closed', () => {
  const original = circleObservation();
  const first = planAlbumResearchObservationIntake({
    observations: [original],
    grant: grant([original]),
  });

  const wrongSeriesRevision = circleObservation({
    providerSkuId: '8800000000000',
    value: 125,
    revisionId: 'circle-local-revision-2',
    revisionObservedAt: '2026-09-02T00:00:00Z',
    supersedesObservationId: original.observationId,
  });
  const result = planAlbumResearchObservationIntake({
    observations: [wrongSeriesRevision],
    existingRecords: first.records,
    grant: grant([wrongSeriesRevision]),
  });

  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.reasons, ['album_research_intake_revision_series_mismatch']);
});

test('synthetic observation is never eligible for this live research intake boundary', () => {
  const synthetic = circleObservation({ syntheticFixture: true });
  const result = planAlbumResearchObservationIntake({
    observations: [synthetic],
    grant: grant([synthetic]),
  });

  assert.equal(result.status, 'invalid');
  assert.ok(result.reasons.includes('synthetic-observation-not-eligible'));
  assert.equal(result.persistencePlan, null);
});
