export const SNS_FANDOM_YOUTUBE_AUDIT_SUBMISSION_READINESS_VERSION =
  'sns-fandom-youtube-audit-submission-readiness-v1' as const;

export type SnsFandomYoutubeAuditSubmissionInput = Readonly<{
  providerClientRef: string;
  requestType: 'compliance-audit-additional-quota';
  useCase: 'analytics-reporting';
  derivedMetricsAndStorageAmendmentAccepted: boolean;
  requestedEndpoints: readonly string[];
  evidence: Readonly<{
    applicantIdentityRef: string | null;
    organizationOrSelfRef: string | null;
    primaryAccessUrl: string | null;
    privacyPolicyUrl: string | null;
    termsOfServiceUrl: string | null;
    privacyPolicyScreenshotRef: string | null;
    homepageScreenshotRef: string | null;
    termsDocumentationRef: string | null;
    dashboardFeatureScreenshotRef: string | null;
    cloudProjectRef: string | null;
    quotaEstimateRef: string | null;
    businessModelDescriptionRef: string | null;
  }>;
  demoCredentialHandling: Readonly<{
    requiredByReviewFlow: boolean;
    credentialsCommittedToRepository: boolean;
    secureExternalSubmissionPrepared: boolean;
  }>;
}>;

export type SnsFandomYoutubeAuditSubmissionReadiness = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_AUDIT_SUBMISSION_READINESS_VERSION;
  state: 'submission-blocked' | 'submission-ready';
  providerClientRef: string;
  requestType: 'compliance-audit-additional-quota';
  useCase: 'analytics-reporting';
  requestedEndpoints: readonly string[];
  amendmentAcknowledged: boolean;
  providerApprovalGranted: false;
  productionCollectionAuthorized: false;
  blockers: readonly string[];
}>;

function present(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

function httpsUrl(value: string | null): boolean {
  if (!present(value)) return false;
  try {
    const parsed = new URL(value as string);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function secretLike(value: string | null): boolean {
  if (!present(value)) return false;
  const normalized = (value as string).toLowerCase();
  return [
    'password=',
    'access_token=',
    'refresh_token=',
    'client_secret=',
    'authorization: bearer ',
    'api_key=',
    'apikey=',
  ].some((needle) => normalized.includes(needle));
}

export function evaluateSnsFandomYoutubeAuditSubmissionReadiness(
  input: SnsFandomYoutubeAuditSubmissionInput,
): SnsFandomYoutubeAuditSubmissionReadiness {
  const blockers: string[] = [];

  if (input.providerClientRef.trim().length === 0) {
    blockers.push('youtube-audit-provider-client-ref-empty');
  }
  if (input.requestType !== 'compliance-audit-additional-quota') {
    blockers.push('youtube-audit-request-type-invalid');
  }
  if (input.useCase !== 'analytics-reporting') {
    blockers.push('youtube-audit-use-case-invalid');
  }
  if (!input.derivedMetricsAndStorageAmendmentAccepted) {
    blockers.push('youtube-audit-derived-metrics-amendment-not-accepted');
  }

  const requiredEndpoints = [
    'youtube.channels.list',
    'youtube.playlistItems.list',
    'youtube.videos.list',
  ] as const;

  for (const endpoint of requiredEndpoints) {
    if (!input.requestedEndpoints.includes(endpoint)) {
      blockers.push('youtube-audit-required-endpoint-missing');
      break;
    }
  }

  const e = input.evidence;
  const requiredRefs: Array<readonly [string, string | null]> = [
    ['youtube-audit-applicant-identity-evidence-missing', e.applicantIdentityRef],
    ['youtube-audit-organization-or-self-evidence-missing', e.organizationOrSelfRef],
    ['youtube-audit-privacy-screenshot-missing', e.privacyPolicyScreenshotRef],
    ['youtube-audit-homepage-screenshot-missing', e.homepageScreenshotRef],
    ['youtube-audit-terms-documentation-missing', e.termsDocumentationRef],
    ['youtube-audit-dashboard-screenshot-missing', e.dashboardFeatureScreenshotRef],
    ['youtube-audit-cloud-project-evidence-missing', e.cloudProjectRef],
    ['youtube-audit-quota-estimate-missing', e.quotaEstimateRef],
    ['youtube-audit-business-model-description-missing', e.businessModelDescriptionRef],
  ];

  for (const [blocker, value] of requiredRefs) {
    if (!present(value)) blockers.push(blocker);
    if (secretLike(value)) blockers.push('youtube-audit-evidence-ref-secret-like');
  }

  if (!httpsUrl(e.primaryAccessUrl)) {
    blockers.push('youtube-audit-primary-access-url-missing-or-invalid');
  }
  if (!httpsUrl(e.privacyPolicyUrl)) {
    blockers.push('youtube-audit-privacy-policy-url-missing-or-invalid');
  }
  if (!httpsUrl(e.termsOfServiceUrl)) {
    blockers.push('youtube-audit-terms-url-missing-or-invalid');
  }

  if (
    input.demoCredentialHandling.credentialsCommittedToRepository
  ) {
    blockers.push('youtube-audit-demo-credentials-must-not-be-committed');
  }
  if (
    input.demoCredentialHandling.requiredByReviewFlow
    && !input.demoCredentialHandling.secureExternalSubmissionPrepared
  ) {
    blockers.push(
      'youtube-audit-demo-credentials-secure-submission-not-prepared',
    );
  }

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_AUDIT_SUBMISSION_READINESS_VERSION,
    state: blockers.length === 0
      ? 'submission-ready' as const
      : 'submission-blocked' as const,
    providerClientRef: input.providerClientRef,
    requestType: 'compliance-audit-additional-quota' as const,
    useCase: 'analytics-reporting' as const,
    requestedEndpoints: Object.freeze([...input.requestedEndpoints]),
    amendmentAcknowledged:
      input.derivedMetricsAndStorageAmendmentAccepted,
    providerApprovalGranted: false as const,
    productionCollectionAuthorized: false as const,
    blockers: Object.freeze(Array.from(new Set(blockers))),
  });
}
