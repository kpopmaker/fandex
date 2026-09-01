import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAlbumCollectorPlan } from '../lib/server/ingestion/albumCollectorPlan';
import {
  runAlbumBoundedResearch,
  type AlbumBoundedResearchAuthorization,
  type AlbumBoundedResearchExecutor,
} from '../lib/server/ingestion/albumBoundedResearchOrchestrator';
import {
  ALBUM_ONE_SHOT_MAX_TTL_MS,
  createAlbumOneShotNetworkGrant,
  runAlbumOneShotNetworkResearch,
  type AlbumOneShotNetworkBinding,
  type AlbumOneShotNetworkTransport,
  type AlbumOneShotTransportRequest,
  type AlbumOneShotTransportResponse,
} from '../lib/server/ingestion/albumOneShotNetworkExecutor';

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

function circleBinding(): Extract<AlbumOneShotNetworkBinding, { provider: 'circle-retail' }> {
  return Object.freeze({
    provider: 'circle-retail' as const,
    timeframe: 'day' as const,
    requestParams: Object.freeze({ termGbn: 'day', yyyymmdd: '20260831' }),
    endpointEvidenceIds: Object.freeze(['circle:endpoint:test']),
    quantityEvidenceIds: Object.freeze(['circle:rowSum:test']),
    resolveIdentity: () => resolvedIdentity(),
  });
}

function hanteoBinding(): Extract<AlbumOneShotNetworkBinding, { provider: 'hanteo' }> {
  return Object.freeze({
    provider: 'hanteo' as const,
    timeframe: 'day' as const,
    limit: 20,
    quantityEvidenceId: 'hanteo:salesVolume:test',
    resolveIdentity: () => resolvedIdentity(),
  });
}

function circleRaw() {
  return Object.freeze({
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
  });
}

function hanteoRaw(includeSalesVolume = true) {
  return Object.freeze({
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
            ...(includeSalesVolume ? { salesVolume: 1139747 } : {}),
            artistIdx: 77,
            artistGlobalName: 'TEST ARTIST',
            saleDate: 1788134400000,
          }),
          regDate: '2026-08-31T12:00:00Z',
        }),
      ]),
    }),
  });
}

function grantFor(plan: ReturnType<typeof buildAlbumCollectorPlan>, suffix: string) {
  return createAlbumOneShotNetworkGrant({
    plan,
    issuedAt: '2026-09-01T00:00:00Z',
    expiresAt: '2026-09-01T00:10:00Z',
    authorizationEvidenceIds: Object.freeze([`explicit-one-shot:${suffix}`]),
  });
}

function queuedTransport(
  responses: readonly AlbumOneShotTransportResponse[],
  calls: AlbumOneShotTransportRequest[],
): AlbumOneShotNetworkTransport {
  let cursor = 0;
  return Object.freeze({
    async send(request) {
      calls.push(request);
      const response = responses[cursor++];
      if (!response) throw new Error('transport_response_missing');
      return response;
    },
  });
}

const NOW_MS = Date.parse('2026-09-01T00:01:00Z');

test('grant is plan-bound, evidence-bound, short-lived, and capped to two requests', () => {
  const plan = buildAlbumCollectorPlan({ providerSelection: 'both', timeframe: 'day', at: '2026-09-01T00:00:00Z' });
  const grant = grantFor(plan, 'shape');
  assert.equal(grant.planDigest, plan.planDigest);
  assert.equal(grant.maxRequests, 2);
  assert.deepEqual(grant.providerSequence, ['circle-retail', 'hanteo']);
  assert.equal(grant.singleUseScope, 'process-local');
  assert.match(grant.grantDigest, /^[0-9a-f]{64}$/);

  assert.throws(() => createAlbumOneShotNetworkGrant({
    plan,
    issuedAt: '2026-09-01T00:00:00Z',
    expiresAt: new Date(Date.parse('2026-09-01T00:00:00Z') + ALBUM_ONE_SHOT_MAX_TTL_MS + 1).toISOString(),
    authorizationEvidenceIds: ['too-long'],
  }), /ttl_invalid/);

  assert.throws(() => createAlbumOneShotNetworkGrant({
    plan,
    issuedAt: '2026-09-01T00:00:00Z',
    expiresAt: '2026-09-01T00:05:00Z',
    authorizationEvidenceIds: [],
  }), /authorization_evidence_required/);
});

test('arbitrary live executor remains blocked without matching grant digest', async () => {
  const plan = buildAlbumCollectorPlan({ timeframe: 'day', at: '2026-09-01T00:00:00Z' });
  let called = false;
  const executor: AlbumBoundedResearchExecutor = Object.freeze({
    kind: 'live-network' as const,
    authorizationDigest: 'executor-grant',
    async execute() {
      called = true;
      return { status: 'ok', httpStatus: 200 };
    },
  });
  const authorization: AlbumBoundedResearchAuthorization = Object.freeze({
    boundedResearchImplementationAuthorized: true,
    fixtureExecutionAuthorized: false,
    liveNetworkExecutionAuthorized: true,
    liveNetworkGrantDigest: 'different-grant',
    globalEnabled: true,
    providerEnabled: Object.freeze({ 'circle-retail': true, hanteo: false }),
    persistenceAuthorized: false,
    scheduleMutationAuthorized: false,
    environmentMutationAuthorized: false,
  });

  const report = await runAlbumBoundedResearch({ plan, executor, authorization });
  assert.equal(report.status, 'authorization-blocked');
  assert.equal(report.haltReason, 'live-network-grant-mismatch');
  assert.equal(called, false);
});

test('Circle one-shot network path normalizes a non-synthetic provider response', async () => {
  const plan = buildAlbumCollectorPlan({ timeframe: 'day', at: '2026-09-01T00:00:00Z' });
  const grant = grantFor(plan, 'circle-live');
  const calls: AlbumOneShotTransportRequest[] = [];
  const transport = queuedTransport([
    Object.freeze({ status: 200, headers: Object.freeze({}), rawBody: circleRaw() }),
  ], calls);

  const run = await runAlbumOneShotNetworkResearch({
    plan,
    grant,
    bindings: [circleBinding()],
    transport,
    nowMs: () => NOW_MS,
  });

  assert.equal(run.report.status, 'completed');
  assert.equal(run.report.attempts[0].status, 'ok');
  assert.equal(run.report.attempts[0].rowCount, 1);
  assert.equal(run.report.effects.externalCalls, 1);
  assert.equal(run.report.effects.fixtureExecutorCalls, 0);
  assert.equal(run.report.effects.databaseWrites, 0);
  assert.equal(run.persistenceAuthorized, false);
  assert.equal(calls[0].url, 'https://circlechart.kr/data/api/chart/retail_list');
  assert.match(calls[0].body ?? '', /termGbn=day/);
  assert.match(calls[0].body ?? '', /yyyymmdd=20260831/);
});

test('both providers execute sequentially with the planner minimum interval and no blending', async () => {
  const plan = buildAlbumCollectorPlan({ providerSelection: 'both', timeframe: 'day', at: '2026-09-01T00:00:00Z' });
  const grant = grantFor(plan, 'both-throttle');
  const calls: AlbumOneShotTransportRequest[] = [];
  const waits: number[] = [];
  let clock = NOW_MS;
  const transport = queuedTransport([
    Object.freeze({ status: 200, headers: Object.freeze({}), rawBody: circleRaw() }),
    Object.freeze({ status: 200, headers: Object.freeze({}), rawBody: hanteoRaw() }),
  ], calls);

  const run = await runAlbumOneShotNetworkResearch({
    plan,
    grant,
    bindings: [circleBinding(), hanteoBinding()],
    transport,
    nowMs: () => clock,
    sleep: async ms => { waits.push(ms); clock += ms; },
  });

  assert.equal(run.report.status, 'completed');
  assert.deepEqual(run.report.attempts.map(attempt => attempt.provider), ['circle-retail', 'hanteo']);
  assert.deepEqual(run.report.attempts.map(attempt => attempt.rowCount), [1, 1]);
  assert.equal(run.report.effects.externalCalls, 2);
  assert.deepEqual(waits, [3000]);
  assert.equal(calls[1].url, 'https://api.hanteochart.io/v4/ranking/list/ALBUM/DAILY/BASIC?limit=20');
});

test('429 halts a one-shot run before the secondary provider request', async () => {
  const plan = buildAlbumCollectorPlan({ providerSelection: 'both', timeframe: 'day', at: '2026-09-01T00:00:00Z' });
  const grant = grantFor(plan, '429');
  const calls: AlbumOneShotTransportRequest[] = [];
  const transport = queuedTransport([
    Object.freeze({ status: 429, headers: Object.freeze({ 'retry-after': '60' }), rawBody: { error: 'rate' } }),
    Object.freeze({ status: 200, headers: Object.freeze({}), rawBody: hanteoRaw() }),
  ], calls);

  const run = await runAlbumOneShotNetworkResearch({
    plan,
    grant,
    bindings: [circleBinding(), hanteoBinding()],
    transport,
    nowMs: () => NOW_MS,
  });

  assert.equal(run.report.status, 'halted');
  assert.equal(run.report.haltReason, 'http-429-halt');
  assert.equal(run.report.effects.externalCalls, 1);
  assert.equal(calls.length, 1);
});

test('Hanteo Album Index is not used when live salesVolume is missing', async () => {
  const plan = buildAlbumCollectorPlan({ providerSelection: 'secondary', timeframe: 'day', at: '2026-09-01T00:00:00Z' });
  const grant = grantFor(plan, 'hanteo-missing-sales');
  const transport = queuedTransport([
    Object.freeze({ status: 200, headers: Object.freeze({}), rawBody: hanteoRaw(false) }),
  ], []);

  const run = await runAlbumOneShotNetworkResearch({
    plan,
    grant,
    bindings: [hanteoBinding()],
    transport,
    nowMs: () => NOW_MS,
  });

  assert.equal(run.report.status, 'halted');
  assert.equal(run.report.haltReason, 'quantity-field-missing');
});

test('one-shot grant cannot be reused in the same process', async () => {
  const plan = buildAlbumCollectorPlan({ timeframe: 'day', at: '2026-09-01T00:00:00Z' });
  const grant = grantFor(plan, 'single-use');
  const response = Object.freeze({ status: 200, headers: Object.freeze({}), rawBody: circleRaw() });

  await runAlbumOneShotNetworkResearch({
    plan,
    grant,
    bindings: [circleBinding()],
    transport: queuedTransport([response], []),
    nowMs: () => NOW_MS,
  });

  await assert.rejects(
    () => runAlbumOneShotNetworkResearch({
      plan,
      grant,
      bindings: [circleBinding()],
      transport: queuedTransport([response], []),
      nowMs: () => NOW_MS,
    }),
    /grant_already_consumed/,
  );
});
