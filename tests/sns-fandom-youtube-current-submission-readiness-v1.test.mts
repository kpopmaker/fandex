import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeAuditSubmissionReadiness,
} from '../lib/intelligence/snsFandomPointYoutubeAuditSubmissionReadiness';
import {
  evaluateSnsFandomYoutubeProviderClientOwnerHandoff,
  type SnsFandomYoutubeProviderClientOwnerHandoffInput,
} from '../lib/intelligence/snsFandomPointYoutubeProviderClientOwnerHandoff';
import {
  evaluateSnsFandomYoutubeQuotaOwnerHandoff,
  type SnsFandomYoutubeQuotaOwnerHandoffInput,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff';

async function readJson(path: string) {
  return JSON.parse(
    await readFile(new URL('../' + path, import.meta.url), 'utf8'),
  ) as Record<string, unknown>;
}

test('current owner files resolve Phase A while remaining submission blockers fail closed', async () => {
  const providerRaw = await readJson(
    'docs/research/sns-fandom-youtube-provider-client-owner-input-v1.json',
  );
  const quotaRaw = await readJson(
    'docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
  );
  const evidenceRaw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );

  const providerInput: SnsFandomYoutubeProviderClientOwnerHandoffInput = {
    providerClientRef: providerRaw.providerClientRef as string | null,
    googleCloudProjectNumber:
      providerRaw.googleCloudProjectNumber as string | null,
    googleCloudProjectId: providerRaw.googleCloudProjectId as string | null,
    credentialLocatorRef: providerRaw.credentialLocatorRef as string | null,
    cloudProjectEvidenceRef:
      providerRaw.cloudProjectEvidenceRef as string | null,
    verifiedAt: providerRaw.verifiedAt as string | null,
  };
  const quotaInput: SnsFandomYoutubeQuotaOwnerHandoffInput = {
    measurementWindowStart:
      quotaRaw.measurementWindowStart as string | null,
    measurementWindowEnd: quotaRaw.measurementWindowEnd as string | null,
    reactionSnapshotRunsPerDay:
      quotaRaw.reactionSnapshotRunsPerDay as number | null,
    cadenceEvidenceRef: quotaRaw.cadenceEvidenceRef as string | null,
    measuredAt: quotaRaw.measuredAt as string | null,
    uploadManifestPageCountPerReactionRun:
      quotaRaw.uploadManifestPageCountPerReactionRun as number | null,
    videoCountPerReactionRun:
      quotaRaw.videoCountPerReactionRun as number | null,
    measuredUsageEvidenceRef:
      quotaRaw.measuredUsageEvidenceRef as string | null,
    maxChannelIdsPerCall: quotaRaw.maxChannelIdsPerCall as number | null,
    maxVideoIdsPerCall: quotaRaw.maxVideoIdsPerCall as number | null,
    providerBatchLimitEvidenceRef:
      quotaRaw.providerBatchLimitEvidenceRef as string | null,
  };

  const providerOwner =
    evaluateSnsFandomYoutubeProviderClientOwnerHandoff(providerInput);
  const quotaOwner = evaluateSnsFandomYoutubeQuotaOwnerHandoff(quotaInput);

  assert.equal(providerOwner.state, 'provider-client-identity-ready');
  assert.equal(
    providerOwner.providerClientIdentity?.state,
    'provider-client-identity-ready',
  );
  assert.deepEqual(providerOwner.missingOwnerFields, []);
  assert.deepEqual(providerOwner.blockers, []);

  assert.equal(quotaOwner.state, 'awaiting-owner-plan-evidence');
  assert.deepEqual(quotaOwner.missingPlanFields, [
    'cadenceEvidenceRef',
    'measurementWindowEnd',
    'measurementWindowStart',
    'reactionSnapshotRunsPerDay',
  ]);

  const resolved =
    evidenceRaw.resolvedEvidence as Record<string, unknown>;
  const unresolved =
    evidenceRaw.unresolvedEvidence as Record<string, unknown>;
  const rejected =
    evidenceRaw.rejectedEvidence as Record<string, unknown>;

  assert.equal(
    unresolved.dashboardFeatureScreenshotRef,
    null,
  );
  assert.ok(
    rejected.dashboardFeatureScreenshotCandidate,
  );

  const readiness = evaluateSnsFandomYoutubeAuditSubmissionReadiness({
    providerClientRef: providerInput.providerClientRef ?? '',
    requestType: 'compliance-audit-additional-quota',
    useCase: 'analytics-reporting',
    derivedMetricsAndStorageAmendmentAccepted: false,
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    providerClientIdentity: providerOwner.providerClientIdentity,
    quotaWorksheet: null,
    evidence: {
      applicantIdentityRef:
        unresolved.applicantIdentityRef as string | null,
      organizationOrSelfRef:
        unresolved.organizationOrSelfRef as string | null,
      primaryAccessUrl:
        resolved.primaryAccessUrl as string | null,
      privacyPolicyUrl:
        resolved.privacyPolicyUrl as string | null,
      termsOfServiceUrl:
        resolved.termsOfServiceUrl as string | null,
      privacyPolicyScreenshotRef:
        resolved.privacyPolicyScreenshotRef as string | null,
      homepageScreenshotRef:
        resolved.homepageScreenshotRef as string | null,
      termsDocumentationRef:
        resolved.termsDocumentationRef as string | null,
      dashboardFeatureScreenshotRef:
        unresolved.dashboardFeatureScreenshotRef as string | null,
      cloudProjectRef:
        resolved.cloudProjectRef as string | null,
      quotaEstimateRef:
        unresolved.quotaEstimateRef as string | null,
      businessModelDescriptionRef:
        resolved.businessModelDescriptionRef as string | null,
    },
    demoCredentialHandling: {
      requiredByReviewFlow: false,
      credentialsCommittedToRepository: false,
      secureExternalSubmissionPrepared: false,
    },
  });

  assert.equal(readiness.state, 'submission-blocked');
  assert.equal(readiness.providerClientIdentityValidated, true);
  assert.equal(readiness.quotaEvidenceValidated, false);
  assert.equal(readiness.googleCloudProjectNumber, '385464276768');
  assert.equal(readiness.minimumProjectedQuotaUnitsPerDay, null);
  assert.equal(readiness.providerApprovalGranted, false);
  assert.equal(readiness.productionCollectionAuthorized, false);

  assert.deepEqual(
    [...readiness.blockers].sort(),
    [
      'youtube-audit-applicant-identity-evidence-missing',
      'youtube-audit-dashboard-screenshot-missing',
      'youtube-audit-derived-metrics-amendment-not-accepted',
      'youtube-audit-organization-or-self-evidence-missing',
      'youtube-audit-quota-estimate-missing',
      'youtube-audit-quota-worksheet-missing',
    ].sort(),
  );

  assert.equal(
    readiness.blockers.includes('youtube-audit-provider-client-ref-empty'),
    false,
  );
  assert.equal(
    readiness.blockers.includes('youtube-audit-provider-client-identity-missing'),
    false,
  );
  assert.equal(
    readiness.blockers.includes('youtube-audit-cloud-project-evidence-missing'),
    false,
  );
  assert.equal(
    readiness.blockers.includes('youtube-audit-cloud-project-evidence-mismatch'),
    false,
  );
  assert.equal(
    readiness.blockers.includes('youtube-audit-privacy-screenshot-missing'),
    false,
  );
  assert.equal(
    readiness.blockers.includes('youtube-audit-homepage-screenshot-missing'),
    false,
  );
  assert.equal(
    readiness.blockers.includes('youtube-audit-terms-documentation-missing'),
    false,
  );
  assert.equal(
    readiness.blockers.includes(
      'youtube-audit-primary-access-url-missing-or-invalid',
    ),
    false,
  );
  assert.equal(
    readiness.blockers.includes(
      'youtube-audit-privacy-policy-url-missing-or-invalid',
    ),
    false,
  );
  assert.equal(
    readiness.blockers.includes('youtube-audit-terms-url-missing-or-invalid'),
    false,
  );
});
