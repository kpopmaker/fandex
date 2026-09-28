import { Pool } from 'pg';

const url = process.env.FANDEX_RUNTIME_DATABASE_URL;
if (!url) throw new Error('runtime_database_url_missing');

const pool = new Pool({
  connectionString: url,
  max: 1,
  connectionTimeoutMillis: 5000,
  query_timeout: 15000,
  statement_timeout: 15000,
  ssl: { rejectUnauthorized: true },
});

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const reg = await client.query(
      "SELECT to_regclass('fandex.source_ingestion_jobs')::text AS relation"
    );
    const cols = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='fandex' AND table_name='source_ingestion_jobs' ORDER BY ordinal_position"
    );
    let sample = null;
    if (reg.rows[0]?.relation) {
      sample = await client.query(
        "SELECT provider, status, collection_key, job_id, request_contract IS NOT NULL AS has_request_contract FROM fandex.source_ingestion_jobs ORDER BY collection_key DESC NULLS LAST LIMIT 5"
      );
    }
    await client.query('ROLLBACK');
    console.log('FANDEX_MOMENTUM_DB_DIAGNOSTIC=' + JSON.stringify({
      relation: reg.rows[0]?.relation ?? null,
      columns: cols.rows,
      sampleRows: sample?.rows ?? [],
    }));
  } finally {
    client.release();
  }
} catch (error) {
  console.error('FANDEX_MOMENTUM_DB_DIAGNOSTIC_ERROR=' + JSON.stringify({
    name: error instanceof Error ? error.name : 'unknown',
    message: error instanceof Error ? error.message : String(error),
    code: typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : null,
  }));
  process.exitCode = 1;
} finally {
  await pool.end();
}
