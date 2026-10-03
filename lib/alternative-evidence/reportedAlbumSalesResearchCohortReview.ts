import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  ReportedAlbumSalesEvidenceQuality,
} from './reportedAlbumSalesEvidence';
import {
  REPORTED_ALBUM_SALES_RESEARCH_INPUT_CONTRACT_VERSION,
  type ReportedAlbumSalesResearchInput,
  type ReportedAlbumSalesResearchInputExclusionReason,
} from './reportedAlbumSalesResearchInput';

export const REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_VERSION =
  'reported-album-sales-research-cohort-review-v1' as const;

export const REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION =
  'reported-album-sales-research-cohort-review-record-v1' as const;

export type ReportedAlbumSalesResearchCohortReviewDimension =
  | 'cohort-coverage'
  | 'release-identity'
  | 'source-quality'
  | 'period-consistency';

export type ReportedAlbumSalesResearchCohortReviewConclusion =
  | 'verified'
  | 'partial'
  | 'conflicting'
  | 'unknown';

export type ReportedAlbumSalesResearchCohortReviewRecord = Readonly<{
  recordVersion:
    typeof REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION;
  evidenceId: string;
  dimension: ReportedAlbumSalesResearchCohortReviewDimension;
  inputFingerprint: string;
  coveredObservationIds: readonly string[];
  conclusion: ReportedAlbumSalesResearchCohortReviewConclusion;
  evidenceRefs: readonly string[];
  reviewerRef: string;
  reviewedAt: string;
}>;

export type ReportedAlbumSalesResearchCohortFacts = Readonly<{
  releaseCount: number;
  artistCount: number;
  includedObservationIds: readonly string[];
  includedArtistIds: readonly string[];
  releaseIdentityStateCounts: Readonly<{
    resolved: number;
    candidate: number;
    unresolved: number;
    conflicting: number;
  }>;
  evidenceQualityCounts:
    Readonly<Record<ReportedAlbumSalesEvidenceQuality, number>>;
  exclusionReasonCounts:
    Readonly<Record<ReportedAlbumSalesResearchInputExclusionReason, number>>;
  explicitSevenDayPeriodCount: number;
  periodInferenceUsed: false;
}>;

export type ReportedAlbumSalesResearchCohortReviewPacket = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_VERSION;
  packetId: string;
  inputContractVersion:
    typeof REPORTED_ALBUM_SALES_RESEARCH_INPUT_CONTRACT_VERSION;
  inputFingerprint: string;
  asOf: string;
  inputState: ReportedAlbumSalesResearchInput['state'];
  facts: ReportedAlbumSalesResearchCohortFacts;
  reviewerConclusionRequired: true;
  automaticSufficiencyDecisionAllowed: false;
  minimumCohortSizeDefined: false;
  numericNormalizationDefined: false;
  calibrationMethodDefined: false;
  scoreFieldsPresent: false;
  productEligible: false;
}>;

export type ReportedAlbumSalesResearchCohortDimensionReview = Readonly<{
  dimension: ReportedAlbumSalesResearchCohortReviewDimension;
  state: ReportedAlbumSalesResearchCohortReviewConclusion;
  evidenceIds: readonly string[];
  coveredObservationIds: readonly string[];
  uncoveredObservationIds: readonly string[];
  conflictingEvidenceIds: readonly string[];
}>;

export type ReportedAlbumSalesResearchMethodologyDesignGate = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_VERSION;
  packet: ReportedAlbumSalesResearchCohortReviewPacket;
  dimensions: Readonly<{
    cohortCoverage: ReportedAlbumSalesResearchCohortDimensionReview;
    releaseIdentity: ReportedAlbumSalesResearchCohortDimensionReview;
    sourceQuality: ReportedAlbumSalesResearchCohortDimensionReview;
    periodConsistency: ReportedAlbumSalesResearchCohortDimensionReview;
  }>;
  status: 'eligible-for-methodology-design' | 'blocked';
  blockers: readonly string[];
  dataIssues: readonly string[];
  arbitraryThresholdDefined: false;
  minimumCohortSizeDefined: false;
  numericNormalizationDefined: false;
  calibrationMethodDefined: false;
  calibrationRunAuthorized: false;
  normalizedValue: null;
  scoreFieldsPresent: false;
  productEligible: false;
  directProviderReplacementAllowed: false;
}>;

const DIMENSIONS = Object.freeze([
  'cohort-coverage',
  'release-identity',
  'source-quality',
  'period-consistency',
] as const);

const EVIDENCE_QUALITIES = Object.freeze([
  'primary-official',
  'provider-attributed-secondary',
  'corroborated-secondary',
  'discovery-only',
  'unresolved',
  'conflicting',
  'superseded',
] as const satisfies readonly ReportedAlbumSalesEvidenceQuality[]);

const EXCLUSION_REASONS = Object.freeze([
  'provider-mismatch',
  'metric-semantic-mismatch',
  'not-research-usable',
  'value-missing',
  'unit-mismatch',
  'release-identity-unreviewable',
  'provider-period-incomplete',
  'provider-period-invalid',
  'provider-period-not-seven-calendar-days',
  'conflicting-active-scope',
] as const satisfies readonly ReportedAlbumSalesResearchInputExclusionReason[]);

function validOffsetInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

function countBy<T extends string>(
  values: readonly T[],
  universe: readonly T[],
): Readonly<Record<T, number>> {
  const counts = Object.fromEntries(
    universe.map(value => [value, 0]),
  ) as Record<T, number>;

  for (const value of values) {
    counts[value] += 1;
  }

  return Object.freeze(counts);
}

export function buildReportedAlbumSalesResearchCohortReviewPacket(
  input: ReportedAlbumSalesResearchInput,
): ReportedAlbumSalesResearchCohortReviewPacket {
  if (
    input.contractVersion
      !== REPORTED_ALBUM_SALES_RESEARCH_INPUT_CONTRACT_VERSION
    || input.lifecycle !== 'research-shadow'
    || input.minimumCohortSizeDefined !== false
    || input.numericNormalizationDefined !== false
    || input.calibrationMethodDefined !== false
    || input.scoreFieldsPresent !== false
    || input.productEligible !== false
    || input.directProviderReplacementAllowed !== false
  ) {
    throw new Error(
      'reported_album_sales_research_cohort_input_boundary_invalid',
    );
  }

  const releaseIdentityStateCounts = Object.freeze({
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

  const evidenceQualityCounts = countBy(
    input.entries.map(entry => entry.evidenceQuality),
    EVIDENCE_QUALITIES,
  );

  const exclusionReasonCounts = countBy(
    input.exclusions.flatMap(exclusion => [...exclusion.reasons]),
    EXCLUSION_REASONS,
  );

  const facts: ReportedAlbumSalesResearchCohortFacts =
    Object.freeze({
      releaseCount: input.releaseCount,
      artistCount: input.artistCount,
      includedObservationIds:
        Object.freeze([...input.includedObservationIds].sort()),
      includedArtistIds:
        Object.freeze([...input.includedArtistIds].sort()),
      releaseIdentityStateCounts,
      evidenceQualityCounts,
      exclusionReasonCounts,
      explicitSevenDayPeriodCount: input.entries.length,
      periodInferenceUsed: false as const,
    });

  const packetId = sha256Canonical({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_VERSION,
    inputContractVersion: input.contractVersion,
    inputFingerprint: input.inputFingerprint,
    asOf: input.asOf,
    inputState: input.state,
    facts,
  });

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_VERSION,
    packetId,
    inputContractVersion: input.contractVersion,
    inputFingerprint: input.inputFingerprint,
    asOf: input.asOf,
    inputState: input.state,
    facts,
    reviewerConclusionRequired: true as const,
    automaticSufficiencyDecisionAllowed: false as const,
    minimumCohortSizeDefined: false as const,
    numericNormalizationDefined: false as const,
    calibrationMethodDefined: false as const,
    scoreFieldsPresent: false as const,
    productEligible: false as const,
  });
}

function reviewDimension(input: Readonly<{
  dimension: ReportedAlbumSalesResearchCohortReviewDimension;
  targetObservationIds: readonly string[];
  records: readonly ReportedAlbumSalesResearchCohortReviewRecord[];
  invalidEvidenceIds: ReadonlySet<string>;
}>): ReportedAlbumSalesResearchCohortDimensionReview {
  const records = input.records.filter(
    record => record.dimension === input.dimension,
  );
  const targetSet = new Set(input.targetObservationIds);
  const covered = new Set<string>();
  const conflictingEvidenceIds = new Set<string>();
  let hasVerified = false;
  let hasPartial = false;
  let hasUnknown = false;
  let hasConflict = false;

  for (const record of records) {
    if (input.invalidEvidenceIds.has(record.evidenceId)) {
      hasConflict = true;
      conflictingEvidenceIds.add(record.evidenceId);
      continue;
    }

    for (const observationId of record.coveredObservationIds) {
      if (targetSet.has(observationId)) covered.add(observationId);
    }

    switch (record.conclusion) {
      case 'verified':
        hasVerified = true;
        break;
      case 'partial':
        hasPartial = true;
        break;
      case 'conflicting':
        hasConflict = true;
        conflictingEvidenceIds.add(record.evidenceId);
        break;
      case 'unknown':
        hasUnknown = true;
        break;
    }
  }

  const uncovered = input.targetObservationIds.filter(
    observationId => !covered.has(observationId),
  );

  let state: ReportedAlbumSalesResearchCohortReviewConclusion;
  if (hasConflict) {
    state = 'conflicting';
  } else if (records.length === 0 || (!hasVerified && !hasPartial)) {
    state = 'unknown';
  } else if (
    hasVerified
    && !hasPartial
    && !hasUnknown
    && uncovered.length === 0
  ) {
    state = 'verified';
  } else {
    state = 'partial';
  }

  return Object.freeze({
    dimension: input.dimension,
    state,
    evidenceIds: Object.freeze(
      [...new Set(records.map(record => record.evidenceId))].sort(),
    ),
    coveredObservationIds: Object.freeze([...covered].sort()),
    uncoveredObservationIds: Object.freeze([...uncovered].sort()),
    conflictingEvidenceIds:
      Object.freeze([...conflictingEvidenceIds].sort()),
  });
}

export function evaluateReportedAlbumSalesResearchMethodologyDesignGate(
  input: Readonly<{
    researchInput: ReportedAlbumSalesResearchInput;
    records: readonly ReportedAlbumSalesResearchCohortReviewRecord[];
  }>,
): ReportedAlbumSalesResearchMethodologyDesignGate {
  const packet =
    buildReportedAlbumSalesResearchCohortReviewPacket(
      input.researchInput,
    );
  const dataIssues: string[] = [];
  const invalidEvidenceIds = new Set<string>();
  const seenEvidenceIds = new Set<string>();
  const targetSet = new Set(packet.facts.includedObservationIds);

  for (const record of input.records) {
    if (
      record.recordVersion
        !== REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_RECORD_VERSION
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

    if (record.inputFingerprint !== packet.inputFingerprint) {
      dataIssues.push(
        `input-fingerprint-mismatch:${record.evidenceId}`,
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

    const covered = [...new Set(record.coveredObservationIds)];
    if (covered.length === 0) {
      dataIssues.push(
        `covered-observations-empty:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
    if (covered.length !== record.coveredObservationIds.length) {
      dataIssues.push(
        `covered-observations-duplicate:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
    if (covered.some(observationId => !targetSet.has(observationId))) {
      dataIssues.push(
        `covered-observation-not-in-cohort:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }

    if (
      record.conclusion !== 'unknown'
      && (
        record.evidenceRefs.length === 0
        || record.evidenceRefs.some(value => value.trim() === '')
      )
    ) {
      dataIssues.push(
        `evidence-ref-missing:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
  }

  const reviews = Object.fromEntries(
    DIMENSIONS.map(dimension => [
      dimension,
      reviewDimension({
        dimension,
        targetObservationIds:
          packet.facts.includedObservationIds,
        records: input.records,
        invalidEvidenceIds,
      }),
    ]),
  ) as Record<
    ReportedAlbumSalesResearchCohortReviewDimension,
    ReportedAlbumSalesResearchCohortDimensionReview
  >;

  const blockers: string[] = [];
  if (packet.inputState !== 'reviewable') {
    blockers.push(`input-state:${packet.inputState}`);
  }
  if (packet.facts.includedObservationIds.length === 0) {
    blockers.push('cohort-empty');
  }
  for (const dimension of DIMENSIONS) {
    if (reviews[dimension].state !== 'verified') {
      blockers.push(
        `${dimension}:${reviews[dimension].state}`,
      );
    }
  }
  if (dataIssues.length > 0) {
    blockers.push('review-data-issue');
  }

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_RESEARCH_COHORT_REVIEW_VERSION,
    packet,
    dimensions: Object.freeze({
      cohortCoverage: reviews['cohort-coverage'],
      releaseIdentity: reviews['release-identity'],
      sourceQuality: reviews['source-quality'],
      periodConsistency: reviews['period-consistency'],
    }),
    status: blockers.length === 0
      ? 'eligible-for-methodology-design' as const
      : 'blocked' as const,
    blockers: Object.freeze([...new Set(blockers)].sort()),
    dataIssues: Object.freeze([...new Set(dataIssues)].sort()),
    arbitraryThresholdDefined: false as const,
    minimumCohortSizeDefined: false as const,
    numericNormalizationDefined: false as const,
    calibrationMethodDefined: false as const,
    calibrationRunAuthorized: false as const,
    normalizedValue: null,
    scoreFieldsPresent: false as const,
    productEligible: false as const,
    directProviderReplacementAllowed: false as const,
  });
}
