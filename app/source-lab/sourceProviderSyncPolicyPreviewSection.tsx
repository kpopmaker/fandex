import {
  getSourceProviderDuplicatePolicyLabel,
  getSourceProviderFreshnessStatusLabel,
  getSourceProviderRetryModeLabel,
  getSourceProviderSyncCadenceLabel,
  getSourceProviderSyncPolicies,
  getSourceProviderSyncPolicyReasonLabel,
  getSourceProviderSyncPolicySummary,
  runSourceProviderSyncPolicyShapeCheck,
  type FandexSourceProviderSyncPolicy,
  type FandexSourceProviderSyncPolicyReasonCode,
} from '../data/v4/sources';

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

function formatPolicyReasons(
  reasonCodes: FandexSourceProviderSyncPolicyReasonCode[],
  maxItems = 4,
) {
  return formatPreviewList(
    reasonCodes.map(getSourceProviderSyncPolicyReasonLabel),
    maxItems,
  );
}

export default function SourceProviderSyncPolicyPreviewSection() {
  const syncPolicies = getSourceProviderSyncPolicies();
  const syncPolicySummary = getSourceProviderSyncPolicySummary();
  const syncPolicyShapeCheck = runSourceProviderSyncPolicyShapeCheck();
  const policyPreview = syncPolicies.slice(0, 8);
  const errorCount = syncPolicyShapeCheck.issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningIssueCount = syncPolicyShapeCheck.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length;
  const hasSyncPolicyPreview = syncPolicies.length > 0;

  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">
              source provider sync policy preview
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Source 수집 동기화 정책 Preview
            </h2>
            <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>
                실제 provider 동기화 전, provider별 수집 주기 / freshness /
                retry / duplicate policy를 read-only로 보여줍니다.
              </p>
              <p>
                이 정책은 실제 scheduler, cron, fetch, 저장, 랭킹 계산에
                연결되지 않습니다.
              </p>
              <p>
                외부 API/DB/Supabase 연결 없이 fixture/helper 데이터만 사용합니다.
              </p>
            </div>
          </div>
          <ShapeCheckBadge
            isValid={syncPolicyShapeCheck.isValid}
            validLabel="sync policy valid"
            invalidLabel="sync policy issue"
          />
        </div>

        {hasSyncPolicyPreview ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-13">
              <SummaryCard
                label="policy"
                value={String(syncPolicySummary.policyCount)}
              />
              <SummaryCard
                label="provider"
                value={String(syncPolicySummary.providerCount)}
              />
              <SummaryCard
                label={getSourceProviderSyncCadenceLabel('manual')}
                value={String(syncPolicySummary.manualPolicyCount)}
              />
              <SummaryCard
                label={getSourceProviderSyncCadenceLabel('hourly_preview')}
                value={String(syncPolicySummary.hourlyPreviewCount)}
              />
              <SummaryCard
                label={getSourceProviderSyncCadenceLabel('daily_preview')}
                value={String(syncPolicySummary.dailyPreviewCount)}
              />
              <SummaryCard
                label={getSourceProviderSyncCadenceLabel('disabled')}
                value={String(syncPolicySummary.disabledPolicyCount)}
              />
              <SummaryCard
                label={getSourceProviderFreshnessStatusLabel('fresh')}
                value={String(syncPolicySummary.freshPolicyCount)}
              />
              <SummaryCard
                label={getSourceProviderFreshnessStatusLabel('stale')}
                value={String(syncPolicySummary.stalePolicyCount)}
              />
              <SummaryCard
                label={getSourceProviderFreshnessStatusLabel('expired')}
                value={String(syncPolicySummary.expiredPolicyCount)}
              />
              <SummaryCard
                label="retry"
                value={String(syncPolicySummary.retryPolicyCount)}
              />
              <SummaryCard
                label="duplicate review"
                value={String(syncPolicySummary.duplicateReviewPolicyCount)}
              />
              <SummaryCard
                label="warning"
                value={String(syncPolicySummary.warningCount)}
              />
              <SummaryCard
                label="manual review"
                value={String(syncPolicySummary.manualReviewCount)}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <DistributionCard
                label="sync cadence / freshness 분포"
                rows={[
                  [
                    getSourceProviderSyncCadenceLabel('manual'),
                    syncPolicySummary.manualPolicyCount,
                  ],
                  [
                    getSourceProviderSyncCadenceLabel('hourly_preview'),
                    syncPolicySummary.hourlyPreviewCount,
                  ],
                  [
                    getSourceProviderSyncCadenceLabel('daily_preview'),
                    syncPolicySummary.dailyPreviewCount,
                  ],
                  [
                    getSourceProviderSyncCadenceLabel('disabled'),
                    syncPolicySummary.disabledPolicyCount,
                  ],
                  [
                    getSourceProviderFreshnessStatusLabel('fresh'),
                    syncPolicySummary.freshPolicyCount,
                  ],
                  [
                    getSourceProviderFreshnessStatusLabel('stale'),
                    syncPolicySummary.stalePolicyCount,
                  ],
                  [
                    getSourceProviderFreshnessStatusLabel('expired'),
                    syncPolicySummary.expiredPolicyCount,
                  ],
                ]}
              />
              <DistributionCard
                label="retry / duplicate 검토"
                rows={[
                  ['재시도 필요', syncPolicySummary.retryPolicyCount],
                  ['중복 검토 필요', syncPolicySummary.duplicateReviewPolicyCount],
                  ['warning', syncPolicySummary.warningCount],
                  ['manual review', syncPolicySummary.manualReviewCount],
                ]}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <Mini
                label="readyPolicyKeys"
                value={formatPreviewList(syncPolicySummary.readyPolicyKeys, 5)}
              />
              <Mini
                label="reviewPolicyKeys"
                value={formatPreviewList(syncPolicySummary.reviewPolicyKeys, 5)}
              />
              <Mini
                label="disabledPolicyKeys"
                value={formatPreviewList(syncPolicySummary.disabledPolicyKeys, 5)}
              />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">
                  provider sync policy preview list
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {policyPreview.length} / {syncPolicies.length}
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                {policyPreview.map((policy) => (
                  <SyncPolicyCard key={policy.policyKey} policy={policy} />
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <ShapeCheckCard
                label="provider sync policy shape check"
                isValid={syncPolicyShapeCheck.isValid}
                issueCount={syncPolicyShapeCheck.issues.length}
                detail={`${syncPolicyShapeCheck.policyCount} policies / ${syncPolicyShapeCheck.providerCount} providers / errors ${errorCount} / warnings ${warningIssueCount}`}
              />
              <Mini
                label="provider sync policy summary note"
                value={syncPolicySummary.summaryNote}
              />
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm font-bold leading-7 text-teal-800">
            <p>아직 provider sync policy preview 데이터가 없습니다.</p>
            <p>fixture 기반 read-only preview 영역입니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SyncPolicyCard({
  policy,
}: {
  policy: FandexSourceProviderSyncPolicy;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-teal-700">
            {policy.policyKey}
          </p>
          <h3 className="mt-2 text-lg font-black">{policy.summaryLabel}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {policy.summaryNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceProviderSyncCadenceLabel(policy.syncCadence)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            {getSourceProviderFreshnessStatusLabel(policy.freshnessStatus)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Mini label="provider" value={policy.provider} />
        <Mini label="providerMode" value={policy.providerMode} />
        <Mini
          label="syncCadence"
          value={getSourceProviderSyncCadenceLabel(policy.syncCadence)}
        />
        <Mini
          label="freshnessStatus"
          value={getSourceProviderFreshnessStatusLabel(policy.freshnessStatus)}
        />
        <Mini
          label="retryMode"
          value={getSourceProviderRetryModeLabel(policy.retryMode)}
        />
        <Mini
          label="duplicatePolicy"
          value={getSourceProviderDuplicatePolicyLabel(policy.duplicatePolicy)}
        />
        <Mini label="draftCount" value={String(policy.draftCount)} />
        <Mini label="readyDraftCount" value={String(policy.readyDraftCount)} />
        <Mini label="reviewDraftCount" value={String(policy.reviewDraftCount)} />
        <Mini label="blockedDraftCount" value={String(policy.blockedDraftCount)} />
        <Mini label="warningCount" value={String(policy.warningCount)} />
        <Mini
          label="manualReviewCount"
          value={String(policy.manualReviewCount)}
        />
        <Mini
          label="reasonCodes"
          value={formatPolicyReasons(policy.reasonCodes)}
        />
        <Mini label="warnings" value={formatWarnings(policy.warnings)} />
        <Mini label="previewOnly" value={formatBoolean(policy.previewOnly)} />
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
      <p className="text-xs font-black uppercase tracking-[0.12em] text-teal-700">
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
