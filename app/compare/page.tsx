import Link from 'next/link';
import {
  artistIndexChartProfiles,
  artistStockVariableKeys,
  getAvailableStockVariables,
  getCompareArtistProfiles,
  getCompareChartSeries,
  getCompareCoverageSummary,
  getCompareSummaryRows,
  getCompareVariableSeries,
  parseCompareArtistIds,
  type ArtistIndexChartProfile,
  type ArtistIndexCoverageStatus,
  type ArtistIndexGroupType,
  type ArtistIndexTrendBand,
  type ArtistStockVariableKey,
  type CompareArtistChartSeries,
  type CompareChartPoint,
  type CompareSummaryRow,
  type CompareVariableChartSeries,
} from '../data/v4/charts/artistIndexChartData';

type ComparePageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

const defaultSelectedVariables: ArtistStockVariableKey[] = [
  'snsFandomPoint',
  'brandFitPoint',
  'comebackActivityPoint',
];

const chartColors = ['#0891b2', '#7c3aed', '#16a34a', '#f97316', '#db2777'];

const groupTypeLabels: Record<ArtistIndexGroupType, string> = {
  girl_group: '걸그룹',
  boy_group: '보이그룹',
  solo: '솔로',
  mixed: '혼성',
  unit: '유닛',
};

const coverageStatusLabels: Record<ArtistIndexCoverageStatus, string> = {
  tracked: '지속 추적',
  partial: '일부 반영',
  preview: '미리보기',
};

const coverageStatusCopy: Record<ArtistIndexCoverageStatus, string> = {
  tracked: '지속 추적',
  partial: '일부 반영',
  preview: '미리보기',
};

const trendBandLabels: Record<ArtistIndexTrendBand, string> = {
  rising: '우상향 흐름',
  stable: '안정 흐름',
  falling: '조정 흐름',
  volatile: '변동성 흐름',
  insufficient_data: '데이터 보강 필요',
};

const disclaimer =
  'FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기 위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가 아닙니다.';

function isStockVariableKey(value: string): value is ArtistStockVariableKey {
  return artistStockVariableKeys.includes(value as ArtistStockVariableKey);
}

function parseSelectedCompareArtists(params: {
  [key: string]: string | string[] | undefined;
}) {
  return parseCompareArtistIds(params.artists);
}

function parseSelectedCompareVariables(params: {
  [key: string]: string | string[] | undefined;
}): ArtistStockVariableKey[] {
  const rawVariables = params.variables;
  const rawValue = Array.isArray(rawVariables) ? rawVariables[0] : rawVariables;

  if (!rawValue) {
    return defaultSelectedVariables;
  }

  const selectedVariables: ArtistStockVariableKey[] = [];

  rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (
        isStockVariableKey(value) &&
        !selectedVariables.includes(value) &&
        selectedVariables.length < 4
      ) {
        selectedVariables.push(value);
      }
    });

  return selectedVariables.length > 0
    ? selectedVariables
    : defaultSelectedVariables;
}

function buildCompareHref(
  selectedArtists: string[],
  selectedVariables: ArtistStockVariableKey[],
) {
  const params = new URLSearchParams();

  params.set('artists', selectedArtists.join(','));
  params.set('variables', selectedVariables.join(','));

  return `/compare?${params.toString()}`;
}

function toggleCompareArtistSelection(
  currentArtists: string[],
  targetArtist: string,
) {
  if (currentArtists.includes(targetArtist)) {
    return currentArtists.length <= 2
      ? currentArtists
      : currentArtists.filter((artistId) => artistId !== targetArtist);
  }

  if (currentArtists.length >= 5) {
    return currentArtists;
  }

  return [...currentArtists, targetArtist];
}

function toggleCompareVariableSelection(
  currentVariables: ArtistStockVariableKey[],
  targetVariable: ArtistStockVariableKey,
) {
  if (currentVariables.includes(targetVariable)) {
    return currentVariables.length <= 1
      ? currentVariables
      : currentVariables.filter((variableKey) => variableKey !== targetVariable);
  }

  if (currentVariables.length >= 4) {
    return currentVariables;
  }

  return [...currentVariables, targetVariable];
}

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}pt`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(
    Math.round(value),
  )}pt`;
}

function getLatestPoint(profile: ArtistIndexChartProfile) {
  return profile.history[profile.history.length - 1];
}

function groupProfilesByCoverage(profiles: ArtistIndexChartProfile[]) {
  return {
    tracked: profiles.filter((profile) => profile.coverageStatus === 'tracked'),
    partial: profiles.filter((profile) => profile.coverageStatus === 'partial'),
    preview: profiles.filter((profile) => profile.coverageStatus === 'preview'),
  };
}

function getMinMax(series: CompareChartPoint[][]) {
  const values = series.flat().map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.12, 10);

  return {
    minValue: min - padding,
    maxValue: max + padding,
  };
}

function createLinePath(
  points: CompareChartPoint[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
) {
  const paddingX = 38;
  const paddingY = 24;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const range = maxValue - minValue || 1;

  return points
    .map((point, index) => {
      const x = paddingX + (index / Math.max(points.length - 1, 1)) * plotWidth;
      const y = paddingY + ((maxValue - point.value) / range) * plotHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function getCompareInterpretation(
  rows: CompareSummaryRow[],
  variableSeries: CompareVariableChartSeries[],
) {
  const highestCurrent = rows.reduce((best, row) =>
    row.currentFandexPoint > best.currentFandexPoint ? row : best,
  );
  const largestMove = rows.reduce((best, row) =>
    Math.abs(row.sixMonthDelta) > Math.abs(best.sixMonthDelta) ? row : best,
  );
  const variableHighlights = variableSeries.map((series) => {
    const strongest = series.artists.reduce((best, artist) =>
      artist.latestPoint > best.latestPoint ? artist : best,
    );

    return `${series.displayName}: ${strongest.artistName}`;
  });

  return {
    highestCurrent,
    largestMove,
    variableHighlights,
  };
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = (await searchParams) ?? {};
  const selectedArtistIds = parseSelectedCompareArtists(params);
  const selectedVariables = parseSelectedCompareVariables(params);
  const selectedProfiles = getCompareArtistProfiles(selectedArtistIds);
  const safeSelectedArtistIds = selectedProfiles.map((profile) => profile.artistId);
  const compareChartSeries = getCompareChartSeries(selectedProfiles);
  const variableSeries = selectedVariables.map((variableKey) =>
    getCompareVariableSeries(selectedProfiles, variableKey),
  );
  const summaryRows = getCompareSummaryRows(selectedProfiles);
  const coverageSummary = getCompareCoverageSummary(selectedProfiles);
  const groupedProfiles = groupProfilesByCoverage(artistIndexChartProfiles);
  const interpretation = getCompareInterpretation(summaryRows, variableSeries);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600">
                FANDEX 아티스트 비교
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                여러 아티스트의 주가 흐름 비교
              </h1>
              <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300 md:text-base">
                2~5명의 아티스트를 선택해 최근 6개월 FANDEX 주가 흐름과
                산출 변수별 변화를 비교합니다.
              </p>
              <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800">
                {disclaimer}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-96">
              <MetricCard
                label="선택 아티스트"
                value={`${selectedProfiles.length}/5`}
              />
              <MetricCard
                label="선택 변수"
                value={`${selectedVariables.length}/4`}
              />
              <MetricCard
                label="커버리지"
                value={`지속 추적 ${coverageSummary.trackedArtistCount} / 일부 반영 ${coverageSummary.partialArtistCount} / 미리보기 ${coverageSummary.previewArtistCount}`}
              />
              <MetricCard label="마지막 업데이트" value={coverageSummary.lastUpdated} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                  아티스트 선택
                </p>
                <h2 className="mt-2 text-2xl font-black">아티스트 선택</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                  FANDEX 등록/추적 아티스트 기준으로 최소 2명, 최대 5명까지
                  비교합니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                5명 선택 상태에서는 추가 선택이 잠깁니다.
              </span>
            </div>
            <div className="mt-5 grid gap-5">
              <ArtistSelectorGroup
                profiles={groupedProfiles.tracked}
                selectedArtistIds={safeSelectedArtistIds}
                selectedVariables={selectedVariables}
                title="지속 추적"
              />
              <ArtistSelectorGroup
                compact
                profiles={groupedProfiles.partial}
                selectedArtistIds={safeSelectedArtistIds}
                selectedVariables={selectedVariables}
                title="일부 반영"
              />
              <ArtistSelectorGroup
                compact
                profiles={groupedProfiles.preview}
                selectedArtistIds={safeSelectedArtistIds}
                selectedVariables={selectedVariables}
                title="미리보기"
              />
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                    산출 변수 선택
                  </p>
                  <h2 className="mt-2 text-2xl font-black">산출 변수 선택</h2>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                    비교하고 싶은 산출 변수를 선택하세요. 1개부터 4개까지
                    선택할 수 있고, 선택한 변수는 아래에서 변수별 비교
                    그래프로 따로 표시됩니다.
                  </p>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                    전체 FANDEX 주가와 변수별 그래프는 같은 값이 아니며,
                    변수 그래프는 산출에 영향을 준 개별 흐름을 보여줍니다.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                  선택 {selectedVariables.length}/4
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {getAvailableStockVariables().map((variable) => {
                  const active = selectedVariables.includes(variable.variableKey);
                  const disabledAdd = !active && selectedVariables.length >= 4;
                  const nextVariables = toggleCompareVariableSelection(
                    selectedVariables,
                    variable.variableKey,
                  );

                  return (
                    <Link
                      key={variable.variableKey}
                      href={buildCompareHref(safeSelectedArtistIds, nextVariables)}
                      aria-disabled={disabledAdd}
                      className={
                        active
                          ? 'rounded-full border border-cyan-500 bg-white px-4 py-2 text-sm font-black text-cyan-800 shadow-[inset_0_-3px_0_rgba(8,145,178,0.25)]'
                          : disabledAdd
                            ? 'pointer-events-none rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-black text-slate-400'
                            : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700'
                      }
                    >
                      {variable.displayName}
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                비교 대상
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedProfiles.map((profile, index) => (
                  <span
                    key={profile.artistId}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: chartColors[index % chartColors.length] }}
                    />
                    {profile.artistName === profile.ticker
                      ? profile.artistName
                      : `${profile.artistName} · ${profile.ticker}`}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
                선택 변경은 URL query param에 반영되며, 유효하지 않은
                artistId와 variableKey는 제거됩니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/methodology"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                >
                  산출방식 보기
                </Link>
                <Link
                  href="/coverage"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                >
                  커버리지 보기
                </Link>
              </div>
            </section>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              6개월 FANDEX 주가 비교 차트
            </p>
            <h2 className="mt-2 text-2xl font-black">주가형 지수 흐름 비교</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              최근 6개 시점 기준 FANDEX 주가 흐름을 비교합니다. 동일 기간 내
              방향성, 변동폭, 현재 위치를 함께 확인할 수 있습니다.
            </p>
          </div>
          <CompareLineChart
            ariaLabel="선택 아티스트 최근 6개 시점 FANDEX 주가 비교 차트"
            series={compareChartSeries}
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {compareChartSeries.map((series) => (
              <MetricCard
                key={series.artistId}
                label={`${series.ticker} / ${trendBandLabels[series.trendBand]}`}
                value={`${formatPoint(series.latestPoint)} (${formatDelta(
                  series.sixMonthDelta,
                )})`}
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              변수별 비교
            </p>
            <h2 className="mt-2 text-2xl font-black">선택 변수 그래프</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              선택 변수 그래프는 전체 FANDEX 주가 산출에 영향을 준 개별
              변수의 흐름을 보여줍니다. 전체 주가와 동일한 값이 아니라
              변수별 raw/weighted point 흐름입니다.
            </p>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            {variableSeries.map((series) => (
              <VariableCompareChart key={series.variableKey} series={series} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                비교 요약
              </p>
              <h2 className="mt-2 text-2xl font-black">비교 요약</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              FANDEX 등록/추적 아티스트 기준
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <th className="border-b border-slate-200 p-3">아티스트</th>
                  <th className="border-b border-slate-200 p-3">ticker</th>
                  <th className="border-b border-slate-200 p-3">그룹</th>
                  <th className="border-b border-slate-200 p-3">커버리지</th>
                  <th className="border-b border-slate-200 p-3">현재 FANDEX 주가</th>
                  <th className="border-b border-slate-200 p-3">6개월 변화</th>
                  <th className="border-b border-slate-200 p-3">흐름 구간</th>
                  <th className="border-b border-slate-200 p-3">가장 강한 변수</th>
                  <th className="border-b border-slate-200 p-3">데이터 상태</th>
                  <th className="border-b border-slate-200 p-3">신뢰도</th>
                  <th className="border-b border-slate-200 p-3">상세</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.artistId} className="font-bold text-slate-700 dark:text-slate-300">
                    <td className="border-b border-slate-100 p-3 font-black text-slate-950 dark:border-slate-800 dark:text-white">
                      {row.artistName}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {row.ticker}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {groupTypeLabels[row.groupType]}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {coverageStatusLabels[row.coverageStatus]}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {formatPoint(row.currentFandexPoint)}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {formatDelta(row.sixMonthDelta)}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {trendBandLabels[row.trendBand]}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {row.strongestVariable?.displayName ?? '-'}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {row.dataStatus}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {row.confidenceLevel}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      <Link
                        href={`/artists/${row.artistId}`}
                        className="text-cyan-700 hover:text-cyan-500 dark:text-cyan-300"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              비교 해석
            </p>
            <h2 className="mt-2 text-2xl font-black">비교 해석</h2>
            <div className="mt-5 grid gap-3">
              <InterpretationCard
                label="현재 FANDEX 주가"
                value={interpretation.highestCurrent.artistName}
                note="FANDEX 등록/추적 데이터 기준으로 현재 값이 가장 높습니다."
              />
              <InterpretationCard
                label="6개월 변화폭"
                value={interpretation.largestMove.artistName}
                note={`최근 6개 시점 기준 변화폭은 ${formatDelta(
                  interpretation.largestMove.sixMonthDelta,
                )}입니다.`}
              />
              <InterpretationCard
                label="선택 변수 기준"
                value={interpretation.variableHighlights.join(' / ')}
                note="선택한 변수별 latest point 기준으로 두드러지는 아티스트입니다."
              />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              데이터 안내
            </p>
            <h2 className="mt-2 text-2xl font-black">데이터 기준 안내</h2>
            <ul className="mt-5 grid gap-3 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                모든 K-pop 아티스트를 대표하지 않습니다.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                현재 차트는 에디토리얼 시드 / 미리보기 데이터 기반이며,
                실제 공개 지표 검증과 자동 수집은 후속 단계입니다.
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                FANDEX 주가는 금융상품/투자정보가 아닙니다.
              </li>
            </ul>
          </section>
        </section>
      </section>
    </main>
  );
}

function ArtistSelectorGroup({
  compact = false,
  profiles,
  selectedArtistIds,
  selectedVariables,
  title,
}: {
  compact?: boolean;
  profiles: ArtistIndexChartProfile[];
  selectedArtistIds: string[];
  selectedVariables: ArtistStockVariableKey[];
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
          {title}
        </h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm dark:bg-slate-950">
          {profiles.length}
        </span>
      </div>
      <div
        className={
          compact
            ? 'mt-4 grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2'
            : 'mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2'
        }
      >
        {profiles.map((profile) => {
          const active = selectedArtistIds.includes(profile.artistId);
          const disabledAdd = !active && selectedArtistIds.length >= 5;
          const nextArtists = toggleCompareArtistSelection(
            selectedArtistIds,
            profile.artistId,
          );
          const latest = getLatestPoint(profile);

          return (
            <Link
              key={profile.artistId}
              href={buildCompareHref(nextArtists, selectedVariables)}
              aria-disabled={disabledAdd}
              className={
                active
                  ? 'rounded-xl border border-cyan-500 bg-white p-3 shadow-sm shadow-cyan-100 ring-2 ring-cyan-100'
                  : disabledAdd
                    ? 'pointer-events-none rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-400 dark:border-slate-800 dark:bg-slate-900'
                    : 'rounded-xl border border-slate-200 bg-white p-3 hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-950'
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    {profile.artistName}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {profile.ticker} / {groupTypeLabels[profile.groupType]}
                  </p>
                  <p className="mt-2 font-mono text-xs font-black text-cyan-700 dark:text-cyan-300">
                    {formatPoint(latest?.fandexPoint ?? 0)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-cyan-700 shadow-sm dark:bg-slate-900 dark:text-cyan-300">
                  {active ? '선택됨' : coverageStatusCopy[profile.coverageStatus]}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CompareLineChart({
  ariaLabel,
  series,
}: {
  ariaLabel: string;
  series: CompareArtistChartSeries[];
}) {
  const width = 920;
  const height = 340;
  const { minValue, maxValue } = getMinMax(series.map((item) => item.points));

  return (
    <ChartFrame>
      <ChartLegend
        items={series.map((item, index) => ({
          id: item.artistId,
          label:
            item.artistName === item.ticker
              ? item.artistName
              : `${item.artistName} · ${item.ticker}`,
          color: chartColors[index % chartColors.length],
        }))}
      />
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="h-80 w-full">
        <ChartGrid width={width} height={height} />
        {series.map((item, index) => (
          <path
            key={item.artistId}
            d={createLinePath(item.points, width, height, minValue, maxValue)}
            fill="none"
            stroke={chartColors[index % chartColors.length]}
            strokeLinecap="round"
            strokeWidth="4"
          />
        ))}
        {series.map((item, seriesIndex) =>
          item.points.map((point, pointIndex) => (
            <ChartPoint
              key={`${item.artistId}-${point.date}`}
              color={chartColors[seriesIndex % chartColors.length]}
              height={height}
              index={pointIndex}
              maxValue={maxValue}
              minValue={minValue}
              point={point}
              pointCount={item.points.length}
              width={width}
            />
          )),
        )}
      </svg>
    </ChartFrame>
  );
}

function VariableCompareChart({ series }: { series: CompareVariableChartSeries }) {
  const width = 760;
  const height = 260;
  const { minValue, maxValue } = getMinMax(series.artists.map((item) => item.points));

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">
            {series.displayName}
          </h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            변수별 raw/weighted point 흐름
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300">
          {series.artists.length} artists
        </span>
      </div>
      <ChartLegend
        items={series.artists.map((item, index) => ({
          id: item.artistId,
          label: item.ticker,
          color: chartColors[index % chartColors.length],
        }))}
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${series.displayName} 선택 아티스트 변수별 비교 그래프`}
        className="mt-3 h-64 w-full"
      >
        <ChartGrid width={width} height={height} />
        {series.artists.map((item, index) => (
          <path
            key={item.artistId}
            d={createLinePath(item.points, width, height, minValue, maxValue)}
            fill="none"
            stroke={chartColors[index % chartColors.length]}
            strokeLinecap="round"
            strokeWidth="3.5"
          />
        ))}
        {series.artists.map((item, seriesIndex) =>
          item.points.map((point, pointIndex) => (
            <ChartPoint
              key={`${series.variableKey}-${item.artistId}-${point.date}`}
              color={chartColors[seriesIndex % chartColors.length]}
              height={height}
              index={pointIndex}
              maxValue={maxValue}
              minValue={minValue}
              point={point}
              pointCount={item.points.length}
              width={width}
            />
          )),
        )}
      </svg>
    </article>
  );
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      {children}
    </div>
  );
}

function ChartLegend({
  items,
}: {
  items: Array<{ id: string; label: string; color: string }>;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ChartGrid({ height, width }: { height: number; width: number }) {
  return (
    <>
      {[0, 1, 2, 3].map((line) => {
        const y = 24 + line * ((height - 48) / 3);
        return (
          <line
            key={line}
            x1="38"
            x2={width - 38}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeDasharray="5 5"
            className="text-slate-200 dark:text-slate-700"
          />
        );
      })}
    </>
  );
}

function ChartPoint({
  color,
  height,
  index,
  maxValue,
  minValue,
  point,
  pointCount,
  width,
}: {
  color: string;
  height: number;
  index: number;
  maxValue: number;
  minValue: number;
  point: CompareChartPoint;
  pointCount: number;
  width: number;
}) {
  const paddingX = 38;
  const paddingY = 24;
  const x = paddingX + (index / Math.max(pointCount - 1, 1)) * (width - paddingX * 2);
  const y =
    paddingY +
    ((maxValue - point.value) / (maxValue - minValue || 1)) *
      (height - paddingY * 2);

  return (
    <g>
      <circle cx={x} cy={y} r="4" fill="white" stroke={color} strokeWidth="2.5" />
      <text
        x={x}
        y={height - 7}
        textAnchor="middle"
        className="fill-slate-500 text-[11px] font-bold dark:fill-slate-400"
      >
        {point.date.replace('2026-', '')}
      </text>
    </g>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-sm font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function InterpretationCard({
  label,
  note,
  value,
}: {
  label: string;
  note: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
        {note}
      </p>
    </article>
  );
}
