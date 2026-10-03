import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

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
} from '../lib/alternative-evidence/musicChartObservationHistory';
import {
  buildDirectAlbumObservation,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  assessMusicChartCurrentness,
} from '../lib/alternative-evidence/musicChartCurrentness';
import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
  HANTEO_EVIDENCE_DESCRIPTOR,
} from '../lib/alternative-evidence/directProviderEvidence';
import {
  buildProductMusicAlbumPointCandidate,
} from '../lib/product/contracts/productMusicAlbumPointCandidate';
import {
  evaluateMusicAlbumPointProductReadiness,
} from '../lib/product/readiness/musicAlbumPointProductReadiness';

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

function currentMusicReadModel(artistId: string) {
  const adapted = adaptMusicChartEvidence({
    checkHistoryPayload: readJson('music_chart_check_history_v1_latest.json'),
    melonGeniePayload: readJson('music_chart_artist_candidates_v2_raw_latest.json'),
    bugsPayload: readJson('music_chart_bugs_all_targets_v1_latest.json'),
    bindings,
  });

  const artistObservations = adapted.observations.filter(
    observation => observation.canonicalArtistId === artistId,
  );

  const history = appendMusicChartObservationHistory({
    existing: [],
    observations: artistObservations,
  });

  return buildMusicChartCurrentReadModel({
    history,
    asOf: latestSnapshotAsOf(),
  });
}

function currentMusicInput(artistId: string) {
  const music = currentMusicReadModel(artistId);
  return {
    music,
    musicCurrentness: assessMusicChartCurrentness({
      music,
      collectionHistoryDates: collectionHistoryDates(),
    }),
  };
}

function currentCanonicalIdentityAssessment() {
  return assessMusicChartSharedCanonicalBindings(bindings);
}

test('current IU evidence builds a shadow Product contract without a score', () => {
  const candidate = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...currentMusicInput('iu'),
    albumObservations: [],
    albumProviders: [
      CIRCLE_EVIDENCE_DESCRIPTOR,
      HANTEO_EVIDENCE_DESCRIPTOR,
    ],
    musicCanonicalIdentityIntegration: 'external-binding',
    musicCanonicalIdentityBindingAssessment:
      currentCanonicalIdentityAssessment(),
    albumHistoryState: 'research-only',
  });

  assert.equal(candidate.status, 'ok');
  if (candidate.status !== 'ok') return;

  assert.equal(candidate.model.identity.legacyVariableId, 'musicAlbumPoint');
  assert.equal(candidate.model.components.music.rows.length, 3);
  assert.deepEqual(
    new Set(candidate.model.components.music.rows.map(row => row.platform)),
    new Set(['melon', 'genie', 'bugs']),
  );
  assert.equal(candidate.model.components.album.observations.length, 0);
  assert.equal(candidate.model.components.album.providers.length, 2);
  assert.equal(candidate.model.combinationBoundary.productValue, null);
  assert.equal(candidate.model.numericProductEligible, false);
  assert.equal('score' in candidate.model, false);
  assert.equal('point' in candidate.model, false);
});

test('current actual readiness is blocked for explicit unresolved gates', () => {
  const candidate = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...currentMusicInput('iu'),
    albumObservations: [],
    albumProviders: [
      CIRCLE_EVIDENCE_DESCRIPTOR,
      HANTEO_EVIDENCE_DESCRIPTOR,
    ],
    musicCanonicalIdentityIntegration: 'external-binding',
    musicCanonicalIdentityBindingAssessment:
      currentCanonicalIdentityAssessment(),
    albumHistoryState: 'research-only',
  });

  const readiness = evaluateMusicAlbumPointProductReadiness(candidate);

  assert.equal(readiness.status, 'blocked');
  assert.equal(readiness.checks['product-contract-valid'], true);
  assert.equal(readiness.checks['music-platform-coverage'], true);
  assert.equal(readiness.checks['music-status-semantics'], true);
  assert.equal(readiness.checks['album-provider-technical-qualified'], true);
  assert.equal(readiness.checks['no-raw-cross-semantic-combination'], true);
  assert.equal(readiness.checks['shadow-publication-boundary'], true);
  assert.equal(readiness.checks['no-preview-fallback'], true);

  assert.equal(readiness.checks['music-canonical-identity-integrated'], false);
  assert.equal(candidate.status, 'ok');
  if (candidate.status !== 'ok') return;
  assert.equal(
    candidate.model.components.music.canonicalIdentityBindingAssessment
      ?.productCanonicalIdentityIntegrated,
    false,
  );
  assert.ok(
    (candidate.model.components.music.canonicalIdentityBindingAssessment
      ?.blockers.length ?? 0) > 0,
  );
  assert.equal(readiness.checks['music-freshness-policy-defined'], true);
  assert.equal(readiness.checks['music-currentness-usable'], true);
  assert.equal(readiness.checks['album-real-physical-observation'], false);
  assert.equal(readiness.checks['album-release-identity-resolved'], false);
  assert.equal(readiness.checks['album-history-production-grade'], false);
  assert.equal(
    readiness.checks['album-rights-review-contract-defined'],
    true,
  );
  assert.equal(readiness.checks['album-rights-authorized'], false);
  assert.equal(
    readiness.checks['album-normalization-input-contract-defined'],
    true,
  );
  assert.equal(
    readiness.checks['album-normalization-input-usable'],
    false,
  );
  assert.equal(
    readiness.checks['album-normalization-calibration-gate-defined'],
    true,
  );
  assert.equal(
    readiness.checks['album-normalization-calibration-review-evidence-ready'],
    false,
  );
  assert.equal(
    readiness.checks['album-normalization-calibration-eligible'],
    false,
  );
  assert.equal(readiness.checks['album-normalization-defined'], false);
  assert.equal(
    readiness.checks['cross-component-temporal-alignment-defined'],
    true,
  );
  assert.equal(
    readiness.checks['cross-component-temporal-alignment-usable'],
    false,
  );
  assert.equal(readiness.checks['numeric-output-methodology-defined'], false);

  assert.deepEqual(
    new Set(readiness.blockers),
    new Set([
      'music-canonical-identity-integrated',
      'album-real-physical-observation',
      'album-release-identity-resolved',
      'album-history-production-grade',
      'album-rights-authorized',
      'album-normalization-input-usable',
      'album-normalization-calibration-review-evidence-ready',
      'album-normalization-calibration-eligible',
      'album-normalization-defined',
      'cross-component-temporal-alignment-usable',
      'numeric-output-methodology-defined',
    ]),
  );

  assert.equal(readiness.productValue, null);
  assert.equal(readiness.numericProductEligible, false);
  assert.equal(readiness.directProductionContributionEligible, false);
  assert.equal(readiness.productActivationAuthorized, false);
  assert.equal(readiness.productPublicationAuthorized, false);
});

test('Music rank and Album physical units remain separate component semantics', () => {
  const candidate = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...currentMusicInput('iu'),
    albumObservations: [],
    albumProviders: [CIRCLE_EVIDENCE_DESCRIPTOR],
    musicCanonicalIdentityIntegration: 'external-binding',
    albumHistoryState: 'absent',
  });

  assert.equal(candidate.status, 'ok');
  if (candidate.status !== 'ok') return;

  assert.equal(candidate.model.components.music.rankSemantic, 'ordinal-chart-position');
  assert.equal(candidate.model.components.album.physicalUnitSemantic, 'physical-units');
  assert.equal(
    candidate.model.components.album.normalizationInput.methodologyDefined,
    true,
  );
  assert.equal(
    candidate.model.components.album.normalizationInput.rawProviderAdditionAllowed,
    false,
  );
  assert.equal(
    candidate.model.components.album.normalizationInput.numericNormalizationDefined,
    false,
  );
  assert.equal(
    candidate.model.components.album.normalizationCalibrationReview,
    null,
  );
  assert.equal(
    candidate.model.components.album.normalizationCalibration.status,
    'blocked',
  );
  assert.equal(
    candidate.model.components.album.normalizationCalibration.arbitraryThresholdDefined,
    false,
  );
  assert.equal(
    candidate.model.components.album.normalizationCalibration.minimumHistoryLengthDefined,
    false,
  );
  assert.equal(candidate.model.combinationBoundary.rankToPhysicalUnitsConversionAllowed, false);
  assert.equal(candidate.model.combinationBoundary.musicAlbumRawAdditionAllowed, false);
  assert.equal(candidate.model.combinationBoundary.musicAlbumRawAverageAllowed, false);
  assert.equal(candidate.model.combinationBoundary.weightingDefined, false);
  assert.equal(candidate.model.combinationBoundary.normalizationDefined, false);
  assert.equal(candidate.model.combinationBoundary.temporalAlignmentDefined, true);
  assert.equal(candidate.model.temporalAlignment.methodologyDefined, true);
  assert.equal(candidate.model.temporalAlignment.state, 'not-evaluable');
});

test('synthetic Album observation cannot enter the Product contract candidate', () => {
  const synthetic = buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: 'synthetic-1',
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: '8800000000000',
    fandexArtistId: 'iu',
    fandexReleaseId: 'release-iu-1',
    fandexReleaseFamilyId: null,
    semantic: 'period-sale',
    value: 100,
    unit: 'physical-units',
    territory: null,
    format: null,
    providerPeriod: 'day:2026-09-30',
    providerPublishedAt: null,
    observedAt: '2026-09-30T00:00:00+09:00',
    collectedAt: '2026-09-30T12:00:00+09:00',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'current-research',
    scopeRole: 'standalone',
    parentObservationId: null,
    syntheticFixture: true,
  });

  const candidate = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...currentMusicInput('iu'),
    albumObservations: [synthetic],
    albumProviders: [CIRCLE_EVIDENCE_DESCRIPTOR],
    musicCanonicalIdentityIntegration: 'external-binding',
    albumHistoryState: 'research-only',
  });

  assert.equal(candidate.status, 'data-issue');
  if (candidate.status !== 'data-issue') return;
  assert.ok(
    candidate.issues.some(issue => issue.code === 'album-synthetic-observation'),
  );
});

test('rank/index Album evidence cannot masquerade as physical sales', () => {
  const rankObservation = buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: 'rank-1',
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: null,
    fandexArtistId: 'iu',
    fandexReleaseId: 'release-iu-1',
    fandexReleaseFamilyId: null,
    semantic: 'rank',
    value: 3,
    unit: 'rank',
    territory: null,
    format: null,
    providerPeriod: 'day:2026-09-30',
    providerPublishedAt: null,
    observedAt: '2026-09-30T00:00:00+09:00',
    collectedAt: '2026-09-30T12:00:00+09:00',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'current-research',
    scopeRole: 'standalone',
    parentObservationId: null,
    syntheticFixture: false,
  });

  const candidate = buildProductMusicAlbumPointCandidate({
    artistId: 'iu',
    ...currentMusicInput('iu'),
    albumObservations: [rankObservation],
    albumProviders: [CIRCLE_EVIDENCE_DESCRIPTOR],
    musicCanonicalIdentityIntegration: 'external-binding',
    albumHistoryState: 'research-only',
  });

  assert.equal(candidate.status, 'data-issue');
  if (candidate.status !== 'data-issue') return;
  assert.ok(
    candidate.issues.some(issue => issue.code === 'album-non-physical-semantic'),
  );
});
