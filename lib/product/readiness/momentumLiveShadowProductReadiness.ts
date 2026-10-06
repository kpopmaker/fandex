import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../contracts/productMomentumEvidenceConsensus';

export const MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION =
  'momentum-live-shadow-product-readiness-v1' as const;

type MomentumLiveShadowSourceCurrentnessAuditBase = Readonly<{
  contractVersion: 'momentum-live-shadow-source-currentness-audit-v1';
  evaluatedAgainstMain: string;
  canonicalArtistId: 'iu';
  carrier: Readonly<{
    carrierRecordId: string;
    alignmentCutoffAt: string;
    directionalConsensus: string;
    persistenceConsensus: string;
    historicalOnly: boolean;
  }>;
  lastfm: Readonly<{
    snapshotDate: string;
    historyRowCount: number;
    snapshotDateCount: number;
    deltaReadyCount: number;
    needsReviewCount: number;
    currentHistoryValid: boolean;
    sourceAdvancedBeyondCarrierCutoff: boolean;
  }>;
  freshnessPolicy: Readonly<{
    arbitraryAgeThresholdAllowed: false;
    maximumAgeDays: null;
    sourceAdvancementRequiresCurrentCategoricalReevaluation: true;
    historyAppendRequiredBeforeReevaluation: false;
    historyAppendDecision: 'defer-until-current-evaluation';
  }>;
  currentEvaluation: Readonly<{
    currentDualSourceCategoricalEvaluationPerformed: boolean;
    currentCarrierProduced: boolean;
    currentNoOpEvaluationAttested: boolean;
    evaluatedAlignmentCutoffAt: string | null;
    directionalConsensus: string | null;
    persistenceConsensus: string | null;
    attestationPath: string | null;
    attestationDigest: string | null;
    attestationWorkflow?: Readonly<{
      kind: 'github-actions-read-only-current-evaluation';
      workflowRunId: number;
      workflowJobId: number;
      workflowHeadSha: string;
    }>;
  }>;
}>;

type NaverVercelRuntimeEvidence = Readonly<{
  schedulerRouteObservedAt: string;
  deploymentId: string;
  deploymentCommit: string;
  requestPath: string;
  httpStatus: number;
  schedulerObservedAfterCarrierCutoff: boolean;
  currentStoredEvidenceReproducedForReadiness: boolean;
}>;

type NaverGithubActionsDirectEvidence = Readonly<{
  mode: 'github-actions-direct-recurring';
  observedAt: string;
  workflowRunId: number;
  workflowJobId: number;
  workflowHeadSha: string;
  slotStart: string;
  collectionKey: string;
  status: 'applied';
  exactOfficialProtocol: true;
  schedulerObservedAfterCarrierCutoff: boolean;
  currentStoredEvidenceReproducedForReadiness: boolean;
}>;

type NaverGithubActionsBlobOnlyEvidence = Readonly<{
  mode: 'github-actions-direct-blob-only';
  observedAt: string;
  workflowRunId: number;
  workflowJobId: number;
  workflowHeadSha: string;
  slotStart: string;
  collectionKey: string;
  jobId: string;
  runStatus: 'collected-and-finalized' | 'already-finalized';
  schedulerManifestFinalized: true;
  exactOfficialProtocol: true;
  schedulerObservedAfterCarrierCutoff: boolean;
  currentStoredEvidenceReproducedForReadiness: boolean;
}>;

export type MomentumLiveShadowSourceCurrentnessAudit =
  | Readonly<
      MomentumLiveShadowSourceCurrentnessAuditBase & {
        naverRuntime: NaverVercelRuntimeEvidence;
        naverDirectRecurring?: never;
        naverBlobOnlyRecurring?: never;
      }
    >
  | Readonly<
      MomentumLiveShadowSourceCurrentnessAuditBase & {
        naverRuntime?: never;
        naverDirectRecurring: NaverGithubActionsDirectEvidence;
        naverBlobOnlyRecurring?: never;
      }
    >
  | Readonly<
      MomentumLiveShadowSourceCurrentnessAuditBase & {
        naverRuntime?: never;
        naverDirectRecurring?: never;
        naverBlobOnlyRecurring: NaverGithubActionsBlobOnlyEvidence;
      }
    >;

export type MomentumLiveShadowProductReadinessResult = Readonly<{
  contractVersion: typeof MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION;
  state:
    | 'current-categorical-evaluation-required'
    | 'public-route-candidate'
    | 'blocked';
  productActivationReady: false;
  productPublicationReady: false;
  publicRouteDesignReady: boolean;
  productMomentumScore: null;
  numericProductEligible: false;
  previewFallbackAllowed: false;
  runtimeShadowReadVerified: boolean;
  currentCarrier: Readonly<{
    carrierRecordId: string | null;
    alignmentCutoffAt: string | null;
    directionalConsensus: string | null;
    persistenceConsensus: string | null;
    historicalOnly: boolean;
  }>;
  sourceCurrentness: Readonly<{
    lastfmSourceAdvancedBeyondCarrierCutoff: boolean;
    naverSchedulerObservedAfterCarrierCutoff: boolean;
    naverCurrentStoredEvidenceReproducedForReadiness: boolean;
    sourceAdvancementObserved: boolean;
  }>;
  freshnessPolicy: Readonly<{
    arbitraryAgeThresholdAllowed: false;
    maximumAgeDays: null;
    currentCategoricalEvaluationRequiredAfterSourceAdvancement: true;
    newHistoryObservationRequiredBeforeEvaluation: false;
    historyAppendDecision: 'defer-until-current-evaluation';
  }>;
  currentEvaluation: Readonly<{
    performed: boolean;
    currentCarrierProduced: boolean;
    currentNoOpEvaluationAttested: boolean;
    satisfiesFreshness: boolean;
    evaluatedAlignmentCutoffAt: string | null;
    directionalConsensus: string | null;
    persistenceConsensus: string | null;
    attestationPath: string | null;
    attestationDigest: string | null;
    attestationWorkflow?: Readonly<{
      kind: 'github-actions-read-only-current-evaluation';
      workflowRunId: number;
      workflowJobId: number;
      workflowHeadSha: string;
    }>;
  }>;
  blockers: readonly string[];
}>;

function validIso(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function validPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function naverEvidenceState(
  audit: MomentumLiveShadowSourceCurrentnessAudit,
): Readonly<{
  valid: boolean;
  schedulerObservedAfterCarrierCutoff: boolean;
  currentStoredEvidenceReproducedForReadiness: boolean;
}> {
  if (audit.naverRuntime !== undefined) {
    return Object.freeze({
      valid:
        validIso(audit.naverRuntime.schedulerRouteObservedAt)
        && audit.naverRuntime.deploymentId.length > 0
        && /^[0-9a-f]{40}$/.test(audit.naverRuntime.deploymentCommit)
        && audit.naverRuntime.requestPath
          === '/api/internal/naver-news/shadow-scheduler'
        && audit.naverRuntime.httpStatus === 200,
      schedulerObservedAfterCarrierCutoff:
        audit.naverRuntime.schedulerObservedAfterCarrierCutoff,
      currentStoredEvidenceReproducedForReadiness:
        audit.naverRuntime.currentStoredEvidenceReproducedForReadiness,
    });
  }

  if (audit.naverDirectRecurring !== undefined) {
    const direct = audit.naverDirectRecurring;
    return Object.freeze({
      valid:
        direct.mode === 'github-actions-direct-recurring'
        && validIso(direct.observedAt)
        && validPositiveInteger(direct.workflowRunId)
        && validPositiveInteger(direct.workflowJobId)
        && /^[0-9a-f]{40}$/.test(direct.workflowHeadSha)
        && validIso(direct.slotStart)
        && direct.collectionKey.length > 0
        && direct.status === 'applied'
        && direct.exactOfficialProtocol === true,
      schedulerObservedAfterCarrierCutoff:
        direct.schedulerObservedAfterCarrierCutoff,
      currentStoredEvidenceReproducedForReadiness:
        direct.currentStoredEvidenceReproducedForReadiness,
    });
  }

  const blob = audit.naverBlobOnlyRecurring;
  return Object.freeze({
    valid:
      blob.mode === 'github-actions-direct-blob-only'
      && validIso(blob.observedAt)
      && validPositiveInteger(blob.workflowRunId)
      && validPositiveInteger(blob.workflowJobId)
      && /^[0-9a-f]{40}$/.test(blob.workflowHeadSha)
      && validIso(blob.slotStart)
      && blob.collectionKey.length > 0
      && /^[0-9a-f]{64}$/.test(blob.jobId)
      && (
        blob.runStatus === 'collected-and-finalized'
        || blob.runStatus === 'already-finalized'
      )
      && blob.schedulerManifestFinalized === true
      && blob.exactOfficialProtocol === true,
    schedulerObservedAfterCarrierCutoff:
      blob.schedulerObservedAfterCarrierCutoff,
    currentStoredEvidenceReproducedForReadiness:
      blob.currentStoredEvidenceReproducedForReadiness,
  });
}

function validAudit(
  audit: MomentumLiveShadowSourceCurrentnessAudit,
): boolean {
  const naver = naverEvidenceState(audit);
  const workflowAttestation = audit.currentEvaluation.attestationWorkflow;
  const persistedAttestationValid =
    audit.currentEvaluation.attestationPath
      === 'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json'
    && workflowAttestation === undefined;
  const workflowAttestationValid =
    audit.currentEvaluation.attestationPath === null
    && workflowAttestation !== undefined
    && workflowAttestation.kind
      === 'github-actions-read-only-current-evaluation'
    && validPositiveInteger(workflowAttestation.workflowRunId)
    && validPositiveInteger(workflowAttestation.workflowJobId)
    && /^[0-9a-f]{40}$/.test(workflowAttestation.workflowHeadSha)
    && workflowAttestation.workflowHeadSha === audit.evaluatedAgainstMain;
  const noOpAttestationValid =
    !audit.currentEvaluation.currentNoOpEvaluationAttested
    || (
      audit.currentEvaluation.currentDualSourceCategoricalEvaluationPerformed
      && audit.currentEvaluation.currentCarrierProduced === false
      && audit.carrier.historicalOnly === false
      && audit.currentEvaluation.evaluatedAlignmentCutoffAt !== null
      && validIso(audit.currentEvaluation.evaluatedAlignmentCutoffAt)
      && Date.parse(audit.currentEvaluation.evaluatedAlignmentCutoffAt)
        > Date.parse(audit.carrier.alignmentCutoffAt)
      && audit.currentEvaluation.directionalConsensus
        === audit.carrier.directionalConsensus
      && audit.currentEvaluation.persistenceConsensus
        === audit.carrier.persistenceConsensus
      && (persistedAttestationValid || workflowAttestationValid)
      && typeof audit.currentEvaluation.attestationDigest === 'string'
      && /^[0-9a-f]{64}$/.test(audit.currentEvaluation.attestationDigest)
    );

  return (
    audit.contractVersion
      === 'momentum-live-shadow-source-currentness-audit-v1'
    && /^[0-9a-f]{40}$/.test(audit.evaluatedAgainstMain)
    && audit.canonicalArtistId === 'iu'
    && /^[0-9a-f]{64}$/.test(audit.carrier.carrierRecordId)
    && validIso(audit.carrier.alignmentCutoffAt)
    && /^\d{4}-\d{2}-\d{2}$/.test(audit.lastfm.snapshotDate)
    && audit.lastfm.historyRowCount > 0
    && audit.lastfm.snapshotDateCount > 0
    && Number.isSafeInteger(audit.lastfm.deltaReadyCount)
    && audit.lastfm.deltaReadyCount >= 10
    && audit.lastfm.needsReviewCount === 0
    && audit.lastfm.currentHistoryValid === true
    && naver.valid
    && audit.freshnessPolicy.arbitraryAgeThresholdAllowed === false
    && audit.freshnessPolicy.maximumAgeDays === null
    && audit.freshnessPolicy
      .sourceAdvancementRequiresCurrentCategoricalReevaluation === true
    && audit.freshnessPolicy.historyAppendRequiredBeforeReevaluation === false
    && audit.freshnessPolicy.historyAppendDecision
      === 'defer-until-current-evaluation'
    && noOpAttestationValid
  );
}

export function evaluateMomentumLiveShadowProductReadiness(
  input: Readonly<{
    runtimeShadow:
      ProductMomentumEvidenceConsensusReadModelResult;
    sourceAudit: MomentumLiveShadowSourceCurrentnessAudit;
  }>,
): MomentumLiveShadowProductReadinessResult {
  const blockers: string[] = [];
  const audit = input.sourceAudit;
  const naver = naverEvidenceState(audit);

  if (!validAudit(audit)) {
    blockers.push('source-currentness-audit-invalid');
  }

  const runtimeVerified = input.runtimeShadow.status === 'ok';
  if (!runtimeVerified) {
    blockers.push('runtime-shadow-read-not-ok');
  }

  let carrierRecordId: string | null = null;
  let alignmentCutoffAt: string | null = null;
  let directionalConsensus: string | null = null;
  let persistenceConsensus: string | null = null;

  if (input.runtimeShadow.status === 'ok') {
    const model = input.runtimeShadow.model;
    carrierRecordId = model.storedEvidenceTrace.carrierRecordId;
    alignmentCutoffAt = model.evidence.alignmentCutoffAt;
    directionalConsensus = model.evidence.directionalConsensus;
    persistenceConsensus = model.evidence.persistenceConsensus;

    if (
      model.identity.sourceArtistId !== audit.canonicalArtistId
      || carrierRecordId !== audit.carrier.carrierRecordId
      || alignmentCutoffAt !== audit.carrier.alignmentCutoffAt
      || directionalConsensus !== audit.carrier.directionalConsensus
      || persistenceConsensus !== audit.carrier.persistenceConsensus
    ) {
      blockers.push('runtime-carrier-source-audit-mismatch');
    }
  }

  const sourceAdvancementObserved =
    audit.lastfm.sourceAdvancedBeyondCarrierCutoff
    || naver.schedulerObservedAfterCarrierCutoff;

  const evaluationPerformed =
    audit.currentEvaluation.currentDualSourceCategoricalEvaluationPerformed;
  const currentEvaluationArtifactPresent =
    audit.currentEvaluation.currentCarrierProduced
    || audit.currentEvaluation.currentNoOpEvaluationAttested;

  const satisfiesFreshness =
    evaluationPerformed
    && currentEvaluationArtifactPresent
    && naver.currentStoredEvidenceReproducedForReadiness;

  if (
    sourceAdvancementObserved
    && !naver.currentStoredEvidenceReproducedForReadiness
  ) {
    blockers.push(
      'current-naver-stored-evidence-not-reproduced-for-readiness',
    );
  }

  if (sourceAdvancementObserved && !evaluationPerformed) {
    blockers.push('current-dual-source-categorical-evaluation-not-performed');
  }

  if (sourceAdvancementObserved && !satisfiesFreshness) {
    blockers.push('historical-carrier-not-current-activation-evidence');
  }

  const hardBlocked = blockers.some((blocker) =>
    blocker === 'source-currentness-audit-invalid'
    || blocker === 'runtime-shadow-read-not-ok'
    || blocker === 'runtime-carrier-source-audit-mismatch'
  );

  const state = hardBlocked
    ? 'blocked' as const
    : satisfiesFreshness
      ? 'public-route-candidate' as const
      : 'current-categorical-evaluation-required' as const;

  return Object.freeze({
    contractVersion: MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION,
    state,
    productActivationReady: false as const,
    productPublicationReady: false as const,
    publicRouteDesignReady: state === 'public-route-candidate',
    productMomentumScore: null,
    numericProductEligible: false as const,
    previewFallbackAllowed: false as const,
    runtimeShadowReadVerified: runtimeVerified,
    currentCarrier: Object.freeze({
      carrierRecordId,
      alignmentCutoffAt,
      directionalConsensus,
      persistenceConsensus,
      historicalOnly: audit.carrier.historicalOnly,
    }),
    sourceCurrentness: Object.freeze({
      lastfmSourceAdvancedBeyondCarrierCutoff:
        audit.lastfm.sourceAdvancedBeyondCarrierCutoff,
      naverSchedulerObservedAfterCarrierCutoff:
        naver.schedulerObservedAfterCarrierCutoff,
      naverCurrentStoredEvidenceReproducedForReadiness:
        naver.currentStoredEvidenceReproducedForReadiness,
      sourceAdvancementObserved,
    }),
    freshnessPolicy: Object.freeze({
      arbitraryAgeThresholdAllowed: false as const,
      maximumAgeDays: null,
      currentCategoricalEvaluationRequiredAfterSourceAdvancement:
        true as const,
      newHistoryObservationRequiredBeforeEvaluation: false as const,
      historyAppendDecision:
        'defer-until-current-evaluation' as const,
    }),
    currentEvaluation: Object.freeze({
      performed: evaluationPerformed,
      currentCarrierProduced:
        audit.currentEvaluation.currentCarrierProduced,
      currentNoOpEvaluationAttested:
        audit.currentEvaluation.currentNoOpEvaluationAttested,
      satisfiesFreshness,
      evaluatedAlignmentCutoffAt:
        audit.currentEvaluation.evaluatedAlignmentCutoffAt,
      directionalConsensus:
        audit.currentEvaluation.directionalConsensus,
      persistenceConsensus:
        audit.currentEvaluation.persistenceConsensus,
      attestationPath:
        audit.currentEvaluation.attestationPath,
      attestationDigest:
        audit.currentEvaluation.attestationDigest,
      attestationWorkflow:
        audit.currentEvaluation.attestationWorkflow,
    }),
    blockers: Object.freeze(blockers),
  });
}
