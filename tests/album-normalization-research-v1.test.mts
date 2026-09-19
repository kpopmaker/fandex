import test from 'node:test';
import assert from 'node:assert/strict';

import type { CanonicalAlbumFeatureInput } from '../lib/alternative-evidence/canonicalAlbumFeatureInput';
import type { DirectAlbumObservation } from '../lib/alternative-evidence/directAlbumProvider';
import {
  ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS,
  ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR,
  evaluateFirstWeekNormalizationComparability,
  normalizeAgainstPreviousComparableRelease,
  selectDirectObservationRevisionHead,
  selectImmediatelyPreviousComparableRelease,
} from '../lib/alternative-evidence/albumNormalizationResearch';

function feature(input: Readonly<{
  id: string;
  releaseId: string;
  value: number;
  provider?: string;
  semantic?: string;
  periodType?: CanonicalAlbumFeatureInput['periodType'];
  territory?: string | null;
  format?: string | null;
  aggregationScope?: string | null;
}>): CanonicalAlbumFeatureInput {
  const provider = input.provider ?? 'hanteo-chart';
  return {
    contractVersion: 'canonical-album-feature-input-v1',
    featureInputId: input.id,
    featureInputFamilyId: null,
    featureKey: 'reportedFirstWeekSales',
    featureRole: 'context',
    sourceClass: 'direct-provider',
    sourceEvidenceId: `e-${input.id}`,
    sourceObservationId: `o-${input.id}`,
    contributionIdentity: {
      contributionIdentityId: `c-${input.id}`,
      sourceEvidenceId: `e-${input.id}`,
      claimFamilyId: null,
      underlyingObservationId: `o-${input.id}`,
      scopeKey: input.releaseId,
    },
    provenance: {
      origin: 'direct-licensed-provider',
      acquisitionProvider: provider,
      reportedProvider: provider,
      sourceUrl: null,
      evidenceDigest: `d-${input.id}`,
      researchOnly: true,
    },
    artistId: 'iu',
    artistIdentityState: 'resolved',
    releaseId: input.releaseId,
    releaseIdentityState: 'resolved',
    releaseFamilyId: null,
    editionId: null,
    skuId: null,
    semantic: input.semantic ?? 'first-week-sale',
    value: input.value,
    unit: 'physical-units',
    territory: input.territory ?? 'KR',
    format: input.format ?? 'physical-album',
    providerPeriod: null,
    reportedPeriod: null,
    sourcePublishedAt: null,
    providerPublishedAt: null,
    observedAt: '2026-09-17T00:00:00Z',
    collectedAt: '2026-09-17T00:01:00Z',
    revisionObservedAt: null,
    knowledgeMode: 'current-research',
    periodType: input.periodType ?? 'first-week',
    availabilityState: 'available',
    qualityState: 'clear',
    eligibilityState: 'feature-resolver-candidate',
    proxyFallbackState: 'context-only',
    comparabilityState: 'unknown',
    crossSourceDuplicationState: 'unknown',
    retailerId: null,
    retailerProductId: null,
    categoryFamily: null,
    providerCategoryId: null,
    categoryResolutionState: null,
    chartType: null,
    movementType: null,
    aggregationScope: input.aggregationScope ?? 'release-total',
    parentInputId: null,
    blockers: [],
  };
}

function observation(input: Readonly<{
  id: string;
  value: number;
  collectedAt: string;
  revisionId?: string | null;
  revisionObservedAt?: string | null;
  supersedesObservationId?: string | null;
}>): DirectAlbumObservation {
  return {
    contractVersion: 'direct-album-observation-v1',
    observationId: input.id,
    providerId: 'hanteo-chart',
    providerObservationId: input.id,
    providerArtistId: 'iu-provider',
    providerReleaseId: 'release-provider',
    providerEditionId: null,
    providerSkuId: null,
    fandexArtistId: 'iu',
    fandexReleaseId: 'release-current',
    fandexReleaseFamilyId: null,
    semantic: 'first-week-sale',
    value: input.value,
    unit: 'physical-units',
    territory: 'KR',
    format: 'physical-album',
    providerPeriod: 'release-relative-first-week',
    providerPublishedAt: null,
    observedAt: input.collectedAt,
    collectedAt: input.collectedAt,
    revisionId: input.revisionId ?? null,
    revisionObservedAt: input.revisionObservedAt ?? null,
    supersedesObservationId: input.supersedesObservationId ?? null,
    knowledgeMode: 'current-research',
    scopeRole: 'release-total',
    parentObservationId: null,
    evidenceDigest: `digest-${input.id}`,
    syntheticFixture: true,
  };
}

test('normalization contract uses no arbitrary thresholds, provider sums, or territory sums', () => {
  assert.equal(ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR.primaryAnchor, 'release-relative-first-week-physical-units');
  assert.equal(ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR.baselineDefinition, 'immediately-previous-comparable-eligible-release');
  assert.equal(ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR.transformationRule, 'current-over-previous-minus-one');
  assert.equal(ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR.productionOutputScope, 'single-provider-single-territory-release-reaction');
  assert.equal(ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR.territoryLabelRequired, true);
  assert.equal(ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR.globalMarketReactionLabelAllowed, false);
  assert.equal(ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR.arbitraryNumericThresholdsUsed, false);
  assert.equal(ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR.crossProviderAggregationAllowed, false);
  assert.equal(ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR.crossTerritoryAggregationAllowed, false);
  assert.equal(ALBUM_NORMALIZATION_RESEARCH_DESCRIPTOR.finalScorePublished, false);
});

test('selects the immediately previous comparable eligible release, not an arbitrary history window', () => {
  const current = { releaseDate: '2026-01-01', releaseEligibilityState: 'eligible' as const, feature: feature({ id: 'current', releaseId: 'r3', value: 200 }) };
  const old = { releaseDate: '2020-01-01', releaseEligibilityState: 'eligible' as const, feature: feature({ id: 'old', releaseId: 'r1', value: 50 }) };
  const previous = { releaseDate: '2024-01-01', releaseEligibilityState: 'eligible' as const, feature: feature({ id: 'previous', releaseId: 'r2', value: 100 }) };
  const selection = selectImmediatelyPreviousComparableRelease(current, [old, previous]);
  assert.equal(selection.state, 'selected');
  assert.equal(selection.baseline?.feature.featureInputId, 'previous');

  const normalized = normalizeAgainstPreviousComparableRelease(current, [old, previous]);
  assert.equal(normalized.state, 'available');
  assert.equal(normalized.currentPhysicalUnits, 200);
  assert.equal(normalized.baselinePhysicalUnits, 100);
  assert.equal(normalized.relativeChange, 1);
});

test('calendar-week, another provider, or another territory cannot substitute for the same release-reaction lane', () => {
  const current = feature({ id: 'current', releaseId: 'r3', value: 200, provider: 'luminate-music', territory: 'US' });
  const calendarWeek = feature({ id: 'weekly', releaseId: 'r2', value: 100, provider: 'luminate-music', territory: 'US', semantic: 'period-sale', periodType: 'week' });
  const otherProvider = feature({ id: 'other-provider', releaseId: 'r2', value: 100, provider: 'circle-chart', territory: 'US' });
  const otherTerritory = feature({ id: 'other-territory', releaseId: 'r2', value: 100, provider: 'luminate-music', territory: 'CA' });

  const weekComparison = evaluateFirstWeekNormalizationComparability(current, calendarWeek);
  assert.equal(weekComparison.state, 'not-comparable');
  assert.ok(weekComparison.blockers.includes('normalization-first-week-semantic-required'));
  assert.ok(weekComparison.blockers.includes('normalization-release-relative-first-week-required'));

  const providerComparison = evaluateFirstWeekNormalizationComparability(current, otherProvider);
  assert.equal(providerComparison.state, 'not-comparable');
  assert.ok(providerComparison.blockers.includes('normalization-provider-mismatch'));

  const territoryComparison = evaluateFirstWeekNormalizationComparability(current, otherTerritory);
  assert.equal(territoryComparison.state, 'not-comparable');
  assert.ok(territoryComparison.blockers.includes('normalization-territory-mismatch'));
});

test('missing comparable history remains insufficient-history and never becomes numeric zero', () => {
  const current = { releaseDate: '2026-01-01', releaseEligibilityState: 'eligible' as const, feature: feature({ id: 'current', releaseId: 'r3', value: 200 }) };
  const normalized = normalizeAgainstPreviousComparableRelease(current, []);
  assert.equal(normalized.state, 'insufficient-history');
  assert.equal(normalized.baselinePhysicalUnits, null);
  assert.equal(normalized.relativeChange, null);
  assert.ok(normalized.blockers.includes('normalization-previous-comparable-release-missing'));
});

test('revision policy uses one active supersession head instead of counting revisions as observations', () => {
  const original = observation({ id: 'original', value: 100, collectedAt: '2026-01-08T00:00:00Z' });
  const revised = observation({
    id: 'revised',
    value: 110,
    collectedAt: '2026-01-09T00:00:00Z',
    revisionId: 'rev-1',
    revisionObservedAt: '2026-01-09T00:00:00Z',
    supersedesObservationId: 'original',
  });

  const current = selectDirectObservationRevisionHead([original, revised]);
  assert.equal(current.state, 'resolved');
  assert.equal(current.observation?.observationId, 'revised');
  assert.equal(current.observation?.value, 110);

  const asKnownBeforeRevision = selectDirectObservationRevisionHead([original, revised], {
    knowledgeMode: 'as-known-at-collection',
    cutoff: '2026-01-08T12:00:00Z',
  });
  assert.equal(asKnownBeforeRevision.state, 'resolved');
  assert.equal(asKnownBeforeRevision.observation?.observationId, 'original');
});

test('internal normalization definitions include resolved territory scope while external rights and generic provider-period remain blocked', () => {
  assert.deepEqual(ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS, {
    baselineDefinitionResolved: true,
    crossReleaseComparabilityResolved: true,
    territoryScopeDefinitionResolved: true,
    transformationRuleDefined: true,
    revisionPolicyResolved: true,
    sourceAuthorizationResolved: false,
    providerPeriodDefinitionResolved: false,
    unresolvedExternalBlockers: [
      'normalization-source-authorization-unresolved',
      'normalization-provider-period-unresolved',
    ],
  });
});
