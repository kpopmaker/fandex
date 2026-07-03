import type { FandexSourceDataOrigin } from './sourceDataTypes';

export type NewsIssueSentiment =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'mixed'
  | 'unknown';

export type NewsIssueCategory =
  | 'comeback'
  | 'performance'
  | 'chart'
  | 'album'
  | 'global'
  | 'brand'
  | 'festival'
  | 'broadcast'
  | 'fan'
  | 'risk'
  | 'general';

export type NewsIssueSourceItem = {
  sourceId: string;
  artistId: string;
  title: string;
  summary?: string;
  publishedDate: string;
  sourceName?: string;
  sourceUrl?: string;
  category: NewsIssueCategory;
  sentiment: NewsIssueSentiment;
  issueScore?: number;
  origin: FandexSourceDataOrigin;
  note?: string;
};
