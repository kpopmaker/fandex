import 'server-only';

import { attachDatabasePool } from '@vercel/functions';
import { Pool } from 'pg';

import { requireDatabaseUrl } from './contracts';

const MAX_POOL_SIZE = 5;
const CONNECTION_TIMEOUT_MS = 5_000;
const QUERY_TIMEOUT_MS = 15_000;

let runtimePool: Pool | undefined;

export function getRuntimeDatabasePool(): Pool {
  if (runtimePool) return runtimePool;

  const connectionString = requireDatabaseUrl(process.env, 'DATABASE_URL');
  const pool = new Pool({
    connectionString,
    max: MAX_POOL_SIZE,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
    statement_timeout: QUERY_TIMEOUT_MS,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: false,
    ssl: { rejectUnauthorized: true },
  });

  attachDatabasePool(pool);
  runtimePool = pool;
  return pool;
}
