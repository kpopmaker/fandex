import {
  createIssueSignalCandidate,
  getDefaultReliabilityBySourceType,
  mapCandidateToIssueSignalDraft,
  type IssueRawSourceItem,
  type IssueSignalCandidate,
  type IssueSourceAdapter,
  type IssueSourceAdapterCapability,
  type IssueSourceAdapterContext,
  type IssueSourceAdapterResult,
} from './issueSourceAdapter';
import {
  naverNewsApiResponseFixtures,
  naverNewsFixtureFetchedAt,
  type NaverNewsApiResponseFixture,
} from './naverNewsIssueSourceFixtures';
import type { IssueCategory, IssueSignal } from './types';

export type NaverNewsSearchSort = 'sim' | 'date';

export type NaverNewsSearchRequestDraft = {
  query: string;
  display: number;
  start: number;
  sort: NaverNewsSearchSort;
};

export type NaverNewsApiItemDraft = {
  title?: string;
  originallink?: string;
  link?: string;
  description?: string;
  pubDate?: string;
};

export type NaverNewsApiResponseDraft = {
  lastBuildDate?: string;
  total?: number;
  start?: number;
  display?: number;
  items?: NaverNewsApiItemDraft[];
};

export type NaverNewsNormalizationOptions = {
  defaultLanguage?: string;
  defaultCountry?: string;
  fallbackSourceName?: string;
  maxKeywordCount?: number;
  stripHtml?: boolean;
};

export type NaverNewsAdapterWarning = {
  sourceId: string;
  severity: 'info' | 'warning' | 'error';
  code:
    | 'empty_title'
    | 'empty_description'
    | 'missing_source_url'
    | 'invalid_pub_date'
    | 'html_cleanup_applied'
    | 'entity_decode_applied'
    | 'fallback_source_url_used'
    | 'empty_items';
  message: string;
};

export type NaverNewsRawSourceMappingInput = {
  item: NaverNewsApiItemDraft;
  index: number;
  fetchedAt: string;
  options?: NaverNewsNormalizationOptions;
  artistNames?: string[];
  artistIds?: string[];
  keywords?: string[];
};

export type NaverNewsRawSourceItemResult = {
  rawItem: IssueRawSourceItem;
  warnings: NaverNewsAdapterWarning[];
};

export type NaverNewsRawSourceItemsResult = {
  rawItems: IssueRawSourceItem[];
  warnings: NaverNewsAdapterWarning[];
};

export type NaverNewsFixtureShapeCheckSummary = {
  fixtureName: string;
  itemCount: number;
  rawSourceItemCount: number;
  warningCount: number;
  invalidDateWarningCount: number;
  missingLinkWarningCount: number;
  htmlCleanupCaseCount: number;
  entityDecodeCaseCount: number;
  sourceUrlFallbackCount: number;
  hasBlockingErrors: boolean;
  normalizedTitlesPreview: string[];
  normalizedSourceTypes: Array<IssueRawSourceItem['sourceType']>;
};

export type NaverNewsAdapterShapeCheckResult = {
  adapterName: string;
  requestDraft: NaverNewsSearchRequestDraft;
  fixtureResults: NaverNewsFixtureShapeCheckSummary[];
  fixtureCount: number;
  itemCount: number;
  rawItemCount: number;
  warningCount: number;
  invalidDateWarningCount: number;
  missingLinkWarningCount: number;
  htmlCleanupCaseCount: number;
  entityDecodeCaseCount: number;
  sourceUrlFallbackCount: number;
  normalizedTitlesPreview: string[];
  normalizedSourceTypes: Array<IssueRawSourceItem['sourceType']>;
  hasBlockingErrors: boolean;
};

const NAVER_NEWS_ADAPTER_NAME = 'naver_news_issue_source_adapter';
const DEFAULT_NAVER_SOURCE_NAME = 'Naver News';
const DEFAULT_NAVER_LANGUAGE = 'ko';
const DEFAULT_NAVER_COUNTRY = 'KR';
const DEFAULT_FALLBACK_FETCHED_AT = '2026-06-15T16:00:00.000Z';
const DEFAULT_CATEGORY: IssueCategory = 'viral_moment';
const DEFAULT_MAX_KEYWORD_COUNT = 8;

const naverNewsCapability: IssueSourceAdapterCapability = {
  sourceType: 'news_article',
  supportsRealtime: true,
  supportsBackfill: true,
  supportsFixtureInput: true,
  producesSignalDrafts: true,
  requiresExternalNetwork: true,
  requiresSupabase: false,
  requiresCredentials: true,
  providerDocsUrl: 'https://developers.naver.com/docs/serviceapi/search/news/news.md',
  rateLimitNotes:
    'Planned only. Confirm current Naver Search API quota before enabling ingestion.',
  plannedOnly: true,
};

export const naverNewsIssueSourceAdapterMetadata = {
  adapterName: NAVER_NEWS_ADAPTER_NAME,
  sourceType: 'news_article',
  implementationStatus: 'planned',
  capability: naverNewsCapability,
} as const;

function clampInteger(value: number, min: number, max: number): number {
  const safeValue = Number.isFinite(value) ? Math.trunc(value) : min;

  return Math.min(Math.max(safeValue, min), max);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function getStringHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function hasHtmlTag(value: string | undefined): boolean {
  return /<[^>]*>/g.test(value ?? '');
}

function hasHtmlEntity(value: string | undefined): boolean {
  return /&(?:quot|apos|amp|lt|gt|#34|#39);/g.test(value ?? '');
}

function cleanNaverText(value: string | undefined, stripHtml: boolean): string {
  const decoded = decodeNaverHtmlEntities(value ?? '');
  const withoutTags = stripHtml ? stripNaverHtmlTags(decoded) : decoded;

  return normalizeWhitespace(withoutTags);
}

function createWarning(
  sourceId: string,
  code: NaverNewsAdapterWarning['code'],
  message: string,
  severity: NaverNewsAdapterWarning['severity'] = 'warning',
): NaverNewsAdapterWarning {
  return {
    sourceId,
    severity,
    code,
    message,
  };
}

export function stripNaverHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ');
}

export function decodeNaverHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function normalizeNaverPubDate(
  pubDate: string | undefined,
  fallback: string,
): { publishedAt: string; warning?: NaverNewsAdapterWarning } {
  const timestamp = new Date(pubDate ?? '').getTime();

  if (Number.isFinite(timestamp)) {
    return {
      publishedAt: new Date(timestamp).toISOString(),
    };
  }

  return {
    publishedAt: fallback,
    warning: createWarning(
      'naver-news-pubdate',
      'invalid_pub_date',
      'Naver News pubDate could not be parsed; fallback timestamp was used.',
    ),
  };
}

export function createNaverNewsSearchRequestDraft(
  query: string,
  display = 10,
  start = 1,
  sort: NaverNewsSearchSort = 'date',
): NaverNewsSearchRequestDraft {
  return {
    query: normalizeWhitespace(query),
    display: clampInteger(display, 1, 100),
    start: clampInteger(start, 1, 1000),
    sort,
  };
}

export function createNaverNewsRawSourceItem({
  item,
  index,
  fetchedAt,
  options,
  artistNames,
  artistIds,
  keywords,
}: NaverNewsRawSourceMappingInput): NaverNewsRawSourceItemResult {
  const stripHtml = options?.stripHtml ?? true;
  const sourceName = options?.fallbackSourceName ?? DEFAULT_NAVER_SOURCE_NAME;
  const sourceUrl =
    item.originallink?.trim() ||
    item.link?.trim() ||
    `https://example.com/fandex-fixtures/naver-news/${index + 1}`;
  const sourceId = `naver-news:${getStringHash(`${sourceUrl}:${item.pubDate ?? index}`)}`;
  const title = cleanNaverText(item.title, stripHtml);
  const description = cleanNaverText(item.description, stripHtml);
  const publishedAtResult = normalizeNaverPubDate(item.pubDate, fetchedAt);
  const warnings: NaverNewsAdapterWarning[] = [];
  const maxKeywordCount = options?.maxKeywordCount ?? DEFAULT_MAX_KEYWORD_COUNT;
  const limitedKeywords = keywords?.slice(0, maxKeywordCount);

  if (!title) {
    warnings.push(
      createWarning(sourceId, 'empty_title', 'Naver News item has no title.'),
    );
  }

  if (!description) {
    warnings.push(
      createWarning(
        sourceId,
        'empty_description',
        'Naver News item has no description.',
        'info',
      ),
    );
  }

  if (!item.originallink && !item.link) {
    warnings.push(
      createWarning(
        sourceId,
        'missing_source_url',
        'Naver News item has no originallink or link; example fallback URL was used.',
      ),
    );
    warnings.push(
      createWarning(
        sourceId,
        'fallback_source_url_used',
        'Example fallback URL was used for the Naver News source item.',
        'info',
      ),
    );
  }

  if (publishedAtResult.warning) {
    warnings.push({
      ...publishedAtResult.warning,
      sourceId,
    });
  }

  if (hasHtmlTag(item.title) || hasHtmlTag(item.description)) {
    warnings.push(
      createWarning(
        sourceId,
        'html_cleanup_applied',
        'Naver News item contained HTML tags that were removed during cleanup.',
        'info',
      ),
    );
  }

  if (hasHtmlEntity(item.title) || hasHtmlEntity(item.description)) {
    warnings.push(
      createWarning(
        sourceId,
        'entity_decode_applied',
        'Naver News item contained HTML entities that were decoded during cleanup.',
        'info',
      ),
    );
  }

  return {
    rawItem: {
      sourceId,
      sourceType: 'news_article',
      sourceName,
      sourceUrl,
      title: title || 'Untitled Naver News item',
      summary: description,
      bodySnippet: description,
      publishedAt: publishedAtResult.publishedAt,
      fetchedAt,
      language: options?.defaultLanguage ?? DEFAULT_NAVER_LANGUAGE,
      country: options?.defaultCountry ?? DEFAULT_NAVER_COUNTRY,
      artistNames,
      artistIds,
      keywords: limitedKeywords,
      reliabilityHint:
        getDefaultReliabilityBySourceType('news_article').defaultReliabilityWeight,
      metadata: {
        provider: 'naver_news',
        originalLinkPresent: Boolean(item.originallink),
        linkPresent: Boolean(item.link),
        plannedOnly: true,
      },
    },
    warnings,
  };
}

export function mapNaverNewsItemToRawSourceItem(
  input: NaverNewsRawSourceMappingInput,
): NaverNewsRawSourceItemResult {
  return createNaverNewsRawSourceItem(input);
}

export function mapNaverNewsItemsToRawSourceItems(
  response: NaverNewsApiResponseDraft,
  fetchedAt = DEFAULT_FALLBACK_FETCHED_AT,
  options?: NaverNewsNormalizationOptions,
): NaverNewsRawSourceItemsResult {
  const items = response.items ?? [];
  const warnings: NaverNewsAdapterWarning[] = [];
  const rawItems = items.map((item, index) => {
    const result = mapNaverNewsItemToRawSourceItem({
      item,
      index,
      fetchedAt,
      options,
    });

    warnings.push(...result.warnings);

    return result.rawItem;
  });

  if (items.length === 0) {
    warnings.push(
      createWarning(
        'naver-news-response',
        'empty_items',
        'Naver News draft response contains no items.',
        'info',
      ),
    );
  }

  return {
    rawItems,
    warnings,
  };
}

function normalizeNaverRawItems(
  rawItems: IssueRawSourceItem[],
  context: IssueSourceAdapterContext,
): IssueSourceAdapterResult {
  const candidates: IssueSignalCandidate[] = [];

  rawItems.forEach((rawItem) => {
    const artistIds = rawItem.artistIds ?? [];

    artistIds.forEach((artistId) => {
      candidates.push(
        createIssueSignalCandidate({
          rawItem,
          artistId,
          category: DEFAULT_CATEGORY,
          context,
          duplicateGroupId: `${artistId}:${DEFAULT_CATEGORY}:${rawItem.sourceId}`,
          lifecycleStage: context.defaultLifecycleStage ?? 'breaking',
          decaySpeed: context.defaultDecaySpeed ?? 'medium',
          officiallyConfirmed: false,
        }),
      );
    });
  });

  return {
    adapterName: NAVER_NEWS_ADAPTER_NAME,
    capabilities: [naverNewsCapability],
    candidates,
    warnings: candidates.flatMap((candidate) => candidate.warnings),
    rawItemCount: rawItems.length,
  };
}

function mapNaverCandidatesToIssueSignals(
  candidates: IssueSignalCandidate[],
  context: IssueSourceAdapterContext,
): IssueSignal[] {
  void context;

  return candidates
    .filter((candidate) => candidate.mappingStatus !== 'skipped')
    .map((candidate) => mapCandidateToIssueSignalDraft(candidate));
}

export function createNaverNewsIssueSourceAdapterDraft(): IssueSourceAdapter {
  return {
    sourceName: NAVER_NEWS_ADAPTER_NAME,
    sourceType: 'news_article',
    supportsRealtime: true,
    supportsBackfill: true,
    capabilities: [naverNewsCapability],
    normalize: normalizeNaverRawItems,
    mapToIssueSignals: mapNaverCandidatesToIssueSignals,
  };
}

function createFixtureShapeCheckSummary(
  fixture: NaverNewsApiResponseFixture,
): NaverNewsFixtureShapeCheckSummary {
  const mapped = mapNaverNewsItemsToRawSourceItems(
    fixture.response,
    naverNewsFixtureFetchedAt,
  );
  const itemCount = fixture.response.items?.length ?? 0;
  const normalizedSourceTypes = Array.from(
    new Set(mapped.rawItems.map((rawItem) => rawItem.sourceType)),
  );
  const normalizedTitlesPreview = mapped.rawItems
    .map((rawItem) => rawItem.title)
    .slice(0, 3);

  return {
    fixtureName: fixture.fixtureName,
    itemCount,
    rawSourceItemCount: mapped.rawItems.length,
    warningCount: mapped.warnings.length,
    invalidDateWarningCount: mapped.warnings.filter(
      (warning) => warning.code === 'invalid_pub_date',
    ).length,
    missingLinkWarningCount: mapped.warnings.filter(
      (warning) => warning.code === 'missing_source_url',
    ).length,
    htmlCleanupCaseCount: mapped.warnings.filter(
      (warning) => warning.code === 'html_cleanup_applied',
    ).length,
    entityDecodeCaseCount: mapped.warnings.filter(
      (warning) => warning.code === 'entity_decode_applied',
    ).length,
    sourceUrlFallbackCount: mapped.warnings.filter(
      (warning) => warning.code === 'fallback_source_url_used',
    ).length,
    hasBlockingErrors: mapped.warnings.some((warning) => warning.severity === 'error'),
    normalizedTitlesPreview,
    normalizedSourceTypes,
  };
}

export function runNaverNewsAdapterShapeCheck(): NaverNewsAdapterShapeCheckResult {
  const requestDraft = createNaverNewsSearchRequestDraft('aespa comeback');
  const fixtureResults = naverNewsApiResponseFixtures.map((fixture) =>
    createFixtureShapeCheckSummary(fixture),
  );
  const normalizedSourceTypes = Array.from(
    new Set(fixtureResults.flatMap((result) => result.normalizedSourceTypes)),
  );
  const normalizedTitlesPreview = fixtureResults.flatMap(
    (result) => result.normalizedTitlesPreview,
  );

  return {
    adapterName: NAVER_NEWS_ADAPTER_NAME,
    requestDraft,
    fixtureResults,
    fixtureCount: fixtureResults.length,
    itemCount: fixtureResults.reduce((sum, result) => sum + result.itemCount, 0),
    rawItemCount: fixtureResults.reduce(
      (sum, result) => sum + result.rawSourceItemCount,
      0,
    ),
    warningCount: fixtureResults.reduce(
      (sum, result) => sum + result.warningCount,
      0,
    ),
    invalidDateWarningCount: fixtureResults.reduce(
      (sum, result) => sum + result.invalidDateWarningCount,
      0,
    ),
    missingLinkWarningCount: fixtureResults.reduce(
      (sum, result) => sum + result.missingLinkWarningCount,
      0,
    ),
    htmlCleanupCaseCount: fixtureResults.reduce(
      (sum, result) => sum + result.htmlCleanupCaseCount,
      0,
    ),
    entityDecodeCaseCount: fixtureResults.reduce(
      (sum, result) => sum + result.entityDecodeCaseCount,
      0,
    ),
    sourceUrlFallbackCount: fixtureResults.reduce(
      (sum, result) => sum + result.sourceUrlFallbackCount,
      0,
    ),
    normalizedTitlesPreview: normalizedTitlesPreview.slice(0, 8),
    normalizedSourceTypes,
    hasBlockingErrors: fixtureResults.some(
      (result) => result.hasBlockingErrors,
    ),
  };
}
