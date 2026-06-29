import type {
  IssueCategory,
  IssueDecaySpeed,
  IssueLifecycleStage,
  IssueSignal,
  IssueSourceType,
} from './types';

export type IssueRawSourceType =
  | 'news_article'
  | 'press_release'
  | 'official_social'
  | 'youtube_video'
  | 'chart_event'
  | 'tour_event'
  | 'album_event'
  | 'brand_event'
  | 'community_signal'
  | 'manual_curation';

export type IssueSourceReliabilityProfile = {
  sourceType: IssueRawSourceType;
  defaultIssueSourceType: IssueSourceType;
  defaultReliabilityWeight: number;
  requiresManualReview: boolean;
  allowNegativeImpact: boolean;
};

export type IssueSourceAdapterCapability = {
  sourceType: IssueRawSourceType;
  supportsRealtime: boolean;
  supportsBackfill: boolean;
  supportsFixtureInput: boolean;
  producesSignalDrafts: boolean;
  requiresExternalNetwork: boolean;
  requiresSupabase: boolean;
  requiresCredentials?: boolean;
  credentialKeys?: string[];
  providerDocsUrl?: string;
  rateLimitNotes?: string;
  plannedOnly?: boolean;
};

export type IssueSourceAdapterWarningSeverity = 'info' | 'warning' | 'blocking';

export type IssueSignalCandidateMappingStatus =
  | 'mapped'
  | 'mapped_with_warnings'
  | 'skipped';

export type IssueRawSourceItem = {
  sourceId: string;
  sourceType: IssueRawSourceType;
  sourceName: string;
  sourceUrl?: string;
  title: string;
  summary?: string;
  bodySnippet?: string;
  publishedAt: string;
  fetchedAt: string;
  language?: string;
  country?: string;
  artistNames?: string[];
  artistIds?: string[];
  keywords?: string[];
  author?: string;
  rawSentimentScore?: number;
  rawEngagementScore?: number;
  reliabilityHint?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export type IssueSourceAdapterContext = {
  asOf: string;
  defaultExpiresAt: string;
  defaultLifecycleStage?: IssueLifecycleStage;
  defaultDecaySpeed?: IssueDecaySpeed;
  sourceReliabilityProfiles?: Partial<
    Record<IssueRawSourceType, IssueSourceReliabilityProfile>
  >;
};

export type IssueSourceNormalizationWarning = {
  sourceId: string;
  severity?: IssueSourceAdapterWarningSeverity;
  code:
    | 'missing_artist'
    | 'missing_title'
    | 'invalid_date'
    | 'low_reliability'
    | 'manual_review_required'
    | 'unknown_category';
  message: string;
};

export type IssueSignalCandidate = {
  candidateId: string;
  rawSourceId: string;
  artistId: string;
  category: IssueCategory;
  title: string;
  sourceType: IssueSourceType;
  publishedAt: string;
  detectedAt: string;
  sentimentScore: number;
  impactScore: number;
  volatilityImpact: number;
  confidenceImpact: number;
  reliabilityWeight: number;
  lifecycleStage: IssueLifecycleStage;
  expiresAt: string;
  decaySpeed?: IssueDecaySpeed;
  duplicateGroupId?: string;
  officiallyConfirmed?: boolean;
  relatedKeywords?: string[];
  rawSourceType: IssueRawSourceType;
  sourceName: string;
  sourceUrl?: string;
  warnings: IssueSourceNormalizationWarning[];
  mappingStatus?: IssueSignalCandidateMappingStatus;
};

export type IssueSourceAdapterResult = {
  candidates: IssueSignalCandidate[];
  warnings: IssueSourceNormalizationWarning[];
  rawItemCount: number;
  adapterName?: string;
  capabilities?: IssueSourceAdapterCapability[];
};

export type IssueSourceAdapterSmokeCheckResult = {
  adapterName: string;
  rawItemCount: number;
  candidateCount: number;
  signalDraftCount: number;
  warningCount: number;
  sourceTypes: IssueRawSourceType[];
  hasBlockingErrors: boolean;
};

export type IssueSourceAdapter = {
  sourceName: string;
  sourceType: IssueRawSourceType;
  supportsRealtime: boolean;
  supportsBackfill: boolean;
  capabilities?: IssueSourceAdapterCapability[];
  normalize(
    rawItems: IssueRawSourceItem[],
    context: IssueSourceAdapterContext,
  ): IssueSourceAdapterResult;
  mapToIssueSignals(
    candidates: IssueSignalCandidate[],
    context: IssueSourceAdapterContext,
  ): IssueSignal[];
};

export type IssueSignalCandidateInput = {
  rawItem: IssueRawSourceItem;
  artistId: string;
  category: IssueCategory;
  context: IssueSourceAdapterContext;
  sentimentScore?: number;
  impactScore?: number;
  volatilityImpact?: number;
  confidenceImpact?: number;
  lifecycleStage?: IssueLifecycleStage;
  decaySpeed?: IssueDecaySpeed;
  duplicateGroupId?: string;
  officiallyConfirmed?: boolean;
};

const defaultReliabilityProfiles: Record<
  IssueRawSourceType,
  IssueSourceReliabilityProfile
> = {
  news_article: {
    sourceType: 'news_article',
    defaultIssueSourceType: 'entertainment_media',
    defaultReliabilityWeight: 0.72,
    requiresManualReview: false,
    allowNegativeImpact: true,
  },
  press_release: {
    sourceType: 'press_release',
    defaultIssueSourceType: 'official_agency',
    defaultReliabilityWeight: 1,
    requiresManualReview: false,
    allowNegativeImpact: true,
  },
  official_social: {
    sourceType: 'official_social',
    defaultIssueSourceType: 'artist_official',
    defaultReliabilityWeight: 0.95,
    requiresManualReview: false,
    allowNegativeImpact: true,
  },
  youtube_video: {
    sourceType: 'youtube_video',
    defaultIssueSourceType: 'social_trend',
    defaultReliabilityWeight: 0.55,
    requiresManualReview: false,
    allowNegativeImpact: false,
  },
  chart_event: {
    sourceType: 'chart_event',
    defaultIssueSourceType: 'chart_platform',
    defaultReliabilityWeight: 0.88,
    requiresManualReview: false,
    allowNegativeImpact: false,
  },
  tour_event: {
    sourceType: 'tour_event',
    defaultIssueSourceType: 'official_agency',
    defaultReliabilityWeight: 0.92,
    requiresManualReview: false,
    allowNegativeImpact: false,
  },
  album_event: {
    sourceType: 'album_event',
    defaultIssueSourceType: 'official_agency',
    defaultReliabilityWeight: 0.95,
    requiresManualReview: false,
    allowNegativeImpact: false,
  },
  brand_event: {
    sourceType: 'brand_event',
    defaultIssueSourceType: 'major_media',
    defaultReliabilityWeight: 0.85,
    requiresManualReview: false,
    allowNegativeImpact: false,
  },
  community_signal: {
    sourceType: 'community_signal',
    defaultIssueSourceType: 'community_rumor',
    defaultReliabilityWeight: 0.28,
    requiresManualReview: true,
    allowNegativeImpact: false,
  },
  manual_curation: {
    sourceType: 'manual_curation',
    defaultIssueSourceType: 'major_media',
    defaultReliabilityWeight: 0.8,
    requiresManualReview: true,
    allowNegativeImpact: true,
  },
};

function safeTimestamp(value: string | undefined, fallback: string): string {
  const timestamp = new Date(value ?? '').getTime();

  return Number.isFinite(timestamp) ? value ?? fallback : fallback;
}

export function clampIssueScore(
  value: number | null | undefined,
  fallback = 0,
): number {
  const safeValue = typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;

  return Math.min(Math.max(safeValue, 0), 100);
}

export function clampIssueSentiment(
  value: number | null | undefined,
  fallback = 0,
): number {
  const safeValue = typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;

  return Math.min(Math.max(safeValue, -100), 100);
}

export function getDefaultReliabilityBySourceType(
  sourceType: IssueRawSourceType,
  overrides?: IssueSourceAdapterContext['sourceReliabilityProfiles'],
): IssueSourceReliabilityProfile {
  return overrides?.[sourceType] ?? defaultReliabilityProfiles[sourceType];
}

export function normalizeSourceReliability(
  rawItem: IssueRawSourceItem,
  context: IssueSourceAdapterContext,
): number {
  const profile = getDefaultReliabilityBySourceType(
    rawItem.sourceType,
    context.sourceReliabilityProfiles,
  );
  const hintedReliability =
    typeof rawItem.reliabilityHint === 'number'
      ? rawItem.reliabilityHint
      : profile.defaultReliabilityWeight;

  return clampIssueScore(hintedReliability * 100) / 100;
}

export function createIssueSignalCandidate({
  rawItem,
  artistId,
  category,
  context,
  sentimentScore,
  impactScore,
  volatilityImpact,
  confidenceImpact,
  lifecycleStage,
  decaySpeed,
  duplicateGroupId,
  officiallyConfirmed,
}: IssueSignalCandidateInput): IssueSignalCandidate {
  const profile = getDefaultReliabilityBySourceType(
    rawItem.sourceType,
    context.sourceReliabilityProfiles,
  );
  const warnings: IssueSourceNormalizationWarning[] = [];
  const title = rawItem.title.trim();
  const publishedAt = safeTimestamp(rawItem.publishedAt, context.asOf);
  const detectedAt = safeTimestamp(rawItem.fetchedAt, context.asOf);

  if (!artistId) {
    warnings.push({
      sourceId: rawItem.sourceId,
      severity: 'warning',
      code: 'missing_artist',
      message: 'No artist id was mapped for the raw source item.',
    });
  }

  if (!title) {
    warnings.push({
      sourceId: rawItem.sourceId,
      severity: 'warning',
      code: 'missing_title',
      message: 'Raw source item has no title after trimming.',
    });
  }

  if (profile.requiresManualReview) {
    warnings.push({
      sourceId: rawItem.sourceId,
      severity: 'info',
      code: 'manual_review_required',
      message: 'Source type should be reviewed before production scoring.',
    });
  }

  return {
    candidateId: `${rawItem.sourceType}:${rawItem.sourceId}:${artistId}`,
    rawSourceId: rawItem.sourceId,
    artistId,
    category,
    title: title || 'Untitled issue source item',
    sourceType: profile.defaultIssueSourceType,
    publishedAt,
    detectedAt,
    sentimentScore: clampIssueSentiment(
      sentimentScore ?? rawItem.rawSentimentScore,
    ),
    impactScore: Math.min(
      Math.max(clampIssueSentiment(impactScore ?? rawItem.rawSentimentScore), -60),
      60,
    ),
    volatilityImpact: Math.min(
      clampIssueScore(volatilityImpact ?? rawItem.rawEngagementScore),
      60,
    ),
    confidenceImpact: Math.min(
      Math.max(clampIssueSentiment(confidenceImpact, 0), -40),
      40,
    ),
    reliabilityWeight: normalizeSourceReliability(rawItem, context),
    lifecycleStage: lifecycleStage ?? context.defaultLifecycleStage ?? 'breaking',
    expiresAt: safeTimestamp(context.defaultExpiresAt, context.asOf),
    decaySpeed: decaySpeed ?? context.defaultDecaySpeed ?? 'medium',
    duplicateGroupId:
      duplicateGroupId ??
      `${artistId}:${category}:${title.toLowerCase().replace(/\s+/g, '-')}`,
    officiallyConfirmed:
      officiallyConfirmed ??
      ['press_release', 'official_social'].includes(rawItem.sourceType),
    relatedKeywords: rawItem.keywords,
    rawSourceType: rawItem.sourceType,
    sourceName: rawItem.sourceName,
    sourceUrl: rawItem.sourceUrl,
    warnings,
    mappingStatus: warnings.length > 0 ? 'mapped_with_warnings' : 'mapped',
  };
}

export function mapCandidateToIssueSignalDraft(
  candidate: IssueSignalCandidate,
): IssueSignal {
  return {
    issueId: candidate.candidateId,
    artistId: candidate.artistId,
    category: candidate.category,
    title: candidate.title,
    sourceType: candidate.sourceType,
    sentimentScore: candidate.sentimentScore,
    reliabilityWeight: candidate.reliabilityWeight,
    publishedAt: candidate.publishedAt,
    detectedAt: candidate.detectedAt,
    lifecycleStage: candidate.lifecycleStage,
    impactScore: candidate.impactScore,
    volatilityImpact: candidate.volatilityImpact,
    confidenceImpact: candidate.confidenceImpact,
    expiresAt: candidate.expiresAt,
    decaySpeed: candidate.decaySpeed,
    duplicateGroupId: candidate.duplicateGroupId,
    officiallyConfirmed: candidate.officiallyConfirmed,
    relatedKeywords: candidate.relatedKeywords,
  };
}
