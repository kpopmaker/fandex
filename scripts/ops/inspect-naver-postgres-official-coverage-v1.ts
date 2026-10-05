import { Pool } from 'pg';

import { bindCanonicalArtistToNaverNews } from '../../lib/server/ingestion/naverNewsArtistBinding';
import {
  buildNaverNewsJobIdentity,
} from '../../lib/server/ingestion/naverNewsContracts';
import {
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
} from '../../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import {
  createPostgresNaverNewsLatestOfficialShadowSlotRepository,
  resolveLatestOfficialNaverNewsShadowThroughSlotStart,
} from '../../lib/server/ingestion/naverNewsLatestOfficialShadowSlot';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../../lib/server/ingestion/naverNewsScheduler';
import { getOfficialNaverNewsShadowEpoch } from '../../lib/server/ingestion/naverNewsShadowEpoch';

async function main() {
const url = process.env.FANDEX_RUNTIME_DATABASE_URL?.trim();
if (!url) throw new Error('runtime_database_url_missing');

const pool = new Pool({
  connectionString: url,
  max: 1,
  connectionTimeoutMillis: 5000,
  query_timeout: 15000,
  statement_timeout: 15000,
  idleTimeoutMillis: 5000,
  allowExitOnIdle: true,
  ssl: { rejectUnauthorized: true },
});

try {
  const latest = await resolveLatestOfficialNaverNewsShadowThroughSlotStart(
    createPostgresNaverNewsLatestOfficialShadowSlotRepository(pool),
  );
  if (latest.status !== 'ok') {
    console.log('FANDEX_POSTGRES_OFFICIAL_LATEST_STATUS=' + latest.status);
    console.log('FANDEX_POSTGRES_OFFICIAL_LATEST_REASON=' + latest.reason);
    process.exitCode = 2;
  } else {
    const binding = bindCanonicalArtistToNaverNews('iu');
    const epoch = getOfficialNaverNewsShadowEpoch('iu');
    const start = Date.parse(epoch.protocolStart);
    const through = Date.parse(latest.throughSlotStart);
    const expected: Array<{slotStart:string; jobId:string}> = [];
    for (let t = start; t <= through; t += 60 * 60 * 1000) {
      const slotStart = new Date(t).toISOString();
      const plan = buildNaverNewsSchedulerPlan({
        query: binding.query,
        at: slotStart,
        display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
      });
      const identity = buildNaverNewsJobIdentity(plan.command);
      expected.push({ slotStart, jobId: identity.jobId });
    }

    const repo = createPostgresNaverNewsCanonicalJobEvidenceReadRepository(pool);
    const batch = await repo.readJobEvidenceBatch!(expected.map((x) => x.jobId));
    const present = expected.filter((x) => batch.has(x.jobId));
    const missing = expected.filter((x) => !batch.has(x.jobId));

    const client = await pool.connect();
    let statusCount = 0;
    try {
      await client.query('BEGIN READ ONLY');
      const result = await client.query<{count:string}>(
        `SELECT COUNT(*)::text AS count
         FROM fandex.source_ingestion_jobs
         WHERE provider = $1
           AND status = 'succeeded'
           AND job_id = ANY($2::text[])`,
        ['naver_news_search', expected.map((x) => x.jobId)],
      );
      statusCount = Number(result.rows[0]?.count ?? '0');
      await client.query('ROLLBACK');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }

    let longestContiguousFromStart = 0;
    for (const row of expected) {
      if (!batch.has(row.jobId)) break;
      longestContiguousFromStart += 1;
    }

    let longestContiguousTail = 0;
    for (let i = expected.length - 1; i >= 0; i -= 1) {
      if (!batch.has(expected[i].jobId)) break;
      longestContiguousTail += 1;
    }

    console.log('FANDEX_POSTGRES_OFFICIAL_PROTOCOL_START=' + epoch.protocolStart);
    console.log('FANDEX_POSTGRES_OFFICIAL_THROUGH=' + latest.throughSlotStart);
    console.log('FANDEX_POSTGRES_OFFICIAL_EXPECTED=' + expected.length);
    console.log('FANDEX_POSTGRES_SUCCEEDED_EXPECTED_JOBS=' + statusCount);
    console.log('FANDEX_POSTGRES_CANONICAL_EVIDENCE_PRESENT=' + present.length);
    console.log('FANDEX_POSTGRES_CANONICAL_EVIDENCE_MISSING=' + missing.length);
    console.log('FANDEX_POSTGRES_FIRST_MISSING_SLOT=' + (missing[0]?.slotStart ?? 'none'));
    console.log('FANDEX_POSTGRES_CONTIGUOUS_FROM_START=' + longestContiguousFromStart);
    console.log('FANDEX_POSTGRES_CONTIGUOUS_TAIL=' + longestContiguousTail);
    console.log('FANDEX_POSTGRES_RAW_PAYLOAD_LOGGED=false');
    console.log('FANDEX_POSTGRES_CREDENTIALS_LOGGED=false');
    console.log('FANDEX_POSTGRES_DATABASE_WRITES=0');
  }
} finally {
  await pool.end();
}
}

void main().catch((error) => {
  console.error('FANDEX_POSTGRES_INSPECTOR_FAILED=' + (error instanceof Error ? error.message : 'unknown'));
  process.exitCode = 1;
});
