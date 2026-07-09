import {
  getSourceIngestionDraftGroups,
  getSourceIngestionDraftProviderModeLabel,
  getSourceIngestionDraftReasonLabel,
  getSourceIngestionDrafts,
  getSourceIngestionDraftStatusLabel,
  getSourceIngestionDraftSummary,
  runSourceIngestionDraftShapeCheck,
  type FandexSourceIngestionDraft,
  type FandexSourceIngestionDraftGroup,
  type FandexSourceIngestionDraftProviderMode,
  type FandexSourceIngestionDraftReasonCode,
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

function formatDraftReasons(
  reasonCodes: FandexSourceIngestionDraftReasonCode[],
  maxItems = 4,
) {
  return formatPreviewList(
    reasonCodes.map(getSourceIngestionDraftReasonLabel),
    maxItems,
  );
}

function getProviderModeCount(
  drafts: FandexSourceIngestionDraft[],
  providerMode: FandexSourceIngestionDraftProviderMode,
) {
  return drafts.filter((draft) => draft.providerMode === providerMode).length;
}

export default function SourceIngestionDraftPreviewSection() {
  const ingestionDrafts = getSourceIngestionDrafts();
  const ingestionDraftGroups = getSourceIngestionDraftGroups();
  const ingestionDraftSummary = getSourceIngestionDraftSummary();
  const ingestionDraftShapeCheck = runSourceIngestionDraftShapeCheck();
  const draftPreview = ingestionDrafts.slice(0, 8);
  const groupPreview = ingestionDraftGroups.slice(0, 8);
  const errorCount = ingestionDraftShapeCheck.issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningIssueCount = ingestionDraftShapeCheck.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length;
  const hasIngestionDraftPreview =
    ingestionDrafts.length > 0 && ingestionDraftGroups.length > 0;

  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              source ingestion draft preview
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Source 수집 Draft Preview
            </h2>
            <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>
                실제 외부 source 수집 전, 어떤 provider/source/candidate가 수집
                draft로 구성될 수 있는지 read-only로 보여줍니다.
              </p>
              <p>
                ready / review / limited / blocked / skipped 상태를 preview로만
                표시합니다.
              </p>
              <p>
                이 draft는 실제 수집, 저장, 승인, 랭킹 계산에 연결되지 않습니다.
                외부 API/DB/Supabase 연결 없이 fixture/helper 데이터만 사용합니다.
              </p>
            </div>
          </div>
          <ShapeCheckBadge
            isValid={ingestionDraftShapeCheck.isValid}
            validLabel="ingestion draft valid"
            invalidLabel="ingestion draft issue"
          />
        </div>

        {hasIngestionDraftPreview ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-10">
              <SummaryCard
                label="draft"
                value={String(ingestionDraftSummary.draftCount)}
              />
              <SummaryCard
                label="group"
                value={String(ingestionDraftSummary.groupCount)}
              />
              <SummaryCard
                label="provider"
                value={String(ingestionDraftSummary.providerCount)}
              />
              <SummaryCard
                label={getSourceIngestionDraftStatusLabel('ready')}
                value={String(ingestionDraftSummary.readyCount)}
              />
              <SummaryCard
                label={getSourceIngestionDraftStatusLabel('review')}
                value={String(ingestionDraftSummary.reviewCount)}
              />
              <SummaryCard
                label={getSourceIngestionDraftStatusLabel('limited')}
                value={String(ingestionDraftSummary.limitedCount)}
              />
              <SummaryCard
                label={getSourceIngestionDraftStatusLabel('blocked')}
                value={String(ingestionDraftSummary.blockedCount)}
              />
              <SummaryCard
                label={getSourceIngestionDraftStatusLabel('skipped')}
                value={String(ingestionDraftSummary.skippedCount)}
              />
              <SummaryCard
                label="warning"
                value={String(ingestionDraftSummary.warningCount)}
              />
              <SummaryCard
                label="manual review"
                value={String(ingestionDraftSummary.manualReviewCount)}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <DistributionCard
                label="draft status 분포"
                rows={[
                  [
                    getSourceIngestionDraftStatusLabel('ready'),
                    ingestionDraftSummary.readyCount,
                  ],
                  [
                    getSourceIngestionDraftStatusLabel('review'),
                    ingestionDraftSummary.reviewCount,
                  ],
                  [
                    getSourceIngestionDraftStatusLabel('limited'),
                    ingestionDraftSummary.limitedCount,
                  ],
                  [
                    getSourceIngestionDraftStatusLabel('blocked'),
                    ingestionDraftSummary.blockedCount,
                  ],
                  [
                    getSourceIngestionDraftStatusLabel('skipped'),
                    ingestionDraftSummary.skippedCount,
                  ],
                ]}
              />
              <DistributionCard
                label="provider mode 분포"
                rows={[
                  [
                    getSourceIngestionDraftProviderModeLabel('fixture_provider'),
                    getProviderModeCount(ingestionDrafts, 'fixture_provider'),
                  ],
                  [
                    getSourceIngestionDraftProviderModeLabel('mock_provider'),
                    getProviderModeCount(ingestionDrafts, 'mock_provider'),
                  ],
                  [
                    getSourceIngestionDraftProviderModeLabel('manual_import'),
                    getProviderModeCount(ingestionDrafts, 'manual_import'),
                  ],
                  [
                    getSourceIngestionDraftProviderModeLabel(
                      'future_external_provider',
                    ),
                    getProviderModeCount(
                      ingestionDrafts,
                      'future_external_provider',
                    ),
                  ],
                ]}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <Mini
                label="readyDraftKeys"
                value={formatPreviewList(ingestionDraftSummary.readyDraftKeys, 5)}
              />
              <Mini
                label="reviewDraftKeys"
                value={formatPreviewList(ingestionDraftSummary.reviewDraftKeys, 5)}
              />
              <Mini
                label="blockedDraftKeys"
                value={formatPreviewList(ingestionDraftSummary.blockedDraftKeys, 5)}
              />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  provider / mode ingestion draft group preview
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {groupPreview.length} / {ingestionDraftGroups.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {groupPreview.map((group) => (
                  <IngestionDraftGroupCard key={group.groupKey} group={group} />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  source ingestion draft preview list
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {draftPreview.length} / {ingestionDrafts.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {draftPreview.map((draft) => (
                  <IngestionDraftCard key={draft.draftKey} draft={draft} />
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <ShapeCheckCard
                label="ingestion draft shape check"
                isValid={ingestionDraftShapeCheck.isValid}
                issueCount={ingestionDraftShapeCheck.issues.length}
                detail={`${ingestionDraftShapeCheck.draftCount} drafts / ${ingestionDraftShapeCheck.groupCount} groups / errors ${errorCount} / warnings ${warningIssueCount}`}
              />
              <Mini
                label="ingestion draft summary note"
                value={ingestionDraftSummary.summaryNote}
              />
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-bold leading-7 text-sky-800">
            <p>아직 ingestion draft preview 데이터가 없습니다.</p>
            <p>fixture 기반 read-only preview 영역입니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function IngestionDraftGroupCard({
  group,
}: {
  group: FandexSourceIngestionDraftGroup;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-sky-700">
            {group.groupKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{group.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {group.summaryNote}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
          {group.draftCount} drafts
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Mini label="provider" value={group.provider} />
        <Mini
          label="providerMode"
          value={getSourceIngestionDraftProviderModeLabel(group.providerMode)}
        />
        <Mini label="draftCount" value={String(group.draftCount)} />
        <Mini label="readyCount" value={String(group.readyCount)} />
        <Mini label="reviewCount" value={String(group.reviewCount)} />
        <Mini label="limitedCount" value={String(group.limitedCount)} />
        <Mini label="blockedCount" value={String(group.blockedCount)} />
        <Mini label="skippedCount" value={String(group.skippedCount)} />
        <Mini label="warningCount" value={String(group.warningCount)} />
        <Mini
          label="manualReviewCount"
          value={String(group.manualReviewCount)}
        />
        <Mini
          label="topDraftKeys"
          value={formatPreviewList(group.topDraftKeys, 5)}
        />
        <Mini
          label="blockedDraftKeys"
          value={formatPreviewList(group.blockedDraftKeys, 5)}
        />
      </div>
    </article>
  );
}

function IngestionDraftCard({
  draft,
}: {
  draft: FandexSourceIngestionDraft;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-sky-700">
            {draft.draftKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{draft.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {draft.summaryNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceIngestionDraftStatusLabel(draft.draftStatus)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceIngestionDraftProviderModeLabel(draft.providerMode)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="provider" value={draft.provider} />
        <Mini
          label="providerMode"
          value={getSourceIngestionDraftProviderModeLabel(draft.providerMode)}
        />
        <Mini label="sourceId" value={draft.sourceId} />
        <Mini label="candidateKey" value={draft.candidateKey} />
        <Mini label="artistId" value={draft.artistId} />
        <Mini label="variableKey" value={draft.variableKey} />
        <Mini label="reviewKey" value={draft.reviewKey} />
        <Mini label="actionKey" value={draft.actionKey} />
        <Mini
          label="draftStatus"
          value={getSourceIngestionDraftStatusLabel(draft.draftStatus)}
        />
        <Mini label="actionMode" value={draft.actionMode} />
        <Mini label="riskLevel" value={draft.riskLevel} />
        <Mini
          label="previewSignalWeight"
          value={formatScore(draft.previewSignalWeight)}
        />
        <Mini
          label="requiresManualReview"
          value={formatBoolean(draft.requiresManualReview)}
        />
        <Mini
          label="reasonCodes"
          value={formatDraftReasons(draft.reasonCodes)}
        />
        <Mini label="warnings" value={formatWarnings(draft.warnings)} />
        <Mini label="previewOnly" value={formatBoolean(draft.previewOnly)} />
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
      <p className="text-xs font-black uppercase tracking-[0.12em] text-sky-700">
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
