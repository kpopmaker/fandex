import type { ArtistStockVariableKey } from '../charts/artistIndexChartData';

export type FandexVariableKey =
  | 'music'
  | 'album'
  | 'youtube'
  | 'sns'
  | 'search'
  | 'news'
  | 'fandom'
  | 'brand'
  | 'activity'
  | 'momentum'
  | 'adjustment';

export type MetricSourceType =
  | 'manual_seed'
  | 'preview_signal'
  | 'future_api'
  | 'derived';

export type MetricQuality = 'tracked' | 'partial' | 'preview';

export type FandexMetricMonth = {
  month: string;
  label: string;
  displayLabel: string;
};

export type ArtistMonthlyMetricVariables = Partial<
  Record<FandexVariableKey, number>
>;

export type ArtistMonthlyMetricPoint = {
  artistId: string;
  month: string;
  label: string;
  fandexPoint: number;
  variables: ArtistMonthlyMetricVariables;
  sourceType: MetricSourceType;
  quality: MetricQuality;
  updatedAt?: string;
};

export type FandexMetricDefinition = {
  key: FandexVariableKey;
  label: string;
  shortLabel: string;
  description: string;
  category: string;
  defaultWeight: number;
  higherIsBetter: boolean;
  legacyChartKey?: ArtistStockVariableKey;
};

export type ArtistMetricBreakdownItem = {
  key: FandexVariableKey;
  label: string;
  shortLabel: string;
  score: number;
  defaultWeight: number;
  description: string;
  category: string;
};

export type ArtistMetricBreakdown = {
  artistId: string;
  month: string;
  label: string;
  fandexPoint: number;
  items: ArtistMetricBreakdownItem[];
};

export type CompareMetricBreakdownArtist = {
  artistId: string;
  displayName: string;
  ticker: string;
  items: ArtistMetricBreakdownItem[];
  topItems: ArtistMetricBreakdownItem[];
};

export type CompareMetricBreakdown = {
  month: string;
  label: string;
  artists: CompareMetricBreakdownArtist[];
  metricKeys: FandexVariableKey[];
};

export type MetricCoverageSummary = {
  artistCount: number;
  metricPointCount: number;
  monthCount: number;
  trackedArtistCount: number;
  partialArtistCount: number;
  previewArtistCount: number;
  startMonth: string;
  endMonth: string;
};
