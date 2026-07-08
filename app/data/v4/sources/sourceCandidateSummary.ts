import type { FandexVariableKey } from '../metrics/fandexMetricTypes';
import { sourceIngestionFixture } from './sourceIngestionFixture';
import { getSourceVariableSignalCandidates } from './sourceSignalCandidateMapper';
import type {
  FandexNormalizedSourceItem,
  FandexSourceContentType,
  FandexSourceProvider,
  FandexSourceSentiment,
  FandexSourceTrustLevel,
  FandexSourceVariableSignalCandidate,
} from './sourceIngestionTypes';

export type FandexSourceCandidateCountMap = Record<string, number>;

export type FandexSourceCandidateVariableSummary = {
  artistId: string;
  variableKey: FandexVariableKey;
  candidateCount: number;
  sourceItemCount: number;
  averageCandidateScore: number;
  averageConfidenceScore: number;
  maxCandidateScore: number;
  sourceIds: string[];
  providerCounts: FandexSourceCandidateCountMap;
  contentTypeCounts: FandexSourceCandidateCountMap;
  sentimentCounts: FandexSourceCandidateCountMap;
  latestPublishedAt: string | null;
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceCandidateArtistSummary = {
  artistId: string;
  candidateCount: number;
  sourceItemCount: number;
  variableCount: number;
  topVariableKey: FandexVariableKey | null;
  averageCandidateScore: number;
  averageConfidenceScore: number;
  maxCandidateScore: number;
  sourceIds: string[];
  providerCounts: FandexSourceCandidateCountMap;
  contentTypeCounts: FandexSourceCandidateCountMap;
  sentimentCounts: FandexSourceCandidateCountMap;
  latestPublishedAt: string | null;
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceCandidateMarketSummary = {
  artistCount: number;
  variableCount: number;
  candidateCount: number;
  sourceItemCount: number;
  topArtistId: string | null;
  topVariableKey: FandexVariableKey | null;
  averageCandidateScore: number;
  averageConfidenceScore: number;
  maxCandidateScore: number;
  sourceIds: string[];
  providerCounts: FandexSourceCandidateCountMap;
  contentTypeCounts: FandexSourceCandidateCountMap;
  sentimentCounts: FandexSourceCandidateCountMap;
  latestPublishedAt: string | null;
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceCandidateSummaryShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-artist-summary'
    | 'empty-variable-summary'
    | 'invalid-candidate-count'
    | 'invalid-average-candidate-score'
    | 'invalid-average-confidence-score'
    | 'invalid-variable-key'
    | 'duplicate-summary-source-id';
  message: string;
  artistId?: string;
  variableKey?: string;
};

export type FandexSourceCandidateSummaryShapeCheckResult = {
  isValid: boolean;
  artistSummaryCount: number;
  variableSummaryCount: number;
  issues: FandexSourceCandidateSummaryShapeCheckIssue[];
};

type SourceCandidateSummaryGroup = {
  artistId: string;
  variableKey?: FandexVariableKey;
  candidates: FandexSourceVariableSignalCandidate[];
};

const allowedVariableKeys: readonly FandexVariableKey[] = [
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

function isAllowedVariableKey(variableKey: string): variableKey is FandexVariableKey {
  return allowedVariableKeys.includes(variableKey as FandexVariableKey);
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getConfidenceScore(confidence: FandexSourceTrustLevel) {
  if (confidence === 'high') {
    return 100;
  }

  if (confidence === 'medium') {
    return 90;
  }

  if (confidence === 'low') {
    return 72;
  }

  return 64;
}

function getSourceItemMap(items: FandexNormalizedSourceItem[]) {
  return new Map(items.map((item) => [item.sourceId, item]));
}

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function incrementCount<T extends string>(
  counts: Record<string, number>,
  key: T,
) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function getLatestPublishedAt(items: FandexNormalizedSourceItem[]) {
  const publishedAtValues = items
    .map((item) => item.publishedAt)
    .filter((publishedAt) => Number.isFinite(Date.parse(publishedAt)))
    .sort();

  return publishedAtValues.at(-1) ?? null;
}

function getTopCountKey<T extends string>(counts: Record<T, number>) {
  return Object.entries(counts).sort((first, second) => {
    const countDiff = Number(second[1]) - Number(first[1]);

    if (countDiff !== 0) {
      return countDiff;
    }

    return first[0].localeCompare(second[0]);
  })[0]?.[0] as T | undefined;
}

function getSourceItemsForCandidates(
  candidates: FandexSourceVariableSignalCandidate[],
  sourceItemMap: Map<string, FandexNormalizedSourceItem>,
) {
  return getUniqueValues(candidates.map((candidate) => candidate.sourceId))
    .map((sourceId) => sourceItemMap.get(sourceId))
    .filter((item): item is FandexNormalizedSourceItem => Boolean(item));
}

function createBaseSummary(
  candidates: FandexSourceVariableSignalCandidate[],
  items: FandexNormalizedSourceItem[],
) {
  const candidateScores = candidates.map((candidate) => candidate.candidateScore);
  const confidenceScores = candidates.map((candidate) =>
    getConfidenceScore(candidate.confidence),
  );
  const sourceIds = getUniqueValues(candidates.map((candidate) => candidate.sourceId));
  const providerCounts: Record<FandexSourceProvider, number> = {} as Record<
    FandexSourceProvider,
    number
  >;
  const contentTypeCounts: Record<FandexSourceContentType, number> = {} as Record<
    FandexSourceContentType,
    number
  >;
  const sentimentCounts: Record<FandexSourceSentiment, number> = {} as Record<
    FandexSourceSentiment,
    number
  >;

  items.forEach((item) => {
    incrementCount(providerCounts, item.provider);
    incrementCount(contentTypeCounts, item.contentType);
    incrementCount(sentimentCounts, item.sentiment);
  });

  return {
    candidateCount: candidates.length,
    sourceItemCount: sourceIds.length,
    averageCandidateScore: getAverage(candidateScores),
    averageConfidenceScore: getAverage(confidenceScores),
    maxCandidateScore: candidateScores.length > 0 ? Math.max(...candidateScores) : 0,
    sourceIds,
    providerCounts,
    contentTypeCounts,
    sentimentCounts,
    latestPublishedAt: getLatestPublishedAt(items),
  };
}

function createVariableSummary(
  group: SourceCandidateSummaryGroup,
  sourceItemMap: Map<string, FandexNormalizedSourceItem>,
): FandexSourceCandidateVariableSummary {
  const sourceItems = getSourceItemsForCandidates(group.candidates, sourceItemMap);
  const baseSummary = createBaseSummary(group.candidates, sourceItems);

  return {
    artistId: group.artistId,
    variableKey: group.variableKey ?? 'momentum',
    ...baseSummary,
    summaryLabel: `${group.artistId} / ${group.variableKey} 후보 요약`,
    summaryNote:
      'Source candidate를 artistId와 variableKey로 묶은 read-only preview입니다. FANDEX 계산에는 반영하지 않습니다.',
    previewOnly: true,
  };
}

function createArtistSummary(
  artistId: string,
  candidates: FandexSourceVariableSignalCandidate[],
  sourceItemMap: Map<string, FandexNormalizedSourceItem>,
): FandexSourceCandidateArtistSummary {
  const sourceItems = getSourceItemsForCandidates(candidates, sourceItemMap);
  const variableCounts: Record<string, number> = {};

  candidates.forEach((candidate) => {
    incrementCount(variableCounts, candidate.variableKey);
  });

  const topVariableKey = getTopCountKey(variableCounts);
  const baseSummary = createBaseSummary(candidates, sourceItems);

  return {
    artistId,
    variableCount: Object.keys(variableCounts).length,
    topVariableKey: topVariableKey && isAllowedVariableKey(topVariableKey)
      ? topVariableKey
      : null,
    ...baseSummary,
    summaryLabel: `${artistId} 후보 요약`,
    summaryNote:
      '아티스트별 source candidate를 묶은 read-only preview입니다. FANDEX 계산에는 반영하지 않습니다.',
    previewOnly: true,
  };
}

export function getSourceCandidateVariableSummaries(
  items: FandexNormalizedSourceItem[] = sourceIngestionFixture,
): FandexSourceCandidateVariableSummary[] {
  const candidates = getSourceVariableSignalCandidates(items);
  const sourceItemMap = getSourceItemMap(items);
  const groupMap = new Map<string, SourceCandidateSummaryGroup>();

  candidates.forEach((candidate) => {
    const groupKey = `${candidate.artistId}::${candidate.variableKey}`;
    const existingGroup = groupMap.get(groupKey);

    if (existingGroup) {
      existingGroup.candidates.push(candidate);
      return;
    }

    groupMap.set(groupKey, {
      artistId: candidate.artistId,
      variableKey: candidate.variableKey,
      candidates: [candidate],
    });
  });

  return Array.from(groupMap.values())
    .map((group) => createVariableSummary(group, sourceItemMap))
    .sort((first, second) => {
      const artistDiff = first.artistId.localeCompare(second.artistId);

      if (artistDiff !== 0) {
        return artistDiff;
      }

      return second.candidateCount - first.candidateCount
        || first.variableKey.localeCompare(second.variableKey);
    });
}

export function getSourceCandidateArtistSummaries(
  items: FandexNormalizedSourceItem[] = sourceIngestionFixture,
): FandexSourceCandidateArtistSummary[] {
  const candidates = getSourceVariableSignalCandidates(items);
  const sourceItemMap = getSourceItemMap(items);
  const candidatesByArtist = new Map<string, FandexSourceVariableSignalCandidate[]>();

  candidates.forEach((candidate) => {
    candidatesByArtist.set(candidate.artistId, [
      ...(candidatesByArtist.get(candidate.artistId) ?? []),
      candidate,
    ]);
  });

  return Array.from(candidatesByArtist.entries())
    .map(([artistId, artistCandidates]) =>
      createArtistSummary(artistId, artistCandidates, sourceItemMap),
    )
    .sort((first, second) => second.candidateCount - first.candidateCount
      || first.artistId.localeCompare(second.artistId));
}

export function getSourceCandidateSummaryForArtist(
  artistId: string,
  items: FandexNormalizedSourceItem[] = sourceIngestionFixture,
) {
  return getSourceCandidateArtistSummaries(items).find(
    (summary) => summary.artistId === artistId,
  ) ?? null;
}

export function getSourceCandidateSummaryForArtistVariable(
  artistId: string,
  variableKey: FandexVariableKey,
  items: FandexNormalizedSourceItem[] = sourceIngestionFixture,
) {
  return getSourceCandidateVariableSummaries(items).find(
    (summary) =>
      summary.artistId === artistId && summary.variableKey === variableKey,
  ) ?? null;
}

export function getSourceCandidateMarketSummary(
  items: FandexNormalizedSourceItem[] = sourceIngestionFixture,
): FandexSourceCandidateMarketSummary {
  const candidates = getSourceVariableSignalCandidates(items);
  const sourceItemMap = getSourceItemMap(items);
  const sourceItems = getSourceItemsForCandidates(candidates, sourceItemMap);
  const artistCounts: Record<string, number> = {};
  const variableCounts: Record<string, number> = {};
  const baseSummary = createBaseSummary(candidates, sourceItems);

  candidates.forEach((candidate) => {
    incrementCount(artistCounts, candidate.artistId);
    incrementCount(variableCounts, candidate.variableKey);
  });

  const topVariableKey = getTopCountKey(variableCounts);

  return {
    artistCount: Object.keys(artistCounts).length,
    variableCount: Object.keys(variableCounts).length,
    topArtistId: getTopCountKey(artistCounts) ?? null,
    topVariableKey: topVariableKey && isAllowedVariableKey(topVariableKey)
      ? topVariableKey
      : null,
    ...baseSummary,
    summaryLabel: 'market source candidate 요약',
    summaryNote:
      '전체 fixture source candidate를 묶은 market-level read-only preview입니다. 외부 API/DB/Supabase 연결 및 FANDEX 계산 반영은 없습니다.',
    previewOnly: true,
  };
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

export function runSourceCandidateSummaryShapeCheck(
  items: FandexNormalizedSourceItem[] = sourceIngestionFixture,
): FandexSourceCandidateSummaryShapeCheckResult {
  const issues: FandexSourceCandidateSummaryShapeCheckIssue[] = [];
  const artistSummaries = getSourceCandidateArtistSummaries(items);
  const variableSummaries = getSourceCandidateVariableSummaries(items);

  if (artistSummaries.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-artist-summary',
      message: 'Artist source candidate summary must not be empty.',
    });
  }

  if (variableSummaries.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-variable-summary',
      message: 'Variable source candidate summary must not be empty.',
    });
  }

  variableSummaries.forEach((summary) => {
    if (summary.candidateCount < 0) {
      issues.push({
        severity: 'error',
        code: 'invalid-candidate-count',
        message: `candidateCount must be zero or greater: ${summary.summaryLabel}`,
        artistId: summary.artistId,
        variableKey: summary.variableKey,
      });
    }

    if (!Number.isFinite(summary.averageCandidateScore)) {
      issues.push({
        severity: 'error',
        code: 'invalid-average-candidate-score',
        message: `averageCandidateScore must be finite: ${summary.summaryLabel}`,
        artistId: summary.artistId,
        variableKey: summary.variableKey,
      });
    }

    if (!Number.isFinite(summary.averageConfidenceScore)) {
      issues.push({
        severity: 'error',
        code: 'invalid-average-confidence-score',
        message: `averageConfidenceScore must be finite: ${summary.summaryLabel}`,
        artistId: summary.artistId,
        variableKey: summary.variableKey,
      });
    }

    if (!isAllowedVariableKey(summary.variableKey)) {
      issues.push({
        severity: 'error',
        code: 'invalid-variable-key',
        message: `variableKey is not allowed: ${summary.variableKey}`,
        artistId: summary.artistId,
        variableKey: summary.variableKey,
      });
    }

    if (hasDuplicateValues(summary.sourceIds)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-summary-source-id',
        message: `sourceIds must be unique: ${summary.summaryLabel}`,
        artistId: summary.artistId,
        variableKey: summary.variableKey,
      });
    }
  });

  artistSummaries.forEach((summary) => {
    if (summary.candidateCount < 0) {
      issues.push({
        severity: 'error',
        code: 'invalid-candidate-count',
        message: `candidateCount must be zero or greater: ${summary.summaryLabel}`,
        artistId: summary.artistId,
      });
    }

    if (!Number.isFinite(summary.averageCandidateScore)) {
      issues.push({
        severity: 'error',
        code: 'invalid-average-candidate-score',
        message: `averageCandidateScore must be finite: ${summary.summaryLabel}`,
        artistId: summary.artistId,
      });
    }

    if (!Number.isFinite(summary.averageConfidenceScore)) {
      issues.push({
        severity: 'error',
        code: 'invalid-average-confidence-score',
        message: `averageConfidenceScore must be finite: ${summary.summaryLabel}`,
        artistId: summary.artistId,
      });
    }

    if (hasDuplicateValues(summary.sourceIds)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-summary-source-id',
        message: `sourceIds must be unique: ${summary.summaryLabel}`,
        artistId: summary.artistId,
      });
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    artistSummaryCount: artistSummaries.length,
    variableSummaryCount: variableSummaries.length,
    issues,
  };
}
