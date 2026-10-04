import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeDashboardScreenshotEvidence,
  type SnsFandomYoutubeDashboardScreenshotCandidate,
} from '../lib/intelligence/snsFandomPointYoutubeDashboardScreenshotEvidence';

async function evidenceJson() {
  return JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Record<string, unknown>;
}

function candidate(
  overrides: Partial<SnsFandomYoutubeDashboardScreenshotCandidate> = {},
): SnsFandomYoutubeDashboardScreenshotCandidate {
  return {
    screenshotRef:
      'github-actions://kpopmaker/fandex/runs/999/artifacts/888#youtube-analytics-evidence.png',
    screenshotSha256:
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    sourceUrl: 'https://fandex.example.com/youtube-analytics-evidence',
    sourceRoute: '/youtube-analytics-evidence',
    sourceHttpStatus: 200,
    deploymentId: 'dpl_Example123',
    deploymentGitSha: '0123456789abcdef0123456789abcdef01234567',
    capturedAt: '2026-10-04T03:30:00.000Z',
    renderedEvidence: {
      workflowRunId: '37132802429',
      artifactId: '11277073687',
      measuredAt: '2026-10-03T15:19:42.325Z',
      uploadManifestPageCountPerReactionRun: 115,
      videoCountPerReactionRun: 0,
      quotaUnitsObserved: 120,
      measurementWindowComplete: false,
      trueZeroVideoCountObserved: true,
      quotaWorksheetEligible: false,
      finalOwnerEvidencePromotionAllowed: false,
    },
    mockOrPreviewSeedMetricUsed: false,
    rawVideoIdentifiersVisible: false,
    rawStatisticsVisible: false,
    secretMaterialVisible: false,
    ...overrides,
  };
}

test('a screenshot can only become an evidence candidate when it is bound to the current bounded provider evidence', async () => {
  const raw = await evidenceJson();
  const bounded =
    raw.currentBoundedMeasurementEvidence as Record<string, unknown>;

  const result = evaluateSnsFandomYoutubeDashboardScreenshotEvidence(
    candidate(),
    {
      workflowRunId: bounded.workflowRunId as string,
      artifactId: bounded.artifactId as string,
      measuredAt: bounded.measuredAt as string,
      uploadManifestPageCountPerReactionRun:
        bounded.uploadManifestPageCountPerReactionRun as number,
      videoCountPerReactionRun:
        bounded.videoCountPerReactionRun as number,
      quotaUnitsObserved: bounded.quotaUnitsObserved as number,
      measurementWindowComplete:
        bounded.measurementWindowComplete as false,
      trueZeroVideoCountObserved:
        bounded.trueZeroVideoCountObserved as true,
      quotaWorksheetEligible:
        bounded.quotaWorksheetEligible as false,
      finalOwnerEvidencePromotionAllowed:
        bounded.finalOwnerEvidencePromotionAllowed as false,
    },
  );

  assert.equal(result.status, 'accepted-evidence-candidate');
  if (result.status !== 'accepted-evidence-candidate') return;

  assert.equal(result.sourceRoute, '/youtube-analytics-evidence');
  assert.equal(result.sourceHttpStatus, 200);
  assert.equal(result.boundedMeasurementWorkflowRunId, '37132802429');
  assert.equal(result.evidencePromotionAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.schedulerMutationAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
});

test('the current repository remains unresolved until a real deployed screenshot exists', async () => {
  const raw = await evidenceJson();
  const unresolved =
    raw.unresolvedEvidence as Record<string, unknown>;

  assert.equal(unresolved.dashboardFeatureScreenshotRef, null);
});

test('404, wrong route, preview seed, or synthetic metrics fail closed', async () => {
  const raw = await evidenceJson();
  const bounded =
    raw.currentBoundedMeasurementEvidence as Record<string, unknown>;

  const result = evaluateSnsFandomYoutubeDashboardScreenshotEvidence(
    candidate({
      sourceUrl: 'https://fandex.example.com/charts',
      sourceRoute: '/charts',
      sourceHttpStatus: 404,
      mockOrPreviewSeedMetricUsed: true,
      renderedEvidence: {
        ...candidate().renderedEvidence,
        videoCountPerReactionRun: 1,
        trueZeroVideoCountObserved: false,
      },
    }),
    {
      workflowRunId: bounded.workflowRunId as string,
      artifactId: bounded.artifactId as string,
      measuredAt: bounded.measuredAt as string,
      uploadManifestPageCountPerReactionRun:
        bounded.uploadManifestPageCountPerReactionRun as number,
      videoCountPerReactionRun:
        bounded.videoCountPerReactionRun as number,
      quotaUnitsObserved: bounded.quotaUnitsObserved as number,
      measurementWindowComplete:
        bounded.measurementWindowComplete as false,
      trueZeroVideoCountObserved:
        bounded.trueZeroVideoCountObserved as true,
      quotaWorksheetEligible:
        bounded.quotaWorksheetEligible as false,
      finalOwnerEvidencePromotionAllowed:
        bounded.finalOwnerEvidencePromotionAllowed as false,
    },
  );

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.ok(result.blockers.includes('dashboard-source-url-invalid'));
  assert.ok(result.blockers.includes('dashboard-source-route-invalid'));
  assert.ok(result.blockers.includes('dashboard-source-http-status-not-200'));
  assert.ok(result.blockers.includes('dashboard-video-count-mismatch'));
  assert.ok(result.blockers.includes('dashboard-true-zero-mismatch'));
  assert.ok(result.blockers.includes('dashboard-mock-or-preview-seed-metric-used'));
});

test('temporary refs, malformed hashes, secrets, and authorization boundary violations fail closed', async () => {
  const raw = await evidenceJson();
  const bounded =
    raw.currentBoundedMeasurementEvidence as Record<string, unknown>;

  const result = evaluateSnsFandomYoutubeDashboardScreenshotEvidence(
    candidate({
      screenshotRef:
        'https://example.com/screenshot.png?access_token=secret',
      screenshotSha256: 'not-a-digest',
      secretMaterialVisible: true,
      rawVideoIdentifiersVisible: true,
      rawStatisticsVisible: true,
      renderedEvidence: {
        ...candidate().renderedEvidence,
        quotaWorksheetEligible: true,
        finalOwnerEvidencePromotionAllowed: true,
      },
    }),
    {
      workflowRunId: bounded.workflowRunId as string,
      artifactId: bounded.artifactId as string,
      measuredAt: bounded.measuredAt as string,
      uploadManifestPageCountPerReactionRun:
        bounded.uploadManifestPageCountPerReactionRun as number,
      videoCountPerReactionRun:
        bounded.videoCountPerReactionRun as number,
      quotaUnitsObserved: bounded.quotaUnitsObserved as number,
      measurementWindowComplete:
        bounded.measurementWindowComplete as false,
      trueZeroVideoCountObserved:
        bounded.trueZeroVideoCountObserved as true,
      quotaWorksheetEligible:
        bounded.quotaWorksheetEligible as false,
      finalOwnerEvidencePromotionAllowed:
        bounded.finalOwnerEvidencePromotionAllowed as false,
    },
  );

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.ok(
    result.blockers.includes(
      'dashboard-screenshot-ref-missing-or-not-durable',
    ),
  );
  assert.ok(result.blockers.includes('dashboard-screenshot-sha256-invalid'));
  assert.ok(result.blockers.includes('dashboard-secret-material-visible'));
  assert.ok(result.blockers.includes('dashboard-raw-video-identifiers-visible'));
  assert.ok(result.blockers.includes('dashboard-raw-statistics-visible'));
  assert.ok(result.blockers.includes('dashboard-quota-eligibility-mismatch'));
  assert.ok(
    result.blockers.includes(
      'dashboard-final-promotion-boundary-mismatch',
    ),
  );
});


test('current user-provided Production capture is an accepted candidate but remains unpromoted', async () => {
  const raw = await evidenceJson();
  const bounded =
    raw.currentBoundedMeasurementEvidence as Record<string, unknown>;
  const candidateEvidence =
    (raw.candidateEvidence as Record<string, unknown>)
      .dashboardFeatureScreenshot as Record<string, unknown>;

  const result = evaluateSnsFandomYoutubeDashboardScreenshotEvidence(
    {
      screenshotRef: candidateEvidence.screenshotRef as string,
      screenshotSha256: candidateEvidence.screenshotSha256 as string,
      sourceUrl: candidateEvidence.sourceUrl as string,
      sourceRoute: candidateEvidence.sourceRoute as string,
      sourceHttpStatus: candidateEvidence.sourceHttpStatus as number,
      deploymentId: candidateEvidence.deploymentId as string,
      deploymentGitSha: candidateEvidence.deploymentGitSha as string,
      capturedAt: candidateEvidence.capturedAt as string,
      renderedEvidence:
        candidateEvidence.renderedEvidence as SnsFandomYoutubeDashboardScreenshotCandidate['renderedEvidence'],
      mockOrPreviewSeedMetricUsed:
        candidateEvidence.mockOrPreviewSeedMetricUsed as boolean,
      rawVideoIdentifiersVisible:
        candidateEvidence.rawVideoIdentifiersVisible as boolean,
      rawStatisticsVisible:
        candidateEvidence.rawStatisticsVisible as boolean,
      secretMaterialVisible:
        candidateEvidence.secretMaterialVisible as boolean,
    },
    {
      workflowRunId: bounded.workflowRunId as string,
      artifactId: bounded.artifactId as string,
      measuredAt: bounded.measuredAt as string,
      uploadManifestPageCountPerReactionRun:
        bounded.uploadManifestPageCountPerReactionRun as number,
      videoCountPerReactionRun:
        bounded.videoCountPerReactionRun as number,
      quotaUnitsObserved: bounded.quotaUnitsObserved as number,
      measurementWindowComplete:
        bounded.measurementWindowComplete as false,
      trueZeroVideoCountObserved:
        bounded.trueZeroVideoCountObserved as true,
      quotaWorksheetEligible:
        bounded.quotaWorksheetEligible as false,
      finalOwnerEvidencePromotionAllowed:
        bounded.finalOwnerEvidencePromotionAllowed as false,
    },
  );

  assert.equal(result.status, 'accepted-evidence-candidate');
  if (result.status !== 'accepted-evidence-candidate') return;

  assert.equal(
    result.screenshotRef,
    'https://drive.google.com/file/d/1EZXN2C0Y5Xfe8aQpctEi37lvIpPYIbGF/view?usp=drivesdk',
  );
  assert.equal(
    result.screenshotSha256,
    'ea7fea1838d0c0762ef76484457cbf6418e7fcf7b4cdd8684d8495e58d02c417',
  );
  assert.equal(
    result.deploymentId,
    'dpl_AFagtuZ63wZUKCSShLB2qGQMNHZv',
  );
  assert.equal(
    result.deploymentGitSha,
    '11514e123bdfd95f810691aaeaaed7c49755cb18',
  );
  assert.equal(result.capturedAt, '2026-10-04T04:49:23.000Z');
  assert.equal(result.evidencePromotionAuthorized, false);

  const unresolved =
    raw.unresolvedEvidence as Record<string, unknown>;
  assert.equal(unresolved.dashboardFeatureScreenshotRef, null);
  assert.equal(candidateEvidence.promotionState, 'candidate-only');
  assert.equal(candidateEvidence.captureMimeType, 'application/pdf');
  assert.equal(candidateEvidence.capturePageCount, 2);
});
