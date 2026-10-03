import { sha256Canonical } from '../../shared/canonicalDigest';
import type {
  AlbumNormalizationInput,
} from '../contracts/albumNormalizationInput';
import type {
  AlbumNormalizationCalibrationEvidence,
  AlbumCalibrationEvidenceState,
} from './albumNormalizationCalibrationGate';

export const ALBUM_NORMALIZATION_CALIBRATION_REVIEW_VERSION =
  'album-normalization-calibration-evidence-review-v1' as const;

export const ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION =
  'album-normalization-calibration-evidence-record-v1' as const;

export type AlbumNormalizationCalibrationDimension =
  | 'period-coverage'
  | 'release-scope-completeness'
  | 'revision-stability';

export type AlbumNormalizationCalibrationRecordConclusion =
  | 'verified'
  | 'partial'
  | 'conflicting'
  | 'unknown';

export type AlbumNormalizationCalibrationEvidenceRecord = Readonly<{
  recordVersion:
    typeof ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION;
  evidenceId: string;
  dimension: AlbumNormalizationCalibrationDimension;
  targetFingerprint: string;
  coveredObservationIds: readonly string[];
  conclusion: AlbumNormalizationCalibrationRecordConclusion;
  sourceRef: string;
  reviewedAt: string;
}>;

export type AlbumNormalizationCalibrationReviewTarget = Readonly<{
  normalizationInputContractVersion: string;
  fingerprint: string;
  primaryObservationIds: readonly string[];
  inputEntryIds: readonly string[];
}>;

export type AlbumNormalizationCalibrationDimensionReview = Readonly<{
  dimension: AlbumNormalizationCalibrationDimension;
  state: AlbumCalibrationEvidenceState;
  evidenceIds: readonly string[];
  coveredObservationIds: readonly string[];
  uncoveredPrimaryObservationIds: readonly string[];
  conflictingEvidenceIds: readonly string[];
}>;

export type AlbumNormalizationCalibrationEvidenceReview = Readonly<{
  contractVersion:
    typeof ALBUM_NORMALIZATION_CALIBRATION_REVIEW_VERSION;
  target: AlbumNormalizationCalibrationReviewTarget;
  dimensions: Readonly<{
    periodCoverage: AlbumNormalizationCalibrationDimensionReview;
    releaseScopeCompleteness: AlbumNormalizationCalibrationDimensionReview;
    revisionStability: AlbumNormalizationCalibrationDimensionReview;
  }>;
  evidence: AlbumNormalizationCalibrationEvidence;
  dataIssues: readonly string[];
  readyForCalibrationGate: boolean;
  numericNormalizationDefined: false;
  calibrationRunAuthorized: false;
  scoreFieldsPresent: false;
}>;

function validOffsetInstant(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    && !Number.isNaN(Date.parse(value));
}

export function buildAlbumNormalizationCalibrationReviewTarget(
  input: AlbumNormalizationInput,
): AlbumNormalizationCalibrationReviewTarget {
  const primaryObservationIds = Object.freeze(
    [...input.primaryCandidateObservationIds].sort(),
  );
  const inputEntryIds = Object.freeze(
    input.entries.map(entry => entry.entryId).sort(),
  );

  const fingerprint = sha256Canonical({
    contractVersion: input.contractVersion,
    providerPolicy: input.providerPolicy,
    primaryObservationIds,
    inputEntryIds,
    blockedObservationIds: [...input.blockedObservationIds].sort(),
    excludedDetailObservationIds:
      [...input.excludedDetailObservationIds].sort(),
    duplicateObservationIds:
      [...input.duplicateObservationIds].sort(),
    supersededObservationIds:
      [...input.supersededObservationIds].sort(),
  });

  return Object.freeze({
    normalizationInputContractVersion: input.contractVersion,
    fingerprint,
    primaryObservationIds,
    inputEntryIds,
  });
}

function dimensionKey(
  dimension: AlbumNormalizationCalibrationDimension,
): keyof AlbumNormalizationCalibrationEvidence {
  switch (dimension) {
    case 'period-coverage':
      return 'periodCoverage';
    case 'release-scope-completeness':
      return 'releaseScopeCompleteness';
    case 'revision-stability':
      return 'revisionStability';
  }
}

function reviewDimension(input: Readonly<{
  dimension: AlbumNormalizationCalibrationDimension;
  target: AlbumNormalizationCalibrationReviewTarget;
  records: readonly AlbumNormalizationCalibrationEvidenceRecord[];
  invalidEvidenceIds: ReadonlySet<string>;
}>): AlbumNormalizationCalibrationDimensionReview {
  const records = input.records.filter(
    record => record.dimension === input.dimension,
  );
  const evidenceIds = [...new Set(
    records.map(record => record.evidenceId),
  )].sort();

  if (input.target.primaryObservationIds.length === 0) {
    return Object.freeze({
      dimension: input.dimension,
      state: 'unknown' as const,
      evidenceIds: Object.freeze(evidenceIds),
      coveredObservationIds: Object.freeze([]),
      uncoveredPrimaryObservationIds: Object.freeze([]),
      conflictingEvidenceIds: Object.freeze(
        evidenceIds.filter(id => input.invalidEvidenceIds.has(id)),
      ),
    });
  }

  const targetSet = new Set(input.target.primaryObservationIds);
  const covered = new Set<string>();
  const conflictingEvidenceIds = new Set<string>();
  let hasVerified = false;
  let hasPartial = false;
  let hasUnknown = false;
  let hasConflict = false;

  for (const record of records) {
    if (input.invalidEvidenceIds.has(record.evidenceId)) {
      conflictingEvidenceIds.add(record.evidenceId);
      hasConflict = true;
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
      case 'unknown':
        hasUnknown = true;
        break;
      case 'conflicting':
        hasConflict = true;
        conflictingEvidenceIds.add(record.evidenceId);
        break;
    }
  }

  const uncovered = input.target.primaryObservationIds.filter(
    observationId => !covered.has(observationId),
  );

  let state: AlbumCalibrationEvidenceState;
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
    evidenceIds: Object.freeze(evidenceIds),
    coveredObservationIds: Object.freeze([...covered].sort()),
    uncoveredPrimaryObservationIds: Object.freeze([...uncovered].sort()),
    conflictingEvidenceIds: Object.freeze(
      [...conflictingEvidenceIds].sort(),
    ),
  });
}

export function reviewAlbumNormalizationCalibrationEvidence(
  input: Readonly<{
    normalizationInput: AlbumNormalizationInput;
    records: readonly AlbumNormalizationCalibrationEvidenceRecord[];
  }>,
): AlbumNormalizationCalibrationEvidenceReview {
  const target =
    buildAlbumNormalizationCalibrationReviewTarget(
      input.normalizationInput,
    );
  const dataIssues: string[] = [];
  const invalidEvidenceIds = new Set<string>();
  const seenEvidenceIds = new Set<string>();

  for (const record of input.records) {
    if (record.recordVersion
      !== ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION) {
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

    if (record.targetFingerprint !== target.fingerprint) {
      dataIssues.push(
        `target-fingerprint-mismatch:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
    if (record.sourceRef.trim() === '') {
      dataIssues.push(
        `source-ref-missing:${record.evidenceId}`,
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

    const targetSet = new Set(target.primaryObservationIds);
    const unknownObservationIds = covered.filter(
      observationId => !targetSet.has(observationId),
    );
    if (unknownObservationIds.length > 0) {
      dataIssues.push(
        `covered-observation-not-primary:${record.evidenceId}`,
      );
      invalidEvidenceIds.add(record.evidenceId);
    }
  }

  const periodCoverage = reviewDimension({
    dimension: 'period-coverage',
    target,
    records: input.records,
    invalidEvidenceIds,
  });
  const releaseScopeCompleteness = reviewDimension({
    dimension: 'release-scope-completeness',
    target,
    records: input.records,
    invalidEvidenceIds,
  });
  const revisionStability = reviewDimension({
    dimension: 'revision-stability',
    target,
    records: input.records,
    invalidEvidenceIds,
  });

  const evidence: AlbumNormalizationCalibrationEvidence =
    Object.freeze({
      periodCoverage: Object.freeze({
        state: periodCoverage.state,
        evidenceIds: periodCoverage.evidenceIds,
      }),
      releaseScopeCompleteness: Object.freeze({
        state: releaseScopeCompleteness.state,
        evidenceIds: releaseScopeCompleteness.evidenceIds,
      }),
      revisionStability: Object.freeze({
        state: revisionStability.state,
        evidenceIds: revisionStability.evidenceIds,
      }),
    });

  const readyForCalibrationGate =
    dataIssues.length === 0
    && periodCoverage.state === 'verified'
    && releaseScopeCompleteness.state === 'verified'
    && revisionStability.state === 'verified';

  return Object.freeze({
    contractVersion:
      ALBUM_NORMALIZATION_CALIBRATION_REVIEW_VERSION,
    target,
    dimensions: Object.freeze({
      periodCoverage,
      releaseScopeCompleteness,
      revisionStability,
    }),
    evidence,
    dataIssues: Object.freeze(
      [...new Set(dataIssues)].sort(),
    ),
    readyForCalibrationGate,
    numericNormalizationDefined: false as const,
    calibrationRunAuthorized: false as const,
    scoreFieldsPresent: false as const,
  });
}
