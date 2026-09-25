import { writeFile } from 'node:fs/promises';
import { Client } from 'pg';

import {
  requireRuntimeDatabaseUrl,
} from '../../lib/server/persistence/contracts';
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

async function main() {
  const rawDatabaseUrl = process.env.FANDEX_RUNTIME_DATABASE_URL?.trim();
  if (!rawDatabaseUrl) {
    throw new Error('activity_exposure_runtime_database_url_missing');
  }
  let diagnosticUrl: URL | null = null;
  try {
    diagnosticUrl = new URL(rawDatabaseUrl);
  } catch {
    console.log('ACTIVITY_EXPOSURE_RUNTIME_URL_SHAPE=' + JSON.stringify({
      parseable: false,
    }));
    throw new Error('runtime_database_url_invalid');
  }
  console.log('ACTIVITY_EXPOSURE_RUNTIME_URL_SHAPE=' + JSON.stringify({
    parseable: true,
    protocolValid:
      diagnosticUrl.protocol === 'postgres:' || diagnosticUrl.protocol === 'postgresql:',
    usernameExact:
      decodeURIComponent(diagnosticUrl.username) === 'fandex_runtime',
    passwordPresent: diagnosticUrl.password.length > 0,
    databaseExact:
      decodeURIComponent(diagnosticUrl.pathname.slice(1)) === 'neondb',
    pooledHost: diagnosticUrl.hostname.toLowerCase().includes('pooler'),
    hashAbsent: diagnosticUrl.hash.length === 0,
  }));
  const databaseUrl = requireRuntimeDatabaseUrl(process.env);
  const youtubeApiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!youtubeApiKey) {
    throw new Error('activity_exposure_youtube_api_key_missing');
  }

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    query_timeout: 60_000,
    statement_timeout: 60_000,
  });

  await client.connect();

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
        (SELECT count(*)::int
           FROM fandex.activity_exposure_collection_runs
          WHERE artist_id = $1) AS runs,
        (SELECT count(*)::int
           FROM fandex.activity_exposure_provider_observations
          WHERE artist_id = $1) AS observations,
        (SELECT count(*)::int
           FROM fandex.activity_exposure_events
          WHERE artist_id = $1) AS events,
        (SELECT count(*)::int
           FROM fandex.activity_exposure_raw_payloads raw
           JOIN fandex.activity_exposure_provider_observations obs
             USING (observation_id)
          WHERE obs.artist_id = $1) AS raw_rows`,
      [artistId],
    );
    return result.rows[0] as {
      runs: number;
      observations: number;
      events: number;
      raw_rows: number;
    };
  }

  try {
    const authority = await client.query(`
      SELECT
        current_user = 'fandex_runtime' AS exact_runtime_role,
        session_user = current_user AS direct_runtime_session,
        has_schema_privilege(current_user, 'fandex', 'CREATE') AS schema_create,
        has_table_privilege(
          current_user,
          'fandex.activity_exposure_collection_runs',
          'SELECT,INSERT'
        ) AS runs_runtime,
        has_table_privilege(
          current_user,
          'fandex.activity_exposure_provider_observations',
          'SELECT,INSERT'
        ) AS observations_runtime,
        has_table_privilege(
          current_user,
          'fandex.activity_exposure_raw_payloads',
          'SELECT,INSERT,UPDATE'
        ) AS raw_runtime,
        has_table_privilege(
          current_user,
          'fandex.activity_exposure_events',
          'SELECT,INSERT'
        ) AS events_runtime
    `);
    const auth = authority.rows[0];
    const authoritySummary = {
      exactRuntimeRole: auth?.exact_runtime_role === true,
      directRuntimeSession: auth?.direct_runtime_session === true,
      schemaCreate: auth?.schema_create === true,
      runsRuntime: auth?.runs_runtime === true,
      observationsRuntime: auth?.observations_runtime === true,
      rawRuntime: auth?.raw_runtime === true,
      eventsRuntime: auth?.events_runtime === true,
    };
    console.log(
      'ACTIVITY_EXPOSURE_RUNTIME_AUTHORITY_CHECK='
        + JSON.stringify(authoritySummary),
    );
    if (
      !authoritySummary.exactRuntimeRole
      || !authoritySummary.directRuntimeSession
      || authoritySummary.schemaCreate
      || !authoritySummary.runsRuntime
      || !authoritySummary.observationsRuntime
      || !authoritySummary.rawRuntime
      || !authoritySummary.eventsRuntime
    ) {
      throw new Error('activity_exposure_runtime_authority_invalid');
    }

    const before = await counts();

    const musicBrainzStartedAt = new Date().toISOString();
    const musicBrainz =
      await createMusicBrainzActivityExposureCollector().collect({
        artistId,
        providerArtistId: musicBrainzArtistId,
      });
    const musicBrainzCompletedAt = new Date().toISOString();

    const musicBrainzPersisted =
      await persistMusicBrainzActivityExposureShadow({
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

    const youtubePersisted =
      await persistYouTubeActivityExposureShadow({
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
      || !model.model.providerCoverage.some(
        ({ provider }) => provider === 'musicbrainz',
      )
      || !model.model.providerCoverage.some(
        ({ provider }) => provider === 'youtube',
      )
      || 'fact' in model.model
      || 'score' in model.model
      || 'value' in model.model
    ) {
      throw new Error('activity_exposure_shadow_read_model_invalid');
    }

    const retainedRaw = await client.query(
      `SELECT count(*)::int AS count
         FROM fandex.activity_exposure_raw_payloads raw
         JOIN fandex.activity_exposure_provider_observations obs
           USING (observation_id)
        WHERE obs.artist_id = $1
          AND raw.raw_payload IS NOT NULL`,
      [artistId],
    );
    if (retainedRaw.rows[0]?.count !== 0) {
      throw new Error('activity_exposure_shadow_raw_payload_bytes_forbidden');
    }

    const report = Object.freeze({
      contractVersion: 'activity-exposure-neon-shadow-replay-v5',
      artistId,
      authority: Object.freeze({
        exactRuntimeRole: true,
        directRuntimeSession: true,
        schemaCreate: false,
        pooledEndpointRequiredByContract: true,
      }),
      before,
      after,
      musicBrainz: Object.freeze({
        providerReleaseGroupCount: musicBrainz.providerReleaseGroupCount,
        enumeratedReleaseGroupCount: musicBrainz.enumeratedReleaseGroupCount,
        rawObservationCount: musicBrainz.rawObservations.length,
        eventCount: musicBrainz.events.length,
        missingSourceDataCount:
          musicBrainz.missingSourceDataReleaseGroupIds.length,
        identityUnresolvedCount:
          musicBrainz.identityUnresolvedReleaseGroupIds.length,
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
      retainedRawPayloadByteRows: retainedRaw.rows[0]?.count ?? null,
    });

    await writeFile(
      'activity-exposure-neon-shadow-replay-v5.json',
      JSON.stringify(report, null, 2) + '\n',
      'utf8',
    );

    console.log('ACTIVITY_EXPOSURE_RUNTIME_AUTHORITY=PASS');
    console.log('ACTIVITY_EXPOSURE_NEON_SHADOW_REPLAY=PASS');
    console.log(JSON.stringify(report));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message =
    error instanceof Error
      ? error.message
      : 'activity_exposure_shadow_replay_failed';
  console.error(message);
  process.exitCode = 1;
});
