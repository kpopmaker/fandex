import {
  getSourceWriteSafetyAuditRequirementLabel,
  getSourceWriteSafetyGateStatusLabel,
  getSourceWriteSafetyGroups,
  getSourceWriteSafetyPlans,
  getSourceWriteSafetyReasonLabel,
  getSourceWriteSafetyRiskLevelLabel,
  getSourceWriteSafetyStatusLabel,
  getSourceWriteSafetySummary,
  runSourceWriteSafetyShapeCheck,
} from './sourceWriteSafetyPreview';
import type { FandexSourceWriteSafetyPlan } from './sourceWriteSafetyTypes';
import type {
  FandexSourceWriteAuditCheckpoint,
  FandexSourceWriteAuditCheckpointKind,
  FandexSourceWriteAuditCheckpointStatus,
  FandexSourceWriteAuditGroup,
  FandexSourceWriteAuditPlan,
  FandexSourceWriteAuditReasonCode,
  FandexSourceWriteAuditSeverity,
  FandexSourceWriteAuditStatus,
  FandexSourceWriteAuditSummary,
} from './sourceWriteAuditTypes';

export type FandexSourceWriteAuditShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'invalid-safety-shape'
    | 'empty-audit-plans'
    | 'empty-audit-groups'
    | 'invalid-audit-status'
    | 'invalid-checkpoint-status'
    | 'invalid-audit-severity'
    | 'empty-checkpoints'
    | 'invalid-checkpoint-kind'
    | 'duplicate-audit-key'
    | 'missing-safety-key'
    | 'missing-boundary-key'
    | 'missing-provider'
    | 'missing-preview-key'
    | 'missing-reason-code'
    | 'invalid-summary-count'
    | 'invalid-preview-only';
  message: string;
  auditKey?: string;
  checkpointKey?: string;
};

export type FandexSourceWriteAuditShapeCheckResult = {
  isValid: boolean;
  auditPlanCount: number;
  groupCount: number;
  issues: FandexSourceWriteAuditShapeCheckIssue[];
};

const allowedAuditStatuses: readonly FandexSourceWriteAuditStatus[] = [
  'audit_ready',
  'audit_review_required',
  'audit_limited',
  'audit_blocked',
  'skipped',
];
const allowedCheckpointStatuses: readonly FandexSourceWriteAuditCheckpointStatus[] = [
  'checkpoint_passed_preview',
  'checkpoint_warning_preview',
  'checkpoint_blocked_preview',
  'checkpoint_skipped_preview',
];
const allowedSeverities: readonly FandexSourceWriteAuditSeverity[] = [
  'info', 'warning', 'risk', 'blocked',
];
const allowedCheckpointKinds: readonly FandexSourceWriteAuditCheckpointKind[] = [
  'safety_plan_checkpoint',
  'idempotency_checkpoint',
  'dry_run_write_checkpoint',
  'duplicate_checkpoint',
  'freshness_checkpoint',
  'manual_review_checkpoint',
  'rollback_checkpoint',
  'preview_only_checkpoint',
];

function unique<T extends string>(values: T[]) {
  return Array.from(new Set(values)).sort();
}

export function getSourceWriteAuditStatusFromSafetyPlan(
  plan: FandexSourceWriteSafetyPlan,
): FandexSourceWriteAuditStatus {
  if (plan.safetyStatus === 'skipped') return 'skipped';
  if (plan.safetyStatus === 'blocked' || plan.gateStatus === 'gate_blocked_preview') {
    return 'audit_blocked';
  }
  if (plan.safetyStatus === 'review_required' || plan.manualReviewCount > 0) {
    return 'audit_review_required';
  }
  if (plan.safetyStatus === 'limited_dry_run' || plan.gateStatus === 'gate_warning_preview') {
    return 'audit_limited';
  }
  return 'audit_ready';
}

export function getSourceWriteAuditCheckpointStatusFromSafetyPlan(
  plan: FandexSourceWriteSafetyPlan,
): FandexSourceWriteAuditCheckpointStatus {
  const status = getSourceWriteAuditStatusFromSafetyPlan(plan);
  if (status === 'skipped') return 'checkpoint_skipped_preview';
  if (status === 'audit_blocked') return 'checkpoint_blocked_preview';
  if (status === 'audit_review_required' || status === 'audit_limited') {
    return 'checkpoint_warning_preview';
  }
  return 'checkpoint_passed_preview';
}

export function getSourceWriteAuditSeverityFromSafetyPlan(
  plan: FandexSourceWriteSafetyPlan,
): FandexSourceWriteAuditSeverity {
  if (plan.riskLevel === 'blocked') return 'blocked';
  if (plan.riskLevel === 'high') return 'risk';
  if (plan.riskLevel === 'medium') return 'warning';
  return 'info';
}

export function getSourceWriteAuditStatusLabel(status: FandexSourceWriteAuditStatus) {
  const labels: Record<FandexSourceWriteAuditStatus, string> = {
    audit_ready: 'audit 준비',
    audit_review_required: 'audit 검토 필요',
    audit_limited: '제한 audit 후보',
    audit_blocked: 'audit 차단',
    skipped: '스킵',
  };
  return labels[status];
}

export function getSourceWriteAuditCheckpointStatusLabel(
  status: FandexSourceWriteAuditCheckpointStatus,
) {
  const labels: Record<FandexSourceWriteAuditCheckpointStatus, string> = {
    checkpoint_passed_preview: 'checkpoint 통과 preview',
    checkpoint_warning_preview: 'checkpoint 경고 preview',
    checkpoint_blocked_preview: 'checkpoint 차단 preview',
    checkpoint_skipped_preview: 'checkpoint 스킵 preview',
  };
  return labels[status];
}

export function getSourceWriteAuditSeverityLabel(severity: FandexSourceWriteAuditSeverity) {
  const labels: Record<FandexSourceWriteAuditSeverity, string> = {
    info: '정보', warning: '경고', risk: '위험', blocked: '차단',
  };
  return labels[severity];
}

export function getSourceWriteAuditCheckpointKindLabel(
  kind: FandexSourceWriteAuditCheckpointKind,
) {
  const labels: Record<FandexSourceWriteAuditCheckpointKind, string> = {
    safety_plan_checkpoint: 'safety plan 확인',
    idempotency_checkpoint: 'idempotency 확인',
    dry_run_write_checkpoint: 'dry-run write key 확인',
    duplicate_checkpoint: '중복 확인',
    freshness_checkpoint: 'freshness 확인',
    manual_review_checkpoint: '수동 검토 확인',
    rollback_checkpoint: 'rollback 근거 확인',
    preview_only_checkpoint: 'preview 전용 확인',
  };
  return labels[kind];
}

export function getSourceWriteAuditReasonLabel(reason: FandexSourceWriteAuditReasonCode) {
  const labels: Record<FandexSourceWriteAuditReasonCode, string> = {
    write_safety_ready: 'write safety 준비됨',
    safety_gate_passed: 'safety gate 통과 preview',
    safety_gate_warning: 'safety gate 경고 preview',
    safety_gate_blocked: 'safety gate 차단 preview',
    idempotency_key_available: 'idempotency key 존재',
    dry_run_key_available: 'dry-run key 존재',
    audit_checkpoint_required: 'audit checkpoint 필요',
    manual_review_required: '수동 검토 필요',
    rollback_evidence_required: 'rollback 근거 필요',
    duplicate_risk: '중복 위험',
    stale_risk: 'stale 위험',
    blocked_safety_plan: '차단된 safety plan',
    preview_only: 'preview 전용',
    no_actual_audit_log: '실제 audit log 없음',
    no_actual_write: '실제 write 없음',
  };
  return labels[reason];
}

function makeCheckpoint(
  plan: FandexSourceWriteSafetyPlan,
  kind: FandexSourceWriteAuditCheckpointKind,
): FandexSourceWriteAuditCheckpoint {
  const status = getSourceWriteAuditCheckpointStatusFromSafetyPlan(plan);
  const severity = getSourceWriteAuditSeverityFromSafetyPlan(plan);
  return {
    checkpointKey: `${plan.safetyKey}::${kind}`,
    kind,
    status,
    severity,
    label: getSourceWriteAuditCheckpointKindLabel(kind),
    note: `${getSourceWriteAuditCheckpointStatusLabel(status)} / ${getSourceWriteAuditSeverityLabel(severity)}. UI 표시용 checkpoint preview이며 실제 audit log를 저장하지 않는다.`,
    previewOnly: true,
  };
}

export function getSourceWriteAuditCheckpoints(
  plan: FandexSourceWriteSafetyPlan,
): FandexSourceWriteAuditCheckpoint[] {
  const kinds = new Set<FandexSourceWriteAuditCheckpointKind>([
    'safety_plan_checkpoint',
    'idempotency_checkpoint',
    'dry_run_write_checkpoint',
    'preview_only_checkpoint',
  ]);
  if (plan.auditRequirements.includes('duplicate_check')) kinds.add('duplicate_checkpoint');
  if (plan.auditRequirements.includes('freshness_check')) kinds.add('freshness_checkpoint');
  if (plan.auditRequirements.includes('manual_review_check')) kinds.add('manual_review_checkpoint');
  if (plan.rollbackRequired) kinds.add('rollback_checkpoint');
  return Array.from(kinds).sort().map((kind) => makeCheckpoint(plan, kind));
}

function getReasonCodes(plan: FandexSourceWriteSafetyPlan) {
  const reasons = new Set<FandexSourceWriteAuditReasonCode>([
    'audit_checkpoint_required',
    'no_actual_audit_log',
    'no_actual_write',
    'preview_only',
  ]);
  if (plan.safetyStatus === 'dry_run_safe') reasons.add('write_safety_ready');
  if (plan.gateStatus === 'gate_passed_preview') reasons.add('safety_gate_passed');
  if (plan.gateStatus === 'gate_warning_preview') reasons.add('safety_gate_warning');
  if (plan.gateStatus === 'gate_blocked_preview') reasons.add('safety_gate_blocked');
  if (plan.idempotencyKey.trim()) reasons.add('idempotency_key_available');
  if (plan.dryRunWriteKey.trim()) reasons.add('dry_run_key_available');
  if (plan.manualReviewCount > 0 || plan.safetyStatus === 'review_required') {
    reasons.add('manual_review_required');
  }
  if (plan.rollbackRequired) reasons.add('rollback_evidence_required');
  if (plan.reasonCodes.includes('duplicate_risk')) reasons.add('duplicate_risk');
  if (plan.reasonCodes.includes('stale_risk')) reasons.add('stale_risk');
  if (plan.safetyStatus === 'blocked') reasons.add('blocked_safety_plan');
  return Array.from(reasons).sort();
}

function countStatus(plans: FandexSourceWriteAuditPlan[], status: FandexSourceWriteAuditStatus) {
  return plans.filter((plan) => plan.auditStatus === status).length;
}

function countCheckpoint(
  plans: FandexSourceWriteAuditPlan[],
  status: FandexSourceWriteAuditCheckpointStatus,
) {
  return plans.filter((plan) => plan.checkpointStatus === status).length;
}

function countSeverity(
  plans: FandexSourceWriteAuditPlan[],
  severity: FandexSourceWriteAuditSeverity,
) {
  return plans.filter((plan) => plan.severity === severity).length;
}

export function getSourceWriteAuditPlans(): FandexSourceWriteAuditPlan[] {
  return getSourceWriteSafetyPlans().map((plan) => {
    const auditStatus = getSourceWriteAuditStatusFromSafetyPlan(plan);
    const checkpointStatus = getSourceWriteAuditCheckpointStatusFromSafetyPlan(plan);
    const severity = getSourceWriteAuditSeverityFromSafetyPlan(plan);
    return {
      auditKey: `${plan.safetyKey}::write-audit-preview`,
      safetyKey: plan.safetyKey,
      boundaryKey: plan.boundaryKey,
      policyKey: plan.policyKey,
      provider: plan.provider,
      providerMode: plan.providerMode,
      recordKind: plan.recordKind,
      safetyStatus: plan.safetyStatus,
      gateStatus: plan.gateStatus,
      riskLevel: plan.riskLevel,
      auditStatus,
      checkpointStatus,
      severity,
      idempotencyKey: plan.idempotencyKey,
      dryRunWriteKey: plan.dryRunWriteKey,
      checkpoints: getSourceWriteAuditCheckpoints(plan),
      reasonCodes: getReasonCodes(plan),
      warnings: [...plan.warnings],
      manualReviewCount: plan.manualReviewCount,
      warningCount: plan.warningCount,
      rollbackRequired: plan.rollbackRequired,
      summaryLabel: `${plan.provider} / ${getSourceWriteAuditStatusLabel(auditStatus)}`,
      summaryNote: `${getSourceWriteSafetyStatusLabel(plan.safetyStatus)} / ${getSourceWriteSafetyGateStatusLabel(plan.gateStatus)} / ${getSourceWriteSafetyRiskLevelLabel(plan.riskLevel)} 기반 read-only audit preview다. Safety audit sample: ${getSourceWriteSafetyAuditRequirementLabel(plan.auditRequirements[0] ?? 'preview_only_check')}; safety reason sample: ${getSourceWriteSafetyReasonLabel(plan.reasonCodes[0] ?? 'preview_only')}. 실제 audit log 또는 write를 저장하지 않는다.`,
      previewOnly: true,
    };
  });
}

export function getSourceWriteAuditGroups(): FandexSourceWriteAuditGroup[] {
  const safetyGroups = getSourceWriteSafetyGroups();
  const plans = getSourceWriteAuditPlans();
  return safetyGroups.map((safetyGroup) => {
    const groupPlans = plans.filter(
      (plan) => plan.provider === safetyGroup.provider
        && plan.providerMode === safetyGroup.providerMode,
    );
    return {
      groupKey: `${safetyGroup.groupKey}::write-audit-preview`,
      provider: safetyGroup.provider,
      providerMode: safetyGroup.providerMode,
      auditPlanCount: groupPlans.length,
      auditReadyCount: countStatus(groupPlans, 'audit_ready'),
      auditReviewRequiredCount: countStatus(groupPlans, 'audit_review_required'),
      auditLimitedCount: countStatus(groupPlans, 'audit_limited'),
      auditBlockedCount: countStatus(groupPlans, 'audit_blocked'),
      skippedCount: countStatus(groupPlans, 'skipped'),
      infoCount: countSeverity(groupPlans, 'info'),
      warningCount: countSeverity(groupPlans, 'warning'),
      riskCount: countSeverity(groupPlans, 'risk'),
      blockedSeverityCount: countSeverity(groupPlans, 'blocked'),
      manualReviewCount: groupPlans.reduce((sum, plan) => sum + plan.manualReviewCount, 0),
      rollbackRequiredCount: groupPlans.filter((plan) => plan.rollbackRequired).length,
      topAuditKeys: groupPlans.map((plan) => plan.auditKey).slice(0, 5),
      blockedAuditKeys: groupPlans
        .filter((plan) => plan.auditStatus === 'audit_blocked')
        .map((plan) => plan.auditKey)
        .slice(0, 5),
      summaryLabel: `${safetyGroup.summaryLabel} / write audit`,
      summaryNote: 'Provider/mode 기반 read-only audit group이며 실제 audit log, write, rollback을 실행하지 않는다.',
      previewOnly: true,
    };
  });
}

export function getSourceWriteAuditSummary(): FandexSourceWriteAuditSummary {
  const plans = getSourceWriteAuditPlans();
  const groups = getSourceWriteAuditGroups();
  const safetySummary = getSourceWriteSafetySummary();
  return {
    auditPlanCount: plans.length,
    groupCount: groups.length,
    providerCount: new Set(plans.map((plan) => plan.provider)).size,
    auditReadyCount: countStatus(plans, 'audit_ready'),
    auditReviewRequiredCount: countStatus(plans, 'audit_review_required'),
    auditLimitedCount: countStatus(plans, 'audit_limited'),
    auditBlockedCount: countStatus(plans, 'audit_blocked'),
    skippedCount: countStatus(plans, 'skipped'),
    checkpointPassedCount: countCheckpoint(plans, 'checkpoint_passed_preview'),
    checkpointWarningCount: countCheckpoint(plans, 'checkpoint_warning_preview'),
    checkpointBlockedCount: countCheckpoint(plans, 'checkpoint_blocked_preview'),
    checkpointSkippedCount: countCheckpoint(plans, 'checkpoint_skipped_preview'),
    infoCount: countSeverity(plans, 'info'),
    warningCount: countSeverity(plans, 'warning'),
    riskCount: countSeverity(plans, 'risk'),
    blockedSeverityCount: countSeverity(plans, 'blocked'),
    rollbackRequiredCount: plans.filter((plan) => plan.rollbackRequired).length,
    manualReviewCount: plans.reduce((sum, plan) => sum + plan.manualReviewCount, 0),
    readyAuditKeys: unique(plans
      .filter((plan) => plan.auditStatus === 'audit_ready')
      .map((plan) => plan.auditKey)).slice(0, 8),
    reviewAuditKeys: unique(plans
      .filter((plan) => plan.auditStatus === 'audit_review_required')
      .map((plan) => plan.auditKey)).slice(0, 8),
    blockedAuditKeys: unique(plans
      .filter((plan) => plan.auditStatus === 'audit_blocked')
      .map((plan) => plan.auditKey)).slice(0, 8),
    summaryLabel: 'source write audit preview',
    summaryNote: `${safetySummary.summaryLabel} 기반 fixture/helper read-only audit preview다. DB, Supabase, file, audit log write와 provider sync, fetch, score delta, ranking 연결은 없다.`,
    previewOnly: true,
  };
}

export function runSourceWriteAuditShapeCheck(): FandexSourceWriteAuditShapeCheckResult {
  const issues: FandexSourceWriteAuditShapeCheckIssue[] = [];
  const safetyCheck = runSourceWriteSafetyShapeCheck();
  const plans = getSourceWriteAuditPlans();
  const groups = getSourceWriteAuditGroups();
  const summary = getSourceWriteAuditSummary();
  if (!safetyCheck.isValid) {
    issues.push({ severity: 'error', code: 'invalid-safety-shape', message: 'Write safety shape check must pass first.' });
  }
  if (!plans.length) issues.push({ severity: 'error', code: 'empty-audit-plans', message: 'Write audit plans must not be empty.' });
  if (!groups.length) issues.push({ severity: 'error', code: 'empty-audit-groups', message: 'Write audit groups must not be empty.' });
  if (new Set(plans.map((plan) => plan.auditKey)).size !== plans.length) {
    issues.push({ severity: 'error', code: 'duplicate-audit-key', message: 'Write audit keys must be unique.' });
  }
  plans.forEach((plan) => {
    const context = { auditKey: plan.auditKey };
    if (!allowedAuditStatuses.includes(plan.auditStatus)) issues.push({ severity: 'error', code: 'invalid-audit-status', message: `Invalid audit status: ${plan.auditKey}`, ...context });
    if (!allowedCheckpointStatuses.includes(plan.checkpointStatus)) issues.push({ severity: 'error', code: 'invalid-checkpoint-status', message: `Invalid checkpoint status: ${plan.auditKey}`, ...context });
    if (!allowedSeverities.includes(plan.severity)) issues.push({ severity: 'error', code: 'invalid-audit-severity', message: `Invalid audit severity: ${plan.auditKey}`, ...context });
    if (!plan.checkpoints.length) issues.push({ severity: 'error', code: 'empty-checkpoints', message: `Audit checkpoints are required: ${plan.auditKey}`, ...context });
    if (!plan.safetyKey.trim()) issues.push({ severity: 'error', code: 'missing-safety-key', message: `Safety key is required: ${plan.auditKey}`, ...context });
    if (!plan.boundaryKey.trim()) issues.push({ severity: 'error', code: 'missing-boundary-key', message: `Boundary key is required: ${plan.auditKey}`, ...context });
    if (!plan.provider.trim()) issues.push({ severity: 'error', code: 'missing-provider', message: `Provider is required: ${plan.auditKey}`, ...context });
    if (!plan.idempotencyKey.trim() || !plan.dryRunWriteKey.trim()) issues.push({ severity: 'error', code: 'missing-preview-key', message: `Preview keys are required: ${plan.auditKey}`, ...context });
    if (!plan.reasonCodes.length) issues.push({ severity: 'error', code: 'missing-reason-code', message: `Audit reasons are required: ${plan.auditKey}`, ...context });
    if (!plan.reasonCodes.includes('preview_only') || !plan.reasonCodes.includes('no_actual_audit_log') || !plan.reasonCodes.includes('no_actual_write')) issues.push({ severity: 'error', code: 'missing-reason-code', message: `Preview-only audit reasons are required: ${plan.auditKey}`, ...context });
    if (plan.previewOnly !== true) issues.push({ severity: 'error', code: 'invalid-preview-only', message: `Audit previewOnly must be true: ${plan.auditKey}`, ...context });
    plan.checkpoints.forEach((checkpoint) => {
      const checkpointContext = { auditKey: plan.auditKey, checkpointKey: checkpoint.checkpointKey };
      if (!allowedCheckpointKinds.includes(checkpoint.kind)) issues.push({ severity: 'error', code: 'invalid-checkpoint-kind', message: `Invalid checkpoint kind: ${checkpoint.checkpointKey}`, ...checkpointContext });
      if (!allowedCheckpointStatuses.includes(checkpoint.status)) issues.push({ severity: 'error', code: 'invalid-checkpoint-status', message: `Invalid checkpoint status: ${checkpoint.checkpointKey}`, ...checkpointContext });
      if (!allowedSeverities.includes(checkpoint.severity)) issues.push({ severity: 'error', code: 'invalid-audit-severity', message: `Invalid checkpoint severity: ${checkpoint.checkpointKey}`, ...checkpointContext });
      if (checkpoint.previewOnly !== true) issues.push({ severity: 'error', code: 'invalid-preview-only', message: `Checkpoint previewOnly must be true: ${checkpoint.checkpointKey}`, ...checkpointContext });
    });
  });
  if (summary.auditPlanCount !== plans.length || summary.groupCount !== groups.length || summary.providerCount !== new Set(plans.map((plan) => plan.provider)).size) {
    issues.push({ severity: 'error', code: 'invalid-summary-count', message: 'Write audit summary counts must match plan and group arrays.' });
  }
  [summary.readyAuditKeys, summary.reviewAuditKeys, summary.blockedAuditKeys].forEach((keys) => {
    if (new Set(keys).size !== keys.length) issues.push({ severity: 'error', code: 'duplicate-audit-key', message: 'Summary audit keys must be unique.' });
  });
  if (summary.previewOnly !== true || groups.some((group) => group.previewOnly !== true)) {
    issues.push({ severity: 'error', code: 'invalid-preview-only', message: 'All write audit output must remain preview-only.' });
  }
  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    auditPlanCount: plans.length,
    groupCount: groups.length,
    issues,
  };
}
