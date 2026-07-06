import type { FandexVariableKey } from '../metrics/fandexMetricTypes';
import { getNewsIssueMetricEvidenceForArtist } from './newsIssueMetricInterpretation';
import type { NewsIssueSourceItem } from './newsIssueSourceTypes';

export type NewsIssueChartEvidenceItem = Pick<
  NewsIssueSourceItem,
  | 'sourceId'
  | 'title'
  | 'summary'
  | 'publishedDate'
  | 'sourceName'
  | 'sourceUrl'
  | 'category'
  | 'sentiment'
  | 'issueScore'
  | 'note'
>;

export type NewsIssueChartInsight = {
  artistId: string;
  metricKey: FandexVariableKey;
  hasEvidence: boolean;
  itemCount: number;
  averageIssueScore: number | null;
  maxIssueScore: number | null;
  latestPublishedDate: string | null;
  categoryCounts: Record<string, number>;
  sentimentCounts: Record<string, number>;
  dominantCategory: string | null;
  dominantSentiment: string | null;
  evidenceItems: NewsIssueChartEvidenceItem[];
  sourceCoverageLabel: string;
  sourceEvidenceSummary: string;
  interpretationSummary: string;
  displayNote: string;
};

function getTopCountKey(counts: Record<string, number>) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function getSourceCoverageLabel(itemCount: number) {
  if (itemCount >= 3) {
    return '복수 source seed 연결';
  }

  if (itemCount > 0) {
    return '일부 source seed 연결';
  }

  return '연결 source seed 없음';
}

function mapEvidenceItem(item: NewsIssueSourceItem): NewsIssueChartEvidenceItem {
  return {
    sourceId: item.sourceId,
    title: item.title,
    summary: item.summary,
    publishedDate: item.publishedDate,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    category: item.category,
    sentiment: item.sentiment,
    issueScore: item.issueScore,
    note: item.note,
  };
}

function getSourceEvidenceSummary({
  itemCount,
  dominantCategory,
  dominantSentiment,
  averageIssueScore,
}: {
  itemCount: number;
  dominantCategory: string | null;
  dominantSentiment: string | null;
  averageIssueScore: number | null;
}) {
  if (itemCount === 0) {
    return '선택한 차트 지표와 직접 연결된 기사 기반 source seed가 아직 없습니다.';
  }

  const categoryText = dominantCategory
    ? `주요 category는 ${dominantCategory}`
    : '주요 category는 미분류';
  const sentimentText = dominantSentiment
    ? `주요 sentiment는 ${dominantSentiment}`
    : '주요 sentiment는 미분류';
  const scoreText = averageIssueScore === null
    ? '평균 이슈 강도는 아직 계산하지 않습니다'
    : `평균 이슈 강도는 ${Math.round(averageIssueScore)}입니다`;

  return `${itemCount}개 source seed가 선택 지표 해석에 연결됩니다. ${categoryText}, ${sentimentText}이며 ${scoreText}.`;
}

export function getNewsIssueChartInsight(
  artistId: string,
  metricKey: FandexVariableKey,
): NewsIssueChartInsight {
  const evidence = getNewsIssueMetricEvidenceForArtist(artistId, metricKey);
  const dominantCategory = getTopCountKey(evidence.categoryCounts);
  const dominantSentiment = getTopCountKey(evidence.sentimentCounts);

  return {
    artistId: evidence.artistId,
    metricKey: evidence.metricKey,
    hasEvidence: evidence.itemCount > 0,
    itemCount: evidence.itemCount,
    averageIssueScore: evidence.averageIssueScore,
    maxIssueScore: evidence.maxIssueScore,
    latestPublishedDate: evidence.latestPublishedDate,
    categoryCounts: evidence.categoryCounts,
    sentimentCounts: evidence.sentimentCounts,
    dominantCategory,
    dominantSentiment,
    evidenceItems: evidence.evidenceItems.map(mapEvidenceItem),
    sourceCoverageLabel: getSourceCoverageLabel(evidence.itemCount),
    sourceEvidenceSummary: getSourceEvidenceSummary({
      itemCount: evidence.itemCount,
      dominantCategory,
      dominantSentiment,
      averageIssueScore: evidence.averageIssueScore,
    }),
    interpretationSummary: evidence.interpretationSummary,
    displayNote:
      '이 정보는 선택한 차트 지표와 연결 가능한 기사 기반 source seed를 요약한 참고 정보입니다.',
  };
}
