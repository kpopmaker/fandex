import type { FandexSourceProvider } from './sourceIngestionTypes';
import type { FandexSourceIngestionDraftProviderMode } from './sourceIngestionDraftTypes';

export type FandexSourceProviderSyncCadence =
  | 'manual'
  | 'hourly_preview'
  | 'daily_preview'
  | 'weekly_preview'
  | 'event_based_preview'
  | 'disabled';

export type FandexSourceProviderFreshnessStatus =
  | 'fresh'
  | 'acceptable'
  | 'stale'
  | 'expired'
  | 'unknown';

export type FandexSourceProviderRetryMode =
  | 'no_retry'
  | 'manual_retry'
  | 'limited_retry'
  | 'blocked_retry';

export type FandexSourceProviderDuplicatePolicy =
  | 'allow_preview'
  | 'merge_by_source_id'
  | 'merge_by_candidate_key'
  | 'block_duplicate'
  | 'manual_review';

export type FandexSourceProviderSyncPolicyReasonCode =
  | 'ingestion_draft_ready'
  | 'manual_review_required'
  | 'provider_fixture_only'
  | 'future_provider_only'
  | 'stale_policy_required'
  | 'retry_policy_required'
  | 'duplicate_policy_required'
  | 'warning_present'
  | 'disabled_provider'
  | 'preview_only';

export type FandexSourceProviderSyncPolicy = {
  policyKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  syncCadence: FandexSourceProviderSyncCadence;
  freshnessStatus: FandexSourceProviderFreshnessStatus;
  retryMode: FandexSourceProviderRetryMode;
  duplicatePolicy: FandexSourceProviderDuplicatePolicy;
  draftCount: number;
  readyDraftCount: number;
  reviewDraftCount: number;
  blockedDraftCount: number;
  warningCount: number;
  manualReviewCount: number;
  reasonCodes: FandexSourceProviderSyncPolicyReasonCode[];
  warnings: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceProviderSyncPolicySummary = {
  policyCount: number;
  providerCount: number;
  manualPolicyCount: number;
  hourlyPreviewCount: number;
  dailyPreviewCount: number;
  disabledPolicyCount: number;
  freshPolicyCount: number;
  stalePolicyCount: number;
  expiredPolicyCount: number;
  retryPolicyCount: number;
  duplicateReviewPolicyCount: number;
  warningCount: number;
  manualReviewCount: number;
  readyPolicyKeys: string[];
  reviewPolicyKeys: string[];
  disabledPolicyKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
