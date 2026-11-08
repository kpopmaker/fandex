// FANDEX 실데이터 수집기. GitHub Actions에서 15분마다 실행된다.
//
//   네이버 뉴스(30분) ─┐
//   멜론 TOP100(1시간) ─┼─▶ 변수별 원점수(0 이상, 상한 없음) ─▶ 가격·KMI ─▶ market-data 브랜치
//   Last.fm(하루 1번) ─┘
//
// 실행: PREV_DIR=<이전 market-data 내용> OUT_DIR=<출력 폴더> npx tsx scripts/market/collect.ts
// 필요한 환경변수: FANDEX_NAVER_NEWS_CLIENT_ID, FANDEX_NAVER_NEWS_CLIENT_SECRET, LASTFM_API_KEY

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import universeFile from '../../data/market/universe.json';
import youtubeChannelsFile from '../../data/market/youtube-channels.json';
import { createChartMatcher, decodeEntities, parseBugs } from './charts';
import {
  SCORE_REF,
  VARIABLE_ORDER,
  fanFloat,
  fandomScore,
  logScore,
  momentumScore,
  packRaw,
  priceFromRaw,
  unpackRaw,
  type RawScores,
} from '../../lib/market/formula';
import {
  METRIC_ORDER,
  type ChartEntry,
  type HistoryFile,
  type HistoryEntry,
  type LatestFile,
  type NewsHeadline,
  type RunReport,
  MARKET_DATA_VERSION,
} from '../../lib/market/dataFiles';

type Group = (typeof universeFile.groups)[number];
const GROUPS: Group[] = universeFile.groups;

const SLOT_MS = 15 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const KST_OFFSET_MS = 9 * HOUR_MS;

const PREV_DIR = process.env.PREV_DIR ?? 'market-prev';
const OUT_DIR = process.env.OUT_DIR ?? 'market-out';
const NOW = Date.now();
const SLOT = Math.floor(NOW / SLOT_MS);
const SLOT_TIME = SLOT * SLOT_MS;

function kstDay(time: number): number {
  return Math.floor((time + KST_OFFSET_MS) / DAY_MS);
}

function kstDateString(time: number): string {
  return new Date(time + KST_OFFSET_MS).toISOString().slice(0, 10);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────── 상태 파일 ───────────────────────────

type TaggedArticle = { h: string; d: number; b?: 1; c?: 1; r?: 1 };
type ExampleFlag = 'b' | 'c' | 'r';
/** 예시 기사를 남겨 둘 기간(그 변수의 집계 기간과 같다) */
const EXAMPLE_DAYS: Record<ExampleFlag, number> = { b: 30, c: 14, r: 7 };

/** 이 숫자를 올리면 이전 기록을 버리고 새 기준(KMI 1,000)으로 다시 시작한다. */
const DATA_EPOCH = 7;

type State = {
  version: string;
  epoch?: number;
  divisor: number | null;
  prevPrices: Record<string, number>;
  prevFloats: Record<string, number>;
  news: {
    at: number;
    byId: Record<string, { count: number; headlines: NewsHeadline[] }>;
  } | null;
  tagged: Record<string, TaggedArticle[]>;
  /**
   * 그룹별로 기사를 빠짐없이 가지고 있는 시작 시각(ms). 0이면 처음부터 전부.
   * 네이버는 최근 1,000건까지만 주므로 기사가 많은 그룹은 이보다 앞선 기사가 없다.
   */
  coverageFrom?: Record<string, number>;
  /** 그룹별 최근 8일 관련 기사(링크 해시, 발행 시각). 뉴스/이슈 = 7일 하루 평균 */
  newsTimes?: Record<string, Array<[string, number]>>;
  /** 브랜드·활동·조정 점수에 잡힌 최근 기사 예시 */
  examples?: Record<string, Record<ExampleFlag, NewsHeadline[]>>;
  chart: { at: number; entries: ChartEntry[]; pointsById: Record<string, number>; source?: 'melon' | 'bugs' } | null;
  lastfm: {
    date: string;
    byId: Record<string, { listeners: number; playcount: number; name: string } | null>;
  } | null;
  youtube?: {
    date: string;
    byId: Record<string, { subscribers: number | null; views: number; videos: number }>;
  } | null;
};

function readJson<T>(path: string, gz = false): T | null {
  if (!existsSync(path)) return null;
  try {
    const buffer = readFileSync(path);
    return JSON.parse((gz ? gunzipSync(buffer) : buffer).toString('utf8')) as T;
  } catch (error) {
    console.warn(`could not read ${path}:`, (error as Error).message);
    return null;
  }
}

const previousState = readJson<State>(join(PREV_DIR, 'state.json.gz'), true);
const sameEpoch = previousState?.epoch === DATA_EPOCH;

const state: State = (sameEpoch ? previousState : null) ?? {
  version: MARKET_DATA_VERSION,
  epoch: DATA_EPOCH,
  divisor: null,
  prevPrices: {},
  prevFloats: {},
  news: null,
  tagged: {},
  chart: null,
  lastfm: null,
};

const history: HistoryFile = (sameEpoch ? readJson<HistoryFile>(join(PREV_DIR, 'history.json.gz'), true) : null) ?? {
  version: MARKET_DATA_VERSION,
  ids: [],
  startedAt: SLOT_TIME,
  recent: [],
  hourly: [],
  daily: [],
};

const report: RunReport = {
  runAt: NOW,
  slotTime: SLOT_TIME,
  sources: {},
  notes: [],
};

// ─────────────────────────── 공통 텍스트 처리 ───────────────────────────

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nameMatcher(names: string[]): RegExp {
  const parts = names.map((name) => {
    const escaped = escapeRegExp(name);
    // 영문 이름은 단어 경계로, 한글 이름은 그대로 찾는다.
    return /^[\x00-\x7f]+$/.test(name) ? `(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])` : escaped;
  });
  return new RegExp(parts.join('|'));
}

const MATCHERS = new Map(GROUPS.map((group) => [group.id, nameMatcher(group.matchNames)]));

/** 라인업·시상식 기사 판별용 이름(3글자 이상만, 흔한 2글자 이름은 오탐이 많아 뺀다) */
const LINEUP_NAMES = GROUPS.map((group) => group.matchNames.filter((name) => name.length >= 3));

/** 여러 그룹이 함께 나열된 기사(라인업, 수상자 명단 등)인지 */
function isLineupArticle(text: string): boolean {
  let groups = 0;
  for (const names of LINEUP_NAMES) {
    if (names.some((name) => text.includes(name))) {
      groups += 1;
      if (groups >= 3) return true;
    }
  }
  return false;
}

/** 아이돌 기사라면 거의 항상 들어가는 맥락어. 동음이의어(카드, 시크릿 등) 기사를 걸러낸다. */
const CONTEXT_WORDS = [
  '그룹', '멤버', '컴백', '앨범', '아이돌', '걸그룹', '보이그룹', '데뷔', '무대', '신곡', '콘서트',
  '팬', '음원', '뮤직비디오', '타이틀곡', '음악방송', '투어', '소속사', '엔터', '차트', '가수',
  '노래', '밴드', '공연', '페스티벌', '케이팝', 'K팝', 'K-팝', 'K-POP', 'KPOP', '활동', '리더',
  '화보', '광고', '앰배서더', '예능', '출연',
];

const BRAND_WORDS = ['광고', '모델', '앰배서더', '엠버서더', '홍보대사', '뮤즈', '협업', '컬래버', '콜라보', '화보', '캠페인', '브랜드'];
const COMEBACK_WORDS = ['컴백', '티저', '신곡', '발매', '쇼케이스', '음악방송', '음방', '1위', '트랙리스트', '뮤직비디오', '타이틀곡', '미니앨범', '정규', '선공개', '월드투어', '콘서트', '팬미팅'];
const RISK_WORDS = ['논란', '사과문', '사과', '의혹', '소송', '분쟁', '탈퇴', '해체', '불화', '갈등', '고소', '폭로', '학폭', '열애설', '계약 해지', '계약해지', '하차', '비판', '물의', '음주', '악플', '사생활', '활동 중단', '활동중단'];

function containsAny(text: string, words: readonly string[]): boolean {
  return words.some((word) => text.includes(word));
}

/** 이름이 흔한 단어라 맥락어 없이 검색하면 다른 기사가 쏟아지는 그룹 */
const AMBIGUOUS_IDS = new Set([
  'itzy', 'kard', 'buzz', 'secret', 'ikon', 'winner', 'kara', 'vixx', 'pow', 'kiiikiii', 'billlie', 'lucy',
  'ahof', 'onewe', 'seeya', 'whib', 'dxmon', 'csr', 'highlight', 'astro', 'pentagon', 'treasure',
  'tempest', 'evnne', 'touched', 'waker', 'epex', 'aen', 'blitzers', 'trendz', 'ninei', 'and2ble',
  'unis', 'izna', 'naze', 'idid', 'justb', 'classy', 'madein', 'wei', 'ntx', 'tiot', 'aimers',
  'unchild', 'apink', 'day6', 'exo', 'onf', 'xlov', 'newbeat', 'davichi',
]);

/** 사진만 있는 기사([포토] 등)는 행사 하나에 수백 건씩 나와서 기사 수에서 뺀다. */
const PHOTO_TITLE = /^\s*[\[(【<]?\s*(포토|사진|PHOTO|Photo|화보\s*\+|스타포토|MD포토|포토엔|포토S|TD포토|SS포토|HD포토|영상|VIDEO|Video|움짤)/;
const PHOTO_TAG = /\[(?:[^\]]*포토[^\]]*|[^\]]*PHOTO[^\]]*|사진)\]/;

function isPhotoArticle(title: string): boolean {
  return PHOTO_TITLE.test(title) || PHOTO_TAG.test(title) || /\[포토\]|\(포토\)|\[사진\]/.test(title);
}

function hashLink(link: string): string {
  return createHash('sha1').update(link).digest('hex').slice(0, 12);
}

// ─────────────────────────── 네이버 뉴스 ───────────────────────────

type NaverItem = { title: string; originallink: string; link: string; description: string; pubDate: string };

const NAVER_ID = process.env.FANDEX_NAVER_NEWS_CLIENT_ID ?? '';
const NAVER_SECRET = process.env.FANDEX_NAVER_NEWS_CLIENT_SECRET ?? '';
let naverCalls = 0;

async function naverSearch(query: string, start: number): Promise<NaverItem[]> {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=100&start=${start}&sort=date`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    naverCalls += 1;
    const response = await fetch(url, {
      headers: { 'X-Naver-Client-Id': NAVER_ID, 'X-Naver-Client-Secret': NAVER_SECRET },
    });
    if (response.ok) {
      const body = (await response.json()) as { items?: NaverItem[] };
      return body.items ?? [];
    }
    if (response.status === 429 || response.status >= 500) {
      await sleep(1000 * attempt);
      continue;
    }
    throw new Error(`naver ${response.status}`);
  }
  throw new Error('naver retry exhausted');
}

type GroupNews = {
  count: number;
  headlines: NewsHeadline[];
  tagged: TaggedArticle[];
  examples: Record<ExampleFlag, NewsHeadline[]>;
  fetched: number;
  pages: number;
};

type NewsDiagnostics = {
  queries: string[];
  fetched: number;
  nameHits: number;
  photoSkipped: number;
  contextMiss: number;
  lineupSkipped: number;
  coverageDays?: number;
};
const newsDiagnostics: Record<string, NewsDiagnostics> = {};

type NewsEntry = { item: NaverItem; time: number; text: string; titleMatch: boolean };

/**
 * days: 며칠 전까지 거슬러 볼지(실시간 수집 1일, 과거 복원은 더 길게)
 * maxStart: 네이버가 허용하는 마지막 시작 위치(최대 1000건)
 */
async function collectGroupNews(
  group: Group,
  options: { days: number; maxStart: number } = { days: 1, maxStart: 301 },
): Promise<GroupNews & { entries: NewsEntry[]; coverageFrom: number }> {
  const ambiguous = AMBIGUOUS_IDS.has(group.id) && group.englishName !== group.koreanName;
  // 흔한 단어 이름은 '한글명 영문명'으로 먼저 찾고, 적게 나오면 영문명으로 한 번 더 찾는다.
  const queries = group.newsQueries.length
    ? group.newsQueries
    : ambiguous
      ? [`${group.koreanName} ${group.englishName}`, group.englishName]
      : [group.koreanName];
  const matcher = MATCHERS.get(group.id)!;
  const cutoff = NOW - DAY_MS;
  const pageUntil = NOW - options.days * DAY_MS;
  let coverageFrom = NOW;
  const seen = new Set<string>();
  // 같은 보도자료가 여러 매체에 그대로 실리면 한 건으로 센다.
  const seenTitles = new Set<string>();
  const relevant: NewsEntry[] = [];
  const diag: NewsDiagnostics = { queries: [], fetched: 0, nameHits: 0, photoSkipped: 0, contextMiss: 0, lineupSkipped: 0 };
  let fetched = 0;
  let pages = 0;

  for (const query of queries) {
    if (diag.queries.length && relevant.length >= 5) break;
    diag.queries.push(query);
    for (let start = 1; start <= options.maxStart; start += 100) {
      const items = await naverSearch(query, start);
      pages += 1;
      fetched += items.length;
      let oldest = Infinity;
      for (const item of items) {
        const time = Date.parse(item.pubDate);
        if (Number.isFinite(time)) oldest = Math.min(oldest, time);
        const key = item.originallink || item.link;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const title = decodeEntities(item.title);
        const text = `${title} ${decodeEntities(item.description)}`;
        if (!matcher.test(text)) continue;
        diag.nameHits += 1;
        if (group.excludeKeywords.some((word) => text.includes(word))) continue;
        if (isPhotoArticle(title)) {
          diag.photoSkipped += 1;
          continue;
        }
        if (!containsAny(text, CONTEXT_WORDS)) {
          diag.contextMiss += 1;
          continue;
        }
        const titleKey = title.replace(/[^0-9A-Za-z가-힣]/g, '').slice(0, 40);
        if (seenTitles.has(titleKey)) continue;
        seenTitles.add(titleKey);
        // 제목에 그룹명이 없고 여러 그룹이 나열된 기사(라인업·수상 명단)는 이 그룹 기사로 보지 않는다.
        const titleMatch = matcher.test(title);
        if (!titleMatch && isLineupArticle(text)) {
          diag.lineupSkipped += 1;
          continue;
        }
        relevant.push({ item: { ...item, title }, time, text, titleMatch });
      }
      if (Number.isFinite(oldest)) coverageFrom = Math.min(coverageFrom, oldest);
      // 이번 페이지가 모두 볼 기간 안이면 다음 페이지를 더 본다.
      if (items.length < 100 || oldest < pageUntil) {
        if (items.length < 100) coverageFrom = Math.min(coverageFrom, 0);
        break;
      }
    }
  }
  diag.coverageDays = coverageFrom === 0 ? Infinity : Math.round(((NOW - coverageFrom) / DAY_MS) * 10) / 10;
  diag.fetched = fetched;
  if (ambiguous || relevant.length >= 150) newsDiagnostics[group.id] = diag;

  const within24h = relevant.filter((entry) => entry.time >= cutoff);
  const tagged: TaggedArticle[] = [];
  const examples: Record<ExampleFlag, NewsHeadline[]> = { b: [], c: [], r: [] };
  for (const entry of relevant) {
    const brand = containsAny(entry.text, BRAND_WORDS);
    const comeback = containsAny(entry.text, COMEBACK_WORDS);
    const risk = containsAny(entry.text, RISK_WORDS);
    if (!brand && !comeback && !risk) continue;
    // 예시는 제목에 그룹명이 있는 기사만(무슨 기사가 점수를 움직였는지 보여주는 용도)
    if (entry.titleMatch) {
      const headline = { title: entry.item.title, url: entry.item.originallink || entry.item.link, publishedAt: entry.time };
      if (brand && examples.b.length < 5) examples.b.push(headline);
      if (comeback && examples.c.length < 5) examples.c.push(headline);
      if (risk && examples.r.length < 5) examples.r.push(headline);
    }
    tagged.push({
      h: hashLink(entry.item.originallink || entry.item.link),
      d: kstDay(entry.time),
      ...(brand ? { b: 1 as const } : {}),
      ...(comeback ? { c: 1 as const } : {}),
      ...(risk ? { r: 1 as const } : {}),
    });
  }

  return {
    count: within24h.length,
    // 대표 기사는 제목에 그룹명이 들어간 기사만(본문에 이름만 스친 기사를 보여주지 않게)
    headlines: within24h.filter((entry) => entry.titleMatch).slice(0, 3).map((entry) => ({
      title: entry.item.title,
      url: entry.item.originallink || entry.item.link,
      publishedAt: entry.time,
    })),
    tagged,
    examples,
    fetched,
    pages,
    entries: relevant,
    coverageFrom,
  };
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await worker(current);
        await sleep(120);
      }
    }),
  );
}

/** 과거 복원 일수(새 기준으로 처음 시작할 때 이만큼의 일별 마감 기록을 만든다) */
const BACKFILL_DAYS = Number(process.env.BACKFILL_DAYS ?? 90);
/** 지난 기사까지 깊게 받을 때: 복원 첫날의 30일 집계까지, 최대 1,000건(네이버 한도) */
const DEEP_NEWS = { days: BACKFILL_DAYS + 31, maxStart: 901 };
/** 깊게 받은 그룹의 관련 기사 시각(과거 복원에 쓴다) */
const deepNewsTimes = new Map<string, number[]>();

async function refreshNews(): Promise<void> {
  const age = state.news ? NOW - state.news.at : Infinity;
  if (age < 25 * 60 * 1000) {
    report.sources.naver = { status: 'cached', at: state.news!.at };
    return;
  }
  if (!NAVER_ID || !NAVER_SECRET) {
    report.sources.naver = { status: 'skipped', detail: 'missing credentials' };
    return;
  }

  const byId: NonNullable<State['news']>['byId'] = {};
  const failures: string[] = [];
  let fetched = 0;
  let pages = 0;
  const today = kstDay(NOW);

  state.coverageFrom ??= {};
  state.newsTimes ??= {};
  state.examples ??= {};
  const deepFetched: string[] = [];
  // 실시간은 30일 집계면 충분하지만, 과거 복원 전에는 복원 첫날의 30일 집계에 쓸 기사까지 남겨 둔다.
  const keepDays = state.divisor === null ? BACKFILL_DAYS + 31 : 31;
  await runWithConcurrency(GROUPS, 3, async (group) => {
    try {
      // 처음 보는 그룹은 지난 기사까지 깊게 받아 30일 집계를 바로 채운다.
      const deep = !(group.id in state.coverageFrom!);
      const result = await collectGroupNews(group, deep ? DEEP_NEWS : undefined);
      if (deep) {
        state.coverageFrom![group.id] = result.coverageFrom;
        deepFetched.push(group.id);
        deepNewsTimes.set(group.id, result.entries.map((entry) => entry.time));
      }
      byId[group.id] = { count: result.count, headlines: result.headlines };
      fetched += result.fetched;
      pages += result.pages;
      const existing = new Map((state.tagged[group.id] ?? []).map((article) => [article.h, article]));
      for (const article of result.tagged) existing.set(article.h, article);
      state.tagged[group.id] = [...existing.values()].filter((article) => today - article.d < keepDays);

      // 뉴스/이슈(7일 하루 평균)에 쓸 최근 8일 기사
      const times = new Map(state.newsTimes![group.id] ?? []);
      for (const entry of result.entries) times.set(hashLink(entry.item.originallink || entry.item.link), entry.time);
      state.newsTimes![group.id] = [...times.entries()].filter(([, time]) => time > NOW - 8 * DAY_MS);

      const previousExamples = state.examples![group.id] ?? { b: [], c: [], r: [] };
      const merged = {} as Record<ExampleFlag, NewsHeadline[]>;
      for (const flag of ['b', 'c', 'r'] as const) {
        const byUrl = new Map([...previousExamples[flag], ...result.examples[flag]].map((item) => [item.url, item]));
        merged[flag] = [...byUrl.values()]
          .filter((item) => item.publishedAt > NOW - EXAMPLE_DAYS[flag] * DAY_MS)
          .sort((a, b) => b.publishedAt - a.publishedAt)
          .slice(0, 3);
      }
      state.examples![group.id] = merged;
    } catch (error) {
      failures.push(`${group.id}: ${(error as Error).message}`);
      const previous = state.news?.byId[group.id];
      if (previous) byId[group.id] = previous;
    }
  });

  const ok = failures.length < GROUPS.length / 2;
  if (ok) state.news = { at: NOW, byId };
  report.sources.naver = {
    status: ok ? (failures.length ? 'partial' : 'ok') : 'failed',
    at: NOW,
    calls: naverCalls,
    pages,
    fetched,
    failures: failures.slice(0, 20),
    failureCount: failures.length,
    deepFetched,
    diagnostics: newsDiagnostics,
  };
}

// ─────────────────────────── 벅스 실시간 차트 ───────────────────────────

const matchChartArtist = createChartMatcher(GROUPS);

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/** 멜론 TOP100(1시간마다 갱신) */
function parseMelon(html: string): Array<{ rank: number; title: string; artist: string }> {
  const rows = html.match(/<tr[^>]*data-song-no=[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const entries: Array<{ rank: number; title: string; artist: string }> = [];
  for (const row of rows) {
    const rank = row.match(/<span class="rank[^"]*"[^>]*>\s*(\d+)\s*<\/span>/i)?.[1];
    const titleBlock = row.match(/<div class="ellipsis rank01">([\s\S]*?)<\/div>/i)?.[1] ?? '';
    const artistBlock = row.match(/<div class="ellipsis rank02">([\s\S]*?)<\/div>/i)?.[1] ?? '';
    const title = decodeEntities(titleBlock.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? titleBlock);
    const visible = artistBlock.match(/<span class="checkEllipsis"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? artistBlock;
    const artists = [...visible.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)].map((match) => decodeEntities(match[1]));
    const artist = artists.length ? artists.join(', ') : decodeEntities(visible);
    if (!rank || !title || !artist) continue;
    entries.push({ rank: Number(rank), title, artist });
  }
  return entries.sort((a, b) => a.rank - b.rank);
}

/** Node fetch가 끊기면 curl로 다시 받는다. */
async function fetchHtml(url: string, attempts: string[], referer?: string): Promise<string> {
  const headers: Record<string, string> = { 'User-Agent': BROWSER_UA, 'Accept-Language': 'ko-KR,ko;q=0.9' };
  if (referer) headers.Referer = referer;
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    attempts.push('node:ok');
    return await response.text();
  } catch (error) {
    const cause = (error as Error & { cause?: { code?: string } }).cause;
    attempts.push(`node:${cause?.code ?? (error as Error).message}`);
  }
  const { execFileSync } = await import('node:child_process');
  try {
    const html = execFileSync(
      'curl',
      ['-sSL', '--max-time', '30', '-A', BROWSER_UA, '-H', 'Accept-Language: ko-KR,ko;q=0.9', ...(referer ? ['-H', `Referer: ${referer}`] : []), url],
      { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 },
    );
    attempts.push('curl:ok');
    return html;
  } catch (error) {
    attempts.push(`curl:${(error as Error).message.split('\n')[0].slice(0, 120)}`);
  }
  throw new Error(`fetch failed: ${url}`);
}

function chartEntries(rows: Array<{ rank: number; title: string; artist: string }>) {
  const pointsById: Record<string, number> = {};
  const entries: ChartEntry[] = rows.map((row) => {
    const artistId = matchChartArtist(row.artist);
    if (artistId) pointsById[artistId] = (pointsById[artistId] ?? 0) + (101 - row.rank);
    return { rank: row.rank, title: row.title, artist: row.artist, artistId };
  });
  return { entries, pointsById };
}

async function refreshChart(): Promise<void> {
  const age = state.chart ? NOW - state.chart.at : Infinity;
  if (age < 55 * 60 * 1000 && state.chart?.source === 'melon') {
    report.sources.melon = { status: 'cached', at: state.chart!.at };
    return;
  }
  const attempts: string[] = [];
  try {
    const rows = parseMelon(await fetchHtml('https://www.melon.com/chart/index.htm', attempts, 'https://www.melon.com/'));
    if (rows.length < 50) throw new Error(`melon parsed only ${rows.length} rows`);

    const { entries, pointsById } = chartEntries(rows);
    state.chart = { at: NOW, entries, pointsById, source: 'melon' };
    report.sources.melon = {
      status: 'ok',
      at: NOW,
      attempts,
      rows: rows.length,
      matchedRows: entries.filter((entry) => entry.artistId).length,
      matchedGroups: Object.keys(pointsById).length,
    };
  } catch (error) {
    const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
    report.sources.melon = {
      status: 'failed',
      detail: `${(error as Error).message}${cause ? ` (${cause.code ?? ''} ${cause.message ?? ''})` : ''}`,
      attempts,
    };
  }
}

// ─────────────────────────── Last.fm ───────────────────────────

const LASTFM_KEY = process.env.LASTFM_API_KEY ?? '';
const KPOP_TAGS = ['k-pop', 'kpop', 'korean', 'k-rock', 'k-indie', 'korean rock', 'korean indie', 'k-hip-hop', 'korean hip hop', 'girl group', 'boy band', 'boy group', 'idol', 'k-ballad', 'k-r&b', 'virtual idol'];

async function lastfmInfo(name: string) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&autocorrect=1&api_key=${LASTFM_KEY}&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`lastfm ${response.status}`);
  const body = (await response.json()) as {
    artist?: { name: string; stats?: { listeners?: string; playcount?: string }; tags?: { tag?: Array<{ name: string }> } };
  };
  if (!body.artist) return null;
  const tags = (body.artist.tags?.tag ?? []).map((tag) => tag.name.toLowerCase());
  return {
    name: body.artist.name,
    listeners: Number(body.artist.stats?.listeners ?? 0),
    playcount: Number(body.artist.stats?.playcount ?? 0),
    korean: tags.some((tag) => KPOP_TAGS.includes(tag)),
  };
}

async function refreshLastfm(): Promise<void> {
  const today = kstDateString(NOW);
  // 오늘 이미 받았으면 새로 추가된 그룹만 받는다.
  const sameDay = state.lastfm?.date === today;
  const targets = sameDay ? GROUPS.filter((group) => !(group.id in state.lastfm!.byId)) : GROUPS;
  if (!targets.length) {
    report.sources.lastfm = { status: 'cached', detail: today };
    return;
  }
  if (!LASTFM_KEY) {
    report.sources.lastfm = { status: 'skipped', detail: 'missing credentials' };
    return;
  }
  const byId: NonNullable<State['lastfm']>['byId'] = sameDay ? { ...state.lastfm!.byId } : {};
  const unverified: string[] = [];
  let failures = 0;

  await runWithConcurrency(targets, 3, async (group) => {
    try {
      let info = await lastfmInfo(group.lastfmName);
      if (!info?.korean) {
        const korean = await lastfmInfo(group.koreanName);
        if (korean?.korean) info = korean;
      }
      if (info?.korean) {
        byId[group.id] = { listeners: info.listeners, playcount: info.playcount, name: info.name };
      } else {
        byId[group.id] = null;
        unverified.push(group.id);
      }
    } catch {
      failures += 1;
      byId[group.id] = state.lastfm?.byId[group.id] ?? null;
    }
  });

  if (failures < targets.length / 2) state.lastfm = { date: today, byId };
  report.sources.lastfm = {
    status: failures ? 'partial' : 'ok',
    detail: today,
    fetched: targets.length,
    verified: Object.values(byId).filter(Boolean).length,
    unverified,
    failureCount: failures,
  };
}

// ─────────────────────────── 유튜브 ───────────────────────────

const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY ?? '';
const YOUTUBE_CHANNELS = youtubeChannelsFile.channels as Record<string, { channelId: string }>;

async function refreshYoutube(): Promise<void> {
  const today = kstDateString(NOW);
  // 오늘 이미 받았으면 새로 연결된 채널만 받는다.
  const sameDay = state.youtube?.date === today;
  const entries = Object.entries(YOUTUBE_CHANNELS).filter(
    ([id]) => !sameDay || !(id in state.youtube!.byId),
  );
  if (!entries.length) {
    report.sources.youtube = { status: 'cached', detail: today };
    return;
  }
  if (!YOUTUBE_KEY) {
    report.sources.youtube = { status: 'skipped', detail: 'missing credentials' };
    return;
  }
  const byChannel = new Map(entries.map(([id, channel]) => [channel.channelId, id]));
  const byId: NonNullable<State['youtube']>['byId'] = sameDay ? { ...state.youtube!.byId } : {};
  try {
    for (let start = 0; start < entries.length; start += 50) {
      const ids = entries.slice(start, start + 50).map(([, channel]) => channel.channelId);
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${ids.join(',')}&key=${YOUTUBE_KEY}`,
      );
      if (!response.ok) throw new Error(`youtube ${response.status}`);
      const body = (await response.json()) as {
        items?: Array<{
          id: string;
          statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean; viewCount?: string; videoCount?: string };
        }>;
      };
      for (const item of body.items ?? []) {
        const groupId = byChannel.get(item.id);
        if (!groupId) continue;
        byId[groupId] = {
          subscribers: item.statistics?.hiddenSubscriberCount ? null : Number(item.statistics?.subscriberCount ?? 0),
          views: Number(item.statistics?.viewCount ?? 0),
          videos: Number(item.statistics?.videoCount ?? 0),
        };
      }
    }
    state.youtube = { date: today, byId };
    report.sources.youtube = {
      status: 'ok',
      detail: today,
      channels: entries.length,
      received: Object.keys(byId).length,
      partialRefresh: sameDay,
    };
  } catch (error) {
    report.sources.youtube = { status: 'failed', detail: (error as Error).message };
  }
}

function subscribersOf(id: string): number | null {
  return state.youtube?.byId[id]?.subscribers ?? null;
}

function listenersOf(id: string): number | null {
  return state.lastfm?.byId[id]?.listeners ?? null;
}

// ─────────────────────────── 원점수와 지수 ───────────────────────────

/**
 * 최근 days일 동안 flag가 붙은 기사 수(at 시점 기준).
 * 그 기간을 다 덮는 기사 기록이 없으면(기사가 너무 많은 그룹) 덮은 기간의 하루 평균으로 늘려 추정한다.
 */
function countTagged(id: string, flag: 'b' | 'c' | 'r', days: number, at = NOW): number {
  const from = state.coverageFrom?.[id];
  let day = kstDay(at);
  // 기사 기록이 시작되기 전 날짜(과거 복원)는, 최소 일주일치(7일 집계는 그 기간 전체) 기록이 있는 가장 이른 날 값으로 본다.
  if (from !== undefined && from !== 0) {
    day = Math.max(day, Math.min(kstDay(NOW), kstDay(from) + Math.min(days, 7) - 1));
  }
  const count = (state.tagged[id] ?? []).filter(
    (article) => article[flag] && article.d <= day && day - article.d < days,
  ).length;
  if (from === undefined || from === 0) return count;
  const coveredDays = Math.min(days, day - kstDay(from) + 1);
  if (coveredDays >= days || coveredDays < 1) return count;
  return Math.round((count * days) / coveredDays);
}

/**
 * at 시점까지 최근 7일 관련 기사 수. 기사 기록이 7일을 다 덮지 못하면(기사가 너무 많은 그룹) 덮은 기간으로 늘려 추정한다.
 * times를 주면 그 목록으로 센다(과거 복원).
 */
function newsWeekCount(id: string, at = NOW, times?: number[]): number {
  const list = times ?? (state.newsTimes?.[id] ?? []).map(([, time]) => time);
  const from = at - 7 * DAY_MS;
  const count = list.filter((time) => time > from && time <= at).length;
  const covered = state.coverageFrom?.[id];
  if (covered === undefined || covered === 0 || covered <= from) return count;
  const coveredDays = (at - covered) / DAY_MS;
  return coveredDays >= 1 ? Math.round((count * 7) / coveredDays) : count;
}

/** 원점수의 근거 숫자(METRIC_ORDER 순서) */
type Metrics = Record<(typeof METRIC_ORDER)[number], number | null>;

function liveMetrics(id: string): Metrics {
  const listeners = listenersOf(id);
  const subscribers = subscribersOf(id);
  return {
    chartPoints: state.chart?.pointsById[id] ?? 0,
    news7d: newsWeekCount(id),
    brand30d: countTagged(id, 'b', 30),
    comeback14d: countTagged(id, 'c', 14),
    risk7d: countTagged(id, 'r', 7),
    listenersK: listeners ? Math.round(listeners / 1000) : null,
    subscribersK: subscribers ? Math.round(subscribers / 1000) : null,
  };
}

function packMetrics(byId: Record<string, Metrics>): number[] {
  const packed: number[] = [];
  for (const id of history.ids) {
    const metrics = byId[id];
    for (const key of METRIC_ORDER) packed.push(metrics?.[key] ?? -1);
  }
  return packed;
}

function ensureIds(): void {
  for (const group of GROUPS) {
    if (!history.ids.includes(group.id)) history.ids.push(group.id);
  }
}

function rawAt(entry: HistoryEntry, id: string): RawScores | null {
  const index = history.ids.indexOf(id);
  const offset = index * VARIABLE_ORDER.length;
  if (index < 0 || entry.r[offset] === undefined || entry.r[offset] < 0) return null;
  return unpackRaw(entry.r, offset);
}

/** 7일 전과 가장 가까운 기록. 최소 24시간 전 기록이 없으면 null. */
function baselineEntry(): HistoryEntry | null {
  const target = SLOT_TIME - 7 * DAY_MS;
  const candidates = [...history.hourly, ...history.daily].filter((entry) => entry.t <= SLOT_TIME - DAY_MS);
  if (!candidates.length) return null;
  return candidates.reduce((best, entry) =>
    Math.abs(entry.t - target) < Math.abs(best.t - target) ? entry : best,
  );
}

function computeRaw(): Record<string, RawScores> {
  const baseline = baselineEntry();
  const result: Record<string, RawScores> = {};
  for (const group of GROUPS) {
    const raw: RawScores = {
      musicAlbum: logScore(state.chart?.pointsById[group.id] ?? 0, SCORE_REF.chartPoints),
      newsIssue: logScore(newsWeekCount(group.id) / 7, SCORE_REF.newsDaily),
      snsFandom: fandomScore(listenersOf(group.id), subscribersOf(group.id)),
      brandFit: logScore(countTagged(group.id, 'b', 30), SCORE_REF.brand30d),
      comebackActivity: logScore(countTagged(group.id, 'c', 14), SCORE_REF.comeback14d),
      growthMomentum: 50,
      riskAdjustment: logScore(countTagged(group.id, 'r', 7), SCORE_REF.risk7d),
    };
    raw.growthMomentum = momentumScore(raw, baseline ? rawAt(baseline, group.id) : null);
    result[group.id] = raw;
  }
  return result;
}

function computeIndex(raws: Record<string, RawScores>) {
  const prices: Record<string, number> = {};
  const floats: Record<string, number> = {};
  for (const group of GROUPS) {
    prices[group.id] = priceFromRaw(raws[group.id]);
    floats[group.id] = fanFloat(listenersOf(group.id), subscribersOf(group.id));
  }

  // 팬덤 규모나 종목 구성이 바뀌어도 지수가 튀지 않게 제수를 조정한다(주가지수와 같은 방식).
  const previousIds = Object.keys(state.prevPrices);
  if (state.divisor !== null && previousIds.length) {
    const oldCap = previousIds.reduce(
      (sum, id) => sum + state.prevPrices[id] * (state.prevFloats[id] ?? 0),
      0,
    );
    const newCapAtOldPrices = GROUPS.reduce(
      (sum, group) => sum + (state.prevPrices[group.id] ?? prices[group.id]) * floats[group.id],
      0,
    );
    if (oldCap > 0 && Math.abs(newCapAtOldPrices / oldCap - 1) > 1e-9) {
      state.divisor *= newCapAtOldPrices / oldCap;
      report.notes.push('divisor adjusted for float or membership change');
    }
  }

  const totalCap = GROUPS.reduce((sum, group) => sum + prices[group.id] * floats[group.id], 0);
  if (state.divisor === null) state.divisor = totalCap / 1000;
  const kmi = totalCap / state.divisor;

  state.prevPrices = prices;
  state.prevFloats = floats;
  return { prices, floats, kmi, totalCap };
}

function upsert(list: HistoryEntry[], entry: HistoryEntry, bucket: (time: number) => number): void {
  const last = list[list.length - 1];
  if (last && bucket(last.t) === bucket(entry.t)) list[list.length - 1] = entry;
  else list.push(entry);
}

function appendHistory(raws: Record<string, RawScores>, kmi: number, metrics: Record<string, Metrics>): void {
  ensureIds();
  const packed: number[] = [];
  for (const id of history.ids) {
    const raw = raws[id];
    if (raw) packed.push(...packRaw(raw));
    else packed.push(...VARIABLE_ORDER.map(() => -1));
  }
  const entry: HistoryEntry = { t: SLOT_TIME, k: Math.round(kmi * 100) / 100, r: packed };

  upsert(history.recent, entry, (time) => Math.floor(time / SLOT_MS));
  upsert(history.hourly, entry, (time) => Math.floor(time / HOUR_MS));
  upsert(history.daily, { ...entry, m: packMetrics(metrics) }, kstDay);

  history.recent = history.recent.filter((item) => item.t > SLOT_TIME - 49 * HOUR_MS);
  history.hourly = history.hourly.filter((item) => item.t > SLOT_TIME - 36 * DAY_MS);
}

// ─────────────────────────── 실행 ───────────────────────────

// ─────────────────────────── 과거 복원(새 기준으로 처음 시작할 때 한 번) ───────────────────────────

function dayStart(day: number): number {
  return day * DAY_MS - KST_OFFSET_MS;
}

function dayCompact(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * 지난 BACKFILL_DAYS일의 하루 마감 기록을 만든다.
 * - 뉴스·브랜드·활동·조정: 깊게 받은 네이버 기사로 그날 기준 다시 센다.
 * - 음원: 멜론은 지난 날짜 차트를 주지 않아 벅스 일간 차트(그날 기준)를 쓴다.
 * - SNS/팬덤·팬덤 규모: Last.fm·유튜브는 과거 값을 주지 않아 현재 값을 쓴다.
 * 기사가 너무 많아 그날까지 거슬러 가지 못한 그룹의 24시간 기사 수는 가장 가까운 복원 가능한 날 값을 쓴다.
 */
async function backfillDaily(): Promise<void> {
  const today = kstDay(NOW);
  const days = Array.from({ length: BACKFILL_DAYS }, (_, index) => today - BACKFILL_DAYS + index);
  ensureIds();

  const chartByDay = new Map<number, Record<string, number>>();
  const chartFailures: string[] = [];
  for (const day of days) {
    const attempts: string[] = [];
    try {
      const html = await fetchHtml(`https://music.bugs.co.kr/chart/track/day/total?chartdate=${dayCompact(day)}`, attempts);
      const rows = parseBugs(html);
      if (rows.length < 50) throw new Error(`rows ${rows.length}`);
      chartByDay.set(day, chartEntries(rows).pointsById);
    } catch (error) {
      chartFailures.push(`${dayCompact(day)} ${(error as Error).message} ${attempts.join(',')}`);
    }
    await sleep(300);
  }

  // 그날 24시간 기사 수(정확히 셀 수 있으면 숫자, 아니면 null). 7일 평균을 내려고 복원 첫날 6일 전부터 센다.
  const countDays = Array.from({ length: days.length + 6 }, (_, index) => days[0] - 6 + index);
  const newsByDay = new Map<string, number[]>();
  const imputed: string[] = [];
  for (const group of GROUPS) {
    const times = deepNewsTimes.get(group.id);
    const from = state.coverageFrom?.[group.id] ?? NOW;
    const counts = countDays.map((day) => {
      const end = dayStart(day + 1);
      if (!times || (from !== 0 && from > end - DAY_MS)) return null;
      return times.filter((time) => time > end - DAY_MS && time <= end).length;
    });
    // 앞쪽 빈 날은 가장 가까운 셀 수 있는 날 값으로
    const firstKnown = counts.findIndex((count) => count !== null);
    const imputedDays = Math.max(0, firstKnown - 6);
    if (imputedDays > 0) imputed.push(`${group.id}:${imputedDays}d`);
    newsByDay.set(
      group.id,
      counts.map((count) => count ?? (firstKnown >= 0 ? (counts[firstKnown] ?? 0) : 0)),
    );
  }
  /** 복원 dayIndex일까지 최근 7일 기사 수 */
  const weekNews = (id: string, dayIndex: number) =>
    (newsByDay.get(id) ?? []).slice(dayIndex, dayIndex + 7).reduce((sum, count) => sum + count, 0);

  const entries: HistoryEntry[] = [];
  const rawsByDay: Array<Record<string, RawScores>> = [];
  const listenersK = (id: string) => (listenersOf(id) ? Math.round(listenersOf(id)! / 1000) : null);
  const subscribersK = (id: string) => (subscribersOf(id) ? Math.round(subscribersOf(id)! / 1000) : null);
  days.forEach((day, dayIndex) => {
    const at = dayStart(day + 1) - 1;
    // 벅스 차트를 못 받은 날은 가장 가까운 앞날 차트를 쓴다.
    let chart = chartByDay.get(day);
    for (let back = 1; !chart && back <= dayIndex; back += 1) chart = chartByDay.get(day - back);
    for (let ahead = 1; !chart && ahead < days.length - dayIndex; ahead += 1) chart = chartByDay.get(day + ahead);

    const raws: Record<string, RawScores> = {};
    const metrics: Record<string, Metrics> = {};
    for (const group of GROUPS) {
      metrics[group.id] = {
        chartPoints: chart?.[group.id] ?? 0,
        news7d: weekNews(group.id, dayIndex),
        brand30d: countTagged(group.id, 'b', 30, at),
        comeback14d: countTagged(group.id, 'c', 14, at),
        risk7d: countTagged(group.id, 'r', 7, at),
        listenersK: listenersK(group.id),
        subscribersK: subscribersK(group.id),
      };
      const raw: RawScores = {
        musicAlbum: logScore(chart?.[group.id] ?? 0, SCORE_REF.chartPoints),
        newsIssue: logScore(weekNews(group.id, dayIndex) / 7, SCORE_REF.newsDaily),
        snsFandom: fandomScore(listenersOf(group.id), subscribersOf(group.id)),
        brandFit: logScore(countTagged(group.id, 'b', 30, at), SCORE_REF.brand30d),
        comebackActivity: logScore(countTagged(group.id, 'c', 14, at), SCORE_REF.comeback14d),
        growthMomentum: 50,
        riskAdjustment: logScore(countTagged(group.id, 'r', 7, at), SCORE_REF.risk7d),
      };
      const weekAgo = rawsByDay[dayIndex - 7]?.[group.id] ?? null;
      raw.growthMomentum = momentumScore(raw, weekAgo);
      raws[group.id] = raw;
    }
    rawsByDay.push(raws);

    const packed: number[] = [];
    for (const id of history.ids) packed.push(...(raws[id] ? packRaw(raws[id]) : VARIABLE_ORDER.map(() => -1)));
    entries.push({ t: dayStart(day + 1) - SLOT_MS, k: 0, r: packed, m: packMetrics(metrics), b: 1 });
  });

  // 지수 기준: 복원 첫날 마감 = 1,000
  const floats = Object.fromEntries(
    GROUPS.map((group) => [group.id, fanFloat(listenersOf(group.id), subscribersOf(group.id))]),
  );
  const capOf = (raws: Record<string, RawScores>) =>
    GROUPS.reduce((sum, group) => sum + priceFromRaw(raws[group.id]) * floats[group.id], 0);
  state.divisor = capOf(rawsByDay[0]) / 1000;
  entries.forEach((entry, index) => {
    entry.k = Math.round((capOf(rawsByDay[index]) / state.divisor!) * 100) / 100;
  });

  history.daily = entries;
  history.hourly = [];
  history.recent = [];
  history.startedAt = entries[0].t;

  report.backfill = {
    days: BACKFILL_DAYS,
    from: dayCompact(days[0]),
    to: dayCompact(days[days.length - 1]),
    chartDays: chartByDay.size,
    chartFailures,
    newsImputed: imputed,
    kmi: entries.map((entry) => entry.k),
  };
}

async function main() {
  await Promise.all([refreshNews(), refreshChart(), refreshLastfm(), refreshYoutube()]);

  // 첫 기록은 지수 기준(1,000)이 되므로, 뉴스·차트·Last.fm이 모두 있어야만 만든다.
  if (state.divisor === null && (!state.news || !state.lastfm || !state.chart || (YOUTUBE_KEY && !state.youtube))) {
    // 지수 기준은 만들지 않되, 다음 실행이 다시 받지 않도록 상태와 진단 리포트는 남긴다.
    report.notes.push('waiting for all sources before the first snapshot');
    // 과거 복원은 깊게 받은 기사가 필요하므로, 다음 실행이 다시 깊게 받도록 범위 기록을 지운다.
    delete state.coverageFrom;
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, 'state.json.gz'), gzipSync(JSON.stringify(state)));
    writeFileSync(join(OUT_DIR, 'run-report.json'), JSON.stringify(report, null, 1));
    writeFileSync(join(OUT_DIR, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: false } }));
    console.log(JSON.stringify(report.sources));
    return;
  }

  // 새 기준으로 처음 시작하면 지난 기록부터 만든다.
  if (state.divisor === null && history.daily.length === 0 && BACKFILL_DAYS > 0 && deepNewsTimes.size) {
    await backfillDaily();
  }

  const raws = computeRaw();
  const { floats, kmi } = computeIndex(raws);
  const metrics = Object.fromEntries(GROUPS.map((group) => [group.id, liveMetrics(group.id)]));
  appendHistory(raws, kmi, metrics);

  const latest: LatestFile = {
    version: MARKET_DATA_VERSION,
    asOf: SLOT_TIME,
    generatedAt: NOW,
    kmi,
    startedAt: history.startedAt,
    groups: Object.fromEntries(
      GROUPS.map((group) => [
        group.id,
        {
          raw: packRaw(raws[group.id]),
          float: Math.round(floats[group.id] * 10000) / 10000,
          listeners: listenersOf(group.id),
          subscribers: subscribersOf(group.id),
          news24h: state.news?.byId[group.id]?.count ?? 0,
          news7d: metrics[group.id].news7d ?? 0,
          chartPoints: state.chart?.pointsById[group.id] ?? 0,
          brand30d: countTagged(group.id, 'b', 30),
          comeback14d: countTagged(group.id, 'c', 14),
          risk7d: countTagged(group.id, 'r', 7),
          headlines: state.news?.byId[group.id]?.headlines ?? [],
          examples: {
            brand: state.examples?.[group.id]?.b ?? [],
            comeback: state.examples?.[group.id]?.c ?? [],
            risk: state.examples?.[group.id]?.r ?? [],
          },
        },
      ]),
    ),
    chart: (state.chart?.entries ?? []).filter((entry) => entry.artistId),
    sourceTimes: {
      naver: state.news?.at ?? null,
      chart: state.chart?.at ?? null,
      lastfm: state.lastfm?.date ?? null,
      youtube: state.youtube?.date ?? null,
    },
  };

  report.summary = {
    groups: GROUPS.length,
    kmi: Math.round(kmi * 100) / 100,
    historyRecent: history.recent.length,
    historyHourly: history.hourly.length,
    historyDaily: history.daily.length,
    groupsWithNews: Object.values(latest.groups).filter((group) => group.news24h > 0).length,
    groupsOnChart: Object.values(latest.groups).filter((group) => group.chartPoints > 0).length,
    groupsWithListeners: Object.values(latest.groups).filter((group) => group.listeners).length,
    groupsWithSubscribers: Object.values(latest.groups).filter((group) => group.subscribers).length,
    topNews: Object.entries(latest.groups)
      .sort((a, b) => b[1].news24h - a[1].news24h)
      .slice(0, 15)
      .map(([id, group]) => `${id}:${group.news24h}`),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'latest.json'), JSON.stringify(latest));
  writeFileSync(join(OUT_DIR, 'history.json.gz'), gzipSync(JSON.stringify(history)));
  writeFileSync(join(OUT_DIR, 'state.json.gz'), gzipSync(JSON.stringify(state)));
  writeFileSync(join(OUT_DIR, 'run-report.json'), JSON.stringify(report, null, 1));
  // 데이터 브랜치에 푸시할 때 Vercel이 빌드하지 않도록.
  writeFileSync(join(OUT_DIR, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: false } }));
  writeFileSync(
    join(OUT_DIR, 'README.md'),
    '# FANDEX market data\n\n15분마다 `scripts/market/collect.ts`가 다시 만드는 자동 생성 브랜치예요. 손으로 고치지 마세요.\n',
  );

  console.log(JSON.stringify(report.summary));
  console.log(JSON.stringify(report.sources));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
