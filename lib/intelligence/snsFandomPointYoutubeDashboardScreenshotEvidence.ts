import { isSha256 } from '../shared/canonicalDigest';

export const SNS_FANDOM_YOUTUBE_DASHBOARD_SCREENSHOT_EVIDENCE_VERSION =
  'sns-fandom-youtube-dashboard-screenshot-evidence-v1' as const;

export type SnsFandomYoutubeDashboardScreenshotExpectedBoundedEvidence =
  Readonly<{
    workflowRunId: string;
    artifactId: string;
    measuredAt: string;
    uploadManifestPageCountPerReactionRun: number;
    videoCountPerReactionRun: number;
    quotaUnitsObserved: number;
    measurementWindowComplete: false;
    trueZeroVideoCountObserved: true;
    quotaWorksheetEligible: false;
    finalOwnerEvidencePromotionAllowed: false;
  }>;

export type SnsFandomYoutubeDashboardScreenshotCandidate =
  Readonly<{
    screenshotRef: string | null;
    screenshotSha256: string | null;
    sourceUrl: string | null;
    sourceRoute: string | null;
    sourceHttpStatus: number | null;
    deploymentId: string | null;
    deploymentGitSha: string | null;
    capturedAt: string | null;
    renderedEvidence: Readonly<{
      workflowRunId: string | null;
      artifactId: string | null;
      measuredAt: string | null;
      uploadManifestPageCountPerReactionRun: number | null;
      videoCountPerReactionRun: number | null;
      quotaUnitsObserved: number | null;
      measurementWindowComplete: boolean | null;
      trueZeroVideoCountObserved: boolean | null;
      quotaWorksheetEligible: boolean | null;
      finalOwnerEvidencePromotionAllowed: boolean | null;
    }>;
    mockOrPreviewSeedMetricUsed: boolean;
    rawVideoIdentifiersVisible: boolean;
    rawStatisticsVisible: boolean;
    secretMaterialVisible: boolean;
  }>;

export type SnsFandomYoutubeDashboardScreenshotEvidenceResult =
  | Readonly<{
      status: 'accepted-evidence-candidate';
      contractVersion:
        typeof SNS_FANDOM_YOUTUBE_DASHBOARD_SCREENSHOT_EVIDENCE_VERSION;
      screenshotRef: string;
      screenshotSha256: string;
      sourceUrl: string;
      sourceRoute: '/youtube-analytics-evidence';
      sourceHttpStatus: 200;
      deploymentId: string;
      deploymentGitSha: string;
      capturedAt: string;
      boundedMeasurementWorkflowRunId: string;
      evidencePromotionAuthorized: false;
      providerSubmissionAuthorized: false;
      productionCollectionAuthorized: false;
      schedulerMutationAuthorized: false;
      productActivationAuthorized: false;
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion:
        typeof SNS_FANDOM_YOUTUBE_DASHBOARD_SCREENSHOT_EVIDENCE_VERSION;
      blockers: readonly string[];
      evidencePromotionAuthorized: false;
      providerSubmissionAuthorized: false;
      productionCollectionAuthorized: false;
      schedulerMutationAuthorized: false;
      productActivationAuthorized: false;
    }>;

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function exactIso(value: unknown): string | null {
  const candidate = cleanText(value);
  if (candidate === null) return null;
  const parsed = Date.parse(candidate);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString() === candidate ? candidate : null;
}

function isGitSha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function isDeploymentId(value: unknown): value is string {
  return typeof value === 'string' && /^dpl_[A-Za-z0-9]+$/.test(value);
}

function secretLike(value: string): boolean {
  const normalized = value.toLowerCase();
  return [
    'password=',
    'access_token=',
    'refresh_token=',
    'client_secret=',
    'authorization: bearer ',
    'api_key=',
    'apikey=',
    'key=aiza',
  ].some((needle) => normalized.includes(needle));
}

function durableScreenshotRef(value: unknown): string | null {
  const candidate = cleanText(value);
  if (candidate === null || secretLike(candidate)) return null;

  if (candidate.startsWith('github-actions://')) return candidate;
  if (candidate.startsWith('google-drive://')) return candidate;

  try {
    const url = new URL(candidate);
    if (
      url.protocol === 'https:'
      && url.hostname === 'drive.google.com'
      && url.username === ''
      && url.password === ''
    ) {
      return candidate;
    }
  } catch {
    return null;
  }

  return null;
}

function blocked(
  blockers: readonly string[],
): SnsFandomYoutubeDashboardScreenshotEvidenceResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion:
      SNS_FANDOM_YOUTUBE_DASHBOARD_SCREENSHOT_EVIDENCE_VERSION,
    blockers: Object.freeze([...new Set(blockers)].sort()),
    evidencePromotionAuthorized: false as const,
    providerSubmissionAuthorized: false as const,
    productionCollectionAuthorized: false as const,
    schedulerMutationAuthorized: false as const,
    productActivationAuthorized: false as const,
  });
}

export function evaluateSnsFandomYoutubeDashboardScreenshotEvidence(
  candidate: SnsFandomYoutubeDashboardScreenshotCandidate,
  expected: SnsFandomYoutubeDashboardScreenshotExpectedBoundedEvidence,
): SnsFandomYoutubeDashboardScreenshotEvidenceResult {
  const blockers: string[] = [];

  const screenshotRef = durableScreenshotRef(candidate.screenshotRef);
  if (screenshotRef === null) {
    blockers.push('dashboard-screenshot-ref-missing-or-not-durable');
  }

  if (!isSha256(candidate.screenshotSha256)) {
    blockers.push('dashboard-screenshot-sha256-invalid');
  }

  let sourceUrl: URL | null = null;
  try {
    if (candidate.sourceUrl !== null) {
      sourceUrl = new URL(candidate.sourceUrl);
    }
  } catch {
    sourceUrl = null;
  }

  if (
    sourceUrl === null
    || sourceUrl.protocol !== 'https:'
    || sourceUrl.username !== ''
    || sourceUrl.password !== ''
    || sourceUrl.pathname !== '/youtube-analytics-evidence'
    || sourceUrl.search !== ''
    || sourceUrl.hash !== ''
  ) {
    blockers.push('dashboard-source-url-invalid');
  }

  if (candidate.sourceRoute !== '/youtube-analytics-evidence') {
    blockers.push('dashboard-source-route-invalid');
  }

  if (candidate.sourceHttpStatus !== 200) {
    blockers.push('dashboard-source-http-status-not-200');
  }

  if (!isDeploymentId(candidate.deploymentId)) {
    blockers.push('dashboard-deployment-id-invalid');
  }

  if (!isGitSha(candidate.deploymentGitSha)) {
    blockers.push('dashboard-deployment-git-sha-invalid');
  }

  const capturedAt = exactIso(candidate.capturedAt);
  if (capturedAt === null) {
    blockers.push('dashboard-captured-at-invalid');
  }

  const rendered = candidate.renderedEvidence;

  if (rendered.workflowRunId !== expected.workflowRunId) {
    blockers.push('dashboard-bounded-workflow-run-mismatch');
  }
  if (rendered.artifactId !== expected.artifactId) {
    blockers.push('dashboard-bounded-artifact-mismatch');
  }
  if (rendered.measuredAt !== expected.measuredAt) {
    blockers.push('dashboard-measured-at-mismatch');
  }
  if (
    rendered.uploadManifestPageCountPerReactionRun
    !== expected.uploadManifestPageCountPerReactionRun
  ) {
    blockers.push('dashboard-page-count-mismatch');
  }
  if (
    rendered.videoCountPerReactionRun !== expected.videoCountPerReactionRun
  ) {
    blockers.push('dashboard-video-count-mismatch');
  }
  if (rendered.quotaUnitsObserved !== expected.quotaUnitsObserved) {
    blockers.push('dashboard-quota-units-mismatch');
  }
  if (
    rendered.measurementWindowComplete
    !== expected.measurementWindowComplete
  ) {
    blockers.push('dashboard-window-completeness-mismatch');
  }
  if (
    rendered.trueZeroVideoCountObserved
    !== expected.trueZeroVideoCountObserved
  ) {
    blockers.push('dashboard-true-zero-mismatch');
  }
  if (
    rendered.quotaWorksheetEligible !== expected.quotaWorksheetEligible
  ) {
    blockers.push('dashboard-quota-eligibility-mismatch');
  }
  if (
    rendered.finalOwnerEvidencePromotionAllowed
    !== expected.finalOwnerEvidencePromotionAllowed
  ) {
    blockers.push('dashboard-final-promotion-boundary-mismatch');
  }

  if (candidate.mockOrPreviewSeedMetricUsed !== false) {
    blockers.push('dashboard-mock-or-preview-seed-metric-used');
  }
  if (candidate.rawVideoIdentifiersVisible !== false) {
    blockers.push('dashboard-raw-video-identifiers-visible');
  }
  if (candidate.rawStatisticsVisible !== false) {
    blockers.push('dashboard-raw-statistics-visible');
  }
  if (candidate.secretMaterialVisible !== false) {
    blockers.push('dashboard-secret-material-visible');
  }

  if (blockers.length > 0) return blocked(blockers);

  return Object.freeze({
    status: 'accepted-evidence-candidate' as const,
    contractVersion:
      SNS_FANDOM_YOUTUBE_DASHBOARD_SCREENSHOT_EVIDENCE_VERSION,
    screenshotRef: screenshotRef as string,
    screenshotSha256: candidate.screenshotSha256 as string,
    sourceUrl: sourceUrl!.toString(),
    sourceRoute: '/youtube-analytics-evidence' as const,
    sourceHttpStatus: 200 as const,
    deploymentId: candidate.deploymentId as string,
    deploymentGitSha: candidate.deploymentGitSha as string,
    capturedAt: capturedAt as string,
    boundedMeasurementWorkflowRunId: expected.workflowRunId,
    evidencePromotionAuthorized: false as const,
    providerSubmissionAuthorized: false as const,
    productionCollectionAuthorized: false as const,
    schedulerMutationAuthorized: false as const,
    productActivationAuthorized: false as const,
  });
}
