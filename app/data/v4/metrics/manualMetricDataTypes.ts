import type { FandexVariableKey } from './fandexMetricTypes';

export type ManualMetricDataSourceType =
  | 'manual'
  | 'preview'
  | 'external-source';

export type ManualMetricValueStatus =
  | 'valid'
  | 'zero'
  | 'missing'
  | 'invalid';

export type MetricDataOrigin =
  | 'preview-seed'
  | 'manual-input'
  | 'external-source';

export type MetricDataReadiness = 'ready' | 'partial' | 'empty' | 'invalid';

export type ManualMetricDataPoint = {
  artistId: string;
  metricKey: FandexVariableKey;
  month: string;
  value: number | null;
  sourceType: ManualMetricDataSourceType;
  sourceLabel?: string;
  note?: string;
  updatedAt?: string;
};

export type ManualMetricValidationIssue = {
  severity: 'error' | 'warning';
  code:
    | 'unknown-artist'
    | 'unknown-metric'
    | 'unknown-month'
    | 'invalid-value'
    | 'duplicate-point'
    | 'missing-value';
  message: string;
  artistId?: string;
  metricKey?: string;
  month?: string;
};

export type ManualMetricValidationResult = {
  isValid: boolean;
  issues: ManualMetricValidationIssue[];
};

export type ManualMetricDuplicatePoint = {
  artistId: string;
  metricKey: FandexVariableKey;
  month: string;
  count: number;
};
