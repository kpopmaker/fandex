import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeBrandFitYouTubeObservation,
  sanitizeBrandFitYouTubeManualExecutionResult,
} from '../lib/intelligence/brandFitYouTubeManualExecution';

const apiKey = 'synthetic-brand-fit-youtube-key';

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

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function providerPayload() {
  return {
    items: [{
      id: '39CUlBDuRSo',
      snippet: {
        channelId: 'UCUeEq2B8Cx3Sdjj0Zva7uRA',
        title: 'Estée Lauder X IU | NEW Sleep Drama On-air',
        description: '에스티 로더와 아이유가 함께한 NEW 나이트 캠페인',
        publishedAt: '2025-08-03T00:00:00Z',
      },
    }],
  };
}

test('manual executor performs exactly one bounded provider request and no writes', async () => {
  const requests: URL[] = [];
  const result = await executeBrandFitYouTubeObservation({
    apiKey,
    compliance,
    now: () => new Date('2026-10-01T02:20:00.000Z'),
    fetch: async (input) => {
      requests.push(new URL(input));
      return jsonResponse(providerPayload());
    },
  });

  assert.equal(result.status, 'eligible-for-stored-evidence-review');
  assert.equal(result.providerRequestCount, 1);
  assert.equal(result.databaseWritePerformed, false);
  assert.equal(result.productActivationPerformed, false);
  assert.equal(result.credentialIncludedInOutput, false);
  if (result.status !== 'eligible-for-stored-evidence-review') return;
  assert.equal(result.storedEvidenceReview.status, 'storage-candidate');
  assert.match(result.storedEvidenceReview.evidenceDigest, /^[0-9a-f]{64}$/);
  assert.equal(result.storedEvidenceReview.storageWriteAuthorized, false);
  assert.equal(result.storedEvidenceReview.productActivationAuthorized, false);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].pathname, '/youtube/v3/videos');
  assert.equal(requests[0].searchParams.get('part'), 'snippet');
  assert.equal(requests[0].searchParams.get('id'), '39CUlBDuRSo');
  assert.equal(requests[0].searchParams.get('key'), apiKey);
});

test('sanitized output never includes provider credential or raw title/description', async () => {
  const result = await executeBrandFitYouTubeObservation({
    apiKey,
    compliance,
    now: () => new Date('2026-10-01T02:20:00.000Z'),
    fetch: async () => jsonResponse(providerPayload()),
  });
  assert.equal(result.status, 'eligible-for-stored-evidence-review');

  const serialized = JSON.stringify(
    sanitizeBrandFitYouTubeManualExecutionResult(result),
  );
  assert.doesNotMatch(serialized, new RegExp(apiKey));
  assert.doesNotMatch(serialized, /Sleep Drama On-air/);
  assert.doesNotMatch(serialized, /에스티 로더와 아이유가 함께한/);
  assert.match(serialized, /brandFitPoint/);
  assert.match(serialized, /campaign-appearance/);
  assert.match(serialized, /storage-candidate/);
  assert.match(serialized, /evidenceDigest/);
  assert.match(serialized, /storageWriteAuthorized/);
});

test('invalid credential fails before any provider request', async () => {
  let calls = 0;
  const result = await executeBrandFitYouTubeObservation({
    apiKey: ' bad ',
    compliance,
    fetch: async () => {
      calls += 1;
      return jsonResponse(providerPayload());
    },
  });

  assert.deepEqual(result, {
    status: 'blocked',
    contractVersion: 'brand-fit-youtube-manual-execution-v1',
    reason: 'credential-invalid',
    providerRequestCount: 0,
    databaseWritePerformed: false,
    productActivationPerformed: false,
    credentialIncludedInOutput: false,
  });
  assert.equal(calls, 0);
});

test('provider http failure remains failure and not missing/no-campaign', async () => {
  const result = await executeBrandFitYouTubeObservation({
    apiKey,
    compliance,
    fetch: async () => jsonResponse({ error: 'quota' }, 403),
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'http-failed');
  assert.equal(result.providerRequestCount, 1);
});

test('non-json provider response is rejected', async () => {
  const result = await executeBrandFitYouTubeObservation({
    apiKey,
    compliance,
    fetch: async () => new Response('not-json', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    }),
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'response-invalid');
});

test('invalid provider observation is blocked before evidence handoff', async () => {
  const payload = providerPayload();
  payload.items[0].snippet.publishedAt = '2025-08-03';

  const result = await executeBrandFitYouTubeObservation({
    apiKey,
    compliance,
    now: () => new Date('2026-10-01T02:20:00.000Z'),
    fetch: async () => jsonResponse(payload),
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'observation-rejected');
});

test('missing compliance control blocks evidence handoff after valid provider observation', async () => {
  const result = await executeBrandFitYouTubeObservation({
    apiKey,
    compliance: {
      ...compliance,
      nonAuthorizedMetadataRefreshWithin30Days: false,
    },
    now: () => new Date('2026-10-01T02:20:00.000Z'),
    fetch: async () => jsonResponse(providerPayload()),
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.reason, 'evidence-handoff-rejected');
});
