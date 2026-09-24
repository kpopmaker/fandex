import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import {
  createMusicBrainzActivityResearchCollector,
} from '../../lib/server/research/musicBrainzActivityCollector';
import {
  createYouTubeActivityResearchCollector,
} from '../../lib/server/research/youtubeActivityCollector';
import {
  buildActivityExposureLiveCoverageManifest,
  type ActivityExposureProviderCoverageResult,
} from '../../lib/research/activityExposureCoverageManifest';

const ARTIFACT_DIR = path.resolve('artifacts/research/activity-exposure-live');
const MANIFEST_PATH = path.join(ARTIFACT_DIR, 'coverage-manifest.json');
const EVIDENCE_PATH = path.join(ARTIFACT_DIR, 'retained-evidence.json');

const ARTIST_ID = 'iu';
const MUSICBRAINZ_ARTIST_ID = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const YOUTUBE_CHANNEL_ID = 'UC3SyT4_WLHzN7JmHQwKQZww';

function git(...args: string[]) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function retainedCounts(
  observations: readonly Readonly<{ rawPayloadRetentionState: string }>[],
  retentionAuthorized: boolean,
) {
  if (retentionAuthorized) {
    return {
      retainedObservationCount: observations.filter(
        (item) => item.rawPayloadRetentionState === 'retained',
      ).length,
      digestOnlyObservationCount: observations.filter(
        (item) => item.rawPayloadRetentionState === 'digest-only',
      ).length,
    };
  }

  return {
    retainedObservationCount: 0,
    digestOnlyObservationCount: observations.length,
  };
}

function unavailableProvider(
  provider: 'musicbrainz' | 'youtube',
  providerArtistId: string,
  reason: string,
): ActivityExposureProviderCoverageResult {
  return Object.freeze({
    provider,
    providerArtistId,
    coverage: Object.freeze({
      provider,
      state: 'provider_unavailable' as const,
      reason,
      coverageObservedAt: new Date().toISOString(),
      coverageScope: 'not_available' as const,
      eventTimeStart: null,
      eventTimeEnd: null,
      observationBasis: 'not_available' as const,
    }),
    inventoryExhausted: null,
    discoveredEntityCount: null,
    normalizedEventCount: 0,
    excludedEntityCount: 0,
    missingEntityCount: 0,
    invalidEntityCount: 0,
    retainedObservationCount: 0,
    digestOnlyObservationCount: 0,
    unavailableObservationCount: 1,
    authorizationState: 'review_required' as const,
    unresolvedIdentityCount: 0,
    notes: Object.freeze([reason]),
  });
}

async function collectMusicBrainz(
  retentionAuthorized: boolean,
) {
  try {
    const result = await createMusicBrainzActivityResearchCollector().collect({
      artistId: ARTIST_ID,
      providerArtistId: MUSICBRAINZ_ARTIST_ID,
    });

    const releaseGroupObservations = result.rawObservations.filter(
      (item) => item.sourceEntityType === 'release-group',
    );
    const discovered = new Set(
      releaseGroupObservations.map((item) => item.sourceEntityId),
    ).size;
    const missingReleaseGroupObservations = releaseGroupObservations.filter(
      (item) => item.normalizedEventIds.length === 0,
    );
    const missing = missingReleaseGroupObservations.length;
    const missingDiagnostics = missingReleaseGroupObservations.map((observation) => {
      const raw = observation.rawPayloadCanonical
        ? JSON.parse(observation.rawPayloadCanonical) as {
            releaseGroup?: {
              title?: string;
              'artist-credit'?: readonly {
                artist?: { id?: string };
              }[];
            };
          }
        : {};
      const releaseGroup = raw.releaseGroup;
      const artistCreditMatches = (releaseGroup?.['artist-credit'] ?? []).some(
        (credit) => credit.artist?.id === MUSICBRAINZ_ARTIST_ID,
      );
      const supportingReleases = result.rawObservations.filter(
        (item) =>
          item.sourceEntityType === 'release'
          && item.requestRef.includes(observation.sourceEntityId),
      );
      const reason = !artistCreditMatches
        ? 'artist-credit-mismatch'
        : supportingReleases.length === 0
          ? 'no-official-release-returned'
          : 'official-release-without-usable-date';

      return `missing-release-group:${observation.sourceEntityId}:${releaseGroup?.title ?? 'unknown-title'}:${reason}`;
    });
    const invalid = result.validationIssues.length;
    const retention = retainedCounts(result.rawObservations, retentionAuthorized);

    const provider: ActivityExposureProviderCoverageResult = Object.freeze({
      provider: 'musicbrainz',
      providerArtistId: MUSICBRAINZ_ARTIST_ID,
      coverage: Object.freeze({
        provider: 'musicbrainz',
        state:
          invalid > 0
            ? 'invalid'
            : missing > 0
              ? 'partial'
              : 'complete',
        reason:
          invalid > 0
            ? 'normalized event validation issues were produced'
            : missing > 0
              ? 'one or more current release groups lacked a normalized observed event'
              : 'current MusicBrainz release-group inventory exhausted with normalized observed events',
        coverageObservedAt: result.collectedAt,
        coverageScope: 'current_visible_inventory',
        eventTimeStart: null,
        eventTimeEnd: null,
        observationBasis: 'provider_inventory',
      }),
      inventoryExhausted: true,
      discoveredEntityCount: discovered,
      normalizedEventCount: result.events.length,
      excludedEntityCount: 0,
      missingEntityCount: missing,
      invalidEntityCount: invalid,
      ...retention,
      unavailableObservationCount: 0,
      authorizationState: retentionAuthorized
        ? 'resolved_for_research'
        : 'review_required',
      unresolvedIdentityCount: 0,
      notes: Object.freeze([
        'release-group browse exhausted under MusicBrainz current provider revision',
        'release groups without normalized events remain missing rather than zero activity',
        ...missingDiagnostics,
      ]),
    });

    return { provider, result };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'musicbrainz-live-collection-failed';
    return {
      provider: unavailableProvider('musicbrainz', MUSICBRAINZ_ARTIST_ID, reason),
      result: null,
    };
  }
}

async function collectYouTube(
  retentionAuthorized: boolean,
) {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return {
      provider: unavailableProvider(
        'youtube',
        YOUTUBE_CHANNEL_ID,
        'youtube-api-credential-not-configured',
      ),
      result: null,
    };
  }

  try {
    const result = await createYouTubeActivityResearchCollector({
      apiKey,
    }).collect({
      artistId: ARTIST_ID,
      providerArtistId: YOUTUBE_CHANNEL_ID,
    });

    const excluded = Math.max(
      0,
      result.returnedVideoIds.length - result.events.length,
    );
    const invalid = result.validationIssues.length;
    const missing = result.missingVideoIds.length;
    const retention = retainedCounts(result.rawObservations, retentionAuthorized);

    const provider: ActivityExposureProviderCoverageResult = Object.freeze({
      provider: 'youtube',
      providerArtistId: YOUTUBE_CHANNEL_ID,
      coverage: Object.freeze({
        provider: 'youtube',
        state:
          invalid > 0
            ? 'invalid'
            : excluded > 0
              ? 'identity_unresolved'
              : missing > 0
                ? 'partial'
                : 'complete',
        reason:
          invalid > 0
            ? 'normalized event validation issues were produced'
            : excluded > 0
              ? 'one or more returned videos did not normalize to the canonical channel'
              : missing > 0
                ? 'one or more uploads-playlist video IDs were omitted by videos.list'
                : 'current visible uploads inventory exhausted and every returned ID normalized',
        coverageObservedAt: result.collectedAt,
        coverageScope: 'current_visible_inventory',
        eventTimeStart: null,
        eventTimeEnd: null,
        observationBasis: 'provider_inventory',
      }),
      inventoryExhausted: true,
      discoveredEntityCount: result.requestedVideoIds.length,
      normalizedEventCount: result.events.length,
      excludedEntityCount: excluded,
      missingEntityCount: missing,
      invalidEntityCount: invalid,
      ...retention,
      unavailableObservationCount: 0,
      authorizationState: retentionAuthorized
        ? 'resolved_for_research'
        : 'review_required',
      unresolvedIdentityCount: excluded,
      notes: Object.freeze([
        'current visible uploads playlist exhausted',
        'playlist inventory pages retained in collector memory for traceability',
        'missing videos are explicit requested-minus-returned IDs',
      ]),
    });

    return { provider, result };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'youtube-live-collection-failed';
    return {
      provider: unavailableProvider('youtube', YOUTUBE_CHANNEL_ID, reason),
      result: null,
    };
  }
}

const retentionAuthorized =
  process.env.ACTIVITY_EXPOSURE_RAW_RETENTION_AUTHORIZED === 'true';

const sourceBranch =
  process.env.GITHUB_REF_NAME
  ?? (() => {
    try {
      return git('branch', '--show-current');
    } catch {
      return 'unknown';
    }
  })();

const sourceHeadSha =
  process.env.GITHUB_SHA
  ?? (() => {
    try {
      return git('rev-parse', 'HEAD');
    } catch {
      return 'unknown';
    }
  })();

const currentMainSha =
  process.env.CURRENT_MAIN_SHA
  ?? (() => {
    try {
      return git('rev-parse', 'origin/main');
    } catch {
      return 'unknown';
    }
  })();

const [musicBrainz, youtube] = await Promise.all([
  collectMusicBrainz(retentionAuthorized),
  collectYouTube(retentionAuthorized),
]);

const manifest = buildActivityExposureLiveCoverageManifest({
  artistId: ARTIST_ID,
  generatedAt: new Date().toISOString(),
  sourceBranch,
  sourceHeadSha,
  currentMainSha,
  providers: [musicBrainz.provider, youtube.provider],
});

await mkdir(ARTIFACT_DIR, { recursive: true });
await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

if (retentionAuthorized) {
  await writeFile(
    EVIDENCE_PATH,
    JSON.stringify({
      contract: 'activity-exposure-live-evidence-v1-research',
      artistId: ARTIST_ID,
      musicbrainz: musicBrainz.result,
      youtube: youtube.result,
    }, null, 2) + '\n',
    'utf8',
  );
}

process.stdout.write(JSON.stringify({
  manifestPath: MANIFEST_PATH,
  evidencePath: retentionAuthorized ? EVIDENCE_PATH : null,
  rawRetentionAuthorized: retentionAuthorized,
  gateDecision: manifest.gateDecision,
  gateReasons: manifest.gateReasons,
  providers: manifest.providers.map((item) => ({
    provider: item.provider,
    state: item.coverage.state,
    discoveredEntityCount: item.discoveredEntityCount,
    normalizedEventCount: item.normalizedEventCount,
    missingEntityCount: item.missingEntityCount,
    invalidEntityCount: item.invalidEntityCount,
    authorizationState: item.authorizationState,
  })),
}, null, 2) + '\n');
