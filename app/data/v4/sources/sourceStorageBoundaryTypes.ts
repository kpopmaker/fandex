import type { FandexSourceProvider } from './sourceIngestionTypes';
import type { FandexSourceIngestionDraftProviderMode } from './sourceIngestionDraftTypes';
import type {
  FandexSourceProviderDuplicatePolicy,
  FandexSourceProviderFreshnessStatus,
  FandexSourceProviderRetryMode,
  FandexSourceProviderSyncCadence,
} from './sourceProviderSyncPolicyTypes';

export type FandexSourceStorageBoundaryStatus =
  | 'ready_for_dry_run'
  | 'needs_review'
  | 'write_limited'
  | 'write_blocked'
  | 'skipped';

export type FandexSourceStorageRecordKind =
  | 'source_item_record'
  | 'candidate_record'
  | 'provider_snapshot_record'
  | 'sync_policy_record'
  | 'review_action_record'
  | 'unknown';

export type FandexSourceWriteGuardStatus =
  | 'allowed_preview'
  | 'manual_review_required'
  | 'limited_preview'
  | 'blocked_preview';

export type FandexSourceStorageBoundaryReasonCode =
  | 'sync_policy_ready'
  | 'ingestion_draft_available'
  | 'provider_policy_available'
  | 'manual_review_required'
  | 'write_guard_required'
  | 'idempotency_required'
  | 'duplicate_boundary_required'
  | 'stale_boundary_required'
  | 'blocked_policy'
  | 'missing_provider'
  | 'missing_source_id'
  | 'preview_only'
  | 'no_actual_write';

export type FandexSourceStorageBoundaryPlan = {
  boundaryKey: string;
  policyKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  recordKind: FandexSourceStorageRecordKind;
  boundaryStatus: FandexSourceStorageBoundaryStatus;
  writeGuardStatus: FandexSourceWriteGuardStatus;
  idempotencyKey: string;
  dryRunWriteKey: string;
  syncCadence: FandexSourceProviderSyncCadence;
  freshnessStatus: FandexSourceProviderFreshnessStatus;
  retryMode: FandexSourceProviderRetryMode;
  duplicatePolicy: FandexSourceProviderDuplicatePolicy;
  draftCount: number;
  warningCount: number;
  manualReviewCount: number;
  reasonCodes: FandexSourceStorageBoundaryReasonCode[];
  warnings: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceStorageBoundaryGroup = {
  groupKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  boundaryPlanCount: number;
  readyForDryRunCount: number;
  needsReviewCount: number;
  writeLimitedCount: number;
  writeBlockedCount: number;
  skippedCount: number;
  warningCount: number;
  manualReviewCount: number;
  topBoundaryKeys: string[];
  blockedBoundaryKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceStorageBoundarySummary = {
  boundaryPlanCount: number;
  groupCount: number;
  providerCount: number;
  readyForDryRunCount: number;
  needsReviewCount: number;
  writeLimitedCount: number;
  writeBlockedCount: number;
  skippedCount: number;
  allowedPreviewCount: number;
  manualReviewRequiredCount: number;
  limitedPreviewCount: number;
  blockedPreviewCount: number;
  warningCount: number;
  manualReviewCount: number;
  readyBoundaryKeys: string[];
  reviewBoundaryKeys: string[];
  blockedBoundaryKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
