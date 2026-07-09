import type { FandexNormalizedSourceItem } from './sourceIngestionTypes';
import {
  getSourceSignalImpactDirectionLabel,
  getSourceSignalImpactGroups,
  getSourceSignalImpactLevelLabel,
  getSourceSignalImpactPreviews,
  getSourceSignalImpactReasonLabel,
  getSourceSignalImpactSummary,
  runSourceSignalImpactShapeCheck,
} from './sourceSignalImpactPreview';
import type { FandexSourceSignalImpactPreview } from './sourceSignalImpactTypes';
import type {
  FandexSourceSignalReviewPriority,
  FandexSourceSignalReviewQueueGroup,
  FandexSourceSignalReviewQueueItem,
  FandexSourceSignalReviewQueueStatus,
  FandexSourceSignalReviewQueueSummary,
  FandexSourceSignalReviewReasonCode,
} from './sourceSignalReviewQueueTypes';

export type FandexSourceSignalReviewQueueShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-review-queue-items'
    | 'empty-review-queue-groups'
    | 'duplicate-review-key'
    | 'duplicate-impact-key'
    | 'invalid-review-status'
    | 'invalid-review-priority'
    | 'missing-reason-codes'
    | 'missing-artist-id'
    | 'missing-variable-key'
    | 'invalid-preview-signal-weight'
    | 'invalid-summary-count'
    | 'duplicate-top-review-key'
    | 'duplicate-blocked-review-key';
  message: string;
  reviewKey?: string;
  impactKey?: string;
};

export type FandexSourceSignalReviewQueueShapeCheckResult = {
  isValid: boolean;
  reviewItemCount: number;
  groupCount: number;
  issues: FandexSourceSignalReviewQueueShapeCheckIssue[];
};

type FandexSourceSignalReviewQueueGroupBucket = {
  groupKey: string;
  artistId: string;
  variableKey: FandexSourceSignalReviewQueueItem['variableKey'];
  reviewItems: FandexSourceSignalReviewQueueItem[];
};

const allowedReviewStatuses: readonly FandexSourceSignalReviewQueueStatus[] = [
  'ready_for_review',
  'needs_attention',
  'limited_review',
  'blocked',
  'skipped',
];

const allowedReviewPriorities: readonly FandexSourceSignalReviewPriority[] = [
  'high',
  'medium',
  'low',
  'blocked',
];

function getUniqueValues<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

function isAllowedReviewStatus(status: string) {
  return allowedReviewStatuses.includes(status as FandexSourceSignalReviewQueueStatus);
}

function isAllowedReviewPriority(priority: string) {
  return allowedReviewPriorities.includes(priority as FandexSourceSignalReviewPriority);
}

function getReviewStatusCount(
  reviewItems: FandexSourceSignalReviewQueueItem[],
  reviewStatus: FandexSourceSignalReviewQueueStatus,
) {
  return reviewItems.filter((item) => item.reviewStatus === reviewStatus).length;
}

function getReviewPriorityCount(
  reviewItems: FandexSourceSignalReviewQueueItem[],
  priority: FandexSourceSignalReviewPriority,
) {
  return reviewItems.filter((item) => item.priority === priority).length;
}

function sortReviewItemsByPriority(
  reviewItems: FandexSourceSignalReviewQueueItem[],
) {
  const priorityRank: Record<FandexSourceSignalReviewPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
    blocked: 3,
  };

  return [...reviewItems].sort(
    (first, second) =>
      priorityRank[first.priority] - priorityRank[second.priority]
      || second.previewSignalWeight - first.previewSignalWeight
      || first.reviewKey.localeCompare(second.reviewKey),
  );
}

export function getSourceSignalReviewStatusFromImpact(
  impact: FandexSourceSignalImpactPreview,
): FandexSourceSignalReviewQueueStatus {
  if (impact.impactLevel === 'blocked') {
    return 'blocked';
  }

  if (impact.impactLevel === 'skipped') {
    return 'skipped';
  }

  if (impact.warnings.length > 0) {
    return 'needs_attention';
  }

  if (impact.impactLevel === 'weak') {
    return 'limited_review';
  }

  return 'ready_for_review';
}

export function getSourceSignalReviewPriorityFromImpact(
  impact: FandexSourceSignalImpactPreview,
): FandexSourceSignalReviewPriority {
  if (impact.impactLevel === 'strong') {
    return 'high';
  }

  if (impact.impactLevel === 'moderate') {
    return 'medium';
  }

  if (impact.impactLevel === 'blocked') {
    return 'blocked';
  }

  return 'low';
}

function getReviewReasonCodes(
  impact: FandexSourceSignalImpactPreview,
  reviewStatus: FandexSourceSignalReviewQueueStatus,
): FandexSourceSignalReviewReasonCode[] {
  const reasonCodes = new Set<FandexSourceSignalReviewReasonCode>([
    'preview_only',
    'fixture_only',
    'no_score_delta',
  ]);

  if (impact.impactLevel === 'strong') {
    reasonCodes.add('strong_impact_candidate');
  }

  if (impact.impactLevel === 'moderate') {
    reasonCodes.add('moderate_impact_candidate');
  }

  if (impact.impactLevel === 'weak' || impact.impactLevel === 'skipped') {
    reasonCodes.add('weak_impact_candidate');
  }

  if (impact.impactLevel === 'blocked') {
    reasonCodes.add('blocked_impact_candidate');
  }

  if (impact.warnings.length > 0) {
    reasonCodes.add('warning_present');
    reasonCodes.add('manual_review_required');
  }

  if (impact.confidenceScore < 64) {
    reasonCodes.add('low_confidence');
    reasonCodes.add('manual_review_required');
  }

  if (impact.previewSignalWeight >= 80) {
    reasonCodes.add('high_preview_weight');
  }

  if (reviewStatus === 'limited_review' || reviewStatus === 'blocked') {
    reasonCodes.add('manual_review_required');
  }

  return Array.from(reasonCodes).sort();
}

export function getSourceSignalReviewStatusLabel(
  status: FandexSourceSignalReviewQueueStatus,
) {
  const labels: Record<FandexSourceSignalReviewQueueStatus, string> = {
    ready_for_review: '검토 준비',
    needs_attention: '주의 필요',
    limited_review: '제한 검토',
    blocked: '제외',
    skipped: '스킵',
  };

  return labels[status];
}

export function getSourceSignalReviewPriorityLabel(
  priority: FandexSourceSignalReviewPriority,
) {
  const labels: Record<FandexSourceSignalReviewPriority, string> = {
    high: '높음',
    medium: '보통',
    low: '낮음',
    blocked: '제외',
  };

  return labels[priority];
}

export function getSourceSignalReviewReasonLabel(
  reasonCode: FandexSourceSignalReviewReasonCode,
) {
  const labels: Record<FandexSourceSignalReviewReasonCode, string> = {
    strong_impact_candidate: '강한 영향 후보',
    moderate_impact_candidate: '보통 영향 후보',
    weak_impact_candidate: '약한 영향 후보',
    blocked_impact_candidate: '제외 영향 후보',
    warning_present: 'warning 존재',
    low_confidence: '낮은 confidence',
    high_preview_weight: '높은 preview weight',
    manual_review_required: '수동 검토 필요',
    preview_only: 'preview only',
    fixture_only: 'fixture 기반 preview',
    no_score_delta: '실제 score delta 아님',
  };

  return labels[reasonCode];
}

export function getSourceSignalReviewQueueItems(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalReviewQueueItem[] {
  return getSourceSignalImpactPreviews(items).map((impact, index) => {
    const reviewStatus = getSourceSignalReviewStatusFromImpact(impact);
    const priority = getSourceSignalReviewPriorityFromImpact(impact);
    const reasonCodes = getReviewReasonCodes(impact, reviewStatus);
    const impactReasonLabel = impact.reasonCodes[0]
      ? getSourceSignalImpactReasonLabel(impact.reasonCodes[0])
      : 'impact preview';

    return {
      reviewKey: `${impact.impactKey}::review-queue::${index + 1}`,
      impactKey: impact.impactKey,
      applicationKey: impact.applicationKey,
      candidateKey: impact.candidateKey,
      sourceId: impact.sourceId,
      artistId: impact.artistId,
      variableKey: impact.variableKey,
      impactLevel: impact.impactLevel,
      impactDirection: impact.impactDirection,
      previewSignalWeight: impact.previewSignalWeight,
      reviewStatus,
      priority,
      reasonCodes,
      warnings: impact.warnings,
      summaryLabel:
        `${impact.artistId} / ${impact.variableKey} ${getSourceSignalReviewStatusLabel(
          reviewStatus,
        )}`,
      summaryNote:
        `Read-only review queue candidate from ${getSourceSignalImpactLevelLabel(
          impact.impactLevel,
        )} / ${getSourceSignalImpactDirectionLabel(
          impact.impactDirection,
        )} / ${impactReasonLabel}. This is preview-only, fixture-based, and does not calculate or apply FANDEX score deltas.`,
      previewOnly: true,
    };
  });
}

export function getSourceSignalReviewQueueGroups(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalReviewQueueGroup[] {
  const groupMap = new Map<string, FandexSourceSignalReviewQueueGroupBucket>();

  getSourceSignalReviewQueueItems(items).forEach((reviewItem) => {
    const groupKey = `${reviewItem.artistId}::${reviewItem.variableKey}`;
    const existingGroup = groupMap.get(groupKey);

    if (existingGroup) {
      existingGroup.reviewItems.push(reviewItem);
      return;
    }

    groupMap.set(groupKey, {
      groupKey,
      artistId: reviewItem.artistId,
      variableKey: reviewItem.variableKey,
      reviewItems: [reviewItem],
    });
  });

  return Array.from(groupMap.values())
    .map(({
      groupKey,
      artistId,
      variableKey,
      reviewItems,
    }): FandexSourceSignalReviewQueueGroup => {
      const sortedReviewItems = sortReviewItemsByPriority(reviewItems);
      const blockedReviewKeys = sortedReviewItems
        .filter((item) => item.reviewStatus === 'blocked' || item.priority === 'blocked')
        .map((item) => item.reviewKey)
        .slice(0, 5);

      return {
        groupKey,
        artistId,
        variableKey,
        reviewItemCount: reviewItems.length,
        highPriorityCount: getReviewPriorityCount(reviewItems, 'high'),
        mediumPriorityCount: getReviewPriorityCount(reviewItems, 'medium'),
        lowPriorityCount: getReviewPriorityCount(reviewItems, 'low'),
        blockedCount: getReviewStatusCount(reviewItems, 'blocked'),
        warningCount: reviewItems.flatMap((item) => item.warnings).length,
        topReviewKeys: sortedReviewItems
          .map((item) => item.reviewKey)
          .slice(0, 5),
        blockedReviewKeys,
        summaryLabel: `${artistId} / ${variableKey} review queue preview group`,
        summaryNote:
          'Grouped read-only source signal review queue candidates. No FANDEX score delta is calculated or applied.',
        previewOnly: true,
      };
    })
    .sort((first, second) => second.reviewItemCount - first.reviewItemCount
      || first.groupKey.localeCompare(second.groupKey));
}

export function getSourceSignalReviewQueueSummary(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalReviewQueueSummary {
  const reviewItems = getSourceSignalReviewQueueItems(items);
  const groups = getSourceSignalReviewQueueGroups(items);
  const impactSummary = getSourceSignalImpactSummary(items);
  const sortedReviewItems = sortReviewItemsByPriority(reviewItems);

  return {
    reviewItemCount: reviewItems.length,
    groupCount: groups.length,
    readyForReviewCount: getReviewStatusCount(reviewItems, 'ready_for_review'),
    needsAttentionCount: getReviewStatusCount(reviewItems, 'needs_attention'),
    limitedReviewCount: getReviewStatusCount(reviewItems, 'limited_review'),
    blockedCount: getReviewStatusCount(reviewItems, 'blocked'),
    skippedCount: getReviewStatusCount(reviewItems, 'skipped'),
    highPriorityCount: getReviewPriorityCount(reviewItems, 'high'),
    mediumPriorityCount: getReviewPriorityCount(reviewItems, 'medium'),
    lowPriorityCount: getReviewPriorityCount(reviewItems, 'low'),
    warningCount: reviewItems.flatMap((item) => item.warnings).length,
    topReviewKeys: sortedReviewItems
      .map((item) => item.reviewKey)
      .slice(0, 5),
    blockedReviewKeys: getUniqueValues(
      reviewItems
        .filter((item) => item.reviewStatus === 'blocked' || item.priority === 'blocked')
        .map((item) => item.reviewKey),
    ).slice(0, 5),
    summaryLabel: 'source signal review queue preview',
    summaryNote:
      `${impactSummary.summaryLabel}. Review queue items are fixture-based, read-only candidates for human review and do not calculate, store, or apply FANDEX score deltas.`,
    previewOnly: true,
  };
}

export function runSourceSignalReviewQueueShapeCheck(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalReviewQueueShapeCheckResult {
  const issues: FandexSourceSignalReviewQueueShapeCheckIssue[] = [];
  const impactShapeCheck = runSourceSignalImpactShapeCheck(items);
  const impactGroups = getSourceSignalImpactGroups(items);
  const reviewItems = getSourceSignalReviewQueueItems(items);
  const groups = getSourceSignalReviewQueueGroups(items);
  const summary = getSourceSignalReviewQueueSummary(items);

  if (impactShapeCheck.issues.some((issue) => issue.severity === 'error')) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Source signal impact shape check must pass before review queue preview.',
    });
  }

  if (impactGroups.length !== groups.length) {
    issues.push({
      severity: 'warning',
      code: 'invalid-summary-count',
      message: 'Review queue groups should align with source signal impact groups.',
    });
  }

  if (reviewItems.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-review-queue-items',
      message: 'Source signal review queue items must not be empty.',
    });
  }

  if (groups.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-review-queue-groups',
      message: 'Source signal review queue groups must not be empty.',
    });
  }

  reviewItems.forEach((item) => {
    if (!isAllowedReviewStatus(item.reviewStatus)) {
      issues.push({
        severity: 'error',
        code: 'invalid-review-status',
        message: `Invalid reviewStatus: ${item.reviewKey}`,
        reviewKey: item.reviewKey,
        impactKey: item.impactKey,
      });
    }

    if (!isAllowedReviewPriority(item.priority)) {
      issues.push({
        severity: 'error',
        code: 'invalid-review-priority',
        message: `Invalid priority: ${item.reviewKey}`,
        reviewKey: item.reviewKey,
        impactKey: item.impactKey,
      });
    }

    if (item.reasonCodes.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-reason-codes',
        message: `Review queue reasonCodes must not be empty: ${item.reviewKey}`,
        reviewKey: item.reviewKey,
        impactKey: item.impactKey,
      });
    }

    if (item.artistId.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-artist-id',
        message: `Review queue artistId must not be empty: ${item.reviewKey}`,
        reviewKey: item.reviewKey,
        impactKey: item.impactKey,
      });
    }

    if (item.variableKey.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-variable-key',
        message: `Review queue variableKey must not be empty: ${item.reviewKey}`,
        reviewKey: item.reviewKey,
        impactKey: item.impactKey,
      });
    }

    if (
      !Number.isFinite(item.previewSignalWeight)
      || item.previewSignalWeight < 0
      || item.previewSignalWeight > 100
    ) {
      issues.push({
        severity: 'error',
        code: 'invalid-preview-signal-weight',
        message: `previewSignalWeight must be finite and within 0-100: ${item.reviewKey}`,
        reviewKey: item.reviewKey,
        impactKey: item.impactKey,
      });
    }
  });

  if (hasDuplicateValues(reviewItems.map((item) => item.reviewKey))) {
    issues.push({
      severity: 'error',
      code: 'duplicate-review-key',
      message: 'Review queue keys must be unique.',
    });
  }

  if (hasDuplicateValues(reviewItems.map((item) => item.impactKey))) {
    issues.push({
      severity: 'warning',
      code: 'duplicate-impact-key',
      message: 'Impact keys are duplicated across review queue items.',
    });
  }

  if (summary.reviewItemCount !== reviewItems.length || summary.groupCount !== groups.length) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Review queue summary counts must match item and group arrays.',
    });
  }

  if (hasDuplicateValues(summary.topReviewKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-top-review-key',
      message: 'topReviewKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.blockedReviewKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-blocked-review-key',
      message: 'blockedReviewKeys must be unique.',
    });
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    reviewItemCount: reviewItems.length,
    groupCount: groups.length,
    issues,
  };
}
