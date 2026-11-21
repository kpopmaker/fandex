// FANDEX 변수 정의.
// 2026-11-21 새 방정식: 변수 간 중복을 없애고 6개로 줄였다. 계수와 기준점은 lib/market/formula.ts 참고.
// `enabled` 가 false 인 변수는 화면에 노출하지 않고 종합 점수에도 들어가지 않는다.
// 브랜드·활동은 뉴스와 상관 +0.9로 사실상 같은 변수여서 화제성의 가중치로 흡수했다.
// 원점수는 '더보기'의 근거로 계속 계산해 저장한다.

export type VariableId =
  | 'musicAlbum'
  | 'newsIssue'
  | 'snsFandom'
  | 'brandFit'
  | 'comebackActivity'
  | 'growthMomentum'
  | 'riskAdjustment'
  | 'albumSales';

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
    label: '음원',
    shortLabel: '음원',
    description: '멜론 TOP100 점수 합(1위 100점~100위 1점). 차트 밖 그룹은 누적 재생·조회 점수의 45%를 바닥으로 받되 35점을 넘지 않는다',
    source: '멜론 TOP100(1시간마다), Last.fm·YouTube(하루 1번)',
    coefficient: 1.2,
    penalty: false,
    enabled: true,
  },
  {
    id: 'newsIssue',
    label: '화제성',
    shortLabel: '화제성',
    description: '하루 평균 관련 기사 수(최근 7일 45% + 30일 35% + 90일 20%). 하루 0.2건 15점 ~ 18건 88점. 그중 컴백·공연·광고 기사 비중만큼 최대 1.25배 가중',
    source: '네이버 뉴스 검색, 30분마다',
    coefficient: 1.0,
    penalty: false,
    enabled: true,
  },
  {
    id: 'snsFandom',
    label: '팬덤',
    shortLabel: '팬덤',
    description: '전 세계 음악 청취자 수·누적 재생과 공식 유튜브 구독자 수·누적 조회(있는 것들의 평균)',
    source: 'Last.fm, YouTube Data API, 하루 1번',
    coefficient: 1.3,
    penalty: false,
    enabled: true,
  },
  {
    id: 'brandFit',
    label: '브랜드 적합도',
    shortLabel: '브랜드',
    description: '광고·모델·앰배서더·협업·화보·패션·뷰티·굿즈 기사 수(30일 60% + 90일 40%). 1건 15점 ~ 120건 88점',
    source: '네이버 뉴스 검색',
    coefficient: 0.9,
    penalty: false,
    // 2026-11-21: 뉴스와 상관 +0.90이라 화제성 가중치로 흡수했다. 원점수는 더보기 근거로만 쓴다.
    enabled: false,
  },
  {
    id: 'comebackActivity',
    label: '컴백/활동',
    shortLabel: '활동',
    description: '컴백·발매·공연·방송 출연·축제·팬사인회 기사 수(30일 60% + 90일 40%). 3건 15점 ~ 600건 88점',
    source: '네이버 뉴스 검색',
    coefficient: 0.8,
    penalty: false,
    // 2026-11-21: 뉴스와 상관 +0.92라 화제성 가중치로 흡수했다. 원점수는 더보기 근거로만 쓴다.
    enabled: false,
  },
  {
    id: 'albumSales',
    label: '음반',
    shortLabel: '음반',
    description: '최신 앨범의 초동판매량(발매 첫 주, 버전 합산). 1,000장 15점 ~ 100만장 88점. 발매 후 시간이 지나면 망각곡선처럼 옅어진다',
    source: '써클차트 주간 앨범 차트, 주 1회',
    coefficient: 1.0,
    penalty: false,
    enabled: true,
  },
  {
    id: 'growthMomentum',
    label: '성장 모멘텀',
    shortLabel: '모멘텀',
    description: '7일 전 대비 음원·화제성·팬덤·음반 평균 점수 변화(50 + 차이×3). 비교할 기록이 없으면 50점',
    source: 'FANDEX 계산',
    coefficient: 1.0,
    penalty: false,
    enabled: true,
  },
  {
    id: 'riskAdjustment',
    label: '조정 신호',
    shortLabel: '조정',
    description: '전체 기사 중 논란·사과·소송·부상·불참 등 부정 키워드 기사의 비율. 1% 15점 ~ 20% 88점, 높을수록 가격에서 차감. 기사가 적은 그룹은 전체 평균인 2% 쪽으로 보정',
    source: '네이버 뉴스 검색',
    coefficient: 1.0,
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
