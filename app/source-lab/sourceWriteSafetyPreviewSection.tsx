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
  type FandexSourceWriteSafetyGroup,
  type FandexSourceWriteSafetyPlan,
} from '../data/v4/sources';

function formatList(values: string[], maxItems: number) {
  if (values.length === 0) return 'none';
  const preview = values.slice(0, maxItems).join(' / ');
  const hiddenCount = values.length - maxItems;
  return hiddenCount > 0 ? `${preview} and ${hiddenCount} more` : preview;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-black text-slate-950">
        {value}
      </p>
    </article>
  );
}

function GroupCard({ group }: { group: FandexSourceWriteSafetyGroup }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-mono text-xs font-black text-cyan-700">
        {group.groupKey}
      </p>
      <h3 className="mt-2 text-lg font-black">{group.summaryLabel}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
        {group.summaryNote}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Mini label="provider" value={group.provider} />
        <Mini label="providerMode" value={group.providerMode} />
        <Mini label="safetyPlanCount" value={String(group.safetyPlanCount)} />
        <Mini label="dryRunSafeCount" value={String(group.dryRunSafeCount)} />
        <Mini label="reviewRequiredCount" value={String(group.reviewRequiredCount)} />
        <Mini label="limitedDryRunCount" value={String(group.limitedDryRunCount)} />
        <Mini label="blockedCount" value={String(group.blockedCount)} />
        <Mini label="skippedCount" value={String(group.skippedCount)} />
        <Mini label="lowRiskCount" value={String(group.lowRiskCount)} />
        <Mini label="mediumRiskCount" value={String(group.mediumRiskCount)} />
        <Mini label="highRiskCount" value={String(group.highRiskCount)} />
        <Mini label="blockedRiskCount" value={String(group.blockedRiskCount)} />
        <Mini label="warningCount" value={String(group.warningCount)} />
        <Mini label="manualReviewCount" value={String(group.manualReviewCount)} />
        <Mini label="topSafetyKeys" value={formatList(group.topSafetyKeys, 5)} />
        <Mini label="blockedSafetyKeys" value={formatList(group.blockedSafetyKeys, 5)} />
      </div>
    </article>
  );
}

function PlanCard({ plan }: { plan: FandexSourceWriteSafetyPlan }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-cyan-700">
            {plan.safetyKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{plan.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {plan.summaryNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceWriteSafetyStatusLabel(plan.safetyStatus)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceWriteSafetyRiskLevelLabel(plan.riskLevel)}
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="boundaryKey" value={plan.boundaryKey} />
        <Mini label="policyKey" value={plan.policyKey} />
        <Mini label="provider" value={plan.provider} />
        <Mini label="providerMode" value={plan.providerMode} />
        <Mini label="recordKind" value={plan.recordKind} />
        <Mini label="boundaryStatus" value={plan.boundaryStatus} />
        <Mini label="writeGuardStatus" value={plan.writeGuardStatus} />
        <Mini label="safetyStatus" value={getSourceWriteSafetyStatusLabel(plan.safetyStatus)} />
        <Mini label="gateStatus" value={getSourceWriteSafetyGateStatusLabel(plan.gateStatus)} />
        <Mini label="riskLevel" value={getSourceWriteSafetyRiskLevelLabel(plan.riskLevel)} />
        <Mini label="idempotencyKey" value={plan.idempotencyKey} />
        <Mini label="dryRunWriteKey" value={plan.dryRunWriteKey} />
        <Mini
          label="auditRequirements"
          value={formatList(
            plan.auditRequirements.map(getSourceWriteSafetyAuditRequirementLabel),
            7,
          )}
        />
        <Mini
          label="reasonCodes"
          value={formatList(plan.reasonCodes.map(getSourceWriteSafetyReasonLabel), 8)}
        />
        <Mini label="warnings" value={formatList(plan.warnings, 3)} />
        <Mini label="manualReviewCount" value={String(plan.manualReviewCount)} />
        <Mini label="warningCount" value={String(plan.warningCount)} />
        <Mini label="rollbackRequired" value={String(plan.rollbackRequired)} />
        <Mini label="previewOnly" value={String(plan.previewOnly)} />
      </div>
    </article>
  );
}

export default function SourceWriteSafetyPreviewSection() {
  const plans = getSourceWriteSafetyPlans();
  const groups = getSourceWriteSafetyGroups();
  const summary = getSourceWriteSafetySummary();
  const shapeCheck = runSourceWriteSafetyShapeCheck();
  const planPreview = plans.slice(0, 8);
  const groupPreview = groups.slice(0, 6);
  const errorCount = shapeCheck.issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningCount = shapeCheck.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length;

  const summaryCards = [
    ['safety plan', summary.safetyPlanCount],
    ['group', summary.groupCount],
    ['provider', summary.providerCount],
    [getSourceWriteSafetyStatusLabel('dry_run_safe'), summary.dryRunSafeCount],
    [getSourceWriteSafetyStatusLabel('review_required'), summary.reviewRequiredCount],
    [getSourceWriteSafetyStatusLabel('limited_dry_run'), summary.limitedDryRunCount],
    [getSourceWriteSafetyStatusLabel('blocked'), summary.blockedCount],
    [getSourceWriteSafetyStatusLabel('skipped'), summary.skippedCount],
    [getSourceWriteSafetyGateStatusLabel('gate_passed_preview'), summary.gatePassedCount],
    [getSourceWriteSafetyGateStatusLabel('gate_warning_preview'), summary.gateWarningCount],
    [getSourceWriteSafetyGateStatusLabel('gate_blocked_preview'), summary.gateBlockedCount],
    [getSourceWriteSafetyGateStatusLabel('gate_skipped_preview'), summary.gateSkippedCount],
    [`risk ${getSourceWriteSafetyRiskLevelLabel('low')}`, summary.lowRiskCount],
    [`risk ${getSourceWriteSafetyRiskLevelLabel('medium')}`, summary.mediumRiskCount],
    [`risk ${getSourceWriteSafetyRiskLevelLabel('high')}`, summary.highRiskCount],
    [`risk ${getSourceWriteSafetyRiskLevelLabel('blocked')}`, summary.blockedRiskCount],
    ['rollback required', summary.rollbackRequiredCount],
    ['warning', summary.warningCount],
    ['manual review', summary.manualReviewCount],
  ] as const;

  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
              source write safety preview
            </p>
            <h2 className="mt-2 text-2xl font-black">Source Write Safety Preview</h2>
            <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>v20 · 실제 write 전 safety gate / risk / audit preview</p>
              <p>실제 DB, Supabase, file write 없이 v19 storage boundary 기반 safety gate, risk, audit requirement, rollback requirement를 확인한다.</p>
              <p>dry_run_safe는 실제 write 가능 상태가 아니며 gate_passed_preview도 실제 write gate 통과가 아니다.</p>
              <p>rollbackRequired는 실제 rollback 로직이 아닌 future requirement preview다.</p>
            </div>
          </div>
          <span className={shapeCheck.isValid ? 'rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700' : 'rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700'}>
            {shapeCheck.isValid ? 'write safety passed' : 'write safety failed'}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(([label, value]) => (
            <SummaryCard key={label} label={label} value={value} />
          ))}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <Mini label="safeSafetyKeys" value={formatList(summary.safeSafetyKeys, 8)} />
          <Mini label="reviewSafetyKeys" value={formatList(summary.reviewSafetyKeys, 8)} />
          <Mini label="blockedSafetyKeys" value={formatList(summary.blockedSafetyKeys, 8)} />
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-black">provider / mode write safety group preview · {groupPreview.length} / {groups.length}</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {groupPreview.map((group) => <GroupCard key={group.groupKey} group={group} />)}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-black">source write safety plan preview · {planPreview.length} / {plans.length}</h3>
          <div className="mt-3 grid gap-3">
            {planPreview.map((plan) => <PlanCard key={plan.safetyKey} plan={plan} />)}
          </div>
        </div>

        <div className={shapeCheck.isValid ? 'mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4' : 'mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4'}>
          <p className="text-xs font-black uppercase tracking-[0.12em]">write safety shape check</p>
          <p className="mt-2 text-lg font-black">{shapeCheck.isValid ? 'passed' : 'failed'}</p>
          <p className="mt-1 text-sm font-bold text-slate-600">
            {shapeCheck.safetyPlanCount} plans / {shapeCheck.groupCount} groups / errors {errorCount} / warnings {warningCount}
          </p>
        </div>

        {shapeCheck.issues.length > 0 && (
          <div className="mt-3 grid gap-2">
            {shapeCheck.issues.slice(0, 8).map((issue, index) => (
              <div key={`${issue.code}-${issue.safetyKey ?? index}`} className={issue.severity === 'error' ? 'rounded-xl border border-rose-200 bg-rose-50 p-3' : 'rounded-xl border border-amber-200 bg-amber-50 p-3'}>
                <p className="font-mono text-xs font-black uppercase text-slate-500">{issue.severity} / {issue.code}</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{issue.message}</p>
              </div>
            ))}
          </div>
        )}

        <Mini label={summary.summaryLabel} value={summary.summaryNote} />
      </div>
    </section>
  );
}
