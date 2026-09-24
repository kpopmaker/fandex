import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumSourceProvenanceResearch,
  FANDEX_MOMENTUM_SOURCE_PROVENANCE_RESEARCH_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumSourceProvenanceResearch';

function snapshot() {
  return {
    canonicalArtistId: 'iu',
    naverEvidenceId:
      '39ec4ddeeda1eedd906bc33288e1550a6c8fd3aeb1f46be590e661fcb6c41a9c',
    naverCollectionKey:
      'sched-v125-naver-news-20260920t150000z-f1ed381d367d',
    naverThroughSlotStart: '2026-09-20T15:00:00.000Z',
    naverStatus: 'succeeded' as const,
    naverRawEvidenceCount: 100,
    naverNormalizedRecordCount: 100,
    naverDuplicateRecordCount: 0,
    naverRejectedItemCount: 0,
  };
}

function runtime() {
  return {
    observedAt: '2026-09-20T15:37:00.000Z',
    requestPath: '/api/internal/naver-news/shadow-scheduler' as const,
    httpStatus: 200 as const,
    deploymentId: 'dpl_6fmT3qKqeytud3kFCNVoArBGGK1K',
    branch: 'main' as const,
  };
}

test('v153 separates deterministic/runtime provenance from stored-evidence reproduction', () => {
  assert.equal(
    FANDEX_MOMENTUM_SOURCE_PROVENANCE_RESEARCH_DESCRIPTOR
      .runtimeInvocationAloneProvesStoredEvidencePayload,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_SOURCE_PROVENANCE_RESEARCH_DESCRIPTOR
      .snapshotEvidenceMayClaimLiveStoredEvidenceReproductionWithoutRead,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_SOURCE_PROVENANCE_RESEARCH_DESCRIPTOR
      .databaseWriteAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_SOURCE_PROVENANCE_RESEARCH_DESCRIPTOR
      .productionEligible,
    false,
  );
});

test('current v152 NAVER evidence has exact canonical scheduler and job lineage', () => {
  const result = evaluateFandexMomentumSourceProvenanceResearch({
    snapshot: snapshot(),
    runtimeObservation: runtime(),
    storedEvidenceReproducedThisEvaluation: false,
  });

  assert.equal(
    result.state,
    'lineage-runtime-verified-stored-evidence-not-reproduced',
  );
  assert.equal(result.deterministicLineageVerified, true);
  assert.equal(result.productionRuntimeInvocationObserved, true);
  assert.equal(result.runtimeObservationMapsToEvidenceSlot, true);
  assert.equal(result.snapshotEvidenceInternallyConsistent, true);
  assert.equal(result.storedEvidenceReproducedThisEvaluation, false);
  assert.equal(
    result.provenanceStrength,
    'deterministic-lineage-plus-production-runtime-invocation',
  );
  assert.equal(result.currentRealClaimScope, 'source-snapshot-with-runtime-lineage');
  assert.equal(result.futureLiveRefreshEligible, false);
  assert.deepEqual(result.blockers, [
    'stored-evidence-live-reproduction-unavailable',
  ]);
  assert.equal(result.effects.databaseWrites, 0);
  assert.equal(result.effects.productMetricReads, 0);
  assert.equal(result.effects.previewFallbackReads, 0);
});

test('stored-evidence read reproduction clears only the provenance blocker', () => {
  const result = evaluateFandexMomentumSourceProvenanceResearch({
    snapshot: snapshot(),
    runtimeObservation: runtime(),
    storedEvidenceReproducedThisEvaluation: true,
  });

  assert.equal(result.state, 'stored-evidence-read-reproduced');
  assert.equal(result.provenanceStrength, 'stored-evidence-read-reproduced');
  assert.equal(result.currentRealClaimScope, 'live-stored-evidence-reproduced');
  assert.equal(result.futureLiveRefreshEligible, true);
  assert.deepEqual(result.blockers, []);
});

test('changed collection key fails closed even when slot and runtime look valid', () => {
  assert.throws(
    () => evaluateFandexMomentumSourceProvenanceResearch({
      snapshot: {
        ...snapshot(),
        naverCollectionKey:
          'sched-v125-naver-news-20260920t150000z-000000000000',
      },
      runtimeObservation: runtime(),
      storedEvidenceReproducedThisEvaluation: false,
    }),
    /momentum_v153_collection_lineage_invalid/,
  );
});

test('changed evidence id fails closed against deterministic job identity', () => {
  assert.throws(
    () => evaluateFandexMomentumSourceProvenanceResearch({
      snapshot: {
        ...snapshot(),
        naverEvidenceId: '0'.repeat(64),
      },
      runtimeObservation: runtime(),
      storedEvidenceReproducedThisEvaluation: false,
    }),
    /momentum_v153_job_lineage_invalid/,
  );
});

test('runtime observation from a different scheduler hour cannot verify this evidence slot', () => {
  assert.throws(
    () => evaluateFandexMomentumSourceProvenanceResearch({
      snapshot: snapshot(),
      runtimeObservation: {
        ...runtime(),
        observedAt: '2026-09-20T14:57:00.000Z',
      },
      storedEvidenceReproducedThisEvaluation: false,
    }),
    /momentum_v153_runtime_slot_mismatch/,
  );
});

test('snapshot counts must reconcile without treating missing as zero', () => {
  assert.throws(
    () => evaluateFandexMomentumSourceProvenanceResearch({
      snapshot: {
        ...snapshot(),
        naverNormalizedRecordCount: 99,
      },
      runtimeObservation: runtime(),
      storedEvidenceReproducedThisEvaluation: false,
    }),
    /momentum_v153_snapshot_count_reconciliation_invalid/,
  );
});


test('committed v153 current-real provenance audit reproduces exact research result', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_source_provenance_v153_20260920T153700Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  assert.equal(
    audit.contractVersion,
    'v153_fandex_momentum_current_real_source_provenance_audit_v1',
  );
  assert.equal(audit.liveStoredEvidenceAccess.githubActionsRuntimeDatabaseCredentialAvailable, false);
  assert.equal(audit.liveStoredEvidenceAccess.neonConnectorProjectVisible, false);
  assert.equal(audit.liveStoredEvidenceAccess.storedEvidenceReproducedThisEvaluation, false);
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');

  const recomputed = evaluateFandexMomentumSourceProvenanceResearch({
    snapshot: {
      canonicalArtistId: audit.canonicalArtistId,
      naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
      naverCollectionKey: audit.sourceSnapshot.naverCollectionKey,
      naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
      naverStatus: audit.sourceSnapshot.naverStatus,
      naverRawEvidenceCount: audit.sourceSnapshot.naverRawEvidenceCount,
      naverNormalizedRecordCount: audit.sourceSnapshot.naverNormalizedRecordCount,
      naverDuplicateRecordCount: audit.sourceSnapshot.naverDuplicateRecordCount,
      naverRejectedItemCount: audit.sourceSnapshot.naverRejectedItemCount,
    },
    runtimeObservation: {
      observedAt: audit.productionRuntimeObservation.observedAt,
      requestPath: audit.productionRuntimeObservation.requestPath,
      httpStatus: audit.productionRuntimeObservation.httpStatus,
      deploymentId: audit.productionRuntimeObservation.deploymentId,
      branch: audit.productionRuntimeObservation.branch,
    },
    storedEvidenceReproducedThisEvaluation:
      audit.liveStoredEvidenceAccess.storedEvidenceReproducedThisEvaluation,
  });

  assert.equal(recomputed.digest, audit.result.digest);
  assert.equal(recomputed.state, audit.result.state);
  assert.equal(recomputed.provenanceStrength, audit.result.provenanceStrength);
  assert.equal(recomputed.currentRealClaimScope, audit.result.currentRealClaimScope);
  assert.equal(recomputed.futureLiveRefreshEligible, false);
  assert.deepEqual(recomputed.blockers, audit.result.blockers);
});


test('committed v153 live reproduction audit clears provenance blocker', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_source_provenance_v153_live_reproduction_20260921T001447Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  assert.equal(
    audit.contractVersion,
    'v153_fandex_momentum_live_stored_evidence_reproduction_audit_v1',
  );
  assert.equal(audit.liveStoredEvidenceRead.accessMode, 'neon-read-only');
  assert.equal(audit.liveStoredEvidenceRead.jobRowReproduced, true);
  assert.equal(audit.liveStoredEvidenceRead.evidenceRows, 100);
  assert.equal(audit.liveStoredEvidenceRead.distinctEvidenceIds, 100);
  assert.equal(audit.liveStoredEvidenceRead.distinctItemIndexes, 100);
  assert.equal(audit.liveStoredEvidenceRead.minItemIndex, 0);
  assert.equal(audit.liveStoredEvidenceRead.maxItemIndex, 99);
  assert.equal(audit.liveStoredEvidenceRead.normalizedOutcomes, 100);
  assert.equal(audit.liveStoredEvidenceRead.missingNormalizedIds, 0);
  assert.equal(audit.liveStoredEvidenceRead.missingNormalizedRecords, 0);
  assert.equal(audit.liveStoredEvidenceRead.distinctNormalizedRecords, 100);
  assert.equal(audit.liveStoredEvidenceRead.joinedPayloadRows, 100);
  assert.equal(
    audit.liveStoredEvidenceRead.auditFingerprintPurpose,
    'read-integrity-only-not-methodology',
  );

  const recomputed = evaluateFandexMomentumSourceProvenanceResearch({
    snapshot: {
      canonicalArtistId: audit.canonicalArtistId,
      naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
      naverCollectionKey: audit.sourceSnapshot.naverCollectionKey,
      naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
      naverStatus: audit.sourceSnapshot.naverStatus,
      naverRawEvidenceCount: audit.sourceSnapshot.naverRawEvidenceCount,
      naverNormalizedRecordCount: audit.sourceSnapshot.naverNormalizedRecordCount,
      naverDuplicateRecordCount: audit.sourceSnapshot.naverDuplicateRecordCount,
      naverRejectedItemCount: audit.sourceSnapshot.naverRejectedItemCount,
    },
    runtimeObservation: {
      observedAt: audit.productionRuntimeObservation.observedAt,
      requestPath: audit.productionRuntimeObservation.requestPath,
      httpStatus: audit.productionRuntimeObservation.httpStatus,
      deploymentId: audit.productionRuntimeObservation.deploymentId,
      branch: audit.productionRuntimeObservation.branch,
    },
    storedEvidenceReproducedThisEvaluation: true,
  });

  assert.equal(recomputed.digest, audit.result.digest);
  assert.equal(recomputed.state, 'stored-evidence-read-reproduced');
  assert.equal(recomputed.storedEvidenceReproducedThisEvaluation, true);
  assert.equal(recomputed.provenanceStrength, 'stored-evidence-read-reproduced');
  assert.equal(recomputed.currentRealClaimScope, 'live-stored-evidence-reproduced');
  assert.equal(recomputed.futureLiveRefreshEligible, true);
  assert.deepEqual(recomputed.blockers, []);
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});
