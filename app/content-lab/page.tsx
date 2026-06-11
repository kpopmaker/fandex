import Link from 'next/link';
import { getMockArtistPrices, type ArtistPrice } from '../data/mockPrices';

export const dynamic = 'force-dynamic';

function getChangeClass(value: number) {
  return value >= 0 ? 'text-red-300' : 'text-blue-300';
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function createContentIdeas(prices: ArtistPrice[]) {
  const topGainer = [...prices].sort((a, b) => b.changeRate - a.changeRate)[0];
  const topVolume = [...prices].sort((a, b) => b.volume - a.volume)[0];
  const topGlobal = [...prices].sort(
    (a, b) => b.factorScores.globalReaction - a.factorScores.globalReaction
  )[0];
  const topSearch = [...prices].sort(
    (a, b) => b.factorScores.searchNews - a.factorScores.searchNews
  )[0];
  const topViral = [...prices].sort(
    (a, b) => b.factorScores.fanViral - a.factorScores.fanViral
  )[0];

  return [
    {
      type: '오늘의 급등주',
      badge: 'SURGE',
      artist: topGainer,
      angle: '오늘 K-pop 시장에서 가장 강하게 상승한 종목',
      headline: `오늘의 K-pop 급등주: ${topGainer.nameKo}`,
      shortPost: `${topGainer.nameKo}가 오늘 FANDEX 기준 ${topGainer.changeRate > 0 ? '+' : ''}${topGainer.changeRate.toFixed(
        2
      )}% 상승하며 가장 강한 모멘텀을 보였습니다.`,
      cardTitles: [
        `오늘 K-pop 시장에서 가장 뜨거운 종목은 ${topGainer.nameKo}`,
        `${topGainer.ticker}, 단기 모멘텀 급상승`,
        `팬덤 시세로 보면 지금 ${topGainer.nameKo}가 움직이고 있습니다`,
      ],
      reason: `현재가 ${topGainer.price.toFixed(2)} FDX, 모멘텀 ${topGainer.momentum.toFixed(
        2
      )}`,
      tone: 'red',
    },
    {
      type: '거래량 폭증',
      badge: 'VOLUME',
      artist: topVolume,
      angle: '단기 반응량이 가장 크게 몰린 종목',
      headline: `거래량 터진 K-pop 종목: ${topVolume.nameKo}`,
      shortPost: `${topVolume.nameKo}는 현재 FANDEX 거래량 ${formatLargeNumber(
        topVolume.volume
      )}을 기록하며 시장 관심이 집중되고 있습니다.`,
      cardTitles: [
        `${topVolume.nameKo}, 오늘 반응량이 터졌습니다`,
        `거래량으로 보는 K-pop 시장의 현재 이슈`,
        `${topVolume.ticker}에 관심이 몰리는 이유`,
      ],
      reason: `거래량 ${formatLargeNumber(topVolume.volume)}, Fan Cap ${formatLargeNumber(
        topVolume.fanCap
      )}`,
      tone: 'purple',
    },
    {
      type: '해외 반응 강세',
      badge: 'GLOBAL',
      artist: topGlobal,
      angle: '글로벌 반응 요소가 가장 강한 종목',
      headline: `해외 반응 강세 종목: ${topGlobal.nameKo}`,
      shortPost: `${topGlobal.nameKo}는 해외 반응 점수 ${topGlobal.factorScores.globalReaction.toFixed(
        1
      )}점으로 글로벌 시장에서 강한 신호를 보이고 있습니다.`,
      cardTitles: [
        `글로벌 팬덤이 반응 중인 아티스트`,
        `${topGlobal.nameKo}, 해외 반응 지표 강세`,
        `국내보다 글로벌에서 더 뜨거운 종목은?`,
      ],
      reason: `해외 반응 점수 ${topGlobal.factorScores.globalReaction.toFixed(1)}점`,
      tone: 'green',
    },
    {
      type: '검색·뉴스 강세',
      badge: 'SEARCH',
      artist: topSearch,
      angle: '포털 검색과 뉴스 반응이 강한 종목',
      headline: `검색량 상승 종목: ${topSearch.nameKo}`,
      shortPost: `${topSearch.nameKo}는 검색·뉴스 점수 ${topSearch.factorScores.searchNews.toFixed(
        1
      )}점으로 현재 이슈성이 높게 감지되고 있습니다.`,
      cardTitles: [
        `오늘 검색 반응이 강한 K-pop 아티스트`,
        `${topSearch.nameKo}, 포털 관심도 상승`,
        `뉴스와 검색량으로 보는 오늘의 이슈 종목`,
      ],
      reason: `검색·뉴스 점수 ${topSearch.factorScores.searchNews.toFixed(1)}점`,
      tone: 'cyan',
    },
    {
      type: '바이럴 후보',
      badge: 'VIRAL',
      artist: topViral,
      angle: '팬채널·바이럴 요소가 강한 종목',
      headline: `바이럴 후보 종목: ${topViral.nameKo}`,
      shortPost: `${topViral.nameKo}는 팬채널·바이럴 점수 ${topViral.factorScores.fanViral.toFixed(
        1
      )}점으로 2차 확산 가능성이 높은 종목으로 감지됩니다.`,
      cardTitles: [
        `팬채널에서 반응이 올라오는 종목`,
        `${topViral.nameKo}, 바이럴 지표 강세`,
        `오늘 숏폼 소재로 보기 좋은 K-pop 종목`,
      ],
      reason: `팬채널·바이럴 점수 ${topViral.factorScores.fanViral.toFixed(1)}점`,
      tone: 'yellow',
    },
  ];
}

export default function ContentLabPage() {
  const prices = getMockArtistPrices();
  const ideas = createContentIdeas(prices);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
            CONTENT LAB
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            SNS 콘텐츠 소재 자동 생성
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
            FANDEX의 mock 시세 데이터를 기반으로 오늘의 급등주, 거래량 폭증,
            해외 반응 강세, 검색량 상승, 바이럴 후보 콘텐츠 소재를 자동으로
            정리합니다.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {ideas.map((idea) => (
            <SummaryCard
              key={idea.badge}
              label={idea.type}
              value={idea.artist.ticker}
              description={idea.artist.nameKo}
              tone={idea.tone}
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {ideas.map((idea) => (
            <ContentIdeaCard key={idea.badge} idea={idea} />
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <h2 className="text-2xl font-black">운영자용 콘텐츠 활용 방식</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <UsageCard
              title="인스타 카드뉴스"
              description="headline과 card title을 활용해 3~5장짜리 카드뉴스를 만들 수 있습니다."
            />

            <UsageCard
              title="X / 스레드 짧은 글"
              description="shortPost 문구를 그대로 짧은 정보성 포스트로 활용할 수 있습니다."
            />

            <UsageCard
              title="릴스 / 쇼츠 대본"
              description="급등 사유와 지표를 활용해 15초짜리 짧은 해설 콘텐츠를 만들 수 있습니다."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: string;
}) {
  const toneClass =
    {
      red: 'border-red-400/20 bg-red-400/10 text-red-300',
      purple: 'border-purple-400/20 bg-purple-400/10 text-purple-300',
      green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
      cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
      yellow: 'border-yellow-400/20 bg-yellow-400/10 text-yellow-300',
    }[tone] ?? 'border-slate-800 bg-slate-950 text-slate-300';

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-sm font-bold">{label}</p>
      <p className="mt-2 font-mono text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function ContentIdeaCard({
  idea,
}: {
  idea: ReturnType<typeof createContentIdeas>[number];
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-300">
            {idea.badge}
          </span>

          <h2 className="mt-4 text-2xl font-black">{idea.headline}</h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {idea.angle}
          </p>
        </div>

        <Link
          href={`/artists/${idea.artist.artistId}`}
          className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-cyan-300 hover:text-slate-950"
        >
          종목 보기
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-xs font-bold text-slate-500">짧은 포스트 문구</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          {idea.shortPost}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-xs font-bold text-slate-500">카드뉴스 제목 후보</p>

        <div className="mt-3 space-y-2">
          {idea.cardTitles.map((title) => (
            <p
              key={title}
              className="rounded-xl bg-black/20 px-3 py-2 text-sm text-slate-300"
            >
              {title}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <MetricBadge label="Price" value={`${idea.artist.price.toFixed(2)} FDX`} />
        <MetricBadge
          label="Change"
          value={`${idea.artist.changeRate > 0 ? '+' : ''}${idea.artist.changeRate.toFixed(2)}%`}
          className={getChangeClass(idea.artist.changeRate)}
        />
        <MetricBadge label="Reason" value={idea.reason} />
      </div>
    </div>
  );
}

function MetricBadge({
  label,
  value,
  className = 'text-slate-200',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-sm font-black ${className}`}>
        {value}
      </p>
    </div>
  );
}

function UsageCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <h3 className="font-black text-cyan-300">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}