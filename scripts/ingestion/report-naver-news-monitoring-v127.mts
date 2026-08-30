import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { requireRuntimeDatabaseUrl } from '../../lib/server/persistence/contracts';
import { buildNaverNewsMonitoringReport, type NaverNewsMonitoringOptions } from '../../lib/server/ingestion/naverNewsMonitoringContracts';
import { readNaverNewsMonitoringSnapshot, type NaverNewsMonitoringPool } from '../../lib/server/ingestion/naverNewsMonitoringRepository';

const FLAGS = Object.freeze(['--query', '--display', '--recent-jobs', '--recent-runs', '--freshness-minutes']);
const DEFAULTS = Object.freeze({ display: 100, recentJobs: 20, recentRuns: 20, freshnessMinutes: 120 });
export type NaverNewsMonitoringPoolConfig = Readonly<{ connectionString: string; max: 1; connectionTimeoutMillis: 5_000; query_timeout: 15_000; statement_timeout: 15_000; ssl: Readonly<{ rejectUnauthorized: true }> }>;
export type NaverNewsMonitoringDependencies = Readonly<{ poolFactory?: (config: NaverNewsMonitoringPoolConfig) => NaverNewsMonitoringPool & { end(): Promise<void> } }>;

function invalid(): never { throw new Error('naver_news_monitoring_argument_invalid'); }
function valueAfter(argv: readonly string[], index: number): string { const value = argv[index + 1]; if (!value || value.startsWith('--')) return invalid(); return value; }
function bounded(value: string, max: number): number { if (!/^\d+$/.test(value)) return invalid(); const result = Number(value); if (!Number.isSafeInteger(result) || result < 1 || result > max) return invalid(); return result; }
export function parseNaverNewsMonitoringCommand(argv: readonly string[]): NaverNewsMonitoringOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) { const flag = argv[index]; if (!FLAGS.includes(flag) || values.has(flag)) return invalid(); values.set(flag, valueAfter(argv, index)); index += 1; }
  const query = values.get('--query'); if (!query) return invalid();
  return Object.freeze({ query, display: values.has('--display') ? bounded(values.get('--display') as string, 100) : DEFAULTS.display,
    recentJobs: values.has('--recent-jobs') ? bounded(values.get('--recent-jobs') as string, 50) : DEFAULTS.recentJobs,
    recentRuns: values.has('--recent-runs') ? bounded(values.get('--recent-runs') as string, 50) : DEFAULTS.recentRuns,
    freshnessMinutes: values.has('--freshness-minutes') ? bounded(values.get('--freshness-minutes') as string, 10_080) : DEFAULTS.freshnessMinutes });
}
function defaultPool(config: NaverNewsMonitoringPoolConfig) { return new Pool(config) as unknown as NaverNewsMonitoringPool & { end(): Promise<void> }; }
export async function runNaverNewsMonitoring(argv: readonly string[], environment: Readonly<Record<string, string | undefined>>, dependencies: NaverNewsMonitoringDependencies = {}) {
  const options = parseNaverNewsMonitoringCommand(argv);
  let pool: (NaverNewsMonitoringPool & { end(): Promise<void> }) | null = null;
  try {
    const connectionString = requireRuntimeDatabaseUrl(environment);
    const activePool = (dependencies.poolFactory ?? defaultPool)({ connectionString, max: 1, connectionTimeoutMillis: 5_000, query_timeout: 15_000, statement_timeout: 15_000, ssl: { rejectUnauthorized: true } });
    pool = activePool;
    const snapshot = await readNaverNewsMonitoringSnapshot(activePool, options);
    return buildNaverNewsMonitoringReport(snapshot, options);
  }
  catch { throw new Error('naver_news_monitoring_failed'); }
  finally { if (pool) { try { await pool.end(); } catch { throw new Error('naver_news_monitoring_failed'); } } }
}
export async function main(argv = process.argv.slice(2), environment: Readonly<Record<string, string | undefined>> = process.env) { process.stdout.write(`${JSON.stringify(await runNaverNewsMonitoring(argv, environment), null, 2)}\n`); }
const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) main().catch(() => { console.error('NAVER News v127 monitoring failed closed. No credential, query, raw payload, SQL, or database detail was logged.'); process.exitCode = 1; });
