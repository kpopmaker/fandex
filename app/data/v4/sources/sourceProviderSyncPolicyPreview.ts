import {
  getSourceIngestionDraftGroups,
  getSourceIngestionDraftProviderModeLabel,
  getSourceIngestionDraftStatusLabel,
  getSourceIngestionDraftSummary,
  runSourceIngestionDraftShapeCheck,
} from './sourceIngestionDraftPreview';
import type { FandexSourceIngestionDraftGroup } from './sourceIngestionDraftTypes';
import type {
  FandexSourceProviderDuplicatePolicy,
  FandexSourceProviderFreshnessStatus,
  FandexSourceProviderRetryMode,
  FandexSourceProviderSyncCadence,
  FandexSourceProviderSyncPolicy,
  FandexSourceProviderSyncPolicyReasonCode,
  FandexSourceProviderSyncPolicySummary,
} from './sourceProviderSyncPolicyTypes';

export type FandexSourceProviderSyncPolicyShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-sync-policies'
    | 'empty-sync-policy-providers'
    | 'invalid-sync-cadence'
    | 'invalid-freshness-status'
    | 'invalid-retry-mode'
    | 'invalid-duplicate-policy'
    | 'missing-reason-codes'
    | 'duplicate-policy-key'
    | 'missing-provider'
    | 'invalid-summary-count'
    | 'duplicate-ready-policy-key'
    | 'duplicate-review-policy-key'
    | 'duplicate-disabled-policy-key'
    | 'invalid-preview-only';
  message: string;
  policyKey?: string;
  provider?: string;
};

export type FandexSourceProviderSyncPolicyShapeCheckResult = {
  isValid: boolean;
  policyCount: number;
  providerCount: number;
  issues: FandexSourceProviderSyncPolicyShapeCheckIssue[];
};

const allowedSyncCadences: readonly FandexSourceProviderSyncCadence[] = [
  'manual',
  'hourly_preview',
  'daily_preview',
  'weekly_preview',
  'event_based_preview',
  'disabled',
];

const allowedFreshnessStatuses: readonly FandexSourceProviderFreshnessStatus[] = [
  'fresh',
  'acceptable',
  'stale',
  'expired',
  'unknown',
];

const allowedRetryModes: readonly FandexSourceProviderRetryMode[] = [
  'no_retry',
  'manual_retry',
  'limited_retry',
  'blocked_retry',
];

const allowedDuplicatePolicies: readonly FandexSourceProviderDuplicatePolicy[] = [
  'allow_preview',
  'merge_by_source_id',
  'merge_by_candidate_key',
  'block_duplicate',
  'manual_review',
];

function getUniqueValues<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

function isAllowedSyncCadence(cadence: string) {
  return allowedSyncCadences.includes(cadence as FandexSourceProviderSyncCadence);
}

function isAllowedFreshnessStatus(status: string) {
  return allowedFreshnessStatuses.includes(
    status as FandexSourceProviderFreshnessStatus,
  );
}

function isAllowedRetryMode(mode: string) {
  return allowedRetryModes.includes(mode as FandexSourceProviderRetryMode);
}

function isAllowedDuplicatePolicy(policy: string) {
  return allowedDuplicatePolicies.includes(policy as FandexSourceProviderDuplicatePolicy);
}

function getCadenceCount(
  policies: FandexSourceProviderSyncPolicy[],
  syncCadence: FandexSourceProviderSyncCadence,
) {
  return policies.filter((policy) => policy.syncCadence === syncCadence).length;
}

function getFreshnessCount(
  policies: FandexSourceProviderSyncPolicy[],
  freshnessStatus: FandexSourceProviderFreshnessStatus,
) {
  return policies.filter((policy) => policy.freshnessStatus === freshnessStatus).length;
}

export function getSourceProviderSyncCadenceFromDraftGroup(
  group: FandexSourceIngestionDraftGroup,
): FandexSourceProviderSyncCadence {
  if (group.blockedCount > 0 && group.blockedCount >= group.draftCount) {
    return 'disabled';
  }

  if (group.providerMode === 'future_external_provider') {
    return group.warningCount > 0 ? 'event_based_preview' : 'daily_preview';
  }

  if (group.providerMode === 'manual_import') {
    return 'manual';
  }

  if (group.providerMode === 'fixture_provider' || group.providerMode === 'mock_provider') {
    return group.readyCount > 0 ? 'manual' : 'disabled';
  }

  return 'weekly_preview';
}

export function getSourceProviderFreshnessStatusFromDraftGroup(
  group: FandexSourceIngestionDraftGroup,
): FandexSourceProviderFreshnessStatus {
  if (group.draftCount === 0) {
    return 'unknown';
  }

  if (group.blockedCount > 0 && group.blockedCount >= group.draftCount) {
    return 'expired';
  }

  if (group.warningCount > 0 || group.manualReviewCount > 0) {
    return 'stale';
  }

  if (group.readyCount > 0) {
    return 'fresh';
  }

  return 'acceptable';
}

export function getSourceProviderRetryModeFromDraftGroup(
  group: FandexSourceIngestionDraftGroup,
): FandexSourceProviderRetryMode {
  if (group.blockedCount > 0 && group.blockedCount >= group.draftCount) {
    return 'blocked_retry';
  }

  if (group.warningCount > 0) {
    return 'limited_retry';
  }

  if (group.manualReviewCount > 0 || group.reviewCount > 0) {
    return 'manual_retry';
  }

  return 'no_retry';
}

export function getSourceProviderDuplicatePolicyFromDraftGroup(
  group: FandexSourceIngestionDraftGroup,
): FandexSourceProviderDuplicatePolicy {
  if (group.blockedCount > 0 && group.blockedCount >= group.draftCount) {
    return 'block_duplicate';
  }

  if (group.manualReviewCount > 0 || group.warningCount > 0) {
    return 'manual_review';
  }

  if (group.readyCount > 1) {
    return 'merge_by_source_id';
  }

  if (group.reviewCount > 0) {
    return 'merge_by_candidate_key';
  }

  return 'allow_preview';
}

function getSyncPolicyReasonCodes(
  group: FandexSourceIngestionDraftGroup,
  syncCadence: FandexSourceProviderSyncCadence,
  freshnessStatus: FandexSourceProviderFreshnessStatus,
  retryMode: FandexSourceProviderRetryMode,
  duplicatePolicy: FandexSourceProviderDuplicatePolicy,
): FandexSourceProviderSyncPolicyReasonCode[] {
  const reasonCodes = new Set<FandexSourceProviderSyncPolicyReasonCode>([
    'preview_only',
    'provider_fixture_only',
  ]);

  if (group.readyCount > 0) {
    reasonCodes.add('ingestion_draft_ready');
  }

  if (group.manualReviewCount > 0) {
    reasonCodes.add('manual_review_required');
  }

  if (group.providerMode === 'future_external_provider') {
    reasonCodes.add('future_provider_only');
  }

  if (freshnessStatus === 'stale' || freshnessStatus === 'expired') {
    reasonCodes.add('stale_policy_required');
  }

  if (retryMode !== 'no_retry') {
    reasonCodes.add('retry_policy_required');
  }

  if (duplicatePolicy !== 'allow_preview') {
    reasonCodes.add('duplicate_policy_required');
  }

  if (group.warningCount > 0) {
    reasonCodes.add('warning_present');
  }

  if (syncCadence === 'disabled') {
    reasonCodes.add('disabled_provider');
  }

  return Array.from(reasonCodes).sort();
}

export function getSourceProviderSyncCadenceLabel(
  syncCadence: FandexSourceProviderSyncCadence,
) {
  const labels: Record<FandexSourceProviderSyncCadence, string> = {
    manual: '수동 확인',
    hourly_preview: '시간 단위 preview',
    daily_preview: '일 단위 preview',
    weekly_preview: '주 단위 preview',
    event_based_preview: '이벤트 기반 preview',
    disabled: '비활성',
  };

  return labels[syncCadence];
}

export function getSourceProviderFreshnessStatusLabel(
  freshnessStatus: FandexSourceProviderFreshnessStatus,
) {
  const labels: Record<FandexSourceProviderFreshnessStatus, string> = {
    fresh: '최신',
    acceptable: '허용 가능',
    stale: '오래됨',
    expired: '만료',
    unknown: '알 수 없음',
  };

  return labels[freshnessStatus];
}

export function getSourceProviderRetryModeLabel(
  retryMode: FandexSourceProviderRetryMode,
) {
  const labels: Record<FandexSourceProviderRetryMode, string> = {
    no_retry: '재시도 없음',
    manual_retry: '수동 재시도',
    limited_retry: '제한 재시도',
    blocked_retry: '재시도 차단',
  };

  return labels[retryMode];
}

export function getSourceProviderDuplicatePolicyLabel(
  duplicatePolicy: FandexSourceProviderDuplicatePolicy,
) {
  const labels: Record<FandexSourceProviderDuplicatePolicy, string> = {
    allow_preview: 'preview 허용',
    merge_by_source_id: 'sourceId 기준 병합',
    merge_by_candidate_key: 'candidateKey 기준 병합',
    block_duplicate: '중복 차단',
    manual_review: '수동 검토',
  };

  return labels[duplicatePolicy];
}

export function getSourceProviderSyncPolicyReasonLabel(
  reasonCode: FandexSourceProviderSyncPolicyReasonCode,
) {
  const labels: Record<FandexSourceProviderSyncPolicyReasonCode, string> = {
    ingestion_draft_ready: 'ingestion draft 준비됨',
    manual_review_required: '수동 검토 필요',
    provider_fixture_only: 'fixture provider 전용',
    future_provider_only: '향후 provider 전용',
    stale_policy_required: 'freshness 정책 필요',
    retry_policy_required: 'retry 정책 필요',
    duplicate_policy_required: 'duplicate 정책 필요',
    warning_present: 'warning 존재',
    disabled_provider: 'provider 비활성',
    preview_only: '실제 sync 없음',
  };

  return labels[reasonCode];
}

export function getSourceProviderSyncPolicies(): FandexSourceProviderSyncPolicy[] {
  return getSourceIngestionDraftGroups().map((group, index) => {
    const syncCadence = getSourceProviderSyncCadenceFromDraftGroup(group);
    const freshnessStatus = getSourceProviderFreshnessStatusFromDraftGroup(group);
    const retryMode = getSourceProviderRetryModeFromDraftGroup(group);
    const duplicatePolicy = getSourceProviderDuplicatePolicyFromDraftGroup(group);
    const reasonCodes = getSyncPolicyReasonCodes(
      group,
      syncCadence,
      freshnessStatus,
      retryMode,
      duplicatePolicy,
    );

    return {
      policyKey: `${group.groupKey}::sync-policy::${index + 1}`,
      provider: group.provider,
      providerMode: group.providerMode,
      syncCadence,
      freshnessStatus,
      retryMode,
      duplicatePolicy,
      draftCount: group.draftCount,
      readyDraftCount: group.readyCount,
      reviewDraftCount: group.reviewCount,
      blockedDraftCount: group.blockedCount,
      warningCount: group.warningCount,
      manualReviewCount: group.manualReviewCount,
      reasonCodes,
      warnings: [],
      summaryLabel:
        `${group.provider} / ${getSourceProviderSyncCadenceLabel(syncCadence)}`,
      summaryNote:
        `Read-only sync policy preview from ${getSourceIngestionDraftProviderModeLabel(
          group.providerMode,
        )} with ${group.draftCount} drafts. Cadence, retry, and duplicate policies are preview-only and do not create schedulers, cron jobs, fetch calls, DB writes, file writes, or FANDEX score changes. First draft status label: ${getSourceIngestionDraftStatusLabel(
          group.readyCount > 0 ? 'ready' : group.blockedCount > 0 ? 'blocked' : 'review',
        )}.`,
      previewOnly: true,
    };
  });
}

export function getSourceProviderSyncPolicySummary(): FandexSourceProviderSyncPolicySummary {
  const policies = getSourceProviderSyncPolicies();
  const ingestionDraftSummary = getSourceIngestionDraftSummary();

  return {
    policyCount: policies.length,
    providerCount: new Set(policies.map((policy) => policy.provider)).size,
    manualPolicyCount: getCadenceCount(policies, 'manual'),
    hourlyPreviewCount: getCadenceCount(policies, 'hourly_preview'),
    dailyPreviewCount: getCadenceCount(policies, 'daily_preview'),
    disabledPolicyCount: getCadenceCount(policies, 'disabled'),
    freshPolicyCount: getFreshnessCount(policies, 'fresh'),
    stalePolicyCount: getFreshnessCount(policies, 'stale'),
    expiredPolicyCount: getFreshnessCount(policies, 'expired'),
    retryPolicyCount: policies.filter((policy) => policy.retryMode !== 'no_retry').length,
    duplicateReviewPolicyCount: policies.filter(
      (policy) => policy.duplicatePolicy === 'manual_review',
    ).length,
    warningCount: policies.reduce((sum, policy) => sum + policy.warningCount, 0),
    manualReviewCount: policies.reduce(
      (sum, policy) => sum + policy.manualReviewCount,
      0,
    ),
    readyPolicyKeys: getUniqueValues(
      policies
        .filter((policy) => policy.readyDraftCount > 0 && policy.syncCadence !== 'disabled')
        .map((policy) => policy.policyKey),
    ).slice(0, 8),
    reviewPolicyKeys: getUniqueValues(
      policies
        .filter((policy) => policy.manualReviewCount > 0 || policy.reviewDraftCount > 0)
        .map((policy) => policy.policyKey),
    ).slice(0, 8),
    disabledPolicyKeys: getUniqueValues(
      policies
        .filter((policy) => policy.syncCadence === 'disabled')
        .map((policy) => policy.policyKey),
    ).slice(0, 8),
    summaryLabel: 'source provider sync policy preview',
    summaryNote:
      `${ingestionDraftSummary.summaryLabel}. Provider sync policies are fixture/helper-based read-only previews and do not run provider sync, scheduler, cron, fetch, DB writes, file writes, score deltas, or FANDEX score application.`,
    previewOnly: true,
  };
}

export function runSourceProviderSyncPolicyShapeCheck(): FandexSourceProviderSyncPolicyShapeCheckResult {
  const issues: FandexSourceProviderSyncPolicyShapeCheckIssue[] = [];
  const ingestionDraftShapeCheck = runSourceIngestionDraftShapeCheck();
  const policies = getSourceProviderSyncPolicies();
  const summary = getSourceProviderSyncPolicySummary();

  if (ingestionDraftShapeCheck.issues.some((issue) => issue.severity === 'error')) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Source ingestion draft shape check must pass before sync policy preview.',
    });
  }

  if (policies.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-sync-policies',
      message: 'Source provider sync policies must not be empty.',
    });
  }

  if (summary.providerCount === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-sync-policy-providers',
      message: 'Source provider sync policy provider count must not be empty.',
    });
  }

  policies.forEach((policy) => {
    if (!isAllowedSyncCadence(policy.syncCadence)) {
      issues.push({
        severity: 'error',
        code: 'invalid-sync-cadence',
        message: `Invalid syncCadence: ${policy.policyKey}`,
        policyKey: policy.policyKey,
        provider: policy.provider,
      });
    }

    if (!isAllowedFreshnessStatus(policy.freshnessStatus)) {
      issues.push({
        severity: 'error',
        code: 'invalid-freshness-status',
        message: `Invalid freshnessStatus: ${policy.policyKey}`,
        policyKey: policy.policyKey,
        provider: policy.provider,
      });
    }

    if (!isAllowedRetryMode(policy.retryMode)) {
      issues.push({
        severity: 'error',
        code: 'invalid-retry-mode',
        message: `Invalid retryMode: ${policy.policyKey}`,
        policyKey: policy.policyKey,
        provider: policy.provider,
      });
    }

    if (!isAllowedDuplicatePolicy(policy.duplicatePolicy)) {
      issues.push({
        severity: 'error',
        code: 'invalid-duplicate-policy',
        message: `Invalid duplicatePolicy: ${policy.policyKey}`,
        policyKey: policy.policyKey,
        provider: policy.provider,
      });
    }

    if (policy.reasonCodes.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-reason-codes',
        message: `Sync policy reasonCodes must not be empty: ${policy.policyKey}`,
        policyKey: policy.policyKey,
        provider: policy.provider,
      });
    }

    if (policy.provider.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-provider',
        message: `Sync policy provider must not be empty: ${policy.policyKey}`,
        policyKey: policy.policyKey,
        provider: policy.provider,
      });
    }

    if (policy.previewOnly !== true) {
      issues.push({
        severity: 'error',
        code: 'invalid-preview-only',
        message: `Sync policy previewOnly must be true: ${policy.policyKey}`,
        policyKey: policy.policyKey,
        provider: policy.provider,
      });
    }
  });

  if (hasDuplicateValues(policies.map((policy) => policy.policyKey))) {
    issues.push({
      severity: 'error',
      code: 'duplicate-policy-key',
      message: 'Sync policy keys must be unique.',
    });
  }

  if (
    summary.policyCount !== policies.length
    || summary.providerCount !== new Set(policies.map((policy) => policy.provider)).size
  ) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Sync policy summary counts must match policy array.',
    });
  }

  if (hasDuplicateValues(summary.readyPolicyKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-ready-policy-key',
      message: 'readyPolicyKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.reviewPolicyKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-review-policy-key',
      message: 'reviewPolicyKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.disabledPolicyKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-disabled-policy-key',
      message: 'disabledPolicyKeys must be unique.',
    });
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    policyCount: policies.length,
    providerCount: summary.providerCount,
    issues,
  };
}
