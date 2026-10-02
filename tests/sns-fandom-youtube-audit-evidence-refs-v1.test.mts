import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(path: string) {
  return JSON.parse(
    await readFile(new URL('../' + path, import.meta.url), 'utf8'),
  ) as Record<string, unknown>;
}

test('live audit evidence snapshot records Production legal surface as HTTP 200', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const resolved = raw.resolvedEvidence as Record<string, unknown>;
  const deployment = raw.productionDeployment as Record<string, unknown>;

  const repositoryState = raw.repositoryStateAtRefresh as Record<string, unknown>;
  assert.equal(
    repositoryState.currentMainSha,
    'd205a92cc28020ebded14100c3fcf75e1347f68a',
  );
  assert.equal(
    repositoryState.productionDeploymentGitSha,
    '4a2aea90961f597d644515334360fa80df0e0517',
  );
  assert.equal(repositoryState.productionMatchesCurrentMain, false);
  assert.equal(deployment.gitSha, repositoryState.productionDeploymentGitSha);
  assert.equal(deployment.state, 'READY');
  assert.equal(deployment.target, 'production');
  assert.equal(
    resolved.privacyPolicySourceRef,
    'repo://app/privacy/page.tsx@4a2aea90961f597d644515334360fa80df0e0517',
  );
  assert.equal(
    resolved.termsDocumentationRef,
    'repo://app/terms/page.tsx@4a2aea90961f597d644515334360fa80df0e0517',
  );
  assert.equal(
    resolved.legalFooterSourceRef,
    'repo://app/components/LegalFooter.tsx@4a2aea90961f597d644515334360fa80df0e0517',
  );
  assert.equal(
    repositoryState.currentMainPrivacyPolicySourceRef,
    'repo://app/privacy/page.tsx@d205a92cc28020ebded14100c3fcf75e1347f68a',
  );
  assert.equal(repositoryState.currentMainPrivacyPolicyDeployed, false);
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

test('external-owner evidence remains unresolved instead of fabricated', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const unresolved = raw.unresolvedEvidence as Record<string, unknown>;
  const keys = [
    'applicantIdentityRef',
    'organizationOrSelfRef',
    'privacyPolicyScreenshotRef',
    'homepageScreenshotRef',
    'dashboardFeatureScreenshotRef',
    'providerClientIdentityRef',
    'googleCloudProjectNumber',
    'cloudProjectRef',
    'realMeasurementWindowRef',
    'cadenceEvidenceRef',
    'uploadManifestPageCountPerReactionRun',
    'videoCountPerReactionRun',
    'quotaEstimateRef',
    'maxChannelIdsPerCall',
    'maxVideoIdsPerCall',
    'providerBatchLimitEvidenceRef',
  ];
  for (const key of keys) assert.equal(unresolved[key], null);
  assert.equal(raw.fixtureValuesAreProductionEvidence, false);
  assert.equal(raw.providerApprovalGranted, false);
  assert.equal(raw.productionCollectionAuthorized, false);
  assert.equal(raw.providerSubmissionAuthorized, false);
});

test('audit packet no longer records Production privacy/terms pages as 404', async () => {
  const packet = await readFile(
    new URL('../docs/research/sns-fandom-youtube-api-audit-packet-v1.md', import.meta.url),
    'utf8',
  );
  assert.ok(packet.includes('/privacy` -> HTTP 200'));
  assert.ok(packet.includes('/terms` -> HTTP 200'));
  assert.ok(packet.includes('earlier 404 legal-surface blocker is resolved'));
  assert.match(packet.toLowerCase(), /fixtures are never valid\s+production evidence/);
});


test('evidence discovery keeps Cloud project and real cadence unresolved', async () => {
  const raw = await readJson(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
  );
  const discovery = raw.evidenceDiscovery as Record<string, unknown>;

  assert.equal(discovery.googleDriveSearchPerformed, true);
  assert.equal(discovery.googleDriveCloudProjectEvidenceFound, false);
  assert.equal(discovery.googleDriveMatchedFileCount, 0);
  assert.equal(discovery.githubApprovedCadenceSearchPerformed, true);
  assert.equal(discovery.githubApprovedCadenceEvidenceFound, false);
});
