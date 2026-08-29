import { pathToFileURL } from 'node:url';

import { Pool } from 'pg';

import {
  buildNaverNewsJobIdentity,
  NAVER_NEWS_INGESTION_CONTRACT_VERSION,
  NAVER_NEWS_PROVIDER,
  type NaverNewsIngestionCommand,
} from '../../lib/server/ingestion/naverNewsContracts';
import {
  createNaverNewsExternalCollector,
  type NaverNewsExternalCollectorOptions,
} from '../../lib/server/ingestion/naverNewsExternalCollector';
import {
  createPostgresNaverNewsIngestionRepository,
  type NaverNewsIngestionPool,
} from '../../lib/server/ingestion/naverNewsRepository';
import {
  runNaverNewsIngestionWorker,
  type NaverNewsWorkerResult,
} from '../../lib/server/ingestion/naverNewsWorker';
import { requireRuntimeDatabaseUrl } from '../../lib/server/persistence/contracts';

export const NAVER_NEWS_V124_APPROVAL_ENV = 'FANDEX_APPROVE_V124_NAVER_NEWS_PRODUCTION_WRITE';
export const NAVER_NEWS_V124_APPROVAL_VALUE = 'approved-v124-production-write';

const CONNECTION_TIMEOUT_MILLISECONDS = 5_000;
const STATEMENT_TIMEOUT_MILLISECONDS = 30_000;
const REQUIRED_VALUE_FLAGS = Object.freeze([
  '--query',
  '--collection-key',
  '--display',
  '--start',
  '--sort',
  '--worker-id',
]);

export type NaverNewsProductionWritePoolConfig = Readonly<{
  connectionString: string;
  max: 1;
  connectionTimeoutMillis: typeof CONNECTION_TIMEOUT_MILLISECONDS;
  statement_timeout: typeof STATEMENT_TIMEOUT_MILLISECONDS;
  ssl: Readonly<{ rejectUnauthorized: true }>;
}>;

export type NaverNewsProductionWritePool = NaverNewsIngestionPool & Readonly<{
  end(): Promise<void>;
}>;

export type NaverNewsProductionWriteDependencies = Readonly<{
  poolFactory?: (config: NaverNewsProductionWritePoolConfig) => NaverNewsProductionWritePool;
  collectorOptions?: Omit<NaverNewsExternalCollectorOptions, 'environment'>;
  now?: () => string;
}>;

export type NaverNewsProductionWriteSummary = Readonly<{
  mode: 'production-write';
  contractVersion: typeof NAVER_NEWS_INGESTION_CONTRACT_VERSION;
  status: NaverNewsWorkerResult['status'];
  requestSha256: string;
  resultSha256: string | null;
  attempt: number | null;
  counts: NaverNewsWorkerResult['counts'];
}>;

type ParsedProductionWriteCommand = Readonly<{
  command: NaverNewsIngestionCommand;
  workerId: string;
}>;

function argumentInvalid(): never {
  throw new Error('naver_news_production_write_argument_invalid');
}

function valueAfter(argv: readonly string[], index: number): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) return argumentInvalid();
  return value;
}

function positiveInteger(value: string): number {
  if (!/^\d+$/.test(value)) return argumentInvalid();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return argumentInvalid();
  return parsed;
}

export function parseProductionWriteCommand(argv: readonly string[]): ParsedProductionWriteCommand {
  const seen = new Set<string>();
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply') {
      if (seen.has(argument)) return argumentInvalid();
      seen.add(argument);
      continue;
    }
    if (!REQUIRED_VALUE_FLAGS.includes(argument) || seen.has(argument)) return argumentInvalid();
    seen.add(argument);
    values.set(argument, valueAfter(argv, index));
    index += 1;
  }
  if (!seen.has('--apply')) throw new Error('naver_news_production_write_apply_required');
  if (REQUIRED_VALUE_FLAGS.some((flag) => !seen.has(flag))) return argumentInvalid();
  const query = values.get('--query');
  const collectionKey = values.get('--collection-key');
  const display = values.get('--display');
  const start = values.get('--start');
  const sort = values.get('--sort');
  const workerId = values.get('--worker-id');
  if (!query || !collectionKey || !display || !start || !sort || !workerId
      || (sort !== 'date' && sort !== 'sim')
      || !/^[a-z0-9][a-z0-9._:-]{0,127}$/.test(workerId)) {
    return argumentInvalid();
  }
  return Object.freeze({
    command: Object.freeze({
      provider: NAVER_NEWS_PROVIDER,
      collectionKey,
      query,
      display: positiveInteger(display),
      start: positiveInteger(start),
      sort,
    }),
    workerId,
  });
}

function defaultPoolFactory(config: NaverNewsProductionWritePoolConfig): NaverNewsProductionWritePool {
  return new Pool(config) as unknown as NaverNewsProductionWritePool;
}

function productionWriteFailed(): Error {
  return new Error('naver_news_production_write_failed');
}

export function productionWriteExitCode(status: NaverNewsWorkerResult['status']): 0 | 1 {
  return status === 'applied' || status === 'idempotent_succeeded' ? 0 : 1;
}

export async function runNaverNewsProductionWrite(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsProductionWriteDependencies = {},
): Promise<NaverNewsProductionWriteSummary> {
  if (environment[NAVER_NEWS_V124_APPROVAL_ENV] !== NAVER_NEWS_V124_APPROVAL_VALUE) {
    throw new Error('naver_news_production_write_approval_required');
  }
  const parsed = parseProductionWriteCommand(argv);
  buildNaverNewsJobIdentity(parsed.command);
  const connectionString = requireRuntimeDatabaseUrl(environment);
  const collector = createNaverNewsExternalCollector({
    ...dependencies.collectorOptions,
    environment,
  });
  const config = Object.freeze({
    connectionString,
    max: 1 as const,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MILLISECONDS,
    statement_timeout: STATEMENT_TIMEOUT_MILLISECONDS,
    ssl: Object.freeze({ rejectUnauthorized: true as const }),
  });
  let pool: NaverNewsProductionWritePool;
  try {
    pool = (dependencies.poolFactory ?? defaultPoolFactory)(config);
  } catch {
    throw productionWriteFailed();
  }

  let result: NaverNewsWorkerResult | null = null;
  let failed = false;
  try {
    const repository = createPostgresNaverNewsIngestionRepository(pool);
    result = await runNaverNewsIngestionWorker({
      command: parsed.command,
      workerId: parsed.workerId,
      collector,
      repository,
      now: dependencies.now ?? (() => new Date().toISOString()),
    });
  } catch {
    failed = true;
  } finally {
    try {
      await pool.end();
    } catch {
      failed = true;
    }
  }
  if (failed || !result) throw productionWriteFailed();
  return Object.freeze({
    mode: 'production-write',
    contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
    status: result.status,
    requestSha256: result.requestSha256,
    resultSha256: result.resultSha256,
    attempt: result.attempt,
    counts: result.counts,
  });
}

export async function main(
  argv = process.argv.slice(2),
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const summary = await runNaverNewsProductionWrite(argv, environment);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = productionWriteExitCode(summary.status);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('NAVER News v124 production write failed closed. No credential, endpoint, database detail, SQL, or raw payload was logged.');
    process.exitCode = 1;
  });
}
