import Link from 'next/link';
import { getArtistRankingRowsV4 } from '../data/v4/artistRanking';
import { getArtistPriceHistoryV4 } from '../data/v4/artistPriceHistory';
import type { IssueScoreBreakdown } from '../data/v4/scoring/types';

type IssueTone = 'positive' | 'neutral' | 'watch' | 'risk';
type IssueBadge = {
  label: '긍정 신호' | '보통' | '확인 필요' | '조정 신호';
  tone: IssueTone;
  issueScore: number;
  activeIssueCount: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function safeNumber(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safePositiveNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  return Math.max(safeNumber(value, fallback), 0);
}

function clampScore(value: number | null | undefined, fallback = 0) {
  return Math.min(Math.max(safeNumber(value, fallback), 0), 100);
}

function getIssueTone({
  breakdown,
  positiveIssueCount,
  negativeIssueCount,
}: {
  breakdown: IssueScoreBreakdown | undefined;
  positiveIssueCount: number;
  negativeIssueCount: number;
}): Pick<IssueBadge, 'label' | 'tone'> {
  const issueScore = clampScore(breakdown?.issueScore, 50);
  const riskScore = clampScore(breakdown?.controversyRiskScore);

  if (riskScore >= 65) {
    return { label: '조정 신호', tone: 'risk' };
  }

  if (
    issueScore <= 40 ||
    riskScore >= 35 ||
    negativeIssueCount > positiveIssueCount
  ) {
    return { label: '확인 필요', tone: 'watch' };
  }

  if (issueScore >= 60 && riskScore < 50) {
    return { label: '긍정 신호', tone: 'positive' };
  }

  return { label: '보통', tone: 'neutral' };
}

function getIssueBadgeForArtist(artistId: string): IssueBadge {
  const history = getArtistPriceHistoryV4(artistId);
  const latestPoint = history[history.length - 1];
  const breakdown =
    latestPoint?.issueScoreBreakdown ??
    latestPoint?.scoreBreakdown.issueScoreBreakdown;
  const summary = latestPoint?.issueSignalsSummary;
  const activeIssueCount = Math.round(
    safePositiveNumber(summary?.activeIssueCount)
  );
  const positiveIssueCount = Math.round(
    safePositiveNumber(summary?.positiveIssueCount)
  );
  const negativeIssueCount = Math.round(
    safePositiveNumber(summary?.negativeIssueCount)
  );
  const tone = getIssueTone({
    breakdown,
    positiveIssueCount,
    negativeIssueCount,
  });

  return {
    ...tone,
    issueScore: clampScore(breakdown?.issueScore, 50),
    activeIssueCount,
  };
}

function getIssueBadgeLabel(badge: IssueBadge) {
  const score = Math.round(badge.issueScore);

  return `${badge.label} / 이슈 점수 ${score}`;
}

export default function RankingPage() {
  const rankingRows = getArtistRankingRowsV4().map((row) => ({
    ...row,
    issueBadge: getIssueBadgeForArtist(row.artistId),
  }));

  const risingRanking = [...rankingRows].sort(
    (a, b) => b.changeRate - a.changeRate
  );

  const volumeRanking = [...rankingRows].sort((a, b) => b.volume - a.volume);

  const fanCapRanking = [...rankingRows].sort((a, b) => b.fanCap - a.fanCap);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50 text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
            FANDEX 랭킹
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            K-pop 아티스트 랭킹
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500 md:text-base">
            FANDEX 등록/추적 아티스트를 변화, 관심량, 팬덤 규모 기준으로
            나눠 봅니다. 공식 순위가 아니라 미리보기 데이터 기준입니다.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <RankingCard
            title="변화 상위"
            description="최근 변화가 크게 보이는 아티스트입니다."
            items={risingRanking.slice(0, 5)}
            valueType="change"
          />

          <RankingCard
            title="관심량 상위"
            description="최근 관심량 지표가 크게 잡힌 아티스트입니다."
            items={volumeRanking.slice(0, 5)}
            valueType="volume"
          />

          <RankingCard
            title="팬덤 규모 상위"
            description="FANDEX 미리보기 데이터에서 팬덤 규모가 크게 잡힌 아티스트입니다."
            items={fanCapRanking.slice(0, 5)}
            valueType="fanCap"
          />
        </div>

        <ArtistList items={fanCapRanking} />
      </section>
    </main>
  );
}

type RankingItem = ReturnType<typeof getArtistRankingRowsV4>[number];
type RankingItemWithIssue = RankingItem & {
  issueBadge: IssueBadge;
};

function RankingCard({
  title,
  description,
  items,
  valueType,
}: {
  title: string;
  description: string;
  items: RankingItemWithIssue[];
  valueType: 'change' | 'volume' | 'fanCap';
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const isUp = item.changeRate >= 0;

          return (
            <Link
              key={item.artistId}
              href={`/artists/${item.artistId}`}
              className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-400/50 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50 text-sm font-black text-cyan-700">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">
                      {item.nameEn}
                    </p>
                    <p className="font-mono text-xs text-slate-500">
                      {item.ticker} / {item.agency}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <IssueBadgeChip badge={item.issueBadge} />
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {valueType === 'change' && (
                    <>
                      <p
                        className={`font-mono text-lg font-black ${
                        isUp ? 'text-red-500' : 'text-blue-500'
                        }`}
                      >
                        {isUp ? '+' : ''}
                        {item.changeRate.toFixed(2)}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.price.toFixed(2)} FDX
                      </p>
                    </>
                  )}

                  {valueType === 'volume' && (
                    <>
                      <p className="font-mono text-lg font-black text-purple-500">
                        {formatNumber(item.volume)}
                      </p>
                      <p className="text-xs text-slate-500">관심량</p>
                    </>
                  )}

                  {valueType === 'fanCap' && (
                    <>
                      <p className="font-mono text-lg font-black text-cyan-600">
                        {formatLargeNumber(item.fanCap)}
                      </p>
                      <p className="text-xs text-slate-500">팬덤 규모</p>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ArtistList({ items }: { items: RankingItemWithIssue[] }) {
  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black">팬덤 규모 기준 아티스트 목록</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            FANDEX 등록/추적 아티스트를 팬덤 규모 지표 기준으로 정렬했습니다.
            실제 공식 순위는 아닙니다.
          </p>
        </div>

        <Link
          href="/compare"
          className="w-fit rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:border-cyan-300 hover:text-cyan-600"
        >
          아티스트 비교
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">팬덤 규모 순위</th>
              <th className="px-4 py-3">아티스트</th>
              <th className="px-4 py-3">이슈 신호</th>
              <th className="px-4 py-3">소속사</th>
              <th className="px-4 py-3 text-right">현재 FANDEX 주가</th>
              <th className="px-4 py-3 text-right">변화</th>
              <th className="px-4 py-3 text-right">관심량</th>
              <th className="px-4 py-3 text-right">팬덤 규모</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {items.map((item, index) => {
              const isUp = item.changeRate >= 0;

              return (
                <tr key={item.artistId} className="hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <span className="font-mono font-black text-cyan-600">
                      #{index + 1}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <Link
                      href={`/artists/${item.artistId}`}
                      className="font-black text-slate-950 hover:text-cyan-600"
                    >
                      {item.nameEn}
                    </Link>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {item.ticker}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <IssueBadgeChip badge={item.issueBadge} />
                  </td>

                  <td className="px-4 py-4 text-slate-600">{item.agency}</td>

                  <td className="px-4 py-4 text-right font-mono font-black">
                    {item.price.toFixed(2)}
                  </td>

                  <td
                    className={`px-4 py-4 text-right font-mono font-black ${
                      isUp ? 'text-red-500' : 'text-blue-500'
                    }`}
                  >
                    {isUp ? '+' : ''}
                    {item.changeRate.toFixed(2)}%
                  </td>

                  <td className="px-4 py-4 text-right font-mono text-slate-600">
                    {formatNumber(item.volume)}
                  </td>

                  <td className="px-4 py-4 text-right font-mono font-black text-cyan-600">
                    {formatLargeNumber(item.fanCap)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IssueBadgeChip({ badge }: { badge: IssueBadge }) {
  const toneClass = {
    positive: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
    watch: 'border-purple-200 bg-purple-50 text-purple-700',
    risk: 'border-blue-200 bg-blue-50 text-blue-700',
  }[badge.tone];

  return (
    <span
      className={`inline-flex w-fit whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-black ${toneClass}`}
    >
      {getIssueBadgeLabel(badge)}
    </span>
  );
}
