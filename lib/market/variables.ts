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
    description: '멜론 TOP100 차트 점수(1위 100점…100위 1점, 600점 = 100점) + Last.fm 누적 재생·유튜브 누적 조회 점수×0.35',
    source: '멜론 TOP100(1시간마다), Last.fm·YouTube(하루 1번)',
    coefficient: 1.25,
    penalty: false,
    enabled: true,
  },
  {
    id: 'newsIssue',
    label: '뉴스/이슈',
    shortLabel: '뉴스',
    description: '하루 평균 관련 기사 수(최근 7일 70% + 30일 30%). 하루 300건 = 원점수 100점',
    source: '네이버 뉴스 검색, 30분마다',
    coefficient: 1.1,
    penalty: false,
    enabled: true,
  },
  {
    id: 'snsFandom',
    label: 'SNS/팬덤',
    shortLabel: 'SNS',
    description: '전 세계 음악 청취자 수와 공식 유튜브 구독자 수(둘의 평균, 1천 명부터 점수)',
    source: 'Last.fm, YouTube Data API, 하루 1번',
    coefficient: 1.1,
    penalty: false,
    enabled: true,
  },
  {
    id: 'brandFit',
    label: '브랜드 적합도',
    shortLabel: '브랜드',
    description: '최근 30일 광고·모델·앰배서더·협업·화보·패션·뷰티·굿즈 기사 수. 60건 = 원점수 100점',
    source: '네이버 뉴스 검색',
    coefficient: 0.9,
    penalty: false,
    enabled: true,
  },
  {
    id: 'comebackActivity',
    label: '컴백/활동',
    shortLabel: '활동',
    description: '최근 30일 컴백·발매·공연·방송 출연·축제·팬사인회 기사 수. 300건 = 원점수 100점',
    source: '네이버 뉴스 검색',
    coefficient: 0.8,
    penalty: false,
    enabled: true,
  },
  {
    id: 'growthMomentum',
    label: '성장 모멘텀',
    shortLabel: '모멘텀',
    description: '7일 전 대비 음원·뉴스·SNS·브랜드 평균 점수 변화(50 + 차이×2.2). 비교할 기록이 없으면 50점',
    source: 'FANDEX 계산',
    coefficient: 1.0,
    penalty: false,
    enabled: true,
  },
  {
    id: 'riskAdjustment',
    label: '조정 신호',
    shortLabel: '조정',
    description: '최근 30일 논란·사과·소송·부상·불참 등 부정 키워드 기사 수. 120건 = 원점수 100점, 높을수록 가격에서 차감',
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
