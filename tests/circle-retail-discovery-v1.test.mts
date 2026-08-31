import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCircleRetailDiscoveryRequestPlan,
  canPromoteCircleRetailDiscovery,
  captureCircleRetailDiscovery,
  CIRCLE_RETAIL_PUBLIC_PAGE_URL,
  verifyCircleRetailQuantitySemantic,
} from '../lib/alternative-evidence/circleRetailDiscovery';

const observedAt = '2026-08-31T15:00:00.000Z';

const structuredResponse = {
  data: {
    rows: [
      { itemKey: 'album-1', artistText: 'Artist', albumText: 'Album', copiesCandidate: 1234 },
      { itemKey: 'album-2', artistText: 'Artist 2', albumText: 'Album 2', copiesCandidate: 987 },
    ],
  },
};

test('daily public-page discovery plan is deterministic and default-off', () => {
  const first = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2026-08-30' });
  const second = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2026-08-30' });
  assert.equal(first.publicPageUrl, CIRCLE_RETAIL_PUBLIC_PAGE_URL);
  assert.equal(first.networkAllowed, false);
  assert.equal(first.candidate, null);
  assert.equal(first.planDigest, second.planDigest);
});

test('historical daily date is preserved without inventing a provider period key', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2025-12-31' });
  assert.equal(plan.period.date, '2025-12-31');
  assert.equal(plan.period.providerPeriodKey, null);
});

test('weekly and monthly provider period keys are preserved as opaque provider values', () => {
  const weekly = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'week', providerPeriodKey: 'provider-week-key-17' });
  const monthly = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'month', providerPeriodKey: 'provider-month-key-08' });
  assert.equal(weekly.period.providerPeriodKey, 'provider-week-key-17');
  assert.equal(monthly.period.providerPeriodKey, 'provider-month-key-08');
});

test('hourly discovery keeps date and hour separate', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'hour', date: '2026-08-31', hour: 14 });
  assert.equal(plan.period.date, '2026-08-31');
  assert.equal(plan.period.hour, 14);
  assert.throws(() => buildCircleRetailDiscoveryRequestPlan({ timeframe: 'hour', date: '2026-08-31' }));
});

test('reported candidate endpoint is never verified by default', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({
    timeframe: 'day',
    date: '2026-08-30',
    candidate: { kind: 'default-value', params: { date: '2026-08-30' } },
  });
  assert.equal(plan.candidate?.url, '/data/api/chart_func/retail/default_value');
  assert.equal(plan.candidate?.evidenceState, 'reported-public-unverified');
  assert.equal(plan.networkAllowed, false);
});

test('unknown structured schema exposes candidates but never auto-selects quantity semantics', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2026-08-30' });
  const capture = captureCircleRetailDiscovery({ plan, rawResponse: structuredResponse, observedAt, status: 200, contentType: 'application/json' });
  assert.equal(capture.schemaState, 'structured-response');
  assert.equal(capture.response.rowPath, '$.data.rows');
  assert.ok(capture.response.quantityCandidateFields.includes('copiesCandidate'));
  assert.equal(capture.quantitySemanticState, 'unverified');
  assert.equal(capture.verifiedQuantityField, null);
  assert.equal(canPromoteCircleRetailDiscovery(capture), false);
});

test('quantity promotion requires explicit evidence and observed field/path', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2026-08-30' });
  const capture = captureCircleRetailDiscovery({ plan, rawResponse: structuredResponse, observedAt, status: 200, contentType: 'application/json' });
  assert.throws(() => verifyCircleRetailQuantitySemantic(capture, {
    quantitySemanticState: 'verified-retail-copies',
    quantityField: 'copiesCandidate',
    rowPath: '$.data.rows',
    evidenceIds: [],
  }));
  assert.throws(() => verifyCircleRetailQuantitySemantic(capture, {
    quantitySemanticState: 'verified-retail-copies',
    quantityField: 'inventedSales',
    rowPath: '$.data.rows',
    evidenceIds: ['evidence-1'],
  }));
  const verified = verifyCircleRetailQuantitySemantic(capture, {
    quantitySemanticState: 'verified-retail-copies',
    quantityField: 'copiesCandidate',
    rowPath: '$.data.rows',
    evidenceIds: ['evidence-1'],
  });
  assert.equal(verified.quantitySemanticState, 'verified-retail-copies');
  assert.equal(canPromoteCircleRetailDiscovery(verified), true);
});

test('empty, unpublished, failed, and HTML responses are never coerced to zero', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2026-08-30' });
  const empty = captureCircleRetailDiscovery({ plan, rawResponse: [], observedAt, status: 200, contentType: 'application/json' });
  const unpublished = captureCircleRetailDiscovery({ plan, rawResponse: [], observedAt, status: 200, contentType: 'application/json', periodNotPublished: true });
  const failed = captureCircleRetailDiscovery({ plan, rawResponse: null, observedAt, fetchFailed: true });
  const html = captureCircleRetailDiscovery({ plan, rawResponse: '<html><body>blocked</body></html>', observedAt, status: 200, contentType: 'text/html' });
  assert.equal(empty.missingState, 'response-empty');
  assert.equal(unpublished.missingState, 'period-not-published');
  assert.equal(failed.missingState, 'fetch-failed');
  assert.equal(html.missingState, 'schema-invalid');
  for (const capture of [empty, unpublished, failed, html]) {
    assert.equal(canPromoteCircleRetailDiscovery(capture), false);
    assert.equal('value' in capture, false);
  }
});

test('capture digest is deterministic but changes when raw response values change', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2026-08-30' });
  const first = captureCircleRetailDiscovery({ plan, rawResponse: structuredResponse, observedAt, status: 200, contentType: 'application/json' });
  const second = captureCircleRetailDiscovery({ plan, rawResponse: structuredResponse, observedAt, status: 200, contentType: 'application/json' });
  const changed = captureCircleRetailDiscovery({
    plan,
    rawResponse: { data: { rows: [{ itemKey: 'album-1', artistText: 'Artist', albumText: 'Album', copiesCandidate: 1235 }] } },
    observedAt,
    status: 200,
    contentType: 'application/json',
  });
  assert.equal(first.responseDigest, second.responseDigest);
  assert.notEqual(first.responseDigest, changed.responseDigest);
});

test('Circle discovery capture is not a DirectAlbumObservation or YES24 RetailObservation', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2026-08-30' });
  const capture = captureCircleRetailDiscovery({ plan, rawResponse: structuredResponse, observedAt });
  assert.equal('observationId' in capture, false);
  assert.equal('semantic' in capture, false);
  assert.equal('unit' in capture, false);
  assert.equal('rank' in capture, false);
  assert.equal('providerIndex' in capture, false);
});
