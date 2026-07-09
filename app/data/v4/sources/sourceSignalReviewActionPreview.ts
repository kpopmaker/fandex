import type { FandexNormalizedSourceItem } from './sourceIngestionTypes';
import {
  getSourceSignalReviewPriorityLabel,
  getSourceSignalReviewQueueGroups,
  getSourceSignalReviewQueueItems,
  getSourceSignalReviewQueueSummary,
  getSourceSignalReviewReasonLabel,
  getSourceSignalReviewStatusLabel,
  runSourceSignalReviewQueueShapeCheck,
} from './sourceSignalReviewQueuePreview';
import type { FandexSourceSignalReviewQueueItem } from './sourceSignalReviewQueueTypes';
import type {
  FandexSourceSignalReviewActionGroup,
  FandexSourceSignalReviewActionMode,
  FandexSourceSignalReviewActionPlan,
  FandexSourceSignalReviewActionReasonCode,
  FandexSourceSignalReviewActionRiskLevel,
  FandexSourceSignalReviewActionSummary,
} from './sourceSignalReviewActionTypes';

export type FandexSourceSignalReviewActionShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-review-action-plans'
    | 'empty-review-action-groups'
    | 'invalid-action-mode'
    | 'invalid-risk-level'
    | 'missing-reason-codes'
    | 'duplicate-action-key'
    | 'duplicate-review-key'
    | 'missing-artist-id'
    | 'missing-variable-key'
    | 'invalid-summary-count'
    | 'duplicate-top-action-key'
    | 'duplicate-blocked-action-key'
    | 'invalid-preview-only';
  message: string;
  actionKey?: string;
  reviewKey?: string;
};

export type FandexSourceSignalReviewActionShapeCheckResult = {
  isValid: boolean;
  actionPlanCount: number;
  groupCount: number;
  issues: FandexSourceSignalReviewActionShapeCheckIssue[];
};

type FandexSourceSignalReviewActionGroupBucket = {
  groupKey: string;
  artistId: string;
  variableKey: FandexSourceSignalReviewActionPlan['variableKey'];
  actionPlans: FandexSourceSignalReviewActionPlan[];
};

const allowedActionModes: readonly FandexSourceSignalReviewActionMode[] = [
  'approve_preview',
  'hold_review',
  'limit_preview',
  'reject_preview',
  'skip_preview',
];

const allowedRiskLevels: readonly FandexSourceSignalReviewActionRiskLevel[] = [
  'low',
  'medium',
  'high',
  'blocked',
];

function getUniqueValues<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

function isAllowedActionMode(mode: string) {
  return allowedActionModes.includes(mode as FandexSourceSignalReviewActionMode);
}

function isAllowedRiskLevel(riskLevel: string) {
  return allowedRiskLevels.includes(
    riskLevel as FandexSourceSignalReviewActionRiskLevel,
  );
}

function getActionModeCount(
  actionPlans: FandexSourceSignalReviewActionPlan[],
  actionMode: FandexSourceSignalReviewActionMode,
) {
  return actionPlans.filter((plan) => plan.actionMode === actionMode).length;
}

function getRiskLevelCount(
  actionPlans: FandexSourceSignalReviewActionPlan[],
  riskLevel: FandexSourceSignalReviewActionRiskLevel,
) {
  return actionPlans.filter((plan) => plan.riskLevel === riskLevel).length;
}

function hasRequiredReviewKeys(item: FandexSourceSignalReviewQueueItem) {
  return (
    item.reviewKey.trim().length > 0
    && item.impactKey.trim().length > 0
    && item.applicationKey.trim().length > 0
    && item.candidateKey.trim().length > 0
    && item.sourceId.trim().length > 0
    && item.artistId.trim().length > 0
    && item.variableKey.trim().length > 0
  );
}

function sortActionPlans(
  actionPlans: FandexSourceSignalReviewActionPlan[],
) {
  const riskRank: Record<FandexSourceSignalReviewActionRiskLevel, number> = {
    high: 0,
    medium: 1,
    low: 2,
    blocked: 3,
  };

  return [...actionPlans].sort(
    (first, second) =>
      riskRank[first.riskLevel] - riskRank[second.riskLevel]
      || second.previewSignalWeight - first.previewSignalWeight
      || first.actionKey.localeCompare(second.actionKey),
  );
}

export function getSourceSignalReviewActionModeFromQueueItem(
  item: FandexSourceSignalReviewQueueItem,
): FandexSourceSignalReviewActionMode {
  if (!hasRequiredReviewKeys(item) || item.reviewStatus === 'skipped') {
    return 'skip_preview';
  }

  if (item.reviewStatus === 'blocked') {
    return 'reject_preview';
  }

  if (item.reviewStatus === 'limited_review') {
    return 'limit_preview';
  }

  if (item.reviewStatus === 'needs_attention') {
    return 'hold_review';
  }

  if (
    item.reviewStatus === 'ready_for_review'
    && (item.priority === 'high' || item.priority === 'medium')
  ) {
    return 'approve_preview';
  }

  return 'hold_review';
}

export function getSourceSignalReviewActionRiskLevelFromQueueItem(
  item: FandexSourceSignalReviewQueueItem,
): FandexSourceSignalReviewActionRiskLevel {
  if (item.reviewStatus === 'blocked' || item.priority === 'blocked') {
    return 'blocked';
  }

  if (item.reviewStatus === 'needs_attention' || item.warnings.length > 0) {
    return 'high';
  }

  if (item.reviewStatus === 'limited_review' || item.previewSignalWeight < 50) {
    return 'medium';
  }

  return 'low';
}

function getReviewActionReasonCodes(
  item: FandexSourceSignalReviewQueueItem,
): FandexSourceSignalReviewActionReasonCode[] {
  const reasonCodes = new Set<FandexSourceSignalReviewActionReasonCode>([
    'fixture_only',
    'preview_only',
  ]);

  if (item.reviewStatus === 'ready_for_review') {
    reasonCodes.add('ready_for_review');
  }

  if (item.reviewStatus === 'needs_attention') {
    reasonCodes.add('needs_attention');
  }

  if (item.reviewStatus === 'limited_review') {
    reasonCodes.add('limited_review');
  }

  if (item.reviewStatus === 'blocked') {
    reasonCodes.add('blocked_review');
  }

  if (item.reviewStatus === 'skipped') {
    reasonCodes.add('skipped_review');
  }

  if (item.priority === 'high') {
    reasonCodes.add('high_priority');
  }

  if (item.priority === 'medium') {
    reasonCodes.add('medium_priority');
  }

  if (item.priority === 'low') {
    reasonCodes.add('low_priority');
  }

  if (item.impactDirection === 'positive') {
    reasonCodes.add('positive_impact');
  }

  if (item.impactDirection === 'negative') {
    reasonCodes.add('negative_impact');
  }

  if (item.warnings.length > 0) {
    reasonCodes.add('warning_present');
  }

  if (item.previewSignalWeight < 50) {
    reasonCodes.add('low_preview_weight');
  }

  return Array.from(reasonCodes).sort();
}

export function getSourceSignalReviewActionModeLabel(
  actionMode: FandexSourceSignalReviewActionMode,
) {
  const labels: Record<FandexSourceSignalReviewActionMode, string> = {
    approve_preview: '승인 검토 후보',
    hold_review: '보류 검토',
    limit_preview: '제한 검토',
    reject_preview: '제외 검토',
    skip_preview: '스킵',
  };

  return labels[actionMode];
}

export function getSourceSignalReviewActionRiskLabel(
  riskLevel: FandexSourceSignalReviewActionRiskLevel,
) {
  const labels: Record<FandexSourceSignalReviewActionRiskLevel, string> = {
    low: '낮음',
    medium: '중간',
    high: '높음',
    blocked: '차단',
  };

  return labels[riskLevel];
}

export function getSourceSignalReviewActionReasonLabel(
  reasonCode: FandexSourceSignalReviewActionReasonCode,
) {
  const labels: Record<FandexSourceSignalReviewActionReasonCode, string> = {
    ready_for_review: '검토 준비 완료',
    needs_attention: '주의 필요',
    limited_review: '제한 검토',
    blocked_review: '제외 검토',
    skipped_review: '스킵된 검토 항목',
    high_priority: '높은 우선순위',
    medium_priority: '중간 우선순위',
    low_priority: '낮은 우선순위',
    positive_impact: '긍정 impact',
    negative_impact: '부정 impact',
    warning_present: 'warning 존재',
    low_preview_weight: '낮은 preview weight',
    fixture_only: 'fixture 기반 preview',
    preview_only: '실제 반영 없음',
  };

  return labels[reasonCode];
}

export function getSourceSignalReviewActionPlans(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalReviewActionPlan[] {
  return getSourceSignalReviewQueueItems(items).map((item, index) => {
    const actionMode = getSourceSignalReviewActionModeFromQueueItem(item);
    const riskLevel = getSourceSignalReviewActionRiskLevelFromQueueItem(item);
    const reasonCodes = getReviewActionReasonCodes(item);
    const firstQueueReasonLabel = item.reasonCodes[0]
      ? getSourceSignalReviewReasonLabel(item.reasonCodes[0])
      : 'review queue preview';
    const requiresManualReview =
      actionMode !== 'approve_preview'
      || riskLevel === 'high'
      || riskLevel === 'blocked'
      || item.warnings.length > 0;

    return {
      actionKey: `${item.reviewKey}::review-action::${index + 1}`,
      reviewKey: item.reviewKey,
      impactKey: item.impactKey,
      applicationKey: item.applicationKey,
      candidateKey: item.candidateKey,
      sourceId: item.sourceId,
      artistId: item.artistId,
      variableKey: item.variableKey,
      actionMode,
      riskLevel,
      reviewStatus: item.reviewStatus,
      priority: item.priority,
      impactLevel: item.impactLevel,
      impactDirection: item.impactDirection,
      previewSignalWeight: item.previewSignalWeight,
      reasonCodes,
      warnings: item.warnings,
      requiresManualReview,
      summaryLabel:
        `${item.artistId} / ${item.variableKey} ${getSourceSignalReviewActionModeLabel(
          actionMode,
        )}`,
      summaryNote:
        `Read-only review action candidate from ${getSourceSignalReviewStatusLabel(
          item.reviewStatus,
        )} / ${getSourceSignalReviewPriorityLabel(
          item.priority,
        )} / ${firstQueueReasonLabel}. approve_preview and reject_preview are not real approvals or rejections. This preview does not store state, calculate score deltas, or apply FANDEX ranking/chart/artist score changes.`,
      previewOnly: true,
    };
  });
}

export function getSourceSignalReviewActionGroups(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalReviewActionGroup[] {
  const groupMap = new Map<string, FandexSourceSignalReviewActionGroupBucket>();

  getSourceSignalReviewActionPlans(items).forEach((actionPlan) => {
    const groupKey = `${actionPlan.artistId}::${actionPlan.variableKey}`;
    const existingGroup = groupMap.get(groupKey);

    if (existingGroup) {
      existingGroup.actionPlans.push(actionPlan);
      return;
    }

    groupMap.set(groupKey, {
      groupKey,
      artistId: actionPlan.artistId,
      variableKey: actionPlan.variableKey,
      actionPlans: [actionPlan],
    });
  });

  return Array.from(groupMap.values())
    .map(({
      groupKey,
      artistId,
      variableKey,
      actionPlans,
    }): FandexSourceSignalReviewActionGroup => {
      const sortedActionPlans = sortActionPlans(actionPlans);
      const blockedActionKeys = sortedActionPlans
        .filter((plan) =>
          plan.actionMode === 'reject_preview'
          || plan.riskLevel === 'blocked')
        .map((plan) => plan.actionKey)
        .slice(0, 5);

      return {
        groupKey,
        artistId,
        variableKey,
        actionPlanCount: actionPlans.length,
        approvePreviewCount: getActionModeCount(actionPlans, 'approve_preview'),
        holdReviewCount: getActionModeCount(actionPlans, 'hold_review'),
        limitPreviewCount: getActionModeCount(actionPlans, 'limit_preview'),
        rejectPreviewCount: getActionModeCount(actionPlans, 'reject_preview'),
        skipPreviewCount: getActionModeCount(actionPlans, 'skip_preview'),
        highRiskCount: getRiskLevelCount(actionPlans, 'high'),
        warningCount: actionPlans.flatMap((plan) => plan.warnings).length,
        topActionKeys: sortedActionPlans
          .map((plan) => plan.actionKey)
          .slice(0, 5),
        blockedActionKeys,
        summaryLabel: `${artistId} / ${variableKey} review action preview group`,
        summaryNote:
          'Grouped read-only source signal review action candidates. No approval, rejection, storage, or FANDEX score application is performed.',
        previewOnly: true,
      };
    })
    .sort((first, second) => second.actionPlanCount - first.actionPlanCount
      || first.groupKey.localeCompare(second.groupKey));
}

export function getSourceSignalReviewActionSummary(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalReviewActionSummary {
  const actionPlans = getSourceSignalReviewActionPlans(items);
  const groups = getSourceSignalReviewActionGroups(items);
  const queueSummary = getSourceSignalReviewQueueSummary(items);

  return {
    actionPlanCount: actionPlans.length,
    groupCount: groups.length,
    approvePreviewCount: getActionModeCount(actionPlans, 'approve_preview'),
    holdReviewCount: getActionModeCount(actionPlans, 'hold_review'),
    limitPreviewCount: getActionModeCount(actionPlans, 'limit_preview'),
    rejectPreviewCount: getActionModeCount(actionPlans, 'reject_preview'),
    skipPreviewCount: getActionModeCount(actionPlans, 'skip_preview'),
    highRiskCount: getRiskLevelCount(actionPlans, 'high'),
    mediumRiskCount: getRiskLevelCount(actionPlans, 'medium'),
    lowRiskCount: getRiskLevelCount(actionPlans, 'low'),
    blockedRiskCount: getRiskLevelCount(actionPlans, 'blocked'),
    warningCount: actionPlans.flatMap((plan) => plan.warnings).length,
    approveActionKeys: getUniqueValues(
      actionPlans
        .filter((plan) => plan.actionMode === 'approve_preview')
        .map((plan) => plan.actionKey),
    ).slice(0, 8),
    holdActionKeys: getUniqueValues(
      actionPlans
        .filter((plan) => plan.actionMode === 'hold_review')
        .map((plan) => plan.actionKey),
    ).slice(0, 8),
    rejectActionKeys: getUniqueValues(
      actionPlans
        .filter((plan) => plan.actionMode === 'reject_preview')
        .map((plan) => plan.actionKey),
    ).slice(0, 8),
    summaryLabel: 'source signal review action preview',
    summaryNote:
      `${queueSummary.summaryLabel}. Review action plans are fixture-based, read-only operator guidance previews and do not approve, reject, hold, store, calculate score deltas, or apply FANDEX scores.`,
    previewOnly: true,
  };
}

export function runSourceSignalReviewActionShapeCheck(
  items?: FandexNormalizedSourceItem[],
): FandexSourceSignalReviewActionShapeCheckResult {
  const issues: FandexSourceSignalReviewActionShapeCheckIssue[] = [];
  const queueShapeCheck = runSourceSignalReviewQueueShapeCheck(items);
  const queueGroups = getSourceSignalReviewQueueGroups(items);
  const actionPlans = getSourceSignalReviewActionPlans(items);
  const groups = getSourceSignalReviewActionGroups(items);
  const summary = getSourceSignalReviewActionSummary(items);

  if (queueShapeCheck.issues.some((issue) => issue.severity === 'error')) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Source signal review queue shape check must pass before action preview.',
    });
  }

  if (queueGroups.length !== groups.length) {
    issues.push({
      severity: 'warning',
      code: 'invalid-summary-count',
      message: 'Review action groups should align with review queue groups.',
    });
  }

  if (actionPlans.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-review-action-plans',
      message: 'Source signal review action plans must not be empty.',
    });
  }

  if (groups.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-review-action-groups',
      message: 'Source signal review action groups must not be empty.',
    });
  }

  actionPlans.forEach((plan) => {
    if (!isAllowedActionMode(plan.actionMode)) {
      issues.push({
        severity: 'error',
        code: 'invalid-action-mode',
        message: `Invalid actionMode: ${plan.actionKey}`,
        actionKey: plan.actionKey,
        reviewKey: plan.reviewKey,
      });
    }

    if (!isAllowedRiskLevel(plan.riskLevel)) {
      issues.push({
        severity: 'error',
        code: 'invalid-risk-level',
        message: `Invalid riskLevel: ${plan.actionKey}`,
        actionKey: plan.actionKey,
        reviewKey: plan.reviewKey,
      });
    }

    if (plan.reasonCodes.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-reason-codes',
        message: `Review action reasonCodes must not be empty: ${plan.actionKey}`,
        actionKey: plan.actionKey,
        reviewKey: plan.reviewKey,
      });
    }

    if (plan.artistId.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-artist-id',
        message: `Review action artistId must not be empty: ${plan.actionKey}`,
        actionKey: plan.actionKey,
        reviewKey: plan.reviewKey,
      });
    }

    if (plan.variableKey.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-variable-key',
        message: `Review action variableKey must not be empty: ${plan.actionKey}`,
        actionKey: plan.actionKey,
        reviewKey: plan.reviewKey,
      });
    }

    if (plan.previewOnly !== true) {
      issues.push({
        severity: 'error',
        code: 'invalid-preview-only',
        message: `Review action previewOnly must be true: ${plan.actionKey}`,
        actionKey: plan.actionKey,
        reviewKey: plan.reviewKey,
      });
    }
  });

  if (hasDuplicateValues(actionPlans.map((plan) => plan.actionKey))) {
    issues.push({
      severity: 'error',
      code: 'duplicate-action-key',
      message: 'Review action keys must be unique.',
    });
  }

  if (hasDuplicateValues(actionPlans.map((plan) => plan.reviewKey))) {
    issues.push({
      severity: 'warning',
      code: 'duplicate-review-key',
      message: 'Review keys are duplicated across review action plans.',
    });
  }

  if (
    summary.actionPlanCount !== actionPlans.length
    || summary.groupCount !== groups.length
  ) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Review action summary counts must match plan and group arrays.',
    });
  }

  groups.forEach((group) => {
    if (hasDuplicateValues(group.topActionKeys)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-top-action-key',
        message: `topActionKeys must be unique: ${group.groupKey}`,
      });
    }

    if (hasDuplicateValues(group.blockedActionKeys)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-blocked-action-key',
        message: `blockedActionKeys must be unique: ${group.groupKey}`,
      });
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    actionPlanCount: actionPlans.length,
    groupCount: groups.length,
    issues,
  };
}
