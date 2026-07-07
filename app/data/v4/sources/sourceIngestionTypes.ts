import type { FandexVariableKey } from '../metrics/fandexMetricTypes';

export type FandexSourceProvider =
  | 'news'
  | 'youtube'
  | 'social'
  | 'search'
  | 'music'
  | 'album'
  | 'brand'
  | 'event'
  | 'community'
  | 'manual-preview';

export type FandexSourceContentType =
  | 'article'
  | 'video'
  | 'social-post'
  | 'search-trend'
  | 'chart-snapshot'
  | 'album-sales'
  | 'brand-campaign'
  | 'event-schedule'
  | 'community-signal'
  | 'risk-note';

export type FandexSourceTrustLevel = 'high' | 'medium' | 'low' | 'preview';

export type FandexSourceSentiment =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'mixed'
  | 'unknown';

export type FandexSourceVariableSignalKey = FandexVariableKey;

export type FandexNormalizedSourceItem = {
  sourceId: string;
  provider: FandexSourceProvider;
  sourceUrl?: string;
  sourceName: string;
  title: string;
  summary: string;
  publishedAt: string;
  collectedAt: string;
  artistIds: string[];
  contentType: FandexSourceContentType;
  language: string;
  country: string;
  trustLevel: FandexSourceTrustLevel;
  relevanceScore: number;
  engagementScore: number;
  sentiment: FandexSourceSentiment;
  categories: string[];
  rawKeywordHints: string[];
  note?: string;
};

export type FandexSourceVariableSignalCandidate = {
  candidateId: string;
  sourceId: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  candidateScore: number;
  confidence: FandexSourceTrustLevel;
  evidenceLabel: string;
  reason: string;
  previewOnly: true;
};

export type FandexSourceIngestionSummary = {
  sourceItemCount: number;
  artistCount: number;
  candidateCount: number;
  providerCounts: Record<FandexSourceProvider, number>;
  variableCounts: Record<FandexSourceVariableSignalKey, number>;
  trustLevelCounts: Record<FandexSourceTrustLevel, number>;
  latestCollectedAt: string | null;
  previewOnly: true;
};

export type FandexSourceIngestionShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'duplicate-source-id'
    | 'missing-artist-ids'
    | 'invalid-variable-key'
    | 'invalid-relevance-score'
    | 'invalid-engagement-score'
    | 'invalid-candidate-score';
  message: string;
  sourceId?: string;
  candidateId?: string;
};

export type FandexSourceIngestionShapeCheckResult = {
  isValid: boolean;
  sourceItemCount: number;
  candidateCount: number;
  issues: FandexSourceIngestionShapeCheckIssue[];
};
