// FANDEX 7개 변수 정의.
// 계수는 docs/fandex-v1-scoring-formula.md 의 v1 계수를 그대로 사용한다.
// `enabled` 가 false 인 변수는 화면에 노출하지 않는다. 실데이터가 연결된 변수만 true 로 둔다.

export type VariableId =
  | 'musicAlbum'
  | 'newsIssue'
  | 'snsFandom'
  | 'brandFit'
  | 'comebackActivity'
  | 'growthMomentum'
  | 'riskAdjustment';

export type VariableDefinition = {
  id: VariableId;
  label: string;
  shortLabel: string;
  description: string;
  source: string;
  coefficient: number;
  /** true 면 FANDEX 점수에서 차감되는 변수 */
  penalty: boolean;
  enabled: boolean;
};

export const VARIABLES: readonly VariableDefinition[] = [
  {
    id: 'musicAlbum',
    label: '음원/음반',
    shortLabel: '음원',
    description: '음원 차트 순위와 차트 진입 곡 수',
    source: '벅스 실시간 차트',
    coefficient: 1.25,
    penalty: false,
    enabled: true,
  },
  {
    id: 'newsIssue',
    label: '뉴스/이슈',
    shortLabel: '뉴스',
    description: '최근 기사 수와 증가 속도',
    source: '네이버 뉴스 검색',
    coefficient: 1.1,
    penalty: false,
    enabled: true,
  },
  {
    id: 'snsFandom',
    label: 'SNS/팬덤',
    shortLabel: 'SNS',
    description: '공식 유튜브 구독자·조회수 증가와 해외 청취자',
    source: 'YouTube Data API, Last.fm',
    coefficient: 1.1,
    penalty: false,
    enabled: true,
  },
  {
    id: 'brandFit',
    label: '브랜드 적합도',
    shortLabel: '브랜드',
    description: '광고 모델·앰배서더·브랜드 협업 기사 수',
    source: '네이버 뉴스 검색',
    coefficient: 0.9,
    penalty: false,
    enabled: true,
  },
  {
    id: 'comebackActivity',
    label: '컴백/활동',
    shortLabel: '활동',
    description: '최근 발매일과 컴백·음악방송 관련 기사로 본 활동 단계',
    source: 'MusicBrainz, 네이버 뉴스 검색',
    coefficient: 0.8,
    penalty: false,
    enabled: true,
  },
  {
    id: 'growthMomentum',
    label: '성장 모멘텀',
    shortLabel: '모멘텀',
    description: '다른 변수들의 최근 상승 속도',
    source: 'FANDEX 계산',
    coefficient: 1.0,
    penalty: false,
    enabled: true,
  },
  {
    id: 'riskAdjustment',
    label: '조정 신호',
    shortLabel: '조정',
    description: '논란·부정 키워드 기사 비중. 높을수록 가격에서 차감',
    source: '네이버 뉴스 검색',
    coefficient: 1.4,
    penalty: true,
    enabled: true,
  },
];

export const ENABLED_VARIABLES = VARIABLES.filter((variable) => variable.enabled);

export const POSITIVE_COEFFICIENT_SUM = ENABLED_VARIABLES.filter(
  (variable) => !variable.penalty,
).reduce((sum, variable) => sum + variable.coefficient, 0);

export function getVariable(id: VariableId): VariableDefinition {
  const variable = VARIABLES.find((item) => item.id === id);
  if (!variable) throw new Error(`Unknown variable: ${id}`);
  return variable;
}
