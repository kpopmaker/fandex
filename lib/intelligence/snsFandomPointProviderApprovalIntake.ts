import {
  SNS_FANDOM_PROVIDER_APPROVAL_EVIDENCE_VERSION,
  validateSnsFandomProviderApprovalEvidence,
  type SnsFandomDimension,
  type SnsFandomProviderApprovalEvidence,
  type SnsFandomProviderId,
} from './snsFandomPointContracts';

export const SNS_FANDOM_PROVIDER_APPROVAL_INTAKE_VERSION =
  'sns-fandom-provider-approval-intake-v1' as const;

export type SnsFandomProviderDecision = Readonly<{
  contractVersion: typeof SNS_FANDOM_PROVIDER_APPROVAL_INTAKE_VERSION;
  decisionKind:
    | 'provider-grant'
    | 'submission-confirmation'
    | 'provider-acknowledgement'
    | 'provider-rejection';
  providerId: SnsFandomProviderId;
  providerClientRef: string;
  approvalClass:
    | 'youtube-analytics-derived-metrics-data-storage'
    | 'provider-commercial-data-license';
  useCase: 'analytics-reporting';
  approvedDimensions: readonly SnsFandomDimension[];
  approvedMetricIds: readonly string[];
  allowedEndpoints: readonly string[];
  decidedAt: string;
  validUntil: string | null;
  evidenceRef: string;
  rights: Readonly<{
    commercialProductUse: boolean;
    recurringAutomatedCollection: boolean;
    aggregateRetention: boolean;
    derivedMetricPublication: boolean;
  }>;
  retention: Readonly<{
    statisticalDataMonths: number | null;
    derivedMetricMonths: number | null;
    nonStatisticalDataRefreshDays: number | null;
  }>;
}>;

export type SnsFandomProviderApprovalIntakeResult =
  | Readonly<{
      contractVersion: typeof SNS_FANDOM_PROVIDER_APPROVAL_INTAKE_VERSION;
      state: 'accepted-provider-grant';
      approvalEvidence: SnsFandomProviderApprovalEvidence;
      blockers: readonly [];
    }>
  | Readonly<{
      contractVersion: typeof SNS_FANDOM_PROVIDER_APPROVAL_INTAKE_VERSION;
      state: 'rejected';
      approvalEvidence: null;
      blockers: readonly string[];
    }>;

function containsSecretLikeMaterial(value: string): boolean {
  const normalized = value.toLowerCase();
  return [
    'access_token=',
    'refresh_token=',
    'client_secret=',
    'authorization: bearer ',
    'api_key=',
    'apikey=',
  ].some((needle) => normalized.includes(needle));
}

export function buildSnsFandomProviderApprovalEvidenceFromDecision(
  decision: SnsFandomProviderDecision,
  evaluatedAt: string,
): SnsFandomProviderApprovalIntakeResult {
  const blockers: string[] = [];

  if (
    decision.contractVersion
      !== SNS_FANDOM_PROVIDER_APPROVAL_INTAKE_VERSION
  ) {
    blockers.push('provider-decision-contract-version-invalid');
  }

  if (decision.decisionKind !== 'provider-grant') {
    blockers.push('provider-decision-is-not-an-approval-grant');
  }

  if (decision.providerClientRef.trim().length === 0) {
    blockers.push('provider-decision-client-ref-empty');
  }

  if (decision.evidenceRef.trim().length === 0) {
    blockers.push('provider-decision-evidence-ref-empty');
  } else if (containsSecretLikeMaterial(decision.evidenceRef)) {
    blockers.push('provider-decision-evidence-ref-secret-like');
  }

  const approvalEvidence: SnsFandomProviderApprovalEvidence = Object.freeze({
    contractVersion: SNS_FANDOM_PROVIDER_APPROVAL_EVIDENCE_VERSION,
    providerId: decision.providerId,
    providerClientRef: decision.providerClientRef,
    state: 'approved' as const,
    approvalClass: decision.approvalClass,
    useCase: decision.useCase,
    approvedDimensions: Object.freeze([...decision.approvedDimensions]),
    approvedMetricIds: Object.freeze([...decision.approvedMetricIds]),
    allowedEndpoints: Object.freeze([...decision.allowedEndpoints]),
    approvedAt: decision.decidedAt,
    validUntil: decision.validUntil,
    evidenceRef: decision.evidenceRef,
    rights: Object.freeze({ ...decision.rights }),
    retention: Object.freeze({ ...decision.retention }),
  });

  const validation = validateSnsFandomProviderApprovalEvidence(
    approvalEvidence,
    evaluatedAt,
  );
  blockers.push(...validation.blockers);

  if (blockers.length > 0) {
    return Object.freeze({
      contractVersion: SNS_FANDOM_PROVIDER_APPROVAL_INTAKE_VERSION,
      state: 'rejected' as const,
      approvalEvidence: null,
      blockers: Object.freeze(Array.from(new Set(blockers))),
    });
  }

  return Object.freeze({
    contractVersion: SNS_FANDOM_PROVIDER_APPROVAL_INTAKE_VERSION,
    state: 'accepted-provider-grant' as const,
    approvalEvidence,
    blockers: Object.freeze([]) as readonly [],
  });
}
