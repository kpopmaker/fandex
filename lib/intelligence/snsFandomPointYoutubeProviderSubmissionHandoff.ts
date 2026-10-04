import {
  type SnsFandomYoutubeAuditSubmissionReadiness,
} from './snsFandomPointYoutubeAuditSubmissionReadiness';

export const SNS_FANDOM_YOUTUBE_PROVIDER_SUBMISSION_HANDOFF_VERSION =
  'sns-fandom-youtube-provider-submission-handoff-v1' as const;

export type SnsFandomYoutubeProviderSubmissionApprovalInput = Readonly<{
  approved: boolean;
  approvalEvidenceRef: string | null;
  approvedAt: string | null;
  approvedRevisionSha: string | null;
  providerClientRef: string | null;
}>;

export type SnsFandomYoutubeProviderSubmissionHandoffInput = Readonly<{
  auditReadiness: SnsFandomYoutubeAuditSubmissionReadiness;
  currentRevisionSha: string;
  approval: SnsFandomYoutubeProviderSubmissionApprovalInput;
}>;

export type SnsFandomYoutubeProviderSubmissionHandoffResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_PROVIDER_SUBMISSION_HANDOFF_VERSION;
  state:
    | 'submission-not-ready'
    | 'awaiting-provider-submission-approval'
    | 'provider-submission-authorized'
    | 'provider-submission-authorization-invalid';
  providerClientRef: string;
  approvedRevisionSha: string | null;
  approvalEvidenceRef: string | null;
  approvedAt: string | null;
  providerSubmissionAuthorized: boolean;
  automaticProviderSubmissionAllowed: false;
  providerSubmissionExecutionPerformed: false;
  providerApprovalGranted: false;
  productionCollectionAuthorized: false;
  schedulerMutationAllowed: false;
  productActivationAuthorized: false;
  blockers: readonly string[];
}>;

function present(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
}

function validSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
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
  return [
    'github-issue://',
    'google-drive://',
    'repo://',
    'https://github.com/',
    'https://drive.google.com/',
    'https://docs.google.com/',
  ].some((prefix) => value.startsWith(prefix));
}

function result(
  input: SnsFandomYoutubeProviderSubmissionHandoffInput,
  state: SnsFandomYoutubeProviderSubmissionHandoffResult['state'],
  blockers: readonly string[],
  authorized: boolean,
): SnsFandomYoutubeProviderSubmissionHandoffResult {
  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_PROVIDER_SUBMISSION_HANDOFF_VERSION,
    state,
    providerClientRef: input.auditReadiness.providerClientRef,
    approvedRevisionSha:
      authorized && present(input.approval.approvedRevisionSha)
        ? input.approval.approvedRevisionSha
        : null,
    approvalEvidenceRef:
      authorized && present(input.approval.approvalEvidenceRef)
        ? input.approval.approvalEvidenceRef
        : null,
    approvedAt:
      authorized && present(input.approval.approvedAt)
        ? input.approval.approvedAt
        : null,
    providerSubmissionAuthorized: authorized,
    automaticProviderSubmissionAllowed: false,
    providerSubmissionExecutionPerformed: false,
    providerApprovalGranted: false,
    productionCollectionAuthorized: false,
    schedulerMutationAllowed: false,
    productActivationAuthorized: false,
    blockers: Object.freeze(Array.from(new Set(blockers)).sort()),
  });
}

export function evaluateSnsFandomYoutubeProviderSubmissionHandoff(
  input: SnsFandomYoutubeProviderSubmissionHandoffInput,
): SnsFandomYoutubeProviderSubmissionHandoffResult {
  const readiness = input.auditReadiness;

  if (
    readiness.state !== 'submission-ready'
    || readiness.blockers.length > 0
    || !readiness.providerClientIdentityValidated
    || !readiness.quotaEvidenceValidated
    || readiness.minimumProjectedQuotaUnitsPerDay === null
  ) {
    return result(
      input,
      'submission-not-ready',
      ['youtube-provider-submission-audit-not-ready'],
      false,
    );
  }

  if (!input.approval.approved) {
    return result(
      input,
      'awaiting-provider-submission-approval',
      ['youtube-provider-submission-owner-approval-missing'],
      false,
    );
  }

  const blockers: string[] = [];

  if (!validSha(input.currentRevisionSha)) {
    blockers.push('youtube-provider-submission-current-revision-invalid');
  }

  if (!present(input.approval.approvalEvidenceRef)) {
    blockers.push('youtube-provider-submission-approval-evidence-missing');
  } else {
    if (!durableReference(input.approval.approvalEvidenceRef)) {
      blockers.push('youtube-provider-submission-approval-evidence-not-durable');
    }
    if (secretLike(input.approval.approvalEvidenceRef)) {
      blockers.push('youtube-provider-submission-approval-evidence-secret-like');
    }
  }

  if (!present(input.approval.approvedAt)) {
    blockers.push('youtube-provider-submission-approved-at-missing');
  } else if (!validIso(input.approval.approvedAt)) {
    blockers.push('youtube-provider-submission-approved-at-invalid');
  }

  if (!present(input.approval.approvedRevisionSha)) {
    blockers.push('youtube-provider-submission-approved-revision-missing');
  } else if (!validSha(input.approval.approvedRevisionSha)) {
    blockers.push('youtube-provider-submission-approved-revision-invalid');
  } else if (
    validSha(input.currentRevisionSha)
    && input.approval.approvedRevisionSha !== input.currentRevisionSha
  ) {
    blockers.push('youtube-provider-submission-approved-revision-stale');
  }

  if (!present(input.approval.providerClientRef)) {
    blockers.push('youtube-provider-submission-provider-client-ref-missing');
  } else if (
    input.approval.providerClientRef !== readiness.providerClientRef
  ) {
    blockers.push('youtube-provider-submission-provider-client-ref-mismatch');
  }

  if (blockers.length > 0) {
    return result(
      input,
      'provider-submission-authorization-invalid',
      blockers,
      false,
    );
  }

  return result(
    input,
    'provider-submission-authorized',
    [],
    true,
  );
}
