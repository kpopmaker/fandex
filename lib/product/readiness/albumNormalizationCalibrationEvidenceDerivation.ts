import { sha256Canonical } from '../../shared/canonicalDigest';
import type {
  AlbumNormalizationInput,
} from '../contracts/albumNormalizationInput';
import {
  readAlbumObservationHistoryAsOf,
  type AlbumObservationHistory,
} from '../contracts/albumObservationHistory';
import {
  ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION,
  buildAlbumNormalizationCalibrationReviewTarget,
  type AlbumNormalizationCalibrationEvidenceRecord,
  type AlbumNormalizationCalibrationRecordConclusion,
} from './albumNormalizationCalibrationEvidenceReview';

export const ALBUM_NORMALIZATION_CALIBRATION_DERIVATION_VERSION =
  'album-normalization-calibration-evidence-derivation-v1' as const;

export type AlbumCalibrationDerivedDimension =
  | 'period-coverage'
  | 'revision-stability';

export type AlbumCalibrationDerivedCandidateState =
  | 'review-candidate'
  | 'insufficient-evidence'
  | 'conflicting-evidence';

export type AlbumCalibrationDerivedEvidenceCandidate = Readonly<{
  candidateId: string;
  dimension: AlbumCalibrationDerivedDimension;
  targetFingerprint: string;
  historyFingerprint: string;
  asOf: string;
  state: AlbumCalibrationDerivedCandidateState;
  coveredObservationIds: readonly string[];
  uncoveredPrimaryObservationIds: readonly string[];
  sourceObservationIds: readonly string[];
  facts: Readonly<{
    activeObservationCount: number;
    supersededObservationCount: number;
    providerPeriods: readonly string[];
    seriesIds: readonly string[];
    revisionObservationCount: number;
    reacquisitionEventCount: number;
  }>;
  reasonCodes: readonly string[];
  reviewerConclusionRequired: true;
  autoVerified: false;
  numericNormalizationDefined: false;
}>;

export type AlbumNormalizationCalibrationEvidenceDerivation = Readonly<{
  contractVersion:
    typeof ALBUM_NORMALIZATION_CALIBRATION_DERIVATION_VERSION;
  targetFingerprint: string;
  historyFingerprint: string;
  asOf: string;
  candidates: Readonly<{
    periodCoverage: AlbumCalibrationDerivedEvidenceCandidate;
    revisionStability: AlbumCalibrationDerivedEvidenceCandidate;
  }>;
  notAutomaticallyDerivedDimensions:
    readonly ['release-scope-completeness'];
  dataIssues: readonly string[];
  reviewerConclusionRequired: true;
  autoVerifiedDimensions: readonly [];
  numericNormalizationDefined: false;
  calibrationRunAuthorized: false;
  scoreFieldsPresent: false;
}>;

function historyFingerprint(
  history: AlbumObservationHistory,
): string {
  return sha256Canonical({
    contractVersion: history.contractVersion,
    historyClass: history.historyClass,
    entries: history.entries
      .map(entry => ({
        historyEntryId: entry.historyEntryId,
        observationId: entry.observationId,
        seriesId: entry.seriesId,
        acquisitionTimes: [...entry.acquisitionTimes],
        firstCollectedAt: entry.firstCollectedAt,
        lastCollectedAt: entry.lastCollectedAt,
        acquisitionCount: entry.acquisitionCount,
        revisionId: entry.observation.revisionId,
        supersedesObservationId:
          entry.observation.supersedesObservationId,
      }))
      .sort((a, b) =>
        a.observationId.localeCompare(b.observationId)),
  });
}

function buildCandidate(input: Readonly<{
  dimension: AlbumCalibrationDerivedDimension;
  targetFingerprint: string;
  historyFingerprint: string;
  asOf: string;
  primaryObservationIds: readonly string[];
  activeObservationIds: readonly string[];
  sourceObservationIds: readonly string[];
  activeObservationCount: number;
  supersededObservationCount: number;
  providerPeriods: readonly string[];
  seriesIds: readonly string[];
  revisionObservationCount: number;
  reacquisitionEventCount: number;
  dataIssue: boolean;
}>): AlbumCalibrationDerivedEvidenceCandidate {
  const activeSet = new Set(input.activeObservationIds);
  const coveredObservationIds =
    input.primaryObservationIds.filter(id => activeSet.has(id));
  const uncoveredPrimaryObservationIds =
    input.primaryObservationIds.filter(id => !activeSet.has(id));

  let state: AlbumCalibrationDerivedCandidateState;
  const reasons: string[] = [];

  if (input.dataIssue) {
    state = 'conflicting-evidence';
    reasons.push('history-read-data-issue');
  } else if (input.primaryObservationIds.length === 0) {
    state = 'insufficient-evidence';
    reasons.push('no-primary-normalization-candidate');
  } else if (uncoveredPrimaryObservationIds.length > 0) {
    state = 'insufficient-evidence';
    reasons.push('primary-observation-not-active-in-history');
  } else {
    state = 'review-candidate';
    reasons.push('current-primary-set-bound-to-history');
  }

  if (input.dimension === 'period-coverage') {
    reasons.push('observed-period-facts-only');
    reasons.push('expected-period-universe-not-auto-inferred');
  } else {
    reasons.push('revision-lineage-facts-only');
    reasons.push('future-revision-stability-not-auto-inferred');
  }

  const facts = Object.freeze({
    activeObservationCount: input.activeObservationCount,
    supersededObservationCount:
      input.supersededObservationCount,
    providerPeriods: Object.freeze(
      [...new Set(input.providerPeriods)].sort(),
    ),
    seriesIds: Object.freeze(
      [...new Set(input.seriesIds)].sort(),
    ),
    revisionObservationCount:
      input.revisionObservationCount,
    reacquisitionEventCount:
      input.reacquisitionEventCount,
  });

  const candidateId = sha256Canonical({
    contractVersion:
      ALBUM_NORMALIZATION_CALIBRATION_DERIVATION_VERSION,
    dimension: input.dimension,
    targetFingerprint: input.targetFingerprint,
    historyFingerprint: input.historyFingerprint,
    asOf: input.asOf,
    coveredObservationIds,
    uncoveredPrimaryObservationIds,
    sourceObservationIds: [...input.sourceObservationIds].sort(),
    facts,
    state,
  });

  return Object.freeze({
    candidateId,
    dimension: input.dimension,
    targetFingerprint: input.targetFingerprint,
    historyFingerprint: input.historyFingerprint,
    asOf: input.asOf,
    state,
    coveredObservationIds:
      Object.freeze([...coveredObservationIds].sort()),
    uncoveredPrimaryObservationIds:
      Object.freeze([...uncoveredPrimaryObservationIds].sort()),
    sourceObservationIds: Object.freeze(
      [...input.sourceObservationIds].sort(),
    ),
    facts,
    reasonCodes: Object.freeze([...new Set(reasons)].sort()),
    reviewerConclusionRequired: true as const,
    autoVerified: false as const,
    numericNormalizationDefined: false as const,
  });
}

export function deriveAlbumNormalizationCalibrationEvidenceCandidates(
  input: Readonly<{
    normalizationInput: AlbumNormalizationInput;
    history: AlbumObservationHistory;
    asOf: string;
  }>,
): AlbumNormalizationCalibrationEvidenceDerivation {
  const target =
    buildAlbumNormalizationCalibrationReviewTarget(
      input.normalizationInput,
    );
  const historyId = historyFingerprint(input.history);
  const read =
    readAlbumObservationHistoryAsOf(input.history, input.asOf);
  const dataIssues =
    read.status === 'data-issue'
      ? [...read.issues]
      : [];

  const rows = read.status === 'ok' ? read.rows : [];
  const activeRows =
    read.status === 'ok' ? read.activeRows : [];
  const supersededRows =
    read.status === 'ok' ? read.supersededRows : [];

  const primarySet = new Set(target.primaryObservationIds);
  const relevantRows = rows.filter(row =>
    primarySet.has(row.observationId)
    || target.primaryObservationIds.some(primaryId =>
      row.supersedesObservationId === primaryId)
  );

  const historyEntryByObservation = new Map(
    input.history.entries.map(entry => [
      entry.observationId,
      entry,
    ]),
  );

  const sourceObservationIds = rows
    .map(row => row.observationId)
    .sort();
  const activeObservationIds = activeRows
    .map(row => row.observationId)
    .sort();
  const providerPeriods = relevantRows
    .map(row => row.providerPeriod)
    .sort();
  const seriesIds = relevantRows
    .map(row => row.seriesId)
    .sort();
  const revisionObservationCount = relevantRows.filter(
    row =>
      row.revisionId !== null
      || row.supersedesObservationId !== null,
  ).length;
  const reacquisitionEventCount = relevantRows.reduce(
    (sum, row) => {
      const entry = historyEntryByObservation.get(
        row.observationId,
      );
      return sum + Math.max(
        0,
        (entry?.acquisitionCount ?? 1) - 1,
      );
    },
    0,
  );

  const common = {
    targetFingerprint: target.fingerprint,
    historyFingerprint: historyId,
    asOf: input.asOf,
    primaryObservationIds: target.primaryObservationIds,
    activeObservationIds,
    sourceObservationIds,
    activeObservationCount: activeRows.length,
    supersededObservationCount: supersededRows.length,
    providerPeriods,
    seriesIds,
    revisionObservationCount,
    reacquisitionEventCount,
    dataIssue: dataIssues.length > 0,
  } as const;

  return Object.freeze({
    contractVersion:
      ALBUM_NORMALIZATION_CALIBRATION_DERIVATION_VERSION,
    targetFingerprint: target.fingerprint,
    historyFingerprint: historyId,
    asOf: input.asOf,
    candidates: Object.freeze({
      periodCoverage: buildCandidate({
        ...common,
        dimension: 'period-coverage',
      }),
      revisionStability: buildCandidate({
        ...common,
        dimension: 'revision-stability',
      }),
    }),
    notAutomaticallyDerivedDimensions:
      Object.freeze([
        'release-scope-completeness',
      ] as const),
    dataIssues: Object.freeze(
      [...new Set(dataIssues)].sort(),
    ),
    reviewerConclusionRequired: true as const,
    autoVerifiedDimensions: Object.freeze([] as const),
    numericNormalizationDefined: false as const,
    calibrationRunAuthorized: false as const,
    scoreFieldsPresent: false as const,
  });
}

export function createAlbumCalibrationEvidenceRecordFromCandidate(
  input: Readonly<{
    candidate: AlbumCalibrationDerivedEvidenceCandidate;
    evidenceId: string;
    conclusion: AlbumNormalizationCalibrationRecordConclusion;
    sourceRef: string;
    reviewedAt: string;
  }>,
): AlbumNormalizationCalibrationEvidenceRecord {
  if (input.evidenceId.trim() === '') {
    throw new Error(
      'album_calibration_derived_record_evidence_id_missing',
    );
  }
  if (input.sourceRef.trim() === '') {
    throw new Error(
      'album_calibration_derived_record_source_ref_missing',
    );
  }
  if (
    input.conclusion === 'verified'
    && input.candidate.state !== 'review-candidate'
  ) {
    throw new Error(
      'album_calibration_derived_record_verified_requires_review_candidate',
    );
  }

  return Object.freeze({
    recordVersion:
      ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION,
    evidenceId: input.evidenceId,
    dimension: input.candidate.dimension,
    targetFingerprint: input.candidate.targetFingerprint,
    coveredObservationIds:
      input.candidate.coveredObservationIds,
    conclusion: input.conclusion,
    sourceRef: input.sourceRef,
    reviewedAt: input.reviewedAt,
  });
}
