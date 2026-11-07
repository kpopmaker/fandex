// 177팀의 공식 유튜브 채널을 찾는다. 결과는 youtube-resolve 브랜치의 youtube-resolve.json에 쌓인다.
//
// 1단계(싼 방법): @핸들 추측 → channels.list(forHandle) 1유닛
// 2단계(비싼 방법): 남은 팀만 search.list 100유닛, 하루 SEARCH_BUDGET번까지
// 후보마다 채널 이름·구독자 수로 공식 채널인지 판단해 auto / review로 나눈다.
// 사람이 확인한 최종 매핑은 data/market/youtube-channels.json(main)에 둔다.
//
// 실행: PREV_DIR=<이전 youtube-resolve 내용> OUT_DIR=<출력> YOUTUBE_API_KEY=... npx tsx scripts/market/resolve-youtube.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import universeFile from '../../data/market/universe.json';
import confirmedFile from '../../data/market/youtube-channels.json';

type Group = (typeof universeFile.groups)[number];

type Candidate = {
  channelId: string;
  title: string;
  handle: string | null;
  subscribers: number | null;
  videos: number;
  views: number;
  via: 'handle' | 'search';
  nameMatch: boolean;
};

type Entry = {
  status: 'confirmed' | 'auto' | 'review' | 'none' | 'pending';
  chosen: Candidate | null;
  candidates: Candidate[];
  triedHandles: string[];
  searched: boolean;
  note?: string;
};

type ResolveFile = {
  version: 'youtube-resolve-v1';
  updatedAt: number;
  runs: number;
  byId: Record<string, Entry>;
};

const KEY = process.env.YOUTUBE_API_KEY ?? '';
const PREV_DIR = process.env.PREV_DIR ?? 'yt-prev';
const OUT_DIR = process.env.OUT_DIR ?? 'yt-out';
const SEARCH_BUDGET = Number(process.env.SEARCH_BUDGET ?? 80);

let units = 0;
let searches = 0;
const errors: string[] = [];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
}

type ChannelItem = {
  id: string;
  snippet?: { title?: string; customUrl?: string };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean; videoCount?: string; viewCount?: string };
};
type SearchItem = { id?: { channelId?: string } };
type ApiList<T> = { items?: T[] };

const BAD_TITLE = /topic|lyrics|fan ?cam|fanpage|fan page|fansub|subs|translation|archive|가사|자막|팬페이지|직캠|reaction/i;

async function api<T>(path: string, params: Record<string, string>, cost: number): Promise<ApiList<T>> {
  const query = new URLSearchParams({ ...params, key: KEY });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${query}`);
  units += cost;
  if (!response.ok) {
    const body = await response.text();
    const reason = body.match(/"reason":\s*"([^"]+)"/)?.[1] ?? String(response.status);
    throw new Error(`${path} ${reason}`);
  }
  return (await response.json()) as ApiList<T>;
}

function toCandidate(item: ChannelItem, via: Candidate['via'], group: Group): Candidate {
  const title: string = item.snippet?.title ?? '';
  const names = group.matchNames.map(normalize).filter((name) => name.length >= 2);
  const normalizedTitle = normalize(title);
  const handle: string | null = item.snippet?.customUrl ?? null;
  const normalizedHandle = handle ? normalize(handle) : '';
  const nameMatch =
    !BAD_TITLE.test(title) &&
    names.some((name) => normalizedTitle.includes(name) || (name.length >= 3 && normalizedHandle.includes(name)));
  return {
    channelId: item.id,
    title,
    handle,
    subscribers: item.statistics?.hiddenSubscriberCount ? null : Number(item.statistics?.subscriberCount ?? 0),
    videos: Number(item.statistics?.videoCount ?? 0),
    views: Number(item.statistics?.viewCount ?? 0),
    via,
    nameMatch,
  };
}

function handleGuesses(group: Group): string[] {
  const base = group.englishName.replace(/[^0-9A-Za-z]/g, '');
  if (base.length < 2) return [];
  return [...new Set([base, `${base}official`, `${base}_official`, `official${base}`])];
}

/** 공식 채널로 볼 만한 후보를 고른다. 확실하지 않으면 review. */
function decide(entry: Entry): void {
  const matched = entry.candidates
    .filter((candidate) => candidate.nameMatch)
    .sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0));
  if (!matched.length) {
    entry.status = entry.searched ? 'none' : 'pending';
    entry.chosen = null;
    return;
  }
  const [best, second] = matched;
  const bestSubs = best.subscribers ?? 0;
  const clearLead = !second || (second.subscribers ?? 0) < bestSubs * 0.3;
  entry.chosen = best;
  entry.status = bestSubs >= 30_000 && clearLead ? 'auto' : 'review';
}

async function main() {
  if (!KEY) throw new Error('YOUTUBE_API_KEY missing');

  const previousPath = join(PREV_DIR, 'youtube-resolve.json');
  const state: ResolveFile = existsSync(previousPath)
    ? JSON.parse(readFileSync(previousPath, 'utf8'))
    : { version: 'youtube-resolve-v1', updatedAt: 0, runs: 0, byId: {} };

  const confirmed = confirmedFile.channels as Record<string, { channelId: string; title: string }>;

  for (const group of universeFile.groups) {
    const entry: Entry = state.byId[group.id] ?? {
      status: 'pending',
      chosen: null,
      candidates: [],
      triedHandles: [],
      searched: false,
    };
    state.byId[group.id] = entry;
    if (confirmed[group.id]) {
      entry.status = 'confirmed';
      entry.note = 'data/market/youtube-channels.json';
    }
  }

  // 1단계: 핸들 추측
  for (const group of universeFile.groups) {
    const entry = state.byId[group.id];
    if (entry.status === 'confirmed' || entry.status === 'auto') continue;
    for (const handle of handleGuesses(group)) {
      if (entry.triedHandles.includes(handle)) continue;
      entry.triedHandles.push(handle);
      try {
        const body = await api<ChannelItem>('channels', { part: 'snippet,statistics', forHandle: `@${handle}` }, 1);
        for (const item of body.items ?? []) {
          if (!entry.candidates.some((candidate) => candidate.channelId === item.id)) {
            entry.candidates.push(toCandidate(item, 'handle', group));
          }
        }
      } catch (error) {
        errors.push(`${group.id} handle ${handle}: ${(error as Error).message}`);
        if ((error as Error).message.includes('quotaExceeded')) break;
      }
    }
    decide(entry);
  }

  // 2단계: 검색(남은 팀만, 구독자 많은 팀부터 끝내도록 universe 순서 유지)
  for (const group of universeFile.groups) {
    const entry = state.byId[group.id];
    if (entry.status === 'confirmed' || entry.status === 'auto' || entry.searched) continue;
    if (searches >= SEARCH_BUDGET) break;
    try {
      searches += 1;
      const found = await api<SearchItem>(
        'search',
        { part: 'snippet', type: 'channel', q: `${group.englishName} ${group.koreanName} official`, maxResults: '5' },
        100,
      );
      const ids = (found.items ?? []).map((item) => item.id?.channelId).filter((id): id is string => Boolean(id));
      entry.searched = true;
      if (ids.length) {
        const details = await api<ChannelItem>('channels', { part: 'snippet,statistics', id: ids.join(',') }, 1);
        for (const item of details.items ?? []) {
          if (!entry.candidates.some((candidate) => candidate.channelId === item.id)) {
            entry.candidates.push(toCandidate(item, 'search', group));
          }
        }
      }
      decide(entry);
    } catch (error) {
      errors.push(`${group.id} search: ${(error as Error).message}`);
      if ((error as Error).message.includes('quotaExceeded')) break;
    }
  }

  state.updatedAt = Date.now();
  state.runs += 1;

  const counts: Record<string, number> = {};
  for (const entry of Object.values(state.byId)) counts[entry.status] = (counts[entry.status] ?? 0) + 1;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'youtube-resolve.json'), JSON.stringify(state, null, 1));
  writeFileSync(
    join(OUT_DIR, 'run-report.json'),
    JSON.stringify({ runAt: Date.now(), units, searches, counts, errors: errors.slice(0, 40), errorCount: errors.length }, null, 1),
  );
  writeFileSync(join(OUT_DIR, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: false } }));
  console.log(JSON.stringify({ units, searches, counts, errorCount: errors.length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
