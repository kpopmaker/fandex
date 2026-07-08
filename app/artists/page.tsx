import Link from 'next/link';
import {
  artistIndexChartProfiles,
  calculateSixMonthDelta,
  getIndexTrendBand,
  getLastSixMonthHistory,
  getStrongestVariables,
  type ArtistIndexCoverageStatus,
  type ArtistIndexDataStatus,
  type ArtistIndexGroupType,
  type ArtistIndexTrendBand,
} from '../data/v4/charts/artistIndexChartData';
import {
  getSourceCandidateArtistSummaries,
  getSourceCandidateMarketSummary,
} from '../data/v4/sources';

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

const trendBandLabels: Record<ArtistIndexTrendBand, string> = {
  rising: '상승 흐름',
  stable: '안정 흐름',
  falling: '하락 흐름',
  volatile: '변동성 흐름',
  insufficient_data: '데이터 부족',
};

const dataStatusLabels: Record<ArtistIndexDataStatus, string> = {
  editorial_seed: '에디토리얼 시드',
  verified_manual: '수동 검증',
  partial_public_signal: '일부 공개 신호',
  preview_only: '미리보기',
};

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}pt`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(
    Math.round(value),
  )}pt`;
}

function formatDeltaRate(history: Array<{ fandexPoint: number }>) {
  const first = history[0];
  const latest = history[history.length - 1];

  if (!first || !latest || first.fandexPoint === 0) {
    return '0.0%';
  }

  const rate = ((latest.fandexPoint - first.fandexPoint) / first.fandexPoint) * 100;
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`;
}

function formatPreviewScore(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatConfidenceRatio(value: number) {
  return (value / 100).toFixed(2);
}

function formatSourceDate(value: string | null) {
  if (!value) {
    return '없음';
  }

  return value.slice(0, 10);
}

function getLatestPoint(profile: (typeof artistIndexChartProfiles)[number]) {
  return profile.history[profile.history.length - 1];
}

function getMarketRows(profiles: typeof artistIndexChartProfiles) {
  return profiles.map((profile) => {
    const latest = getLatestPoint(profile);
    const sixMonthHistory = getLastSixMonthHistory(profile);
    const sixMonthDelta = calculateSixMonthDelta(sixMonthHistory);

    return {
      profile,
      latest,
      sixMonthHistory,
      sixMonthDelta,
      sixMonthDeltaRate: formatDeltaRate(sixMonthHistory),
      trendBand: getIndexTrendBand(sixMonthHistory),
      strongestVariable: getStrongestVariables(profile, 1)[0] ?? null,
    };
  });
}

function getMarketSnapshot(rows: ReturnType<typeof getMarketRows>) {
  const totalMarketPoint = rows.reduce(
    (total, row) => total + (row.latest?.fandexPoint ?? 0),
    0,
  );
  const topArtist = rows[0] ?? null;
  const topMover = [...rows].sort(
    (left, right) => right.sixMonthDelta - left.sixMonthDelta,
  )[0] ?? null;
  const risingCount = rows.filter((row) => row.trendBand === 'rising').length;
  const trackedCount = rows.filter(
    (row) => row.profile.coverageStatus === 'tracked',
  ).length;

  return {
    totalMarketPoint,
    topArtist,
    topMover,
    risingCount,
    trackedCount,
  };
}

export default function ArtistsPage() {
  const profiles = [...artistIndexChartProfiles].sort((a, b) => {
    const aLatest = getLatestPoint(a)?.fandexPoint ?? 0;
    const bLatest = getLatestPoint(b)?.fandexPoint ?? 0;
    return bLatest - aLatest;
  });
  const marketRows = getMarketRows(profiles);
  const marketSnapshot = getMarketSnapshot(marketRows);
  const sourceCandidateMarketSummary = getSourceCandidateMarketSummary();
  const sourceCandidateSummariesByArtist = new Map(
    getSourceCandidateArtistSummaries().map((summary) => [
      summary.artistId,
      summary,
    ]),
  );
  const topSourceCandidateArtist = profiles.find(
    (profile) =>
      profile.artistId === sourceCandidateMarketSummary.topArtistId,
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-bold text-cyan-700 hover:text-cyan-600"
            >
              FANDEX 홈
            </Link>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.24em] text-cyan-600">
              아티스트 목록
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              FANDEX 등록/추적 아티스트
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-600 md:text-base">
              FANDEX 등록/추적 아티스트 기준으로 최신 FANDEX 포인트와 포인트형
              지수 흐름을 확인할 수 있습니다. 표에서 상세 페이지로 이동하거나
              바로 비교 대상에 추가할 수 있습니다.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800">
            FANDEX 포인트는 K-pop 아티스트 활동성과 반응 지표를 해석하기 위한
            엔터테인먼트 리서치 지수이며, 금융상품/투자정보가 아닙니다.
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/coverage"
                className="rounded-full bg-white px-4 py-2 text-xs font-black text-cyan-800 shadow-sm hover:bg-cyan-100"
              >
                커버리지 보기
              </Link>
              <Link
                href="/compare"
                className="rounded-full bg-white px-4 py-2 text-xs font-black text-cyan-800 shadow-sm hover:bg-cyan-100"
              >
                여러 아티스트 비교
              </Link>
            </div>
          </div>
        </div>

        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                market overview
              </p>
              <h2 className="mt-2 text-2xl font-black">FANDEX 아티스트 마켓</h2>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                등록/추적 아티스트를 주식 종목표처럼 훑기 위한 요약입니다.
                현재 값은 기존 preview seed를 화면에서 집계한 read-only 정보입니다.
                source 후보는 fixture 기반 read-only preview이며, 현재 FANDEX
                점수 계산에는 반영되지 않습니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700">
              {profiles.length}팀 / {marketSnapshot.trackedCount}팀 지속 추적
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <MarketMetric
              label="총 FANDEX 시가총점형 합계"
              value={formatPoint(marketSnapshot.totalMarketPoint)}
              note="등록/추적 아티스트 최신 포인트 합계"
            />
            <MarketMetric
              label="현재 1위"
              value={marketSnapshot.topArtist?.profile.artistName ?? '-'}
              note={
                marketSnapshot.topArtist
                  ? `${marketSnapshot.topArtist.profile.ticker} / ${formatPoint(
                      marketSnapshot.topArtist.latest?.fandexPoint ?? 0,
                    )}`
                  : '데이터 없음'
              }
            />
            <MarketMetric
              label="6개월 상승폭 1위"
              value={marketSnapshot.topMover?.profile.artistName ?? '-'}
              note={
                marketSnapshot.topMover
                  ? `${formatDelta(marketSnapshot.topMover.sixMonthDelta)} / ${marketSnapshot.topMover.sixMonthDeltaRate}`
                  : '데이터 없음'
              }
            />
            <MarketMetric
              label="상승 흐름 종목"
              value={`${marketSnapshot.risingCount}팀`}
              note="최근 6개월 trend band 기준"
            />
            <MarketMetric
              label="source 후보 연결"
              value={`${sourceCandidateMarketSummary.artistCount}팀`}
              note={`${sourceCandidateMarketSummary.candidateCount} candidates / ${sourceCandidateMarketSummary.sourceItemCount} sources`}
            />
            <MarketMetric
              label="평균 후보 품질"
              value={formatPreviewScore(
                sourceCandidateMarketSummary.averageCandidateScore,
              )}
              note={`confidence ${formatConfidenceRatio(
                sourceCandidateMarketSummary.averageConfidenceScore,
              )} / 최다 ${topSourceCandidateArtist?.artistName ?? '없음'}`}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">아티스트 마켓 테이블</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                ticker, 현재 FANDEX, 6개월 변화율, 주요 기여 변수까지 한 번에 봅니다.
                source 후보는 fixture 기반 read-only preview이며, 현재 FANDEX
                점수 계산에는 반영되지 않습니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
              {profiles.length}팀
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1480px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs font-black text-slate-500">
                  <th className="border-b border-slate-200 p-3">순위</th>
                  <th className="border-b border-slate-200 p-3">아티스트</th>
                  <th className="border-b border-slate-200 p-3">ticker</th>
                  <th className="border-b border-slate-200 p-3">구분</th>
                  <th className="border-b border-slate-200 p-3">커버리지</th>
                  <th className="border-b border-slate-200 p-3">현재 FANDEX</th>
                  <th className="border-b border-slate-200 p-3">6개월 변화</th>
                  <th className="border-b border-slate-200 p-3">변화율</th>
                  <th className="border-b border-slate-200 p-3">흐름</th>
                  <th className="border-b border-slate-200 p-3">주요 기여 변수</th>
                  <th className="border-b border-slate-200 p-3">source 후보</th>
                  <th className="border-b border-slate-200 p-3">candidate 평균</th>
                  <th className="border-b border-slate-200 p-3">confidence</th>
                  <th className="border-b border-slate-200 p-3">source 최신일</th>
                  <th className="border-b border-slate-200 p-3">데이터 상태</th>
                  <th className="border-b border-slate-200 p-3">마지막 업데이트</th>
                  <th className="border-b border-slate-200 p-3">상세</th>
                  <th className="border-b border-slate-200 p-3">비교</th>
                </tr>
              </thead>
              <tbody>
                {marketRows.map((row, index) => {
                  const { profile, latest, strongestVariable } = row;
                  const sourceCandidateSummary =
                    sourceCandidateSummariesByArtist.get(profile.artistId);

                  return (
                    <tr
                      key={profile.artistId}
                      className="font-bold text-slate-700 transition hover:bg-cyan-50/60"
                    >
                      <td className="border-b border-slate-100 p-3 font-mono text-slate-500">
                        {index + 1}
                      </td>
                      <td className="border-b border-slate-100 p-3 font-black text-slate-950">
                        {profile.artistName}
                      </td>
                      <td className="border-b border-slate-100 p-3 font-mono text-cyan-700">
                        {profile.ticker}
                      </td>
                      <td className="border-b border-slate-100 p-3 text-slate-700">
                        {groupTypeLabels[profile.groupType]}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                          {coverageStatusLabels[profile.coverageStatus]}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 p-3 font-mono">
                        {formatPoint(latest?.fandexPoint ?? 0)}
                      </td>
                      <td className="border-b border-slate-100 p-3 font-mono">
                        {formatDelta(row.sixMonthDelta)}
                      </td>
                      <td className="border-b border-slate-100 p-3 font-mono">
                        {row.sixMonthDeltaRate}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        {trendBandLabels[row.trendBand]}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        {strongestVariable ? (
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                            {strongestVariable.displayName} {formatPoint(strongestVariable.latestPoint)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        {sourceCandidateSummary
                          ? `${sourceCandidateSummary.candidateCount} candidates / ${sourceCandidateSummary.sourceItemCount} sources`
                          : '없음'}
                      </td>
                      <td className="border-b border-slate-100 p-3 font-mono">
                        {sourceCandidateSummary
                          ? formatPreviewScore(
                              sourceCandidateSummary.averageCandidateScore,
                            )
                          : '-'}
                      </td>
                      <td className="border-b border-slate-100 p-3 font-mono">
                        {sourceCandidateSummary
                          ? formatConfidenceRatio(
                              sourceCandidateSummary.averageConfidenceScore,
                            )
                          : '-'}
                      </td>
                      <td className="border-b border-slate-100 p-3 font-mono">
                        {sourceCandidateSummary
                          ? formatSourceDate(
                              sourceCandidateSummary.latestPublishedAt,
                            )
                          : '없음'}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        {latest ? dataStatusLabels[latest.dataStatus] : '-'}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        {profile.lastUpdated}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        <Link
                          href={`/artists/${profile.artistId}`}
                          className="font-black text-cyan-700 hover:text-cyan-500"
                        >
                          상세
                        </Link>
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        <Link
                          href={`/compare?artists=${profile.artistId}`}
                          className="font-black text-cyan-700 hover:text-cyan-500"
                        >
                          비교
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">데이터 안내</h2>
          <ul className="mt-5 grid gap-3 text-sm font-bold leading-7 text-slate-600 md:grid-cols-2">
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              모든 K-pop 아티스트를 대표하지 않습니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              현재 차트는 에디토리얼 시드 / 미리보기 데이터 기반이며,
              실제 공개 지표 검증과 자동 수집은 후속 단계입니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              FANDEX 포인트는 금융상품/투자정보가 아닙니다.
            </li>
          </ul>
        </section>
      </section>
    </main>
  );
}

function MarketMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-xl font-black text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{note}</p>
    </article>
  );
}
