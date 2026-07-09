import {
  getSourceSignalImpactDirectionLabel,
  getSourceSignalImpactGroups,
  getSourceSignalImpactLevelLabel,
  getSourceSignalImpactPreviews,
  getSourceSignalImpactReasonLabel,
  getSourceSignalImpactSummary,
  runSourceSignalImpactShapeCheck,
  type FandexSourceSignalImpactGroup,
  type FandexSourceSignalImpactPreview,
  type FandexSourceSignalImpactReasonCode,
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

function formatImpactReasons(
  reasonCodes: FandexSourceSignalImpactReasonCode[],
  maxItems = 4,
) {
  return formatPreviewList(
    reasonCodes.map(getSourceSignalImpactReasonLabel),
    maxItems,
  );
}

export default function SourceSignalImpactPreviewSection() {
  const impactPreviews = getSourceSignalImpactPreviews();
  const impactGroups = getSourceSignalImpactGroups();
  const impactSummary = getSourceSignalImpactSummary();
  const impactShapeCheck = runSourceSignalImpactShapeCheck();
  const impactPreviewItems = impactPreviews.slice(0, 8);
  const impactGroupPreview = impactGroups.slice(0, 8);
  const hasImpactPreview = impactPreviews.length > 0 && impactGroups.length > 0;

  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
              source signal impact preview
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Source Signal 영향 후보 Preview
            </h2>
            <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>
                v12 application plan을 바탕으로 실제 FANDEX 점수 반영 전 어느
                artistId / variableKey에 signal impact 후보가 생기는지 보여주는
                read-only preview입니다.
              </p>
              <p>
                previewSignalWeight는 실제 score delta가 아니며 ranking/chart/artist
                score 계산에 반영되지 않습니다.
              </p>
              <p>
                외부 API/DB/Supabase 연결 없이 fixture/helper 데이터만 사용합니다.
              </p>
            </div>
          </div>
          <ShapeCheckBadge
            isValid={impactShapeCheck.isValid}
            validLabel="impact valid"
            invalidLabel="impact issue"
          />
        </div>

        {hasImpactPreview ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-11">
              <SummaryCard
                label="impact"
                value={String(impactSummary.impactCount)}
              />
              <SummaryCard
                label="group"
                value={String(impactSummary.groupCount)}
              />
              <SummaryCard
                label={getSourceSignalImpactLevelLabel('strong')}
                value={String(impactSummary.strongImpactCount)}
              />
              <SummaryCard
                label={getSourceSignalImpactLevelLabel('moderate')}
                value={String(impactSummary.moderateImpactCount)}
              />
              <SummaryCard
                label={getSourceSignalImpactLevelLabel('weak')}
                value={String(impactSummary.weakImpactCount)}
              />
              <SummaryCard
                label={getSourceSignalImpactLevelLabel('blocked')}
                value={String(impactSummary.blockedImpactCount)}
              />
              <SummaryCard
                label={getSourceSignalImpactLevelLabel('skipped')}
                value={String(impactSummary.skippedImpactCount)}
              />
              <SummaryCard
                label="artist"
                value={String(impactSummary.artistCount)}
              />
              <SummaryCard
                label="variable"
                value={String(impactSummary.variableCount)}
              />
              <SummaryCard
                label="warning"
                value={String(impactSummary.warningCount)}
              />
              <SummaryCard
                label="shape issue"
                value={String(impactShapeCheck.issues.length)}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <Mini
                label="top impact preview"
                value={formatPreviewList(impactSummary.topImpactKeys, 5)}
              />
              <Mini
                label="blocked impact preview"
                value={formatPreviewList(impactSummary.blockedImpactKeys, 5)}
              />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  artist / variable impact group preview
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {impactGroupPreview.length} / {impactGroups.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {impactGroupPreview.map((group) => (
                  <ImpactGroupCard key={group.groupKey} group={group} />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  source signal impact preview list
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {impactPreviewItems.length} / {impactPreviews.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {impactPreviewItems.map((impact) => (
                  <ImpactPreviewCard key={impact.impactKey} impact={impact} />
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <ShapeCheckCard
                label="impact shape check"
                isValid={impactShapeCheck.isValid}
                issueCount={impactShapeCheck.issues.length}
                detail={`${impactShapeCheck.impactCount} impacts / ${impactShapeCheck.groupCount} groups`}
              />
              <Mini label="impact summary note" value={impactSummary.summaryNote} />
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-bold leading-7 text-indigo-800">
            <p>아직 source signal impact preview 데이터가 없습니다.</p>
            <p>fixture 기반 read-only preview 영역입니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ImpactGroupCard({
  group,
}: {
  group: FandexSourceSignalImpactGroup;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-indigo-700">
            {group.groupKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{group.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {group.summaryNote}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
          {group.impactCount} impacts
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Mini label="artistId" value={group.artistId} />
        <Mini label="variableKey" value={group.variableKey} />
        <Mini label="impactCount" value={String(group.impactCount)} />
        <Mini label="strongCount" value={String(group.strongCount)} />
        <Mini label="moderateCount" value={String(group.moderateCount)} />
        <Mini label="weakCount" value={String(group.weakCount)} />
        <Mini label="blockedCount" value={String(group.blockedCount)} />
        <Mini label="skippedCount" value={String(group.skippedCount)} />
        <Mini
          label="averagePreviewSignalWeight"
          value={formatScore(group.averagePreviewSignalWeight)}
        />
        <Mini
          label="topImpactKeys"
          value={formatPreviewList(group.topImpactKeys, 5)}
        />
        <Mini
          label="blockedImpactKeys"
          value={formatPreviewList(group.blockedImpactKeys, 5)}
        />
        <Mini label="warningCount" value={String(group.warningCount)} />
      </div>
    </article>
  );
}

function ImpactPreviewCard({
  impact,
}: {
  impact: FandexSourceSignalImpactPreview;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-indigo-700">
            {impact.impactKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{impact.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {impact.summaryNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceSignalImpactLevelLabel(impact.impactLevel)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceSignalImpactDirectionLabel(impact.impactDirection)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="applicationKey" value={impact.applicationKey} />
        <Mini label="candidateKey" value={impact.candidateKey} />
        <Mini label="sourceId" value={impact.sourceId} />
        <Mini label="artistId" value={impact.artistId} />
        <Mini label="variableKey" value={impact.variableKey} />
        <Mini label="applicationMode" value={impact.applicationMode} />
        <Mini
          label="impactLevel"
          value={getSourceSignalImpactLevelLabel(impact.impactLevel)}
        />
        <Mini
          label="impactDirection"
          value={getSourceSignalImpactDirectionLabel(impact.impactDirection)}
        />
        <Mini
          label="candidateScore"
          value={formatScore(impact.candidateScore)}
        />
        <Mini
          label="confidenceScore"
          value={formatScore(impact.confidenceScore)}
        />
        <Mini
          label="sourceQualityScore"
          value={formatScore(impact.sourceQualityScore)}
        />
        <Mini
          label="blendedQualityScore"
          value={formatScore(impact.blendedQualityScore)}
        />
        <Mini
          label="previewSignalWeight"
          value={formatScore(impact.previewSignalWeight)}
        />
        <Mini
          label="reasonCodes"
          value={formatImpactReasons(impact.reasonCodes)}
        />
        <Mini label="warnings" value={formatWarnings(impact.warnings)} />
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
