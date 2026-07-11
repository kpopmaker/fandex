export type FandexSourceReadinessStageKey =
  | 'ingestion_draft'
  | 'provider_sync_policy'
  | 'storage_boundary'
  | 'write_safety'
  | 'write_audit'
  | 'rollback_readiness';

export type FandexSourceReadinessStageStatus =
  | 'ready_preview'
  | 'review_required'
  | 'limited_preview'
  | 'blocked_preview'
  | 'skipped';

export type FandexSourceReadinessRiskLevel = 'low' | 'medium' | 'high' | 'blocked';

export type FandexSourceReadinessReasonCode =
  | 'ingestion_draft_available'
  | 'sync_policy_available'
  | 'storage_boundary_available'
  | 'write_safety_available'
  | 'write_audit_available'
  | 'rollback_readiness_available'
  | 'manual_review_required'
  | 'limited_preview'
  | 'blocked_preview'
  | 'shape_check_failed'
  | 'preview_only'
  | 'no_actual_ingestion'
  | 'no_actual_sync'
  | 'no_actual_write'
  | 'no_actual_audit_log'
  | 'no_actual_rollback';

export type FandexSourceReadinessStageCard = {
  stageKey: FandexSourceReadinessStageKey;
  stageStatus: FandexSourceReadinessStageStatus;
  riskLevel: FandexSourceReadinessRiskLevel;
  itemCount: number;
  readyCount: number;
  reviewCount: number;
  limitedCount: number;
  blockedCount: number;
  skippedCount: number;
  warningCount: number;
  manualReviewCount: number;
  shapeCheckPassed: boolean;
  reasonCodes: FandexSourceReadinessReasonCode[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceReadinessDashboardSummary = {
  stageCount: number;
  readyStageCount: number;
  reviewStageCount: number;
  limitedStageCount: number;
  blockedStageCount: number;
  skippedStageCount: number;
  lowRiskStageCount: number;
  mediumRiskStageCount: number;
  highRiskStageCount: number;
  blockedRiskStageCount: number;
  readyStageKeys: FandexSourceReadinessStageKey[];
  reviewStageKeys: FandexSourceReadinessStageKey[];
  blockedStageKeys: FandexSourceReadinessStageKey[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceReadinessDashboardPreview = {
  stageCards: FandexSourceReadinessStageCard[];
  summary: FandexSourceReadinessDashboardSummary;
  reasonCodes: FandexSourceReadinessReasonCode[];
  previewOnly: true;
};

export type FandexSourceReadinessDashboardShapeCheckIssue = {
  severity: 'error';
  code:
    | 'empty-stage-cards'
    | 'missing-stage'
    | 'duplicate-stage-key'
    | 'invalid-stage-status'
    | 'invalid-risk-level'
    | 'empty-reason-codes'
    | 'invalid-summary-count'
    | 'duplicate-summary-stage-key'
    | 'invalid-preview-only';
  message: string;
  stageKey?: FandexSourceReadinessStageKey;
};

export type FandexSourceReadinessDashboardShapeCheckResult = {
  isValid: boolean;
  stageCardCount: number;
  issues: FandexSourceReadinessDashboardShapeCheckIssue[];
};
