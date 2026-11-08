// 아티스트 상세 '더보기': 변수마다 점수가 왜 그렇게 나왔고 왜 움직였는지 실제 숫자로 설명한다.

import type { LatestGroup, MetricId, NewsHeadline } from './dataFiles';
import { MOMENTUM_SOURCES, SCORE_REF, listenerScore, subscriberScore, type RawScores } from './formula';
import { POSITIVE_COEFFICIENT_SUM, getVariable, type VariableId } from './variables';

export type Metrics = Record<MetricId, number | null>;

export type DetailItem = { title: string; url?: string; meta?: string };

export type VariableDetail = {
  /** 한 줄 요약: 1주 동안 왜 올랐/내렸는지 */
  summary: string;
  /** 점수 계산 근거 */
  lines: string[];
  itemsTitle?: string;
  items: DetailItem[];
  note?: string;
};

export type ExplainInput = {
  id: VariableId;
  raw: RawScores;
  weekAgoRaw: RawScores | null;
  metrics: Metrics;
  weekAgoMetrics: Metrics | null;
  /** 1주 전 기록이 과거 복원(벅스 일간·현재 팬덤 값) 구간인지 */
  weekAgoBackfilled: boolean;
  group: LatestGroup;
  chartTracks: { rank: number; title: string }[];
};

const count = (value: number | null) => (value === null ? '—' : Math.round(value).toLocaleString('ko-KR'));
const point = (value: number) => value.toFixed(1);
const signed = (value: number, digits = 1) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}`;

function people(thousands: number | null): string {
  if (thousands === null) return '—';
  const value = thousands * 1000;
  if (value >= 10_000) return `${(value / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만 명`;
  return `${value.toLocaleString('ko-KR')}명`;
}

function relativeDays(time: number): string {
  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days <= 0) {
    const hours = Math.max(1, Math.floor((Date.now() - time) / 3_600_000));
    return `${hours}시간 전`;
  }
  return `${days}일 전`;
}

function headlineItems(headlines: NewsHeadline[] | undefined): DetailItem[] {
  return (headlines ?? []).map((headline) => ({
    title: headline.title,
    url: headline.url,
    meta: relativeDays(headline.publishedAt),
  }));
}

/** 원점수 변화가 가격에 준 영향(다른 변수가 그대로일 때) */
function priceImpact(id: VariableId, delta: number): string {
  const variable = getVariable(id);
  const scoreDelta = ((variable.penalty ? -1 : 1) * delta * variable.coefficient) / POSITIVE_COEFFICIENT_SUM;
  const rate = Math.exp(scoreDelta / 50) - 1;
  return `FANDEX 점수 ${signed(scoreDelta, 2)}점, 가격 약 ${signed(rate * 100, 1)}%`;
}

/** 실제 숫자가 이전보다 어떻게 바뀌었는지 한 문장으로 */
function movement(
  label: string,
  now: number | null,
  before: number | null,
  unit: string,
  rawDelta: number | null,
  id: VariableId,
): string {
  if (rawDelta === null || before === null || now === null) return `1주 전 기록이 없어 변화를 비교할 수 없어요.`;
  const direction = rawDelta > 0.05 ? '올랐어요' : rawDelta < -0.05 ? '내렸어요' : '거의 그대로예요';
  const change =
    now === before
      ? `${label}가 1주 전과 같은 ${count(now)}${unit}이라`
      : `${label}가 1주 전 ${count(before)}${unit}에서 ${count(now)}${unit}로 ${now > before ? '늘어' : '줄어'}`;
  if (Math.abs(rawDelta) <= 0.05) return `${change} 점수는 ${direction}.`;
  return `${change} 점수가 ${signed(rawDelta)}점 ${direction} (${priceImpact(id, rawDelta)}).`;
}

export function explainVariable(input: ExplainInput): VariableDetail {
  const { id, raw, weekAgoRaw, metrics, weekAgoMetrics, group } = input;
  const rawDelta = weekAgoRaw ? raw[id] - weekAgoRaw[id] : null;
  const before = (key: MetricId) => weekAgoMetrics?.[key] ?? null;
  const backfillNote = input.weekAgoBackfilled
    ? '1주 전 값은 과거 복원 기록이에요.'
    : undefined;

  switch (id) {
    case 'musicAlbum': {
      const points = metrics.chartPoints ?? group.chartPoints;
      return {
        summary: movement('멜론 TOP100 차트 점수', points, before('chartPoints'), '점', rawDelta, id),
        lines: [
          `차트 점수 = 멜론 TOP100에 든 곡마다 (101 − 순위)점을 더한 값. 지금 ${count(points)}점이에요.`,
          `원점수 ${point(raw[id])}점 = 차트 점수 ${SCORE_REF.chartPoints}점을 100점으로 둔 로그 눈금(넘으면 100점 이상).`,
        ],
        itemsTitle: '지금 멜론 TOP100에 든 곡',
        items: input.chartTracks.map((track) => ({ title: track.title, meta: `${track.rank}위` })),
        note: input.weekAgoBackfilled
          ? '1주 전 값은 과거 복원 기록이라 멜론 대신 벅스 일간 차트 기준이에요. 두 차트 순위가 달라 이 기간 변화에는 차트 차이가 섞여 있어요.'
          : undefined,
      };
    }
    case 'newsIssue': {
      const week = metrics.news7d ?? group.news7d ?? null;
      return {
        summary: movement('최근 7일 관련 기사', week, before('news7d'), '건', rawDelta, id),
        lines: [
          `최근 7일 관련 기사 ${count(week)}건, 하루 평균 ${week === null ? '—' : (week / 7).toFixed(1)}건이에요(최근 24시간 ${count(group.news24h)}건).`,
          `원점수 ${point(raw[id])}점 = 하루 평균 ${SCORE_REF.newsDaily}건을 100점으로 둔 로그 눈금. 하루 한두 건에 가격이 출렁이지 않게 7일 평균을 써요.`,
          '사진만 있는 기사, 같은 보도자료의 중복, 제목에 그룹명 없이 여러 팀을 나열한 기사는 세지 않아요.',
        ],
        itemsTitle: '최근 24시간 기사',
        items: headlineItems(group.headlines),
        note: backfillNote,
      };
    }
    case 'snsFandom': {
      const listeners = metrics.listenersK;
      const subscribers = metrics.subscribersK;
      const parts = [
        listeners !== null ? `Last.fm 청취자 ${people(listeners)}(${point(listenerScore(listeners * 1000))}점)` : null,
        subscribers !== null ? `유튜브 구독자 ${people(subscribers)}(${point(subscriberScore(subscribers * 1000))}점)` : null,
      ].filter(Boolean);
      const beforeListeners = before('listenersK');
      const beforeSubscribers = before('subscribersK');
      const changes = [
        listeners !== null && beforeListeners !== null && listeners !== beforeListeners
          ? `청취자 ${signed(((listeners - beforeListeners) / Math.max(beforeListeners, 1)) * 100, 1)}%`
          : null,
        subscribers !== null && beforeSubscribers !== null && subscribers !== beforeSubscribers
          ? `구독자 ${signed(((subscribers - beforeSubscribers) / Math.max(beforeSubscribers, 1)) * 100, 1)}%`
          : null,
      ].filter(Boolean);
      return {
        summary:
          rawDelta === null
            ? '1주 전 기록이 없어 변화를 비교할 수 없어요.'
            : changes.length
              ? `1주 동안 ${changes.join(', ')} 바뀌어 점수가 ${signed(rawDelta)}점 움직였어요 (${priceImpact(id, rawDelta)}).`
              : '1주 동안 청취자·구독자 수가 거의 그대로라 점수도 그대로예요.',
        lines: [
          parts.length ? `${parts.join(', ')}의 평균이 ${point(raw[id])}점이에요.` : '확인된 Last.fm·유튜브 기록이 없어요.',
          '청취자 1만 명 = 0점, 500만 명 = 100점 / 구독자 1만 명 = 0점, 2,000만 명 = 100점(더 많으면 100점 이상, 로그 눈금).',
        ],
        items: [],
        note: input.weekAgoBackfilled
          ? '과거 복원 구간은 청취자·구독자 과거 기록이 없어 현재 값을 써서, 이 기간에는 변화가 없어요.'
          : '하루 1번 갱신돼요.',
      };
    }
    case 'brandFit':
      return {
        summary: movement('최근 30일 광고·모델·협업 기사', metrics.brand30d, before('brand30d'), '건', rawDelta, id),
        lines: [
          `최근 30일 광고·모델·앰배서더·협업·화보 기사 ${count(metrics.brand30d)}건이에요.`,
          `원점수 ${point(raw[id])}점 = ${SCORE_REF.brand30d}건을 100점으로 둔 로그 눈금(넘으면 100점 이상).`,
        ],
        itemsTitle: '점수에 잡힌 최근 기사',
        items: headlineItems(group.examples?.brand),
        note: backfillNote,
      };
    case 'comebackActivity':
      return {
        summary: movement('최근 14일 컴백·발매·무대 기사', metrics.comeback14d, before('comeback14d'), '건', rawDelta, id),
        lines: [
          `최근 14일 컴백·발매·음악방송·콘서트 기사 ${count(metrics.comeback14d)}건이에요.`,
          `원점수 ${point(raw[id])}점 = ${SCORE_REF.comeback14d}건을 100점으로 둔 로그 눈금(넘으면 100점 이상).`,
        ],
        itemsTitle: '점수에 잡힌 최근 기사',
        items: headlineItems(group.examples?.comeback),
        note: backfillNote,
      };
    case 'growthMomentum': {
      const average = (scores: RawScores) =>
        MOMENTUM_SOURCES.reduce((sum, source) => sum + scores[source], 0) / MOMENTUM_SOURCES.length;
      const now = average(raw);
      const then = weekAgoRaw ? average(weekAgoRaw) : null;
      const sourceNames = MOMENTUM_SOURCES.map((source) => getVariable(source).label).join('·');
      return {
        summary:
          rawDelta === null
            ? '1주 전 기록이 없어 변화를 비교할 수 없어요.'
            : `${sourceNames} 평균 점수가 1주 전 ${then === null ? '—' : point(then)}점에서 지금 ${point(now)}점이 되면서 모멘텀이 ${signed(rawDelta)}점 ${rawDelta >= 0 ? '올랐어요' : '내렸어요'} (${priceImpact(id, rawDelta)}).`,
        lines: [
          `모멘텀 = 50 + (지금 평균 − 7일 전 평균) × 2.2. 4개 변수가 7일 전보다 좋아지면 50점보다 높고, 나빠지면 낮아요(0점 아래로는 안 내려가요).`,
          `지금 ${sourceNames} 평균은 ${point(now)}점, 모멘텀은 ${point(raw[id])}점이에요.`,
        ],
        items: MOMENTUM_SOURCES.map((source) => ({
          title: getVariable(source).label,
          meta: weekAgoRaw
            ? `${point(weekAgoRaw[source])} → ${point(raw[source])}점`
            : `${point(raw[source])}점`,
        })),
        itemsTitle: '7일 전 → 지금',
        note: '7일 전 값은 그날 마감 기록으로 다시 계산한 것이라 실제 계산값과 조금 다를 수 있어요.',
      };
    }
    case 'riskAdjustment':
      return {
        summary: movement('최근 7일 부정 키워드 기사', metrics.risk7d, before('risk7d'), '건', rawDelta, id),
        lines: [
          `최근 7일 논란·사과·소송·탈퇴 같은 부정 키워드가 들어간 기사 ${count(metrics.risk7d)}건이에요. 이 점수는 가격에서 빼요.`,
          `원점수 ${point(raw[id])}점 = ${SCORE_REF.risk7d}건을 100점으로 둔 로그 눈금. 키워드로만 고르기 때문에 그룹 잘못이 아닌 기사도 섞일 수 있어요.`,
        ],
        itemsTitle: '점수에 잡힌 최근 기사',
        items: headlineItems(group.examples?.risk),
        note: backfillNote,
      };
  }
}
