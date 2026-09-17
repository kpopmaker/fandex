import type { AlbumProviderProductionEvidence } from './albumProductionReadinessResearch';
import {
  LUMINATE_ALBUM_PRODUCTION_EVIDENCE_RESEARCH,
  LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH,
} from './luminateAlbumSalesProductionCandidateResearch';

export const LUMINATE_ALBUM_AUTHORIZATION_RESEARCH_VERSION =
  'luminate-album-authorization-research-v1' as const;

export type LuminateGrantAnswer =
  | 'expressly-allowed'
  | 'allowed-with-conditions'
  | 'not-allowed'
  | 'not-addressed';

export type LuminatePostTerminationPolicy =
  | 'retain-specified-derived-output-under-survival-right'
  | 'delete-source-and-retract-provider-derived-output'
  | 'unresolved';

export type LuminateFandexAuthorizationGrant = Readonly<{
  agreementKind: 'order-form' | 'separate-writing' | 'subscription-only' | 'none';
  agreementEvidenceId: string | null;
  licenseActive: boolean;
  physicalProductSalesIncluded: LuminateGrantAnswer;
  authorizedTerritories: readonly ('US' | 'CA')[];
  apiOrDataShareAccess: LuminateGrantAnswer;
  recurringProgrammaticCollection: LuminateGrantAnswer;
  normalizedStorage: LuminateGrantAnswer;
  retentionDuringLicense: LuminateGrantAnswer;
  commercialProductUse: LuminateGrantAnswer;
  publicDerivedMetricPublication: LuminateGrantAnswer;
  publicRankingOrBenchmarking: LuminateGrantAnswer;
  rawRedistribution: LuminateGrantAnswer;
  postTerminationPolicy: LuminatePostTerminationPolicy;
  postTerminationPolicyEvidenceId: string | null;
}>;

export type LuminateAuthorizationAssessment = Readonly<{
  state: 'eligible-for-provider-onboarding-review' | 'blocked';
  rightsResolved: boolean;
  authorizedTerritories: readonly ('US' | 'CA')[];
  blockers: readonly string[];
  nonBlockingGaps: readonly string[];
}>;

const granted = (value: LuminateGrantAnswer) =>
  value === 'expressly-allowed' || value === 'allowed-with-conditions';

export const LUMINATE_DEFAULT_TERMS_SNAPSHOT_RESEARCH = Object.freeze({
  lifecycle: 'research' as const,
  termsLastUpdated: '2026-03' as const,
  defaultPermittedUse: 'confidential-internal-business-use' as const,
  separateOrderFormOrWritingMayExpandPermittedUse: true as const,
  internalAnalyticalOutputAllowed: true as const,
  thirdPartySharingOfInternalAnalyticalOutputAllowedByDefault: false as const,
  publicChartListRankingOrBenchmarkingAllowedByDefault: false as const,
  publicDisclosureOfLuminateContentAllowedByDefault: false as const,
  luminateDataTreatedAsConfidentialInformation: true as const,
  terminationRequiresCeaseUseAndDeleteLuminateContent: true as const,
  subscriptionAloneEstablishesFandexPublicProductRights: false as const,
  apiAndDataShareAreCommercialAccessSurfaces: true as const,
  evidenceUrls: Object.freeze([
    'https://luminatedata.com/terms-of-use/',
    'https://docs.luminatedata.com/docs/onboarding-documentation',
    'https://luminatedata.com/solutions/music-publishers/',
  ]),
});

export const LUMINATE_FANDEX_REQUIRED_GRANTS_RESEARCH = Object.freeze({
  lifecycle: 'research' as const,
  rawRedistributionRequired: false as const,
  publicRawPayloadPublicationRequired: false as const,
  aiModelTrainingRequired: false as const,
  requiredUses: Object.freeze([
    'licensed-physical-product-sales-access',
    'api-or-data-share-access',
    'recurring-programmatic-collection',
    'normalized-observation-storage',
    'retention-during-license',
    'commercial-fandex-product-use',
    'public-derived-metric-publication',
    'public-ranking-or-benchmarking-if-product-output-is-comparative',
    'resolved-post-termination-delete-or-survival-policy',
  ] as const),
});

export function evaluateLuminateFandexAuthorizationGrant(
  grant: LuminateFandexAuthorizationGrant,
): LuminateAuthorizationAssessment {
  const blockers: string[] = [];
  const nonBlockingGaps: string[] = [];

  if (grant.agreementKind !== 'order-form' && grant.agreementKind !== 'separate-writing') {
    blockers.push('luminate-explicit-fandex-permitted-use-writing-missing');
  }
  if (!grant.agreementEvidenceId || grant.agreementEvidenceId.trim() === '') {
    blockers.push('luminate-agreement-evidence-missing');
  }
  if (!grant.licenseActive) blockers.push('luminate-license-not-active');
  if (!granted(grant.physicalProductSalesIncluded)) {
    blockers.push('luminate-physical-product-sales-scope-not-authorized');
  }
  if (grant.authorizedTerritories.length === 0) {
    blockers.push('luminate-authorized-territory-missing');
  }
  if (!granted(grant.apiOrDataShareAccess)) {
    blockers.push('luminate-api-or-data-share-access-not-authorized');
  }
  if (!granted(grant.recurringProgrammaticCollection)) {
    blockers.push('luminate-recurring-programmatic-collection-not-authorized');
  }
  if (!granted(grant.normalizedStorage)) {
    blockers.push('luminate-normalized-storage-not-authorized');
  }
  if (!granted(grant.retentionDuringLicense)) {
    blockers.push('luminate-retention-during-license-not-authorized');
  }
  if (!granted(grant.commercialProductUse)) {
    blockers.push('luminate-commercial-product-use-not-authorized');
  }
  if (!granted(grant.publicDerivedMetricPublication)) {
    blockers.push('luminate-public-derived-metric-publication-not-authorized');
  }
  if (!granted(grant.publicRankingOrBenchmarking)) {
    blockers.push('luminate-public-ranking-or-benchmarking-not-authorized');
  }

  if (grant.rawRedistribution === 'not-addressed') {
    nonBlockingGaps.push('luminate-raw-redistribution-unresolved-not-used-by-fandex');
  } else if (granted(grant.rawRedistribution)) {
    nonBlockingGaps.push('luminate-raw-redistribution-grant-present-but-unused');
  }

  if (grant.postTerminationPolicy === 'unresolved') {
    blockers.push('luminate-post-termination-handling-unresolved');
  }
  if (!grant.postTerminationPolicyEvidenceId || grant.postTerminationPolicyEvidenceId.trim() === '') {
    blockers.push('luminate-post-termination-policy-evidence-missing');
  }

  return Object.freeze({
    state: blockers.length === 0
      ? 'eligible-for-provider-onboarding-review' as const
      : 'blocked' as const,
    rightsResolved: blockers.length === 0,
    authorizedTerritories: Object.freeze([...new Set(grant.authorizedTerritories)]),
    blockers: Object.freeze([...new Set(blockers)]),
    nonBlockingGaps: Object.freeze([...new Set(nonBlockingGaps)]),
  });
}

export function projectLuminateProductionEvidenceFromAuthorization(
  assessment: LuminateAuthorizationAssessment,
): AlbumProviderProductionEvidence {
  if (assessment.state !== 'eligible-for-provider-onboarding-review') {
    return LUMINATE_ALBUM_PRODUCTION_EVIDENCE_RESEARCH;
  }

  return Object.freeze({
    ...LUMINATE_ALBUM_PRODUCTION_EVIDENCE_RESEARCH,
    acquisitionRights: 'allowed' as const,
    normalizedStorageRights: 'allowed' as const,
    derivedPublicationRights: 'allowed' as const,
    directObservationAuthorized: true,
    evidenceUrls: Object.freeze([
      ...LUMINATE_ALBUM_SALES_PRODUCTION_CANDIDATE_RESEARCH.evidenceUrls,
    ]),
  });
}
