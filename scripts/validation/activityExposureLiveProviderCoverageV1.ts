import { writeFileSync } from 'node:fs';

import {
  createMusicBrainzActivityResearchCollector,
  type MusicBrainzActivityCollection,
} from '../../lib/server/research/musicBrainzActivityCollector';
import {
  createYouTubeActivityResearchCollector,
  type YouTubeActivityCollection,
} from '../../lib/server/research/youtubeActivityCollector';

const ARTIST_ID = 'iu';
const MUSICBRAINZ_ARTIST_ID = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const YOUTUBE_CHANNEL_ID = 'UC3SyT4_WLHzN7JmHQwKQZww';

type ProviderState =
  | 'pass'
  | 'bounded_partial'
  | 'credential_blocked'
  | 'provider_unavailable'
  | 'invalid';

type MusicBrainzReport = Readonly<{
  provider: 'musicbrainz';
  state: ProviderState;
  providerArtistId: string;
  collectedAt: string | null;
  providerReleaseGroupCount: number | null;
  enumeratedReleaseGroupCount: number;
  normalizedEventCount: number;
  missingSourceDataReleaseGroups: readonly Readonly<{
    releaseGroupId: string;
    title: string;
    firstReleaseDate: string | null;
    artistCreditCount: number;
  }>[];
  artistCreditMismatchReleaseGroups: readonly Readonly<{
    releaseGroupId: string;
    title: string;
  }>[];
  collaborationEventCount: number;
  collaborationCreditPreservationViolations: readonly string[];
  officialReleaseSupportViolations: readonly string[];
  validationIssueCount: number;
  failure: string | null;
}>;

type YouTubeReport = Readonly<{
  provider: 'youtube';
  state: ProviderState;
  providerArtistId: string;
  collectedAt: string | null;
  uploadsPlaylistId: string | null;
  playlistVisibleVideoIdCount: number;
  resolvedVideoCount: number;
  normalizedEventCount: number;
  unavailableVideoIds: readonly string[];
  exactPublishedAtViolations: readonly string[];
  channelIdentityViolations: readonly string[];
  validationIssueCount: number;
  credentialSource: string | null;
  failure: string | null;
}>;

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function releaseGroupCreditsContain(
  group: MusicBrainzActivityCollection['releaseGroupPages'][number]['release-groups'][number],
  providerArtistId: string,
) {
  return (group['artist-credit'] ?? []).some(
    (credit) => credit.artist?.id === providerArtistId,
  );
}

async function runMusicBrainz(): Promise<MusicBrainzReport> {
  try {
    const collection = await createMusicBrainzActivityResearchCollector().collect({
      artistId: ARTIST_ID,
      providerArtistId: MUSICBRAINZ_ARTIST_ID,
    });

    const groups = collection.releaseGroupPages.flatMap(
      (page) => page['release-groups'],
    );
    const providerCount = collection.releaseGroupPages[0]?.['release-group-count'] ?? 0;
    const eventByGroup = new Map(
      collection.events.map((event) => [event.sourceEntityId, event]),
    );

    const artistCreditMismatchReleaseGroups = groups
      .filter((group) => !releaseGroupCreditsContain(group, MUSICBRAINZ_ARTIST_ID))
      .map((group) => ({
        releaseGroupId: group.id,
        title: group.title,
      }));

    const missingSourceDataReleaseGroups = groups
      .filter((group) => (
        releaseGroupCreditsContain(group, MUSICBRAINZ_ARTIST_ID)
        && !eventByGroup.has(group.id)
      ))
      .map((group) => ({
        releaseGroupId: group.id,
        title: group.title,
        firstReleaseDate: group['first-release-date'] ?? null,
        artistCreditCount: (group['artist-credit'] ?? []).filter(
          (credit) => credit.artist?.id,
        ).length,
      }));

    const officialReleaseSupportViolations = collection.events
      .filter((event) => (
        event.eventType !== 'confirmed_release'
        || event.supportingReleaseStatus !== 'Official'
        || !event.supportingReleaseId
        || event.missingState !== 'covered'
      ))
      .map((event) => event.eventId);

    const collaborationEvents = collection.events.filter(
      (event) => event.participationScope === 'collaboration',
    );
    const collaborationCreditPreservationViolations = collaborationEvents
      .filter((event) => (
        event.providerArtistCredits.length < 2
        || !event.providerArtistCredits.some(
          (credit) => credit.providerArtistId === MUSICBRAINZ_ARTIST_ID,
        )
      ))
      .map((event) => event.eventId);

    const completeEnumeration =
      groups.length === providerCount
      && new Set(groups.map((group) => group.id)).size === groups.length;

    const invalid =
      !completeEnumeration
      || collection.validationIssues.length > 0
      || officialReleaseSupportViolations.length > 0
      || collaborationCreditPreservationViolations.length > 0;

    const partial =
      missingSourceDataReleaseGroups.length > 0
      || artistCreditMismatchReleaseGroups.length > 0;

    return {
      provider: 'musicbrainz',
      state: invalid ? 'invalid' : partial ? 'bounded_partial' : 'pass',
      providerArtistId: MUSICBRAINZ_ARTIST_ID,
      collectedAt: collection.collectedAt,
      providerReleaseGroupCount: providerCount,
      enumeratedReleaseGroupCount: groups.length,
      normalizedEventCount: collection.events.length,
      missingSourceDataReleaseGroups,
      artistCreditMismatchReleaseGroups,
      collaborationEventCount: collaborationEvents.length,
      collaborationCreditPreservationViolations,
      officialReleaseSupportViolations,
      validationIssueCount: collection.validationIssues.length,
      failure: null,
    };
  } catch (error) {
    return {
      provider: 'musicbrainz',
      state: 'provider_unavailable',
      providerArtistId: MUSICBRAINZ_ARTIST_ID,
      collectedAt: null,
      providerReleaseGroupCount: null,
      enumeratedReleaseGroupCount: 0,
      normalizedEventCount: 0,
      missingSourceDataReleaseGroups: [],
      artistCreditMismatchReleaseGroups: [],
      collaborationEventCount: 0,
      collaborationCreditPreservationViolations: [],
      officialReleaseSupportViolations: [],
      validationIssueCount: 0,
      failure: messageOf(error),
    };
  }
}

function resolveYouTubeCredential() {
  const candidates = [
    ['YOUTUBE_API_KEY', process.env.YOUTUBE_API_KEY],
    ['YOUTUBE_DATA_API_KEY', process.env.YOUTUBE_DATA_API_KEY],
    ['GOOGLE_YOUTUBE_API_KEY', process.env.GOOGLE_YOUTUBE_API_KEY],
  ] as const;

  return candidates.find(([, value]) => value?.trim()) ?? null;
}

async function runYouTube(): Promise<YouTubeReport> {
  const credential = resolveYouTubeCredential();
  if (!credential) {
    return {
      provider: 'youtube',
      state: 'credential_blocked',
      providerArtistId: YOUTUBE_CHANNEL_ID,
      collectedAt: null,
      uploadsPlaylistId: null,
      playlistVisibleVideoIdCount: 0,
      resolvedVideoCount: 0,
      normalizedEventCount: 0,
      unavailableVideoIds: [],
      exactPublishedAtViolations: [],
      channelIdentityViolations: [],
      validationIssueCount: 0,
      credentialSource: null,
      failure: 'authorized_youtube_data_api_credential_not_available',
    };
  }

  const [credentialSource, apiKey] = credential;
  const playlistVideoIds = new Set<string>();
  const resolvedVideoIds = new Set<string>();
  const returnedVideoSnippets = new Map<
    string,
    { channelId?: string; publishedAt?: string }
  >();

  const observedFetch: typeof fetch = async (input, init) => {
    const response = await fetch(input, init);
    if (response.ok) {
      try {
        const url = new URL(
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url,
        );
        const json = await response.clone().json() as Record<string, unknown>;

        if (url.pathname.endsWith('/playlistItems')) {
          const items = Array.isArray(json.items) ? json.items : [];
          for (const item of items) {
            const videoId =
              item
              && typeof item === 'object'
              && !Array.isArray(item)
              && (item as Record<string, unknown>).contentDetails
              && typeof (item as Record<string, unknown>).contentDetails === 'object'
              && !Array.isArray((item as Record<string, unknown>).contentDetails)
                ? ((item as Record<string, unknown>).contentDetails as Record<string, unknown>).videoId
                : undefined;
            if (typeof videoId === 'string') playlistVideoIds.add(videoId);
          }
        }

        if (url.pathname.endsWith('/videos')) {
          const items = Array.isArray(json.items) ? json.items : [];
          for (const item of items) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
            const record = item as Record<string, unknown>;
            if (typeof record.id !== 'string') continue;
            resolvedVideoIds.add(record.id);
            const snippet =
              record.snippet
              && typeof record.snippet === 'object'
              && !Array.isArray(record.snippet)
                ? record.snippet as Record<string, unknown>
                : {};
            returnedVideoSnippets.set(record.id, {
              channelId:
                typeof snippet.channelId === 'string'
                  ? snippet.channelId
                  : undefined,
              publishedAt:
                typeof snippet.publishedAt === 'string'
                  ? snippet.publishedAt
                  : undefined,
            });
          }
        }
      } catch {
        // Collector owns response validation. Observation logging must not alter it.
      }
    }
    return response;
  };

  try {
    const collection: YouTubeActivityCollection =
      await createYouTubeActivityResearchCollector({
        apiKey: apiKey!,
        fetch: observedFetch,
      }).collect({
        artistId: ARTIST_ID,
        providerArtistId: YOUTUBE_CHANNEL_ID,
      });

    const unavailableVideoIds = [...playlistVideoIds].filter(
      (videoId) => !resolvedVideoIds.has(videoId),
    );

    const exactPublishedAtViolations = [...returnedVideoSnippets.entries()]
      .filter(([, snippet]) => (
        !snippet.publishedAt
        || !Number.isFinite(Date.parse(snippet.publishedAt))
      ))
      .map(([videoId]) => videoId);

    const channelIdentityViolations = [...returnedVideoSnippets.entries()]
      .filter(([, snippet]) => snippet.channelId !== YOUTUBE_CHANNEL_ID)
      .map(([videoId]) => videoId);

    const invalid =
      collection.validationIssues.length > 0
      || exactPublishedAtViolations.length > 0
      || channelIdentityViolations.length > 0;

    const partial = unavailableVideoIds.length > 0;

    return {
      provider: 'youtube',
      state: invalid ? 'invalid' : partial ? 'bounded_partial' : 'pass',
      providerArtistId: YOUTUBE_CHANNEL_ID,
      collectedAt: collection.collectedAt,
      uploadsPlaylistId: collection.uploadsPlaylistId,
      playlistVisibleVideoIdCount: playlistVideoIds.size,
      resolvedVideoCount: resolvedVideoIds.size,
      normalizedEventCount: collection.events.length,
      unavailableVideoIds,
      exactPublishedAtViolations,
      channelIdentityViolations,
      validationIssueCount: collection.validationIssues.length,
      credentialSource,
      failure: null,
    };
  } catch (error) {
    return {
      provider: 'youtube',
      state: 'provider_unavailable',
      providerArtistId: YOUTUBE_CHANNEL_ID,
      collectedAt: null,
      uploadsPlaylistId: null,
      playlistVisibleVideoIdCount: playlistVideoIds.size,
      resolvedVideoCount: resolvedVideoIds.size,
      normalizedEventCount: 0,
      unavailableVideoIds: [...playlistVideoIds].filter(
        (videoId) => !resolvedVideoIds.has(videoId),
      ),
      exactPublishedAtViolations: [],
      channelIdentityViolations: [],
      validationIssueCount: 0,
      credentialSource,
      failure: messageOf(error),
    };
  }
}

async function main() {
  const musicbrainz = await runMusicBrainz();
  const youtube = await runYouTube();

  const liveCoverageGate =
  (musicbrainz.state === 'pass' || musicbrainz.state === 'bounded_partial')
  && (youtube.state === 'pass' || youtube.state === 'bounded_partial')
    ? 'PASS_WITH_TRUTHFUL_PROVIDER_COVERAGE'
    : 'BLOCKED';

const report = {
  schemaVersion: 'activity-exposure-live-provider-coverage-v1',
  generatedAt: new Date().toISOString(),
  artistId: ARTIST_ID,
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
  musicbrainz,
  youtube,
  liveCoverageGate,
};

writeFileSync(
  'activity-exposure-live-provider-coverage-v1.json',
  JSON.stringify(report, null, 2) + '\n',
);

const md = [
  '# Activity Exposure v1 live provider coverage',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `LIVE_PROVIDER_COVERAGE_GATE = **${liveCoverageGate}**`,
  '',
  '## MusicBrainz',
  '',
  `- state: ${musicbrainz.state}`,
  `- provider release-group count: ${musicbrainz.providerReleaseGroupCount ?? 'unknown'}`,
  `- enumerated release groups: ${musicbrainz.enumeratedReleaseGroupCount}`,
  `- normalized confirmed release events: ${musicbrainz.normalizedEventCount}`,
  `- missing/partial release groups: ${musicbrainz.missingSourceDataReleaseGroups.length}`,
  `- collaboration events: ${musicbrainz.collaborationEventCount}`,
  `- collaboration credit violations: ${musicbrainz.collaborationCreditPreservationViolations.length}`,
  `- official-release support violations: ${musicbrainz.officialReleaseSupportViolations.length}`,
  `- validation issues: ${musicbrainz.validationIssueCount}`,
  `- failure: ${musicbrainz.failure ?? 'none'}`,
  '',
  '## YouTube',
  '',
  `- state: ${youtube.state}`,
  `- credential source: ${youtube.credentialSource ?? 'none'}`,
  `- uploads playlist: ${youtube.uploadsPlaylistId ?? 'unresolved'}`,
  `- visible playlist video IDs: ${youtube.playlistVisibleVideoIdCount}`,
  `- resolved videos: ${youtube.resolvedVideoCount}`,
  `- normalized official publication events: ${youtube.normalizedEventCount}`,
  `- unavailable/private/deleted-or-otherwise-unresolved IDs: ${youtube.unavailableVideoIds.length}`,
  `- exact publishedAt violations: ${youtube.exactPublishedAtViolations.length}`,
  `- channel identity violations: ${youtube.channelIdentityViolations.length}`,
  `- validation issues: ${youtube.validationIssueCount}`,
  `- failure: ${youtube.failure ?? 'none'}`,
  '',
  '## Truth constraints',
  '',
  '- Missing != 0',
  '- Missing != inactive',
  '- no numeric comebackActivityPoint',
  '- no weights / thresholds / recency decay / arbitrary active window',
  '- collaboration artist credits preserved',
  '',
].join('\n');

  writeFileSync('activity-exposure-live-provider-coverage-v1.md', md);
  console.log(md);
  console.log('COVERAGE_REPORT_JSON=' + JSON.stringify(report));
}

main().catch((error) => {
  console.error('LIVE_PROVIDER_COVERAGE_RUNNER_FAILED', messageOf(error));
  process.exitCode = 1;
});
