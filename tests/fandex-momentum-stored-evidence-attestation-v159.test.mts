import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumStoredEvidenceAttestationResearch,
  FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR,
  type FandexMomentumStoredEvidenceReadAttestation,
} from '../lib/intelligence/fandexMomentumStoredEvidenceAttestationResearch';

const currentSnapshot = {
  canonicalArtistId: 'iu',
  naverEvidenceId:
    'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d',
  naverCollectionKey:
    'sched-v125-naver-news-20260921t000000z-f1ed381d367d',
  naverThroughSlotStart: '2026-09-21T00:00:00.000Z',
  naverStatus: 'succeeded' as const,
  naverRawEvidenceCount: 100,
  naverNormalizedRecordCount: 100,
  naverDuplicateRecordCount: 0,
  naverRejectedItemCount: 0,
};

const currentRuntime = {
  observedAt: '2026-09-21T00:02:01.000Z',
  requestPath: '/api/internal/naver-news/shadow-scheduler' as const,
  httpStatus: 200 as const,
  deploymentId: 'dpl_6fmT3qKqeytud3kFCNVoArBGGK1K',
  branch: 'main' as const,
};

test('v159 removes the caller-supplied reproduced boolean from the official provenance builder', () => {
  assert.equal(
    FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR
      .callerSuppliedReproducedBooleanAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR
      .derivesStoredEvidenceReproducedInternally,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR
      .materializedPayloadFingerprintsRequired,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR
      .databaseWriteAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR
      .productionEligible,
    false,
  );
});

test('prior 15:00Z live read audit becomes an accepted v159 attestation and reproduces v153 exactly', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_source_provenance_v153_live_reproduction_20260921T001447Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  const attestation: FandexMomentumStoredEvidenceReadAttestation = {
    contractVersion:
      'v159_fandex_momentum_stored_evidence_read_attestation_payload_v1',
    accessMode: audit.liveStoredEvidenceRead.accessMode,
    canonicalArtistId: audit.canonicalArtistId,
    naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
    naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
    readAt: audit.reproducedAt,
    jobRowReproduced: true,
    evidenceRows: audit.liveStoredEvidenceRead.evidenceRows,
    distinctEvidenceIds: audit.liveStoredEvidenceRead.distinctEvidenceIds,
    distinctItemIndexes: audit.liveStoredEvidenceRead.distinctItemIndexes,
    minItemIndex: audit.liveStoredEvidenceRead.minItemIndex,
    maxItemIndex: audit.liveStoredEvidenceRead.maxItemIndex,
    normalizedOutcomes: audit.liveStoredEvidenceRead.normalizedOutcomes,
    missingNormalizedIds: audit.liveStoredEvidenceRead.missingNormalizedIds,
    missingNormalizedRecords:
      audit.liveStoredEvidenceRead.missingNormalizedRecords,
    distinctNormalizedRecords:
      audit.liveStoredEvidenceRead.distinctNormalizedRecords,
    joinedPayloadRows: audit.liveStoredEvidenceRead.joinedPayloadRows,
    rawLinkageSetAuditMd5:
      audit.liveStoredEvidenceRead.rawLinkageSetAuditMd5,
    normalizedSetAuditMd5:
      audit.liveStoredEvidenceRead.normalizedSetAuditMd5,
    rawPayloadMaterializedAuditMd5:
      audit.liveStoredEvidenceRead.rawPayloadMaterializedAuditMd5,
    normalizedPayloadMaterializedAuditMd5:
      audit.liveStoredEvidenceRead.normalizedPayloadMaterializedAuditMd5,
    auditFingerprintPurpose:
      audit.liveStoredEvidenceRead.auditFingerprintPurpose,
  };

  const out = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: {
      canonicalArtistId: audit.canonicalArtistId,
      naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
      naverCollectionKey: audit.sourceSnapshot.naverCollectionKey,
      naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
      naverStatus: audit.sourceSnapshot.naverStatus,
      naverRawEvidenceCount: audit.sourceSnapshot.naverRawEvidenceCount,
      naverNormalizedRecordCount:
        audit.sourceSnapshot.naverNormalizedRecordCount,
      naverDuplicateRecordCount:
        audit.sourceSnapshot.naverDuplicateRecordCount,
      naverRejectedItemCount: audit.sourceSnapshot.naverRejectedItemCount,
    },
    runtimeObservation: {
      observedAt: audit.productionRuntimeObservation.observedAt,
      requestPath: audit.productionRuntimeObservation.requestPath,
      httpStatus: audit.productionRuntimeObservation.httpStatus,
      deploymentId: audit.productionRuntimeObservation.deploymentId,
      branch: audit.productionRuntimeObservation.branch,
    },
    readAttestation: attestation,
  });

  assert.equal(out.state, 'attested-provenance-ready');
  assert.equal(out.readAttestationPresent, true);
  assert.equal(out.readAttestationAccepted, true);
  assert.equal(out.storedEvidenceReproducedThisEvaluation, true);
  assert.equal(out.provenance.state, 'stored-evidence-read-reproduced');
  assert.equal(out.provenance.digest, audit.result.digest);
  assert.equal(out.provenance.futureLiveRefreshEligible, true);
  assert.deepEqual(out.blockers, []);
  assert.deepEqual(out.effects, {
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    databaseWrites: 0,
  });
});

test('current 00:00Z source without a read attestation stays blocked and cannot synthesize reproduced=true', () => {
  const out = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: currentSnapshot,
    runtimeObservation: currentRuntime,
    readAttestation: null,
  });

  assert.equal(out.state, 'attestation-blocked');
  assert.equal(out.readAttestationPresent, false);
  assert.equal(out.readAttestationAccepted, false);
  assert.equal(out.storedEvidenceReproducedThisEvaluation, false);
  assert.equal(
    out.provenance.state,
    'lineage-runtime-verified-stored-evidence-not-reproduced',
  );
  assert.equal(
    out.provenance.digest,
    '42a089fa8ba9bf61cdcc00b6f1aa376577c3fd15ca8609285fad21d76602810f',
  );
  assert.equal(out.provenance.futureLiveRefreshEligible, false);
  assert.ok(out.blockers.includes('stored-evidence-read-attestation-unavailable'));
  assert.ok(
    out.blockers.includes('stored-evidence-live-reproduction-unavailable'),
  );
});

test('mismatched source boundary cannot be upgraded by a structurally complete attestation', () => {
  const attestation: FandexMomentumStoredEvidenceReadAttestation = {
    contractVersion:
      'v159_fandex_momentum_stored_evidence_read_attestation_payload_v1',
    accessMode: 'preview-read-only-verifier',
    canonicalArtistId: 'iu',
    naverEvidenceId: '0'.repeat(64),
    naverThroughSlotStart: '2026-09-21T00:00:00.000Z',
    readAt: '2026-09-21T01:00:00.000Z',
    jobRowReproduced: true,
    evidenceRows: 100,
    distinctEvidenceIds: 100,
    distinctItemIndexes: 100,
    minItemIndex: 0,
    maxItemIndex: 99,
    normalizedOutcomes: 100,
    missingNormalizedIds: 0,
    missingNormalizedRecords: 0,
    distinctNormalizedRecords: 100,
    joinedPayloadRows: 100,
    rawLinkageSetAuditMd5: '1'.repeat(32),
    normalizedSetAuditMd5: '2'.repeat(32),
    rawPayloadMaterializedAuditMd5: '3'.repeat(32),
    normalizedPayloadMaterializedAuditMd5: '4'.repeat(32),
    auditFingerprintPurpose: 'read-integrity-only-not-methodology',
  };

  const out = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: currentSnapshot,
    runtimeObservation: currentRuntime,
    readAttestation: attestation,
  });

  assert.equal(out.state, 'attestation-blocked');
  assert.equal(out.readAttestationAccepted, false);
  assert.equal(out.storedEvidenceReproducedThisEvaluation, false);
  assert.equal(out.provenance.futureLiveRefreshEligible, false);
  assert.ok(
    out.blockers.includes('stored-evidence-attestation-source-boundary-mismatch'),
  );
});

test('incomplete row coverage or invalid fingerprints fail closed', () => {
  const attestation: FandexMomentumStoredEvidenceReadAttestation = {
    contractVersion:
      'v159_fandex_momentum_stored_evidence_read_attestation_payload_v1',
    accessMode: 'guarded-runtime-read-only',
    canonicalArtistId: 'iu',
    naverEvidenceId: currentSnapshot.naverEvidenceId,
    naverThroughSlotStart: currentSnapshot.naverThroughSlotStart,
    readAt: '2026-09-21T01:00:00.000Z',
    jobRowReproduced: true,
    evidenceRows: 99,
    distinctEvidenceIds: 99,
    distinctItemIndexes: 99,
    minItemIndex: 0,
    maxItemIndex: 98,
    normalizedOutcomes: 99,
    missingNormalizedIds: 1,
    missingNormalizedRecords: 1,
    distinctNormalizedRecords: 99,
    joinedPayloadRows: 99,
    rawLinkageSetAuditMd5: 'not-a-fingerprint',
    normalizedSetAuditMd5: '2'.repeat(32),
    rawPayloadMaterializedAuditMd5: '3'.repeat(32),
    normalizedPayloadMaterializedAuditMd5: '4'.repeat(32),
    auditFingerprintPurpose: 'read-integrity-only-not-methodology',
  };

  const out = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: currentSnapshot,
    runtimeObservation: currentRuntime,
    readAttestation: attestation,
  });

  assert.equal(out.state, 'attestation-blocked');
  assert.equal(out.storedEvidenceReproducedThisEvaluation, false);
  assert.ok(
    out.blockers.includes('stored-evidence-attestation-row-coverage-mismatch'),
  );
  assert.ok(
    out.blockers.includes(
      'stored-evidence-attestation-normalized-coverage-mismatch',
    ),
  );
  assert.ok(
    out.blockers.includes('stored-evidence-attestation-fingerprint-invalid'),
  );
});
