import {
  PRODUCT_SAFE_VARIABLE_IDS,
} from '../variables/productVariableDefinitions';
import {
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
} from '../contracts/productMomentumEvidenceConsensus';
import {
  getMetricSourceInfo,
} from '../../../app/data/v4/metrics/fandexMetricSourceRegistry';
import {
  MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION,
} from '../../server/ingestion/momentumNativeVerifierProductionExecutionAuthorization';

export const MOMENTUM_POST_EXECUTION_PRODUCT_READINESS_VERSION =
  'momentum-post-execution-product-readiness-v3' as const;

export const MOMENTUM_RESEARCH_OUTPUT_BOUNDARY = Object.freeze({
  crossFamilyCombinationContractVersion:
    'v142_fandex_momentum_cross_family_combination_research_v1' as const,
  outputFormEligibilityContractVersion:
    'v143_fandex_momentum_output_form_eligibility_research_v1' as const,
  categoricalCarrierContractVersion:
    'v144_fandex_momentum_categorical_carrier_research_v1' as const,
  canonicalConstruct:
    'cross-family-persistence-of-recent-directional-reaction-change' as const,
  combinationMode: 'evidence-consensus-not-score' as const,
  outputForm: 'structured-categorical-evidence' as const,
  productMomentumScore: null,
  numericProductScoreEligible: false as const,
  ordinalStateToNumberMappingAllowed: false as const,
  equalWeightsAllowedByDefault: false as const,
  percentileAverageAllowed: false as const,
  legacyPreviewSeedCalibrationAllowed: false as const,
});

export type MomentumPostExecutionProductReadinessInput = Readonly<{
  lastfmSnapshotDate: string;
  lastfmHistoryRowCount: number;
  lastfmSnapshotDateCount: number;
  lastfmDeltaReadyCount: number;
  lastfmNeedsReviewCount: number;
  lastfmScoreUsage: string;
}>;

export type MomentumPostExecutionProductReadinessResult = Readonly<{
  contractVersion: typeof MOMENTUM_POST_EXECUTION_PRODUCT_READINESS_VERSION;
  state:
    | 'current-categorical-evaluation-required'
    | 'blocked';
  productActivationReady: false;
  productPublicationReady: false;
  numericProductEligible: false;
  legacyGrowthMomentumPointReuseAllowed: false;
  previewFallbackAllowed: false;
  productMomentumScore: null;
  verifierEvidence: Readonly<{
    authorizationConsumed: boolean;
    executionPerformed: boolean;
    successfulExecutionCount: 1 | 0;
    evidenceRows: number;
    normalizedRecords: number;
    databaseReadOnly: boolean;
    databaseWritesObserved: number;
    verifierOutputAccepted: boolean;
  }>;
  lastfmEvidence: Readonly<{
    snapshotDate: string;
    historyRowCount: number;
    snapshotDateCount: number;
    deltaReadyCount: number;
    needsReviewCount: number;
    scoreUsage: string;
    previewScoreAcceptedAsProductTruth: false;
  }>;
  currentProductSchema: Readonly<{
    legacyVariableId: 'growthMomentumPoint';
    legacyVariablePresent: boolean;
    momentumSourceStage: string;
    momentumQualityLabel: string;
    numericSlotCompatibleWithResearchOutput: false;
  }>;
  productShapeImplementation: Readonly<{
    contractVersion:
      typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION;
    constructId:
      typeof PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID;
    separateNonNumericContractImplemented: true;
    storedEvidenceReadModelAdapterImplemented: true;
    runtimeCarrierRepositoryImplemented: true;
    runtimeStoredEvidenceReadPathImplemented: true;
    liveIUShadowReadVerified: true;
    publicRouteImplemented: false;
  }>;
  blockers: readonly string[];
}>;

function validIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value + 'T00:00:00.000Z'));
}

export function evaluateMomentumPostExecutionProductReadiness(
  input: MomentumPostExecutionProductReadinessInput,
): MomentumPostExecutionProductReadinessResult {
  const execution =
    MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION;
  const consumed = execution.executionConsumption;
  const metricSource = getMetricSourceInfo('momentum');

  const hardBlockers: string[] = [];

  if (
    execution.target.canonicalArtistId !== 'iu'
    || execution.target.throughSlotStart !== '2026-09-21T12:00:00.000Z'
    || execution.target.maximumExecutions !== 1
    || consumed.consumed !== true
    || execution.decision.nativeVerifierExecutionPerformed !== true
    || consumed.databaseReadOnly !== true
    || consumed.databaseWritesObserved !== 0
    || consumed.verifierOutputAccepted !== true
    || consumed.evidenceRows <= 0
    || consumed.normalizedRecords <= 0
  ) {
    hardBlockers.push('production-verifier-success-evidence-invalid');
  }

  if (
    !validIsoDate(input.lastfmSnapshotDate)
    || !Number.isInteger(input.lastfmHistoryRowCount)
    || input.lastfmHistoryRowCount <= 0
    || !Number.isInteger(input.lastfmSnapshotDateCount)
    || input.lastfmSnapshotDateCount <= 0
    || input.lastfmDeltaReadyCount !== 10
    || input.lastfmNeedsReviewCount !== 0
    || input.lastfmScoreUsage !== 'preview_only_not_master_score'
  ) {
    hardBlockers.push('lastfm-current-history-evidence-invalid');
  }

  const legacyVariablePresent =
    PRODUCT_SAFE_VARIABLE_IDS.includes('growthMomentumPoint');

  if (!legacyVariablePresent) {
    hardBlockers.push('legacy-momentum-variable-identity-missing');
  }

  if (
    metricSource.sourceStage !== 'derived_signal'
    || metricSource.qualityLabel !== 'preview'
  ) {
    hardBlockers.push('legacy-momentum-preview-boundary-changed');
  }

  const blockers = Object.freeze([
    ...hardBlockers,
    'current-momentum-product-slot-numeric-only',
    'legacy-preview-fallback-would-mask-real-momentum-state',
    'current-dual-source-categorical-evaluation-not-performed',
    'current-naver-stored-evidence-not-reproduced-for-readiness',
    'historical-carrier-not-current-activation-evidence',
    'categorical-public-route-not-implemented',
  ]);

  return Object.freeze({
    contractVersion: MOMENTUM_POST_EXECUTION_PRODUCT_READINESS_VERSION,
    state: hardBlockers.length === 0
      ? 'current-categorical-evaluation-required' as const
      : 'blocked' as const,
    productActivationReady: false as const,
    productPublicationReady: false as const,
    numericProductEligible: false as const,
    legacyGrowthMomentumPointReuseAllowed: false as const,
    previewFallbackAllowed: false as const,
    productMomentumScore: null,
    verifierEvidence: Object.freeze({
      authorizationConsumed: consumed.consumed,
      executionPerformed:
        execution.decision.nativeVerifierExecutionPerformed,
      successfulExecutionCount:
        consumed.consumed
          && execution.decision.nativeVerifierExecutionPerformed
          ? 1 as const
          : 0 as const,
      evidenceRows: consumed.evidenceRows,
      normalizedRecords: consumed.normalizedRecords,
      databaseReadOnly: consumed.databaseReadOnly,
      databaseWritesObserved: consumed.databaseWritesObserved,
      verifierOutputAccepted: consumed.verifierOutputAccepted,
    }),
    lastfmEvidence: Object.freeze({
      snapshotDate: input.lastfmSnapshotDate,
      historyRowCount: input.lastfmHistoryRowCount,
      snapshotDateCount: input.lastfmSnapshotDateCount,
      deltaReadyCount: input.lastfmDeltaReadyCount,
      needsReviewCount: input.lastfmNeedsReviewCount,
      scoreUsage: input.lastfmScoreUsage,
      previewScoreAcceptedAsProductTruth: false as const,
    }),
    currentProductSchema: Object.freeze({
      legacyVariableId: 'growthMomentumPoint' as const,
      legacyVariablePresent,
      momentumSourceStage: metricSource.sourceStage,
      momentumQualityLabel: metricSource.qualityLabel,
      numericSlotCompatibleWithResearchOutput: false as const,
    }),
    productShapeImplementation: Object.freeze({
      contractVersion:
        PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
      constructId:
        PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
      separateNonNumericContractImplemented: true as const,
      storedEvidenceReadModelAdapterImplemented: true as const,
      runtimeCarrierRepositoryImplemented: true as const,
      runtimeStoredEvidenceReadPathImplemented: true as const,
      liveIUShadowReadVerified: true as const,
      publicRouteImplemented: false as const,
    }),
    blockers,
  });
}
