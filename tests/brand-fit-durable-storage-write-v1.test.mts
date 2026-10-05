import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BRAND_FIT_DURABLE_STORAGE_EVIDENCE_DIGEST,
  BRAND_FIT_DURABLE_STORAGE_PATHNAME,
  BRAND_FIT_DURABLE_STORAGE_PAYLOAD_DIGEST,
  BRAND_FIT_DURABLE_STORAGE_SOURCE_RUN_ID,
  parseBrandFitDurableStorageWriteAuthorizationComment,
} from '../lib/intelligence/brandFitDurableStorageWriteAuthorization';
import {
  evaluateBrandFitDurableStorageWriteGate,
} from '../lib/intelligence/brandFitDurableStorageWriteGate';
import {
  IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
} from '../lib/intelligence/brandFitIdentityBindings';
import {
  buildBrandFitImmutableEvidenceObjectCandidate,
} from '../lib/intelligence/brandFitImmutableEvidenceRecord';
import {
  prepareBrandFitYouTubeEvidenceCandidate,
} from '../lib/intelligence/brandFitProductionCollectionHandoff';
import {
  reviewBrandFitStoredEvidenceCandidate,
} from '../lib/intelligence/brandFitStoredEvidenceReview';
import {
  writeBrandFitStoredEvidenceReceipt,
} from '../lib/intelligence/brandFitStoredEvidenceWrite';
import type {
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

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

function receiptBody(): string {
  const handoff = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance,
    providerObservation: {
      provider: 'youtube-data-api',
      videoId: '39CUlBDuRSo',
      channelId: 'UCUeEq2B8Cx3Sdjj0Zva7uRA',
      title: 'Estée Lauder X IU | NEW Sleep Drama On-air',
      description: '에스티 로더와 아이유가 함께한 NEW 나이트 캠페인',
      publishedAt: '2025-08-03T00:00:00Z',
      collectedAt: '2026-10-01T08:20:00.000Z',
    },
  });
  const review = reviewBrandFitStoredEvidenceCandidate(handoff);
  if (review.status !== 'storage-candidate') {
    throw new Error('test_fixture_review_not_ready');
  }
  const immutable = buildBrandFitImmutableEvidenceObjectCandidate(review);
  const evidence = review.evidence;

  return JSON.stringify({
    status: 'eligible-for-stored-evidence-review',
    contractVersion: 'brand-fit-youtube-manual-execution-v1',
    providerRequestCount: 1,
    databaseWritePerformed: false,
    productActivationPerformed: false,
    credentialIncludedInOutput: false,
    storedEvidenceReview: {
      status: review.status,
      contractVersion: review.contractVersion,
      evidenceDigest: review.evidenceDigest,
      review: review.review,
      storageWriteAuthorized: false,
      productActivationAuthorized: false,
      publicPublicationAuthorized: false,
    },
    immutableEvidenceObject: {
      pathname: immutable.pathname,
      body: immutable.body,
      payloadDigest: immutable.payloadDigest,
      evidenceDigest: immutable.evidenceDigest,
      storageWriteAuthorized: false,
      productActivationAuthorized: false,
      publicPublicationAuthorized: false,
    },
    evidence: {
      variableId: evidence.variableId,
      eventId: evidence.eventId,
      eventType: evidence.eventType,
      relationshipType: evidence.relationshipType,
      identity: evidence.identity,
      source: evidence.source,
      time: evidence.time,
      revision: evidence.revision,
      interpretation: evidence.interpretation,
    },
  });
}

function memoryStore(
  initial: Readonly<Record<string, string>> = {},
): ImmutableTextObjectStore {
  const bodies = new Map(Object.entries(initial));
  return Object.freeze({
    async readText(pathname: string) {
      return bodies.get(pathname) ?? null;
    },
    async listPathnames(prefix: string) {
      return Object.freeze(
        [...bodies.keys()].filter((pathname) =>
          pathname.startsWith(prefix),
        ),
      );
    },
    async putTextIfAbsent(pathname: string, body: string) {
      const existing = bodies.get(pathname);
      if (existing !== undefined) {
        return Object.freeze({
          status:
            existing === body
              ? 'idempotent-existing'
              : 'conflict',
          pathname,
        });
      }
      bodies.set(pathname, body);
      return Object.freeze({
        status: 'created',
        pathname,
      });
    },
  });
}

test('validated Brand Fit receipt writes one immutable object and verifies readback', async () => {
  const receipt = receiptBody();
  const parsed = JSON.parse(receipt);
  const store = memoryStore();

  const result = await writeBrandFitStoredEvidenceReceipt({
    receiptBody: receipt,
    store,
  });

  assert.equal(result.status, 'stored');
  assert.equal(result.objectStatus, 'created');
  assert.equal(result.pathname, parsed.immutableEvidenceObject.pathname);
  assert.equal(
    result.evidenceDigest,
    parsed.immutableEvidenceObject.evidenceDigest,
  );
  assert.equal(
    result.payloadDigest,
    parsed.immutableEvidenceObject.payloadDigest,
  );
  assert.equal(result.databaseWritePerformed, false);
  assert.equal(result.durableObjectWritePerformed, true);
  assert.equal(result.productActivationPerformed, false);
  assert.equal(result.publicPublicationPerformed, false);
});

test('same immutable object is idempotent and never overwritten', async () => {
  const receipt = receiptBody();
  const parsed = JSON.parse(receipt);
  const store = memoryStore({
    [parsed.immutableEvidenceObject.pathname]:
      parsed.immutableEvidenceObject.body,
  });

  const result = await writeBrandFitStoredEvidenceReceipt({
    receiptBody: receipt,
    store,
  });

  assert.equal(result.objectStatus, 'idempotent-existing');
});

test('conflicting immutable object fails closed', async () => {
  const receipt = receiptBody();
  const parsed = JSON.parse(receipt);
  const store = memoryStore({
    [parsed.immutableEvidenceObject.pathname]: '{"conflict":true}',
  });

  await assert.rejects(
    () => writeBrandFitStoredEvidenceReceipt({
      receiptBody: receipt,
      store,
    }),
    /brand_fit_stored_evidence_write_conflict/,
  );
});

test('tampered receipt fails before durable write', async () => {
  const parsed = JSON.parse(receiptBody());
  parsed.immutableEvidenceObject.payloadDigest = 'f'.repeat(64);
  let writes = 0;
  const store = memoryStore();
  const guardedStore: ImmutableTextObjectStore = Object.freeze({
    ...store,
    async putTextIfAbsent(pathname: string, body: string) {
      writes += 1;
      return store.putTextIfAbsent(pathname, body);
    },
  });

  await assert.rejects(
    () => writeBrandFitStoredEvidenceReceipt({
      receiptBody: JSON.stringify(parsed),
      store: guardedStore,
    }),
    /brand_fit_stored_evidence_write_receipt_invalid/,
  );
  assert.equal(writes, 0);
});

function authorizationBody(
  authorizationId = 'brand-fit-storage-write-20261005t140000z-v1',
  sha = 'a'.repeat(40),
): string {
  return [
    'BRAND_FIT_DURABLE_STORAGE_WRITE_AUTHORIZED',
    'authorizationId: ' + authorizationId,
    'authorizedMainSha: ' + sha,
    'sourceRunId: ' + BRAND_FIT_DURABLE_STORAGE_SOURCE_RUN_ID,
    'maximumWrites: 1',
    'evidenceDigest: ' + BRAND_FIT_DURABLE_STORAGE_EVIDENCE_DIGEST,
    'payloadDigest: ' + BRAND_FIT_DURABLE_STORAGE_PAYLOAD_DIGEST,
    'pathname: ' + BRAND_FIT_DURABLE_STORAGE_PATHNAME,
  ].join('\n');
}

test('durable storage authorization parser accepts only the canonical one-shot binding', () => {
  const record =
    parseBrandFitDurableStorageWriteAuthorizationComment(
      authorizationBody(),
    );

  assert.ok(record);
  assert.equal(record.sourceRunId, 37318243229);
  assert.equal(record.maximumWrites, 1);
  assert.equal(
    record.evidenceDigest,
    BRAND_FIT_DURABLE_STORAGE_EVIDENCE_DIGEST,
  );
  assert.equal(
    parseBrandFitDurableStorageWriteAuthorizationComment(
      authorizationBody('brand-fit-storage-write-current-v1'),
    ),
    null,
  );
});

test('durable storage gate authorizes exact owner binding and blocks prior consumption', () => {
  const sha = 'a'.repeat(40);
  const authorizationId =
    'brand-fit-storage-write-20261005t140000z-v1';
  const issueComments = [{
    id: 1,
    body: authorizationBody(authorizationId, sha),
    authorLogin: 'kpopmaker',
  }] as const;

  const authorized = evaluateBrandFitDurableStorageWriteGate({
    authorizationId,
    expectedMainSha: sha,
    currentRunId: 10,
    issueComments,
    workflowRuns: [],
  });
  assert.equal(authorized.status, 'authorized');

  const consumed = evaluateBrandFitDurableStorageWriteGate({
    authorizationId,
    expectedMainSha: sha,
    currentRunId: 11,
    issueComments,
    workflowRuns: [{
      id: 10,
      conclusion: 'failure',
      storageWriteStepSucceeded: true,
    }],
  });
  assert.deepEqual(consumed, {
    status: 'blocked',
    contractVersion: 'brand-fit-durable-storage-write-gate-v1',
    reason: 'storage-write-already-consumed',
  });
});

test('production workflow is pinned to the successful provider receipt and separate storage approval', () => {
  const workflow = readFileSync(
    new URL(
      '../.github/workflows/write-brand-fit-durable-evidence-v1.yml',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(workflow, /run-id: '37318243229'/);
  assert.match(
    workflow,
    /write-brand-fit-durable-evidence-v1/,
  );
  assert.match(
    workflow,
    /Validate owner durable storage authorization and one-shot consumption/,
  );
  assert.match(
    workflow,
    /Write exactly one immutable Brand Fit durable evidence object/,
  );
  assert.match(workflow, /providerCalls=0/);
  assert.match(workflow, /productActivations=0/);
  assert.match(workflow, /publications=0/);
  assert.match(
    workflow,
    /issue_comment:\\n    types: \\[created\\]/,
  );
  assert.match(
    workflow,
    /github\\.event\\.issue\\.number == 367/,
  );
  assert.match(
    workflow,
    /github\\.event\\.comment\\.user\\.login == 'kpopmaker'/,
  );
  assert.match(
    workflow,
    /BRAND_FIT_DURABLE_STORAGE_WRITE_EXECUTE/,
  );
  assert.match(workflow, /GITHUB_EVENT_PATH/);
  assert.match(workflow, /lines\\.length !== 4/);

  const gateScript = readFileSync(
    new URL(
      '../scripts/operations/brandFitDurableStorageWriteGateV1.mts',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(
    gateScript,
    /\\/runs\\?status=completed&per_page=100/,
  );
  assert.doesNotMatch(gateScript, /event=workflow_dispatch/);
});
