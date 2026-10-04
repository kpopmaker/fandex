import {
  evaluateSnsFandomYoutubeQuotaWorksheet,
  type SnsFandomYoutubeQuotaEndpoint,
  type SnsFandomYoutubeQuotaWorksheetResult,
} from './snsFandomPointYoutubeQuotaWorksheet';
import {
  type SnsFandomYoutubeQuotaOwnerHandoffResult,
} from './snsFandomPointYoutubeQuotaOwnerHandoff';
import {
  type SnsFandomYoutubeAuditArtistBindingManifestResult,
} from './snsFandomPointYoutubeAuditArtistBindingManifest';

export const SNS_FANDOM_YOUTUBE_QUOTA_CLOSEOUT_VERSION =
  'sns-fandom-youtube-quota-closeout-v1' as const;

type ReactionEndpoint =
  | 'youtube.channels.list'
  | 'youtube.playlistItems.list'
  | 'youtube.videos.list';

export type SnsFandomYoutubeQuotaCloseoutInput = Readonly<{
  providerClientRef: string;
  quotaOwnerHandoff: SnsFandomYoutubeQuotaOwnerHandoffResult;
  artistBindingManifest:
    SnsFandomYoutubeAuditArtistBindingManifestResult | null;
  reactionQuotaUnitsPerCall: Readonly<Record<ReactionEndpoint, number>>;
  providerQuotaCostEvidenceRef: string;
}>;

export type SnsFandomYoutubeQuotaCloseoutEstimateCandidate = Readonly<{
  minimumProjectedQuotaUnitsPerDay: number;
  requestedQuotaUnitsPerDay: null;
  headroomFactorApplied: false;
  lineItems: SnsFandomYoutubeQuotaWorksheetResult['lineItems'];
}>;

export type SnsFandomYoutubeQuotaCloseoutResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_YOUTUBE_QUOTA_CLOSEOUT_VERSION;
  state:
    | 'awaiting-completed-window'
    | 'quota-closeout-blocked'
    | 'quota-worksheet-ready-awaiting-estimate-materialization';
  quotaWorksheet: SnsFandomYoutubeQuotaWorksheetResult | null;
  estimateCandidate: SnsFandomYoutubeQuotaCloseoutEstimateCandidate | null;
  quotaEstimateRef: null;
  quotaEstimateMaterializationAllowed: boolean;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  schedulerMutationAllowed: false;
  productActivationAuthorized: false;
  blockers: readonly string[];
}>;

const REQUESTED_ENDPOINTS = Object.freeze([
  'youtube.channels.list',
  'youtube.playlistItems.list',
  'youtube.videos.list',
] as const);

function blocked(
  state: SnsFandomYoutubeQuotaCloseoutResult['state'],
  blockers: readonly string[],
): SnsFandomYoutubeQuotaCloseoutResult {
  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_QUOTA_CLOSEOUT_VERSION,
    state,
    quotaWorksheet: null,
    estimateCandidate: null,
    quotaEstimateRef: null,
    quotaEstimateMaterializationAllowed: false,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    schedulerMutationAllowed: false,
    productActivationAuthorized: false,
    blockers: Object.freeze([...blockers]),
  });
}

export function evaluateSnsFandomYoutubeQuotaCloseout(
  input: SnsFandomYoutubeQuotaCloseoutInput,
): SnsFandomYoutubeQuotaCloseoutResult {
  const owner = input.quotaOwnerHandoff;

  if (owner.state !== 'quota-worksheet-input-ready') {
    return blocked(
      'awaiting-completed-window',
      ['youtube-quota-closeout-owner-handoff-not-ready'],
    );
  }

  if (
    owner.measurementWindowComplete !== true
    || owner.observedThrough === null
    || owner.measurementWindowEnd === null
    || Date.parse(owner.observedThrough) < Date.parse(owner.measurementWindowEnd)
    || owner.measurementWindowCompletionEvidenceRef === null
  ) {
    return blocked(
      'quota-closeout-blocked',
      ['youtube-quota-closeout-window-completion-invalid'],
    );
  }

  if (
    input.artistBindingManifest === null
    || input.artistBindingManifest.state !== 'binding-manifest-ready'
    || !input.artistBindingManifest.submissionEvidenceEligible
    || input.artistBindingManifest.blockers.length > 0
  ) {
    return blocked(
      'quota-closeout-blocked',
      ['youtube-quota-closeout-artist-binding-manifest-not-ready'],
    );
  }

  const required = [
    owner.measuredAt,
    owner.cadenceEvidenceRef,
    owner.measuredUsageEvidenceRef,
    owner.requestBatchingEvidenceRef,
    owner.requestBatchingStrategy,
  ];
  if (
    required.some((value) => value === null)
    || owner.reactionSnapshotRunsPerDay === null
    || owner.uploadManifestPageCountPerReactionRun === null
    || owner.videoCountPerReactionRun === null
    || owner.channelIdsPerCall === null
    || owner.videoIdsPerCall === null
  ) {
    return blocked(
      'quota-closeout-blocked',
      ['youtube-quota-closeout-owner-fields-unavailable'],
    );
  }

  const quotaUnitsPerCall = {
    'youtube.channels.list':
      input.reactionQuotaUnitsPerCall['youtube.channels.list'],
    'youtube.playlistItems.list':
      input.reactionQuotaUnitsPerCall['youtube.playlistItems.list'],
    'youtube.videos.list':
      input.reactionQuotaUnitsPerCall['youtube.videos.list'],
  } as Readonly<Record<SnsFandomYoutubeQuotaEndpoint, number>>;

  const worksheet = evaluateSnsFandomYoutubeQuotaWorksheet({
    providerClientRef: input.providerClientRef,
    measuredAt: owner.measuredAt as string,
    requestedEndpoints: REQUESTED_ENDPOINTS,
    artistBindingManifest: input.artistBindingManifest,
    measuredUsage: {
      artistChannelCount:
        input.artistBindingManifest.auditScopeMemberCount,
      uploadManifestPageCountPerReactionRun:
        owner.uploadManifestPageCountPerReactionRun as number,
      videoCountPerReactionRun:
        owner.videoCountPerReactionRun as number,
      commentThreadPageCountPerPersistenceRun: 0,
      commentPageCountPerPersistenceRun: 0,
      reactionSnapshotRunsPerDay:
        owner.reactionSnapshotRunsPerDay as number,
      commentPersistenceRunsPerDay: 0,
    },
    requestBatching: {
      strategy: owner.requestBatchingStrategy as NonNullable<
        SnsFandomYoutubeQuotaOwnerHandoffResult['requestBatchingStrategy']
      >,
      channelIdsPerCall: owner.channelIdsPerCall as number,
      videoIdsPerCall: owner.videoIdsPerCall as number,
    },
    providerLimits: {
      maxChannelIdsPerCall: owner.maxChannelIdsPerCall,
      maxVideoIdsPerCall: owner.maxVideoIdsPerCall,
    },
    quotaUnitsPerCall,
    evidence: {
      measuredUsageEvidenceRef:
        owner.measuredUsageEvidenceRef as string,
      cadenceEvidenceRef: owner.cadenceEvidenceRef as string,
      requestBatchingEvidenceRef:
        owner.requestBatchingEvidenceRef as string,
      providerBatchLimitEvidenceRef:
        owner.providerBatchLimitEvidenceRef,
      providerQuotaCostEvidenceRef:
        input.providerQuotaCostEvidenceRef,
    },
  });

  if (
    worksheet.state !== 'quota-evidence-ready'
    || !worksheet.submissionEvidenceEligible
    || worksheet.minimumProjectedQuotaUnitsPerDay === null
    || worksheet.blockers.length > 0
  ) {
    return Object.freeze({
      ...blocked(
        'quota-closeout-blocked',
        ['youtube-quota-closeout-worksheet-not-ready'],
      ),
      quotaWorksheet: worksheet,
    });
  }

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_QUOTA_CLOSEOUT_VERSION,
    state: 'quota-worksheet-ready-awaiting-estimate-materialization',
    quotaWorksheet: worksheet,
    estimateCandidate: Object.freeze({
      minimumProjectedQuotaUnitsPerDay:
        worksheet.minimumProjectedQuotaUnitsPerDay,
      requestedQuotaUnitsPerDay: null,
      headroomFactorApplied: false,
      lineItems: worksheet.lineItems,
    }),
    quotaEstimateRef: null,
    quotaEstimateMaterializationAllowed: true,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    schedulerMutationAllowed: false,
    productActivationAuthorized: false,
    blockers: Object.freeze([]),
  });
}
