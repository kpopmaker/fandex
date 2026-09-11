import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HANTEO_HISTORICAL_EXACT_COPIES_QUALIFICATION,
  HanteoHistoricalSelectorPendingError,
  buildHanteoAlbumRequestPlan,
  decodeHanteoAlbumResponse,
  hanteoAlbumIndexIsSalesCopies,
  qualifyHanteoAlbumRow,
} from '../lib/alternative-evidence/hanteoAlbumDiscovery';

const weeklyResponse = {
  code: 100,
  message: '성공',
  resultData: {
    resultDatetime: '집계 기준 (KST) : 2026.08.24 ~ 2026.08.30',
    list: [{
      genre: 10, rank: 1, rankDiff: 0, targetIdx: '900562834', targetImg: '/album/900562834_s150.jpg',
      targetName: 'UNBREAKABLE : 少年BEAST', value: 1206155.8, isDeadLine: 0,
      detail: { artistGlobalName: 'ALPHA DRIVE ONE', badge: '', supplyPrice: 13000, salesVolume: 1139747, entertainment: '웨이크원', artistIdx: 76154, artistName: '알파드라이브원(ALPHA DRIVE ONE)', saleDate: 1787529600000 },
      regDate: '2026-08-30T00:00:00.000+00:00', status: 'NEW',
    }],
  },
};

test('Hanteo current Daily Weekly Monthly plans are deterministic GET routes with required limit', () => {
  const day = buildHanteoAlbumRequestPlan({ timeframe: 'day', limit: 20 });
  const week = buildHanteoAlbumRequestPlan({ timeframe: 'week', limit: 20 });
  const month = buildHanteoAlbumRequestPlan({ timeframe: 'month', limit: 20 });
  assert.equal(day.method, 'GET');
  assert.equal(day.url, 'https://api.hanteochart.io/v4/ranking/list/ALBUM/DAILY/BASIC?limit=20');
  assert.equal(week.url, 'https://api.hanteochart.io/v4/ranking/list/ALBUM/WEEKLY/BASIC?limit=20');
  assert.equal(month.url, 'https://api.hanteochart.io/v4/ranking/list/ALBUM/MONTHLY/BASIC?limit=20');
  for (const plan of [day, week, month]) {
    assert.equal(plan.endpointEvidenceState, 'direct-verified-current');
    assert.equal(plan.historicalSelectorState, 'unverified-public-selector');
    assert.equal(plan.networkAllowed, false);
  }
});

test('Hanteo limit must be a positive integer', () => {
  assert.throws(() => buildHanteoAlbumRequestPlan({ timeframe: 'week', limit: 0 }), /positive-integer/);
  assert.throws(() => buildHanteoAlbumRequestPlan({ timeframe: 'week', limit: 1.5 }), /positive-integer/);
});

test('Hanteo historical exact-copy selection remains fail-closed and explicitly unverified', () => {
  assert.equal(HANTEO_HISTORICAL_EXACT_COPIES_QUALIFICATION.publicRankHistory, 'pass');
  assert.equal(HANTEO_HISTORICAL_EXACT_COPIES_QUALIFICATION.historicalPageSalesExposure, 'rank-only');
  assert.equal(HANTEO_HISTORICAL_EXACT_COPIES_QUALIFICATION.historicalPageShowSales, false);
  assert.equal(HANTEO_HISTORICAL_EXACT_COPIES_QUALIFICATION.sameSiteChartSalesBehavior, 'current-only-observed');
  assert.equal(HANTEO_HISTORICAL_EXACT_COPIES_QUALIFICATION.exactCopiesPublicSelector, 'unverified');
  assert.throws(
    () => buildHanteoAlbumRequestPlan({ timeframe: 'week', limit: 20, mode: 'historical' }),
    (error: unknown) => error instanceof HanteoHistoricalSelectorPendingError,
  );
});

test('Hanteo success decoder preserves current provider period and raw rows', () => {
  const decoded = decodeHanteoAlbumResponse(weeklyResponse);
  assert.equal(decoded.responseState, 'success');
  assert.equal(decoded.providerCode, 100);
  assert.equal(decoded.providerPeriodLabel, '집계 기준 (KST) : 2026.08.24 ~ 2026.08.30');
  assert.equal(decoded.rows.length, 1);
  assert.equal(decoded.rows[0].targetIdx, '900562834');
});

test('Hanteo code 602 missing-limit response is a provider request error, not empty chart data', () => {
  const decoded = decodeHanteoAlbumResponse({ code: 602, message: "Required int parameter 'limit' is not present", resultData: null });
  assert.equal(decoded.responseState, 'provider-error');
  assert.equal(decoded.providerCode, 602);
  assert.match(decoded.providerMessage ?? '', /limit/i);
  assert.equal(decoded.rows.length, 0);
});

test('Hanteo salesVolume is copies while value remains Album Index', () => {
  const decoded = decodeHanteoAlbumResponse(weeklyResponse);
  const qualified = qualifyHanteoAlbumRow(decoded.rows[0], { quantityEvidenceId: 'hanteo-official-weekly-2026-08-24-30-crosscheck' });
  assert.equal(qualified.salesCopies, 1139747);
  assert.equal(qualified.albumIndex, 1206155.8);
  assert.equal(qualified.unit, 'copies');
  assert.equal(qualified.quantitySemanticState, 'verified-physical-sales-copies');
  assert.equal(hanteoAlbumIndexIsSalesCopies(), false);
  assert.notEqual(qualified.albumIndex, qualified.salesCopies);
});

test('Hanteo native target and artist identifiers are preserved as provider candidates', () => {
  const row = decodeHanteoAlbumResponse(weeklyResponse).rows[0];
  const qualified = qualifyHanteoAlbumRow(row, { quantityEvidenceId: 'evidence-1' });
  assert.equal(qualified.providerTargetId, '900562834');
  assert.equal(qualified.providerArtistId, '76154');
  assert.equal(qualified.releaseRaw, 'UNBREAKABLE : 少年BEAST');
  assert.equal(qualified.artistRaw, 'ALPHA DRIVE ONE');
});

test('Hanteo row qualification fails closed when salesVolume or detail is missing', () => {
  const base = weeklyResponse.resultData.list[0];
  assert.throws(() => qualifyHanteoAlbumRow({ ...base, detail: { ...base.detail, salesVolume: undefined } }, { quantityEvidenceId: 'evidence-1' }), /sales-volume-invalid/);
  assert.throws(() => qualifyHanteoAlbumRow({ ...base, detail: undefined }, { quantityEvidenceId: 'evidence-1' }), /sales-volume-invalid/);
});

test('Hanteo quantity semantics require explicit evidence and never fall back to rank or Album Index', () => {
  const row = decodeHanteoAlbumResponse(weeklyResponse).rows[0];
  assert.throws(() => qualifyHanteoAlbumRow(row, { quantityEvidenceId: ' ' }), /evidence-id-required/);
  const withoutSales = { ...row, rank: 1139747, value: 1139747, detail: { ...(row.detail as Record<string, unknown>), salesVolume: undefined } };
  assert.throws(() => qualifyHanteoAlbumRow(withoutSales, { quantityEvidenceId: 'evidence-1' }), /sales-volume-invalid/);
});

test('Hanteo success code with malformed list is schema-invalid', () => {
  const decoded = decodeHanteoAlbumResponse({ code: 100, message: '성공', resultData: { resultDatetime: 'x', list: {} } });
  assert.equal(decoded.responseState, 'schema-invalid');
});
