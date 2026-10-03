import { sha256Canonical } from '../../shared/canonicalDigest';
import type {
  DirectAlbumProviderDescriptor,
} from '../../alternative-evidence/directAlbumProvider';
import type {
  ProviderEvidencePacket,
} from '../../alternative-evidence/directProviderEvidence';
import type {
  SourceAuthorizationDimensions,
  SourceAuthorizationState,
} from '../../alternative-evidence/onboarding';
import {
  buildAlbumProviderAuthorizationReviewPacket,
  REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS,
  type AlbumProductionAuthorizationDimension,
} from './albumProviderAuthorizationReview';

export const ALBUM_PROVIDER_AUTHORIZATION_REQUEST_VERSION =
  'album-provider-authorization-request-v1' as const;

export type AlbumProviderRightsReviewReference = Readonly<{
  referenceId: string;
  sourceUrl: string;
  kind:
    | 'official-restriction-notice'
    | 'official-partnership-channel';
  reviewSignal: string;
  observedOn: '2026-10-02';
  authorizationStateNotInferred: true;
}>;

export const DIRECT_ALBUM_RIGHTS_REVIEW_REFERENCES = Object.freeze({
  'circle-chart': Object.freeze([
    Object.freeze({
      referenceId: 'circle:site-footer-ai-ml-tdm-restriction',
      sourceUrl: 'https://circlechart.kr/page_chart/retail.circle',
      kind: 'official-restriction-notice' as const,
      reviewSignal:
        'Circle official site footer states that unauthorized use for AI/ML training or text and data mining (TDM) is not permitted. This signal does not by itself decide FANDEX acquisition, storage, commercial-use, or publication authorization.',
      observedOn: '2026-10-02' as const,
      authorizationStateNotInferred: true as const,
    }),
    Object.freeze({
      referenceId: 'circle:chart-partnership-request',
      sourceUrl: 'https://circlechart.kr/popup/with_partnership.circle',
      kind: 'official-partnership-channel' as const,
      reviewSignal:
        'Circle official site exposes a chart partnership application path. Reviewer should determine whether FANDEX requires or qualifies for an explicit data partnership or license.',
      observedOn: '2026-10-02' as const,
      authorizationStateNotInferred: true as const,
    }),
  ]),
  'hanteo-chart': Object.freeze([
    Object.freeze({
      referenceId: 'hanteo:sales-data-copyright-notice',
      sourceUrl: 'https://www.hanteonews.com/en/article/93728',
      kind: 'official-restriction-notice' as const,
      reviewSignal:
        'Official Hanteo News states that sales-data copyright belongs to Hanteo Global and that unauthorized use, reproduction, or redistribution without consent is prohibited. Reviewer must determine the implications for FANDEX collection, storage, commercial use, and derived publication.',
      observedOn: '2026-10-02' as const,
      authorizationStateNotInferred: true as const,
    }),
  ]),
} satisfies Readonly<Record<
  'circle-chart' | 'hanteo-chart',
  readonly AlbumProviderRightsReviewReference[]
>>);

export type AlbumProviderAuthorizationRequestSlot = Readonly<{
  dimension: keyof SourceAuthorizationDimensions;
  requiredForProduction: boolean;
  currentAuthorizationState: SourceAuthorizationState;
  requestedDecision: SourceAuthorizationState | null;
  submittedEvidenceRefs: readonly string[];
  submittedConditionRefs: readonly string[];
  reviewerRef: string | null;
  reviewedAt: string | null;
  submissionReady: false;
}>;

export type AlbumProviderAuthorizationRequestManifest = Readonly<{
  contractVersion:
    typeof ALBUM_PROVIDER_AUTHORIZATION_REQUEST_VERSION;
  requestId: string;
  providerId: string;
  providerName: string;
  targetFingerprint: string;
  technicalReadiness:
    DirectAlbumProviderDescriptor['onboarding']['technicalReadiness'];
  officialEvidenceUrls: readonly string[];
  rightsReviewReferences:
    readonly AlbumProviderRightsReviewReference[];
  currentBlockers: readonly string[];
  requiredProductionDimensions:
    readonly AlbumProductionAuthorizationDimension[];
  trackedNonRequiredDimensions:
    readonly ['rawStorageState', 'rawRedistributionState'];
  slots: readonly AlbumProviderAuthorizationRequestSlot[];
  reviewerMustSupplyDecision: true;
  reviewerMustSupplyEvidenceRefsForGrantedState: true;
  reviewerMustSupplyConditionRefsForConditionalState: true;
  reviewerMustSupplyReviewerRef: true;
  reviewerMustSupplyReviewedAt: true;
  requestContainsAuthorizationDecision: false;
  requestContainsProductionApproval: false;
  authorizationRecordsMaterialized: false;
  technicalCapabilityImpliesAuthorization: false;
  autoAuthorized: false;
  productionAuthorizationSatisfied: false;
  productionAllowed: false;
  publicationAuthorized: false;
  commercialRightsCleared: false;
}>;

const ALL_AUTHORIZATION_DIMENSIONS = Object.freeze([
  'acquisitionState',
  'automationState',
  'rawStorageState',
  'normalizedStorageState',
  'retentionState',
  'commercialUseState',
  'derivedPublicationState',
  'rawRedistributionState',
] as const satisfies readonly (keyof SourceAuthorizationDimensions)[]);

const TRACKED_NON_REQUIRED = Object.freeze([
  'rawStorageState',
  'rawRedistributionState',
] as const);

export function buildAlbumProviderAuthorizationRequestManifest(
  input: Readonly<{
    descriptor: DirectAlbumProviderDescriptor;
    providerEvidence: ProviderEvidencePacket;
  }>,
): AlbumProviderAuthorizationRequestManifest {
  if (
    input.descriptor.providerId !== input.providerEvidence.providerId
    || input.descriptor.providerName !== input.providerEvidence.providerName
  ) {
    throw new Error(
      'album_provider_authorization_request_provider_mismatch',
    );
  }

  const packet =
    buildAlbumProviderAuthorizationReviewPacket(input.descriptor);

  if (
    packet.autoAuthorized !== false
    || packet.technicalCapabilityImpliesAuthorization !== false
    || input.descriptor.onboarding.productionAllowed !== false
  ) {
    throw new Error(
      'album_provider_authorization_request_boundary_invalid',
    );
  }

  const requiredSet = new Set<
    keyof SourceAuthorizationDimensions
  >(REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS);

  const slots = Object.freeze(
    ALL_AUTHORIZATION_DIMENSIONS.map(dimension =>
      Object.freeze({
        dimension,
        requiredForProduction: requiredSet.has(dimension),
        currentAuthorizationState:
          packet.currentAuthorizationClaims[dimension],
        requestedDecision: null,
        submittedEvidenceRefs: Object.freeze([]),
        submittedConditionRefs: Object.freeze([]),
        reviewerRef: null,
        reviewedAt: null,
        submissionReady: false as const,
      }),
    ),
  );

  const officialEvidenceUrls = Object.freeze(
    [...new Set(input.providerEvidence.officialEvidenceUrls)].sort(),
  );
  const currentBlockers = Object.freeze(
    [...new Set(input.descriptor.onboarding.blockers)].sort(),
  );
  const rightsReviewReferences = Object.freeze([
    ...(DIRECT_ALBUM_RIGHTS_REVIEW_REFERENCES[
      input.descriptor.providerId as
        | 'circle-chart'
        | 'hanteo-chart'
    ] ?? []),
  ]);

  const requestId = sha256Canonical({
    contractVersion:
      ALBUM_PROVIDER_AUTHORIZATION_REQUEST_VERSION,
    providerId: packet.providerId,
    providerName: packet.providerName,
    targetFingerprint: packet.targetFingerprint,
    technicalReadiness: packet.technicalFacts.technicalReadiness,
    officialEvidenceUrls,
    rightsReviewReferences,
    currentBlockers,
    requiredProductionDimensions:
      packet.requiredProductionDimensions,
    trackedNonRequiredDimensions: TRACKED_NON_REQUIRED,
    slots: slots.map(slot => ({
      dimension: slot.dimension,
      requiredForProduction: slot.requiredForProduction,
      currentAuthorizationState:
        slot.currentAuthorizationState,
    })),
  });

  return Object.freeze({
    contractVersion:
      ALBUM_PROVIDER_AUTHORIZATION_REQUEST_VERSION,
    requestId,
    providerId: packet.providerId,
    providerName: packet.providerName,
    targetFingerprint: packet.targetFingerprint,
    technicalReadiness: packet.technicalFacts.technicalReadiness,
    officialEvidenceUrls,
    rightsReviewReferences,
    currentBlockers,
    requiredProductionDimensions:
      packet.requiredProductionDimensions,
    trackedNonRequiredDimensions: TRACKED_NON_REQUIRED,
    slots,
    reviewerMustSupplyDecision: true as const,
    reviewerMustSupplyEvidenceRefsForGrantedState: true as const,
    reviewerMustSupplyConditionRefsForConditionalState: true as const,
    reviewerMustSupplyReviewerRef: true as const,
    reviewerMustSupplyReviewedAt: true as const,
    requestContainsAuthorizationDecision: false as const,
    requestContainsProductionApproval: false as const,
    authorizationRecordsMaterialized: false as const,
    technicalCapabilityImpliesAuthorization: false as const,
    autoAuthorized: false as const,
    productionAuthorizationSatisfied: false as const,
    productionAllowed: false as const,
    publicationAuthorized: false as const,
    commercialRightsCleared: false as const,
  });
}
