import Link from 'next/link';
import {
  getCoveragePageSummary,
  getDefaultCompareArtists,
  getKpopCompositeIndexSummary,
  getMethodologyVariableDefinitions,
} from './data/v4/charts/artistIndexChartData';
import { getArtistMetadata } from './data/v4/charts/artistMetadata';
import { getMarketIssueTopTen } from './data/v4/charts/issueSignals';
import {
  FANDEX_METRIC_DEFINITIONS,
  FANDEX_METRIC_END_MONTH,
  FANDEX_METRIC_START_MONTH,
  getAllLatestArtistMetrics,
  getMetricSourceSummary,
  getTopMetricItemsForArtist,
} from './data/v4/metrics';

const primaryRoutes = [
  {
    title: '랭킹',
    copy: '아티스트별 FANDEX 흐름을 검색·필터로 확인',
    href: '/ranking',
  },
  {
    title: '주가 차트',
    copy: '25.07~26.07 월별 지표 흐름 확인',
    href: '/charts',
  },
  {
    title: '아티스트 목록',
    copy: '현재 FANDEX에 들어온 아티스트와 데이터 상태를 봅니다.',
    href: '/artists',
  },
  {
    title: '아티스트 비교',
    copy: '2~5개 아티스트 지표를 나란히 비교',
    href: '/compare',
  },
  {
    title: '산출방식',
    copy: 'FANDEX 지표 구성과 기준 확인',
    href: '/methodology',
  },
  {
    title: '커버리지',
    copy: '반영 아티스트와 데이터 기준 확인',
    href: '/coverage',
  },
];

const highlightedMetricKeys = new Set(['music', 'youtube', 'search', 'fandom']);

const capabilityItems = [
  '69팀 coverage 기반 아티스트 목록',
  '아티스트별 최근 1년 FANDEX 주가 차트',
  '변수 1~4개 선택 그래프',
  '2~5명 아티스트 비교',
  '선택 변수별 비교 그래프',
  '산출방식 / 커버리지 안내',
];

const variableLabels: Record<string, string> = {
  musicAlbumPoint: '음원/음반',
  newsIssuePoint: '뉴스/이슈',
  snsFandomPoint: 'SNS/팬덤',
  brandFitPoint: '브랜드 적합도',
  comebackActivityPoint: '컴백/활동',
  growthMomentumPoint: '성장 모멘텀',
  riskAdjustmentPoint: '조정 신호',
};

export default function Home() {
  const summary = getCoveragePageSummary();
  const composite = getKpopCompositeIndexSummary();
  const variables = getMethodologyVariableDefinitions();
  const defaultCompareArtists = getDefaultCompareArtists();
  const marketIssues = getMarketIssueTopTen();
  const metricSourceSummary = getMetricSourceSummary();
  const highlightedMetrics = FANDEX_METRIC_DEFINITIONS.filter((metric) =>
    highlightedMetricKeys.has(metric.key),
  );
  const highlightedArtists = getAllLatestArtistMetrics()
    .map((metricPoint) => {
      const artist = getArtistMetadata(metricPoint.artistId);
      const topMetrics = getTopMetricItemsForArtist(metricPoint.artistId, 2);

      if (!artist || topMetrics.length === 0) {
        return null;
      }

      return {
        artist,
        metricPoint,
        topMetrics,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.metricPoint.fandexPoint - a.metricPoint.fandexPoint)
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-stretch">
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-700">
              FANDEX K-pop 종합지수
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
              현재 {formatPoint(composite.currentPoint)}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              FANDEX는 아티스트의 활동 흐름을 숫자와 차트로 보여주는
              서비스입니다. 지금 누가 어떤 흐름인지, 어떤 변수가 움직였는지
              확인할 수 있습니다.
            </p>
            <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-900">
              FANDEX 등록/추적 아티스트 기준입니다. 공식 K-pop 시장 지수가
              아니라 FANDEX 내부 리서치 지수입니다.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="최근 6개월 변화" value={formatDelta(composite.sixMonthDelta)} />
              <Metric label="반영 아티스트 수" value={`${composite.artistCount}팀`} />
              <Metric label="기준" value="등록/추적" />
            </div>
            <CompositeMiniChart points={composite.series} />
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/charts"
                className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-black text-white hover:bg-cyan-500"
              >
                주가 차트 보기
              </Link>
              <Link
                href={`/compare?artists=${defaultCompareArtists
                  .map((artist) => artist.artistId)
                  .join(',')}`}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
              >
                여러 아티스트 비교
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-700">
              FANDEX 한눈에 보기
            </p>
            <h2 className="mt-3 text-3xl font-black">
              K-pop 시장 흐름을 쉽게 봅니다
            </h2>
            <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
              아직 모든 K-pop 아티스트를 다루지는 않습니다. 현재 데이터는
              FANDEX가 먼저 등록한 아티스트 기준입니다.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="전체 아티스트" value={String(summary.totalArtistCount)} />
              <Metric label="지속 추적" value={String(summary.trackedArtistCount)} />
              <Metric label="미리보기" value={String(summary.previewArtistCount)} />
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                metric summary
              </p>
              <h2 className="mt-2 text-2xl font-black">FANDEX가 보는 지표</h2>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                FANDEX는 음원, 유튜브, 검색, 팬덤 등 여러 반응을 함께 봅니다.
                현재 값은 MVP preview seed 기준이며, 공식 순위가 아니라 아티스트 흐름을 읽기 위한 참고 지표입니다.
              </p>
            </div>
            <Link
              href="/methodology"
              className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
            >
              지표 기준 보기
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="전체 지표 수" value={`${metricSourceSummary.totalMetrics}개`} />
            <Metric
              label="데이터 기준"
              value={`${FANDEX_METRIC_START_MONTH}~${FANDEX_METRIC_END_MONTH}`}
            />
            <Metric
              label="preview seed"
              value={`${metricSourceSummary.previewSeedMetrics}개`}
            />
            <Metric label="현재 상태" value="preview 단계" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {highlightedMetrics.map((metric) => (
              <span
                key={metric.key}
                className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700"
              >
                {metric.shortLabel || metric.label}
              </span>
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-900">
            현재 {metricSourceSummary.totalMetrics}개 지표는 MVP preview seed 기준입니다.
            실제 자동 수집 데이터가 붙기 전, 화면 구조와 지표 흐름을 검증하는 단계입니다.
          </p>
        </section>

        {highlightedArtists.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                  latest metric points
                </p>
                <h2 className="mt-2 text-2xl font-black">최근 월 기준 두드러진 흐름</h2>
                <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                  최신 월 preview seed에서 상위 지표가 뚜렷한 아티스트 일부입니다.
                  기존 metric helper 기준으로 표시합니다.
                </p>
              </div>
              <Link
                href="/ranking"
                className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
              >
                랭킹에서 더 보기
              </Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {highlightedArtists.map(({ artist, metricPoint, topMetrics }) => (
                <article
                  key={artist.artistId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-mono text-xs font-black text-cyan-700">
                    {artist.ticker} / {metricPoint.label}
                  </p>
                  <h3 className="mt-2 text-xl font-black">{artist.displayName}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {artist.koreanName}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topMetrics.map((metric) => (
                      <span
                        key={metric.key}
                        className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600"
                      >
                        {metric.shortLabel || metric.label}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/artists/${artist.artistId}`}
                    className="mt-4 inline-flex rounded-full bg-cyan-600 px-4 py-2 text-xs font-black text-white hover:bg-cyan-500"
                  >
                    아티스트 보기
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
                FANDEX 이슈 시그널
              </p>
              <h2 className="mt-2 text-2xl font-black">
                K-pop 시장 최신 이슈 Top 10
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                현재 Top 10은 실시간 뉴스가 아니라 FANDEX 미리보기 데이터
                기준입니다. 실제 기사나 공식 발표 목록은 아닙니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700">
              에디토리얼 시드 기반 최근 이슈
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {marketIssues.map((issue, index) => (
              <article
                key={issue.id}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[3rem_1fr_9rem_9rem]"
              >
                <p className="font-mono text-lg font-black text-cyan-700">
                  {index + 1}
                </p>
                <div>
                  <h3 className="font-black">{issue.title}</h3>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
                    {issue.summary}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-600">
                  {issue.relatedArtistName}
                </p>
                <p className="text-sm font-black text-slate-700">
                  {issue.impactLabel}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {primaryRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
            >
              <h2 className="text-lg font-black">{route.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {route.copy}
              </p>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">현재 가능한 기능</h2>
            <ul className="mt-5 space-y-3 text-sm font-bold leading-6 text-slate-600">
              {capabilityItems.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black">7개 산출 변수</h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {variables.map((variable) => (
                <div
                  key={variable.variableKey}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-black">
                    {variableLabels[variable.variableKey] ??
                      variable.displayName}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {variable.variableKey}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">데이터 안내</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다. 모든
            K-pop 아티스트를 대표하지 않습니다. 현재 차트는 에디토리얼
            시드 / 미리보기 데이터 기반이며, 실제 공개 지표 검증과 자동 수집은
            후속 단계입니다.
          </p>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-xl font-black text-slate-950">
        {value}
      </p>
    </article>
  );
}

function CompositeMiniChart({
  points,
}: {
  points: Array<{ date: string; fandexPoint: number }>;
}) {
  const width = 520;
  const height = 150;
  const values = points.map((point) => point.fandexPoint);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = 20 + (index / Math.max(points.length - 1, 1)) * (width - 40);
      const y = 18 + ((max - point.fandexPoint) / range) * (height - 42);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="FANDEX K-pop 종합지수 2025년 7월부터 2026년 7월까지의 월별 흐름"
        className="h-36 min-w-[420px] w-full"
      >
        {[0, 1, 2].map((line) => (
          <line
            key={line}
            x1="20"
            x2={width - 20}
            y1={18 + line * 45}
            y2={18 + line * 45}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-slate-200"
          />
        ))}
        <path d={path} fill="none" stroke="#0891b2" strokeLinecap="round" strokeWidth="4" />
        {points.map((point, index) => {
          const x = 20 + (index / Math.max(points.length - 1, 1)) * (width - 40);
          const y = 18 + ((max - point.fandexPoint) / range) * (height - 42);
          return (
            <g key={point.date}>
              <circle cx={x} cy={y} r="4" fill="white" stroke="#0891b2" strokeWidth="2.5" />
              {(index === 0 || index === points.length - 1) && (
                <text x={x} y={height - 7} textAnchor="middle" className="fill-slate-500 text-[11px] font-bold">
                  {point.date}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}pt`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(
    Math.round(value),
  )}pt`;
}
