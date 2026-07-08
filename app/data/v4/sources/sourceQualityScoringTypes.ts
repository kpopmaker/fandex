import type {
  FandexSourceContentType,
  FandexSourceProvider,
  FandexSourceVariableSignalKey,
} from './sourceIngestionTypes';

export type FandexSourceQualityGrade =
  | 'excellent'
  | 'good'
  | 'watch'
  | 'weak'
  | 'blocked';

export type FandexSourceQualityFactor =
  | 'trust'
  | 'relevance'
  | 'engagement'
  | 'freshness'
  | 'sentiment'
  | 'provider'
  | 'warning';

export type FandexSourceQualityFactorScores = Record<
  FandexSourceQualityFactor,
  number
>;

export type FandexSourceItemQualityScore = {
  sourceId: string;
  provider: FandexSourceProvider;
  artistIds: string[];
  contentType: FandexSourceContentType;
  qualityScore: number;
  qualityGrade: FandexSourceQualityGrade;
  factorScores: FandexSourceQualityFactorScores;
  warnings: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceCandidateQualityScore = {
  candidateKey: string;
  sourceId: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  candidateScore: number;
  confidenceScore: number;
  sourceQualityScore: number;
  blendedQualityScore: number;
  qualityGrade: FandexSourceQualityGrade;
  warnings: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceQualityScoringSummary = {
  sourceItemCount: number;
  candidateCount: number;
  averageSourceQualityScore: number;
  averageCandidateQualityScore: number;
  excellentCount: number;
  goodCount: number;
  watchCount: number;
  weakCount: number;
  blockedCount: number;
  warningCount: number;
  topSourceIds: string[];
  weakSourceIds: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
