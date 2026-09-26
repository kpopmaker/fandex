import { sha256Canonical } from '../../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RUNTIME_VERSION =
  'v160_fandex_momentum_verifier_output_attestation_adapter_research_v1' as const;

export type FandexMomentumNaverSourceSnapshotEvidence = Readonly<{
  canonicalArtistId: string;
  naverEvidenceId: string;
  naverCollectionKey: string;
  naverThroughSlotStart: string;
  naverStatus: 'succeeded';
  naverRawEvidenceCount: number;
  naverNormalizedRecordCount: number;
  naverDuplicateRecordCount: number;
  naverRejectedItemCount: number;
}>;

export type FandexMomentumStoredEvidenceReadAttestation = Readonly<{
  contractVersion:
    'v159_fandex_momentum_stored_evidence_read_attestation_payload_v1';
  accessMode:
    | 'neon-read-only'
    | 'guarded-runtime-read-only'
    | 'preview-read-only-verifier';
  canonicalArtistId: string;
  naverEvidenceId: string;
  naverThroughSlotStart: string;
  readAt: string;
  jobRowReproduced: true;
  evidenceRows: number;
  distinctEvidenceIds: number;
  distinctItemIndexes: number;
  minItemIndex: number;
  maxItemIndex: number;
  normalizedOutcomes: number;
  missingNormalizedIds: number;
  missingNormalizedRecords: number;
  distinctNormalizedRecords: number;
  joinedPayloadRows: number;
  rawLinkageSetAuditMd5: string;
  normalizedSetAuditMd5: string;
  rawPayloadMaterializedAuditMd5: string;
  normalizedPayloadMaterializedAuditMd5: string;
  auditFingerprintPurpose: 'read-integrity-only-not-methodology';
}>;

export type FandexMomentumStoredEvidenceVerifierOutput = Readonly<{
  contractVersion:
    'v160_fandex_momentum_stored_evidence_verifier_output_v1';
  verifier:
    | 'neon-read-only-reproducer'
    | 'guarded-runtime-read-only-verifier'
    | 'preview-read-only-verifier';
  executionId: string;
  executedAt: string;
  accessMode:
    | 'neon-read-only'
    | 'guarded-runtime-read-only'
    | 'preview-read-only-verifier';
  databaseReadOnly: true;
  databaseWritesObserved: 0;
  canonicalArtistId: string;
  naverEvidenceId: string;
  naverCollectionKey: string;
  naverThroughSlotStart: string;
  naverStatus: 'succeeded';
  jobRowReproduced: true;
  evidenceRows: number;
  distinctEvidenceIds: number;
  distinctItemIndexes: number;
  minItemIndex: number;
  maxItemIndex: number;
  normalizedOutcomes: number;
  missingNormalizedIds: number;
  missingNormalizedRecords: number;
  distinctNormalizedRecords: number;
  joinedPayloadRows: number;
  rawPayloadTextBytes: number;
  normalizedPayloadTextBytes: number;
  rawLinkageSetAuditMd5: string;
  normalizedSetAuditMd5: string;
  rawPayloadMaterializedAuditMd5: string;
  normalizedPayloadMaterializedAuditMd5: string;
  auditFingerprintPurpose: 'read-integrity-only-not-methodology';
}>;

export type FandexMomentumVerifierOutputAttestationAdapterResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RUNTIME_VERSION;
  state: 'verifier-output-rejected' | 'attestation-adapted';
  canonicalArtistId: string;
  naverEvidenceId: string;
  naverThroughSlotStart: string;
  verifierOutputAccepted: boolean;
  attestation: FandexMomentumStoredEvidenceReadAttestation | null;
  blockers: readonly string[];
  digest: string;
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
    physicalArtifactWrites: 0;
  }>;
}>;

const MD5 = /^[0-9a-f]{32}$/;

function exactIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value;
}

function nonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function expectedVerifierForAccessMode(
  accessMode: FandexMomentumStoredEvidenceVerifierOutput['accessMode'],
): FandexMomentumStoredEvidenceVerifierOutput['verifier'] {
  if (accessMode === 'neon-read-only') return 'neon-read-only-reproducer';
  if (accessMode === 'guarded-runtime-read-only') {
    return 'guarded-runtime-read-only-verifier';
  }
  return 'preview-read-only-verifier';
}

function hasForbiddenCallerAssertion(
  output: FandexMomentumStoredEvidenceVerifierOutput,
): boolean {
  const runtime = output as unknown as Record<string, unknown>;
  return [
    'storedEvidenceReproducedThisEvaluation',
    'futureLiveRefreshEligible',
    'provenanceState',
    'readAttestation',
  ].some((key) => key in runtime);
}

export function adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationRuntime(
  input: Readonly<{
    snapshot: FandexMomentumNaverSourceSnapshotEvidence;
    verifierOutput: FandexMomentumStoredEvidenceVerifierOutput;
  }>,
): FandexMomentumVerifierOutputAttestationAdapterResult {
  const { snapshot, verifierOutput } = input;
  const blockers: string[] = [];

  if (
    verifierOutput.contractVersion
      !== 'v160_fandex_momentum_stored_evidence_verifier_output_v1'
  ) {
    blockers.push('verifier-output-contract-invalid');
  }
  if (hasForbiddenCallerAssertion(verifierOutput)) {
    blockers.push('verifier-output-caller-assertion-forbidden');
  }
  if (
    verifierOutput.verifier
      !== expectedVerifierForAccessMode(verifierOutput.accessMode)
  ) {
    blockers.push('verifier-output-access-mode-mismatch');
  }
  if (!verifierOutput.executionId.trim()) {
    blockers.push('verifier-output-execution-id-missing');
  }
  if (!exactIso(verifierOutput.executedAt)) {
    blockers.push('verifier-output-executed-at-invalid');
  }
  if (
    verifierOutput.databaseReadOnly !== true
    || verifierOutput.databaseWritesObserved !== 0
  ) {
    blockers.push('verifier-output-not-read-only');
  }
  if (
    verifierOutput.canonicalArtistId !== snapshot.canonicalArtistId
    || verifierOutput.naverEvidenceId !== snapshot.naverEvidenceId
    || verifierOutput.naverCollectionKey !== snapshot.naverCollectionKey
    || verifierOutput.naverThroughSlotStart
      !== snapshot.naverThroughSlotStart
    || verifierOutput.naverStatus !== snapshot.naverStatus
  ) {
    blockers.push('verifier-output-source-boundary-mismatch');
  }
  if (verifierOutput.jobRowReproduced !== true) {
    blockers.push('verifier-output-job-row-not-reproduced');
  }

  for (const value of [
    verifierOutput.evidenceRows,
    verifierOutput.distinctEvidenceIds,
    verifierOutput.distinctItemIndexes,
    verifierOutput.minItemIndex,
    verifierOutput.maxItemIndex,
    verifierOutput.normalizedOutcomes,
    verifierOutput.missingNormalizedIds,
    verifierOutput.missingNormalizedRecords,
    verifierOutput.distinctNormalizedRecords,
    verifierOutput.joinedPayloadRows,
    verifierOutput.rawPayloadTextBytes,
    verifierOutput.normalizedPayloadTextBytes,
  ]) {
    if (!nonNegativeInteger(value)) {
      blockers.push('verifier-output-count-invalid');
      break;
    }
  }

  const expectedRows = snapshot.naverRawEvidenceCount;
  if (
    verifierOutput.evidenceRows !== expectedRows
    || verifierOutput.distinctEvidenceIds !== expectedRows
    || verifierOutput.distinctItemIndexes !== expectedRows
    || verifierOutput.joinedPayloadRows !== expectedRows
  ) {
    blockers.push('verifier-output-row-coverage-mismatch');
  }
  if (
    expectedRows > 0
    && (
      verifierOutput.minItemIndex !== 0
      || verifierOutput.maxItemIndex !== expectedRows - 1
    )
  ) {
    blockers.push('verifier-output-item-index-coverage-mismatch');
  }
  if (
    verifierOutput.normalizedOutcomes
      !== snapshot.naverNormalizedRecordCount
    || verifierOutput.missingNormalizedIds !== 0
    || verifierOutput.missingNormalizedRecords !== 0
    || verifierOutput.distinctNormalizedRecords
      !== snapshot.naverNormalizedRecordCount
  ) {
    blockers.push('verifier-output-normalized-coverage-mismatch');
  }
  if (
    expectedRows > 0
    && (
      verifierOutput.rawPayloadTextBytes === 0
      || verifierOutput.normalizedPayloadTextBytes === 0
    )
  ) {
    blockers.push('verifier-output-materialized-payload-empty');
  }
  for (const fingerprint of [
    verifierOutput.rawLinkageSetAuditMd5,
    verifierOutput.normalizedSetAuditMd5,
    verifierOutput.rawPayloadMaterializedAuditMd5,
    verifierOutput.normalizedPayloadMaterializedAuditMd5,
  ]) {
    if (!MD5.test(fingerprint)) {
      blockers.push('verifier-output-fingerprint-invalid');
      break;
    }
  }
  if (
    verifierOutput.auditFingerprintPurpose
      !== 'read-integrity-only-not-methodology'
  ) {
    blockers.push('verifier-output-fingerprint-purpose-invalid');
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const accepted = uniqueBlockers.length === 0;
  const attestation = accepted
    ? Object.freeze({
      contractVersion:
        'v159_fandex_momentum_stored_evidence_read_attestation_payload_v1' as const,
      accessMode: verifierOutput.accessMode,
      canonicalArtistId: verifierOutput.canonicalArtistId,
      naverEvidenceId: verifierOutput.naverEvidenceId,
      naverThroughSlotStart: verifierOutput.naverThroughSlotStart,
      readAt: verifierOutput.executedAt,
      jobRowReproduced: true as const,
      evidenceRows: verifierOutput.evidenceRows,
      distinctEvidenceIds: verifierOutput.distinctEvidenceIds,
      distinctItemIndexes: verifierOutput.distinctItemIndexes,
      minItemIndex: verifierOutput.minItemIndex,
      maxItemIndex: verifierOutput.maxItemIndex,
      normalizedOutcomes: verifierOutput.normalizedOutcomes,
      missingNormalizedIds: verifierOutput.missingNormalizedIds,
      missingNormalizedRecords: verifierOutput.missingNormalizedRecords,
      distinctNormalizedRecords: verifierOutput.distinctNormalizedRecords,
      joinedPayloadRows: verifierOutput.joinedPayloadRows,
      rawLinkageSetAuditMd5: verifierOutput.rawLinkageSetAuditMd5,
      normalizedSetAuditMd5: verifierOutput.normalizedSetAuditMd5,
      rawPayloadMaterializedAuditMd5:
        verifierOutput.rawPayloadMaterializedAuditMd5,
      normalizedPayloadMaterializedAuditMd5:
        verifierOutput.normalizedPayloadMaterializedAuditMd5,
      auditFingerprintPurpose:
        'read-integrity-only-not-methodology' as const,
    })
    : null;

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_OUTPUT_ATTESTATION_ADAPTER_RUNTIME_VERSION,
    state: accepted
      ? 'attestation-adapted' as const
      : 'verifier-output-rejected' as const,
    canonicalArtistId: snapshot.canonicalArtistId,
    naverEvidenceId: snapshot.naverEvidenceId,
    naverThroughSlotStart: snapshot.naverThroughSlotStart,
    verifierOutputAccepted: accepted,
    verifier: verifierOutput.verifier,
    executionId: verifierOutput.executionId,
    executedAt: verifierOutput.executedAt,
    attestationDigest: attestation === null
      ? null
      : sha256Canonical(attestation),
    blockers: uniqueBlockers,
  };

  return Object.freeze({
    contractVersion: payload.contractVersion,
    state: payload.state,
    canonicalArtistId: payload.canonicalArtistId,
    naverEvidenceId: payload.naverEvidenceId,
    naverThroughSlotStart: payload.naverThroughSlotStart,
    verifierOutputAccepted: accepted,
    attestation,
    blockers: uniqueBlockers,
    digest: sha256Canonical(payload),
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
      physicalArtifactWrites: 0 as const,
    }),
  });
}
