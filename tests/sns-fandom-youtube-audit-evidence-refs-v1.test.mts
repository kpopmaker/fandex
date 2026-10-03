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

test('legal screenshots are resolved while synthetic dashboard evidence stays rejected', async () => {
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

  const unresolved = raw.unresolvedEvidence as Record<string, unknown>;
  assert.equal(unresolved.dashboardFeatureScreenshotRef, null);

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

test('resolved provider-client evidence is recorded while remaining external-owner evidence stays fail-closed', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const resolved = raw.resolvedEvidence as Record<string, unknown>;
  const unresolved = raw.unresolvedEvidence as Record<string, unknown>;
  const keys = [
    'applicantIdentityRef',
    'organizationOrSelfRef',
    'realMeasurementWindowRef',
    'cadenceEvidenceRef',
    'uploadManifestPageCountPerReactionRun',
    'videoCountPerReactionRun',
    'quotaEstimateRef',
    'maxChannelIdsPerCall',
    'maxVideoIdsPerCall',
    'providerBatchLimitEvidenceRef',
    'dashboardFeatureScreenshotRef',
  ];

  for (const key of keys) assert.equal(unresolved[key], null);

  assert.equal(resolved.providerClientIdentityRef, 'gcp-project-fandex-509708');
  assert.equal(resolved.googleCloudProjectNumber, '385464276768');
  assert.equal(resolved.googleCloudProjectId, 'fandex-509708');
  assert.equal(
    resolved.cloudProjectRef,
    'github-issue://kpopmaker/fandex/issues/424#provider-client-owner-evidence-2026-10-03',
  );
  assert.equal(resolved.providerClientVerifiedAt, '2026-10-03T03:10:00.000Z');
  assert.equal('providerClientIdentityRef' in unresolved, false);
  assert.equal('googleCloudProjectNumber' in unresolved, false);
  assert.equal('cloudProjectRef' in unresolved, false);
  assert.equal('privacyPolicyScreenshotRef' in unresolved, false);
  assert.equal('homepageScreenshotRef' in unresolved, false);

  assert.equal(raw.fixtureValuesAreProductionEvidence, false);
  assert.equal(raw.providerApprovalGranted, false);
  assert.equal(raw.productionCollectionAuthorized, false);
  assert.equal(raw.providerSubmissionAuthorized, false);
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

test('evidence discovery preserves historical Drive result while recording owner Cloud evidence and unresolved cadence', async () => {
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
  assert.equal(discovery.githubApprovedCadenceEvidenceFound, false);
});
