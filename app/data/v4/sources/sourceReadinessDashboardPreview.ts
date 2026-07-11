import { getSourceIngestionDraftSummary, runSourceIngestionDraftShapeCheck } from './sourceIngestionDraftPreview';
import { getSourceProviderSyncPolicySummary, runSourceProviderSyncPolicyShapeCheck } from './sourceProviderSyncPolicyPreview';
import { getSourceRollbackReadinessSummary, runSourceRollbackReadinessShapeCheck } from './sourceRollbackReadinessPreview';
import { getSourceStorageBoundarySummary, runSourceStorageBoundaryShapeCheck } from './sourceStorageBoundaryPreview';
import { getSourceWriteAuditSummary, runSourceWriteAuditShapeCheck } from './sourceWriteAuditPreview';
import { getSourceWriteSafetySummary, runSourceWriteSafetyShapeCheck } from './sourceWriteSafetyPreview';
import type {
  FandexSourceReadinessDashboardPreview,
  FandexSourceReadinessDashboardShapeCheckIssue,
  FandexSourceReadinessDashboardShapeCheckResult,
  FandexSourceReadinessDashboardSummary,
  FandexSourceReadinessReasonCode,
  FandexSourceReadinessRiskLevel,
  FandexSourceReadinessStageCard,
  FandexSourceReadinessStageKey,
  FandexSourceReadinessStageStatus,
} from './sourceReadinessDashboardTypes';

const stageKeys: readonly FandexSourceReadinessStageKey[] = ['ingestion_draft', 'provider_sync_policy', 'storage_boundary', 'write_safety', 'write_audit', 'rollback_readiness'];
const stageStatuses: readonly FandexSourceReadinessStageStatus[] = ['ready_preview', 'review_required', 'limited_preview', 'blocked_preview', 'skipped'];
const riskLevels: readonly FandexSourceReadinessRiskLevel[] = ['low', 'medium', 'high', 'blocked'];

type StageMetrics = Omit<FandexSourceReadinessStageCard, 'stageStatus' | 'riskLevel' | 'reasonCodes' | 'summaryLabel' | 'summaryNote' | 'previewOnly'> & {
  availableReason: FandexSourceReadinessReasonCode;
  safetyReasons: FandexSourceReadinessReasonCode[];
};

function getStageStatus(metrics: StageMetrics): FandexSourceReadinessStageStatus {
  if (metrics.itemCount === 0) return 'skipped';
  if (metrics.blockedCount > 0 || !metrics.shapeCheckPassed) return 'blocked_preview';
  if (metrics.reviewCount > 0 || metrics.manualReviewCount > 0) return 'review_required';
  if (metrics.limitedCount > 0) return 'limited_preview';
  return metrics.readyCount > 0 ? 'ready_preview' : 'limited_preview';
}

function getRiskLevel(metrics: StageMetrics): FandexSourceReadinessRiskLevel {
  if (metrics.blockedCount > 0 || !metrics.shapeCheckPassed) return 'blocked';
  if (metrics.reviewCount > 0 || metrics.manualReviewCount > 0) return 'high';
  if (metrics.warningCount > 0 || metrics.limitedCount > 0) return 'medium';
  return 'low';
}

function makeStageCard(metrics: StageMetrics): FandexSourceReadinessStageCard {
  const stageStatus = getStageStatus(metrics);
  const riskLevel = getRiskLevel(metrics);
  const reasonCodes = new Set<FandexSourceReadinessReasonCode>([metrics.availableReason, 'preview_only', ...metrics.safetyReasons]);
  if (metrics.reviewCount > 0 || metrics.manualReviewCount > 0) reasonCodes.add('manual_review_required');
  if (metrics.limitedCount > 0) reasonCodes.add('limited_preview');
  if (metrics.blockedCount > 0) reasonCodes.add('blocked_preview');
  if (!metrics.shapeCheckPassed) reasonCodes.add('shape_check_failed');
  return {
    stageKey: metrics.stageKey,
    stageStatus,
    riskLevel,
    itemCount: metrics.itemCount,
    readyCount: metrics.readyCount,
    reviewCount: metrics.reviewCount,
    limitedCount: metrics.limitedCount,
    blockedCount: metrics.blockedCount,
    skippedCount: metrics.skippedCount,
    warningCount: metrics.warningCount,
    manualReviewCount: metrics.manualReviewCount,
    shapeCheckPassed: metrics.shapeCheckPassed,
    reasonCodes: Array.from(reasonCodes),
    summaryLabel: `${getSourceReadinessStageLabel(metrics.stageKey)} / ${getSourceReadinessStageStatusLabel(stageStatus)}`,
    summaryNote: `${getSourceReadinessRiskLevelLabel(riskLevel)} 위험도의 fixture/helper 기반 read-only readiness preview다.`,
    previewOnly: true,
  };
}

export function getSourceReadinessStageCards(): FandexSourceReadinessStageCard[] {
  const ingestion = getSourceIngestionDraftSummary();
  const sync = getSourceProviderSyncPolicySummary();
  const storage = getSourceStorageBoundarySummary();
  const safety = getSourceWriteSafetySummary();
  const audit = getSourceWriteAuditSummary();
  const rollback = getSourceRollbackReadinessSummary();
  return [
    makeStageCard({ stageKey: 'ingestion_draft', itemCount: ingestion.draftCount, readyCount: ingestion.readyCount, reviewCount: ingestion.reviewCount, limitedCount: ingestion.limitedCount, blockedCount: ingestion.blockedCount, skippedCount: ingestion.skippedCount, warningCount: ingestion.warningCount, manualReviewCount: ingestion.manualReviewCount, shapeCheckPassed: runSourceIngestionDraftShapeCheck().isValid, availableReason: 'ingestion_draft_available', safetyReasons: ['no_actual_ingestion'] }),
    makeStageCard({ stageKey: 'provider_sync_policy', itemCount: sync.policyCount, readyCount: sync.readyPolicyKeys.length, reviewCount: sync.reviewPolicyKeys.length, limitedCount: sync.stalePolicyCount + sync.expiredPolicyCount, blockedCount: sync.disabledPolicyCount, skippedCount: sync.disabledPolicyCount, warningCount: sync.warningCount, manualReviewCount: sync.manualReviewCount, shapeCheckPassed: runSourceProviderSyncPolicyShapeCheck().isValid, availableReason: 'sync_policy_available', safetyReasons: ['no_actual_sync'] }),
    makeStageCard({ stageKey: 'storage_boundary', itemCount: storage.boundaryPlanCount, readyCount: storage.readyForDryRunCount, reviewCount: storage.needsReviewCount, limitedCount: storage.writeLimitedCount, blockedCount: storage.writeBlockedCount, skippedCount: storage.skippedCount, warningCount: storage.warningCount, manualReviewCount: storage.manualReviewCount, shapeCheckPassed: runSourceStorageBoundaryShapeCheck().isValid, availableReason: 'storage_boundary_available', safetyReasons: ['no_actual_write'] }),
    makeStageCard({ stageKey: 'write_safety', itemCount: safety.safetyPlanCount, readyCount: safety.dryRunSafeCount, reviewCount: safety.reviewRequiredCount, limitedCount: safety.limitedDryRunCount, blockedCount: safety.blockedCount, skippedCount: safety.skippedCount, warningCount: safety.warningCount, manualReviewCount: safety.manualReviewCount, shapeCheckPassed: runSourceWriteSafetyShapeCheck().isValid, availableReason: 'write_safety_available', safetyReasons: ['no_actual_write'] }),
    makeStageCard({ stageKey: 'write_audit', itemCount: audit.auditPlanCount, readyCount: audit.auditReadyCount, reviewCount: audit.auditReviewRequiredCount, limitedCount: audit.auditLimitedCount, blockedCount: audit.auditBlockedCount, skippedCount: audit.skippedCount, warningCount: audit.warningCount, manualReviewCount: audit.manualReviewCount, shapeCheckPassed: runSourceWriteAuditShapeCheck().isValid, availableReason: 'write_audit_available', safetyReasons: ['no_actual_audit_log', 'no_actual_write'] }),
    makeStageCard({ stageKey: 'rollback_readiness', itemCount: rollback.rollbackPlanCount, readyCount: rollback.rollbackReadyCount, reviewCount: rollback.rollbackReviewRequiredCount, limitedCount: rollback.rollbackLimitedCount, blockedCount: rollback.rollbackBlockedCount, skippedCount: rollback.skippedCount, warningCount: rollback.warningCount, manualReviewCount: rollback.manualReviewCount, shapeCheckPassed: runSourceRollbackReadinessShapeCheck().isValid, availableReason: 'rollback_readiness_available', safetyReasons: ['no_actual_rollback', 'no_actual_write'] }),
  ];
}

export function getSourceReadinessDashboardSummary(): FandexSourceReadinessDashboardSummary {
  const cards = getSourceReadinessStageCards();
  const statusCount = (status: FandexSourceReadinessStageStatus) => cards.filter((card) => card.stageStatus === status).length;
  const riskCount = (risk: FandexSourceReadinessRiskLevel) => cards.filter((card) => card.riskLevel === risk).length;
  return {
    stageCount: cards.length,
    readyStageCount: statusCount('ready_preview'), reviewStageCount: statusCount('review_required'), limitedStageCount: statusCount('limited_preview'), blockedStageCount: statusCount('blocked_preview'), skippedStageCount: statusCount('skipped'),
    lowRiskStageCount: riskCount('low'), mediumRiskStageCount: riskCount('medium'), highRiskStageCount: riskCount('high'), blockedRiskStageCount: riskCount('blocked'),
    readyStageKeys: cards.filter((card) => card.stageStatus === 'ready_preview').map((card) => card.stageKey),
    reviewStageKeys: cards.filter((card) => card.stageStatus === 'review_required').map((card) => card.stageKey),
    blockedStageKeys: cards.filter((card) => card.stageStatus === 'blocked_preview').map((card) => card.stageKey),
    summaryLabel: 'source readiness dashboard preview',
    summaryNote: 'v17~v22 source pipeline helper를 요약하며 실제 ingestion, sync, write, audit log 또는 rollback을 실행하지 않는다.',
    previewOnly: true,
  };
}

export function getSourceReadinessDashboardPreview(): FandexSourceReadinessDashboardPreview {
  return { stageCards: getSourceReadinessStageCards(), summary: getSourceReadinessDashboardSummary(), reasonCodes: ['preview_only', 'no_actual_ingestion', 'no_actual_sync', 'no_actual_write', 'no_actual_audit_log', 'no_actual_rollback'], previewOnly: true };
}

export function runSourceReadinessDashboardShapeCheck(): FandexSourceReadinessDashboardShapeCheckResult {
  const preview = getSourceReadinessDashboardPreview();
  const { stageCards, summary } = preview;
  const issues: FandexSourceReadinessDashboardShapeCheckIssue[] = [];
  const add = (code: FandexSourceReadinessDashboardShapeCheckIssue['code'], message: string, stageKey?: FandexSourceReadinessStageKey) => issues.push({ severity: 'error', code, message, stageKey });
  if (!stageCards.length) add('empty-stage-cards', 'Stage cards must not be empty.');
  stageKeys.forEach((stageKey) => { if (!stageCards.some((card) => card.stageKey === stageKey)) add('missing-stage', `Missing stage: ${stageKey}`, stageKey); });
  if (new Set(stageCards.map((card) => card.stageKey)).size !== stageCards.length) add('duplicate-stage-key', 'Stage keys must be unique.');
  stageCards.forEach((card) => {
    if (!stageStatuses.includes(card.stageStatus)) add('invalid-stage-status', `Invalid stage status: ${card.stageKey}`, card.stageKey);
    if (!riskLevels.includes(card.riskLevel)) add('invalid-risk-level', `Invalid risk level: ${card.stageKey}`, card.stageKey);
    if (!card.reasonCodes.length) add('empty-reason-codes', `Reason codes required: ${card.stageKey}`, card.stageKey);
    if (card.previewOnly !== true) add('invalid-preview-only', `Stage card must be preview-only: ${card.stageKey}`, card.stageKey);
  });
  if (summary.stageCount !== stageCards.length) add('invalid-summary-count', 'Summary stage count must match stage cards.');
  const summaryKeys = [...summary.readyStageKeys, ...summary.reviewStageKeys, ...summary.blockedStageKeys];
  if (new Set(summaryKeys).size !== summaryKeys.length) add('duplicate-summary-stage-key', 'Ready, review, and blocked summary stage keys must not overlap.');
  if (summary.previewOnly !== true || preview.previewOnly !== true) add('invalid-preview-only', 'Dashboard output must be preview-only.');
  return { isValid: issues.length === 0, stageCardCount: stageCards.length, issues };
}

export function getSourceReadinessStageLabel(stage: FandexSourceReadinessStageKey) {
  const labels: Record<FandexSourceReadinessStageKey, string> = { ingestion_draft: 'ingestion draft', provider_sync_policy: 'provider sync policy', storage_boundary: 'storage boundary', write_safety: 'write safety', write_audit: 'write audit', rollback_readiness: 'rollback readiness' };
  return labels[stage];
}

export function getSourceReadinessStageStatusLabel(status: FandexSourceReadinessStageStatus) {
  const labels: Record<FandexSourceReadinessStageStatus, string> = { ready_preview: '준비 preview', review_required: '검토 필요', limited_preview: '제한 preview', blocked_preview: '차단 preview', skipped: '스킵' };
  return labels[status];
}

export function getSourceReadinessRiskLevelLabel(risk: FandexSourceReadinessRiskLevel) {
  const labels: Record<FandexSourceReadinessRiskLevel, string> = { low: '낮음', medium: '중간', high: '높음', blocked: '차단' };
  return labels[risk];
}

export function getSourceReadinessReasonLabel(reason: FandexSourceReadinessReasonCode) {
  const labels: Record<FandexSourceReadinessReasonCode, string> = { ingestion_draft_available: 'ingestion draft 사용 가능', sync_policy_available: 'sync policy 사용 가능', storage_boundary_available: 'storage boundary 사용 가능', write_safety_available: 'write safety 사용 가능', write_audit_available: 'write audit 사용 가능', rollback_readiness_available: 'rollback readiness 사용 가능', manual_review_required: '수동 검토 필요', limited_preview: '제한 preview', blocked_preview: '차단 preview', shape_check_failed: 'shape check 실패', preview_only: 'preview 전용', no_actual_ingestion: '실제 ingestion 없음', no_actual_sync: '실제 sync 없음', no_actual_write: '실제 write 없음', no_actual_audit_log: '실제 audit log 없음', no_actual_rollback: '실제 rollback 없음' };
  return labels[reason];
}
