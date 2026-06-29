import Link from 'next/link';
import {
  getCoveragePageSummary,
  getDefaultCompareArtists,
  getKpopCompositeIndexSummary,
  getMethodologyVariableDefinitions,
} from './data/v4/charts/artistIndexChartData';

const primaryRoutes = [
  {
    title: '주가 차트',
    copy: 'FANDEX 등록/추적 아티스트 기준 6개월 주가형 지수 흐름을 확인합니다.',
    href: '/charts',
  },
  {
    title: '아티스트 목록',
    copy: '69팀 coverage 기반 아티스트와 데이터 상태를 탐색합니다.',
    href: '/artists',
  },
  {
    title: '아티스트 비교',
    copy: '2~5명 아티스트를 같은 기간, 같은 변수 기준으로 비교합니다.',
    href: '/compare',
  },
  {
    title: '산출방식',
    copy: 'FANDEX 주가가 어떤 변수와 방식으로 만들어지는지 확인합니다.',
    href: '/methodology',
  },
  {
    title: '커버리지',
    copy: '등록/추적 아티스트 범위와 coverageStatus, dataStatus를 확인합니다.',
    href: '/coverage',
  },
];

const capabilityItems = [
  '69팀 coverage 기반 아티스트 목록',
  '아티스트별 6개월 FANDEX 주가 차트',
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
  riskAdjustmentPoint: '리스크 감점',
};

export default function Home() {
  const summary = getCoveragePageSummary();
  const composite = getKpopCompositeIndexSummary();
  const variables = getMethodologyVariableDefinitions();
  const defaultCompareArtists = getDefaultCompareArtists();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-stretch">
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-700">
              FANDEX MVP 허브
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
              K-pop 아티스트 흐름을 주가형 지수로 봅니다.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              FANDEX는 K-pop 아티스트의 활동성과 반응 지표를 주가형
              지수로 해석하는 리서치 플랫폼입니다. 아티스트별 6개월
              FANDEX 주가와 변수별 흐름을 같은 기준으로 비교합니다.
            </p>
            <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-900">
              FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기 위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가 아닙니다.
            </p>
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
              FANDEX K-pop 종합지수
            </p>
            <h2 className="mt-3 text-3xl font-black">
              현재 {formatPoint(composite.currentPoint)}
            </h2>
            <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
              FANDEX 등록/추적 아티스트의 최근 FANDEX 주가 평균입니다.
              공식 K-pop 시장 지수가 아니라 FANDEX 내부 리서치 지수입니다.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="최근 6개월 변화" value={formatDelta(composite.sixMonthDelta)} />
              <Metric label="반영 아티스트 수" value={`${composite.artistCount}팀`} />
              <Metric label="기준" value="등록/추적" />
            </div>
            <CompositeMiniChart points={composite.series} />
          </section>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="전체 아티스트" value={String(summary.totalArtistCount)} />
          <Metric label="지속 추적" value={String(summary.trackedArtistCount)} />
          <Metric label="일부 반영" value={String(summary.partialArtistCount)} />
          <Metric label="미리보기" value={String(summary.previewArtistCount)} />
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
        aria-label="FANDEX K-pop 종합지수 최근 6개월 흐름"
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
                  {point.date.replace('2026-', '')}
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
