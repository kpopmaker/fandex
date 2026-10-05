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

    const client = await pool.connect();
    try {
      await client.query('BEGIN READ ONLY');

      const jobs = await client.query<{
        job_id:string;
        collection_key:string;
        request_contract:unknown;
        status:string;
        normalized_record_count:number|string;
        raw_evidence_count:number|string;
        result_sha256:string|null;
      }>(
        `SELECT job_id, collection_key, request_contract, status,
                normalized_record_count, raw_evidence_count, result_sha256
         FROM fandex.source_ingestion_jobs
         WHERE provider = $1
           AND job_id = ANY($2::text[])`,
        ['naver-news', expected.map((x) => x.jobId)],
      );

      const statusRows = await client.query<{status:string; count:string}>(
        `SELECT status, COUNT(*)::text AS count
         FROM fandex.source_ingestion_jobs
         WHERE provider = $1
           AND job_id = ANY($2::text[])
         GROUP BY status
         ORDER BY status`,
        ['naver-news', expected.map((x) => x.jobId)],
      );

      const normalizedCounts = await client.query<{job_id:string; count:string}>(
        `SELECT raw.job_id, COUNT(*)::text AS count
         FROM fandex.source_ingestion_raw_evidence AS raw
         JOIN fandex.source_ingestion_normalized_records AS nr
           ON nr.record_id = raw.normalized_record_id
         WHERE raw.job_id = ANY($1::text[])
           AND raw.normalization_outcome = 'normalized'
         GROUP BY raw.job_id`,
        [expected.map((x) => x.jobId)],
      );

      const collectionReceivedCounts = await client.query<{job_id:string; count:string}>(
        `SELECT job_id, COUNT(*)::text AS count
         FROM fandex.source_ingestion_audit_events
         WHERE job_id = ANY($1::text[])
           AND event_type = 'collection_received'
         GROUP BY job_id`,
        [expected.map((x) => x.jobId)],
      );

      await client.query('ROLLBACK');

      const expectedById = new Map(expected.map((x) => {
        const plan = buildNaverNewsSchedulerPlan({
          query: binding.query,
          at: x.slotStart,
          display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
        });
        const identity = buildNaverNewsJobIdentity(plan.command);
        return [x.jobId, { slotStart:x.slotStart, identity }] as const;
      }));
      const normalizedById = new Map(normalizedCounts.rows.map((r) => [r.job_id.trim(), Number(r.count)]));
      const receivedById = new Map(collectionReceivedCounts.rows.map((r) => [r.job_id.trim(), Number(r.count)]));

      const foundIds = new Set<string>();
      const succeededIds = new Set<string>();
      const canonicalEligibleIds = new Set<string>();
      for (const row of jobs.rows) {
        const jobId = row.job_id.trim();
        foundIds.add(jobId);
        const exp = expectedById.get(jobId);
        if (!exp) continue;
        if (row.status === 'succeeded') succeededIds.add(jobId);
        const exactIdentity =
          row.collection_key === exp.identity.request.collectionKey
          && JSON.stringify(row.request_contract) === JSON.stringify(exp.identity.request);
        const normalizedCount = Number(row.normalized_record_count);
        const canonicalEligible =
          row.status === 'succeeded'
          && exactIdentity
          && typeof row.result_sha256 === 'string'
          && /^[0-9a-f]{64}$/.test(row.result_sha256)
          && Number.isSafeInteger(normalizedCount)
          && normalizedCount === (normalizedById.get(jobId) ?? 0)
          && (receivedById.get(jobId) ?? 0) === 1;
        if (canonicalEligible) canonicalEligibleIds.add(jobId);
      }

      const missingRow = expected.filter((x) => !foundIds.has(x.jobId));
      const nonSucceeded = expected.filter((x) => foundIds.has(x.jobId) && !succeededIds.has(x.jobId));
      const nonCanonical = expected.filter((x) => foundIds.has(x.jobId) && !canonicalEligibleIds.has(x.jobId));

      let contiguousCanonicalFromStart = 0;
      for (const row of expected) {
        if (!canonicalEligibleIds.has(row.jobId)) break;
        contiguousCanonicalFromStart += 1;
      }
      let contiguousCanonicalTail = 0;
      for (let i = expected.length - 1; i >= 0; i -= 1) {
        if (!canonicalEligibleIds.has(expected[i].jobId)) break;
        contiguousCanonicalTail += 1;
      }

      console.log('FANDEX_POSTGRES_OFFICIAL_PROTOCOL_START=' + epoch.protocolStart);
      console.log('FANDEX_POSTGRES_OFFICIAL_THROUGH=' + latest.throughSlotStart);
      console.log('FANDEX_POSTGRES_OFFICIAL_EXPECTED=' + expected.length);
      console.log('FANDEX_POSTGRES_JOB_ROWS_FOUND=' + foundIds.size);
      console.log('FANDEX_POSTGRES_JOB_ROWS_MISSING=' + missingRow.length);
      console.log('FANDEX_POSTGRES_FIRST_MISSING_ROW_SLOT=' + (missingRow[0]?.slotStart ?? 'none'));
      console.log('FANDEX_POSTGRES_SUCCEEDED_EXPECTED_JOBS=' + succeededIds.size);
      console.log('FANDEX_POSTGRES_NON_SUCCEEDED_EXPECTED_JOBS=' + nonSucceeded.length);
      console.log('FANDEX_POSTGRES_FIRST_NON_SUCCEEDED_SLOT=' + (nonSucceeded[0]?.slotStart ?? 'none'));
      console.log('FANDEX_POSTGRES_CANONICAL_ELIGIBLE=' + canonicalEligibleIds.size);
      console.log('FANDEX_POSTGRES_NON_CANONICAL=' + nonCanonical.length);
      console.log('FANDEX_POSTGRES_FIRST_NON_CANONICAL_SLOT=' + (nonCanonical[0]?.slotStart ?? 'none'));
      console.log('FANDEX_POSTGRES_CANONICAL_CONTIGUOUS_FROM_START=' + contiguousCanonicalFromStart);
      console.log('FANDEX_POSTGRES_CANONICAL_CONTIGUOUS_TAIL=' + contiguousCanonicalTail);
      for (const row of statusRows.rows) {
        console.log('FANDEX_POSTGRES_STATUS_' + row.status.toUpperCase() + '=' + row.count);
      }
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }

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
