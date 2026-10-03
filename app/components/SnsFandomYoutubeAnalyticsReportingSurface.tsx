import type {
  SnsFandomYoutubeAnalyticsReportingSurface,
} from '../../lib/product/presentation/snsFandomYoutubeAnalyticsReportingSurface';

export function SnsFandomYoutubeAnalyticsReportingSurfaceView({
  surface,
}: {
  surface: SnsFandomYoutubeAnalyticsReportingSurface;
}) {
  if (surface.state !== 'real-bounded-snapshot-ready') {
    return (
      <section aria-label="SNS fandom YouTube analytics reporting unavailable">
        <h1>Analytics &amp; Reporting unavailable</h1>
        <p>Verified real provider evidence is not currently renderable.</p>
      </section>
    );
  }

  return (
    <section
      aria-label="SNS fandom YouTube real bounded analytics reporting"
      className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm"
    >
      <div className="max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
          Real provider evidence
        </p>
        <h1 className="mt-2 text-3xl font-black">
          YouTube Analytics &amp; Reporting
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This report renders a sanitized provider-backed bounded observation.
          It is not fixture, mock, editorial seed, or preview data.
        </p>
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
          Measurement window complete: {String(surface.measurementWindowComplete)}.
          Final quota evidence promotion: {String(surface.finalOwnerEvidencePromotionAllowed)}.
          This bounded snapshot must not be represented as a completed full-window aggregate.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Audit channels" value={String(surface.artistChannelCount)} />
        <Metric
          label="Playlist pages traversed"
          value={String(surface.uploadManifestPageCountPerReactionRun)}
        />
        <Metric
          label="Included videos"
          value={String(surface.videoCountPerReactionRun)}
          note={surface.trueZeroVideoCountObserved ? 'Observed true zero' : undefined}
        />
        <Metric
          label="Observed provider calls"
          value={String(surface.providerCallsObserved.total)}
        />
        <Metric
          label="Observed quota units"
          value={String(surface.quotaUnitsObserved)}
        />
        <Metric
          label="Reaction snapshots/day"
          value={String(surface.reactionSnapshotRunsPerDay)}
        />
        <Metric label="Measured at" value={surface.measuredAt} />
        <Metric label="Observed through" value={surface.observedThrough} />
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="p-3 font-black">Artist</th>
              <th className="p-3 font-black">Playlist pages</th>
              <th className="p-3 font-black">Included videos</th>
            </tr>
          </thead>
          <tbody>
            {surface.perArtist.map((row) => (
              <tr key={row.canonicalArtistId} className="border-b border-slate-100">
                <td className="p-3 font-bold">{row.canonicalArtistId}</td>
                <td className="p-3">{row.playlistItemsPagesTraversed}</td>
                <td className="p-3">
                  {row.includedVideoCount}
                  {row.includedVideoCount === 0 ? ' (true zero)' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-xs leading-6 text-slate-600">
        <p className="font-black text-slate-900">Evidence lineage</p>
        <p>Workflow run: {surface.lineage.workflowRunId}</p>
        <p>Artifact: {surface.lineage.artifactId}</p>
        <p>Authorization: {surface.lineage.authorizationEvidenceRef}</p>
        <p>Durable result: {surface.lineage.durableResultEvidenceRef}</p>
        <p>
          Raw video identifiers stored: false · Raw statistics stored: false ·
          Secret material stored: false
        </p>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 break-words font-mono text-lg font-black">{value}</p>
      {note ? <p className="mt-1 text-xs font-bold text-cyan-700">{note}</p> : null}
    </article>
  );
}
