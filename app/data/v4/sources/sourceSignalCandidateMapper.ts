import type { FandexVariableKey } from '../metrics/fandexMetricTypes';
import { sourceIngestionFixture } from './sourceIngestionFixture';
import type {
  FandexNormalizedSourceItem,
  FandexSourceIngestionShapeCheckIssue,
  FandexSourceIngestionShapeCheckResult,
  FandexSourceIngestionSummary,
  FandexSourceProvider,
  FandexSourceTrustLevel,
  FandexSourceVariableSignalCandidate,
  FandexSourceVariableSignalKey,
} from './sourceIngestionTypes';

const allowedVariableKeys: readonly FandexSourceVariableSignalKey[] = [
  'music',
  'album',
  'youtube',
  'sns',
  'search',
  'news',
  'fandom',
  'brand',
  'activity',
  'momentum',
  'adjustment',
];

const sourceProviders: readonly FandexSourceProvider[] = [
  'news',
  'youtube',
  'social',
  'search',
  'music',
  'album',
  'brand',
  'event',
  'community',
  'manual-preview',
];

const trustLevels: readonly FandexSourceTrustLevel[] = [
  'high',
  'medium',
  'low',
  'preview',
];

const providerVariableMap: Record<
  FandexSourceProvider,
  FandexSourceVariableSignalKey[]
> = {
  news: ['news'],
  youtube: ['youtube'],
  social: ['sns'],
  search: ['search'],
  music: ['music'],
  album: ['album'],
  brand: ['brand'],
  event: ['activity'],
  community: ['fandom'],
  'manual-preview': ['momentum'],
};

const categoryVariableMap: Record<string, FandexSourceVariableSignalKey[]> = {
  activity: ['activity'],
  adjustment: ['adjustment'],
  album: ['album'],
  brand: ['brand'],
  fandom: ['fandom'],
  momentum: ['momentum'],
  music: ['music'],
  news: ['news'],
  search: ['search'],
  sns: ['sns'],
  youtube: ['youtube'],
};

const keywordVariableMap: Record<string, FandexSourceVariableSignalKey[]> = {
  album: ['album'],
  brand: ['brand'],
  campaign: ['brand'],
  catalog: ['music'],
  chart: ['music'],
  comeback: ['activity', 'momentum'],
  community: ['fandom'],
  contract: ['adjustment'],
  discussion: ['news', 'adjustment'],
  fanpost: ['sns', 'fandom'],
  festival: ['activity'],
  global: ['brand', 'momentum'],
  live: ['youtube'],
  performance: ['activity'],
  preorder: ['album'],
  reaction: ['youtube', 'fandom'],
  risk: ['adjustment'],
  schedule: ['activity'],
  search: ['search'],
  streaming: ['music'],
  support: ['fandom'],
  teaser: ['activity', 'momentum'],
  tour: ['activity'],
};

function createEmptyCountRecord<T extends string>(
  keys: readonly T[],
): Record<T, number> {
  return keys.reduce(
    (counts, key) => ({
      ...counts,
      [key]: 0,
    }),
    {} as Record<T, number>,
  );
}

function clampScore(score: number) {
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function getTrustLevelWeight(trustLevel: FandexSourceTrustLevel) {
  if (trustLevel === 'high') {
    return 1;
  }

  if (trustLevel === 'medium') {
    return 0.9;
  }

  if (trustLevel === 'low') {
    return 0.72;
  }

  return 0.64;
}

function getSentimentWeight(sentiment: FandexNormalizedSourceItem['sentiment']) {
  if (sentiment === 'positive') {
    return 1.08;
  }

  if (sentiment === 'negative') {
    return 0.72;
  }

  if (sentiment === 'mixed') {
    return 0.88;
  }

  return 1;
}

function getCandidateScore(item: FandexNormalizedSourceItem) {
  const baseScore = item.relevanceScore * 0.6 + item.engagementScore * 0.4;

  return clampScore(
    baseScore * getTrustLevelWeight(item.trustLevel) * getSentimentWeight(item.sentiment),
  );
}

function getVariableKeysForSourceItem(item: FandexNormalizedSourceItem) {
  const variableKeys = new Set<FandexSourceVariableSignalKey>(
    providerVariableMap[item.provider],
  );

  item.categories.forEach((category) => {
    categoryVariableMap[category]?.forEach((variableKey) => {
      variableKeys.add(variableKey);
    });
  });

  item.rawKeywordHints.forEach((keywordHint) => {
    const normalizedKeyword = keywordHint.trim().toLowerCase();

    keywordVariableMap[normalizedKeyword]?.forEach((variableKey) => {
      variableKeys.add(variableKey);
    });
  });

  if (item.sentiment === 'negative' || item.sentiment === 'mixed') {
    variableKeys.add('adjustment');
  }

  return Array.from(variableKeys);
}

function isAllowedVariableKey(
  variableKey: string,
): variableKey is FandexVariableKey {
  return allowedVariableKeys.includes(variableKey as FandexSourceVariableSignalKey);
}

export function mapSourceItemToVariableSignalCandidates(
  item: FandexNormalizedSourceItem,
): FandexSourceVariableSignalCandidate[] {
  const variableKeys = getVariableKeysForSourceItem(item);
  const candidateScore = getCandidateScore(item);

  return item.artistIds.flatMap((artistId) =>
    variableKeys.map((variableKey) => ({
      candidateId: `${item.sourceId}::${artistId}::${variableKey}`,
      sourceId: item.sourceId,
      artistId,
      variableKey,
      candidateScore,
      confidence: item.trustLevel,
      evidenceLabel: `${item.provider} / ${item.contentType}`,
      reason:
        'Preview-only source ingestion candidate. Not connected to FANDEX scoring.',
      previewOnly: true,
    })),
  );
}

export function getSourceVariableSignalCandidates(
  items: FandexNormalizedSourceItem[] = sourceIngestionFixture,
) {
  return items.flatMap(mapSourceItemToVariableSignalCandidates);
}

export function getSourceIngestionSummary(
  items: FandexNormalizedSourceItem[] = sourceIngestionFixture,
): FandexSourceIngestionSummary {
  const candidates = getSourceVariableSignalCandidates(items);
  const artistIds = new Set(items.flatMap((item) => item.artistIds));
  const providerCounts = createEmptyCountRecord(sourceProviders);
  const variableCounts = createEmptyCountRecord(allowedVariableKeys);
  const trustLevelCounts = createEmptyCountRecord(trustLevels);
  const collectedAtValues = items
    .map((item) => item.collectedAt)
    .filter((collectedAt) => Number.isFinite(Date.parse(collectedAt)))
    .sort();

  items.forEach((item) => {
    providerCounts[item.provider] += 1;
    trustLevelCounts[item.trustLevel] += 1;
  });

  candidates.forEach((candidate) => {
    variableCounts[candidate.variableKey] += 1;
  });

  return {
    sourceItemCount: items.length,
    artistCount: artistIds.size,
    candidateCount: candidates.length,
    providerCounts,
    variableCounts,
    trustLevelCounts,
    latestCollectedAt: collectedAtValues.at(-1) ?? null,
    previewOnly: true,
  };
}

export function runSourceIngestionFoundationShapeCheck(
  items: FandexNormalizedSourceItem[] = sourceIngestionFixture,
): FandexSourceIngestionShapeCheckResult {
  const issues: FandexSourceIngestionShapeCheckIssue[] = [];
  const sourceIdCounts = new Map<string, number>();

  items.forEach((item) => {
    sourceIdCounts.set(item.sourceId, (sourceIdCounts.get(item.sourceId) ?? 0) + 1);

    if (item.artistIds.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-artist-ids',
        message: `Source item has no artistIds: ${item.sourceId}`,
        sourceId: item.sourceId,
      });
    }

    if (!Number.isFinite(item.relevanceScore)) {
      issues.push({
        severity: 'error',
        code: 'invalid-relevance-score',
        message: `Source item relevanceScore must be finite: ${item.sourceId}`,
        sourceId: item.sourceId,
      });
    }

    if (!Number.isFinite(item.engagementScore)) {
      issues.push({
        severity: 'error',
        code: 'invalid-engagement-score',
        message: `Source item engagementScore must be finite: ${item.sourceId}`,
        sourceId: item.sourceId,
      });
    }
  });

  sourceIdCounts.forEach((count, sourceId) => {
    if (count > 1) {
      issues.push({
        severity: 'error',
        code: 'duplicate-source-id',
        message: `Duplicate sourceId: ${sourceId}`,
        sourceId,
      });
    }
  });

  const candidates = getSourceVariableSignalCandidates(items);

  candidates.forEach((candidate) => {
    if (!isAllowedVariableKey(candidate.variableKey)) {
      issues.push({
        severity: 'error',
        code: 'invalid-variable-key',
        message: `Invalid candidate variableKey: ${candidate.variableKey}`,
        sourceId: candidate.sourceId,
        candidateId: candidate.candidateId,
      });
    }

    if (!Number.isFinite(candidate.candidateScore)) {
      issues.push({
        severity: 'error',
        code: 'invalid-candidate-score',
        message: `Candidate score must be finite: ${candidate.candidateId}`,
        sourceId: candidate.sourceId,
        candidateId: candidate.candidateId,
      });
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    sourceItemCount: items.length,
    candidateCount: candidates.length,
    issues,
  };
}
