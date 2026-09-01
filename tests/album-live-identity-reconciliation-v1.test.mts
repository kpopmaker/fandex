import test from 'node:test';
import assert from 'node:assert/strict';

import { artistUniverseV4 } from '../app/data/v4/artistUniverse';
import { buildAlbumCollectorPlan } from '../lib/server/ingestion/albumCollectorPlan';
import {
  runAlbumBoundedResearch,
  type AlbumBoundedResearchAuthorization,
} from '../lib/server/ingestion/albumBoundedResearchOrchestrator';
import {
  createAlbumProviderFixtureExecutor,
  type AlbumProviderFixturePacket,
} from '../lib/server/ingestion/albumProviderExecutorBinding';
import {
  buildAlbumArtistCatalogFromUniverse,
  createCircleRetailLiveIdentityResolver,
  createHanteoLiveIdentityResolver,
  findAlbumArtistCandidates,
  reconcileAlbumLiveIdentity,
  type AlbumLiveIdentityRegistry,
} from '../lib/server/ingestion/albumLiveIdentityReconciliation';

const catalog = buildAlbumArtistCatalogFromUniverse(artistUniverseV4);

function registry(overrides: Partial<AlbumLiveIdentityRegistry> = {}): AlbumLiveIdentityRegistry {
  return Object.freeze({
    artists: catalog,
    reviewedArtistMappings: Object.freeze([]),
    reviewedReleaseMappings: Object.freeze([]),
    ...overrides,
  });
}

function enabledFixtureAuthorization(): AlbumBoundedResearchAuthorization {
  return Object.freeze({
    boundedResearchImplementationAuthorized: true,
    fixtureExecutionAuthorized: true,
    liveNetworkExecutionAuthorized: false,
    liveNetworkGrantDigest: null,
    globalEnabled: true,
    providerEnabled: Object.freeze({
      'circle-retail': true,
      hanteo: true,
    }),
    persistenceAuthorized: false,
    scheduleMutationAuthorized: false,
    environmentMutationAuthorized: false,
  });
}

const nmixxArtistMapping = Object.freeze({
  provider: 'circle-retail' as const,
  providerArtistId: null,
  providerArtistText: 'NMIXX',
  fandexArtistId: 'nmixx',
  reviewState: 'human-reviewed' as const,
  evidenceIds: Object.freeze(['identity-review:test:nmixx-circle']),
});

const nmixxCircleReleaseMapping = Object.freeze({
  provider: 'circle-retail' as const,
  providerReleaseId: null,
  providerSkuId: '8800000000000',
  providerReleaseText: 'TEST ALBUM',
  fandexArtistId: 'nmixx',
  fandexReleaseId: 'release:test:nmixx:test-album',
  fandexReleaseFamilyId: 'release-family:test:nmixx:test-album',
  reviewState: 'human-reviewed' as const,
  evidenceIds: Object.freeze(['identity-review:test:nmixx-circle-release']),
});

const nmixxHanteoArtistMapping = Object.freeze({
  provider: 'hanteo' as const,
  providerArtistId: '77',
  providerArtistText: 'NMIXX',
  fandexArtistId: 'nmixx',
  reviewState: 'provider-verified' as const,
  evidenceIds: Object.freeze(['identity-review:test:nmixx-hanteo']),
});

const nmixxHanteoReleaseMapping = Object.freeze({
  provider: 'hanteo' as const,
  providerReleaseId: '9001',
  providerSkuId: null,
  providerReleaseText: 'TEST ALBUM',
  fandexArtistId: 'nmixx',
  fandexReleaseId: 'release:test:nmixx:test-album',
  fandexReleaseFamilyId: 'release-family:test:nmixx:test-album',
  reviewState: 'provider-verified' as const,
  evidenceIds: Object.freeze(['identity-review:test:nmixx-hanteo-release']),
});

test('artistUniverseV4 feeds exact alias candidates but does not auto-resolve identity', () => {
  assert.deepEqual(findAlbumArtistCandidates('NMIXX', catalog), ['nmixx']);
  assert.deepEqual(findAlbumArtistCandidates('nmixx', catalog), ['nmixx']);
  assert.deepEqual(findAlbumArtistCandidates('NMIX', catalog), []);

  const result = reconcileAlbumLiveIdentity({
    provider: 'circle-retail',
    providerArtistId: null,
    providerReleaseId: null,
    providerSkuId: '8800000000000',
    rawArtistText: 'NMIXX',
    rawReleaseText: 'TEST ALBUM',
  }, registry());

  assert.equal(result.audit.status, 'artist-candidate-only');
  assert.equal(result.resolution.fandexArtistId, 'nmixx');
  assert.equal(result.resolution.artistResolutionState, 'candidate');
  assert.equal(result.resolution.artistReviewState, 'machine-candidate');
  assert.equal(result.resolution.fandexReleaseId, null);
});

test('ambiguous exact aliases remain ambiguous and never select a winner', () => {
  const result = reconcileAlbumLiveIdentity({
    provider: 'circle-retail',
    providerArtistId: null,
    providerReleaseId: null,
    providerSkuId: '1',
    rawArtistText: 'SAME',
    rawReleaseText: 'ALBUM',
  }, registry({
    artists: Object.freeze([
      Object.freeze({ fandexArtistId: 'a', canonicalName: 'Artist A', aliases: Object.freeze(['SAME']) }),
      Object.freeze({ fandexArtistId: 'b', canonicalName: 'Artist B', aliases: Object.freeze(['SAME']) }),
    ]),
  }));

  assert.equal(result.audit.status, 'ambiguous');
  assert.deepEqual(result.audit.artistCandidateIds, ['a', 'b']);
  assert.equal(result.resolution.fandexArtistId, null);
});

test('Circle resolves only when reviewed artist and release mappings both match', () => {
  const result = reconcileAlbumLiveIdentity({
    provider: 'circle-retail',
    providerArtistId: null,
    providerReleaseId: null,
    providerSkuId: '8800000000000',
    rawArtistText: 'NMIXX',
    rawReleaseText: 'TEST ALBUM',
  }, registry({
    reviewedArtistMappings: Object.freeze([nmixxArtistMapping]),
    reviewedReleaseMappings: Object.freeze([nmixxCircleReleaseMapping]),
  }));

  assert.equal(result.audit.status, 'resolved');
  assert.equal(result.resolution.fandexArtistId, 'nmixx');
  assert.equal(result.resolution.fandexReleaseId, 'release:test:nmixx:test-album');
  assert.equal(result.resolution.artistResolutionState, 'resolved');
  assert.equal(result.resolution.releaseResolutionState, 'resolved');
  assert.equal(result.resolution.artistReviewState, 'human-reviewed');
  assert.equal(result.resolution.releaseReviewState, 'human-reviewed');
  assert.equal(result.resolution.evidenceIds.length, 2);
});

test('reviewed artist alone stops at release-review-required', () => {
  const result = reconcileAlbumLiveIdentity({
    provider: 'circle-retail',
    providerArtistId: null,
    providerReleaseId: null,
    providerSkuId: '8800000000000',
    rawArtistText: 'NMIXX',
    rawReleaseText: 'UNMAPPED ALBUM',
  }, registry({
    reviewedArtistMappings: Object.freeze([nmixxArtistMapping]),
  }));

  assert.equal(result.audit.status, 'release-review-required');
  assert.equal(result.resolution.fandexArtistId, 'nmixx');
  assert.equal(result.resolution.artistResolutionState, 'resolved');
  assert.equal(result.resolution.fandexReleaseId, null);
  assert.equal(result.resolution.releaseResolutionState, 'review-required');
});

test('Hanteo stable artistIdx and targetIdx reviewed mappings resolve without using Album Index', () => {
  const result = reconcileAlbumLiveIdentity({
    provider: 'hanteo',
    providerArtistId: '77',
    providerReleaseId: '9001',
    providerSkuId: null,
    rawArtistText: 'NMIXX',
    rawReleaseText: 'TEST ALBUM',
  }, registry({
    reviewedArtistMappings: Object.freeze([nmixxHanteoArtistMapping]),
    reviewedReleaseMappings: Object.freeze([nmixxHanteoReleaseMapping]),
  }));

  assert.equal(result.audit.status, 'resolved');
  assert.equal(result.resolution.fandexArtistId, 'nmixx');
  assert.equal(result.resolution.fandexReleaseId, 'release:test:nmixx:test-album');
  assert.equal(result.resolution.artistReviewState, 'provider-verified');
  assert.equal(result.resolution.releaseReviewState, 'provider-verified');
});

test('artist and release mappings pointing to different FANDEX artists fail conflicting', () => {
  const result = reconcileAlbumLiveIdentity({
    provider: 'hanteo',
    providerArtistId: '77',
    providerReleaseId: '9001',
    providerSkuId: null,
    rawArtistText: 'NMIXX',
    rawReleaseText: 'TEST ALBUM',
  }, registry({
    reviewedArtistMappings: Object.freeze([nmixxHanteoArtistMapping]),
    reviewedReleaseMappings: Object.freeze([{
      ...nmixxHanteoReleaseMapping,
      fandexArtistId: 'aespa',
    }]),
  }));

  assert.equal(result.audit.status, 'conflicting');
  assert.ok(result.audit.blockers.includes('artist-release-mapping-conflict'));
  assert.equal(result.resolution.fandexReleaseId, null);
});

test('Circle reviewed registry drives the existing Discovery/Adapter/Orchestrator path end to end', async () => {
  const identityAudits: string[] = [];
  const identityRegistry = registry({
    reviewedArtistMappings: Object.freeze([nmixxArtistMapping]),
    reviewedReleaseMappings: Object.freeze([nmixxCircleReleaseMapping]),
  });
  const packet: Extract<AlbumProviderFixturePacket, { provider: 'circle-retail' }> = Object.freeze({
    provider: 'circle-retail',
    timeframe: 'day',
    observedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-01T00:00:01Z',
    requestParams: Object.freeze({ termGbn: 'day', yyyymmdd: '20260831' }),
    endpointEvidenceIds: Object.freeze(['circle:endpoint:test']),
    quantityEvidenceIds: Object.freeze(['circle:quantity:test']),
    resolveIdentity: createCircleRetailLiveIdentityResolver(identityRegistry, audit => identityAudits.push(audit.status)),
    rawResponse: Object.freeze({
      FormToMap: Object.freeze({ termGbn: 'day', yyyymmdd: '20260831' }),
      ResultStatus: 'OK',
      List: Object.freeze({
        0: Object.freeze({
          Album: 'TEST ALBUM',
          Artist: 'NMIXX',
          Barcode: '8800000000000',
          rowSum: '12345',
          KSum: '1',
          ESum: '2',
          RankInt: '1',
          RankOrder: '1',
          YYYYMMDD: '20260831',
        }),
      }),
    }),
  });

  const report = await runAlbumBoundedResearch({
    plan: buildAlbumCollectorPlan({ timeframe: 'day', at: '2026-09-01T00:00:00Z' }),
    authorization: enabledFixtureAuthorization(),
    executor: createAlbumProviderFixtureExecutor([packet]),
  });

  assert.equal(report.status, 'completed');
  assert.equal(report.attempts[0].status, 'ok');
  assert.equal(report.attempts[0].rowCount, 1);
  assert.deepEqual(identityAudits, ['resolved']);
});

test('Hanteo reviewed registry drives current salesVolume Adapter path end to end', async () => {
  const identityAudits: string[] = [];
  const identityRegistry = registry({
    reviewedArtistMappings: Object.freeze([nmixxHanteoArtistMapping]),
    reviewedReleaseMappings: Object.freeze([nmixxHanteoReleaseMapping]),
  });
  const packet: Extract<AlbumProviderFixturePacket, { provider: 'hanteo' }> = Object.freeze({
    provider: 'hanteo',
    timeframe: 'day',
    observedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-01T00:00:01Z',
    limit: 20,
    quantityEvidenceId: 'hanteo:quantity:test',
    resolveIdentity: createHanteoLiveIdentityResolver(identityRegistry, audit => identityAudits.push(audit.status)),
    rawResponse: Object.freeze({
      code: 100,
      message: 'SUCCESS',
      resultData: Object.freeze({
        resultDatetime: '2026.08.31',
        list: Object.freeze([
          Object.freeze({
            rank: 1,
            targetIdx: '9001',
            targetName: 'TEST ALBUM',
            value: 1206155.8,
            detail: Object.freeze({
              salesVolume: 1139747,
              artistIdx: 77,
              artistGlobalName: 'NMIXX',
              saleDate: 1788134400000,
            }),
            regDate: '2026-08-31T12:00:00Z',
          }),
        ]),
      }),
    }),
  });

  const report = await runAlbumBoundedResearch({
    plan: buildAlbumCollectorPlan({
      providerSelection: 'secondary',
      timeframe: 'day',
      at: '2026-09-01T00:00:00Z',
    }),
    authorization: enabledFixtureAuthorization(),
    executor: createAlbumProviderFixtureExecutor([packet]),
  });

  assert.equal(report.status, 'completed');
  assert.equal(report.attempts[0].status, 'ok');
  assert.equal(report.attempts[0].rowCount, 1);
  assert.deepEqual(identityAudits, ['resolved']);
});
