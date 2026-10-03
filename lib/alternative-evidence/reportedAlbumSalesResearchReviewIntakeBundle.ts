import { sha256Canonical } from '../shared/canonicalDigest';
import {
  buildReportedAlbumSalesResearchCohortReviewPacket,
  evaluateReportedAlbumSalesResearchMethodologyDesignGate,
  type ReportedAlbumSalesResearchCohortReviewRecord,
  type ReportedAlbumSalesResearchMethodologyDesignGate,
} from './reportedAlbumSalesResearchCohortReview';
import type {
  ReportedAlbumSalesResearchInput,
} from './reportedAlbumSalesResearchInput';
import {
  REPORTED_ALBUM_SALES_RESEARCH_REVIEWER_PACKET_VERSION,
  type ReportedAlbumSalesResearchReviewerPacket,
} from './reportedAlbumSalesResearchReviewerPacket';

export const REPORTED_ALBUM_SALES_RESEARCH_REVIEW_INTAKE_BUNDLE_VERSION =
  'reported-album-sales-research-review-intake-bundle-v1' as const;

export type ReportedAlbumSalesResearchReviewIntakeBundle = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_RESEARCH_REVIEW_INTAKE_BUNDLE_VERSION;
  bundleId: string;
  reviewerPacketId: string;
  inputFingerprint: string;
  cohortReviewPacketId: string;
  reviewRecordCount: number;
  reviewerRefs: readonly string[];
  reviewedAtInstants: readonly string[];
  integrityState: 'valid' | 'invalid';
  methodologyDesignGate:
    ReportedAlbumSalesResearchMethodologyDesignGate;
  state:
    | 'intake-invalid'
    | 'review-incomplete-or-blocked'
    | 'review-complete-for-methodology-design';
  dataIssues: readonly string[];
  reviewerConclusionsPreserved: true;
  reviewerRecordsGeneratedBySystem: false;
  automaticReviewerConclusionAllowed: false;
  automaticPacketRepairAllowed: false;
  numericNormalizationDefined: false;
  calibrationMethodDefined: false;
  calibrationRunAuthorized: false;
  productEligible: false;
  directProviderReplacementAllowed: false;
}>;

function sameSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const l = [...new Set(left)].sort();
  const r = [...new Set(right)].sort();
  return l.length === left.length
    && r.length === right.length
    && l.every((value, index) => value === r[index]);
}

export function intakeReportedAlbumSalesResearchReviewBundle(
  input: Readonly<{
    researchInput: ReportedAlbumSalesResearchInput;
    reviewerPacket: ReportedAlbumSalesResearchReviewerPacket;
    records: readonly ReportedAlbumSalesResearchCohortReviewRecord[];
  }>,
): ReportedAlbumSalesResearchReviewIntakeBundle {
  const dataIssues: string[] = [];
  const expectedCohortPacket =
    buildReportedAlbumSalesResearchCohortReviewPacket(
      input.researchInput,
    );

  if (
    input.reviewerPacket.contractVersion
      !== REPORTED_ALBUM_SALES_RESEARCH_REVIEWER_PACKET_VERSION
  ) {
    dataIssues.push('reviewer-packet-version-invalid');
  }
  if (
    input.reviewerPacket.inputFingerprint
      !== input.researchInput.inputFingerprint
  ) {
    dataIssues.push('reviewer-packet-input-fingerprint-mismatch');
  }
  if (
    input.reviewerPacket.cohortReviewPacketId
      !== expectedCohortPacket.packetId
  ) {
    dataIssues.push('reviewer-packet-cohort-review-id-mismatch');
  }
  if (
    input.reviewerPacket.asOf !== input.researchInput.asOf
  ) {
    dataIssues.push('reviewer-packet-as-of-mismatch');
  }
  if (
    input.reviewerPacket.releaseCount
      !== input.researchInput.releaseCount
    || input.reviewerPacket.artistCount
      !== input.researchInput.artistCount
  ) {
    dataIssues.push('reviewer-packet-cohort-count-mismatch');
  }

  const packetObservationIds =
    input.reviewerPacket.observations.map(
      observation => observation.observationId,
    );
  if (
    !sameSet(
      packetObservationIds,
      input.researchInput.includedObservationIds,
    )
  ) {
    dataIssues.push('reviewer-packet-observation-set-mismatch');
  }

  const dimensionNames =
    input.reviewerPacket.dimensions.map(
      dimension => dimension.dimension,
    );
  if (
    !sameSet(
      dimensionNames,
      [
        'cohort-coverage',
        'release-identity',
        'source-quality',
        'period-consistency',
      ],
    )
  ) {
    dataIssues.push('reviewer-packet-dimension-set-mismatch');
  }

  if (
    input.reviewerPacket.reviewRecordsMaterialized !== false
    || input.reviewerPacket.reviewerConclusionRequired !== true
    || input.reviewerPacket.automaticSufficiencyDecisionAllowed !== false
    || input.reviewerPacket.numericNormalizationDefined !== false
    || input.reviewerPacket.calibrationMethodDefined !== false
    || input.reviewerPacket.calibrationRunAuthorized !== false
    || input.reviewerPacket.productEligible !== false
    || input.reviewerPacket.directProviderReplacementAllowed !== false
  ) {
    dataIssues.push('reviewer-packet-boundary-invalid');
  }

  const methodologyDesignGate =
    evaluateReportedAlbumSalesResearchMethodologyDesignGate({
      researchInput: input.researchInput,
      records: input.records,
    });

  const combinedDataIssues = Object.freeze([
    ...new Set([
      ...dataIssues,
      ...methodologyDesignGate.dataIssues.map(
        issue => `review-record:${issue}`,
      ),
    ]),
  ].sort());

  const integrityState = combinedDataIssues.length === 0
    ? 'valid' as const
    : 'invalid' as const;

  const state =
    integrityState === 'invalid'
      ? 'intake-invalid' as const
      : methodologyDesignGate.status === 'eligible-for-methodology-design'
        ? 'review-complete-for-methodology-design' as const
        : 'review-incomplete-or-blocked' as const;

  const reviewerRefs = Object.freeze(
    [...new Set(
      input.records
        .map(record => record.reviewerRef.trim())
        .filter(Boolean),
    )].sort(),
  );
  const reviewedAtInstants = Object.freeze(
    [...new Set(
      input.records
        .map(record => record.reviewedAt)
        .filter(Boolean),
    )].sort(),
  );

  const bundleId = sha256Canonical({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_REVIEW_INTAKE_BUNDLE_VERSION,
    reviewerPacketId: input.reviewerPacket.packetId,
    inputFingerprint: input.researchInput.inputFingerprint,
    cohortReviewPacketId: expectedCohortPacket.packetId,
    records: input.records
      .map(record => ({
        recordVersion: record.recordVersion,
        evidenceId: record.evidenceId,
        dimension: record.dimension,
        inputFingerprint: record.inputFingerprint,
        coveredObservationIds:
          [...record.coveredObservationIds].sort(),
        conclusion: record.conclusion,
        evidenceRefs: [...record.evidenceRefs].sort(),
        reviewerRef: record.reviewerRef,
        reviewedAt: record.reviewedAt,
      }))
      .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)),
    dataIssues: combinedDataIssues,
  });

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_REVIEW_INTAKE_BUNDLE_VERSION,
    bundleId,
    reviewerPacketId: input.reviewerPacket.packetId,
    inputFingerprint: input.researchInput.inputFingerprint,
    cohortReviewPacketId: expectedCohortPacket.packetId,
    reviewRecordCount: input.records.length,
    reviewerRefs,
    reviewedAtInstants,
    integrityState,
    methodologyDesignGate,
    state,
    dataIssues: combinedDataIssues,
    reviewerConclusionsPreserved: true as const,
    reviewerRecordsGeneratedBySystem: false as const,
    automaticReviewerConclusionAllowed: false as const,
    automaticPacketRepairAllowed: false as const,
    numericNormalizationDefined: false as const,
    calibrationMethodDefined: false as const,
    calibrationRunAuthorized: false as const,
    productEligible: false as const,
    directProviderReplacementAllowed: false as const,
  });
}
