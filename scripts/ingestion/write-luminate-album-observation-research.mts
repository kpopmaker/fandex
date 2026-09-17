import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { Pool } from 'pg';

import type { DirectAlbumObservation } from '../../lib/alternative-evidence/directAlbumProvider';
import type { LuminateFandexAuthorizationGrant } from '../../lib/alternative-evidence/luminateAlbumAuthorizationResearch';
import { buildLuminateObservationStoredRow } from '../../lib/alternative-evidence/luminateAlbumObservationIntakeResearch';
import {
  LUMINATE_ALBUM_OBSERVATION_PERSISTENCE_RESEARCH_VERSION,
  persistLuminateAlbumObservationStoredRow,
  type LuminateAlbumObservationPersistenceResult,
} from '../../lib/alternative-evidence/luminateAlbumObservationPersistenceResearch';
import { requireRuntimeDatabaseUrl, type Queryable } from '../../lib/server/persistence/contracts';

export const LUMINATE_ALBUM_RESEARCH_WRITE_APPROVAL_ENV =
  'FANDEX_APPROVE_LUMINATE_ALBUM_RESEARCH_WRITE';
export const LUMINATE_ALBUM_RESEARCH_WRITE_APPROVAL_VALUE =
  'approved-luminate-album-research-write-v1';

const CONNECTION_TIMEOUT_MILLISECONDS = 5_000;
const STATEMENT_TIMEOUT_MILLISECONDS = 30_000;

export type LuminateAlbumObservationWriteInputFile = Readonly<{
  observation: DirectAlbumObservation;
  releaseDate: string;
  grant: LuminateFandexAuthorizationGrant;
  supersedesStoredRecordId?: string | null;
}>;

export type LuminateAlbumResearchWritePoolConfig = Readonly<{
  connectionString: string;
  max: 1;
  connectionTimeoutMillis: typeof CONNECTION_TIMEOUT_MILLISECONDS;
  statement_timeout: typeof STATEMENT_TIMEOUT_MILLISECONDS;
  ssl: Readonly<{ rejectUnauthorized: true }>;
}>;

export type LuminateAlbumResearchWritePool = Queryable & Readonly<{
  end(): Promise<void>;
}>;

export type LuminateAlbumResearchWriteDependencies = Readonly<{
  readFileText?: (path: string) => Promise<string>;
  poolFactory?: (config: LuminateAlbumResearchWritePoolConfig) => LuminateAlbumResearchWritePool;
}>;

export type LuminateAlbumResearchWriteSummary = Readonly<{
  mode: 'research-write';
  contractVersion: typeof LUMINATE_ALBUM_OBSERVATION_PERSISTENCE_RESEARCH_VERSION;
  provider: 'luminate-music';
  status: LuminateAlbumObservationPersistenceResult['status'];
  recordId: string;
  observationId: string;
}>;

export function parseLuminateAlbumResearchWriteArgs(argv: readonly string[]): Readonly<{ inputPath: string }> {
  if (argv.length !== 3 || argv[0] !== '--apply' || argv[1] !== '--input' || !argv[2] || argv[2].startsWith('--')) {
    throw new Error('luminate_album_research_write_argument_invalid');
  }
  return Object.freeze({ inputPath: argv[2] });
}

function defaultPoolFactory(config: LuminateAlbumResearchWritePoolConfig): LuminateAlbumResearchWritePool {
  return new Pool(config) as unknown as LuminateAlbumResearchWritePool;
}

async function defaultReadFileText(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

function parseInputFile(text: string): LuminateAlbumObservationWriteInputFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('luminate_album_research_write_input_invalid');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('luminate_album_research_write_input_invalid');
  }
  const candidate = parsed as Partial<LuminateAlbumObservationWriteInputFile>;
  if (!candidate.observation || !candidate.releaseDate || !candidate.grant) {
    throw new Error('luminate_album_research_write_input_invalid');
  }
  return candidate as LuminateAlbumObservationWriteInputFile;
}

export async function runLuminateAlbumResearchWrite(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: LuminateAlbumResearchWriteDependencies = {},
): Promise<LuminateAlbumResearchWriteSummary> {
  if (environment[LUMINATE_ALBUM_RESEARCH_WRITE_APPROVAL_ENV]
      !== LUMINATE_ALBUM_RESEARCH_WRITE_APPROVAL_VALUE) {
    throw new Error('luminate_album_research_write_approval_required');
  }
  const { inputPath } = parseLuminateAlbumResearchWriteArgs(argv);
  const connectionString = requireRuntimeDatabaseUrl(environment);
  const text = await (dependencies.readFileText ?? defaultReadFileText)(inputPath);
  const input = parseInputFile(text);
  const row = buildLuminateObservationStoredRow({
    observation: input.observation,
    releaseDate: input.releaseDate,
    grant: input.grant,
    schemaProviderConstraintIncludesLuminate: true,
    supersedesStoredRecordId: input.supersedesStoredRecordId ?? null,
  });

  const config = Object.freeze({
    connectionString,
    max: 1 as const,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MILLISECONDS,
    statement_timeout: STATEMENT_TIMEOUT_MILLISECONDS,
    ssl: Object.freeze({ rejectUnauthorized: true as const }),
  });

  let pool: LuminateAlbumResearchWritePool;
  try {
    pool = (dependencies.poolFactory ?? defaultPoolFactory)(config);
  } catch {
    throw new Error('luminate_album_research_write_failed');
  }

  let result: LuminateAlbumObservationPersistenceResult | null = null;
  let failed = false;
  try {
    result = await persistLuminateAlbumObservationStoredRow(pool, row);
  } catch {
    failed = true;
  } finally {
    try {
      await pool.end();
    } catch {
      failed = true;
    }
  }
  if (failed || !result) throw new Error('luminate_album_research_write_failed');

  return Object.freeze({
    mode: 'research-write' as const,
    contractVersion: LUMINATE_ALBUM_OBSERVATION_PERSISTENCE_RESEARCH_VERSION,
    provider: 'luminate-music' as const,
    status: result.status,
    recordId: result.recordId,
    observationId: result.observationId,
  });
}

export async function main(
  argv = process.argv.slice(2),
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const summary = await runLuminateAlbumResearchWrite(argv, environment);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = summary.status === 'applied' || summary.status === 'idempotent-existing' ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('Luminate album research write failed closed. No credential, database detail, SQL, licensed quantity, or raw provider payload was logged.');
    process.exitCode = 1;
  });
}
