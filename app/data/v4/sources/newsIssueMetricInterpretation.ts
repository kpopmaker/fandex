import { FANDEX_METRIC_DEFINITIONS } from '../metrics/fandexMetricDefinitions';
import type { FandexVariableKey } from '../metrics/fandexMetricTypes';
import { NEWS_ISSUE_SOURCE_ITEMS } from './newsIssueSourceSeed';
import type {
  NewsIssueCategory,
  NewsIssueSourceItem,
} from './newsIssueSourceTypes';

export type NewsIssueMetricEvidence = {
  artistId: string;
  metricKey: FandexVariableKey;
  itemCount: number;
  averageIssueScore: number | null;
  maxIssueScore: number | null;
  latestPublishedDate: string | null;
  categoryCounts: Record<string, number>;
  sentimentCounts: Record<string, number>;
  evidenceItems: NewsIssueSourceItem[];
  interpretationLabel: string;
  interpretationSummary: string;
};

export type NewsIssueArtistMetricEvidenceSummary = {
  artistId: string;
  metricEvidence: NewsIssueMetricEvidence[];
  totalEvidenceItemCount: number;
  coveredMetricCount: number;
};

export type NewsIssueMetricInterpretationCoverage = {
  totalSourceItemCount: number;
  coveredArtistCount: number;
  coveredMetricCount: number;
  metricEvidenceCounts: Record<string, number>;
  artistSummaries: NewsIssueArtistMetricEvidenceSummary[];
};

const knownMetricKeys = new Set(
  FANDEX_METRIC_DEFINITIONS.map((definition) => definition.key),
);

const categoryMetricKeyMap: Record<NewsIssueCategory, FandexVariableKey[]> = {
  album: ['album', 'music'],
  chart: ['music', 'album', 'news'],
  global: ['news', 'search', 'momentum'],
  festival: ['activity', 'news', 'youtube'],
  performance: ['activity', 'youtube', 'news'],
  broadcast: ['news', 'activity', 'search'],
  comeback: ['activity', 'search', 'momentum'],
  brand: ['brand', 'news'],
  fan: ['fandom', 'sns'],
  general: ['news', 'search'],
  risk: ['adjustment', 'news'],
};

function isFiniteIssueScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sortByPublishedDateDesc(
  left: NewsIssueSourceItem,
  right: NewsIssueSourceItem,
) {
  return Date.parse(right.publishedDate) - Date.parse(left.publishedDate);
}

function incrementCount(counts: Record<string, number>, key: string) {
  return {
    ...counts,
    [key]: (counts[key] ?? 0) + 1,
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

function getLatestPublishedDate(items: NewsIssueSourceItem[]) {
  return [...items].sort(sortByPublishedDateDesc)[0]?.publishedDate ?? null;
}

function getTopCountKey(counts: Record<string, number>) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function getMetricLabel(metricKey: FandexVariableKey) {
  return (
    FANDEX_METRIC_DEFINITIONS.find((definition) => definition.key === metricKey)
      ?.label ?? metricKey
  );
}

function getItemsForArtistAndMetric(
  artistId: string,
  metricKey: FandexVariableKey,
) {
  const normalizedArtistId = artistId.trim();

  return NEWS_ISSUE_SOURCE_ITEMS.filter(
    (item) =>
      item.artistId === normalizedArtistId &&
      getMetricKeysForNewsIssueCategory(item.category).includes(metricKey),
  );
}

export function getMetricKeysForNewsIssueCategory(
  category: NewsIssueCategory,
) {
  return categoryMetricKeyMap[category].filter((metricKey) =>
    knownMetricKeys.has(metricKey),
  );
}

export function getInterpretationSummaryFromEvidence(
  evidence: Pick<
    NewsIssueMetricEvidence,
    | 'itemCount'
    | 'averageIssueScore'
    | 'categoryCounts'
    | 'sentimentCounts'
    | 'metricKey'
  >,
) {
  if (evidence.itemCount === 0) {
    return '아직 이 지표에 연결된 source seed 해석 근거가 없습니다.';
  }

  const topCategory = getTopCountKey(evidence.categoryCounts);
  const topSentiment = getTopCountKey(evidence.sentimentCounts);
  const scoreText =
    evidence.averageIssueScore === null
      ? '이슈 강도 없음'
      : `평균 이슈 강도 ${Math.round(evidence.averageIssueScore)}`;

  return [
    `${evidence.itemCount}개 source seed가 ${getMetricLabel(
      evidence.metricKey,
    )} 지표 해석 근거로 연결됩니다.`,
    topCategory ? `주요 category는 ${topCategory}입니다.` : null,
    topSentiment ? `주요 sentiment는 ${topSentiment}입니다.` : null,
    scoreText,
  ]
    .filter(Boolean)
    .join(' ');
}

export function getNewsIssueMetricEvidenceForArtist(
  artistId: string,
  metricKey: FandexVariableKey,
): NewsIssueMetricEvidence {
  const items = getItemsForArtistAndMetric(artistId, metricKey);
  const sortedItems = [...items].sort(sortByPublishedDateDesc);
  const categoryCounts = getCounts(items, 'category');
  const sentimentCounts = getCounts(items, 'sentiment');
  const scoreStats = getIssueScoreStats(items);
  const evidenceBase = {
    artistId: artistId.trim(),
    metricKey,
    itemCount: items.length,
    averageIssueScore: scoreStats.averageIssueScore,
    maxIssueScore: scoreStats.maxIssueScore,
    latestPublishedDate: getLatestPublishedDate(items),
    categoryCounts,
    sentimentCounts,
    evidenceItems: sortedItems.slice(0, 3),
    interpretationLabel: `${getMetricLabel(metricKey)} 해석 근거`,
  };

  return {
    ...evidenceBase,
    interpretationSummary: getInterpretationSummaryFromEvidence(evidenceBase),
  };
}

export function getNewsIssueMetricEvidenceSummaryForArtist(
  artistId: string,
): NewsIssueArtistMetricEvidenceSummary {
  const metricEvidence = FANDEX_METRIC_DEFINITIONS.map((definition) =>
    getNewsIssueMetricEvidenceForArtist(artistId, definition.key),
  ).filter((evidence) => evidence.itemCount > 0);

  return {
    artistId: artistId.trim(),
    metricEvidence,
    totalEvidenceItemCount: metricEvidence.reduce(
      (sum, evidence) => sum + evidence.itemCount,
      0,
    ),
    coveredMetricCount: metricEvidence.length,
  };
}

export function getNewsIssueMetricInterpretationCoverage(): NewsIssueMetricInterpretationCoverage {
  const metricEvidenceCounts = NEWS_ISSUE_SOURCE_ITEMS.reduce<
    Record<string, number>
  >((counts, item) => {
    getMetricKeysForNewsIssueCategory(item.category).forEach((metricKey) => {
      counts[metricKey] = (counts[metricKey] ?? 0) + 1;
    });

    return counts;
  }, {});
  const artistIds = Array.from(
    new Set(NEWS_ISSUE_SOURCE_ITEMS.map((item) => item.artistId)),
  ).sort();
  const artistSummaries = artistIds.map((artistId) =>
    getNewsIssueMetricEvidenceSummaryForArtist(artistId),
  );

  return {
    totalSourceItemCount: NEWS_ISSUE_SOURCE_ITEMS.length,
    coveredArtistCount: artistSummaries.filter(
      (summary) => summary.coveredMetricCount > 0,
    ).length,
    coveredMetricCount: Object.keys(metricEvidenceCounts).length,
    metricEvidenceCounts,
    artistSummaries,
  };
}
