import { artistMetadata } from '../charts/artistMetadata';
import { FANDEX_METRIC_DEFINITIONS } from './fandexMetricDefinitions';
import {
  FANDEX_METRIC_END_MONTH,
  FANDEX_METRIC_MONTHS,
  FANDEX_METRIC_START_MONTH,
} from './fandexMetricMonths';
import { artistMonthlyMetricSeed } from './artistMonthlyMetricSeed';
import type {
  ArtistMetricBreakdown,
  ArtistMonthlyMetricPoint,
  CompareMetricBreakdown,
  CompareMetricBreakdownArtist,
  MetricCoverageSummary,
  MetricQuality,
} from './fandexMetricTypes';

const monthlyMetricsByArtistId = new Map<string, ArtistMonthlyMetricPoint[]>();

artistMonthlyMetricSeed.forEach((point) => {
  const currentPoints = monthlyMetricsByArtistId.get(point.artistId) ?? [];
  monthlyMetricsByArtistId.set(point.artistId, [...currentPoints, point]);
});

function normalizeArtistId(artistId: string) {
  return artistId.trim();
}

export function getArtistMonthlyMetrics(artistId: string) {
  const normalizedArtistId = normalizeArtistId(artistId);

  if (!normalizedArtistId) {
    return [];
  }

  return monthlyMetricsByArtistId.get(normalizedArtistId) ?? [];
}

export function getLatestArtistMonthlyMetric(artistId: string) {
  const points = getArtistMonthlyMetrics(artistId);

  return points[points.length - 1] ?? null;
}

export function getMetricPointForMonth(artistId: string, month: string) {
  const normalizedMonth = month.trim();

  if (!normalizedMonth) {
    return null;
  }

  return (
    getArtistMonthlyMetrics(artistId).find(
      (point) => point.month === normalizedMonth,
    ) ?? null
  );
}

function createMetricBreakdown(
  point: ArtistMonthlyMetricPoint | null,
): ArtistMetricBreakdown | null {
  if (!point) {
    return null;
  }

  return {
    artistId: point.artistId,
    month: point.month,
    label: point.label,
    fandexPoint: point.fandexPoint,
    items: FANDEX_METRIC_DEFINITIONS.map((definition) => ({
      key: definition.key,
      label: definition.label,
      shortLabel: definition.shortLabel,
      score: point.variables[definition.key] ?? 0,
      defaultWeight: definition.defaultWeight,
      description: definition.description,
      category: definition.category,
    })),
  };
}

export function getLatestArtistMetricBreakdown(artistId: string) {
  return createMetricBreakdown(getLatestArtistMonthlyMetric(artistId));
}

export function getArtistMetricBreakdownForMonth(
  artistId: string,
  month: string,
) {
  return createMetricBreakdown(getMetricPointForMonth(artistId, month));
}

function getTopMetricItems(items: ArtistMetricBreakdown['items']) {
  return [...items]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

export function getCompareMetricBreakdown(
  artistIds: string[],
): CompareMetricBreakdown {
  const uniqueArtistIds = Array.from(
    new Set(artistIds.map((artistId) => artistId.trim()).filter(Boolean)),
  ).slice(0, 5);
  const artists = uniqueArtistIds
    .map((artistId) => {
      const metadata = artistMetadata.find((artist) => artist.artistId === artistId);
      const breakdown = getLatestArtistMetricBreakdown(artistId);

      if (!metadata || !breakdown) {
        return null;
      }

      return {
        artistId,
        displayName: metadata.displayName,
        ticker: metadata.ticker,
        items: breakdown.items,
        topItems: getTopMetricItems(breakdown.items),
      };
    })
    .filter(
      (artist): artist is CompareMetricBreakdownArtist => Boolean(artist),
    );
  const firstBreakdown =
    uniqueArtistIds
      .map((artistId) => getLatestArtistMetricBreakdown(artistId))
      .find(Boolean) ?? null;

  return {
    month: firstBreakdown?.month ?? '',
    label: firstBreakdown?.label ?? '',
    artists,
    metricKeys: FANDEX_METRIC_DEFINITIONS.map((definition) => definition.key),
  };
}

export function getAllLatestArtistMetrics() {
  return artistMetadata
    .map((artist) => getLatestArtistMonthlyMetric(artist.artistId))
    .filter((point): point is ArtistMonthlyMetricPoint => Boolean(point));
}

function countByQuality(quality: MetricQuality) {
  return getAllLatestArtistMetrics().filter((point) => point.quality === quality)
    .length;
}

export function getMetricCoverageSummary(): MetricCoverageSummary {
  return {
    artistCount: artistMetadata.length,
    metricPointCount: artistMonthlyMetricSeed.length,
    monthCount: FANDEX_METRIC_MONTHS.length,
    trackedArtistCount: countByQuality('tracked'),
    partialArtistCount: countByQuality('partial'),
    previewArtistCount: countByQuality('preview'),
    startMonth: FANDEX_METRIC_START_MONTH,
    endMonth: FANDEX_METRIC_END_MONTH,
  };
}
