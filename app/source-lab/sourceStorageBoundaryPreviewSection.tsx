import {
  getSourceProviderDuplicatePolicyLabel,
  getSourceProviderFreshnessStatusLabel,
  getSourceProviderRetryModeLabel,
  getSourceProviderSyncCadenceLabel,
  getSourceStorageBoundaryGroups,
  getSourceStorageBoundaryPlans,
  getSourceStorageBoundaryReasonLabel,
  getSourceStorageBoundaryStatusLabel,
  getSourceStorageBoundarySummary,
  getSourceStorageRecordKindLabel,
  getSourceWriteGuardStatusLabel,
  runSourceStorageBoundaryShapeCheck,
  type FandexSourceStorageBoundaryGroup,
  type FandexSourceStorageBoundaryPlan,
  type FandexSourceStorageBoundaryReasonCode,
} from '../data/v4/sources';

function formatPreviewList(values: string[], maxItems: number) {
  if (values.length === 0) {
    return 'none';
  }

  const previewValues = values.slice(0, maxItems).join(' / ');
  const hiddenCount = values.length - maxItems;

  return hiddenCount > 0
    ? `${previewValues} and ${hiddenCount} more`
    : previewValues;
}

function formatBoolean(value: boolean) {
  return value ? 'true' : 'false';
}

function formatWarnings(warnings: string[]) {
  return warnings.length > 0 ? formatPreviewList(warnings, 3) : 'none';
}

function formatBoundaryReasons(
  reasonCodes: FandexSourceStorageBoundaryReasonCode[],
  maxItems = 5,
) {
  return formatPreviewList(
    reasonCodes.map(getSourceStorageBoundaryReasonLabel),
    maxItems,
  );
}

export default function SourceStorageBoundaryPreviewSection() {
  const boundaryPlans = getSourceStorageBoundaryPlans();
  const boundaryGroups = getSourceStorageBoundaryGroups();
  const boundarySummary = getSourceStorageBoundarySummary();
  const boundaryShapeCheck = runSourceStorageBoundaryShapeCheck();
  const planPreview = boundaryPlans.slice(0, 8);
  const groupPreview = boundaryGroups.slice(0, 6);
  const errorCount = boundaryShapeCheck.issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningIssueCount = boundaryShapeCheck.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length;
  const issuePreview = boundaryShapeCheck.issues.slice(0, 8);
  const hasBoundaryPreview =
    boundaryPlans.length > 0 && boundaryGroups.length > 0;

  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              source storage boundary preview
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Source Storage Boundary Preview
            </h2>
            <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>
                v19 read-only preview for checking storage boundaries, guard
                states, and dry-run plan keys before any real source storage.
              </p>
              <p>
                This section is derived from provider sync policy helpers only.
                It does not store to DB, Supabase, files, rankings, charts, or
                artist scores.
              </p>
              <p>
                allowed_preview is not real write permission. idempotencyKey and
                dryRunWriteKey are preview strings, not storage keys.
              </p>
            </div>
          </div>
          <ShapeCheckBadge
            isValid={boundaryShapeCheck.isValid}
            validLabel="storage boundary valid"
            invalidLabel="storage boundary issue"
          />
        </div>

        {hasBoundaryPreview ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-14">
              <SummaryCard
                label="boundary plan"
                value={String(boundarySummary.boundaryPlanCount)}
              />
              <SummaryCard
                label="group"
                value={String(boundarySummary.groupCount)}
              />
              <SummaryCard
                label="provider"
                value={String(boundarySummary.providerCount)}
              />
              <SummaryCard
                label={getSourceStorageBoundaryStatusLabel('ready_for_dry_run')}
                value={String(boundarySummary.readyForDryRunCount)}
              />
              <SummaryCard
                label={getSourceStorageBoundaryStatusLabel('needs_review')}
                value={String(boundarySummary.needsReviewCount)}
              />
              <SummaryCard
                label={getSourceStorageBoundaryStatusLabel('write_limited')}
                value={String(boundarySummary.writeLimitedCount)}
              />
              <SummaryCard
                label={getSourceStorageBoundaryStatusLabel('write_blocked')}
                value={String(boundarySummary.writeBlockedCount)}
              />
              <SummaryCard
                label={getSourceStorageBoundaryStatusLabel('skipped')}
                value={String(boundarySummary.skippedCount)}
              />
              <SummaryCard
                label={getSourceWriteGuardStatusLabel('allowed_preview')}
                value={String(boundarySummary.allowedPreviewCount)}
              />
              <SummaryCard
                label={getSourceWriteGuardStatusLabel('manual_review_required')}
                value={String(boundarySummary.manualReviewRequiredCount)}
              />
              <SummaryCard
                label={getSourceWriteGuardStatusLabel('limited_preview')}
                value={String(boundarySummary.limitedPreviewCount)}
              />
              <SummaryCard
                label={getSourceWriteGuardStatusLabel('blocked_preview')}
                value={String(boundarySummary.blockedPreviewCount)}
              />
              <SummaryCard
                label="warning"
                value={String(boundarySummary.warningCount)}
              />
              <SummaryCard
                label="manual review"
                value={String(boundarySummary.manualReviewCount)}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <Mini
                label="readyBoundaryKeys"
                value={formatPreviewList(boundarySummary.readyBoundaryKeys, 8)}
              />
              <Mini
                label="reviewBoundaryKeys"
                value={formatPreviewList(boundarySummary.reviewBoundaryKeys, 8)}
              />
              <Mini
                label="blockedBoundaryKeys"
                value={formatPreviewList(boundarySummary.blockedBoundaryKeys, 8)}
              />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  provider / mode storage boundary group preview
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {groupPreview.length} / {boundaryGroups.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {groupPreview.map((group) => (
                  <BoundaryGroupCard key={group.groupKey} group={group} />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  source storage boundary plan preview list
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {planPreview.length} / {boundaryPlans.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {planPreview.map((plan) => (
                  <BoundaryPlanCard key={plan.boundaryKey} plan={plan} />
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <ShapeCheckCard
                label="storage boundary shape check"
                isValid={boundaryShapeCheck.isValid}
                issueCount={boundaryShapeCheck.issues.length}
                detail={`${boundaryShapeCheck.boundaryPlanCount} plans / ${boundaryShapeCheck.groupCount} groups / errors ${errorCount} / warnings ${warningIssueCount}`}
              />
              <Mini
                label="storage boundary summary note"
                value={boundarySummary.summaryNote}
              />
            </div>

            {issuePreview.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-black">shape check issues</h3>
                <div className="mt-3 grid gap-2">
                  {issuePreview.map((issue, index) => (
                    <IssueRow
                      key={`${issue.code}-${issue.boundaryKey ?? issue.policyKey ?? index}`}
                      code={issue.code}
                      message={issue.message}
                      severity={issue.severity}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800">
            <p>Storage boundary preview data is not available yet.</p>
            <p>This is a fixture/helper based read-only preview area.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function BoundaryGroupCard({
  group,
}: {
  group: FandexSourceStorageBoundaryGroup;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-amber-700">
            {group.groupKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{group.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {group.summaryNote}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
          {group.boundaryPlanCount} plans
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Mini label="provider" value={group.provider} />
        <Mini label="providerMode" value={group.providerMode} />
        <Mini label="boundaryPlanCount" value={String(group.boundaryPlanCount)} />
        <Mini
          label="readyForDryRunCount"
          value={String(group.readyForDryRunCount)}
        />
        <Mini label="needsReviewCount" value={String(group.needsReviewCount)} />
        <Mini label="writeLimitedCount" value={String(group.writeLimitedCount)} />
        <Mini label="writeBlockedCount" value={String(group.writeBlockedCount)} />
        <Mini label="skippedCount" value={String(group.skippedCount)} />
        <Mini label="warningCount" value={String(group.warningCount)} />
        <Mini
          label="manualReviewCount"
          value={String(group.manualReviewCount)}
        />
        <Mini
          label="topBoundaryKeys"
          value={formatPreviewList(group.topBoundaryKeys, 5)}
        />
        <Mini
          label="blockedBoundaryKeys"
          value={formatPreviewList(group.blockedBoundaryKeys, 5)}
        />
      </div>
    </article>
  );
}

function BoundaryPlanCard({
  plan,
}: {
  plan: FandexSourceStorageBoundaryPlan;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-amber-700">
            {plan.boundaryKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{plan.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {plan.summaryNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceStorageBoundaryStatusLabel(plan.boundaryStatus)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceWriteGuardStatusLabel(plan.writeGuardStatus)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="provider" value={plan.provider} />
        <Mini label="providerMode" value={plan.providerMode} />
        <Mini
          label="recordKind"
          value={getSourceStorageRecordKindLabel(plan.recordKind)}
        />
        <Mini
          label="boundaryStatus"
          value={getSourceStorageBoundaryStatusLabel(plan.boundaryStatus)}
        />
        <Mini
          label="writeGuardStatus"
          value={getSourceWriteGuardStatusLabel(plan.writeGuardStatus)}
        />
        <Mini
          label="syncCadence"
          value={getSourceProviderSyncCadenceLabel(plan.syncCadence)}
        />
        <Mini
          label="freshnessStatus"
          value={getSourceProviderFreshnessStatusLabel(plan.freshnessStatus)}
        />
        <Mini
          label="retryMode"
          value={getSourceProviderRetryModeLabel(plan.retryMode)}
        />
        <Mini
          label="duplicatePolicy"
          value={getSourceProviderDuplicatePolicyLabel(plan.duplicatePolicy)}
        />
        <Mini label="draftCount" value={String(plan.draftCount)} />
        <Mini label="warningCount" value={String(plan.warningCount)} />
        <Mini
          label="manualReviewCount"
          value={String(plan.manualReviewCount)}
        />
        <Mini label="idempotencyKey" value={plan.idempotencyKey} />
        <Mini label="dryRunWriteKey" value={plan.dryRunWriteKey} />
        <Mini
          label="reasonCodes"
          value={formatBoundaryReasons(plan.reasonCodes)}
        />
        <Mini label="warnings" value={formatWarnings(plan.warnings)} />
        <Mini label="previewOnly" value={formatBoolean(plan.previewOnly)} />
      </div>
    </article>
  );
}

function ShapeCheckBadge({
  isValid,
  validLabel,
  invalidLabel,
}: {
  isValid: boolean;
  validLabel: string;
  invalidLabel: string;
}) {
  return (
    <span
      className={
        isValid
          ? 'rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700'
          : 'rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700'
      }
    >
      {isValid ? validLabel : invalidLabel}
    </span>
  );
}

function ShapeCheckCard({
  label,
  isValid,
  issueCount,
  detail,
}: {
  label: string;
  isValid: boolean;
  issueCount: number;
  detail: string;
}) {
  return (
    <article
      className={
        isValid
          ? 'rounded-2xl border border-emerald-200 bg-emerald-50 p-4'
          : 'rounded-2xl border border-rose-200 bg-rose-50 p-4'
      }
    >
      <p
        className={
          isValid
            ? 'text-xs font-black uppercase tracking-[0.12em] text-emerald-700'
            : 'text-xs font-black uppercase tracking-[0.12em] text-rose-700'
        }
      >
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-slate-950">
        {isValid ? 'passed' : 'needs review'}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-600">
        {detail} / issues {issueCount}
      </p>
    </article>
  );
}

function IssueRow({
  code,
  message,
  severity,
}: {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}) {
  return (
    <div
      className={
        severity === 'error'
          ? 'rounded-xl border border-rose-200 bg-rose-50 p-3'
          : 'rounded-xl border border-amber-200 bg-amber-50 p-3'
      }
    >
      <p className="font-mono text-xs font-black uppercase text-slate-500">
        {severity} / {code}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-700">{message}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-2xl font-black text-slate-950">
        {value}
      </p>
    </article>
  );
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
