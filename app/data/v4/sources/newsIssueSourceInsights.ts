import { NEWS_ISSUE_SOURCE_ITEMS } from './newsIssueSourceSeed';
import type { NewsIssueSourceItem } from './newsIssueSourceTypes';
import { validateNewsIssueSourceItem } from './sourceValidators';

export type NewsIssueSourceArtistSummary = {
  artistId: string;
  itemCount: number;
  validItemCount: number;
  averageIssueScore: number | null;
  maxIssueScore: number | null;
  latestPublishedDate: string | null;
  topCategory: string | null;
  sentimentCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  recentItems: NewsIssueSourceItem[];
};

export type NewsIssueSourceCoverageSummary = {
  totalItemCount: number;
  coveredArtistCount: number;
  artistSummaries: NewsIssueSourceArtistSummary[];
  categoryCounts: Record<string, number>;
  sentimentCounts: Record<string, number>;
};

function isFiniteIssueScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function incrementCount(counts: Record<string, number>, key: string) {
  return {
    ...counts,
    [key]: (counts[key] ?? 0) + 1,
  };
}

function sortByPublishedDateDesc(
  left: NewsIssueSourceItem,
  right: NewsIssueSourceItem,
) {
  return Date.parse(right.publishedDate) - Date.parse(left.publishedDate);
}

function getLatestPublishedDate(items: NewsIssueSourceItem[]) {
  const latestItem = [...items].sort(sortByPublishedDateDesc)[0];

  return latestItem?.publishedDate ?? null;
}

function getIssueScoreStats(items: NewsIssueSourceItem[]) {
  const scores = items
    .map((item) => item.issueScore)
    .filter(isFiniteIssueScore);

  if (scores.length === 0) {
    return {
      averageIssueScore: null,
      maxIssueScore: null,
    };
  }

  return {
    averageIssueScore:
      scores.reduce((sum, score) => sum + score, 0) / scores.length,
    maxIssueScore: Math.max(...scores),
  };
}

function getCounts(
  items: NewsIssueSourceItem[],
  key: 'category' | 'sentiment',
) {
  return items.reduce<Record<string, number>>(
    (counts, item) => incrementCount(counts, item[key]),
    {},
  );
}

export function getTopNewsIssueSourceCategory(
  categoryCounts: Record<string, number>,
) {
  const [topCategory] =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] ?? [];

  return topCategory ?? null;
}

export function getNewsIssueSourceItemsByArtist(artistId: string) {
  const normalizedArtistId = artistId.trim();

  return NEWS_ISSUE_SOURCE_ITEMS.filter(
    (item) => item.artistId === normalizedArtistId,
  );
}

export function getRecentNewsIssueSourceItemsByArtist(
  artistId: string,
  limit = 3,
) {
  const safeLimit = Math.max(0, Math.floor(limit));

  if (safeLimit === 0) {
    return [];
  }

  return [...getNewsIssueSourceItemsByArtist(artistId)]
    .sort(sortByPublishedDateDesc)
    .slice(0, safeLimit);
}

export function getNewsIssueSourceArtistSummary(
  artistId: string,
): NewsIssueSourceArtistSummary {
  const items = getNewsIssueSourceItemsByArtist(artistId);
  const categoryCounts = getCounts(items, 'category');
  const sentimentCounts = getCounts(items, 'sentiment');
  const scoreStats = getIssueScoreStats(items);

  return {
    artistId: artistId.trim(),
    itemCount: items.length,
    validItemCount: items.filter(
      (item) => validateNewsIssueSourceItem(item).isValid,
    ).length,
    averageIssueScore: scoreStats.averageIssueScore,
    maxIssueScore: scoreStats.maxIssueScore,
    latestPublishedDate: getLatestPublishedDate(items),
    topCategory: getTopNewsIssueSourceCategory(categoryCounts),
    sentimentCounts,
    categoryCounts,
    recentItems: getRecentNewsIssueSourceItemsByArtist(artistId, 3),
  };
}

export function getNewsIssueSourceCoverageSummary(): NewsIssueSourceCoverageSummary {
  const artistIds = Array.from(
    new Set(NEWS_ISSUE_SOURCE_ITEMS.map((item) => item.artistId)),
  ).sort();
  const artistSummaries = artistIds.map((artistId) =>
    getNewsIssueSourceArtistSummary(artistId),
  );

  return {
    totalItemCount: NEWS_ISSUE_SOURCE_ITEMS.length,
    coveredArtistCount: artistSummaries.filter(
      (summary) => summary.itemCount > 0,
    ).length,
    artistSummaries,
    categoryCounts: getCounts(NEWS_ISSUE_SOURCE_ITEMS, 'category'),
    sentimentCounts: getCounts(NEWS_ISSUE_SOURCE_ITEMS, 'sentiment'),
  };
}
