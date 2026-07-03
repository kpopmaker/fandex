import type { FandexVariableKey } from './fandexMetricTypes';

export type MetricScoreOrigin =
  | 'preview-seed'
  | 'manual-input'
  | 'external-source';

export type MetricPipelineStage =
  | 'raw-input'
  | 'validated'
  | 'normalized'
  | 'weighted'
  | 'display-ready';

export type MetricScoreStatus =
  | 'ready'
  | 'zero'
  | 'missing'
  | 'invalid'
  | 'fallback';

export type ResolvedMetricScore = {
  artistId: string;
  metricKey: FandexVariableKey;
  month: string;
  value: number | null;
  score: number | null;
  weight: number;
  weightedScore: number | null;
  origin: MetricScoreOrigin;
  status: MetricScoreStatus;
  stage: MetricPipelineStage;
  sourceLabel?: string;
};

export type ArtistMonthlyResolvedMetricScores = {
  artistId: string;
  month: string;
  scores: ResolvedMetricScore[];
  totalWeightedScore: number;
  availableScoreCount: number;
  missingScoreCount: number;
  zeroScoreCount: number;
};

export type MetricScoringPipelineSummary = {
  totalPoints: number;
  previewSeedPoints: number;
  manualInputPoints: number;
  externalSourcePoints: number;
  readyPoints: number;
  zeroPoints: number;
  missingPoints: number;
  invalidPoints: number;
};
