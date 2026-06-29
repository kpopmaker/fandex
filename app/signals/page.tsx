import Link from 'next/link';
import { getArtistV3ById } from '../data/v3/artistUniverse';
import { getArtistPriceHistory, trendingIssues } from '../data/v3/mockData';
import type { KpopIssue } from '../data/v3/types';

const futureAlerts = [
  '상승 경보',
  '검색 급등',
  '뉴스 급증',
  '해외 반응 상승',
  '팬덤 반응 상승',
  '과열 주의',
  '하락 주의',
];

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function getSignalBadge(issue: KpopIssue) {
  if (issue.impact.toLowerCase().includes('down')) {
    return '주의';
  }

  if (issue.relatedArtistIds.length > 2) {
    return '혼조';
  }

  if (issue.impact.toLowerCase().includes('up')) {
    return '상승';
  }

  return '주목';
}

function getSignalClass(signal: string) {
  const classes: Record<string, string> = {
    상승: 'bg-red-400/10 text-red-300',
    주목: 'bg-cyan-400/10 text-cyan-300',
    혼조: 'bg-violet-400/10 text-violet-300',
    주의: 'bg-blue-400/10 text-blue-300',
  };

  return classes[signal] ?? classes.주목;
}

function getArtistNames(issue: KpopIssue) {
  return issue.relatedArtistIds
    .map((artistId) => getArtistV3ById(artistId))
    .filter((artist): artist is NonNullable<typeof artist> => Boolean(artist))
    .map((artist) => artist.nameEn);
}

function getMockMovement(issue: KpopIssue) {
  const artistId = issue.relatedArtistIds[0];
  const artist = artistId ? getArtistV3ById(artistId) : null;

  if (!artist) {
    return null;
  }

  const history = getArtistPriceHistory(artist.id);
  const before = history[Math.max(history.length - 3, 0)];
  const after = history[history.length - 1];

  if (!before || !after || before.price === 0) {
    return null;
  }

  return {
    artist,
    changeRate: ((after.price - before.price) / before.price) * 100,
  };
}

export default function SignalsPage() {
  const issues = trendingIssues.slice(0, 10);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50 px-5 py-10 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-600">
                MARKET SIGNALS
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
                시장 신호
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
                이 페이지는 실험 단계입니다. 지금은 mock 이슈 데이터를 사용해
                어떤 방식으로 검색, 뉴스, 팬덤, 해외 반응의 변화를 시장 신호로
                보여줄지 확인하는 화면입니다.
              </p>
              <p className="mt-4 max-w-3xl rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-900">
                아래 수치는 실제 분석 결과가 아니라 mock 데이터 기반 예시입니다.
                FANDEX 가격은 simulated index이며 실제 주식, 투자 상품, 금융
                조언이 아닙니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/compare?artists=aespa,ive,riize"
                className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-cyan-400"
              >
                아티스트 비교하기
              </Link>
              <Link
                href="/ranking"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
              >
                순위 보기
              </Link>
              <Link
                href="/"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
              >
                시장 홈
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Future Alert Types
            </p>
            <h2 className="mt-2 text-2xl font-black">
              향후 시장 경보 예시
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              실제 데이터 연동 이후에는 각 신호에 관련 아티스트, 발생 시각,
              출처 데이터, 신뢰도, 관련 뉴스, 그래프 영향을 함께 표시합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {futureAlerts.map((alert) => (
              <span
                key={alert}
                className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-900"
              >
                {alert}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {issues.map((issue) => {
            const signal = getSignalBadge(issue);
            const artistNames = getArtistNames(issue);
            const movement = getMockMovement(issue);

            return (
              <article
                key={issue.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-300 px-2.5 py-1 text-xs font-black text-slate-950">
                    #{issue.rank}
                  </span>
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500">
                    {issue.category}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${getSignalClass(
                      signal
                    )}`}
                  >
                    {signal}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-black">{issue.headline}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {issue.summary}
                </p>
                <p className="mt-4 text-xs font-bold text-slate-500">
                  관련 아티스트: {artistNames.join(', ') || '시장 전체'}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="검색 변화"
                    value={formatPercent(issue.searchGrowthRate)}
                  />
                  <Metric label="뉴스량" value={`${issue.newsCount}건`} />
                  <Metric
                    label="mock 가격 반응"
                    value={movement ? formatPercent(movement.changeRate) : '확인 필요'}
                  />
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Mock display only. 실제 뉴스/검색/SNS 데이터 연동 전까지는
                  분석 결과로 해석하지 않습니다.
                </p>
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Alert Readiness
            </p>
            <h2 className="mt-2 text-2xl font-black">
              시장 신호가 실제 경보가 되려면
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              현재는 화면 구조와 용어를 검증하는 단계입니다. 다음 단계에서
              실제 데이터 수집, 이슈-아티스트 매칭, 신뢰도 계산, 그래프 영향
              표시가 필요합니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RoadmapCard title="출처 데이터" value="뉴스, 검색, 영상, SNS" />
            <RoadmapCard title="신뢰도" value="수집량과 출처 품질 기반" />
            <RoadmapCard title="관련 뉴스" value="기사와 공식 발표 연결" />
            <RoadmapCard title="그래프 영향" value="가격/지수 변동 구간 표시" />
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                다음 행동
              </p>
              <h2 className="mt-2 text-3xl font-black">
                신호가 나타난 아티스트를 비교하세요.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-100">
                aespa, IVE, RIIZE의 FANDEX 가격과 반영 요소를 함께 보면
                이슈가 어느 아티스트에 더 강하게 나타나는지 비교할 수 있습니다.
              </p>
            </div>

            <Link
              href="/compare?artists=aespa,ive,riize"
              className="w-fit rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200"
            >
              아티스트 비교하기
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function RoadmapCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{value}</p>
    </article>
  );
}
