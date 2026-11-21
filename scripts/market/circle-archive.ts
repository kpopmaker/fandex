// 장기 음반 기록: 써클차트 주간 앨범 차트를 모아 그룹별 초동판매량(첫 주 판매량)을 만든다.
// 2026-11-21 사용자 요청(새 방정식 2단계). 멜론 주간 차트를 모으는 music-archive.ts와 같은 구조다.
//
// 써클차트는 키가 필요 없다.
//   - 주차↔날짜 표: 앨범 차트 화면의 <option value="YYYYWW">2026.11.08~2026.11.14 (46)</option>
//   - 순위표: POST /data/api/chart/album 에 nationGbn=T, termGbn=week, hitYear, targetTime
//     → Album_CNT(그 주 판매량), Total_CNT(누적), RankStatus('new'면 그 주 신규 진입)
//
// 같은 앨범이 버전별로 따로 차트에 들어가므로(ATEEZ 46주 4버전) **같은 주·같은 그룹의 신규 진입을 모두 합친다**.
//
// 실행: PREV_DIR=<이전 circle-archive 브랜치 내용> OUT_DIR=<출력 폴더> npx tsx scripts/market/circle-archive.ts

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gunzipSync, gzipSync } from 'node:zlib';
import universeFile from '../../data/market/universe.json';
import { createChartMatcher, decodeEntities } from './charts';
import { RELEASES_PER_GROUP, type AlbumHistoryFile, type AlbumHistoryGroup } from '../../lib/market/albumHistoryFile';

const run = promisify(execFile);
const PREV_DIR = process.env.PREV_DIR ?? 'archive-prev';
const OUT_DIR = process.env.OUT_DIR ?? 'archive-out';
const TIME_BUDGET_MS = Number(process.env.TIME_BUDGET_MIN ?? 45) * 60 * 1000;
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 2);
/** 몇 주치를 모을지. 망각계수(180일)를 생각하면 3년이면 넉넉하다. */
const ARCHIVE_WEEKS = Number(process.env.ARCHIVE_WEEKS ?? 160);
const STARTED = Date.now();

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const CHART_PAGE = 'https://circlechart.kr/page_chart/album.circle';
const CHART_API = 'https://circlechart.kr/data/api/chart/album';

/** 원본 보관: 주(YYYYWW)마다 신규 진입만 [아티스트 번호, 앨범 번호, 그 주 판매량] 묶음 */
type RawArchive = {
  version: 'circle-album-weekly-v1';
  artists: string[];
  albums: string[];
  weeks: Record<string, number[]>;
  /** YYYYWW → 그 주 시작일(YYYY-MM-DD) */
  weekStart: Record<string, string>;
  failed: Record<string, string>;
};

function readGz<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(gunzipSync(readFileSync(path)).toString('utf8')) as T;
  } catch {
    return null;
  }
}

const previous = readGz<RawArchive>(join(PREV_DIR, 'circle-album-weekly.json.gz'));
const archive: RawArchive =
  previous?.version === 'circle-album-weekly-v1'
    ? previous
    : { version: 'circle-album-weekly-v1', artists: [], albums: [], weeks: {}, weekStart: {}, failed: {} };
const artistIndex = new Map(archive.artists.map((name, index) => [name, index]));
const albumIndex = new Map(archive.albums.map((name, index) => [name, index]));

function indexOf(map: Map<string, number>, list: string[], value: string): number {
  let index = map.get(value);
  if (index === undefined) {
    index = list.length;
    list.push(value);
    map.set(value, index);
  }
  return index;
}

async function curl(args: string[]): Promise<string> {
  const { stdout } = await run('curl', ['-sS', '--max-time', '60', '-A', BROWSER_UA, ...args], {
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
  return stdout;
}

/** 차트 화면의 날짜 드롭다운에서 주차↔시작일 표를 읽는다(2009년까지 들어 있다). */
async function fetchWeekList(): Promise<Array<{ key: string; start: string }>> {
  const html = await curl(['-H', 'Accept-Language: ko-KR,ko;q=0.9', CHART_PAGE]);
  const options = [...html.matchAll(/<option value="(\d{6})"[^>]*>([^<]+)<\/option>/g)];
  // 같은 목록이 PC용·모바일용으로 두 번 들어 있어서 겹치는 주를 걸러낸다
  // (안 거르면 ARCHIVE_WEEKS의 절반만 모인다 — 2026-11-21).
  const byKey = new Map<string, string>();
  for (const [, key, labelRaw] of options) {
    const label = decodeEntities(labelRaw);
    const start = /(\d{4})\.(\d{2})\.(\d{2})\s*~/.exec(label);
    if (start && !byKey.has(key)) byKey.set(key, `${start[1]}-${start[2]}-${start[3]}`);
  }
  // 최신 주가 앞에 오도록
  return [...byKey].map(([key, start]) => ({ key, start })).sort((a, b) => (a.key < b.key ? 1 : -1));
}

type NewEntry = { artist: string; album: string; sales: number };

async function fetchWeek(key: string): Promise<NewEntry[]> {
  const hitYear = key.slice(0, 4);
  const targetTime = String(Number(key.slice(4)));
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const body = await curl([
        '-H',
        'Accept-Language: ko-KR,ko;q=0.9',
        '-H',
        `Referer: ${CHART_PAGE}`,
        '-H',
        'X-Requested-With: XMLHttpRequest',
        '--data-urlencode',
        'nationGbn=T',
        '--data-urlencode',
        'termGbn=week',
        '--data-urlencode',
        `hitYear=${hitYear}`,
        '--data-urlencode',
        `targetTime=${targetTime}`,
        '--data-urlencode',
        'yearTime=3',
        '--data-urlencode',
        'curUrl=circlechart.kr/page_chart/album.circle?',
        CHART_API,
      ]);
      const parsed = JSON.parse(body) as { List?: Record<string, Record<string, string>> };
      const rows = Object.values(parsed.List ?? {});
      if (!rows.length) return [];
      const entries: NewEntry[] = [];
      for (const row of rows) {
        if (row.RankStatus !== 'new') continue;
        const sales = Number(row.Album_CNT ?? 0);
        if (!Number.isFinite(sales) || sales <= 0) continue;
        entries.push({
          artist: decodeEntities(row.ARTIST_NAME ?? ''),
          album: decodeEntities(row.ALBUM_NAME ?? ''),
          sales,
        });
      }
      return entries;
    } catch (error) {
      lastError = (error as Error).message.split('\n')[0].slice(0, 120);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw new Error(lastError);
}

async function collect(weekList: Array<{ key: string; start: string }>) {
  const wanted = weekList.slice(0, ARCHIVE_WEEKS);
  // 마지막으로 받은 주는 집계가 바뀔 수 있으니 한 번 더 받는다.
  const known = new Set(Object.keys(archive.weeks));
  const newest = wanted[0]?.key;
  const todo = wanted.filter((week) => !known.has(week.key) || week.key === newest);

  let index = 0;
  let fetched = 0;
  let empty = 0;
  let failures = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (index < todo.length && Date.now() - STARTED < TIME_BUDGET_MS) {
        const week = todo[index];
        index += 1;
        try {
          const entries = await fetchWeek(week.key);
          const packed: number[] = [];
          for (const entry of entries) {
            packed.push(
              indexOf(artistIndex, archive.artists, entry.artist),
              indexOf(albumIndex, archive.albums, entry.album),
              entry.sales,
            );
          }
          archive.weeks[week.key] = packed;
          archive.weekStart[week.key] = week.start;
          if (packed.length) fetched += 1;
          else empty += 1;
          delete archive.failed[week.key];
        } catch (error) {
          archive.failed[week.key] = (error as Error).message;
          failures += 1;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }),
  );
  return { todo: todo.length, fetched, empty, failures, remaining: Math.max(0, todo.length - index) };
}

/** 같은 주·같은 그룹의 신규 진입을 모두 합쳐 그룹별 발매 목록을 만든다. */
function buildHistory(): AlbumHistoryFile {
  const match = createChartMatcher(universeFile.groups);
  const artistGroup = archive.artists.map((name) => match(name));
  const keys = Object.keys(archive.weeks).sort().reverse();
  const groups: Record<string, AlbumHistoryGroup> = {};

  for (const key of keys) {
    const start = archive.weekStart[key];
    if (!start) continue;
    const packed = archive.weeks[key];
    const thisWeek = new Map<string, { sales: number; album: string; best: number; versions: number }>();
    for (let offset = 0; offset < packed.length; offset += 3) {
      const id = artistGroup[packed[offset]];
      if (!id) continue;
      const album = archive.albums[packed[offset + 1]];
      const sales = packed[offset + 2];
      const current = thisWeek.get(id) ?? { sales: 0, album, best: 0, versions: 0 };
      current.sales += sales;
      current.versions += 1;
      // 대표 앨범명은 그 주에 가장 많이 팔린 버전의 이름
      if (sales > current.best) {
        current.best = sales;
        current.album = album;
      }
      thisWeek.set(id, current);
    }
    for (const [id, entry] of thisWeek) {
      const group = (groups[id] ??= { releases: [] });
      if (group.releases.length < RELEASES_PER_GROUP) {
        group.releases.push([start, entry.sales, entry.album, entry.versions]);
      }
    }
  }

  const starts = keys.map((key) => archive.weekStart[key]).filter(Boolean).sort();
  return {
    version: 'album-history-v1',
    generatedAt: Date.now(),
    source: '써클차트 주간 앨범 차트(신규 진입 첫 주 판매량, 버전 합산)',
    from: starts[0] ?? null,
    to: starts[starts.length - 1] ?? null,
    weekCount: keys.length,
    groups,
  };
}

async function main() {
  const weekList = await fetchWeekList();
  if (!weekList.length) throw new Error('week list empty — 차트 화면을 읽지 못했어요');
  const result = await collect(weekList);
  const history = buildHistory();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'circle-album-weekly.json.gz'), gzipSync(JSON.stringify(archive)));
  writeFileSync(join(OUT_DIR, 'album-history.json.gz'), gzipSync(JSON.stringify(history)));
  const withRecord = Object.keys(history.groups).length;
  const report = {
    runAt: STARTED,
    source: history.source,
    ...result,
    weekListSize: weekList.length,
    from: history.from,
    to: history.to,
    weekCount: history.weekCount,
    groupsWithRelease: withRecord,
    groupsTotal: universeFile.groups.length,
    artists: archive.artists.length,
    albums: archive.albums.length,
    failedTotal: Object.keys(archive.failed).length,
  };
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 1));
  writeFileSync(join(OUT_DIR, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: false } }));
  writeFileSync(
    join(OUT_DIR, 'README.md'),
    '# FANDEX circle archive\n\n`scripts/market/circle-archive.ts`가 만드는 자동 생성 브랜치예요(써클차트 주간 앨범, 초동판매량). 손으로 고치지 마세요.\n',
  );
  console.log(JSON.stringify(report));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
