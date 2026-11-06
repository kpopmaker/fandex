import type { RawScores } from './formula';

export type RawVariablePoints = RawScores;

export type PeriodId = '1D' | '1W' | '1M' | '3M' | '1Y';

export type SeriesPoint = {
  time: number;
  value: number;
};

export type VariableSeriesPoint = {
  time: number;
} & RawVariablePoints;
