import { FANDEX_METRIC_DEFINITION_BY_KEY } from '../../data/v4/metrics/fandexMetricDefinitions';
import type {
  ProductArtistMetricCollection,
  ProductMetricCollectionEntry,
} from '../../../lib/product/contracts/productMetricCollection';
import { getArtistMetricCardPresentation } from '../../../lib/product/presentation/artistMetricPresentation';

const cardToneClasses = {
  available:
    'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
  missing:
    'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60',
  'not-tracked':
    'border-slate-300 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-900',
  'data-issue':
    'border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10',
} as const;

function getMetricLabel(entry: ProductMetricCollectionEntry) {
  return (
    FANDEX_METRIC_DEFINITION_BY_KEY.get(entry.sourceMetricKey)?.label ??
    entry.sourceMetricKey
  );
}

export default function ArtistMetricOverview({
  collection,
}: {
  collection: ProductArtistMetricCollection;
}) {
  return (
    <section
      aria-labelledby="artist-product-metric-heading"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            Metric
          </p>
          <h2
            id="artist-product-metric-heading"
            className="mt-2 text-2xl font-black"
          >
            지표
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
            현재 소스에서 안전하게 확인할 수 있는 아티스트 지표입니다.
            관측되지 않은 값과 미추적 상태를 구분해 표시합니다.
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            데이터 기준
          </p>
          <p className="mt-1 font-mono text-sm font-black text-slate-950 dark:text-white">
            {collection.sourceMonth}
          </p>
        </div>
      </div>

      {collection.entries.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {collection.entries.map((entry) => {
            const presentation = getArtistMetricCardPresentation(entry);

            return (
              <article
                key={entry.sourceMetricKey}
                className={`rounded-2xl border p-4 ${cardToneClasses[presentation.state]}`}
              >
                <div className="flex min-h-6 items-start justify-between gap-3">
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">
                    {getMetricLabel(entry)}
                  </h3>
                  {presentation.showPreviewBadge ? (
                    <span className="shrink-0 rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-black text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-200">
                      미리보기
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-5 break-words font-mono text-2xl font-black ${
                    presentation.state === 'data-issue'
                      ? 'text-amber-800 dark:text-amber-200'
                      : presentation.state === 'available'
                        ? 'text-slate-950 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {presentation.valueText}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          표시할 지표가 없습니다.
        </p>
      )}
    </section>
  );
}
