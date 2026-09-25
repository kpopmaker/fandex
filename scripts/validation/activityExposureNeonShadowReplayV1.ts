import { writeFile } from 'node:fs/promises';
import { Pool } from 'pg';

import {
  createMusicBrainzActivityExposureCollector,
} from '../../lib/server/ingestion/activityExposureMusicBrainzCollector';
import {
  createYouTubeActivityExposureCollector,
} from '../../lib/server/ingestion/activityExposureYouTubeCollector';
import {
  persistMusicBrainzActivityExposureShadow,
  persistYouTubeActivityExposureShadow,
} from '../../lib/server/ingestion/activityExposurePersistenceBridge';
import {
  readActivityExposureShadowProduct,
  type ActivityExposurePersistencePool,
} from '../../lib/server/ingestion/activityExposureRepository';

const artistId = 'iu';
const musicBrainzArtistId = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const youtubeChannelId = 'UC3SyT4_WLHzN7JmHQwKQZww';

const databaseUrl = process.env.FANDEX_RUNTIME_DATABASE_URL?.trim();
const youtubeApiKey = process.env.YOUTUBE_API_KEY?.trim();

if (!databaseUrl) throw new Error('activity_exposure_runtime_database_url_missing');
if (!youtubeApiKey) throw new Error('activity_exposure_youtube_api_key_missing');

const pool = new Pool({
  connectionString: databaseUrl,
  max: 2,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
  query_timeout: 30_000,
  ssl: { rejectUnauthorized: true },
});
const persistencePool = pool as unknown as ActivityExposurePersistencePool;

async function counts() {
  const result = await pool.query(
    `SELECT
      (SELECT count(*)::int FROM fandex.activity_exposure_collection_runs WHERE artist_id = $1) AS runs,
      (SELECT count(*)::int FROM fandex.activity_exposure_provider_observations WHERE artist_id = $1) AS observations,
      (SELECT count(*)::int FROM fandex.activity_exposure_events WHERE artist_id = $1) AS events`,
    [artistId],
  );
  return result.rows[0] as { runs: number; observations: number; events: number };
}

try {
  const before = await counts();

  const musicBrainzStartedAt = new Date().toISOString();
  const musicBrainz = await createMusicBrainzActivityExposureCollector().collect({
    artistId,
    providerArtistId: musicBrainzArtistId,
  });
  const musicBrainzCompletedAt = new Date().toISOString();
  const musicBrainzPersisted = await persistMusicBrainzActivityExposureShadow({
    collection: musicBrainz,
    startedAt: musicBrainzStartedAt,
    completedAt: musicBrainzCompletedAt,
    pool: persistencePool,
  });

  const youtubeStartedAt = new Date().toISOString();
  const youtube = await createYouTubeActivityExposureCollector({
    apiKey: youtubeApiKey,
  }).collect({
    artistId,
    providerArtistId: youtubeChannelId,
  });
  const youtubeCompletedAt = new Date().toISOString();
  const youtubePersisted = await persistYouTubeActivityExposureShadow({
    collection: youtube,
    startedAt: youtubeStartedAt,
    completedAt: youtubeCompletedAt,
    pool: persistencePool,
  });

  const model = await readActivityExposureShadowProduct(
    artistId,
    persistencePool,
  );
  const after = await counts();

  if (model.status !== 'ok') {
    throw new Error('activity_exposure_shadow_read_model_data_issue');
  }
  if (
    model.model.dataOrigin !== 'observed'
    || model.model.publication !== 'shadow'
    || model.model.presentation !== 'standard'
  ) {
    throw new Error('activity_exposure_shadow_read_model_state_invalid');
  }
  if (
    model.model.providerCoverage.length !== 2
    || !model.model.providerCoverage.some(({ provider }) => provider === 'musicbrainz')
    || !model.model.providerCoverage.some(({ provider }) => provider === 'youtube')
  ) {
    throw new Error('activity_exposure_shadow_provider_coverage_invalid');
  }
  if ('fact' in model.model || 'score' in model.model || 'value' in model.model) {
    throw new Error('activity_exposure_shadow_numeric_fact_forbidden');
  }

  const report = Object.freeze({
    contractVersion: 'activity-exposure-neon-shadow-replay-v1',
    artistId,
    before,
    after,
    musicBrainz: Object.freeze({
      providerReleaseGroupCount: musicBrainz.providerReleaseGroupCount,
      enumeratedReleaseGroupCount: musicBrainz.enumeratedReleaseGroupCount,
      rawObservationCount: musicBrainz.rawObservations.length,
      eventCount: musicBrainz.events.length,
      missingSourceDataCount: musicBrainz.missingSourceDataReleaseGroupIds.length,
      identityUnresolvedCount: musicBrainz.identityUnresolvedReleaseGroupIds.length,
      collectionStatus: musicBrainz.providerCoverage.collectionStatus,
      coverageState: musicBrainz.providerCoverage.coverageState,
      persisted: musicBrainzPersisted,
    }),
    youtube: Object.freeze({
      playlistVideoCount: youtube.playlistVideoIds.length,
      resolvedVideoCount: youtube.resolvedVideoIds.length,
      unavailableVideoCount: youtube.unavailableVideoIds.length,
      channelMismatchVideoCount: youtube.channelMismatchVideoIds.length,
      rawObservationCount: youtube.rawObservations.length,
      eventCount: youtube.events.length,
      collectionStatus: youtube.providerCoverage.collectionStatus,
      coverageState: youtube.providerCoverage.coverageState,
      persisted: youtubePersisted,
    }),
    product: Object.freeze({
      status: model.status,
      publication: model.model.publication,
      dataOrigin: model.model.dataOrigin,
      presentation: model.model.presentation,
      eventCount: model.model.events.length,
      providerCoverageCount: model.model.providerCoverage.length,
      containsNumericFact: false,
    }),
  });

  await writeFile(
    'activity-exposure-neon-shadow-replay-v1.json',
    JSON.stringify(report, null, 2) + '\n',
    'utf8',
  );
  console.log('ACTIVITY_EXPOSURE_NEON_SHADOW_REPLAY=PASS');
  console.log(JSON.stringify(report));
} finally {
  await pool.end();
}
