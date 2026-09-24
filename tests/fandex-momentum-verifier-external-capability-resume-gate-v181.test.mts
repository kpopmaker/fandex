import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumVerifierExternalCapabilityResumeGate,
  FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumVerifierExternalCapabilityResumeGateResearch';

const currentInput = () => ({
  observedAt: '2026-09-23T08:25:00.000Z',
  upstreamV180Digest:
    '66e38e1ff092131b3e1bb9761e7f173970e937386ef7e4336cb7271d19e7377c',
  target: {
    teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
    projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
    method: 'GET' as const,
    endpoint: '/v10/projects/{idOrName}/env' as const,
    decrypt: 'false' as const,
    maximumProviderCalls: 1 as const,
    maximumInventoryReads: 1 as const,
  },
  connectedCapability: {
    vercelPluginInstalled: true,
    vercelPluginEnabled: true,
    vercelSkillAdvertisesEnvironmentVariableSupport: true,
    exactEnvInventoryReadToolExposed: false,
    genericRestReadToolExposed: false,
    projectMetadataToolExposed: true,
    projectMetadataToolCallableForTarget: false,
    projectMetadataToolFailure:
      'connector-schema-server-argument-mismatch' as const,
  },
  localCapability: {
    vercelCliInstalled: false,
    vercelCliAuthenticated: false,
    vercelTokenEnvironmentPresent: false,
  },
  browserCapability: {
    executableBrowserAutomationToolExposed: false,
    authenticatedVercelBrowserSessionAvailable: false,
  },
  externalOperator: {
    validV177PreReadResponseAvailable: false,
    validV179PostReadResponseAvailable: false,
  },
});

test('v181 is resume-gate only with zero execution or mutation effects', () => {
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR
      .resumeGateOnly,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR
      .pluginInstallationAloneCountsAsCapability,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR
      .skillDocumentationAloneCountsAsCapability,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_VERIFIER_EXTERNAL_CAPABILITY_RESUME_GATE_DESCRIPTOR
      .genericContinuationCountsAsAuthorization,
    false,
  );

  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate(currentInput());
  assert.deepEqual(out.effects, {
    authorizationWrites: 0,
    credentialCreates: 0,
    credentialReads: 0,
    credentialRotations: 0,
    vercelReads: 0,
    vercelWrites: 0,
    environmentMutations: 0,
    secretReads: 0,
    secretWrites: 0,
    productionDeployments: 0,
    verifierActivations: 0,
    nativeVerifierExecutions: 0,
    databaseWrites: 0,
    productMetricWrites: 0,
    registryMutations: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
    pullRequestMerges: 0,
  });
});

test('current connected surface is blocked despite installed Vercel plugin and advertised env support', () => {
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate(currentInput());

  assert.equal(out.state, 'resume-capability-blocked');
  assert.equal(out.internalExecutionCanResume, false);
  assert.equal(out.separateAuthorizationStillRequired, true);
  assert.deepEqual(out.candidateChannels, []);
  assert.deepEqual(out.blockers, [
    'connected-vercel-env-read-capability-not-concretely-exposed',
    'connected-vercel-project-metadata-wrapper-mismatch',
    'resume-gate-no-executable-exact-read-capability',
  ]);
  assert.equal(out.productBoundary.productMomentumScore, null);
  assert.equal(out.productBoundary.productionEligible, false);
  assert.equal(out.productBoundary.productProductionActual, '0/7');
});

test('current main Product count can advance independently without changing v181 capability state', () => {
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...currentInput(),
      observedAt: '2026-09-24T22:14:41.000Z',
      productProductionActual: '1/7',
    });

  assert.equal(out.state, 'resume-capability-blocked');
  assert.equal(out.internalExecutionCanResume, false);
  assert.equal(out.separateAuthorizationStillRequired, true);
  assert.deepEqual(out.candidateChannels, []);
  assert.equal(out.productBoundary.productMomentumScore, null);
  assert.equal(out.productBoundary.productionEligible, false);
  assert.equal(out.productBoundary.productProductionActual, '1/7');
  assert.equal(
    out.digest,
    '7509a29087e19ba37461abfc8461663089779890c7c742c68392b34ae4f1d3f5',
  );
});

test('a concrete exact inventory read tool is enough to make capability resumable, but not authorized', () => {
  const input = currentInput();
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      connectedCapability: {
        ...input.connectedCapability,
        exactEnvInventoryReadToolExposed: true,
      },
    });

  assert.equal(out.state, 'resume-capability-available');
  assert.equal(out.internalExecutionCanResume, true);
  assert.equal(out.separateAuthorizationStillRequired, true);
  assert.deepEqual(out.candidateChannels, [
    'connected-vercel-exact-env-inventory-read',
  ]);
  assert.ok(
    out.blockers.includes(
      'connected-vercel-project-metadata-wrapper-mismatch',
    ),
  );
  assert.equal(out.effects.vercelReads, 0);
});

test('generic REST read tool is also a resume candidate but performs no read', () => {
  const input = currentInput();
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      connectedCapability: {
        ...input.connectedCapability,
        genericRestReadToolExposed: true,
      },
    });

  assert.equal(out.state, 'resume-capability-available');
  assert.deepEqual(out.candidateChannels, [
    'connected-vercel-generic-rest-read',
  ]);
  assert.equal(out.effects.vercelReads, 0);
});

test('local CLI only counts when installed and authenticated', () => {
  const input = currentInput();
  const incomplete =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      localCapability: {
        vercelCliInstalled: true,
        vercelCliAuthenticated: false,
        vercelTokenEnvironmentPresent: false,
      },
    });
  assert.equal(incomplete.state, 'resume-capability-blocked');
  assert.ok(
    incomplete.blockers.includes(
      'local-vercel-cli-authenticated-path-incomplete',
    ),
  );

  const ready =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      localCapability: {
        vercelCliInstalled: true,
        vercelCliAuthenticated: true,
        vercelTokenEnvironmentPresent: false,
      },
    });
  assert.equal(ready.state, 'resume-capability-available');
  assert.deepEqual(ready.candidateChannels, [
    'authenticated-local-vercel-cli-api',
  ]);
});

test('browser capability requires both executable automation and authenticated Vercel session', () => {
  const input = currentInput();
  const incomplete =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      browserCapability: {
        executableBrowserAutomationToolExposed: true,
        authenticatedVercelBrowserSessionAvailable: false,
      },
    });
  assert.equal(incomplete.state, 'resume-capability-blocked');
  assert.ok(
    incomplete.blockers.includes(
      'authenticated-browser-execution-path-incomplete',
    ),
  );

  const ready =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      browserCapability: {
        executableBrowserAutomationToolExposed: true,
        authenticatedVercelBrowserSessionAvailable: true,
      },
    });
  assert.equal(ready.state, 'resume-capability-available');
  assert.deepEqual(ready.candidateChannels, [
    'authenticated-browser-vercel-inventory-export',
  ]);
});

test('complete validated external operator exchange is a downstream resume candidate', () => {
  const input = currentInput();
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      externalOperator: {
        validV177PreReadResponseAvailable: true,
        validV179PostReadResponseAvailable: true,
      },
    });

  assert.equal(out.state, 'resume-capability-available');
  assert.deepEqual(out.candidateChannels, [
    'validated-external-operator-exchange',
  ]);
  assert.equal(out.effects.authorizationWrites, 0);
});

test('invalid target or upstream digest remains fail-closed even when a capability exists', () => {
  const input = currentInput();
  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      ...input,
      upstreamV180Digest: 'bad',
      connectedCapability: {
        ...input.connectedCapability,
        exactEnvInventoryReadToolExposed: true,
      },
    });

  assert.equal(out.state, 'resume-capability-blocked');
  assert.equal(out.internalExecutionCanResume, false);
  assert.ok(
    out.blockers.includes('resume-gate-upstream-v180-digest-invalid'),
  );
});


test('committed v181 audit reproduces current blocked resume state and unchanged ledger', async () => {
  const [auditRaw, watermarkRaw, manifestRaw] = await Promise.all([
    readFile(
      new URL(
        '../data/momentum-research/iu_verifier_external_capability_resume_gate_v181_20260923T082840Z.json',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../data/momentum-research/iu_evaluation_watermark_v151.jsonl',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../data/momentum-research/iu_paired_artifact_manifest_v154.jsonl',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  const audit = JSON.parse(auditRaw);
  const watermarks = watermarkRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const manifests = manifestRaw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      observedAt: '2026-09-23T08:25:00.000Z',
      upstreamV180Digest: audit.upstream.v180Digest,
      target: audit.target,
      connectedCapability: {
        vercelPluginInstalled:
          audit.currentCapabilityEvidence.vercelPluginInstalled,
        vercelPluginEnabled:
          audit.currentCapabilityEvidence.vercelPluginEnabled,
        vercelSkillAdvertisesEnvironmentVariableSupport:
          audit.currentCapabilityEvidence
            .vercelSkillAdvertisesEnvironmentVariableSupport,
        exactEnvInventoryReadToolExposed:
          audit.currentCapabilityEvidence.exactEnvInventoryReadToolExposed,
        genericRestReadToolExposed:
          audit.currentCapabilityEvidence.genericRestReadToolExposed,
        projectMetadataToolExposed:
          audit.currentCapabilityEvidence.projectMetadataToolExposed,
        projectMetadataToolCallableForTarget:
          audit.currentCapabilityEvidence.projectMetadataToolCallableForTarget,
        projectMetadataToolFailure:
          audit.currentCapabilityEvidence.projectMetadataToolFailure,
      },
      localCapability: {
        vercelCliInstalled:
          audit.currentCapabilityEvidence.localVercelCliInstalled,
        vercelCliAuthenticated:
          audit.currentCapabilityEvidence.localVercelCliAuthenticated,
        vercelTokenEnvironmentPresent:
          audit.currentCapabilityEvidence.vercelTokenEnvironmentPresent,
      },
      browserCapability: {
        executableBrowserAutomationToolExposed:
          audit.currentCapabilityEvidence
            .executableBrowserAutomationToolExposed,
        authenticatedVercelBrowserSessionAvailable:
          audit.currentCapabilityEvidence
            .authenticatedVercelBrowserSessionAvailable,
      },
      externalOperator: {
        validV177PreReadResponseAvailable:
          audit.currentCapabilityEvidence.validV177PreReadResponseAvailable,
        validV179PostReadResponseAvailable:
          audit.currentCapabilityEvidence.validV179PostReadResponseAvailable,
      },
    });

  assert.equal(
    audit.contractVersion,
    'v181_fandex_momentum_verifier_external_capability_resume_gate_audit_v1',
  );
  assert.equal(out.state, audit.currentResult.state);
  assert.equal(
    out.internalExecutionCanResume,
    audit.currentResult.internalExecutionCanResume,
  );
  assert.equal(
    out.separateAuthorizationStillRequired,
    audit.currentResult.separateAuthorizationStillRequired,
  );
  assert.deepEqual(out.candidateChannels, audit.currentResult.candidateChannels);
  assert.deepEqual(out.blockers, audit.currentResult.blockers);
  assert.equal(out.digest, audit.currentResult.digest);
  assert.deepEqual(out.effects, audit.effects);
  assert.equal(audit.capabilityChecks.localCliCommandAvailable, false);
  assert.equal(audit.capabilityChecks.localTokenPresent, false);
  assert.equal(audit.capabilityChecks.concreteEnvInventoryToolFound, false);
  assert.equal(audit.capabilityChecks.executableBrowserToolFound, false);

  assert.equal(
    watermarks.length,
    audit.authoritativeLedgerBoundary.v151WatermarkRecordCount,
  );
  assert.equal(
    watermarks.at(-1).sequence,
    audit.authoritativeLedgerBoundary.latestWatermarkSequence,
  );
  assert.equal(
    watermarks.at(-1).evaluationBoundary.sourceEvidence.naverThroughSlotStart,
    audit.authoritativeLedgerBoundary.latestAcceptedNaverThroughSlotStart,
  );
  assert.equal(
    manifests.length,
    audit.authoritativeLedgerBoundary.v154ManifestRecordCount,
  );
  assert.equal(
    manifests.at(-1).sequence,
    audit.authoritativeLedgerBoundary.latestManifestSequence,
  );
  assert.equal(
    manifests.at(-1).manifestDigest,
    audit.authoritativeLedgerBoundary.latestManifestDigest,
  );
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});


test('2026-09-24 live recheck preserves the same blocked v181 digest despite newly exposed but unusable Neon read tools', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_external_capability_resume_gate_v181_recheck_20260924T114700Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      observedAt: audit.observedAt,
      upstreamV180Digest: audit.upstream.v180Digest,
      target: audit.target,
      connectedCapability: audit.currentGateInput.connectedCapability,
      localCapability: audit.currentGateInput.localCapability,
      browserCapability: audit.currentGateInput.browserCapability,
      externalOperator: audit.currentGateInput.externalOperator,
    });

  assert.equal(
    audit.contractVersion,
    'v181_fandex_momentum_verifier_external_capability_resume_gate_recheck_audit_v1',
  );
  assert.equal(audit.liveCapabilityChecks.neon.runSqlToolExposed, true);
  assert.equal(
    audit.liveCapabilityChecks.neon.exactDatabaseReadCallable,
    false,
  );
  assert.equal(
    audit.liveCapabilityChecks.neon.wrapperAllowsProjectIdArgument,
    false,
  );
  assert.equal(
    audit.liveCapabilityChecks.neon.underlyingServerRequiresProjectId,
    true,
  );
  assert.equal(
    audit.interpretation.neonToolExposureAloneCountsAsResumeCapability,
    false,
  );
  assert.equal(audit.interpretation.newResumeConditionSatisfied, false);
  assert.equal(audit.interpretation.newMethodologyVersionRequired, false);

  assert.equal(out.state, audit.currentResult.state);
  assert.equal(
    out.internalExecutionCanResume,
    audit.currentResult.internalExecutionCanResume,
  );
  assert.deepEqual(out.candidateChannels, audit.currentResult.candidateChannels);
  assert.deepEqual(out.blockers, audit.currentResult.blockers);
  assert.equal(out.digest, audit.currentResult.digest);
  assert.equal(
    out.digest,
    'b574a2fbcd7cddb8e7d32e734da0810399776c5a1ecf92960fd114fd4b5ae0a6',
  );
  assert.deepEqual(out.effects, audit.effects);
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});


test('2026-09-25 live recheck preserves the blocked v181 digest after Vercel/Neon wrapper and local capability probes', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_external_capability_resume_gate_v181_recheck_20260925T065200KST.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      observedAt: audit.observedAt,
      upstreamV180Digest: audit.upstream.v180Digest,
      target: audit.target,
      connectedCapability: audit.currentGateInput.connectedCapability,
      localCapability: audit.currentGateInput.localCapability,
      browserCapability: audit.currentGateInput.browserCapability,
      externalOperator: audit.currentGateInput.externalOperator,
    });

  assert.equal(
    audit.contractVersion,
    'v181_fandex_momentum_verifier_external_capability_resume_gate_recheck_audit_v1',
  );
  assert.equal(audit.localObservationDate, '2026-09-25');

  assert.equal(
    audit.liveCapabilityChecks.vercel.exactEnvInventoryReadToolExposed,
    false,
  );
  assert.equal(
    audit.liveCapabilityChecks.vercel.genericRestReadToolExposed,
    false,
  );
  assert.equal(
    audit.liveCapabilityChecks.vercel.getProjectCallableForTarget,
    false,
  );
  assert.equal(
    audit.liveCapabilityChecks.vercel.alternateInventoryReadPluginFound,
    false,
  );

  assert.equal(audit.liveCapabilityChecks.neon.runSqlToolExposed, true);
  assert.equal(
    audit.liveCapabilityChecks.neon.exactDatabaseReadCallable,
    false,
  );
  assert.equal(
    audit.liveCapabilityChecks.neon.explicitProjectIdInjectionAttempted,
    true,
  );
  assert.equal(
    audit.liveCapabilityChecks.neon.explicitProjectIdInjectionFailure,
    'wrapper-additional-properties-forbidden',
  );
  assert.equal(
    audit.liveCapabilityChecks.neon.wrapperAllowsProjectIdArgument,
    false,
  );
  assert.equal(
    audit.liveCapabilityChecks.neon.underlyingServerRequiresProjectId,
    true,
  );

  assert.equal(audit.liveCapabilityChecks.local.vercelCliInstalled, false);
  assert.equal(audit.liveCapabilityChecks.local.agentBrowserCliInstalled, false);
  assert.equal(
    audit.liveCapabilityChecks.local.vercelTokenEnvironmentPresent,
    false,
  );
  assert.equal(
    audit.liveCapabilityChecks.local.vercelOidcTokenEnvironmentPresent,
    false,
  );

  assert.equal(
    audit.interpretation.newResumeConditionSatisfied,
    false,
  );
  assert.equal(
    audit.interpretation.newMethodologyVersionRequired,
    false,
  );
  assert.equal(
    audit.interpretation.genericContinuationIsAuthorization,
    false,
  );

  assert.equal(out.state, audit.currentResult.state);
  assert.equal(
    out.internalExecutionCanResume,
    audit.currentResult.internalExecutionCanResume,
  );
  assert.equal(
    out.separateAuthorizationStillRequired,
    audit.currentResult.separateAuthorizationStillRequired,
  );
  assert.deepEqual(out.candidateChannels, audit.currentResult.candidateChannels);
  assert.deepEqual(out.blockers, audit.currentResult.blockers);
  assert.equal(out.digest, audit.currentResult.digest);
  assert.equal(
    out.digest,
    'b574a2fbcd7cddb8e7d32e734da0810399776c5a1ecf92960fd114fd4b5ae0a6',
  );
  assert.deepEqual(out.effects, audit.effects);
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});


test('current-main reconciliation keeps v181 blocked while global Product actual advances to 1/7', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_verifier_external_capability_resume_gate_v181_main_reconciliation_920be35e.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  const out =
    evaluateFandexMomentumVerifierExternalCapabilityResumeGate({
      observedAt: audit.observedAt,
      upstreamV180Digest: audit.upstream.v180Digest,
      productProductionActual:
        audit.currentGateInput.productProductionActual,
      target: audit.target,
      connectedCapability: audit.currentGateInput.connectedCapability,
      localCapability: audit.currentGateInput.localCapability,
      browserCapability: audit.currentGateInput.browserCapability,
      externalOperator: audit.currentGateInput.externalOperator,
    });

  assert.equal(
    audit.contractVersion,
    'v181_fandex_momentum_verifier_external_capability_resume_gate_main_lineage_reconciliation_audit_v1',
  );
  assert.equal(
    audit.mainLineage.currentMainSha,
    '920be35ea3c3443c7045f290590803654c593d64',
  );
  assert.equal(audit.mainLineage.branchBehindMainBy, 97);
  assert.equal(
    audit.mainLineage.productionEvidence.newsIssuePointLifecycle,
    'production',
  );
  assert.equal(
    audit.mainLineage.productionEvidence.directProductionContributionEligible,
    true,
  );
  assert.equal(
    audit.mainLineage.productionEvidence.publicRouteActivated,
    true,
  );
  assert.equal(
    audit.mainLineage.productionEvidence.productScorePublished,
    true,
  );
  assert.equal(
    audit.interpretation.mainProductBoundaryAdvancedSincePriorAudit,
    true,
  );
  assert.equal(
    audit.interpretation.newResumeConditionSatisfied,
    false,
  );
  assert.equal(
    audit.interpretation.newMethodologyVersionRequired,
    false,
  );
  assert.equal(
    audit.interpretation.branchMergeOrRebasePerformed,
    false,
  );

  assert.equal(out.state, audit.currentResult.state);
  assert.equal(
    out.internalExecutionCanResume,
    audit.currentResult.internalExecutionCanResume,
  );
  assert.equal(
    out.separateAuthorizationStillRequired,
    audit.currentResult.separateAuthorizationStillRequired,
  );
  assert.deepEqual(out.candidateChannels, audit.currentResult.candidateChannels);
  assert.deepEqual(out.blockers, audit.currentResult.blockers);
  assert.equal(out.digest, audit.currentResult.digest);
  assert.equal(
    out.digest,
    '7509a29087e19ba37461abfc8461663089779890c7c742c68392b34ae4f1d3f5',
  );
  assert.deepEqual(out.effects, audit.effects);
  assert.equal(out.productBoundary.productMomentumScore, null);
  assert.equal(out.productBoundary.productionEligible, false);
  assert.equal(out.productBoundary.productProductionActual, '1/7');
});
