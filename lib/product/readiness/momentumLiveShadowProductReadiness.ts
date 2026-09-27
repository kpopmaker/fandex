import type {
  ProductMomentumEvidenceConsensusReadModelResult,
} from '../contracts/productMomentumEvidenceConsensus';

export const MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION =
  'momentum-live-shadow-product-readiness-v2' as const;

export type MomentumCurrentEvaluationClassification =
  | 'not-performed'
  | 'attested-no-op-same-cutoff-same-state'
  | 'new-carrier-cutoff-advanced-same-state'
  | 'new-carrier-direction-state-changed'
  | 'new-carrier-persistence-state-changed'
  | 'new-carrier-direction-and-persistence-changed'
  | 'same-observation-cutoff-revision-review-required'
  | 'alignment-regression-blocked'
  | 'evaluation-blocked';

export type MomentumHistoryAppendDecision =
  | 'defer-until-current-evaluation'
  | 'append-required-cutoff-advanced'
  | 'no-append-current-no-op';

export type MomentumLiveShadowSourceCurrentnessAudit = Readonly<{
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
    sourceAdvancedBeyondCarrierCutoff: boolean;
  }>;
  naverRuntime: Readonly<{
    schedulerRouteObservedAt: string;
    deploymentId: string;
    deploymentCommit: string;
    requestPath: string;
    httpStatus: number;
    schedulerObservedAfterCarrierCutoff: boolean;
    currentStoredEvidenceReproducedForReadiness: boolean;
    latestStoredEvidenceThroughSlotStart?: string;
    latestStoredEvidenceJobId?: string;
    reproducedSnapshotCount?: number;
    evaluationWorkflowRunId?: number;
  }>;
  freshnessPolicy: Readonly<{
    arbitraryAgeThresholdAllowed: false;
    maximumAgeDays: null;
    sourceAdvancementRequiresCurrentCategoricalReevaluation: true;
    historyAppendRequiredBeforeReevaluation: false;
    historyAppendDecision: MomentumHistoryAppendDecision;
  }>;
  currentEvaluation: Readonly<{
    currentDualSourceCategoricalEvaluationPerformed: boolean;
    currentCarrierProduced: boolean;
    currentNoOpEvaluationAttested: boolean;
    classification: MomentumCurrentEvaluationClassification;
    alignmentCutoffAt: string | null;
    directionalConsensus: string | null;
    persistenceConsensus: string | null;
    categoricalEvaluationDigest: string | null;
    newHistoryObservationRequired: boolean;
  }>;
}>;

export type MomentumLiveShadowProductReadinessResult = Readonly<{
  contractVersion: typeof MOMENTUM_LIVE_SHADOW_PRODUCT_READINESS_VERSION;
  state:
    | 'current-categorical-evaluation-required'
    | 'current-carrier-persistence-required'
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
    historyAppendDecision: MomentumHistoryAppendDecision;
  }>;
  currentEvaluation: Readonly<{
    performed: boolean;
    currentCarrierProduced: boolean;
    currentNoOpEvaluationAttested: boolean;
    classification: MomentumCurrentEvaluationClassification;
    alignmentCutoffAt: string | null;
    directionalConsensus: string | null;
    persistenceConsensus: string | null;
    categoricalEvaluationDigest: string | null;
    newHistoryObservationRequired: boolean;
    satisfiesFreshness: boolean;
  }>;
  blockers: readonly string[];
}>;

function validIso(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function validDigest(value: string | null): boolean {
  return value === null || /^[0-9a-f]{64}$/.test(value);
}

function validAudit(
  audit: MomentumLiveShadowSourceCurrentnessAudit,
): boolean {
  const evaluation = audit.currentEvaluation;
  const evaluationFieldsValid = !evaluation
    .currentDualSourceCategoricalEvaluationPerformed
    ? (
        evaluation.classification === 'not-performed'
        && evaluation.alignmentCutoffAt === null
        && evaluation.directionalConsensus === null
        && evaluation.persistenceConsensus === null
        && evaluation.categoricalEvaluationDigest === null
        && evaluation.newHistoryObservationRequired === false
      )
    : (
        evaluation.classification !== 'not-performed'
        && typeof evaluation.alignmentCutoffAt === 'string'
        && validIso(evaluation.alignmentCutoffAt)
        && typeof evaluation.directionalConsensus === 'string'
        && evaluation.directionalConsensus.length > 0
        && typeof evaluation.persistenceConsensus === 'string'
        && evaluation.persistenceConsensus.length > 0
        && validDigest(evaluation.categoricalEvaluationDigest)
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
    && audit.lastfm.deltaReadyCount === 10
    && audit.lastfm.needsReviewCount === 0
    && validIso(audit.naverRuntime.schedulerRouteObservedAt)
    && audit.naverRuntime.requestPath
      === '/api/internal/naver-news/shadow-scheduler'
    && audit.naverRuntime.httpStatus === 200
    && (
      audit.naverRuntime.latestStoredEvidenceJobId === undefined
      || /^[0-9a-f]{64}$/.test(
        audit.naverRuntime.latestStoredEvidenceJobId,
      )
    )
    && (
      audit.naverRuntime.latestStoredEvidenceThroughSlotStart === undefined
      || validIso(
        audit.naverRuntime.latestStoredEvidenceThroughSlotStart,
      )
    )
    && audit.freshnessPolicy.arbitraryAgeThresholdAllowed === false
    && audit.freshnessPolicy.maximumAgeDays === null
    && audit.freshnessPolicy
      .sourceAdvancementRequiresCurrentCategoricalReevaluation === true
    && audit.freshnessPolicy.historyAppendRequiredBeforeReevaluation === false
    && (
      audit.freshnessPolicy.historyAppendDecision
        === 'defer-until-current-evaluation'
      || audit.freshnessPolicy.historyAppendDecision
        === 'append-required-cutoff-advanced'
      || audit.freshnessPolicy.historyAppendDecision
        === 'no-append-current-no-op'
    )
    && evaluationFieldsValid
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
    || audit.naverRuntime.schedulerObservedAfterCarrierCutoff;

  const evaluation = audit.currentEvaluation;
  const evaluationPerformed =
    evaluation.currentDualSourceCategoricalEvaluationPerformed;
  const naverReproduced =
    audit.naverRuntime.currentStoredEvidenceReproducedForReadiness;

  const carrierPersistenceRequired =
    sourceAdvancementObserved
    && evaluationPerformed
    && naverReproduced
    && evaluation.newHistoryObservationRequired
    && !evaluation.currentCarrierProduced;

  const currentEvaluationArtifactPresent =
    evaluation.currentCarrierProduced
    || (
      !evaluation.newHistoryObservationRequired
      && evaluation.currentNoOpEvaluationAttested
    );

  const satisfiesFreshness =
    evaluationPerformed
    && currentEvaluationArtifactPresent
    && naverReproduced;

  if (sourceAdvancementObserved && !naverReproduced) {
    blockers.push(
      'current-naver-stored-evidence-not-reproduced-for-readiness',
    );
  }

  if (sourceAdvancementObserved && !evaluationPerformed) {
    blockers.push(
      'current-dual-source-categorical-evaluation-not-performed',
    );
  }

  if (carrierPersistenceRequired) {
    blockers.push('current-carrier-persistence-not-performed');
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
      : carrierPersistenceRequired
        ? 'current-carrier-persistence-required' as const
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
        audit.naverRuntime.schedulerObservedAfterCarrierCutoff,
      naverCurrentStoredEvidenceReproducedForReadiness:
        naverReproduced,
      sourceAdvancementObserved,
    }),
    freshnessPolicy: Object.freeze({
      arbitraryAgeThresholdAllowed: false as const,
      maximumAgeDays: null,
      currentCategoricalEvaluationRequiredAfterSourceAdvancement:
        true as const,
      newHistoryObservationRequiredBeforeEvaluation: false as const,
      historyAppendDecision:
        audit.freshnessPolicy.historyAppendDecision,
    }),
    currentEvaluation: Object.freeze({
      performed: evaluationPerformed,
      currentCarrierProduced: evaluation.currentCarrierProduced,
      currentNoOpEvaluationAttested:
        evaluation.currentNoOpEvaluationAttested,
      classification: evaluation.classification,
      alignmentCutoffAt: evaluation.alignmentCutoffAt,
      directionalConsensus: evaluation.directionalConsensus,
      persistenceConsensus: evaluation.persistenceConsensus,
      categoricalEvaluationDigest:
        evaluation.categoricalEvaluationDigest,
      newHistoryObservationRequired:
        evaluation.newHistoryObservationRequired,
      satisfiesFreshness,
    }),
    blockers: Object.freeze(blockers),
  });
}
