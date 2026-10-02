import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeBrandFitYouTubeObservation,
  sanitizeBrandFitYouTubeManualExecutionResult,
} from '../lib/intelligence/brandFitYouTubeManualExecution';
import {
  validateBrandFitProductionObservationReceipt,
} from '../lib/intelligence/brandFitProductionObservationReceipt';

const compliance = {
  usesYouTubeDataApiOnly: true,
  scrapingDisabled: true,
  audiovisualDownloadDisabled: true,
  nonAuthorizedMetadataRefreshWithin30Days: true,
  latestMetadataRefreshEnabled: true,
  termsAndPrivacyDisclosureReady: true,
  officialBrandChannelBindingRequired: true,
  numericDerivedMetricDisabled: true,
} as const;

async function receiptBody() {
  const result = await executeBrandFitYouTubeObservation({
    apiKey: 'synthetic-brand-fit-youtube-key',
    compliance,
    now: () => new Date('2026-10-01T09:20:00.000Z'),
    fetch: async () => new Response(JSON.stringify({
      items: [{
        id: '39CUlBDuRSo',
        snippet: {
          channelId: 'UCUeEq2B8Cx3Sdjj0Zva7uRA',
          title: 'Estée Lauder X IU | NEW Sleep Drama On-air',
          description: '에스티 로더와 아이유가 함께한 NEW 나이트 캠페인',
          publishedAt: '2025-08-03T00:00:00Z',
        },
      }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });
  assert.equal(result.status, 'eligible-for-stored-evidence-review');
  return JSON.stringify(
    sanitizeBrandFitYouTubeManualExecutionResult(result),
  );
}

test('sanitized one-shot output is accepted as a bound Production receipt', async () => {
  const result = validateBrandFitProductionObservationReceipt(
    await receiptBody(),
  );

  assert.equal(result.status, 'accepted-receipt');
  if (result.status !== 'accepted-receipt') return;

  assert.match(result.evidenceDigest, /^[0-9a-f]{64}$/);
  assert.match(result.payloadDigest, /^[0-9a-f]{64}$/);
  assert.match(
    result.pathname,
    /^fandex\/brand-fit\/stored-evidence\/v1\/iu\/estee-lauder\/[0-9a-f]{64}\.json$/,
  );
  assert.equal(result.storageWriteAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
  assert.equal(result.publicPublicationAuthorized, false);
});

test('receipt containing API credential field fails closed', async () => {
  const parsed = JSON.parse(await receiptBody());
  parsed.apiKey = 'should-never-appear';

  assert.deepEqual(
    validateBrandFitProductionObservationReceipt(JSON.stringify(parsed)),
    {
      status: 'invalid-receipt',
      contractVersion: 'brand-fit-production-observation-receipt-v1',
      reason: 'unexpected-sensitive-field',
    },
  );
});

test('receipt containing raw title fails closed even when all digests remain untouched', async () => {
  const parsed = JSON.parse(await receiptBody());
  parsed.raw = { title: 'provider-title' };

  const result =
    validateBrandFitProductionObservationReceipt(JSON.stringify(parsed));
  assert.equal(result.status, 'invalid-receipt');
  if (result.status !== 'invalid-receipt') return;
  assert.equal(result.reason, 'unexpected-sensitive-field');
});

test('tampered evidence digest fails closed', async () => {
  const parsed = JSON.parse(await receiptBody());
  parsed.storedEvidenceReview.evidenceDigest = 'f'.repeat(64);

  const result =
    validateBrandFitProductionObservationReceipt(JSON.stringify(parsed));
  assert.equal(result.status, 'invalid-receipt');
  if (result.status !== 'invalid-receipt') return;
  assert.equal(result.reason, 'immutable-binding-invalid');
});

test('tampered immutable body fails closed', async () => {
  const parsed = JSON.parse(await receiptBody());
  const immutableBody = JSON.parse(parsed.immutableEvidenceObject.body);
  immutableBody.evidence.identity.canonicalBrandId = 'other-brand';
  parsed.immutableEvidenceObject.body = JSON.stringify(immutableBody);

  const result =
    validateBrandFitProductionObservationReceipt(JSON.stringify(parsed));
  assert.equal(result.status, 'invalid-receipt');
  if (result.status !== 'invalid-receipt') return;
  assert.equal(result.reason, 'immutable-record-invalid');
});

test('path substitution fails even with a valid immutable body', async () => {
  const parsed = JSON.parse(await receiptBody());
  parsed.immutableEvidenceObject.pathname =
    'fandex/brand-fit/stored-evidence/v1/iu/other-brand/'
    + parsed.storedEvidenceReview.evidenceDigest
    + '.json';

  const result =
    validateBrandFitProductionObservationReceipt(JSON.stringify(parsed));
  assert.equal(result.status, 'invalid-receipt');
  if (result.status !== 'invalid-receipt') return;
  assert.equal(result.reason, 'immutable-binding-invalid');
});

test('success-looking output without immutable object is not accepted', async () => {
  const parsed = JSON.parse(await receiptBody());
  delete parsed.immutableEvidenceObject;

  const result =
    validateBrandFitProductionObservationReceipt(JSON.stringify(parsed));
  assert.equal(result.status, 'invalid-receipt');
  if (result.status !== 'invalid-receipt') return;
  assert.equal(result.reason, 'shape-invalid');
});
