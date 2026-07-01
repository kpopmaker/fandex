import type { FandexMetricDefinition } from './fandexMetricTypes';

export const FANDEX_METRIC_DEFINITIONS: FandexMetricDefinition[] = [
  {
    key: 'music',
    label: '음원 반응',
    shortLabel: '음원',
    description: '음원 반응은 노래가 얼마나 꾸준히 소비되는지 보는 지표입니다.',
    category: 'content',
    defaultWeight: 12,
    higherIsBetter: true,
    legacyChartKey: 'musicAlbumPoint',
  },
  {
    key: 'album',
    label: '음반 반응',
    shortLabel: '음반',
    description: '음반 반응은 앨범 단위의 팬 참여와 구매 흐름을 보는 지표입니다.',
    category: 'content',
    defaultWeight: 8,
    higherIsBetter: true,
    legacyChartKey: 'musicAlbumPoint',
  },
  {
    key: 'youtube',
    label: '유튜브 반응',
    shortLabel: '유튜브',
    description: '유튜브 반응은 영상이 얼마나 많이 보고 공유되는지 보는 지표입니다.',
    category: 'attention',
    defaultWeight: 8,
    higherIsBetter: true,
  },
  {
    key: 'sns',
    label: 'SNS 반응',
    shortLabel: 'SNS',
    description: 'SNS 반응은 사람들이 얼마나 자주 이야기하고 반응하는지 보는 지표입니다.',
    category: 'attention',
    defaultWeight: 10,
    higherIsBetter: true,
    legacyChartKey: 'snsFandomPoint',
  },
  {
    key: 'search',
    label: '검색 관심도',
    shortLabel: '검색',
    description: '검색 관심도는 사람들이 해당 아티스트를 얼마나 찾아보는지 보는 지표입니다.',
    category: 'attention',
    defaultWeight: 8,
    higherIsBetter: true,
  },
  {
    key: 'news',
    label: '뉴스/이슈 반응',
    shortLabel: '뉴스',
    description: '뉴스/이슈 반응은 공개 기사와 주요 언급 흐름을 보는 지표입니다.',
    category: 'attention',
    defaultWeight: 10,
    higherIsBetter: true,
    legacyChartKey: 'newsIssuePoint',
  },
  {
    key: 'fandom',
    label: '팬덤 반응',
    shortLabel: '팬덤',
    description: '팬덤 반응은 팬 커뮤니티와 지지 흐름이 얼마나 탄탄한지 보는 지표입니다.',
    category: 'community',
    defaultWeight: 12,
    higherIsBetter: true,
    legacyChartKey: 'snsFandomPoint',
  },
  {
    key: 'brand',
    label: '브랜드 적합도',
    shortLabel: '브랜드',
    description: '브랜드 적합도는 캠페인과 협업에 어울리는 흐름을 보는 지표입니다.',
    category: 'commercial',
    defaultWeight: 10,
    higherIsBetter: true,
    legacyChartKey: 'brandFitPoint',
  },
  {
    key: 'activity',
    label: '활동/컴백 모멘텀',
    shortLabel: '활동',
    description: '활동/컴백 모멘텀은 새 활동이 반응을 얼마나 만들고 있는지 보는 지표입니다.',
    category: 'activity',
    defaultWeight: 10,
    higherIsBetter: true,
    legacyChartKey: 'comebackActivityPoint',
  },
  {
    key: 'momentum',
    label: '흐름 모멘텀',
    shortLabel: '모멘텀',
    description: '흐름 모멘텀은 최근 반응 변화가 얼마나 이어지는지 보는 지표입니다.',
    category: 'activity',
    defaultWeight: 7,
    higherIsBetter: true,
    legacyChartKey: 'growthMomentumPoint',
  },
  {
    key: 'adjustment',
    label: '조정 신호',
    shortLabel: '조정',
    description: '조정 신호는 데이터가 과하게 튄 구간을 완화하기 위한 보조 지표입니다.',
    category: 'quality',
    defaultWeight: 5,
    higherIsBetter: false,
    legacyChartKey: 'riskAdjustmentPoint',
  },
];

export const FANDEX_METRIC_DEFINITION_BY_KEY = new Map(
  FANDEX_METRIC_DEFINITIONS.map((definition) => [
    definition.key,
    definition,
  ]),
);

export const FANDEX_METRIC_DEFINITION_BY_LEGACY_CHART_KEY = new Map(
  FANDEX_METRIC_DEFINITIONS.flatMap((definition) =>
    definition.legacyChartKey ? [[definition.legacyChartKey, definition]] : [],
  ),
);

const metricCategoryLabels: Record<FandexMetricDefinition['category'], string> = {
  activity: '활동',
  attention: '관심',
  commercial: '브랜드',
  community: '커뮤니티',
  content: '콘텐츠',
  quality: '보정',
};

export function getFandexMetricDefinition(key: string) {
  return FANDEX_METRIC_DEFINITION_BY_KEY.get(
    key as FandexMetricDefinition['key'],
  );
}

export function getMetricDefinitionByKey(key: string) {
  return getFandexMetricDefinition(key);
}

export function getMetricDefinitionByLegacyChartKey(key: string) {
  return FANDEX_METRIC_DEFINITION_BY_LEGACY_CHART_KEY.get(
    key as NonNullable<FandexMetricDefinition['legacyChartKey']>,
  );
}

export function getMetricDisplayLabel(key: string) {
  return (
    getMetricDefinitionByKey(key)?.label ??
    getMetricDefinitionByLegacyChartKey(key)?.label ??
    key
  );
}

export function getMetricCategoryLabel(key: string) {
  const category =
    getMetricDefinitionByKey(key)?.category ??
    getMetricDefinitionByLegacyChartKey(key)?.category;

  return category ? metricCategoryLabels[category] ?? category : '기타';
}
