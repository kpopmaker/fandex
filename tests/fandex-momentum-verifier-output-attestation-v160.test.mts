import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch,
  FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RESEARCH_DESCRIPTOR,
  type FandexMomentumStoredEvidenceVerifierOutput,
} from '../lib/intelligence/fandexMomentumVerifierOutputAttestationAdapterResearch';
import {
  evaluateFandexMomentumStoredEvidenceAttestationResearch,
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

function verifierOutput(
  input: Partial<FandexMomentumStoredEvidenceVerifierOutput> = {},
): FandexMomentumStoredEvidenceVerifierOutput {
  return {
    contractVersion:
      'v160_fandex_momentum_stored_evidence_verifier_output_v1',
    verifier: 'neon-read-only-reproducer',
    executionId: 'synthetic-contract-test-execution',
    executedAt: '2026-09-21T01:24:00.000Z',
    accessMode: 'neon-read-only',
    databaseReadOnly: true,
    databaseWritesObserved: 0,
    canonicalArtistId: 'iu',
    naverEvidenceId: currentSnapshot.naverEvidenceId,
    naverCollectionKey: currentSnapshot.naverCollectionKey,
    naverThroughSlotStart: currentSnapshot.naverThroughSlotStart,
    naverStatus: 'succeeded',
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
    rawPayloadTextBytes: 60330,
    normalizedPayloadTextBytes: 66500,
    rawLinkageSetAuditMd5: '6892072a00120377b48866e854f5b62e',
    normalizedSetAuditMd5: '969c36faca5eae23a36ae97e54d584a2',
    rawPayloadMaterializedAuditMd5:
      '49838a726e3261c29b51442024fb9a92',
    normalizedPayloadMaterializedAuditMd5:
      '365dc9b9d7984969ff34aac75aab192f',
    auditFingerprintPurpose: 'read-integrity-only-not-methodology',
    ...input,
  };
}

test('v160 requires concrete verifier output and remains research-only', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RESEARCH_DESCRIPTOR
      .concreteVerifierExecutionRequired,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RESEARCH_DESCRIPTOR
      .countOnlyVerifierOutputAccepted,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RESEARCH_DESCRIPTOR
      .runtimeOnlyVerifierOutputAccepted,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RESEARCH_DESCRIPTOR
      .callerAssertedReproductionFlagAccepted,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RESEARCH_DESCRIPTOR
      .prebuiltAttestationAcceptedAsVerifierOutput,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RESEARCH_DESCRIPTOR
      .databaseWriteAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RESEARCH_DESCRIPTOR
      .productionEligible,
    false,
  );
});

test('synthetic complete verifier contract adapts to the exact committed 00Z v159 attestation payload shape', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_stored_evidence_attestation_v159_20260921T012400Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  const output = verifierOutput({
    executionId:
      `retrospective-compatibility:${audit.neonReadOnlyReproduction.projectId}:${audit.readAt}`,
    executedAt: audit.readAt,
    evidenceRows: audit.neonReadOnlyReproduction.evidenceRows,
    distinctEvidenceIds:
      audit.neonReadOnlyReproduction.distinctEvidenceIds,
    distinctItemIndexes:
      audit.neonReadOnlyReproduction.distinctItemIndexes,
    minItemIndex: audit.neonReadOnlyReproduction.minItemIndex,
    maxItemIndex: audit.neonReadOnlyReproduction.maxItemIndex,
    normalizedOutcomes:
      audit.neonReadOnlyReproduction.normalizedOutcomes,
    missingNormalizedIds:
      audit.neonReadOnlyReproduction.missingNormalizedIds,
    missingNormalizedRecords:
      audit.neonReadOnlyReproduction.missingNormalizedRecords,
    distinctNormalizedRecords:
      audit.neonReadOnlyReproduction.distinctNormalizedRecords,
    joinedPayloadRows:
      audit.neonReadOnlyReproduction.joinedPayloadRows,
    rawPayloadTextBytes:
      audit.neonReadOnlyReproduction.rawPayloadTextBytes,
    normalizedPayloadTextBytes:
      audit.neonReadOnlyReproduction.normalizedPayloadTextBytes,
    rawLinkageSetAuditMd5:
      audit.neonReadOnlyReproduction.rawLinkageSetAuditMd5,
    normalizedSetAuditMd5:
      audit.neonReadOnlyReproduction.normalizedSetAuditMd5,
    rawPayloadMaterializedAuditMd5:
      audit.neonReadOnlyReproduction.rawPayloadMaterializedAuditMd5,
    normalizedPayloadMaterializedAuditMd5:
      audit.neonReadOnlyReproduction.normalizedPayloadMaterializedAuditMd5,
  });

  const adapted =
    adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch({
      snapshot: currentSnapshot,
      verifierOutput: output,
    });

  assert.equal(adapted.state, 'attestation-adapted');
  assert.equal(adapted.verifierOutputAccepted, true);
  assert.deepEqual(adapted.blockers, []);
  assert.deepEqual(adapted.attestation, audit.readAttestation);

  const downstream = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: currentSnapshot,
    runtimeObservation: currentRuntime,
    readAttestation: adapted.attestation,
  });

  assert.equal(downstream.state, 'attested-provenance-ready');
  assert.equal(
    downstream.digest,
    audit.expectedAttestationResult.attestationDigest,
  );
  assert.equal(
    downstream.provenance.digest,
    audit.expectedAttestationResult.provenanceDigest,
  );
  assert.equal(downstream.provenance.futureLiveRefreshEligible, true);
});

test('caller-supplied reproduced or provenance assertions are rejected at runtime', () => {
  const output = {
    ...verifierOutput(),
    storedEvidenceReproducedThisEvaluation: true,
    futureLiveRefreshEligible: true,
  } as unknown as FandexMomentumStoredEvidenceVerifierOutput;

  const adapted =
    adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch({
      snapshot: currentSnapshot,
      verifierOutput: output,
    });

  assert.equal(adapted.state, 'verifier-output-rejected');
  assert.equal(adapted.verifierOutputAccepted, false);
  assert.equal(adapted.attestation, null);
  assert.ok(
    adapted.blockers.includes('verifier-output-caller-assertion-forbidden'),
  );
});

test('prior-source verifier output cannot be reused for a newer source boundary', () => {
  const output = verifierOutput({
    naverEvidenceId:
      '39ec4ddeeda1eedd906bc33288e1550a6c8fd3aeb1f46be590e661fcb6c41a9c',
    naverCollectionKey:
      'sched-v125-naver-news-20260920t150000z-f1ed381d367d',
    naverThroughSlotStart: '2026-09-20T15:00:00.000Z',
  });

  const adapted =
    adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch({
      snapshot: currentSnapshot,
      verifierOutput: output,
    });

  assert.equal(adapted.state, 'verifier-output-rejected');
  assert.equal(adapted.attestation, null);
  assert.ok(
    adapted.blockers.includes('verifier-output-source-boundary-mismatch'),
  );
});

test('count-only verifier output is rejected without materialized payload fingerprints', () => {
  const output = verifierOutput({
    rawLinkageSetAuditMd5: '',
    normalizedSetAuditMd5: '',
    rawPayloadMaterializedAuditMd5: '',
    normalizedPayloadMaterializedAuditMd5: '',
  });

  const adapted =
    adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch({
      snapshot: currentSnapshot,
      verifierOutput: output,
    });

  assert.equal(adapted.state, 'verifier-output-rejected');
  assert.equal(adapted.attestation, null);
  assert.ok(adapted.blockers.includes('verifier-output-fingerprint-invalid'));
});

test('runtime-only or incomplete materialization is rejected', () => {
  const output = verifierOutput({
    jobRowReproduced: true,
    evidenceRows: 100,
    distinctEvidenceIds: 100,
    distinctItemIndexes: 100,
    joinedPayloadRows: 100,
    rawPayloadTextBytes: 0,
    normalizedPayloadTextBytes: 0,
  });

  const adapted =
    adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch({
      snapshot: currentSnapshot,
      verifierOutput: output,
    });

  assert.equal(adapted.state, 'verifier-output-rejected');
  assert.equal(adapted.attestation, null);
  assert.ok(
    adapted.blockers.includes('verifier-output-materialized-payload-empty'),
  );
});

test('read-write verifier execution is rejected even when row counts and fingerprints match', () => {
  const output = {
    ...verifierOutput(),
    databaseReadOnly: false,
    databaseWritesObserved: 1,
  } as unknown as FandexMomentumStoredEvidenceVerifierOutput;

  const adapted =
    adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch({
      snapshot: currentSnapshot,
      verifierOutput: output,
    });

  assert.equal(adapted.state, 'verifier-output-rejected');
  assert.equal(adapted.attestation, null);
  assert.ok(adapted.blockers.includes('verifier-output-not-read-only'));
});

test('v160 adapter itself has zero Product, database, and physical artifact effects', () => {
  const adapted =
    adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch({
      snapshot: currentSnapshot,
      verifierOutput: verifierOutput(),
    });

  assert.deepEqual(adapted.effects, {
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    databaseWrites: 0,
    physicalArtifactWrites: 0,
  });
});
