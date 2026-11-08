// 장기 음원 기록: 벅스 일간 TOP100을 2006년부터 하루씩 모아, 그룹별 주간 차트 점수를 만든다.
// 2026-11-08 사용자 요청(아티스트 화면에 데뷔일부터의 기록). 뉴스·팬덤은 몇 년 전 기록을 얻을 수 없어 음원만 장기로 모은다.
//
// 실행: PREV_DIR=<이전 music-archive 브랜치 내용> OUT_DIR=<출력 폴더> npx tsx scripts/market/music-archive.ts
// 한 번에 다 못 받으면(TIME_BUDGET_MIN) 받은 만큼 저장하고, 다음 실행이 이어서 받는다.

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gunzipSync, gzipSync } from 'node:zlib';
import universeFile from '../../data/market/universe.json';
import { createChartMatcher, parseBugs } from './charts';
import type { MusicHistoryFile, MusicHistoryGroup } from '../../lib/market/musicHistoryFile';

const run = promisify(execFile);
const PREV_DIR = process.env.PREV_DIR ?? 'archive-prev';
const OUT_DIR = process.env.OUT_DIR ?? 'archive-out';
const TIME_BUDGET_MS = Number(process.env.TIME_BUDGET_MIN ?? 45) * 60 * 1000;
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 3);
const START_DATE = process.env.ARCHIVE_START ?? '20060101';
const STARTED = Date.now();

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 3_600_000;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/** 원본 보관 파일: 날짜마다 [순위, 아티스트 번호, 곡 번호] 묶음 */
type RawArchive = {
  version: 'bugs-daily-v1';
  artists: string[];
  titles: string[];
  days: Record<string, number[]>;
  /** 벅스에 그날 차트가 없어 기본 화면이 나온 날짜 */
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

const archive: RawArchive = readGz<RawArchive>(join(PREV_DIR, 'bugs-daily.json.gz')) ?? {
  version: 'bugs-daily-v1',
  artists: [],
  titles: [],
  days: {},
  unavailable: [],
  failed: {},
};
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

async function fetchChart(date: string) {
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { stdout } = await run(
        'curl',
        ['-sSL', '--max-time', '30', '-A', BROWSER_UA, '-H', 'Accept-Language: ko-KR,ko;q=0.9', `https://music.bugs.co.kr/chart/track/day/total?chartdate=${date}`],
        { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 },
      );
      const rows = parseBugs(stdout);
      if (rows.length < 50) throw new Error(`rows ${rows.length}`);
      return rows;
    } catch (error) {
      lastError = (error as Error).message.split('\n')[0].slice(0, 120);
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
  throw new Error(lastError);
}

const signature = (rows: Array<{ title: string; artist: string }>) =>
  rows.slice(0, 10).map((row) => `${row.title}|${row.artist}`).join('/');

async function collect() {
  // 벅스는 차트가 없는 날짜를 넣으면 같은 기본 화면을 준다. 그 화면과 같으면 '없는 날'로 둔다.
  const fallback = signature(await fetchChart('19970101'));

  const yesterday = kstDay(Date.now()) - 1;
  const known = new Set([...Object.keys(archive.days), ...archive.unavailable]);
  const todo: string[] = [];
  // 최근 날짜부터(대부분 그룹이 최근 데뷔라 먼저 채운다)
  for (let day = yesterday; day >= dayOf(START_DATE); day -= 1) {
    const date = compact(day);
    if (!known.has(date)) todo.push(date);
  }

  let index = 0;
  let fetched = 0;
  let unavailable = 0;
  const failures: string[] = [];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (index < todo.length && Date.now() - STARTED < TIME_BUDGET_MS) {
        const date = todo[index];
        index += 1;
        try {
          const rows = await fetchChart(date);
          if (signature(rows) === fallback) {
            archive.unavailable.push(date);
            unavailable += 1;
          } else {
            const packed: number[] = [];
            for (const row of rows) {
              packed.push(row.rank, indexOf(artistIndex, archive.artists, row.artist), indexOf(titleIndex, archive.titles, row.title));
            }
            archive.days[date] = packed;
            fetched += 1;
          }
          delete archive.failed[date];
        } catch (error) {
          archive.failed[date] = (error as Error).message;
          failures.push(date);
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }),
  );
  return { todo: todo.length, fetched, unavailable, failures: failures.length, remaining: Math.max(0, todo.length - index) };
}

/** 그룹별 주간(월요일 시작) 평균 차트 점수와 최고 순위 */
function buildHistory(): MusicHistoryFile {
  const match = createChartMatcher(universeFile.groups);
  const artistGroup = archive.artists.map((name) => match(name));
  const dates = Object.keys(archive.days).sort();

  type Week = { points: number; days: number; best: number };
  const weeks = new Map<string, Map<number, Week>>();
  const groups: Record<string, MusicHistoryGroup> = {};
  const daysPerWeek = new Map<number, number>();

  for (const date of dates) {
    const day = dayOf(date);
    // 1970-01-01(목)이 day 0. 월요일 시작 주
    const week = day - ((day + 3) % 7);
    daysPerWeek.set(week, (daysPerWeek.get(week) ?? 0) + 1);
    const packed = archive.days[date];
    const pointsToday = new Map<string, { points: number; best: number; bestTitle: number }>();
    for (let offset = 0; offset < packed.length; offset += 3) {
      const [rank, artist, title] = [packed[offset], packed[offset + 1], packed[offset + 2]];
      const id = artistGroup[artist];
      if (!id) continue;
      const current = pointsToday.get(id) ?? { points: 0, best: 999, bestTitle: title };
      current.points += 101 - rank;
      if (rank < current.best) {
        current.best = rank;
        current.bestTitle = title;
      }
      pointsToday.set(id, current);
    }
    for (const [id, today] of pointsToday) {
      const group = (groups[id] ??= { w: [], first: date, chartDays: 0, best: { rank: 999, title: '', date } });
      group.chartDays += 1;
      if (today.best < group.best.rank) group.best = { rank: today.best, title: archive.titles[today.bestTitle], date };
      const byWeek = weeks.get(id) ?? new Map<number, Week>();
      const entry = byWeek.get(week) ?? { points: 0, days: 0, best: 999 };
      entry.points += today.points;
      entry.best = Math.min(entry.best, today.best);
      byWeek.set(week, entry);
      weeks.set(id, byWeek);
    }
  }

  for (const [id, byWeek] of weeks) {
    groups[id].w = [...byWeek.entries()]
      .sort((a, b) => a[0] - b[0])
      // 그 주에 받은 날 수로 나눈 하루 평균 차트 점수(×10 정수)
      .map(([week, entry]) => [week, Math.round((entry.points / (daysPerWeek.get(week) ?? 7)) * 10), entry.best]);
  }

  return {
    version: 'music-history-v1',
    generatedAt: Date.now(),
    source: '벅스 일간 TOP100',
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
    dayCount: dates.length,
    missingDays: Object.keys(archive.failed).length,
    weeks: [...daysPerWeek.keys()].sort((a, b) => a - b),
    groups,
  };
}

async function main() {
  const result = await collect();
  const history = buildHistory();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'bugs-daily.json.gz'), gzipSync(JSON.stringify(archive)));
  writeFileSync(join(OUT_DIR, 'music-history.json.gz'), gzipSync(JSON.stringify(history)));
  const report = {
    runAt: STARTED,
    ...result,
    from: history.from,
    to: history.to,
    dayCount: history.dayCount,
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
    '# FANDEX music archive\n\n`scripts/market/music-archive.ts`가 만드는 자동 생성 브랜치예요(벅스 일간 TOP100, 2006년부터). 손으로 고치지 마세요.\n',
  );
  console.log(JSON.stringify(report));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
