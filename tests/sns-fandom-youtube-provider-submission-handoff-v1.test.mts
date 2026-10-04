import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type SnsFandomYoutubeAuditSubmissionReadiness,
} from '../lib/intelligence/snsFandomPointYoutubeAuditSubmissionReadiness';
import {
  evaluateSnsFandomYoutubeProviderSubmissionHandoff,
} from '../lib/intelligence/snsFandomPointYoutubeProviderSubmissionHandoff';

const READY: SnsFandomYoutubeAuditSubmissionReadiness = Object.freeze({
  contractVersion: 'sns-fandom-youtube-audit-submission-readiness-v1',
  state: 'submission-ready',
  providerClientRef: 'gcp-project-fandex-509708',
  requestType: 'compliance-audit-additional-quota',
  useCase: 'analytics-reporting',
  requestedEndpoints: Object.freeze([
    'youtube.channels.list',
    'youtube.playlistItems.list',
    'youtube.videos.list',
  ]),
  amendmentAcknowledged: true,
  providerClientIdentityValidated: true,
  googleCloudProjectNumber: '385464276768',
  quotaEvidenceValidated: true,
  minimumProjectedQuotaUnitsPerDay: 288,
  providerApprovalGranted: false,
  productionCollectionAuthorized: false,
  blockers: Object.freeze([]),
});

const REVISION = '1111111111111111111111111111111111111111';

function handoff(
  overrides: Partial<Parameters<
    typeof evaluateSnsFandomYoutubeProviderSubmissionHandoff
  >[0]['approval']> = {},
  readiness: SnsFandomYoutubeAuditSubmissionReadiness = READY,
  currentRevisionSha = REVISION,
) {
  return evaluateSnsFandomYoutubeProviderSubmissionHandoff({
    auditReadiness: readiness,
    currentRevisionSha,
    approval: {
      approved: false,
      approvalEvidenceRef: null,
      approvedAt: null,
      approvedRevisionSha: null,
      providerClientRef: null,
      ...overrides,
    },
  });
}

test('submission-blocked audit state can never authorize provider submission', () => {
  const blocked: SnsFandomYoutubeAuditSubmissionReadiness = Object.freeze({
    ...READY,
    state: 'submission-blocked',
    quotaEvidenceValidated: false,
    minimumProjectedQuotaUnitsPerDay: null,
    blockers: Object.freeze(['youtube-audit-quota-worksheet-missing']),
  });

  const result = handoff({
    approved: true,
    approvalEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/481#synthetic-approval',
    approvedAt: '2027-10-04T15:10:00.000Z',
    approvedRevisionSha: REVISION,
    providerClientRef: READY.providerClientRef,
  }, blocked);

  assert.equal(result.state, 'submission-not-ready');
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.providerSubmissionExecutionPerformed, false);
});

test('submission-ready still waits for separate explicit owner approval', () => {
  const result = handoff();

  assert.equal(result.state, 'awaiting-provider-submission-approval');
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.deepEqual(result.blockers, [
    'youtube-provider-submission-owner-approval-missing',
  ]);
});

test('approved stale revision is rejected', () => {
  const result = handoff({
    approved: true,
    approvalEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/481#synthetic-approval',
    approvedAt: '2027-10-04T15:10:00.000Z',
    approvedRevisionSha:
      '2222222222222222222222222222222222222222',
    providerClientRef: READY.providerClientRef,
  });

  assert.equal(
    result.state,
    'provider-submission-authorization-invalid',
  );
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.ok(
    result.blockers.includes(
      'youtube-provider-submission-approved-revision-stale',
    ),
  );
});

test('provider client mismatch is rejected', () => {
  const result = handoff({
    approved: true,
    approvalEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/481#synthetic-approval',
    approvedAt: '2027-10-04T15:10:00.000Z',
    approvedRevisionSha: REVISION,
    providerClientRef: 'gcp-project-other',
  });

  assert.equal(
    result.state,
    'provider-submission-authorization-invalid',
  );
  assert.ok(
    result.blockers.includes(
      'youtube-provider-submission-provider-client-ref-mismatch',
    ),
  );
});

test('approval evidence must be durable, non-secret, and timestamped exactly', () => {
  const result = handoff({
    approved: true,
    approvalEvidenceRef:
      'https://github.com/kpopmaker/fandex/issues/481?access_token=secret',
    approvedAt: '2027-10-04T15:10:00Z',
    approvedRevisionSha: REVISION,
    providerClientRef: READY.providerClientRef,
  });

  assert.equal(
    result.state,
    'provider-submission-authorization-invalid',
  );
  assert.ok(
    result.blockers.includes(
      'youtube-provider-submission-approval-evidence-secret-like',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-provider-submission-approved-at-invalid',
    ),
  );
});

test('valid explicit approval authorizes submission only, never downstream provider/product gates', () => {
  const result = handoff({
    approved: true,
    approvalEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/481#synthetic-approval',
    approvedAt: '2027-10-04T15:10:00.000Z',
    approvedRevisionSha: REVISION,
    providerClientRef: READY.providerClientRef,
  });

  assert.equal(result.state, 'provider-submission-authorized');
  assert.equal(result.providerSubmissionAuthorized, true);
  assert.equal(result.automaticProviderSubmissionAllowed, false);
  assert.equal(result.providerSubmissionExecutionPerformed, false);
  assert.equal(result.providerApprovalGranted, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.productActivationAuthorized, false);
  assert.deepEqual(result.blockers, []);
});
