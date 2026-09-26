import Link from 'next/link';
import ProductEvidenceList from './ProductEvidenceList';
import { FANDEX_METRIC_DEFINITION_BY_KEY } from '../../data/v4/metrics/fandexMetricDefinitions';
import type { FandexVariableKey } from '../../data/v4/metrics/fandexMetricTypes';
import type {
  ProductVariableId,
  ProductVariableReadModelResult,
} from '../../../lib/product/contracts/productVariable';
import type { ProductVariableEvidenceCollectionResult } from '../../../lib/product/contracts/productEvidence';
import {
  formatProductVariableFact,
  getArtistVariablePresentation,
} from '../../../lib/product/presentation/artistVariablePresentation';
import { PRODUCT_VARIABLE_DEFINITIONS } from '../../../lib/product/variables/productVariableDefinitions';
import { getProductObservationTimePresentation } from '../../../lib/product/presentation/productObservationTimePresentation';

function buildVariableHref(
  artistId: string,
  selectedVariableIds: readonly ProductVariableId[],
) {
  const params = new URLSearchParams();
  params.set('variables', selectedVariableIds.join(','));

  return `/artists/${artistId}?${params.toString()}#variable-chart`;
}

function toggleVariable(
  current: readonly ProductVariableId[],
  target: ProductVariableId,
) {
  if (current.includes(target)) {
    return current.length === 1
      ? current
      : current.filter((variableId) => variableId !== target);
  }

  return current.length >= 4 ? current : [...current, target];
}

function getMetricLabels(metricKeys: readonly FandexVariableKey[]) {
  return metricKeys
    .map(
      (metricKey) =>
        FANDEX_METRIC_DEFINITION_BY_KEY.get(metricKey)?.label ?? metricKey,
    )
    .join(' · ');
}

export default function ArtistProductVariableDetail({
  artistId,
  evidenceCollections,
  results,
  selectedVariableIds,
}: {
  artistId: string;
  evidenceCollections: readonly ProductVariableEvidenceCollectionResult[];
  results: readonly ProductVariableReadModelResult[];
  selectedVariableIds: readonly ProductVariableId[];
}) {

  return (
    <section
      id="variable-chart"
      aria-labelledby="artist-product-variable-heading"
      className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            Variable
          </p>
          <h2
            id="artist-product-variable-heading"
            className="mt-2 text-2xl font-black"
          >
            변수
          </h2>
          <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
            변수별 Product 상태를 그대로 표시합니다. Real Production 변수는
            관측값과 Stored Evidence를 사용하고, 나머지 변수는 미리보기 상태를
            유지합니다. 소스에 없는 변화량이나 방향은 계산하지 않습니다.
          </p>
        </div>
        <span className="w-fit rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-100">
          선택 {selectedVariableIds.length}/4
        </span>
      </div>

      <nav aria-label="Product 변수 선택" className="mt-5 flex flex-wrap gap-2">
        {PRODUCT_VARIABLE_DEFINITIONS.map((definition) => {
          const active = selectedVariableIds.includes(definition.variableId);
          const nextIds = toggleVariable(
            selectedVariableIds,
            definition.variableId,
          );
          const disabledAdd = !active && selectedVariableIds.length >= 4;

          return (
            <Link
              key={definition.variableId}
              href={buildVariableHref(artistId, nextIds)}
              aria-disabled={disabledAdd}
              className={
                active
                  ? 'rounded-full border border-cyan-400 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800 dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-100'
                  : disabledAdd
                    ? 'rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-black text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                    : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
              }
            >
              {active ? '✓ ' : ''}
              {definition.displayName}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {results.map((result, resultIndex) => {
          const presentation = getArtistVariablePresentation(result);

          if (result.status === 'data-issue') {
            return (
              <article
                key={`data-issue-${resultIndex}`}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/30 dark:bg-amber-400/10"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                  Variable
                </p>
                <p className="mt-3 text-lg font-black text-amber-900 dark:text-amber-100">
                  {presentation.valueText}
                </p>
              </article>
            );
          }

          const { model } = result;
          const observationPresentation = getProductObservationTimePresentation(
            model.observationTime,
          );
          const evidenceCollection = evidenceCollections.find(
            (collection) =>
              collection.status === 'ok' &&
              collection.variableId === model.identity.variableId,
          );

          return (
            <article
              key={model.identity.variableId}
              className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">
                    {model.definition.displayName}
                  </h3>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
                    {model.definition.description}
                  </p>
                </div>
                {model.dataOrigin === 'observed'
                  && model.presentation === 'standard'
                  && model.publication === 'production' ? (
                    <span className="w-fit shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
                      Real · Production
                    </span>
                  ) : presentation.showPreviewBadge ? (
                    <span className="w-fit shrink-0 rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-200">
                      미리보기
                    </span>
                  ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 dark:bg-slate-950">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    현재 값
                  </p>
                  <p className="mt-2 break-words font-mono text-2xl font-black text-slate-950 dark:text-white">
                    {presentation.valueText}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 dark:bg-slate-950">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {observationPresentation.label}
                  </p>
                  <p className="mt-2 font-mono text-sm font-black text-slate-950 dark:text-white">
                    {observationPresentation.value}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 dark:bg-slate-950">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    데이터 기준
                  </p>
                  <p className="mt-2 font-mono text-sm font-black text-slate-950 dark:text-white">
                    {model.sourceMetadata.sourceTimeLabel ?? '확인 불가'}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                관련 지표:{' '}
                {getMetricLabels(model.definition.relatedSourceMetricKeys)}
              </p>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <table className="min-w-max border-collapse text-left text-xs">
                  <caption className="px-4 py-3 text-left font-black text-slate-700 dark:text-slate-200">
                    Product 시계열
                  </caption>
                  <tbody>
                    <tr>
                      {model.series.map((point) => (
                        <th
                          key={point.sourceTimeLabel}
                          scope="col"
                          className="border-t border-slate-200 px-3 py-2 font-mono font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400"
                        >
                          {point.sourceTimeLabel}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {model.series.map((point) => (
                        <td
                          key={point.sourceTimeLabel}
                          className="border-t border-slate-200 px-3 py-3 font-mono font-black text-slate-950 dark:border-slate-800 dark:text-white"
                        >
                          {formatProductVariableFact(point.fact)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {model.evidenceTrace.kind
                === 'naver-news-issue-point-stored-evidence' ? (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-100">
                        Stored Evidence trace
                      </h4>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-slate-950 dark:text-emerald-200">
                        {model.evidenceTrace.currentWindow === null
                          ? '현재 8시간 window · 확인 불가'
                          : `current 8h · ${model.evidenceTrace.currentWindow.slotEvidence.length} jobs`}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-bold leading-5 text-emerald-800 dark:text-emerald-200">
                      원천 Evidence는 Shadow 수집 계보를 유지하며, Product 변수만
                      Production으로 공개됩니다. 각 job에서 canonical observation과
                      raw evidence lineage를 확인할 수 있습니다.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {model.evidenceTrace.currentWindow?.slotEvidence.map((slot) => (
                        <Link
                          key={slot.jobId}
                          href={`/artists/${artistId}/evidence/${slot.jobId}`}
                          className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 font-mono text-xs font-black text-emerald-800 hover:border-emerald-500 dark:bg-slate-950 dark:text-emerald-200"
                        >
                          {slot.slotStart} · {slot.jobId.slice(0, 12)}…
                        </Link>
                      ))}
                    </div>
                    <p className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      prior windows {model.evidenceTrace.eligiblePriorWindows.length} ·
                      traced jobs {model.evidenceTrace.storedEvidenceJobIds.length}
                    </p>
                  </div>
                ) : (
                  <ProductEvidenceList
                    collection={
                      evidenceCollection ?? {
                        status: 'data-issue',
                        artistId,
                        rawVariableId: model.identity.variableId,
                        issues: [{ code: 'source-state-conflict' }],
                      }
                    }
                  />
                )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
