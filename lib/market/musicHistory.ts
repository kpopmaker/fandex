import 'server-only';

import { gunzipSync } from 'node:zlib';
import type { MusicHistoryFile } from './musicHistoryFile';

/** music-archive.yml이 하루 1번 다시 만드는 장기 음원 기록 */
const ARCHIVE_URL =
  process.env.FANDEX_MUSIC_ARCHIVE_URL ??
  'https://raw.githubusercontent.com/kpopmaker/fandex/music-archive/music-history.json.gz';
const REFRESH_MS = 60 * 60 * 1000;

let cached: { file: MusicHistoryFile; loadedAt: number } | null = null;
let inflight: Promise<MusicHistoryFile | null> | null = null;

async function fetchFile(): Promise<MusicHistoryFile | null> {
  const response = await fetch(`${ARCHIVE_URL}?t=${Math.floor(Date.now() / REFRESH_MS)}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`music history: HTTP ${response.status}`);
  const file = JSON.parse(gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8')) as MusicHistoryFile;
  return file.version === 'music-history-v1' ? file : null;
}

/** 못 받으면 null(아티스트 화면은 장기 기록 없이 그대로 보여준다) */
export async function loadMusicHistory(): Promise<MusicHistoryFile | null> {
  if (cached && Date.now() - cached.loadedAt < REFRESH_MS) return cached.file;
  inflight ??= fetchFile()
    .then((file) => {
      if (file) cached = { file, loadedAt: Date.now() };
      return file;
    })
    .catch(() => cached?.file ?? null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 3_600_000;

/** 날짜 번호(한국 시간) → 그날 0시(ms) */
export function dayNumberToTime(day: number): number {
  return day * DAY_MS - KST_OFFSET_MS;
}

export function compactToTime(date: string): number {
  return Date.parse(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00+09:00`);
}
