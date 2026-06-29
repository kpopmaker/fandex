import {
  createIssueSignalCandidate,
  mapCandidateToIssueSignalDraft,
  type IssueRawSourceItem,
  type IssueRawSourceType,
  type IssueSignalCandidate,
  type IssueSourceAdapter,
  type IssueSourceAdapterCapability,
  type IssueSourceAdapterContext,
  type IssueSourceAdapterResult,
  type IssueSourceAdapterSmokeCheckResult,
  type IssueSourceNormalizationWarning,
} from './issueSourceAdapter';
import {
  issueSourceFixtureRawItems,
  mockIssueSourceFetchedAt,
} from './issueSourceFixtures';
import type { IssueCategory, IssueSignal } from './types';

const mockAdapterSourceTypes: IssueRawSourceType[] = [
  'news_article',
  'press_release',
  'official_social',
  'youtube_video',
  'chart_event',
  'tour_event',
  'brand_event',
  'manual_curation',
];

const issueCategories: readonly IssueCategory[] = [
  'comeback_announcement',
  'album_release',
  'chart_record',
  'music_show_win',
  'tour_announcement',
  'sold_out_event',
  'brand_deal',
  'award_win',
  'viral_moment',
  'fandom_growth',
  'member_issue',
  'contract_issue',
  'legal_issue',
  'health_issue',
  'controversy',
  'hiatus_announcement',
  'enlistment',
  'disbandment_rumor',
  'agency_issue',
];

const categoryByRawSourceType: Record<IssueRawSourceType, IssueCategory> = {
  news_article: 'viral_moment',
  press_release: 'comeback_announcement',
  official_social: 'viral_moment',
  youtube_video: 'fandom_growth',
  chart_event: 'chart_record',
  tour_event: 'tour_announcement',
  album_event: 'album_release',
  brand_event: 'brand_deal',
  community_signal: 'viral_moment',
  manual_curation: 'member_issue',
};

const mockIssueSourceAdapterCapabilities: IssueSourceAdapterCapability[] =
  mockAdapterSourceTypes.map((sourceType) => ({
    sourceType,
    supportsRealtime: false,
    supportsBackfill: false,
    supportsFixtureInput: true,
    producesSignalDrafts: true,
    requiresExternalNetwork: false,
    requiresSupabase: false,
  }));

export const mockIssueSourceAdapterContext: IssueSourceAdapterContext = {
  asOf: mockIssueSourceFetchedAt,
  defaultExpiresAt: '2026-06-30T00:00:00.000Z',
  defaultLifecycleStage: 'breaking',
  defaultDecaySpeed: 'medium',
};

function isIssueCategory(value: unknown): value is IssueCategory {
  return typeof value === 'string' && issueCategories.includes(value as IssueCategory);
}

function inferIssueCategory(rawItem: IssueRawSourceItem): IssueCategory {
  const metadataCategory = rawItem.metadata?.issueCategory;

  if (isIssueCategory(metadataCategory)) {
    return metadataCategory;
  }

  return categoryByRawSourceType[rawItem.sourceType];
}

function getArtistIds(rawItem: IssueRawSourceItem): string[] {
  return rawItem.artistIds?.filter((artistId) => artistId.trim().length > 0) ?? [];
}

function createMissingArtistWarning(
  rawItem: IssueRawSourceItem,
): IssueSourceNormalizationWarning {
  return {
    sourceId: rawItem.sourceId,
    severity: 'blocking',
    code: 'missing_artist',
    message: 'Mock source item could not be mapped to a FANDEX artist id.',
  };
}

export function normalizeMockIssueSourceItems(
  rawItems: IssueRawSourceItem[] = issueSourceFixtureRawItems,
  context: IssueSourceAdapterContext = mockIssueSourceAdapterContext,
): IssueSourceAdapterResult {
  const candidates: IssueSignalCandidate[] = [];
  const warnings: IssueSourceNormalizationWarning[] = [];

  rawItems.forEach((rawItem) => {
    const artistIds = getArtistIds(rawItem);

    if (artistIds.length === 0) {
      warnings.push(createMissingArtistWarning(rawItem));
      return;
    }

    artistIds.forEach((artistId) => {
      const category = inferIssueCategory(rawItem);
      const candidate = createIssueSignalCandidate({
        rawItem,
        artistId,
        category,
        context,
        sentimentScore: rawItem.rawSentimentScore,
        impactScore: rawItem.rawSentimentScore,
        volatilityImpact: rawItem.rawEngagementScore,
        confidenceImpact: Math.round((rawItem.reliabilityHint ?? 0.5) * 20 - 8),
        lifecycleStage:
          rawItem.sourceType === 'press_release' || rawItem.sourceType === 'chart_event'
            ? 'confirmed'
            : context.defaultLifecycleStage,
        decaySpeed:
          rawItem.sourceType === 'youtube_video' || rawItem.sourceType === 'official_social'
            ? 'fast'
            : context.defaultDecaySpeed,
        duplicateGroupId: `${artistId}:${category}:${rawItem.sourceId}`,
        officiallyConfirmed: ['press_release', 'official_social', 'chart_event'].includes(
          rawItem.sourceType,
        ),
      });

      candidates.push(candidate);
      warnings.push(...candidate.warnings);
    });
  });

  return {
    adapterName: mockIssueSourceAdapter.sourceName,
    capabilities: mockIssueSourceAdapterCapabilities,
    candidates,
    warnings,
    rawItemCount: rawItems.length,
  };
}

export function mapMockCandidatesToIssueSignals(
  candidates: IssueSignalCandidate[],
  context: IssueSourceAdapterContext = mockIssueSourceAdapterContext,
): IssueSignal[] {
  void context;

  return candidates
    .filter((candidate) => candidate.mappingStatus !== 'skipped')
    .map((candidate) => mapCandidateToIssueSignalDraft(candidate));
}

export function runMockIssueSourceAdapterSmokeCheck(
  rawItems: IssueRawSourceItem[] = issueSourceFixtureRawItems,
  context: IssueSourceAdapterContext = mockIssueSourceAdapterContext,
): IssueSourceAdapterSmokeCheckResult {
  const result = normalizeMockIssueSourceItems(rawItems, context);
  const signalDrafts = mapMockCandidatesToIssueSignals(result.candidates, context);
  const sourceTypes = Array.from(
    new Set(rawItems.map((rawItem) => rawItem.sourceType)),
  ).sort();

  return {
    adapterName: mockIssueSourceAdapter.sourceName,
    rawItemCount: result.rawItemCount,
    candidateCount: result.candidates.length,
    signalDraftCount: signalDrafts.length,
    warningCount: result.warnings.length,
    sourceTypes,
    hasBlockingErrors: result.warnings.some(
      (warning) => warning.severity === 'blocking',
    ),
  };
}

export const mockIssueSourceAdapter: IssueSourceAdapter = {
  sourceName: 'mock_issue_source_adapter',
  sourceType: 'manual_curation',
  supportsRealtime: false,
  supportsBackfill: false,
  capabilities: mockIssueSourceAdapterCapabilities,
  normalize: normalizeMockIssueSourceItems,
  mapToIssueSignals: mapMockCandidatesToIssueSignals,
};
