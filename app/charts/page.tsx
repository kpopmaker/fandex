import {
  artistIndexChartProfiles,
  calculateIndexDelta,
  getCoverageSummary,
  getIndexTrendBand,
  type ArtistIndexChartProfile,
  type ArtistIndexHistoryPoint,
  type ArtistIndexTrendBand,
} from '../data/v4/charts/artistIndexChartData';
import {
  findSimilarIndexMovements,
  type ArtistIndexSimilarityBand,
} from '../data/v4/charts/artistIndexSimilarity';

const trendBandLabels: Record<ArtistIndexTrendBand, string> = {
  rising: '상승 흐름',
  stable: '안정 흐름',
  falling: '하락 흐름',
  volatile: '변동 확대',
  insufficient_data: '데이터 부족',
};

const similarityBandLabels: Record<ArtistIndexSimilarityBand, string> = {
  very_high: '매우 높음',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const chartColors = ['#0d9488', '#7c3aed', '#2563eb', '#047857'];

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}pt`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(value)}pt`;
}

function getLatestPoint(profile: ArtistIndexChartProfile) {
  return profile.history[profile.history.length - 1];
}

function createLinePath(
  history: ArtistIndexHistoryPoint[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
) {
  const padding = 18;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const range = maxValue - minValue || 1;

  return history
    .map((point, index) => {
      const x = padding + (index / Math.max(history.length - 1, 1)) * plotWidth;
      const y = padding + ((maxValue - point.fandexPoint) / range) * plotHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function MiniLineChart({
  profile,
  title,
}: {
  profile: ArtistIndexChartProfile;
  title: string;
}) {
  const width = 720;
  const height = 260;
  const values = profile.history.map((point) => point.fandexPoint);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const path = createLinePath(profile.history, width, height, minValue, maxValue);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <span className="text-xs font-bold text-slate-500">
          {profile.history[0]?.date} - {profile.history[profile.history.length - 1]?.date}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${profile.artistName} FANDEX 지수 차트`}
        className="h-64 w-full"
      >
        {[0, 1, 2].map((line) => {
          const y = 22 + line * 104;
          return (
            <line
              key={line}
              x1="18"
              x2="702"
              y1={y}
              y2={y}
              stroke="var(--chart-grid)"
              strokeDasharray="5 5"
            />
          );
        })}
        <path d={path} fill="none" stroke="#0d9488" strokeWidth="5" strokeLinecap="round" />
        {profile.history.map((point, index) => {
          const x = 18 + (index / Math.max(profile.history.length - 1, 1)) * 684;
          const y = 18 + ((maxValue - point.fandexPoint) / (maxValue - minValue || 1)) * 224;
          return (
            <g key={point.date}>
              <circle cx={x} cy={y} r="5" fill="white" stroke="#0d9488" strokeWidth="3" />
              {index === 0 || index === profile.history.length - 1 ? (
                <text x={x} y={height - 6} textAnchor="middle" className="fill-slate-500 text-[12px]">
                  {point.date.replace('2026-', '')}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CompareLineChart({ profiles }: { profiles: ArtistIndexChartProfile[] }) {
  const width = 820;
  const height = 310;
  const normalizedProfiles = profiles.map((profile) => {
    const values = profile.history.map((point) => point.fandexPoint);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return {
      ...profile,
      history: profile.history.map((point) => ({
        ...point,
        fandexPoint: ((point.fandexPoint - min) / range) * 100,
      })),
    };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap gap-3">
        {profiles.map((profile, index) => (
          <span key={profile.artistId} className="flex items-center gap-2 text-xs font-black text-slate-600">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: chartColors[index % chartColors.length] }}
            />
            {profile.artistName}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="기준 아티스트와 유사 아티스트의 정규화 지표 흐름 비교"
        className="h-72 w-full"
      >
        {[0, 1, 2].map((line) => {
          const y = 22 + line * 124;
          return (
            <line
              key={line}
              x1="20"
              x2="800"
              y1={y}
              y2={y}
              stroke="var(--chart-grid)"
              strokeDasharray="5 5"
            />
          );
        })}
        {normalizedProfiles.map((profile, index) => (
          <path
            key={profile.artistId}
            d={createLinePath(profile.history, width, height, 0, 100)}
            fill="none"
            stroke={chartColors[index % chartColors.length]}
            strokeWidth="4"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
}

export default function ArtistIndexChartsPage() {
  const profiles = artistIndexChartProfiles;
  const coverageSummary = getCoverageSummary(profiles);
  const baseProfile =
    profiles.find((profile) => profile.artistId === 'aespa') ?? profiles[0];
  const baseLatest = getLatestPoint(baseProfile);
  const similarResults = findSimilarIndexMovements(baseProfile.artistId, profiles).slice(0, 5);
  const compareProfiles = [
    baseProfile,
    ...similarResults.slice(0, 3).map((result) => {
      const profile = profiles.find(
        (item) => item.artistId === result.comparedArtistId,
      );
      return profile;
    }),
  ].filter(Boolean) as ArtistIndexChartProfile[];
  const contentAngles = Array.from(
    new Set(similarResults.flatMap((result) => result.commonThemeCandidates)),
  ).slice(0, 5);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-7 shadow-lg shadow-cyan-100/60">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">
            Editorial Preview / Beta Research Tool
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            FANDEX 지수 차트
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            FANDEX 등록 아티스트의 지표 흐름을 비교하고, 비슷한 움직임을 보이는 아티스트를 찾아 콘텐츠 주제 후보를 발굴합니다.
          </p>
          <p className="mt-4 max-w-3xl rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold leading-7 text-yellow-900">
            현재 차트는 베타 editorial seed 기반이며, 공식 순위/공식 평가/투자 정보가 아닙니다.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                Coverage Notice
              </p>
              <h2 className="mt-2 text-2xl font-black">
                FANDEX 등록/추적 아티스트 기준
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                현재 차트는 전체 K-pop 아티스트가 아니라 FANDEX 등록/추적 아티스트 기준입니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700">
              data status: {coverageSummary.dataStatus}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="tracked artist count" value={coverageSummary.trackedArtistCount.toString()} />
            <MetricCard label="partial artist count" value={coverageSummary.partialArtistCount.toString()} />
            <MetricCard label="preview artist count" value={coverageSummary.previewArtistCount.toString()} />
            <MetricCard label="last updated" value={coverageSummary.lastUpdated} />
            <MetricCard label="total seed count" value={coverageSummary.totalArtistCount.toString()} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Base Artist Chart
            </p>
            <h2 className="mt-2 text-3xl font-black">{baseProfile.artistName}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{baseProfile.ticker}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard label="latest FANDEX 지수" value={formatPoint(baseLatest.fandexPoint)} />
              <MetricCard label="recent delta" value={formatDelta(calculateIndexDelta(baseProfile.history))} />
              <MetricCard label="trend band" value={trendBandLabels[getIndexTrendBand(baseProfile.history)]} />
              <MetricCard label="data status" value={baseLatest.dataStatus} />
              <MetricCard label="confidence level" value={baseLatest.confidenceLevel} />
              <MetricCard label="latest note" value={baseLatest.note} />
            </div>
          </article>
          <MiniLineChart profile={baseProfile} title="최근 8개 시점 지수 차트" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Compare Chart
            </p>
            <h2 className="mt-2 text-2xl font-black">유사 흐름 아티스트 비교</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
              기준 아티스트와 유사 아티스트 3명의 FANDEX 지표 흐름을 같은 기간 기준으로 비교합니다.
            </p>
          </div>
          <CompareLineChart profiles={compareProfiles} />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {compareProfiles.map((profile) => {
              const latest = getLatestPoint(profile);
              return (
                <MetricCard
                  key={profile.artistId}
                  label={`${profile.artistName} / ${trendBandLabels[getIndexTrendBand(profile.history)]}`}
                  value={`${formatPoint(latest.fandexPoint)} (${formatDelta(calculateIndexDelta(profile.history))})`}
                />
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            Similar Movement Cards
          </p>
          <h2 className="mt-2 text-2xl font-black">비슷한 지표 흐름</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {similarResults.map((result) => (
              <article
                key={result.comparedArtistId}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">
                      {result.comparedArtistName}
                    </h3>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                      {similarityBandLabels[result.similarityBand]}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                    {trendBandLabels[result.sharedTrendBand]}
                  </span>
                </div>
                <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
                  {result.editorialSummary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.sharedDominantSignals.map((signal) => (
                    <span key={signal} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                      {signal}
                    </span>
                  ))}
                </div>
                <ul className="mt-4 grid gap-2">
                  {result.commonThemeCandidates.slice(0, 3).map((theme) => (
                    <li key={theme} className="text-sm font-bold leading-6 text-slate-600">
                      {theme}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold leading-6 text-slate-500">
                  {result.cautionNote}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Content Angle Suggestions
            </p>
            <h2 className="mt-2 text-2xl font-black">콘텐츠 주제 후보</h2>
            <ul className="mt-5 grid gap-3">
              {contentAngles.map((angle) => (
                <li
                  key={angle}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-600"
                >
                  {angle}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Usage Guardrail
            </p>
            <h2 className="mt-2 text-2xl font-black">사용 가드레일</h2>
            <ul className="mt-5 grid gap-3 text-sm font-bold leading-7 text-slate-600">
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                외부 콘텐츠에 FANDEX 직접 언급은 시스템 신뢰도 구축 전까지 보류
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                콘텐츠 발행 전 외부 플랫폼에서 수치 1회 재확인
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                “전체 K-pop 랭킹”이 아니라 “FANDEX 등록 아티스트 기준 흐름”으로만 해석
              </li>
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                이 페이지는 콘텐츠 기획용 preview이며 공식 순위가 아님
              </li>
            </ul>
          </article>
        </section>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
