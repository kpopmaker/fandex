import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1,
  parseSnsFandomYoutubeV2CutoverApprovalEvidenceRefV1,
} from '../lib/intelligence/snsFandomPointYoutubeV2CutoverApprovalEvidenceV1';

const SHA = '1111111111111111111111111111111111111111';
const REF =
  'github-issue://kpopmaker/fandex/issues/509#issuecomment-12345';

function approvedBody(sha = SHA): string {
  return [
    'approvalVersion=sns_fandom_youtube_v2_cutover_owner_approval_v1',
    'authorizedRevisionSha=' + sha,
    'canonicalRebaselineAuthorized=true',
    'newGenerationProviderExecutionAuthorized=true',
    'schedulerCutoverAuthorized=true',
    'providerSubmissionAuthorized=false',
    'productionCollectionAuthorized=false',
    'productActivationAuthorized=false',
    'historicalBackfillAuthorized=false',
    'retrospectiveProviderObservationAuthorized=false',
    'retrospectiveReceiptSynthesisAuthorized=false',
  ].join('\n');
}

function approvedInput() {
  return {
    evidenceRef: REF,
    authorizedRevisionSha: SHA,
    comment: {
      issueUrl: 'https://api.github.com/repos/kpopmaker/fandex/issues/509',
      htmlUrl:
        'https://github.com/kpopmaker/fandex/issues/509#issuecomment-12345',
      userLogin: 'kpopmaker',
      authorAssociation: 'OWNER',
      body: approvedBody(),
    },
  };
}

test('accepts durable owner approval bound to the exact revision', () => {
  const result =
    evaluateSnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1(approvedInput());

  assert.equal(result.state, 'accepted');
  assert.deepEqual(result.blockers, []);
  assert.equal(result.commentId, 12345);
  assert.equal(result.canonicalRebaselineAuthorized, true);
  assert.equal(result.newGenerationProviderExecutionAuthorized, true);
  assert.equal(result.schedulerCutoverAuthorized, true);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
});

test('rejects approval body bound to a different revision', () => {
  const input = approvedInput();
  const result = evaluateSnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1({
    ...input,
    comment: {
      ...input.comment,
      body: approvedBody('2222222222222222222222222222222222222222'),
    },
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'sns-fandom-v2-cutover-owner-approval-body-missing:authorizedRevisionSha',
    ),
  );
});

test('rejects non-owner or wrong issue evidence', () => {
  const input = approvedInput();
  const result = evaluateSnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1({
    ...input,
    comment: {
      ...input.comment,
      issueUrl: 'https://api.github.com/repos/kpopmaker/fandex/issues/424',
      userLogin: 'someone-else',
      authorAssociation: 'CONTRIBUTOR',
    },
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'sns-fandom-v2-cutover-owner-approval-issue-mismatch',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'sns-fandom-v2-cutover-owner-approval-user-mismatch',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'sns-fandom-v2-cutover-owner-approval-association-mismatch',
    ),
  );
});

test('rejects incomplete authority and unsafe authorization drift', () => {
  const input = approvedInput();
  const result = evaluateSnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1({
    ...input,
    comment: {
      ...input.comment,
      body: approvedBody()
        .replace('schedulerCutoverAuthorized=true\n', '')
        .replace(
          'providerSubmissionAuthorized=false',
          'providerSubmissionAuthorized=true',
        ),
    },
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'sns-fandom-v2-cutover-owner-approval-body-missing:schedulerCutoverAuthorized',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'sns-fandom-v2-cutover-owner-approval-body-missing:providerSubmissionAuthorized',
    ),
  );
});

test('parses only durable #509 issue comment refs', () => {
  assert.equal(
    parseSnsFandomYoutubeV2CutoverApprovalEvidenceRefV1(REF),
    12345,
  );
  assert.throws(
    () => parseSnsFandomYoutubeV2CutoverApprovalEvidenceRefV1(
      'github-issue://kpopmaker/fandex/issues/424#issuecomment-12345',
    ),
    /sns_fandom_v2_cutover_owner_approval_ref_invalid/,
  );
});
