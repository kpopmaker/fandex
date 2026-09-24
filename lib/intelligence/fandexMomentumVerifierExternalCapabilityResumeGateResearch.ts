import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_VERSION =
  'v181_fandex_momentum_verifier_external_capability_resume_gate_research_v1' as const;

export type FandexProductProductionActual =
  | '0/7'
  | '1/7'
  | '2/7'
  | '3/7'
  | '4/7'
  | '5/7'
  | '6/7'
  | '7/7';

export const FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_VERSION,
    lifecycle: 'research' as const,
    upstreamV180Contract:
      'v180_fandex_momentum_verifier_external_execution_channel_resolution_research_v1' as const,
    resumeGateOnly: true as const,
    pluginInstallationAloneCountsAsCapability: false as const,
    skillDocumentationAloneCountsAsCapability: false as const,
    brokenMetadataWrapperCountsAsCapability: false as const,
    unauthenticatedCliBinaryCountsAsCapability: false as const,
    genericContinuationCountsAsAuthorization: false as const,
    providerReadPerformed: false as const,
    providerWritePerformed: false as const,
    productOrLedgerMutationAllowed: false as const,
  });

export type FandexMomentumVerifierResumeChannel =
  | 'connected-vercel-exact-env-inventory-read'
  | 'connected-vercel-generic-rest-read'
  | 'authenticated-local-vercel-cli-api'
  | 'authenticated-browser-vercel-inventory-export'
  | 'validated-external-operator-exchange';

export type FandexMomentumVerifierExternalCapabilityResumeGateInput =
  Readonly<{
    observedAt: string;
    upstreamV180Digest: string;
    productProductionActual?: FandexProductProductionActual;
    target: Readonly<{
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      method: 'GET';
      endpoint: '/v10/projects/{idOrName}/env';
      decrypt: 'false';
      maximumProviderCalls: 1;
      maximumInventoryReads: 1;
    }>;
    connectedCapability: Readonly<{
      vercelPluginInstalled: boolean;
      vercelPluginEnabled: boolean;
      vercelSkillAdvertisesEnvironmentVariableSupport: boolean;
      exactEnvInventoryReadToolExposed: boolean;
      genericRestReadToolExposed: boolean;
      projectMetadataToolExposed: boolean;
      projectMetadataToolCallableForTarget: boolean;
      projectMetadataToolFailure:
        | null
        | 'connector-schema-server-argument-mismatch'
        | 'authorization-failure'
        | 'provider-failure';
    }>;
    localCapability: Readonly<{
      vercelCliInstalled: boolean;
      vercelCliAuthenticated: boolean;
      vercelTokenEnvironmentPresent: boolean;
    }>;
    browserCapability: Readonly<{
      executableBrowserAutomationToolExposed: boolean;
      authenticatedVercelBrowserSessionAvailable: boolean;
    }>;
    externalOperator: Readonly<{
      validV177PreReadResponseAvailable: boolean;
      validV179PostReadResponseAvailable: boolean;
    }>;
  }>;

export type FandexMomentumVerifierExternalCapabilityResumeGateResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_VERSION;
    state:
      | 'resume-capability-blocked'
      | 'resume-capability-available';
    internalExecutionCanResume: boolean;
    separateAuthorizationStillRequired: true;
    candidateChannels: readonly FandexMomentumVerifierResumeChannel[];
    blockers: readonly string[];
    resumeContract: Readonly<{
      exactRequest: FandexMomentumVerifierExternalCapabilityResumeGateInput['target'];
      connectedExactReadRequiresConcreteExecutableTool: true;
      genericRestRequiresAuthenticatedReadOnlyExecution: true;
      cliRequiresInstalledAndAuthenticated: true;
      browserRequiresExecutableToolAndAuthenticatedSession: true;
      externalOperatorRequiresValidatedExchange: true;
      genericContinuationIsNotAuthorization: true;
    }>;
    effects: Readonly<{
      authorizationWrites: 0;
      credentialCreates: 0;
      credentialReads: 0;
      credentialRotations: 0;
      vercelReads: 0;
      vercelWrites: 0;
      environmentMutations: 0;
      secretReads: 0;
      secretWrites: 0;
      productionDeployments: 0;
      verifierActivations: 0;
      nativeVerifierExecutions: 0;
      databaseWrites: 0;
      productMetricWrites: 0;
      registryMutations: 0;
      historyWrites: 0;
      watermarkWrites: 0;
      manifestWrites: 0;
      pullRequestMerges: 0;
    }>;
    productBoundary: Readonly<{
      productMomentumScore: null;
      productionEligible: false;
      productProductionActual: FandexProductProductionActual;
    }>;
    digest: string;
  }>;

function exactIso(value: string): boolean {
  const t = Date.parse(value);
  return Number.isFinite(t) && new Date(t).toISOString() === value;
}

function validDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function evaluateFandexMomentumVerifierExternalCapabilityResumeGate(
  input: FandexMomentumVerifierExternalCapabilityResumeGateInput,
): FandexMomentumVerifierExternalCapabilityResumeGateResult {
  const blockers: string[] = [];
  const candidates: FandexMomentumVerifierResumeChannel[] = [];

  if (!exactIso(input.observedAt)) {
    blockers.push('resume-gate-observation-time-invalid');
  }
  if (!validDigest(input.upstreamV180Digest)) {
    blockers.push('resume-gate-upstream-v180-digest-invalid');
  }

  const target = input.target;
  if (
    target.teamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    || target.projectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    || target.method !== 'GET'
    || target.endpoint !== '/v10/projects/{idOrName}/env'
    || target.decrypt !== 'false'
    || target.maximumProviderCalls !== 1
    || target.maximumInventoryReads !== 1
  ) {
    blockers.push('resume-gate-target-contract-invalid');
  }

  const connected = input.connectedCapability;
  if (connected.exactEnvInventoryReadToolExposed) {
    candidates.push('connected-vercel-exact-env-inventory-read');
  }
  if (connected.genericRestReadToolExposed) {
    candidates.push('connected-vercel-generic-rest-read');
  }

  if (
    connected.vercelPluginInstalled
    && connected.vercelPluginEnabled
    && connected.vercelSkillAdvertisesEnvironmentVariableSupport
    && !connected.exactEnvInventoryReadToolExposed
    && !connected.genericRestReadToolExposed
  ) {
    blockers.push('connected-vercel-env-read-capability-not-concretely-exposed');
  }

  if (
    connected.projectMetadataToolExposed
    && !connected.projectMetadataToolCallableForTarget
  ) {
    blockers.push(
      connected.projectMetadataToolFailure
        === 'connector-schema-server-argument-mismatch'
        ? 'connected-vercel-project-metadata-wrapper-mismatch'
        : 'connected-vercel-project-metadata-not-callable',
    );
  }

  const local = input.localCapability;
  if (
    local.vercelCliInstalled
    && (
      local.vercelCliAuthenticated
      || local.vercelTokenEnvironmentPresent
    )
  ) {
    candidates.push('authenticated-local-vercel-cli-api');
  } else if (
    local.vercelCliInstalled
    || local.vercelCliAuthenticated
    || local.vercelTokenEnvironmentPresent
  ) {
    blockers.push('local-vercel-cli-authenticated-path-incomplete');
  }

  const browser = input.browserCapability;
  if (
    browser.executableBrowserAutomationToolExposed
    && browser.authenticatedVercelBrowserSessionAvailable
  ) {
    candidates.push('authenticated-browser-vercel-inventory-export');
  } else if (
    browser.executableBrowserAutomationToolExposed
    || browser.authenticatedVercelBrowserSessionAvailable
  ) {
    blockers.push('authenticated-browser-execution-path-incomplete');
  }

  const external = input.externalOperator;
  if (
    external.validV177PreReadResponseAvailable
    && external.validV179PostReadResponseAvailable
  ) {
    candidates.push('validated-external-operator-exchange');
  } else if (
    external.validV177PreReadResponseAvailable
    || external.validV179PostReadResponseAvailable
  ) {
    blockers.push('external-operator-exchange-incomplete');
  }

  if (candidates.length === 0) {
    blockers.push('resume-gate-no-executable-exact-read-capability');
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const internalExecutionCanResume =
    candidates.length > 0
    && !uniqueBlockers.some((blocker) =>
      blocker === 'resume-gate-observation-time-invalid'
      || blocker === 'resume-gate-upstream-v180-digest-invalid'
      || blocker === 'resume-gate-target-contract-invalid'
    );

  const state = internalExecutionCanResume
    ? 'resume-capability-available' as const
    : 'resume-capability-blocked' as const;

  const productProductionActual = input.productProductionActual ?? '0/7';

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_VERSION,
    state,
    internalExecutionCanResume,
    separateAuthorizationStillRequired: true as const,
    candidateChannels: Object.freeze([...candidates]),
    blockers: uniqueBlockers,
    resumeContract: Object.freeze({
      exactRequest: target,
      connectedExactReadRequiresConcreteExecutableTool: true as const,
      genericRestRequiresAuthenticatedReadOnlyExecution: true as const,
      cliRequiresInstalledAndAuthenticated: true as const,
      browserRequiresExecutableToolAndAuthenticatedSession: true as const,
      externalOperatorRequiresValidatedExchange: true as const,
      genericContinuationIsNotAuthorization: true as const,
    }),
    productBoundary: Object.freeze({
      productMomentumScore: null,
      productionEligible: false as const,
      productProductionActual,
    }),
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      authorizationWrites: 0 as const,
      credentialCreates: 0 as const,
      credentialReads: 0 as const,
      credentialRotations: 0 as const,
      vercelReads: 0 as const,
      vercelWrites: 0 as const,
      environmentMutations: 0 as const,
      secretReads: 0 as const,
      secretWrites: 0 as const,
      productionDeployments: 0 as const,
      verifierActivations: 0 as const,
      nativeVerifierExecutions: 0 as const,
      databaseWrites: 0 as const,
      productMetricWrites: 0 as const,
      registryMutations: 0 as const,
      historyWrites: 0 as const,
      watermarkWrites: 0 as const,
      manifestWrites: 0 as const,
      pullRequestMerges: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}
