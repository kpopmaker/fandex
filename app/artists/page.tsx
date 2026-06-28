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
  tracked: 'tracked',
  partial: 'partial',
  preview: 'preview',
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
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#070A12] dark:text-white">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-bold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300 dark:hover:text-cyan-200"
            >
              FANDEX 홈
            </Link>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
              Artist Stock Detail
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              FANDEX 등록/추적 아티스트
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300 md:text-base">
              FANDEX 등록/추적 아티스트 기준으로 최신 FANDEX 주가와 주가형
              지수 흐름을 확인할 수 있습니다. 각 카드를 선택하면 6개월 변동
              추이와 변수별 영향 그래프로 이동합니다.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
            FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기 위한
            엔터테인먼트 리서치 지수이며, 금융상품/투자정보가 아닙니다.
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => {
            const latest = getLatestPoint(profile);
            const sixMonthHistory = getLastSixMonthHistory(profile);
            const trendBand = getIndexTrendBand(sixMonthHistory);
            const delta = calculateSixMonthDelta(sixMonthHistory);

            return (
              <Link
                key={profile.artistId}
                href={`/artists/${profile.artistId}`}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-400/60 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700 dark:hover:bg-slate-900/80"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-black text-cyan-700 dark:text-cyan-300">
                      {profile.ticker}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                      {profile.artistName}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {groupTypeLabels[profile.groupType]}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {coverageStatusLabels[profile.coverageStatus]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Metric label="FANDEX 주가" value={formatPoint(latest?.fandexPoint ?? 0)} />
                  <Metric label="6개월 변화" value={formatDelta(delta)} />
                  <Metric label="trend band" value={trendBandLabels[trendBand]} />
                  <Metric label="last updated" value={profile.lastUpdated} />
                </div>

                <p className="mt-5 text-sm font-black text-slate-500 group-hover:text-cyan-700 dark:text-slate-400 dark:group-hover:text-cyan-300">
                  상세 주가 차트 보기
                </p>
              </Link>
            );
          })}
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-2xl font-black">Coverage / Trust Notice</h2>
          <ul className="mt-5 grid gap-3 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300 md:grid-cols-2">
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              모든 K-pop 아티스트를 대표하지 않습니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              현재 차트는 editorial seed / preview 기반이며, 실제 공개 지표
              검증과 자동 수집은 후속 단계입니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              FANDEX 주가는 금융상품/투자정보가 아닙니다.
            </li>
          </ul>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
      <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words font-mono text-lg font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}
