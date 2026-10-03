import { sha256Canonical } from '../../shared/canonicalDigest';
import type {
  DirectAlbumProviderDescriptor,
} from '../../alternative-evidence/directAlbumProvider';
import {
  isAuthorizationGranted,
  type SourceAuthorizationDimensions,
  type SourceAuthorizationState,
} from '../../alternative-evidence/onboarding';

export const ALBUM_PROVIDER_AUTHORIZATION_REVIEW_VERSION =
  'album-provider-authorization-review-v1' as const;

export const ALBUM_PROVIDER_AUTHORIZATION_EVIDENCE_RECORD_VERSION =
  'album-provider-authorization-evidence-record-v1' as const;

export const REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS =
  Object.freeze([
    'acquisitionState',
    'automationState',
    'normalizedStorageState',
    'retentionState',
    'commercialUseState',
    'derivedPublicationState',
  ] as const);

export type AlbumProductionAuthorizationDimension =
  typeof REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS[number];

export type AlbumProviderAuthorizationEvidenceRecord = Readonly<{
  recordVersion:
    typeof ALBUM_PROVIDER_AUTHORIZATION_EVIDENCE_RECORD_VERSION;
  evidenceId: string;
  providerId: string;
  targetFingerprint: string;
  dimension: keyof SourceAuthorizationDimensions;
  state: SourceAuthorizationState;
  evidenceRefs: readonly string[];
  conditionRefs: readonly string[];
  reviewerRef: string;
  reviewedAt: string;
}>;

export type AlbumProviderAuthorizationReviewPacket = Readonly<{
  contractVersion:
    typeof ALBUM_PROVIDER_AUTHORIZATION_REVIEW_VERSION;
  providerId: string;
  providerName: string;
  targetFingerprint: string;
  technicalFacts: Readonly<{
    technicalReadiness:
      DirectAlbumProviderDescriptor['onboarding']['technicalReadiness'];
    nativePeriodSalesQualified: boolean;
    historicalQueriesQualified: boolean;
    revisionsQualified: boolean;
    artistIdentityQualified: boolean;
    releaseIdentityQualified: boolean;
    editionIdentityQualified: boolean;
    skuIdentityQualified: boolean;
  }>;
  currentAuthorizationClaims: SourceAuthorizationDimensions;
  requiredProductionDimensions:
    readonly AlbumProductionAuthorizationDimension[];
  nonRequiredButTrackedDimensions:
    readonly ['rawStorageState', 'rawRedistributionState'];
  technicalCapabilityImpliesAuthorization: false;
  reviewerConclusionRequired: true;
  autoAuthorized: false;
}>;

export type AlbumProviderAuthorizationDimensionReview = Readonly<{
  dimension: keyof SourceAuthorizationDimensions;
  state: SourceAuthorizationState;
  evidenceIds: readonly string[];
  authorized: boolean;
  dataIssues: readonly string[];
}>;

export type AlbumProviderAuthorizationReview = Readonly<{
  contractVersion:
    typeof ALBUM_PROVIDER_AUTHORIZATION_REVIEW_VERSION;
  providerId: string;
  targetFingerprint: string;
  dimensions: Readonly<Record<
    keyof SourceAuthorizationDimensions,
    AlbumProviderAuthorizationDimensionReview
  >>;
  requiredProductionDimensions:
    readonly AlbumProductionAuthorizationDimension[];
  productionAuthorizationSatisfied: boolean;
  dataIssues: readonly string[];
  technicalCapabilityImpliesAuthorization: false;
  autoAuthorized: false;
}>;

function validOffsetInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

export function buildAlbumProviderAuthorizationReviewPacket(
  descriptor: DirectAlbumProviderDescriptor,
): AlbumProviderAuthorizationReviewPacket {
  const targetFingerprint = sha256Canonical({
    providerId: descriptor.providerId,
    providerName: descriptor.providerName,
    sourceFamily: descriptor.sourceFamily,
    technicalReadiness: descriptor.onboarding.technicalReadiness,
    capabilities: descriptor.capabilities,
    onboardingEvidenceIds: [...descriptor.onboarding.evidenceIds].sort(),
    onboardingBlockers: [...descriptor.onboarding.blockers].sort(),
  });

  return Object.freeze({
    contractVersion: ALBUM_PROVIDER_AUTHORIZATION_REVIEW_VERSION,
    providerId: descriptor.providerId,
    providerName: descriptor.providerName,
    targetFingerprint,
    technicalFacts: Object.freeze({
      technicalReadiness:
        descriptor.onboarding.technicalReadiness,
      nativePeriodSalesQualified:
        descriptor.capabilities.supportsNativePeriodSales.state
          === 'true',
      historicalQueriesQualified:
        descriptor.capabilities.supportsHistoricalQueries.state
          === 'true',
      revisionsQualified:
        descriptor.capabilities.supportsRevisions.state === 'true',
      artistIdentityQualified:
        descriptor.capabilities.supportsArtistIdentity.state === 'true',
      releaseIdentityQualified:
        descriptor.capabilities.supportsReleaseIdentity.state === 'true',
      editionIdentityQualified:
        descriptor.capabilities.supportsEditionIdentity.state === 'true',
      skuIdentityQualified:
        descriptor.capabilities.supportsSkuIdentity.state === 'true',
    }),
    currentAuthorizationClaims: descriptor.onboarding.authorization,
    requiredProductionDimensions:
      REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS,
    nonRequiredButTrackedDimensions: Object.freeze([
      'rawStorageState',
      'rawRedistributionState',
    ] as const),
    technicalCapabilityImpliesAuthorization: false as const,
    reviewerConclusionRequired: true as const,
    autoAuthorized: false as const,
  });
}

function reviewDimension(input: Readonly<{
  dimension: keyof SourceAuthorizationDimensions;
  records: readonly AlbumProviderAuthorizationEvidenceRecord[];
  invalidEvidenceIds: ReadonlySet<string>;
}>): AlbumProviderAuthorizationDimensionReview {
  const records = input.records.filter(
    record => record.dimension === input.dimension,
  );
  const issues: string[] = [];

  if (records.length === 0) {
    return Object.freeze({
      dimension: input.dimension,
      state: 'unknown' as const,
      evidenceIds: Object.freeze([]),
      authorized: false,
      dataIssues: Object.freeze([]),
    });
  }

  if (records.length > 1) {
    issues.push('multiple-authorization-records-for-dimension');
  }

  for (const record of records) {
    if (input.invalidEvidenceIds.has(record.evidenceId)) {
      issues.push(`invalid-evidence:${record.evidenceId}`);
    }
  }

  const states = [...new Set(records.map(record => record.state))];
  if (states.length > 1) {
    issues.push('conflicting-authorization-states');
  }

  const state =
    issues.length === 0 && states.length === 1
      ? states[0]
      : 'unknown';

  return Object.freeze({
    dimension: input.dimension,
    state,
    evidenceIds: Object.freeze(
      [...new Set(records.map(record => record.evidenceId))].sort(),
    ),
    authorized:
      issues.length === 0
      && isAuthorizationGranted(state),
    dataIssues: Object.freeze([...new Set(issues)].sort()),
  });
}

export function reviewAlbumProviderAuthorizationEvidence(
  input: Readonly<{
    packet: AlbumProviderAuthorizationReviewPacket;
    records: readonly AlbumProviderAuthorizationEvidenceRecord[];
  }>,
): AlbumProviderAuthorizationReview {
  const dataIssues: string[] = [];
  const invalidEvidenceIds = new Set<string>();
  const seenEvidenceIds = new Set<string>();

  for (const record of input.records) {
    if (
      record.recordVersion
        !== ALBUM_PROVIDER_AUTHORIZATION_EVIDENCE_RECORD_VERSION
    ) {
      dataIssues.push(
        `record-version-invalid:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
    if (record.evidenceId.trim() === '') {
      dataIssues.push('evidence-id-missing');
      invalidEvidenceIds.add(record.evidenceId);
    }
    if (seenEvidenceIds.has(record.evidenceId)) {
      dataIssues.push(
        `duplicate-evidence-id:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
    seenEvidenceIds.add(record.evidenceId);

    if (record.providerId !== input.packet.providerId) {
      dataIssues.push(
        `provider-id-mismatch:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
    if (
      record.targetFingerprint
        !== input.packet.targetFingerprint
    ) {
      dataIssues.push(
        `target-fingerprint-mismatch:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
    if (record.reviewerRef.trim() === '') {
      dataIssues.push(
        `reviewer-ref-missing:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
    if (!validOffsetInstant(record.reviewedAt)) {
      dataIssues.push(
        `reviewed-at-invalid:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }

    if (
      isAuthorizationGranted(record.state)
      && (
        record.evidenceRefs.length === 0
        || record.evidenceRefs.some(value => value.trim() === '')
      )
    ) {
      dataIssues.push(
        `authorized-state-evidence-missing:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }

    if (
      record.state === 'allowed-with-conditions'
      && (
        record.conditionRefs.length === 0
        || record.conditionRefs.some(value => value.trim() === '')
      )
    ) {
      dataIssues.push(
        `conditional-authorization-condition-missing:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
  }

  const dimensionKeys = [
    'acquisitionState',
    'automationState',
    'rawStorageState',
    'normalizedStorageState',
    'retentionState',
    'commercialUseState',
    'derivedPublicationState',
    'rawRedistributionState',
  ] as const;

  const dimensions = Object.fromEntries(
    dimensionKeys.map(dimension => [
      dimension,
      reviewDimension({
        dimension,
        records: input.records,
        invalidEvidenceIds,
      }),
    ]),
  ) as Record<
    keyof SourceAuthorizationDimensions,
    AlbumProviderAuthorizationDimensionReview
  >;

  for (const review of Object.values(dimensions)) {
    dataIssues.push(...review.dataIssues.map(issue =>
      `${review.dimension}:${issue}`));
  }

  const productionAuthorizationSatisfied =
    dataIssues.length === 0
    && REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS
      .every(dimension => dimensions[dimension].authorized);

  return Object.freeze({
    contractVersion: ALBUM_PROVIDER_AUTHORIZATION_REVIEW_VERSION,
    providerId: input.packet.providerId,
    targetFingerprint: input.packet.targetFingerprint,
    dimensions: Object.freeze(dimensions),
    requiredProductionDimensions:
      REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS,
    productionAuthorizationSatisfied,
    dataIssues: Object.freeze(
      [...new Set(dataIssues)].sort(),
    ),
    technicalCapabilityImpliesAuthorization: false as const,
    autoAuthorized: false as const,
  });
}
