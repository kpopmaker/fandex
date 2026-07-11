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
  const safetyNotes = [
    'No external ingestion',
    'No provider sync',
    'No write',
    'No audit log storage',
    'No rollback',
    'No score · ranking · chart application',
  ];

  return (
    <nav aria-label="Source Lab sections" className="bg-slate-50 px-5 pb-10 text-slate-950">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Source Lab · preview boundary</p>
            <h2 className="mt-2 text-xl font-black">Explore the read-only source pipeline</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-600">Source Lab은 실제 수집·저장·반영 전에 fixture와 helper 결과를 검토하는 preview 공간이다. 아래 링크로 candidate/signal 검토부터 readiness 단계까지 이동할 수 있다.</p>
          </div>
          <p className="max-w-sm rounded-xl bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-900">All sections are read-only previews. Role badges and dashboard status are descriptive UI, not execution state.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Source Lab preview safety boundaries">
          {safetyNotes.map((note) => (
            <span key={note} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-600">{note}</span>
          ))}
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

        <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview flow · no steps are executed</p>
          <p className="mt-1 text-sm font-black leading-6">Draft → Sync Policy → Storage Boundary → Write Safety → Write Audit → Rollback Readiness</p>
          <p className="mt-2 border-t border-slate-700 pt-2 text-xs font-bold leading-5 text-slate-300">No external source call, persistence, recovery action, or FANDEX score/ranking/chart application occurs in Source Lab.</p>
        </div>
      </div>
    </nav>
  );
}
