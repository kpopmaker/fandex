import ArtistSearch from './components/v3/ArtistSearch';
import LineChartCard from './components/v3/LineChartCard';
import { artistUniverse } from './data/v3/artistUniverse';
import { marketChartPoints, trendingIssues } from './data/v3/mockData';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#070A12] dark:text-white">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
            FANDEX v3
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            K-pop 시장 한눈에 보기
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400 md:text-base">
            K-pop 종합지수의 흐름과 오늘의 주요 이슈를 한 화면에서 확인합니다.
          </p>
        </div>

        <div className="mb-8">
          <ArtistSearch artists={artistUniverse} />
        </div>

        <LineChartCard
          title="K-pop 종합지수"
          subtitle="오늘의 시장 흐름"
          points={marketChartPoints}
        />

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
                실시간 이슈
              </p>
              <h2 className="mt-2 text-2xl font-black">
                오늘의 K-pop 이슈 TOP 10
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {trendingIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-black text-cyan-700 dark:bg-cyan-300 dark:text-slate-950">
                  {issue.rank}
                </div>

                <div>
                  <p className="font-black text-slate-950 dark:text-white">
                    {issue.headline}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {issue.summary}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    이슈 점수 {issue.issueScore} · 검색 증가율 {issue.searchGrowthRate}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}