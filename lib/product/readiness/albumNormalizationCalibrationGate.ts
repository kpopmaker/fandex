import type {
  AlbumNormalizationInput,
} from '../contracts/albumNormalizationInput';

export const ALBUM_NORMALIZATION_CALIBRATION_GATE_VERSION =
  'album-normalization-calibration-gate-v1' as const;

export type AlbumCalibrationEvidenceState =
  | 'verified'
  | 'partial'
  | 'unknown'
  | 'conflicting';

export type AlbumCalibrationEvidence = Readonly<{
  state: AlbumCalibrationEvidenceState;
  evidenceIds: readonly string[];
}>;

export type AlbumNormalizationCalibrationEvidence = Readonly<{
  periodCoverage: AlbumCalibrationEvidence;
  releaseScopeCompleteness: AlbumCalibrationEvidence;
  revisionStability: AlbumCalibrationEvidence;
}>;

export const UNKNOWN_ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE:
  AlbumNormalizationCalibrationEvidence = Object.freeze({
    periodCoverage: Object.freeze({
      state: 'unknown' as const,
      evidenceIds: Object.freeze([]),
    }),
    releaseScopeCompleteness: Object.freeze({
      state: 'unknown' as const,
      evidenceIds: Object.freeze([]),
    }),
    revisionStability: Object.freeze({
      state: 'unknown' as const,
      evidenceIds: Object.freeze([]),
    }),
  });

export type AlbumNormalizationCalibrationCheck =
  | 'production-history-available'
  | 'primary-provider-production-authorized'
  | 'normalization-input-usable'
  | 'primary-candidate-present'
  | 'normalization-input-conflict-free'
  | 'period-coverage-verified'
  | 'release-scope-completeness-verified'
  | 'revision-stability-verified';

export type AlbumNormalizationCalibrationGate = Readonly<{
  contractVersion:
    typeof ALBUM_NORMALIZATION_CALIBRATION_GATE_VERSION;
  status: 'eligible-for-methodology-design' | 'blocked';
  checks: Readonly<Record<AlbumNormalizationCalibrationCheck, boolean>>;
  blockers: readonly AlbumNormalizationCalibrationCheck[];
  evidence: AlbumNormalizationCalibrationEvidence;
  arbitraryThresholdDefined: false;
  minimumHistoryLengthDefined: false;
  numericNormalizationDefined: false;
  calibrationRunAuthorized: false;
  normalizedValue: null;
  scoreFieldsPresent: false;
}>;

function verifiedEvidence(
  evidence: AlbumCalibrationEvidence,
): boolean {
  return evidence.state === 'verified'
    && evidence.evidenceIds.length > 0
    && evidence.evidenceIds.every(value => value.trim() !== '');
}

export function evaluateAlbumNormalizationCalibrationGate(
  input: Readonly<{
    normalizationInput: AlbumNormalizationInput;
    productionAuthorizedProviderIds: readonly string[];
    historyState:
      | 'production-history-available'
      | 'research-only'
      | 'absent';
    evidence?: AlbumNormalizationCalibrationEvidence;
  }>,
): AlbumNormalizationCalibrationGate {
  const evidence =
    input.evidence
    ?? UNKNOWN_ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE;

  const checks: Record<
    AlbumNormalizationCalibrationCheck,
    boolean
  > = {
    'production-history-available':
      input.historyState === 'production-history-available',
    'primary-provider-production-authorized':
      input.productionAuthorizedProviderIds.includes('circle-chart'),
    'normalization-input-usable':
      input.normalizationInput.inputSetUsable,
    'primary-candidate-present':
      input.normalizationInput.primaryCandidateObservationIds.length > 0,
    'normalization-input-conflict-free':
      input.normalizationInput.blockedObservationIds.length === 0,
    'period-coverage-verified':
      verifiedEvidence(evidence.periodCoverage),
    'release-scope-completeness-verified':
      verifiedEvidence(evidence.releaseScopeCompleteness),
    'revision-stability-verified':
      verifiedEvidence(evidence.revisionStability),
  };

  const blockers = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([check]) =>
      check as AlbumNormalizationCalibrationCheck);

  return Object.freeze({
    contractVersion:
      ALBUM_NORMALIZATION_CALIBRATION_GATE_VERSION,
    status: blockers.length === 0
      ? 'eligible-for-methodology-design' as const
      : 'blocked' as const,
    checks: Object.freeze(checks),
    blockers: Object.freeze(blockers),
    evidence: Object.freeze({
      periodCoverage: Object.freeze({
        state: evidence.periodCoverage.state,
        evidenceIds: Object.freeze([
          ...evidence.periodCoverage.evidenceIds,
        ]),
      }),
      releaseScopeCompleteness: Object.freeze({
        state: evidence.releaseScopeCompleteness.state,
        evidenceIds: Object.freeze([
          ...evidence.releaseScopeCompleteness.evidenceIds,
        ]),
      }),
      revisionStability: Object.freeze({
        state: evidence.revisionStability.state,
        evidenceIds: Object.freeze([
          ...evidence.revisionStability.evidenceIds,
        ]),
      }),
    }),
    arbitraryThresholdDefined: false as const,
    minimumHistoryLengthDefined: false as const,
    numericNormalizationDefined: false as const,
    calibrationRunAuthorized: false as const,
    normalizedValue: null,
    scoreFieldsPresent: false as const,
  });
}
