import type { FandexVariableKey } from '../metrics/fandexMetricTypes';
import { getNewsIssueMetricEvidenceForArtist } from './newsIssueMetricInterpretation';
import type {
  NewsIssueCategory,
  NewsIssueSentiment,
  NewsIssueSourceItem,
} from './newsIssueSourceTypes';

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
> & {
  categoryLabel: string;
  sentimentLabel: string;
};

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
  dominantCategory: NewsIssueCategory | null;
  dominantCategoryLabel: string | null;
  dominantSentiment: NewsIssueSentiment | null;
  dominantSentimentLabel: string | null;
  evidenceItems: NewsIssueChartEvidenceItem[];
  sourceCoverageLabel: string;
  sourceEvidenceSummary: string;
  interpretationSummary: string;
  displayNote: string;
};

const newsIssueCategoryLabels: Record<NewsIssueCategory, string> = {
  album: '앨범/발매',
  brand: '브랜드',
  broadcast: '방송',
  chart: '차트',
  comeback: '컴백',
  fan: '팬덤',
  festival: '페스티벌',
  general: '일반 이슈',
  global: '글로벌',
  performance: '퍼포먼스',
  risk: '리스크',
};

const newsIssueSentimentLabels: Record<NewsIssueSentiment, string> = {
  mixed: '혼합',
  negative: '부정',
  neutral: '중립',
  positive: '긍정',
  unknown: '미확인',
};

export function getNewsIssueCategoryLabel(category: NewsIssueCategory) {
  return newsIssueCategoryLabels[category];
}

export function getNewsIssueSentimentLabel(sentiment: NewsIssueSentiment) {
  return newsIssueSentimentLabels[sentiment];
}

function getTopCountKey<T extends string>(counts: Record<string, number>) {
  return (
    Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] as
      | T
      | undefined
  ) ?? null;
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
    categoryLabel: getNewsIssueCategoryLabel(item.category),
    sentiment: item.sentiment,
    sentimentLabel: getNewsIssueSentimentLabel(item.sentiment),
    issueScore: item.issueScore,
    note: item.note,
  };
}

function getSourceEvidenceSummary({
  itemCount,
  dominantCategoryLabel,
  dominantSentimentLabel,
  averageIssueScore,
}: {
  itemCount: number;
  dominantCategoryLabel: string | null;
  dominantSentimentLabel: string | null;
  averageIssueScore: number | null;
}) {
  if (itemCount === 0) {
    return '선택한 차트 지표에 직접 연결된 기사 기반 source seed가 아직 없습니다.';
  }

  const categoryText = dominantCategoryLabel
    ? `주요 category는 ${dominantCategoryLabel}`
    : '주요 category는 미분류';
  const sentimentText = dominantSentimentLabel
    ? `주요 sentiment는 ${dominantSentimentLabel}`
    : '주요 sentiment는 미분류';
  const scoreText =
    averageIssueScore === null
      ? '평균 이슈 강도는 아직 계산되지 않았습니다'
      : `평균 이슈 강도는 ${Math.round(averageIssueScore)}입니다`;

  return `${itemCount}개 source seed가 선택 지표 해석에 연결됩니다. ${categoryText}, ${sentimentText}이며 ${scoreText}. 최신 preview는 최대 3개까지 표시합니다.`;
}

export function getNewsIssueChartInsight(
  artistId: string,
  metricKey: FandexVariableKey,
): NewsIssueChartInsight {
  const evidence = getNewsIssueMetricEvidenceForArtist(artistId, metricKey);
  const dominantCategory = getTopCountKey<NewsIssueCategory>(
    evidence.categoryCounts,
  );
  const dominantSentiment = getTopCountKey<NewsIssueSentiment>(
    evidence.sentimentCounts,
  );
  const dominantCategoryLabel = dominantCategory
    ? getNewsIssueCategoryLabel(dominantCategory)
    : null;
  const dominantSentimentLabel = dominantSentiment
    ? getNewsIssueSentimentLabel(dominantSentiment)
    : null;

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
    dominantCategoryLabel,
    dominantSentiment,
    dominantSentimentLabel,
    evidenceItems: evidence.evidenceItems.map(mapEvidenceItem),
    sourceCoverageLabel: getSourceCoverageLabel(evidence.itemCount),
    sourceEvidenceSummary: getSourceEvidenceSummary({
      itemCount: evidence.itemCount,
      dominantCategoryLabel,
      dominantSentimentLabel,
      averageIssueScore: evidence.averageIssueScore,
    }),
    interpretationSummary: evidence.interpretationSummary,
    displayNote:
      '이 정보는 선택한 차트 지표와 연결 가능한 기사 기반 source seed를 요약한 참고 정보입니다.',
  };
}
