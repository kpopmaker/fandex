import type { CanonicalAlbumFeatureInput } from './canonicalAlbumFeatureInput';
import type { DirectAlbumObservation } from './directAlbumProvider';

export const ALBUM_NORMALIZATION_RESEARCH_CONTRACT_VERSION =
  'album-normalization-research-v1' as const;

export const ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: ALBUM_NORMALIZATION_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  productMethodologyFrozen: false as const,
  productionEligible: false as const,
  finalScorePublished: false as const,
  construct: 'physical completed-purchase-class sales reaction' as const,
  primaryAnchor: 'release-relative-first-week-physical-units' as const,
  baselineDefinition: 'immediately-previous-comparable-eligible-release' as const,
  transformationRule: 'current-over-previous-minus-one' as const,
  productionOutputScope: 'single-provider-single-territory-release-reaction' as const,
  territoryLabelRequired: true as const,
  globalMarketReactionLabelAllowed: false as const,
  rawProviderUnitsPreserved: true as const,
  crossProviderAggregationAllowed: false as const,
  crossTerritoryAggregationAllowed: false as const,
  arbitraryNumericThresholdsUsed: false as const,
  calendarWeekMaySubstituteForFirstWeek: false as const,
  revisionCreatesNewBaselineObservation: false as const,
});

export type AlbumNormalizationReleaseEligibilityState =
  | 'eligible'
  | 'ineligible'
  | 'unresolved';

export type AlbumNormalizationCandidate = Readonly<{
  releaseDate: string;
  releaseEligibilityState: AlbumNormalizationReleaseEligibilityState;
  feature: CanonicalAlbumFeatureInput;
}>;

export type AlbumNormalizationComparability = Readonly<{
  state: 'comparable' | 'not-comparable';
  blockers: readonly string[];
}>;

const sameNullable = (a: string | null, b: string | null) => a === b;

export function evaluateFirstWeekNormalizationComparability(
  current: CanonicalAlbumFeatureInput,
  baseline: CanonicalAlbumFeatureInput,
): AlbumNormalizationComparability {
  const blockers: string[] = [];

  for (const feature of [current, baseline]) {
    if (feature.sourceClass !== 'direct-provider') blockers.push('normalization-direct-provider-required');
    if (feature.semantic !== 'first-week-sale') blockers.push('normalization-first-week-semantic-required');
    if (feature.unit !== 'physical-units') blockers.push('normalization-physical-units-required');
    if (feature.periodType !== 'first-week') blockers.push('normalization-release-relative-first-week-required');
    if (feature.value === null) blockers.push('normalization-value-missing');
    if (feature.artistIdentityState !== 'resolved') blockers.push('normalization-artist-identity-unresolved');
    if (feature.releaseIdentityState !== 'resolved') blockers.push('normalization-release-identity-unresolved');
  }

  if (current.artistId !== baseline.artistId) blockers.push('normalization-artist-mismatch');
  if (current.provenance.reportedProvider !== baseline.provenance.reportedProvider) {
    blockers.push('normalization-provider-mismatch');
  }
  if (!sameNullable(current.territory, baseline.territory)) blockers.push('normalization-territory-mismatch');
  if (!sameNullable(current.format, baseline.format)) blockers.push('normalization-format-mismatch');
  if (!sameNullable(current.aggregationScope, baseline.aggregationScope)) {
    blockers.push('normalization-aggregation-scope-mismatch');
  }
  if (current.releaseId === baseline.releaseId) blockers.push('normalization-same-release-not-baseline');

  return Object.freeze({
    state: blockers.length === 0 ? 'comparable' as const : 'not-comparable' as const,
    blockers: Object.freeze([...new Set(blockers)]),
  });
}

export type AlbumNormalizationBaselineSelection = Readonly<{
  state: 'selected' | 'insufficient-history' | 'current-ineligible' | 'current-unresolved';
  baseline: AlbumNormalizationCandidate | null;
  blockers: readonly string[];
}>;

export function selectImmediatelyPreviousComparableRelease(
  current: AlbumNormalizationCandidate,
  history: readonly AlbumNormalizationCandidate[],
): AlbumNormalizationBaselineSelection {
  if (current.releaseEligibilityState === 'ineligible') {
    return Object.freeze({ state: 'current-ineligible', baseline: null, blockers: Object.freeze(['normalization-current-release-ineligible']) });
  }
  if (current.releaseEligibilityState !== 'eligible') {
    return Object.freeze({ state: 'current-unresolved', baseline: null, blockers: Object.freeze(['normalization-current-release-eligibility-unresolved']) });
  }

  const candidates = history
    .filter((candidate) => candidate.releaseEligibilityState === 'eligible')
    .filter((candidate) => candidate.releaseDate < current.releaseDate)
    .filter((candidate) => evaluateFirstWeekNormalizationComparability(current.feature, candidate.feature).state === 'comparable')
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

  const baseline = candidates[0] ?? null;
  if (!baseline) {
    return Object.freeze({
      state: 'insufficient-history',
      baseline: null,
      blockers: Object.freeze(['normalization-previous-comparable-release-missing']),
    });
  }

  return Object.freeze({ state: 'selected', baseline, blockers: Object.freeze([]) });
}

export type AlbumNormalizedReleaseReaction = Readonly<{
  state: 'available' | 'insufficient-history' | 'blocked';
  currentFeatureInputId: string;
  baselineFeatureInputId: string | null;
  currentPhysicalUnits: number | null;
  baselinePhysicalUnits: number | null;
  relativeChange: number | null;
  blockers: readonly string[];
}>;

export function normalizeAgainstPreviousComparableRelease(
  current: AlbumNormalizationCandidate,
  history: readonly AlbumNormalizationCandidate[],
): AlbumNormalizedReleaseReaction {
  const selection = selectImmediatelyPreviousComparableRelease(current, history);
  if (selection.state === 'insufficient-history') {
    return Object.freeze({
      state: 'insufficient-history',
      currentFeatureInputId: current.feature.featureInputId,
      baselineFeatureInputId: null,
      currentPhysicalUnits: current.feature.value,
      baselinePhysicalUnits: null,
      relativeChange: null,
      blockers: selection.blockers,
    });
  }
  if (selection.state !== 'selected' || !selection.baseline) {
    return Object.freeze({
      state: 'blocked',
      currentFeatureInputId: current.feature.featureInputId,
      baselineFeatureInputId: null,
      currentPhysicalUnits: current.feature.value,
      baselinePhysicalUnits: null,
      relativeChange: null,
      blockers: selection.blockers,
    });
  }

  const baselineValue = selection.baseline.feature.value;
  const currentValue = current.feature.value;
  if (baselineValue === null || currentValue === null || baselineValue <= 0 || currentValue < 0) {
    return Object.freeze({
      state: 'blocked',
      currentFeatureInputId: current.feature.featureInputId,
      baselineFeatureInputId: selection.baseline.feature.featureInputId,
      currentPhysicalUnits: currentValue,
      baselinePhysicalUnits: baselineValue,
      relativeChange: null,
      blockers: Object.freeze(['normalization-nonpositive-baseline-or-invalid-current-value']),
    });
  }

  return Object.freeze({
    state: 'available',
    currentFeatureInputId: current.feature.featureInputId,
    baselineFeatureInputId: selection.baseline.feature.featureInputId,
    currentPhysicalUnits: currentValue,
    baselinePhysicalUnits: baselineValue,
    relativeChange: (currentValue / baselineValue) - 1,
    blockers: Object.freeze([]),
  });
}

export type AlbumRevisionHead = Readonly<{
  state: 'resolved' | 'conflicting' | 'empty';
  observation: DirectAlbumObservation | null;
  blockers: readonly string[];
}>;

function visibleAtCutoff(observation: DirectAlbumObservation, cutoff: string): boolean {
  if (observation.collectedAt > cutoff) return false;
  if (observation.revisionObservedAt !== null && observation.revisionObservedAt > cutoff) return false;
  return true;
}

export function selectDirectObservationRevisionHead(
  observations: readonly DirectAlbumObservation[],
  options: Readonly<{ knowledgeMode: 'current-research' | 'as-known-at-collection'; cutoff?: string }> = { knowledgeMode: 'current-research' },
): AlbumRevisionHead {
  const visible = options.knowledgeMode === 'as-known-at-collection'
    ? observations.filter((observation) => options.cutoff !== undefined && visibleAtCutoff(observation, options.cutoff))
    : [...observations];

  const active = visible.filter((observation) => !visible.some(
    (other) => other.supersedesObservationId === observation.observationId,
  ));

  if (active.length === 0) {
    return Object.freeze({ state: 'empty', observation: null, blockers: Object.freeze(['normalization-revision-head-missing']) });
  }
  if (active.length !== 1) {
    return Object.freeze({ state: 'conflicting', observation: null, blockers: Object.freeze(['normalization-revision-head-conflicting']) });
  }
  return Object.freeze({ state: 'resolved', observation: active[0], blockers: Object.freeze([]) });
}

export const ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS = Object.freeze({
  baselineDefinitionResolved: true,
  crossReleaseComparabilityResolved: true,
  territoryScopeDefinitionResolved: true,
  transformationRuleDefined: true,
  revisionPolicyResolved: true,
  sourceAuthorizationResolved: false,
  providerPeriodDefinitionResolved: false,
  unresolvedExternalBlockers: Object.freeze([
    'normalization-source-authorization-unresolved',
    'normalization-provider-period-unresolved',
  ]),
});
