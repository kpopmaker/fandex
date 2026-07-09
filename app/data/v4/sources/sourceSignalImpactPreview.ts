import type { FandexNormalizedSourceItem } from './sourceIngestionTypes';
import type { FandexSourceSignalApplicationPlan } from './sourceSignalApplicationTypes';
import {
  getSourceSignalApplicationGroups,
  getSourceSignalApplicationModeLabel,
  getSourceSignalApplicationPlans,
  getSourceSignalApplicationReasonLabel,
  getSourceSignalApplicationSummary,
  runSourceSignalApplicationShapeCheck,
} from './sourceSignalApplicationPreview';
import type {
  FandexSourceSignalImpactDirection,
  FandexSourceSignalImpactGroup,
  FandexSourceSignalImpactLevel,
  FandexSourceSignalImpactPreview,
  FandexSourceSignalImpactReasonCode,
  FandexSourceSignalImpactSummary,
} from './sourceSignalImpactTypes';

export type FandexSourceSignalImpactShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-impact-previews'
    | 'empty-impact-groups'
    | 'duplicate-impact-key'
    | 'duplicate-application-key'
    | 'invalid-impact-level'
    | 'invalid-impact-direction'
    | 'missing-reason-codes'
    | 'missing-artist-id'
    | 'missing-variable-key'
    | 'invalid-preview-signal-weight'
    | 'invalid-summary-count'
    | 'duplicate-top-impact-key'
    | 'duplicate-blocked-impact-key';
  message: string;
  impactKey?: string;
  applicationKey?: string;
};

export type FandexSourceSignalImpactShapeCheckResult = {
  isValid: boolean;
  impactCount: number;
  groupCount: number;
  issues: FandexSourceSignalImpactShapeCheckIssue[];
};

type FandexSourceSignalImpactGroupBucket = {
  groupKey: string;
  artistId: string;
  variableKey: FandexSourceSignalImpactPreview['variableKey'];
  impacts: FandexSourceSignalImpactPreview[];
};

const allowedImpactLevels: readonly FandexSourceSignalImpactLevel[] = [
  'strong',
  'moderate',
  'weak',
  'blocked',
  'skipped',
];

const allowedImpactDirections: readonly FandexSourceSignalImpactDirection[] = [
  'positive',
  'negative',
  'mixed',
  'neutral',
];

function clampPreviewSignalWeight(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getUniqueValues<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

function isAllowedImpactLevel(level: string) {
  return allowedImpactLevels.includes(level as FandexSourceSignalImpactLevel);
}

function isAllowedImpactDirection(direction: string) {
  return allowedImpactDirections.includes(direction as FandexSourceSignalImpactDirection);
}

function getImpactCount(
  impacts: FandexSourceSignalImpactPreview[],
  level: FandexSourceSignalImpactLevel,
) {
  return impacts.filter((impact) => impact.impactLevel === level).length;
}

function getPreviewSignalWeight(plan: FandexSourceSignalApplicationPlan) {
  if (plan.applicationMode === 'blocked' || plan.applicationMode === 'skipped') {
    return 0;
  }

  const rawWeight = (
    plan.candidateScore * 0.35
    + plan.confidenceScore * 0.25
    + plan.sourceQualityScore * 0.15
    + plan.blendedQualityScore * 0.25
  );

  if (plan.applicationMode === 'limited') {
    return clampPreviewSignalWeight(rawWeight * 0.5);
  }

  if (plan.applicationMode === 'review') {
    return clampPreviewSignalWeight(rawWeight * 0.7);
  }

  return clampPreviewSignalWeight(rawWeight);
}

export function getSourceSignalImpactLevelFromApplication(
  plan: FandexSourceSignalApplicationPlan,
): FandexSourceSignalImpactLevel {
  if (plan.applicationMode === 'ready' && plan.blendedQualityScore >= 80) {
    return 'strong';
  }

  if (plan.applicationMode === 'ready') {
    return 'moderate';
  }

  if (plan.applicationMode === 'review' || plan.applicationMode === 'limited') {
    return 'weak';
  }

  if (plan.applicationMode === 'blocked') {
    return 'blocked';
  }

  return 'skipped';
}

export function getSourceSignalImpactDirectionFromApplication(
  plan: FandexSourceSignalApplicationPlan,
): FandexSourceSignalImpactDirection {
  if (plan.applicationMode === 'ready') {
    return 'positive';
  }

  if (plan.applicationMode === 'blocked') {
    return 'negative';
  }

  if (plan.applicationMode === 'review' || plan.applicationMode === 'limited') {
    return 'mixed';
  }

  return 'neutral';
}

function getImpactReasonCodes(
  plan: FandexSourceSignalApplicationPlan,
): FandexSourceSignalImpactReasonCode[] {
  const reasonCodes = new Set<FandexSourceSignalImpactReasonCode>([
    'preview_weight_only',
    'no_score_delta',
    'fixture_only',
    'preview_only',
  ]);

  if (plan.applicationMode === 'ready') {
    reasonCodes.add('ready_application');
  }

  if (plan.applicationMode === 'review') {
    reasonCodes.add('review_application');
  }

  if (plan.applicationMode === 'limited') {
    reasonCodes.add('limited_application');
  }

  if (plan.applicationMode === 'blocked') {
    reasonCodes.add('blocked_application');
  }

  if (plan.blendedQualityScore >= 80) {
    reasonCodes.add('high_blended_quality');
  }

  if (plan.confidenceScore < 64) {
    reasonCodes.add('low_confidence');
  }

  if (plan.warnings.length > 0) {
    reasonCodes.add('warning_present');
  }

  return Array.from(reasonCodes).sort();
}

export function getSourceSignalImpactLevelLabel(
  level: FandexSourceSignalImpactLevel,
) {
  const labels: Record<FandexSourceSignalImpactLevel, string> = {
    strong: '강한 영향 후보',
    moderate: '보통 영향 후보',
    weak: '약한 영향 후보',
    blocked: '제외 후보',
    skipped: '스킵',
  };

  return labels[level];
}

export function getSourceSignalImpactDirectionLabel(
  direction: FandexSourceSignalImpactDirection,
) {
  const labels: Record<FandexSourceSignalImpactDirection, string> = {
    positive: '긍정 방향',
    negative: '부정 방향',
    mixed: '혼합 방향',
    neutral: '중립 방향',
  };

  return labels[direction];
}

export function getSourceSignalImpactReasonLabel(
  reasonCode: FandexSourceSignalImpactReasonCode,
) {
  const labels: Record<FandexSourceSignalImpactReasonCode, string> = {
    ready_application: '반영 준비 application',
    review_application: '검토 필요 application',
    limited_application: '제한 application',
    blocked_application: '제외 application',
    high_blended_quality: '높은 blended quality',
    low_confidence: '낮은 confidence',
    warning_present: 'warning 존재',
    preview_weight_only: 'preview weight 전용',
    no_score_delta: '실제 score delta 아님',
    fixture_only: 'fixture 기반 preview',
    preview_only: 'preview only',
  };

  return labels[reasonCode];
}

export function getSourceSignalImpactPreviews(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalImpactPreview[] {
  return getSourceSignalApplicationPlans(items).map((plan, index) => {
    const impactLevel = getSourceSignalImpactLevelFromApplication(plan);
    const impactDirection = getSourceSignalImpactDirectionFromApplication(plan);
    const previewSignalWeight = getPreviewSignalWeight(plan);
    const reasonCodes = getImpactReasonCodes(plan);
    const applicationReasonLabel = plan.reasonCodes[0]
      ? getSourceSignalApplicationReasonLabel(plan.reasonCodes[0])
      : 'application preview';

    return {
      impactKey: `${plan.applicationKey}::impact-preview::${index + 1}`,
      applicationKey: plan.applicationKey,
      candidateKey: plan.candidateKey,
      sourceId: plan.sourceId,
      artistId: plan.artistId,
      variableKey: plan.variableKey,
      applicationMode: plan.applicationMode,
      impactLevel,
      impactDirection,
      candidateScore: plan.candidateScore,
      confidenceScore: plan.confidenceScore,
      sourceQualityScore: plan.sourceQualityScore,
      blendedQualityScore: plan.blendedQualityScore,
      previewSignalWeight,
      reasonCodes,
      warnings: plan.warnings,
      summaryLabel:
        `${plan.artistId} / ${plan.variableKey} ${getSourceSignalImpactLevelLabel(
          impactLevel,
        )}`,
      summaryNote:
        `Read-only impact candidate from ${getSourceSignalApplicationModeLabel(
          plan.applicationMode,
        )} / ${applicationReasonLabel}. Preview signal weight is not a FANDEX score delta and is not connected to ranking, charts, artist scores, storage, or external APIs.`,
      previewOnly: true,
    };
  });
}

export function getSourceSignalImpactGroups(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalImpactGroup[] {
  const groupMap = new Map<string, FandexSourceSignalImpactGroupBucket>();

  getSourceSignalImpactPreviews(items).forEach((impact) => {
    const groupKey = `${impact.artistId}::${impact.variableKey}`;
    const existingGroup = groupMap.get(groupKey);

    if (existingGroup) {
      existingGroup.impacts.push(impact);
      return;
    }

    groupMap.set(groupKey, {
      groupKey,
      artistId: impact.artistId,
      variableKey: impact.variableKey,
      impacts: [impact],
    });
  });

  return Array.from(groupMap.values())
    .map(({ groupKey, artistId, variableKey, impacts }): FandexSourceSignalImpactGroup => {
      const sortedImpacts = [...impacts].sort(
        (first, second) =>
          second.previewSignalWeight - first.previewSignalWeight
          || first.impactKey.localeCompare(second.impactKey),
      );
      const blockedImpactKeys = sortedImpacts
        .filter((impact) => impact.impactLevel === 'blocked')
        .map((impact) => impact.impactKey)
        .slice(0, 5);

      return {
        groupKey,
        artistId,
        variableKey,
        impactCount: impacts.length,
        strongCount: getImpactCount(impacts, 'strong'),
        moderateCount: getImpactCount(impacts, 'moderate'),
        weakCount: getImpactCount(impacts, 'weak'),
        blockedCount: getImpactCount(impacts, 'blocked'),
        skippedCount: getImpactCount(impacts, 'skipped'),
        averagePreviewSignalWeight: getAverage(
          impacts.map((impact) => impact.previewSignalWeight),
        ),
        topImpactKeys: sortedImpacts
          .map((impact) => impact.impactKey)
          .slice(0, 5),
        blockedImpactKeys,
        warningCount: impacts.flatMap((impact) => impact.warnings).length,
        summaryLabel: `${artistId} / ${variableKey} impact preview group`,
        summaryNote:
          'Grouped read-only source signal impact candidates. Preview signal weight is not a FANDEX score delta.',
        previewOnly: true,
      };
    })
    .sort((first, second) => second.impactCount - first.impactCount
      || first.groupKey.localeCompare(second.groupKey));
}

export function getSourceSignalImpactSummary(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalImpactSummary {
  const impacts = getSourceSignalImpactPreviews(items);
  const groups = getSourceSignalImpactGroups(items);
  const applicationSummary = getSourceSignalApplicationSummary(items);
  const sortedImpacts = [...impacts].sort(
    (first, second) =>
      second.previewSignalWeight - first.previewSignalWeight
      || first.impactKey.localeCompare(second.impactKey),
  );

  return {
    impactCount: impacts.length,
    groupCount: groups.length,
    strongImpactCount: getImpactCount(impacts, 'strong'),
    moderateImpactCount: getImpactCount(impacts, 'moderate'),
    weakImpactCount: getImpactCount(impacts, 'weak'),
    blockedImpactCount: getImpactCount(impacts, 'blocked'),
    skippedImpactCount: getImpactCount(impacts, 'skipped'),
    artistCount: new Set(impacts.map((impact) => impact.artistId)).size,
    variableCount: new Set(impacts.map((impact) => impact.variableKey)).size,
    warningCount: impacts.flatMap((impact) => impact.warnings).length,
    topImpactKeys: sortedImpacts
      .map((impact) => impact.impactKey)
      .slice(0, 5),
    blockedImpactKeys: getUniqueValues(
      impacts
        .filter((impact) => impact.impactLevel === 'blocked')
        .map((impact) => impact.impactKey),
    ).slice(0, 5),
    summaryLabel: 'source signal impact preview',
    summaryNote:
      `${applicationSummary.summaryLabel}. Impact previews are fixture-based, read-only candidates and do not calculate or apply FANDEX score deltas.`,
    previewOnly: true,
  };
}

export function runSourceSignalImpactShapeCheck(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalImpactShapeCheckResult {
  const issues: FandexSourceSignalImpactShapeCheckIssue[] = [];
  const applicationShapeCheck = runSourceSignalApplicationShapeCheck(items);
  const applicationGroups = getSourceSignalApplicationGroups(items);
  const impacts = getSourceSignalImpactPreviews(items);
  const groups = getSourceSignalImpactGroups(items);
  const summary = getSourceSignalImpactSummary(items);

  if (applicationShapeCheck.issues.some((issue) => issue.severity === 'error')) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Source signal application shape check must pass before impact preview.',
    });
  }

  if (applicationGroups.length !== groups.length) {
    issues.push({
      severity: 'warning',
      code: 'invalid-summary-count',
      message: 'Impact groups should align with source signal application groups.',
    });
  }

  if (impacts.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-impact-previews',
      message: 'Source signal impact previews must not be empty.',
    });
  }

  if (groups.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-impact-groups',
      message: 'Source signal impact groups must not be empty.',
    });
  }

  impacts.forEach((impact) => {
    if (!isAllowedImpactLevel(impact.impactLevel)) {
      issues.push({
        severity: 'error',
        code: 'invalid-impact-level',
        message: `Invalid impactLevel: ${impact.impactKey}`,
        impactKey: impact.impactKey,
        applicationKey: impact.applicationKey,
      });
    }

    if (!isAllowedImpactDirection(impact.impactDirection)) {
      issues.push({
        severity: 'error',
        code: 'invalid-impact-direction',
        message: `Invalid impactDirection: ${impact.impactKey}`,
        impactKey: impact.impactKey,
        applicationKey: impact.applicationKey,
      });
    }

    if (impact.reasonCodes.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-reason-codes',
        message: `Impact preview reasonCodes must not be empty: ${impact.impactKey}`,
        impactKey: impact.impactKey,
        applicationKey: impact.applicationKey,
      });
    }

    if (impact.artistId.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-artist-id',
        message: `Impact preview artistId must not be empty: ${impact.impactKey}`,
        impactKey: impact.impactKey,
        applicationKey: impact.applicationKey,
      });
    }

    if (impact.variableKey.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-variable-key',
        message: `Impact preview variableKey must not be empty: ${impact.impactKey}`,
        impactKey: impact.impactKey,
        applicationKey: impact.applicationKey,
      });
    }

    if (
      !Number.isFinite(impact.previewSignalWeight)
      || impact.previewSignalWeight < 0
      || impact.previewSignalWeight > 100
    ) {
      issues.push({
        severity: 'error',
        code: 'invalid-preview-signal-weight',
        message: `previewSignalWeight must be finite and within 0-100: ${impact.impactKey}`,
        impactKey: impact.impactKey,
        applicationKey: impact.applicationKey,
      });
    }
  });

  if (hasDuplicateValues(impacts.map((impact) => impact.impactKey))) {
    issues.push({
      severity: 'error',
      code: 'duplicate-impact-key',
      message: 'Impact preview keys must be unique.',
    });
  }

  if (hasDuplicateValues(impacts.map((impact) => impact.applicationKey))) {
    issues.push({
      severity: 'warning',
      code: 'duplicate-application-key',
      message: 'Application keys are duplicated across impact previews.',
    });
  }

  if (summary.impactCount !== impacts.length || summary.groupCount !== groups.length) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Impact summary counts must match impact and group arrays.',
    });
  }

  groups.forEach((group) => {
    if (
      !Number.isFinite(group.averagePreviewSignalWeight)
      || group.averagePreviewSignalWeight < 0
      || group.averagePreviewSignalWeight > 100
    ) {
      issues.push({
        severity: 'error',
        code: 'invalid-preview-signal-weight',
        message:
          `Group averagePreviewSignalWeight must be finite and within 0-100: ${group.groupKey}`,
      });
    }
  });

  if (hasDuplicateValues(summary.topImpactKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-top-impact-key',
      message: 'topImpactKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.blockedImpactKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-blocked-impact-key',
      message: 'blockedImpactKeys must be unique.',
    });
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    impactCount: impacts.length,
    groupCount: groups.length,
    issues,
  };
}
