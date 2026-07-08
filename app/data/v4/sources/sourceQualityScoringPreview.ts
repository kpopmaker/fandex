import { getCurrentSourceProviderSnapshotFixture } from './sourceProviderSnapshotFixture';
import { getSourceVariableSignalCandidates } from './sourceSignalCandidateMapper';
import type {
  FandexNormalizedSourceItem,
  FandexSourceTrustLevel,
  FandexSourceVariableSignalCandidate,
} from './sourceIngestionTypes';
import type {
  FandexSourceCandidateQualityScore,
  FandexSourceItemQualityScore,
  FandexSourceQualityFactor,
  FandexSourceQualityFactorScores,
  FandexSourceQualityGrade,
  FandexSourceQualityScoringSummary,
} from './sourceQualityScoringTypes';

export type FandexSourceQualityScoringShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-source-quality-scores'
    | 'empty-candidate-quality-scores'
    | 'invalid-source-quality-score'
    | 'invalid-candidate-quality-score'
    | 'invalid-quality-grade'
    | 'missing-source-id'
    | 'duplicate-candidate-key'
    | 'invalid-summary-count'
    | 'duplicate-top-source-id'
    | 'duplicate-weak-source-id';
  message: string;
  sourceId?: string;
  candidateKey?: string;
};

export type FandexSourceQualityScoringShapeCheckResult = {
  isValid: boolean;
  sourceItemCount: number;
  candidateCount: number;
  issues: FandexSourceQualityScoringShapeCheckIssue[];
};

const qualityReferenceDate = '2026-07-08T00:00:00.000Z';

const allowedQualityGrades: readonly FandexSourceQualityGrade[] = [
  'excellent',
  'good',
  'watch',
  'weak',
  'blocked',
];

function clampScore(score: number) {
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getTrustScore(trustLevel: FandexSourceTrustLevel) {
  if (trustLevel === 'high') {
    return 95;
  }

  if (trustLevel === 'medium') {
    return 82;
  }

  if (trustLevel === 'low') {
    return 58;
  }

  return 64;
}

function getFreshnessScore(publishedAt: string) {
  const publishedTime = Date.parse(publishedAt);
  const referenceTime = Date.parse(qualityReferenceDate);

  if (!Number.isFinite(publishedTime) || !Number.isFinite(referenceTime)) {
    return 45;
  }

  const ageInDays = Math.max(
    0,
    (referenceTime - publishedTime) / (1000 * 60 * 60 * 24),
  );

  if (ageInDays <= 2) {
    return 92;
  }

  if (ageInDays <= 5) {
    return 78;
  }

  if (ageInDays <= 14) {
    return 64;
  }

  return 48;
}

function getSentimentScore(item: FandexNormalizedSourceItem) {
  if (item.sentiment === 'positive') {
    return 86;
  }

  if (item.sentiment === 'neutral') {
    return 74;
  }

  if (item.sentiment === 'mixed') {
    return 52;
  }

  if (item.sentiment === 'negative') {
    return 34;
  }

  return 58;
}

function getProviderScore(item: FandexNormalizedSourceItem) {
  if (item.provider === 'manual-preview') {
    return 48;
  }

  if (item.contentType === 'risk-note') {
    return 56;
  }

  return 70;
}

function getSourceQualityWarnings(item: FandexNormalizedSourceItem) {
  const warnings: string[] = [];

  if (item.trustLevel === 'preview') {
    warnings.push('preview trust level only');
  }

  if (item.sentiment === 'negative' || item.sentiment === 'mixed') {
    warnings.push('sentiment requires review');
  }

  if (item.contentType === 'risk-note') {
    warnings.push('risk-note should remain read-only');
  }

  if (!item.sourceUrl) {
    warnings.push('sourceUrl is not available in fixture');
  }

  return warnings;
}

function getWarningScore(warnings: string[]) {
  return clampScore(100 - warnings.length * 12);
}

function getWeightedQualityScore(factorScores: FandexSourceQualityFactorScores) {
  return clampScore(
    factorScores.trust * 0.2
      + factorScores.relevance * 0.22
      + factorScores.engagement * 0.18
      + factorScores.freshness * 0.16
      + factorScores.sentiment * 0.12
      + factorScores.provider * 0.06
      + factorScores.warning * 0.06,
  );
}

export function getSourceQualityGrade(
  score: number,
  warnings: string[] = [],
): FandexSourceQualityGrade {
  const hasCriticalWarning = warnings.some((warning) =>
    warning.toLowerCase().includes('risk-note'),
  );

  if (hasCriticalWarning && score < 55) {
    return 'blocked';
  }

  if (score >= 85) {
    return 'excellent';
  }

  if (score >= 70) {
    return 'good';
  }

  if (score >= 50) {
    return 'watch';
  }

  if (score >= 30) {
    return 'weak';
  }

  return 'blocked';
}

export function getSourceQualityGradeLabel(grade: FandexSourceQualityGrade) {
  const labels: Record<FandexSourceQualityGrade, string> = {
    excellent: 'Excellent',
    good: 'Good',
    watch: 'Watch',
    weak: 'Weak',
    blocked: 'Blocked',
  };

  return labels[grade];
}

export function getSourceQualityFactorLabel(
  factor: FandexSourceQualityFactor,
) {
  const labels: Record<FandexSourceQualityFactor, string> = {
    trust: 'Trust',
    relevance: 'Relevance',
    engagement: 'Engagement',
    freshness: 'Freshness',
    sentiment: 'Sentiment',
    provider: 'Provider',
    warning: 'Warning',
  };

  return labels[factor];
}

export function scoreSourceItemQuality(
  item: FandexNormalizedSourceItem,
): FandexSourceItemQualityScore {
  const warnings = getSourceQualityWarnings(item);
  const factorScores: FandexSourceQualityFactorScores = {
    trust: getTrustScore(item.trustLevel),
    relevance: clampScore(item.relevanceScore),
    engagement: clampScore(item.engagementScore),
    freshness: getFreshnessScore(item.publishedAt),
    sentiment: getSentimentScore(item),
    provider: getProviderScore(item),
    warning: getWarningScore(warnings),
  };
  const qualityScore = getWeightedQualityScore(factorScores);
  const qualityGrade = getSourceQualityGrade(qualityScore, warnings);

  return {
    sourceId: item.sourceId,
    provider: item.provider,
    artistIds: item.artistIds,
    contentType: item.contentType,
    qualityScore,
    qualityGrade,
    factorScores,
    warnings,
    summaryLabel: `${item.provider} / ${item.contentType} quality preview`,
    summaryNote:
      'Read-only source quality preview. Not connected to FANDEX scoring.',
    previewOnly: true,
  };
}

export function scoreSourceCandidateQuality(
  candidate: FandexSourceVariableSignalCandidate,
  sourceItem: FandexNormalizedSourceItem,
): FandexSourceCandidateQualityScore {
  const sourceQuality = scoreSourceItemQuality(sourceItem);
  const confidenceScore = getTrustScore(candidate.confidence);
  const warnings = [...sourceQuality.warnings];
  const blendedQualityScore = clampScore(
    candidate.candidateScore * 0.42
      + confidenceScore * 0.18
      + sourceQuality.qualityScore * 0.4,
  );
  const qualityGrade = getSourceQualityGrade(blendedQualityScore, warnings);

  return {
    candidateKey: `${candidate.sourceId}::${candidate.artistId}::${candidate.variableKey}`,
    sourceId: candidate.sourceId,
    artistId: candidate.artistId,
    variableKey: candidate.variableKey,
    candidateScore: candidate.candidateScore,
    confidenceScore,
    sourceQualityScore: sourceQuality.qualityScore,
    blendedQualityScore,
    qualityGrade,
    warnings,
    summaryLabel: `${candidate.artistId} / ${candidate.variableKey} quality preview`,
    summaryNote:
      'Read-only candidate quality preview. Not connected to FANDEX scoring.',
    previewOnly: true,
  };
}

function getDefaultSourceItems() {
  return getCurrentSourceProviderSnapshotFixture().sourceItems;
}

function getSourceItemMap(items: FandexNormalizedSourceItem[]) {
  return new Map(items.map((item) => [item.sourceId, item]));
}

export function getSourceQualityScores(
  items: FandexNormalizedSourceItem[] = getDefaultSourceItems(),
) {
  return items.map(scoreSourceItemQuality);
}

export function getSourceCandidateQualityScores(
  items: FandexNormalizedSourceItem[] = getDefaultSourceItems(),
) {
  const sourceItemMap = getSourceItemMap(items);

  return getSourceVariableSignalCandidates(items)
    .map((candidate) => {
      const sourceItem = sourceItemMap.get(candidate.sourceId);

      return sourceItem
        ? scoreSourceCandidateQuality(candidate, sourceItem)
        : null;
    })
    .filter(
      (score): score is FandexSourceCandidateQualityScore => score !== null,
    );
}

function getGradeCounts(
  scores: Array<{ qualityGrade: FandexSourceQualityGrade }>,
) {
  return {
    excellentCount: scores.filter((score) => score.qualityGrade === 'excellent')
      .length,
    goodCount: scores.filter((score) => score.qualityGrade === 'good').length,
    watchCount: scores.filter((score) => score.qualityGrade === 'watch').length,
    weakCount: scores.filter((score) => score.qualityGrade === 'weak').length,
    blockedCount: scores.filter((score) => score.qualityGrade === 'blocked')
      .length,
  };
}

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort();
}

export function getSourceQualityScoringSummary(
  items: FandexNormalizedSourceItem[] = getDefaultSourceItems(),
): FandexSourceQualityScoringSummary {
  const sourceQualityScores = getSourceQualityScores(items);
  const candidateQualityScores = getSourceCandidateQualityScores(items);
  const gradeCounts = getGradeCounts(sourceQualityScores);
  const warningCount = [
    ...sourceQualityScores.flatMap((score) => score.warnings),
    ...candidateQualityScores.flatMap((score) => score.warnings),
  ].length;
  const sortedSourceScores = [...sourceQualityScores].sort(
    (first, second) => second.qualityScore - first.qualityScore
      || first.sourceId.localeCompare(second.sourceId),
  );
  const weakSourceIds = sourceQualityScores
    .filter(
      (score) =>
        score.qualityGrade === 'weak'
        || score.qualityGrade === 'blocked'
        || score.qualityGrade === 'watch',
    )
    .map((score) => score.sourceId);

  return {
    sourceItemCount: sourceQualityScores.length,
    candidateCount: candidateQualityScores.length,
    averageSourceQualityScore: getAverage(
      sourceQualityScores.map((score) => score.qualityScore),
    ),
    averageCandidateQualityScore: getAverage(
      candidateQualityScores.map((score) => score.blendedQualityScore),
    ),
    ...gradeCounts,
    warningCount,
    topSourceIds: sortedSourceScores.slice(0, 5).map((score) => score.sourceId),
    weakSourceIds: getUniqueValues(weakSourceIds),
    summaryLabel: 'source quality scoring preview',
    summaryNote:
      'Fixture-only quality scoring preview. This is not used by FANDEX scoring.',
    previewOnly: true,
  };
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

function isAllowedQualityGrade(
  grade: string,
): grade is FandexSourceQualityGrade {
  return allowedQualityGrades.includes(grade as FandexSourceQualityGrade);
}

export function runSourceQualityScoringShapeCheck(
  items: FandexNormalizedSourceItem[] = getDefaultSourceItems(),
): FandexSourceQualityScoringShapeCheckResult {
  const issues: FandexSourceQualityScoringShapeCheckIssue[] = [];
  const sourceQualityScores = getSourceQualityScores(items);
  const candidateQualityScores = getSourceCandidateQualityScores(items);
  const summary = getSourceQualityScoringSummary(items);

  if (sourceQualityScores.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-source-quality-scores',
      message: 'Source quality scores must not be empty.',
    });
  }

  if (candidateQualityScores.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-candidate-quality-scores',
      message: 'Candidate quality scores must not be empty.',
    });
  }

  sourceQualityScores.forEach((score) => {
    if (score.sourceId.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-source-id',
        message: 'Source quality score sourceId must not be empty.',
      });
    }

    if (!Number.isFinite(score.qualityScore)) {
      issues.push({
        severity: 'error',
        code: 'invalid-source-quality-score',
        message: `Source qualityScore must be finite: ${score.sourceId}`,
        sourceId: score.sourceId,
      });
    }

    if (!isAllowedQualityGrade(score.qualityGrade)) {
      issues.push({
        severity: 'error',
        code: 'invalid-quality-grade',
        message: `Source qualityGrade is not allowed: ${score.sourceId}`,
        sourceId: score.sourceId,
      });
    }
  });

  candidateQualityScores.forEach((score) => {
    if (!Number.isFinite(score.blendedQualityScore)) {
      issues.push({
        severity: 'error',
        code: 'invalid-candidate-quality-score',
        message: `Candidate blendedQualityScore must be finite: ${score.candidateKey}`,
        sourceId: score.sourceId,
        candidateKey: score.candidateKey,
      });
    }

    if (!isAllowedQualityGrade(score.qualityGrade)) {
      issues.push({
        severity: 'error',
        code: 'invalid-quality-grade',
        message: `Candidate qualityGrade is not allowed: ${score.candidateKey}`,
        sourceId: score.sourceId,
        candidateKey: score.candidateKey,
      });
    }
  });

  if (hasDuplicateValues(candidateQualityScores.map((score) => score.candidateKey))) {
    issues.push({
      severity: 'error',
      code: 'duplicate-candidate-key',
      message: 'Candidate quality score keys must be unique.',
    });
  }

  if (
    summary.sourceItemCount !== sourceQualityScores.length
    || summary.candidateCount !== candidateQualityScores.length
  ) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Quality scoring summary counts must match score arrays.',
    });
  }

  if (hasDuplicateValues(summary.topSourceIds)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-top-source-id',
      message: 'topSourceIds must be unique.',
    });
  }

  if (hasDuplicateValues(summary.weakSourceIds)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-weak-source-id',
      message: 'weakSourceIds must be unique.',
    });
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    sourceItemCount: sourceQualityScores.length,
    candidateCount: candidateQualityScores.length,
    issues,
  };
}
