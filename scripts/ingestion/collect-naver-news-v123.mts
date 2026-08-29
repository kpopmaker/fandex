import { pathToFileURL } from 'node:url';

import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  NAVER_NEWS_PROVIDER,
  type NaverNewsIngestionCommand,
} from '../../lib/server/ingestion/naverNewsContracts';
import {
  createNaverNewsExternalCollector,
  type NaverNewsExternalCollectorOptions,
} from '../../lib/server/ingestion/naverNewsExternalCollector';

export const NAVER_NEWS_V123_APPROVAL_ENV = 'FANDEX_APPROVE_V123_NAVER_NEWS_EXTERNAL_COLLECTION';
export const NAVER_NEWS_V123_APPROVAL_VALUE = 'approved-v123-external-collection';

export type NaverNewsExternalCollectionSummary = Readonly<{
  mode: 'external-collection';
  contractVersion: typeof NAVER_NEWS_INGESTION_CONTRACT_VERSION;
  requestSha256: string;
  planSha256: string;
  resultSha256: string;
  receivedCount: number;
  normalizedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  fetchedAt: string;
}>;

function valueAfter(argv: readonly string[], index: number): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error('naver_news_external_argument_invalid');
  return value;
}

function positiveInteger(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error('naver_news_external_argument_invalid');
  return Number(value);
}

export function parseExternalCollectionCommand(argv: readonly string[]): NaverNewsIngestionCommand {
  let query: string | undefined;
  let collectionKey: string | undefined;
  let display = 10;
  let start = 1;
  let sort: 'date' | 'sim' = 'date';
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!['--query', '--collection-key', '--display', '--start', '--sort'].includes(argument)
        || seen.has(argument)) {
      throw new Error('naver_news_external_argument_invalid');
    }
    seen.add(argument);
    const value = valueAfter(argv, index);
    index += 1;
    if (argument === '--query') query = value;
    if (argument === '--collection-key') collectionKey = value;
    if (argument === '--display') display = positiveInteger(value);
    if (argument === '--start') start = positiveInteger(value);
    if (argument === '--sort') {
      if (value !== 'date' && value !== 'sim') throw new Error('naver_news_external_argument_invalid');
      sort = value;
    }
  }
  if (!query || !collectionKey) throw new Error('naver_news_external_argument_invalid');
  return Object.freeze({ provider: NAVER_NEWS_PROVIDER, collectionKey, query, display, start, sort });
}

export async function buildExternalCollectionSummary(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
  collectorOptions: Omit<NaverNewsExternalCollectorOptions, 'environment'> = {},
): Promise<NaverNewsExternalCollectionSummary> {
  if (environment[NAVER_NEWS_V123_APPROVAL_ENV] !== NAVER_NEWS_V123_APPROVAL_VALUE) {
    throw new Error('naver_news_external_approval_required');
  }
  const identity = buildNaverNewsJobIdentity(parseExternalCollectionCommand(argv));
  const collector = createNaverNewsExternalCollector({ ...collectorOptions, environment });
  const collection = await collector.collect(identity.request);
  const plan = buildNaverNewsIngestionWritePlan(identity, collection);
  return Object.freeze({
    mode: 'external-collection',
    contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
    requestSha256: identity.requestSha256,
    planSha256: plan.planSha256,
    resultSha256: plan.resultSha256,
    receivedCount: plan.counts.received,
    normalizedCount: plan.counts.normalizedRecords,
    duplicateCount: plan.counts.duplicateRecords,
    rejectedCount: plan.counts.rejectedItems,
    fetchedAt: plan.fetchedAt,
  });
}

export async function main(
  argv = process.argv.slice(2),
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  process.stdout.write(`${JSON.stringify(await buildExternalCollectionSummary(argv, environment), null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('NAVER News v123 external collection failed closed. No credential, endpoint, header, or raw payload was logged.');
    process.exitCode = 1;
  });
}
