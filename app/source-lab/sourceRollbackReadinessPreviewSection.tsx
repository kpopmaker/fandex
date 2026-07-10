import {
  getSourceRollbackCheckpointKindLabel,
  getSourceRollbackReadinessGroups,
  getSourceRollbackReadinessPlans,
  getSourceRollbackReadinessStatusLabel,
  getSourceRollbackReadinessSummary,
  getSourceRollbackReasonLabel,
  getSourceRollbackRecoveryStatusLabel,
  getSourceRollbackRiskLevelLabel,
  runSourceRollbackReadinessShapeCheck,
  type FandexSourceRollbackReadinessGroup,
  type FandexSourceRollbackReadinessPlan,
} from '../data/v4/sources';

const list = (values: string[], max: number) => values.length
  ? `${values.slice(0, max).join(' / ')}${values.length > max ? ` and ${values.length - max} more` : ''}`
  : 'none';

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-black text-slate-950">{value}</p></div>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 font-mono text-2xl font-black">{value}</p></article>;
}

function GroupCard({ group }: { group: FandexSourceRollbackReadinessGroup }) {
  const fields = [
    ['provider', group.provider], ['providerMode', group.providerMode],
    ['rollbackPlanCount', group.rollbackPlanCount], ['rollbackReadyCount', group.rollbackReadyCount],
    ['rollbackReviewRequiredCount', group.rollbackReviewRequiredCount], ['rollbackLimitedCount', group.rollbackLimitedCount],
    ['rollbackBlockedCount', group.rollbackBlockedCount], ['skippedCount', group.skippedCount],
    ['lowRiskCount', group.lowRiskCount], ['mediumRiskCount', group.mediumRiskCount],
    ['highRiskCount', group.highRiskCount], ['blockedRiskCount', group.blockedRiskCount],
    ['warningCount', group.warningCount], ['manualReviewCount', group.manualReviewCount],
    ['rollbackRequiredCount', group.rollbackRequiredCount],
    ['topRollbackKeys', list(group.topRollbackKeys, 5)],
    ['blockedRollbackKeys', list(group.blockedRollbackKeys, 5)],
  ] as const;
  return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="font-mono text-xs font-black text-fuchsia-700">{group.groupKey}</p>
    <h3 className="mt-2 text-lg font-black">{group.summaryLabel}</h3>
    <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{group.summaryNote}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{fields.map(([label, value]) => <Mini key={label} label={label} value={String(value)} />)}</div>
  </article>;
}

function PlanCard({ plan }: { plan: FandexSourceRollbackReadinessPlan }) {
  const fields = [
    ['auditKey', plan.auditKey], ['safetyKey', plan.safetyKey], ['boundaryKey', plan.boundaryKey],
    ['policyKey', plan.policyKey], ['provider', plan.provider], ['providerMode', plan.providerMode],
    ['recordKind', plan.recordKind], ['auditStatus', plan.auditStatus],
    ['checkpointStatus', plan.checkpointStatus], ['auditSeverity', plan.auditSeverity],
    ['readinessStatus', getSourceRollbackReadinessStatusLabel(plan.readinessStatus)],
    ['recoveryStatus', getSourceRollbackRecoveryStatusLabel(plan.recoveryStatus)],
    ['riskLevel', getSourceRollbackRiskLevelLabel(plan.riskLevel)],
    ['idempotencyKey', plan.idempotencyKey], ['dryRunWriteKey', plan.dryRunWriteKey],
    ['rollbackEvidenceKey', plan.rollbackEvidenceKey], ['previousStateKey', plan.previousStateKey],
    ['reasonCodes', list(plan.reasonCodes.map(getSourceRollbackReasonLabel), 10)],
    ['warnings', list(plan.warnings, 3)], ['manualReviewCount', String(plan.manualReviewCount)],
    ['warningCount', String(plan.warningCount)], ['rollbackRequired', String(plan.rollbackRequired)],
    ['previewOnly', String(plan.previewOnly)],
  ] as const;
  return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div>
      <p className="font-mono text-xs font-black text-fuchsia-700">{plan.rollbackKey}</p>
      <h3 className="mt-2 text-lg font-black">{plan.summaryLabel}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{plan.summaryNote}</p>
    </div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs font-black">{getSourceRollbackReadinessStatusLabel(plan.readinessStatus)}</span><span className="rounded-full bg-white px-3 py-1 text-xs font-black">{getSourceRollbackRiskLevelLabel(plan.riskLevel)}</span></div></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{fields.map(([label, value]) => <Mini key={label} label={label} value={value} />)}</div>
    <div className="mt-4"><h4 className="text-sm font-black">checkpoint preview · {plan.checkpoints.length}</h4><div className="mt-2 grid gap-2 lg:grid-cols-2">
      {plan.checkpoints.map((checkpoint) => <div key={checkpoint.checkpointKey} className="rounded-xl border border-fuchsia-100 bg-white p-3">
        <p className="break-words font-mono text-xs font-black text-fuchsia-700">{checkpoint.checkpointKey}</p>
        <p className="mt-2 text-sm font-black">{checkpoint.label}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{getSourceRollbackCheckpointKindLabel(checkpoint.kind)} / {getSourceRollbackRecoveryStatusLabel(checkpoint.status)} / {getSourceRollbackRiskLevelLabel(checkpoint.riskLevel)}</p>
        <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{checkpoint.note}</p>
        <p className="mt-2 text-xs font-black text-slate-400">previewOnly: {String(checkpoint.previewOnly)}</p>
      </div>)}
    </div></div>
  </article>;
}

export default function SourceRollbackReadinessPreviewSection() {
  const plans = getSourceRollbackReadinessPlans(); const groups = getSourceRollbackReadinessGroups();
  const summary = getSourceRollbackReadinessSummary(); const shape = runSourceRollbackReadinessShapeCheck();
  const planPreview = plans.slice(0, 8); const groupPreview = groups.slice(0, 6);
  const errors = shape.issues.filter((issue) => issue.severity === 'error').length;
  const warnings = shape.issues.filter((issue) => issue.severity === 'warning').length;
  const cards = [
    ['rollback plan', summary.rollbackPlanCount], ['group', summary.groupCount], ['provider', summary.providerCount],
    [getSourceRollbackReadinessStatusLabel('rollback_ready'), summary.rollbackReadyCount],
    [getSourceRollbackReadinessStatusLabel('rollback_review_required'), summary.rollbackReviewRequiredCount],
    [getSourceRollbackReadinessStatusLabel('rollback_limited'), summary.rollbackLimitedCount],
    [getSourceRollbackReadinessStatusLabel('rollback_blocked'), summary.rollbackBlockedCount],
    [getSourceRollbackReadinessStatusLabel('skipped'), summary.skippedCount],
    [getSourceRollbackRecoveryStatusLabel('recovery_ready_preview'), summary.recoveryReadyCount],
    [getSourceRollbackRecoveryStatusLabel('recovery_warning_preview'), summary.recoveryWarningCount],
    [getSourceRollbackRecoveryStatusLabel('recovery_blocked_preview'), summary.recoveryBlockedCount],
    [getSourceRollbackRecoveryStatusLabel('recovery_skipped_preview'), summary.recoverySkippedCount],
    [`risk ${getSourceRollbackRiskLevelLabel('low')}`, summary.lowRiskCount],
    [`risk ${getSourceRollbackRiskLevelLabel('medium')}`, summary.mediumRiskCount],
    [`risk ${getSourceRollbackRiskLevelLabel('high')}`, summary.highRiskCount],
    [`risk ${getSourceRollbackRiskLevelLabel('blocked')}`, summary.blockedRiskCount],
    ['rollback required', summary.rollbackRequiredCount], ['warning', summary.warningCount],
    ['manual review', summary.manualReviewCount],
  ] as const;
  return <section className="bg-slate-50 px-5 pb-10 text-slate-950"><div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-700">source rollback readiness preview</p>
      <h2 className="mt-2 text-2xl font-black">Source Rollback Readiness Preview</h2>
      <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
        <p>v22 · 실제 rollback 전 recovery boundary / revert evidence preview</p>
        <p>실제 DB, Supabase, file, audit log, rollback 저장 없이 v21 write audit 기반 readiness, recovery status, evidence, previous state requirement를 확인한다.</p>
        <p>rollback_ready와 recovery_ready_preview는 실제 rollback 또는 복구 가능 상태가 아니다.</p>
        <p>rollbackEvidenceKey와 previousStateKey는 실제 저장 키가 아닌 preview 문자열이다.</p>
      </div></div><span className={shape.isValid ? 'rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700' : 'rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700'}>{shape.isValid ? 'rollback readiness passed' : 'rollback readiness failed'}</span></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{cards.map(([label, value]) => <SummaryCard key={label} label={label} value={value} />)}</div>
    <div className="mt-5 grid gap-3 lg:grid-cols-3"><Mini label="readyRollbackKeys" value={list(summary.readyRollbackKeys, 8)} /><Mini label="reviewRollbackKeys" value={list(summary.reviewRollbackKeys, 8)} /><Mini label="blockedRollbackKeys" value={list(summary.blockedRollbackKeys, 8)} /></div>
    <div className="mt-6"><h3 className="text-lg font-black">provider / mode rollback group preview · {groupPreview.length} / {groups.length}</h3><div className="mt-3 grid gap-3 lg:grid-cols-2">{groupPreview.map((group) => <GroupCard key={group.groupKey} group={group} />)}</div></div>
    <div className="mt-6"><h3 className="text-lg font-black">rollback readiness plan preview · {planPreview.length} / {plans.length}</h3><div className="mt-3 grid gap-3">{planPreview.map((plan) => <PlanCard key={plan.rollbackKey} plan={plan} />)}</div></div>
    <div className={shape.isValid ? 'mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4' : 'mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4'}><p className="text-xs font-black uppercase">rollback readiness shape check</p><p className="mt-2 text-lg font-black">{shape.isValid ? 'passed' : 'failed'}</p><p className="mt-1 text-sm font-bold text-slate-600">{shape.rollbackPlanCount} plans / {shape.groupCount} groups / errors {errors} / warnings {warnings}</p></div>
    {shape.issues.length > 0 && <div className="mt-3 grid gap-2">{shape.issues.slice(0, 8).map((issue, index) => <div key={`${issue.code}-${issue.rollbackKey ?? index}`} className={issue.severity === 'error' ? 'rounded-xl border border-rose-200 bg-rose-50 p-3' : 'rounded-xl border border-amber-200 bg-amber-50 p-3'}><p className="font-mono text-xs font-black uppercase">{issue.severity} / {issue.code}</p><p className="mt-1 text-sm font-bold">{issue.message}</p></div>)}</div>}
    <Mini label={summary.summaryLabel} value={summary.summaryNote} />
  </div></section>;
}
