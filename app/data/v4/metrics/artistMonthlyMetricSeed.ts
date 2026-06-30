import {
  artistIndexChartProfiles,
  type ArtistIndexChartProfile,
  type ArtistIndexHistoryPoint,
} from '../charts/artistIndexChartData';
import { artistMetadata } from '../charts/artistMetadata';
import { FANDEX_METRIC_MONTHS, getFandexMetricMonthByLabel } from './fandexMetricMonths';
import type {
  ArtistMonthlyMetricPoint,
  ArtistMonthlyMetricVariables,
  MetricQuality,
  MetricSourceType,
} from './fandexMetricTypes';

function getMetricQuality(profile: ArtistIndexChartProfile): MetricQuality {
  return profile.coverageStatus;
}

function getMetricSourceType(
  profile: ArtistIndexChartProfile,
): MetricSourceType {
  if (profile.coverageStatus === 'tracked') {
    return 'manual_seed';
  }

  return 'preview_signal';
}

function createVariablesFromChartPoint(
  point: ArtistIndexHistoryPoint,
): ArtistMonthlyMetricVariables {
  return {
    music: point.musicAlbumPoint,
    album: point.musicAlbumPoint,
    sns: point.snsFandomPoint,
    news: point.newsIssuePoint,
    fandom: point.snsFandomPoint,
    brand: point.brandFitPoint,
    activity: point.comebackActivityPoint,
    momentum: point.growthMomentumPoint,
    adjustment: point.riskAdjustmentPoint,
  };
}

function createMetricPoint(
  profile: ArtistIndexChartProfile,
  point: ArtistIndexHistoryPoint,
): ArtistMonthlyMetricPoint | null {
  const month = getFandexMetricMonthByLabel(point.date);

  if (!month) {
    return null;
  }

  return {
    artistId: profile.artistId,
    month: month.month,
    label: month.label,
    fandexPoint: point.fandexPoint,
    variables: createVariablesFromChartPoint(point),
    sourceType: getMetricSourceType(profile),
    quality: getMetricQuality(profile),
    updatedAt: profile.lastUpdated,
  };
}

export function createArtistMonthlyMetricSeed(): ArtistMonthlyMetricPoint[] {
  const profileById = new Map(
    artistIndexChartProfiles.map((profile) => [profile.artistId, profile]),
  );

  return artistMetadata.flatMap((artist) => {
    const profile = profileById.get(artist.artistId);

    if (!profile) {
      return [];
    }

    return profile.history
      .map((point) => createMetricPoint(profile, point))
      .filter((point): point is ArtistMonthlyMetricPoint => Boolean(point));
  });
}

export const artistMonthlyMetricSeed = createArtistMonthlyMetricSeed();

export const metricSeedMonthLabels = FANDEX_METRIC_MONTHS.map(
  (month) => month.label,
);
