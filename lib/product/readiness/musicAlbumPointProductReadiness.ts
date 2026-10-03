import {
  MUSIC_CHART_CURRENTNESS_CONTRACT_VERSION,
} from '../../alternative-evidence/musicChartCurrentness';
import {
  MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION,
} from '../../alternative-evidence/musicChartCanonicalIdentityBinding';
import {
  ALBUM_NORMALIZATION_CALIBRATION_GATE_VERSION,
} from './albumNormalizationCalibrationGate';
import {
  ALBUM_NORMALIZATION_CALIBRATION_REVIEW_VERSION,
} from './albumNormalizationCalibrationEvidenceReview';
import {
  ALBUM_PROVIDER_AUTHORIZATION_REVIEW_VERSION,
} from './albumProviderAuthorizationReview';
import type {
  ProductMusicAlbumPointCandidateResult,
} from '../contracts/productMusicAlbumPointCandidate';
import {
  MUSIC_ALBUM_TEMPORAL_ALIGNMENT_CONTRACT_VERSION,
} from '../contracts/musicAlbumTemporalAlignment';
import {
  PRODUCT_MUSIC_ALBUM_POINT_CANDIDATE_CONTRACT_VERSION,
  PRODUCT_MUSIC_ALBUM_POINT_CONSTRUCT_ID,
  PRODUCT_MUSIC_ALBUM_POINT_LEGACY_VARIABLE_ID,
} from '../contracts/productMusicAlbumPointCandidate';

export const MUSIC_ALBUM_POINT_PRODUCT_READINESS_VERSION =
  'music-album-point-product-readiness-v1' as const;

export type MusicAlbumPointProductReadinessCheck =
  | 'product-contract-valid'
  | 'music-platform-coverage'
  | 'music-status-semantics'
  | 'music-canonical-identity-integrated'
  | 'music-freshness-policy-defined'
  | 'music-currentness-usable'
  | 'album-provider-technical-qualified'
  | 'album-real-physical-observation'
  | 'album-release-identity-resolved'
  | 'album-history-production-grade'
  | 'album-rights-review-contract-defined'
  | 'album-rights-authorized'
  | 'album-normalization-input-contract-defined'
  | 'album-normalization-input-usable'
  | 'album-normalization-calibration-gate-defined'
  | 'album-normalization-calibration-review-evidence-ready'
  | 'album-normalization-calibration-eligible'
  | 'album-normalization-defined'
  | 'cross-component-temporal-alignment-defined'
  | 'cross-component-temporal-alignment-usable'
  | 'numeric-output-methodology-defined'
  | 'no-raw-cross-semantic-combination'
  | 'shadow-publication-boundary'
  | 'no-preview-fallback';

export type MusicAlbumPointProductReadiness = Readonly<{
  contractVersion: typeof MUSIC_ALBUM_POINT_PRODUCT_READINESS_VERSION;
  target: Readonly<{
    legacyVariableId:
      typeof PRODUCT_MUSIC_ALBUM_POINT_LEGACY_VARIABLE_ID;
    constructId:
      typeof PRODUCT_MUSIC_ALBUM_POINT_CONSTRUCT_ID;
  }>;
  status: 'eligible-for-activation-review' | 'blocked';
  checks: Readonly<Record<MusicAlbumPointProductReadinessCheck, boolean>>;
  blockers: readonly MusicAlbumPointProductReadinessCheck[];
  productActivationAuthorized: false;
  productPublicationAuthorized: false;
  publicRouteActivated: false;
  publication: 'shadow';
  productValue: null;
  numericProductEligible: false;
  previewFallbackAllowed: false;
  directProductionContributionEligible: false;
}>;

function defaultChecks():
  Record<MusicAlbumPointProductReadinessCheck, boolean> {
  return {
    'product-contract-valid': false,
    'music-platform-coverage': false,
    'music-status-semantics': false,
    'music-canonical-identity-integrated': false,
    'music-freshness-policy-defined': false,
    'music-currentness-usable': false,
    'album-provider-technical-qualified': false,
    'album-real-physical-observation': false,
    'album-release-identity-resolved': false,
    'album-history-production-grade': false,
    'album-rights-review-contract-defined': false,
    'album-rights-authorized': false,
    'album-normalization-input-contract-defined': false,
    'album-normalization-input-usable': false,
    'album-normalization-calibration-gate-defined': false,
    'album-normalization-calibration-review-evidence-ready': false,
    'album-normalization-calibration-eligible': false,
    'album-normalization-defined': false,
    'cross-component-temporal-alignment-defined': false,
    'cross-component-temporal-alignment-usable': false,
    'numeric-output-methodology-defined': false,
    'no-raw-cross-semantic-combination': false,
    'shadow-publication-boundary': false,
    'no-preview-fallback': false,
  };
}

function providerRightsAuthorized(
  provider: Readonly<{
    productionAllowed: boolean;
    productionAuthorizationSatisfied: boolean;
    authorizationReview: Readonly<{
      productionAuthorizationSatisfied: boolean;
      dataIssues: readonly string[];
      autoAuthorized: false;
      technicalCapabilityImpliesAuthorization: false;
    }> | null;
  }>,
): boolean {
  return provider.productionAllowed
    && provider.productionAuthorizationSatisfied
    && provider.authorizationReview !== null
    && provider.authorizationReview.productionAuthorizationSatisfied
    && provider.authorizationReview.dataIssues.length === 0
    && provider.authorizationReview.autoAuthorized === false
    && provider.authorizationReview
      .technicalCapabilityImpliesAuthorization === false;
}

export function evaluateMusicAlbumPointProductReadiness(
  candidate: ProductMusicAlbumPointCandidateResult,
): MusicAlbumPointProductReadiness {
  const checks = defaultChecks();

  if (candidate.status === 'ok') {
    const model = candidate.model;

    checks['product-contract-valid'] =
      model.contractVersion
        === PRODUCT_MUSIC_ALBUM_POINT_CANDIDATE_CONTRACT_VERSION
      && model.identity.legacyVariableId
        === PRODUCT_MUSIC_ALBUM_POINT_LEGACY_VARIABLE_ID
      && model.identity.constructId
        === PRODUCT_MUSIC_ALBUM_POINT_CONSTRUCT_ID;

    const expected = new Set(model.components.music.expectedPlatforms);
    const observed = new Set(
      model.components.music.rows.map(row => row.platform),
    );
    checks['music-platform-coverage'] =
      expected.size === 3
      && observed.size === expected.size
      && [...expected].every(platform => observed.has(platform));

    checks['music-status-semantics'] =
      model.components.music.rows.length > 0
      && model.components.music.rows.every(
        row => row.status === 'ranked' || row.status === 'not-ranked',
      );

    checks['music-canonical-identity-integrated'] =
      model.components.music.canonicalIdentityIntegration
        === 'shared-registry'
      && model.components.music.canonicalIdentityBindingAssessment !== null
      && model.components.music.canonicalIdentityBindingAssessment
        .contractVersion === MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION
      && model.components.music.canonicalIdentityBindingAssessment
        .integrationMode === 'shared-registry'
      && model.components.music.canonicalIdentityBindingAssessment
        .productCanonicalIdentityIntegrated === true
      && model.components.music.canonicalIdentityBindingAssessment
        .blockers.length === 0;

    checks['music-freshness-policy-defined'] =
      model.components.music.currentness.contractVersion
        === MUSIC_CHART_CURRENTNESS_CONTRACT_VERSION
      && model.components.music.currentness.methodologyDefined === true
      && model.components.music.currentness.expectedCadence === 'daily'
      && model.components.music.currentness.thresholdApplied === false
      && model.components.music.currentness.scoreFieldsPresent === false;

    checks['music-currentness-usable'] =
      model.components.music.currentness.status === 'current';

    checks['album-provider-technical-qualified'] =
      model.components.album.providers.some(
        provider =>
          provider.technicalReadiness === 'adapter-ready'
          && provider.nativePeriodSalesQualified,
      );

    checks['album-real-physical-observation'] =
      model.components.album.observations.length > 0
      && model.components.album.observations.every(
        observation =>
          observation.syntheticFixture === false
          && observation.unit === 'physical-units',
      );

    checks['album-release-identity-resolved'] =
      model.components.album.observations.length > 0
      && model.components.album.observations.every(
        observation =>
          observation.fandexArtistId === model.identity.sourceArtistId
          && (
            observation.fandexReleaseId !== null
            || observation.fandexReleaseFamilyId !== null
          ),
      );

    checks['album-history-production-grade'] =
      model.components.album.historyState
        === 'production-history-available'
      && model.components.album.productionHistory !== null
      && model.components.album.productionHistory.revisionAware === true
      && model.components.album.productionHistory
        .additiveRevisionCountingAllowed === false
      && model.components.album.productionHistory.entryCount > 0;

    checks['album-rights-review-contract-defined'] =
      model.components.album.providers.length > 0
      && model.components.album.providers.every(provider =>
        provider.authorizationReviewPacket.contractVersion
          === ALBUM_PROVIDER_AUTHORIZATION_REVIEW_VERSION
        && provider.authorizationReviewPacket
          .technicalCapabilityImpliesAuthorization === false
        && provider.authorizationReviewPacket.autoAuthorized === false
        && provider.authorizationReviewPacket
          .reviewerConclusionRequired === true);

    checks['album-rights-authorized'] =
      model.components.album.providers.some(providerRightsAuthorized);

    checks['album-normalization-input-contract-defined'] =
      model.components.album.normalizationInput.methodologyDefined === true
      && model.components.album.normalizationInput.rawProviderAdditionAllowed
        === false
      && model.components.album.normalizationInput.crossProviderAdditionAllowed
        === false
      && model.components.album.normalizationInput.parentChildAdditionAllowed
        === false
      && model.components.album.normalizationInput.skuAdditionToReleaseAllowed
        === false
      && model.components.album.normalizationInput.numericNormalizationDefined
        === false
      && model.components.album.normalizationInput.normalizedValue === null;

    checks['album-normalization-input-usable'] =
      model.components.album.normalizationInput.inputSetUsable;

    checks['album-normalization-calibration-gate-defined'] =
      model.components.album.normalizationCalibration.contractVersion
        === ALBUM_NORMALIZATION_CALIBRATION_GATE_VERSION
      && model.components.album.normalizationCalibration.arbitraryThresholdDefined
        === false
      && model.components.album.normalizationCalibration.minimumHistoryLengthDefined
        === false
      && model.components.album.normalizationCalibration.numericNormalizationDefined
        === false
      && model.components.album.normalizationCalibration.calibrationRunAuthorized
        === false
      && model.components.album.normalizationCalibration.normalizedValue
        === null;

    checks['album-normalization-calibration-review-evidence-ready'] =
      model.components.album.normalizationCalibrationReview !== null
      && model.components.album.normalizationCalibrationReview.contractVersion
        === ALBUM_NORMALIZATION_CALIBRATION_REVIEW_VERSION
      && model.components.album.normalizationCalibrationReview.dataIssues.length
        === 0
      && model.components.album.normalizationCalibrationReview
        .readyForCalibrationGate === true
      && model.components.album.normalizationCalibrationReview
        .numericNormalizationDefined === false
      && model.components.album.normalizationCalibrationReview
        .calibrationRunAuthorized === false;

    checks['album-normalization-calibration-eligible'] =
      model.components.album.normalizationCalibration.status
        === 'eligible-for-methodology-design';

    // Numeric Album normalization remains unresolved. Input reconciliation
    // being defined does not authorize a normalized score.
    checks['album-normalization-defined'] = false;
    checks['cross-component-temporal-alignment-defined'] =
      model.combinationBoundary.temporalAlignmentDefined === true
      && model.temporalAlignment.contractVersion
        === MUSIC_ALBUM_TEMPORAL_ALIGNMENT_CONTRACT_VERSION
      && model.temporalAlignment.methodologyDefined === true
      && model.temporalAlignment.numericCombinationAllowed === false;

    checks['cross-component-temporal-alignment-usable'] =
      model.temporalAlignment.state === 'aligned'
      || model.temporalAlignment.state === 'conditionally-aligned';

    checks['numeric-output-methodology-defined'] = false;

    checks['no-raw-cross-semantic-combination'] =
      model.combinationBoundary.rawProviderAdditionAllowed === false
      && model.combinationBoundary.rawProviderAverageAllowed === false
      && model.combinationBoundary.rankToPhysicalUnitsConversionAllowed
        === false
      && model.combinationBoundary.musicAlbumRawAdditionAllowed === false
      && model.combinationBoundary.musicAlbumRawAverageAllowed === false;

    checks['shadow-publication-boundary'] =
      model.publication === 'shadow'
      && model.productMetricReadPerformed === false
      && model.numericProductEligible === false
      && model.combinationBoundary.productValue === null;

    checks['no-preview-fallback'] =
      model.previewFallbackUsed === false;
  }

  const blockers = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([check]) => check as MusicAlbumPointProductReadinessCheck);

  return Object.freeze({
    contractVersion: MUSIC_ALBUM_POINT_PRODUCT_READINESS_VERSION,
    target: Object.freeze({
      legacyVariableId:
        PRODUCT_MUSIC_ALBUM_POINT_LEGACY_VARIABLE_ID,
      constructId:
        PRODUCT_MUSIC_ALBUM_POINT_CONSTRUCT_ID,
    }),
    status: blockers.length === 0
      ? 'eligible-for-activation-review' as const
      : 'blocked' as const,
    checks: Object.freeze(checks),
    blockers: Object.freeze(blockers),
    productActivationAuthorized: false as const,
    productPublicationAuthorized: false as const,
    publicRouteActivated: false as const,
    publication: 'shadow' as const,
    productValue: null,
    numericProductEligible: false as const,
    previewFallbackAllowed: false as const,
    directProductionContributionEligible: false as const,
  });
}
