export type WaitlistRole =
  | 'entertainment_marketer'
  | 'kpop_fan_community_operator'
  | 'brand_marketer'
  | 'job_seeker_portfolio_research'
  | 'investor_market_watcher'
  | 'other';

export type WaitlistReportInterest =
  | 'weekly_kpop_fandex_report'
  | 'artist_watchlist'
  | 'comeback_issue_brand_signal_summary'
  | 'artist_comparison_brief'
  | 'marketing_insight_memo';

export type WaitlistSource =
  | 'home_early_access'
  | 'sample_report'
  | 'manual_admin'
  | 'future_campaign';

export type WaitlistStatus =
  | 'preview_only'
  | 'pending_review'
  | 'approved_beta'
  | 'contacted'
  | 'rejected'
  | 'unsubscribed';

export type WaitlistConsentState =
  | 'not_requested'
  | 'requested'
  | 'accepted'
  | 'declined';

export type WaitlistPriority = 'low' | 'normal' | 'high';

export type WaitlistMetadata = Record<string, string | number | boolean>;

export type WaitlistSubmissionDraft = {
  name: string;
  email: string;
  role: WaitlistRole;
  reportInterest: WaitlistReportInterest;
  source: WaitlistSource;
  message?: string;
  consentState: WaitlistConsentState;
  createdAt?: string;
  metadata?: WaitlistMetadata;
};

export type WaitlistRecordDraft = {
  id?: string;
  name: string;
  email: string;
  normalizedEmail: string;
  role: WaitlistRole;
  reportInterest: WaitlistReportInterest;
  source: WaitlistSource;
  status: WaitlistStatus;
  priority: WaitlistPriority;
  consentState: WaitlistConsentState;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
  contactedAt?: string;
  notes?: string;
  metadata?: WaitlistMetadata;
};

export type WaitlistValidationWarning = {
  severity: 'info' | 'warning' | 'error';
  code:
    | 'empty_name'
    | 'empty_email'
    | 'invalid_email'
    | 'role_fallback_applied'
    | 'report_interest_fallback_applied'
    | 'source_fallback_applied';
  message: string;
  field?: keyof WaitlistSubmissionDraft;
  value?: string;
};

export type WaitlistDataModelShapeCheckResult = {
  sampleCount: number;
  validSampleCount: number;
  warningCount: number;
  roles: WaitlistRole[];
  reportInterests: WaitlistReportInterest[];
  sources: WaitlistSource[];
  statuses: WaitlistStatus[];
  hasBlockingErrors: boolean;
};

export const waitlistRoles: WaitlistRole[] = [
  'entertainment_marketer',
  'kpop_fan_community_operator',
  'brand_marketer',
  'job_seeker_portfolio_research',
  'investor_market_watcher',
  'other',
];

export const waitlistReportInterests: WaitlistReportInterest[] = [
  'weekly_kpop_fandex_report',
  'artist_watchlist',
  'comeback_issue_brand_signal_summary',
  'artist_comparison_brief',
  'marketing_insight_memo',
];

export const waitlistSources: WaitlistSource[] = [
  'home_early_access',
  'sample_report',
  'manual_admin',
  'future_campaign',
];

export const waitlistStatuses: WaitlistStatus[] = [
  'preview_only',
  'pending_review',
  'approved_beta',
  'contacted',
  'rejected',
  'unsubscribed',
];

const DEFAULT_ROLE: WaitlistRole = 'other';
const DEFAULT_REPORT_INTEREST: WaitlistReportInterest =
  'weekly_kpop_fandex_report';
const DEFAULT_SOURCE: WaitlistSource = 'home_early_access';
const DEFAULT_CONSENT_STATE: WaitlistConsentState = 'not_requested';
const DEFAULT_STATUS: WaitlistStatus = 'preview_only';
const DEFAULT_PRIORITY: WaitlistPriority = 'normal';

export function normalizeWaitlistEmail(value: string | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('en-US');
}

export function normalizeWaitlistName(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function createWaitlistSubmissionDraft({
  name,
  email,
  role,
  reportInterest,
  source,
  message,
  consentState = DEFAULT_CONSENT_STATE,
  createdAt,
  metadata,
}: {
  name?: string;
  email?: string;
  role?: WaitlistRole | string;
  reportInterest?: WaitlistReportInterest | string;
  source?: WaitlistSource | string;
  message?: string;
  consentState?: WaitlistConsentState;
  createdAt?: string;
  metadata?: WaitlistMetadata;
}): WaitlistSubmissionDraft {
  return {
    name: normalizeWaitlistName(name),
    email: normalizeWaitlistEmail(email),
    role: getWaitlistRoleOrFallback(role),
    reportInterest: getWaitlistReportInterestOrFallback(reportInterest),
    source: getWaitlistSourceOrFallback(source),
    message: normalizeOptionalText(message),
    consentState,
    createdAt,
    metadata,
  };
}

export function createWaitlistRecordDraft(
  submission: WaitlistSubmissionDraft,
  options: {
    id?: string;
    status?: WaitlistStatus;
    priority?: WaitlistPriority;
    updatedAt?: string;
    contactedAt?: string;
    notes?: string;
  } = {},
): WaitlistRecordDraft {
  const normalizedEmail = normalizeWaitlistEmail(submission.email);

  return {
    id: options.id,
    name: normalizeWaitlistName(submission.name),
    email: normalizedEmail,
    normalizedEmail,
    role: submission.role,
    reportInterest: submission.reportInterest,
    source: submission.source,
    status: options.status ?? DEFAULT_STATUS,
    priority: options.priority ?? DEFAULT_PRIORITY,
    consentState: submission.consentState,
    message: normalizeOptionalText(submission.message),
    createdAt: submission.createdAt,
    updatedAt: options.updatedAt,
    contactedAt: options.contactedAt,
    notes: normalizeOptionalText(options.notes),
    metadata: submission.metadata,
  };
}

export function validateWaitlistSubmissionDraft(
  submission: WaitlistSubmissionDraft,
  rawInput?: {
    role?: string;
    reportInterest?: string;
    source?: string;
  },
): WaitlistValidationWarning[] {
  const warnings: WaitlistValidationWarning[] = [];

  if (submission.name.length === 0) {
    warnings.push({
      severity: 'error',
      code: 'empty_name',
      message: 'Name is required before a waitlist request can be reviewed.',
      field: 'name',
    });
  }

  if (submission.email.length === 0) {
    warnings.push({
      severity: 'error',
      code: 'empty_email',
      message: 'Email is required before a waitlist request can be reviewed.',
      field: 'email',
    });
  } else if (!submission.email.includes('@')) {
    warnings.push({
      severity: 'error',
      code: 'invalid_email',
      message: 'Email must include an @ character.',
      field: 'email',
      value: submission.email,
    });
  }

  if (rawInput?.role !== undefined && !isWaitlistRole(rawInput.role)) {
    warnings.push({
      severity: 'warning',
      code: 'role_fallback_applied',
      message: 'Unknown role was replaced with the default waitlist role.',
      field: 'role',
      value: rawInput.role,
    });
  }

  if (
    rawInput?.reportInterest !== undefined &&
    !isWaitlistReportInterest(rawInput.reportInterest)
  ) {
    warnings.push({
      severity: 'warning',
      code: 'report_interest_fallback_applied',
      message:
        'Unknown report interest was replaced with the default report interest.',
      field: 'reportInterest',
      value: rawInput.reportInterest,
    });
  }

  if (rawInput?.source !== undefined && !isWaitlistSource(rawInput.source)) {
    warnings.push({
      severity: 'warning',
      code: 'source_fallback_applied',
      message: 'Unknown source was replaced with the default waitlist source.',
      field: 'source',
      value: rawInput.source,
    });
  }

  return warnings;
}

export function runWaitlistDataModelShapeCheck(): WaitlistDataModelShapeCheckResult {
  const sampleInputs = [
    {
      name: 'Entertainment Marketer',
      email: 'MARKETER@example.com',
      role: 'entertainment_marketer',
      reportInterest: 'weekly_kpop_fandex_report',
      source: 'home_early_access',
      createdAt: '2026-06-24T00:00:00.000Z',
    },
    {
      name: 'Portfolio Researcher',
      email: 'portfolio@example.com',
      role: 'job_seeker_portfolio_research',
      reportInterest: 'artist_comparison_brief',
      source: 'sample_report',
      createdAt: '2026-06-24T00:05:00.000Z',
    },
    {
      name: 'Brand Marketer',
      email: 'brand@example.com',
      role: 'brand_marketer',
      reportInterest: 'marketing_insight_memo',
      source: 'future_campaign',
      createdAt: '2026-06-24T00:10:00.000Z',
    },
    {
      name: 'Invalid Email Sample',
      email: 'invalid-email',
      role: 'unknown_role',
      reportInterest: 'weekly_kpop_fandex_report',
      source: 'home_early_access',
      createdAt: '2026-06-24T00:15:00.000Z',
    },
  ];
  const validationResults = sampleInputs.map((input) => {
    const submission = createWaitlistSubmissionDraft(input);

    return validateWaitlistSubmissionDraft(submission, input);
  });
  const warnings = validationResults.flat();

  return {
    sampleCount: sampleInputs.length,
    validSampleCount: validationResults.filter(
      (sampleWarnings) =>
        !sampleWarnings.some((warning) => warning.severity === 'error'),
    ).length,
    warningCount: warnings.length,
    roles: waitlistRoles,
    reportInterests: waitlistReportInterests,
    sources: waitlistSources,
    statuses: waitlistStatuses,
    hasBlockingErrors: warnings.some((warning) => warning.severity === 'error'),
  };
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = normalizeWaitlistName(value);

  return normalized.length > 0 ? normalized : undefined;
}

function getWaitlistRoleOrFallback(
  value: WaitlistRole | string | undefined,
): WaitlistRole {
  return value !== undefined && isWaitlistRole(value) ? value : DEFAULT_ROLE;
}

function getWaitlistReportInterestOrFallback(
  value: WaitlistReportInterest | string | undefined,
): WaitlistReportInterest {
  return value !== undefined && isWaitlistReportInterest(value)
    ? value
    : DEFAULT_REPORT_INTEREST;
}

function getWaitlistSourceOrFallback(
  value: WaitlistSource | string | undefined,
): WaitlistSource {
  return value !== undefined && isWaitlistSource(value)
    ? value
    : DEFAULT_SOURCE;
}

function isWaitlistRole(value: string): value is WaitlistRole {
  return waitlistRoles.includes(value as WaitlistRole);
}

function isWaitlistReportInterest(
  value: string,
): value is WaitlistReportInterest {
  return waitlistReportInterests.includes(value as WaitlistReportInterest);
}

function isWaitlistSource(value: string): value is WaitlistSource {
  return waitlistSources.includes(value as WaitlistSource);
}
