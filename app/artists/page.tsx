import Link from 'next/link';
import {
  artistIndexChartProfiles,
  calculateSixMonthDelta,
  getIndexTrendBand,
  getLastSixMonthHistory,
  type ArtistIndexCoverageStatus,
  type ArtistIndexGroupType,
  type ArtistIndexTrendBand,
} from '../data/v4/charts/artistIndexChartData';

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

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}pt`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(
    Math.round(value),
  )}pt`;
}

function getLatestPoint(profile: (typeof artistIndexChartProfiles)[number]) {
  return profile.history[profile.history.length - 1];
}

export default function ArtistsPage() {
  const profiles = [...artistIndexChartProfiles].sort((a, b) => {
    const aLatest = getLatestPoint(a)?.fandexPoint ?? 0;
    const bLatest = getLatestPoint(b)?.fandexPoint ?? 0;
    return bLatest - aLatest;
  });

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
              FANDEX 등록/추적 아티스트 기준으로 최신 FANDEX 주가와 주가형
              지수 흐름을 확인할 수 있습니다. 표에서 상세 페이지로 이동하거나
              바로 비교 대상에 추가할 수 있습니다.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800">
            FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기 위한
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

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">아티스트 표</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                아티스트명, ticker, 구분을 분리해 보여주고 행 hover만 사용합니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
              {profiles.length}팀
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs font-black text-slate-500">
                  <th className="border-b border-slate-200 p-3">아티스트</th>
                  <th className="border-b border-slate-200 p-3">ticker</th>
                  <th className="border-b border-slate-200 p-3">구분</th>
                  <th className="border-b border-slate-200 p-3">커버리지</th>
                  <th className="border-b border-slate-200 p-3">현재 FANDEX 주가</th>
                  <th className="border-b border-slate-200 p-3">최근 6개월 변화</th>
                  <th className="border-b border-slate-200 p-3">흐름</th>
                  <th className="border-b border-slate-200 p-3">데이터 상태</th>
                  <th className="border-b border-slate-200 p-3">마지막 업데이트</th>
                  <th className="border-b border-slate-200 p-3">상세</th>
                  <th className="border-b border-slate-200 p-3">비교</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => {
                  const latest = getLatestPoint(profile);
                  const sixMonthHistory = getLastSixMonthHistory(profile);
                  const trendBand = getIndexTrendBand(sixMonthHistory);
                  const delta = calculateSixMonthDelta(sixMonthHistory);

                  return (
                    <tr
                      key={profile.artistId}
                      className="font-bold text-slate-700 transition hover:bg-cyan-50/60"
                    >
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
                        {formatDelta(delta)}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        {trendBandLabels[trendBand]}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        {latest?.dataStatus ?? '-'}
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
              FANDEX 주가는 금융상품/투자정보가 아닙니다.
            </li>
          </ul>
        </section>
      </section>
    </main>
  );
}
