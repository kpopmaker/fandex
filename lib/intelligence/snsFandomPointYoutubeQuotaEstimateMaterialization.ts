import {
  type SnsFandomYoutubeQuotaCloseoutResult,
} from './snsFandomPointYoutubeQuotaCloseout';

export const SNS_FANDOM_YOUTUBE_QUOTA_ESTIMATE_MATERIALIZATION_VERSION =
  'sns-fandom-youtube-quota-estimate-materialization-v1' as const;

export type SnsFandomYoutubeQuotaEstimateMaterializationInput = Readonly<{
  quotaCloseout: SnsFandomYoutubeQuotaCloseoutResult;
  quotaEstimateRef: string | null;
  estimatedAt: string | null;
  minimumProjectedQuotaUnitsPerDay: number | null;
  requestedQuotaUnitsPerDay: number | null;
  headroomFactorApplied: boolean;
}>;

export type SnsFandomYoutubeQuotaEstimateMaterializationResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_QUOTA_ESTIMATE_MATERIALIZATION_VERSION;
  state:
    | 'awaiting-completed-window'
    | 'awaiting-estimate-evidence'
    | 'quota-estimate-evidence-blocked'
    | 'quota-estimate-evidence-ready';
  quotaEstimateRef: string | null;
  estimatedAt: string | null;
  minimumProjectedQuotaUnitsPerDay: number | null;
  requestedQuotaUnitsPerDay: null;
  headroomFactorApplied: false;
  submissionEvidenceEligible: boolean;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  schedulerMutationAllowed: false;
  productActivationAuthorized: false;
  blockers: readonly string[];
}>;

function present(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
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

function durableRef(value: string): boolean {
  return [
    'github-actions://',
    'github-issue://',
    'google-drive://',
    'repo://',
    'https://drive.google.com/',
    'https://docs.google.com/',
    'https://github.com/',
  ].some((prefix) => value.startsWith(prefix));
}

function waiting(
  state:
    | 'awaiting-completed-window'
    | 'awaiting-estimate-evidence'
    | 'quota-estimate-evidence-blocked',
  blockers: readonly string[],
): SnsFandomYoutubeQuotaEstimateMaterializationResult {
  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_QUOTA_ESTIMATE_MATERIALIZATION_VERSION,
    state,
    quotaEstimateRef: null,
    estimatedAt: null,
    minimumProjectedQuotaUnitsPerDay: null,
    requestedQuotaUnitsPerDay: null,
    headroomFactorApplied: false,
    submissionEvidenceEligible: false,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    schedulerMutationAllowed: false,
    productActivationAuthorized: false,
    blockers: Object.freeze([...blockers]),
  });
}

export function evaluateSnsFandomYoutubeQuotaEstimateMaterialization(
  input: SnsFandomYoutubeQuotaEstimateMaterializationInput,
): SnsFandomYoutubeQuotaEstimateMaterializationResult {
  const closeout = input.quotaCloseout;

  if (
    closeout.state !==
      'quota-worksheet-ready-awaiting-estimate-materialization'
    || closeout.quotaWorksheet === null
    || closeout.estimateCandidate === null
    || !closeout.quotaEstimateMaterializationAllowed
  ) {
    return waiting(
      'awaiting-completed-window',
      ['youtube-quota-estimate-closeout-not-ready'],
    );
  }

  const missing: string[] = [];
  if (!present(input.quotaEstimateRef)) {
    missing.push('youtube-quota-estimate-ref-missing');
  }
  if (!present(input.estimatedAt)) {
    missing.push('youtube-quota-estimated-at-missing');
  }
  if (input.minimumProjectedQuotaUnitsPerDay === null) {
    missing.push('youtube-quota-estimate-minimum-missing');
  }
  if (missing.length > 0) {
    return waiting('awaiting-estimate-evidence', missing);
  }

  const blockers: string[] = [];
  const ref = input.quotaEstimateRef as string;
  const estimatedAt = input.estimatedAt as string;
  const minimum = input.minimumProjectedQuotaUnitsPerDay as number;

  if (!durableRef(ref)) {
    blockers.push('youtube-quota-estimate-ref-not-durable');
  }
  if (secretLike(ref)) {
    blockers.push('youtube-quota-estimate-ref-secret-like');
  }
  if (!validIso(estimatedAt)) {
    blockers.push('youtube-quota-estimated-at-invalid');
  }
  if (
    validIso(estimatedAt)
    && validIso(closeout.quotaWorksheet.measuredAt)
    && Date.parse(estimatedAt) < Date.parse(closeout.quotaWorksheet.measuredAt)
  ) {
    blockers.push('youtube-quota-estimate-before-measurement');
  }
  if (
    !Number.isSafeInteger(minimum)
    || minimum <= 0
    || minimum
      !== closeout.estimateCandidate.minimumProjectedQuotaUnitsPerDay
  ) {
    blockers.push('youtube-quota-estimate-minimum-mismatch');
  }
  if (input.requestedQuotaUnitsPerDay !== null) {
    blockers.push('youtube-quota-requested-quota-must-remain-unset');
  }
  if (input.headroomFactorApplied) {
    blockers.push('youtube-quota-headroom-factor-not-allowed');
  }

  if (blockers.length > 0) {
    return waiting(
      'quota-estimate-evidence-blocked',
      Array.from(new Set(blockers)).sort(),
    );
  }

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_QUOTA_ESTIMATE_MATERIALIZATION_VERSION,
    state: 'quota-estimate-evidence-ready',
    quotaEstimateRef: ref,
    estimatedAt,
    minimumProjectedQuotaUnitsPerDay: minimum,
    requestedQuotaUnitsPerDay: null,
    headroomFactorApplied: false,
    submissionEvidenceEligible: true,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    schedulerMutationAllowed: false,
    productActivationAuthorized: false,
    blockers: Object.freeze([]),
  });
}
