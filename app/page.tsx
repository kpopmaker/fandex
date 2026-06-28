import Link from 'next/link';
import {
  getCoveragePageSummary,
  getDefaultCompareArtists,
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
    title: 'Multi Artist Compare',
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
  'methodology / coverage 안내',
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
  const variables = getMethodologyVariableDefinitions();
  const defaultCompareArtists = getDefaultCompareArtists();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">
              FANDEX MVP
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
              K-pop 아티스트 활동성과 반응 지표를 주가형 지수로 해석합니다.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              FANDEX는 아티스트별 6개월 FANDEX 주가 변동과 변수별 영향을
              확인하고, 여러 아티스트를 같은 기간과 같은 변수 기준으로
              비교하는 리서치 플랫폼입니다.
            </p>
            <p className="mt-5 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm font-bold leading-6 text-cyan-100">
              FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기
              위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가
              아닙니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/charts"
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950"
              >
                주가 차트 보기
              </Link>
              <Link
                href={`/compare?artists=${defaultCompareArtists
                  .map((artist) => artist.artistId)
                  .join(',')}`}
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white"
              >
                여러 아티스트 비교
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Metric
              label="Total Artists"
              value={String(summary.totalArtistCount)}
            />
            <Metric
              label="Tracked"
              value={String(summary.trackedArtistCount)}
            />
            <Metric
              label="Partial"
              value={String(summary.partialArtistCount)}
            />
            <Metric
              label="Preview"
              value={String(summary.previewArtistCount)}
            />
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {primaryRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-300/50 hover:bg-white/10"
            >
              <h2 className="text-lg font-black">{route.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {route.copy}
              </p>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-black">현재 가능한 기능</h2>
            <ul className="mt-5 space-y-3 text-sm font-bold leading-6 text-slate-300">
              {capabilityItems.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-black">7개 산출 변수</h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {variables.map((variable) => (
                <div
                  key={variable.variableKey}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <p className="font-black">
                    {variableLabels[variable.variableKey] ??
                      variable.displayName}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    {variable.variableKey}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-black">Coverage / Trust Notice</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다. 모든
            K-pop 아티스트를 대표하지 않습니다. 현재 차트는 editorial
            seed / preview 기반이며, 실제 공개 지표 검증과 자동 수집은
            후속 단계입니다.
          </p>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-black text-white">{value}</p>
    </article>
  );
}
