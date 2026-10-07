import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptMusicAlbumPointToFandexVariableProduct,
  MUSIC_ALBUM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/musicAlbumPointFandexVariableProduct';
import type {
  ProductMusicAlbumPointCandidateResult,
  ProductMusicAlbumPointCandidateReadModel,
} from '../lib/product/contracts/productMusicAlbumPointCandidate';
import {
  MUSIC_ALBUM_POINT_PRODUCT_READINESS_VERSION,
  type MusicAlbumPointProductReadiness,
} from '../lib/product/readiness/musicAlbumPointProductReadiness';
import {
  evaluateMusicAlbumReportedWebProductReadiness,
} from '../lib/product/readiness/musicAlbumReportedWebProductReadiness';

function candidate(): ProductMusicAlbumPointCandidateResult {
  const model = {
    contractVersion: 'product-music-album-point-candidate-v1',
    identity: {
      sourceArtistId: 'iu',
      legacyVariableId: 'musicAlbumPoint',
      constructId: 'musicAlbumEvidencePair',
    },
    construct:
      'Music current-chart presence + physical completed-purchase-class album sales',
    components: {
      music: {
        construct: 'current-chart-presence',
        expectedPlatforms: ['melon', 'genie', 'bugs'],
        rows: [],
        rankSemantic: 'ordinal-chart-position',
        presenceSemantic: 'ranked-or-proven-not-ranked',
        numericAggregationDefined: false,
        freshnessThresholdDefined: false,
        canonicalIdentityIntegration: 'external-binding',
        canonicalIdentityBindingAssessment: null,
        currentness: {
          contractVersion: 'music-chart-currentness-v1',
          methodologyDefined: true,
          expectedCadence: 'daily',
          assessmentAsOf: '2026-10-03T00:00:00.000Z',
          latestObservedAt: null,
          latestCollectionDate: null,
          thresholdApplied: false,
          scoreFieldsPresent: false,
          status: 'unknown',
          observationIds: [],
          evidenceRefs: [],
        },
        state: 'blocked',
        blockers: ['missing:melon'],
      },
      album: {
        construct: 'physical completed-purchase-class sales reaction',
        methodologyVersion: 'album-methodology-v1',
        normalizationMethod: 'unresolved',
        normalizationInput: {
          contractVersion: 'album-normalization-input-v1',
          methodologyDefined: true,
          rawProviderAdditionAllowed: false,
          crossProviderAdditionAllowed: false,
          parentChildAdditionAllowed: false,
          skuAdditionToReleaseAllowed: false,
          numericNormalizationDefined: false,
          normalizedValue: null,
          inputSetUsable: false,
          blockers: [],
          groups: [],
        },
        normalizationCalibrationReview: null,
        normalizationCalibrationEvidenceDerivation: null,
        releaseScopeReviewPacket: {} as never,
        normalizationCalibration: {} as never,
        observations: [],
        providers: [
          {
            providerId: 'hanteo',
            technicalReadiness: 'adapter-ready',
            currentStage: 'research',
            nativePeriodSalesQualified: true,
            historicalQueriesQualified: true,
            revisionsQualified: true,
            artistIdentityQualified: true,
            releaseIdentityQualified: true,
            editionIdentityQualified: true,
            skuIdentityQualified: true,
            productionAllowed: false,
            productionAuthorizationSatisfied: false,
            authorization: {} as never,
            authorizationReviewPacket: {} as never,
            authorizationReview: null,
            blockers: ['rights-not-authorized'],
          },
        ],
        technicallyQualifiedProviders: ['hanteo'],
        productionAuthorizedProviders: [],
        eligibleObservationIds: [],
        physicalUnitSemantic: 'physical-units',
        numericAggregationDefined: false,
        historyState: 'research-only',
        productionHistory: null,
        state: 'technical-only',
        blockers: ['no-production-authorized-provider'],
      },
    },
    temporalAlignment: {} as never,
    combinationBoundary: {
      rawProviderAdditionAllowed: false,
      rawProviderAverageAllowed: false,
      rankToPhysicalUnitsConversionAllowed: false,
      musicAlbumRawAdditionAllowed: false,
      musicAlbumRawAverageAllowed: false,
      weightingDefined: false,
      normalizationDefined: false,
      temporalAlignmentDefined: true,
      productValue: null,
    },
    readiness: {
      componentEvidenceReady: false,
      productContractCandidateReady: false,
      albumNormalizationMethodologyDesignEligible: false,
      numericProductEligible: false,
      productActivationReady: false,
      productPublicationReady: false,
      previewFallbackAllowed: false,
      componentBlockers: [],
      activationBlockers: [],
    },
    dataOrigin: 'observed',
    publication: 'shadow',
    presentation: 'standard',
    previewFallbackUsed: false,
    productMetricReadPerformed: false,
    numericProductEligible: false,
  } as unknown as ProductMusicAlbumPointCandidateReadModel;

  return Object.freeze({
    status: 'ok' as const,
    model,
  });
}

function readiness(): MusicAlbumPointProductReadiness {
  return Object.freeze({
    contractVersion: MUSIC_ALBUM_POINT_PRODUCT_READINESS_VERSION,
    target: Object.freeze({
      legacyVariableId: 'musicAlbumPoint' as const,
      constructId: 'musicAlbumEvidencePair' as const,
    }),
    status: 'blocked' as const,
    checks: {} as MusicAlbumPointProductReadiness['checks'],
    blockers: Object.freeze([
      'album-rights-authorized' as const,
      'album-normalization-defined' as const,
      'numeric-output-methodology-defined' as const,
    ]),
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

test('Music/Album candidate maps to a non-production common record without inventing a value', () => {
  const result = adaptMusicAlbumPointToFandexVariableProduct({
    candidate: candidate(),
    readiness: readiness(),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.variableId, 'musicAlbumPoint');
  assert.equal(result.record.canonicalArtistId, 'iu');
  assert.equal(result.record.lifecycleState, 'shadow');
  assert.equal(result.record.materialClass, 'real');
  assert.equal(result.record.readinessState, 'research-only');
  assert.equal(result.record.availability, 'unavailable');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'not-produced',
  });
  assert.equal(result.record.confidence, 'insufficient');
  assert.equal(result.record.coverage, 'unknown');
  assert.equal(result.record.freshness, 'unknown');
  assert.equal(
    result.record.productVersion,
    MUSIC_ALBUM_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  );
});

test('rights and methodology blockers remain explicit evidence rather than synthetic numbers', () => {
  const result = adaptMusicAlbumPointToFandexVariableProduct({
    candidate: candidate(),
    readiness: readiness(),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.ok(
    result.record.evidenceRefs.includes(
      'music-album-readiness-blocker:album-rights-authorized',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'music-album-readiness-blocker:album-normalization-defined',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'music-album-readiness-blocker:numeric-output-methodology-defined',
    ),
  );
  assert.equal(
    JSON.stringify(result.record).includes('"value":'),
    false,
  );
});

test('technical provider qualification never implies Production authorization', () => {
  const result = adaptMusicAlbumPointToFandexVariableProduct({
    candidate: candidate(),
    readiness: readiness(),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.ok(
    result.record.evidenceRefs.includes(
      'music-album-provider:hanteo:research:production-not-authorized',
    ),
  );
  assert.equal(result.record.lifecycleState, 'shadow');
  assert.equal(result.record.readinessState, 'research-only');
});

test('data-issue candidate fails closed', () => {
  const dataIssueCandidate: ProductMusicAlbumPointCandidateResult = {
    status: 'data-issue',
    issues: [
      {
        code: 'album-provider-not-qualified',
      },
    ],
  };

  const result = adaptMusicAlbumPointToFandexVariableProduct({
    candidate: dataIssueCandidate,
    readiness: readiness(),
  });

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'upstream-candidate-not-ok',
  });
});

test('unexpected Product activation/publication boundary fails closed', () => {
  const forged = {
    ...readiness(),
    productPublicationAuthorized: true,
  } as unknown as MusicAlbumPointProductReadiness;

  const result = adaptMusicAlbumPointToFandexVariableProduct({
    candidate: candidate(),
    readiness: forged,
  });

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'upstream-production-boundary-violated',
  });
});

test('current combined Product remains time-unknown rather than inferring a fake observation time', () => {
  const result = adaptMusicAlbumPointToFandexVariableProduct({
    candidate: candidate(),
    readiness: readiness(),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.asOf, null);
  assert.deepEqual(result.record.observationTime, { kind: 'unknown' });
  assert.equal(result.record.collectionTime, null);
});


test('reported-web current-source blocker is preserved in common Product evidence without inventing a Product value', () => {
  const current = {
    status: 'unavailable' as const,
    contractVersion: 'reported-album-sales-current-release-v1' as const,
    canonicalArtistId: 'iu',
    reason: 'latest-release-not-verified' as const,
    freshnessState: 'unknown' as const,
    value: null,
    unit: null,
    missingIsZero: false as const,
    missingIsStable: false as const,
  };
  const result = adaptMusicAlbumPointToFandexVariableProduct({
    candidate: candidate(),
    readiness: readiness(),
    reportedWebCurrentRelease: current,
    reportedWebReadiness:
      evaluateMusicAlbumReportedWebProductReadiness(current),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.ok(
    result.record.evidenceRefs.includes(
      'music-album-reported-web-current:unavailable',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'music-album-reported-web-reason:latest-release-not-verified',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'music-album-reported-web-readiness:source-blocked',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'music-album-reported-web-blocker:current-observation-available',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'music-album-legacy-direct-lane-blocker:album-rights-authorized',
    ),
  );
  assert.equal(
    result.record.evidenceRefs.includes(
      'music-album-readiness-blocker:album-rights-authorized',
    ),
    false,
  );
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'not-produced',
  });
  assert.equal(result.record.lifecycleState, 'shadow');
  assert.equal(result.record.readinessState, 'research-only');
});
