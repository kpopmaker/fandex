import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDirectAlbumObservation,
  validateDirectAlbumObservation,
} from '../lib/alternative-evidence/directAlbumProvider';
import { CIRCLE_EVIDENCE_DESCRIPTOR } from '../lib/alternative-evidence/directProviderEvidence';
import {
  buildCircleRetailSeriesKey,
  envelopeCircleRetailResearchObservation,
  reconcileCircleRetailObservation,
} from '../lib/alternative-evidence/circleRetailRevision';
import {
  defaultAuthorizationSnapshot,
  planPersistenceAppend,
  queryCurrentResearch,
} from '../lib/alternative-evidence/persistenceContracts';

const observedAt = '2026-08-31T17:00:00Z';
const collectedAt = '2026-08-31T17:00:01Z';
const revisionObservedAt = '2026-09-01T00:30:00Z';

function observation(input: Readonly<{
  value: number;
  providerPeriod?: string;
  providerSkuId?: string | null;
  fandexReleaseId?: string;
  fandexArtistId?: string;
  syntheticFixture?: boolean;
}>) {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: null,
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: input.providerSkuId === undefined ? '8800000000001' : input.providerSkuId,
    fandexArtistId: input.fandexArtistId ?? 'artist:test',
    fandexReleaseId: input.fandexReleaseId ?? 'release:test:album',
    fandexReleaseFamilyId: 'release-family:test:album',
    semantic: 'period-sale',
    value: input.value,
    unit: 'physical-units',
    territory: null,
    format: null,
    providerPeriod: input.providerPeriod ?? 'day:20260831',
    providerPublishedAt: null,
    observedAt,
    collectedAt,
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'current-research',
    scopeRole: 'standalone',
    parentObservationId: null,
    syntheticFixture: input.syntheticFixture ?? false,
  });
}

test('same logical series and same value is duplicate-noop', () => {
  const previous = observation({ value: 120000 });
  const incoming = observation({ value: 120000 });
  const result = reconcileCircleRetailObservation({ previous, incoming, revisionObservedAt });
  assert.equal(result.action, 'duplicate-noop');
  assert.equal(result.candidateObservation, null);
  assert.equal(result.canonicalObservation.observationId, previous.observationId);
  assert.equal(result.seriesKey, buildCircleRetailSeriesKey(previous));
});

test('same logical series with changed quantity becomes an explicit revision', () => {
  const previous = observation({ value: 120000 });
  const incoming = observation({ value: 118500 });
  const result = reconcileCircleRetailObservation({ previous, incoming, revisionObservedAt });
  assert.equal(result.action, 'revision-append');
  assert.ok(result.candidateObservation);
  assert.equal(result.canonicalObservation.value, 118500);
  assert.equal(result.canonicalObservation.supersedesObservationId, previous.observationId);
  assert.equal(result.canonicalObservation.revisionObservedAt, revisionObservedAt);
  assert.ok(result.canonicalObservation.revisionId);
  assert.notEqual(result.canonicalObservation.observationId, previous.observationId);
  assert.deepEqual(validateDirectAlbumObservation(result.canonicalObservation, CIRCLE_EVIDENCE_DESCRIPTOR), {
    valid: true,
    issues: [],
  });
});

test('different non-hour SKU is a different series, not a revision', () => {
  const previous = observation({ value: 120000, providerSkuId: '8800000000001' });
  const incoming = observation({ value: 118500, providerSkuId: '8800000000002' });
  const result = reconcileCircleRetailObservation({ previous, incoming, revisionObservedAt });
  assert.equal(result.action, 'series-mismatch');
  assert.equal(result.candidateObservation, null);
  assert.notEqual(buildCircleRetailSeriesKey(previous), buildCircleRetailSeriesKey(incoming));
});

test('hourly rows without Barcode reconcile by reviewed FANDEX release identity and provider period', () => {
  const previous = observation({
    value: 21000,
    providerSkuId: null,
    providerPeriod: 'hour:20260831-23',
  });
  const incoming = observation({
    value: 21261,
    providerSkuId: null,
    providerPeriod: 'hour:20260831-23',
  });
  const result = reconcileCircleRetailObservation({ previous, incoming, revisionObservedAt });
  assert.equal(result.action, 'revision-append');
  assert.equal(result.canonicalObservation.providerSkuId, null);
  assert.equal(result.canonicalObservation.value, 21261);
});

test('revision envelope maps observation supersession into existing persistence contract', () => {
  const previous = observation({ value: 120000 });
  const incoming = observation({ value: 118500 });
  const decision = reconcileCircleRetailObservation({ previous, incoming, revisionObservedAt });
  assert.ok(decision.candidateObservation);

  const oldRecord = envelopeCircleRetailResearchObservation({ observation: previous });
  const revisionRecord = envelopeCircleRetailResearchObservation({
    observation: decision.candidateObservation,
    previousRecord: oldRecord,
  });

  assert.equal(revisionRecord.supersedesRecordId, oldRecord.recordId);
  assert.equal(revisionRecord.recordState, 'revised');
  assert.equal(revisionRecord.sourceRecordId, oldRecord.sourceRecordId);

  const plan = planPersistenceAppend([oldRecord], [revisionRecord], {
    scope: 'research',
    authorization: defaultAuthorizationSnapshot(),
    technicalEligibility: 'eligible',
    syntheticOnly: false,
  });
  assert.equal(plan.revisionCount, 1);
  assert.equal(plan.actions[0].action, 'revision-append');
  assert.deepEqual(plan.effects, { databaseReads: 0, databaseWrites: 0, externalCalls: 0 });

  const current = queryCurrentResearch([oldRecord, revisionRecord]);
  assert.equal(current.records.length, 1);
  assert.equal((current.records[0].payload as ReturnType<typeof observation>).value, 118500);
});

test('revision envelope requires the exact superseded research record', () => {
  const previous = observation({ value: 120000 });
  const other = observation({ value: 999, providerSkuId: '8800000000999' });
  const incoming = observation({ value: 118500 });
  const decision = reconcileCircleRetailObservation({ previous, incoming, revisionObservedAt });
  assert.ok(decision.candidateObservation);
  const wrongRecord = envelopeCircleRetailResearchObservation({ observation: other });
  assert.throws(() => envelopeCircleRetailResearchObservation({
    observation: decision.candidateObservation!,
    previousRecord: wrongRecord,
  }), /circle_retail_revision_previous_record_mismatch/);
});
