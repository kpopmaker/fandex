export const SNS_FANDOM_COLLECTOR_ACTIVATION_TRANSITION_VERSION =
  'sns-fandom-collector-activation-transition-v1' as const;

export type SnsFandomCollectorActivationState =
  | 'blocked'
  | 'approval-pending'
  | 'approved-ready'
  | 'activated';

export type SnsFandomCollectorActivationInput = Readonly<{
  providerId: string;
  providerApprovalGranted: boolean;
  approvalEvidenceComplete: boolean;
  rightsState: 'blocked' | 'authorized';
  adapterRegistered: boolean;
  observationContractCompatible: boolean;
  collectionRequested: boolean;
}>;

export type SnsFandomCollectorActivationDecision = Readonly<{
  version: typeof SNS_FANDOM_COLLECTOR_ACTIVATION_TRANSITION_VERSION;
  state: SnsFandomCollectorActivationState;
  collectionAuthorized: boolean;
  blockers: readonly string[];
}>;

export function evaluateSnsFandomCollectorActivationTransition(
  input: SnsFandomCollectorActivationInput,
): SnsFandomCollectorActivationDecision {
  const blockers: string[] = [];

  if (!input.providerApprovalGranted) {
    blockers.push('provider-approval-not-granted');
  }

  if (!input.approvalEvidenceComplete) {
    blockers.push('provider-approval-evidence-incomplete');
  }

  if (input.rightsState !== 'authorized') {
    blockers.push('provider-rights-not-authorized');
  }

  if (!input.adapterRegistered) {
    blockers.push('collector-adapter-not-registered');
  }

  if (!input.observationContractCompatible) {
    blockers.push('observation-contract-incompatible');
  }

  if (blockers.length > 0) {
    return Object.freeze({
      version: SNS_FANDOM_COLLECTOR_ACTIVATION_TRANSITION_VERSION,
      state: input.providerApprovalGranted
        ? 'approval-pending'
        : 'blocked',
      collectionAuthorized: false,
      blockers: Object.freeze(blockers),
    });
  }

  return Object.freeze({
    version: SNS_FANDOM_COLLECTOR_ACTIVATION_TRANSITION_VERSION,
    state: input.collectionRequested ? 'activated' : 'approved-ready',
    collectionAuthorized: input.collectionRequested,
    blockers: Object.freeze([]),
  });
}
