export const SNS_FANDOM_PROVIDER_GRANT_ACTIVATION_MANIFEST_VERSION =
  'sns-fandom-provider-grant-activation-manifest-v1' as const;

export type SnsFandomProviderGrantActivationManifest = Readonly<{
  version: typeof SNS_FANDOM_PROVIDER_GRANT_ACTIVATION_MANIFEST_VERSION;
  providerId: string;
  approvalEvidenceRef: string | null;
  approvalState: 'missing' | 'granted';
  activationState:
    | 'blocked'
    | 'ready'
    | 'activated';
  checks: Readonly<{
    complianceGrantRecorded: boolean;
    rightsAuthorized: boolean;
    adapterRegistered: boolean;
    collectionContractCompatible: boolean;
  }>;
}>;

export function evaluateProviderGrantActivationManifest(
  input: SnsFandomProviderGrantActivationManifest,
): Readonly<{
  activationAllowed: boolean;
  blockers: readonly string[];
}> {
  const blockers: string[] = [];

  if (input.approvalState !== 'granted') {
    blockers.push('provider-grant-not-recorded');
  }

  if (!input.approvalEvidenceRef) {
    blockers.push('provider-approval-evidence-missing');
  }

  if (!input.checks.complianceGrantRecorded) {
    blockers.push('provider-compliance-grant-missing');
  }

  if (!input.checks.rightsAuthorized) {
    blockers.push('provider-rights-not-authorized');
  }

  if (!input.checks.adapterRegistered) {
    blockers.push('provider-adapter-not-registered');
  }

  if (!input.checks.collectionContractCompatible) {
    blockers.push('collection-contract-incompatible');
  }

  return Object.freeze({
    activationAllowed: blockers.length === 0,
    blockers: Object.freeze(blockers),
  });
}
