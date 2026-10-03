import { sha256Canonical } from '../shared/canonicalDigest';
import {
  readReportedAlbumSalesHistoryAsOf,
  type ReportedAlbumSalesHistory,
} from './reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesResearchCohortReviewPacket,
  type ReportedAlbumSalesResearchCohortReviewDimension,
} from './reportedAlbumSalesResearchCohortReview';
import {
  deriveReportedAlbumSalesResearchCohortEvidenceCandidates,
  type ReportedAlbumSalesResearchDerivedEvidenceCandidate,
} from './reportedAlbumSalesResearchCohortEvidenceDerivation';
import type {
  ReportedAlbumSalesResearchInput,
  ReportedAlbumSalesResearchInputEntry,
} from './reportedAlbumSalesResearchInput';

export const REPORTED_ALBUM_SALES_RESEARCH_REVIEWER_PACKET_VERSION =
  'reported-album-sales-research-reviewer-packet-v1' as const;

export type ReportedAlbumSalesResearchReviewerEvidenceRef = Readonly<{
  evidenceId: string;
  sourceTier:
    | 'tier-a-primary-official'
    | 'tier-b-provider-attributed-reputable'
    | 'tier-c-discovery-only';
  reportingSource: string;
  sourceUrl: string;
  sourcePublicationDate: string | null;
}>;

export type ReportedAlbumSalesResearchReviewerObservation = Readonly<{
  observationId: string;
  canonicalArtistId: string;
  canonicalReleaseId: string | null;
  releaseIdentityState:
    ReportedAlbumSalesResearchInputEntry['releaseIdentityState'];
  releaseTitle: string;
  releaseDate: string | null;
  value: number;
  unit: 'physical-copies';
  providerPeriodStart: string;
  providerPeriodEnd: string;
  evidenceQuality:
    ReportedAlbumSalesResearchInputEntry['evidenceQuality'];
  evidenceRefs:
    readonly ReportedAlbumSalesResearchReviewerEvidenceRef[];
}>;

export type ReportedAlbumSalesResearchReviewerDimension = Readonly<{
  dimension: ReportedAlbumSalesResearchCohortReviewDimension;
  mode: 'manual-only' | 'derived-review-candidate';
  candidateId: string | null;
  coveredObservationIds: readonly string[];
  sourceEvidenceIds: readonly string[];
  reasonCodes: readonly string[];
  reviewerPrompt: string;
  reviewerConclusionRequired: true;
  autoVerified: false;
}>;

export type ReportedAlbumSalesResearchReviewerPacket = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_RESEARCH_REVIEWER_PACKET_VERSION;
  packetId: string;
  inputFingerprint: string;
  asOf: string;
  cohortReviewPacketId: string;
  inputState: ReportedAlbumSalesResearchInput['state'];
  releaseCount: number;
  artistCount: number;
  observations:
    readonly ReportedAlbumSalesResearchReviewerObservation[];
  dimensions: readonly ReportedAlbumSalesResearchReviewerDimension[];
  reviewRecordTemplate: Readonly<{
    conclusionRequired:
      readonly ['verified', 'partial', 'conflicting', 'unknown'];
    evidenceRefsRequiredForNonUnknown: true;
    reviewerRefRequired: true;
    reviewedAtOffsetRequired: true;
    inputFingerprintMustMatch: true;
    coveredObservationIdsMustBelongToCohort: true;
  }>;
  reviewerConclusionRequired: true;
  reviewRecordsMaterialized: false;
  automaticSufficiencyDecisionAllowed: false;
  automaticReleaseIdentityResolutionAllowed: false;
  automaticSourceQualityApprovalAllowed: false;
  automaticPeriodConsistencyApprovalAllowed: false;
  automaticCohortCoverageApprovalAllowed: false;
  minimumCohortSizeDefined: false;
  numericNormalizationDefined: false;
  calibrationMethodDefined: false;
  calibrationRunAuthorized: false;
  scoreFieldsPresent: false;
  productEligible: false;
  directProviderReplacementAllowed: false;
}>;

function derivedDimension(
  candidate: ReportedAlbumSalesResearchDerivedEvidenceCandidate,
  reviewerPrompt: string,
): ReportedAlbumSalesResearchReviewerDimension {
  return Object.freeze({
    dimension: candidate.dimension,
    mode: 'derived-review-candidate' as const,
    candidateId: candidate.candidateId,
    coveredObservationIds:
      Object.freeze([...candidate.coveredObservationIds]),
    sourceEvidenceIds:
      Object.freeze([...candidate.sourceEvidenceIds]),
    reasonCodes: Object.freeze([...candidate.reasonCodes]),
    reviewerPrompt,
    reviewerConclusionRequired: true as const,
    autoVerified: false as const,
  });
}

export function buildReportedAlbumSalesResearchReviewerPacket(
  input: Readonly<{
    researchInput: ReportedAlbumSalesResearchInput;
    history: ReportedAlbumSalesHistory;
  }>,
): ReportedAlbumSalesResearchReviewerPacket {
  const researchInput = input.researchInput;

  if (
    input.history.historyClass !== 'reported-web-research-shadow'
    || input.history.productEligible !== false
    || researchInput.lifecycle !== 'research-shadow'
    || researchInput.productEligible !== false
    || researchInput.numericNormalizationDefined !== false
    || researchInput.calibrationMethodDefined !== false
    || researchInput.directProviderReplacementAllowed !== false
  ) {
    throw new Error(
      'reported_album_sales_reviewer_packet_boundary_invalid',
    );
  }

  const cohortReviewPacket =
    buildReportedAlbumSalesResearchCohortReviewPacket(researchInput);
  const derivation =
    deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
      researchInput,
    );
  const asOfRead =
    readReportedAlbumSalesHistoryAsOf(
      input.history,
      researchInput.asOf,
    );
  const activeById = new Map(
    asOfRead.activeObservations.map(observation => [
      observation.observationId,
      observation,
    ]),
  );

  const observations = researchInput.entries.map(entry => {
    const observation = activeById.get(entry.observationId);
    if (!observation) {
      throw new Error(
        `reported_album_sales_reviewer_packet_observation_missing:${entry.observationId}`,
      );
    }
    if (
      observation.canonicalArtistId !== entry.canonicalArtistId
      || observation.release.releaseTitle !== entry.releaseTitle
      || observation.evidenceQuality !== entry.evidenceQuality
    ) {
      throw new Error(
        `reported_album_sales_reviewer_packet_observation_mismatch:${entry.observationId}`,
      );
    }

    const evidenceRefs = observation.supportingEvidence
      .map(evidence => Object.freeze({
        evidenceId: evidence.evidenceId,
        sourceTier: evidence.sourceTier,
        reportingSource: evidence.reportingSource,
        sourceUrl: evidence.sourceUrl,
        sourcePublicationDate: evidence.sourcePublicationDate,
      }))
      .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));

    if (
      evidenceRefs.length === 0
      || evidenceRefs.some(evidence => evidence.sourceUrl.trim() === '')
    ) {
      throw new Error(
        `reported_album_sales_reviewer_packet_evidence_missing:${entry.observationId}`,
      );
    }

    return Object.freeze({
      observationId: entry.observationId,
      canonicalArtistId: entry.canonicalArtistId,
      canonicalReleaseId: entry.canonicalReleaseId,
      releaseIdentityState: entry.releaseIdentityState,
      releaseTitle: entry.releaseTitle,
      releaseDate: entry.releaseDate,
      value: entry.value,
      unit: entry.unit,
      providerPeriodStart: entry.providerPeriodStart,
      providerPeriodEnd: entry.providerPeriodEnd,
      evidenceQuality: entry.evidenceQuality,
      evidenceRefs: Object.freeze(evidenceRefs),
    });
  });

  const cohortCoverage: ReportedAlbumSalesResearchReviewerDimension =
    Object.freeze({
      dimension: 'cohort-coverage' as const,
      mode: 'manual-only' as const,
      candidateId: null,
      coveredObservationIds:
        Object.freeze([...researchInput.includedObservationIds]),
      sourceEvidenceIds: Object.freeze(
        [...new Set(
          observations.flatMap(observation =>
            observation.evidenceRefs.map(evidence => evidence.evidenceId),
          ),
        )].sort(),
      ),
      reasonCodes: Object.freeze([
        'cohort-size-does-not-establish-methodological-sufficiency',
        'manual-cohort-coverage-review-required',
      ]),
      reviewerPrompt:
        'Review whether the included artist/release cohort is sufficiently representative for methodology design. Do not infer sufficiency from cohort size alone.',
      reviewerConclusionRequired: true as const,
      autoVerified: false as const,
    });

  const dimensions = Object.freeze([
    cohortCoverage,
    derivedDimension(
      derivation.candidates.releaseIdentity,
      'Review every candidate release identity against external release-level evidence. Candidate identity must not be auto-promoted to resolved.',
    ),
    derivedDimension(
      derivation.candidates.sourceQuality,
      'Review whether the evidence quality mix is acceptable for methodology design. Preserve provider-attributed secondary evidence as distinct from primary official evidence.',
    ),
    derivedDimension(
      derivation.candidates.periodConsistency,
      'Review whether every included observation represents the same explicit seven-calendar-day Hanteo first-week semantic without inferred periods.',
    ),
  ]);

  const packetShape = {
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_REVIEWER_PACKET_VERSION,
    inputFingerprint: researchInput.inputFingerprint,
    asOf: researchInput.asOf,
    cohortReviewPacketId: cohortReviewPacket.packetId,
    inputState: researchInput.state,
    releaseCount: researchInput.releaseCount,
    artistCount: researchInput.artistCount,
    observations,
    dimensions,
  };

  const packetId = sha256Canonical(packetShape);

  return Object.freeze({
    ...packetShape,
    packetId,
    reviewRecordTemplate: Object.freeze({
      conclusionRequired:
        Object.freeze([
          'verified',
          'partial',
          'conflicting',
          'unknown',
        ] as const),
      evidenceRefsRequiredForNonUnknown: true as const,
      reviewerRefRequired: true as const,
      reviewedAtOffsetRequired: true as const,
      inputFingerprintMustMatch: true as const,
      coveredObservationIdsMustBelongToCohort: true as const,
    }),
    reviewerConclusionRequired: true as const,
    reviewRecordsMaterialized: false as const,
    automaticSufficiencyDecisionAllowed: false as const,
    automaticReleaseIdentityResolutionAllowed: false as const,
    automaticSourceQualityApprovalAllowed: false as const,
    automaticPeriodConsistencyApprovalAllowed: false as const,
    automaticCohortCoverageApprovalAllowed: false as const,
    minimumCohortSizeDefined: false as const,
    numericNormalizationDefined: false as const,
    calibrationMethodDefined: false as const,
    calibrationRunAuthorized: false as const,
    scoreFieldsPresent: false as const,
    productEligible: false as const,
    directProviderReplacementAllowed: false as const,
  });
}
