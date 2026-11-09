// 음원 차트 파싱과 그룹 이름 매칭. 실시간 수집기(collect.ts)와 장기 음원 기록(music-archive.ts)이 함께 쓴다.

export function decodeEntities(text: string): string {
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

export function normalizeName(text: string): string {
  return text.toLowerCase().replace(/[\s\[\]{}()'"“”‘’·.,!?:;_\-&]/g, '');
}

export type ChartRow = { rank: number; title: string; artist: string };

/** 벅스 차트(실시간·일간) 표 */
export function parseBugs(html: string): ChartRow[] {
  const rows = html.match(/<tr[^>]*trackid=[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const entries: ChartRow[] = [];
  for (const row of rows) {
    const rank = row.match(/<div[^>]+class="ranking"[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/i)?.[1];
    const title = row.match(/<p[^>]+class="title"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    const artist = row.match(/<p[^>]+class="artist"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    if (!rank || !title || !artist) continue;
    entries.push({ rank: Number(rank), title: decodeEntities(title), artist: decodeEntities(artist) });
  }
  return entries.sort((a, b) => a.rank - b.rank);
}

/** 멜론 TOP100(1시간마다 갱신) */
export function parseMelon(html: string): ChartRow[] {
  const rows = html.match(/<tr[^>]*data-song-no=[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const entries: ChartRow[] = [];
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

/** 차트의 아티스트 표기를 그룹 id로 바꾸는 함수를 만든다. */
export function createChartMatcher(groups: ReadonlyArray<{ id: string; matchNames: string[] }>) {
  const chartNames = groups.map((group) => ({
    id: group.id,
    names: group.matchNames.map(normalizeName).filter((name) => name.length >= 2),
  }));
  return function matchChartArtist(artistText: string): string | null {
    const tokens = artistText
      .split(/,|&|\/|\(|\)|feat\.?|Feat\.?|\bx\b|×/)
      .map(normalizeName)
      .filter(Boolean);
    const whole = normalizeName(artistText);
    for (const { id, names } of chartNames) {
      for (const name of names) {
        if (tokens.includes(name)) return id;
        if (name.length >= 4 && whole.includes(name)) return id;
      }
    }
    return null;
  };
}
