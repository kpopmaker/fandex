const sections = [
  { href: '#source-overview', label: 'Overview', group: 'Overview', role: 'overview' },
  { href: '#source-readiness-dashboard', label: 'Readiness Dashboard', group: 'Overview', role: 'dashboard' },
  { href: '#source-signal-application', label: 'Signal Application', group: 'Signal Preview', role: 'preview' },
  { href: '#source-signal-impact', label: 'Signal Impact', group: 'Signal Preview', role: 'preview' },
  { href: '#source-signal-review-queue', label: 'Review Queue', group: 'Signal Preview', role: 'review' },
  { href: '#source-signal-review-action', label: 'Review Action', group: 'Signal Preview', role: 'action' },
  { href: '#source-ingestion-draft', label: 'Ingestion Draft', group: 'Pipeline Readiness', role: 'draft' },
  { href: '#source-provider-sync-policy', label: 'Provider Sync Policy', group: 'Pipeline Readiness', role: 'policy' },
  { href: '#source-storage-boundary', label: 'Storage Boundary', group: 'Pipeline Readiness', role: 'boundary' },
  { href: '#source-write-safety', label: 'Write Safety', group: 'Safety · Audit · Recovery', role: 'safety' },
  { href: '#source-write-audit', label: 'Write Audit', group: 'Safety · Audit · Recovery', role: 'audit' },
  { href: '#source-rollback-readiness', label: 'Rollback Readiness', group: 'Safety · Audit · Recovery', role: 'recovery' },
] as const;

export default function SourceLabSectionNavigation() {
  const releaseHighlights = [
    'Readiness, safety, rollback, and dashboard previews organized',
    'Navigation and mobile/desktop presentation polished',
    'Manual smoke notes separated from this scope summary',
  ];
  const safetyNotes = [
    'No ingestion or provider sync',
    'No write or audit log storage',
    'No rollback',
    'No score · ranking · chart application',
  ];
  const manualSmokeChecks = [
    'Open each static anchor and confirm its target',
    'Confirm preview-only boundaries stay visible',
    'Confirm no pipeline or FANDEX action is implied',
    'Review card readability at mobile and desktop widths',
  ];

  return (
    <nav aria-label="Source Lab sections" className="bg-slate-50 px-4 pb-8 text-slate-950 sm:px-5 sm:pb-10 lg:px-8 lg:pb-12">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5 lg:p-7 xl:p-8">
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end lg:gap-8">
          <div className="min-w-0 lg:max-w-2xl">
            <p className="text-xs font-black uppercase leading-5 tracking-[0.14em] text-indigo-700 sm:tracking-[0.18em]">Source Lab · preview boundary</p>
            <h2 className="mt-2 text-lg font-black leading-7 sm:text-xl">Explore the read-only source pipeline</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-600">Source Lab은 실제 수집·저장·반영 전에 fixture와 helper 결과를 검토하는 preview 공간이다. 아래 링크로 candidate/signal 검토부터 readiness 단계까지 이동할 수 있다.</p>
          </div>
          <p className="w-full rounded-xl bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-900 lg:max-w-sm">Role badges and dashboard status describe fixture/helper output only. Nothing is executed.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2 lg:mt-6 lg:gap-2.5" aria-label="Source Lab preview safety boundaries">
          {safetyNotes.map((note) => (
            <span key={note} className="max-w-full break-words rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-black uppercase leading-4 tracking-wide text-slate-600 sm:px-3">{note}</span>
          ))}
        </div>

        <aside aria-label="Source Lab preview release note" className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:mt-6 lg:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Preview release note</p>
              <p className="mt-1 text-sm font-black leading-6 text-slate-900">Source Lab preview pipeline · current UI polish scope</p>
              <p className="mt-1 max-w-3xl text-xs font-bold leading-5 text-slate-600">A concise snapshot of the preview workspace—not an automated deployment record or runtime status.</p>
            </div>
            <span className="w-fit shrink-0 rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-700">read-only preview</span>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {releaseHighlights.map((highlight) => (
              <li key={highlight} className="rounded-xl bg-white px-3 py-2.5 text-xs font-bold leading-5 text-slate-700">{highlight}</li>
            ))}
          </ul>
        </aside>

        <aside aria-label="Manual Source Lab smoke check" className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 lg:mt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-700">Manual smoke check</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-600">Review cues for a person—not automated test results or detected runtime state.</p>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-700">preview QA note</span>
          </div>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {manualSmokeChecks.map((check, index) => (
              <li key={check} className="flex min-w-0 items-start gap-2.5 rounded-xl bg-white p-3">
                <span className="shrink-0 font-mono text-xs font-black text-indigo-500">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-xs font-bold leading-5 text-slate-700">{check}</span>
              </li>
            ))}
          </ol>
        </aside>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-2 md:gap-3 lg:mt-6 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
          {sections.map((section, index) => (
            <a key={section.href} href={section.href} className="group flex min-w-0 items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:items-center sm:gap-3 lg:min-h-28 lg:items-start lg:p-4">
              <span className="shrink-0 pt-0.5 font-mono text-xs font-black text-slate-400 group-hover:text-indigo-600 sm:pt-0">{String(index + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 lg:min-h-9 lg:content-start">
                  <span className="break-words text-[10px] font-black uppercase leading-4 tracking-wider text-slate-400">{section.group}</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-700">{section.role}</span>
                </span>
                <span className="mt-1 block break-words text-sm font-black leading-5 text-slate-800">{section.label}</span>
              </span>
            </a>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-white lg:mt-6 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:gap-x-8 lg:px-6 lg:py-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Preview flow · no steps are executed</p>
            <p className="mt-1 break-words text-sm font-black leading-6">Draft → Sync Policy → Storage Boundary → Write Safety → Write Audit → Rollback Readiness</p>
          </div>
          <p className="mt-2 border-t border-slate-700 pt-2 text-xs font-bold leading-5 text-slate-300 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">Fixture/helper output only—no external calls, persistence, recovery, or FANDEX application.</p>
        </div>
      </div>
    </nav>
  );
}
