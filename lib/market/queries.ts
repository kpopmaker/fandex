import 'server-only';

import { MARKET_ARTISTS, findArtist, type GroupType } from './artists';
import { METRIC_ORDER, type HistoryEntry, type LatestGroup, type NewsHeadline } from './dataFiles';
import { loadMarketDataset, type MarketDataset } from './dataset';
import {
  changeRate,
  closeAgo,
  entryAgo,
  indexSeries,
  priceOf,
  priceSeries,
  rawFromEntry,
  variableSeries,
} from './engine';
import { explainVariable, type Metrics, type VariableDetail } from './explain';
import { compactToTime, dayNumberToTime, loadMusicHistory } from './musicHistory';
import type { MusicHistoryFile } from './musicHistoryFile';
import { scoreFromRaw, priceFromScore, unpackRaw } from './formula';
import { DAY_MS, PERIODS } from './time';
import type { PeriodId, RawVariablePoints, SeriesPoint, VariableSeriesPoint } from './types';
import { ENABLED_VARIABLES, POSITIVE_COEFFICIENT_SUM, type VariableId } from './variables';

export type ChangeSet = Record<'1D' | '1W' | '1M', number | null>;

export type ArtistQuote = {
  id: string;
  name: string;
  koreanName: string;
  ticker: string;
  groupType: GroupType;
  generation: number | null;
  debutYear: number | null;
  rank: number;
  price: number;
  score: number;
  fanCap: number;
  change: ChangeSet;
  raw: RawVariablePoints;
  rawChange1W: RawVariablePoints | null;
};

export type MarketMeta = {
  asOf: number;
  startedAt: number;
  artistCount: number;
  /** 마지막 수집이 1시간 넘게 지났는지 */
  stale: boolean;
};

const QUOTE_PERIODS = ['1D', '1W', '1M'] as const;

function rawDelta(current: RawVariablePoints, previous: RawVariablePoints): RawVariablePoints {
  const delta = {} as RawVariablePoints;
  for (const key of Object.keys(current) as VariableId[]) delta[key] = current[key] - previous[key];
  return delta;
}

/** 데뷔 전 시점이면 true(데뷔일을 모르면 false) */
function beforeDebut(artistId: string, time: number): boolean {
  const debutAt = findArtist(artistId)?.debutAt ?? null;
  return debutAt !== null && time < debutAt;
}

/** 차트는 데뷔일부터: 데뷔 전 시점은 뺀다 */
function sinceDebut<T extends { time: number }>(artistId: string, points: T[]): T[] {
  return points.filter((point) => !beforeDebut(artistId, point.time));
}

function buildQuotes(dataset: MarketDataset): ArtistQuote[] {
  // 등락률은 그날 마감 기준: 1일 = 전일 마감, 1주 = 7일 전 마감, 1달 = 30일 전 마감
  const before = {
    '1D': closeAgo(dataset, 1),
    '1W': closeAgo(dataset, 7),
    '1M': closeAgo(dataset, 30),
  } as Record<(typeof QUOTE_PERIODS)[number], HistoryEntry | null>;

  const quotes: ArtistQuote[] = [];
  for (const artist of MARKET_ARTISTS) {
    const latest = dataset.latest.groups[artist.id];
    if (!latest) continue;
    const raw = unpackRaw(latest.raw);
    const score = scoreFromRaw(raw);
    const price = priceFromScore(score);
    const weekAgoEntry = before['1W'] && !beforeDebut(artist.id, before['1W'].t) ? before['1W'] : null;
    const weekAgoRaw = weekAgoEntry ? rawFromEntry(dataset, weekAgoEntry, artist.id) : null;

    const change = {} as ChangeSet;
    for (const period of QUOTE_PERIODS) {
      const entry = before[period];
      change[period] =
        entry && !beforeDebut(artist.id, entry.t) ? changeRate(price, priceOf(dataset, entry, artist.id)) : null;
    }

    quotes.push({
      id: artist.id,
      name: artist.name,
      koreanName: artist.koreanName,
      ticker: artist.ticker,
      groupType: artist.groupType,
      generation: artist.generation,
      debutYear: artist.debutYear,
      rank: 0,
      price,
      score,
      fanCap: price * latest.float,
      change,
      raw,
      rawChange1W: weekAgoRaw ? rawDelta(raw, weekAgoRaw) : null,
    });
  }

  quotes
    .sort((a, b) => b.price - a.price)
    .forEach((quote, index) => {
      quote.rank = index + 1;
    });
  return quotes;
}

function meta(dataset: MarketDataset): MarketMeta {
  return {
    asOf: dataset.latest.asOf,
    startedAt: dataset.latest.startedAt,
    artistCount: Object.keys(dataset.latest.groups).length,
    stale: Date.now() - dataset.latest.generatedAt > 60 * 60 * 1000,
  };
}

function seriesByPeriod<T>(build: (period: PeriodId) => T[]) {
  return Object.fromEntries(PERIODS.map((period) => [period.id, build(period.id)])) as Record<PeriodId, T[]>;
}

// ─────────────────────────── 홈 ───────────────────────────

export type NewsItem = {
  artistId: string;
  artistName: string;
  count: number;
  headline: NewsHeadline | null;
};

export type SparkQuote = ArtistQuote & { spark: number[] };

export type HomeModel = {
  meta: MarketMeta;
  index: {
    value: number;
    change1D: number | null;
    series: Record<PeriodId, SeriesPoint[]>;
    advancers: number;
    decliners: number;
    totalFanCap: number;
  };
  news: NewsItem[];
  topOverall: SparkQuote[];
  topRising: SparkQuote[];
};

export async function getHomeModel(): Promise<HomeModel> {
  const dataset = await loadMarketDataset();
  const quotes = buildQuotes(dataset);
  const value = dataset.latest.kmi;
  const dayAgo = closeAgo(dataset, 1);

  const withSpark = (quote: ArtistQuote): SparkQuote => ({
    ...quote,
    spark: priceSeries(dataset, quote.id, '1D').map((point) => point.value),
  });

  const news = Object.entries(dataset.latest.groups)
    .map(([id, group]: [string, LatestGroup]) => ({
      artistId: id,
      artistName: findArtist(id)?.koreanName ?? id,
      count: group.news24h,
      headline: group.headlines[0] ?? null,
    }))
    // 제목에 그룹명이 들어간 기사가 있는 그룹만(순위와 기사 내용이 어긋나지 않게)
    .filter((item) => item.count > 0 && item.headline !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const rising = quotes
    .filter((quote) => quote.change['1D'] !== null)
    .sort((a, b) => (b.change['1D'] ?? 0) - (a.change['1D'] ?? 0))
    .slice(0, 5);

  return {
    meta: meta(dataset),
    index: {
      value,
      change1D: dayAgo ? changeRate(value, dayAgo.k) : null,
      series: seriesByPeriod((period) => indexSeries(dataset, period)),
      advancers: quotes.filter((quote) => (quote.change['1D'] ?? 0) > 0).length,
      decliners: quotes.filter((quote) => (quote.change['1D'] ?? 0) < 0).length,
      totalFanCap: quotes.reduce((sum, quote) => sum + quote.fanCap, 0),
    },
    news,
    topOverall: quotes.slice(0, 5).map(withSpark),
    topRising: rising.map(withSpark),
  };
}

// ─────────────────────────── 랭킹·목록 ───────────────────────────

export type RankingModel = { meta: MarketMeta; quotes: ArtistQuote[] };

export async function getRankingModel(): Promise<RankingModel> {
  const dataset = await loadMarketDataset();
  return { meta: meta(dataset), quotes: buildQuotes(dataset) };
}

export type DirectoryModel = { meta: MarketMeta; quotes: ArtistQuote[] };

export async function getDirectoryModel(): Promise<DirectoryModel> {
  const dataset = await loadMarketDataset();
  return { meta: meta(dataset), quotes: buildQuotes(dataset) };
}

// ─────────────────────────── 아티스트 상세 ───────────────────────────

export type VariableBreakdown = {
  id: VariableId;
  raw: number;
  change1W: number | null;
  contribution: number;
  rank: number;
  basis: string;
  detail: VariableDetail;
};

export type ArtistDetailModel = {
  meta: MarketMeta;
  quote: ArtistQuote;
  totalArtists: number;
  priceSeries: Record<PeriodId, SeriesPoint[]>;
  variableSeries: Record<PeriodId, VariableSeriesPoint[]>;
  breakdown: VariableBreakdown[];
  headlines: NewsHeadline[];
  chartTracks: { rank: number; title: string }[];
  /** 데뷔 시각(차트는 이때부터) */
  debutAt: number | null;
  /** 데뷔일(또는 기록 시작일)부터의 장기 음원 기록. 아직 없으면 null */
  musicHistory: MusicHistoryModel | null;
};

export type MusicHistoryModel = {
  source: string;
  unit: 'day' | 'week';
  /** 이 그룹 차트의 시작(데뷔일과 기록 시작일 중 늦은 날) */
  from: number;
  /** 기록이 데뷔일보다 늦게 시작해 데뷔 직후가 빠졌는지 */
  startsAfterDebut: boolean;
  archiveFrom: number;
  archiveTo: number;
  /** 주마다 하루 평균 차트 점수 */
  points: SeriesPoint[];
  firstChart: number | null;
  chartDays: number;
  best: { rank: number; title: string; date: number } | null;
};

function buildMusicHistory(file: MusicHistoryFile | null, artistId: string, debutAt: number | null): MusicHistoryModel | null {
  if (!file?.from || !file.to || !file.weeks.length) return null;
  const archiveFrom = compactToTime(file.from);
  const from = Math.max(archiveFrom, debutAt ?? archiveFrom);
  const group = file.groups[artistId];
  const values = new Map((group?.w ?? []).map(([week, value]) => [week, value / 10]));
  const points = file.weeks
    .map((week) => ({ time: dayNumberToTime(week), value: values.get(week) ?? 0 }))
    // 데뷔 주부터
    .filter((point) => point.time + 7 * DAY_MS > from);
  if (points.length < 2) return null;
  return {
    source: file.source,
    unit: file.unit ?? 'day',
    from,
    startsAfterDebut: debutAt !== null && archiveFrom > debutAt,
    archiveFrom,
    archiveTo: compactToTime(file.to),
    points,
    firstChart: group ? compactToTime(group.first) : null,
    chartDays: group?.chartDays ?? 0,
    best: group ? { rank: group.best.rank, title: group.best.title, date: compactToTime(group.best.date) } : null,
  };
}

/** 하루 기록에 남은 근거 숫자 */
function metricsAt(dataset: MarketDataset, entry: HistoryEntry | null, id: string): Metrics | null {
  const position = dataset.index.get(id);
  if (!entry?.m || position === undefined) return null;
  const offset = position * METRIC_ORDER.length;
  if (entry.m[offset] === undefined) return null;
  const metrics = {} as Metrics;
  METRIC_ORDER.forEach((key, index) => {
    const value = entry.m![offset + index];
    metrics[key] = value === undefined || value < 0 ? null : value;
  });
  return metrics;
}

function latestMetrics(group: LatestGroup): Metrics {
  return {
    chartPoints: group.chartPoints,
    news7d: group.news7d ?? null,
    brand30d: group.brand30d,
    comeback30d: group.comeback30d ?? null,
    risk30d: group.risk30d ?? null,
    listenersK: group.listeners ? Math.round(group.listeners / 1000) : null,
    subscribersK: group.subscribers ? Math.round(group.subscribers / 1000) : null,
    news30d: group.news30d ?? null,
    playcountK: group.playcount ? Math.round(group.playcount / 1000) : null,
    viewsM: group.views ? Math.round(group.views / 1_000_000) : null,
  };
}

function compactCount(value: number): string {
  if (value >= 10_000) return `${(value / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`;
  return value.toLocaleString('ko-KR');
}

function basisText(id: VariableId, group: LatestGroup, hasMomentumBase: boolean): string {
  switch (id) {
    case 'musicAlbum':
      return group.chartPoints > 0 ? `차트 점수 ${group.chartPoints}점` : 'TOP100 밖 · 누적 재생·조회';
    case 'newsIssue':
      return group.news7d === undefined ? `24시간 기사 ${group.news24h}건` : `7일 기사 ${group.news7d}건`;
    case 'snsFandom': {
      const parts = [
        group.listeners ? `청취자 ${compactCount(group.listeners)}` : null,
        group.subscribers ? `구독자 ${compactCount(group.subscribers)}` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : '확인된 채널 없음';
    }
    case 'brandFit':
      return `30일 기사 ${group.brand30d}건`;
    case 'comebackActivity':
      return group.comeback30d !== undefined ? `30일 기사 ${group.comeback30d}건` : `14일 기사 ${group.comeback14d ?? 0}건`;
    case 'growthMomentum':
      return hasMomentumBase ? '7일 전 대비' : '비교 기록 쌓는 중';
    case 'riskAdjustment':
      return group.risk30d !== undefined ? `30일 기사 ${group.risk30d}건` : `7일 기사 ${group.risk7d ?? 0}건`;
  }
}

export async function getArtistDetailModel(artistId: string): Promise<ArtistDetailModel | null> {
  const artist = findArtist(artistId);
  if (!artist) return null;
  const [dataset, musicFile] = await Promise.all([loadMarketDataset(), loadMusicHistory()]);
  const quotes = buildQuotes(dataset);
  const quote = quotes.find((item) => item.id === artist.id);
  const group = dataset.latest.groups[artist.id];
  if (!quote || !group) return null;

  const hasMomentumBase = closeAgo(dataset, 1) !== null || entryAgo(dataset, DAY_MS) !== null;
  const weekAgo = closeAgo(dataset, 7);
  const weekAgoUsable = weekAgo && !beforeDebut(artist.id, weekAgo.t) ? weekAgo : null;
  const weekAgoRaw = weekAgoUsable ? rawFromEntry(dataset, weekAgoUsable, artist.id) : null;
  const weekAgoMetrics = metricsAt(dataset, weekAgoUsable, artist.id);
  const metrics = latestMetrics(group);
  const chartTracks = dataset.latest.chart
    .filter((entry) => entry.artistId === artist.id)
    .map((entry) => ({ rank: entry.rank, title: entry.title }));

  const breakdown = ENABLED_VARIABLES.map((variable) => {
    const ordered = [...quotes].sort((a, b) =>
      variable.penalty ? a.raw[variable.id] - b.raw[variable.id] : b.raw[variable.id] - a.raw[variable.id],
    );
    return {
      id: variable.id,
      raw: quote.raw[variable.id],
      change1W: quote.rawChange1W ? quote.rawChange1W[variable.id] : null,
      contribution:
        ((variable.penalty ? -1 : 1) * quote.raw[variable.id] * variable.coefficient) /
        POSITIVE_COEFFICIENT_SUM,
      rank: ordered.findIndex((item) => item.id === artist.id) + 1,
      basis: basisText(variable.id, group, hasMomentumBase),
      detail: explainVariable({
        id: variable.id,
        raw: quote.raw,
        weekAgoRaw,
        metrics,
        weekAgoMetrics,
        weekAgoBackfilled: weekAgoUsable?.b === 1,
        group,
        chartTracks,
      }),
    };
  });

  return {
    meta: meta(dataset),
    quote,
    totalArtists: quotes.length,
    priceSeries: seriesByPeriod((period) => sinceDebut(artist.id, priceSeries(dataset, artist.id, period))),
    variableSeries: seriesByPeriod((period) => sinceDebut(artist.id, variableSeries(dataset, artist.id, period))),
    breakdown,
    headlines: group.headlines,
    chartTracks,
    debutAt: artist.debutAt,
    musicHistory: buildMusicHistory(musicFile, artist.id, artist.debutAt),
  };
}

// ─────────────────────────── 비교 ───────────────────────────

export type CompareEntry = {
  quote: ArtistQuote;
  priceSeries: Record<PeriodId, SeriesPoint[]>;
};

export type CompareModel = {
  meta: MarketMeta;
  entries: CompareEntry[];
  options: { id: string; name: string; koreanName: string; ticker: string; searchText: string }[];
};

export const MAX_COMPARE = 3;

export async function getCompareModel(ids: string[]): Promise<CompareModel> {
  const dataset = await loadMarketDataset();
  const quotes = buildQuotes(dataset);
  const unique = [...new Set(ids)]
    .filter((id) => quotes.some((quote) => quote.id === id))
    .slice(0, MAX_COMPARE);

  return {
    meta: meta(dataset),
    entries: unique.map((id) => ({
      quote: quotes.find((quote) => quote.id === id)!,
      priceSeries: seriesByPeriod((period) => sinceDebut(id, priceSeries(dataset, id, period))),
    })),
    options: MARKET_ARTISTS.map((artist) => ({
      id: artist.id,
      name: artist.name,
      koreanName: artist.koreanName,
      ticker: artist.ticker,
      searchText: artist.searchText,
    })),
  };
}
