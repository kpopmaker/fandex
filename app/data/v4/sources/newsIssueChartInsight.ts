import type { FandexVariableKey } from '../metrics/fandexMetricTypes';
import { getNewsIssueMetricEvidenceForArtist } from './newsIssueMetricInterpretation';

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
  interpretationSummary: string;
  displayNote: string;
};

export function getNewsIssueChartInsight(
  artistId: string,
  metricKey: FandexVariableKey,
): NewsIssueChartInsight {
  const evidence = getNewsIssueMetricEvidenceForArtist(artistId, metricKey);

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
    interpretationSummary: evidence.interpretationSummary,
    displayNote:
      '이 정보는 선택한 차트 지표와 연결 가능한 기사 기반 source seed를 요약한 참고 정보입니다.',
  };
}
