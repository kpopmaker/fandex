// 장기 음원 기록: 멜론 주간 TOP100을 받을 수 있는 가장 이른 주(2016년 12월 말)부터 모아, 그룹별 주간 차트 점수를 만든다.
// 2026-11-09 사용자 요청으로 벅스 대신 멜론 기준. 멜론은 일간 차트의 지난 날짜와 2016년 이전 주간 차트를 주지 않는다.
//
// 실행: PREV_DIR=<이전 music-archive 브랜치 내용> OUT_DIR=<출력 폴더> npx tsx scripts/market/music-archive.ts
// 한 번에 다 못 받으면(TIME_BUDGET_MIN) 받은 만큼 저장하고, 다음 실행이 이어서 받는다.

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gunzipSync, gzipSync } from 'node:zlib';
import universeFile from '../../data/market/universe.json';
import { createChartMatcher, parseMelon } from './charts';
import type { MusicHistoryFile, MusicHistoryGroup } from '../../lib/market/musicHistoryFile';

const run = promisify(execFile);
const PREV_DIR = process.env.PREV_DIR ?? 'archive-prev';
const OUT_DIR = process.env.OUT_DIR ?? 'archive-out';
const TIME_BUDGET_MS = Number(process.env.TIME_BUDGET_MIN ?? 45) * 60 * 1000;
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 2);
/** 이보다 앞은 멜론이 빈 화면을 준다(2026-11-09 확인: 2016-12-26 주부터 있음) */
const START_WEEK = process.env.ARCHIVE_START ?? '20161003';
const STARTED = Date.now();

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 3_600_000;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/** 원본 보관 파일: 주(월요일 YYYYMMDD)마다 [순위, 아티스트 번호, 곡 번호] 묶음 */
type RawArchive = {
  version: 'melon-weekly-v1';
  artists: string[];
  titles: string[];
  weeks: Record<string, number[]>;
  /** 멜론에 그 주 차트가 없는 주 */
  unavailable: string[];
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

const previous = readGz<RawArchive>(join(PREV_DIR, 'melon-weekly.json.gz'));
const archive: RawArchive =
  previous?.version === 'melon-weekly-v1'
    ? previous
    : { version: 'melon-weekly-v1', artists: [], titles: [], weeks: {}, unavailable: [], failed: {} };
const artistIndex = new Map(archive.artists.map((name, index) => [name, index]));
const titleIndex = new Map(archive.titles.map((name, index) => [name, index]));

function indexOf(map: Map<string, number>, list: string[], value: string): number {
  let index = map.get(value);
  if (index === undefined) {
    index = list.length;
    list.push(value);
    map.set(value, index);
  }
  return index;
}

function kstDay(time: number): number {
  return Math.floor((time + KST_OFFSET_MS) / DAY_MS);
}
function compact(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10).replace(/-/g, '');
}
function dayOf(compactDate: string): number {
  return kstDay(Date.parse(`${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}T12:00:00+09:00`));
}
/** 그 날이 속한 주의 월요일(1970-01-01 목요일 = 0) */
function mondayOf(day: number): number {
  return day - ((day + 3) % 7);
}

async function fetchWeek(monday: string) {
  const sunday = compact(dayOf(monday) + 6);
  const url = `https://www.melon.com/chart/week/index.htm?classCd=DM0000&startDay=${monday}&endDay=${sunday}&moved=Y`;
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { stdout } = await run(
        'curl',
        ['-sSL', '--max-time', '30', '-A', BROWSER_UA, '-H', 'Accept-Language: ko-KR,ko;q=0.9', '-H', 'Referer: https://www.melon.com/', url],
        { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 },
      );
      return parseMelon(stdout);
    } catch (error) {
      lastError = (error as Error).message.split('\n')[0].slice(0, 120);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw new Error(lastError);
}

async function collect() {
  // 다 끝난 주까지만(이번 주 차트는 다음 주 월요일에 나온다)
  const lastWeek = mondayOf(kstDay(Date.now())) - 7;
  const known = new Set([...Object.keys(archive.weeks), ...archive.unavailable]);
  const todo: string[] = [];
  for (let week = lastWeek; week >= mondayOf(dayOf(START_WEEK)); week -= 7) {
    const monday = compact(week);
    if (!known.has(monday)) todo.push(monday);
  }

  let index = 0;
  let fetched = 0;
  let unavailable = 0;
  let failures = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (index < todo.length && Date.now() - STARTED < TIME_BUDGET_MS) {
        const monday = todo[index];
        index += 1;
        try {
          const rows = await fetchWeek(monday);
          if (rows.length === 0) {
            // 최근 3주 안이면 아직 안 나온 것일 수 있으니 다음에 다시 본다.
            if (dayOf(monday) < lastWeek - 14) {
              archive.unavailable.push(monday);
              unavailable += 1;
            }
          } else if (rows.length < 50) {
            throw new Error(`rows ${rows.length}`);
          } else {
            const packed: number[] = [];
            for (const row of rows) {
              packed.push(row.rank, indexOf(artistIndex, archive.artists, row.artist), indexOf(titleIndex, archive.titles, row.title));
            }
            archive.weeks[monday] = packed;
            fetched += 1;
          }
          delete archive.failed[monday];
        } catch (error) {
          archive.failed[monday] = (error as Error).message;
          failures += 1;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }),
  );
  return { todo: todo.length, fetched, unavailable, failures, remaining: Math.max(0, todo.length - index) };
}

/** 그룹별 주간 차트 점수(1위 100점 … 100위 1점, 여러 곡이면 합)와 최고 순위 */
function buildHistory(): MusicHistoryFile {
  const match = createChartMatcher(universeFile.groups);
  const artistGroup = archive.artists.map((name) => match(name));
  const weeks = Object.keys(archive.weeks).sort();
  const groups: Record<string, MusicHistoryGroup> = {};

  for (const monday of weeks) {
    const week = dayOf(monday);
    const packed = archive.weeks[monday];
    const thisWeek = new Map<string, { points: number; best: number; bestTitle: number }>();
    for (let offset = 0; offset < packed.length; offset += 3) {
      const [rank, artist, title] = [packed[offset], packed[offset + 1], packed[offset + 2]];
      const id = artistGroup[artist];
      if (!id) continue;
      const current = thisWeek.get(id) ?? { points: 0, best: 999, bestTitle: title };
      current.points += 101 - rank;
      if (rank < current.best) {
        current.best = rank;
        current.bestTitle = title;
      }
      thisWeek.set(id, current);
    }
    for (const [id, entry] of thisWeek) {
      const group = (groups[id] ??= { w: [], first: monday, chartDays: 0, best: { rank: 999, title: '', date: monday } });
      group.chartDays += 1;
      if (entry.best < group.best.rank) group.best = { rank: entry.best, title: archive.titles[entry.bestTitle], date: monday };
      group.w.push([week, entry.points * 10, entry.best]);
    }
  }

  return {
    version: 'music-history-v1',
    generatedAt: Date.now(),
    source: '멜론 주간 TOP100',
    unit: 'week',
    from: weeks[0] ?? null,
    to: weeks.length ? compact(dayOf(weeks[weeks.length - 1]) + 6) : null,
    dayCount: weeks.length,
    missingDays: Object.keys(archive.failed).length,
    weeks: weeks.map(dayOf),
    groups,
  };
}

async function main() {
  const result = await collect();
  const history = buildHistory();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'melon-weekly.json.gz'), gzipSync(JSON.stringify(archive)));
  writeFileSync(join(OUT_DIR, 'music-history.json.gz'), gzipSync(JSON.stringify(history)));
  const report = {
    runAt: STARTED,
    source: history.source,
    ...result,
    from: history.from,
    to: history.to,
    weekCount: history.dayCount,
    unavailableTotal: archive.unavailable.length,
    failedTotal: Object.keys(archive.failed).length,
    groupsWithHistory: Object.keys(history.groups).length,
    artists: archive.artists.length,
    titles: archive.titles.length,
  };
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 1));
  writeFileSync(join(OUT_DIR, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: false } }));
  writeFileSync(
    join(OUT_DIR, 'README.md'),
    '# FANDEX music archive\n\n`scripts/market/music-archive.ts`가 만드는 자동 생성 브랜치예요(멜론 주간 TOP100, 2016년 12월부터). 손으로 고치지 마세요.\n',
  );
  console.log(JSON.stringify(report));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
