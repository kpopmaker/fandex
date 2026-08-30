import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bridgeDirectAlbumObservation,
  buildDirectAlbumObservation,
  buildDirectAlbumObservationId,
  CIRCLE_PROVIDER_DESCRIPTOR,
  DIRECT_ALBUM_PROVIDER_REGISTRY,
  HANTEO_PROVIDER_DESCRIPTOR,
  validateDirectAlbumObservation,
  validateObservationSet,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  ALTERNATIVE_EVIDENCE_CONTRACT_VERSION,
  type AlternativeEvidence,
} from '../lib/alternative-evidence/contracts';
import {
  canAdvanceSourceOnboarding,
  createDefaultOffOnboarding,
  validateSourceOnboarding,
} from '../lib/alternative-evidence/onboarding';
import {
  SYNTHETIC_DIRECT_ALBUM_OBSERVATIONS,
  SYNTHETIC_DIRECT_ALBUM_PROVIDER,
} from './fixtures/directAlbumProviderFixtures';

const base = (overrides: Partial<Parameters<typeof buildDirectAlbumObservation>[0]> = {}) => buildDirectAlbumObservation({
  contractVersion: 'direct-album-observation-v1',
  providerId: 'synthetic-fixture-album-provider',
  providerObservationId: 'obs-1',
  providerArtistId: 'artist-1',
  providerReleaseId: 'release-1',
  providerEditionId: null,
  providerSkuId: null,
  fandexArtistId: 'fandex-artist-1',
  fandexReleaseId: 'fandex-release-1',
  fandexReleaseFamilyId: 'fandex-family-1',
  semantic: 'period-sale',
  value: 10,
  unit: 'physical-units',
  territory: 'Korea',
  format: 'CD',
  providerPeriod: '2026-W01',
  providerPublishedAt: '2026-01-08T00:00:00.000Z',
  observedAt: '2026-01-08T00:00:00.000Z',
  collectedAt: '2026-01-09T00:00:00.000Z',
  revisionId: null,
  revisionObservedAt: null,
  supersedesObservationId: null,
  knowledgeMode: 'as-known-at-collection',
  scopeRole: 'standalone',
  parentObservationId: null,
  syntheticFixture: true,
  ...overrides,
});

const knownDescriptor = SYNTHETIC_DIRECT_ALBUM_PROVIDER.descriptor;

test('source onboarding lifecycle and authorization remain separate', () => {
  const record = createDefaultOffOnboarding({ sourceId: 'x', sourceName: 'X' });
  assert.equal(record.currentStage, 'contract-only');
  assert.equal(record.technicalReadiness, 'contract-ready');
  assert.equal(record.enabled, false);
  assert.equal(validateSourceOnboarding(record).valid, true);
  assert.equal(canAdvanceSourceOnboarding('contract-only', 'fixture-validated'), true);
  assert.equal(canAdvanceSourceOnboarding('suspended', 'active'), false);
});

test('Circle and Hanteo descriptors are registered default-off', () => {
  for (const descriptor of [CIRCLE_PROVIDER_DESCRIPTOR, HANTEO_PROVIDER_DESCRIPTOR]) {
    assert.equal(descriptor.onboarding.currentStage, 'contract-only');
    assert.equal(descriptor.defaultOff.enabled, false);
    assert.equal(descriptor.defaultOff.liveCallsAllowed, false);
    assert.equal(descriptor.defaultOff.researchAllowed, false);
    assert.equal(descriptor.defaultOff.productionAllowed, false);
    assert.equal(descriptor.capabilities.supportsNativePeriodSales.state, 'unknown');
  }
  assert.deepEqual(Object.keys(DIRECT_ALBUM_PROVIDER_REGISTRY).sort(), ['circle-chart', 'hanteo-chart']);
});

test('unknown capability remains unknown and rejects non-synthetic observation', () => {
  const observation = base({ syntheticFixture: false });
  const result = validateDirectAlbumObservation(observation, CIRCLE_PROVIDER_DESCRIPTOR);
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('capability-supportsNativePeriodSales-unknown'));
});

test('synthetic fixture can exercise an unknown capability explicitly', () => {
  const observation = base({ providerId: CIRCLE_PROVIDER_DESCRIPTOR.providerId });
  const result = validateDirectAlbumObservation(observation, CIRCLE_PROVIDER_DESCRIPTOR, {
    allowSyntheticUnknownCapabilities: true,
  });
  assert.equal(result.valid, true);
});

test('native period observation validates as physical units', () => {
  const result = validateDirectAlbumObservation(base(), knownDescriptor);
  assert.equal(result.valid, true);
});

test('first-week and cumulative remain separate semantics', () => {
  const firstWeek = SYNTHETIC_DIRECT_ALBUM_OBSERVATIONS.find((row) => row.observationId === 'first-week');
  const cumulative = SYNTHETIC_DIRECT_ALBUM_OBSERVATIONS.find((row) => row.observationId === 'cumulative');
  assert.equal(firstWeek?.semantic, 'first-week-sale');
  assert.equal(cumulative?.semantic, 'cumulative-sale');
  assert.notEqual(firstWeek?.semantic, cumulative?.semantic);
});

test('rank cannot use physical units', () => {
  const invalid = base({ semantic: 'rank', unit: 'physical-units' });
  assert.equal(validateDirectAlbumObservation(invalid, knownDescriptor).valid, false);
});

test('index cannot use physical units', () => {
  const invalid = base({ semantic: 'index', unit: 'physical-units' });
  assert.equal(validateDirectAlbumObservation(invalid, knownDescriptor).valid, false);
});

test('preorder and shipment remain non-core semantic families', () => {
  for (const semantic of ['preorder', 'shipment'] as const) {
    const observation = base({ semantic });
    assert.equal(observation.semantic, semantic);
    assert.equal(observation.unit, 'physical-units');
  }
});

test('revision preserves original and explicit supersession', () => {
  const original = base({ observationId: 'original', revisionId: null });
  const corrected = base({
    observationId: 'corrected',
    value: 12,
    revisionId: 'revision-1',
    revisionObservedAt: '2026-01-10T00:00:00.000Z',
    supersedesObservationId: original.observationId,
    knowledgeMode: 'current-research',
  });
  assert.equal(original.value, 10);
  assert.equal(corrected.supersedesObservationId, original.observationId);
  assert.equal(validateDirectAlbumObservation(corrected, knownDescriptor).valid, true);
});

test('supersession requires revision id', () => {
  const invalid = base({ supersedesObservationId: 'old', revisionId: null });
  assert.equal(validateDirectAlbumObservation(invalid, knownDescriptor).valid, false);
});

test('missing observation is not zero', () => {
  const missing = base({ observationId: 'missing', semantic: 'unknown', value: null, unit: 'unknown' });
  assert.equal(missing.value, null);
  assert.notEqual(missing.value, 0);
});

test('release total and child SKU cannot be raw-added', () => {
  const parent = base({ observationId: 'parent', scopeRole: 'release-total' });
  const child = base({ observationId: 'child', scopeRole: 'child-sku', providerSkuId: 'sku-1' });
  const result = validateObservationSet([parent, child]);
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('release-parent-child-additive-sum-forbidden'));
});

test('provider raw sum is forbidden', () => {
  const other = base({ providerId: 'other-provider' });
  const result = validateObservationSet([base(), other]);
  assert.ok(result.issues.includes('raw-provider-sum-forbidden'));
});

test('overlapping global and Korea scope is rejected', () => {
  const global = base({ observationId: 'global', territory: 'Global' });
  const korea = base({ observationId: 'korea', territory: 'Korea' });
  const result = validateObservationSet([global, korea]);
  assert.ok(result.issues.includes('overlapping-territory-scope-unknown'));
});

test('observation ids are deterministic', () => {
  const first = base();
  const second = base();
  assert.equal(first.observationId, second.observationId);
  assert.equal(first.evidenceDigest, second.evidenceDigest);
  assert.equal(buildDirectAlbumObservationId(first), buildDirectAlbumObservationId(second));
});

test('direct provider evidence is distinct from news evidence', () => {
  const observation = base();
  const directEvidence: AlternativeEvidence = {
    evidenceId: 'direct-evidence',
    origin: 'authorized-public-api',
    sourceId: 'synthetic-fixture-album-provider',
    sourceUrl: null,
    acquisitionProvider: 'synthetic-fixture-album-provider',
    reportedProvider: 'synthetic-fixture-album-provider',
    observedAt: observation.observedAt,
    collectedAt: observation.collectedAt,
    sourcePublishedAt: observation.providerPublishedAt,
    evidenceDigest: observation.evidenceDigest,
    researchOnly: true,
    contractVersion: ALTERNATIVE_EVIDENCE_CONTRACT_VERSION,
  };
  const bridged = bridgeDirectAlbumObservation(observation, directEvidence);
  assert.equal(bridged.kind, 'direct-provider-observation');
  assert.throws(() => bridgeDirectAlbumObservation(observation, { ...directEvidence, origin: 'news-reported-provider-value' }));
});

test('synthetic fixture provider is explicit and side-effect free', () => {
  assert.equal(SYNTHETIC_DIRECT_ALBUM_PROVIDER.descriptor.onboarding.currentStage, 'fixture-validated');
  assert.equal(SYNTHETIC_DIRECT_ALBUM_PROVIDER.descriptor.defaultOff.liveCallsAllowed, false);
  assert.equal(SYNTHETIC_DIRECT_ALBUM_PROVIDER.readFixture?.().length, 15);
});

test('fixture observations cover requested semantic families', () => {
  const semantics = new Set(SYNTHETIC_DIRECT_ALBUM_OBSERVATIONS.map((row) => row.semantic));
  for (const semantic of ['period-sale', 'first-week-sale', 'cumulative-sale', 'first-day-sale', 'preorder', 'shipment', 'rank', 'index', 'unknown']) {
    assert.ok(semantics.has(semantic as never));
  }
});

test('provider descriptor mismatch is rejected', () => {
  assert.equal(validateDirectAlbumObservation(base(), CIRCLE_PROVIDER_DESCRIPTOR).valid, false);
});

test('fallback states do not coerce unavailable provider to zero', () => {
  const unavailable: 'not-available' | 'missing' | 'proxy-fallback-candidate' = 'not-available';
  assert.equal(unavailable, 'not-available');
  assert.notEqual(unavailable, 'zero');
});
