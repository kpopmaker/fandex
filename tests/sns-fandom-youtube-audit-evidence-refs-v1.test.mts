import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(path: string) {
  return JSON.parse(
    await readFile(new URL('../' + path, import.meta.url), 'utf8'),
  ) as Record<string, unknown>;
}

test('live audit evidence snapshot records current Production legal surface', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const resolved = raw.resolvedEvidence as Record<string, unknown>;
  const deployment = raw.productionDeployment as Record<string, unknown>;
  const repositoryState =
    raw.repositoryStateAtRefresh as Record<string, unknown>;

  assert.equal(
    repositoryState.currentMainSha,
    '1f511f45ad2a5b7936fcd043d6d318d8cbb14bb1',
  );
  assert.equal(
    repositoryState.productionDeploymentGitSha,
    '1f511f45ad2a5b7936fcd043d6d318d8cbb14bb1',
  );
  assert.equal(repositoryState.productionMatchesCurrentMain, true);
  assert.equal(deployment.gitSha, repositoryState.productionDeploymentGitSha);
  assert.equal(deployment.state, 'READY');
  assert.equal(deployment.target, 'production');
  assert.equal(
    deployment.deploymentId,
    'dpl_Ugg1UJU2aL8BRNAehUowmHeZF5QD',
  );

  assert.equal(
    resolved.privacyPolicySourceRef,
    'repo://app/privacy/page.tsx@1f511f45ad2a5b7936fcd043d6d318d8cbb14bb1',
  );
  assert.equal(
    resolved.termsDocumentationRef,
    'repo://app/terms/page.tsx@1f511f45ad2a5b7936fcd043d6d318d8cbb14bb1',
  );
  assert.equal(
    resolved.legalFooterSourceRef,
    'repo://app/components/LegalFooter.tsx@1f511f45ad2a5b7936fcd043d6d318d8cbb14bb1',
  );
  assert.equal(
    repositoryState.currentMainPrivacyPolicySourceRef,
    'repo://app/privacy/page.tsx@1f511f45ad2a5b7936fcd043d6d318d8cbb14bb1',
  );
  assert.equal(repositoryState.currentMainPrivacyPolicyDeployed, true);

  assert.equal(resolved.primaryAccessHttpStatus, 200);
  assert.equal(resolved.privacyPolicyHttpStatus, 200);
  assert.equal(resolved.termsOfServiceHttpStatus, 200);

  assert.equal(
    resolved.providerQuotaCostEvidenceRef,
    'https://developers.google.com/youtube/v3/determine_quota_cost',
  );
  assert.deepEqual(
    resolved.quotaUnitsPerCall,
    {
      'youtube.channels.list': 1,
      'youtube.playlistItems.list': 1,
      'youtube.videos.list': 1,
    },
  );
  assert.equal(resolved.playlistItemsMaxResultsPerPage, 50);
  assert.equal(
    resolved.requestBatchingStrategy,
    'singleton-only-until-provider-batch-limit-evidence',
  );
  assert.equal(resolved.channelIdsPerCall, 1);
  assert.equal(resolved.videoIdsPerCall, 1);
  assert.equal(
    resolved.requestBatchingEvidenceRef,
    'repo://lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff.ts#singleton-only-until-provider-batch-limit-evidence',
  );
  assert.equal(resolved.providerBatchLimitClaimed, false);
  assert.equal('maxChannelIdsPerCall' in resolved, false);
});

test('audit cohort evidence is exactly the merged five-member v1 manifest', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const resolved = raw.resolvedEvidence as Record<string, unknown>;

  assert.equal(resolved.auditCohortMemberCount, 5);
  assert.equal(
    resolved.auditCohortManifestRef,
    'repo://data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json@main',
  );
});

test('legal and real dashboard screenshots are resolved while synthetic dashboard history stays rejected', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const resolved = raw.resolvedEvidence as Record<string, unknown>;
  const bundle =
    resolved.screenshotEvidenceBundle as Record<string, unknown>;
  const files = bundle.files as Record<string, Record<string, unknown>>;

  assert.equal(
    resolved.privacyPolicyScreenshotRef,
    'github-actions://kpopmaker/fandex/runs/37025375542/artifacts/11235301864#privacy-policy.png',
  );
  assert.equal(
    resolved.homepageScreenshotRef,
    'github-actions://kpopmaker/fandex/runs/37025375542/artifacts/11235301864#homepage-legal-links.png',
  );
  assert.equal(bundle.githubWorkflowRunId, '37025375542');
  assert.equal(bundle.githubArtifactId, '11235301864');
  assert.equal(
    bundle.githubArtifactDigest,
    'sha256:b764b7ac2d41f13ca4011727f6797eb10aa8ba2bd46a9a9278b4533ae96ebf19',
  );
  assert.equal(
    bundle.googleDriveFileId,
    '1llzxJnLw0CVsOiQuYHzbX_O8OlcCto-j',
  );

  assert.equal(
    files.privacyPolicy.sha256,
    '209294b1320cbfea2c25c587c2e774c8f116beb1288bcd90613ccc385965b513',
  );
  assert.equal(
    files.homepageLegalLinks.sha256,
    'd7b7059e805a9f1b34ac68be43a2eafecdcfef1a83a5b3565c6ffef95f1523b1',
  );
  assert.equal('analyticsReportingDashboard' in files, false);

  const dashboardBundle =
    resolved.dashboardFeatureScreenshotEvidenceBundle as Record<string, unknown>;
  assert.equal(
    resolved.dashboardFeatureScreenshotRef,
    'github-actions://kpopmaker/fandex/runs/37178153638/artifacts/11294013664#youtube-analytics-evidence.png',
  );
  assert.equal(
    resolved.dashboardFeatureScreenshotSha256,
    '5cdb6fd5fac3924c3fea26e9180d2d681560b3b344186fc742f7b605f431d06e',
  );
  assert.equal(dashboardBundle.githubWorkflowRunId, '37178153638');
  assert.equal(dashboardBundle.githubArtifactId, '11294013664');
  assert.equal(
    dashboardBundle.githubArtifactDigest,
    'sha256:05b3e88324037fe99728de4b3242a36015b7de76daaa8cf235a932f326477270',
  );
  assert.equal(
    dashboardBundle.productionDeploymentId,
    'dpl_AFagtuZ63wZUKCSShLB2qGQMNHZv',
  );
  assert.equal(
    dashboardBundle.productionGitSha,
    '11514e123bdfd95f810691aaeaaed7c49755cb18',
  );
  assert.equal(
    dashboardBundle.googleDriveFileId,
    '1g3Di6MJ4x6djND5cZnNey0uMOfWMOHvz',
  );
  assert.equal(
    dashboardBundle.googleDriveArchiveFileId,
    '17LPe_NPl0DYX92Sn4UfMDl_UqsVYExkr',
  );

  const unresolved = raw.unresolvedEvidence as Record<string, unknown>;
  assert.equal('dashboardFeatureScreenshotRef' in unresolved, false);

  const rejected = raw.rejectedEvidence as Record<string, unknown>;
  const dashboardCandidate = rejected.dashboardFeatureScreenshotCandidate as Record<string, unknown>;
  assert.equal(
    dashboardCandidate.ref,
    'github-actions://kpopmaker/fandex/runs/37025375542/artifacts/11235301864#analytics-reporting-dashboard.png',
  );
  assert.equal(
    dashboardCandidate.rejectionReason,
    'source-is-explicitly-synthetic-preview-homepage-not-production-analytics-reporting-feature',
  );
});

test('resolved Phase A and Phase B evidence is recorded while remaining external-owner evidence stays fail-closed', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const resolved = raw.resolvedEvidence as Record<string, unknown>;
  const unresolved = raw.unresolvedEvidence as Record<string, unknown>;
  const keys = [
    'uploadManifestPageCountPerReactionRun',
    'videoCountPerReactionRun',
    'quotaEstimateRef',
  ];

  for (const key of keys) assert.equal(unresolved[key], null);

  assert.equal(
    resolved.applicantIdentityRef,
    'https://docs.google.com/document/d/1Hbv5JP7n0ixYDNwcaJPg2Nx8JN_pK1ultruvf1BBaX4/edit?usp=drivesdk',
  );
  assert.equal(
    resolved.organizationOrSelfRef,
    'https://docs.google.com/document/d/1Hbv5JP7n0ixYDNwcaJPg2Nx8JN_pK1ultruvf1BBaX4/edit?usp=drivesdk',
  );
  assert.equal(
    resolved.submissionOwnerEvidenceState,
    'submission-owner-evidence-ready',
  );
  assert.equal(
    resolved.derivedMetricsAndStorageAmendmentAccepted,
    true,
  );
  assert.equal('applicantIdentityRef' in unresolved, false);
  assert.equal('organizationOrSelfRef' in unresolved, false);

  const optionalOptimization =
    raw.optionalOptimizationEvidence as Record<string, unknown>;
  assert.equal(optionalOptimization.maxChannelIdsPerCall, null);
  assert.equal(optionalOptimization.maxVideoIdsPerCall, null);
  assert.equal(optionalOptimization.providerBatchLimitEvidenceRef, null);
  assert.equal(
    optionalOptimization.requiredForCurrentSingletonQuotaWorksheet,
    false,
  );

  assert.equal(resolved.providerClientIdentityRef, 'gcp-project-fandex-509708');
  assert.equal(resolved.googleCloudProjectNumber, '385464276768');
  assert.equal(resolved.googleCloudProjectId, 'fandex-509708');
  assert.equal(
    resolved.cloudProjectRef,
    'github-issue://kpopmaker/fandex/issues/424#provider-client-owner-evidence-2026-10-03',
  );
  assert.equal(resolved.providerClientVerifiedAt, '2026-10-03T03:10:00.000Z');
  assert.equal(resolved.realMeasurementWindowRef, 'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631');
  assert.equal(resolved.measurementWindowStart, '2026-10-03T15:00:00.000Z');
  assert.equal(resolved.measurementWindowEnd, '2027-10-04T15:00:00.000Z');
  assert.equal(resolved.reactionSnapshotRunsPerDay, 24);
  assert.equal(resolved.cadenceEvidenceRef, 'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631');
  assert.equal(resolved.measurementPlanApprovedAt, '2026-10-03T09:53:43.000Z');
  assert.equal('realMeasurementWindowRef' in unresolved, false);
  assert.equal('cadenceEvidenceRef' in unresolved, false);
  assert.equal('providerClientIdentityRef' in unresolved, false);
  assert.equal('googleCloudProjectNumber' in unresolved, false);
  assert.equal('maxChannelIdsPerCall' in unresolved, false);
  assert.equal('maxVideoIdsPerCall' in unresolved, false);
  assert.equal('providerBatchLimitEvidenceRef' in unresolved, false);
  assert.equal('cloudProjectRef' in unresolved, false);
  assert.equal('privacyPolicyScreenshotRef' in unresolved, false);
  assert.equal('homepageScreenshotRef' in unresolved, false);
  assert.equal('dashboardFeatureScreenshotRef' in unresolved, false);

  assert.equal(raw.fixtureValuesAreProductionEvidence, false);
  assert.equal(raw.providerApprovalGranted, false);
  assert.equal(raw.productionCollectionAuthorized, false);
  assert.equal(raw.providerSubmissionAuthorized, false);
});

test('superseded Phase B plan and pre-window one-shot remain historical only', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const superseded =
    raw.supersededEvidence as Record<string, Record<string, unknown>>;
  const priorPlan = superseded.priorMeasurementPlanV1;
  const priorRun = superseded.priorPlanBoundedMeasurementRun;

  assert.equal(priorPlan.state, 'superseded');
  assert.equal(priorPlan.measurementWindowStart, '2026-10-03T04:06:51.000Z');
  assert.equal(priorPlan.measurementWindowEnd, '2027-10-03T04:06:51.000Z');
  assert.equal(priorPlan.reactionSnapshotRunsPerDay, 24);
  assert.equal(priorPlan.evidenceRef, 'github-issue://kpopmaker/fandex/issues/424#issuecomment-5965374359');
  assert.equal(priorPlan.supersededBy, 'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631');

  assert.equal(priorRun.state, 'historical-only');
  assert.equal(priorRun.workflowRunId, '37114464736');
  assert.equal(priorRun.completedAt, '2026-10-03T09:52:21Z');
  assert.equal(priorRun.artifactId, '11271008104');
  assert.equal(
    priorRun.artifactDigest,
    'sha256:348d383c6a0f148fc4dd3592d7604844032007586927ab6beb620fe48ac58721',
  );
  assert.equal(priorRun.supersedingWindowStart, '2026-10-03T15:00:00.000Z');
  assert.equal(priorRun.eligibility, 'not-eligible-for-new-canonical-plan');
  assert.equal(
    priorRun.reason,
    'completed-before-superseding-measurement-window-start',
  );
});

test('audit packet no longer records Production privacy/terms pages as 404', async () => {
  const packet = await readFile(
    new URL(
      '../docs/research/sns-fandom-youtube-api-audit-packet-v1.md',
      import.meta.url,
    ),
    'utf8',
  );

  assert.ok(packet.includes('/privacy` -> HTTP 200'));
  assert.ok(packet.includes('/terms` -> HTTP 200'));
  assert.ok(
    packet.includes('earlier 404 legal-surface blocker is resolved'),
  );
  assert.match(
    packet.toLowerCase(),
    /fixtures are never valid\s+production evidence/,
  );
});

test('evidence discovery preserves history while recording owner Cloud and approved cadence evidence', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const discovery = raw.evidenceDiscovery as Record<string, unknown>;

  assert.equal(discovery.googleDriveSearchPerformed, true);
  assert.equal(discovery.googleDriveCloudProjectEvidenceFound, false);
  assert.equal(discovery.googleDriveMatchedFileCount, 0);
  assert.equal(discovery.ownerProvidedCloudProjectEvidenceFound, true);
  assert.equal(
    discovery.ownerProvidedCloudProjectEvidenceRef,
    'github-issue://kpopmaker/fandex/issues/424#provider-client-owner-evidence-2026-10-03',
  );
  assert.equal(discovery.githubApprovedCadenceSearchPerformed, true);
  assert.equal(discovery.githubApprovedCadenceEvidenceFound, true);
  assert.equal(
    discovery.ownerApprovedCadenceEvidenceRef,
    'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631',
  );
});


test('current canonical bounded measurement is recorded without promoting incomplete-window quota evidence', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const measurement =
    raw.currentBoundedMeasurementEvidence as Record<string, unknown>;

  assert.equal(
    measurement.state,
    'current-plan-bounded-snapshot-recorded',
  );
  assert.equal(measurement.authorizationCommentId, '5970501121');
  assert.equal(
    measurement.sourceMainSha,
    'f7a0965e5708ddf00ebacfe58ab8740e1d89084f',
  );
  assert.equal(measurement.workflowRunId, '37132802429');
  assert.equal(measurement.workflowConclusion, 'success');
  assert.equal(measurement.artifactId, '11277073687');
  assert.equal(
    measurement.artifactDigest,
    'sha256:3d7fdbed7f314c75bc49f992493a2adffc5f2442915a37a39992367a56e1c37c',
  );
  assert.equal(
    measurement.measurementWindowStart,
    '2026-10-03T15:00:00.000Z',
  );
  assert.equal(
    measurement.measurementWindowEnd,
    '2027-10-04T15:00:00.000Z',
  );
  assert.equal(
    measurement.measuredAt,
    '2026-10-03T15:19:42.325Z',
  );
  assert.equal(measurement.measurementWindowComplete, false);
  assert.equal(measurement.uploadManifestPageCountPerReactionRun, 115);
  assert.equal(measurement.videoCountPerReactionRun, 0);
  assert.equal(measurement.trueZeroVideoCountObserved, true);
  assert.equal(measurement.quotaUnitsObserved, 120);
  assert.equal(measurement.quotaWorksheetEligible, false);
  assert.equal(
    measurement.quotaWorksheetEligibilityReason,
    'measurement-window-incomplete',
  );
  assert.equal(measurement.finalOwnerEvidencePromotionAllowed, false);
  assert.equal(measurement.productionCollectionAuthorized, false);
  assert.equal(measurement.providerSubmissionAuthorized, false);
  assert.equal(measurement.schedulerMutationAuthorized, false);

  const unresolved = raw.unresolvedEvidence as Record<string, unknown>;
  assert.equal(unresolved.uploadManifestPageCountPerReactionRun, null);
  assert.equal(unresolved.videoCountPerReactionRun, null);
  assert.equal(unresolved.quotaEstimateRef, null);
});

test('quota owner instructions explicitly preserve observed zero video counts', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
  );
  const instructions = raw.instructions as Record<string, unknown>;
  const text = String(instructions.videoCountPerReactionRun);

  assert.match(text, /non-negative integer/i);
  assert.match(text, /Observed zero is valid evidence/i);
  assert.match(text, /must not be rewritten to Missing or one/i);

  assert.equal(raw.measuredAt, null);
  assert.equal(raw.uploadManifestPageCountPerReactionRun, null);
  assert.equal(raw.videoCountPerReactionRun, null);
  assert.equal(raw.measuredUsageEvidenceRef, null);
});
