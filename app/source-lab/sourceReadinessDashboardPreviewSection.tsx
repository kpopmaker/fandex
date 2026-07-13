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
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 break-words font-mono text-xl font-black text-slate-950 sm:text-2xl">{value}</p>
    </article>
  );
}

const stageCopy: Record<FandexSourceReadinessStageKey, { order: string; title: string; subtitle: string }> = {
  ingestion_draft: { order: '01', title: 'Ingestion Draft', subtitle: 'fixture source ingestion draft readiness' },
  provider_sync_policy: { order: '02', title: 'Provider Sync Policy', subtitle: 'provider cadence and sync policy readiness' },
  storage_boundary: { order: '03', title: 'Storage Boundary', subtitle: 'dry-run storage boundary readiness' },
  write_safety: { order: '04', title: 'Write Safety', subtitle: 'write gate and safety readiness' },
  write_audit: { order: '05', title: 'Write Audit', subtitle: 'audit checkpoint readiness' },
  rollback_readiness: { order: '06', title: 'Rollback Readiness', subtitle: 'rollback evidence readiness' },
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
  const counts = [
    ['ready', card.readyCount, 'text-emerald-700'],
    ['review', card.reviewCount, 'text-amber-700'],
    ['limited', card.limitedCount, 'text-orange-700'],
    ['blocked', card.blockedCount, 'text-rose-700'],
    ['skipped', card.skippedCount, 'text-slate-500'],
  ] as const;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          <span className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 font-mono text-sm font-black text-white">{copy.order}</span>
          <div className="min-w-0">
            <p className="font-mono text-xs font-black text-indigo-700">{getSourceReadinessStageLabel(card.stageKey)}</p>
            <h3 className="mt-1 break-words text-lg font-black leading-6">{copy.title}</h3>
            <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-500">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{getSourceReadinessStageStatusLabel(card.stageStatus)}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">risk {getSourceReadinessRiskLevelLabel(card.riskLevel)}</span>
          <span className={card.shapeCheckPassed ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700' : 'rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700'}>
            shape {card.shapeCheckPassed ? 'passed' : 'failed'}
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {counts.map(([label, value, color]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
            <p className={`mt-1 font-mono text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-600 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-1">
        <span>items {card.itemCount}</span><span>groups {metadata.groupCount}</span><span>providers {metadata.providerCount}</span><span>warnings {card.warningCount}</span><span>manual review {card.manualReviewCount}</span><span>preview only {String(card.previewOnly)}</span>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        <Mini label="topReadyKeys" value={formatList(metadata.topReadyKeys, 4)} />
        <Mini label="topReviewKeys" value={formatList(metadata.topReviewKeys, 4)} />
        <Mini label="topBlockedKeys" value={formatList(metadata.topBlockedKeys, 4)} />
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-sm font-black text-slate-900">{card.summaryLabel}</p>
        <p className="mt-1 text-sm font-bold leading-6 text-slate-600">{card.summaryNote}</p>
        <p className="mt-2 text-xs font-bold text-slate-500">{formatList(card.reasonCodes.map(getSourceReadinessReasonLabel), 6)}</p>
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
  const headlineMetrics = [
    ['stages', summary.stageCount], ['items', totalItemCount], ['providers', totalProviderCount], ['warnings', totalWarningCount], ['manual review', totalManualReviewCount],
  ] as const;

  return (
    <section className="bg-slate-50 px-4 pb-8 text-slate-950 sm:px-5 sm:pb-10 lg:px-8 lg:pb-12">
      <div className="mx-auto max-w-6xl rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.7fr)] lg:items-end lg:gap-8">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">v23 · source pipeline 전체 readiness summary</p>
            <h2 className="mt-2 text-xl font-black leading-7 sm:text-2xl">Source Readiness Dashboard Preview</h2>
            <div className="mt-2 max-w-2xl space-y-1 text-sm font-bold leading-7 text-slate-600">
              <p>v17~v22 source pipeline preview를 한 화면에서 요약하는 read-only dashboard다.</p>
              <p>dashboard status는 실제 실행 가능 여부가 아니다.</p>
              <p>실제 ingestion, sync, write, audit log, rollback 없이 summary와 shape check만 표시한다.</p>
            </div>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-2 lg:gap-3">
            <div className="rounded-2xl bg-indigo-700 px-4 py-4 text-white sm:px-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">overall status</p>
              <p className="mt-1 text-lg font-black">{getSourceReadinessStageStatusLabel(overallStatus)}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white sm:px-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">overall risk</p>
              <p className="mt-1 text-lg font-black">{getSourceReadinessRiskLevelLabel(overallRisk)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:mt-7 lg:grid-cols-5 lg:gap-4">
          {headlineMetrics.map(([label, value]) => <SummaryCard key={label} label={label} value={value} />)}
        </div>

        <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:mt-4 lg:grid-cols-[repeat(3,minmax(0,0.75fr))_minmax(0,1.75fr)] lg:gap-4 lg:p-5">
          <Mini label="shape checks passed" value={`${shapeCheckPassedCount} / ${stageCards.length}`} />
          <Mini label="shape checks failed" value={String(shapeCheckFailedCount)} />
          <Mini label="dashboard health" value={shapeCheck.isValid ? 'passed' : 'failed'} />
          <Mini label="stage status mix" value={`ready ${summary.readyStageCount} · review ${summary.reviewStageCount} · limited ${summary.limitedStageCount} · blocked ${summary.blockedStageCount} · skipped ${summary.skippedStageCount}`} />
        </div>

        <div className="mt-5 grid gap-3 lg:mt-6 lg:grid-cols-3 lg:gap-4">
          <Mini label="readyStageKeys" value={formatList(summary.readyStageKeys.map(getSourceReadinessStageLabel))} />
          <Mini label="reviewStageKeys" value={formatList(summary.reviewStageKeys.map(getSourceReadinessStageLabel))} />
          <Mini label="blockedStageKeys" value={formatList(summary.blockedStageKeys.map(getSourceReadinessStageLabel))} />
        </div>

        <div className="mt-6 lg:mt-8">
          <h3 className="text-lg font-black">readiness stage card preview · {stageCards.length} / 6</h3>
          <div className="mt-3 grid gap-4 lg:mt-4 lg:gap-5">{stageCards.map((card) => <StageCard key={card.stageKey} card={card} metadata={metadata[card.stageKey]} />)}</div>
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
