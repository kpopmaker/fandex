import {
  getSourceIngestionDraftSummary,
  getSourceProviderSyncPolicySummary,
  getSourceReadinessDashboardPreview,
  getSourceReadinessDashboardSummary,
  getSourceReadinessReasonLabel,
  getSourceReadinessRiskLevelLabel,
  getSourceReadinessStageCards,
  getSourceReadinessStageLabel,
  getSourceReadinessStageStatusLabel,
  getSourceRollbackReadinessSummary,
  getSourceStorageBoundarySummary,
  getSourceWriteAuditSummary,
  getSourceWriteSafetySummary,
  runSourceReadinessDashboardShapeCheck,
  type FandexSourceReadinessStageCard,
  type FandexSourceReadinessStageKey,
} from '../data/v4/sources';

function formatList(values: string[], maxItems = 8) {
  if (values.length === 0) return 'none';
  const preview = values.slice(0, maxItems).join(' / ');
  return values.length > maxItems ? `${preview} and ${values.length - maxItems} more` : preview;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 break-words font-mono text-2xl font-black text-slate-950">{value}</p>
    </article>
  );
}

const stageCopy: Record<FandexSourceReadinessStageKey, { title: string; subtitle: string }> = {
  ingestion_draft: { title: 'Ingestion Draft', subtitle: 'fixture source ingestion draft readiness' },
  provider_sync_policy: { title: 'Provider Sync Policy', subtitle: 'provider cadence and sync policy readiness' },
  storage_boundary: { title: 'Storage Boundary', subtitle: 'dry-run storage boundary readiness' },
  write_safety: { title: 'Write Safety', subtitle: 'write gate and safety readiness' },
  write_audit: { title: 'Write Audit', subtitle: 'audit checkpoint readiness' },
  rollback_readiness: { title: 'Rollback Readiness', subtitle: 'rollback evidence readiness' },
};

function getStageMetadata() {
  const ingestion = getSourceIngestionDraftSummary();
  const sync = getSourceProviderSyncPolicySummary();
  const storage = getSourceStorageBoundarySummary();
  const safety = getSourceWriteSafetySummary();
  const audit = getSourceWriteAuditSummary();
  const rollback = getSourceRollbackReadinessSummary();
  return {
    ingestion_draft: { groupCount: ingestion.groupCount, providerCount: ingestion.providerCount, topReadyKeys: ingestion.readyDraftKeys, topReviewKeys: ingestion.reviewDraftKeys, topBlockedKeys: ingestion.blockedDraftKeys },
    provider_sync_policy: { groupCount: 0, providerCount: sync.providerCount, topReadyKeys: sync.readyPolicyKeys, topReviewKeys: sync.reviewPolicyKeys, topBlockedKeys: sync.disabledPolicyKeys },
    storage_boundary: { groupCount: storage.groupCount, providerCount: storage.providerCount, topReadyKeys: storage.readyBoundaryKeys, topReviewKeys: storage.reviewBoundaryKeys, topBlockedKeys: storage.blockedBoundaryKeys },
    write_safety: { groupCount: safety.groupCount, providerCount: safety.providerCount, topReadyKeys: safety.safeSafetyKeys, topReviewKeys: safety.reviewSafetyKeys, topBlockedKeys: safety.blockedSafetyKeys },
    write_audit: { groupCount: audit.groupCount, providerCount: audit.providerCount, topReadyKeys: audit.readyAuditKeys, topReviewKeys: audit.reviewAuditKeys, topBlockedKeys: audit.blockedAuditKeys },
    rollback_readiness: { groupCount: rollback.groupCount, providerCount: rollback.providerCount, topReadyKeys: rollback.readyRollbackKeys, topReviewKeys: rollback.reviewRollbackKeys, topBlockedKeys: rollback.blockedRollbackKeys },
  } satisfies Record<FandexSourceReadinessStageKey, { groupCount: number; providerCount: number; topReadyKeys: string[]; topReviewKeys: string[]; topBlockedKeys: string[] }>;
}

function StageCard({ card, metadata }: { card: FandexSourceReadinessStageCard; metadata: ReturnType<typeof getStageMetadata>[FandexSourceReadinessStageKey] }) {
  const copy = stageCopy[card.stageKey];
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs font-black text-indigo-700">{getSourceReadinessStageLabel(card.stageKey)}</p>
          <h3 className="mt-2 text-lg font-black">{copy.title}</h3>
          <p className="mt-1 text-sm font-bold text-slate-500">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">{getSourceReadinessStageStatusLabel(card.stageStatus)}</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">risk {getSourceReadinessRiskLevelLabel(card.riskLevel)}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Mini label="itemCount" value={String(card.itemCount)} />
        <Mini label="groupCount" value={String(metadata.groupCount)} />
        <Mini label="providerCount" value={String(metadata.providerCount)} />
        <Mini label="readyCount" value={String(card.readyCount)} />
        <Mini label="reviewCount" value={String(card.reviewCount)} />
        <Mini label="limitedCount" value={String(card.limitedCount)} />
        <Mini label="blockedCount" value={String(card.blockedCount)} />
        <Mini label="skippedCount" value={String(card.skippedCount)} />
        <Mini label="warningCount" value={String(card.warningCount)} />
        <Mini label="manualReviewCount" value={String(card.manualReviewCount)} />
        <Mini label="shapeCheckPassed" value={String(card.shapeCheckPassed)} />
        <Mini label="previewOnly" value={String(card.previewOnly)} />
        <Mini label="topReadyKeys" value={formatList(metadata.topReadyKeys)} />
        <Mini label="topReviewKeys" value={formatList(metadata.topReviewKeys)} />
        <Mini label="topBlockedKeys" value={formatList(metadata.topBlockedKeys)} />
        <Mini label="reasonCodes" value={formatList(card.reasonCodes.map(getSourceReadinessReasonLabel))} />
      </div>
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-sm font-black text-slate-900">{card.summaryLabel}</p>
        <p className="mt-1 text-sm font-bold leading-6 text-slate-600">{card.summaryNote}</p>
      </div>
    </article>
  );
}

export default function SourceReadinessDashboardPreviewSection() {
  const stageCards = getSourceReadinessStageCards();
  const summary = getSourceReadinessDashboardSummary();
  const preview = getSourceReadinessDashboardPreview();
  const shapeCheck = runSourceReadinessDashboardShapeCheck();
  const metadata = getStageMetadata();
  const totalItemCount = stageCards.reduce((sum, card) => sum + card.itemCount, 0);
  const totalProviderCount = Object.values(metadata).reduce((sum, stage) => sum + stage.providerCount, 0);
  const totalWarningCount = stageCards.reduce((sum, card) => sum + card.warningCount, 0);
  const totalManualReviewCount = stageCards.reduce((sum, card) => sum + card.manualReviewCount, 0);
  const shapeCheckPassedCount = stageCards.filter((card) => card.shapeCheckPassed).length;
  const shapeCheckFailedCount = stageCards.length - shapeCheckPassedCount;
  const overallStatus = summary.blockedStageCount > 0 ? 'blocked_preview' : summary.reviewStageCount > 0 ? 'review_required' : summary.limitedStageCount > 0 ? 'limited_preview' : summary.stageCount === summary.skippedStageCount ? 'skipped' : 'ready_preview';
  const overallRisk = summary.blockedRiskStageCount > 0 ? 'blocked' : summary.highRiskStageCount > 0 ? 'high' : summary.mediumRiskStageCount > 0 ? 'medium' : 'low';
  const errorCount = shapeCheck.issues.filter((issue) => issue.severity === 'error').length;
  const summaryCards = [
    ['stageCount', summary.stageCount], ['readyStageCount', summary.readyStageCount], ['reviewStageCount', summary.reviewStageCount], ['limitedStageCount', summary.limitedStageCount], ['blockedStageCount', summary.blockedStageCount], ['skippedStageCount', summary.skippedStageCount],
    ['totalItemCount', totalItemCount], ['totalProviderCount', totalProviderCount], ['totalWarningCount', totalWarningCount], ['totalManualReviewCount', totalManualReviewCount], ['shapeCheckPassedCount', shapeCheckPassedCount], ['shapeCheckFailedCount', shapeCheckFailedCount],
    ['overallStatus', getSourceReadinessStageStatusLabel(overallStatus)], ['overallRiskLevel', getSourceReadinessRiskLevelLabel(overallRisk)],
  ] as const;

  return (
    <section className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">v23 · source pipeline 전체 readiness summary</p>
            <h2 className="mt-2 text-2xl font-black">Source Readiness Dashboard Preview</h2>
            <div className="mt-2 max-w-4xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>v17~v22 source pipeline preview를 한 화면에서 요약하는 read-only dashboard다.</p>
              <p>dashboard status는 실제 실행 가능 여부가 아니다.</p>
              <p>실제 ingestion, sync, write, audit log, rollback 없이 summary와 shape check만 표시한다.</p>
            </div>
          </div>
          <span className={shapeCheck.isValid ? 'rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700' : 'rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700'}>{shapeCheck.isValid ? 'readiness dashboard passed' : 'readiness dashboard failed'}</span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(([label, value]) => <SummaryCard key={label} label={label} value={value} />)}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <Mini label="readyStageKeys" value={formatList(summary.readyStageKeys.map(getSourceReadinessStageLabel))} />
          <Mini label="reviewStageKeys" value={formatList(summary.reviewStageKeys.map(getSourceReadinessStageLabel))} />
          <Mini label="blockedStageKeys" value={formatList(summary.blockedStageKeys.map(getSourceReadinessStageLabel))} />
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-black">readiness stage card preview · {stageCards.length} / 6</h3>
          <div className="mt-3 grid gap-4">{stageCards.map((card) => <StageCard key={card.stageKey} card={card} metadata={metadata[card.stageKey]} />)}</div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">safety notes</p>
          <p className="mt-2 text-sm font-bold leading-6 text-amber-950">{formatList(preview.reasonCodes.map(getSourceReadinessReasonLabel), 10)}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-amber-950">fixture/helper 기반 표시 전용이며 실제 수집, provider sync, write, audit log, rollback 또는 FANDEX 반영은 없다.</p>
        </div>

        <div className={shapeCheck.isValid ? 'mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4' : 'mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4'}>
          <p className="text-xs font-black uppercase tracking-[0.12em]">readiness dashboard shape check</p>
          <p className="mt-2 text-lg font-black">{shapeCheck.isValid ? 'passed' : 'failed'}</p>
          <p className="mt-1 text-sm font-bold text-slate-600">{shapeCheck.stageCardCount} stage cards / errors {errorCount} / warnings 0</p>
        </div>

        {shapeCheck.issues.length > 0 && <div className="mt-3 grid gap-2">{shapeCheck.issues.map((issue, index) => <div key={`${issue.code}-${issue.stageKey ?? index}`} className="rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="font-mono text-xs font-black uppercase text-slate-500">{issue.severity} / {issue.code}</p><p className="mt-1 text-sm font-bold text-slate-700">{issue.message}</p></div>)}</div>}
        <div className="mt-3"><Mini label={summary.summaryLabel} value={summary.summaryNote} /></div>
      </div>
    </section>
  );
}
