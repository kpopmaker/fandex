import { writeFileSync } from 'node:fs';

import {
  buildProductActivityExposureReadModel,
} from '../../lib/product/adapters/activityExposureProductReadModel';
import {
  createMusicBrainzActivityExposureCollector,
} from '../../lib/server/ingestion/activityExposureMusicBrainzCollector';
import {
  createYouTubeActivityExposureCollector,
} from '../../lib/server/ingestion/activityExposureYouTubeCollector';
import type {
  ProductActivityExposureProviderCoverage,
} from '../../lib/product/contracts/productActivityExposure';

const ARTIST_ID = 'iu';
const MUSICBRAINZ_ARTIST_ID = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const YOUTUBE_CHANNEL_ID = 'UC3SyT4_WLHzN7JmHQwKQZww';

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function resolveYouTubeCredential() {
  const candidates = [
    ['YOUTUBE_API_KEY', process.env.YOUTUBE_API_KEY],
    ['YOUTUBE_DATA_API_KEY', process.env.YOUTUBE_DATA_API_KEY],
    ['GOOGLE_YOUTUBE_API_KEY', process.env.GOOGLE_YOUTUBE_API_KEY],
  ] as const;
  return candidates.find(([, value]) => value?.trim()) ?? null;
}

async function main() {
  let musicbrainz;
  try {
    musicbrainz = await createMusicBrainzActivityExposureCollector().collect({
      artistId: ARTIST_ID,
      providerArtistId: MUSICBRAINZ_ARTIST_ID,
    });
  } catch (error) {
    const report = {
      schemaVersion: 'activity-exposure-production-live-provider-v1',
      construct: 'Activity Exposure Event Stream',
      legacyNumericOutput: 'NUMERIC_OUTPUT_NOT_JUSTIFIED',
      musicbrainz: {
        state: 'provider_unavailable',
        failure: messageOf(error),
      },
      youtube: {
        state: 'not_executed',
      },
      productReadModel: {
        status: 'not_evaluated',
      },
      liveProviderCoverageGate: 'BLOCKED',
    };
    writeFileSync(
      'activity-exposure-production-live-provider-v1.json',
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log('PRODUCTION_LIVE_REPORT_JSON=' + JSON.stringify(report));
    process.exitCode = 1;
    return;
  }

  const collaborationEvents = musicbrainz.events.filter(
    (event) => event.participationScope === 'collaboration',
  );
  const collaborationCreditViolations = collaborationEvents
    .filter(
      (event) =>
        event.providerArtistCredits.length < 2
        || !event.providerArtistCredits.some(
          (credit) => credit.providerArtistId === MUSICBRAINZ_ARTIST_ID,
        ),
    )
    .map((event) => event.eventId);

  const musicbrainzCoverageValid =
    musicbrainz.providerReleaseGroupCount
      === musicbrainz.enumeratedReleaseGroupCount
    && collaborationCreditViolations.length === 0;

  const credential = resolveYouTubeCredential();
  let youtubeEvents = [] as Awaited<
    ReturnType<ReturnType<typeof createYouTubeActivityExposureCollector>['collect']>
  >['events'];
  let youtubeCoverage: ProductActivityExposureProviderCoverage;
  let youtubeReport: Record<string, unknown>;

  if (!credential) {
    youtubeCoverage = Object.freeze({
      provider: 'youtube',
      providerArtistId: YOUTUBE_CHANNEL_ID,
      collectionStatus: 'credential_blocked',
      coverageState: 'provider_unavailable',
      collectedAt: null,
    });
    youtubeReport = {
      state: 'credential_blocked',
      credentialSource: null,
      playlistVideoCount: null,
      resolvedVideoCount: null,
      unavailableVideoCount: null,
      eventCount: null,
      failure: 'authorized_youtube_data_api_credential_not_available',
    };
  } else {
    const [credentialSource, apiKey] = credential;
    try {
      const youtube =
        await createYouTubeActivityExposureCollector({ apiKey: apiKey! }).collect({
          artistId: ARTIST_ID,
          providerArtistId: YOUTUBE_CHANNEL_ID,
        });
      youtubeEvents = youtube.events;
      youtubeCoverage = youtube.providerCoverage;
      youtubeReport = {
        state: youtube.providerCoverage.collectionStatus,
        credentialSource,
        uploadsPlaylistId: youtube.uploadsPlaylistId,
        playlistVideoCount: youtube.playlistVideoIds.length,
        resolvedVideoCount: youtube.resolvedVideoIds.length,
        unavailableVideoCount: youtube.unavailableVideoIds.length,
        channelMismatchVideoCount: youtube.channelMismatchVideoIds.length,
        eventCount: youtube.events.length,
        failure: null,
      };
    } catch (error) {
      youtubeCoverage = Object.freeze({
        provider: 'youtube',
        providerArtistId: YOUTUBE_CHANNEL_ID,
        collectionStatus: 'provider_unavailable',
        coverageState: 'provider_unavailable',
        collectedAt: null,
      });
      youtubeReport = {
        state: 'provider_unavailable',
        credentialSource,
        failure: messageOf(error),
      };
    }
  }

  const productReadModel = buildProductActivityExposureReadModel({
    artistId: ARTIST_ID,
    events: [...musicbrainz.events, ...youtubeEvents],
    providerCoverage: [musicbrainz.providerCoverage, youtubeCoverage],
    publication: 'shadow',
  });

  const youtubeCoveragePass =
    youtubeCoverage.collectionStatus === 'succeeded'
    || youtubeCoverage.collectionStatus === 'bounded_partial';

  const liveProviderCoverageGate =
    musicbrainzCoverageValid && youtubeCoveragePass
      ? 'PASS_WITH_TRUTHFUL_PROVIDER_COVERAGE'
      : 'BLOCKED';

  const report = {
    schemaVersion: 'activity-exposure-production-live-provider-v1',
    generatedAt: new Date().toISOString(),
    construct: 'Activity Exposure Event Stream',
    legacyNumericOutput: 'NUMERIC_OUTPUT_NOT_JUSTIFIED',
    invariants: {
      missingIsZero: false,
      missingIsInactive: false,
      arbitraryWeights: false,
      arbitraryThresholds: false,
      recencyDecay: false,
      arbitraryActiveWindow: false,
    },
    musicbrainz: {
      state: musicbrainz.providerCoverage.collectionStatus,
      providerReleaseGroupCount: musicbrainz.providerReleaseGroupCount,
      enumeratedReleaseGroupCount: musicbrainz.enumeratedReleaseGroupCount,
      eventCount: musicbrainz.events.length,
      missingSourceDataReleaseGroupCount:
        musicbrainz.missingSourceDataReleaseGroupIds.length,
      missingSourceDataReleaseGroupIds:
        musicbrainz.missingSourceDataReleaseGroupIds,
      identityUnresolvedReleaseGroupCount:
        musicbrainz.identityUnresolvedReleaseGroupIds.length,
      collaborationEventCount: collaborationEvents.length,
      collaborationCreditViolationCount:
        collaborationCreditViolations.length,
      collectionStatus: musicbrainz.providerCoverage.collectionStatus,
      coverageState: musicbrainz.providerCoverage.coverageState,
    },
    youtube: youtubeReport,
    productReadModel: {
      status: productReadModel.status,
      eventCount:
        productReadModel.status === 'ok'
          ? productReadModel.model.events.length
          : null,
      providerCoverage:
        productReadModel.status === 'ok'
          ? productReadModel.model.providerCoverage
          : null,
      containsNumericFact:
        productReadModel.status === 'ok'
          ? 'fact' in productReadModel.model
          : null,
    },
    liveProviderCoverageGate,
  };

  writeFileSync(
    'activity-exposure-production-live-provider-v1.json',
    JSON.stringify(report, null, 2) + '\n',
  );

  console.log(
    [
      '# Activity Exposure Production live provider validation',
      '',
      `LIVE_PROVIDER_COVERAGE_GATE = ${liveProviderCoverageGate}`,
      `MUSICBRAINZ = ${musicbrainz.providerCoverage.collectionStatus}`,
      `MUSICBRAINZ_RELEASE_GROUPS = ${musicbrainz.enumeratedReleaseGroupCount}/${musicbrainz.providerReleaseGroupCount}`,
      `MUSICBRAINZ_EVENTS = ${musicbrainz.events.length}`,
      `MUSICBRAINZ_MISSING_SOURCE_DATA = ${musicbrainz.missingSourceDataReleaseGroupIds.length}`,
      `MUSICBRAINZ_COLLABORATIONS = ${collaborationEvents.length}`,
      `MUSICBRAINZ_COLLAB_CREDIT_VIOLATIONS = ${collaborationCreditViolations.length}`,
      `YOUTUBE = ${String(youtubeReport.state)}`,
      `PRODUCT_READ_MODEL = ${productReadModel.status}`,
      `PRODUCT_NUMERIC_FACT = ${productReadModel.status === 'ok' ? ('fact' in productReadModel.model) : 'n/a'}`,
    ].join('\n'),
  );
  console.log('PRODUCTION_LIVE_REPORT_JSON=' + JSON.stringify(report));

  if (!musicbrainzCoverageValid) {
    process.exitCode = 1;
    return;
  }

  if (productReadModel.status !== 'ok') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('ACTIVITY_EXPOSURE_PRODUCTION_LIVE_RUNNER_FAILED', messageOf(error));
  process.exitCode = 1;
});
