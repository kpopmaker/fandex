import { sha256Canonical } from '../shared/canonicalDigest';
import {
  evaluateFandexMomentumSourceProvenanceResearch,
  type FandexMomentumNaverSourceSnapshotEvidence,
  type FandexMomentumProductionRuntimeObservation,
  type FandexMomentumSourceProvenanceResearchResult,
} from './fandexMomentumSourceProvenanceResearch';
import {
  evaluateFandexMomentumProvenanceGatedRefreshResearch,
  type FandexMomentumProvenanceGatedRefreshResult,
} from './fandexMomentumProvenanceGatedRefreshResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';
import type {
  FandexMomentumSourceEvidenceWatermark,
} from './fandexMomentumCommonCutoffAdvancementGateResearch';

export const FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_VERSION =
  'v159_fandex_momentum_stored_evidence_read_attestation_research_v1' as const;

export const FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    upstreamProvenanceContract:
      'v153_fandex_momentum_source_provenance_research_v1' as const,
    callerSuppliedReproducedBooleanAllowed: false as const,
    exactSourceBoundaryMatchRequired: true as const,
    fullStoredRowCoverageRequired: true as const,
    materializedPayloadFingerprintsRequired: true as const,
    derivesStoredEvidenceReproducedInternally: true as const,
    physicalPersistencePerformed: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    productionEligible: false as const,
  });

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

export type FandexMomentumStoredEvidenceAttestationResearchResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_VERSION;
  state: 'attestation-blocked' | 'attested-provenance-ready';
  canonicalArtistId: string;
  naverEvidenceId: string;
  naverThroughSlotStart: string;
  readAttestationPresent: boolean;
  readAttestationAccepted: boolean;
  storedEvidenceReproducedThisEvaluation: boolean;
  provenance: FandexMomentumSourceProvenanceResearchResult;
  blockers: readonly string[];
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
  }>;
  digest: string;
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

function validateAttestation(
  snapshot: FandexMomentumNaverSourceSnapshotEvidence,
  attestation: FandexMomentumStoredEvidenceReadAttestation,
): readonly string[] {
  const blockers: string[] = [];

  if (
    attestation.contractVersion
      !== 'v159_fandex_momentum_stored_evidence_read_attestation_payload_v1'
  ) {
    blockers.push('stored-evidence-attestation-contract-invalid');
  }
  if (
    ![
      'neon-read-only',
      'guarded-runtime-read-only',
      'preview-read-only-verifier',
    ].includes(attestation.accessMode)
  ) {
    blockers.push('stored-evidence-attestation-access-mode-invalid');
  }
  if (
    attestation.canonicalArtistId !== snapshot.canonicalArtistId
    || attestation.naverEvidenceId !== snapshot.naverEvidenceId
    || attestation.naverThroughSlotStart !== snapshot.naverThroughSlotStart
  ) {
    blockers.push('stored-evidence-attestation-source-boundary-mismatch');
  }
  if (!exactIso(attestation.readAt)) {
    blockers.push('stored-evidence-attestation-read-at-invalid');
  }
  if (attestation.jobRowReproduced !== true) {
    blockers.push('stored-evidence-attestation-job-row-not-reproduced');
  }

  for (const value of [
    attestation.evidenceRows,
    attestation.distinctEvidenceIds,
    attestation.distinctItemIndexes,
    attestation.minItemIndex,
    attestation.maxItemIndex,
    attestation.normalizedOutcomes,
    attestation.missingNormalizedIds,
    attestation.missingNormalizedRecords,
    attestation.distinctNormalizedRecords,
    attestation.joinedPayloadRows,
  ]) {
    if (!nonNegativeInteger(value)) {
      blockers.push('stored-evidence-attestation-count-invalid');
      break;
    }
  }

  const expectedRows = snapshot.naverRawEvidenceCount;
  if (
    attestation.evidenceRows !== expectedRows
    || attestation.distinctEvidenceIds !== expectedRows
    || attestation.distinctItemIndexes !== expectedRows
    || attestation.joinedPayloadRows !== expectedRows
  ) {
    blockers.push('stored-evidence-attestation-row-coverage-mismatch');
  }
  if (
    expectedRows > 0
    && (
      attestation.minItemIndex !== 0
      || attestation.maxItemIndex !== expectedRows - 1
    )
  ) {
    blockers.push('stored-evidence-attestation-item-index-coverage-mismatch');
  }
  if (
    attestation.normalizedOutcomes !== snapshot.naverNormalizedRecordCount
    || attestation.missingNormalizedIds !== 0
    || attestation.missingNormalizedRecords !== 0
    || attestation.distinctNormalizedRecords
      !== snapshot.naverNormalizedRecordCount
  ) {
    blockers.push('stored-evidence-attestation-normalized-coverage-mismatch');
  }

  for (const fingerprint of [
    attestation.rawLinkageSetAuditMd5,
    attestation.normalizedSetAuditMd5,
    attestation.rawPayloadMaterializedAuditMd5,
    attestation.normalizedPayloadMaterializedAuditMd5,
  ]) {
    if (!MD5.test(fingerprint)) {
      blockers.push('stored-evidence-attestation-fingerprint-invalid');
      break;
    }
  }
  if (
    attestation.auditFingerprintPurpose
      !== 'read-integrity-only-not-methodology'
  ) {
    blockers.push('stored-evidence-attestation-fingerprint-purpose-invalid');
  }

  return Object.freeze([...new Set(blockers)]);
}

export function evaluateFandexMomentumStoredEvidenceAttestationResearch(
  input: Readonly<{
    snapshot: FandexMomentumNaverSourceSnapshotEvidence;
    runtimeObservation: FandexMomentumProductionRuntimeObservation;
    readAttestation: FandexMomentumStoredEvidenceReadAttestation | null;
  }>,
): FandexMomentumStoredEvidenceAttestationResearchResult {
  const attestationBlockers = input.readAttestation === null
    ? Object.freeze(['stored-evidence-read-attestation-unavailable'])
    : validateAttestation(input.snapshot, input.readAttestation);
  const readAttestationAccepted =
    input.readAttestation !== null && attestationBlockers.length === 0;
  const storedEvidenceReproducedThisEvaluation = readAttestationAccepted;

  const provenance = evaluateFandexMomentumSourceProvenanceResearch({
    snapshot: input.snapshot,
    runtimeObservation: input.runtimeObservation,
    storedEvidenceReproducedThisEvaluation,
  });

  const state = readAttestationAccepted
    ? 'attested-provenance-ready' as const
    : 'attestation-blocked' as const;
  const blockers = readAttestationAccepted
    ? Object.freeze([] as string[])
    : Object.freeze([
      ...attestationBlockers,
      ...provenance.blockers,
    ]);

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_VERSION,
    state,
    canonicalArtistId: input.snapshot.canonicalArtistId,
    naverEvidenceId: input.snapshot.naverEvidenceId,
    naverThroughSlotStart: input.snapshot.naverThroughSlotStart,
    readAttestationPresent: input.readAttestation !== null,
    readAttestationAccepted,
    storedEvidenceReproducedThisEvaluation,
    provenanceDigest: provenance.digest,
    blockers,
  };

  return Object.freeze({
    contractVersion: payload.contractVersion,
    state,
    canonicalArtistId: payload.canonicalArtistId,
    naverEvidenceId: payload.naverEvidenceId,
    naverThroughSlotStart: payload.naverThroughSlotStart,
    readAttestationPresent: payload.readAttestationPresent,
    readAttestationAccepted,
    storedEvidenceReproducedThisEvaluation,
    provenance,
    blockers,
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}


export const FANDEX_MOMENTUM_ATTESTED_REFRESH_RESEARCH_VERSION =
  'v159_fandex_momentum_attested_provenance_refresh_research_v1' as const;

export const FANDEX_MOMENTUM_ATTESTED_REFRESH_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_ATTESTED_REFRESH_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    attestationContract:
      FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_VERSION,
    refreshContract:
      'v158_fandex_momentum_provenance_gated_current_live_refresh_research_v1' as const,
    directV153BooleanInputAccepted: false as const,
    blockedAttestationInvokesRefresh: false as const,
    acceptedAttestationUsesDerivedProvenanceOnly: true as const,
    physicalPersistencePerformed: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumAttestedRefreshResearchResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_ATTESTED_REFRESH_RESEARCH_VERSION;
  state: 'attestation-blocked' | 'refresh-evaluated';
  attestation: FandexMomentumStoredEvidenceAttestationResearchResult;
  refreshInvoked: boolean;
  refresh: FandexMomentumProvenanceGatedRefreshResult | null;
  readyForPhysicalPersistence: boolean;
  blockers: readonly string[];
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
    historyWrites: 0;
    watermarkWrites: 0;
    manifestWrites: 0;
  }>;
  digest: string;
}>;

export type FandexMomentumAttestedRefreshResearchDependencies = Readonly<{
  evaluateRefresh?: typeof evaluateFandexMomentumProvenanceGatedRefreshResearch;
}>;

function zeroRefreshEffects() {
  return Object.freeze({
    productMetricReads: 0 as const,
    productMetricWrites: 0 as const,
    previewFallbackReads: 0 as const,
    databaseWrites: 0 as const,
    historyWrites: 0 as const,
    watermarkWrites: 0 as const,
    manifestWrites: 0 as const,
  });
}

export function evaluateFandexMomentumAttestedRefreshResearch(
  input: Readonly<{
    snapshot: FandexMomentumNaverSourceSnapshotEvidence;
    runtimeObservation: FandexMomentumProductionRuntimeObservation;
    readAttestation: FandexMomentumStoredEvidenceReadAttestation | null;
    manifestJsonl: string;
    historyJsonl: string;
    watermarkJsonl: string;
    result: FandexMomentumOutputFormEligibilityResearchResult;
    sourceEvidence: FandexMomentumSourceEvidenceWatermark;
    evaluatedAt: string;
    recordedAt: string;
    manifestedAt: string;
  }>,
  dependencies: FandexMomentumAttestedRefreshResearchDependencies = {},
): FandexMomentumAttestedRefreshResearchResult {
  const attestation =
    evaluateFandexMomentumStoredEvidenceAttestationResearch({
      snapshot: input.snapshot,
      runtimeObservation: input.runtimeObservation,
      readAttestation: input.readAttestation,
    });

  if (attestation.state !== 'attested-provenance-ready') {
    const payload = {
      contractVersion: FANDEX_MOMENTUM_ATTESTED_REFRESH_RESEARCH_VERSION,
      state: 'attestation-blocked' as const,
      attestationDigest: attestation.digest,
      refreshInvoked: false as const,
      refreshDigest: null,
      readyForPhysicalPersistence: false as const,
      blockers: Object.freeze([...attestation.blockers]),
    };
    return Object.freeze({
      contractVersion: payload.contractVersion,
      state: payload.state,
      attestation,
      refreshInvoked: false,
      refresh: null,
      readyForPhysicalPersistence: false,
      blockers: payload.blockers,
      effects: zeroRefreshEffects(),
      digest: sha256Canonical(payload),
    });
  }

  const evaluateRefresh =
    dependencies.evaluateRefresh
    ?? evaluateFandexMomentumProvenanceGatedRefreshResearch;
  const refresh = evaluateRefresh({
    provenance: attestation.provenance,
    manifestJsonl: input.manifestJsonl,
    historyJsonl: input.historyJsonl,
    watermarkJsonl: input.watermarkJsonl,
    result: input.result,
    sourceEvidence: input.sourceEvidence,
    evaluatedAt: input.evaluatedAt,
    recordedAt: input.recordedAt,
    manifestedAt: input.manifestedAt,
  });

  const payload = {
    contractVersion: FANDEX_MOMENTUM_ATTESTED_REFRESH_RESEARCH_VERSION,
    state: 'refresh-evaluated' as const,
    attestationDigest: attestation.digest,
    refreshInvoked: true as const,
    refreshDigest: refresh.digest,
    readyForPhysicalPersistence: refresh.readyForPhysicalPersistence,
    blockers: Object.freeze([...refresh.blockers]),
  };
  return Object.freeze({
    contractVersion: payload.contractVersion,
    state: payload.state,
    attestation,
    refreshInvoked: true,
    refresh,
    readyForPhysicalPersistence: refresh.readyForPhysicalPersistence,
    blockers: payload.blockers,
    effects: zeroRefreshEffects(),
    digest: sha256Canonical(payload),
  });
}
