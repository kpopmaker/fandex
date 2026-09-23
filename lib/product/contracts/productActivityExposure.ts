import type {
  ProductDataOrigin,
  ProductPresentation,
  ProductPublication,
} from './productState';

export const PRODUCT_ACTIVITY_EXPOSURE_CONTRACT_VERSION =
  'product-activity-exposure-v1' as const;

export type ProductActivityExposureProvider = 'musicbrainz' | 'youtube';
export type ProductActivityExposureEventFamily = 'release' | 'official_content';
export type ProductActivityExposureLifecycleState =
  | 'planned'
  | 'observed'
  | 'cancelled'
  | 'unknown';
export type ProductActivityExposurePrecision =
  | 'year'
  | 'month'
  | 'day'
  | 'timestamp';
export type ProductActivityExposureMissingState =
  | 'covered'
  | 'partial'
  | 'missing_source_data'
  | 'identity_unresolved'
  | 'provider_unavailable'
  | 'not_in_scope'
  | 'invalid';
export type ProductActivityExposureCollectionStatus =
  | 'succeeded'
  | 'bounded_partial'
  | 'provider_unavailable'
  | 'credential_blocked'
  | 'invalid';

export type ProductActivityExposureProviderArtistCredit = Readonly<{
  providerArtistId: string;
  creditedName: string;
  canonicalProviderName: string;
}>;

export type ProductActivityExposureEvent = Readonly<{
  artistId: string;
  eventId: string;
  eventFamily: ProductActivityExposureEventFamily;
  eventType: 'confirmed_release' | 'official_video_publication';
  lifecycleState: ProductActivityExposureLifecycleState;
  participationScope: 'solo' | 'collaboration';
  announcedAt: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  occurredAt: string | null;
  occurredAtPrecision: ProductActivityExposurePrecision | null;
  sourcePublishedAt: string | null;
  collectedAt: string;
  sourceProvider: ProductActivityExposureProvider;
  sourceEntityType: 'release-group' | 'video';
  sourceEntityId: string;
  canonicalFamilyId: string | null;
  providerArtistId: string;
  providerArtistCredits: readonly ProductActivityExposureProviderArtistCredit[];
  evidenceRef: string;
  identityState: string;
  missingState: ProductActivityExposureMissingState;
  evidenceState: string;
  conflictState: string;
  timeZoneState: string;
  revisionId: string;
  supersedesRevisionId: string | null;
}>;

export type ProductActivityExposureProviderCoverage = Readonly<{
  provider: ProductActivityExposureProvider;
  providerArtistId: string;
  collectionStatus: ProductActivityExposureCollectionStatus;
  coverageState: ProductActivityExposureMissingState;
  collectedAt: string | null;
}>;

export type ProductActivityExposureReadModel = Readonly<{
  contractVersion: typeof PRODUCT_ACTIVITY_EXPOSURE_CONTRACT_VERSION;
  identity: Readonly<{
    sourceArtistId: string;
    constructId: 'activityExposure';
  }>;
  construct: 'Activity Exposure Event Stream';
  events: readonly ProductActivityExposureEvent[];
  providerCoverage: readonly ProductActivityExposureProviderCoverage[];
  dataOrigin: ProductDataOrigin;
  publication: ProductPublication;
  presentation: ProductPresentation;
}>;

export type ProductActivityExposureDataIssue = Readonly<{
  code:
    | 'artist-identity-mismatch'
    | 'duplicate-event-id'
    | 'duplicate-provider-entity'
    | 'duplicate-provider-coverage'
    | 'missing-provider-coverage'
    | 'provider-identity-mismatch'
    | 'invalid-occurrence-semantics'
    | 'invalid-missing-semantics'
    | 'collaboration-credit-loss';
  eventId?: string;
  provider?: ProductActivityExposureProvider;
}>;

export type ProductActivityExposureReadModelResult =
  | Readonly<{
      status: 'ok';
      model: ProductActivityExposureReadModel;
    }>
  | Readonly<{
      status: 'data-issue';
      issues: readonly [
        ProductActivityExposureDataIssue,
        ...ProductActivityExposureDataIssue[],
      ];
    }>;
