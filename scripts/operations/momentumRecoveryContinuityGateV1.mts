import { Pool } from 'pg';

import {
  evaluateFandexMomentumRecoveryContinuityGate,
} from '../../lib/intelligence/fandexMomentumRecoveryContinuityGate';
import {
  requireRuntimeDatabaseUrl,
} from '../../lib/server/persistence/contracts';

const COLLECTION =
  /^sched-v125-naver-news-(\d{8})t(\d{6})z-[0-9a-f]{12}$/;

function slotFromCollectionKey(value: string): string {
  const match = COLLECTION.exec(value);
  if (!match) throw new Error('momentum_recovery_collection_key_invalid');
  const date = match[1];
  const time = match[2];
  return (
    date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6, 8)
    + 'T' + time.slice(0, 2) + ':' + time.slice(2, 4) + ':'
    + time.slice(4, 6) + '.000Z'
  );
}

async function main() {
  const pool = new Pool({
    connectionString: requireRuntimeDatabaseUrl(process.env),
    max: 1,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    ssl: { rejectUnauthorized: true },
  });

  let client = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    const result = await client.query<{ collection_key: string }>(
      `SELECT collection_key
       FROM fandex.source_ingestion_jobs
       WHERE provider = 'naver-news'
         AND status = 'succeeded'
         AND collection_key LIKE 'sched-v125-naver-news-%'
       ORDER BY created_at ASC`,
    );
    await client.query('ROLLBACK');

    const slots = result.rows.map((row) =>
      slotFromCollectionKey(row.collection_key));
    const gate = evaluateFandexMomentumRecoveryContinuityGate(slots);

    console.log('MOMENTUM_RECOVERY_CONTINUITY_STATE=' + gate.state);
    console.log(JSON.stringify(gate));
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'momentum_recovery_continuity_gate_failed',
  );
  process.exitCode = 1;
});
