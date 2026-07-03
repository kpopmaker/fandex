export type FandexSourceType =
  | 'news-issue'
  | 'youtube'
  | 'search-trend'
  | 'music-chart'
  | 'album-sales'
  | 'social';

export type FandexSourceStage =
  | 'planned'
  | 'adapter-ready'
  | 'manual-ready'
  | 'source-connected'
  | 'disabled';

export type FandexSourceDataOrigin =
  | 'preview-seed'
  | 'manual-input'
  | 'external-source';

export type SourceValidationSeverity = 'error' | 'warning';

export type SourceValidationIssue = {
  severity: SourceValidationSeverity;
  code:
    | 'unknown-artist'
    | 'unknown-source'
    | 'missing-title'
    | 'missing-date'
    | 'invalid-url'
    | 'invalid-score'
    | 'duplicate-source-item';
  message: string;
  artistId?: string;
  sourceType?: FandexSourceType;
  sourceId?: string;
};

export type SourceValidationResult = {
  isValid: boolean;
  issues: SourceValidationIssue[];
};

export type SourceAdapterReadiness = {
  sourceType: FandexSourceType;
  stage: FandexSourceStage;
  hasAdapter: boolean;
  hasSeedData: boolean;
  hasExternalConnection: boolean;
  itemCount: number;
  validItemCount: number;
  errorCount: number;
  warningCount: number;
};
