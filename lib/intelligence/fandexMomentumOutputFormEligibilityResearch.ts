import {
  getResolvedMetricScore,
} from '../../app/data/v4/metrics/metricScoringPipeline';
import {
  artistMonthlyMetricSeed,
} from '../../app/data/v4/metrics/artistMonthlyMetricSeed';
import {
  getMetricSourceInfo,
} from '../../app/data/v4/metrics/fandexMetricSourceRegistry';
import { sha256Canonical } from '../shared/canonicalDigest';
import {
  FANDEX_OBSERVATION_CONTRACT_VERSION,
  type FandexObservationDraft,
} from './observationContracts';
import { createFandexDataLifecycle } from './productionState';
import {
  FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
  type FandexMomentumCrossFamilyCombinationResearchResult,
} from './fandexMomentumCrossFamilyCombinationResearch';

export const FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION =
  'v143_fandex_momentum_output_form_eligibility_research_v1' as const;

export const FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    targetVariable: 'momentum' as const,
    currentEvidenceOutputForm: 'structured-categorical-evidence' as const,
    numericProductScoreEligible: false as const,
    ordinalStateToNumberMappingAllowed: false as const,
    equalWeightsAllowedByDefault: false as const,
    percentileAverageAllowed: false as const,
    additionalFamiliesAloneSufficientForNumericScore: false as const,
    legacyPreviewSeedAllowedAsCalibrationTarget: false as const,
    circularCalibrationAllowed: false as const,
    currentMetricPipelineValueKind: 'number-or-null' as const,
    commonObservationRawValueSupportsCategoricalString: true as const,
    researchObservationRegistrationPerformed: false as const,
    productMetricSchemaMigrationPerformed: false as const,
    methodologyFreezePerformed: false as const,
    productActivationAllowed: false as const,
    productionEligible: false as const,
  });

export const FANDEX_MOMENTUM_NUMERIC_ELIGIBILITY_REQUIREMENTS = Object.freeze([
  'numeric-estimand-defined',
  'independent-calibration-target-established',
  'non-circular-observed-calibration-dataset-available',
  'data-derived-mapping-or-weights-established',
  'out-of-sample-validation-passed',
  'conflict-and-missingness-numeric-policy-validated',
  'product-schema-migration-prevents-preview-fallback',
] as const);

export type FandexMomentumNumericEligibilityRequirement =
  typeof FANDEX_MOMENTUM_NUMERIC_ELIGIBILITY_REQUIREMENTS[number];

export type FandexMomentumOutputFormEligibilityResearchResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION;
  sourceContractVersion: typeof FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION;
  state: 'categorical-research-output-only' | 'blocked';
  canonicalArtistId: string;
  alignmentCutoffAt: string | null;
  currentResearchOutput: Readonly<{
    outputForm: 'structured-categorical-evidence';
    directionalConsensus:
      FandexMomentumCrossFamilyCombinationResearchResult['directionalConsensus'];
    persistenceConsensus:
      FandexMomentumCrossFamilyCombinationResearchResult['persistenceConsensus'];
    qualitativeDirectionEvidenceUsable: boolean;
    levelPercentileSpreadDiagnostic: number | null;
    productMomentumScore: null;
  }>;
  numericEligibility: Readonly<{
    status: 'not-eligible';
    unmetRequirements: readonly FandexMomentumNumericEligibilityRequirement[];
    numericEstimand: null;
    calibrationTarget: null;
    mappingOrWeights: null;
    outOfSampleValidation: null;
    additionalFamiliesAloneSufficient: false;
    legacyPreviewSeedCalibrationAllowed: false;
  }>;
  currentProductSchema: Readonly<{
    metricValueKind: 'number-or-null';
    weightedScoreRequiresNumericValue: true;
    currentMomentumSourceStage: string;
    currentMomentumQualityLabel: string;
    previewFallbackEnabled: true;
    previewFallbackExample: Readonly<{
      artistId: string;
      month: string;
      origin: 'preview-seed';
      score: number;
      weightedScore: number;
    }> | null;
    categoricalEvidenceFitsCurrentMomentumSlot: false;
  }>;
  researchCarrier: Readonly<{
    observationContractVersion: typeof FANDEX_OBSERVATION_CONTRACT_VERSION;
    categoricalRawValueSupported: true;
    recommendedVariableId: 'momentum.cross-family-evidence-state.research';
    registryBindingEstablished: false;
    productMetricBindingEstablished: false;
  }>;
  blockers: readonly string[];
  digest: string;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    masterScoreWrites: 0;
    websiteWrites: 0;
  }>;
}>;

function inspectPreviewFallback():
  FandexMomentumOutputFormEligibilityResearchResult['currentProductSchema']['previewFallbackExample'] {
  const seed = artistMonthlyMetricSeed.find(
    (point) => typeof point.variables.momentum === 'number'
      && Number.isFinite(point.variables.momentum),
  );
  if (!seed) return null;

  const resolved = getResolvedMetricScore(
    seed.artistId,
    'momentum',
    seed.month,
  );
  if (
    resolved.origin !== 'preview-seed'
    || typeof resolved.score !== 'number'
    || !Number.isFinite(resolved.score)
    || typeof resolved.weightedScore !== 'number'
    || !Number.isFinite(resolved.weightedScore)
  ) {
    return null;
  }

  return Object.freeze({
    artistId: seed.artistId,
    month: seed.month,
    origin: 'preview-seed' as const,
    score: resolved.score,
    weightedScore: resolved.weightedScore,
  });
}

export function evaluateFandexMomentumOutputFormEligibilityResearch(
  source: FandexMomentumCrossFamilyCombinationResearchResult,
): FandexMomentumOutputFormEligibilityResearchResult {
  const hardBlockers: string[] = [];
  if (
    source.contractVersion
      !== FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION
  ) {
    hardBlockers.push('v142-contract-incompatible');
  }
  if (source.state === 'blocked') {
    hardBlockers.push('v142-source-blocked');
  }
  if (
    source.effects.externalCalls !== 0
    || source.effects.databaseWrites !== 0
    || source.effects.masterScoreWrites !== 0
    || source.effects.websiteWrites !== 0
  ) {
    hardBlockers.push('v142-side-effects-not-read-only');
  }
  if (
    source.combinationDecision.numericCompositeAllowed !== false
    || source.combinationDecision.equalWeightAverageAllowed !== false
    || source.combinationDecision.percentileAverageAllowed !== false
    || source.combinationDecision.productMomentumScore !== null
  ) {
    hardBlockers.push('v142-numeric-boundary-violated');
  }

  const sourceInfo = getMetricSourceInfo('momentum');
  const previewFallbackExample = inspectPreviewFallback();

  const blockers = Object.freeze([
    ...hardBlockers,
    ...FANDEX_MOMENTUM_NUMERIC_ELIGIBILITY_REQUIREMENTS,
    'current-product-momentum-slot-numeric-only',
    'categorical-research-output-not-product-registered',
    ...(previewFallbackExample
      ? ['legacy-preview-fallback-would-mask-real-momentum-state']
      : ['legacy-preview-fallback-not-demonstrated']),
  ]);

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_OUTPUT_FORM_ELIGIBILITY_RESEARCH_VERSION,
    sourceContractVersion:
      FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
    state: hardBlockers.length > 0
      ? 'blocked' as const
      : 'categorical-research-output-only' as const,
    canonicalArtistId: source.canonicalArtistId,
    alignmentCutoffAt: source.alignmentCutoffAt,
    currentResearchOutput: {
      outputForm: 'structured-categorical-evidence' as const,
      directionalConsensus: source.directionalConsensus,
      persistenceConsensus: source.persistenceConsensus,
      qualitativeDirectionEvidenceUsable:
        source.combinationDecision.qualitativeDirectionEvidenceUsable,
      levelPercentileSpreadDiagnostic:
        source.levelDiagnostics.absoluteHistoricalPercentileSpread,
      productMomentumScore: null,
    },
    numericEligibility: {
      status: 'not-eligible' as const,
      unmetRequirements: FANDEX_MOMENTUM_NUMERIC_ELIGIBILITY_REQUIREMENTS,
      numericEstimand: null,
      calibrationTarget: null,
      mappingOrWeights: null,
      outOfSampleValidation: null,
      additionalFamiliesAloneSufficient: false as const,
      legacyPreviewSeedCalibrationAllowed: false as const,
    },
    currentProductSchema: {
      metricValueKind: 'number-or-null' as const,
      weightedScoreRequiresNumericValue: true as const,
      currentMomentumSourceStage: sourceInfo.sourceStage,
      currentMomentumQualityLabel: sourceInfo.qualityLabel,
      previewFallbackEnabled: true as const,
      previewFallbackExample,
      categoricalEvidenceFitsCurrentMomentumSlot: false as const,
    },
    researchCarrier: {
      observationContractVersion: FANDEX_OBSERVATION_CONTRACT_VERSION,
      categoricalRawValueSupported: true as const,
      recommendedVariableId:
        'momentum.cross-family-evidence-state.research' as const,
      registryBindingEstablished: false as const,
      productMetricBindingEstablished: false as const,
    },
    blockers,
  };

  return Object.freeze({
    ...payload,
    currentResearchOutput: Object.freeze(payload.currentResearchOutput),
    numericEligibility: Object.freeze(payload.numericEligibility),
    currentProductSchema: Object.freeze(payload.currentProductSchema),
    researchCarrier: Object.freeze(payload.researchCarrier),
    digest: sha256Canonical(payload),
    effects: Object.freeze({
      externalCalls: 0 as const,
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      masterScoreWrites: 0 as const,
      websiteWrites: 0 as const,
    }),
  });
}

export function buildFandexMomentumCategoricalResearchObservation(
  input: Readonly<{
    result: FandexMomentumOutputFormEligibilityResearchResult;
    collectedAt: string;
  }>,
): FandexObservationDraft {
  const collectedTimestamp = Date.parse(input.collectedAt);
  if (!Number.isFinite(collectedTimestamp)) {
    throw new Error('momentum_v143_collected_at_invalid');
  }
  if (input.result.state === 'blocked') {
    throw new Error('momentum_v143_blocked_result_observation_forbidden');
  }
  if (!input.result.alignmentCutoffAt) {
    throw new Error('momentum_v143_alignment_cutoff_missing');
  }

  return Object.freeze({
    providerId: 'fandex-derived',
    entity: Object.freeze({
      entityType: 'artist',
      entityId: input.result.canonicalArtistId,
      providerEntityId: null,
      identityState: 'canonical',
    }),
    variable: Object.freeze({
      variableId: 'momentum.cross-family-evidence-state.research',
      metricFamily: 'momentum',
      role: 'diagnostic',
    }),
    value: Object.freeze({
      rawValue: input.result.currentResearchOutput.directionalConsensus,
      unit: null,
      missingState: 'observed',
    }),
    time: Object.freeze({
      providerPeriodStart: null,
      providerPeriodEnd: input.result.alignmentCutoffAt,
      observedAt: input.result.alignmentCutoffAt,
      collectedAt: input.collectedAt,
    }),
    evidence: Object.freeze({
      evidenceRef: `fandex:momentum:v143:${input.result.digest}`,
      revision: null,
      conflictState:
        input.result.currentResearchOutput.directionalConsensus
          === 'direction-conflicted'
          ? 'cross-family-direction-conflict'
          : null,
    }),
    lifecycle: createFandexDataLifecycle({
      state: 'research',
      materialClass: 'real',
      blockers: input.result.blockers,
    }),
    contractVersion: FANDEX_OBSERVATION_CONTRACT_VERSION,
  });
}
