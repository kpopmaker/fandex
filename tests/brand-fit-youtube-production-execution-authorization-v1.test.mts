import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_APPROVAL_MARKER,
  parseBrandFitYouTubeProductionExecutionAuthorizationComment,
} from '../lib/intelligence/brandFitYouTubeProductionExecutionAuthorization';
import {
  evaluateBrandFitYouTubeProductionExecutionGate,
} from '../lib/intelligence/brandFitYouTubeProductionExecutionGate';

const MAIN = 'c42eb3fcf5404e99e790028e41f9aeced3ffbf53';
const AUTH = 'brand-fit-youtube-execution-20261002t001500z-v1';

function approvalBody(overrides: Record<string, string> = {}) {
  const values = {
    authorizationId: AUTH,
    authorizedMainSha: MAIN,
    maximumExecutions: '1',
    targetVideoId: '39CUlBDuRSo',
    canonicalArtistId: 'iu',
    canonicalBrandId: 'estee-lauder',
    canonicalCampaignId:
      'estee-lauder-korea-new-night-campaign-2025-iu',
    ...overrides,
  };
  return [
    BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_APPROVAL_MARKER,
    ...Object.entries(values).map(([key, value]) => key + ': ' + value),
  ].join('\n');
}

test('owner authorization comment parses only exact bounded target', () => {
  const parsed =
    parseBrandFitYouTubeProductionExecutionAuthorizationComment(
      approvalBody(),
    );

  assert.ok(parsed);
  assert.equal(parsed.authorizationId, AUTH);
  assert.equal(parsed.authorizedMainSha, MAIN);
  assert.equal(parsed.maximumExecutions, 1);
  assert.equal(parsed.targetVideoId, '39CUlBDuRSo');
});

test('authorization comment with another target video fails closed', () => {
  assert.equal(
    parseBrandFitYouTubeProductionExecutionAuthorizationComment(
      approvalBody({ targetVideoId: 'vl0FzlZicOs' }),
    ),
    null,
  );
});

test('matching owner approval authorizes exactly one unconsumed execution', () => {
  const result = evaluateBrandFitYouTubeProductionExecutionGate({
    authorizationId: AUTH,
    expectedMainSha: MAIN,
    currentRunId: 200,
    issueComments: [{
      id: 10,
      body: approvalBody(),
      authorLogin: 'kpopmaker',
    }],
    workflowRuns: [{
      id: 199,
      conclusion: 'failure',
      providerExecutionStepSucceeded: false,
    }],
  });

  assert.equal(result.status, 'authorized');
  if (result.status !== 'authorized') return;
  assert.equal(result.authorizationCommentId, 10);
  assert.equal(result.maximumExecutions, 1);
});

test('same-looking comment from another account is never authorization', () => {
  const result = evaluateBrandFitYouTubeProductionExecutionGate({
    authorizationId: AUTH,
    expectedMainSha: MAIN,
    currentRunId: 200,
    issueComments: [{
      id: 10,
      body: approvalBody(),
      authorLogin: 'not-owner',
    }],
    workflowRuns: [],
  });

  assert.deepEqual(result, {
    status: 'blocked',
    contractVersion: 'brand-fit-youtube-production-execution-gate-v1',
    reason: 'authorization-comment-missing',
  });
});

test('authorization is exact-bound to the approved main SHA and ID', () => {
  const comments = [{
    id: 10,
    body: approvalBody(),
    authorLogin: 'kpopmaker',
  }];

  for (const input of [
    {
      authorizationId:
        'brand-fit-youtube-execution-20261002t001501z-v1',
      expectedMainSha: MAIN,
    },
    {
      authorizationId: AUTH,
      expectedMainSha: 'f'.repeat(40),
    },
  ]) {
    const result = evaluateBrandFitYouTubeProductionExecutionGate({
      ...input,
      currentRunId: 200,
      issueComments: comments,
      workflowRuns: [],
    });
    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') continue;
    assert.equal(result.reason, 'authorization-mismatch');
  }
});

test('any prior successful dispatch consumes the one-shot authorization', () => {
  const result = evaluateBrandFitYouTubeProductionExecutionGate({
    authorizationId: AUTH,
    expectedMainSha: MAIN,
    currentRunId: 200,
    issueComments: [{
      id: 10,
      body: approvalBody(),
      authorLogin: 'kpopmaker',
    }],
    workflowRuns: [{
      id: 198,
      conclusion: 'success',
      providerExecutionStepSucceeded: false,
    }],
  });

  assert.deepEqual(result, {
    status: 'blocked',
    contractVersion: 'brand-fit-youtube-production-execution-gate-v1',
    reason: 'execution-already-consumed',
  });
});

test('current successful run id is ignored while evaluating prior consumption', () => {
  const result = evaluateBrandFitYouTubeProductionExecutionGate({
    authorizationId: AUTH,
    expectedMainSha: MAIN,
    currentRunId: 200,
    issueComments: [{
      id: 10,
      body: approvalBody(),
      authorLogin: 'kpopmaker',
    }],
    workflowRuns: [{
      id: 200,
      conclusion: 'success',
      providerExecutionStepSucceeded: true,
    }],
  });

  assert.equal(result.status, 'authorized');
});


test('provider-step success consumes authorization even if the overall prior workflow failed', () => {
  const result = evaluateBrandFitYouTubeProductionExecutionGate({
    authorizationId: AUTH,
    expectedMainSha: MAIN,
    currentRunId: 200,
    issueComments: [{
      id: 10,
      body: approvalBody(),
      authorLogin: 'kpopmaker',
    }],
    workflowRuns: [{
      id: 197,
      conclusion: 'failure',
      providerExecutionStepSucceeded: true,
    }],
  });

  assert.deepEqual(result, {
    status: 'blocked',
    contractVersion: 'brand-fit-youtube-production-execution-gate-v1',
    reason: 'execution-already-consumed',
  });
});
