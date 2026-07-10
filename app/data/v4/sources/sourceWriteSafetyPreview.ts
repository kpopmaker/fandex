import {
  getSourceStorageBoundaryGroups,
  getSourceStorageBoundaryPlans,
  getSourceStorageBoundaryReasonLabel,
  getSourceStorageBoundaryStatusLabel,
  getSourceStorageBoundarySummary,
  getSourceStorageRecordKindLabel,
  getSourceWriteGuardStatusLabel,
  runSourceStorageBoundaryShapeCheck,
} from './sourceStorageBoundaryPreview';
import type { FandexSourceStorageBoundaryPlan } from './sourceStorageBoundaryTypes';
import type {
  FandexSourceWriteSafetyAuditRequirement,
  FandexSourceWriteSafetyGateStatus,
  FandexSourceWriteSafetyGroup,
  FandexSourceWriteSafetyPlan,
  FandexSourceWriteSafetyReasonCode,
  FandexSourceWriteSafetyRiskLevel,
  FandexSourceWriteSafetyStatus,
  FandexSourceWriteSafetySummary,
} from './sourceWriteSafetyTypes';

export type FandexSourceWriteSafetyShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'invalid-boundary-shape'
    | 'empty-safety-plans'
    | 'empty-safety-groups'
    | 'invalid-safety-status'
    | 'invalid-gate-status'
    | 'invalid-risk-level'
    | 'duplicate-safety-key'
    | 'missing-boundary-key'
    | 'missing-provider'
    | 'missing-preview-key'
    | 'missing-audit-requirement'
    | 'missing-preview-reason'
    | 'invalid-summary-count'
    | 'invalid-preview-only';
  message: string;
  safetyKey?: string;
  boundaryKey?: string;
};

export type FandexSourceWriteSafetyShapeCheckResult = {
  isValid: boolean;
  safetyPlanCount: number;
  groupCount: number;
  issues: FandexSourceWriteSafetyShapeCheckIssue[];
};

const unique = <T extends string>(values: T[]) => Array.from(new Set(values)).sort();

const allowedSafetyStatuses: readonly FandexSourceWriteSafetyStatus[] = [
  'dry_run_safe', 'review_required', 'limited_dry_run', 'blocked', 'skipped',
];
const allowedGateStatuses: readonly FandexSourceWriteSafetyGateStatus[] = [
  'gate_passed_preview', 'gate_warning_preview', 'gate_blocked_preview', 'gate_skipped_preview',
];
const allowedRiskLevels: readonly FandexSourceWriteSafetyRiskLevel[] = [
  'low', 'medium', 'high', 'blocked',
];

export function getSourceWriteSafetyStatusFromBoundaryPlan(
  plan: FandexSourceStorageBoundaryPlan,
): FandexSourceWriteSafetyStatus {
  if (plan.boundaryStatus === 'skipped') return 'skipped';
  if (plan.boundaryStatus === 'write_blocked' || plan.writeGuardStatus === 'blocked_preview') return 'blocked';
  if (plan.manualReviewCount > 0 || plan.boundaryStatus === 'needs_review' || plan.writeGuardStatus === 'manual_review_required') return 'review_required';
  if (plan.boundaryStatus === 'write_limited' || plan.writeGuardStatus === 'limited_preview') return 'limited_dry_run';
  return 'dry_run_safe';
}

export function getSourceWriteSafetyGateStatusFromBoundaryPlan(
  plan: FandexSourceStorageBoundaryPlan,
): FandexSourceWriteSafetyGateStatus {
  const status = getSourceWriteSafetyStatusFromBoundaryPlan(plan);
  if (status === 'skipped') return 'gate_skipped_preview';
  if (status === 'blocked') return 'gate_blocked_preview';
  if (status === 'review_required' || status === 'limited_dry_run') return 'gate_warning_preview';
  return 'gate_passed_preview';
}

export function getSourceWriteSafetyRiskLevelFromBoundaryPlan(
  plan: FandexSourceStorageBoundaryPlan,
): FandexSourceWriteSafetyRiskLevel {
  const status = getSourceWriteSafetyStatusFromBoundaryPlan(plan);
  if (status === 'blocked' || status === 'skipped') return 'blocked';
  if (status === 'review_required') return 'high';
  if (status === 'limited_dry_run') return 'medium';
  return 'low';
}

export function getSourceWriteSafetyAuditRequirements(
  plan: FandexSourceStorageBoundaryPlan,
): FandexSourceWriteSafetyAuditRequirement[] {
  const requirements = new Set<FandexSourceWriteSafetyAuditRequirement>([
    'idempotency_check',
    'preview_only_check',
    'write_guard_check',
  ]);
  if (plan.reasonCodes.includes('duplicate_boundary_required')) requirements.add('duplicate_check');
  if (plan.reasonCodes.includes('stale_boundary_required')) requirements.add('freshness_check');
  if (plan.manualReviewCount > 0 || plan.boundaryStatus === 'needs_review') requirements.add('manual_review_check');
  if (plan.boundaryStatus !== 'ready_for_dry_run') requirements.add('rollback_plan_check');
  return Array.from(requirements).sort();
}

function getReasonCodes(plan: FandexSourceStorageBoundaryPlan) {
  const reasons = new Set<FandexSourceWriteSafetyReasonCode>(['preview_only', 'no_actual_write']);
  if (plan.boundaryStatus === 'ready_for_dry_run') reasons.add('storage_boundary_ready');
  if (plan.dryRunWriteKey.trim()) reasons.add('dry_run_key_available');
  if (plan.idempotencyKey.trim()) reasons.add('idempotency_key_available');
  if (plan.writeGuardStatus) reasons.add('write_guard_preview_available');
  if (plan.manualReviewCount > 0 || plan.boundaryStatus === 'needs_review') reasons.add('manual_review_required');
  if (plan.boundaryStatus === 'write_limited') reasons.add('limited_boundary');
  if (plan.boundaryStatus === 'write_blocked' || plan.boundaryStatus === 'skipped') reasons.add('blocked_boundary');
  if (plan.reasonCodes.includes('duplicate_boundary_required')) reasons.add('duplicate_risk');
  if (plan.reasonCodes.includes('stale_boundary_required')) reasons.add('stale_risk');
  if (plan.boundaryStatus !== 'ready_for_dry_run') reasons.add('rollback_required');
  return Array.from(reasons).sort();
}

export function getSourceWriteSafetyStatusLabel(status: FandexSourceWriteSafetyStatus) {
  const labels: Record<FandexSourceWriteSafetyStatus, string> = {
    dry_run_safe: 'dry-run 안전 후보', review_required: '검토 필요', limited_dry_run: '제한 dry-run 후보', blocked: '차단', skipped: '스킵',
  };
  return labels[status];
}

export function getSourceWriteSafetyGateStatusLabel(status: FandexSourceWriteSafetyGateStatus) {
  const labels: Record<FandexSourceWriteSafetyGateStatus, string> = {
    gate_passed_preview: 'gate 통과 preview', gate_warning_preview: 'gate 경고 preview', gate_blocked_preview: 'gate 차단 preview', gate_skipped_preview: 'gate 스킵 preview',
  };
  return labels[status];
}

export function getSourceWriteSafetyRiskLevelLabel(level: FandexSourceWriteSafetyRiskLevel) {
  const labels: Record<FandexSourceWriteSafetyRiskLevel, string> = { low: '낮음', medium: '중간', high: '높음', blocked: '차단' };
  return labels[level];
}

export function getSourceWriteSafetyAuditRequirementLabel(requirement: FandexSourceWriteSafetyAuditRequirement) {
  const labels: Record<FandexSourceWriteSafetyAuditRequirement, string> = {
    idempotency_check: 'idempotency 확인', duplicate_check: '중복 확인', freshness_check: 'freshness 확인', manual_review_check: '수동 검토 확인', rollback_plan_check: 'rollback 계획 확인', write_guard_check: 'write guard 확인', preview_only_check: 'preview 전용 확인',
  };
  return labels[requirement];
}

export function getSourceWriteSafetyReasonLabel(reason: FandexSourceWriteSafetyReasonCode) {
  const labels: Record<FandexSourceWriteSafetyReasonCode, string> = {
    storage_boundary_ready: 'storage boundary 준비됨', dry_run_key_available: 'dry-run key 존재', idempotency_key_available: 'idempotency key 존재', write_guard_preview_available: 'write guard preview 존재', manual_review_required: '수동 검토 필요', limited_boundary: '제한 boundary', blocked_boundary: '차단 boundary', duplicate_risk: '중복 위험', stale_risk: 'stale 위험', missing_audit_requirement: 'audit requirement 누락', rollback_required: 'rollback 요구', preview_only: 'preview 전용', no_actual_write: '실제 write 없음',
  };
  return labels[reason];
}

function countStatus(plans: FandexSourceWriteSafetyPlan[], status: FandexSourceWriteSafetyStatus) {
  return plans.filter((plan) => plan.safetyStatus === status).length;
}

function countRisk(plans: FandexSourceWriteSafetyPlan[], risk: FandexSourceWriteSafetyRiskLevel) {
  return plans.filter((plan) => plan.riskLevel === risk).length;
}

function countGate(plans: FandexSourceWriteSafetyPlan[], gate: FandexSourceWriteSafetyGateStatus) {
  return plans.filter((plan) => plan.gateStatus === gate).length;
}

export function getSourceWriteSafetyPlans(): FandexSourceWriteSafetyPlan[] {
  return getSourceStorageBoundaryPlans().map((plan) => {
    const safetyStatus = getSourceWriteSafetyStatusFromBoundaryPlan(plan);
    const gateStatus = getSourceWriteSafetyGateStatusFromBoundaryPlan(plan);
    const riskLevel = getSourceWriteSafetyRiskLevelFromBoundaryPlan(plan);
    const auditRequirements = getSourceWriteSafetyAuditRequirements(plan);
    const rollbackRequired = safetyStatus !== 'dry_run_safe';
    return {
      safetyKey: `${plan.boundaryKey}::write-safety-preview`, boundaryKey: plan.boundaryKey, policyKey: plan.policyKey,
      provider: plan.provider, providerMode: plan.providerMode, recordKind: plan.recordKind,
      boundaryStatus: plan.boundaryStatus, writeGuardStatus: plan.writeGuardStatus,
      safetyStatus, gateStatus, riskLevel, idempotencyKey: plan.idempotencyKey, dryRunWriteKey: plan.dryRunWriteKey,
      auditRequirements, reasonCodes: getReasonCodes(plan), warnings: [...plan.warnings],
      manualReviewCount: plan.manualReviewCount, warningCount: plan.warningCount, rollbackRequired,
      summaryLabel: `${plan.provider} / ${getSourceWriteSafetyStatusLabel(safetyStatus)}`,
      summaryNote: `${getSourceStorageBoundaryStatusLabel(plan.boundaryStatus)} / ${getSourceWriteGuardStatusLabel(plan.writeGuardStatus)} / ${getSourceStorageRecordKindLabel(plan.recordKind)}. ${getSourceWriteSafetyGateStatusLabel(gateStatus)}와 위험도 ${getSourceWriteSafetyRiskLevelLabel(riskLevel)}는 read-only preview이며 실제 write 허가나 rollback 구현이 아니다. Boundary reason sample: ${getSourceStorageBoundaryReasonLabel(plan.reasonCodes[0] ?? 'preview_only')}.`,
      previewOnly: true,
    };
  });
}

export function getSourceWriteSafetyGroups(): FandexSourceWriteSafetyGroup[] {
  const boundaryGroups = getSourceStorageBoundaryGroups();
  const plans = getSourceWriteSafetyPlans();
  return boundaryGroups.map((boundaryGroup) => {
    const groupPlans = plans.filter((plan) => plan.provider === boundaryGroup.provider && plan.providerMode === boundaryGroup.providerMode);
    return {
      groupKey: `${boundaryGroup.groupKey}::write-safety-preview`, provider: boundaryGroup.provider, providerMode: boundaryGroup.providerMode,
      safetyPlanCount: groupPlans.length, dryRunSafeCount: countStatus(groupPlans, 'dry_run_safe'), reviewRequiredCount: countStatus(groupPlans, 'review_required'), limitedDryRunCount: countStatus(groupPlans, 'limited_dry_run'), blockedCount: countStatus(groupPlans, 'blocked'), skippedCount: countStatus(groupPlans, 'skipped'),
      lowRiskCount: countRisk(groupPlans, 'low'), mediumRiskCount: countRisk(groupPlans, 'medium'), highRiskCount: countRisk(groupPlans, 'high'), blockedRiskCount: countRisk(groupPlans, 'blocked'),
      warningCount: groupPlans.reduce((sum, plan) => sum + plan.warningCount, 0), manualReviewCount: groupPlans.reduce((sum, plan) => sum + plan.manualReviewCount, 0),
      topSafetyKeys: groupPlans.map((plan) => plan.safetyKey).slice(0, 5), blockedSafetyKeys: groupPlans.filter((plan) => plan.safetyStatus === 'blocked').map((plan) => plan.safetyKey).slice(0, 5),
      summaryLabel: `${boundaryGroup.summaryLabel} / write safety`, summaryNote: 'Fixture/helper 기반 read-only safety group이며 실제 write gate, 저장, rollback을 실행하지 않는다.', previewOnly: true,
    };
  });
}

export function getSourceWriteSafetySummary(): FandexSourceWriteSafetySummary {
  const plans = getSourceWriteSafetyPlans();
  const groups = getSourceWriteSafetyGroups();
  const boundarySummary = getSourceStorageBoundarySummary();
  return {
    safetyPlanCount: plans.length, groupCount: groups.length, providerCount: new Set(plans.map((plan) => plan.provider)).size,
    dryRunSafeCount: countStatus(plans, 'dry_run_safe'), reviewRequiredCount: countStatus(plans, 'review_required'), limitedDryRunCount: countStatus(plans, 'limited_dry_run'), blockedCount: countStatus(plans, 'blocked'), skippedCount: countStatus(plans, 'skipped'),
    gatePassedCount: countGate(plans, 'gate_passed_preview'), gateWarningCount: countGate(plans, 'gate_warning_preview'), gateBlockedCount: countGate(plans, 'gate_blocked_preview'), gateSkippedCount: countGate(plans, 'gate_skipped_preview'),
    lowRiskCount: countRisk(plans, 'low'), mediumRiskCount: countRisk(plans, 'medium'), highRiskCount: countRisk(plans, 'high'), blockedRiskCount: countRisk(plans, 'blocked'),
    rollbackRequiredCount: plans.filter((plan) => plan.rollbackRequired).length, warningCount: plans.reduce((sum, plan) => sum + plan.warningCount, 0), manualReviewCount: plans.reduce((sum, plan) => sum + plan.manualReviewCount, 0),
    safeSafetyKeys: unique(plans.filter((plan) => plan.safetyStatus === 'dry_run_safe').map((plan) => plan.safetyKey)).slice(0, 8), reviewSafetyKeys: unique(plans.filter((plan) => plan.safetyStatus === 'review_required').map((plan) => plan.safetyKey)).slice(0, 8), blockedSafetyKeys: unique(plans.filter((plan) => plan.safetyStatus === 'blocked').map((plan) => plan.safetyKey)).slice(0, 8),
    summaryLabel: 'source write safety preview', summaryNote: `${boundarySummary.summaryLabel} 기반 read-only safety checkpoint다. 실제 DB/Supabase/file write, update, upsert, delete, provider sync, fetch, score delta 또는 ranking 연결은 없다.`, previewOnly: true,
  };
}

export function runSourceWriteSafetyShapeCheck(): FandexSourceWriteSafetyShapeCheckResult {
  const issues: FandexSourceWriteSafetyShapeCheckIssue[] = [];
  const boundaryCheck = runSourceStorageBoundaryShapeCheck();
  const plans = getSourceWriteSafetyPlans();
  const groups = getSourceWriteSafetyGroups();
  const summary = getSourceWriteSafetySummary();
  if (!boundaryCheck.isValid) issues.push({ severity: 'error', code: 'invalid-boundary-shape', message: 'Storage boundary shape check must pass first.' });
  if (!plans.length) issues.push({ severity: 'error', code: 'empty-safety-plans', message: 'Write safety plans must not be empty.' });
  if (!groups.length) issues.push({ severity: 'error', code: 'empty-safety-groups', message: 'Write safety groups must not be empty.' });
  if (new Set(plans.map((plan) => plan.safetyKey)).size !== plans.length) issues.push({ severity: 'error', code: 'duplicate-safety-key', message: 'Write safety keys must be unique.' });
  plans.forEach((plan) => {
    if (!allowedSafetyStatuses.includes(plan.safetyStatus)) issues.push({ severity: 'error', code: 'invalid-safety-status', message: `Invalid safety status: ${plan.safetyKey}`, safetyKey: plan.safetyKey });
    if (!allowedGateStatuses.includes(plan.gateStatus)) issues.push({ severity: 'error', code: 'invalid-gate-status', message: `Invalid gate status: ${plan.safetyKey}`, safetyKey: plan.safetyKey });
    if (!allowedRiskLevels.includes(plan.riskLevel)) issues.push({ severity: 'error', code: 'invalid-risk-level', message: `Invalid risk level: ${plan.safetyKey}`, safetyKey: plan.safetyKey });
    if (!plan.boundaryKey.trim()) issues.push({ severity: 'error', code: 'missing-boundary-key', message: `Boundary key is required: ${plan.safetyKey}`, safetyKey: plan.safetyKey });
    if (!plan.provider.trim()) issues.push({ severity: 'error', code: 'missing-provider', message: `Provider is required: ${plan.safetyKey}`, safetyKey: plan.safetyKey });
    if (!plan.idempotencyKey.trim() || !plan.dryRunWriteKey.trim()) issues.push({ severity: 'error', code: 'missing-preview-key', message: `Preview keys are required: ${plan.safetyKey}`, safetyKey: plan.safetyKey, boundaryKey: plan.boundaryKey });
    if (!plan.auditRequirements.length) issues.push({ severity: 'error', code: 'missing-audit-requirement', message: `Audit requirements are required: ${plan.safetyKey}`, safetyKey: plan.safetyKey });
    if (!plan.reasonCodes.length) issues.push({ severity: 'error', code: 'missing-preview-reason', message: `Safety reasons are required: ${plan.safetyKey}`, safetyKey: plan.safetyKey });
    if (!plan.reasonCodes.includes('preview_only') || !plan.reasonCodes.includes('no_actual_write')) issues.push({ severity: 'error', code: 'missing-preview-reason', message: `Preview safety reasons are required: ${plan.safetyKey}`, safetyKey: plan.safetyKey });
    if (plan.previewOnly !== true) issues.push({ severity: 'error', code: 'invalid-preview-only', message: `previewOnly must be true: ${plan.safetyKey}`, safetyKey: plan.safetyKey });
  });
  if (summary.safetyPlanCount !== plans.length || summary.groupCount !== groups.length || summary.providerCount !== new Set(plans.map((plan) => plan.provider)).size) issues.push({ severity: 'error', code: 'invalid-summary-count', message: 'Write safety summary counts must match plan and group arrays.' });
  [summary.safeSafetyKeys, summary.reviewSafetyKeys, summary.blockedSafetyKeys].forEach((keys) => {
    if (new Set(keys).size !== keys.length) issues.push({ severity: 'error', code: 'duplicate-safety-key', message: 'Summary safety keys must be unique.' });
  });
  if (summary.previewOnly !== true || groups.some((group) => group.previewOnly !== true)) issues.push({ severity: 'error', code: 'invalid-preview-only', message: 'All write safety output must remain preview-only.' });
  return { isValid: issues.every((issue) => issue.severity !== 'error'), safetyPlanCount: plans.length, groupCount: groups.length, issues };
}
