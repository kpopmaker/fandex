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
  return (
    <nav aria-label="Source Lab sections" className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Source Lab navigation</p>
            <h2 className="mt-2 text-xl font-black">Jump to a source pipeline section</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">Source candidate와 signal preview부터 read-only readiness pipeline까지 현재 페이지의 흐름을 빠르게 탐색한다.</p>
          </div>
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-900">설명용 navigation이며 실제 pipeline 실행 상태가 아니다.</p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sections.map((section, index) => (
            <a key={section.href} href={section.href} className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <span className="font-mono text-xs font-black text-slate-400 group-hover:text-indigo-600">{String(index + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{section.group}</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-indigo-700">{section.role}</span>
                </span>
                <span className="mt-1 block text-sm font-black text-slate-800">{section.label}</span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">read-only preview</span>
              </span>
            </a>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black leading-6 text-white">
          <span className="text-slate-400">Current pipeline flow · </span>
          Draft → Sync Policy → Storage Boundary → Write Safety → Write Audit → Rollback Readiness
          <p className="mt-2 border-t border-slate-700 pt-2 text-xs font-bold text-slate-300">All Source Lab sections are read-only previews. No ingestion, sync, write, audit log, or rollback is executed here.</p>
        </div>
      </div>
    </nav>
  );
}
