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
  type FandexSourceWriteAuditGroup,
  type FandexSourceWriteAuditPlan,
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

function GroupCard({ group }: { group: FandexSourceWriteAuditGroup }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-mono text-xs font-black text-violet-700">
        {group.groupKey}
      </p>
      <h3 className="mt-2 text-lg font-black">{group.summaryLabel}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
        {group.summaryNote}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Mini label="provider" value={group.provider} />
        <Mini label="providerMode" value={group.providerMode} />
        <Mini label="auditPlanCount" value={String(group.auditPlanCount)} />
        <Mini label="auditReadyCount" value={String(group.auditReadyCount)} />
        <Mini label="auditReviewRequiredCount" value={String(group.auditReviewRequiredCount)} />
        <Mini label="auditLimitedCount" value={String(group.auditLimitedCount)} />
        <Mini label="auditBlockedCount" value={String(group.auditBlockedCount)} />
        <Mini label="skippedCount" value={String(group.skippedCount)} />
        <Mini label="infoCount" value={String(group.infoCount)} />
        <Mini label="warningCount" value={String(group.warningCount)} />
        <Mini label="riskCount" value={String(group.riskCount)} />
        <Mini label="blockedSeverityCount" value={String(group.blockedSeverityCount)} />
        <Mini label="manualReviewCount" value={String(group.manualReviewCount)} />
        <Mini label="rollbackRequiredCount" value={String(group.rollbackRequiredCount)} />
        <Mini label="topAuditKeys" value={formatList(group.topAuditKeys, 5)} />
        <Mini label="blockedAuditKeys" value={formatList(group.blockedAuditKeys, 5)} />
      </div>
    </article>
  );
}

function PlanCard({ plan }: { plan: FandexSourceWriteAuditPlan }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-violet-700">
            {plan.auditKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{plan.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {plan.summaryNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceWriteAuditStatusLabel(plan.auditStatus)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceWriteAuditSeverityLabel(plan.severity)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="safetyKey" value={plan.safetyKey} />
        <Mini label="boundaryKey" value={plan.boundaryKey} />
        <Mini label="policyKey" value={plan.policyKey} />
        <Mini label="provider" value={plan.provider} />
        <Mini label="providerMode" value={plan.providerMode} />
        <Mini label="recordKind" value={plan.recordKind} />
        <Mini label="safetyStatus" value={plan.safetyStatus} />
        <Mini label="gateStatus" value={plan.gateStatus} />
        <Mini label="riskLevel" value={plan.riskLevel} />
        <Mini label="auditStatus" value={getSourceWriteAuditStatusLabel(plan.auditStatus)} />
        <Mini label="checkpointStatus" value={getSourceWriteAuditCheckpointStatusLabel(plan.checkpointStatus)} />
        <Mini label="severity" value={getSourceWriteAuditSeverityLabel(plan.severity)} />
        <Mini label="idempotencyKey" value={plan.idempotencyKey} />
        <Mini label="dryRunWriteKey" value={plan.dryRunWriteKey} />
        <Mini label="reasonCodes" value={formatList(plan.reasonCodes.map(getSourceWriteAuditReasonLabel), 10)} />
        <Mini label="warnings" value={formatList(plan.warnings, 3)} />
        <Mini label="manualReviewCount" value={String(plan.manualReviewCount)} />
        <Mini label="warningCount" value={String(plan.warningCount)} />
        <Mini label="rollbackRequired" value={String(plan.rollbackRequired)} />
        <Mini label="previewOnly" value={String(plan.previewOnly)} />
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-black">checkpoint preview · {plan.checkpoints.length}</h4>
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          {plan.checkpoints.map((checkpoint) => (
            <div key={checkpoint.checkpointKey} className="rounded-xl border border-violet-100 bg-white p-3">
              <p className="break-words font-mono text-xs font-black text-violet-700">
                {checkpoint.checkpointKey}
              </p>
              <p className="mt-2 text-sm font-black">{checkpoint.label}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {getSourceWriteAuditCheckpointKindLabel(checkpoint.kind)} / {getSourceWriteAuditCheckpointStatusLabel(checkpoint.status)} / {getSourceWriteAuditSeverityLabel(checkpoint.severity)}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                {checkpoint.note}
              </p>
              <p className="mt-2 text-xs font-black text-slate-400">
                previewOnly: {String(checkpoint.previewOnly)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function SourceWriteAuditPreviewSection() {
  const plans = getSourceWriteAuditPlans();
  const groups = getSourceWriteAuditGroups();
  const summary = getSourceWriteAuditSummary();
  const shapeCheck = runSourceWriteAuditShapeCheck();
  const planPreview = plans.slice(0, 8);
  const groupPreview = groups.slice(0, 6);
  const errorCount = shapeCheck.issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningCount = shapeCheck.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length;
  const summaryCards = [
    ['audit plan', summary.auditPlanCount],
    ['group', summary.groupCount],
    ['provider', summary.providerCount],
    [getSourceWriteAuditStatusLabel('audit_ready'), summary.auditReadyCount],
    [getSourceWriteAuditStatusLabel('audit_review_required'), summary.auditReviewRequiredCount],
    [getSourceWriteAuditStatusLabel('audit_limited'), summary.auditLimitedCount],
    [getSourceWriteAuditStatusLabel('audit_blocked'), summary.auditBlockedCount],
    [getSourceWriteAuditStatusLabel('skipped'), summary.skippedCount],
    [getSourceWriteAuditCheckpointStatusLabel('checkpoint_passed_preview'), summary.checkpointPassedCount],
    [getSourceWriteAuditCheckpointStatusLabel('checkpoint_warning_preview'), summary.checkpointWarningCount],
    [getSourceWriteAuditCheckpointStatusLabel('checkpoint_blocked_preview'), summary.checkpointBlockedCount],
    [getSourceWriteAuditCheckpointStatusLabel('checkpoint_skipped_preview'), summary.checkpointSkippedCount],
    [getSourceWriteAuditSeverityLabel('info'), summary.infoCount],
    [getSourceWriteAuditSeverityLabel('warning'), summary.warningCount],
    [getSourceWriteAuditSeverityLabel('risk'), summary.riskCount],
    [getSourceWriteAuditSeverityLabel('blocked'), summary.blockedSeverityCount],
    ['rollback required', summary.rollbackRequiredCount],
    ['manual review', summary.manualReviewCount],
  ] as const;

  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
              source write audit preview
            </p>
            <h2 className="mt-2 text-2xl font-black">Source Write Audit Preview</h2>
            <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>v21 · 실제 write 전 audit trail / checkpoint / traceability preview</p>
              <p>실제 DB, Supabase, file, audit log 저장 없이 v20 write safety 기반 audit trail, checkpoint, severity, rollback evidence requirement를 확인한다.</p>
              <p>audit_ready는 실제 write 또는 audit 저장 가능 상태가 아니며 checkpoint_passed_preview도 실제 checkpoint 통과가 아니다.</p>
              <p>checkpoints는 UI 표시용 preview 배열이며 실제 audit trail을 생성하지 않는다.</p>
            </div>
          </div>
          <span className={shapeCheck.isValid ? 'rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700' : 'rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700'}>
            {shapeCheck.isValid ? 'write audit passed' : 'write audit failed'}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(([label, value]) => (
            <SummaryCard key={label} label={label} value={value} />
          ))}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <Mini label="readyAuditKeys" value={formatList(summary.readyAuditKeys, 8)} />
          <Mini label="reviewAuditKeys" value={formatList(summary.reviewAuditKeys, 8)} />
          <Mini label="blockedAuditKeys" value={formatList(summary.blockedAuditKeys, 8)} />
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-black">provider / mode write audit group preview · {groupPreview.length} / {groups.length}</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {groupPreview.map((group) => <GroupCard key={group.groupKey} group={group} />)}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-black">source write audit plan preview · {planPreview.length} / {plans.length}</h3>
          <div className="mt-3 grid gap-3">
            {planPreview.map((plan) => <PlanCard key={plan.auditKey} plan={plan} />)}
          </div>
        </div>

        <div className={shapeCheck.isValid ? 'mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4' : 'mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4'}>
          <p className="text-xs font-black uppercase tracking-[0.12em]">write audit shape check</p>
          <p className="mt-2 text-lg font-black">{shapeCheck.isValid ? 'passed' : 'failed'}</p>
          <p className="mt-1 text-sm font-bold text-slate-600">
            {shapeCheck.auditPlanCount} plans / {shapeCheck.groupCount} groups / errors {errorCount} / warnings {warningCount}
          </p>
        </div>

        {shapeCheck.issues.length > 0 && (
          <div className="mt-3 grid gap-2">
            {shapeCheck.issues.slice(0, 8).map((issue, index) => (
              <div key={`${issue.code}-${issue.auditKey ?? index}`} className={issue.severity === 'error' ? 'rounded-xl border border-rose-200 bg-rose-50 p-3' : 'rounded-xl border border-amber-200 bg-amber-50 p-3'}>
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
