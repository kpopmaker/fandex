import { FANDEX_METRIC_DEFINITIONS } from './fandexMetricDefinitions';
import type {
  FandexDataQualityLabel,
  FandexMetricSourceInfo,
  FandexMetricSourceSummary,
  FandexVariableKey,
} from './fandexMetricTypes';

const fallbackMetricSourceInfo: FandexMetricSourceInfo = {
  metricKey: 'unknown',
  sourceStage: 'preview_seed',
  qualityLabel: 'preview',
  displayLabel: 'preview seed',
  description: '현재는 FANDEX MVP preview seed 기준입니다.',
  futureSourceHint: '향후 실제 데이터 연동 시 참고할 수 있는 출처 후보를 연결할 수 있습니다.',
};

export const FANDEX_METRIC_SOURCE_REGISTRY: Record<
  FandexVariableKey,
  FandexMetricSourceInfo
> = {
  music: {
    metricKey: 'music',
    sourceStage: 'preview_seed',
    qualityLabel: 'preview',
    displayLabel: 'preview seed',
    description: '현재는 FANDEX MVP preview seed 기준입니다.',
    futureSourceHint: '향후 Melon, Spotify 등 차트와 스트리밍 흐름을 참고할 수 있습니다.',
  },
  album: {
    metricKey: 'album',
    sourceStage: 'preview_seed',
    qualityLabel: 'preview',
    displayLabel: 'preview seed',
    description: '현재는 FANDEX MVP preview seed 기준입니다.',
    futureSourceHint: '향후 Hanteo, Circle Chart 등 음반 흐름을 참고할 수 있습니다.',
  },
  youtube: {
    metricKey: 'youtube',
    sourceStage: 'preview_seed',
    qualityLabel: 'preview',
    displayLabel: 'preview seed',
    description: '현재는 FANDEX MVP preview seed 기준입니다.',
    futureSourceHint: '향후 YouTube 조회와 참여 흐름을 참고할 수 있습니다.',
  },
  sns: {
    metricKey: 'sns',
    sourceStage: 'preview_seed',
    qualityLabel: 'preview',
    displayLabel: 'preview seed',
    description: '현재는 FANDEX MVP preview seed 기준입니다.',
    futureSourceHint: '향후 Instagram, TikTok, X 등 반응 흐름을 참고할 수 있습니다.',
  },
  search: {
    metricKey: 'search',
    sourceStage: 'preview_seed',
    qualityLabel: 'preview',
    displayLabel: 'preview seed',
    description: '현재는 FANDEX MVP preview seed 기준입니다.',
    futureSourceHint: '향후 Google Trends, Naver DataLab 등 검색 흐름을 참고할 수 있습니다.',
  },
  news: {
    metricKey: 'news',
    sourceStage: 'preview_seed',
    qualityLabel: 'preview',
    displayLabel: 'preview seed',
    description: '현재는 FANDEX MVP preview seed 기준입니다.',
    futureSourceHint: '향후 뉴스 언급량과 이슈량 흐름을 참고할 수 있습니다.',
  },
  fandom: {
    metricKey: 'fandom',
    sourceStage: 'preview_seed',
    qualityLabel: 'preview',
    displayLabel: 'preview seed',
    description: '현재는 FANDEX MVP preview seed 기준입니다.',
    futureSourceHint: '향후 팬덤 커뮤니티, 투표, 활동 지표를 참고할 수 있습니다.',
  },
  brand: {
    metricKey: 'brand',
    sourceStage: 'preview_seed',
    qualityLabel: 'preview',
    displayLabel: 'preview seed',
    description: '현재는 FANDEX MVP preview seed 기준입니다.',
    futureSourceHint: '향후 광고, 협업, 브랜드 언급 흐름을 참고할 수 있습니다.',
  },
  activity: {
    metricKey: 'activity',
    sourceStage: 'preview_seed',
    qualityLabel: 'preview',
    displayLabel: 'preview seed',
    description: '현재는 FANDEX MVP preview seed 기준입니다.',
    futureSourceHint: '향후 컴백, 투어, 방송, 콘텐츠 일정 흐름을 참고할 수 있습니다.',
  },
  momentum: {
    metricKey: 'momentum',
    sourceStage: 'derived_signal',
    qualityLabel: 'preview',
    displayLabel: 'derived preview',
    description: '현재는 여러 preview seed 흐름에서 파생한 FANDEX MVP 기준입니다.',
    futureSourceHint: '향후 여러 지표의 변화 흐름을 함께 참고할 수 있습니다.',
  },
  adjustment: {
    metricKey: 'adjustment',
    sourceStage: 'derived_signal',
    qualityLabel: 'preview',
    displayLabel: 'derived preview',
    description: '현재는 preview seed를 보정하는 FANDEX MVP 기준입니다.',
    futureSourceHint: '향후 이상치 완화와 데이터 보정 신호를 참고할 수 있습니다.',
  },
};

export function getMetricSourceInfo(metricKey: string): FandexMetricSourceInfo {
  return (
    FANDEX_METRIC_SOURCE_REGISTRY[metricKey as FandexVariableKey] ??
    { ...fallbackMetricSourceInfo, metricKey }
  );
}

export function getMetricQualityLabel(metricKey: string): FandexDataQualityLabel {
  return getMetricSourceInfo(metricKey).qualityLabel;
}

export function getAllMetricSourceInfo() {
  return FANDEX_METRIC_DEFINITIONS.map((definition) =>
    getMetricSourceInfo(definition.key),
  );
}

export function getMetricSourceSummary(): FandexMetricSourceSummary {
  const sources = getAllMetricSourceInfo();

  return {
    totalMetrics: sources.length,
    previewSeedMetrics: sources.filter(
      (source) =>
        source.sourceStage === 'preview_seed' ||
        source.sourceStage === 'derived_signal',
    ).length,
    plannedApiMetrics: sources.filter(
      (source) => source.sourceStage === 'planned_api',
    ).length,
    trackedMetrics: sources.filter((source) => source.qualityLabel === 'tracked')
      .length,
  };
}
