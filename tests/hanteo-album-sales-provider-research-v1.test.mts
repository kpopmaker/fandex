import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR,
  HANTEO_ALBUM_WEEKLY_RESEARCH_ENDPOINT,
  buildHanteoAlbumWeeklySchemaProbePlan,
  executeHanteoAlbumWeeklySchemaProbe,
  summarizeHanteoAlbumSchema,
} from '../lib/alternative-evidence/hanteoAlbumSalesProviderResearch';

test('descriptor is research-only and cannot publish Product or persist provider rows', () => {
  assert.equal(HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR.directProductContributionEligible, false);
  assert.equal(HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR.productionEligible, false);
  assert.equal(HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR.databaseWriteAllowed, false);
  assert.equal(HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR.rawPayloadStorageAllowed, false);
  assert.equal(HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR.normalizedObservationStorageAllowed, false);
  assert.equal(HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR.automaticRetryAllowed, false);
  assert.equal(HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR.recurringPollingAllowed, false);
  assert.equal(HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR.salesUnitSemanticsVerified, false);
});

test('weekly schema probe plan is exactly one GET with no write/retry', () => {
  const plan = buildHanteoAlbumWeeklySchemaProbePlan();
  assert.equal(plan.method, 'GET');
  assert.equal(plan.url, HANTEO_ALBUM_WEEKLY_RESEARCH_ENDPOINT);
  assert.equal(plan.requestCount, 1);
  assert.equal(plan.automaticRetryAllowed, false);
  assert.equal(plan.persistRawPayload, false);
  assert.equal(plan.databaseWriteAllowed, false);
});

test('schema summary reveals only structural metadata and never verifies sales-unit semantics', () => {
  const summary = summarizeHanteoAlbumSchema({
    data: {
      list: [
        { rank: 1, albumName: 'A', salesQty: '1,234', score: 99.2, artistName: 'IU' },
      ],
    },
  });
  assert.equal(summary.topLevelType, 'object');
  assert.deepEqual(summary.topLevelKeys, ['data']);
  assert.ok(summary.candidateArrayPaths.includes('data.list'));
  assert.equal(summary.sampleObjectPath, 'data.list');
  assert.ok(summary.sampleObjectKeys.includes('salesQty'));
  assert.ok(summary.numericLikeKeys.includes('salesQty'));
  assert.ok(summary.salesLikeKeys.includes('salesQty'));
  assert.equal(summary.salesUnitSemanticsVerified, false);
  assert.equal(summary.rawPayloadRetained, false);
});

test('one successful transport call can observe schema but cannot publish an observation', async () => {
  let calls = 0;
  const outcome = await executeHanteoAlbumWeeklySchemaProbe({
    async execute() {
      calls += 1;
      return { status: 200, body: { data: { list: [{ rank: 1, sales: 123 }] } } };
    },
  });
  assert.equal(calls, 1);
  assert.equal(outcome.state, 'schema-observed');
  assert.equal(outcome.httpStatus, 200);
  assert.equal(outcome.attemptedRequests, 1);
  assert.equal(outcome.retryPerformed, false);
  assert.equal(outcome.providerObservationPublished, false);
  assert.equal(outcome.productContributionPublished, false);
  assert.equal(outcome.databaseWrites, 0);
  assert.equal(outcome.rawPayloadRetained, false);
  assert.ok(outcome.schema?.salesLikeKeys.includes('sales'));
});

test('provider failures remain provider failures and are never Missing or zero', async () => {
  for (const [status, state] of [
    [429, 'rate-limited'],
    [403, 'access-restricted'],
    [503, 'provider-unavailable'],
    [404, 'request-rejected'],
  ] as const) {
    let calls = 0;
    const outcome = await executeHanteoAlbumWeeklySchemaProbe({
      async execute() {
        calls += 1;
        return { status, body: null };
      },
    });
    assert.equal(calls, 1);
    assert.equal(outcome.state, state);
    assert.equal(outcome.schema, null);
    assert.equal(outcome.productContributionPublished, false);
    assert.equal(outcome.databaseWrites, 0);
  }
});

test('transport timeout performs no retry', async () => {
  let calls = 0;
  const outcome = await executeHanteoAlbumWeeklySchemaProbe({
    async execute() {
      calls += 1;
      const error = new Error('timeout');
      error.name = 'AbortError';
      throw error;
    },
  });
  assert.equal(calls, 1);
  assert.equal(outcome.state, 'transport-timeout');
  assert.equal(outcome.retryPerformed, false);
  assert.equal(outcome.httpStatus, null);
});
