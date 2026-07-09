import {
  getSourceSignalReviewPriorityLabel,
  getSourceSignalReviewQueueGroups,
  getSourceSignalReviewQueueItems,
  getSourceSignalReviewQueueSummary,
  getSourceSignalReviewReasonLabel,
  getSourceSignalReviewStatusLabel,
  runSourceSignalReviewQueueShapeCheck,
  type FandexSourceSignalReviewQueueGroup,
  type FandexSourceSignalReviewQueueItem,
  type FandexSourceSignalReviewQueueSummary,
  type FandexSourceSignalReviewReasonCode,
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

function formatReviewReasons(
  reasonCodes: FandexSourceSignalReviewReasonCode[],
  maxItems = 4,
) {
  return formatPreviewList(
    reasonCodes.map(getSourceSignalReviewReasonLabel),
    maxItems,
  );
}

function getOptionalSummaryKeys(
  summary: FandexSourceSignalReviewQueueSummary,
  key: 'readyReviewKeys' | 'needsAttentionReviewKeys',
) {
  if (key in summary) {
    const value = summary[key as keyof FandexSourceSignalReviewQueueSummary];

    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
  }

  return [];
}

export default function SourceSignalReviewQueuePreviewSection() {
  const reviewItems = getSourceSignalReviewQueueItems();
  const reviewGroups = getSourceSignalReviewQueueGroups();
  const reviewSummary = getSourceSignalReviewQueueSummary();
  const reviewShapeCheck = runSourceSignalReviewQueueShapeCheck();
  const reviewItemPreview = reviewItems.slice(0, 8);
  const reviewGroupPreview = reviewGroups.slice(0, 8);
  const readyReviewKeys = getOptionalSummaryKeys(reviewSummary, 'readyReviewKeys');
  const needsAttentionReviewKeys = getOptionalSummaryKeys(
    reviewSummary,
    'needsAttentionReviewKeys',
  );
  const errorCount = reviewShapeCheck.issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningIssueCount = reviewShapeCheck.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length;
  const hasReviewQueuePreview =
    reviewItems.length > 0 && reviewGroups.length > 0;

  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-600">
              source signal review queue preview
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Source 반영 검토 Queue Preview
            </h2>
            <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>
                실제 FANDEX 점수 반영 전, impact preview를 기반으로 검토가 필요한
                source signal 후보를 read-only queue로 보여줍니다.
              </p>
              <p>
                review priority / status / reason code / warning을 확인하는
                preview입니다.
              </p>
              <p>
                이 queue는 실제 승인, 반영, 저장, 랭킹 계산에 연결되지 않습니다.
                외부 API/DB/Supabase 연결 없이 fixture/helper 데이터만 사용합니다.
              </p>
            </div>
          </div>
          <ShapeCheckBadge
            isValid={reviewShapeCheck.isValid}
            validLabel="review queue valid"
            invalidLabel="review queue issue"
          />
        </div>

        {hasReviewQueuePreview ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-11">
              <SummaryCard
                label="review item"
                value={String(reviewSummary.reviewItemCount)}
              />
              <SummaryCard
                label="group"
                value={String(reviewSummary.groupCount)}
              />
              <SummaryCard
                label={getSourceSignalReviewStatusLabel('ready_for_review')}
                value={String(reviewSummary.readyForReviewCount)}
              />
              <SummaryCard
                label={getSourceSignalReviewStatusLabel('needs_attention')}
                value={String(reviewSummary.needsAttentionCount)}
              />
              <SummaryCard
                label={getSourceSignalReviewStatusLabel('limited_review')}
                value={String(reviewSummary.limitedReviewCount)}
              />
              <SummaryCard
                label={getSourceSignalReviewStatusLabel('blocked')}
                value={String(reviewSummary.blockedCount)}
              />
              <SummaryCard
                label={getSourceSignalReviewStatusLabel('skipped')}
                value={String(reviewSummary.skippedCount)}
              />
              <SummaryCard
                label={`${getSourceSignalReviewPriorityLabel('high')} priority`}
                value={String(reviewSummary.highPriorityCount)}
              />
              <SummaryCard
                label={`${getSourceSignalReviewPriorityLabel('medium')} priority`}
                value={String(reviewSummary.mediumPriorityCount)}
              />
              <SummaryCard
                label={`${getSourceSignalReviewPriorityLabel('low')} priority`}
                value={String(reviewSummary.lowPriorityCount)}
              />
              <SummaryCard
                label="warning"
                value={String(reviewSummary.warningCount)}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <DistributionCard
                label="review status 분포"
                rows={[
                  [
                    getSourceSignalReviewStatusLabel('ready_for_review'),
                    reviewSummary.readyForReviewCount,
                  ],
                  [
                    getSourceSignalReviewStatusLabel('needs_attention'),
                    reviewSummary.needsAttentionCount,
                  ],
                  [
                    getSourceSignalReviewStatusLabel('limited_review'),
                    reviewSummary.limitedReviewCount,
                  ],
                  [
                    getSourceSignalReviewStatusLabel('blocked'),
                    reviewSummary.blockedCount,
                  ],
                  [
                    getSourceSignalReviewStatusLabel('skipped'),
                    reviewSummary.skippedCount,
                  ],
                ]}
              />
              <DistributionCard
                label="review priority 분포"
                rows={[
                  [
                    `${getSourceSignalReviewPriorityLabel('high')} 우선순위`,
                    reviewSummary.highPriorityCount,
                  ],
                  [
                    `${getSourceSignalReviewPriorityLabel('medium')} 우선순위`,
                    reviewSummary.mediumPriorityCount,
                  ],
                  [
                    `${getSourceSignalReviewPriorityLabel('low')} 우선순위`,
                    reviewSummary.lowPriorityCount,
                  ],
                ]}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <Mini
                label="topReviewKeys"
                value={formatPreviewList(reviewSummary.topReviewKeys, 5)}
              />
              <Mini
                label="blockedReviewKeys"
                value={formatPreviewList(reviewSummary.blockedReviewKeys, 5)}
              />
              {readyReviewKeys.length > 0 ? (
                <Mini
                  label="readyReviewKeys"
                  value={formatPreviewList(readyReviewKeys, 5)}
                />
              ) : null}
              {needsAttentionReviewKeys.length > 0 ? (
                <Mini
                  label="needsAttentionReviewKeys"
                  value={formatPreviewList(needsAttentionReviewKeys, 5)}
                />
              ) : null}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  artist / variable review queue group preview
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {reviewGroupPreview.length} / {reviewGroups.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {reviewGroupPreview.map((group) => (
                  <ReviewGroupCard key={group.groupKey} group={group} />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  source signal review queue item preview
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {reviewItemPreview.length} / {reviewItems.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {reviewItemPreview.map((item) => (
                  <ReviewQueueItemCard key={item.reviewKey} item={item} />
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <ShapeCheckCard
                label="review queue shape check"
                isValid={reviewShapeCheck.isValid}
                issueCount={reviewShapeCheck.issues.length}
                detail={`${reviewShapeCheck.reviewItemCount} items / ${reviewShapeCheck.groupCount} groups / errors ${errorCount} / warnings ${warningIssueCount}`}
              />
              <Mini
                label="review queue summary note"
                value={reviewSummary.summaryNote}
              />
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm font-bold leading-7 text-fuchsia-800">
            <p>아직 review queue preview 데이터가 없습니다.</p>
            <p>fixture 기반 read-only preview 영역입니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewGroupCard({
  group,
}: {
  group: FandexSourceSignalReviewQueueGroup;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-fuchsia-700">
            {group.groupKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{group.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {group.summaryNote}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
          {group.reviewItemCount} items
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Mini label="artistId" value={group.artistId} />
        <Mini label="variableKey" value={group.variableKey} />
        <Mini label="reviewItemCount" value={String(group.reviewItemCount)} />
        <Mini label="highPriorityCount" value={String(group.highPriorityCount)} />
        <Mini
          label="mediumPriorityCount"
          value={String(group.mediumPriorityCount)}
        />
        <Mini label="lowPriorityCount" value={String(group.lowPriorityCount)} />
        <Mini label="blockedCount" value={String(group.blockedCount)} />
        <Mini label="warningCount" value={String(group.warningCount)} />
        <Mini
          label="topReviewKeys"
          value={formatPreviewList(group.topReviewKeys, 5)}
        />
        <Mini
          label="blockedReviewKeys"
          value={formatPreviewList(group.blockedReviewKeys, 5)}
        />
      </div>
    </article>
  );
}

function ReviewQueueItemCard({
  item,
}: {
  item: FandexSourceSignalReviewQueueItem;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-fuchsia-700">
            {item.reviewKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{item.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {item.summaryNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceSignalReviewStatusLabel(item.reviewStatus)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceSignalReviewPriorityLabel(item.priority)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="impactKey" value={item.impactKey} />
        <Mini label="applicationKey" value={item.applicationKey} />
        <Mini label="candidateKey" value={item.candidateKey} />
        <Mini label="sourceId" value={item.sourceId} />
        <Mini label="artistId" value={item.artistId} />
        <Mini label="variableKey" value={item.variableKey} />
        <Mini label="impactLevel" value={item.impactLevel} />
        <Mini label="impactDirection" value={item.impactDirection} />
        <Mini
          label="previewSignalWeight"
          value={formatScore(item.previewSignalWeight)}
        />
        <Mini
          label="reviewStatus"
          value={getSourceSignalReviewStatusLabel(item.reviewStatus)}
        />
        <Mini
          label="priority"
          value={getSourceSignalReviewPriorityLabel(item.priority)}
        />
        <Mini
          label="reasonCodes"
          value={formatReviewReasons(item.reasonCodes)}
        />
        <Mini label="warnings" value={formatWarnings(item.warnings)} />
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
      <p className="text-xs font-black uppercase tracking-[0.12em] text-fuchsia-700">
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
