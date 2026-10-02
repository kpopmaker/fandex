import {
  type SnsFandomYoutubeAuditArtistBinding,
  type SnsFandomYoutubeAuditArtistBindingManifestResult,
} from './snsFandomPointYoutubeAuditArtistBindingManifest';
import {
  type SnsFandomYoutubeProviderClientIdentityResult,
} from './snsFandomPointYoutubeProviderClientIdentity';
import {
  type SnsFandomYoutubeQuotaEndpoint,
} from './snsFandomPointYoutubeQuotaWorksheet';

export const SNS_FANDOM_YOUTUBE_QUOTA_MEASUREMENT_HANDOFF_VERSION =
  'sns-fandom-youtube-quota-measurement-handoff-v1' as const;

const REACTION_ENDPOINTS = Object.freeze([
  'youtube.channels.list',
  'youtube.playlistItems.list',
  'youtube.videos.list',
] as const satisfies readonly SnsFandomYoutubeQuotaEndpoint[]);

export type SnsFandomYoutubeQuotaMeasurementHandoffInput = Readonly<{
  handoffId: string;
  preparedAt: string;
  artistBindingManifest: SnsFandomYoutubeAuditArtistBindingManifestResult | null;
  artistBindings: readonly SnsFandomYoutubeAuditArtistBinding[];
  providerClientIdentity: SnsFandomYoutubeProviderClientIdentityResult | null;
  requestedEndpoints: readonly SnsFandomYoutubeQuotaEndpoint[];
  measurementWindowStart: string;
  measurementWindowEnd: string;
  reactionSnapshotRunsPerDay: number;
  cadenceEvidenceRef: string;
  providerBatchLimitEvidenceRef: string;
  providerQuotaCostEvidenceRef: string;
}>;

export type SnsFandomYoutubeQuotaMeasurementTask = Readonly<{
  taskId: string;
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
  measurementWindowStart: string;
  measurementWindowEnd: string;
  endpointChain: readonly [
    'youtube.channels.list',
    'youtube.playlistItems.list',
    'youtube.videos.list',
  ];
  requiredOutputs: readonly [
    'uploadsPlaylistId',
    'playlistItemsPagesTraversed',
    'includedVideoCount',
  ];
}>;

export type SnsFandomYoutubeQuotaMeasurementHandoffResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_QUOTA_MEASUREMENT_HANDOFF_VERSION;
  state: 'blocked' | 'measurement-handoff-ready';
  handoffId: string;
  preparedAt: string;
  providerClientRef: string | null;
  googleCloudProjectNumber: string | null;
  artistBindingManifestId: string | null;
  artistChannelCount: number | null;
  requestedEndpoints: readonly SnsFandomYoutubeQuotaEndpoint[];
  measurementWindowStart: string | null;
  measurementWindowEnd: string | null;
  reactionSnapshotRunsPerDay: number | null;
  tasks: readonly SnsFandomYoutubeQuotaMeasurementTask[];
  unresolvedQuotaInputs: Readonly<{
    uploadManifestPageCountPerReactionRun: null;
    videoCountPerReactionRun: null;
  }>;
  commentPersistenceRunsPerDay: 0;
  commentThreadPageCountPerPersistenceRun: 0;
  commentPageCountPerPersistenceRun: 0;
  arbitraryCadenceApplied: false;
  arbitraryMeasurementWindowApplied: false;
  automaticProviderCallAllowed: false;
  collectionExecutionAuthorized: false;
  schedulerMutationAllowed: false;
  deploymentAuthorized: false;
  quotaWorksheetAssemblyAllowed: false;
  blockers: readonly string[];
}>;

function present(value: string): boolean {
  return value.trim().length > 0;
}

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function positiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function secretLike(value: string): boolean {
  if (/AIza[0-9A-Za-z_-]{10,}/.test(value)) return true;
  const normalized = value.toLowerCase();
  return [
    'password=',
    'access_token=',
    'refresh_token=',
    'client_secret=',
    'authorization: bearer ',
    'api_key=',
    'apikey=',
    'key=aiza',
  ].some((needle) => normalized.includes(needle));
}

function sameEndpointScope(
  endpoints: readonly SnsFandomYoutubeQuotaEndpoint[],
): boolean {
  const unique = Array.from(new Set(endpoints)).sort();
  const expected = [...REACTION_ENDPOINTS].sort();
  return JSON.stringify(unique) === JSON.stringify(expected)
    && unique.length === endpoints.length;
}

export function buildSnsFandomYoutubeQuotaMeasurementHandoff(
  input: SnsFandomYoutubeQuotaMeasurementHandoffInput,
): SnsFandomYoutubeQuotaMeasurementHandoffResult {
  const blockers: string[] = [];

  if (!present(input.handoffId)) {
    blockers.push('youtube-quota-measurement-handoff-id-empty');
  }
  if (!validIso(input.preparedAt)) {
    blockers.push('youtube-quota-measurement-prepared-at-invalid');
  }

  const manifest = input.artistBindingManifest;
  let manifestReady = false;
  if (manifest === null) {
    blockers.push('youtube-quota-measurement-binding-manifest-missing');
  } else {
    manifestReady =
      manifest.state === 'binding-manifest-ready'
      && manifest.submissionEvidenceEligible
      && manifest.auditScopeMemberCount > 0
      && manifest.auditScopeMemberCount
        === manifest.auditScopeCanonicalArtistIds.length
      && manifest.auditScopeMemberCount
        === manifest.auditScopeYoutubeChannelIds.length
      && manifest.blockers.length === 0;

    if (!manifestReady) {
      blockers.push('youtube-quota-measurement-binding-manifest-not-ready');
    }
  }

  if (manifestReady && manifest !== null) {
    const selectedBindings = input.artistBindings
      .filter((member) => member.includedInAuditScope)
      .map((member) => ({
        canonicalArtistId: member.canonicalArtistId,
        youtubeChannelId: member.youtubeChannelId,
      }))
      .sort((left, right) =>
        left.canonicalArtistId.localeCompare(right.canonicalArtistId)
        || left.youtubeChannelId.localeCompare(right.youtubeChannelId));

    const selectedArtistIds = selectedBindings
      .map((member) => member.canonicalArtistId)
      .sort();
    const selectedChannelIds = selectedBindings
      .map((member) => member.youtubeChannelId)
      .sort();

    if (
      selectedBindings.length !== manifest.auditScopeMemberCount
      || JSON.stringify(selectedArtistIds)
        !== JSON.stringify([...manifest.auditScopeCanonicalArtistIds].sort())
      || JSON.stringify(selectedChannelIds)
        !== JSON.stringify([...manifest.auditScopeYoutubeChannelIds].sort())
    ) {
      blockers.push('youtube-quota-measurement-binding-rows-mismatch');
    }
  }

  const client = input.providerClientIdentity;
  let clientReady = false;
  if (client === null) {
    blockers.push('youtube-quota-measurement-provider-client-identity-missing');
  } else {
    clientReady =
      client.state === 'provider-client-identity-ready'
      && client.submissionEvidenceEligible
      && client.providerId === 'youtube-data-api'
      && client.googleCloudProjectNumber !== null
      && client.credentialLocatorRef !== null
      && client.evidenceRef !== null
      && client.blockers.length === 0;

    if (!clientReady) {
      blockers.push('youtube-quota-measurement-provider-client-identity-not-ready');
    }
  }

  if (!sameEndpointScope(input.requestedEndpoints)) {
    blockers.push('youtube-quota-measurement-endpoint-scope-mismatch');
  }

  const windowStartValid = validIso(input.measurementWindowStart);
  const windowEndValid = validIso(input.measurementWindowEnd);

  if (!windowStartValid || !windowEndValid) {
    blockers.push('youtube-quota-measurement-window-invalid');
  } else if (
    Date.parse(input.measurementWindowStart)
    >= Date.parse(input.measurementWindowEnd)
  ) {
    blockers.push('youtube-quota-measurement-window-order-invalid');
  }

  if (!positiveSafeInteger(input.reactionSnapshotRunsPerDay)) {
    blockers.push('youtube-quota-measurement-reaction-cadence-invalid');
  }

  for (const [name, ref] of Object.entries({
    cadenceEvidenceRef: input.cadenceEvidenceRef,
    providerBatchLimitEvidenceRef: input.providerBatchLimitEvidenceRef,
    providerQuotaCostEvidenceRef: input.providerQuotaCostEvidenceRef,
  })) {
    if (!present(ref)) {
      blockers.push(`youtube-quota-measurement-${name}-missing`);
    } else if (secretLike(ref)) {
      blockers.push(`youtube-quota-measurement-${name}-secret-like`);
    }
  }

  const tasks: SnsFandomYoutubeQuotaMeasurementTask[] = [];

  const uniqueBlockers = Object.freeze(Array.from(new Set(blockers)).sort());
  const ready = uniqueBlockers.length === 0;

  if (ready && client !== null) {
    const selectedBindings = input.artistBindings
      .filter((member) => member.includedInAuditScope)
      .sort((left, right) =>
        left.canonicalArtistId.localeCompare(right.canonicalArtistId));

    for (const binding of selectedBindings) {
      tasks.push(Object.freeze({
        taskId:
          `${input.handoffId}:${binding.canonicalArtistId}:${binding.youtubeChannelId}`,
        canonicalArtistId: binding.canonicalArtistId,
        youtubeChannelId: binding.youtubeChannelId,
        providerClientRef: client.providerClientRef,
        measurementWindowStart: input.measurementWindowStart,
        measurementWindowEnd: input.measurementWindowEnd,
        endpointChain: REACTION_ENDPOINTS,
        requiredOutputs: Object.freeze([
          'uploadsPlaylistId',
          'playlistItemsPagesTraversed',
          'includedVideoCount',
        ] as const),
      }));
    }
  }

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_QUOTA_MEASUREMENT_HANDOFF_VERSION,
    state: ready
      ? 'measurement-handoff-ready' as const
      : 'blocked' as const,
    handoffId: input.handoffId,
    preparedAt: input.preparedAt,
    providerClientRef:
      ready && client !== null ? client.providerClientRef : null,
    googleCloudProjectNumber:
      ready && client !== null ? client.googleCloudProjectNumber : null,
    artistBindingManifestId:
      ready && manifest !== null ? manifest.manifestId : null,
    artistChannelCount:
      ready && manifest !== null ? manifest.auditScopeMemberCount : null,
    requestedEndpoints: Object.freeze([...input.requestedEndpoints]),
    measurementWindowStart: ready ? input.measurementWindowStart : null,
    measurementWindowEnd: ready ? input.measurementWindowEnd : null,
    reactionSnapshotRunsPerDay:
      ready ? input.reactionSnapshotRunsPerDay : null,
    tasks: Object.freeze(tasks),
    unresolvedQuotaInputs: Object.freeze({
      uploadManifestPageCountPerReactionRun: null,
      videoCountPerReactionRun: null,
    }),
    commentPersistenceRunsPerDay: 0 as const,
    commentThreadPageCountPerPersistenceRun: 0 as const,
    commentPageCountPerPersistenceRun: 0 as const,
    arbitraryCadenceApplied: false as const,
    arbitraryMeasurementWindowApplied: false as const,
    automaticProviderCallAllowed: false as const,
    collectionExecutionAuthorized: false as const,
    schedulerMutationAllowed: false as const,
    deploymentAuthorized: false as const,
    quotaWorksheetAssemblyAllowed: false as const,
    blockers: uniqueBlockers,
  });
}
