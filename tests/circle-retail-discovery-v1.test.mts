import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCircleRetailDiscoveryRequestPlan,
  canPromoteCircleRetailDiscovery,
  captureCircleRetailDiscovery,
  CIRCLE_RETAIL_PUBLIC_PAGE_URL,
  verifyCircleRetailCandidateEndpoint,
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

const observedCircleResponse = {
  ResultStatus: 'OK',
  FormToMap: { termGbn: 'day', yyyymmdd: '20260529' },
  List: {
    '0': {
      Album: 'LEMONADE - The 2nd Album',
      Artist: 'aespa',
      Barcode: '8804775469824',
      De_company_name: 'Kakao Entertainment',
      ESum: '65704',
      KSum: '255451',
      RankContinue: '5',
      RankHigh: '1',
      RankInt: '1',
      RankOrder: '1',
      RankStatus: 'HOT',
      YYYYMMDD: '20260529',
      rowSum: '321155',
      save_name: 'aoaAlbumImg\\thumb\\example.jpg',
      sys_date: '2026-06-02 14:40:46.587 +0000 UTC',
    },
    '1': {
      Album: 'Synthetic Second Album',
      Artist: 'Artist 2',
      Barcode: '8800000000002',
      De_company_name: 'Distributor',
      ESum: '100',
      KSum: '900',
      RankContinue: '1',
      RankHigh: '2',
      RankInt: '2',
      RankOrder: '2',
      RankStatus: 'NEW',
      YYYYMMDD: '20260529',
      rowSum: '1000',
      save_name: 'image.jpg',
      sys_date: '2026-06-02 14:40:46.587 +0000 UTC',
    },
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
  const weekly = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'week', providerPeriodKey: '20250223' });
  const monthly = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'month', providerPeriodKey: '202206' });
  assert.equal(weekly.period.providerPeriodKey, '20250223');
  assert.equal(monthly.period.providerPeriodKey, '202206');
});

test('hourly discovery keeps date and hour separate', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'hour', date: '2026-08-31', hour: 14 });
  assert.equal(plan.period.date, '2026-08-31');
  assert.equal(plan.period.hour, 14);
  assert.throws(() => buildCircleRetailDiscoveryRequestPlan({ timeframe: 'hour', date: '2026-08-31' }));
});

test('observed Circle candidate endpoints use POST but remain unverified until evidence is attached', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({
    timeframe: 'day',
    date: '2026-05-29',
    candidate: { kind: 'retail-list', params: { termGbn: 'day', yyyymmdd: '20260529' } },
  });
  assert.equal(plan.candidate?.url, '/data/api/chart/retail_list');
  assert.equal(plan.candidate?.method, 'POST');
  assert.equal(plan.candidate?.evidenceState, 'reported-public-unverified');
  assert.deepEqual(plan.candidate?.evidenceIds, []);
  assert.equal(plan.networkAllowed, false);
  assert.throws(() => verifyCircleRetailCandidateEndpoint(plan, []));
  const verified = verifyCircleRetailCandidateEndpoint(plan, ['circle-page-ajax-contract', 'circle-retail-list-probe']);
  assert.equal(verified.candidate?.evidenceState, 'verified-public-endpoint');
  assert.deepEqual(verified.candidate?.evidenceIds, ['circle-page-ajax-contract', 'circle-retail-list-probe']);
  assert.equal(verified.networkAllowed, false);
});

test('all known Circle retail AJAX candidates preserve the directly observed POST method', () => {
  const cases = [
    ['default-value', { termGbn: 'day' }],
    ['hour-time', { termGbn: 'hour' }],
    ['retail-list', { termGbn: 'day', yyyymmdd: '20260529' }],
    ['retail-hour', { yyyymmdd: '20260529', HourRange: '22', ListType: '', thisHour: '22' }],
  ] as const;
  for (const [kind, params] of cases) {
    const plan = buildCircleRetailDiscoveryRequestPlan({
      timeframe: kind === 'hour-time' || kind === 'retail-hour' ? 'hour' : 'day',
      date: kind === 'hour-time' || kind === 'retail-hour' ? '2026-05-29' : '2026-05-29',
      hour: kind === 'hour-time' || kind === 'retail-hour' ? 22 : undefined,
      candidate: { kind, params },
    });
    assert.equal(plan.candidate?.method, 'POST');
  }
});

test('unknown structured schema exposes candidates but never auto-selects quantity semantics', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2026-08-30' });
  const capture = captureCircleRetailDiscovery({ plan, rawResponse: structuredResponse, observedAt, status: 200, contentType: 'application/json' });
  assert.equal(capture.schemaState, 'structured-response');
  assert.equal(capture.response.rowPath, '$.data.rows');
  assert.ok(capture.response.quantityCandidateFields.includes('copiesCandidate'));
  assert.equal(capture.quantitySemanticState, 'unverified');
  assert.equal(capture.verifiedQuantityField, null);
  assert.deepEqual(capture.quantityVerificationEvidenceIds, []);
  assert.equal(canPromoteCircleRetailDiscovery(capture), false);
});

test('observed Circle object-of-rows schema is recognized and numeric strings remain candidates only', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({
    timeframe: 'day',
    date: '2026-05-29',
    candidate: { kind: 'retail-list', params: { termGbn: 'day', yyyymmdd: '20260529' } },
  });
  const capture = captureCircleRetailDiscovery({
    plan,
    rawResponse: observedCircleResponse,
    observedAt,
    status: 200,
    contentType: 'application/json',
  });
  assert.equal(capture.response.providerStatus, 'OK');
  assert.equal(capture.response.rowPath, '$.List{values}');
  assert.equal(capture.response.rowCount, 2);
  assert.ok(capture.response.sampleRowKeys.includes('rowSum'));
  assert.ok(capture.response.sampleRowKeys.includes('Barcode'));
  assert.ok(capture.response.quantityCandidateFields.includes('rowSum'));
  assert.ok(capture.response.quantityCandidateFields.includes('KSum'));
  assert.ok(capture.response.quantityCandidateFields.includes('ESum'));
  assert.ok(capture.response.identityCandidateFields.includes('Artist'));
  assert.ok(capture.response.identityCandidateFields.includes('Album'));
  assert.ok(capture.response.identityCandidateFields.includes('Barcode'));
  assert.equal(capture.quantitySemanticState, 'unverified');
  assert.equal(canPromoteCircleRetailDiscovery(capture), false);
});

test('observed rowSum can be promoted only with explicit render/semantic evidence', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({
    timeframe: 'day',
    date: '2026-05-29',
    candidate: { kind: 'retail-list', params: { termGbn: 'day', yyyymmdd: '20260529' } },
  });
  const capture = captureCircleRetailDiscovery({
    plan,
    rawResponse: observedCircleResponse,
    observedAt,
    status: 200,
    contentType: 'application/json',
  });
  assert.throws(() => verifyCircleRetailQuantitySemantic(capture, {
    quantitySemanticState: 'verified-retail-copies',
    quantityField: 'rowSum',
    rowPath: '$.List{values}',
    evidenceIds: [],
  }));
  const verified = verifyCircleRetailQuantitySemantic(capture, {
    quantitySemanticState: 'verified-retail-copies',
    quantityField: 'rowSum',
    rowPath: '$.List{values}',
    evidenceIds: ['circle-official-retail-semantic', 'circle-page-rowSum-sales-render', 'circle-retail-list-direct-probe'],
  });
  assert.equal(verified.verifiedQuantityField, 'rowSum');
  assert.deepEqual(verified.quantityVerificationEvidenceIds, [
    'circle-official-retail-semantic',
    'circle-page-rowSum-sales-render',
    'circle-retail-list-direct-probe',
  ]);
  assert.equal(canPromoteCircleRetailDiscovery(verified), true);
});

test('generic quantity promotion still requires explicit evidence and observed field/path', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2026-08-30' });
  const capture = captureCircleRetailDiscovery({ plan, rawResponse: structuredResponse, observedAt, status: 200, contentType: 'application/json' });
  assert.throws(() => verifyCircleRetailQuantitySemantic(capture, {
    quantitySemanticState: 'verified-retail-copies',
    quantityField: 'inventedSales',
    rowPath: '$.data.rows',
    evidenceIds: ['evidence-1'],
  }));
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

test('capture digest is deterministic and payload-sensitive', () => {
  const plan = buildCircleRetailDiscoveryRequestPlan({ timeframe: 'day', date: '2026-08-30' });
  const first = captureCircleRetailDiscovery({ plan, rawResponse: structuredResponse, observedAt, status: 200, contentType: 'application/json' });
  const second = captureCircleRetailDiscovery({ plan, rawResponse: structuredResponse, observedAt, status: 200, contentType: 'application/json' });
  const changed = captureCircleRetailDiscovery({
    plan,
    rawResponse: {
      data: {
        rows: [
          { itemKey: 'album-1', artistText: 'Artist', albumText: 'Album', copiesCandidate: 1235 },
          { itemKey: 'album-2', artistText: 'Artist 2', albumText: 'Album 2', copiesCandidate: 987 },
        ],
      },
    },
    observedAt,
    status: 200,
    contentType: 'application/json',
  });
  assert.equal(first.payloadDigest, second.payloadDigest);
  assert.equal(first.responseDigest, second.responseDigest);
  assert.notEqual(first.payloadDigest, changed.payloadDigest);
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
