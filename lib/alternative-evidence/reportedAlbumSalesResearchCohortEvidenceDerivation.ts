import { sha256Canonical } from '../shared/canonicalDigest';
import {
  REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION,
  type ReportedAlbumSalesResearchCohortReviewConclusion,
  type ReportedAlbumSalesResearchCohortReviewRecord,
} from './reportedAlbumSalesResearchCohortReview';
import type {
  ReportedAlbumSalesEvidenceQuality,
} from './reportedAlbumSalesEvidence';
import type {
  ReportedAlbumSalesResearchInput,
} from './reportedAlbumSalesResearchInput';

export const REPORTED_ALBUM_SALES_RESEARCH_COHORT_DERIVATION_VERSION =
  'reported-album-sales-research-cohort-evidence-derivation-v1' as const;

export type ReportedAlbumSalesResearchDerivedDimension =
  | 'release-identity'
  | 'source-quality'
  | 'period-consistency';

export type ReportedAlbumSalesResearchDerivedCandidateState =
  | 'review-candidate'
  | 'insufficient-evidence'
  | 'conflicting-evidence';

export type ReportedAlbumSalesResearchDerivedEvidenceCandidate = Readonly<{
  candidateId: string;
  dimension: ReportedAlbumSalesResearchDerivedDimension;
  inputFingerprint: string;
  asOf: string;
  state: ReportedAlbumSalesResearchDerivedCandidateState;
  coveredObservationIds: readonly string[];
  sourceEvidenceIds: readonly string[];
  facts: Readonly<{
    releaseCount: number;
    artistCount: number;
    releaseIdentityStateCounts: Readonly<{
      resolved: number;
      candidate: number;
      unresolved: number;
      conflicting: number;
    }>;
    evidenceQualityCounts:
      Readonly<Record<ReportedAlbumSalesEvidenceQuality, number>>;
    explicitSevenDayPeriodCount: number;
    sameUnderlyingProvider: boolean;
    sameMetricSemantic: boolean;
  }>;
  reasonCodes: readonly string[];
  reviewerConclusionRequired: true;
  autoVerified: false;
  eligibleAsReviewRecordWithoutReviewer: false;
  numericNormalizationDefined: false;
  productEligible: false;
}>;

export type ReportedAlbumSalesResearchCohortEvidenceDerivation =
  Readonly<{
    contractVersion:
      typeof REPORTED_ALBUM_SALES_RESEARCH_COHORT_DERIVATION_VERSION;
    inputFingerprint: string;
    asOf: string;
    candidates: Readonly<{
      releaseIdentity:
        ReportedAlbumSalesResearchDerivedEvidenceCandidate;
      sourceQuality:
        ReportedAlbumSalesResearchDerivedEvidenceCandidate;
      periodConsistency:
        ReportedAlbumSalesResearchDerivedEvidenceCandidate;
    }>;
    notAutomaticallyDerivedDimensions:
      readonly ['cohort-coverage'];
    reviewerConclusionRequired: true;
    autoVerifiedDimensions: readonly [];
    numericNormalizationDefined: false;
    calibrationMethodDefined: false;
    calibrationRunAuthorized: false;
    scoreFieldsPresent: false;
    productEligible: false;
    directProviderReplacementAllowed: false;
  }>;

const EVIDENCE_QUALITIES = Object.freeze([
  'primary-official',
  'provider-attributed-secondary',
  'corroborated-secondary',
  'discovery-only',
  'unresolved',
  'conflicting',
  'superseded',
] as const satisfies readonly ReportedAlbumSalesEvidenceQuality[]);

function countEvidenceQualities(
  input: ReportedAlbumSalesResearchInput,
): Readonly<Record<ReportedAlbumSalesEvidenceQuality, number>> {
  const counts = Object.fromEntries(
    EVIDENCE_QUALITIES.map(value => [value, 0]),
  ) as Record<ReportedAlbumSalesEvidenceQuality, number>;

  for (const entry of input.entries) {
    counts[entry.evidenceQuality] += 1;
  }

  return Object.freeze(counts);
}

function releaseIdentityStateCounts(
  input: ReportedAlbumSalesResearchInput,
) {
  return Object.freeze({
    resolved: input.entries.filter(
      entry => entry.releaseIdentityState === 'resolved',
    ).length,
    candidate: input.entries.filter(
      entry => entry.releaseIdentityState === 'candidate',
    ).length,
    unresolved: input.entries.filter(
      entry => entry.releaseIdentityState === 'unresolved',
    ).length,
    conflicting: input.entries.filter(
      entry => entry.releaseIdentityState === 'conflicting',
    ).length,
  });
}

function sevenDayPeriodCount(
  input: ReportedAlbumSalesResearchInput,
): number {
  return input.entries.filter(entry => {
    const start = Date.parse(
      `${entry.providerPeriodStart}T00:00:00Z`,
    );
    const end = Date.parse(
      `${entry.providerPeriodEnd}T00:00:00Z`,
    );
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    return Math.floor(
      (end - start) / (24 * 60 * 60 * 1000),
    ) + 1 === 7;
  }).length;
}

function candidateState(
  input: ReportedAlbumSalesResearchInput,
): ReportedAlbumSalesResearchDerivedCandidateState {
  if (input.state === 'conflicting-evidence') {
    return 'conflicting-evidence';
  }
  if (input.state !== 'reviewable' || input.entries.length === 0) {
    return 'insufficient-evidence';
  }
  return 'review-candidate';
}

function buildCandidate(input: Readonly<{
  researchInput: ReportedAlbumSalesResearchInput;
  dimension: ReportedAlbumSalesResearchDerivedDimension;
}>): ReportedAlbumSalesResearchDerivedEvidenceCandidate {
  const state = candidateState(input.researchInput);
  const identityCounts =
    releaseIdentityStateCounts(input.researchInput);
  const qualityCounts =
    countEvidenceQualities(input.researchInput);
  const explicitSevenDayPeriodCount =
    sevenDayPeriodCount(input.researchInput);
  const sameUnderlyingProvider =
    input.researchInput.entries.every(
      entry =>
        entry.underlyingProvider
          === input.researchInput.target.underlyingProvider,
    );
  const sameMetricSemantic =
    input.researchInput.entries.every(
      entry =>
        entry.metricSemantic
          === input.researchInput.target.metricSemantic,
    );

  const facts = Object.freeze({
    releaseCount: input.researchInput.releaseCount,
    artistCount: input.researchInput.artistCount,
    releaseIdentityStateCounts: identityCounts,
    evidenceQualityCounts: qualityCounts,
    explicitSevenDayPeriodCount,
    sameUnderlyingProvider,
    sameMetricSemantic,
  });

  const reasons: string[] = [];
  if (state === 'conflicting-evidence') {
    reasons.push('research-input-conflicting');
  } else if (state === 'insufficient-evidence') {
    reasons.push('research-input-not-reviewable');
  } else {
    reasons.push('current-research-input-bound');
  }

  if (input.dimension === 'release-identity') {
    reasons.push('release-identity-facts-only');
    if (identityCounts.candidate > 0) {
      reasons.push('candidate-release-identity-requires-review');
    }
  } else if (input.dimension === 'source-quality') {
    reasons.push('source-quality-facts-only');
    if (qualityCounts['provider-attributed-secondary'] > 0) {
      reasons.push(
        'secondary-source-quality-requires-review',
      );
    }
  } else {
    reasons.push('period-shape-facts-only');
    reasons.push('period-consistency-still-requires-review');
  }

  const coveredObservationIds = Object.freeze(
    [...input.researchInput.includedObservationIds].sort(),
  );
  const sourceEvidenceIds = Object.freeze(
    [...new Set(
      input.researchInput.entries.flatMap(
        entry => [...entry.evidenceIds],
      ),
    )].sort(),
  );

  const candidateId = sha256Canonical({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_COHORT_DERIVATION_VERSION,
    dimension: input.dimension,
    inputFingerprint: input.researchInput.inputFingerprint,
    asOf: input.researchInput.asOf,
    state,
    coveredObservationIds,
    sourceEvidenceIds,
    facts,
  });

  return Object.freeze({
    candidateId,
    dimension: input.dimension,
    inputFingerprint: input.researchInput.inputFingerprint,
    asOf: input.researchInput.asOf,
    state,
    coveredObservationIds,
    sourceEvidenceIds,
    facts,
    reasonCodes: Object.freeze([...new Set(reasons)].sort()),
    reviewerConclusionRequired: true as const,
    autoVerified: false as const,
    eligibleAsReviewRecordWithoutReviewer: false as const,
    numericNormalizationDefined: false as const,
    productEligible: false as const,
  });
}

export function deriveReportedAlbumSalesResearchCohortEvidenceCandidates(
  researchInput: ReportedAlbumSalesResearchInput,
): ReportedAlbumSalesResearchCohortEvidenceDerivation {
  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_COHORT_DERIVATION_VERSION,
    inputFingerprint: researchInput.inputFingerprint,
    asOf: researchInput.asOf,
    candidates: Object.freeze({
      releaseIdentity: buildCandidate({
        researchInput,
        dimension: 'release-identity',
      }),
      sourceQuality: buildCandidate({
        researchInput,
        dimension: 'source-quality',
      }),
      periodConsistency: buildCandidate({
        researchInput,
        dimension: 'period-consistency',
      }),
    }),
    notAutomaticallyDerivedDimensions:
      Object.freeze(['cohort-coverage'] as const),
    reviewerConclusionRequired: true as const,
    autoVerifiedDimensions: Object.freeze([] as const),
    numericNormalizationDefined: false as const,
    calibrationMethodDefined: false as const,
    calibrationRunAuthorized: false as const,
    scoreFieldsPresent: false as const,
    productEligible: false as const,
    directProviderReplacementAllowed: false as const,
  });
}

export function createReportedAlbumSalesResearchReviewRecordFromCandidate(
  input: Readonly<{
    candidate:
      ReportedAlbumSalesResearchDerivedEvidenceCandidate;
    evidenceId: string;
    conclusion:
      ReportedAlbumSalesResearchCohortReviewConclusion;
    evidenceRefs: readonly string[];
    reviewerRef: string;
    reviewedAt: string;
  }>,
): ReportedAlbumSalesResearchCohortReviewRecord {
  if (input.evidenceId.trim() === '') {
    throw new Error(
      'reported_album_sales_research_derived_evidence_id_missing',
    );
  }
  if (input.reviewerRef.trim() === '') {
    throw new Error(
      'reported_album_sales_research_derived_reviewer_ref_missing',
    );
  }
  if (
    input.conclusion !== 'unknown'
    && (
      input.evidenceRefs.length === 0
      || input.evidenceRefs.some(value => value.trim() === '')
    )
  ) {
    throw new Error(
      'reported_album_sales_research_derived_evidence_ref_missing',
    );
  }
  if (
    input.conclusion === 'verified'
    && input.candidate.state !== 'review-candidate'
  ) {
    throw new Error(
      'reported_album_sales_research_derived_verified_requires_review_candidate',
    );
  }

  return Object.freeze({
    recordVersion:
      REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION,
    evidenceId: input.evidenceId,
    dimension: input.candidate.dimension,
    inputFingerprint: input.candidate.inputFingerprint,
    coveredObservationIds:
      input.candidate.coveredObservationIds,
    conclusion: input.conclusion,
    evidenceRefs: Object.freeze([...input.evidenceRefs]),
    reviewerRef: input.reviewerRef,
    reviewedAt: input.reviewedAt,
  });
}
