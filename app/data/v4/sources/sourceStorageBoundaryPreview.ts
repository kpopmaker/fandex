import {
  getSourceProviderDuplicatePolicyLabel,
  getSourceProviderFreshnessStatusLabel,
  getSourceProviderRetryModeLabel,
  getSourceProviderSyncCadenceLabel,
  getSourceProviderSyncPolicies,
  getSourceProviderSyncPolicyReasonLabel,
  getSourceProviderSyncPolicySummary,
  runSourceProviderSyncPolicyShapeCheck,
} from './sourceProviderSyncPolicyPreview';
import type {
  FandexSourceProviderDuplicatePolicy,
  FandexSourceProviderFreshnessStatus,
  FandexSourceProviderRetryMode,
  FandexSourceProviderSyncPolicy,
} from './sourceProviderSyncPolicyTypes';
import type {
  FandexSourceStorageBoundaryGroup,
  FandexSourceStorageBoundaryPlan,
  FandexSourceStorageBoundaryReasonCode,
  FandexSourceStorageBoundaryStatus,
  FandexSourceStorageBoundarySummary,
  FandexSourceStorageRecordKind,
  FandexSourceWriteGuardStatus,
} from './sourceStorageBoundaryTypes';

export type FandexSourceStorageBoundaryShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-boundary-plans'
    | 'empty-boundary-groups'
    | 'invalid-boundary-status'
    | 'invalid-write-guard-status'
    | 'invalid-record-kind'
    | 'missing-reason-codes'
    | 'duplicate-boundary-key'
    | 'duplicate-policy-key'
    | 'missing-provider'
    | 'missing-idempotency-key'
    | 'missing-dry-run-write-key'
    | 'invalid-summary-count'
    | 'duplicate-ready-boundary-key'
    | 'duplicate-review-boundary-key'
    | 'duplicate-blocked-boundary-key'
    | 'invalid-preview-only';
  message: string;
  boundaryKey?: string;
  policyKey?: string;
  provider?: string;
};

export type FandexSourceStorageBoundaryShapeCheckResult = {
  isValid: boolean;
  boundaryPlanCount: number;
  groupCount: number;
  issues: FandexSourceStorageBoundaryShapeCheckIssue[];
};

type FandexSourceStorageBoundaryGroupBucket = {
  groupKey: string;
  provider: FandexSourceStorageBoundaryPlan['provider'];
  providerMode: FandexSourceStorageBoundaryPlan['providerMode'];
  plans: FandexSourceStorageBoundaryPlan[];
};

const allowedBoundaryStatuses: readonly FandexSourceStorageBoundaryStatus[] = [
  'ready_for_dry_run',
  'needs_review',
  'write_limited',
  'write_blocked',
  'skipped',
];

const allowedRecordKinds: readonly FandexSourceStorageRecordKind[] = [
  'source_item_record',
  'candidate_record',
  'provider_snapshot_record',
  'sync_policy_record',
  'review_action_record',
  'unknown',
];

const allowedWriteGuardStatuses: readonly FandexSourceWriteGuardStatus[] = [
  'allowed_preview',
  'manual_review_required',
  'limited_preview',
  'blocked_preview',
];

function getUniqueValues<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

function isAllowedBoundaryStatus(status: string) {
  return allowedBoundaryStatuses.includes(status as FandexSourceStorageBoundaryStatus);
}

function isAllowedRecordKind(recordKind: string) {
  return allowedRecordKinds.includes(recordKind as FandexSourceStorageRecordKind);
}

function isAllowedWriteGuardStatus(status: string) {
  return allowedWriteGuardStatuses.includes(status as FandexSourceWriteGuardStatus);
}

function getBoundaryStatusCount(
  plans: FandexSourceStorageBoundaryPlan[],
  boundaryStatus: FandexSourceStorageBoundaryStatus,
) {
  return plans.filter((plan) => plan.boundaryStatus === boundaryStatus).length;
}

function getWriteGuardStatusCount(
  plans: FandexSourceStorageBoundaryPlan[],
  writeGuardStatus: FandexSourceWriteGuardStatus,
) {
  return plans.filter((plan) => plan.writeGuardStatus === writeGuardStatus).length;
}

function needsLimitedWriteBoundary(
  freshnessStatus: FandexSourceProviderFreshnessStatus,
  retryMode: FandexSourceProviderRetryMode,
  duplicatePolicy: FandexSourceProviderDuplicatePolicy,
) {
  return (
    freshnessStatus === 'stale'
    || freshnessStatus === 'expired'
    || retryMode === 'limited_retry'
    || duplicatePolicy === 'merge_by_source_id'
    || duplicatePolicy === 'merge_by_candidate_key'
    || duplicatePolicy === 'manual_review'
  );
}

export function getSourceStorageBoundaryStatusFromPolicy(
  policy: FandexSourceProviderSyncPolicy,
): FandexSourceStorageBoundaryStatus {
  if (policy.provider.trim().length === 0) {
    return 'skipped';
  }

  if (
    policy.syncCadence === 'disabled'
    || policy.retryMode === 'blocked_retry'
    || policy.duplicatePolicy === 'block_duplicate'
    || policy.blockedDraftCount > 0
  ) {
    return 'write_blocked';
  }

  if (policy.manualReviewCount > 0 || policy.reviewDraftCount > 0) {
    return 'needs_review';
  }

  if (
    needsLimitedWriteBoundary(
      policy.freshnessStatus,
      policy.retryMode,
      policy.duplicatePolicy,
    )
  ) {
    return 'write_limited';
  }

  if (policy.readyDraftCount > 0) {
    return 'ready_for_dry_run';
  }

  return 'skipped';
}

export function getSourceWriteGuardStatusFromPolicy(
  policy: FandexSourceProviderSyncPolicy,
): FandexSourceWriteGuardStatus {
  const boundaryStatus = getSourceStorageBoundaryStatusFromPolicy(policy);

  if (boundaryStatus === 'write_blocked' || boundaryStatus === 'skipped') {
    return 'blocked_preview';
  }

  if (boundaryStatus === 'needs_review') {
    return 'manual_review_required';
  }

  if (boundaryStatus === 'write_limited') {
    return 'limited_preview';
  }

  return 'allowed_preview';
}

export function getSourceStorageRecordKindFromPolicy(
  policy: FandexSourceProviderSyncPolicy,
): FandexSourceStorageRecordKind {
  if (policy.provider.trim().length === 0) {
    return 'unknown';
  }

  if (policy.syncCadence === 'disabled') {
    return 'sync_policy_record';
  }

  if (policy.providerMode === 'future_external_provider') {
    return 'provider_snapshot_record';
  }

  if (policy.manualReviewCount > 0 || policy.reviewDraftCount > 0) {
    return 'review_action_record';
  }

  if (policy.duplicatePolicy === 'merge_by_candidate_key') {
    return 'candidate_record';
  }

  return 'source_item_record';
}

function getBoundaryReasonCodes(
  policy: FandexSourceProviderSyncPolicy,
  boundaryStatus: FandexSourceStorageBoundaryStatus,
  writeGuardStatus: FandexSourceWriteGuardStatus,
): FandexSourceStorageBoundaryReasonCode[] {
  const reasonCodes = new Set<FandexSourceStorageBoundaryReasonCode>([
    'idempotency_required',
    'no_actual_write',
    'preview_only',
    'provider_policy_available',
    'write_guard_required',
  ]);

  if (policy.draftCount > 0) {
    reasonCodes.add('ingestion_draft_available');
  } else {
    reasonCodes.add('missing_source_id');
  }

  if (boundaryStatus === 'ready_for_dry_run') {
    reasonCodes.add('sync_policy_ready');
  }

  if (writeGuardStatus === 'manual_review_required' || policy.manualReviewCount > 0) {
    reasonCodes.add('manual_review_required');
  }

  if (
    policy.duplicatePolicy !== 'allow_preview'
    || policy.reasonCodes.includes('duplicate_policy_required')
  ) {
    reasonCodes.add('duplicate_boundary_required');
  }

  if (
    policy.freshnessStatus === 'stale'
    || policy.freshnessStatus === 'expired'
    || policy.reasonCodes.includes('stale_policy_required')
  ) {
    reasonCodes.add('stale_boundary_required');
  }

  if (boundaryStatus === 'write_blocked') {
    reasonCodes.add('blocked_policy');
  }

  if (policy.provider.trim().length === 0) {
    reasonCodes.add('missing_provider');
  }

  return Array.from(reasonCodes).sort();
}

function sortBoundaryPlans(plans: FandexSourceStorageBoundaryPlan[]) {
  const statusRank: Record<FandexSourceStorageBoundaryStatus, number> = {
    ready_for_dry_run: 0,
    needs_review: 1,
    write_limited: 2,
    write_blocked: 3,
    skipped: 4,
  };

  return [...plans].sort(
    (first, second) =>
      statusRank[first.boundaryStatus] - statusRank[second.boundaryStatus]
      || second.draftCount - first.draftCount
      || first.boundaryKey.localeCompare(second.boundaryKey),
  );
}

export function getSourceStorageBoundaryStatusLabel(
  status: FandexSourceStorageBoundaryStatus,
) {
  const labels: Record<FandexSourceStorageBoundaryStatus, string> = {
    ready_for_dry_run: 'dry-run ready',
    needs_review: 'review required',
    write_limited: 'limited write candidate',
    write_blocked: 'write blocked candidate',
    skipped: 'skipped',
  };

  return labels[status];
}

export function getSourceStorageRecordKindLabel(
  recordKind: FandexSourceStorageRecordKind,
) {
  const labels: Record<FandexSourceStorageRecordKind, string> = {
    source_item_record: 'source item record',
    candidate_record: 'candidate record',
    provider_snapshot_record: 'provider snapshot record',
    sync_policy_record: 'sync policy record',
    review_action_record: 'review action record',
    unknown: 'unknown',
  };

  return labels[recordKind];
}

export function getSourceWriteGuardStatusLabel(
  status: FandexSourceWriteGuardStatus,
) {
  const labels: Record<FandexSourceWriteGuardStatus, string> = {
    allowed_preview: 'preview allowed',
    manual_review_required: 'manual review required',
    limited_preview: 'limited preview',
    blocked_preview: 'blocked preview',
  };

  return labels[status];
}

export function getSourceStorageBoundaryReasonLabel(
  reasonCode: FandexSourceStorageBoundaryReasonCode,
) {
  const labels: Record<FandexSourceStorageBoundaryReasonCode, string> = {
    sync_policy_ready: 'sync policy ready',
    ingestion_draft_available: 'ingestion draft available',
    provider_policy_available: 'provider policy available',
    manual_review_required: 'manual review required',
    write_guard_required: 'write guard required',
    idempotency_required: 'idempotency required',
    duplicate_boundary_required: 'duplicate boundary required',
    stale_boundary_required: 'stale boundary required',
    blocked_policy: 'blocked policy',
    missing_provider: 'missing provider',
    missing_source_id: 'missing source id',
    preview_only: 'preview only',
    no_actual_write: 'no actual write',
  };

  return labels[reasonCode];
}

export function getSourceStorageBoundaryPlans(): FandexSourceStorageBoundaryPlan[] {
  return getSourceProviderSyncPolicies().map((policy, index) => {
    const boundaryStatus = getSourceStorageBoundaryStatusFromPolicy(policy);
    const writeGuardStatus = getSourceWriteGuardStatusFromPolicy(policy);
    const recordKind = getSourceStorageRecordKindFromPolicy(policy);
    const reasonCodes = getBoundaryReasonCodes(
      policy,
      boundaryStatus,
      writeGuardStatus,
    );
    const boundaryKey = `${policy.policyKey}::storage-boundary::${index + 1}`;

    return {
      boundaryKey,
      policyKey: policy.policyKey,
      provider: policy.provider,
      providerMode: policy.providerMode,
      recordKind,
      boundaryStatus,
      writeGuardStatus,
      idempotencyKey: `${boundaryKey}::idempotency-preview`,
      dryRunWriteKey: `${boundaryKey}::dry-run-write-preview`,
      syncCadence: policy.syncCadence,
      freshnessStatus: policy.freshnessStatus,
      retryMode: policy.retryMode,
      duplicatePolicy: policy.duplicatePolicy,
      draftCount: policy.draftCount,
      warningCount: policy.warningCount,
      manualReviewCount: policy.manualReviewCount,
      reasonCodes,
      warnings: policy.warnings,
      summaryLabel:
        `${policy.provider} / ${getSourceStorageBoundaryStatusLabel(boundaryStatus)}`,
      summaryNote:
        `Read-only storage boundary preview for ${getSourceStorageRecordKindLabel(
          recordKind,
        )}. Sync cadence ${getSourceProviderSyncCadenceLabel(
          policy.syncCadence,
        )}, freshness ${getSourceProviderFreshnessStatusLabel(
          policy.freshnessStatus,
        )}, retry ${getSourceProviderRetryModeLabel(
          policy.retryMode,
        )}, duplicate ${getSourceProviderDuplicatePolicyLabel(
          policy.duplicatePolicy,
        )}. Guard ${getSourceWriteGuardStatusLabel(
          writeGuardStatus,
        )} is preview-only and does not allow DB writes, file writes, upserts, deletes, provider sync, fetch calls, score deltas, or FANDEX score application. Policy reason sample: ${getSourceProviderSyncPolicyReasonLabel(
          policy.reasonCodes[0] ?? 'preview_only',
        )}.`,
      previewOnly: true,
    };
  });
}

export function getSourceStorageBoundaryGroups(): FandexSourceStorageBoundaryGroup[] {
  const groupMap = new Map<string, FandexSourceStorageBoundaryGroupBucket>();

  getSourceStorageBoundaryPlans().forEach((plan) => {
    const groupKey = `${plan.provider}::${plan.providerMode}`;
    const existingGroup = groupMap.get(groupKey);

    if (existingGroup) {
      existingGroup.plans.push(plan);
      return;
    }

    groupMap.set(groupKey, {
      groupKey,
      provider: plan.provider,
      providerMode: plan.providerMode,
      plans: [plan],
    });
  });

  return Array.from(groupMap.values())
    .map(({
      groupKey,
      provider,
      providerMode,
      plans,
    }): FandexSourceStorageBoundaryGroup => {
      const sortedPlans = sortBoundaryPlans(plans);
      const blockedBoundaryKeys = sortedPlans
        .filter((plan) => plan.boundaryStatus === 'write_blocked')
        .map((plan) => plan.boundaryKey)
        .slice(0, 5);

      return {
        groupKey,
        provider,
        providerMode,
        boundaryPlanCount: plans.length,
        readyForDryRunCount: getBoundaryStatusCount(plans, 'ready_for_dry_run'),
        needsReviewCount: getBoundaryStatusCount(plans, 'needs_review'),
        writeLimitedCount: getBoundaryStatusCount(plans, 'write_limited'),
        writeBlockedCount: getBoundaryStatusCount(plans, 'write_blocked'),
        skippedCount: getBoundaryStatusCount(plans, 'skipped'),
        warningCount: plans.reduce((sum, plan) => sum + plan.warningCount, 0),
        manualReviewCount: plans.reduce(
          (sum, plan) => sum + plan.manualReviewCount,
          0,
        ),
        topBoundaryKeys: sortedPlans
          .map((plan) => plan.boundaryKey)
          .slice(0, 5),
        blockedBoundaryKeys,
        summaryLabel: `${provider} / ${providerMode} storage boundary preview group`,
        summaryNote:
          'Grouped read-only storage boundary plans. Dry-run keys and idempotency keys are preview strings only and are not DB primary keys, storage keys, or write guards.',
        previewOnly: true,
      };
    })
    .sort((first, second) => second.boundaryPlanCount - first.boundaryPlanCount
      || first.groupKey.localeCompare(second.groupKey));
}

export function getSourceStorageBoundarySummary(): FandexSourceStorageBoundarySummary {
  const plans = getSourceStorageBoundaryPlans();
  const groups = getSourceStorageBoundaryGroups();
  const syncPolicySummary = getSourceProviderSyncPolicySummary();

  return {
    boundaryPlanCount: plans.length,
    groupCount: groups.length,
    providerCount: new Set(plans.map((plan) => plan.provider)).size,
    readyForDryRunCount: getBoundaryStatusCount(plans, 'ready_for_dry_run'),
    needsReviewCount: getBoundaryStatusCount(plans, 'needs_review'),
    writeLimitedCount: getBoundaryStatusCount(plans, 'write_limited'),
    writeBlockedCount: getBoundaryStatusCount(plans, 'write_blocked'),
    skippedCount: getBoundaryStatusCount(plans, 'skipped'),
    allowedPreviewCount: getWriteGuardStatusCount(plans, 'allowed_preview'),
    manualReviewRequiredCount: getWriteGuardStatusCount(
      plans,
      'manual_review_required',
    ),
    limitedPreviewCount: getWriteGuardStatusCount(plans, 'limited_preview'),
    blockedPreviewCount: getWriteGuardStatusCount(plans, 'blocked_preview'),
    warningCount: plans.reduce((sum, plan) => sum + plan.warningCount, 0),
    manualReviewCount: plans.reduce(
      (sum, plan) => sum + plan.manualReviewCount,
      0,
    ),
    readyBoundaryKeys: getUniqueValues(
      plans
        .filter((plan) => plan.boundaryStatus === 'ready_for_dry_run')
        .map((plan) => plan.boundaryKey),
    ).slice(0, 8),
    reviewBoundaryKeys: getUniqueValues(
      plans
        .filter((plan) => plan.boundaryStatus === 'needs_review')
        .map((plan) => plan.boundaryKey),
    ).slice(0, 8),
    blockedBoundaryKeys: getUniqueValues(
      plans
        .filter((plan) => plan.boundaryStatus === 'write_blocked')
        .map((plan) => plan.boundaryKey),
    ).slice(0, 8),
    summaryLabel: 'source storage boundary preview',
    summaryNote:
      `${syncPolicySummary.summaryLabel}. Storage boundary plans are fixture/helper-based read-only previews and do not write to Supabase, DB tables, files, schedulers, external providers, fetch calls, score deltas, rankings, charts, or artist scores.`,
    previewOnly: true,
  };
}

export function runSourceStorageBoundaryShapeCheck(): FandexSourceStorageBoundaryShapeCheckResult {
  const issues: FandexSourceStorageBoundaryShapeCheckIssue[] = [];
  const syncPolicyShapeCheck = runSourceProviderSyncPolicyShapeCheck();
  const plans = getSourceStorageBoundaryPlans();
  const groups = getSourceStorageBoundaryGroups();
  const summary = getSourceStorageBoundarySummary();

  if (syncPolicyShapeCheck.issues.some((issue) => issue.severity === 'error')) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Source provider sync policy shape check must pass before storage boundary preview.',
    });
  }

  if (plans.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-boundary-plans',
      message: 'Source storage boundary plans must not be empty.',
    });
  }

  if (groups.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-boundary-groups',
      message: 'Source storage boundary groups must not be empty.',
    });
  }

  plans.forEach((plan) => {
    if (!isAllowedBoundaryStatus(plan.boundaryStatus)) {
      issues.push({
        severity: 'error',
        code: 'invalid-boundary-status',
        message: `Invalid boundaryStatus: ${plan.boundaryKey}`,
        boundaryKey: plan.boundaryKey,
        policyKey: plan.policyKey,
        provider: plan.provider,
      });
    }

    if (!isAllowedWriteGuardStatus(plan.writeGuardStatus)) {
      issues.push({
        severity: 'error',
        code: 'invalid-write-guard-status',
        message: `Invalid writeGuardStatus: ${plan.boundaryKey}`,
        boundaryKey: plan.boundaryKey,
        policyKey: plan.policyKey,
        provider: plan.provider,
      });
    }

    if (!isAllowedRecordKind(plan.recordKind)) {
      issues.push({
        severity: 'error',
        code: 'invalid-record-kind',
        message: `Invalid recordKind: ${plan.boundaryKey}`,
        boundaryKey: plan.boundaryKey,
        policyKey: plan.policyKey,
        provider: plan.provider,
      });
    }

    if (plan.reasonCodes.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-reason-codes',
        message: `Storage boundary reasonCodes must not be empty: ${plan.boundaryKey}`,
        boundaryKey: plan.boundaryKey,
        policyKey: plan.policyKey,
        provider: plan.provider,
      });
    }

    if (plan.provider.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-provider',
        message: `Storage boundary provider must not be empty: ${plan.boundaryKey}`,
        boundaryKey: plan.boundaryKey,
        policyKey: plan.policyKey,
        provider: plan.provider,
      });
    }

    if (plan.idempotencyKey.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-idempotency-key',
        message: `Storage boundary idempotencyKey must not be empty: ${plan.boundaryKey}`,
        boundaryKey: plan.boundaryKey,
        policyKey: plan.policyKey,
        provider: plan.provider,
      });
    }

    if (plan.dryRunWriteKey.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-dry-run-write-key',
        message: `Storage boundary dryRunWriteKey must not be empty: ${plan.boundaryKey}`,
        boundaryKey: plan.boundaryKey,
        policyKey: plan.policyKey,
        provider: plan.provider,
      });
    }

    if (plan.previewOnly !== true) {
      issues.push({
        severity: 'error',
        code: 'invalid-preview-only',
        message: `Storage boundary previewOnly must be true: ${plan.boundaryKey}`,
        boundaryKey: plan.boundaryKey,
        policyKey: plan.policyKey,
        provider: plan.provider,
      });
    }
  });

  if (hasDuplicateValues(plans.map((plan) => plan.boundaryKey))) {
    issues.push({
      severity: 'error',
      code: 'duplicate-boundary-key',
      message: 'Storage boundary keys must be unique.',
    });
  }

  if (hasDuplicateValues(plans.map((plan) => plan.policyKey))) {
    issues.push({
      severity: 'warning',
      code: 'duplicate-policy-key',
      message: 'Policy keys are duplicated across storage boundary plans.',
    });
  }

  if (
    summary.boundaryPlanCount !== plans.length
    || summary.groupCount !== groups.length
    || summary.providerCount !== new Set(plans.map((plan) => plan.provider)).size
  ) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Storage boundary summary counts must match plan and group arrays.',
    });
  }

  if (hasDuplicateValues(summary.readyBoundaryKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-ready-boundary-key',
      message: 'readyBoundaryKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.reviewBoundaryKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-review-boundary-key',
      message: 'reviewBoundaryKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.blockedBoundaryKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-blocked-boundary-key',
      message: 'blockedBoundaryKeys must be unique.',
    });
  }

  groups.forEach((group) => {
    if (hasDuplicateValues(group.topBoundaryKeys)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-boundary-key',
        message: `topBoundaryKeys must be unique: ${group.groupKey}`,
      });
    }

    if (hasDuplicateValues(group.blockedBoundaryKeys)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-blocked-boundary-key',
        message: `blockedBoundaryKeys must be unique: ${group.groupKey}`,
      });
    }

    if (group.previewOnly !== true) {
      issues.push({
        severity: 'error',
        code: 'invalid-preview-only',
        message: `Storage boundary group previewOnly must be true: ${group.groupKey}`,
        provider: group.provider,
      });
    }
  });

  if (summary.previewOnly !== true) {
    issues.push({
      severity: 'error',
      code: 'invalid-preview-only',
      message: 'Storage boundary summary previewOnly must be true.',
    });
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    boundaryPlanCount: plans.length,
    groupCount: groups.length,
    issues,
  };
}
