import { artistMetadata } from '../charts/artistMetadata';
import type { NewsIssueSourceItem } from './newsIssueSourceTypes';
import type {
  FandexSourceType,
  SourceValidationIssue,
  SourceValidationResult,
} from './sourceDataTypes';

const sourceTypes: readonly FandexSourceType[] = [
  'news-issue',
  'youtube',
  'search-trend',
  'music-chart',
  'album-sales',
  'social',
];

const knownArtistIds = new Set(artistMetadata.map((artist) => artist.artistId));

function getDuplicateSourceKey(item: NewsIssueSourceItem) {
  const sourceId = item.sourceId.trim();

  if (sourceId) {
    return `sourceId::${sourceId}`;
  }

  return [
    'fallback',
    item.artistId.trim(),
    item.title.trim(),
    item.publishedDate.trim(),
  ].join('::');
}

export function isKnownSourceType(
  sourceType: string,
): sourceType is FandexSourceType {
  return sourceTypes.includes(sourceType.trim() as FandexSourceType);
}

export function isKnownArtistId(artistId: string) {
  return knownArtistIds.has(artistId.trim());
}

export function isValidSourceDate(date: string) {
  const normalizedDate = date.trim();

  return Boolean(normalizedDate) && Number.isFinite(Date.parse(normalizedDate));
}

export function isValidSourceUrl(url?: string) {
  if (!url) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);

    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidIssueScore(score: unknown) {
  return score === undefined || (typeof score === 'number' && Number.isFinite(score));
}

export function findDuplicateSourceItems(items: NewsIssueSourceItem[]) {
  const counts = new Map<string, { item: NewsIssueSourceItem; count: number }>();

  items.forEach((item) => {
    const key = getDuplicateSourceKey(item);
    const current = counts.get(key);

    counts.set(key, {
      item,
      count: (current?.count ?? 0) + 1,
    });
  });

  return Array.from(counts.values()).filter((entry) => entry.count > 1);
}

export function validateNewsIssueSourceItem(
  item: NewsIssueSourceItem,
): SourceValidationResult {
  const issues: SourceValidationIssue[] = [];
  const artistId = item.artistId.trim();
  const sourceId = item.sourceId.trim();
  const sourceType: FandexSourceType = 'news-issue';

  if (!isKnownArtistId(artistId)) {
    issues.push({
      severity: 'error',
      code: 'unknown-artist',
      message: `Unknown artistId: ${artistId}`,
      artistId,
      sourceType,
      sourceId,
    });
  }

  if (!isKnownSourceType(sourceType)) {
    issues.push({
      severity: 'error',
      code: 'unknown-source',
      message: `Unknown source type: ${sourceType}`,
      artistId,
      sourceType,
      sourceId,
    });
  }

  if (!item.title.trim()) {
    issues.push({
      severity: 'error',
      code: 'missing-title',
      message: 'News issue source item title is required.',
      artistId,
      sourceType,
      sourceId,
    });
  }

  if (!isValidSourceDate(item.publishedDate)) {
    issues.push({
      severity: 'error',
      code: 'missing-date',
      message: 'News issue source item publishedDate must be a valid date.',
      artistId,
      sourceType,
      sourceId,
    });
  }

  if (!isValidSourceUrl(item.sourceUrl)) {
    issues.push({
      severity: 'error',
      code: 'invalid-url',
      message: 'News issue sourceUrl must be a valid http or https URL when present.',
      artistId,
      sourceType,
      sourceId,
    });
  }

  if (!isValidIssueScore(item.issueScore)) {
    issues.push({
      severity: 'error',
      code: 'invalid-score',
      message: 'News issue score must be a finite number when present.',
      artistId,
      sourceType,
      sourceId,
    });
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
  };
}

export function validateNewsIssueSourceItems(
  items: NewsIssueSourceItem[],
): SourceValidationResult {
  const itemIssues = items.flatMap(
    (item) => validateNewsIssueSourceItem(item).issues,
  );
  const duplicateIssues: SourceValidationIssue[] = findDuplicateSourceItems(
    items,
  ).map(({ item }) => ({
    severity: 'error',
    code: 'duplicate-source-item',
    message: `Duplicate news issue source item: ${getDuplicateSourceKey(item)}`,
    artistId: item.artistId.trim(),
    sourceType: 'news-issue',
    sourceId: item.sourceId.trim(),
  }));
  const issues = [...itemIssues, ...duplicateIssues];

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
  };
}
