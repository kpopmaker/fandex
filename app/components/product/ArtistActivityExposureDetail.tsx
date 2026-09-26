import Link from 'next/link';
import type {
  ProductActivityExposureEvent,
} from '../../../lib/product/contracts/productActivityExposure';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../../../lib/product/contracts/productActivityExposurePublicRoute';

function eventTime(event: ProductActivityExposureEvent) {
  return (
    event.occurredAt
    ?? event.sourcePublishedAt
    ?? event.scheduledStartAt
    ?? event.announcedAt
    ?? '관측 시점 없음'
  );
}

function eventTypeLabel(event: ProductActivityExposureEvent) {
  return event.eventType === 'confirmed_release'
    ? 'Release'
    : 'Official content';
}

function providerLabel(provider: string) {
  return provider === 'musicbrainz' ? 'MusicBrainz' : 'YouTube';
}

export default function ArtistActivityExposureDetail({
  result,
}: {
  result: ProductActivityExposurePublicRouteResult | null;
}) {
  if (result === null) return null;

  if (result.status !== 'ok') {
    return (
      <section
        id="activity-exposure"
        className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10 sm:p-6"
      >
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
          Activity Exposure · Data issue
        </p>
        <h2 className="mt-2 text-2xl font-black">활동 노출 데이터 확인 필요</h2>
        <p className="mt-3 text-sm font-bold leading-7 text-amber-900 dark:text-amber-100">
          Real Product read가 안전 조건을 통과하지 못했습니다. 점수 0이나 활동 없음으로
          대체하지 않으며 Synthetic fallback도 사용하지 않습니다.
        </p>
        <p className="mt-3 font-mono text-xs font-bold text-amber-800 dark:text-amber-200">
          {result.reason}
        </p>
      </section>
    );
  }

  const { model } = result;
  const events = [...model.events].sort((a, b) =>
    eventTime(b).localeCompare(eventTime(a)),
  );
  const visibleEvents = events.slice(0, 36);

  return (
    <section
      id="activity-exposure"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
            Real Product · Activity Exposure
          </p>
          <h2 className="mt-2 text-2xl font-black">Activity Exposure Event Stream</h2>
          <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
            실제 release와 official content 활동 이벤트를 Stored Evidence와 함께
            보여줍니다. 이 영역은 컴백 점수나 활동 강도 점수를 계산하지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
            Observed
          </span>
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-200">
            Production
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Non-numeric
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Summary label="Event count" value={String(model.events.length)} />
        <Summary label="Provider count" value={String(model.providerCoverage.length)} />
        <Summary label="Construct" value="Activity Exposure" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {model.providerCoverage.map((coverage) => (
          <div
            key={coverage.provider}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <p className="text-sm font-black">{providerLabel(coverage.provider)}</p>
            <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              collection: {coverage.collectionStatus}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              coverage: {coverage.coverageState}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              collectedAt: {coverage.collectedAt ?? '없음'}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-black">활동 이벤트</h3>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            시간 기준 정렬 · 화면에는 최대 36개를 표시하며 이 제한은 점수/방법론에 사용되지 않습니다.
          </p>
        </div>
        <span className="font-mono text-xs font-black text-slate-500 dark:text-slate-400">
          {visibleEvents.length}/{events.length}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {visibleEvents.map((event) => {
          const trace = event.storedEvidenceTrace;
          return (
            <article
              key={event.eventId}
              className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                      {eventTypeLabel(event)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                      {providerLabel(event.sourceProvider)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                      {event.participationScope}
                    </span>
                  </div>
                  <p className="mt-3 break-all font-mono text-sm font-black text-slate-950 dark:text-white">
                    {event.eventId}
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                    occurredAt: {eventTime(event)}
                    {event.occurredAtPrecision ? ' · ' + event.occurredAtPrecision : ''}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    lifecycle: {event.lifecycleState} · missing: {event.missingState}
                  </p>
                </div>
                {trace ? (
                  <Link
                    href={'/artists/iu/evidence/' + trace.eventRecordId + '?kind=activity-exposure'}
                    className="inline-flex shrink-0 text-sm font-black text-cyan-700 hover:text-cyan-500 dark:text-cyan-300"
                  >
                    Stored Evidence 확인
                  </Link>
                ) : (
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                    Evidence trace 없음
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-lg font-black">{value}</p>
    </div>
  );
}
