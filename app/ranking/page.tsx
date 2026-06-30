import {
  artistIndexChartProfiles,
  calculateSixMonthDelta,
  getIndexTrendBand,
  getLastSixMonthHistory,
} from '../data/v4/charts/artistIndexChartData';
import RankingExplorer, { type RankingExplorerRow } from './RankingExplorer';

function getLatestPoint(profile: (typeof artistIndexChartProfiles)[number]) {
  return profile.history[profile.history.length - 1];
}

function createRankingRows(): RankingExplorerRow[] {
  return artistIndexChartProfiles
    .map((profile) => {
      const latest = getLatestPoint(profile);
      const sixMonthHistory = getLastSixMonthHistory(profile);

      return {
        artistId: profile.artistId,
        artistName: profile.artistName,
        ticker: profile.ticker,
        groupType: profile.groupType,
        coverageStatus: profile.coverageStatus,
        currentFandexPoint: latest?.fandexPoint ?? 0,
        sixMonthDelta: calculateSixMonthDelta(sixMonthHistory),
        trendBand: getIndexTrendBand(sixMonthHistory),
        confidenceLevel: latest?.confidenceLevel ?? 'low',
        lastUpdated: profile.lastUpdated,
      };
    })
    .sort((a, b) => b.currentFandexPoint - a.currentFandexPoint);
}

export default function RankingPage() {
  const rows = createRankingRows();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600">
            FANDEX 랭킹
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            K-pop 아티스트 랭킹 탐색
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-600 md:text-base">
            지금 FANDEX에서 강하게 잡히는 아티스트를 볼 수 있습니다.
            검색하거나 필터를 바꿔서 원하는 아티스트를 찾아보세요.
          </p>
          <p className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800">
            이 순위는 공식 K-pop 순위가 아니라 FANDEX 내부 리서치 지수입니다.
            금융상품/투자정보가 아닙니다.
          </p>
        </section>

        <RankingExplorer rows={rows} />
      </section>
    </main>
  );
}
