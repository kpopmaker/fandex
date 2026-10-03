import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeAuditSubmissionReadiness,
  type SnsFandomYoutubeAuditSubmissionInput,
} from '../lib/intelligence/snsFandomPointYoutubeAuditSubmissionReadiness';
import {
  evaluateSnsFandomYoutubeQuotaWorksheet,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaWorksheet';
import {
  evaluateSnsFandomYoutubeProviderClientIdentity,
} from '../lib/intelligence/snsFandomPointYoutubeProviderClientIdentity';
import {
  evaluateSnsFandomYoutubeAuditArtistBindingManifest,
} from '../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';

function providerClientIdentity() {
  return evaluateSnsFandomYoutubeProviderClientIdentity({
    providerId: 'youtube-data-api',
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    googleCloudProjectNumber: '123456789012',
    googleCloudProjectId: 'fandex-youtube-primary',
    credentialLocatorRef:
      'github-actions-secret://FANDEX_SNS_FANDOM_YOUTUBE_API_KEY',
    evidenceRef: 'external://youtube-audit/cloud-project',
    verifiedAt: '2026-10-02T11:30:00.000Z',
  });
}

function artistBindingManifest() {
  return evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    manifestId: 'youtube-audit-binding-manifest-study-v1',
    evidenceRef: 'external://youtube-audit/verified-channel-bindings',
    members: Array.from({ length: 12 }, (_, index) => ({
      canonicalArtistId: `artist-${index + 1}`,
      youtubeChannelId:
        `UC${String(index + 1).padStart(22, '0')}`,
      bindingState: 'verified' as const,
      includedInAuditScope: true,
      evidenceRef: `external://youtube-binding/artist-${index + 1}`,
      verifiedAt: '2026-10-02T11:30:00.000Z',
      sharedChannelCaveat: null,
    })),
  });
}

function quotaWorksheet() {
  return evaluateSnsFandomYoutubeQuotaWorksheet({
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    measuredAt: '2026-10-02T11:00:00.000Z',
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
      'youtube.commentThreads.list',
      'youtube.comments.list',
    ],
    artistBindingManifest: artistBindingManifest(),
    measuredUsage: {
      artistChannelCount: 12,
      uploadManifestPageCountPerReactionRun: 7,
      videoCountPerReactionRun: 120,
      commentThreadPageCountPerPersistenceRun: 10,
      commentPageCountPerPersistenceRun: 5,
      reactionSnapshotRunsPerDay: 4,
      commentPersistenceRunsPerDay: 1,
    },
    requestBatching: {
      strategy: 'provider-limit-evidenced',
      channelIdsPerCall: 50,
      videoIdsPerCall: 50,
    },
    providerLimits: {
      maxChannelIdsPerCall: 50,
      maxVideoIdsPerCall: 50,
    },
    quotaUnitsPerCall: {
      'youtube.channels.list': 1,
      'youtube.playlistItems.list': 1,
      'youtube.videos.list': 1,
      'youtube.commentThreads.list': 1,
      'youtube.comments.list': 1,
    },
    evidence: {
      measuredUsageEvidenceRef: 'external://youtube-audit/measured-usage',
      cadenceEvidenceRef: 'external://youtube-audit/cadence',
      requestBatchingEvidenceRef:
        'external://youtube-audit/client-request-batching',
      providerBatchLimitEvidenceRef:
        'external://youtube-audit/provider-batch-limits',
      providerQuotaCostEvidenceRef:
        'external://youtube-audit/provider-quota-costs',
    },
  });
}

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
    providerClientIdentity: providerClientIdentity(),
    quotaWorksheet: quotaWorksheet(),
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
  assert.equal(result.providerClientIdentityValidated, true);
  assert.equal(result.googleCloudProjectNumber, '123456789012');
  assert.equal(result.quotaEvidenceValidated, true);
  assert.equal(result.minimumProjectedQuotaUnitsPerDay, 59);
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


test('audit submission cannot become ready from a quota evidence reference alone', () => {
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness(
    submission({
      quotaWorksheet: null,
    }),
  );

  assert.equal(result.state, 'submission-blocked');
  assert.equal(result.quotaEvidenceValidated, false);
  assert.equal(result.minimumProjectedQuotaUnitsPerDay, null);
  assert.ok(
    result.blockers.includes('youtube-audit-quota-worksheet-missing'),
  );
});

test('quota worksheet must be bound to the exact provider client', () => {
  const worksheet = {
    ...quotaWorksheet(),
    providerClientRef: 'gcp-project-other',
  };
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness(
    submission({
      quotaWorksheet: worksheet,
    }),
  );

  assert.equal(result.state, 'submission-blocked');
  assert.equal(result.quotaEvidenceValidated, false);
  assert.ok(
    result.blockers.includes(
      'youtube-audit-quota-provider-client-mismatch',
    ),
  );
});

test('quota worksheet endpoint scope must exactly match the submitted application scope', () => {
  const base = submission();
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness({
    ...base,
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
  });

  assert.equal(result.state, 'submission-blocked');
  assert.equal(result.quotaEvidenceValidated, false);
  assert.ok(
    result.blockers.includes(
      'youtube-audit-quota-endpoint-scope-mismatch',
    ),
  );
});


test('audit submission cannot become ready from a Cloud project evidence ref alone', () => {
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness(
    submission({
      providerClientIdentity: null,
    }),
  );

  assert.equal(result.state, 'submission-blocked');
  assert.equal(result.providerClientIdentityValidated, false);
  assert.equal(result.googleCloudProjectNumber, null);
  assert.ok(
    result.blockers.includes(
      'youtube-audit-provider-client-identity-missing',
    ),
  );
});

test('provider client identity must match the exact audit provider client ref', () => {
  const identity = {
    ...providerClientIdentity(),
    providerClientRef: 'gcp-project-other',
  };
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness(
    submission({
      providerClientIdentity: identity,
    }),
  );

  assert.equal(result.state, 'submission-blocked');
  assert.equal(result.providerClientIdentityValidated, false);
  assert.ok(
    result.blockers.includes(
      'youtube-audit-provider-client-ref-mismatch',
    ),
  );
});

test('Cloud project evidence ref must be the evidence used by the validated client identity', () => {
  const base = submission();
  const result = evaluateSnsFandomYoutubeAuditSubmissionReadiness({
    ...base,
    evidence: {
      ...base.evidence,
      cloudProjectRef: 'external://youtube-audit/different-cloud-project',
    },
  });

  assert.equal(result.state, 'submission-blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-cloud-project-evidence-mismatch',
    ),
  );
});
