import { sha256Canonical } from '../shared/canonicalDigest';
import {
  IDENTITY_CONTRACT_VERSION,
  buildIdentityMappingId,
  type IdentityMappingRecord,
} from './identityFoundation';
import {
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservation,
  type ReportedAlbumSalesSupportingEvidence,
} from './reportedAlbumSalesEvidence';

export const REPORTED_ALBUM_SALES_RELEASE_IDENTITY_REVIEW_VERSION =
  'reported-album-sales-release-identity-review-v1' as const;

export type ReportedAlbumSalesReleaseIdentityReview = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_RELEASE_IDENTITY_REVIEW_VERSION;
  reviewId: string;
  sourceObservationId: string;
  resolvedObservationId: string;
  canonicalArtistId: string;
  canonicalReleaseId: string;
  releaseTitle: string;
  releaseDate: string;
  edition: string | null;
  conclusion: 'resolved';
  identityMapping: IdentityMappingRecord;
  evidenceRefs: readonly string[];
  reviewerRef: string;
  reviewedAt: string;
  autoResolved: false;
}>;

export type ReportedAlbumSalesReleaseIdentityResolution = Readonly<{
  review: ReportedAlbumSalesReleaseIdentityReview;
  observation: ReportedAlbumSalesObservation;
}>;

function validInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

function qualifyingEvidence(
  evidence: readonly ReportedAlbumSalesSupportingEvidence[],
): readonly ReportedAlbumSalesSupportingEvidence[] {
  return evidence.filter(item =>
    item.sourceTier === 'tier-a-primary-official'
    || item.sourceTier === 'tier-b-provider-attributed-reputable');
}

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map(value => value.trim()).filter(Boolean))]
      .sort(),
  );
}

export function resolveReportedAlbumSalesReleaseIdentity(
  input: Readonly<{
    observation: ReportedAlbumSalesObservation;
    canonicalReleaseId: string;
    supportingIdentityEvidenceRefs: readonly string[];
    reviewerRef: string;
    reviewedAt: string;
    supersedesIdentityMappingId?: string | null;
    resolvedSupersedesObservationId?: string | null;
  }>,
): ReportedAlbumSalesReleaseIdentityResolution {
  const source = input.observation;
  const canonicalReleaseId = input.canonicalReleaseId.trim();
  const reviewerRef = input.reviewerRef.trim();
  const identityEvidenceRefs = orderedUnique(
    input.supportingIdentityEvidenceRefs,
  );
  const sourceEvidence = qualifyingEvidence(source.supportingEvidence);

  if (
    source.canonicalArtistId.trim() === ''
    || source.release.releaseTitle.trim() === ''
    || source.release.releaseDate === null
    || canonicalReleaseId === ''
    || reviewerRef === ''
    || !validInstant(input.reviewedAt)
    || identityEvidenceRefs.length === 0
    || sourceEvidence.length === 0
    || source.release.identityState === 'unresolved'
    || source.release.identityState === 'conflicting'
  ) {
    throw new Error(
      'reported_album_sales_release_identity_review_not_reviewable',
    );
  }

  const resolvedSupersedesObservationId =
    input.resolvedSupersedesObservationId ?? null;
  if (
    source.revision.state === 'explicit-correction'
    && (
      source.revision.supersedesObservationId === null
      || resolvedSupersedesObservationId === null
    )
  ) {
    throw new Error(
      'reported_album_sales_release_identity_revision_binding_required',
    );
  }
  if (
    source.revision.state !== 'explicit-correction'
    && resolvedSupersedesObservationId !== null
  ) {
    throw new Error(
      'reported_album_sales_release_identity_revision_binding_invalid',
    );
  }

  const observation = createReportedAlbumSalesObservation({
    canonicalArtistId: source.canonicalArtistId,
    artistName: source.artistName,
    release: {
      ...source.release,
      canonicalReleaseId,
      identityState: 'resolved',
    },
    metricSemantic: source.metricSemantic,
    value: source.value,
    unit: source.unit,
    providerPeriodStart: source.providerPeriodStart,
    providerPeriodEnd: source.providerPeriodEnd,
    observedAt: source.observedAt,
    reportedAt: source.reportedAt,
    collectedAt: source.collectedAt,
    underlyingProvider: source.underlyingProvider,
    territory: source.territory,
    format: source.format,
    revision: {
      state: source.revision.state,
      supersedesObservationId:
        source.revision.state === 'explicit-correction'
          ? resolvedSupersedesObservationId
          : null,
      revisionObservedAt: source.revision.revisionObservedAt,
    },
    supportingEvidence: source.supportingEvidence,
    lifecycle: 'shadow',
  });

  const mappingShape = {
    sourceType: 'reported-web-evidence',
    sourceProvider: source.underlyingProvider,
    sourceEntityId: source.observationId,
    canonicalEntityType: 'release' as const,
    candidateCanonicalId: canonicalReleaseId,
    resolutionState: 'resolved' as const,
    reviewState: 'human-reviewed' as const,
    evidenceRefs: identityEvidenceRefs,
    supersedesMappingId:
      input.supersedesIdentityMappingId ?? null,
  };
  const identityMapping: IdentityMappingRecord = Object.freeze({
    mappingId: buildIdentityMappingId(mappingShape),
    ...mappingShape,
    contractVersion: IDENTITY_CONTRACT_VERSION,
  });

  const reviewShape = {
    sourceObservationId: source.observationId,
    resolvedObservationId: observation.observationId,
    canonicalArtistId: source.canonicalArtistId,
    canonicalReleaseId,
    releaseTitle: source.release.releaseTitle,
    releaseDate: source.release.releaseDate,
    edition: source.release.edition,
    conclusion: 'resolved' as const,
    identityMapping,
    evidenceRefs: identityEvidenceRefs,
    reviewerRef,
    reviewedAt: input.reviewedAt,
    autoResolved: false as const,
  };

  return Object.freeze({
    review: Object.freeze({
      contractVersion:
        REPORTED_ALBUM_SALES_RELEASE_IDENTITY_REVIEW_VERSION,
      reviewId: sha256Canonical({
        contractVersion:
          REPORTED_ALBUM_SALES_RELEASE_IDENTITY_REVIEW_VERSION,
        ...reviewShape,
      }),
      ...reviewShape,
    }),
    observation,
  });
}

export function validateReportedAlbumSalesReleaseIdentityReview(
  observation: ReportedAlbumSalesObservation,
  review: ReportedAlbumSalesReleaseIdentityReview,
): readonly string[] {
  const issues: string[] = [];
  const mapping = review.identityMapping;

  if (
    review.contractVersion
      !== REPORTED_ALBUM_SALES_RELEASE_IDENTITY_REVIEW_VERSION
  ) {
    issues.push('identity-review-contract-mismatch');
  }
  if (
    review.resolvedObservationId !== observation.observationId
    || review.canonicalArtistId !== observation.canonicalArtistId
    || review.canonicalReleaseId
      !== observation.release.canonicalReleaseId
    || review.releaseTitle !== observation.release.releaseTitle
    || review.releaseDate !== observation.release.releaseDate
    || review.edition !== observation.release.edition
    || review.conclusion !== 'resolved'
    || review.autoResolved !== false
  ) {
    issues.push('identity-review-observation-binding-mismatch');
  }
  if (
    review.reviewerRef.trim() === ''
    || !validInstant(review.reviewedAt)
    || review.evidenceRefs.length === 0
  ) {
    issues.push('identity-review-evidence-incomplete');
  }
  if (
    mapping.contractVersion !== IDENTITY_CONTRACT_VERSION
    || mapping.sourceType !== 'reported-web-evidence'
    || mapping.sourceProvider !== observation.underlyingProvider
    || mapping.sourceEntityId !== review.sourceObservationId
    || mapping.canonicalEntityType !== 'release'
    || mapping.candidateCanonicalId
      !== observation.release.canonicalReleaseId
    || mapping.resolutionState !== 'resolved'
    || (
      mapping.reviewState !== 'human-reviewed'
      && mapping.reviewState !== 'provider-verified'
    )
    || mapping.evidenceRefs.length === 0
  ) {
    issues.push('identity-review-mapping-invalid');
  }

  const expectedReviewId = sha256Canonical({
    contractVersion:
      REPORTED_ALBUM_SALES_RELEASE_IDENTITY_REVIEW_VERSION,
    sourceObservationId: review.sourceObservationId,
    resolvedObservationId: review.resolvedObservationId,
    canonicalArtistId: review.canonicalArtistId,
    canonicalReleaseId: review.canonicalReleaseId,
    releaseTitle: review.releaseTitle,
    releaseDate: review.releaseDate,
    edition: review.edition,
    conclusion: review.conclusion,
    identityMapping: review.identityMapping,
    evidenceRefs: review.evidenceRefs,
    reviewerRef: review.reviewerRef,
    reviewedAt: review.reviewedAt,
    autoResolved: review.autoResolved,
  });
  if (review.reviewId !== expectedReviewId) {
    issues.push('identity-review-digest-mismatch');
  }

  return Object.freeze([...new Set(issues)].sort());
}
