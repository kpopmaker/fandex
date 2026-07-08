import {
  getSourceCandidateQualityScores,
  getSourceQualityGradeLabel,
  getSourceQualityScores,
  getSourceQualityScoringSummary,
} from './sourceQualityScoringPreview';
import type {
  FandexCandidateEligibilityDecision,
  FandexSourceEligibilityDecision,
  FandexSourceEligibilityReasonCode,
  FandexSourceEligibilityStatus,
  FandexSourceEligibilitySummary,
} from './sourceEligibilityTypes';
import type { FandexNormalizedSourceItem } from './sourceIngestionTypes';
import type {
  FandexSourceCandidateQualityScore,
  FandexSourceQualityGrade,
} from './sourceQualityScoringTypes';

export type FandexSourceEligibilityShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-source-decisions'
    | 'empty-candidate-decisions'
    | 'invalid-eligibility-status'
    | 'missing-reason-codes'
    | 'missing-source-id'
    | 'duplicate-candidate-key'
    | 'invalid-summary-count'
    | 'duplicate-eligible-source-id'
    | 'duplicate-blocked-source-id'
    | 'duplicate-eligible-candidate-key'
    | 'duplicate-blocked-candidate-key'
    | 'invalid-score';
  message: string;
  sourceId?: string;
  candidateKey?: string;
};

export type FandexSourceEligibilityShapeCheckResult = {
  isValid: boolean;
  sourceDecisionCount: number;
  candidateDecisionCount: number;
  issues: FandexSourceEligibilityShapeCheckIssue[];
};

const allowedEligibilityStatuses: readonly FandexSourceEligibilityStatus[] = [
  'eligible',
  'review',
  'limited',
  'blocked',
];

function hasCriticalWarning(warnings: string[]) {
  return warnings.some((warning) => {
    const normalizedWarning = warning.toLowerCase();

    return normalizedWarning.includes('risk-note')
      || normalizedWarning.includes('missing source')
      || normalizedWarning.includes('duplicate candidate');
  });
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

function getUniqueValues<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

function isAllowedEligibilityStatus(status: string) {
  return allowedEligibilityStatuses.includes(status as FandexSourceEligibilityStatus);
}

function getBaseQualityReasonCodes({
  qualityScore,
  qualityGrade,
  warnings,
}: {
  qualityScore: number;
  qualityGrade: FandexSourceQualityGrade;
  warnings: string[];
}): FandexSourceEligibilityReasonCode[] {
  const reasonCodes = new Set<FandexSourceEligibilityReasonCode>(['fixture_only']);

  if (qualityGrade === 'excellent' || qualityGrade === 'good') {
    reasonCodes.add('high_quality');
  }

  if (qualityGrade === 'weak' || qualityScore < 50) {
    reasonCodes.add('low_quality');
  }

  if (qualityGrade === 'blocked') {
    reasonCodes.add('blocked_grade');
  }

  if (qualityScore >= 70) {
    reasonCodes.add('trusted_provider');
  }

  if (qualityScore >= 65) {
    reasonCodes.add('fresh_source');
  }

  if (warnings.length > 0) {
    reasonCodes.add('warning_present');
  }

  return Array.from(reasonCodes);
}

export function getSourceEligibilityStatusFromQuality(
  qualityScore: number,
  qualityGrade: FandexSourceQualityGrade,
  warnings: string[] = [],
): FandexSourceEligibilityStatus {
  if (qualityGrade === 'blocked' || hasCriticalWarning(warnings)) {
    return 'blocked';
  }

  if (qualityGrade === 'weak' || qualityScore < 50) {
    return 'limited';
  }

  if (qualityGrade === 'watch') {
    return warnings.length > 0 ? 'limited' : 'review';
  }

  if (qualityGrade === 'good' && warnings.length > 0) {
    return 'review';
  }

  if ((qualityGrade === 'excellent' || qualityGrade === 'good') && warnings.length === 0) {
    return 'eligible';
  }

  return 'review';
}

export function getCandidateEligibilityStatusFromQuality(
  candidateQuality: FandexSourceCandidateQualityScore,
): FandexSourceEligibilityStatus {
  if (
    candidateQuality.qualityGrade === 'blocked'
    || hasCriticalWarning(candidateQuality.warnings)
  ) {
    return 'blocked';
  }

  if (
    candidateQuality.blendedQualityScore < 50
    || candidateQuality.sourceQualityScore < 50
    || candidateQuality.confidenceScore < 58
  ) {
    return 'limited';
  }

  if (
    candidateQuality.qualityGrade === 'watch'
    || candidateQuality.warnings.length > 0
  ) {
    return 'review';
  }

  if (
    candidateQuality.blendedQualityScore >= 70
    && candidateQuality.confidenceScore >= 64
  ) {
    return 'eligible';
  }

  return 'review';
}

function getCandidateReasonCodes(
  candidateQuality: FandexSourceCandidateQualityScore,
): FandexSourceEligibilityReasonCode[] {
  const reasonCodes = new Set<FandexSourceEligibilityReasonCode>(
    getBaseQualityReasonCodes({
      qualityScore: candidateQuality.blendedQualityScore,
      qualityGrade: candidateQuality.qualityGrade,
      warnings: candidateQuality.warnings,
    }),
  );

  if (candidateQuality.confidenceScore >= 64) {
    reasonCodes.add('sufficient_confidence');
  } else {
    reasonCodes.add('low_confidence');
  }

  if (candidateQuality.sourceQualityScore < 50) {
    reasonCodes.add('missing_source');
  }

  return Array.from(reasonCodes);
}

export function getSourceEligibilityStatusLabel(
  status: FandexSourceEligibilityStatus,
) {
  const labels: Record<FandexSourceEligibilityStatus, string> = {
    eligible: '반영 후보',
    review: '검토 필요',
    limited: '제한 후보',
    blocked: '제외 후보',
  };

  return labels[status];
}

export function getSourceEligibilityReasonLabel(
  reasonCode: FandexSourceEligibilityReasonCode,
) {
  const labels: Record<FandexSourceEligibilityReasonCode, string> = {
    high_quality: '품질 점수 높음',
    sufficient_confidence: '신뢰도 충분',
    fresh_source: '최신 source',
    trusted_provider: 'provider 품질 양호',
    low_quality: '품질 점수 낮음',
    low_confidence: '신뢰도 낮음',
    stale_source: '오래된 source',
    warning_present: 'warning 존재',
    blocked_grade: '차단 등급',
    missing_source: 'source 확인 필요',
    duplicate_candidate: '중복 candidate',
    fixture_only: 'fixture 기반 preview',
  };

  return labels[reasonCode];
}

export function getSourceEligibilityDecisions(
  items?: FandexNormalizedSourceItem[],
): FandexSourceEligibilityDecision[] {
  return getSourceQualityScores(items).map((sourceQuality) => {
    const eligibilityStatus = getSourceEligibilityStatusFromQuality(
      sourceQuality.qualityScore,
      sourceQuality.qualityGrade,
      sourceQuality.warnings,
    );
    const reasonCodes = getBaseQualityReasonCodes({
      qualityScore: sourceQuality.qualityScore,
      qualityGrade: sourceQuality.qualityGrade,
      warnings: sourceQuality.warnings,
    });

    return {
      sourceId: sourceQuality.sourceId,
      provider: sourceQuality.provider,
      qualityScore: sourceQuality.qualityScore,
      qualityGrade: sourceQuality.qualityGrade,
      eligibilityStatus,
      reasonCodes,
      warnings: sourceQuality.warnings,
      summaryLabel: `${sourceQuality.sourceId} eligibility preview`,
      summaryNote:
        `Read-only eligibility preview from ${getSourceQualityGradeLabel(
          sourceQuality.qualityGrade,
        )} quality. Not connected to FANDEX scoring.`,
      previewOnly: true,
    };
  });
}

export function getCandidateEligibilityDecisions(
  items?: FandexNormalizedSourceItem[],
): FandexCandidateEligibilityDecision[] {
  const candidateKeys = new Set<string>();

  return getSourceCandidateQualityScores(items).map((candidateQuality) => {
    const warnings = [...candidateQuality.warnings];

    if (candidateKeys.has(candidateQuality.candidateKey)) {
      warnings.push('duplicate candidate key');
    }

    candidateKeys.add(candidateQuality.candidateKey);

    const eligibilityStatus = getCandidateEligibilityStatusFromQuality({
      ...candidateQuality,
      warnings,
    });
    const reasonCodes = getCandidateReasonCodes({
      ...candidateQuality,
      warnings,
    });

    if (warnings.some((warning) => warning.includes('duplicate candidate'))) {
      reasonCodes.push('duplicate_candidate');
    }

    return {
      candidateKey: candidateQuality.candidateKey,
      sourceId: candidateQuality.sourceId,
      artistId: candidateQuality.artistId,
      variableKey: candidateQuality.variableKey,
      candidateScore: candidateQuality.candidateScore,
      confidenceScore: candidateQuality.confidenceScore,
      sourceQualityScore: candidateQuality.sourceQualityScore,
      blendedQualityScore: candidateQuality.blendedQualityScore,
      qualityGrade: candidateQuality.qualityGrade,
      eligibilityStatus,
      reasonCodes: getUniqueValues(reasonCodes),
      warnings,
      summaryLabel: `${candidateQuality.artistId} / ${candidateQuality.variableKey} eligibility preview`,
      summaryNote:
        'Read-only candidate eligibility preview. Not connected to FANDEX scoring.',
      previewOnly: true,
    };
  });
}

function getStatusCount<T extends { eligibilityStatus: FandexSourceEligibilityStatus }>(
  decisions: T[],
  status: FandexSourceEligibilityStatus,
) {
  return decisions.filter((decision) => decision.eligibilityStatus === status).length;
}

export function getSourceEligibilitySummary(
  items?: FandexNormalizedSourceItem[],
): FandexSourceEligibilitySummary {
  const sourceDecisions = getSourceEligibilityDecisions(items);
  const candidateDecisions = getCandidateEligibilityDecisions(items);
  const qualitySummary = getSourceQualityScoringSummary(items);

  return {
    sourceDecisionCount: sourceDecisions.length,
    candidateDecisionCount: candidateDecisions.length,
    eligibleSourceCount: getStatusCount(sourceDecisions, 'eligible'),
    reviewSourceCount: getStatusCount(sourceDecisions, 'review'),
    limitedSourceCount: getStatusCount(sourceDecisions, 'limited'),
    blockedSourceCount: getStatusCount(sourceDecisions, 'blocked'),
    eligibleCandidateCount: getStatusCount(candidateDecisions, 'eligible'),
    reviewCandidateCount: getStatusCount(candidateDecisions, 'review'),
    limitedCandidateCount: getStatusCount(candidateDecisions, 'limited'),
    blockedCandidateCount: getStatusCount(candidateDecisions, 'blocked'),
    warningCount: [
      ...sourceDecisions.flatMap((decision) => decision.warnings),
      ...candidateDecisions.flatMap((decision) => decision.warnings),
    ].length,
    eligibleSourceIds: getUniqueValues(
      sourceDecisions
        .filter((decision) => decision.eligibilityStatus === 'eligible')
        .map((decision) => decision.sourceId),
    ),
    blockedSourceIds: getUniqueValues(
      sourceDecisions
        .filter((decision) => decision.eligibilityStatus === 'blocked')
        .map((decision) => decision.sourceId),
    ),
    eligibleCandidateKeys: getUniqueValues(
      candidateDecisions
        .filter((decision) => decision.eligibilityStatus === 'eligible')
        .map((decision) => decision.candidateKey),
    ),
    blockedCandidateKeys: getUniqueValues(
      candidateDecisions
        .filter((decision) => decision.eligibilityStatus === 'blocked')
        .map((decision) => decision.candidateKey),
    ),
    summaryLabel: 'source eligibility preview',
    summaryNote:
      `${qualitySummary.summaryLabel}. Eligibility decisions are read-only and not used by FANDEX scoring.`,
    previewOnly: true,
  };
}

function validateDecisionNumbers(
  decision:
    | FandexSourceEligibilityDecision
    | FandexCandidateEligibilityDecision,
) {
  const values = 'blendedQualityScore' in decision
    ? [
        decision.candidateScore,
        decision.confidenceScore,
        decision.sourceQualityScore,
        decision.blendedQualityScore,
      ]
    : [decision.qualityScore];

  return values.every(Number.isFinite);
}

export function runSourceEligibilityShapeCheck(
  items?: FandexNormalizedSourceItem[],
): FandexSourceEligibilityShapeCheckResult {
  const issues: FandexSourceEligibilityShapeCheckIssue[] = [];
  const sourceDecisions = getSourceEligibilityDecisions(items);
  const candidateDecisions = getCandidateEligibilityDecisions(items);
  const summary = getSourceEligibilitySummary(items);

  if (sourceDecisions.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-source-decisions',
      message: 'Source eligibility decisions must not be empty.',
    });
  }

  if (candidateDecisions.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-candidate-decisions',
      message: 'Candidate eligibility decisions must not be empty.',
    });
  }

  sourceDecisions.forEach((decision) => {
    if (decision.sourceId.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-source-id',
        message: 'Source eligibility decision sourceId must not be empty.',
      });
    }

    if (!isAllowedEligibilityStatus(decision.eligibilityStatus)) {
      issues.push({
        severity: 'error',
        code: 'invalid-eligibility-status',
        message: `Invalid source eligibilityStatus: ${decision.sourceId}`,
        sourceId: decision.sourceId,
      });
    }

    if (decision.reasonCodes.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-reason-codes',
        message: `Source eligibility reasonCodes must not be empty: ${decision.sourceId}`,
        sourceId: decision.sourceId,
      });
    }

    if (!validateDecisionNumbers(decision)) {
      issues.push({
        severity: 'error',
        code: 'invalid-score',
        message: `Source eligibility score values must be finite: ${decision.sourceId}`,
        sourceId: decision.sourceId,
      });
    }
  });

  candidateDecisions.forEach((decision) => {
    if (!isAllowedEligibilityStatus(decision.eligibilityStatus)) {
      issues.push({
        severity: 'error',
        code: 'invalid-eligibility-status',
        message: `Invalid candidate eligibilityStatus: ${decision.candidateKey}`,
        sourceId: decision.sourceId,
        candidateKey: decision.candidateKey,
      });
    }

    if (decision.reasonCodes.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-reason-codes',
        message: `Candidate eligibility reasonCodes must not be empty: ${decision.candidateKey}`,
        sourceId: decision.sourceId,
        candidateKey: decision.candidateKey,
      });
    }

    if (!validateDecisionNumbers(decision)) {
      issues.push({
        severity: 'error',
        code: 'invalid-score',
        message: `Candidate eligibility score values must be finite: ${decision.candidateKey}`,
        sourceId: decision.sourceId,
        candidateKey: decision.candidateKey,
      });
    }
  });

  if (hasDuplicateValues(candidateDecisions.map((decision) => decision.candidateKey))) {
    issues.push({
      severity: 'error',
      code: 'duplicate-candidate-key',
      message: 'Candidate eligibility decision keys must be unique.',
    });
  }

  if (
    summary.sourceDecisionCount !== sourceDecisions.length
    || summary.candidateDecisionCount !== candidateDecisions.length
  ) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Eligibility summary counts must match decision arrays.',
    });
  }

  if (hasDuplicateValues(summary.eligibleSourceIds)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-eligible-source-id',
      message: 'eligibleSourceIds must be unique.',
    });
  }

  if (hasDuplicateValues(summary.blockedSourceIds)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-blocked-source-id',
      message: 'blockedSourceIds must be unique.',
    });
  }

  if (hasDuplicateValues(summary.eligibleCandidateKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-eligible-candidate-key',
      message: 'eligibleCandidateKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.blockedCandidateKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-blocked-candidate-key',
      message: 'blockedCandidateKeys must be unique.',
    });
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    sourceDecisionCount: sourceDecisions.length,
    candidateDecisionCount: candidateDecisions.length,
    issues,
  };
}
