import {
  getSourceEligibilityStatusLabel,
  getSourceSignalApplicationGroups,
  getSourceSignalApplicationModeLabel,
  getSourceSignalApplicationPlans,
  getSourceSignalApplicationReasonLabel,
  getSourceSignalApplicationSummary,
  runSourceSignalApplicationShapeCheck,
  type FandexSourceSignalApplicationGroup,
  type FandexSourceSignalApplicationPlan,
  type FandexSourceSignalApplicationReasonCode,
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

function formatWarnings(warnings: string[]) {
  return warnings.length > 0 ? formatPreviewList(warnings, 3) : '없음';
}

function formatApplicationReasons(
  reasonCodes: FandexSourceSignalApplicationReasonCode[],
  maxItems = 4,
) {
  return formatPreviewList(
    reasonCodes.map(getSourceSignalApplicationReasonLabel),
    maxItems,
  );
}

export default function SourceSignalApplicationPreviewSection() {
  const applicationPlans = getSourceSignalApplicationPlans();
  const applicationGroups = getSourceSignalApplicationGroups();
  const applicationSummary = getSourceSignalApplicationSummary();
  const applicationShapeCheck = runSourceSignalApplicationShapeCheck();
  const applicationPlanPreview = applicationPlans.slice(0, 8);
  const applicationGroupPreview = applicationGroups.slice(0, 8);
  const hasApplicationPreview =
    applicationPlans.length > 0 && applicationGroups.length > 0;

  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
              source signal application preview
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Source Signal 반영 연결 Preview
            </h2>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600">
              v11 eligibility decision을 바탕으로 source/candidate가 실제 FANDEX
              점수에 반영되기 전 어느 artistId와 variableKey에 연결될 수 있는지
              보여주는 read-only preview입니다. 이 application plan은 실제 점수
              delta, 랭킹, 차트, 아티스트 점수 계산, 저장 로직에 연결되지
              않습니다. 외부 API/DB/Supabase 연결 없이 fixture/mock 데이터만
              사용합니다.
            </p>
          </div>
          <ShapeCheckBadge
            isValid={applicationShapeCheck.isValid}
            validLabel="application valid"
            invalidLabel="application issue"
          />
        </div>

        {hasApplicationPreview ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-11">
              <SummaryCard
                label="application plan"
                value={String(applicationSummary.planCount)}
              />
              <SummaryCard
                label="application group"
                value={String(applicationSummary.groupCount)}
              />
              <SummaryCard
                label={getSourceSignalApplicationModeLabel('ready')}
                value={String(applicationSummary.readyPlanCount)}
              />
              <SummaryCard
                label={getSourceSignalApplicationModeLabel('review')}
                value={String(applicationSummary.reviewPlanCount)}
              />
              <SummaryCard
                label={getSourceSignalApplicationModeLabel('limited')}
                value={String(applicationSummary.limitedPlanCount)}
              />
              <SummaryCard
                label={getSourceSignalApplicationModeLabel('blocked')}
                value={String(applicationSummary.blockedPlanCount)}
              />
              <SummaryCard
                label={getSourceSignalApplicationModeLabel('skipped')}
                value={String(applicationSummary.skippedPlanCount)}
              />
              <SummaryCard
                label="artist"
                value={String(applicationSummary.artistCount)}
              />
              <SummaryCard
                label="variable"
                value={String(applicationSummary.variableCount)}
              />
              <SummaryCard
                label="warning"
                value={String(applicationSummary.warningCount)}
              />
              <SummaryCard
                label="shape issue"
                value={String(applicationShapeCheck.issues.length)}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <Mini
                label="반영 준비 application"
                value={formatPreviewList(applicationSummary.readyApplicationKeys, 5)}
              />
              <Mini
                label="검토 필요 application"
                value={formatPreviewList(applicationSummary.reviewApplicationKeys, 5)}
              />
              <Mini
                label="제외 후보 application"
                value={formatPreviewList(applicationSummary.blockedApplicationKeys, 5)}
              />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  artist / variable application group preview
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {applicationGroupPreview.length} / {applicationGroups.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {applicationGroupPreview.map((group) => (
                  <ApplicationGroupCard key={group.groupKey} group={group} />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  source signal application plan preview
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {applicationPlanPreview.length} / {applicationPlans.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {applicationPlanPreview.map((plan) => (
                  <ApplicationPlanCard key={plan.applicationKey} plan={plan} />
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <ShapeCheckCard
                label="application shape check"
                isValid={applicationShapeCheck.isValid}
                issueCount={applicationShapeCheck.issues.length}
                detail={`${applicationShapeCheck.planCount} plans / ${applicationShapeCheck.groupCount} groups`}
              />
              <Mini
                label="application summary note"
                value={applicationSummary.summaryNote}
              />
            </div>
          </>
        ) : (
          <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-800">
            아직 source signal application preview 데이터가 없습니다. fixture 기반
            read-only preview 영역입니다.
          </p>
        )}
      </div>
    </section>
  );
}

function ApplicationGroupCard({
  group,
}: {
  group: FandexSourceSignalApplicationGroup;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-cyan-700">
            {group.groupKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{group.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {group.summaryNote}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
          {group.planCount} plans
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Mini label="artistId" value={group.artistId} />
        <Mini label="variableKey" value={group.variableKey} />
        <Mini
          label="avg blended quality"
          value={formatScore(group.averageBlendedQualityScore)}
        />
        <Mini label="ready" value={String(group.readyCount)} />
        <Mini label="review" value={String(group.reviewCount)} />
        <Mini label="limited" value={String(group.limitedCount)} />
        <Mini label="blocked" value={String(group.blockedCount)} />
        <Mini label="skipped" value={String(group.skippedCount)} />
        <Mini
          label="top candidate"
          value={formatPreviewList(group.topCandidateKeys, 5)}
        />
        <Mini
          label="blocked candidate"
          value={formatPreviewList(group.blockedCandidateKeys, 5)}
        />
      </div>
    </article>
  );
}

function ApplicationPlanCard({
  plan,
}: {
  plan: FandexSourceSignalApplicationPlan;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-cyan-700">
            {plan.applicationKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{plan.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {plan.summaryNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceSignalApplicationModeLabel(plan.applicationMode)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceEligibilityStatusLabel(plan.eligibilityStatus)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="candidateKey" value={plan.candidateKey} />
        <Mini label="sourceId" value={plan.sourceId} />
        <Mini label="artistId" value={plan.artistId} />
        <Mini label="variableKey" value={plan.variableKey} />
        <Mini label="candidateScore" value={formatScore(plan.candidateScore)} />
        <Mini label="confidenceScore" value={formatScore(plan.confidenceScore)} />
        <Mini
          label="sourceQualityScore"
          value={formatScore(plan.sourceQualityScore)}
        />
        <Mini
          label="blendedQualityScore"
          value={formatScore(plan.blendedQualityScore)}
        />
        <Mini
          label="reasonCodes"
          value={formatApplicationReasons(plan.reasonCodes)}
        />
        <Mini label="warnings" value={formatWarnings(plan.warnings)} />
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
