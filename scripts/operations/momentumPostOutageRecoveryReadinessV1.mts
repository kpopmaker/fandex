import fs from 'node:fs/promises';
import { Pool } from 'pg';

import { parseCsvRows, requireCsvColumns } from '../../lib/lastfm-signal/csv';
import {
  evaluateFandexMomentumPostOutageRecoveryReadiness,
} from '../../lib/intelligence/fandexMomentumPostOutageRecoveryReadiness';
import { bindCanonicalArtistToNaverNews } from '../../lib/server/ingestion/naverNewsArtistBinding';
import {
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
} from '../../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import {
  assembleOfficialNaverNewsShadowFirstSeenSeries,
} from '../../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../../lib/server/ingestion/naverNewsScheduler';
import { requireRuntimeDatabaseUrl } from '../../lib/server/persistence/contracts';

const HISTORY_PATH = 'data/lastfm-cloud/lastfm_artist_interest_history_v1.csv';
const ARTIST_LABEL = '아이유';
const CANONICAL_ARTIST_ID = 'iu';

function latestLastfmComponentEndAt(historyCsv: string): string {
  const rows = parseCsvRows(historyCsv);
  requireCsvColumns(rows, [
    'snapshotDate',
    'artist',
    'collectedAt',
    'status',
  ]);

  const candidates = rows
    .filter((row) =>
      row.artist.normalize('NFC').trim() === ARTIST_LABEL
      && row.status === 'ok')
    .sort((left, right) =>
      left.snapshotDate.localeCompare(right.snapshotDate));

  const latest = candidates.at(-1);
  if (!latest) throw new Error('momentum_recovery_lastfm_snapshot_missing');
  const parsed = Date.parse(latest.collectedAt);
  if (!Number.isFinite(parsed)) {
    throw new Error('momentum_recovery_lastfm_collection_time_invalid');
  }
  return new Date(parsed).toISOString();
}

async function main() {
  const historyCsv = await fs.readFile(HISTORY_PATH, 'utf8');
  const lastfmComponentEndAt = latestLastfmComponentEndAt(historyCsv);
  const binding = bindCanonicalArtistToNaverNews(CANONICAL_ARTIST_ID);
  const selectedNaverSlot = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: lastfmComponentEndAt,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  }).slotStart;

  const pool = new Pool({
    connectionString: requireRuntimeDatabaseUrl(process.env),
    max: 1,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    ssl: { rejectUnauthorized: true },
  });

  try {
    const repository =
      createPostgresNaverNewsCanonicalJobEvidenceReadRepository(pool);
    const series = await assembleOfficialNaverNewsShadowFirstSeenSeries({
      canonicalArtistId: CANONICAL_ARTIST_ID,
      throughSlotStart: selectedNaverSlot,
    }, repository);
    const readiness =
      evaluateFandexMomentumPostOutageRecoveryReadiness({
        canonicalArtistId: CANONICAL_ARTIST_ID,
        lastfmComponentEndAt,
        naverSeries: series,
      });

    console.log('MOMENTUM_POST_OUTAGE_RECOVERY_READINESS=' + readiness.state);
    console.log(JSON.stringify(readiness));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'momentum_post_outage_recovery_readiness_failed',
  );
  process.exitCode = 1;
});
