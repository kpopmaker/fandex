import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  NAVER_NEWS_PROVIDER,
  type NaverNewsCollection,
  type NaverNewsIngestionCommand,
} from '../../lib/server/ingestion/naverNewsContracts';
import {
  planNaverNewsIngestionDryRun,
  type NaverNewsCollector,
  type NaverNewsDryRunReport,
} from '../../lib/server/ingestion/naverNewsWorker';

const FIXTURE_PATH = new URL('./fixtures/naver-news-v121-dry-run.json', import.meta.url);
const DEFAULT_QUERY = 'FANDEX v121 NAVER News dry run';
const DEFAULT_COLLECTION_KEY = 'manual-v121-dry-run-2026-08-29';

function parseValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag.slice(2).replaceAll('-', '_')}_value_required`);
  return value;
}

export function parseDryRunCommand(argv: readonly string[]): NaverNewsIngestionCommand {
  let query = DEFAULT_QUERY;
  let collectionKey = DEFAULT_COLLECTION_KEY;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply' || argument === '--live' || argument === '--use-api') {
      throw new Error('naver_news_dry_run_live_mode_forbidden');
    }
    if (argument === '--query') {
      query = parseValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === '--collection-key') {
      collectionKey = parseValue(argv, index, argument);
      index += 1;
      continue;
    }
    throw new Error('naver_news_dry_run_argument_invalid');
  }
  return Object.freeze({
    provider: NAVER_NEWS_PROVIDER,
    collectionKey,
    query,
    display: 4,
    start: 1,
    sort: 'date',
  });
}

async function fixtureCollector(): Promise<NaverNewsCollector> {
  const fixture = JSON.parse(await readFile(FIXTURE_PATH, 'utf8')) as NaverNewsCollection;
  return Object.freeze({
    mode: 'fixture' as const,
    async collect() {
      return structuredClone(fixture);
    },
  });
}

export async function buildDryRunReport(argv: readonly string[]): Promise<NaverNewsDryRunReport> {
  return planNaverNewsIngestionDryRun(parseDryRunCommand(argv), await fixtureCollector());
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  process.stdout.write(`${JSON.stringify(await buildDryRunReport(argv), null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('NAVER News v121 dry run failed closed. No credential, endpoint, or raw payload was logged.');
    process.exitCode = 1;
  });
}
