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
import {
  evaluateSnsFandomYoutubeQuotaCloseout,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaCloseout';
import {
  evaluateSnsFandomYoutubeQuotaEstimateMaterialization,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaEstimateMaterialization';
import {
  evaluateSnsFandomYoutubeAuditArtistBindingManifest,
  type SnsFandomYoutubeAuditArtistBindingManifestInput,
} from '../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';
import {
  evaluateSnsFandomYoutubeSubmissionOwnerHandoff,
  type SnsFandomYoutubeSubmissionOwnerHandoffInput,
} from '../lib/intelligence/snsFandomPointYoutubeSubmissionOwnerHandoff';
import {
  evaluateSnsFandomYoutubeProviderSubmissionHandoff,
  type SnsFandomYoutubeProviderSubmissionApprovalInput,
} from '../lib/intelligence/snsFandomPointYoutubeProviderSubmissionHandoff';

async function readJson(path: string) {
  return JSON.parse(
    await readFile(new URL('../' + path, import.meta.url), 'utf8'),
  ) as Record<string, unknown>;
}

test('current owner files resolve Phase A and Phase B plan while remaining submission blockers fail closed', async () => {
  const providerRaw = await readJson(
    'docs/research/sns-fandom-youtube-provider-client-owner-input-v1.json',
  );
  const quotaRaw = await readJson(
    'docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
  );
  const evidenceRaw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const submissionOwnerRaw = await readJson(
    'docs/research/sns-fandom-youtube-submission-owner-input-v1.json',
  );
  const artistBindingRaw = await readJson(
    'data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
  );
  const providerSubmissionRaw = await readJson(
    'docs/research/sns-fandom-youtube-provider-submission-owner-input-v1.json',
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
    measurementWindowComplete:
      quotaRaw.measurementWindowComplete as boolean,
    observedThrough: quotaRaw.observedThrough as string | null,
    measurementWindowCompletionEvidenceRef:
      quotaRaw.measurementWindowCompletionEvidenceRef as string | null,
    measuredAt: quotaRaw.measuredAt as string | null,
    uploadManifestPageCountPerReactionRun:
      quotaRaw.uploadManifestPageCountPerReactionRun as number | null,
    videoCountPerReactionRun:
      quotaRaw.videoCountPerReactionRun as number | null,
    measuredUsageEvidenceRef:
      quotaRaw.measuredUsageEvidenceRef as string | null,
    requestBatchingStrategy:
      quotaRaw.requestBatchingStrategy as SnsFandomYoutubeQuotaOwnerHandoffInput['requestBatchingStrategy'],
    channelIdsPerCall: quotaRaw.channelIdsPerCall as number | null,
    videoIdsPerCall: quotaRaw.videoIdsPerCall as number | null,
    requestBatchingEvidenceRef:
      quotaRaw.requestBatchingEvidenceRef as string | null,
    maxChannelIdsPerCall: quotaRaw.maxChannelIdsPerCall as number | null,
    maxVideoIdsPerCall: quotaRaw.maxVideoIdsPerCall as number | null,
    providerBatchLimitEvidenceRef:
      quotaRaw.providerBatchLimitEvidenceRef as string | null,
  };

  const submissionOwnerInput: SnsFandomYoutubeSubmissionOwnerHandoffInput = {
    applicantIdentityRef:
      submissionOwnerRaw.applicantIdentityRef as string | null,
    organizationOrSelfRef:
      submissionOwnerRaw.organizationOrSelfRef as string | null,
    derivedMetricsAndStorageAmendmentAccepted:
      submissionOwnerRaw.derivedMetricsAndStorageAmendmentAccepted as boolean,
  };

  const providerOwner =
    evaluateSnsFandomYoutubeProviderClientOwnerHandoff(providerInput);
  const quotaOwner = evaluateSnsFandomYoutubeQuotaOwnerHandoff(quotaInput);
  const submissionOwner =
    evaluateSnsFandomYoutubeSubmissionOwnerHandoff(submissionOwnerInput);
  const artistBindingManifest =
    evaluateSnsFandomYoutubeAuditArtistBindingManifest(
      artistBindingRaw as unknown as SnsFandomYoutubeAuditArtistBindingManifestInput,
    );

  assert.equal(providerOwner.state, 'provider-client-identity-ready');
  assert.equal(
    providerOwner.providerClientIdentity?.state,
    'provider-client-identity-ready',
  );
  assert.deepEqual(providerOwner.missingOwnerFields, []);
  assert.deepEqual(providerOwner.blockers, []);

  assert.equal(quotaOwner.state, 'measurement-plan-ready');
  assert.deepEqual(quotaOwner.missingPlanFields, []);
  assert.equal(quotaOwner.measurementWindowStart, '2026-10-03T15:00:00.000Z');
  assert.equal(quotaOwner.measurementWindowEnd, '2027-10-04T15:00:00.000Z');
  assert.equal(quotaOwner.reactionSnapshotRunsPerDay, 24);
  assert.equal(
    quotaOwner.cadenceEvidenceRef,
    'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631',
  );
  assert.equal(
    quotaOwner.requestBatchingStrategy,
    'singleton-only-until-provider-batch-limit-evidence',
  );
  assert.equal(quotaOwner.channelIdsPerCall, 1);
  assert.equal(quotaOwner.videoIdsPerCall, 1);
  assert.equal(quotaOwner.maxChannelIdsPerCall, null);
  assert.equal(quotaOwner.maxVideoIdsPerCall, null);
  assert.equal(quotaOwner.measurementWindowComplete, false);
  assert.equal(quotaOwner.observedThrough, null);
  assert.equal(quotaOwner.measurementWindowCompletionEvidenceRef, null);
  assert.deepEqual(
    quotaOwner.completionBlockers,
    ['measurement-window-incomplete'],
  );
  assert.equal(quotaOwner.automaticProviderCallAllowed, false);
  assert.equal(quotaOwner.collectionExecutionAuthorized, false);
  assert.equal(quotaOwner.schedulerMutationAllowed, false);
  assert.equal(quotaOwner.providerSubmissionAuthorized, false);

  assert.equal(submissionOwner.state, 'submission-owner-evidence-ready');
  assert.deepEqual(submissionOwner.pendingOwnerFields, []);
  assert.deepEqual(submissionOwner.blockers, []);
  assert.equal(submissionOwner.applicantIdentityRef, 'https://docs.google.com/document/d/1Hbv5JP7n0ixYDNwcaJPg2Nx8JN_pK1ultruvf1BBaX4/edit?usp=drivesdk');
  assert.equal(submissionOwner.organizationOrSelfRef, 'https://docs.google.com/document/d/1Hbv5JP7n0ixYDNwcaJPg2Nx8JN_pK1ultruvf1BBaX4/edit?usp=drivesdk');
  assert.equal(submissionOwner.amendmentAccepted, true);
  assert.equal(submissionOwner.providerSubmissionAuthorized, false);
  assert.equal(submissionOwner.productionCollectionAuthorized, false);

  const resolved =
    evidenceRaw.resolvedEvidence as Record<string, unknown>;
  const unresolved =
    evidenceRaw.unresolvedEvidence as Record<string, unknown>;
  const rejected =
    evidenceRaw.rejectedEvidence as Record<string, unknown>;
  const quotaUnitsPerCall =
    resolved.quotaUnitsPerCall as Record<string, number>;
  const quotaCloseout = evaluateSnsFandomYoutubeQuotaCloseout({
    providerClientRef: providerInput.providerClientRef ?? '',
    quotaOwnerHandoff: quotaOwner,
    artistBindingManifest,
    reactionQuotaUnitsPerCall: {
      'youtube.channels.list':
        quotaUnitsPerCall['youtube.channels.list'],
      'youtube.playlistItems.list':
        quotaUnitsPerCall['youtube.playlistItems.list'],
      'youtube.videos.list':
        quotaUnitsPerCall['youtube.videos.list'],
    },
    providerQuotaCostEvidenceRef:
      resolved.providerQuotaCostEvidenceRef as string,
  });

  assert.equal(quotaCloseout.state, 'awaiting-completed-window');
  assert.equal(quotaCloseout.quotaWorksheet, null);
  assert.equal(quotaCloseout.estimateCandidate, null);
  assert.equal(quotaCloseout.quotaEstimateRef, null);
  assert.equal(quotaCloseout.providerSubmissionAuthorized, false);

  const currentQuotaEstimateRef =
    typeof resolved.quotaEstimateRef === 'string'
      ? resolved.quotaEstimateRef
      : null;
  const currentQuotaEstimateEstimatedAt =
    typeof resolved.quotaEstimateEstimatedAt === 'string'
      ? resolved.quotaEstimateEstimatedAt
      : null;
  const currentQuotaEstimateMinimum =
    typeof resolved.quotaEstimateMinimumProjectedQuotaUnitsPerDay === 'number'
      ? resolved.quotaEstimateMinimumProjectedQuotaUnitsPerDay
      : null;
  const currentQuotaEstimateRequested =
    typeof resolved.quotaEstimateRequestedQuotaUnitsPerDay === 'number'
      ? resolved.quotaEstimateRequestedQuotaUnitsPerDay
      : null;

  const quotaEstimate = evaluateSnsFandomYoutubeQuotaEstimateMaterialization({
    quotaCloseout,
    quotaEstimateRef: currentQuotaEstimateRef,
    estimatedAt: currentQuotaEstimateEstimatedAt,
    minimumProjectedQuotaUnitsPerDay: currentQuotaEstimateMinimum,
    requestedQuotaUnitsPerDay: currentQuotaEstimateRequested,
    headroomFactorApplied:
      resolved.quotaEstimateHeadroomFactorApplied === true,
  });

  assert.equal(quotaEstimate.state, 'awaiting-completed-window');
  assert.equal(quotaEstimate.quotaEstimateRef, null);
  assert.equal(quotaEstimate.submissionEvidenceEligible, false);
  assert.equal(quotaEstimate.providerSubmissionAuthorized, false);

  assert.equal(
    resolved.dashboardFeatureScreenshotRef,
    'github-actions://kpopmaker/fandex/runs/37178153638/artifacts/11294013664#youtube-analytics-evidence.png',
  );
  assert.equal('dashboardFeatureScreenshotRef' in unresolved, false);
  assert.ok(
    rejected.dashboardFeatureScreenshotCandidate,
  );

  const readiness = evaluateSnsFandomYoutubeAuditSubmissionReadiness({
    providerClientRef: providerInput.providerClientRef ?? '',
    requestType: 'compliance-audit-additional-quota',
    useCase: 'analytics-reporting',
    derivedMetricsAndStorageAmendmentAccepted:
      submissionOwner.amendmentAccepted,
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    providerClientIdentity: providerOwner.providerClientIdentity,
    quotaWorksheet: quotaCloseout.quotaWorksheet,
    evidence: {
      applicantIdentityRef:
        submissionOwner.applicantIdentityRef,
      organizationOrSelfRef:
        submissionOwner.organizationOrSelfRef,
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
        resolved.dashboardFeatureScreenshotRef as string | null,
      cloudProjectRef:
        resolved.cloudProjectRef as string | null,
      quotaEstimateRef:
        quotaEstimate.quotaEstimateRef,
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
    readiness.blockers.includes('youtube-audit-dashboard-screenshot-missing'),
    false,
  );
  assert.equal(
    readiness.blockers.includes('youtube-audit-applicant-identity-evidence-missing'),
    false,
  );
  assert.equal(
    readiness.blockers.includes('youtube-audit-organization-or-self-evidence-missing'),
    false,
  );
  assert.equal(
    readiness.blockers.includes('youtube-audit-derived-metrics-amendment-not-accepted'),
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

  const providerSubmissionApproval:
    SnsFandomYoutubeProviderSubmissionApprovalInput = {
      approved: providerSubmissionRaw.approved === true,
      approvalEvidenceRef:
        providerSubmissionRaw.approvalEvidenceRef as string | null,
      approvedAt: providerSubmissionRaw.approvedAt as string | null,
      approvedRevisionSha:
        providerSubmissionRaw.approvedRevisionSha as string | null,
      providerClientRef:
        providerSubmissionRaw.providerClientRef as string | null,
    };

  const providerSubmissionHandoff =
    evaluateSnsFandomYoutubeProviderSubmissionHandoff({
      auditReadiness: readiness,
      currentRevisionSha:
        '1111111111111111111111111111111111111111',
      approval: providerSubmissionApproval,
    });

  assert.equal(
    providerSubmissionHandoff.state,
    'submission-not-ready',
  );
  assert.equal(
    providerSubmissionHandoff.providerSubmissionAuthorized,
    false,
  );
  assert.equal(
    providerSubmissionHandoff.providerSubmissionExecutionPerformed,
    false,
  );
  assert.equal(
    providerSubmissionHandoff.providerApprovalGranted,
    false,
  );
  assert.equal(
    providerSubmissionHandoff.productionCollectionAuthorized,
    false,
  );
  assert.equal(
    providerSubmissionHandoff.schedulerMutationAllowed,
    false,
  );
  assert.equal(
    providerSubmissionHandoff.productActivationAuthorized,
    false,
  );
});
