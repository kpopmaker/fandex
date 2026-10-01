import {
  type SnsFandomProviderApprovalEvidence,
} from './snsFandomPointContracts';
import {
  evaluateYoutubeCollectorCompatibility,
  type YoutubeCollectorCompatibilityProfile,
} from './snsFandomPointYoutubeCollectorCompatibility';
import {
  buildYoutubeSnsFandomCandidate,
  type YoutubeSnsFandomCandidateResult,
} from './snsFandomPointYoutubeCandidate';

export const SNS_FANDOM_YOUTUBE_COLLECTOR_BRIDGE_VERSION =
  'sns-fandom-youtube-collector-bridge-v1' as const;

export type SnsFandomYoutubeCollectorExport = Readonly<{
  contractVersion: 'sns-fandom-youtube-collector-export-v1';
  canonicalArtistId: string;
  providerChannelId: string;
  providerClientRef: string;
  providerEndpoints: readonly string[];
  observedAt: string;
  collectedAt: string;
  evidenceRef: string;
  channelSubscriberCount: number | null;
  videos: readonly Readonly<{
    videoId: string;
    viewCount: number | null;
    likeCount: number | null;
    commentCount: number | null;
  }>[];
}>;

export type SnsFandomYoutubeCollectorBridgeResult =
  | Readonly<{
      contractVersion: typeof SNS_FANDOM_YOUTUBE_COLLECTOR_BRIDGE_VERSION;
      state: 'collector-incompatible' | 'input-blocked';
      candidate: null;
      blockers: readonly string[];
    }>
  | Readonly<{
      contractVersion: typeof SNS_FANDOM_YOUTUBE_COLLECTOR_BRIDGE_VERSION;
      state: 'candidate-built';
      candidate: YoutubeSnsFandomCandidateResult;
      blockers: readonly string[];
    }>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validCount(value: number | null): boolean {
  return (
    value === null
    || (Number.isSafeInteger(value) && value >= 0)
  );
}

export function buildSnsFandomYoutubeCollectorBridge(
  input: Readonly<{
    collectorProfile: YoutubeCollectorCompatibilityProfile;
    batch: SnsFandomYoutubeCollectorExport;
    providerApproval: SnsFandomProviderApprovalEvidence | null;
    evaluatedAt: string;
  }>,
): SnsFandomYoutubeCollectorBridgeResult {
  const compatibility =
    evaluateYoutubeCollectorCompatibility(input.collectorProfile);

  if (!compatibility.productionCompatible) {
    return Object.freeze({
      contractVersion: SNS_FANDOM_YOUTUBE_COLLECTOR_BRIDGE_VERSION,
      state: 'collector-incompatible' as const,
      candidate: null,
      blockers: compatibility.blockers,
    });
  }

  const { batch } = input;
  const blockers: string[] = [];

  if (
    batch.contractVersion
      !== 'sns-fandom-youtube-collector-export-v1'
  ) {
    blockers.push('youtube-collector-export-version-invalid');
  }
  if (batch.canonicalArtistId.trim().length === 0) {
    blockers.push('youtube-collector-export-canonical-artist-id-empty');
  }
  if (batch.providerChannelId.trim().length === 0) {
    blockers.push('youtube-collector-export-provider-channel-id-empty');
  }
  if (batch.providerClientRef.trim().length === 0) {
    blockers.push('youtube-collector-export-provider-client-ref-empty');
  }
  if (
    batch.providerEndpoints.length === 0
    || batch.providerEndpoints.some(
      (endpoint) => endpoint.trim().length === 0,
    )
  ) {
    blockers.push('youtube-collector-export-provider-endpoints-invalid');
  }
  for (const requiredEndpoint of [
    'youtube.channels.list',
    'youtube.videos.list',
  ]) {
    if (!batch.providerEndpoints.includes(requiredEndpoint)) {
      blockers.push('youtube-collector-export-required-endpoint-missing');
      break;
    }
  }
  if (batch.evidenceRef.trim().length === 0) {
    blockers.push('youtube-collector-export-evidence-ref-empty');
  }
  if (!validIso(batch.observedAt)) {
    blockers.push('youtube-collector-export-observed-at-invalid');
  }
  if (!validIso(batch.collectedAt)) {
    blockers.push('youtube-collector-export-collected-at-invalid');
  }
  if (
    validIso(batch.observedAt)
    && validIso(batch.collectedAt)
    && Date.parse(batch.collectedAt) < Date.parse(batch.observedAt)
  ) {
    blockers.push('youtube-collector-export-collection-precedes-observation');
  }
  if (!validCount(batch.channelSubscriberCount)) {
    blockers.push('youtube-collector-export-subscriber-count-invalid');
  }

  const videoIds = new Set<string>();
  for (const video of batch.videos) {
    if (video.videoId.trim().length === 0) {
      blockers.push('youtube-collector-export-video-id-empty');
      continue;
    }
    if (videoIds.has(video.videoId)) {
      blockers.push('youtube-collector-export-video-id-duplicate');
      continue;
    }
    videoIds.add(video.videoId);

    if (
      !validCount(video.viewCount)
      || !validCount(video.likeCount)
      || !validCount(video.commentCount)
    ) {
      blockers.push('youtube-collector-export-video-count-invalid');
    }
  }

  if (blockers.length > 0) {
    return Object.freeze({
      contractVersion: SNS_FANDOM_YOUTUBE_COLLECTOR_BRIDGE_VERSION,
      state: 'input-blocked' as const,
      candidate: null,
      blockers: Object.freeze(Array.from(new Set(blockers))),
    });
  }

  const candidate = buildYoutubeSnsFandomCandidate({
    snapshots: [
      {
        canonicalArtistId: batch.canonicalArtistId,
        youtubeChannelId: batch.providerChannelId,
        providerClientRef: batch.providerClientRef,
        observedAt: batch.observedAt,
        collectedAt: batch.collectedAt,
        videos: batch.videos,
        channelSubscriberCount: batch.channelSubscriberCount,
        evidenceRef: batch.evidenceRef,
      },
    ],
    providerApproval: input.providerApproval,
    evaluatedAt: input.evaluatedAt,
  });

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_COLLECTOR_BRIDGE_VERSION,
    state: 'candidate-built' as const,
    candidate,
    blockers: Object.freeze([]),
  });
}
