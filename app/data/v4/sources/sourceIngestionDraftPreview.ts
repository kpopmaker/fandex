import type {
  FandexNormalizedSourceItem,
  FandexSourceProvider,
} from './sourceIngestionTypes';
import { runSourceProviderPreviewImport } from './sourceProviderImportPipeline';
import {
  getSourceProviderAdapterByProvider,
  runSourceProviderRegistryShapeCheck,
} from './sourceProviderRegistry';
import {
  getSourceSignalReviewActionModeLabel,
  getSourceSignalReviewActionPlans,
  getSourceSignalReviewActionRiskLabel,
  getSourceSignalReviewActionSummary,
  runSourceSignalReviewActionShapeCheck,
} from './sourceSignalReviewActionPreview';
import type { FandexSourceSignalReviewActionPlan } from './sourceSignalReviewActionTypes';
import type {
  FandexSourceIngestionDraft,
  FandexSourceIngestionDraftGroup,
  FandexSourceIngestionDraftProviderMode,
  FandexSourceIngestionDraftReasonCode,
  FandexSourceIngestionDraftStatus,
  FandexSourceIngestionDraftSummary,
} from './sourceIngestionDraftTypes';

export type FandexSourceIngestionDraftShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-ingestion-drafts'
    | 'empty-ingestion-draft-groups'
    | 'invalid-draft-status'
    | 'invalid-provider-mode'
    | 'missing-reason-codes'
    | 'duplicate-draft-key'
    | 'duplicate-source-id'
    | 'duplicate-candidate-key'
    | 'duplicate-action-key'
    | 'missing-provider'
    | 'invalid-summary-count'
    | 'duplicate-ready-draft-key'
    | 'duplicate-review-draft-key'
    | 'duplicate-blocked-draft-key'
    | 'invalid-preview-only';
  message: string;
  draftKey?: string;
  sourceId?: string;
  actionKey?: string;
};

export type FandexSourceIngestionDraftShapeCheckResult = {
  isValid: boolean;
  draftCount: number;
  groupCount: number;
  issues: FandexSourceIngestionDraftShapeCheckIssue[];
};

type FandexSourceIngestionDraftGroupBucket = {
  groupKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  drafts: FandexSourceIngestionDraft[];
};

const allowedDraftStatuses: readonly FandexSourceIngestionDraftStatus[] = [
  'ready',
  'review',
  'limited',
  'blocked',
  'skipped',
];

const allowedProviderModes: readonly FandexSourceIngestionDraftProviderMode[] = [
  'fixture_provider',
  'mock_provider',
  'manual_import',
  'future_external_provider',
];

function getUniqueValues<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort();
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

function isAllowedDraftStatus(status: string) {
  return allowedDraftStatuses.includes(status as FandexSourceIngestionDraftStatus);
}

function isAllowedProviderMode(mode: string) {
  return allowedProviderModes.includes(mode as FandexSourceIngestionDraftProviderMode);
}

function getDraftStatusCount(
  drafts: FandexSourceIngestionDraft[],
  draftStatus: FandexSourceIngestionDraftStatus,
) {
  return drafts.filter((draft) => draft.draftStatus === draftStatus).length;
}

function createSourceItemMap(items?: FandexNormalizedSourceItem[]) {
  const sourceItems = items ?? runSourceProviderPreviewImport().sourceItems;

  return new Map(sourceItems.map((item) => [item.sourceId, item]));
}

function sortDrafts(drafts: FandexSourceIngestionDraft[]) {
  const statusRank: Record<FandexSourceIngestionDraftStatus, number> = {
    ready: 0,
    review: 1,
    limited: 2,
    blocked: 3,
    skipped: 4,
  };

  return [...drafts].sort(
    (first, second) =>
      statusRank[first.draftStatus] - statusRank[second.draftStatus]
      || second.previewSignalWeight - first.previewSignalWeight
      || first.draftKey.localeCompare(second.draftKey),
  );
}

function hasRequiredDraftKeys(action: FandexSourceSignalReviewActionPlan) {
  return (
    action.actionKey.trim().length > 0
    && action.reviewKey.trim().length > 0
    && action.sourceId.trim().length > 0
    && action.candidateKey.trim().length > 0
    && action.artistId.trim().length > 0
    && action.variableKey.trim().length > 0
  );
}

export function getSourceIngestionDraftStatusFromReviewAction(
  action: FandexSourceSignalReviewActionPlan,
): FandexSourceIngestionDraftStatus {
  if (!hasRequiredDraftKeys(action) || action.actionMode === 'skip_preview') {
    return 'skipped';
  }

  if (action.actionMode === 'approve_preview') {
    return 'ready';
  }

  if (action.actionMode === 'hold_review') {
    return 'review';
  }

  if (action.actionMode === 'limit_preview') {
    return 'limited';
  }

  return 'blocked';
}

export function getSourceIngestionDraftProviderMode(
  provider: FandexSourceProvider,
): FandexSourceIngestionDraftProviderMode {
  if (provider === 'manual-preview') {
    return 'manual_import';
  }

  const adapter = getSourceProviderAdapterByProvider(provider);

  if (!adapter || adapter.status === 'planned' || adapter.status === 'disabled') {
    return 'future_external_provider';
  }

  if (adapter.status === 'mock') {
    return 'mock_provider';
  }

  return 'fixture_provider';
}

function getDraftReasonCodes(
  action: FandexSourceSignalReviewActionPlan,
  provider: FandexSourceProvider,
  draftStatus: FandexSourceIngestionDraftStatus,
): FandexSourceIngestionDraftReasonCode[] {
  const reasonCodes = new Set<FandexSourceIngestionDraftReasonCode>([
    'future_ingestion_only',
    'fixture_only',
    'preview_only',
    'review_action_available',
  ]);

  if (provider.trim().length > 0) {
    reasonCodes.add('provider_fixture_ready');
    reasonCodes.add('adapter_preview_available');
  } else {
    reasonCodes.add('missing_provider');
  }

  if (action.candidateKey.trim().length === 0) {
    reasonCodes.add('missing_candidate');
  }

  if (action.requiresManualReview) {
    reasonCodes.add('manual_review_required');
  }

  if (draftStatus === 'limited') {
    reasonCodes.add('limited_source');
  }

  if (draftStatus === 'blocked') {
    reasonCodes.add('blocked_source');
  }

  if (action.warnings.length > 0) {
    reasonCodes.add('warning_present');
  }

  return Array.from(reasonCodes).sort();
}

export function getSourceIngestionDraftStatusLabel(
  status: FandexSourceIngestionDraftStatus,
) {
  const labels: Record<FandexSourceIngestionDraftStatus, string> = {
    ready: '수집 draft 준비',
    review: '수집 전 검토',
    limited: '제한 수집 후보',
    blocked: '수집 제외 후보',
    skipped: '스킵',
  };

  return labels[status];
}

export function getSourceIngestionDraftProviderModeLabel(
  providerMode: FandexSourceIngestionDraftProviderMode,
) {
  const labels: Record<FandexSourceIngestionDraftProviderMode, string> = {
    fixture_provider: 'fixture provider',
    mock_provider: 'mock provider',
    manual_import: '수동 import 후보',
    future_external_provider: '향후 외부 provider 후보',
  };

  return labels[providerMode];
}

export function getSourceIngestionDraftReasonLabel(
  reasonCode: FandexSourceIngestionDraftReasonCode,
) {
  const labels: Record<FandexSourceIngestionDraftReasonCode, string> = {
    provider_fixture_ready: 'fixture provider 준비됨',
    adapter_preview_available: 'adapter preview 존재',
    review_action_available: 'review action preview 존재',
    manual_review_required: '수동 검토 필요',
    limited_source: '제한 source',
    blocked_source: '제외 source',
    missing_provider: 'provider 누락',
    missing_candidate: 'candidate 누락',
    warning_present: 'warning 존재',
    future_ingestion_only: '향후 수집 설계 전용',
    fixture_only: 'fixture 기반 preview',
    preview_only: '실제 수집 없음',
  };

  return labels[reasonCode];
}

export function getSourceIngestionDrafts(
  items?: FandexNormalizedSourceItem[],
): FandexSourceIngestionDraft[] {
  const sourceItemMap = createSourceItemMap(items);

  return getSourceSignalReviewActionPlans(items).map((action, index) => {
    const sourceItem = sourceItemMap.get(action.sourceId);
    const provider = sourceItem?.provider ?? 'manual-preview';
    const providerMode = getSourceIngestionDraftProviderMode(provider);
    const draftStatus = getSourceIngestionDraftStatusFromReviewAction(action);
    const reasonCodes = getDraftReasonCodes(action, provider, draftStatus);

    return {
      draftKey: `${action.actionKey}::ingestion-draft::${index + 1}`,
      provider,
      providerMode,
      sourceId: action.sourceId,
      candidateKey: action.candidateKey,
      artistId: action.artistId,
      variableKey: action.variableKey,
      reviewKey: action.reviewKey,
      actionKey: action.actionKey,
      draftStatus,
      actionMode: action.actionMode,
      riskLevel: action.riskLevel,
      previewSignalWeight: action.previewSignalWeight,
      reasonCodes,
      warnings: action.warnings,
      requiresManualReview: action.requiresManualReview,
      summaryLabel:
        `${action.artistId} / ${action.variableKey} ${getSourceIngestionDraftStatusLabel(
          draftStatus,
        )}`,
      summaryNote:
        `Read-only ingestion draft candidate from ${getSourceSignalReviewActionModeLabel(
          action.actionMode,
        )} / ${getSourceSignalReviewActionRiskLabel(
          action.riskLevel,
        )}. ready and blocked are preview states only. This helper does not collect external sources, call APIs, store files, write DB records, or apply FANDEX score changes.`,
      previewOnly: true,
    };
  });
}

export function getSourceIngestionDraftGroups(
  items?: FandexNormalizedSourceItem[],
): FandexSourceIngestionDraftGroup[] {
  const groupMap = new Map<string, FandexSourceIngestionDraftGroupBucket>();

  getSourceIngestionDrafts(items).forEach((draft) => {
    const groupKey = `${draft.provider}::${draft.providerMode}`;
    const existingGroup = groupMap.get(groupKey);

    if (existingGroup) {
      existingGroup.drafts.push(draft);
      return;
    }

    groupMap.set(groupKey, {
      groupKey,
      provider: draft.provider,
      providerMode: draft.providerMode,
      drafts: [draft],
    });
  });

  return Array.from(groupMap.values())
    .map(({
      groupKey,
      provider,
      providerMode,
      drafts,
    }): FandexSourceIngestionDraftGroup => {
      const sortedDrafts = sortDrafts(drafts);
      const blockedDraftKeys = sortedDrafts
        .filter((draft) => draft.draftStatus === 'blocked')
        .map((draft) => draft.draftKey)
        .slice(0, 5);

      return {
        groupKey,
        provider,
        providerMode,
        draftCount: drafts.length,
        readyCount: getDraftStatusCount(drafts, 'ready'),
        reviewCount: getDraftStatusCount(drafts, 'review'),
        limitedCount: getDraftStatusCount(drafts, 'limited'),
        blockedCount: getDraftStatusCount(drafts, 'blocked'),
        skippedCount: getDraftStatusCount(drafts, 'skipped'),
        warningCount: drafts.flatMap((draft) => draft.warnings).length,
        manualReviewCount: drafts.filter((draft) => draft.requiresManualReview).length,
        topDraftKeys: sortedDrafts
          .map((draft) => draft.draftKey)
          .slice(0, 5),
        blockedDraftKeys,
        summaryLabel: `${provider} / ${providerMode} ingestion draft preview group`,
        summaryNote:
          'Grouped read-only source ingestion draft candidates. No external provider collection, storage, or FANDEX score application is performed.',
        previewOnly: true,
      };
    })
    .sort((first, second) => second.draftCount - first.draftCount
      || first.groupKey.localeCompare(second.groupKey));
}

export function getSourceIngestionDraftSummary(
  items?: FandexNormalizedSourceItem[],
): FandexSourceIngestionDraftSummary {
  const drafts = getSourceIngestionDrafts(items);
  const groups = getSourceIngestionDraftGroups(items);
  const actionSummary = getSourceSignalReviewActionSummary(items);

  return {
    draftCount: drafts.length,
    groupCount: groups.length,
    providerCount: new Set(drafts.map((draft) => draft.provider)).size,
    readyCount: getDraftStatusCount(drafts, 'ready'),
    reviewCount: getDraftStatusCount(drafts, 'review'),
    limitedCount: getDraftStatusCount(drafts, 'limited'),
    blockedCount: getDraftStatusCount(drafts, 'blocked'),
    skippedCount: getDraftStatusCount(drafts, 'skipped'),
    warningCount: drafts.flatMap((draft) => draft.warnings).length,
    manualReviewCount: drafts.filter((draft) => draft.requiresManualReview).length,
    readyDraftKeys: getUniqueValues(
      drafts
        .filter((draft) => draft.draftStatus === 'ready')
        .map((draft) => draft.draftKey),
    ).slice(0, 8),
    reviewDraftKeys: getUniqueValues(
      drafts
        .filter((draft) => draft.draftStatus === 'review')
        .map((draft) => draft.draftKey),
    ).slice(0, 8),
    blockedDraftKeys: getUniqueValues(
      drafts
        .filter((draft) => draft.draftStatus === 'blocked')
        .map((draft) => draft.draftKey),
    ).slice(0, 8),
    summaryLabel: 'source ingestion draft preview',
    summaryNote:
      `${actionSummary.summaryLabel}. Ingestion drafts are fixture/helper-based read-only candidates and do not collect external sources, call APIs, store data, calculate score deltas, or apply FANDEX scores.`,
    previewOnly: true,
  };
}

export function runSourceIngestionDraftShapeCheck(
  items?: FandexNormalizedSourceItem[],
): FandexSourceIngestionDraftShapeCheckResult {
  const issues: FandexSourceIngestionDraftShapeCheckIssue[] = [];
  const providerShapeCheck = runSourceProviderRegistryShapeCheck();
  const actionShapeCheck = runSourceSignalReviewActionShapeCheck(items);
  const drafts = getSourceIngestionDrafts(items);
  const groups = getSourceIngestionDraftGroups(items);
  const summary = getSourceIngestionDraftSummary(items);

  if (providerShapeCheck.issues.some((issue) => issue.severity === 'error')) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Source provider registry shape check must pass before ingestion draft preview.',
    });
  }

  if (actionShapeCheck.issues.some((issue) => issue.severity === 'error')) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Source signal review action shape check must pass before ingestion draft preview.',
    });
  }

  if (drafts.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-ingestion-drafts',
      message: 'Source ingestion drafts must not be empty.',
    });
  }

  if (groups.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-ingestion-draft-groups',
      message: 'Source ingestion draft groups must not be empty.',
    });
  }

  drafts.forEach((draft) => {
    if (!isAllowedDraftStatus(draft.draftStatus)) {
      issues.push({
        severity: 'error',
        code: 'invalid-draft-status',
        message: `Invalid draftStatus: ${draft.draftKey}`,
        draftKey: draft.draftKey,
        sourceId: draft.sourceId,
        actionKey: draft.actionKey,
      });
    }

    if (!isAllowedProviderMode(draft.providerMode)) {
      issues.push({
        severity: 'error',
        code: 'invalid-provider-mode',
        message: `Invalid providerMode: ${draft.draftKey}`,
        draftKey: draft.draftKey,
        sourceId: draft.sourceId,
        actionKey: draft.actionKey,
      });
    }

    if (draft.reasonCodes.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-reason-codes',
        message: `Ingestion draft reasonCodes must not be empty: ${draft.draftKey}`,
        draftKey: draft.draftKey,
        sourceId: draft.sourceId,
        actionKey: draft.actionKey,
      });
    }

    if (draft.provider.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-provider',
        message: `Ingestion draft provider must not be empty: ${draft.draftKey}`,
        draftKey: draft.draftKey,
        sourceId: draft.sourceId,
        actionKey: draft.actionKey,
      });
    }

    if (draft.previewOnly !== true) {
      issues.push({
        severity: 'error',
        code: 'invalid-preview-only',
        message: `Ingestion draft previewOnly must be true: ${draft.draftKey}`,
        draftKey: draft.draftKey,
        sourceId: draft.sourceId,
        actionKey: draft.actionKey,
      });
    }
  });

  if (hasDuplicateValues(drafts.map((draft) => draft.draftKey))) {
    issues.push({
      severity: 'error',
      code: 'duplicate-draft-key',
      message: 'Ingestion draft keys must be unique.',
    });
  }

  if (hasDuplicateValues(drafts.map((draft) => draft.sourceId))) {
    issues.push({
      severity: 'warning',
      code: 'duplicate-source-id',
      message: 'Source IDs are duplicated across ingestion drafts.',
    });
  }

  if (hasDuplicateValues(drafts.map((draft) => draft.candidateKey))) {
    issues.push({
      severity: 'warning',
      code: 'duplicate-candidate-key',
      message: 'Candidate keys are duplicated across ingestion drafts.',
    });
  }

  if (hasDuplicateValues(drafts.map((draft) => draft.actionKey))) {
    issues.push({
      severity: 'warning',
      code: 'duplicate-action-key',
      message: 'Action keys are duplicated across ingestion drafts.',
    });
  }

  if (summary.draftCount !== drafts.length || summary.groupCount !== groups.length) {
    issues.push({
      severity: 'error',
      code: 'invalid-summary-count',
      message: 'Ingestion draft summary counts must match draft and group arrays.',
    });
  }

  if (hasDuplicateValues(summary.readyDraftKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-ready-draft-key',
      message: 'readyDraftKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.reviewDraftKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-review-draft-key',
      message: 'reviewDraftKeys must be unique.',
    });
  }

  if (hasDuplicateValues(summary.blockedDraftKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-blocked-draft-key',
      message: 'blockedDraftKeys must be unique.',
    });
  }

  groups.forEach((group) => {
    if (hasDuplicateValues(group.topDraftKeys)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-draft-key',
        message: `topDraftKeys must be unique: ${group.groupKey}`,
      });
    }

    if (hasDuplicateValues(group.blockedDraftKeys)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-blocked-draft-key',
        message: `blockedDraftKeys must be unique: ${group.groupKey}`,
      });
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    draftCount: drafts.length,
    groupCount: groups.length,
    issues,
  };
}
