import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION =
  'momentum-categorical-output-attestation-v1' as const;

export const FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_SOURCE_CONTRACT_VERSION =
  'v142_fandex_momentum_cross_family_combination_research_v1' as const;

type DirectionalConsensus =
  | 'direction-corroborated-up'
  | 'direction-corroborated-down'
  | 'flat-corroborated'
  | 'direction-conflicted'
  | 'direction-insufficient';

type PersistenceConsensus =
  | 'both-directions-repeated'
  | 'one-direction-repeated'
  | 'neither-direction-repeated'
  | 'persistence-not-applicable';

type EvaluationClassification =
  | 'attested-no-op-same-cutoff-same-state'
  | 'new-carrier-cutoff-advanced-same-state'
  | 'new-carrier-direction-state-changed'
  | 'new-carrier-persistence-state-changed'
  | 'new-carrier-direction-and-persistence-changed'
  | 'same-observation-cutoff-revision-review-required'
  | 'alignment-regression-blocked'
  | 'evaluation-blocked';

export type MomentumCurrentDualSourceEvaluationEvidence = Readonly<{
  contractVersion:
    'momentum-current-dual-source-categorical-evaluation-evidence-v1';
  evaluatedAgainstMain: string;
  evaluationHead: string;
  workflowRunId: number;
  workflowJobId: number;
  evaluatedAt: string;
  canonicalArtistId: string;
  latestNaverStoredEvidence: Readonly<{
    throughSlotStart: string;
    jobId: string;
    collectionKey: string;
    exactOfficialProtocol: boolean;
    seriesStatus: string;
    expectedSlotCount: number;
    reproducedSnapshotCount: number;
  }>;
  categoricalEvaluation: Readonly<{
    state: string;
    alignmentCutoffAt: string | null;
    directionalConsensus: DirectionalConsensus;
    persistenceConsensus: PersistenceConsensus;
    qualitativeDirectionEvidenceUsable: boolean;
    productMomentumScore: null;
    digest: string;
  }>;
  decision: Readonly<{
    classification: EvaluationClassification;
    currentDualSourceCategoricalEvaluationPerformed: boolean;
    currentNaverStoredEvidenceReproducedForReadiness: boolean;
    newHistoryObservationRequired: boolean;
    attestedNoOp: boolean;
  }>;
  safety: Readonly<{
    databaseMode: string;
    databaseWrites: number;
    productMetricReads: number;
    productMetricWrites: number;
    previewFallbackReads: number;
    registryMutations: number;
    productionActivations: number;
  }>;
}>;

export type FandexMomentumCategoricalOutputAttestation = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION;
  lifecycle: 'research';
  canonicalArtistId: string;
  sourceLineage: Readonly<{
    kind: 'preview-independent-v142-current-evaluation';
    sourceContractVersion:
      typeof FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_SOURCE_CONTRACT_VERSION;
    sourceV142Digest: string;
    legacySourceV143Required: false;
    legacySourceV143Digest: null;
  }>;
  categoricalOutput: Readonly<{
    alignmentCutoffAt: string;
    directionalConsensus: DirectionalConsensus;
    persistenceConsensus: PersistenceConsensus;
    qualitativeDirectionEvidenceUsable: boolean;
    productMomentumScore: null;
  }>;
  evaluationEvidence: Readonly<{
    evaluatedAgainstMain: string;
    evaluationHead: string;
    workflowRunId: number;
    workflowJobId: number;
    evaluatedAt: string;
    latestNaverThroughSlotStart: string;
    latestNaverJobId: string;
    exactOfficialProtocol: true;
    reproducedStoredEvidence: true;
    evaluationClassification: EvaluationClassification;
    evaluationEvidenceDigest: string;
  }>;
  isolation: Readonly<{
    databaseMode: 'read-only';
    databaseWrites: 0;
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    registryMutations: 0;
    productionActivations: 0;
  }>;
  carrierLineageEligibility: Readonly<{
    eligible: true;
    sourceDigestField: 'sourceAttestationDigest';
    sourceContractField: 'sourceAttestationContractVersion';
    existingSourceV143FieldMustNotBeReused: true;
  }>;
  attestationDigest: string;
}>;

function validSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function validGitSha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function validIso(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}

function validInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function assertEligibleEvidence(
  evidence: MomentumCurrentDualSourceEvaluationEvidence,
): void {
  if (
    evidence.contractVersion
      !== 'momentum-current-dual-source-categorical-evaluation-evidence-v1'
    || !validGitSha(evidence.evaluatedAgainstMain)
    || !validGitSha(evidence.evaluationHead)
    || !validInteger(evidence.workflowRunId)
    || !validInteger(evidence.workflowJobId)
    || !validIso(evidence.evaluatedAt)
    || evidence.canonicalArtistId.length === 0
  ) {
    throw new Error('momentum_categorical_attestation_evaluation_identity_invalid');
  }

  const naver = evidence.latestNaverStoredEvidence;
  if (
    !validIso(naver.throughSlotStart)
    || !validSha256(naver.jobId)
    || naver.collectionKey.length === 0
    || naver.exactOfficialProtocol !== true
    || naver.seriesStatus !== 'available'
    || !Number.isSafeInteger(naver.expectedSlotCount)
    || naver.expectedSlotCount <= 0
    || naver.reproducedSnapshotCount !== naver.expectedSlotCount
  ) {
    throw new Error('momentum_categorical_attestation_naver_evidence_invalid');
  }

  const output = evidence.categoricalEvaluation;
  if (
    output.state === 'blocked'
    || !validIso(output.alignmentCutoffAt)
    || !validSha256(output.digest)
    || output.productMomentumScore !== null
  ) {
    throw new Error('momentum_categorical_attestation_output_invalid');
  }

  const decision = evidence.decision;
  if (
    decision.currentDualSourceCategoricalEvaluationPerformed !== true
    || decision.currentNaverStoredEvidenceReproducedForReadiness !== true
    || (
      decision.newHistoryObservationRequired
      && decision.attestedNoOp
    )
    || (
      !decision.newHistoryObservationRequired
      && !decision.attestedNoOp
    )
    || decision.classification === 'alignment-regression-blocked'
    || decision.classification === 'evaluation-blocked'
    || decision.classification
      === 'same-observation-cutoff-revision-review-required'
  ) {
    throw new Error('momentum_categorical_attestation_decision_invalid');
  }

  const safety = evidence.safety;
  if (
    safety.databaseMode !== 'read-only'
    || safety.databaseWrites !== 0
    || safety.productMetricReads !== 0
    || safety.productMetricWrites !== 0
    || safety.previewFallbackReads !== 0
    || safety.registryMutations !== 0
    || safety.productionActivations !== 0
  ) {
    throw new Error('momentum_categorical_attestation_isolation_invalid');
  }
}

export function buildFandexMomentumCategoricalOutputAttestation(
  evidence: MomentumCurrentDualSourceEvaluationEvidence,
): FandexMomentumCategoricalOutputAttestation {
  assertEligibleEvidence(evidence);

  const output = evidence.categoricalEvaluation;
  const evaluationEvidenceDigest = sha256Canonical(evidence);

  const payload = Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
    lifecycle: 'research' as const,
    canonicalArtistId: evidence.canonicalArtistId,
    sourceLineage: Object.freeze({
      kind: 'preview-independent-v142-current-evaluation' as const,
      sourceContractVersion:
        FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_SOURCE_CONTRACT_VERSION,
      sourceV142Digest: output.digest,
      legacySourceV143Required: false as const,
      legacySourceV143Digest: null,
    }),
    categoricalOutput: Object.freeze({
      alignmentCutoffAt: output.alignmentCutoffAt as string,
      directionalConsensus: output.directionalConsensus,
      persistenceConsensus: output.persistenceConsensus,
      qualitativeDirectionEvidenceUsable:
        output.qualitativeDirectionEvidenceUsable,
      productMomentumScore: null,
    }),
    evaluationEvidence: Object.freeze({
      evaluatedAgainstMain: evidence.evaluatedAgainstMain,
      evaluationHead: evidence.evaluationHead,
      workflowRunId: evidence.workflowRunId,
      workflowJobId: evidence.workflowJobId,
      evaluatedAt: evidence.evaluatedAt,
      latestNaverThroughSlotStart:
        evidence.latestNaverStoredEvidence.throughSlotStart,
      latestNaverJobId: evidence.latestNaverStoredEvidence.jobId,
      exactOfficialProtocol: true as const,
      reproducedStoredEvidence: true as const,
      evaluationClassification: evidence.decision.classification,
      evaluationEvidenceDigest,
    }),
    isolation: Object.freeze({
      databaseMode: 'read-only' as const,
      databaseWrites: 0 as const,
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      registryMutations: 0 as const,
      productionActivations: 0 as const,
    }),
    carrierLineageEligibility: Object.freeze({
      eligible: true as const,
      sourceDigestField: 'sourceAttestationDigest' as const,
      sourceContractField: 'sourceAttestationContractVersion' as const,
      existingSourceV143FieldMustNotBeReused: true as const,
    }),
  });

  return Object.freeze({
    ...payload,
    attestationDigest: sha256Canonical(payload),
  });
}
