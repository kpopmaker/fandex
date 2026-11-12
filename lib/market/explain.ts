// 아티스트 상세 '더보기': 변수 점수가 어떤 곡·이슈·광고·기사 때문에 나왔는지(원인)를 먼저 보여주고,
// 계산 방법은 아래에 접어 둔다(2026-11-12 사용자 요청).

import type { LatestGroup, MetricId, NewsHeadline, NewsStory } from './dataFiles';
import {
  CONSUMPTION_WEIGHT,
  MIN_RAW,
  MOMENTUM_SOURCES,
  SCORE_REF,
  listenerScore,
  subscriberScore,
  type RawScores,
} from './formula';
import { POSITIVE_COEFFICIENT_SUM, getVariable, type VariableId } from './variables';

export type Metrics = Record<MetricId, number | null>;

export type DetailItem = {
  title: string;
  url?: string;
  /** 오른쪽 작은 글씨(순위, 기사 수, 날짜 등) */
  meta?: string;
  /** 왼쪽 꼬리표(잡힌 키워드, 신규·상승 등) */
  tag?: string;
  tone?: 'up' | 'down' | 'neutral';
};

export type VariableDetail = {
  /** 한두 문장: 이 점수가 무엇 때문에 나왔는지 */
  headline: string;
  causesTitle?: string;
  causes: DetailItem[];
  /** 1주 동안의 변화와 가격 영향 */
  change: string;
  /** 계산 방법(접어서 보여준다) */
  method: string[];
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

const count = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : Math.round(value).toLocaleString('ko-KR');
const point = (value: number) => value.toFixed(1);
const signed = (value: number, digits = 1) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}`;

function bigNumber(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
  if (value >= 10_000) return `${(value / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`;
  return value.toLocaleString('ko-KR');
}

function ago(time: number): string {
  const hours = Math.max(1, Math.floor((Date.now() - time) / 3_600_000));
  return hours < 24 ? `${hours}시간 전` : `${Math.floor(hours / 24)}일 전`;
}

function quote(title: string, max = 28): string {
  return `'${title.length > max ? `${title.slice(0, max)}…` : title}'`;
}

function articleItems(headlines: NewsHeadline[] | undefined): DetailItem[] {
  return (headlines ?? []).map((headline) => ({
    title: headline.title,
    url: headline.url,
    meta: ago(headline.publishedAt),
    tag: headline.keyword,
  }));
}

/** 원점수 변화가 가격에 준 영향(다른 변수가 그대로일 때) */
function priceImpact(id: VariableId, delta: number): string {
  const variable = getVariable(id);
  const scoreDelta = ((variable.penalty ? -1 : 1) * delta * variable.coefficient) / POSITIVE_COEFFICIENT_SUM;
  const rate = Math.exp(scoreDelta / 50) - 1;
  return `가격 약 ${signed(rate * 100, 1)}%`;
}

function changeSentence(id: VariableId, rawDelta: number | null, what?: string): string {
  if (rawDelta === null) return '1주 전 기록이 없어 변화를 비교할 수 없어요.';
  if (Math.abs(rawDelta) <= 0.05) return `1주 전과 점수가 거의 같아요${what ? `(${what})` : ''}.`;
  return `1주 동안 ${what ? `${what}, ` : ''}점수가 ${signed(rawDelta)}점 ${rawDelta > 0 ? '올랐어요' : '내렸어요'}(${priceImpact(id, rawDelta)}).`;
}

function countChange(label: string, now: number | null | undefined, before: number | null | undefined, unit: string) {
  if (now === null || now === undefined || before === null || before === undefined) return undefined;
  if (now === before) return `${label} ${count(now)}${unit} 그대로`;
  return `${label} ${count(before)}${unit} → ${count(now)}${unit}`;
}

const MINIMUM_NOTE = `기록이 하나도 없는 그룹도 0점이 되지 않게 최소 ${MIN_RAW}점을 줘요.`;

export function explainVariable(input: ExplainInput): VariableDetail {
  const { id, raw, weekAgoRaw, metrics, weekAgoMetrics, group } = input;
  const rawDelta = weekAgoRaw ? raw[id] - weekAgoRaw[id] : null;
  const before = (key: MetricId) => weekAgoMetrics?.[key] ?? null;
  const backfillNote = input.weekAgoBackfilled ? '1주 전 값은 과거 복원 기록이에요.' : undefined;

  switch (id) {
    case 'musicAlbum': {
      const points = metrics.chartPoints ?? group.chartPoints;
      const weekAgo = group.tracksWeekAgo;
      const weekAgoByTitle = new Map((weekAgo ?? []).map(([rank, title]) => [title, rank]));
      const causes: DetailItem[] = input.chartTracks.map((track) => {
        const previous = weekAgoByTitle.get(track.title);
        const movement =
          weekAgo === undefined
            ? undefined
            : previous === undefined
              ? { tag: '신규 진입', tone: 'up' as const }
              : previous > track.rank
                ? { tag: `▲${previous - track.rank}`, tone: 'up' as const }
                : previous < track.rank
                  ? { tag: `▼${track.rank - previous}`, tone: 'down' as const }
                  : { tag: '유지', tone: 'neutral' as const };
        return { title: track.title, meta: `${track.rank}위 · +${101 - track.rank}점`, ...movement };
      });
      const current = new Set(input.chartTracks.map((track) => track.title));
      for (const [rank, title] of weekAgo ?? []) {
        if (!current.has(title)) causes.push({ title, meta: `1주 전 ${rank}위`, tag: '차트 아웃', tone: 'down' });
      }
      const playcount = group.playcount ?? null;
      const views = group.views ?? null;
      const consumption = [
        playcount ? `Last.fm 누적 재생 ${bigNumber(playcount)}회` : null,
        views ? `유튜브 누적 조회 ${bigNumber(views)}회` : null,
      ].filter(Boolean);
      const top = input.chartTracks[0];
      return {
        headline: top
          ? `멜론 TOP100에 ${quote(top.title)}(${top.rank}위)${input.chartTracks.length > 1 ? ` 등 ${input.chartTracks.length}곡` : ''}이 올라 차트 점수 ${count(points)}점을 받았어요.${consumption.length ? ` 여기에 ${consumption.join(', ')}이 더해졌어요.` : ''}`
          : consumption.length
            ? `지금 멜론 TOP100에 든 곡은 없어요. 점수는 ${consumption.join(', ')}에서 나왔어요.`
            : `지금 멜론 TOP100에 든 곡도, 확인된 재생·조회 기록도 없어요. ${MINIMUM_NOTE}`,
        causesTitle: input.chartTracks.length || weekAgo?.length ? '멜론 TOP100 곡 (1주 전과 비교)' : undefined,
        causes,
        change: changeSentence(id, rawDelta, countChange('차트 점수', points, before('chartPoints'), '점')),
        method: [
          `차트 점수 = 멜론 TOP100에 든 곡마다 (101 − 순위)점을 더한 값. ${SCORE_REF.chartPoints}점이 100점(로그 눈금, 넘으면 100점 이상).`,
          `누적 소비 = Last.fm 누적 재생(50억 회 = 100점)과 유튜브 누적 조회(500억 회 = 100점) 점수의 평균 × ${CONSUMPTION_WEIGHT}. 차트 밖 그룹도 들은 만큼 점수가 붙어요.`,
        ],
        note: input.weekAgoBackfilled
          ? '1주 전 값은 과거 복원 기록이라 멜론 대신 벅스 일간 차트 기준이에요.'
          : weekAgo === undefined
            ? '1주 전 곡 목록은 기록이 쌓이면(일주일 뒤) 비교해 보여드려요.'
            : undefined,
      };
    }
    case 'newsIssue': {
      const week = metrics.news7d ?? group.news7d ?? null;
      const month = metrics.news30d ?? group.news30d ?? null;
      const stories: NewsStory[] = group.stories ?? [];
      const causes: DetailItem[] = stories.length
        ? stories.map((story) => ({
            title: story.title,
            url: story.url,
            meta: ago(story.latest),
            tag: story.count > 1 ? `기사 ${story.count}건` : undefined,
          }))
        : articleItems(group.headlines);
      const top = stories[0];
      return {
        headline:
          !week && !month
            ? `최근 30일 동안 관련 기사가 없어요. ${MINIMUM_NOTE}`
            : top && top.count > 1
              ? `최근 7일 기사 ${count(week)}건 중 ${quote(top.title)} 관련 보도가 ${top.count}건으로 가장 많았어요.`
              : `최근 7일 관련 기사 ${count(week)}건, 최근 30일 ${count(month)}건이 보도됐어요.`,
        causesTitle: stories.length ? '최근 7일 많이 보도된 이슈' : '최근 기사',
        causes,
        change: changeSentence(id, rawDelta, countChange('7일 기사', week, before('news7d'), '건')),
        method: [
          `하루 평균 기사 수(최근 7일 70% + 최근 30일 30%)를 로그 눈금으로 바꿔요. 하루 ${SCORE_REF.newsDaily}건이 100점.`,
          '사진만 있는 기사, 같은 보도자료 중복, 제목에 그룹명 없이 여러 팀을 나열한 기사는 세지 않아요. 비슷한 제목끼리 하나의 이슈로 묶었어요.',
        ],
        note: backfillNote,
      };
    }
    case 'snsFandom': {
      const listeners = metrics.listenersK;
      const subscribers = metrics.subscribersK;
      const causes: DetailItem[] = [];
      const add = (label: string, now: number | null, then: number | null, score: number) => {
        if (now === null) return;
        const diff = then !== null ? (now - then) * 1000 : null;
        causes.push({
          title: `${label} ${bigNumber(now * 1000)}명`,
          meta: `${point(score)}점`,
          tag: diff ? `1주 ${diff > 0 ? '+' : '−'}${bigNumber(Math.abs(diff))}명` : undefined,
          tone: diff ? (diff > 0 ? 'up' : 'down') : undefined,
        });
      };
      add('Last.fm 청취자', listeners, before('listenersK'), listeners !== null ? listenerScore(listeners * 1000) : 0);
      add('유튜브 구독자', subscribers, before('subscribersK'), subscribers !== null ? subscriberScore(subscribers * 1000) : 0);
      return {
        headline: causes.length
          ? `전 세계 음악 청취자와 공식 유튜브 구독자 규모가 팬덤 점수가 됐어요: ${causes.map((item) => item.title).join(', ')}.`
          : `확인된 Last.fm·유튜브 기록이 없어요. ${MINIMUM_NOTE}`,
        causesTitle: '팬덤 규모',
        causes,
        change: changeSentence(id, rawDelta),
        method: [
          '청취자 1천 명 = 0점, 500만 명 = 100점 / 구독자 1천 명 = 0점, 2,000만 명 = 100점(더 많으면 100점 이상, 로그 눈금). 둘의 평균.',
        ],
        note: input.weekAgoBackfilled
          ? '과거 복원 구간은 청취자·구독자 과거 기록이 없어 현재 값을 써서, 이 기간에는 변화가 없어요.'
          : '하루 1번 갱신돼요.',
      };
    }
    case 'brandFit':
    case 'comebackActivity':
    case 'riskAdjustment': {
      const config = {
        brandFit: {
          key: 'brand30d' as const,
          what: '광고·모델·협업·패션·뷰티 기사',
          examples: group.examples?.brand,
          ref: SCORE_REF.brand30d,
          extra: '광고, 모델, 앰배서더, 협업, 화보, 패션, 뷰티, 굿즈, 팝업 같은 단어가 들어간 기사',
        },
        comebackActivity: {
          key: 'comeback30d' as const,
          what: '컴백·발매·공연·방송 출연 기사',
          examples: group.examples?.comeback,
          ref: SCORE_REF.comeback30d,
          extra: '컴백, 발매, 앨범, 공연, 콘서트, 무대, 방송·예능·라디오 출연, 축제, 팬사인회 같은 단어가 들어간 기사',
        },
        riskAdjustment: {
          key: 'risk30d' as const,
          what: '부정 키워드 기사',
          examples: group.examples?.risk,
          ref: SCORE_REF.risk30d,
          extra: '논란, 사과, 의혹, 소송, 탈퇴, 부상, 불참, 취소, 입대 같은 단어가 들어간 기사',
        },
      }[id];
      const total = metrics[config.key] ?? (id === 'comebackActivity' ? group.comeback14d : id === 'riskAdjustment' ? group.risk7d : group.brand30d) ?? null;
      const causes = articleItems(config.examples);
      const keywords = [...new Set(causes.map((item) => item.tag).filter(Boolean))].slice(0, 3);
      const latest = causes[0];
      return {
        headline: !total
          ? `최근 30일 동안 ${config.what}가 없어요. ${MINIMUM_NOTE}`
          : `최근 30일 ${config.what} ${count(total)}건이 잡혔어요${keywords.length ? `(${keywords.map((word) => `'${word}'`).join(', ')} 등)` : ''}.${latest ? ` 가장 최근은 ${quote(latest.title, 36)}예요.` : ''}`,
        causesTitle: causes.length ? '점수에 잡힌 기사 (제목에 그룹명이 있는 기사)' : undefined,
        causes,
        change: changeSentence(id, rawDelta, countChange('30일 기사', total, before(config.key), '건')),
        method: [
          `최근 30일 ${config.extra} 수. ${config.ref}건이 100점(로그 눈금, 넘으면 100점 이상).`,
          ...(id === 'riskAdjustment'
            ? [`이 점수는 가격에서 빼요. 키워드로만 고르기 때문에 그룹 잘못이 아닌 기사도 섞일 수 있고, 모든 그룹이 최소 ${MIN_RAW}점씩 같이 빠져 순위에는 영향이 없어요.`]
            : []),
        ],
        note: backfillNote,
      };
    }
    case 'growthMomentum': {
      const causes: DetailItem[] = MOMENTUM_SOURCES.map((source) => {
        const delta = weekAgoRaw ? raw[source] - weekAgoRaw[source] : null;
        const item: DetailItem = {
          title: getVariable(source).label,
          meta: weekAgoRaw ? `${point(weekAgoRaw[source])} → ${point(raw[source])}점` : `${point(raw[source])}점`,
          tag: delta === null ? undefined : signed(delta),
          tone: delta === null || Math.abs(delta) < 0.05 ? 'neutral' : delta > 0 ? 'up' : 'down',
        };
        return { item, size: Math.abs(delta ?? 0) };
      })
        .sort((a, b) => b.size - a.size)
        .map(({ item }) => item);
      const top = causes[0];
      return {
        headline: !weekAgoRaw
          ? '1주 전 기록이 없어 모멘텀은 기본값 50점이에요.'
          : `1주 동안 ${top.title} 점수가 가장 크게 ${top.tone === 'down' ? '내려' : '올라'}(${top.tag}점) 모멘텀이 ${point(raw[id])}점이 됐어요.`,
        causesTitle: '1주 전 → 지금 (많이 움직인 순)',
        causes,
        change: changeSentence(id, rawDelta),
        method: [
          '모멘텀 = 50 + (음원·뉴스·SNS·브랜드 평균 점수의 1주 변화) × 2.2. 좋아지면 50점보다 높고 나빠지면 낮아요.',
        ],
        note: '1주 전 값은 그날 마감 기록으로 다시 계산한 것이라 실제 계산값과 조금 다를 수 있어요.',
      };
    }
  }
}
