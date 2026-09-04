import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT,
  ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_GATE_VERSION,
  ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_MIGRATION_SHA256,
  ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET,
  evaluateAlbumBoundedProductionResearchWriteGate,
  validateAlbumBoundedProductionResearchWriteReacquisition,
} from '../lib/server/ingestion/albumBoundedProductionResearchWriteGate';

const expectedIds = ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.observations.map(item => item.observationId);

function goodPreflight() {
  return {
    target: {
      projectId: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET.projectId,
      branchId: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET.branchId,
      branchName: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET.branchName,
      databaseName: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET.databaseName,
      schemaName: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET.schemaName,
    },
    migration3Sha256: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_MIGRATION_SHA256,
    albumResearchTablePresent: true,
    tableOwner: 'fandex_migrator',
    appendOnlyTriggerEnabled: true,
    runtimeSelect: true,
    runtimeInsert: true,
    runtimeUpdate: false,
    runtimeDelete: false,
    totalRowCount: 0,
    selectedObservationIdsPresent: [] as string[],
    sourceWorkflowRunId: 33458837843,
    sourcePayloadDigest: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.sourcePayloadDigest,
    reviewedSubsetResultDigest: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.reviewedSubsetResultDigest,
    selectedObservationIds: [...expectedIds],
  };
}

test('contract fixes first write to three Circle observations only', () => {
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_GATE_VERSION, 'album-bounded-production-research-write-gate-v1');
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.providerId, 'circle-chart');
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.providerPeriod, 'day:20260831');
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.maxProviderRequests, 1);
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.maxDatabaseWrites, 3);
  assert.equal(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.observations.length, 3);
});

test('clean preflight is approval-eligible but never self-authorizes execution', () => {
  const result = evaluateAlbumBoundedProductionResearchWriteGate(goodPreflight());
  assert.deepEqual(result.blockers, []);
  assert.equal(result.eligibleForExplicitApproval, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.productionResearchWriteAuthorized, false);
  assert.equal(result.productionPublicationAuthorized, false);
  assert.equal(result.commercialRightsCleared, false);
  assert.match(result.gateDigest, /^[0-9a-f]{64}$/);
});

test('first-write gate blocks a non-empty research table', () => {
  const result = evaluateAlbumBoundedProductionResearchWriteGate({ ...goodPreflight(), totalRowCount: 1 });
  assert.ok(result.blockers.includes('first-write-table-must-be-empty'));
});

test('selected observation already present blocks the write', () => {
  const result = evaluateAlbumBoundedProductionResearchWriteGate({
    ...goodPreflight(),
    selectedObservationIdsPresent: [expectedIds[0]],
  });
  assert.ok(result.blockers.includes('selected-observation-already-present'));
});

test('runtime UPDATE or DELETE permission blocks the write', () => {
  const update = evaluateAlbumBoundedProductionResearchWriteGate({ ...goodPreflight(), runtimeUpdate: true });
  const remove = evaluateAlbumBoundedProductionResearchWriteGate({ ...goodPreflight(), runtimeDelete: true });
  assert.ok(update.blockers.includes('runtime-privileges-invalid'));
  assert.ok(remove.blockers.includes('runtime-privileges-invalid'));
});

test('source payload drift blocks the original first-write cohort', () => {
  const result = evaluateAlbumBoundedProductionResearchWriteGate({ ...goodPreflight(), sourcePayloadDigest: '0'.repeat(64) });
  assert.ok(result.blockers.includes('source-payload-digest-mismatch'));
});

test('observation set must match exactly and ordering is canonicalized', () => {
  const reordered = evaluateAlbumBoundedProductionResearchWriteGate({
    ...goodPreflight(),
    selectedObservationIds: [...expectedIds].reverse(),
  });
  assert.deepEqual(reordered.blockers, []);

  const missing = evaluateAlbumBoundedProductionResearchWriteGate({
    ...goodPreflight(),
    selectedObservationIds: expectedIds.slice(0, 2),
  });
  assert.ok(missing.blockers.includes('selected-observation-set-mismatch'));
});

test('reacquisition must reproduce exact Circle payload and observation set', () => {
  const valid = validateAlbumBoundedProductionResearchWriteReacquisition({
    providerId: 'circle-chart',
    providerPeriod: 'day:20260831',
    sourcePayloadDigest: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.sourcePayloadDigest,
    observationIds: [...expectedIds].reverse(),
    nonIdentityRejectedRowCount: 0,
  });
  assert.equal(valid.valid, true);

  const drift = validateAlbumBoundedProductionResearchWriteReacquisition({
    providerId: 'circle-chart',
    providerPeriod: 'day:20260831',
    sourcePayloadDigest: 'f'.repeat(64),
    observationIds: expectedIds,
    nonIdentityRejectedRowCount: 0,
  });
  assert.equal(drift.valid, false);
  assert.ok(drift.issues.includes('payload-digest-mismatch'));
});

test('provider-data rejection blocks reacquired cohort even when identities match', () => {
  const result = validateAlbumBoundedProductionResearchWriteReacquisition({
    providerId: 'circle-chart',
    providerPeriod: 'day:20260831',
    sourcePayloadDigest: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.sourcePayloadDigest,
    observationIds: expectedIds,
    nonIdentityRejectedRowCount: 1,
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('provider-data-rejection-present'));
});
