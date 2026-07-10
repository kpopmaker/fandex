import type { FandexSourceProvider } from './sourceIngestionTypes';
import type { FandexSourceIngestionDraftProviderMode } from './sourceIngestionDraftTypes';
import type { FandexSourceStorageRecordKind } from './sourceStorageBoundaryTypes';
import type {
  FandexSourceWriteSafetyGateStatus,
  FandexSourceWriteSafetyRiskLevel,
  FandexSourceWriteSafetyStatus,
} from './sourceWriteSafetyTypes';

export type FandexSourceWriteAuditStatus =
  | 'audit_ready'
  | 'audit_review_required'
  | 'audit_limited'
  | 'audit_blocked'
  | 'skipped';

export type FandexSourceWriteAuditCheckpointStatus =
  | 'checkpoint_passed_preview'
  | 'checkpoint_warning_preview'
  | 'checkpoint_blocked_preview'
  | 'checkpoint_skipped_preview';

export type FandexSourceWriteAuditSeverity =
  | 'info'
  | 'warning'
  | 'risk'
  | 'blocked';

export type FandexSourceWriteAuditCheckpointKind =
  | 'safety_plan_checkpoint'
  | 'idempotency_checkpoint'
  | 'dry_run_write_checkpoint'
  | 'duplicate_checkpoint'
  | 'freshness_checkpoint'
  | 'manual_review_checkpoint'
  | 'rollback_checkpoint'
  | 'preview_only_checkpoint';

export type FandexSourceWriteAuditReasonCode =
  | 'write_safety_ready'
  | 'safety_gate_passed'
  | 'safety_gate_warning'
  | 'safety_gate_blocked'
  | 'idempotency_key_available'
  | 'dry_run_key_available'
  | 'audit_checkpoint_required'
  | 'manual_review_required'
  | 'rollback_evidence_required'
  | 'duplicate_risk'
  | 'stale_risk'
  | 'blocked_safety_plan'
  | 'preview_only'
  | 'no_actual_audit_log'
  | 'no_actual_write';

export type FandexSourceWriteAuditCheckpoint = {
  checkpointKey: string;
  kind: FandexSourceWriteAuditCheckpointKind;
  status: FandexSourceWriteAuditCheckpointStatus;
  severity: FandexSourceWriteAuditSeverity;
  label: string;
  note: string;
  previewOnly: true;
};

export type FandexSourceWriteAuditPlan = {
  auditKey: string;
  safetyKey: string;
  boundaryKey: string;
  policyKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  recordKind: FandexSourceStorageRecordKind;
  safetyStatus: FandexSourceWriteSafetyStatus;
  gateStatus: FandexSourceWriteSafetyGateStatus;
  riskLevel: FandexSourceWriteSafetyRiskLevel;
  auditStatus: FandexSourceWriteAuditStatus;
  checkpointStatus: FandexSourceWriteAuditCheckpointStatus;
  severity: FandexSourceWriteAuditSeverity;
  idempotencyKey: string;
  dryRunWriteKey: string;
  checkpoints: FandexSourceWriteAuditCheckpoint[];
  reasonCodes: FandexSourceWriteAuditReasonCode[];
  warnings: string[];
  manualReviewCount: number;
  warningCount: number;
  rollbackRequired: boolean;
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceWriteAuditGroup = {
  groupKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  auditPlanCount: number;
  auditReadyCount: number;
  auditReviewRequiredCount: number;
  auditLimitedCount: number;
  auditBlockedCount: number;
  skippedCount: number;
  infoCount: number;
  warningCount: number;
  riskCount: number;
  blockedSeverityCount: number;
  manualReviewCount: number;
  rollbackRequiredCount: number;
  topAuditKeys: string[];
  blockedAuditKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceWriteAuditSummary = {
  auditPlanCount: number;
  groupCount: number;
  providerCount: number;
  auditReadyCount: number;
  auditReviewRequiredCount: number;
  auditLimitedCount: number;
  auditBlockedCount: number;
  skippedCount: number;
  checkpointPassedCount: number;
  checkpointWarningCount: number;
  checkpointBlockedCount: number;
  checkpointSkippedCount: number;
  infoCount: number;
  warningCount: number;
  riskCount: number;
  blockedSeverityCount: number;
  rollbackRequiredCount: number;
  manualReviewCount: number;
  readyAuditKeys: string[];
  reviewAuditKeys: string[];
  blockedAuditKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
