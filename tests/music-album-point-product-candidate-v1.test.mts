import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
  HANTEO_EVIDENCE_DESCRIPTOR,
} from '../lib/alternative-evidence/directProviderEvidence';
import {
  buildDirectAlbumObservation,
  type DirectAlbumProviderDescriptor,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  adaptMusicChartEvidence,
  type MusicChartCanonicalBinding,
} from '../lib/alternative-evidence/musicChartEvidenceAdapter';
import {
  assessMusicChartSharedCanonicalBindings,
} from '../lib/alternative-evidence/musicChartCanonicalIdentityBinding';
import {
  appendMusicChartObservationHistory,
  buildMusicChartCurrentReadModel,
  type MusicChartCurrentReadModel,
} from '../lib/alternative-evidence/musicChartObservationHistory';
import {
  assessMusicChartCurrentness,
} from '../lib/alternative-evidence/musicChartCurrentness';
import {
  buildAlbumNormalizationInput,
} from '../lib/product/contracts/albumNormalizationInput';
import {
  appendAlbumObservationHistory,
} from '../lib/product/contracts/albumObservationHistory';
import {
  buildProductMusicAlbumPointCandidate,
} from '../lib/product/contracts/productMusicAlbumPointCandidate';
import {
  ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION,
  buildAlbumNormalizationCalibrationReviewTarget,
  reviewAlbumNormalizationCalibrationEvidence,
} from '../lib/product/readiness/albumNormalizationCalibrationEvidenceReview';
import {
  ALBUM_PROVIDER_AUTHORIZATION_EVIDENCE_RECORD_VERSION,
  REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS,
  buildAlbumProviderAuthorizationReviewPacket,
  reviewAlbumProviderAuthorizationEvidence,
} from '../lib/product/readiness/albumProviderAuthorizationReview';

const stateDir = 'data/fandex-cloud-v10/state';

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(`${stateDir}/${name}`, 'utf8'));
}

function collectionHistoryDates(): readonly string[] {
  const csv = readFileSync(
    `${stateDir}/music_chart_check_history_v1.csv`,
    'utf8',
  ).trim();
  return Object.freeze(
    [...new Set(
      csv.split(/\r?\n/)
        .slice(1)
        .map(line => line.slice(0, 10))
        .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)),
    )].sort(),
  );
}

function latestSnapshotDate(): string {
  const payload = readJson('music_chart_check_history_v1_latest.json') as Record<string, unknown>;
  assert.equal(typeof payload.latestCheckDate, 'string');
  return payload.latestCheckDate as string;
}

function latestSnapshotAsOf(): string {
  return `${latestSnapshotDate()}T23:59:59+09:00`;
}

function compactSnapshotDate(): string {
  return latestSnapshotDate().replaceAll('-', '');
}

const bindings: readonly MusicChartCanonicalBinding[] = Object.freeze([
  { canonicalArtistId: 'iu', artist: '아이유' },
  { canonicalArtistId: 'aespa', artist: '에스파' },
  { canonicalArtistId: 'ateez', artist: '에이티즈' },
  { canonicalArtistId: 'boynextdoor', artist: '보이넥스트도어' },
  { canonicalArtistId: 'ive', artist: '아이브' },
  { canonicalArtistId: 'lesserafim', artist: '르세라핌' },
  { canonicalArtistId: 'newjeans', artist: '뉴진스' },
  { canonicalArtistId: 'seventeen', artist: '세븐틴' },
  { canonicalArtistId: 'straykids', artist: '스트레이키즈' },
  { canonicalArtistId: 'txt', artist: '투모로우바이투게더' },
]);

function musicReadModel(artistId = 'iu'): MusicChartCurrentReadModel {
  const adapted = adaptMusicChartEvidence({
    checkHistoryPayload: readJson('music_chart_check_history_v1_latest.json'),
    melonGeniePayload: readJson('music_chart_artist_candidates_v2_raw_latest.json'),
    bugsPayload: readJson('music_chart_bugs_all_targets_v1_latest.json'),
    bindings,
  });

  const observations = adapted.observations.filter(
    observation => observation.canonicalArtistId === artistId,
  );
  const history = appendMusicChartObservationHistory({
    existing: [],
    observations,
  });

  return buildMusicChartCurrentReadModel({
    history,
    asOf: latestSnapshotAsOf(),
  });
}

function musicInput(artistId = 'iu') {
  const music = musicReadModel(artistId);
  return {
    music,
    musicCurrentness: assessMusicChartCurrentness({
      music,
      collectionHistoryDates: collectionHistoryDates(),
    }),
  };
}

function verifiedMusicIdentityAssessment(artistId = 'iu') {
  const binding = bindings.find(
    candidate => candidate.canonicalArtistId === artistId,
  );
  assert.ok(binding);
  return assessMusicChartSharedCanonicalBindings(
    [binding],
    id => ({
      id,
      collection: { verificationStatus: 'verified' as const },
    }),
  );
}

function productionAuthorizedCircle(): DirectAlbumProviderDescriptor {
  return Object.freeze({
    ...CIRCLE_EVIDENCE_DESCRIPTOR,
    onboarding: Object.freeze({
      ...CIRCLE_EVIDENCE_DESCRIPTOR.onboarding,
      currentStage: 'active' as const,
      enabled: true,
      liveCallsAllowed: true,
      researchAllowed: true,
      productionAllowed: true,
      authorization: Object.freeze({
        acquisitionState: 'allowed' as const,
        automationState: 'allowed' as const,
        rawStorageState: 'allowed-with-conditions' as const,
        normalizedStorageState: 'allowed' as const,
        retentionState: 'allowed' as const,
        commercialUseState: 'allowed' as const,
        derivedPublicationState: 'allowed' as const,
        rawRedistributionState: 'blocked' as const,
      }),
      blockers: Object.freeze([]),
    }),
  });
}

function verifiedAlbumAuthorizationReview(
  provider: DirectAlbumProviderDescriptor,
) {
  const packet =
    buildAlbumProviderAuthorizationReviewPacket(provider);

  const requiredRecords =
    REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS.map(
      dimension => ({
        recordVersion:
          ALBUM_PROVIDER_AUTHORIZATION_EVIDENCE_RECORD_VERSION,
        evidenceId: `rights:${dimension}:fixture`,
        providerId: provider.providerId,
        targetFingerprint: packet.targetFingerprint,
        dimension,
        state: 'allowed' as const,
        evidenceRefs: Object.freeze([
          `contract-or-policy:${dimension}`,
        ]),
        conditionRefs: Object.freeze([]),
        reviewerRef: 'rights-review:fixture',
        reviewedAt: `${latestSnapshotDate()}T20:00:00+09:00`,
      }),
    );

  return reviewAlbumProviderAuthorizationEvidence({
    packet,
    records: [
      ...requiredRecords,
      {
        recordVersion:
          ALBUM_PROVIDER_AUTHORIZATION_EVIDENCE_RECORD_VERSION,
        evidenceId: 'rights:rawStorageState:fixture',
        providerId: provider.providerId,
        targetFingerprint: packet.targetFingerprint,
        dimension: 'rawStorageState',
        state: 'allowed-with-conditions',
        evidenceRefs: Object.freeze([
          'contract-or-policy:rawStorageState',
        ]),
        conditionRefs: Object.freeze([
          'conditions:rawStorageState',
        ]),
        reviewerRef: 'rights-review:fixture',
        reviewedAt: `${latestSnapshotDate()}T20:00:00+09:00`,
      },
      {
        recordVersion:
          ALBUM_PROVIDER_AUTHORIZATION_EVIDENCE_RECORD_VERSION,
        evidenceId: 'rights:rawRedistributionState:fixture',
        providerId: provider.providerId,
        targetFingerprint: packet.targetFingerprint,
        dimension: 'rawRedistributionState',
        state: 'blocked',
        evidenceRefs: Object.freeze([
          'policy:raw-redistribution-blocked',
        ]),
        conditionRefs: Object.freeze([]),
        reviewerRef: 'rights-review:fixture',
        reviewedAt: `${latestSnapshotDate()}T20:00:00+09:00`,
      },
    ],
  });
}

function realPhysicalObservation(provider: DirectAlbumProviderDescriptor) {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: provider.providerId,
    providerObservationId: `circle-retail-${compactSnapshotDate()}-iu-release-1`,
    providerArtistId: 'circle-artist-iu',
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: '8800000000000',
    fandexArtistId: 'iu',
    fandexReleaseId: 'iu-release-1',
    fandexReleaseFamilyId: null,
    semantic: 'period-sale',
    value: 1234,
    unit: 'physical-units',
    territory: 'Korea',
    format: 'physical',
    providerPeriod: `day:${compactSnapshotDate()}`,
    providerPublishedAt: `${latestSnapshotDate()}T13:00:00+09:00`,
    observedAt: `${latestSnapshotDate()}T13:01:00+09:00`,
    collectedAt: `${latestSnapshotDate()}T13:02:00+09:00`,
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'as-known-at-collection',
    scopeRole: 'child-sku',
    parentObservationId: null,
    syntheticFixture: false,
  });
}

function productionHistoryFor(
  observation: ReturnType<typeof realPhysicalObservation>,
) {
  return appendAlbumObservationHistory({
    observations: [observation],
  });
}

function verifiedAlbumCalibrationReview(
  observation: ReturnType<typeof realPhysicalObservation>,
  provider: DirectAlbumProviderDescriptor,
) {
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [observation],
    providers: [provider],
  });
  const target =
    buildAlbumNormalizationCalibrationReviewTarget(
      normalizationInput,
    );
  const covered = target.primaryObservationIds;

  return reviewAlbumNormalizationCalibrationEvidence({
    normalizationInput,
    records: [
      {
        recordVersion:
          ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION,
        evidenceId: 'period-coverage-review:fixture',
        dimension: 'period-coverage',
        targetFingerprint: target.fingerprint,
        coveredObservationIds: covered,
        conclusion: 'verified',
        sourceRef: 'fixture:period-coverage',
        reviewedAt: `${latestSnapshotDate()}T20:00:00+09:00`,
      },
      {
        recordVersion:
          ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION,
        evidenceId: 'release-scope-review:fixture',
        dimension: 'release-scope-completeness',
        targetFingerprint: target.fingerprint,
        coveredObservationIds: covered,
        conclusion: 'verified',
        sourceRef: 'fixture:release-scope',
        reviewedAt: `${latestSnapshotDate()}T20:00:00+09:00`,
      },
      {
        recordVersion:
          ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION,
        evidenceId: 'revision-stability-review:fixture',
        dimension: 'revision-stability',
        targetFingerprint: target.fingerprint,
        coveredObservationIds: covered,
        conclusion: 'verified',
        sourceRef: 'fixture:revision-stability',
        reviewedAt: `${latestSnapshotDate()}T20:00:00+09:00`,
      },
    ],
  });
}

test('actual current state is Music evidence-ready but Album technical-only because Production rights and real observations are absent', () => {
  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [
      CIRCLE_EVIDENCE_DESCRIPTOR,
      HANTEO_EVIDENCE_DESCRIPTOR,
    ],
    albumObservations: [],
    musicCanonicalIdentityIntegration: 'external-binding',
    albumHistoryState: 'research-only',
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.model.components.music.state, 'evidence-ready');
  assert.equal(result.model.components.music.rows.length, 3);
  assert.equal(result.model.components.music.currentness.status, 'current');
  assert.equal(result.model.components.music.currentness.thresholdApplied, false);
  assert.equal(result.model.components.album.state, 'technical-only');
  assert.deepEqual(
    [...result.model.components.album.technicallyQualifiedProviders].sort(),
    ['circle-chart', 'hanteo-chart'],
  );
  assert.deepEqual(result.model.components.album.productionAuthorizedProviders, []);
  assert.equal(
    result.model.components.album.normalizationInput.methodologyDefined,
    true,
  );
  assert.equal(
    result.model.components.album.normalizationInput.inputSetUsable,
    false,
  );
  assert.equal(
    result.model.components.album.normalizationInput.numericNormalizationDefined,
    false,
  );
  assert.equal(
    result.model.components.album.normalizationCalibrationEvidenceDerivation,
    null,
  );
  assert.equal(
    result.model.components.album.releaseScopeReviewPacket.state,
    'insufficient-evidence',
  );
  assert.equal(
    result.model.components.album.releaseScopeReviewPacket.autoVerified,
    false,
  );
  assert.equal(
    result.model.components.album.normalizationCalibration.status,
    'blocked',
  );
  assert.equal(
    result.model.readiness.albumNormalizationMethodologyDesignEligible,
    false,
  );
  assert.ok(
    result.model.components.album.blockers.includes(
      'no-production-authorized-provider',
    ),
  );
  assert.ok(
    result.model.components.album.blockers.includes(
      'no-production-eligible-physical-observation',
    ),
  );

  assert.equal(result.model.readiness.componentEvidenceReady, false);
  assert.equal(result.model.readiness.productContractCandidateReady, false);
  assert.equal(result.model.readiness.numericProductEligible, false);
  assert.equal(result.model.readiness.productActivationReady, false);
  assert.equal(result.model.readiness.productPublicationReady, false);
  assert.equal(result.model.numericProductEligible, false);
  assert.equal(result.model.combinationBoundary.productValue, null);
  assert.equal(result.model.temporalAlignment.state, 'not-evaluable');
  assert.equal(result.model.temporalAlignment.methodologyDefined, true);
});

test('production-grade component evidence still cannot invent a numeric musicAlbumPoint', () => {
  const provider = productionAuthorizedCircle();
  const observation = realPhysicalObservation(provider);

  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [provider],
    albumProviderAuthorizationReviews: [
      verifiedAlbumAuthorizationReview(provider),
    ],
    albumObservations: [observation],
    musicCanonicalIdentityIntegration: 'shared-registry',
    musicCanonicalIdentityBindingAssessment:
      verifiedMusicIdentityAssessment(),
    albumHistoryState: 'production-history-available',
    albumProductionHistory: productionHistoryFor(observation),
    albumNormalizationCalibrationReview:
      verifiedAlbumCalibrationReview(observation, provider),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.model.components.music.state, 'evidence-ready');
  assert.equal(result.model.components.album.state, 'evidence-ready');
  assert.equal(
    result.model.components.album.providers[0]
      .authorizationReview?.productionAuthorizationSatisfied,
    true,
  );
  assert.equal(
    result.model.components.album.providers[0]
      .authorizationReview?.autoAuthorized,
    false,
  );
  assert.equal(
    result.model.components.album.productionHistory?.revisionAware,
    true,
  );
  assert.deepEqual(
    result.model.components.album.productionHistory?.activeObservationIds,
    [observation.observationId],
  );
  assert.equal(
    result.model.components.album.normalizationInput.inputSetUsable,
    true,
  );
  assert.deepEqual(
    result.model.components.album.normalizationInput.primaryCandidateObservationIds,
    [observation.observationId],
  );
  assert.equal(
    result.model.components.album.normalizationInput.crossProviderAdditionAllowed,
    false,
  );
  assert.equal(
    result.model.components.album.normalizationInput.normalizedValue,
    null,
  );
  assert.equal(result.model.readiness.componentEvidenceReady, true);
  assert.equal(result.model.readiness.productContractCandidateReady, true);
  assert.equal(
    result.model.readiness.albumNormalizationMethodologyDesignEligible,
    true,
  );
  assert.equal(
    result.model.components.album.normalizationCalibrationReview
      ?.readyForCalibrationGate,
    true,
  );
  assert.equal(
    result.model.components.album
      .normalizationCalibrationEvidenceDerivation
      ?.candidates.periodCoverage.state,
    'review-candidate',
  );
  assert.equal(
    result.model.components.album
      .normalizationCalibrationEvidenceDerivation
      ?.candidates.revisionStability.state,
    'review-candidate',
  );
  assert.deepEqual(
    result.model.components.album
      .normalizationCalibrationEvidenceDerivation
      ?.autoVerifiedDimensions,
    [],
  );
  assert.deepEqual(
    result.model.components.album
      .normalizationCalibrationEvidenceDerivation
      ?.notAutomaticallyDerivedDimensions,
    ['release-scope-completeness'],
  );
  assert.equal(
    result.model.components.album.releaseScopeReviewPacket.state,
    'reviewable',
  );
  assert.equal(
    result.model.components.album.releaseScopeReviewPacket.autoVerified,
    false,
  );
  assert.equal(
    result.model.components.album.releaseScopeReviewPacket
      .completenessDetermined,
    false,
  );
  assert.equal(
    result.model.components.album.normalizationCalibration.status,
    'eligible-for-methodology-design',
  );
  assert.equal(
    result.model.components.album.normalizationCalibration.numericNormalizationDefined,
    false,
  );
  assert.equal(
    result.model.components.album.normalizationCalibration.calibrationRunAuthorized,
    false,
  );

  assert.equal(result.model.combinationBoundary.rawProviderAdditionAllowed, false);
  assert.equal(result.model.combinationBoundary.rawProviderAverageAllowed, false);
  assert.equal(result.model.combinationBoundary.rankToPhysicalUnitsConversionAllowed, false);
  assert.equal(result.model.combinationBoundary.musicAlbumRawAdditionAllowed, false);
  assert.equal(result.model.combinationBoundary.musicAlbumRawAverageAllowed, false);
  assert.equal(result.model.combinationBoundary.weightingDefined, false);
  assert.equal(result.model.combinationBoundary.normalizationDefined, false);
  assert.equal(result.model.combinationBoundary.temporalAlignmentDefined, true);
  assert.equal(result.model.temporalAlignment.methodologyDefined, true);
  assert.equal(result.model.temporalAlignment.state, 'conditionally-aligned');
  assert.equal(result.model.temporalAlignment.numericCombinationAllowed, false);
  assert.equal(result.model.combinationBoundary.productValue, null);

  assert.equal(result.model.readiness.numericProductEligible, false);
  assert.equal(result.model.readiness.productActivationReady, false);
  assert.equal(result.model.readiness.productPublicationReady, false);
  assert.ok(
    result.model.readiness.activationBlockers.includes(
      'numeric-combination-methodology-not-approved',
    ),
  );
});

test('Album rank/index evidence is rejected as Product component input', () => {
  const provider = productionAuthorizedCircle();
  const physical = realPhysicalObservation(provider);
  const rank = buildDirectAlbumObservation({
    ...physical,
    observationId: undefined,
    evidenceDigest: undefined,
    semantic: 'rank',
    unit: 'rank',
    value: 3,
    providerObservationId: 'circle-rank-2026-09-30-iu',
  });

  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [provider],
    albumProviderAuthorizationReviews: [
      verifiedAlbumAuthorizationReview(provider),
    ],
    albumObservations: [rank],
    musicCanonicalIdentityIntegration: 'shared-registry',
    musicCanonicalIdentityBindingAssessment:
      verifiedMusicIdentityAssessment(),
    albumHistoryState: 'production-history-available',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(result.issues.some(issue => issue.code === 'album-non-physical-semantic'));
});

test('synthetic Album observations are rejected from Product evidence', () => {
  const provider = productionAuthorizedCircle();
  const physical = realPhysicalObservation(provider);
  const synthetic = buildDirectAlbumObservation({
    ...physical,
    observationId: undefined,
    evidenceDigest: undefined,
    syntheticFixture: true,
    providerObservationId: 'synthetic-circle-iu',
  });

  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [provider],
    albumProviderAuthorizationReviews: [
      verifiedAlbumAuthorizationReview(provider),
    ],
    albumObservations: [synthetic],
    musicCanonicalIdentityIntegration: 'shared-registry',
    musicCanonicalIdentityBindingAssessment:
      verifiedMusicIdentityAssessment(),
    albumHistoryState: 'production-history-available',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(result.issues.some(issue => issue.code === 'album-synthetic-observation'));
});

test('Album Product evidence requires canonical artist and release identity', () => {
  const provider = productionAuthorizedCircle();
  const physical = realPhysicalObservation(provider);
  const unresolved = buildDirectAlbumObservation({
    ...physical,
    observationId: undefined,
    evidenceDigest: undefined,
    fandexArtistId: 'aespa',
    fandexReleaseId: null,
    fandexReleaseFamilyId: null,
    providerObservationId: 'circle-wrong-identity',
  });

  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [provider],
    albumProviderAuthorizationReviews: [
      verifiedAlbumAuthorizationReview(provider),
    ],
    albumObservations: [unresolved],
    musicCanonicalIdentityIntegration: 'shared-registry',
    musicCanonicalIdentityBindingAssessment:
      verifiedMusicIdentityAssessment(),
    albumHistoryState: 'production-history-available',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(result.issues.some(issue => issue.code === 'album-artist-identity-mismatch'));
  assert.ok(result.issues.some(issue => issue.code === 'album-release-identity-unresolved'));
});

test('Music missing provider evidence blocks the component instead of becoming zero', () => {
  const full = musicReadModel();
  const missingBugs: MusicChartCurrentReadModel = Object.freeze({
    ...full,
    rows: Object.freeze(full.rows.filter(row => row.platform !== 'bugs')),
  });

  const provider = productionAuthorizedCircle();
  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    music: missingBugs,
    musicCurrentness: assessMusicChartCurrentness({
      music: missingBugs,
      collectionHistoryDates: collectionHistoryDates(),
    }),
    albumProviders: [provider],
    albumProviderAuthorizationReviews: [
      verifiedAlbumAuthorizationReview(provider),
    ],
    albumObservations: [realPhysicalObservation(provider)],
    musicCanonicalIdentityIntegration: 'shared-registry',
    musicCanonicalIdentityBindingAssessment:
      verifiedMusicIdentityAssessment(),
    albumHistoryState: 'production-history-available',
    albumProductionHistory: productionHistoryFor(
      realPhysicalObservation(provider),
    ),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.model.components.music.state, 'blocked');
  assert.ok(result.model.components.music.blockers.includes('missing-platform:bugs'));
  assert.equal(result.model.readiness.componentEvidenceReady, false);
  assert.equal(result.model.readiness.numericProductEligible, false);
});

test('technical qualification never substitutes for Production authorization', () => {
  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [CIRCLE_EVIDENCE_DESCRIPTOR],
    albumObservations: [],
    musicCanonicalIdentityIntegration: 'external-binding',
    albumHistoryState: 'research-only',
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  const provider = result.model.components.album.providers[0];
  assert.equal(provider.nativePeriodSalesQualified, true);
  assert.equal(provider.productionAllowed, false);
  assert.equal(provider.productionAuthorizationSatisfied, false);
  assert.equal(result.model.components.album.state, 'technical-only');
});


test('stale calibration review fingerprint is rejected before calibration', () => {
  const provider = productionAuthorizedCircle();
  const original = realPhysicalObservation(provider);
  const staleReview =
    verifiedAlbumCalibrationReview(original, provider);
  const changed = buildDirectAlbumObservation({
    ...original,
    observationId: undefined,
    evidenceDigest: undefined,
    providerSkuId: '8800000000009',
    providerObservationId: 'circle-changed-sku',
  });

  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [provider],
    albumProviderAuthorizationReviews: [
      verifiedAlbumAuthorizationReview(provider),
    ],
    albumObservations: [changed],
    musicCanonicalIdentityIntegration: 'shared-registry',
    musicCanonicalIdentityBindingAssessment:
      verifiedMusicIdentityAssessment(),
    albumHistoryState: 'production-history-available',
    albumNormalizationCalibrationReview: staleReview,
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(
    result.issues.some(issue =>
      issue.code
        === 'album-normalization-calibration-review-invalid'),
  );
});


test('production history claim without a bound history object is rejected', () => {
  const provider = productionAuthorizedCircle();
  const observation = realPhysicalObservation(provider);

  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [provider],
    albumProviderAuthorizationReviews: [
      verifiedAlbumAuthorizationReview(provider),
    ],
    albumObservations: [observation],
    musicCanonicalIdentityIntegration: 'shared-registry',
    musicCanonicalIdentityBindingAssessment:
      verifiedMusicIdentityAssessment(),
    albumHistoryState: 'production-history-available',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(
    result.issues.some(issue =>
      issue.code === 'album-production-history-missing'),
  );
});

test('Production history must expose the current eligible observation as active at Product as-of time', () => {
  const provider = productionAuthorizedCircle();
  const observation = realPhysicalObservation(provider);
  const different = buildDirectAlbumObservation({
    ...observation,
    observationId: undefined,
    evidenceDigest: undefined,
    providerSkuId: '8800000000999',
    providerObservationId: 'different-history-row',
  });

  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [provider],
    albumProviderAuthorizationReviews: [
      verifiedAlbumAuthorizationReview(provider),
    ],
    albumObservations: [observation],
    musicCanonicalIdentityIntegration: 'shared-registry',
    musicCanonicalIdentityBindingAssessment:
      verifiedMusicIdentityAssessment(),
    albumHistoryState: 'production-history-available',
    albumProductionHistory: appendAlbumObservationHistory({
      observations: [different],
    }),
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(
    result.issues.some(issue =>
      issue.code
        === 'album-production-history-binding-mismatch'),
  );
});


test('raw descriptor authorization without reviewed rights stays technical-only', () => {
  const provider = productionAuthorizedCircle();
  const observation = realPhysicalObservation(provider);

  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [provider],
    albumObservations: [observation],
    musicCanonicalIdentityIntegration: 'shared-registry',
    musicCanonicalIdentityBindingAssessment:
      verifiedMusicIdentityAssessment(),
    albumHistoryState: 'production-history-available',
    albumProductionHistory: productionHistoryFor(observation),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.deepEqual(
    result.model.components.album.productionAuthorizedProviders,
    [],
  );
  assert.equal(
    result.model.components.album.providers[0]
      .productionAuthorizationSatisfied,
    false,
  );
  assert.equal(
    result.model.components.album.providers[0].authorizationReview,
    null,
  );
  assert.equal(
    result.model.components.album.state,
    'technical-only',
  );
  assert.ok(
    result.model.components.album.blockers.includes(
      'no-production-authorized-provider',
    ),
  );
});

test('shared-registry identity claim without a verified binding proof is rejected', () => {
  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [
      CIRCLE_EVIDENCE_DESCRIPTOR,
      HANTEO_EVIDENCE_DESCRIPTOR,
    ],
    albumObservations: [],
    musicCanonicalIdentityIntegration: 'shared-registry',
    albumHistoryState: 'research-only',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(
    result.issues.some(
      issue => issue.code === 'music-canonical-identity-proof-missing',
    ),
  );
});

test('unverified shared-registry identity proof cannot be promoted to Product identity integration', () => {
  const binding = bindings.find(
    candidate => candidate.canonicalArtistId === 'iu',
  );
  assert.ok(binding);
  const assessment = assessMusicChartSharedCanonicalBindings(
    [binding],
    id => ({
      id,
      collection: { verificationStatus: 'needs_verification' as const },
    }),
  );

  const result = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...musicInput(),
    albumProviders: [
      CIRCLE_EVIDENCE_DESCRIPTOR,
      HANTEO_EVIDENCE_DESCRIPTOR,
    ],
    albumObservations: [],
    musicCanonicalIdentityIntegration: 'shared-registry',
    musicCanonicalIdentityBindingAssessment: assessment,
    albumHistoryState: 'research-only',
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(
    result.issues.some(
      issue => issue.code === 'music-canonical-identity-proof-invalid',
    ),
  );
});
