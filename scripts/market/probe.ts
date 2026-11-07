// 일회성 점검: 멜론 차트 접근, 과거 차트 URL, 네이버 뉴스 과거 복원 범위를 재서 probe/report.json에 남긴다.
// 실행: OUT_DIR=probe-out npx tsx scripts/market/probe.ts

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import universeFile from '../../data/market/universe.json';

const OUT_DIR = process.env.OUT_DIR ?? 'probe-out';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function curl(url: string): { ok: boolean; size: number; html: string; error?: string } {
  try {
    const html = execFileSync(
      'curl',
      ['-sSL', '--max-time', '30', '-A', UA, '-H', 'Accept-Language: ko-KR,ko;q=0.9', '-H', 'Referer: https://www.melon.com/', url],
      { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 },
    );
    return { ok: true, size: html.length, html };
  } catch (error) {
    return { ok: false, size: 0, html: '', error: (error as Error).message.split('\n')[0].slice(0, 160) };
  }
}

function strip(text: string) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseMelon(html: string) {
  const rows = html.match(/<tr[^>]*data-song-no=[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  return rows.slice(0, 100).map((row) => ({
    rank: strip(row.match(/<span class="rank[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? ''),
    title: strip(row.match(/<div class="ellipsis rank01">([\s\S]*?)<\/div>/i)?.[1] ?? ''),
    artist: strip(row.match(/<div class="ellipsis rank02">([\s\S]*?)<\/div>/i)?.[1] ?? '').split('  ')[0],
  }));
}

function pageDates(html: string): string[] {
  return [...new Set(html.match(/20\d\d\.\d\d\.\d\d/g) ?? [])].slice(0, 6);
}

async function main() {
  const report: Record<string, unknown> = { runAt: new Date().toISOString() };

  const melonUrls: Record<string, string> = {
    top100: 'https://www.melon.com/chart/index.htm',
    day: 'https://www.melon.com/chart/day/index.htm',
    week: 'https://www.melon.com/chart/week/index.htm',
    weekPast: 'https://www.melon.com/chart/week/index.htm?startDay=20261026&endDay=20261101',
    dayPastParam: 'https://www.melon.com/chart/day/index.htm?classCd=GN0000&day=20261101',
    finderWeek:
      'https://www.melon.com/chart/search/list.htm?chartType=WE&age=2020&year=2026&mon=10&day=20261026%5E20261101&classCd=DP0000&startDay=20261026&endDay=20261101&moved=Y',
    finderDay:
      'https://www.melon.com/chart/search/list.htm?chartType=DA&age=2020&year=2026&mon=11&day=20261101&classCd=DP0000&startDay=20261101&endDay=20261101&moved=Y',
  };
  const melon: Record<string, unknown> = {};
  for (const [name, url] of Object.entries(melonUrls)) {
    const result = curl(url);
    const rows = parseMelon(result.html);
    melon[name] = {
      ok: result.ok,
      error: result.error,
      size: result.size,
      rows: rows.length,
      first: rows.slice(0, 3),
      dates: pageDates(result.html),
      snippet: rows.length ? undefined : strip(result.html).slice(0, 200),
    };
  }
  // Node fetch도 시험
  try {
    const response = await fetch(melonUrls.top100, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR' } });
    melon.nodeFetch = { status: response.status, rows: parseMelon(await response.text()).length };
  } catch (error) {
    const cause = (error as Error & { cause?: { code?: string } }).cause;
    melon.nodeFetch = { error: cause?.code ?? (error as Error).message };
  }
  report.melon = melon;

  const bugsPast = curl('https://music.bugs.co.kr/chart/track/day/total?chartdate=20261101');
  const firstRank = bugsPast.html.search(/class="ranking"/);
  report.bugsDayPast = {
    ok: bugsPast.ok,
    size: bugsPast.size,
    rows: (bugsPast.html.match(/trackid=/gi) ?? []).length,
    trCount: (bugsPast.html.match(/<tr/gi) ?? []).length,
    dates: pageDates(bugsPast.html),
    sample: firstRank > 0 ? bugsPast.html.slice(Math.max(0, firstRank - 1500), firstRank + 2500) : bugsPast.html.slice(0, 3000),
  };

  // 네이버 뉴스: 그룹마다 최대 10페이지(1,000건)로 며칠 전까지 거슬러 갈 수 있는지
  const id = process.env.FANDEX_NAVER_NEWS_CLIENT_ID ?? '';
  const secret = process.env.FANDEX_NAVER_NEWS_CLIENT_SECRET ?? '';
  const now = Date.now();
  const coverage: Record<string, { days: number; items: number; pages: number }> = {};
  let calls = 0;
  const groups = universeFile.groups;
  let index = 0;
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (index < groups.length) {
        const group = groups[index++];
        const query = group.newsQueries.length ? group.newsQueries[0] : group.koreanName;
        let oldest = now;
        let items = 0;
        let pages = 0;
        for (let start = 1; start <= 901; start += 100) {
          const response = await fetch(
            `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=100&start=${start}&sort=date`,
            { headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret } },
          );
          calls += 1;
          pages += 1;
          if (response.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            start -= 100;
            continue;
          }
          if (!response.ok) break;
          const body = (await response.json()) as { items?: Array<{ pubDate: string }> };
          const list = body.items ?? [];
          items += list.length;
          for (const item of list) {
            const time = Date.parse(item.pubDate);
            if (Number.isFinite(time)) oldest = Math.min(oldest, time);
          }
          if (list.length < 100 || now - oldest > 31 * 86400000) break;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        coverage[group.id] = { days: Math.round(((now - oldest) / 86400000) * 10) / 10, items, pages };
      }
    }),
  );
  const daysList = Object.values(coverage).map((value) => value.days).sort((a, b) => a - b);
  const share = (days: number) => daysList.filter((value) => value >= days).length;
  report.naver = {
    calls,
    groupsCovering: { '7d': share(7), '14d': share(14), '30d': share(30), total: daysList.length },
    shortest: Object.entries(coverage)
      .sort((a, b) => a[1].days - b[1].days)
      .slice(0, 25)
      .map(([group, value]) => `${group}:${value.days}d`),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 1));
  writeFileSync(join(OUT_DIR, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: false } }));
  console.log('done');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
