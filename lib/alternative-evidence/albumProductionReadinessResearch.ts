import type { CanonicalAlbumFeatureInput } from './canonicalAlbumFeatureInput';

export const ALBUM_PRODUCTION_READINESS_RESEARCH_CONTRACT_VERSION =
  'album-production-readiness-research-v1' as const;

export type AlbumProviderRightsState = 'allowed' | 'review-required' | 'blocked';
export type AlbumProviderSemanticState = 'verified' | 'partially-verified' | 'unverified';

export type AlbumProviderProductionEvidence = Readonly<{
  providerId: 'hanteo-chart' | 'circle-chart' | 'luminate-music';
  constructCompatible: boolean;
  constructEvidence: string;
  acquisitionRights: AlbumProviderRightsState;
  normalizedStorageRights: AlbumProviderRightsState;
  derivedPublicationRights: AlbumProviderRightsState;
  directObservationAuthorized: boolean;
  periodSemantics: AlbumProviderSemanticState;
  historicalQuerySemantics: AlbumProviderSemanticState;
  revisionSemantics: AlbumProviderSemanticState;
  evidenceUrls: readonly string[];
}>;

export const ALBUM_PRODUCTION_HISTORY_POLICY_RESEARCH = Object.freeze({
  lifecycle: 'research' as const,
  providerHistoricalQueryRequiredForProduction: false as const,
  authorizedComparableBaselineRequiredForProduction: true as const,
  prospectiveStoredAuthorizedObservationsMaySatisfyBaseline: true as const,
  reportedContextMaySatisfyBaseline: false as const,
  missingBaselineMayBecomeZero: false as const,
});

export const HANTEO_ALBUM_PRODUCTION_EVIDENCE = Object.freeze({
  providerId: 'hanteo-chart' as const,
  constructCompatible: true,
  constructEvidence:
    'Official Hanteo pages state that the album chart is generated from physical-album sales reported by connected retailers. A bounded research probe also observed a salesVolume field, but technical visibility is not reuse authorization.',
  acquisitionRights: 'review-required' as const,
  normalizedStorageRights: 'review-required' as const,
  derivedPublicationRights: 'review-required' as const,
  directObservationAuthorized: false,
  periodSemantics: 'partially-verified' as const,
  historicalQuerySemantics: 'partially-verified' as const,
  revisionSemantics: 'partially-verified' as const,
  evidenceUrls: Object.freeze([
    'https://www.hanteochart.com/en/about',
    'https://www.hanteochart.com/en/charts/album/weekly/2024-W08',
    'https://api.hanteochart.com/',
    'https://www.hanteochart.com/ko/notices',
  ]),
}) satisfies AlbumProviderProductionEvidence;

export const CIRCLE_RETAIL_ALBUM_PRODUCTION_EVIDENCE = Object.freeze({
  providerId: 'circle-chart' as const,
  constructCompatible: true,
  constructEvidence:
    'Official Circle Retail Album Chart defines its ranking basis as total offline-album sales at retail stores. The general Album Chart is a separate construct and must not be substituted for retail completed-purchase-class sales.',
  acquisitionRights: 'blocked' as const,
  normalizedStorageRights: 'review-required' as const,
  derivedPublicationRights: 'review-required' as const,
  directObservationAuthorized: false,
  periodSemantics: 'verified' as const,
  historicalQuerySemantics: 'partially-verified' as const,
  revisionSemantics: 'unverified' as const,
  evidenceUrls: Object.freeze([
    'https://circlechart.kr/page_chart/retail.circle',
  ]),
}) satisfies AlbumProviderProductionEvidence;

export type AlbumNormalizationFreezeInputs = Readonly<{
  sourceAuthorizationResolved: boolean;
  providerPeriodDefinitionResolved: boolean;
  baselineDefinitionResolved: boolean;
  crossReleaseComparabilityResolved: boolean;
  transformationRuleDefined: boolean;
  revisionPolicyResolved: boolean;
}>;

export type AlbumNormalizationFreezeAssessment = Readonly<{
  state: 'ready-for-freeze-review' | 'blocked';
  blockers: readonly string[];
}>;

export function evaluateAlbumNormalizationFreezeReadiness(
  input: AlbumNormalizationFreezeInputs,
): AlbumNormalizationFreezeAssessment {
  const blockers: string[] = [];
  if (!input.sourceAuthorizationResolved) blockers.push('normalization-source-authorization-unresolved');
  if (!input.providerPeriodDefinitionResolved) blockers.push('normalization-provider-period-unresolved');
  if (!input.baselineDefinitionResolved) blockers.push('normalization-baseline-definition-unresolved');
  if (!input.crossReleaseComparabilityResolved) blockers.push('normalization-cross-release-comparability-unresolved');
  if (!input.transformationRuleDefined) blockers.push('normalization-transformation-rule-unresolved');
  if (!input.revisionPolicyResolved) blockers.push('normalization-revision-policy-unresolved');
  return Object.freeze({
    state: blockers.length === 0 ? 'ready-for-freeze-review' as const : 'blocked' as const,
    blockers: Object.freeze(blockers),
  });
}

export type AlbumNormalizationDataAssessment = Readonly<{
  state: 'available' | 'insufficient-history' | 'blocked';
  currentFeatureInputId: string;
  baselineFeatureInputId: string | null;
  relativeChange: number | null;
  blockers: readonly string[];
}>;

export type MusicAlbumPointProductionReadiness = Readonly<{
  state: 'eligible-for-production-review' | 'blocked';
  providerState: 'ready' | 'rights-blocked' | 'semantics-blocked';
  normalizationState: AlbumNormalizationFreezeAssessment['state'];
  normalizationDataState: AlbumNormalizationDataAssessment['state'] | 'unassessed';
  blockers: readonly string[];
  reportedContextInputIds: readonly string[];
  directAbsoluteInputIds: readonly string[];
}>;

export function evaluateMusicAlbumPointProductionReadiness(input: Readonly<{
  provider: AlbumProviderProductionEvidence;
  normalization: AlbumNormalizationFreezeInputs;
  normalizationData: AlbumNormalizationDataAssessment | null;
  features: readonly CanonicalAlbumFeatureInput[];
}>): MusicAlbumPointProductionReadiness {
  const blockers: string[] = [];
  const provider = input.provider;

  if (!provider.constructCompatible) blockers.push('provider-construct-incompatible');
  if (provider.acquisitionRights !== 'allowed') blockers.push('provider-acquisition-rights-unresolved');
  if (provider.normalizedStorageRights !== 'allowed') blockers.push('provider-normalized-storage-rights-unresolved');
  if (provider.derivedPublicationRights !== 'allowed') blockers.push('provider-derived-publication-rights-unresolved');
  if (!provider.directObservationAuthorized) blockers.push('authorized-direct-provider-observation-missing');
  if (provider.periodSemantics !== 'verified') blockers.push('provider-period-semantics-not-fully-verified');
  if (provider.revisionSemantics !== 'verified') blockers.push('provider-revision-semantics-not-fully-verified');

  const reportedContextInputIds = input.features
    .filter((feature) => feature.sourceClass === 'news-reported-provider')
    .map((feature) => feature.featureInputId);
  const directAbsoluteInputIds = input.features
    .filter((feature) => feature.sourceClass === 'direct-provider'
      && feature.featureRole === 'absolute'
      && feature.value !== null
      && feature.unit === 'physical-units'
      && feature.artistIdentityState === 'resolved'
      && feature.releaseIdentityState === 'resolved')
    .map((feature) => feature.featureInputId);

  if (reportedContextInputIds.length > 0 && directAbsoluteInputIds.length === 0) {
    blockers.push('reported-sales-context-cannot-substitute-authorized-direct-observation');
  }
  if (directAbsoluteInputIds.length === 0) blockers.push('direct-absolute-sales-input-missing');

  const normalization = evaluateAlbumNormalizationFreezeReadiness(input.normalization);
  blockers.push(...normalization.blockers);

  const normalizationDataState = input.normalizationData?.state ?? 'unassessed';
  if (input.normalizationData === null) {
    blockers.push('normalization-data-unassessed');
  } else if (input.normalizationData.state === 'insufficient-history') {
    blockers.push('normalization-previous-comparable-release-missing');
  } else if (input.normalizationData.state === 'blocked') {
    blockers.push('normalization-data-blocked');
    blockers.push(...input.normalizationData.blockers);
  } else {
    const baselineId = input.normalizationData.baselineFeatureInputId;
    if (baselineId === null) blockers.push('normalization-baseline-feature-input-missing');
    if (input.normalizationData.relativeChange === null || !Number.isFinite(input.normalizationData.relativeChange)) {
      blockers.push('normalization-relative-change-unavailable');
    }
    if (!directAbsoluteInputIds.includes(input.normalizationData.currentFeatureInputId)) {
      blockers.push('normalization-current-input-not-authorized-direct-absolute');
    }
    if (baselineId !== null && !directAbsoluteInputIds.includes(baselineId)) {
      blockers.push('normalization-baseline-input-not-authorized-direct-absolute');
    }
  }

  const providerState = blockers.some((blocker) => blocker.includes('rights') || blocker === 'authorized-direct-provider-observation-missing')
    ? 'rights-blocked' as const
    : blockers.some((blocker) => blocker.startsWith('provider-'))
      ? 'semantics-blocked' as const
      : 'ready' as const;

  return Object.freeze({
    state: blockers.length === 0 ? 'eligible-for-production-review' as const : 'blocked' as const,
    providerState,
    normalizationState: normalization.state,
    normalizationDataState,
    blockers: Object.freeze([...new Set(blockers)]),
    reportedContextInputIds: Object.freeze(reportedContextInputIds),
    directAbsoluteInputIds: Object.freeze(directAbsoluteInputIds),
  });
}
