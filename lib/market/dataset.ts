import 'server-only';

import { gunzipSync } from 'node:zlib';
import { MARKET_DATA_VERSION, type HistoryEntry, type HistoryFile, type LatestFile } from './dataFiles';

/** 수집기가 15분마다 올리는 market-data 브랜치 */
const DATA_URL =
  process.env.FANDEX_MARKET_DATA_URL ??
  'https://raw.githubusercontent.com/kpopmaker/fandex/market-data';

/** 이 시간이 지나면 다시 받아 온다 */
const REFRESH_MS = 2 * 60 * 1000;

export type MarketDataset = {
  latest: LatestFile;
  history: HistoryFile;
  /** history.ids에서 그룹 위치 */
  index: Map<string, number>;
  loadedAt: number;
};

export class MarketDataUnavailableError extends Error {}

let cached: MarketDataset | null = null;
let inflight: Promise<MarketDataset> | null = null;

async function fetchBuffer(path: string): Promise<Buffer> {
  const response = await fetch(`${DATA_URL}/${path}?t=${Math.floor(Date.now() / 60000)}`, {
    cache: 'no-store',
    // 응답이 멈추면 페이지가 끝없이 로딩되지 않게
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchDataset(): Promise<MarketDataset> {
  const latest = JSON.parse((await fetchBuffer('latest.json')).toString('utf8')) as LatestFile;
  if (latest.version !== MARKET_DATA_VERSION) throw new Error(`unknown data version ${latest.version}`);

  // 기록 파일은 새 시점이 나왔을 때만 다시 받는다.
  let history = cached?.history;
  const lastKnown = history?.recent[history.recent.length - 1]?.t ?? 0;
  if (!history || lastKnown < latest.asOf) {
    history = JSON.parse(gunzipSync(await fetchBuffer('history.json.gz')).toString('utf8')) as HistoryFile;
  }

  return {
    latest,
    history,
    index: new Map(history.ids.map((id, position) => [id, position])),
    loadedAt: Date.now(),
  };
}

export async function loadMarketDataset(): Promise<MarketDataset> {
  if (cached && Date.now() - cached.loadedAt < REFRESH_MS) return cached;
  if (!inflight) {
    inflight = fetchDataset()
      .then((dataset) => {
        cached = dataset;
        return dataset;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (error) {
    // 새로 받지 못해도 직전 데이터가 있으면 그대로 보여준다.
    if (cached) return cached;
    throw new MarketDataUnavailableError((error as Error).message);
  }
}

export function tierEntries(dataset: MarketDataset, tier: 'recent' | 'hourly' | 'daily'): HistoryEntry[] {
  return dataset.history[tier];
}
