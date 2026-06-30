import { artistMetadata } from '../charts/artistMetadata';
import {
  FANDEX_METRIC_END_MONTH,
  FANDEX_METRIC_MONTHS,
  FANDEX_METRIC_START_MONTH,
} from './fandexMetricMonths';
import { artistMonthlyMetricSeed } from './artistMonthlyMetricSeed';
import type {
  ArtistMonthlyMetricPoint,
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
