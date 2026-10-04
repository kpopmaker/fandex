export const SNS_FANDOM_YOUTUBE_SUBMISSION_OWNER_HANDOFF_VERSION =
  'sns-fandom-youtube-submission-owner-handoff-v1' as const;

export type SnsFandomYoutubeSubmissionOwnerHandoffInput = Readonly<{
  applicantIdentityRef: string | null;
  organizationOrSelfRef: string | null;
  derivedMetricsAndStorageAmendmentAccepted: boolean;
}>;

export type SnsFandomYoutubeSubmissionOwnerHandoffResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_SUBMISSION_OWNER_HANDOFF_VERSION;
  state: 'awaiting-owner-evidence' | 'submission-owner-evidence-ready';
  applicantIdentityRef: string | null;
  organizationOrSelfRef: string | null;
  amendmentAccepted: boolean;
  pendingOwnerFields: readonly string[];
  secretMaterialStored: false;
  providerSubmissionAuthorized: false;
  providerApprovalGranted: false;
  productionCollectionAuthorized: false;
  schedulerMutationAllowed: false;
  productActivationAuthorized: false;
  blockers: readonly string[];
}>;

function present(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
}

function secretLike(value: string): boolean {
  if (/AIza[0-9A-Za-z_-]{10,}/.test(value)) return true;
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

function durableReference(value: string): boolean {
  if (/\s/.test(value)) return false;
  return /^[a-z][a-z0-9+.-]*:\/\/[A-Za-z0-9]/i.test(value);
}

export function evaluateSnsFandomYoutubeSubmissionOwnerHandoff(
  input: SnsFandomYoutubeSubmissionOwnerHandoffInput,
): SnsFandomYoutubeSubmissionOwnerHandoffResult {
  const blockers: string[] = [];
  const pendingOwnerFields: string[] = [];

  if (!present(input.applicantIdentityRef)) {
    pendingOwnerFields.push('applicantIdentityRef');
  } else {
    if (!durableReference(input.applicantIdentityRef)) {
      blockers.push('youtube-submission-owner-applicant-identity-ref-not-durable');
    }
    if (secretLike(input.applicantIdentityRef)) {
      blockers.push('youtube-submission-owner-applicant-identity-ref-secret-like');
    }
  }

  if (!present(input.organizationOrSelfRef)) {
    pendingOwnerFields.push('organizationOrSelfRef');
  } else {
    if (!durableReference(input.organizationOrSelfRef)) {
      blockers.push('youtube-submission-owner-organization-or-self-ref-not-durable');
    }
    if (secretLike(input.organizationOrSelfRef)) {
      blockers.push('youtube-submission-owner-organization-or-self-ref-secret-like');
    }
  }

  if (!input.derivedMetricsAndStorageAmendmentAccepted) {
    pendingOwnerFields.push('derivedMetricsAndStorageAmendmentAccepted');
  }

  const uniquePending = Object.freeze(
    Array.from(new Set(pendingOwnerFields)).sort(),
  );
  const uniqueBlockers = Object.freeze(Array.from(new Set(blockers)).sort());
  const ready = uniquePending.length === 0 && uniqueBlockers.length === 0;

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_SUBMISSION_OWNER_HANDOFF_VERSION,
    state: ready
      ? 'submission-owner-evidence-ready' as const
      : 'awaiting-owner-evidence' as const,
    applicantIdentityRef: present(input.applicantIdentityRef)
      ? input.applicantIdentityRef.trim()
      : null,
    organizationOrSelfRef: present(input.organizationOrSelfRef)
      ? input.organizationOrSelfRef.trim()
      : null,
    amendmentAccepted:
      input.derivedMetricsAndStorageAmendmentAccepted === true,
    pendingOwnerFields: uniquePending,
    secretMaterialStored: false as const,
    providerSubmissionAuthorized: false as const,
    providerApprovalGranted: false as const,
    productionCollectionAuthorized: false as const,
    schedulerMutationAllowed: false as const,
    productActivationAuthorized: false as const,
    blockers: uniqueBlockers,
  });
}
