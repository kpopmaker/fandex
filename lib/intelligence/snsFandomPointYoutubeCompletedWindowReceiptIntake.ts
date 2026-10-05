import {
  type SnsFandomYoutubeAuditArtistBindingManifestResult,
} from './snsFandomPointYoutubeAuditArtistBindingManifest';
import {
  type SnsFandomYoutubeQuotaOwnerHandoffInput,
} from './snsFandomPointYoutubeQuotaOwnerHandoff';

export const SNS_FANDOM_YOUTUBE_COMPLETED_WINDOW_RECEIPT_INTAKE_VERSION =
  'sns-fandom-youtube-completed-window-receipt-intake-v1' as const;

type ReactionEndpoint =
  | 'youtube.channels.list'
  | 'youtube.playlistItems.list'
  | 'youtube.videos.list';

type ReceiptArtist = Readonly<{
  canonicalArtistId: string;
  youtubeChannelId: string;
  uploadsPlaylistId: string;
  playlistItemsPagesTraversed: number;
  includedVideoCount: number;
  channelListCalls: number;
  playlistItemsListCalls: number;
  videosListCalls: number;
}>;

type CompletedReceipt = Readonly<{
  version: 'sns_fandom_youtube_bounded_measurement_receipt_v1';
  receiptState: 'completed';
  executionAuthorizationEvidenceRef: string;
  executionAuthorizationCommentId: number;
  sourceMainSha: string;
  executionRequestCommitSha: string;
  measuredAt: string;
  contractVersion: 'sns-fandom-youtube-bounded-measurement-v1';
  state: 'bounded-measurement-completed';
  providerId: 'youtube-data-api';
  artistBindingManifestId: 'sns-fandom-youtube-audit-cohort-v1';
  artistChannelCount: number;
  measurementWindowStart: string;
  measurementWindowEnd: string;
  measurementStartedAt: string;
  observedThrough: string;
  measurementWindowComplete: boolean;
  reactionSnapshotRunsPerDay: number;
  requestBatchingStrategy:
    'singleton-only-until-provider-batch-limit-evidence';
  requestedEndpoints: readonly ReactionEndpoint[];
  artists: readonly ReceiptArtist[];
  uploadManifestPageCountPerReactionRun: number;
  videoCountPerReactionRun: number;
  providerCallsObserved: Readonly<{
    channelsList: number;
    playlistItemsList: number;
    videosList: number;
    total: number;
  }>;
  quotaUnitsObserved: number;
  rawVideoIdentifiersStored: boolean;
  rawStatisticsStored: boolean;
  secretMaterialStored: boolean;
  automaticProviderCallAllowed: boolean;
  productionCollectionAuthorized: boolean;
  providerSubmissionAuthorized: boolean;
  schedulerMutationAuthorized: boolean;
}>;

export type SnsFandomYoutubeCompletedWindowReceiptIntakeInput = Readonly<{
  receipt: unknown;
  expectedSourceMainSha: string;
  canonicalPlan: Readonly<{
    measurementWindowStart: string;
    measurementWindowEnd: string;
    reactionSnapshotRunsPerDay: number;
  }>;
  artistBindingManifest: SnsFandomYoutubeAuditArtistBindingManifestResult | null;
  receiptEvidenceRef: string;
}>;

export type SnsFandomYoutubeCompletedWindowCandidate = Readonly<
  Pick<
    SnsFandomYoutubeQuotaOwnerHandoffInput,
    | 'measurementWindowComplete'
    | 'observedThrough'
    | 'measurementWindowCompletionEvidenceRef'
    | 'measuredAt'
    | 'uploadManifestPageCountPerReactionRun'
    | 'videoCountPerReactionRun'
    | 'measuredUsageEvidenceRef'
  >
>;

export type SnsFandomYoutubeCompletedWindowReceiptIntakeResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_COMPLETED_WINDOW_RECEIPT_INTAKE_VERSION;
  state: 'blocked' | 'completed-window-receipt-ready';
  candidate: SnsFandomYoutubeCompletedWindowCandidate | null;
  sourceMainSha: string | null;
  executionRequestCommitSha: string | null;
  executionAuthorizationEvidenceRef: string | null;
  receiptEvidenceRef: string | null;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  schedulerMutationAllowed: false;
  productActivationAuthorized: false;
  blockers: readonly string[];
}>;

const REQUIRED_ENDPOINTS = Object.freeze([
  'youtube.channels.list',
  'youtube.playlistItems.list',
  'youtube.videos.list',
] as const);

function object(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function string(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function sha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
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

function durableRef(value: string): boolean {
  return [
    'github-actions://',
    'github-issue://',
    'google-drive://',
    'repo://',
    'https://drive.google.com/',
    'https://docs.google.com/',
    'https://github.com/',
  ].some((prefix) => value.startsWith(prefix));
}

function blocked(
  blockers: readonly string[],
  provenance: Readonly<{
    sourceMainSha?: string | null;
    executionRequestCommitSha?: string | null;
    executionAuthorizationEvidenceRef?: string | null;
    receiptEvidenceRef?: string | null;
  }> = {},
): SnsFandomYoutubeCompletedWindowReceiptIntakeResult {
  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_COMPLETED_WINDOW_RECEIPT_INTAKE_VERSION,
    state: 'blocked' as const,
    candidate: null,
    sourceMainSha: provenance.sourceMainSha ?? null,
    executionRequestCommitSha: provenance.executionRequestCommitSha ?? null,
    executionAuthorizationEvidenceRef:
      provenance.executionAuthorizationEvidenceRef ?? null,
    receiptEvidenceRef: provenance.receiptEvidenceRef ?? null,
    providerSubmissionAuthorized: false as const,
    productionCollectionAuthorized: false as const,
    schedulerMutationAllowed: false as const,
    productActivationAuthorized: false as const,
    blockers: Object.freeze(Array.from(new Set(blockers)).sort()),
  });
}

export function evaluateSnsFandomYoutubeCompletedWindowReceiptIntake(
  input: SnsFandomYoutubeCompletedWindowReceiptIntakeInput,
): SnsFandomYoutubeCompletedWindowReceiptIntakeResult {
  const row = object(input.receipt);
  if (row === null) {
    return blocked(['youtube-completed-window-receipt-invalid']);
  }

  const blockers: string[] = [];
  const sourceMainSha = string(row.sourceMainSha);
  const executionRequestCommitSha = string(row.executionRequestCommitSha);
  const executionAuthorizationEvidenceRef =
    string(row.executionAuthorizationEvidenceRef);
  const receiptEvidenceRef = input.receiptEvidenceRef.trim();

  if (
    row.version !== 'sns_fandom_youtube_bounded_measurement_receipt_v1'
    || row.receiptState !== 'completed'
    || row.contractVersion !== 'sns-fandom-youtube-bounded-measurement-v1'
    || row.state !== 'bounded-measurement-completed'
    || row.providerId !== 'youtube-data-api'
  ) {
    blockers.push('youtube-completed-window-receipt-shape-invalid');
  }

  if (
    sourceMainSha === null
    || !sha(sourceMainSha)
    || !sha(input.expectedSourceMainSha)
    || sourceMainSha !== input.expectedSourceMainSha
  ) {
    blockers.push('youtube-completed-window-source-main-mismatch');
  }

  if (
    executionRequestCommitSha === null
    || !sha(executionRequestCommitSha)
  ) {
    blockers.push('youtube-completed-window-execution-request-sha-invalid');
  }

  const authorizationCommentId = row.executionAuthorizationCommentId;
  if (
    !positiveInteger(authorizationCommentId)
    || executionAuthorizationEvidenceRef === null
    || executionAuthorizationEvidenceRef
      !== 'github-issue://kpopmaker/fandex/issues/424#issuecomment-'
        + String(authorizationCommentId)
  ) {
    blockers.push('youtube-completed-window-authorization-provenance-invalid');
  }

  if (
    receiptEvidenceRef.length === 0
    || !durableRef(receiptEvidenceRef)
  ) {
    blockers.push('youtube-completed-window-receipt-evidence-not-durable');
  } else if (secretLike(receiptEvidenceRef)) {
    blockers.push('youtube-completed-window-receipt-evidence-secret-like');
  }

  const plan = input.canonicalPlan;
  if (
    !validIso(plan.measurementWindowStart)
    || !validIso(plan.measurementWindowEnd)
    || Date.parse(plan.measurementWindowStart)
      >= Date.parse(plan.measurementWindowEnd)
    || !positiveInteger(plan.reactionSnapshotRunsPerDay)
  ) {
    blockers.push('youtube-completed-window-canonical-plan-invalid');
  }

  const measurementWindowStart = string(row.measurementWindowStart);
  const measurementWindowEnd = string(row.measurementWindowEnd);
  const measurementStartedAt = string(row.measurementStartedAt);
  const observedThrough = string(row.observedThrough);
  const measuredAt = string(row.measuredAt);

  if (
    measurementWindowStart !== plan.measurementWindowStart
    || measurementWindowEnd !== plan.measurementWindowEnd
    || row.reactionSnapshotRunsPerDay !== plan.reactionSnapshotRunsPerDay
  ) {
    blockers.push('youtube-completed-window-plan-mismatch');
  }

  for (const [name, value] of [
    ['measurementWindowStart', measurementWindowStart],
    ['measurementWindowEnd', measurementWindowEnd],
    ['measurementStartedAt', measurementStartedAt],
    ['observedThrough', observedThrough],
    ['measuredAt', measuredAt],
  ] as const) {
    if (value === null || !validIso(value)) {
      blockers.push('youtube-completed-window-' + name + '-invalid');
    }
  }

  if (row.measurementWindowComplete !== true) {
    blockers.push('youtube-completed-window-incomplete');
  }

  if (
    observedThrough !== null
    && validIso(observedThrough)
    && validIso(plan.measurementWindowEnd)
    && Date.parse(observedThrough) < Date.parse(plan.measurementWindowEnd)
  ) {
    blockers.push('youtube-completed-window-observed-through-before-end');
  }

  if (
    measurementStartedAt !== null
    && validIso(measurementStartedAt)
    && validIso(plan.measurementWindowEnd)
    && Date.parse(measurementStartedAt) < Date.parse(plan.measurementWindowEnd)
  ) {
    blockers.push('youtube-completed-window-measurement-started-before-end');
  }

  if (
    measuredAt !== null
    && measurementStartedAt !== null
    && validIso(measuredAt)
    && validIso(measurementStartedAt)
    && Date.parse(measuredAt) < Date.parse(measurementStartedAt)
  ) {
    blockers.push('youtube-completed-window-measured-at-before-start');
  }

  if (
    row.requestBatchingStrategy
      !== 'singleton-only-until-provider-batch-limit-evidence'
    || JSON.stringify(row.requestedEndpoints)
      !== JSON.stringify(REQUIRED_ENDPOINTS)
  ) {
    blockers.push('youtube-completed-window-request-scope-mismatch');
  }

  const manifest = input.artistBindingManifest;
  if (
    manifest === null
    || manifest.state !== 'binding-manifest-ready'
    || !manifest.submissionEvidenceEligible
    || manifest.blockers.length > 0
    || manifest.manifestId !== 'sns-fandom-youtube-audit-cohort-v1'
    || manifest.auditScopeMemberCount !== 5
    || row.artistBindingManifestId !== manifest.manifestId
    || row.artistChannelCount !== manifest.auditScopeMemberCount
  ) {
    blockers.push('youtube-completed-window-binding-manifest-mismatch');
  }

  const artists = Array.isArray(row.artists) ? row.artists : null;
  let pageTotal = 0;
  let videoTotal = 0;
  let channelCalls = 0;
  let playlistCalls = 0;
  let videoCalls = 0;
  const receiptArtistIds: string[] = [];
  const receiptChannelIds: string[] = [];

  if (artists === null || artists.length !== 5) {
    blockers.push('youtube-completed-window-artists-invalid');
  } else {
    for (const rawArtist of artists) {
      const artist = object(rawArtist);
      if (artist === null) {
        blockers.push('youtube-completed-window-artist-invalid');
        continue;
      }
      const canonicalArtistId = string(artist.canonicalArtistId);
      const youtubeChannelId = string(artist.youtubeChannelId);
      const uploadsPlaylistId = string(artist.uploadsPlaylistId);
      if (
        canonicalArtistId === null
        || youtubeChannelId === null
        || uploadsPlaylistId === null
        || !positiveInteger(artist.playlistItemsPagesTraversed)
        || !nonNegativeInteger(artist.includedVideoCount)
        || artist.channelListCalls !== 1
        || !positiveInteger(artist.playlistItemsListCalls)
        || !nonNegativeInteger(artist.videosListCalls)
        || artist.playlistItemsListCalls !== artist.playlistItemsPagesTraversed
        || artist.videosListCalls !== artist.includedVideoCount
      ) {
        blockers.push('youtube-completed-window-artist-invalid');
        continue;
      }
      receiptArtistIds.push(canonicalArtistId);
      receiptChannelIds.push(youtubeChannelId);
      pageTotal += artist.playlistItemsPagesTraversed;
      videoTotal += artist.includedVideoCount;
      channelCalls += artist.channelListCalls;
      playlistCalls += artist.playlistItemsListCalls;
      videoCalls += artist.videosListCalls;
    }
  }

  if (
    manifest !== null
    && manifest.state === 'binding-manifest-ready'
    && (
      JSON.stringify([...receiptArtistIds].sort())
        !== JSON.stringify([...manifest.auditScopeCanonicalArtistIds].sort())
      || JSON.stringify([...receiptChannelIds].sort())
        !== JSON.stringify([...manifest.auditScopeYoutubeChannelIds].sort())
    )
  ) {
    blockers.push('youtube-completed-window-artist-lineage-mismatch');
  }

  if (
    !positiveInteger(row.uploadManifestPageCountPerReactionRun)
    || !nonNegativeInteger(row.videoCountPerReactionRun)
    || pageTotal !== row.uploadManifestPageCountPerReactionRun
    || videoTotal !== row.videoCountPerReactionRun
  ) {
    blockers.push('youtube-completed-window-measured-usage-mismatch');
  }

  const calls = object(row.providerCallsObserved);
  if (
    calls === null
    || !nonNegativeInteger(calls.channelsList)
    || !nonNegativeInteger(calls.playlistItemsList)
    || !nonNegativeInteger(calls.videosList)
    || !nonNegativeInteger(calls.total)
    || calls.channelsList !== channelCalls
    || calls.playlistItemsList !== playlistCalls
    || calls.videosList !== videoCalls
    || calls.total !== channelCalls + playlistCalls + videoCalls
    || row.quotaUnitsObserved !== calls.total
  ) {
    blockers.push('youtube-completed-window-provider-call-accounting-mismatch');
  }

  if (
    row.rawVideoIdentifiersStored !== false
    || row.rawStatisticsStored !== false
    || row.secretMaterialStored !== false
    || row.automaticProviderCallAllowed !== false
    || row.productionCollectionAuthorized !== false
    || row.providerSubmissionAuthorized !== false
    || row.schedulerMutationAuthorized !== false
  ) {
    blockers.push('youtube-completed-window-safety-flags-invalid');
  }

  if (blockers.length > 0) {
    return blocked(blockers, {
      sourceMainSha,
      executionRequestCommitSha,
      executionAuthorizationEvidenceRef,
      receiptEvidenceRef:
        receiptEvidenceRef.length > 0 ? receiptEvidenceRef : null,
    });
  }

  const candidate: SnsFandomYoutubeCompletedWindowCandidate = Object.freeze({
    measurementWindowComplete: true,
    observedThrough: observedThrough as string,
    measurementWindowCompletionEvidenceRef: receiptEvidenceRef,
    measuredAt: measuredAt as string,
    uploadManifestPageCountPerReactionRun:
      row.uploadManifestPageCountPerReactionRun as number,
    videoCountPerReactionRun: row.videoCountPerReactionRun as number,
    measuredUsageEvidenceRef: receiptEvidenceRef,
  });

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_COMPLETED_WINDOW_RECEIPT_INTAKE_VERSION,
    state: 'completed-window-receipt-ready' as const,
    candidate,
    sourceMainSha: sourceMainSha as string,
    executionRequestCommitSha: executionRequestCommitSha as string,
    executionAuthorizationEvidenceRef:
      executionAuthorizationEvidenceRef as string,
    receiptEvidenceRef,
    providerSubmissionAuthorized: false as const,
    productionCollectionAuthorized: false as const,
    schedulerMutationAllowed: false as const,
    productActivationAuthorized: false as const,
    blockers: Object.freeze([]),
  });
}
