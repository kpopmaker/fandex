import {
  getSourceSignalReviewActionGroups,
  getSourceSignalReviewActionModeLabel,
  getSourceSignalReviewActionPlans,
  getSourceSignalReviewActionReasonLabel,
  getSourceSignalReviewActionRiskLabel,
  getSourceSignalReviewActionSummary,
  runSourceSignalReviewActionShapeCheck,
  type FandexSourceSignalReviewActionGroup,
  type FandexSourceSignalReviewActionPlan,
  type FandexSourceSignalReviewActionReasonCode,
} from '../data/v4/sources';

function formatScore(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPreviewList(values: string[], maxItems: number) {
  if (values.length === 0) {
    return '없음';
  }

  const previewValues = values.slice(0, maxItems).join(' / ');
  const hiddenCount = values.length - maxItems;

  return hiddenCount > 0
    ? `${previewValues} 외 ${hiddenCount}개`
    : previewValues;
}

function formatBoolean(value: boolean) {
  return value ? '예' : '아니오';
}

function formatWarnings(warnings: string[]) {
  return warnings.length > 0 ? formatPreviewList(warnings, 3) : '없음';
}

function formatActionReasons(
  reasonCodes: FandexSourceSignalReviewActionReasonCode[],
  maxItems = 4,
) {
  return formatPreviewList(
    reasonCodes.map(getSourceSignalReviewActionReasonLabel),
    maxItems,
  );
}

export default function SourceSignalReviewActionPreviewSection() {
  const actionPlans = getSourceSignalReviewActionPlans();
  const actionGroups = getSourceSignalReviewActionGroups();
  const actionSummary = getSourceSignalReviewActionSummary();
  const actionShapeCheck = runSourceSignalReviewActionShapeCheck();
  const actionPlanPreview = actionPlans.slice(0, 8);
  const actionGroupPreview = actionGroups.slice(0, 8);
  const errorCount = actionShapeCheck.issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningIssueCount = actionShapeCheck.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length;
  const hasActionPreview = actionPlans.length > 0 && actionGroups.length > 0;

  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
              source signal review action preview
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Source 반영 검토 Action Preview
            </h2>
            <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>
                실제 FANDEX 점수 반영 전, review queue를 기반으로 운영자가
                검토할 수 있는 action 후보를 read-only로 보여줍니다.
              </p>
              <p>
                approve / hold / limit / reject / skip 후보를 preview로만
                표시합니다.
              </p>
              <p>
                이 action은 실제 승인, 거절, 보류, 저장, 랭킹 계산에 연결되지
                않습니다. 외부 API/DB/Supabase 연결 없이 fixture/helper 데이터만
                사용합니다.
              </p>
            </div>
          </div>
          <ShapeCheckBadge
            isValid={actionShapeCheck.isValid}
            validLabel="review action valid"
            invalidLabel="review action issue"
          />
        </div>

        {hasActionPreview ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
              <SummaryCard
                label="action plan"
                value={String(actionSummary.actionPlanCount)}
              />
              <SummaryCard
                label="group"
                value={String(actionSummary.groupCount)}
              />
              <SummaryCard
                label={getSourceSignalReviewActionModeLabel('approve_preview')}
                value={String(actionSummary.approvePreviewCount)}
              />
              <SummaryCard
                label={getSourceSignalReviewActionModeLabel('hold_review')}
                value={String(actionSummary.holdReviewCount)}
              />
              <SummaryCard
                label={getSourceSignalReviewActionModeLabel('limit_preview')}
                value={String(actionSummary.limitPreviewCount)}
              />
              <SummaryCard
                label={getSourceSignalReviewActionModeLabel('reject_preview')}
                value={String(actionSummary.rejectPreviewCount)}
              />
              <SummaryCard
                label={getSourceSignalReviewActionModeLabel('skip_preview')}
                value={String(actionSummary.skipPreviewCount)}
              />
              <SummaryCard
                label={`${getSourceSignalReviewActionRiskLabel('high')} risk`}
                value={String(actionSummary.highRiskCount)}
              />
              <SummaryCard
                label={`${getSourceSignalReviewActionRiskLabel('medium')} risk`}
                value={String(actionSummary.mediumRiskCount)}
              />
              <SummaryCard
                label={`${getSourceSignalReviewActionRiskLabel('low')} risk`}
                value={String(actionSummary.lowRiskCount)}
              />
              <SummaryCard
                label={`${getSourceSignalReviewActionRiskLabel('blocked')} risk`}
                value={String(actionSummary.blockedRiskCount)}
              />
              <SummaryCard
                label="warning"
                value={String(actionSummary.warningCount)}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <DistributionCard
                label="action mode 분포"
                rows={[
                  [
                    getSourceSignalReviewActionModeLabel('approve_preview'),
                    actionSummary.approvePreviewCount,
                  ],
                  [
                    getSourceSignalReviewActionModeLabel('hold_review'),
                    actionSummary.holdReviewCount,
                  ],
                  [
                    getSourceSignalReviewActionModeLabel('limit_preview'),
                    actionSummary.limitPreviewCount,
                  ],
                  [
                    getSourceSignalReviewActionModeLabel('reject_preview'),
                    actionSummary.rejectPreviewCount,
                  ],
                  [
                    getSourceSignalReviewActionModeLabel('skip_preview'),
                    actionSummary.skipPreviewCount,
                  ],
                ]}
              />
              <DistributionCard
                label="risk level 분포"
                rows={[
                  [
                    `${getSourceSignalReviewActionRiskLabel('high')} risk`,
                    actionSummary.highRiskCount,
                  ],
                  [
                    `${getSourceSignalReviewActionRiskLabel('medium')} risk`,
                    actionSummary.mediumRiskCount,
                  ],
                  [
                    `${getSourceSignalReviewActionRiskLabel('low')} risk`,
                    actionSummary.lowRiskCount,
                  ],
                  [
                    `${getSourceSignalReviewActionRiskLabel('blocked')} risk`,
                    actionSummary.blockedRiskCount,
                  ],
                ]}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <Mini
                label="approveActionKeys"
                value={formatPreviewList(actionSummary.approveActionKeys, 5)}
              />
              <Mini
                label="holdActionKeys"
                value={formatPreviewList(actionSummary.holdActionKeys, 5)}
              />
              <Mini
                label="rejectActionKeys"
                value={formatPreviewList(actionSummary.rejectActionKeys, 5)}
              />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  artist / variable review action group preview
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {actionGroupPreview.length} / {actionGroups.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {actionGroupPreview.map((group) => (
                  <ReviewActionGroupCard key={group.groupKey} group={group} />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  source signal review action plan preview
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {actionPlanPreview.length} / {actionPlans.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {actionPlanPreview.map((plan) => (
                  <ReviewActionPlanCard key={plan.actionKey} plan={plan} />
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <ShapeCheckCard
                label="review action shape check"
                isValid={actionShapeCheck.isValid}
                issueCount={actionShapeCheck.issues.length}
                detail={`${actionShapeCheck.actionPlanCount} plans / ${actionShapeCheck.groupCount} groups / errors ${errorCount} / warnings ${warningIssueCount}`}
              />
              <Mini
                label="review action summary note"
                value={actionSummary.summaryNote}
              />
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm font-bold leading-7 text-violet-800">
            <p>아직 review action preview 데이터가 없습니다.</p>
            <p>fixture 기반 read-only preview 영역입니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewActionGroupCard({
  group,
}: {
  group: FandexSourceSignalReviewActionGroup;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-violet-700">
            {group.groupKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{group.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {group.summaryNote}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
          {group.actionPlanCount} plans
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Mini label="artistId" value={group.artistId} />
        <Mini label="variableKey" value={group.variableKey} />
        <Mini label="actionPlanCount" value={String(group.actionPlanCount)} />
        <Mini
          label="approvePreviewCount"
          value={String(group.approvePreviewCount)}
        />
        <Mini label="holdReviewCount" value={String(group.holdReviewCount)} />
        <Mini label="limitPreviewCount" value={String(group.limitPreviewCount)} />
        <Mini
          label="rejectPreviewCount"
          value={String(group.rejectPreviewCount)}
        />
        <Mini label="skipPreviewCount" value={String(group.skipPreviewCount)} />
        <Mini label="highRiskCount" value={String(group.highRiskCount)} />
        <Mini label="warningCount" value={String(group.warningCount)} />
        <Mini
          label="topActionKeys"
          value={formatPreviewList(group.topActionKeys, 5)}
        />
        <Mini
          label="blockedActionKeys"
          value={formatPreviewList(group.blockedActionKeys, 5)}
        />
      </div>
    </article>
  );
}

function ReviewActionPlanCard({
  plan,
}: {
  plan: FandexSourceSignalReviewActionPlan;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-violet-700">
            {plan.actionKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{plan.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {plan.summaryNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceSignalReviewActionModeLabel(plan.actionMode)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceSignalReviewActionRiskLabel(plan.riskLevel)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="reviewKey" value={plan.reviewKey} />
        <Mini label="impactKey" value={plan.impactKey} />
        <Mini label="applicationKey" value={plan.applicationKey} />
        <Mini label="candidateKey" value={plan.candidateKey} />
        <Mini label="sourceId" value={plan.sourceId} />
        <Mini label="artistId" value={plan.artistId} />
        <Mini label="variableKey" value={plan.variableKey} />
        <Mini
          label="actionMode"
          value={getSourceSignalReviewActionModeLabel(plan.actionMode)}
        />
        <Mini
          label="riskLevel"
          value={getSourceSignalReviewActionRiskLabel(plan.riskLevel)}
        />
        <Mini label="reviewStatus" value={plan.reviewStatus} />
        <Mini label="priority" value={plan.priority} />
        <Mini label="impactLevel" value={plan.impactLevel} />
        <Mini label="impactDirection" value={plan.impactDirection} />
        <Mini
          label="previewSignalWeight"
          value={formatScore(plan.previewSignalWeight)}
        />
        <Mini
          label="requiresManualReview"
          value={formatBoolean(plan.requiresManualReview)}
        />
        <Mini
          label="reasonCodes"
          value={formatActionReasons(plan.reasonCodes)}
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
        {isValid ? '통과' : '확인 필요'}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-600">
        {detail} / issues {issueCount}
      </p>
    </article>
  );
}

function DistributionCard({
  label,
  rows,
}: {
  label: string;
  rows: [string, number][];
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-700">
        {label}
      </p>
      <div className="mt-3 grid gap-2">
        {rows.map(([rowLabel, value]) => (
          <div
            key={rowLabel}
            className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"
          >
            <span className="text-sm font-bold text-slate-500">{rowLabel}</span>
            <span className="font-mono text-sm font-black text-slate-950">
              {value}
            </span>
          </div>
        ))}
      </div>
    </article>
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
