import { sha256Canonical } from '../../shared/canonicalDigest';
import {
  MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION,
} from '../../alternative-evidence/musicChartCanonicalIdentityBinding';
import type {
  ReportedAlbumSalesResearchReviewRequestManifest,
} from '../../alternative-evidence/reportedAlbumSalesResearchReviewRequestManifest';
import type {
  AlbumProviderAuthorizationRequestManifest,
} from './albumProviderAuthorizationRequestManifest';

export const MUSIC_ALBUM_POINT_PRODUCTION_HANDOFF_VERSION =
  'music-album-point-production-handoff-v1' as const;

export type MusicAlbumPointProductionHandoffLaneId =
  | 'research-cohort-review'
  | 'circle-provider-rights'
  | 'hanteo-provider-rights'
  | 'shared-music-identity'
  | 'direct-album-production-history'
  | 'album-normalization-methodology'
  | 'music-album-numeric-methodology'
  | 'product-activation';

export type MusicAlbumPointProductionHandoffOwner =
  | 'research-reviewer'
  | 'provider-rights-reviewer'
  | 'shared-artist-registry-owner'
  | 'direct-album-data-owner'
  | 'album-methodology-owner'
  | 'music-album-methodology-owner'
  | 'product-owner';

export type MusicAlbumPointProductionHandoffLane = Readonly<{
  laneId: MusicAlbumPointProductionHandoffLaneId;
  owner: MusicAlbumPointProductionHandoffOwner;
  state:
    | 'external-input-required'
    | 'blocked-by-external-input'
    | 'blocked-by-upstream-methodology';
  dependencyLaneIds: readonly MusicAlbumPointProductionHandoffLaneId[];
  requiredInput: string;
  exactRequestRefs: readonly string[];
  completionEvidenceRefs: readonly string[];
  completionRecorded: false;
  autoCompletionAllowed: false;
}>;

export type MusicAlbumPointProductionHandoffManifest = Readonly<{
  contractVersion:
    typeof MUSIC_ALBUM_POINT_PRODUCTION_HANDOFF_VERSION;
  handoffId: string;
  researchReviewRequestId: string;
  providerAuthorizationRequestIds: readonly string[];
  sharedMusicIdentityRequiredContractVersion:
    typeof MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION;
  lanes: readonly MusicAlbumPointProductionHandoffLane[];
  currentExternalCompletionCount: 0;
  safeInternalStateTransitionAvailable: false;
  productValue: null;
  numericProductEligible: false;
  productActivationAuthorized: false;
  productPublicationAuthorized: false;
  publicRouteActivated: false;
  mergeAuthorizationPresent: false;
  deploymentAuthorizationPresent: false;
  scheduleActivationAuthorizationPresent: false;
  reviewerOrRightsDecisionFabricated: false;
  arbitraryThresholdAllowed: false;
  arbitraryWeightAllowed: false;
  rawProviderCombinationAllowed: false;
  musicAlbumRawCombinationAllowed: false;
}>;

function assertEmptyResearchRequest(
  request: ReportedAlbumSalesResearchReviewRequestManifest,
): void {
  if (
    request.requestContainsReviewerConclusion !== false
    || request.requestContainsApproval !== false
    || request.reviewRecordsMaterialized !== false
    || request.automaticReviewerConclusionAllowed !== false
    || request.productEligible !== false
    || request.slots.some(slot =>
      slot.requestedConclusion !== null
      || slot.submittedEvidenceRefs.length !== 0
      || slot.reviewerRef !== null
      || slot.reviewedAt !== null
      || slot.submissionReady !== false)
  ) {
    throw new Error(
      'music_album_point_handoff_research_request_not_empty',
    );
  }
}

function assertEmptyProviderRequest(
  request: AlbumProviderAuthorizationRequestManifest,
): void {
  if (
    request.requestContainsAuthorizationDecision !== false
    || request.requestContainsProductionApproval !== false
    || request.authorizationRecordsMaterialized !== false
    || request.productionAuthorizationSatisfied !== false
    || request.productionAllowed !== false
    || request.publicationAuthorized !== false
    || request.commercialRightsCleared !== false
    || request.slots.some(slot =>
      slot.requestedDecision !== null
      || slot.submittedEvidenceRefs.length !== 0
      || slot.submittedConditionRefs.length !== 0
      || slot.reviewerRef !== null
      || slot.reviewedAt !== null
      || slot.submissionReady !== false)
  ) {
    throw new Error(
      `music_album_point_handoff_provider_request_not_empty:${request.providerId}`,
    );
  }
}

function lane(
  input: Omit<
    MusicAlbumPointProductionHandoffLane,
    'completionEvidenceRefs'
    | 'completionRecorded'
    | 'autoCompletionAllowed'
  >,
): MusicAlbumPointProductionHandoffLane {
  return Object.freeze({
    ...input,
    dependencyLaneIds: Object.freeze([...input.dependencyLaneIds]),
    exactRequestRefs: Object.freeze([...input.exactRequestRefs]),
    completionEvidenceRefs: Object.freeze([]),
    completionRecorded: false as const,
    autoCompletionAllowed: false as const,
  });
}

export function buildMusicAlbumPointProductionHandoffManifest(
  input: Readonly<{
    researchReviewRequest:
      ReportedAlbumSalesResearchReviewRequestManifest;
    providerAuthorizationRequests:
      readonly AlbumProviderAuthorizationRequestManifest[];
  }>,
): MusicAlbumPointProductionHandoffManifest {
  assertEmptyResearchRequest(input.researchReviewRequest);

  const providers = new Map(
    input.providerAuthorizationRequests.map(request => [
      request.providerId,
      request,
    ]),
  );
  if (
    providers.size !== input.providerAuthorizationRequests.length
    || !providers.has('circle-chart')
    || !providers.has('hanteo-chart')
    || providers.size !== 2
  ) {
    throw new Error(
      'music_album_point_handoff_provider_request_set_invalid',
    );
  }

  const circle = providers.get('circle-chart');
  const hanteo = providers.get('hanteo-chart');
  if (!circle || !hanteo) {
    throw new Error(
      'music_album_point_handoff_provider_request_missing',
    );
  }
  assertEmptyProviderRequest(circle);
  assertEmptyProviderRequest(hanteo);

  const lanes = Object.freeze([
    lane({
      laneId: 'research-cohort-review',
      owner: 'research-reviewer',
      state: 'external-input-required',
      dependencyLaneIds: [],
      requiredInput:
        'Reviewer-authored conclusions and evidence refs for cohort-coverage, release-identity, source-quality, and period-consistency over the exact reported-album-sales research snapshot.',
      exactRequestRefs: [
        input.researchReviewRequest.requestId,
        input.researchReviewRequest.reviewerPacketId,
        input.researchReviewRequest.inputFingerprint,
      ],
    }),
    lane({
      laneId: 'circle-provider-rights',
      owner: 'provider-rights-reviewer',
      state: 'external-input-required',
      dependencyLaneIds: [],
      requiredInput:
        'Reviewer-authored Circle authorization evidence for the six Production-required dimensions, with conditions recorded where applicable.',
      exactRequestRefs: [
        circle.requestId,
        circle.targetFingerprint,
        ...circle.rightsReviewReferences.map(
          reference => reference.referenceId,
        ),
      ],
    }),
    lane({
      laneId: 'hanteo-provider-rights',
      owner: 'provider-rights-reviewer',
      state: 'external-input-required',
      dependencyLaneIds: [],
      requiredInput:
        'Reviewer-authored Hanteo authorization evidence for the six Production-required dimensions, with conditions recorded where applicable.',
      exactRequestRefs: [
        hanteo.requestId,
        hanteo.targetFingerprint,
        ...hanteo.rightsReviewReferences.map(
          reference => reference.referenceId,
        ),
      ],
    }),
    lane({
      laneId: 'shared-music-identity',
      owner: 'shared-artist-registry-owner',
      state: 'external-input-required',
      dependencyLaneIds: [],
      requiredInput:
        `Verified shared-registry Music identity proof conforming to ${MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION}; registry presence alone is insufficient.`,
      exactRequestRefs: [
        MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION,
      ],
    }),
    lane({
      laneId: 'direct-album-production-history',
      owner: 'direct-album-data-owner',
      state: 'blocked-by-external-input',
      dependencyLaneIds: [
        'circle-provider-rights',
        'hanteo-provider-rights',
      ],
      requiredInput:
        'Revision-aware, non-synthetic Direct Album physical-unit history collected only under an explicitly Production-authorized provider path, with canonical release identity and as-of lineage preserved.',
      exactRequestRefs: [
        circle.targetFingerprint,
        hanteo.targetFingerprint,
      ],
    }),
    lane({
      laneId: 'album-normalization-methodology',
      owner: 'album-methodology-owner',
      state: 'blocked-by-external-input',
      dependencyLaneIds: [
        'research-cohort-review',
        'direct-album-production-history',
      ],
      requiredInput:
        'Reviewer-supported Album methodology design based on approved cohort/release semantics and Production-grade Direct Album history; no arbitrary threshold or raw provider blending.',
      exactRequestRefs: [
        input.researchReviewRequest.requestId,
      ],
    }),
    lane({
      laneId: 'music-album-numeric-methodology',
      owner: 'music-album-methodology-owner',
      state: 'blocked-by-upstream-methodology',
      dependencyLaneIds: [
        'shared-music-identity',
        'album-normalization-methodology',
      ],
      requiredInput:
        'Explicit numeric methodology, if any, that preserves Music rank/presence semantics separately from Album physical-sale semantics and defines justified normalization/weighting without raw addition or averaging.',
      exactRequestRefs: [],
    }),
    lane({
      laneId: 'product-activation',
      owner: 'product-owner',
      state: 'blocked-by-upstream-methodology',
      dependencyLaneIds: [
        'research-cohort-review',
        'shared-music-identity',
        'direct-album-production-history',
        'album-normalization-methodology',
        'music-album-numeric-methodology',
      ],
      requiredInput:
        'Explicit Product activation/publication authorization after all prerequisite evidence and methodology gates are satisfied.',
      exactRequestRefs: [],
    }),
  ]);

  const providerAuthorizationRequestIds = Object.freeze(
    [circle.requestId, hanteo.requestId].sort(),
  );

  const handoffId = sha256Canonical({
    contractVersion:
      MUSIC_ALBUM_POINT_PRODUCTION_HANDOFF_VERSION,
    researchReviewRequestId:
      input.researchReviewRequest.requestId,
    providerAuthorizationRequestIds,
    sharedMusicIdentityRequiredContractVersion:
      MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION,
    lanes: lanes.map(item => ({
      laneId: item.laneId,
      owner: item.owner,
      state: item.state,
      dependencyLaneIds: item.dependencyLaneIds,
      requiredInput: item.requiredInput,
      exactRequestRefs: item.exactRequestRefs,
    })),
  });

  return Object.freeze({
    contractVersion:
      MUSIC_ALBUM_POINT_PRODUCTION_HANDOFF_VERSION,
    handoffId,
    researchReviewRequestId:
      input.researchReviewRequest.requestId,
    providerAuthorizationRequestIds,
    sharedMusicIdentityRequiredContractVersion:
      MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION,
    lanes,
    currentExternalCompletionCount: 0 as const,
    safeInternalStateTransitionAvailable: false as const,
    productValue: null,
    numericProductEligible: false as const,
    productActivationAuthorized: false as const,
    productPublicationAuthorized: false as const,
    publicRouteActivated: false as const,
    mergeAuthorizationPresent: false as const,
    deploymentAuthorizationPresent: false as const,
    scheduleActivationAuthorizationPresent: false as const,
    reviewerOrRightsDecisionFabricated: false as const,
    arbitraryThresholdAllowed: false as const,
    arbitraryWeightAllowed: false as const,
    rawProviderCombinationAllowed: false as const,
    musicAlbumRawCombinationAllowed: false as const,
  });
}
