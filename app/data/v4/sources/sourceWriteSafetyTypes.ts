import type { FandexSourceProvider } from './sourceIngestionTypes';
import type { FandexSourceIngestionDraftProviderMode } from './sourceIngestionDraftTypes';
import type {
  FandexSourceStorageBoundaryStatus,
  FandexSourceStorageRecordKind,
  FandexSourceWriteGuardStatus,
} from './sourceStorageBoundaryTypes';

export type FandexSourceWriteSafetyStatus =
  | 'dry_run_safe'
  | 'review_required'
  | 'limited_dry_run'
  | 'blocked'
  | 'skipped';

export type FandexSourceWriteSafetyGateStatus =
  | 'gate_passed_preview'
  | 'gate_warning_preview'
  | 'gate_blocked_preview'
  | 'gate_skipped_preview';

export type FandexSourceWriteSafetyRiskLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'blocked';

export type FandexSourceWriteSafetyAuditRequirement =
  | 'idempotency_check'
  | 'duplicate_check'
  | 'freshness_check'
  | 'manual_review_check'
  | 'rollback_plan_check'
  | 'write_guard_check'
  | 'preview_only_check';

export type FandexSourceWriteSafetyReasonCode =
  | 'storage_boundary_ready'
  | 'dry_run_key_available'
  | 'idempotency_key_available'
  | 'write_guard_preview_available'
  | 'manual_review_required'
  | 'limited_boundary'
  | 'blocked_boundary'
  | 'duplicate_risk'
  | 'stale_risk'
  | 'missing_audit_requirement'
  | 'rollback_required'
  | 'preview_only'
  | 'no_actual_write';

export type FandexSourceWriteSafetyPlan = {
  safetyKey: string;
  boundaryKey: string;
  policyKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  recordKind: FandexSourceStorageRecordKind;
  boundaryStatus: FandexSourceStorageBoundaryStatus;
  writeGuardStatus: FandexSourceWriteGuardStatus;
  safetyStatus: FandexSourceWriteSafetyStatus;
  gateStatus: FandexSourceWriteSafetyGateStatus;
  riskLevel: FandexSourceWriteSafetyRiskLevel;
  idempotencyKey: string;
  dryRunWriteKey: string;
  auditRequirements: FandexSourceWriteSafetyAuditRequirement[];
  reasonCodes: FandexSourceWriteSafetyReasonCode[];
  warnings: string[];
  manualReviewCount: number;
  warningCount: number;
  rollbackRequired: boolean;
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceWriteSafetyGroup = {
  groupKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  safetyPlanCount: number;
  dryRunSafeCount: number;
  reviewRequiredCount: number;
  limitedDryRunCount: number;
  blockedCount: number;
  skippedCount: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  blockedRiskCount: number;
  warningCount: number;
  manualReviewCount: number;
  topSafetyKeys: string[];
  blockedSafetyKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceWriteSafetySummary = {
  safetyPlanCount: number;
  groupCount: number;
  providerCount: number;
  dryRunSafeCount: number;
  reviewRequiredCount: number;
  limitedDryRunCount: number;
  blockedCount: number;
  skippedCount: number;
  gatePassedCount: number;
  gateWarningCount: number;
  gateBlockedCount: number;
  gateSkippedCount: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  highRiskCount: number;
  blockedRiskCount: number;
  rollbackRequiredCount: number;
  warningCount: number;
  manualReviewCount: number;
  safeSafetyKeys: string[];
  reviewSafetyKeys: string[];
  blockedSafetyKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
