import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  ReportedAlbumSalesObservation,
} from './reportedAlbumSalesEvidence';

export const REPORTED_ALBUM_SALES_PRODUCTION_IDENTITY_VERSION =
  'reported-album-sales-production-identity-v1' as const;

export type ReportedAlbumSalesProductionIdentityReviewRequest = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_PRODUCTION_IDENTITY_VERSION;
  requestId: string;
  observationId: string;
  observationScopeId: string;
  canonicalArtistId: string;
  artistName: string;
  sourceReleaseTitle: string;
  sourceReleaseDate: string | null;
  sourceCanonicalReleaseId: string | null;
  sourceIdentityState:
    ReportedAlbumSalesObservation['release']['identityState'];
  evidenceRefs: readonly string[];
  reviewerConclusionRequired: true;
  autoResolved: false;
}>;

export type ReportedAlbumSalesProductionIdentityDecision = Readonly<{
  requestId: string;
  canonicalReleaseId: string;
  supportingEvidenceRefs: readonly string[];
  reviewerRef: string;
  reviewedAt: string;
  supersedesBindingId?: string | null;
}>;

export type ReportedAlbumSalesProductionIdentityBinding = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_PRODUCTION_IDENTITY_VERSION;
  bindingId: string;
  requestId: string;
  observationId: string;
  observationScopeId: string;
  canonicalArtistId: string;
  sourceReleaseTitle: string;
  sourceReleaseDate: string | null;
  canonicalReleaseId: string;
  resolutionState: 'resolved';
  reviewState: 'human-reviewed';
  supportingEvidenceRefs: readonly string[];
  reviewerRef: string;
  reviewedAt: string;
  supersedesBindingId: string | null;
  autoResolved: false;
}>;

function validInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

function cleanRefs(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map(value => value.trim()).filter(Boolean))].sort(),
  );
}

export function buildReportedAlbumSalesProductionIdentityReviewRequest(
  observation: ReportedAlbumSalesObservation,
): ReportedAlbumSalesProductionIdentityReviewRequest {
  const evidenceRefs = cleanRefs(
    observation.supportingEvidence.map(item => item.evidenceId),
  );
  const requestId = sha256Canonical({
    contractVersion:
      REPORTED_ALBUM_SALES_PRODUCTION_IDENTITY_VERSION,
    observationId: observation.observationId,
    observationScopeId: observation.observationScopeId,
    canonicalArtistId: observation.canonicalArtistId,
    sourceReleaseTitle: observation.release.releaseTitle,
    sourceReleaseDate: observation.release.releaseDate,
    sourceCanonicalReleaseId:
      observation.release.canonicalReleaseId,
    sourceIdentityState: observation.release.identityState,
    evidenceRefs,
  });

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_PRODUCTION_IDENTITY_VERSION,
    requestId,
    observationId: observation.observationId,
    observationScopeId: observation.observationScopeId,
    canonicalArtistId: observation.canonicalArtistId,
    artistName: observation.artistName,
    sourceReleaseTitle: observation.release.releaseTitle,
    sourceReleaseDate: observation.release.releaseDate,
    sourceCanonicalReleaseId:
      observation.release.canonicalReleaseId,
    sourceIdentityState: observation.release.identityState,
    evidenceRefs,
    reviewerConclusionRequired: true as const,
    autoResolved: false as const,
  });
}

export function createReportedAlbumSalesProductionIdentityBinding(
  input: Readonly<{
    request: ReportedAlbumSalesProductionIdentityReviewRequest;
    decision: ReportedAlbumSalesProductionIdentityDecision;
  }>,
): ReportedAlbumSalesProductionIdentityBinding {
  if (
    input.request.contractVersion
      !== REPORTED_ALBUM_SALES_PRODUCTION_IDENTITY_VERSION
  ) {
    throw new Error(
      'reported_album_sales_production_identity_request_version_invalid',
    );
  }
  if (input.decision.requestId !== input.request.requestId) {
    throw new Error(
      'reported_album_sales_production_identity_request_mismatch',
    );
  }

  const canonicalReleaseId =
    input.decision.canonicalReleaseId.trim();
  const reviewerRef = input.decision.reviewerRef.trim();
  const supportingEvidenceRefs =
    cleanRefs(input.decision.supportingEvidenceRefs);

  if (canonicalReleaseId === '') {
    throw new Error(
      'reported_album_sales_production_identity_release_id_missing',
    );
  }
  if (reviewerRef === '') {
    throw new Error(
      'reported_album_sales_production_identity_reviewer_missing',
    );
  }
  if (supportingEvidenceRefs.length === 0) {
    throw new Error(
      'reported_album_sales_production_identity_evidence_missing',
    );
  }
  if (!validInstant(input.decision.reviewedAt)) {
    throw new Error(
      'reported_album_sales_production_identity_reviewed_at_invalid',
    );
  }

  const supersedesBindingId =
    input.decision.supersedesBindingId?.trim() || null;
  const bindingPayload = {
    contractVersion:
      REPORTED_ALBUM_SALES_PRODUCTION_IDENTITY_VERSION,
    requestId: input.request.requestId,
    observationId: input.request.observationId,
    observationScopeId: input.request.observationScopeId,
    canonicalArtistId: input.request.canonicalArtistId,
    sourceReleaseTitle: input.request.sourceReleaseTitle,
    sourceReleaseDate: input.request.sourceReleaseDate,
    canonicalReleaseId,
    resolutionState: 'resolved' as const,
    reviewState: 'human-reviewed' as const,
    supportingEvidenceRefs,
    reviewerRef,
    reviewedAt: input.decision.reviewedAt,
    supersedesBindingId,
    autoResolved: false as const,
  };
  const bindingId = sha256Canonical(bindingPayload);

  return Object.freeze({
    ...bindingPayload,
    bindingId,
  });
}

export function validateReportedAlbumSalesProductionIdentityBinding(
  binding: ReportedAlbumSalesProductionIdentityBinding,
  observation: ReportedAlbumSalesObservation,
): boolean {
  if (
    binding.contractVersion
      !== REPORTED_ALBUM_SALES_PRODUCTION_IDENTITY_VERSION
    || binding.observationId !== observation.observationId
    || binding.observationScopeId !== observation.observationScopeId
    || binding.canonicalArtistId !== observation.canonicalArtistId
    || binding.sourceReleaseTitle !== observation.release.releaseTitle
    || binding.sourceReleaseDate !== observation.release.releaseDate
    || binding.canonicalReleaseId.trim() === ''
    || binding.resolutionState !== 'resolved'
    || binding.reviewState !== 'human-reviewed'
    || binding.supportingEvidenceRefs.length === 0
    || binding.reviewerRef.trim() === ''
    || !validInstant(binding.reviewedAt)
    || binding.autoResolved !== false
  ) {
    return false;
  }

  const {
    bindingId,
    ...payload
  } = binding;

  return bindingId === sha256Canonical(payload);
}
