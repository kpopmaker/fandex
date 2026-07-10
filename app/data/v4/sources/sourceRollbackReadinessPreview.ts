import {
  getSourceWriteAuditCheckpointKindLabel,
  getSourceWriteAuditCheckpointStatusLabel,
  getSourceWriteAuditGroups,
  getSourceWriteAuditPlans,
  getSourceWriteAuditReasonLabel,
  getSourceWriteAuditSeverityLabel,
  getSourceWriteAuditStatusLabel,
  getSourceWriteAuditSummary,
  runSourceWriteAuditShapeCheck,
} from './sourceWriteAuditPreview';
import type { FandexSourceWriteAuditPlan } from './sourceWriteAuditTypes';
import type {
  FandexSourceRollbackCheckpoint, FandexSourceRollbackCheckpointKind,
  FandexSourceRollbackReadinessGroup, FandexSourceRollbackReadinessPlan,
  FandexSourceRollbackReadinessStatus, FandexSourceRollbackReadinessSummary,
  FandexSourceRollbackReasonCode, FandexSourceRollbackRecoveryStatus,
  FandexSourceRollbackRiskLevel,
} from './sourceRollbackReadinessTypes';

export type FandexSourceRollbackReadinessShapeCheckIssue = {
  severity: 'error' | 'warning';
  code: 'invalid-audit-shape' | 'empty-rollback-plans' | 'empty-rollback-groups' | 'invalid-readiness-status' | 'invalid-recovery-status' | 'invalid-risk-level' | 'empty-checkpoints' | 'invalid-checkpoint-kind' | 'duplicate-rollback-key' | 'missing-audit-key' | 'missing-safety-key' | 'missing-boundary-key' | 'missing-provider' | 'missing-preview-key' | 'missing-reason-code' | 'invalid-summary-count' | 'invalid-preview-only';
  message: string; rollbackKey?: string; checkpointKey?: string;
};
export type FandexSourceRollbackReadinessShapeCheckResult = {
  isValid: boolean; rollbackPlanCount: number; groupCount: number;
  issues: FandexSourceRollbackReadinessShapeCheckIssue[];
};

const readinessStatuses: readonly FandexSourceRollbackReadinessStatus[] = ['rollback_ready', 'rollback_review_required', 'rollback_limited', 'rollback_blocked', 'skipped'];
const recoveryStatuses: readonly FandexSourceRollbackRecoveryStatus[] = ['recovery_ready_preview', 'recovery_warning_preview', 'recovery_blocked_preview', 'recovery_skipped_preview'];
const riskLevels: readonly FandexSourceRollbackRiskLevel[] = ['low', 'medium', 'high', 'blocked'];
const checkpointKinds: readonly FandexSourceRollbackCheckpointKind[] = ['audit_trace_checkpoint', 'idempotency_checkpoint', 'dry_run_write_checkpoint', 'rollback_evidence_checkpoint', 'previous_state_checkpoint', 'duplicate_boundary_checkpoint', 'manual_review_checkpoint', 'preview_only_checkpoint'];
const unique = <T extends string>(values: T[]) => Array.from(new Set(values)).sort();

export function getSourceRollbackReadinessStatusFromAuditPlan(plan: FandexSourceWriteAuditPlan): FandexSourceRollbackReadinessStatus {
  if (plan.auditStatus === 'skipped') return 'skipped';
  if (plan.auditStatus === 'audit_blocked' || plan.checkpointStatus === 'checkpoint_blocked_preview') return 'rollback_blocked';
  if (plan.auditStatus === 'audit_review_required' || plan.manualReviewCount > 0) return 'rollback_review_required';
  if (plan.auditStatus === 'audit_limited' || plan.checkpointStatus === 'checkpoint_warning_preview') return 'rollback_limited';
  return 'rollback_ready';
}

export function getSourceRollbackRecoveryStatusFromAuditPlan(plan: FandexSourceWriteAuditPlan): FandexSourceRollbackRecoveryStatus {
  const status = getSourceRollbackReadinessStatusFromAuditPlan(plan);
  if (status === 'skipped') return 'recovery_skipped_preview';
  if (status === 'rollback_blocked') return 'recovery_blocked_preview';
  if (status === 'rollback_review_required' || status === 'rollback_limited') return 'recovery_warning_preview';
  return 'recovery_ready_preview';
}

export function getSourceRollbackRiskLevelFromAuditPlan(plan: FandexSourceWriteAuditPlan): FandexSourceRollbackRiskLevel {
  if (plan.severity === 'blocked') return 'blocked';
  if (plan.severity === 'risk') return 'high';
  if (plan.severity === 'warning') return 'medium';
  return 'low';
}

export function getSourceRollbackReadinessStatusLabel(status: FandexSourceRollbackReadinessStatus) {
  const labels: Record<FandexSourceRollbackReadinessStatus, string> = { rollback_ready: 'rollback 준비', rollback_review_required: 'rollback 검토 필요', rollback_limited: '제한 rollback 후보', rollback_blocked: 'rollback 차단', skipped: '스킵' }; return labels[status];
}
export function getSourceRollbackRecoveryStatusLabel(status: FandexSourceRollbackRecoveryStatus) {
  const labels: Record<FandexSourceRollbackRecoveryStatus, string> = { recovery_ready_preview: 'recovery 준비 preview', recovery_warning_preview: 'recovery 경고 preview', recovery_blocked_preview: 'recovery 차단 preview', recovery_skipped_preview: 'recovery 스킵 preview' }; return labels[status];
}
export function getSourceRollbackRiskLevelLabel(level: FandexSourceRollbackRiskLevel) {
  const labels: Record<FandexSourceRollbackRiskLevel, string> = { low: '낮음', medium: '중간', high: '높음', blocked: '차단' }; return labels[level];
}
export function getSourceRollbackCheckpointKindLabel(kind: FandexSourceRollbackCheckpointKind) {
  const labels: Record<FandexSourceRollbackCheckpointKind, string> = { audit_trace_checkpoint: 'audit trace 확인', idempotency_checkpoint: 'idempotency 확인', dry_run_write_checkpoint: 'dry-run write key 확인', rollback_evidence_checkpoint: 'rollback 근거 확인', previous_state_checkpoint: '이전 상태 확인', duplicate_boundary_checkpoint: '중복 boundary 확인', manual_review_checkpoint: '수동 검토 확인', preview_only_checkpoint: 'preview 전용 확인' }; return labels[kind];
}
export function getSourceRollbackReasonLabel(reason: FandexSourceRollbackReasonCode) {
  const labels: Record<FandexSourceRollbackReasonCode, string> = { audit_ready: 'audit 준비됨', audit_review_required: 'audit 검토 필요', audit_limited: '제한 audit 후보', audit_blocked: 'audit 차단', idempotency_key_available: 'idempotency key 존재', dry_run_key_available: 'dry-run key 존재', rollback_evidence_available: 'rollback 근거 존재', rollback_evidence_required: 'rollback 근거 필요', previous_state_required: '이전 상태 필요', manual_review_required: '수동 검토 필요', duplicate_boundary_required: '중복 boundary 필요', stale_boundary_required: 'stale boundary 필요', blocked_audit_plan: '차단된 audit plan', preview_only: 'preview 전용', no_actual_rollback: '실제 rollback 없음', no_actual_write: '실제 write 없음' }; return labels[reason];
}

function makeCheckpoint(plan: FandexSourceWriteAuditPlan, kind: FandexSourceRollbackCheckpointKind): FandexSourceRollbackCheckpoint {
  const status = getSourceRollbackRecoveryStatusFromAuditPlan(plan); const riskLevel = getSourceRollbackRiskLevelFromAuditPlan(plan);
  return { checkpointKey: `${plan.auditKey}::${kind}`, kind, status, riskLevel, label: getSourceRollbackCheckpointKindLabel(kind), note: `${getSourceRollbackRecoveryStatusLabel(status)} / ${getSourceRollbackRiskLevelLabel(riskLevel)}. UI용 preview이며 실제 recovery 또는 rollback을 실행하지 않는다.`, previewOnly: true };
}

export function getSourceRollbackCheckpoints(plan: FandexSourceWriteAuditPlan): FandexSourceRollbackCheckpoint[] {
  const kinds = new Set<FandexSourceRollbackCheckpointKind>(['audit_trace_checkpoint', 'idempotency_checkpoint', 'dry_run_write_checkpoint', 'previous_state_checkpoint', 'preview_only_checkpoint']);
  if (plan.rollbackRequired) kinds.add('rollback_evidence_checkpoint');
  if (plan.reasonCodes.includes('duplicate_risk')) kinds.add('duplicate_boundary_checkpoint');
  if (plan.manualReviewCount > 0 || plan.auditStatus === 'audit_review_required') kinds.add('manual_review_checkpoint');
  return Array.from(kinds).sort().map((kind) => makeCheckpoint(plan, kind));
}

function getReasons(plan: FandexSourceWriteAuditPlan) {
  const reasons = new Set<FandexSourceRollbackReasonCode>(['preview_only', 'no_actual_rollback', 'no_actual_write', 'previous_state_required']);
  if (plan.auditStatus === 'audit_ready') reasons.add('audit_ready');
  if (plan.auditStatus === 'audit_review_required') reasons.add('audit_review_required');
  if (plan.auditStatus === 'audit_limited') reasons.add('audit_limited');
  if (plan.auditStatus === 'audit_blocked') { reasons.add('audit_blocked'); reasons.add('blocked_audit_plan'); }
  if (plan.idempotencyKey.trim()) reasons.add('idempotency_key_available');
  if (plan.dryRunWriteKey.trim()) reasons.add('dry_run_key_available');
  reasons.add('rollback_evidence_available');
  if (plan.rollbackRequired) reasons.add('rollback_evidence_required');
  if (plan.manualReviewCount > 0) reasons.add('manual_review_required');
  if (plan.reasonCodes.includes('duplicate_risk')) reasons.add('duplicate_boundary_required');
  if (plan.reasonCodes.includes('stale_risk')) reasons.add('stale_boundary_required');
  return Array.from(reasons).sort();
}

const countStatus = (plans: FandexSourceRollbackReadinessPlan[], status: FandexSourceRollbackReadinessStatus) => plans.filter((plan) => plan.readinessStatus === status).length;
const countRecovery = (plans: FandexSourceRollbackReadinessPlan[], status: FandexSourceRollbackRecoveryStatus) => plans.filter((plan) => plan.recoveryStatus === status).length;
const countRisk = (plans: FandexSourceRollbackReadinessPlan[], level: FandexSourceRollbackRiskLevel) => plans.filter((plan) => plan.riskLevel === level).length;

export function getSourceRollbackReadinessPlans(): FandexSourceRollbackReadinessPlan[] {
  return getSourceWriteAuditPlans().map((plan) => {
    const readinessStatus = getSourceRollbackReadinessStatusFromAuditPlan(plan); const recoveryStatus = getSourceRollbackRecoveryStatusFromAuditPlan(plan); const riskLevel = getSourceRollbackRiskLevelFromAuditPlan(plan);
    const rollbackKey = `${plan.auditKey}::rollback-readiness-preview`;
    return { rollbackKey, auditKey: plan.auditKey, safetyKey: plan.safetyKey, boundaryKey: plan.boundaryKey, policyKey: plan.policyKey, provider: plan.provider, providerMode: plan.providerMode, recordKind: plan.recordKind, auditStatus: plan.auditStatus, checkpointStatus: plan.checkpointStatus, auditSeverity: plan.severity, readinessStatus, recoveryStatus, riskLevel, idempotencyKey: plan.idempotencyKey, dryRunWriteKey: plan.dryRunWriteKey, rollbackEvidenceKey: `${rollbackKey}::evidence-preview`, previousStateKey: `${rollbackKey}::previous-state-preview`, checkpoints: getSourceRollbackCheckpoints(plan), reasonCodes: getReasons(plan), warnings: [...plan.warnings], manualReviewCount: plan.manualReviewCount, warningCount: plan.warningCount, rollbackRequired: plan.rollbackRequired, summaryLabel: `${plan.provider} / ${getSourceRollbackReadinessStatusLabel(readinessStatus)}`, summaryNote: `${getSourceWriteAuditStatusLabel(plan.auditStatus)} / ${getSourceWriteAuditCheckpointStatusLabel(plan.checkpointStatus)} / ${getSourceWriteAuditSeverityLabel(plan.severity)} 기반 read-only rollback preview다. Audit checkpoint sample: ${getSourceWriteAuditCheckpointKindLabel(plan.checkpoints[0]?.kind ?? 'preview_only_checkpoint')}; audit reason sample: ${getSourceWriteAuditReasonLabel(plan.reasonCodes[0] ?? 'preview_only')}. 실제 key 또는 복구 로직이 아니다.`, previewOnly: true };
  });
}

export function getSourceRollbackReadinessGroups(): FandexSourceRollbackReadinessGroup[] {
  const plans = getSourceRollbackReadinessPlans();
  return getSourceWriteAuditGroups().map((group) => { const items = plans.filter((plan) => plan.provider === group.provider && plan.providerMode === group.providerMode); return { groupKey: `${group.groupKey}::rollback-readiness-preview`, provider: group.provider, providerMode: group.providerMode, rollbackPlanCount: items.length, rollbackReadyCount: countStatus(items, 'rollback_ready'), rollbackReviewRequiredCount: countStatus(items, 'rollback_review_required'), rollbackLimitedCount: countStatus(items, 'rollback_limited'), rollbackBlockedCount: countStatus(items, 'rollback_blocked'), skippedCount: countStatus(items, 'skipped'), lowRiskCount: countRisk(items, 'low'), mediumRiskCount: countRisk(items, 'medium'), highRiskCount: countRisk(items, 'high'), blockedRiskCount: countRisk(items, 'blocked'), warningCount: items.reduce((sum, plan) => sum + plan.warningCount, 0), manualReviewCount: items.reduce((sum, plan) => sum + plan.manualReviewCount, 0), rollbackRequiredCount: items.filter((plan) => plan.rollbackRequired).length, topRollbackKeys: items.map((plan) => plan.rollbackKey).slice(0, 5), blockedRollbackKeys: items.filter((plan) => plan.readinessStatus === 'rollback_blocked').map((plan) => plan.rollbackKey).slice(0, 5), summaryLabel: `${group.summaryLabel} / rollback readiness`, summaryNote: 'Provider/mode 기반 read-only rollback readiness group이며 실제 restore/revert를 실행하지 않는다.', previewOnly: true }; });
}

export function getSourceRollbackReadinessSummary(): FandexSourceRollbackReadinessSummary {
  const plans = getSourceRollbackReadinessPlans(); const groups = getSourceRollbackReadinessGroups(); const auditSummary = getSourceWriteAuditSummary();
  return { rollbackPlanCount: plans.length, groupCount: groups.length, providerCount: new Set(plans.map((plan) => plan.provider)).size, rollbackReadyCount: countStatus(plans, 'rollback_ready'), rollbackReviewRequiredCount: countStatus(plans, 'rollback_review_required'), rollbackLimitedCount: countStatus(plans, 'rollback_limited'), rollbackBlockedCount: countStatus(plans, 'rollback_blocked'), skippedCount: countStatus(plans, 'skipped'), recoveryReadyCount: countRecovery(plans, 'recovery_ready_preview'), recoveryWarningCount: countRecovery(plans, 'recovery_warning_preview'), recoveryBlockedCount: countRecovery(plans, 'recovery_blocked_preview'), recoverySkippedCount: countRecovery(plans, 'recovery_skipped_preview'), lowRiskCount: countRisk(plans, 'low'), mediumRiskCount: countRisk(plans, 'medium'), highRiskCount: countRisk(plans, 'high'), blockedRiskCount: countRisk(plans, 'blocked'), rollbackRequiredCount: plans.filter((plan) => plan.rollbackRequired).length, warningCount: plans.reduce((sum, plan) => sum + plan.warningCount, 0), manualReviewCount: plans.reduce((sum, plan) => sum + plan.manualReviewCount, 0), readyRollbackKeys: unique(plans.filter((plan) => plan.readinessStatus === 'rollback_ready').map((plan) => plan.rollbackKey)).slice(0, 8), reviewRollbackKeys: unique(plans.filter((plan) => plan.readinessStatus === 'rollback_review_required').map((plan) => plan.rollbackKey)).slice(0, 8), blockedRollbackKeys: unique(plans.filter((plan) => plan.readinessStatus === 'rollback_blocked').map((plan) => plan.rollbackKey)).slice(0, 8), summaryLabel: 'source rollback readiness preview', summaryNote: `${auditSummary.summaryLabel} 기반 fixture/helper read-only preview다. 실제 DB, file, audit log, rollback, fetch, score 또는 ranking 연결은 없다.`, previewOnly: true };
}

export function runSourceRollbackReadinessShapeCheck(): FandexSourceRollbackReadinessShapeCheckResult {
  const issues: FandexSourceRollbackReadinessShapeCheckIssue[] = []; const auditCheck = runSourceWriteAuditShapeCheck(); const plans = getSourceRollbackReadinessPlans(); const groups = getSourceRollbackReadinessGroups(); const summary = getSourceRollbackReadinessSummary();
  const add = (code: FandexSourceRollbackReadinessShapeCheckIssue['code'], message: string, rollbackKey?: string, checkpointKey?: string) => issues.push({ severity: 'error', code, message, rollbackKey, checkpointKey });
  if (!auditCheck.isValid) add('invalid-audit-shape', 'Write audit shape check must pass first.'); if (!plans.length) add('empty-rollback-plans', 'Rollback plans must not be empty.'); if (!groups.length) add('empty-rollback-groups', 'Rollback groups must not be empty.'); if (new Set(plans.map((plan) => plan.rollbackKey)).size !== plans.length) add('duplicate-rollback-key', 'Rollback keys must be unique.');
  plans.forEach((plan) => { if (!readinessStatuses.includes(plan.readinessStatus)) add('invalid-readiness-status', `Invalid readiness: ${plan.rollbackKey}`, plan.rollbackKey); if (!recoveryStatuses.includes(plan.recoveryStatus)) add('invalid-recovery-status', `Invalid recovery: ${plan.rollbackKey}`, plan.rollbackKey); if (!riskLevels.includes(plan.riskLevel)) add('invalid-risk-level', `Invalid risk: ${plan.rollbackKey}`, plan.rollbackKey); if (!plan.checkpoints.length) add('empty-checkpoints', `Checkpoints required: ${plan.rollbackKey}`, plan.rollbackKey); if (!plan.auditKey.trim()) add('missing-audit-key', `Audit key required: ${plan.rollbackKey}`, plan.rollbackKey); if (!plan.safetyKey.trim()) add('missing-safety-key', `Safety key required: ${plan.rollbackKey}`, plan.rollbackKey); if (!plan.boundaryKey.trim()) add('missing-boundary-key', `Boundary key required: ${plan.rollbackKey}`, plan.rollbackKey); if (!plan.provider.trim()) add('missing-provider', `Provider required: ${plan.rollbackKey}`, plan.rollbackKey); if (![plan.idempotencyKey, plan.dryRunWriteKey, plan.rollbackEvidenceKey, plan.previousStateKey].every((key) => key.trim())) add('missing-preview-key', `Preview keys required: ${plan.rollbackKey}`, plan.rollbackKey); if (!plan.reasonCodes.length || !['preview_only', 'no_actual_rollback', 'no_actual_write'].every((reason) => plan.reasonCodes.includes(reason as FandexSourceRollbackReasonCode))) add('missing-reason-code', `Preview reasons required: ${plan.rollbackKey}`, plan.rollbackKey); if (plan.previewOnly !== true) add('invalid-preview-only', `previewOnly must be true: ${plan.rollbackKey}`, plan.rollbackKey); plan.checkpoints.forEach((checkpoint) => { if (!checkpointKinds.includes(checkpoint.kind)) add('invalid-checkpoint-kind', `Invalid kind: ${checkpoint.checkpointKey}`, plan.rollbackKey, checkpoint.checkpointKey); if (!recoveryStatuses.includes(checkpoint.status)) add('invalid-recovery-status', `Invalid status: ${checkpoint.checkpointKey}`, plan.rollbackKey, checkpoint.checkpointKey); if (!riskLevels.includes(checkpoint.riskLevel)) add('invalid-risk-level', `Invalid risk: ${checkpoint.checkpointKey}`, plan.rollbackKey, checkpoint.checkpointKey); if (checkpoint.previewOnly !== true) add('invalid-preview-only', `Checkpoint previewOnly must be true: ${checkpoint.checkpointKey}`, plan.rollbackKey, checkpoint.checkpointKey); }); });
  if (summary.rollbackPlanCount !== plans.length || summary.groupCount !== groups.length || summary.providerCount !== new Set(plans.map((plan) => plan.provider)).size) add('invalid-summary-count', 'Summary counts must match arrays.'); [summary.readyRollbackKeys, summary.reviewRollbackKeys, summary.blockedRollbackKeys].forEach((keys) => { if (new Set(keys).size !== keys.length) add('duplicate-rollback-key', 'Summary rollback keys must be unique.'); }); if (summary.previewOnly !== true || groups.some((group) => group.previewOnly !== true)) add('invalid-preview-only', 'All rollback output must be preview-only.');
  return { isValid: issues.every((issue) => issue.severity !== 'error'), rollbackPlanCount: plans.length, groupCount: groups.length, issues };
}
