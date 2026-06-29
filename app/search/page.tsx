import Link from 'next/link';
import {
  artistIndexChartProfiles,
  getCoveragePageSummary,
  getVariableDisplayName,
  type ArtistStockVariableKey,
} from '../data/v4/charts/artistIndexChartData';

const featuredVariableKeys: ArtistStockVariableKey[] = [
  'snsFandomPoint',
  'brandFitPoint',
  'comebackActivityPoint',
  'musicAlbumPoint',
];

export default function SearchPage() {
  const summary = getCoveragePageSummary();
  const featuredArtists = artistIndexChartProfiles
    .filter((profile) => profile.coverageStatus === 'tracked')
    .slice(0, 8);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600">
            FANDEX 아티스트 찾기
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            FANDEX 등록/추적 아티스트 탐색
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            현재 검색 페이지는 1차 MVP 기준으로 등록/추적 아티스트와 핵심
            변수 탐색 경로를 제공합니다. 상세 검색, 자동완성, 실시간
            업데이트는 후속 단계입니다.
          </p>
          <p className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-900">
            FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기
            위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가
            아닙니다.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric
              label="전체 아티스트"
            value={String(summary.totalArtistCount)}
          />
          <Metric
              label="지속 추적"
            value={String(summary.trackedArtistCount)}
          />
          <Metric
              label="미리보기"
            value={String(summary.previewArtistCount)}
          />
        </div>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">주요 아티스트</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">
                FANDEX 등록/추적 아티스트 기준으로 일부 항목을 표시합니다.
              </p>
            </div>
            <Link
              href="/artists"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              전체 아티스트 보기
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredArtists.map((artist) => (
              <article
                key={artist.artistId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="font-mono text-xs font-black text-cyan-700">
                  {artist.ticker}
                </p>
                <h3 className="mt-2 text-lg font-black">{artist.artistName}</h3>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {artist.groupType} / {artist.coverageStatus}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/artists/${artist.artistId}`}
                    className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white"
                  >
                    상세
                  </Link>
                  <Link
                    href={`/compare?artists=${artist.artistId}`}
                    className="rounded-full border border-slate-300 px-3 py-2 text-xs font-black text-slate-700"
                  >
                    비교
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">변수 탐색</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            변수별 흐름은 전체 FANDEX 주가와 같은 값이 아니라, 주가형 지수
            산출에 영향을 준 개별 변수의 흐름입니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {featuredVariableKeys.map((key) => (
              <Link
                key={key}
                href={`/compare?variables=${key}`}
                className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800"
              >
                {getVariableDisplayName(key)}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white">
          <h2 className="text-2xl font-black">데이터 안내</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
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
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-black text-slate-950">
        {value}
      </p>
    </article>
  );
}
