import type { FandexSourceProvider } from './sourceIngestionTypes';
import type { FandexSourceIngestionDraftProviderMode } from './sourceIngestionDraftTypes';
import type { FandexSourceStorageRecordKind } from './sourceStorageBoundaryTypes';
import type {
  FandexSourceWriteAuditCheckpointStatus,
  FandexSourceWriteAuditSeverity,
  FandexSourceWriteAuditStatus,
} from './sourceWriteAuditTypes';

export type FandexSourceRollbackReadinessStatus = 'rollback_ready' | 'rollback_review_required' | 'rollback_limited' | 'rollback_blocked' | 'skipped';
export type FandexSourceRollbackRecoveryStatus = 'recovery_ready_preview' | 'recovery_warning_preview' | 'recovery_blocked_preview' | 'recovery_skipped_preview';
export type FandexSourceRollbackRiskLevel = 'low' | 'medium' | 'high' | 'blocked';
export type FandexSourceRollbackCheckpointKind = 'audit_trace_checkpoint' | 'idempotency_checkpoint' | 'dry_run_write_checkpoint' | 'rollback_evidence_checkpoint' | 'previous_state_checkpoint' | 'duplicate_boundary_checkpoint' | 'manual_review_checkpoint' | 'preview_only_checkpoint';
export type FandexSourceRollbackReasonCode = 'audit_ready' | 'audit_review_required' | 'audit_limited' | 'audit_blocked' | 'idempotency_key_available' | 'dry_run_key_available' | 'rollback_evidence_available' | 'rollback_evidence_required' | 'previous_state_required' | 'manual_review_required' | 'duplicate_boundary_required' | 'stale_boundary_required' | 'blocked_audit_plan' | 'preview_only' | 'no_actual_rollback' | 'no_actual_write';

export type FandexSourceRollbackCheckpoint = {
  checkpointKey: string;
  kind: FandexSourceRollbackCheckpointKind;
  status: FandexSourceRollbackRecoveryStatus;
  riskLevel: FandexSourceRollbackRiskLevel;
  label: string;
  note: string;
  previewOnly: true;
};

export type FandexSourceRollbackReadinessPlan = {
  rollbackKey: string;
  auditKey: string;
  safetyKey: string;
  boundaryKey: string;
  policyKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  recordKind: FandexSourceStorageRecordKind;
  auditStatus: FandexSourceWriteAuditStatus;
  checkpointStatus: FandexSourceWriteAuditCheckpointStatus;
  auditSeverity: FandexSourceWriteAuditSeverity;
  readinessStatus: FandexSourceRollbackReadinessStatus;
  recoveryStatus: FandexSourceRollbackRecoveryStatus;
  riskLevel: FandexSourceRollbackRiskLevel;
  idempotencyKey: string;
  dryRunWriteKey: string;
  rollbackEvidenceKey: string;
  previousStateKey: string;
  checkpoints: FandexSourceRollbackCheckpoint[];
  reasonCodes: FandexSourceRollbackReasonCode[];
  warnings: string[];
  manualReviewCount: number;
  warningCount: number;
  rollbackRequired: boolean;
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceRollbackReadinessGroup = {
  groupKey: string; provider: FandexSourceProvider; providerMode: FandexSourceIngestionDraftProviderMode;
  rollbackPlanCount: number; rollbackReadyCount: number; rollbackReviewRequiredCount: number;
  rollbackLimitedCount: number; rollbackBlockedCount: number; skippedCount: number;
  lowRiskCount: number; mediumRiskCount: number; highRiskCount: number; blockedRiskCount: number;
  warningCount: number; manualReviewCount: number; rollbackRequiredCount: number;
  topRollbackKeys: string[]; blockedRollbackKeys: string[];
  summaryLabel: string; summaryNote: string; previewOnly: true;
};

export type FandexSourceRollbackReadinessSummary = {
  rollbackPlanCount: number; groupCount: number; providerCount: number;
  rollbackReadyCount: number; rollbackReviewRequiredCount: number; rollbackLimitedCount: number;
  rollbackBlockedCount: number; skippedCount: number; recoveryReadyCount: number;
  recoveryWarningCount: number; recoveryBlockedCount: number; recoverySkippedCount: number;
  lowRiskCount: number; mediumRiskCount: number; highRiskCount: number; blockedRiskCount: number;
  rollbackRequiredCount: number; warningCount: number; manualReviewCount: number;
  readyRollbackKeys: string[]; reviewRollbackKeys: string[]; blockedRollbackKeys: string[];
  summaryLabel: string; summaryNote: string; previewOnly: true;
};
