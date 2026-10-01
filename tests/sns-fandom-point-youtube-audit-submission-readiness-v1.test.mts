import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeAuditSubmissionReadiness,
  type SnsFandomYoutubeAuditSubmissionInput,
} from '../lib/intelligence/snsFandomPointYoutubeAuditSubmissionReadiness';

function submission(
  overrides: Partial<SnsFandomYoutubeAuditSubmissionInput> = {},
): SnsFandomYoutubeAuditSubmissionInput {
  return {
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    requestType: 'compliance-audit-additional-quota',
    useCase: 'analytics-reporting',
    derivedMetricsAndStorageAmendmentAccepted: true,
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
      'youtube.commentThreads.list',
      'youtube.comments.list',
    ],
    evidence: {
      applicantIdentityRef: 'external://youtube-audit/applicant',
      organizationOrSelfRef: 'external://youtube-audit/organization',
      primaryAccessUrl: 'https://fandex.example.com',
      privacyPolicyUrl: 'https://fandex.example.com/privacy',
      termsOfServiceUrl: 'https://fandex.example.com/terms',
      privacyPolicyScreenshotRef: 'external://youtube-audit/privacy-screenshot',
      homepageScreenshotRef: 'external://youtube-audit/homepage-screenshot',
      termsDocumentationRef: 'external://youtube-audit/terms-document',
      dashboardFeatureScreenshotRef: 'external://youtube-audit/dashboard-screenshot',
      cloudProjectRef: 'external://youtube-audit/cloud-project',
      quotaEstimateRef: 'external://youtube-audit/quota-estimate',
      businessModelDescriptionRef: 'external://youtube-audit/business-model',
    },
    demoCredentialHandling: {
      requiredByReviewFlow: false,
      credentialsCommittedToRepository: false,
      secureExternalSubmissionPrepared: false,
    },
    ...overrides,
  };
}

test('complete audit packet can become submission-ready but never provider-approved', () => {
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness(
    submission(),
  );

  assert.equal(result.state, 'submission-ready');
  assert.equal(result.amendmentAcknowledged, true);
  assert.equal(result.providerApprovalGranted, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.deepEqual(result.blockers, []);
});

test('amendment acknowledgement is mandatory for the derived-metrics request', () => {
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness(
    submission({
      derivedMetricsAndStorageAmendmentAccepted: false,
    }),
  );

  assert.equal(result.state, 'submission-blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-derived-metrics-amendment-not-accepted',
    ),
  );
});

test('public access, privacy policy and terms must use https URLs', () => {
  const base = submission();
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness({
    ...base,
    evidence: {
      ...base.evidence,
      primaryAccessUrl: null,
      privacyPolicyUrl: 'http://example.com/privacy',
      termsOfServiceUrl: '',
    },
  });

  assert.equal(result.state, 'submission-blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-primary-access-url-missing-or-invalid',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-audit-privacy-policy-url-missing-or-invalid',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-audit-terms-url-missing-or-invalid',
    ),
  );
});

test('required analytics endpoints cannot be omitted from the application scope', () => {
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness(
    submission({
      requestedEndpoints: [
        'youtube.channels.list',
        'youtube.videos.list',
      ],
    }),
  );

  assert.equal(result.state, 'submission-blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-required-endpoint-missing',
    ),
  );
});

test('demo credentials are never repository evidence and must stay in secure provider submission flow', () => {
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness(
    submission({
      demoCredentialHandling: {
        requiredByReviewFlow: true,
        credentialsCommittedToRepository: true,
        secureExternalSubmissionPrepared: false,
      },
    }),
  );

  assert.equal(result.state, 'submission-blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-demo-credentials-must-not-be-committed',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-audit-demo-credentials-secure-submission-not-prepared',
    ),
  );
});

test('submission readiness does not infer approval from screenshots or acknowledgements', () => {
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness(
    submission(),
  );

  assert.equal(result.state, 'submission-ready');
  assert.equal(result.providerApprovalGranted, false);
  assert.equal(result.productionCollectionAuthorized, false);
});

test('secret-like material in evidence references is rejected', () => {
  const base = submission();
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness({
    ...base,
    evidence: {
      ...base.evidence,
      cloudProjectRef:
        'external://provider?access_token=do-not-store-this',
    },
  });

  assert.equal(result.state, 'submission-blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-evidence-ref-secret-like',
    ),
  );
});
