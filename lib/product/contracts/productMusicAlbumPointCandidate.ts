import {
  validateDirectAlbumObservation,
  type DirectAlbumObservation,
  type DirectAlbumProviderDescriptor,
} from '../../alternative-evidence/directAlbumProvider';
import {
  ALBUM_METHODOLOGY_DEFINITION,
  ALBUM_METHODOLOGY_VERSION,
} from '../../alternative-evidence/albumMethodology';
import type {
  MusicChartCurrentReadModel,
} from '../../alternative-evidence/musicChartObservationHistory';
import type {
  MusicChartPlatform,
} from '../../alternative-evidence/musicChartObservation';
import type {
  MusicChartCurrentnessAssessment,
} from '../../alternative-evidence/musicChartCurrentness';
import {
  MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION,
  type MusicChartCanonicalIdentityBindingAssessment,
} from '../../alternative-evidence/musicChartCanonicalIdentityBinding';
import type {
  ProductDataOrigin,
  ProductPresentation,
  ProductPublication,
} from './productState';
import {
  evaluateMusicAlbumTemporalAlignment,
  type MusicAlbumTemporalAlignment,
} from './musicAlbumTemporalAlignment';
import {
  buildAlbumNormalizationInput,
  type AlbumNormalizationInput,
} from './albumNormalizationInput';
import {
  ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION,
  readAlbumObservationHistoryAsOf,
  type AlbumObservationHistory,
} from './albumObservationHistory';
import {
  evaluateAlbumNormalizationCalibrationGate,
  type AlbumNormalizationCalibrationGate,
} from '../readiness/albumNormalizationCalibrationGate';
import {
  buildAlbumNormalizationCalibrationReviewTarget,
  type AlbumNormalizationCalibrationEvidenceReview,
} from '../readiness/albumNormalizationCalibrationEvidenceReview';
import {
  deriveAlbumNormalizationCalibrationEvidenceCandidates,
  type AlbumNormalizationCalibrationEvidenceDerivation,
} from '../readiness/albumNormalizationCalibrationEvidenceDerivation';
import {
  buildAlbumReleaseScopeReviewPacket,
  type AlbumReleaseScopeReviewPacket,
} from '../readiness/albumReleaseScopeReviewPacket';
import {
  buildAlbumProviderAuthorizationReviewPacket,
  type AlbumProviderAuthorizationReview,
  type AlbumProviderAuthorizationReviewPacket,
} from '../readiness/albumProviderAuthorizationReview';

export const PRODUCT_MUSIC_ALBUM_POINT_CANDIDATE_CONTRACT_VERSION =
  'product-music-album-point-candidate-v1' as const;

export const PRODUCT_MUSIC_ALBUM_POINT_CONSTRUCT_ID =
  'musicAlbumEvidencePair' as const;

export const PRODUCT_MUSIC_ALBUM_POINT_LEGACY_VARIABLE_ID =
  'musicAlbumPoint' as const;

export type ProductMusicAlbumComponentState =
  | 'evidence-ready'
  | 'technical-only'
  | 'blocked';

export type ProductMusicAlbumProviderQualification = Readonly<{
  providerId: string;
  technicalReadiness: DirectAlbumProviderDescriptor['onboarding']['technicalReadiness'];
  currentStage: DirectAlbumProviderDescriptor['onboarding']['currentStage'];
  nativePeriodSalesQualified: boolean;
  historicalQueriesQualified: boolean;
  revisionsQualified: boolean;
  artistIdentityQualified: boolean;
  releaseIdentityQualified: boolean;
  editionIdentityQualified: boolean;
  skuIdentityQualified: boolean;
  productionAllowed: boolean;
  productionAuthorizationSatisfied: boolean;
  authorization: DirectAlbumProviderDescriptor['onboarding']['authorization'];
  authorizationReviewPacket: AlbumProviderAuthorizationReviewPacket;
  authorizationReview: AlbumProviderAuthorizationReview | null;
  blockers: readonly string[];
}>;

export type ProductMusicAlbumPointCandidateReadModel = Readonly<{
  contractVersion:
    typeof PRODUCT_MUSIC_ALBUM_POINT_CANDIDATE_CONTRACT_VERSION;
  identity: Readonly<{
    sourceArtistId: string;
    legacyVariableId:
      typeof PRODUCT_MUSIC_ALBUM_POINT_LEGACY_VARIABLE_ID;
    constructId:
      typeof PRODUCT_MUSIC_ALBUM_POINT_CONSTRUCT_ID;
  }>;
  construct:
    'Music current-chart presence + physical completed-purchase-class album sales';
  components: Readonly<{
    music: Readonly<{
      construct: 'current-chart-presence';
      expectedPlatforms: readonly MusicChartPlatform[];
      rows: MusicChartCurrentReadModel['rows'];
      rankSemantic: 'ordinal-chart-position';
      presenceSemantic: 'ranked-or-proven-not-ranked';
      numericAggregationDefined: false;
      freshnessThresholdDefined: false;
      canonicalIdentityIntegration:
        | 'shared-registry'
        | 'external-binding';
      canonicalIdentityBindingAssessment:
        MusicChartCanonicalIdentityBindingAssessment | null;
      currentness: MusicChartCurrentnessAssessment;
      state: ProductMusicAlbumComponentState;
      blockers: readonly string[];
    }>;
    album: Readonly<{
      construct: 'physical completed-purchase-class sales reaction';
      methodologyVersion: typeof ALBUM_METHODOLOGY_VERSION;
      normalizationMethod: 'unresolved';
      normalizationInput: AlbumNormalizationInput;
      normalizationCalibrationReview:
        AlbumNormalizationCalibrationEvidenceReview | null;
      normalizationCalibrationEvidenceDerivation:
        AlbumNormalizationCalibrationEvidenceDerivation | null;
      releaseScopeReviewPacket: AlbumReleaseScopeReviewPacket;
      normalizationCalibration: AlbumNormalizationCalibrationGate;
      observations: readonly DirectAlbumObservation[];
      providers: readonly ProductMusicAlbumProviderQualification[];
      technicallyQualifiedProviders: readonly string[];
      productionAuthorizedProviders: readonly string[];
      eligibleObservationIds: readonly string[];
      physicalUnitSemantic: 'physical-units';
      numericAggregationDefined: false;
      historyState:
        | 'production-history-available'
        | 'research-only'
        | 'absent';
      productionHistory: Readonly<{
        contractVersion:
          typeof ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION;
        entryCount: number;
        activeObservationIds: readonly string[];
        revisionAware: true;
        additiveRevisionCountingAllowed: false;
      }> | null;
      state: ProductMusicAlbumComponentState;
      blockers: readonly string[];
    }>;
  }>;
  temporalAlignment: MusicAlbumTemporalAlignment;
  combinationBoundary: Readonly<{
    rawProviderAdditionAllowed: false;
    rawProviderAverageAllowed: false;
    rankToPhysicalUnitsConversionAllowed: false;
    musicAlbumRawAdditionAllowed: false;
    musicAlbumRawAverageAllowed: false;
    weightingDefined: false;
    normalizationDefined: false;
    temporalAlignmentDefined: true;
    productValue: null;
  }>;
  readiness: Readonly<{
    componentEvidenceReady: boolean;
    productContractCandidateReady: boolean;
    albumNormalizationMethodologyDesignEligible: boolean;
    numericProductEligible: false;
    productActivationReady: false;
    productPublicationReady: false;
    previewFallbackAllowed: false;
    componentBlockers: readonly string[];
    activationBlockers: readonly string[];
  }>;
  dataOrigin: ProductDataOrigin;
  publication: ProductPublication;
  presentation: ProductPresentation;
  previewFallbackUsed: false;
  productMetricReadPerformed: false;
  numericProductEligible: false;
}>;

export type ProductMusicAlbumPointCandidateDataIssue = Readonly<{
  code:
    | 'music-artist-identity-mismatch'
    | 'music-duplicate-platform'
    | 'music-currentness-read-model-mismatch'
    | 'music-canonical-identity-proof-missing'
    | 'music-canonical-identity-proof-invalid'
    | 'album-artist-identity-mismatch'
    | 'album-release-identity-unresolved'
    | 'album-provider-not-qualified'
    | 'album-provider-validation-failed'
    | 'album-normalization-calibration-review-invalid'
    | 'album-production-history-invalid'
    | 'album-production-history-missing'
    | 'album-production-history-binding-mismatch'
    | 'album-production-history-state-mismatch'
    | 'album-synthetic-observation'
    | 'album-non-physical-semantic'
    | 'album-provider-qualification-duplicate'
    | 'album-provider-authorization-review-invalid'
    | 'album-provider-authorization-review-duplicate';
  providerId?: string;
  observationId?: string;
  platform?: MusicChartPlatform;
  detail?: string;
}>;

export type ProductMusicAlbumPointCandidateResult =
  | Readonly<{
      status: 'ok';
      model: ProductMusicAlbumPointCandidateReadModel;
    }>
  | Readonly<{
      status: 'data-issue';
      issues: readonly [
        ProductMusicAlbumPointCandidateDataIssue,
        ...ProductMusicAlbumPointCandidateDataIssue[],
      ];
    }>;

const EXPECTED_MUSIC_PLATFORMS = Object.freeze(
  ['melon', 'genie', 'bugs'] as const,
);

const PURCHASE_CLASS_SEMANTICS = Object.freeze(
  new Set<DirectAlbumObservation['semantic']>([
    'consumer-retail-sale',
    'retailer-panel-sale',
    'period-sale',
    'first-day-sale',
    'first-week-sale',
    'cumulative-sale',
  ]),
);

function providerTechnicallyQualified(
  descriptor: DirectAlbumProviderDescriptor,
): boolean {
  return (
    descriptor.onboarding.technicalReadiness === 'adapter-ready'
    && descriptor.capabilities.supportsNativePeriodSales.state === 'true'
  );
}

function providerProductionAuthorized(
  descriptor: DirectAlbumProviderDescriptor,
  review: AlbumProviderAuthorizationReview | null,
): boolean {
  return (
    descriptor.onboarding.productionAllowed
    && descriptor.onboarding.enabled
    && descriptor.onboarding.liveCallsAllowed
    && review !== null
    && review.productionAuthorizationSatisfied
    && review.dataIssues.length === 0
  );
}

function providerQualification(
  descriptor: DirectAlbumProviderDescriptor,
  review: AlbumProviderAuthorizationReview | null,
): ProductMusicAlbumProviderQualification {
  const authorizationReviewPacket =
    buildAlbumProviderAuthorizationReviewPacket(descriptor);
  return Object.freeze({
    providerId: descriptor.providerId,
    technicalReadiness: descriptor.onboarding.technicalReadiness,
    currentStage: descriptor.onboarding.currentStage,
    nativePeriodSalesQualified:
      descriptor.capabilities.supportsNativePeriodSales.state === 'true',
    historicalQueriesQualified:
      descriptor.capabilities.supportsHistoricalQueries.state === 'true',
    revisionsQualified:
      descriptor.capabilities.supportsRevisions.state === 'true',
    artistIdentityQualified:
      descriptor.capabilities.supportsArtistIdentity.state === 'true',
    releaseIdentityQualified:
      descriptor.capabilities.supportsReleaseIdentity.state === 'true',
    editionIdentityQualified:
      descriptor.capabilities.supportsEditionIdentity.state === 'true',
    skuIdentityQualified:
      descriptor.capabilities.supportsSkuIdentity.state === 'true',
    productionAllowed: descriptor.onboarding.productionAllowed,
    productionAuthorizationSatisfied:
      providerProductionAuthorized(descriptor, review),
    authorization: descriptor.onboarding.authorization,
    authorizationReviewPacket,
    authorizationReview: review,
    blockers: Object.freeze([...descriptor.onboarding.blockers]),
  });
}

function isPhysicalPurchaseObservation(
  observation: DirectAlbumObservation,
): boolean {
  return (
    observation.unit === 'physical-units'
    && PURCHASE_CLASS_SEMANTICS.has(observation.semantic)
  );
}

function musicReadiness(
  rows: MusicChartCurrentReadModel['rows'],
): Readonly<{
  state: ProductMusicAlbumComponentState;
  blockers: readonly string[];
}> {
  const blockers: string[] = [];
  const byPlatform = new Map<MusicChartPlatform, MusicChartCurrentReadModel['rows'][number]>();

  for (const row of rows) {
    if (byPlatform.has(row.platform)) {
      blockers.push(`duplicate-platform:${row.platform}`);
      continue;
    }
    byPlatform.set(row.platform, row);
  }

  for (const platform of EXPECTED_MUSIC_PLATFORMS) {
    const row = byPlatform.get(platform);
    if (!row) {
      blockers.push(`missing-platform:${platform}`);
      continue;
    }

    if (row.status === 'missing') blockers.push(`missing:${platform}`);
    if (row.status === 'unsupported') blockers.push(`unsupported:${platform}`);
    if (row.status === 'collection-failed') {
      blockers.push(`collection-failed:${platform}`);
    }
  }

  const unique = [...new Set(blockers)].sort();
  return Object.freeze({
    state: unique.length === 0 ? 'evidence-ready' : 'blocked',
    blockers: Object.freeze(unique),
  });
}

export function buildProductMusicAlbumPointCandidate(input: Readonly<{
  artistId: string;
  music: MusicChartCurrentReadModel;
  musicCurrentness: MusicChartCurrentnessAssessment;
  albumObservations: readonly DirectAlbumObservation[];
  albumProviders: readonly DirectAlbumProviderDescriptor[];
  albumProviderAuthorizationReviews?:
    readonly AlbumProviderAuthorizationReview[];
  musicCanonicalIdentityIntegration:
    | 'shared-registry'
    | 'external-binding';
  musicCanonicalIdentityBindingAssessment?:
    MusicChartCanonicalIdentityBindingAssessment;
  albumHistoryState:
    | 'production-history-available'
    | 'research-only'
    | 'absent';
  albumProductionHistory?: AlbumObservationHistory;
  albumNormalizationCalibrationReview?:
    AlbumNormalizationCalibrationEvidenceReview;
}>): ProductMusicAlbumPointCandidateResult {
  const issues: ProductMusicAlbumPointCandidateDataIssue[] = [];

  if (input.artistId.trim() === '') {
    throw new Error('product_music_album_artist_id_missing');
  }

  const musicRows = input.music.rows.filter(
    row => row.canonicalArtistId === input.artistId,
  );

  const canonicalIdentityAssessment =
    input.musicCanonicalIdentityBindingAssessment ?? null;

  if (input.musicCanonicalIdentityIntegration === 'shared-registry') {
    if (canonicalIdentityAssessment === null) {
      issues.push(Object.freeze({
        code: 'music-canonical-identity-proof-missing',
      }));
    } else {
      const artistProof = canonicalIdentityAssessment.entries.find(
        entry => entry.canonicalArtistId === input.artistId,
      );
      if (
        canonicalIdentityAssessment.contractVersion
          !== MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION
        || canonicalIdentityAssessment.integrationMode !== 'shared-registry'
        || canonicalIdentityAssessment.productCanonicalIdentityIntegrated
          !== true
        || canonicalIdentityAssessment.blockers.length !== 0
        || artistProof?.state !== 'shared-registry-verified'
      ) {
        issues.push(Object.freeze({
          code: 'music-canonical-identity-proof-invalid',
          detail: canonicalIdentityAssessment.blockers.join('|')
            || 'shared-registry-proof-not-verified',
        }));
      }
    }
  }

  for (const row of input.music.rows) {
    if (row.canonicalArtistId !== input.artistId) {
      issues.push(Object.freeze({
        code: 'music-artist-identity-mismatch',
        platform: row.platform,
      }));
    }
  }

  const musicPlatforms = new Set<MusicChartPlatform>();
  for (const row of musicRows) {
    if (musicPlatforms.has(row.platform)) {
      issues.push(Object.freeze({
        code: 'music-duplicate-platform',
        platform: row.platform,
      }));
    }
    musicPlatforms.add(row.platform);
  }

  const musicObservationIds = musicRows
    .map(row => row.observationId)
    .sort();
  const currentnessObservationIds = [
    ...input.musicCurrentness.observationIds,
  ].sort();

  if (
    input.musicCurrentness.assessmentAsOf !== input.music.asOf
    || musicObservationIds.length !== currentnessObservationIds.length
    || musicObservationIds.some(
      (value, index) => value !== currentnessObservationIds[index],
    )
  ) {
    issues.push(Object.freeze({
      code: 'music-currentness-read-model-mismatch',
    }));
  }

  const providers = new Map<string, DirectAlbumProviderDescriptor>();
  for (const descriptor of input.albumProviders) {
    if (providers.has(descriptor.providerId)) {
      issues.push(Object.freeze({
        code: 'album-provider-qualification-duplicate',
        providerId: descriptor.providerId,
      }));
      continue;
    }
    providers.set(descriptor.providerId, descriptor);
  }

  const authorizationReviews =
    new Map<string, AlbumProviderAuthorizationReview>();
  for (const review of input.albumProviderAuthorizationReviews ?? []) {
    if (authorizationReviews.has(review.providerId)) {
      issues.push(Object.freeze({
        code: 'album-provider-authorization-review-duplicate',
        providerId: review.providerId,
      }));
      continue;
    }
    const descriptor = providers.get(review.providerId);
    if (!descriptor) {
      issues.push(Object.freeze({
        code: 'album-provider-authorization-review-invalid',
        providerId: review.providerId,
        detail: 'provider-not-present',
      }));
      continue;
    }
    const packet =
      buildAlbumProviderAuthorizationReviewPacket(descriptor);
    if (
      review.targetFingerprint !== packet.targetFingerprint
      || review.dataIssues.length > 0
    ) {
      issues.push(Object.freeze({
        code: 'album-provider-authorization-review-invalid',
        providerId: review.providerId,
        detail:
          review.dataIssues.length > 0
            ? review.dataIssues.join('|')
            : 'provider-authorization-target-fingerprint-mismatch',
      }));
      continue;
    }
    authorizationReviews.set(review.providerId, review);
  }

  for (const observation of input.albumObservations) {
    const descriptor = providers.get(observation.providerId);

    if (!descriptor) {
      issues.push(Object.freeze({
        code: 'album-provider-not-qualified',
        providerId: observation.providerId,
        observationId: observation.observationId,
      }));
      continue;
    }

    if (observation.fandexArtistId !== input.artistId) {
      issues.push(Object.freeze({
        code: 'album-artist-identity-mismatch',
        providerId: observation.providerId,
        observationId: observation.observationId,
      }));
    }

    if (
      observation.fandexReleaseId === null
      && observation.fandexReleaseFamilyId === null
    ) {
      issues.push(Object.freeze({
        code: 'album-release-identity-unresolved',
        providerId: observation.providerId,
        observationId: observation.observationId,
      }));
    }

    if (observation.syntheticFixture) {
      issues.push(Object.freeze({
        code: 'album-synthetic-observation',
        providerId: observation.providerId,
        observationId: observation.observationId,
      }));
    }

    if (!isPhysicalPurchaseObservation(observation)) {
      issues.push(Object.freeze({
        code: 'album-non-physical-semantic',
        providerId: observation.providerId,
        observationId: observation.observationId,
      }));
    }

    const validation = validateDirectAlbumObservation(
      observation,
      descriptor,
    );
    for (const detail of validation.issues) {
      issues.push(Object.freeze({
        code: 'album-provider-validation-failed',
        providerId: observation.providerId,
        observationId: observation.observationId,
        detail,
      }));
    }
  }

  if (issues.length > 0) {
    return Object.freeze({
      status: 'data-issue' as const,
      issues: Object.freeze(issues) as readonly [
        ProductMusicAlbumPointCandidateDataIssue,
        ...ProductMusicAlbumPointCandidateDataIssue[],
      ],
    });
  }

  const musicAssessment = musicReadiness(musicRows);

  const technicallyQualifiedProviders = input.albumProviders
    .filter(providerTechnicallyQualified)
    .map(descriptor => descriptor.providerId)
    .sort();

  const productionAuthorizedProviders = input.albumProviders
    .filter(descriptor =>
      providerProductionAuthorized(
        descriptor,
        authorizationReviews.get(descriptor.providerId) ?? null,
      ))
    .map(descriptor => descriptor.providerId)
    .sort();

  const normalizationInput = buildAlbumNormalizationInput({
    observations: input.albumObservations,
    providers: input.albumProviders,
  });
  const normalizationPrimaryIds = new Set(
    normalizationInput.primaryCandidateObservationIds,
  );
  const releaseScopeReviewPacket =
    buildAlbumReleaseScopeReviewPacket({
      normalizationInput,
      providers: input.albumProviders,
    });

  const normalizationCalibrationReview =
    input.albumNormalizationCalibrationReview ?? null;

  if (normalizationCalibrationReview !== null) {
    const expectedTarget =
      buildAlbumNormalizationCalibrationReviewTarget(
        normalizationInput,
      );
    if (
      normalizationCalibrationReview.target.fingerprint
        !== expectedTarget.fingerprint
      || normalizationCalibrationReview.dataIssues.length > 0
    ) {
      issues.push(Object.freeze({
        code: 'album-normalization-calibration-review-invalid',
        detail:
          normalizationCalibrationReview.dataIssues.length > 0
            ? normalizationCalibrationReview.dataIssues.join('|')
            : 'normalization-input-fingerprint-mismatch',
      }));
    }
  }

  if (issues.length > 0) {
    return Object.freeze({
      status: 'data-issue' as const,
      issues: Object.freeze(issues) as readonly [
        ProductMusicAlbumPointCandidateDataIssue,
        ...ProductMusicAlbumPointCandidateDataIssue[],
      ],
    });
  }

  const normalizationCalibration =
    evaluateAlbumNormalizationCalibrationGate({
      normalizationInput,
      productionAuthorizedProviderIds:
        productionAuthorizedProviders,
      historyState: input.albumHistoryState,
      evidence: normalizationCalibrationReview?.evidence,
    });

  const eligibleObservationIds = input.albumObservations
    .filter((observation) => {
      const descriptor = providers.get(observation.providerId);
      return (
        descriptor !== undefined
        && providerProductionAuthorized(
          descriptor,
          authorizationReviews.get(descriptor.providerId) ?? null,
        )
        && normalizationPrimaryIds.has(observation.observationId)
        && isPhysicalPurchaseObservation(observation)
        && observation.fandexArtistId === input.artistId
        && (
          observation.fandexReleaseId !== null
          || observation.fandexReleaseFamilyId !== null
        )
        && observation.providerPeriod !== null
        && observation.providerPeriod.trim() !== ''
      );
    })
    .map(observation => observation.observationId)
    .sort();

  let productionHistorySummary:
    ProductMusicAlbumPointCandidateReadModel['components']['album']['productionHistory']
    = null;
  let normalizationCalibrationEvidenceDerivation:
    AlbumNormalizationCalibrationEvidenceDerivation | null = null;

  if (
    input.albumHistoryState === 'production-history-available'
    && input.albumProductionHistory === undefined
  ) {
    issues.push(Object.freeze({
      code: 'album-production-history-missing',
    }));
  }

  if (
    input.albumHistoryState !== 'production-history-available'
    && input.albumProductionHistory !== undefined
  ) {
    issues.push(Object.freeze({
      code: 'album-production-history-state-mismatch',
    }));
  }

  if (input.albumProductionHistory !== undefined) {
    const historyRead = readAlbumObservationHistoryAsOf(
      input.albumProductionHistory,
      input.music.asOf,
    );

    if (historyRead.status === 'data-issue') {
      issues.push(Object.freeze({
        code: 'album-production-history-invalid',
        detail: historyRead.issues.join('|'),
      }));
    } else {
      const activeIds = historyRead.activeRows
        .map(row => row.observationId)
        .sort();
      const activeSet = new Set(activeIds);
      const missingEligible = eligibleObservationIds.filter(
        observationId => !activeSet.has(observationId),
      );

      if (missingEligible.length > 0) {
        issues.push(Object.freeze({
          code: 'album-production-history-binding-mismatch',
          detail: missingEligible.join('|'),
        }));
      }

      productionHistorySummary = Object.freeze({
        contractVersion:
          ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION,
        entryCount: input.albumProductionHistory.entries.length,
        activeObservationIds: Object.freeze(activeIds),
        revisionAware: true as const,
        additiveRevisionCountingAllowed: false as const,
      });

      normalizationCalibrationEvidenceDerivation =
        deriveAlbumNormalizationCalibrationEvidenceCandidates({
          normalizationInput,
          history: input.albumProductionHistory,
          asOf: input.music.asOf,
        });
    }
  }

  if (issues.length > 0) {
    return Object.freeze({
      status: 'data-issue' as const,
      issues: Object.freeze(issues) as readonly [
        ProductMusicAlbumPointCandidateDataIssue,
        ...ProductMusicAlbumPointCandidateDataIssue[],
      ],
    });
  }

  const albumBlockers: string[] = [];
  if (technicallyQualifiedProviders.length === 0) {
    albumBlockers.push('no-technically-qualified-provider');
  }
  if (productionAuthorizedProviders.length === 0) {
    albumBlockers.push('no-production-authorized-provider');
  }
  if (eligibleObservationIds.length === 0) {
    albumBlockers.push('no-production-eligible-physical-observation');
  }
  if (
    input.albumObservations.length > 0
    && !normalizationInput.inputSetUsable
  ) {
    albumBlockers.push('album-normalization-input-not-usable');
  }

  const albumState: ProductMusicAlbumComponentState =
    albumBlockers.length === 0
      ? 'evidence-ready'
      : technicallyQualifiedProviders.length > 0
        ? 'technical-only'
        : 'blocked';

  const componentBlockers = [
    ...musicAssessment.blockers.map(blocker => `music:${blocker}`),
    ...albumBlockers.map(blocker => `album:${blocker}`),
  ].sort();

  const componentEvidenceReady =
    musicAssessment.state === 'evidence-ready'
    && albumState === 'evidence-ready';

  const temporalAlignment = evaluateMusicAlbumTemporalAlignment({
    musicRows,
    albumObservations: input.albumObservations.filter(observation =>
      normalizationPrimaryIds.has(observation.observationId)),
  });
  const temporalAlignmentUsable =
    temporalAlignment.state === 'aligned'
    || temporalAlignment.state === 'conditionally-aligned';
  const musicCurrentnessUsable =
    input.musicCurrentness.status === 'current';

  const activationBlockers = [
    ...componentBlockers,
    ...(!musicCurrentnessUsable
      ? ['music-currentness-not-current']
      : []),
    ...(componentEvidenceReady && !temporalAlignmentUsable
      ? ['temporal-alignment-not-usable']
      : []),
    ...(normalizationCalibration.status
      !== 'eligible-for-methodology-design'
      ? ['album-normalization-calibration-prerequisites-not-met']
      : []),
    'numeric-combination-methodology-not-approved',
  ].sort();

  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      contractVersion:
        PRODUCT_MUSIC_ALBUM_POINT_CANDIDATE_CONTRACT_VERSION,
      identity: Object.freeze({
        sourceArtistId: input.artistId,
        legacyVariableId:
          PRODUCT_MUSIC_ALBUM_POINT_LEGACY_VARIABLE_ID,
        constructId: PRODUCT_MUSIC_ALBUM_POINT_CONSTRUCT_ID,
      }),
      construct:
        'Music current-chart presence + physical completed-purchase-class album sales' as const,
      components: Object.freeze({
        music: Object.freeze({
          construct: 'current-chart-presence' as const,
          expectedPlatforms: EXPECTED_MUSIC_PLATFORMS,
          rows: Object.freeze([...musicRows]),
          rankSemantic: 'ordinal-chart-position' as const,
          presenceSemantic:
            'ranked-or-proven-not-ranked' as const,
          numericAggregationDefined: false as const,
          freshnessThresholdDefined: false as const,
          canonicalIdentityIntegration:
            input.musicCanonicalIdentityIntegration,
          canonicalIdentityBindingAssessment:
            canonicalIdentityAssessment,
          currentness: input.musicCurrentness,
          state: musicAssessment.state,
          blockers: musicAssessment.blockers,
        }),
        album: Object.freeze({
          construct:
            ALBUM_METHODOLOGY_DEFINITION.construct,
          methodologyVersion: ALBUM_METHODOLOGY_VERSION,
          normalizationMethod:
            ALBUM_METHODOLOGY_DEFINITION.normalizationMethod,
          normalizationInput,
          normalizationCalibrationReview,
          normalizationCalibrationEvidenceDerivation,
          releaseScopeReviewPacket,
          normalizationCalibration,
          observations: Object.freeze([...input.albumObservations]),
          providers: Object.freeze(
            input.albumProviders.map(descriptor =>
              providerQualification(
                descriptor,
                authorizationReviews.get(descriptor.providerId)
                  ?? null,
              )),
          ),
          technicallyQualifiedProviders:
            Object.freeze(technicallyQualifiedProviders),
          productionAuthorizedProviders:
            Object.freeze(productionAuthorizedProviders),
          eligibleObservationIds:
            Object.freeze(eligibleObservationIds),
          physicalUnitSemantic: 'physical-units' as const,
          numericAggregationDefined: false as const,
          historyState: input.albumHistoryState,
          productionHistory: productionHistorySummary,
          state: albumState,
          blockers: Object.freeze([...albumBlockers].sort()),
        }),
      }),
      combinationBoundary: Object.freeze({
        rawProviderAdditionAllowed: false as const,
        rawProviderAverageAllowed: false as const,
        rankToPhysicalUnitsConversionAllowed: false as const,
        musicAlbumRawAdditionAllowed: false as const,
        musicAlbumRawAverageAllowed: false as const,
        weightingDefined: false as const,
        normalizationDefined: false as const,
        temporalAlignmentDefined: true as const,
        productValue: null,
      }),
      temporalAlignment,
      readiness: Object.freeze({
        componentEvidenceReady,
        productContractCandidateReady:
          componentEvidenceReady
          && temporalAlignmentUsable
          && musicCurrentnessUsable,
        albumNormalizationMethodologyDesignEligible:
          normalizationCalibration.status
            === 'eligible-for-methodology-design',
        numericProductEligible: false as const,
        productActivationReady: false as const,
        productPublicationReady: false as const,
        previewFallbackAllowed: false as const,
        componentBlockers: Object.freeze(componentBlockers),
        activationBlockers: Object.freeze(activationBlockers),
      }),
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      presentation: 'standard' as const,
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
      numericProductEligible: false as const,
    }),
  });
}
