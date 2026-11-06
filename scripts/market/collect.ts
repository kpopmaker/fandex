// FANDEX 실데이터 수집기. GitHub Actions에서 15분마다 실행된다.
//
//   네이버 뉴스(30분) ─┐
//   벅스 실시간(1시간) ─┼─▶ 변수별 원점수(0~100) ─▶ 가격·KMI ─▶ market-data 브랜치
//   Last.fm(하루 1번) ─┘
//
// 실행: PREV_DIR=<이전 market-data 내용> OUT_DIR=<출력 폴더> npx tsx scripts/market/collect.ts
// 필요한 환경변수: FANDEX_NAVER_NEWS_CLIENT_ID, FANDEX_NAVER_NEWS_CLIENT_SECRET, LASTFM_API_KEY

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import universeFile from '../../data/market/universe.json';
import {
  SCORE_REF,
  VARIABLE_ORDER,
  fanFloat,
  listenerScore,
  logScore,
  momentumScore,
  packRaw,
  priceFromRaw,
  unpackRaw,
  type RawScores,
} from '../../lib/market/formula';
import {
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

type State = {
  version: string;
  divisor: number | null;
  prevPrices: Record<string, number>;
  prevFloats: Record<string, number>;
  news: {
    at: number;
    byId: Record<string, { count: number; headlines: NewsHeadline[] }>;
  } | null;
  tagged: Record<string, TaggedArticle[]>;
  chart: { at: number; entries: ChartEntry[]; pointsById: Record<string, number> } | null;
  lastfm: {
    date: string;
    byId: Record<string, { listeners: number; playcount: number; name: string } | null>;
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

const state: State = readJson<State>(join(PREV_DIR, 'state.json.gz'), true) ?? {
  version: MARKET_DATA_VERSION,
  divisor: null,
  prevPrices: {},
  prevFloats: {},
  news: null,
  tagged: {},
  chart: null,
  lastfm: null,
};

const history: HistoryFile = readJson<HistoryFile>(join(PREV_DIR, 'history.json.gz'), true) ?? {
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

function decodeEntities(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

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
  'kard', 'buzz', 'secret', 'ikon', 'winner', 'kara', 'vixx', 'pow', 'kiiikiii', 'billlie', 'lucy',
  'ahof', 'onewe', 'seeya', 'whib', 'dxmon', 'csr', 'highlight', 'astro', 'pentagon', 'treasure',
  'tempest', 'evnne', 'touched', 'waker', 'epex', 'aen', 'blitzers', 'trendz', 'ninei', 'and2ble',
  'unis', 'izna', 'naze', 'idid', 'justb', 'classy', 'madein', 'wei', 'ntx', 'tiot', 'aimers',
  'unchild', 'apink', 'day6', 'exo', 'onf', 'xlov', 'newbeat', 'davichi',
]);

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
  fetched: number;
  pages: number;
};

async function collectGroupNews(group: Group): Promise<GroupNews> {
  // 흔한 단어 이름은 '한글명 영문명'을 함께 검색한다(기사는 보통 '그룹 카드(KARD)'처럼 둘 다 쓴다).
  const query =
    AMBIGUOUS_IDS.has(group.id) && group.englishName !== group.koreanName
      ? `${group.koreanName} ${group.englishName}`
      : group.koreanName;
  const matcher = MATCHERS.get(group.id)!;
  const cutoff = NOW - DAY_MS;
  const seen = new Set<string>();
  // 같은 보도자료가 여러 매체에 그대로 실리면 한 건으로 센다.
  const seenTitles = new Set<string>();
  const relevant: Array<{ item: NaverItem; time: number; text: string }> = [];
  let fetched = 0;
  let pages = 0;

  for (let start = 1; start <= 301; start += 100) {
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
      if (group.excludeKeywords.some((word) => text.includes(word))) continue;
      if (!containsAny(text, CONTEXT_WORDS)) continue;
      const titleKey = title.replace(/[^0-9A-Za-z가-힣]/g, '').slice(0, 40);
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);
      relevant.push({ item: { ...item, title }, time, text });
    }
    // 한 페이지(100건)가 모두 24시간 안이면 다음 페이지를 더 본다.
    if (items.length < 100 || oldest < cutoff) break;
  }

  const within24h = relevant.filter((entry) => entry.time >= cutoff);
  const tagged: TaggedArticle[] = [];
  for (const entry of relevant) {
    const brand = containsAny(entry.text, BRAND_WORDS);
    const comeback = containsAny(entry.text, COMEBACK_WORDS);
    const risk = containsAny(entry.text, RISK_WORDS);
    if (!brand && !comeback && !risk) continue;
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
    headlines: within24h.slice(0, 3).map((entry) => ({
      title: entry.item.title,
      url: entry.item.originallink || entry.item.link,
      publishedAt: entry.time,
    })),
    tagged,
    fetched,
    pages,
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

  await runWithConcurrency(GROUPS, 4, async (group) => {
    try {
      const result = await collectGroupNews(group);
      byId[group.id] = { count: result.count, headlines: result.headlines };
      fetched += result.fetched;
      pages += result.pages;
      const existing = new Map((state.tagged[group.id] ?? []).map((article) => [article.h, article]));
      for (const article of result.tagged) existing.set(article.h, article);
      state.tagged[group.id] = [...existing.values()].filter((article) => today - article.d < 31);
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
  };
}

// ─────────────────────────── 벅스 실시간 차트 ───────────────────────────

function normalizeName(text: string): string {
  return text.toLowerCase().replace(/[\s\[\]{}()'"“”‘’·.,!?:;_\-&]/g, '');
}

function parseBugs(html: string): Array<{ rank: number; title: string; artist: string }> {
  const rows = html.match(/<tr[^>]*trackid=[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const entries: Array<{ rank: number; title: string; artist: string }> = [];
  for (const row of rows) {
    const rank = row.match(/<div[^>]+class="ranking"[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/i)?.[1];
    const title = row.match(/<p[^>]+class="title"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    const artist = row.match(/<p[^>]+class="artist"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    if (!rank || !title || !artist) continue;
    entries.push({ rank: Number(rank), title: decodeEntities(title), artist: decodeEntities(artist) });
  }
  return entries.sort((a, b) => a.rank - b.rank);
}

const CHART_NAMES = GROUPS.map((group) => ({
  id: group.id,
  names: group.matchNames.map(normalizeName).filter((name) => name.length >= 2),
}));

function matchChartArtist(artistText: string): string | null {
  const tokens = artistText
    .split(/,|&|\/|\(|\)|feat\.?|Feat\.?|\bx\b|×/)
    .map(normalizeName)
    .filter(Boolean);
  const whole = normalizeName(artistText);
  for (const { id, names } of CHART_NAMES) {
    for (const name of names) {
      if (tokens.includes(name)) return id;
      if (name.length >= 4 && whole.includes(name)) return id;
    }
  }
  return null;
}

async function refreshChart(): Promise<void> {
  const age = state.chart ? NOW - state.chart.at : Infinity;
  if (age < 55 * 60 * 1000) {
    report.sources.bugs = { status: 'cached', at: state.chart!.at };
    return;
  }
  try {
    const response = await fetch('https://music.bugs.co.kr/chart', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });
    if (!response.ok) throw new Error(`bugs ${response.status}`);
    const rows = parseBugs(await response.text());
    if (rows.length < 50) throw new Error(`bugs parsed only ${rows.length} rows`);

    const pointsById: Record<string, number> = {};
    const entries: ChartEntry[] = rows.map((row) => {
      const artistId = matchChartArtist(row.artist);
      if (artistId) pointsById[artistId] = (pointsById[artistId] ?? 0) + (101 - row.rank);
      return { rank: row.rank, title: row.title, artist: row.artist, artistId };
    });
    state.chart = { at: NOW, entries, pointsById };
    report.sources.bugs = {
      status: 'ok',
      at: NOW,
      rows: rows.length,
      matchedRows: entries.filter((entry) => entry.artistId).length,
      matchedGroups: Object.keys(pointsById).length,
    };
  } catch (error) {
    const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
    report.sources.bugs = {
      status: 'failed',
      detail: `${(error as Error).message}${cause ? ` (${cause.code ?? ''} ${cause.message ?? ''})` : ''}`,
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
  if (state.lastfm?.date === today) {
    report.sources.lastfm = { status: 'cached', detail: today };
    return;
  }
  if (!LASTFM_KEY) {
    report.sources.lastfm = { status: 'skipped', detail: 'missing credentials' };
    return;
  }
  const byId: NonNullable<State['lastfm']>['byId'] = {};
  const unverified: string[] = [];
  let failures = 0;

  await runWithConcurrency(GROUPS, 3, async (group) => {
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

  if (failures < GROUPS.length / 2) state.lastfm = { date: today, byId };
  report.sources.lastfm = {
    status: failures ? 'partial' : 'ok',
    detail: today,
    verified: Object.values(byId).filter(Boolean).length,
    unverified,
    failureCount: failures,
  };
}

// ─────────────────────────── 원점수와 지수 ───────────────────────────

function countTagged(id: string, flag: 'b' | 'c' | 'r', days: number): number {
  const today = kstDay(NOW);
  return (state.tagged[id] ?? []).filter((article) => article[flag] && today - article.d < days).length;
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
    const listeners = state.lastfm?.byId[group.id]?.listeners ?? null;
    const raw: RawScores = {
      musicAlbum: logScore(state.chart?.pointsById[group.id] ?? 0, SCORE_REF.chartPoints),
      newsIssue: logScore(state.news?.byId[group.id]?.count ?? 0, SCORE_REF.news24h),
      snsFandom: listenerScore(listeners),
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
    floats[group.id] = fanFloat(state.lastfm?.byId[group.id]?.listeners ?? null);
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

function appendHistory(raws: Record<string, RawScores>, kmi: number): void {
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
  upsert(history.daily, entry, kstDay);

  history.recent = history.recent.filter((item) => item.t > SLOT_TIME - 49 * HOUR_MS);
  history.hourly = history.hourly.filter((item) => item.t > SLOT_TIME - 36 * DAY_MS);
}

// ─────────────────────────── 실행 ───────────────────────────

async function main() {
  await Promise.all([refreshNews(), refreshChart(), refreshLastfm()]);

  // 첫 기록은 지수 기준(1,000)이 되므로, 뉴스·차트·Last.fm이 모두 있어야만 만든다.
  if (state.divisor === null && (!state.news || !state.lastfm || !state.chart)) {
    console.log(JSON.stringify(report.sources));
    throw new Error('first snapshot needs both news and Last.fm data; nothing written');
  }

  const raws = computeRaw();
  const { floats, kmi } = computeIndex(raws);
  appendHistory(raws, kmi);

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
          listeners: state.lastfm?.byId[group.id]?.listeners ?? null,
          news24h: state.news?.byId[group.id]?.count ?? 0,
          chartPoints: state.chart?.pointsById[group.id] ?? 0,
          brand30d: countTagged(group.id, 'b', 30),
          comeback14d: countTagged(group.id, 'c', 14),
          risk7d: countTagged(group.id, 'r', 7),
          headlines: state.news?.byId[group.id]?.headlines ?? [],
        },
      ]),
    ),
    chart: (state.chart?.entries ?? []).filter((entry) => entry.artistId),
    sourceTimes: {
      naver: state.news?.at ?? null,
      bugs: state.chart?.at ?? null,
      lastfm: state.lastfm?.date ?? null,
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
