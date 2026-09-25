import { writeFile } from 'node:fs/promises';
import { Client } from 'pg';

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

const databaseUrl = process.env.FANDEX_MIGRATION_DATABASE_URL?.trim();
const youtubeApiKey = process.env.YOUTUBE_API_KEY?.trim();

if (!databaseUrl) throw new Error('activity_exposure_migration_database_url_missing');
if (!youtubeApiKey) throw new Error('activity_exposure_youtube_api_key_missing');

async function main() {
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    ssl: { rejectUnauthorized: true },
  });
  
  await client.connect();
  
  try {
    await client.query('SET ROLE fandex_runtime');
  
    const authority = await client.query(`
      SELECT
        current_user = 'fandex_runtime' AS exact_runtime_role,
        session_user <> current_user AS role_was_downgraded,
        has_schema_privilege(current_user, 'fandex', 'CREATE') AS schema_create,
        has_table_privilege(current_user, 'fandex.activity_exposure_collection_runs', 'SELECT,INSERT') AS runs_runtime,
        has_table_privilege(current_user, 'fandex.activity_exposure_provider_observations', 'SELECT,INSERT') AS observations_runtime,
        has_table_privilege(current_user, 'fandex.activity_exposure_raw_payloads', 'SELECT,INSERT,UPDATE') AS raw_runtime,
        has_table_privilege(current_user, 'fandex.activity_exposure_events', 'SELECT,INSERT') AS events_runtime
    `);
    const auth = authority.rows[0];
    if (
      auth?.exact_runtime_role !== true
      || auth?.role_was_downgraded !== true
      || auth?.schema_create !== false
      || auth?.runs_runtime !== true
      || auth?.observations_runtime !== true
      || auth?.raw_runtime !== true
      || auth?.events_runtime !== true
    ) {
      throw new Error('activity_exposure_runtime_role_downgrade_invalid');
    }
  
    const pool: ActivityExposurePersistencePool = {
      async query<T = Record<string, unknown>>(
        sql: string,
        values?: readonly unknown[],
      ) {
        const result = await client.query(sql, values as unknown[] | undefined);
        return {
          rowCount: result.rowCount,
          rows: result.rows as T[],
        };
      },
      async connect() {
        return {
          async query<T = Record<string, unknown>>(
            sql: string,
            values?: readonly unknown[],
          ) {
            const result = await client.query(sql, values as unknown[] | undefined);
            return {
              rowCount: result.rowCount,
              rows: result.rows as T[],
            };
          },
          release() {},
        };
      },
    };
  
    async function counts() {
      const result = await client.query(
        `SELECT
          (SELECT count(*)::int FROM fandex.activity_exposure_collection_runs WHERE artist_id = $1) AS runs,
          (SELECT count(*)::int FROM fandex.activity_exposure_provider_observations WHERE artist_id = $1) AS observations,
          (SELECT count(*)::int FROM fandex.activity_exposure_events WHERE artist_id = $1) AS events`,
        [artistId],
      );
      return result.rows[0] as {
        runs: number;
        observations: number;
        events: number;
      };
    }
  
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
      pool,
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
      pool,
    });
  
    const model = await readActivityExposureShadowProduct(artistId, pool);
    const after = await counts();
  
    if (model.status !== 'ok') {
      throw new Error('activity_exposure_shadow_read_model_data_issue');
    }
    if (
      model.model.dataOrigin !== 'observed'
      || model.model.publication !== 'shadow'
      || model.model.presentation !== 'standard'
      || model.model.providerCoverage.length !== 2
      || 'fact' in model.model
      || 'score' in model.model
      || 'value' in model.model
    ) {
      throw new Error('activity_exposure_shadow_read_model_invalid');
    }
  
    const report = Object.freeze({
      contractVersion: 'activity-exposure-neon-shadow-replay-v2',
      artistId,
      authority: Object.freeze({
        exactRuntimeRole: true,
        roleWasDowngraded: true,
        schemaCreate: false,
      }),
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
      'activity-exposure-neon-shadow-replay-v2.json',
      JSON.stringify(report, null, 2) + '\n',
      'utf8',
    );
    console.log('ACTIVITY_EXPOSURE_RUNTIME_ROLE_DOWNGRADE=PASS');
    console.log('ACTIVITY_EXPOSURE_NEON_SHADOW_REPLAY=PASS');
    console.log(JSON.stringify(report));
  } finally {
    try {
      await client.query('RESET ROLE');
    } catch {
      // Connection is about to close.
    }
    await client.end();
  }
  
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'activity_exposure_shadow_replay_failed';
  console.error(message);
  process.exitCode = 1;
});
