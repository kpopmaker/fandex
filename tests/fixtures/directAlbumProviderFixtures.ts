import {
  buildDirectAlbumObservation,
  createDefaultOffProviderDescriptor,
  knownCapability,
  type DirectAlbumObservation,
  type DirectAlbumProvider,
  type DirectAlbumProviderCapabilities,
} from '../../lib/alternative-evidence/directAlbumProvider';
import { createDefaultOffOnboarding } from '../../lib/alternative-evidence/onboarding';

const FIXTURE_DATE = '2026-01-01T00:00:00.000Z';
const FIXTURE_PROVIDER_ID = 'synthetic-fixture-album-provider';

const ALL_CAPABILITIES: DirectAlbumProviderCapabilities = Object.freeze({
  supportsNativePeriodSales: knownCapability('true', ['synthetic-fixture']),
  supportsFirstWeekSales: knownCapability('true', ['synthetic-fixture']),
  supportsCumulativeSales: knownCapability('true', ['synthetic-fixture']),
  supportsHistoricalQueries: knownCapability('true', ['synthetic-fixture']),
  supportsRevisions: knownCapability('true', ['synthetic-fixture']),
  supportsArtistIdentity: knownCapability('true', ['synthetic-fixture']),
  supportsReleaseIdentity: knownCapability('true', ['synthetic-fixture']),
  supportsEditionIdentity: knownCapability('true', ['synthetic-fixture']),
  supportsSkuIdentity: knownCapability('true', ['synthetic-fixture']),
  supportsFormatIdentity: knownCapability('true', ['synthetic-fixture']),
  supportsTerritorySegmentation: knownCapability('true', ['synthetic-fixture']),
});

function fixture(input: Partial<DirectAlbumObservation> & Pick<DirectAlbumObservation, 'observationId' | 'semantic' | 'value' | 'unit'>): DirectAlbumObservation {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: FIXTURE_PROVIDER_ID,
    providerObservationId: input.observationId,
    providerArtistId: input.providerArtistId ?? 'fixture-artist-1',
    providerReleaseId: input.providerReleaseId ?? 'fixture-release-1',
    providerEditionId: input.providerEditionId ?? null,
    providerSkuId: input.providerSkuId ?? null,
    fandexArtistId: input.fandexArtistId ?? 'fandex-artist-candidate-1',
    fandexReleaseId: input.fandexReleaseId ?? 'fandex-release-candidate-1',
    fandexReleaseFamilyId: input.fandexReleaseFamilyId ?? 'fandex-family-1',
    territory: input.territory ?? 'Korea',
    format: input.format ?? 'CD',
    providerPeriod: input.providerPeriod ?? '2026-01-01/2026-01-07',
    providerPublishedAt: input.providerPublishedAt ?? FIXTURE_DATE,
    observedAt: input.observedAt ?? FIXTURE_DATE,
    collectedAt: input.collectedAt ?? FIXTURE_DATE,
    revisionId: input.revisionId ?? null,
    revisionObservedAt: input.revisionObservedAt ?? null,
    supersedesObservationId: input.supersedesObservationId ?? null,
    knowledgeMode: input.knowledgeMode ?? 'as-known-at-collection',
    scopeRole: input.scopeRole ?? 'standalone',
    parentObservationId: input.parentObservationId ?? null,
    syntheticFixture: true,
    ...input,
  });
}

export const SYNTHETIC_DIRECT_ALBUM_OBSERVATIONS: readonly DirectAlbumObservation[] = Object.freeze([
  fixture({ observationId: 'period-sale', semantic: 'period-sale', value: 100000, unit: 'physical-units' }),
  fixture({ observationId: 'first-week', semantic: 'first-week-sale', value: 120000, unit: 'physical-units' }),
  fixture({ observationId: 'cumulative', semantic: 'cumulative-sale', value: 300000, unit: 'physical-units' }),
  fixture({ observationId: 'first-day', semantic: 'first-day-sale', value: 20000, unit: 'physical-units' }),
  fixture({ observationId: 'preorder', semantic: 'preorder', value: 50000, unit: 'physical-units' }),
  fixture({ observationId: 'shipment', semantic: 'shipment', value: 70000, unit: 'physical-units' }),
  fixture({ observationId: 'rank', semantic: 'rank', value: 1, unit: 'rank' }),
  fixture({ observationId: 'index', semantic: 'index', value: 900, unit: 'provider-index' }),
  fixture({
    observationId: 'cumulative-correction',
    semantic: 'cumulative-sale',
    value: 310000,
    unit: 'physical-units',
    revisionId: 'revision-1',
    revisionObservedAt: '2026-01-10T00:00:00.000Z',
    supersedesObservationId: 'cumulative',
    knowledgeMode: 'current-research',
  }),
  fixture({ observationId: 'missing', semantic: 'unknown', value: null, unit: 'unknown' }),
  fixture({ observationId: 'release-total', semantic: 'period-sale', value: 100000, unit: 'physical-units', scopeRole: 'release-total' }),
  fixture({ observationId: 'child-sku-a', semantic: 'period-sale', value: 60000, unit: 'physical-units', scopeRole: 'child-sku', providerSkuId: 'fixture-sku-a' }),
  fixture({ observationId: 'territory-global', semantic: 'period-sale', value: 150000, unit: 'physical-units', territory: 'Global' }),
  fixture({ observationId: 'unresolved-release', semantic: 'period-sale', value: 1000, unit: 'physical-units', fandexReleaseId: null, providerReleaseId: null }),
  fixture({ observationId: 'edition-version', semantic: 'period-sale', value: 25000, unit: 'physical-units', providerEditionId: 'fixture-edition-1', format: 'kit' }),
]);

export const SYNTHETIC_DIRECT_ALBUM_PROVIDER: DirectAlbumProvider = Object.freeze({
  descriptor: Object.freeze({
    ...createDefaultOffProviderDescriptor({
      providerId: FIXTURE_PROVIDER_ID,
      providerName: 'Synthetic Direct Album Provider',
      capabilities: ALL_CAPABILITIES,
      evidenceIds: ['synthetic-fixture'],
    }),
    onboarding: createDefaultOffOnboarding({
      sourceId: FIXTURE_PROVIDER_ID,
      sourceName: 'Synthetic Direct Album Provider',
      stage: 'fixture-validated',
      technicalReadiness: 'fixture-ready',
      evidenceIds: ['synthetic-fixture'],
    }),
  }),
  readFixture: () => SYNTHETIC_DIRECT_ALBUM_OBSERVATIONS,
});
