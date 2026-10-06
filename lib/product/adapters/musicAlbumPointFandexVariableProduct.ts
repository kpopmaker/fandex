import {
  createFandexVariableProductRecord,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import {
  PRODUCT_MUSIC_ALBUM_POINT_CANDIDATE_CONTRACT_VERSION,
  type ProductMusicAlbumPointCandidateResult,
} from '../contracts/productMusicAlbumPointCandidate';
import {
  MUSIC_ALBUM_POINT_PRODUCT_READINESS_VERSION,
  type MusicAlbumPointProductReadiness,
} from '../readiness/musicAlbumPointProductReadiness';
import type {
  ReportedAlbumSalesCurrentReleaseRead,
} from '../../alternative-evidence/reportedAlbumSalesCurrentRelease';

export const MUSIC_ALBUM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION =
  'music-album-point-fandex-variable-product-adapter-v1' as const;

export type MusicAlbumPointFandexVariableProductAdapterResult =
  | Readonly<{
      status: 'ok';
      record: FandexVariableProductRecord;
    }>
  | Readonly<{
      status: 'blocked';
      reason:
        | 'upstream-candidate-not-ok'
        | 'upstream-candidate-contract-mismatch'
        | 'upstream-readiness-contract-mismatch'
        | 'upstream-readiness-target-mismatch'
        | 'upstream-production-boundary-violated';
    }>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

export function adaptMusicAlbumPointToFandexVariableProduct(input: Readonly<{
  candidate: ProductMusicAlbumPointCandidateResult;
  readiness: MusicAlbumPointProductReadiness;
  reportedWebCurrentRelease?:
    ReportedAlbumSalesCurrentReleaseRead;
}>): MusicAlbumPointFandexVariableProductAdapterResult {
  if (input.candidate.status !== 'ok') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-candidate-not-ok' as const,
    });
  }

  const model = input.candidate.model;
  if (
    model.contractVersion
      !== PRODUCT_MUSIC_ALBUM_POINT_CANDIDATE_CONTRACT_VERSION
    || model.identity.legacyVariableId !== 'musicAlbumPoint'
    || model.identity.constructId !== 'musicAlbumEvidencePair'
    || model.dataOrigin !== 'observed'
    || model.publication !== 'shadow'
    || model.presentation !== 'standard'
    || model.previewFallbackUsed !== false
    || model.productMetricReadPerformed !== false
    || model.numericProductEligible !== false
    || model.combinationBoundary.productValue !== null
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-candidate-contract-mismatch' as const,
    });
  }

  const readiness = input.readiness;
  if (
    readiness.contractVersion
      !== MUSIC_ALBUM_POINT_PRODUCT_READINESS_VERSION
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-readiness-contract-mismatch' as const,
    });
  }

  if (
    readiness.target.legacyVariableId !== 'musicAlbumPoint'
    || readiness.target.constructId !== 'musicAlbumEvidencePair'
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-readiness-target-mismatch' as const,
    });
  }

  if (
    readiness.productActivationAuthorized !== false
    || readiness.productPublicationAuthorized !== false
    || readiness.publicRouteActivated !== false
    || readiness.publication !== 'shadow'
    || readiness.productValue !== null
    || readiness.numericProductEligible !== false
    || readiness.previewFallbackAllowed !== false
    || readiness.directProductionContributionEligible !== false
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-production-boundary-violated' as const,
    });
  }

  const providerRefs = model.components.album.providers.map(
    (provider) =>
      [
        'music-album-provider',
        provider.providerId,
        provider.currentStage,
        provider.productionAuthorizationSatisfied
          ? 'production-authorized'
          : 'production-not-authorized',
      ].join(':'),
  );

  const observationRefs = model.components.album.observations.map(
    (observation) =>
      `music-album-observation:${observation.observationId}`,
  );

  const blockerRefs = readiness.blockers.map(
    (blocker) => `music-album-readiness-blocker:${blocker}`,
  );

  const reportedWebRefs: string[] = [];
  const reportedWeb = input.reportedWebCurrentRelease;
  if (reportedWeb) {
    reportedWebRefs.push(
      `music-album-reported-web-current:${reportedWeb.status}`,
    );
    if (reportedWeb.status === 'available') {
      reportedWebRefs.push(
        `music-album-reported-web-release:${reportedWeb.canonicalReleaseId}`,
        `music-album-reported-web-observation:${reportedWeb.observationId}`,
        `music-album-reported-web-evidence-digest:${reportedWeb.evidenceDigest}`,
        ...reportedWeb.evidenceRefs,
      );
    } else {
      reportedWebRefs.push(
        `music-album-reported-web-reason:${reportedWeb.reason}`,
      );
    }
  }

  const record = createFandexVariableProductRecord({
    variableId: 'musicAlbumPoint',
    canonicalArtistId: model.identity.sourceArtistId,
    lifecycleState: 'shadow',
    materialClass: 'real',
    readinessState: 'research-only',
    availability: 'unavailable',
    valueRepresentation: {
      kind: 'none',
      reason: 'not-produced',
    },
    asOf: null,
    observationTime: { kind: 'unknown' },
    collectionTime: null,
    confidence: 'insufficient',
    coverage: 'unknown',
    freshness: 'unknown',
    missingReason: null,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: orderedUnique([
      `contract:${model.contractVersion}`,
      `readiness:${readiness.contractVersion}`,
      `album-methodology:${model.components.album.methodologyVersion}`,
      `music-currentness:${model.components.music.currentness.contractVersion}`,
      `music-currentness-status:${model.components.music.currentness.status}`,
      `album-history-state:${model.components.album.historyState}`,
      ...providerRefs,
      ...observationRefs,
      ...reportedWebRefs,
      ...blockerRefs,
    ]),
    methodologyVersion: model.components.album.methodologyVersion,
    sourceVersion: model.contractVersion,
    productVersion:
      MUSIC_ALBUM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  });

  return Object.freeze({
    status: 'ok' as const,
    record,
  });
}
