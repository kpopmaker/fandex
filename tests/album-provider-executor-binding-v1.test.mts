import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAlbumCollectorPlan } from '../lib/server/ingestion/albumCollectorPlan';
import {
  runAlbumBoundedResearch,
  type AlbumBoundedResearchAuthorization,
} from '../lib/server/ingestion/albumBoundedResearchOrchestrator';
import {
  createAlbumProviderFixtureExecutor,
  providerFixturePacketCountByProvider,
  type AlbumProviderFixturePacket,
} from '../lib/server/ingestion/albumProviderExecutorBinding';

function enabledAuthorization(): AlbumBoundedResearchAuthorization {
  return Object.freeze({
    boundedResearchImplementationAuthorized: true,
    fixtureExecutionAuthorized: true,
    liveNetworkExecutionAuthorized: false,
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

function resolvedIdentity() {
  return Object.freeze({
    fandexArtistId: 'artist:test',
    fandexReleaseId: 'release:test',
    fandexReleaseFamilyId: 'release-family:test',
    artistResolutionState: 'resolved' as const,
    artistReviewState: 'human-reviewed' as const,
    releaseResolutionState: 'resolved' as const,
    releaseReviewState: 'human-reviewed' as const,
    evidenceIds: Object.freeze(['identity:test']),
  });
}

function circlePacket(overrides: Partial<Extract<AlbumProviderFixturePacket, { provider: 'circle-retail' }>> = {}): Extract<AlbumProviderFixturePacket, { provider: 'circle-retail' }> {
  return Object.freeze({
    provider: 'circle-retail' as const,
    timeframe: 'day' as const,
    observedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-01T00:00:01Z',
    requestParams: Object.freeze({ termGbn: 'day', yyyymmdd: '20260831' }),
    endpointEvidenceIds: Object.freeze(['circle:endpoint:test']),
    quantityEvidenceIds: Object.freeze(['circle:rowSum:test']),
    resolveIdentity: () => resolvedIdentity(),
    rawResponse: Object.freeze({
      FormToMap: Object.freeze({ termGbn: 'day', yyyymmdd: '20260831' }),
      ResultStatus: 'OK',
      List: Object.freeze({
        0: Object.freeze({
          Album: 'TEST ALBUM',
          Artist: 'TEST ARTIST',
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
    ...overrides,
  });
}

function hanteoPacket(overrides: Partial<Extract<AlbumProviderFixturePacket, { provider: 'hanteo' }>> = {}): Extract<AlbumProviderFixturePacket, { provider: 'hanteo' }> {
  return Object.freeze({
    provider: 'hanteo' as const,
    timeframe: 'day' as const,
    observedAt: '2026-09-01T00:00:00Z',
    collectedAt: '2026-09-01T00:00:01Z',
    limit: 20,
    quantityEvidenceId: 'hanteo:salesVolume:test',
    resolveIdentity: () => resolvedIdentity(),
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
            value: 999.5,
            detail: Object.freeze({
              salesVolume: 456,
              artistIdx: 77,
              artistGlobalName: 'TEST ARTIST',
              saleDate: 1788134400000,
            }),
            regDate: '2026-08-31T12:00:00Z',
          }),
        ]),
      }),
    }),
    ...overrides,
  });
}

test('Circle fixture runs Discovery -> Adapter -> Orchestrator end to end', async () => {
  const plan = buildAlbumCollectorPlan({
    timeframe: 'day',
    at: '2026-09-01T00:00:00Z',
  });
  const executor = createAlbumProviderFixtureExecutor([circlePacket()]);
  const report = await runAlbumBoundedResearch({
    plan,
    executor,
    authorization: enabledAuthorization(),
  });

  assert.equal(report.status, 'completed');
  assert.equal(report.attempts.length, 1);
  assert.equal(report.attempts[0].provider, 'circle-retail');
  assert.equal(report.attempts[0].status, 'ok');
  assert.equal(report.attempts[0].rowCount, 1);
  assert.match(report.attempts[0].payloadDigest ?? '', /^[0-9a-f]{64}$/);
  assert.equal(report.effects.externalCalls, 0);
  assert.equal(report.effects.databaseWrites, 0);
});

test('Hanteo fixture runs decode -> salesVolume adapter -> Orchestrator end to end', async () => {
  const plan = buildAlbumCollectorPlan({
    providerSelection: 'secondary',
    timeframe: 'day',
    at: '2026-09-01T00:00:00Z',
  });
  const executor = createAlbumProviderFixtureExecutor([hanteoPacket()]);
  const report = await runAlbumBoundedResearch({
    plan,
    executor,
    authorization: enabledAuthorization(),
  });

  assert.equal(report.status, 'completed');
  assert.equal(report.attempts.length, 1);
  assert.equal(report.attempts[0].provider, 'hanteo');
  assert.equal(report.attempts[0].status, 'ok');
  assert.equal(report.attempts[0].rowCount, 1);
  assert.match(report.attempts[0].payloadDigest ?? '', /^[0-9a-f]{64}$/);
});

test('both provider fixtures remain separate attempts without blending', async () => {
  const plan = buildAlbumCollectorPlan({
    providerSelection: 'both',
    timeframe: 'day',
    at: '2026-09-01T00:00:00Z',
  });
  const packets = Object.freeze([circlePacket(), hanteoPacket()]);
  const executor = createAlbumProviderFixtureExecutor(packets);
  const report = await runAlbumBoundedResearch({
    plan,
    executor,
    authorization: enabledAuthorization(),
    maxRequests: 2,
  });

  assert.equal(report.status, 'completed');
  assert.deepEqual(report.attempts.map(attempt => attempt.provider), ['circle-retail', 'hanteo']);
  assert.deepEqual(report.attempts.map(attempt => attempt.rowCount), [1, 1]);
  assert.deepEqual(providerFixturePacketCountByProvider(packets), {
    'circle-retail': 1,
    hanteo: 1,
  });
});

test('Circle missing rowSum halts as quantity-field-missing', async () => {
  const malformed = circlePacket({
    rawResponse: Object.freeze({
      ResultStatus: 'OK',
      List: Object.freeze({
        0: Object.freeze({
          Album: 'TEST ALBUM',
          Artist: 'TEST ARTIST',
          Barcode: '8800000000000',
          KSum: '100',
          ESum: '200',
          RankInt: '1',
          YYYYMMDD: '20260831',
        }),
      }),
    }),
  });
  const report = await runAlbumBoundedResearch({
    plan: buildAlbumCollectorPlan({ timeframe: 'day', at: '2026-09-01T00:00:00Z' }),
    executor: createAlbumProviderFixtureExecutor([malformed]),
    authorization: enabledAuthorization(),
  });

  assert.equal(report.status, 'halted');
  assert.equal(report.haltReason, 'quantity-field-missing');
});

test('Hanteo Album Index never substitutes for missing salesVolume', async () => {
  const malformed = hanteoPacket({
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
              artistIdx: 77,
              artistGlobalName: 'TEST ARTIST',
            }),
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
    executor: createAlbumProviderFixtureExecutor([malformed]),
    authorization: enabledAuthorization(),
  });

  assert.equal(report.status, 'halted');
  assert.equal(report.haltReason, 'quantity-field-missing');
  assert.equal(report.attempts[0].rowCount, null);
});

test('fixture provider or timeframe mismatch fails closed', async () => {
  const report = await runAlbumBoundedResearch({
    plan: buildAlbumCollectorPlan({ timeframe: 'week', at: '2026-09-01T00:00:00Z' }),
    executor: createAlbumProviderFixtureExecutor([circlePacket()]),
    authorization: enabledAuthorization(),
  });

  assert.equal(report.status, 'halted');
  assert.equal(report.haltReason, 'provider-semantic-conflict');
});
