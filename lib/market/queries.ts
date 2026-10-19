import 'server-only';

import { MARKET_ARTISTS, findArtist, type MarketArtist } from './artists';
import {
  changeRate,
  dataSource,
  fanCap,
  getSnapshot,
  indexSeries,
  indexValue,
  priceSeries,
  variableSeries,
} from './engine';
import { PERIODS, SLOTS_PER_DAY, currentSlot, getPeriod, slotTime } from './time';
import type {
  PeriodId,
  RawVariablePoints,
  SeriesPoint,
  VariableSeriesPoint,
} from './types';
import { ENABLED_VARIABLES, POSITIVE_COEFFICIENT_SUM, type VariableId } from './variables';

export type ArtistQuote = {
  id: string;
  name: string;
  koreanName: string;
  ticker: string;
  groupType: MarketArtist['groupType'];
  rank: number;
  price: number;
  score: number;
  fanCap: number;
  change: Record<'1D' | '1W' | '1M', number>;
  raw: RawVariablePoints;
  rawChange1W: RawVariablePoints;
};

export type MarketMeta = {
  asOf: number;
  dataKind: 'mock' | 'live';
  artistCount: number;
};

const QUOTE_PERIODS = ['1D', '1W', '1M'] as const;

function rawDelta(current: RawVariablePoints, previous: RawVariablePoints): RawVariablePoints {
  const delta = {} as RawVariablePoints;
  for (const key of Object.keys(current) as VariableId[]) {
    delta[key] = current[key] - previous[key];
  }
  return delta;
}

function buildQuotes(slot: number): ArtistQuote[] {
  const quotes = MARKET_ARTISTS.map((artist) => {
    const now = getSnapshot(artist.id, slot);
    const weekAgo = getSnapshot(artist.id, slot - getPeriod('1W').span);
    const change = {} as ArtistQuote['change'];
    for (const period of QUOTE_PERIODS) {
      change[period] = changeRate(
        now.price,
        getSnapshot(artist.id, slot - getPeriod(period).span).price,
      );
    }
    return {
      id: artist.id,
      name: artist.name,
      koreanName: artist.koreanName,
      ticker: artist.ticker,
      groupType: artist.groupType,
      rank: 0,
      price: now.price,
      score: now.score,
      fanCap: fanCap(artist.id, slot),
      change,
      raw: now.raw,
      rawChange1W: rawDelta(now.raw, weekAgo.raw),
    };
  });

  quotes
    .sort((a, b) => b.price - a.price)
    .forEach((quote, index) => {
      quote.rank = index + 1;
    });

  return quotes;
}

function meta(slot: number): MarketMeta {
  return {
    asOf: slotTime(slot),
    dataKind: dataSource.kind,
    artistCount: MARKET_ARTISTS.length,
  };
}

function seriesByPeriod(build: (period: PeriodId) => SeriesPoint[]) {
  return Object.fromEntries(PERIODS.map((period) => [period.id, build(period.id)])) as Record<
    PeriodId,
    SeriesPoint[]
  >;
}

export type NewsItem = {
  artistId: string;
  artistName: string;
  title: string;
  count: number;
  change: number;
};

export type HomeModel = {
  meta: MarketMeta;
  index: {
    value: number;
    change1D: number;
    changeAmount1D: number;
    series: Record<PeriodId, SeriesPoint[]>;
    advancers: number;
    decliners: number;
    totalFanCap: number;
  };
  news: NewsItem[];
  topOverall: SparkQuote[];
  topRising: SparkQuote[];
};

export type SparkQuote = ArtistQuote & { spark: number[] };

function withSpark(quote: ArtistQuote, slot: number): SparkQuote {
  return {
    ...quote,
    spark: priceSeries(quote.id, slot, '1D').map((point) => point.value),
  };
}

export function getHomeModel(): HomeModel {
  const slot = currentSlot();
  const quotes = buildQuotes(slot);
  const value = indexValue(slot);
  const previous = indexValue(slot - SLOTS_PER_DAY);

  const news = MARKET_ARTISTS.map((artist) => {
    const count = dataSource.getNewsCount(artist.id, slot);
    const before = dataSource.getNewsCount(artist.id, slot - SLOTS_PER_DAY);
    return {
      artistId: artist.id,
      artistName: artist.koreanName,
      title: `${artist.koreanName} 관련 기사 ${count}건`,
      count,
      change: changeRate(count, before),
    };
  })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    meta: meta(slot),
    index: {
      value,
      change1D: changeRate(value, previous),
      changeAmount1D: value - previous,
      series: seriesByPeriod((period) => indexSeries(slot, period)),
      advancers: quotes.filter((quote) => quote.change['1D'] > 0).length,
      decliners: quotes.filter((quote) => quote.change['1D'] < 0).length,
      totalFanCap: quotes.reduce((sum, quote) => sum + quote.fanCap, 0),
    },
    news,
    topOverall: quotes.slice(0, 5).map((quote) => withSpark(quote, slot)),
    topRising: [...quotes]
      .sort((a, b) => b.change['1D'] - a.change['1D'])
      .slice(0, 5)
      .map((quote) => withSpark(quote, slot)),
  };
}

export type RankingModel = {
  meta: MarketMeta;
  quotes: ArtistQuote[];
};

export function getRankingModel(): RankingModel {
  const slot = currentSlot();
  return { meta: meta(slot), quotes: buildQuotes(slot).slice(0, 100) };
}

export type DirectoryModel = {
  meta: MarketMeta;
  quotes: ArtistQuote[];
};

export function getDirectoryModel(): DirectoryModel {
  const slot = currentSlot();
  return { meta: meta(slot), quotes: buildQuotes(slot) };
}

export type VariableBreakdown = {
  id: VariableId;
  raw: number;
  change1W: number;
  contribution: number;
  rank: number;
};

export type ArtistDetailModel = {
  meta: MarketMeta;
  quote: ArtistQuote;
  totalArtists: number;
  priceSeries: Record<PeriodId, SeriesPoint[]>;
  variableSeries: Record<PeriodId, VariableSeriesPoint[]>;
  breakdown: VariableBreakdown[];
  periodHigh: Record<PeriodId, number>;
  periodLow: Record<PeriodId, number>;
};

export function getArtistDetailModel(artistId: string): ArtistDetailModel | null {
  const artist = findArtist(artistId);
  if (!artist) return null;

  const slot = currentSlot();
  const quotes = buildQuotes(slot);
  const quote = quotes.find((item) => item.id === artist.id);
  if (!quote) return null;

  const prices = seriesByPeriod((period) => priceSeries(artist.id, slot, period));
  const variables = Object.fromEntries(
    PERIODS.map((period) => [period.id, variableSeries(artist.id, slot, period.id)]),
  ) as Record<PeriodId, VariableSeriesPoint[]>;

  const breakdown = ENABLED_VARIABLES.map((variable) => {
    const ordered = [...quotes].sort((a, b) =>
      variable.penalty ? a.raw[variable.id] - b.raw[variable.id] : b.raw[variable.id] - a.raw[variable.id],
    );
    const contribution =
      ((variable.penalty ? -1 : 1) * quote.raw[variable.id] * variable.coefficient) /
      POSITIVE_COEFFICIENT_SUM;
    return {
      id: variable.id,
      raw: quote.raw[variable.id],
      change1W: quote.rawChange1W[variable.id],
      contribution,
      rank: ordered.findIndex((item) => item.id === artist.id) + 1,
    };
  });

  const periodHigh = {} as Record<PeriodId, number>;
  const periodLow = {} as Record<PeriodId, number>;
  for (const period of PERIODS) {
    const values = prices[period.id].map((point) => point.value);
    periodHigh[period.id] = Math.max(...values);
    periodLow[period.id] = Math.min(...values);
  }

  return {
    meta: meta(slot),
    quote,
    totalArtists: quotes.length,
    priceSeries: prices,
    variableSeries: variables,
    breakdown,
    periodHigh,
    periodLow,
  };
}

export type CompareEntry = {
  quote: ArtistQuote;
  priceSeries: Record<PeriodId, SeriesPoint[]>;
};

export type CompareModel = {
  meta: MarketMeta;
  entries: CompareEntry[];
  options: { id: string; name: string; koreanName: string; ticker: string }[];
};

export const MAX_COMPARE = 3;

export function getCompareModel(ids: string[]): CompareModel {
  const slot = currentSlot();
  const quotes = buildQuotes(slot);
  const unique = [...new Set(ids)].filter((id) => findArtist(id)).slice(0, MAX_COMPARE);

  return {
    meta: meta(slot),
    entries: unique.map((id) => ({
      quote: quotes.find((quote) => quote.id === id)!,
      priceSeries: seriesByPeriod((period) => priceSeries(id, slot, period)),
    })),
    options: MARKET_ARTISTS.map((artist) => ({
      id: artist.id,
      name: artist.name,
      koreanName: artist.koreanName,
      ticker: artist.ticker,
    })),
  };
}
