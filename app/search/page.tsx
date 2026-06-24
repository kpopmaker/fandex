'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { artistUniverseV4 } from '../data/v4/artistUniverse';
import { getArtistPriceHistoryV4 } from '../data/v4/artistPriceHistory';
import { getArtistRankingRowsV4 } from '../data/v4/artistRanking';
import {
  calculateFandexV1Score,
  createFandexV1SampleInputs,
  toFiniteNumber,
  type FandexV1Input,
  type FandexV1Result,
} from '../data/v4/scoring/fandexV1Scoring';

const freeCategoryGateItems = [
  {
    titleKo: '개요',
    titleEn: 'Overview',
    status: 'Free',
    descriptionKo: '아티스트명, 티커, 소속사 등 최소한의 기본 정보입니다.',
    descriptionEn: 'Artist name, ticker, and minimal agency or group context.',
  },
  {
    titleKo: 'FANDEX 누적 점수',
    titleEn: 'FANDEX Cumulative Point',
    status: 'Preview',
    descriptionKo: '카테고리 포인트를 누적한 공개 종합 점수만 제공합니다.',
    descriptionEn: 'Shows only the public total from accumulated category points.',
  },
  {
    titleKo: '이슈 톤 미리보기',
    titleEn: 'Issue Tone Preview',
    status: 'Preview',
    descriptionKo: '이슈 분위기를 한 줄로만 확인할 수 있습니다.',
    descriptionEn: 'One-line issue tone only. Full reasoning stays gated.',
  },
];

const suggestionQueries = ['IVE', 'RIIZE', 'NewJeans', 'aespa'];

const rankingRows = getArtistRankingRowsV4();
const sampleInputsByArtistId = new Map(
  createFandexV1SampleInputs().map((input) => [input.artistId, input]),
);
const fallbackLockedCategories = calculateFandexV1Score(
  createFandexV1SampleInputs()[0]!,
).lockedCategories;

const searchableArtists = artistUniverseV4.map((artist) => {
  const ranking = rankingRows.find((row) => row.artistId === artist.id);
  const history = getArtistPriceHistoryV4(artist.id);
  const latest = history[history.length - 1];
  const issueBreakdown =
    latest?.issueScoreBreakdown ?? latest?.scoreBreakdown.issueScoreBreakdown;
  const fallbackScore = ranking?.price ?? latest?.price ?? 50;
  const newsIssueScore = issueBreakdown?.issueScore ?? 50;
  const riskPenaltyScore = issueBreakdown?.controversyRiskScore ?? 0;
  const confidenceScore = issueBreakdown?.confidenceScore ?? 55;
  const changeRate = ranking?.changeRate ?? latest?.changeRate ?? 0;
  const fandexV1 = calculateFandexV1Score(
    sampleInputsByArtistId.get(artist.id) ??
      createFandexV1InputFromPreview({
        artistId: artist.id,
        artistName: artist.nameEn,
        fallbackScore,
        priorityScore: artist.collection.priorityScore,
        newsIssueScore,
        riskPenaltyScore,
        confidenceScore,
        changeRate,
      }),
  );

  return {
    id: artist.id,
    ticker: artist.ticker,
    name: artist.nameEn,
    agency: artist.agency,
    generation: artist.generation,
    fandomName: artist.fandomName,
    aliases: artist.profile.aliases,
    changeRate,
    pointBand: fandexV1.pointBand,
    issueTone: fandexV1.issueTone,
    fandexV1,
    signalSummary: createSignalSummary(fandexV1.issueTone),
  };
});

export default function SearchPreviewPage() {
  const [query, setQuery] = useState('IVE');
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');
  const results = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return searchableArtists.slice(0, 4);
    }

    return searchableArtists
      .filter((artist) =>
        [artist.name, artist.ticker, artist.id, artist.agency, ...artist.aliases]
          .filter(Boolean)
          .some((value) =>
            value.toLocaleLowerCase('en-US').includes(normalizedQuery),
          ),
      )
      .slice(0, 6);
  }, [normalizedQuery]);
  const displayedLockedCategories =
    results[0]?.fandexV1.lockedCategories ?? fallbackLockedCategories;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-7 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">
                <LangText en="FANDEX Search Preview" ko="FANDEX 무료 검색 미리보기" />
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                <LangText
                  en="Start with a cumulative artist signal check"
                  ko="상한 없는 FANDEX 누적 점수로 아티스트 신호를 확인하세요"
                />
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                <LangText
                  en="Free search shows a limited cumulative point preview: artist identity, FANDEX public point, point band, and issue tone. Category raw points, coefficients, contributions, risk detail, and AI interpretation are reserved for subscriber research."
                  ko="무료 검색에서는 아티스트 기본 정보, FANDEX 공개 누적 점수, 포인트 밴드, 이슈 톤만 제한적으로 제공합니다. 카테고리별 raw point, coefficient, 누적 기여도, 리스크 세부 감점, AI 해석은 구독자 리서치에서 제공됩니다."
                />
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/research"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
              >
                <LangText en="Explore Subscriber Research" ko="유료 리서치 카테고리 보기" />
              </Link>
              <Link
                href="/sample-report"
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
              >
                <LangText en="View Sample Report" ko="샘플 리포트 보기" />
              </Link>
              <Link
                href="/#waitlist-form"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                <LangText en="Join Early Access" ko="Early Access 신청" />
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="text-sm font-black text-slate-700">
              <LangText en="Search artist, group, or ticker" ko="아티스트, 그룹, 티커 검색" />
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="IVE, RIIZE, NewJeans"
                type="search"
                value={query}
              />
            </label>
            <button
              type="button"
              className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
            >
              <LangText en="Search Preview" ko="무료 검색 미리보기" />
            </button>
          </div>

          {results.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-600">
                <LangText
                  en="No preview match yet. Try one of these sample searches:"
                  ko="아직 일치하는 미리보기가 없습니다. 아래 예시 검색어를 사용해 보세요."
                />
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestionQueries.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                    onClick={() => setQuery(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {results.map((artist) => (
                <ArtistPreviewCard key={artist.id} artist={artist} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              <LangText en="Subscriber Research Lock" ko="구독자 리서치 잠금" />
            </p>
            <h2 className="mt-2 text-2xl font-black">
              <LangText
                en="Locked cumulative point breakdown"
                ko="잠금 처리된 누적 포인트 breakdown"
              />
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              <LangText
                en="Free users see only the total cumulative point, point band, and issue tone. Category raw point x coefficient results, contribution, and risk details are designed for subscriber research."
                ko="무료 사용자는 종합 누적 점수, 포인트 밴드, 이슈 톤만 확인합니다. 카테고리별 raw point x coefficient 결과, 기여도, 리스크 세부 감점은 구독자 리서치에서 제공되는 구조입니다."
              />
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {freeCategoryGateItems.map((item) => (
              <article
                key={item.titleEn}
                className={`rounded-2xl border p-5 shadow-sm ${
                  item.status === 'Locked'
                    ? 'border-slate-200 bg-slate-50/80'
                    : 'border-cyan-200 bg-white'
                }`}
              >
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                  <StatusText status={item.status} />
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  <LangText en={item.titleEn} ko={item.titleKo} />
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  <LangText en={item.descriptionEn} ko={item.descriptionKo} />
                </p>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  <LangText
                    en="Included in limited free search"
                    ko="제한된 무료 검색에 포함"
                  />
                </p>
              </article>
            ))}
            {displayedLockedCategories.map((category) => (
              <article
                key={category.key}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm"
              >
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white shadow-sm">
                  <LangText en="Locked" ko="잠금" />
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  <LangText en={category.labelEn} ko={category.labelKo} />
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  <LangText
                    en={category.descriptionEn}
                    ko={category.descriptionKo}
                  />
                </p>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-cyan-700">
                  <LangText
                    en="Subscriber-only detail score"
                    ko="구독자 전용 세부 점수"
                  />
                </p>
                <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                  <LangText
                    en="Category raw point x coefficient results are hidden in free preview."
                    ko="카테고리별 raw point x coefficient 결과는 무료 미리보기에서 숨깁니다."
                  />
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/research"
                    className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-xs font-black text-cyan-700 shadow-sm hover:bg-cyan-50"
                  >
                    <LangText en="See Research Plans" ko="리서치 플랜 보기" />
                  </Link>
                  <Link
                    href="/#waitlist-form"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
                  >
                    <LangText en="Join Early Access" ko="Early Access 신청" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-bold leading-6 text-slate-500">
            <LangText
              en="FANDEX Search Preview uses local preview data only. It does not log in users, process payment, call APIs, fetch external data, or check subscription status. Cumulative points are beta preview indicators, not live-data claims."
              ko="FANDEX 무료 검색 미리보기는 로컬 preview 데이터만 사용합니다. 로그인, 결제, API 호출, 외부 데이터 fetch, 구독 상태 확인은 수행하지 않습니다. 누적 점수는 베타 preview 지표이며 실제 데이터 기반 단정이 아닙니다."
            />
          </p>
        </section>
      </section>
    </main>
  );
}

function ArtistPreviewCard({
  artist,
}: {
  artist: (typeof searchableArtists)[number];
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
            {artist.ticker}
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {artist.name}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {artist.agency}
            {artist.generation ? ` / ${artist.generation}` : ''}
            {artist.fandomName ? ` / ${artist.fandomName}` : ''}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
          <LangText en="Free preview" ko="무료 미리보기" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PreviewMetric
          label={<LangText en="FANDEX cumulative point" ko="FANDEX 누적 점수" />}
          value={`${artist.fandexV1.publicDisplayPoint.toLocaleString('ko-KR')} pt`}
        />
        <PreviewMetric
          label={<LangText en="Point band" ko="포인트 밴드" />}
          value={<PointBandText pointBand={artist.pointBand} />}
        />
        <PreviewMetric
          label={<LangText en="Issue tone" ko="이슈 톤 미리보기" />}
          value={<IssueToneText issueTone={artist.issueTone} />}
          valueClassName={getIssueToneClass(artist.issueTone)}
        />
      </div>

      <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold leading-6 text-slate-600">
        <LangText en={artist.signalSummary.en} ko={artist.signalSummary.ko} />
      </p>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-700">
        <LangText
          en="Detailed category scores are subscriber-only."
          ko="세부 카테고리별 점수는 구독자 전용입니다."
        />
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/sample-report"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
        >
          <LangText en="View Sample Report" ko="샘플 리포트 보기" />
        </Link>
        <Link
          href="/research"
          className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-cyan-400"
        >
          <LangText en="Explore Subscriber Research" ko="유료 리서치 카테고리 보기" />
        </Link>
      </div>
    </article>
  );
}

function PreviewMetric({
  label,
  value,
  valueClassName = 'text-slate-950',
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-black ${valueClassName}`}>{value}</p>
    </div>
  );
}

function getIssueToneClass(issueTone: string) {
  if (issueTone === 'Active Buzz' || issueTone === 'Momentum Rising') {
    return 'text-cyan-700';
  }

  if (issueTone === 'Risk Watch' || issueTone === 'Risk Dominant') {
    return 'text-blue-700';
  }

  return 'text-slate-700';
}

function createSignalSummary(issueTone: string) {
  return {
    en: `${issueTone} issue tone preview. Category raw points, coefficients, cumulative contributions, and AI interpretation are reserved for subscriber research.`,
    ko: `${getIssueToneKo(issueTone)} 이슈 톤 미리보기입니다. 카테고리별 raw point, coefficient, 누적 기여도, AI 해석은 구독자 리서치에서 제공됩니다.`,
  };
}

function createPointInput(
  rawPoint: number,
  coefficient: number,
  sourceCount: number,
  confidence: number,
) {
  return {
    rawPoint,
    coefficient,
    sourceCount,
    confidence,
  };
}

function createFandexV1InputFromPreview({
  artistId,
  artistName,
  fallbackScore,
  priorityScore,
  newsIssueScore,
  riskPenaltyScore,
  confidenceScore,
  changeRate,
}: {
  artistId: string;
  artistName: string;
  fallbackScore: number;
  priorityScore: number;
  newsIssueScore: number;
  riskPenaltyScore: number;
  confidenceScore: number;
  changeRate: number;
}): FandexV1Input {
  const confidence = toFiniteNumber(confidenceScore, 55);
  const basePoint = Math.max(toFiniteNumber(fallbackScore, 50), 0) * 18;
  const priorityPoint = Math.max(toFiniteNumber(priorityScore, 60), 0) * 14;
  const newsIssuePoint = Math.max(toFiniteNumber(newsIssueScore, 50), 0) * 16;
  const riskPoint = Math.max(toFiniteNumber(riskPenaltyScore, 0), 0) * 12;
  const growthMomentumPoint = Math.max(
    120 + toFiniteNumber(changeRate) * 80,
    0,
  );

  return {
    artistId,
    artistName,
    musicAlbum: createPointInput(basePoint, 1.25, 8, confidence),
    newsIssue: createPointInput(newsIssuePoint, 1.1, 10, confidence),
    snsFandom: createPointInput(
      (basePoint + priorityPoint) / 2,
      1.1,
      12,
      confidence,
    ),
    brandFit: createPointInput(
      Math.max(basePoint + 160 - riskPoint * 0.25, 0),
      0.9,
      5,
      confidence,
    ),
    comebackActivity: createPointInput(
      (basePoint + growthMomentumPoint) / 2,
      0.8,
      4,
      confidence,
    ),
    growthMomentum: createPointInput(growthMomentumPoint, 1, 6, confidence),
    riskPenalty: createPointInput(riskPoint, 1.4, 3, confidence),
    confidenceScore: confidence,
    updatedAt: '2026-06-24T00:00:00.000Z',
    sourceMode: 'mock',
  };
}

function StatusText({ status }: { status: string }) {
  if (status === 'Preview') {
    return <LangText en="Preview" ko="미리보기" />;
  }

  return <LangText en="Free" ko="무료" />;
}

function IssueToneText({ issueTone }: { issueTone: string }) {
  if (issueTone === 'Risk Dominant') {
    return <LangText en="Risk Dominant" ko="리스크 우위" />;
  }

  if (issueTone === 'Risk Watch') {
    return <LangText en="Risk Watch" ko="리스크 주시" />;
  }

  if (issueTone === 'Active Buzz') {
    return <LangText en="Active Buzz" ko="이슈 활성" />;
  }

  if (issueTone === 'Momentum Rising') {
    return <LangText en="Momentum Rising" ko="상승 모멘텀" />;
  }

  return <LangText en="Neutral Preview" ko="중립 미리보기" />;
}

function PointBandText({
  pointBand,
}: {
  pointBand: FandexV1Result['pointBand'];
}) {
  if (pointBand === 'Dominant Power') {
    return <LangText en="Dominant Power" ko="압도적 파워" />;
  }

  if (pointBand === 'High Power') {
    return <LangText en="High Power" ko="강한 파워" />;
  }

  if (pointBand === 'Rising Power') {
    return <LangText en="Rising Power" ko="상승세" />;
  }

  if (pointBand === 'Watch') {
    return <LangText en="Watch" ko="관찰 필요" />;
  }

  if (pointBand === 'Risk Negative') {
    return <LangText en="Risk Negative" ko="리스크 우위" />;
  }

  return <LangText en="Early Signal" ko="초기 신호" />;
}

function getIssueToneKo(issueTone: string) {
  if (issueTone === 'Risk Dominant') {
    return '리스크 우위';
  }

  if (issueTone === 'Risk Watch') {
    return '리스크 주시';
  }

  if (issueTone === 'Active Buzz') {
    return '이슈 활성';
  }

  if (issueTone === 'Momentum Rising') {
    return '상승 모멘텀';
  }

  return '중립';
}

function LangText({ ko, en }: { ko: string; en: string }) {
  return (
    <>
      <span className="inline [html[data-language='en']_&]:hidden">{ko}</span>
      <span className="hidden [html[data-language='en']_&]:inline">{en}</span>
    </>
  );
}
