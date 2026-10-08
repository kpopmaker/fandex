import { sha256Canonical } from '../shared/canonicalDigest';

export const REPORTED_ALBUM_SALES_CURRENT_RELEASE_REVIEW_VERSION =
  'reported-album-sales-current-release-review-v1' as const;

export type ReportedAlbumSalesCurrentReleaseReviewRequest =
  Readonly<{
    contractVersion:
      typeof REPORTED_ALBUM_SALES_CURRENT_RELEASE_REVIEW_VERSION;
    requestId: string;
    canonicalArtistId: string;
    releaseScope: 'physical-album-eligible';
    releaseTitle: string;
    releaseDate: string;
    candidateCanonicalReleaseId: string | null;
    candidateEdition: string | null;
    evidenceRefs: readonly string[];
    reviewerConclusionRequired: true;
    autoVerified: false;
  }>;

export type ReportedAlbumSalesCurrentReleaseReviewDecision =
  Readonly<{
    requestId: string;
    conclusion:
      | 'verified-latest-physical-release'
      | 'not-latest'
      | 'conflicting';
    canonicalReleaseId: string | null;
    editionResolutionState: 'release-level' | 'edition-specific';
    canonicalEditionId: string | null;
    supportingEvidenceRefs: readonly string[];
    reviewerRef: string;
    reviewedAt: string;
  }>;

export type ReportedAlbumSalesCurrentReleaseBinding = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_CURRENT_RELEASE_REVIEW_VERSION;
  bindingId: string;
  requestId: string;
  canonicalArtistId: string;
  releaseScope: 'physical-album-eligible';
  canonicalReleaseId: string;
  candidateEdition: string | null;
  editionResolutionState: 'release-level' | 'edition-specific';
  canonicalEditionId: string | null;
  releaseTitle: string;
  releaseDate: string;
  latestReleaseState: 'verified-latest';
  identityState: 'resolved';
  reviewState: 'human-reviewed';
  supportingEvidenceRefs: readonly string[];
  reviewerRef: string;
  reviewedAt: string;
  autoVerified: false;
}>;

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

function cleanRefs(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map(value => value.trim()).filter(Boolean))]
      .sort(),
  );
}

export function buildReportedAlbumSalesCurrentReleaseReviewRequest(
  input: Readonly<{
    canonicalArtistId: string;
    releaseTitle: string;
    releaseDate: string;
    candidateCanonicalReleaseId?: string | null;
    candidateEdition?: string | null;
    evidenceRefs: readonly string[];
  }>,
): ReportedAlbumSalesCurrentReleaseReviewRequest {
  const canonicalArtistId =
    input.canonicalArtistId.trim().toLowerCase();
  const releaseTitle = input.releaseTitle.trim();
  const candidateCanonicalReleaseId =
    input.candidateCanonicalReleaseId?.trim() || null;
  const candidateEdition = input.candidateEdition?.trim() || null;
  const evidenceRefs = cleanRefs(input.evidenceRefs);

  if (
    canonicalArtistId === ''
    || !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(canonicalArtistId)
    || releaseTitle === ''
    || !validDate(input.releaseDate)
    || evidenceRefs.length === 0
  ) {
    throw new Error(
      'reported_album_sales_current_release_review_request_invalid',
    );
  }

  const requestShape = {
    canonicalArtistId,
    releaseScope: 'physical-album-eligible' as const,
    releaseTitle,
    releaseDate: input.releaseDate,
    candidateCanonicalReleaseId,
    candidateEdition,
    evidenceRefs,
    reviewerConclusionRequired: true as const,
    autoVerified: false as const,
  };

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_CURRENT_RELEASE_REVIEW_VERSION,
    requestId: sha256Canonical({
      contractVersion:
        REPORTED_ALBUM_SALES_CURRENT_RELEASE_REVIEW_VERSION,
      ...requestShape,
    }),
    ...requestShape,
  });
}

export function createReportedAlbumSalesCurrentReleaseBinding(
  input: Readonly<{
    request: ReportedAlbumSalesCurrentReleaseReviewRequest;
    decision: ReportedAlbumSalesCurrentReleaseReviewDecision;
  }>,
): ReportedAlbumSalesCurrentReleaseBinding {
  const { request, decision } = input;
  if (
    request.contractVersion
      !== REPORTED_ALBUM_SALES_CURRENT_RELEASE_REVIEW_VERSION
    || decision.requestId !== request.requestId
  ) {
    throw new Error(
      'reported_album_sales_current_release_review_request_mismatch',
    );
  }

  if (decision.conclusion !== 'verified-latest-physical-release') {
    throw new Error(
      'reported_album_sales_current_release_review_not_verified',
    );
  }

  const canonicalReleaseId =
    decision.canonicalReleaseId?.trim() || '';
  const canonicalEditionId =
    decision.canonicalEditionId?.trim() || null;
  const supportingEvidenceRefs =
    cleanRefs(decision.supportingEvidenceRefs);
  const reviewerRef = decision.reviewerRef.trim();

  if (
    canonicalReleaseId === ''
    || (
      decision.editionResolutionState === 'edition-specific'
      && canonicalEditionId === null
    )
    || (
      decision.editionResolutionState === 'release-level'
      && canonicalEditionId !== null
    )
    || supportingEvidenceRefs.length === 0
    || reviewerRef === ''
    || !validInstant(decision.reviewedAt)
  ) {
    throw new Error(
      'reported_album_sales_current_release_review_decision_invalid',
    );
  }

  const bindingShape = {
    requestId: request.requestId,
    canonicalArtistId: request.canonicalArtistId,
    releaseScope: request.releaseScope,
    canonicalReleaseId,
    candidateEdition: request.candidateEdition,
    editionResolutionState: decision.editionResolutionState,
    canonicalEditionId,
    releaseTitle: request.releaseTitle,
    releaseDate: request.releaseDate,
    latestReleaseState: 'verified-latest' as const,
    identityState: 'resolved' as const,
    reviewState: 'human-reviewed' as const,
    supportingEvidenceRefs,
    reviewerRef,
    reviewedAt: decision.reviewedAt,
    autoVerified: false as const,
  };

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_CURRENT_RELEASE_REVIEW_VERSION,
    bindingId: sha256Canonical({
      contractVersion:
        REPORTED_ALBUM_SALES_CURRENT_RELEASE_REVIEW_VERSION,
      ...bindingShape,
    }),
    ...bindingShape,
  });
}

export function validateReportedAlbumSalesCurrentReleaseBinding(
  binding: ReportedAlbumSalesCurrentReleaseBinding,
): boolean {
  if (
    binding.contractVersion
      !== REPORTED_ALBUM_SALES_CURRENT_RELEASE_REVIEW_VERSION
    || binding.bindingId.trim() === ''
    || binding.requestId.trim() === ''
    || binding.canonicalArtistId.trim() === ''
    || binding.releaseScope !== 'physical-album-eligible'
    || binding.canonicalReleaseId.trim() === ''
    || (
      binding.editionResolutionState === 'edition-specific'
      && (
        binding.canonicalEditionId === null
        || binding.canonicalEditionId.trim() === ''
      )
    )
    || (
      binding.editionResolutionState === 'release-level'
      && binding.canonicalEditionId !== null
    )
    || binding.releaseTitle.trim() === ''
    || !validDate(binding.releaseDate)
    || binding.latestReleaseState !== 'verified-latest'
    || binding.identityState !== 'resolved'
    || binding.reviewState !== 'human-reviewed'
    || binding.supportingEvidenceRefs.length === 0
    || binding.reviewerRef.trim() === ''
    || !validInstant(binding.reviewedAt)
    || binding.autoVerified !== false
  ) {
    return false;
  }

  const {
    bindingId,
    ...payload
  } = binding;

  return bindingId === sha256Canonical(payload);
}
