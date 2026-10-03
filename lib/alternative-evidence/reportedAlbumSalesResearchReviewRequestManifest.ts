import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  ReportedAlbumSalesResearchCohortReviewConclusion,
  ReportedAlbumSalesResearchCohortReviewDimension,
} from './reportedAlbumSalesResearchCohortReview';
import {
  REPORTED_ALBUM_SALES_RESEARCH_REVIEWER_PACKET_VERSION,
  type ReportedAlbumSalesResearchReviewerPacket,
} from './reportedAlbumSalesResearchReviewerPacket';

export const REPORTED_ALBUM_SALES_RESEARCH_REVIEW_REQUEST_VERSION =
  'reported-album-sales-research-review-request-v1' as const;

export type ReportedAlbumSalesResearchReviewRequestSlot = Readonly<{
  dimension: ReportedAlbumSalesResearchCohortReviewDimension;
  packetCandidateId: string | null;
  coveredObservationIds: readonly string[];
  availableSourceEvidenceIds: readonly string[];
  reviewerPrompt: string;
  requestedConclusion:
    ReportedAlbumSalesResearchCohortReviewConclusion | null;
  submittedEvidenceRefs: readonly string[];
  reviewerRef: string | null;
  reviewedAt: string | null;
  submissionReady: false;
}>;

export type ReportedAlbumSalesResearchReviewRequestManifest = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_RESEARCH_REVIEW_REQUEST_VERSION;
  requestId: string;
  reviewerPacketId: string;
  inputFingerprint: string;
  cohortReviewPacketId: string;
  asOf: string;
  releaseCount: number;
  artistCount: number;
  observationIds: readonly string[];
  evidenceUrls: readonly string[];
  slots: readonly ReportedAlbumSalesResearchReviewRequestSlot[];
  requestedDimensions: readonly [
    'cohort-coverage',
    'release-identity',
    'source-quality',
    'period-consistency'
  ];
  reviewerMustSupplyConclusion: true;
  reviewerMustSupplyEvidenceRefsForNonUnknown: true;
  reviewerMustSupplyReviewerRef: true;
  reviewerMustSupplyReviewedAt: true;
  requestContainsReviewerConclusion: false;
  requestContainsApproval: false;
  reviewRecordsMaterialized: false;
  automaticReviewerConclusionAllowed: false;
  automaticReleaseIdentityResolutionAllowed: false;
  automaticSufficiencyDecisionAllowed: false;
  minimumCohortSizeDefined: false;
  numericNormalizationDefined: false;
  calibrationMethodDefined: false;
  calibrationRunAuthorized: false;
  productEligible: false;
  directProviderReplacementAllowed: false;
}>;

const EXPECTED_DIMENSIONS = Object.freeze([
  'cohort-coverage',
  'release-identity',
  'source-quality',
  'period-consistency',
] as const);

export function buildReportedAlbumSalesResearchReviewRequestManifest(
  packet: ReportedAlbumSalesResearchReviewerPacket,
): ReportedAlbumSalesResearchReviewRequestManifest {
  if (
    packet.contractVersion
      !== REPORTED_ALBUM_SALES_RESEARCH_REVIEWER_PACKET_VERSION
    || packet.reviewRecordsMaterialized !== false
    || packet.reviewerConclusionRequired !== true
    || packet.productEligible !== false
    || packet.numericNormalizationDefined !== false
    || packet.calibrationMethodDefined !== false
    || packet.calibrationRunAuthorized !== false
    || packet.directProviderReplacementAllowed !== false
  ) {
    throw new Error(
      'reported_album_sales_review_request_packet_boundary_invalid',
    );
  }

  const dimensions = packet.dimensions.map(
    dimension => dimension.dimension,
  );
  if (
    dimensions.length !== EXPECTED_DIMENSIONS.length
    || EXPECTED_DIMENSIONS.some(
      dimension => !dimensions.includes(dimension),
    )
  ) {
    throw new Error(
      'reported_album_sales_review_request_dimension_set_invalid',
    );
  }

  const observationIds = Object.freeze(
    [...packet.observations.map(
      observation => observation.observationId,
    )].sort(),
  );
  const evidenceUrls = Object.freeze(
    [...new Set(
      packet.observations.flatMap(observation =>
        observation.evidenceRefs.map(evidence => evidence.sourceUrl),
      ),
    )].sort(),
  );

  const slots = Object.freeze(
    EXPECTED_DIMENSIONS.map(dimensionName => {
      const dimension = packet.dimensions.find(
        item => item.dimension === dimensionName,
      );
      if (!dimension) {
        throw new Error(
          `reported_album_sales_review_request_dimension_missing:${dimensionName}`,
        );
      }

      return Object.freeze({
        dimension: dimension.dimension,
        packetCandidateId: dimension.candidateId,
        coveredObservationIds:
          Object.freeze([...dimension.coveredObservationIds]),
        availableSourceEvidenceIds:
          Object.freeze([...dimension.sourceEvidenceIds]),
        reviewerPrompt: dimension.reviewerPrompt,
        requestedConclusion: null,
        submittedEvidenceRefs: Object.freeze([]),
        reviewerRef: null,
        reviewedAt: null,
        submissionReady: false as const,
      });
    }),
  );

  const requestId = sha256Canonical({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_REVIEW_REQUEST_VERSION,
    reviewerPacketId: packet.packetId,
    inputFingerprint: packet.inputFingerprint,
    cohortReviewPacketId: packet.cohortReviewPacketId,
    asOf: packet.asOf,
    observationIds,
    evidenceUrls,
    slots: slots.map(slot => ({
      dimension: slot.dimension,
      packetCandidateId: slot.packetCandidateId,
      coveredObservationIds: slot.coveredObservationIds,
      availableSourceEvidenceIds: slot.availableSourceEvidenceIds,
      reviewerPrompt: slot.reviewerPrompt,
    })),
  });

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_REVIEW_REQUEST_VERSION,
    requestId,
    reviewerPacketId: packet.packetId,
    inputFingerprint: packet.inputFingerprint,
    cohortReviewPacketId: packet.cohortReviewPacketId,
    asOf: packet.asOf,
    releaseCount: packet.releaseCount,
    artistCount: packet.artistCount,
    observationIds,
    evidenceUrls,
    slots,
    requestedDimensions: EXPECTED_DIMENSIONS,
    reviewerMustSupplyConclusion: true as const,
    reviewerMustSupplyEvidenceRefsForNonUnknown: true as const,
    reviewerMustSupplyReviewerRef: true as const,
    reviewerMustSupplyReviewedAt: true as const,
    requestContainsReviewerConclusion: false as const,
    requestContainsApproval: false as const,
    reviewRecordsMaterialized: false as const,
    automaticReviewerConclusionAllowed: false as const,
    automaticReleaseIdentityResolutionAllowed: false as const,
    automaticSufficiencyDecisionAllowed: false as const,
    minimumCohortSizeDefined: false as const,
    numericNormalizationDefined: false as const,
    calibrationMethodDefined: false as const,
    calibrationRunAuthorized: false as const,
    productEligible: false as const,
    directProviderReplacementAllowed: false as const,
  });
}
