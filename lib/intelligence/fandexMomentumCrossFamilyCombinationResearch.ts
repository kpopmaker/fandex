import { sha256Canonical } from '../shared/canonicalDigest';
import {
  FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION,
  type FandexMomentumNormalizedComponent,
  type FandexMomentumTemporalNormalizationResearchResult,
} from './fandexMomentumTemporalNormalizationResearch';

export const FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION =
  'v142_fandex_momentum_cross_family_combination_research_v1' as const;

export const FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    targetVariable: 'momentum' as const,
    combinationMode: 'evidence-consensus-not-score' as const,
    requiredFamilies: Object.freeze([
      'audience-consumption',
      'media-attention',
    ] as const),
    sameNonFlatDirectionCreatesCorroboration: true as const,
    conflictingDirectionsMustRemainVisible: true as const,
    repeatedDirectionDefinition:
      'at-least-two-consecutive-native-cadence-transitions' as const,
    percentileLevelRole: 'diagnostic-only' as const,
    percentileSpreadRole: 'diagnostic-only' as const,
    directionConsensusMayCreateNumericScore: false as const,
    persistenceMayCreateNumericWeight: false as const,
    percentileMayBeAveraged: false as const,
    equalWeightsAllowedByDefault: false as const,
    compositeScoreProduced: false as const,
    methodologyFreezePerformed: false as const,
    productActivationAllowed: false as const,
    productionEligible: false as const,
  });

type Direction = 'up' | 'down' | 'flat';

export type FandexMomentumDirectionalConsensus =
  | 'direction-corroborated-up'
  | 'direction-corroborated-down'
  | 'flat-corroborated'
  | 'direction-conflicted'
  | 'direction-insufficient';

export type FandexMomentumPersistenceConsensus =
  | 'both-directions-repeated'
  | 'one-direction-repeated'
  | 'neither-direction-repeated'
  | 'persistence-not-applicable';

export type FandexMomentumCombinationFamilyEvidence = Readonly<{
  family: 'audience-consumption' | 'media-attention';
  direction: Direction | null;
  nativeDelta: number | null;
  repeatedDirection: boolean;
  directionalRunTransitionCount: number;
  directionalRunDurationHours: number;
  historicalStrictExceedanceShare: number | null;
}>;

export type FandexMomentumCrossFamilyCombinationResearchResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION;
  sourceContractVersion: typeof FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION;
  state:
    | 'cross-family-direction-corroborated'
    | 'cross-family-flat-corroborated'
    | 'cross-family-direction-conflicted'
    | 'cross-family-direction-insufficient'
    | 'blocked';
  canonicalArtistId: string;
  alignmentCutoffAt: string | null;
  directionalConsensus: FandexMomentumDirectionalConsensus;
  persistenceConsensus: FandexMomentumPersistenceConsensus;
  familyEvidence: readonly FandexMomentumCombinationFamilyEvidence[];
  levelDiagnostics: Readonly<{
    normalizedLevelCount: number;
    lowestHistoricalStrictExceedanceShare: number | null;
    highestHistoricalStrictExceedanceShare: number | null;
    absoluteHistoricalPercentileSpread: number | null;
    aggregationEligible: false;
  }>;
  combinationDecision: Readonly<{
    qualitativeDirectionEvidenceUsable: boolean;
    numericCompositeAllowed: false;
    equalWeightAverageAllowed: false;
    percentileAverageAllowed: false;
    persistenceWeightingAllowed: false;
    productMomentumScore: null;
  }>;
  freezeStatus: Readonly<{
    crossFamilyDirectionRule: 'defined-research';
    crossFamilyPersistenceDescription: 'defined-research';
    percentileAggregation: 'not-authorized';
    componentWeighting: 'not-frozen';
    compositeScoreFormula: 'not-frozen';
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

function componentEvidence(
  component: FandexMomentumNormalizedComponent,
): FandexMomentumCombinationFamilyEvidence {
  return Object.freeze({
    family: component.family,
    direction: component.direction,
    nativeDelta: component.nativeDelta,
    repeatedDirection:
      component.direction !== null
      && component.direction !== 'flat'
      && component.latestDirectionalRunTransitionCount >= 2,
    directionalRunTransitionCount:
      component.latestDirectionalRunTransitionCount,
    directionalRunDurationHours:
      component.latestDirectionalRunDurationHours,
    historicalStrictExceedanceShare:
      component.historicalStrictExceedanceShare,
  });
}

function directionalConsensus(
  evidence: readonly FandexMomentumCombinationFamilyEvidence[],
): FandexMomentumDirectionalConsensus {
  if (evidence.length !== 2 || evidence.some((item) => item.direction === null)) {
    return 'direction-insufficient';
  }
  const [left, right] = evidence;
  if (left.direction === 'flat' && right.direction === 'flat') {
    return 'flat-corroborated';
  }
  if (left.direction === right.direction && left.direction === 'up') {
    return 'direction-corroborated-up';
  }
  if (left.direction === right.direction && left.direction === 'down') {
    return 'direction-corroborated-down';
  }
  return 'direction-conflicted';
}

function persistenceConsensus(
  evidence: readonly FandexMomentumCombinationFamilyEvidence[],
  directionState: FandexMomentumDirectionalConsensus,
): FandexMomentumPersistenceConsensus {
  if (
    directionState === 'direction-insufficient'
    || directionState === 'flat-corroborated'
    || directionState === 'direction-conflicted'
  ) {
    return 'persistence-not-applicable';
  }
  const repeatedCount = evidence.filter((item) => item.repeatedDirection).length;
  if (repeatedCount === 2) return 'both-directions-repeated';
  if (repeatedCount === 1) return 'one-direction-repeated';
  return 'neither-direction-repeated';
}

function resultState(
  consensus: FandexMomentumDirectionalConsensus,
): FandexMomentumCrossFamilyCombinationResearchResult['state'] {
  if (
    consensus === 'direction-corroborated-up'
    || consensus === 'direction-corroborated-down'
  ) {
    return 'cross-family-direction-corroborated';
  }
  if (consensus === 'flat-corroborated') {
    return 'cross-family-flat-corroborated';
  }
  if (consensus === 'direction-conflicted') {
    return 'cross-family-direction-conflicted';
  }
  return 'cross-family-direction-insufficient';
}

export function evaluateFandexMomentumCrossFamilyCombinationResearch(
  source: FandexMomentumTemporalNormalizationResearchResult,
): FandexMomentumCrossFamilyCombinationResearchResult {
  const hardBlockers: string[] = [];
  if (
    source.contractVersion
      !== FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION
  ) {
    hardBlockers.push('v141-contract-incompatible');
  }
  if (source.state !== 'aligned-normalized-research') {
    hardBlockers.push('v141-aligned-normalized-research-required');
  }
  if (
    source.effects.externalCalls !== 0
    || source.effects.databaseWrites !== 0
    || source.effects.masterScoreWrites !== 0
    || source.effects.websiteWrites !== 0
  ) {
    hardBlockers.push('v141-side-effects-not-read-only');
  }
  if (
    source.crossFamilyRawAveragingApplied !== false
    || source.crossFamilyNormalizedAveragingApplied !== false
    || source.componentWeights !== null
    || source.compositeScore !== null
  ) {
    hardBlockers.push('v141-premature-combination-detected');
  }

  const expectedFamilies = new Set([
    'audience-consumption',
    'media-attention',
  ]);
  const actualFamilies = new Set(source.components.map((item) => item.family));
  if (
    source.components.length !== 2
    || actualFamilies.size !== 2
    || [...expectedFamilies].some((family) => !actualFamilies.has(
      family as FandexMomentumNormalizedComponent['family'],
    ))
  ) {
    hardBlockers.push('required-component-family-set-mismatch');
  }

  const familyEvidence = Object.freeze(
    source.components.map(componentEvidence),
  );
  const consensus = hardBlockers.length === 0
    ? directionalConsensus(familyEvidence)
    : 'direction-insufficient' as const;
  const persistence = persistenceConsensus(familyEvidence, consensus);

  const levels = familyEvidence
    .map((item) => item.historicalStrictExceedanceShare)
    .filter((value): value is number => value !== null);
  const lowest = levels.length > 0 ? Math.min(...levels) : null;
  const highest = levels.length > 0 ? Math.max(...levels) : null;
  const spread =
    lowest === null || highest === null
      ? null
      : Math.round((highest - lowest) * 1_000_000_000_000) / 1_000_000_000_000;

  const state = hardBlockers.length > 0
    ? 'blocked' as const
    : resultState(consensus);

  const blockers = Object.freeze([
    ...hardBlockers,
    ...(state === 'cross-family-direction-conflicted'
      ? ['cross-family-direction-conflict']
      : []),
    ...(state === 'cross-family-direction-insufficient'
      ? ['cross-family-direction-insufficient']
      : []),
    'percentile-levels-diagnostic-only',
    'component-weighting-not-frozen',
    'composite-score-formula-not-frozen',
  ]);

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_CROSS_FAMILY_COMBINATION_RESEARCH_VERSION,
    sourceContractVersion:
      FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION,
    state,
    canonicalArtistId: source.canonicalArtistId,
    alignmentCutoffAt: source.alignmentCutoffAt,
    directionalConsensus: consensus,
    persistenceConsensus: persistence,
    familyEvidence,
    levelDiagnostics: {
      normalizedLevelCount: levels.length,
      lowestHistoricalStrictExceedanceShare: lowest,
      highestHistoricalStrictExceedanceShare: highest,
      absoluteHistoricalPercentileSpread: spread,
      aggregationEligible: false as const,
    },
    combinationDecision: {
      qualitativeDirectionEvidenceUsable:
        state === 'cross-family-direction-corroborated'
        || state === 'cross-family-flat-corroborated',
      numericCompositeAllowed: false as const,
      equalWeightAverageAllowed: false as const,
      percentileAverageAllowed: false as const,
      persistenceWeightingAllowed: false as const,
      productMomentumScore: null,
    },
    freezeStatus: {
      crossFamilyDirectionRule: 'defined-research' as const,
      crossFamilyPersistenceDescription: 'defined-research' as const,
      percentileAggregation: 'not-authorized' as const,
      componentWeighting: 'not-frozen' as const,
      compositeScoreFormula: 'not-frozen' as const,
    },
    blockers,
  };

  return Object.freeze({
    ...payload,
    levelDiagnostics: Object.freeze(payload.levelDiagnostics),
    combinationDecision: Object.freeze(payload.combinationDecision),
    freezeStatus: Object.freeze(payload.freezeStatus),
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
