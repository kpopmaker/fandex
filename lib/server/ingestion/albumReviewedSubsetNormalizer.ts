import { sha256Canonical } from '../../shared/canonicalDigest';
import {
  CIRCLE_PROVIDER_DESCRIPTOR,
  HANTEO_PROVIDER_DESCRIPTOR,
  knownCapability,
  type DirectAlbumObservation,
  type DirectAlbumProviderDescriptor,
} from '../../alternative-evidence/directAlbumProvider';
import {
  adaptCircleRetailQualifiedResponse,
  validateCircleRetailNormalizedObservations,
} from '../../alternative-evidence/circleRetailAdapter';
import {
  buildCircleRetailDiscoveryRequestPlan,
  captureCircleRetailDiscovery,
  verifyCircleRetailCandidateEndpoint,
  verifyCircleRetailQuantitySemantic,
} from '../../alternative-evidence/circleRetailDiscovery';
import {
  adaptHanteoCurrentAlbumResponse,
  validateHanteoCurrentObservations,
} from '../../alternative-evidence/hanteoAlbumAdapter';
import { decodeHanteoAlbumResponse } from '../../alternative-evidence/hanteoAlbumDiscovery';
import {
  createCircleRetailLiveIdentityResolver,
  createHanteoLiveIdentityResolver,
  type AlbumLiveIdentityRegistry,
} from './albumLiveIdentityReconciliation';

export const ALBUM_REVIEWED_SUBSET_NORMALIZER_VERSION =
  'album-reviewed-subset-normalizer-v1' as const;

const CIRCLE_REVIEWED_SUBSET_DESCRIPTOR: DirectAlbumProviderDescriptor = Object.freeze({
  ...CIRCLE_PROVIDER_DESCRIPTOR,
  capabilities: Object.freeze({
    ...CIRCLE_PROVIDER_DESCRIPTOR.capabilities,
    supportsNativePeriodSales: knownCapability('true', [
      'circle-retail-direct-response-v1:rowSum-period-sales',
      'album-reviewed-subset-normalizer-v1:run-local-capability',
    ]),
  }),
});

const HANTEO_REVIEWED_SUBSET_DESCRIPTOR: DirectAlbumProviderDescriptor = Object.freeze({
  ...HANTEO_PROVIDER_DESCRIPTOR,
  capabilities: Object.freeze({
    ...HANTEO_PROVIDER_DESCRIPTOR.capabilities,
    supportsNativePeriodSales: knownCapability('true', [
      'hanteo-direct-response-v1:current-day-week-month-salesVolume',
      'album-reviewed-subset-normalizer-v1:run-local-capability',
    ]),
    supportsArtistIdentity: knownCapability('true', [
      'hanteo-direct-response-v1:artistIdx-provider-identity',
    ]),
  }),
});

const IDENTITY_ONLY_REASONS = new Set([
  'artist-identity-unresolved',
  'release-identity-unresolved',
  'identity-evidence-missing',
]);

export type AlbumReviewedSubsetNormalizationStatus =
  | 'accepted-reviewed-subset'
  | 'no-reviewed-observation'
  | 'rejected-provider-data';

export type AlbumReviewedSubsetNormalizationResult = Readonly<{
  contractVersion: typeof ALBUM_REVIEWED_SUBSET_NORMALIZER_VERSION;
  provider: 'circle-retail' | 'hanteo';
  status: AlbumReviewedSubsetNormalizationStatus;
  sourceRowCount: number;
  acceptedObservationCount: number;
  identityPendingRowCount: number;
  nonIdentityRejectedRowCount: number;
  observationIds: readonly string[];
  observations: readonly DirectAlbumObservation[];
  validationIssues: readonly string[];
  sourcePayloadDigest: string;
  resultDigest: string;
  persistenceAuthorized: false;
  publicationAuthorized: false;
}>;

type Rejection = Readonly<{ reasons: readonly string[] }>;

function isIdentityOnlyRejection(rejection: Rejection): boolean {
  return rejection.reasons.length > 0
    && rejection.reasons.every(reason => IDENTITY_ONLY_REASONS.has(reason));
}

function freezeResult(input: Omit<AlbumReviewedSubsetNormalizationResult, 'resultDigest'>): AlbumReviewedSubsetNormalizationResult {
  const digestShape = {
    contractVersion: input.contractVersion,
    provider: input.provider,
    status: input.status,
    sourceRowCount: input.sourceRowCount,
    acceptedObservationCount: input.acceptedObservationCount,
    identityPendingRowCount: input.identityPendingRowCount,
    nonIdentityRejectedRowCount: input.nonIdentityRejectedRowCount,
    observationIds: input.observationIds,
    validationIssues: input.validationIssues,
    sourcePayloadDigest: input.sourcePayloadDigest,
    persistenceAuthorized: input.persistenceAuthorized,
    publicationAuthorized: input.publicationAuthorized,
  };
  return Object.freeze({ ...input, resultDigest: sha256Canonical(digestShape) });
}

function finalize(input: Readonly<{
  provider: 'circle-retail' | 'hanteo';
  observations: readonly DirectAlbumObservation[];
  rejections: readonly Rejection[];
  validationIssues: readonly string[];
  sourcePayloadDigest: string;
}>): AlbumReviewedSubsetNormalizationResult {
  const identityPendingRowCount = input.rejections.filter(isIdentityOnlyRejection).length;
  const nonIdentityRejectedRowCount = input.rejections.length - identityPendingRowCount;
  const sourceRowCount = input.observations.length + input.rejections.length;
  const status: AlbumReviewedSubsetNormalizationStatus =
    nonIdentityRejectedRowCount > 0 || input.validationIssues.length > 0
      ? 'rejected-provider-data'
      : input.observations.length === 0
        ? 'no-reviewed-observation'
        : 'accepted-reviewed-subset';

  return freezeResult({
    contractVersion: ALBUM_REVIEWED_SUBSET_NORMALIZER_VERSION,
    provider: input.provider,
    status,
    sourceRowCount,
    acceptedObservationCount: input.observations.length,
    identityPendingRowCount,
    nonIdentityRejectedRowCount,
    observationIds: Object.freeze(input.observations.map(observation => observation.observationId)),
    observations: Object.freeze([...input.observations]),
    validationIssues: Object.freeze([...new Set(input.validationIssues)].sort()),
    sourcePayloadDigest: input.sourcePayloadDigest,
    persistenceAuthorized: false,
    publicationAuthorized: false,
  });
}

function compactDate(value: string): string {
  if (!/^\d{8}$/.test(value)) throw new Error('album_reviewed_subset_circle_period_invalid');
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function normalizeCircleReviewedSubsetDay(input: Readonly<{
  rawResponse: unknown;
  yyyymmdd: string;
  observedAt: string;
  collectedAt: string;
  endpointEvidenceIds: readonly string[];
  quantityEvidenceIds: readonly string[];
  registry: AlbumLiveIdentityRegistry;
}>): AlbumReviewedSubsetNormalizationResult {
  const plan = buildCircleRetailDiscoveryRequestPlan({
    timeframe: 'day',
    date: compactDate(input.yyyymmdd),
    providerPeriodKey: input.yyyymmdd,
    candidate: {
      kind: 'retail-list',
      params: Object.freeze({ termGbn: 'day', yyyymmdd: input.yyyymmdd }),
    },
  });
  const verified = verifyCircleRetailCandidateEndpoint(plan, input.endpointEvidenceIds);
  const capture = captureCircleRetailDiscovery({
    plan: verified,
    rawResponse: input.rawResponse,
    status: 200,
    contentType: 'application/json',
    observedAt: input.observedAt,
  });
  if (capture.schemaState !== 'structured-response' || capture.response.providerStatus !== 'OK') {
    throw new Error('album_reviewed_subset_circle_response_not_qualified');
  }
  const qualified = verifyCircleRetailQuantitySemantic(capture, {
    quantitySemanticState: 'verified-retail-copies',
    quantityField: 'rowSum',
    rowPath: '$.List{values}',
    evidenceIds: input.quantityEvidenceIds,
  });
  const adapted = adaptCircleRetailQualifiedResponse({
    capture: qualified,
    rawResponse: input.rawResponse,
    collectedAt: input.collectedAt,
    resolveIdentity: createCircleRetailLiveIdentityResolver(input.registry),
    syntheticFixture: false,
  });
  const validation = validateCircleRetailNormalizedObservations(
    adapted.observations,
    CIRCLE_REVIEWED_SUBSET_DESCRIPTOR,
  );
  return finalize({
    provider: 'circle-retail',
    observations: adapted.observations,
    rejections: adapted.rejections,
    validationIssues: validation.issues,
    sourcePayloadDigest: qualified.payloadDigest,
  });
}

export function normalizeHanteoReviewedSubsetCurrentDay(input: Readonly<{
  rawResponse: unknown;
  observedAt: string;
  collectedAt: string;
  quantityEvidenceId: string;
  registry: AlbumLiveIdentityRegistry;
}>): AlbumReviewedSubsetNormalizationResult {
  const decoded = decodeHanteoAlbumResponse(input.rawResponse);
  if (decoded.responseState !== 'success') {
    throw new Error('album_reviewed_subset_hanteo_response_not_qualified');
  }
  const adapted = adaptHanteoCurrentAlbumResponse({
    decoded,
    timeframe: 'day',
    observedAt: input.observedAt,
    collectedAt: input.collectedAt,
    quantityEvidenceId: input.quantityEvidenceId,
    resolveIdentity: createHanteoLiveIdentityResolver(input.registry),
    syntheticFixture: false,
  });
  const validation = validateHanteoCurrentObservations(
    adapted.observations,
    HANTEO_REVIEWED_SUBSET_DESCRIPTOR,
  );
  return finalize({
    provider: 'hanteo',
    observations: adapted.observations,
    rejections: adapted.rejections,
    validationIssues: validation.issues,
    sourcePayloadDigest: decoded.rawDigest,
  });
}

export function summarizeReviewedSubsetObservations(
  result: AlbumReviewedSubsetNormalizationResult,
): readonly Readonly<{
  observationId: string;
  providerId: string;
  providerArtistId: string | null;
  providerReleaseId: string | null;
  providerSkuId: string | null;
  fandexArtistId: string | null;
  fandexReleaseId: string | null;
  semantic: string;
  unit: string;
  providerPeriod: string | null;
  valueIsNonNegativeSafeInteger: boolean;
  syntheticFixture: boolean;
}>[] {
  return Object.freeze(result.observations.map(observation => Object.freeze({
    observationId: observation.observationId,
    providerId: observation.providerId,
    providerArtistId: observation.providerArtistId,
    providerReleaseId: observation.providerReleaseId,
    providerSkuId: observation.providerSkuId,
    fandexArtistId: observation.fandexArtistId,
    fandexReleaseId: observation.fandexReleaseId,
    semantic: observation.semantic,
    unit: observation.unit,
    providerPeriod: observation.providerPeriod,
    valueIsNonNegativeSafeInteger: Number.isSafeInteger(observation.value) && observation.value! >= 0,
    syntheticFixture: observation.syntheticFixture,
  })));
}
