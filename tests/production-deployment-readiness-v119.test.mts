import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_READINESS_INPUT,
  buildDeploymentPlan,
  buildDeploymentSourceManifest,
  buildEnvironmentExposureManifest,
  buildRollbackPlan,
  evaluateDeploymentReadiness,
  validateDeploymentReadinessInput,
  type DeploymentReadinessInput,
} from '../scripts/deployment/evaluate-production-deployment-readiness-v119.mjs';

type DeepMutable<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer Item)[]
  ? DeepMutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
    : T;
type MutableDeploymentReadinessInput = DeepMutable<DeploymentReadinessInput>;
type ReadinessMatrixKey = keyof ReturnType<typeof evaluateDeploymentReadiness>['matrix'];

function input(): DeploymentReadinessInput { return structuredClone(DEFAULT_READINESS_INPUT); }
function mutate(callback: (value: MutableDeploymentReadinessInput) => void): DeploymentReadinessInput {
  const value = structuredClone(DEFAULT_READINESS_INPUT) as MutableDeploymentReadinessInput;
  callback(value);
  return value as unknown as DeploymentReadinessInput;
}

test('v118 lineage and sanitized input contract are exact', () => {
  assert.deepEqual(validateDeploymentReadinessInput(input()), { valid: true });
  assert.throws(() => validateDeploymentReadinessInput(mutate((value) => { value.lineage.correctedVerifier = '0'.repeat(64); })), /v118_lineage_mismatch/);
  assert.throws(() => validateDeploymentReadinessInput(mutate((value) => { value.source.v118CommitSha = '0'.repeat(40); })), /deployment_readiness_input_invalid/);
  assert.throws(() => validateDeploymentReadinessInput(mutate((value) => { (value as unknown as Record<string, unknown>).forbidden = 'postgresql:\/\/synthetic'; })), /sanitized_input_required/);
});

test('source integration blocks unknown ancestry and requires the Git main path', () => {
  const manifest = buildDeploymentSourceManifest(input());
  assert.equal(manifest.remoteMainSha, '627fbd1e88f7de73869a237d9aa5bd22597e6501');
  assert.equal(manifest.mainContainsV118, 'unknown'); assert.equal(manifest.sourceIntegrationReadiness, 'blocked');
  assert.equal(manifest.directCurrentBranchProductionDeployPlanned, false); assert.equal(manifest.gitProductionBranchPathRequired, true);
  const absent = buildDeploymentSourceManifest(mutate((value) => { value.source.remoteMainSha = null; }));
  assert.equal(absent.sourceIntegrationReadiness, 'blocked');
  const notContained = buildDeploymentSourceManifest(mutate((value) => { value.source.remoteMainObjectAvailableLocally = true; value.source.mainContainsV118 = false; value.source.v118AheadBehindMain = { ahead: 1, behind: 2 }; value.vercel.productionBranch = 'main'; }));
  assert.equal(notContained.sourceIntegrationReadiness, 'blocked');
  assert.throws(() => buildDeploymentSourceManifest(mutate((value) => { value.source.expectedProductionBranch = 'other'; })), /deployment_readiness_input_invalid/);
});

test('environment manifest requires exact FANDEX Production Sensitive bindings without nonproduction exposure', () => {
  const manifest = buildEnvironmentExposureManifest(input());
  assert.equal(manifest.environmentBindingReadiness, 'ready'); assert.equal(manifest.privilegedLegacyEnvironmentReadiness, 'blocked');
  assert.deepEqual(manifest.required.map((row) => [row.name,row.connectionMode,row.production,row.previewExposed,row.developmentExposed]), [
    ['FANDEX_MIGRATION_DATABASE_URL','unpooled',true,false,false], ['FANDEX_RUNTIME_DATABASE_URL','pooled',true,false,false],
  ]);
  for (const changed of [
    mutate((value) => { value.vercel.environment = value.vercel.environment.filter((row) => row.name !== 'FANDEX_RUNTIME_DATABASE_URL'); }),
    mutate((value) => { const row = value.vercel.environment.find((item) => item.name === 'FANDEX_RUNTIME_DATABASE_URL'); if (row) row.sensitive = false; }),
    mutate((value) => { const row = value.vercel.environment.find((item) => item.name === 'FANDEX_MIGRATION_DATABASE_URL'); if (row) row.scope = 'preview'; }),
    mutate((value) => { value.vercel.environment.push({ name: 'FANDEX_RUNTIME_DATABASE_URL', scope: 'development', sensitive: true }); }),
  ]) assert.equal(buildEnvironmentExposureManifest(changed).environmentBindingReadiness, 'blocked');
  const noLegacy = mutate((value) => { value.vercel.environment = value.vercel.environment.filter((row) => !['DATABASE_URL','DATABASE_URL_UNPOOLED'].includes(row.name)); });
  assert.equal(buildEnvironmentExposureManifest(noLegacy).privilegedLegacyEnvironmentReadiness, 'ready');
});

test('runtime credential and persistence boundaries fail closed independently', () => {
  const cases: [string, (value: MutableDeploymentReadinessInput) => void, ReadinessMatrixKey][] = [
    ['legacy fallback', (v) => { v.staticInspection.legacyRuntimeFallbackFound = true; }, 'runtime_entrypoint_readiness'],
    ['migration credential in runtime', (v) => { v.staticInspection.migrationCredentialUsedByRuntime = true; }, 'runtime_entrypoint_readiness'],
    ['runtime credential in migration', (v) => { v.staticInspection.runtimeCredentialUsedByMigration = true; }, 'runtime_entrypoint_readiness'],
    ['NEXT_PUBLIC database credential', (v) => { v.staticInspection.nextPublicDatabaseCredentialFound = true; }, 'runtime_entrypoint_readiness'],
    ['dynamic environment access', (v) => { v.staticInspection.dynamicDatabaseEnvironmentAccessFound = true; }, 'runtime_entrypoint_readiness'],
    ['build lifecycle migration', (v) => { v.staticInspection.buildLifecycleDatabaseOperationFound = true; }, 'runtime_entrypoint_readiness'],
    ['automatic persistence', (v) => { v.staticInspection.automaticBusinessPersistenceEntrypointFound = true; }, 'business_persistence_safety'],
  ];
  for (const [,change,key] of cases) assert.equal(evaluateDeploymentReadiness(mutate(change)).matrix[key], 'blocked');
  const base = evaluateDeploymentReadiness(input());
  assert.equal(base.matrix.runtime_entrypoint_readiness, 'ready'); assert.equal(base.matrix.business_persistence_safety, 'ready');
  assert.equal(base.automaticCollectionApplicationActive, false); assert.equal(base.businessPersistencePerformed, false);
});

test('rollback requires an identifiable previous READY Production deployment', () => {
  assert.equal(buildRollbackPlan(input()).rollbackReadiness, 'ready');
  const missing = mutate((value) => { value.vercel.previousReadyProductionDeploymentIdentifiable = false; value.vercel.previousReadyProductionSourceCommit = null; });
  assert.equal(buildRollbackPlan(missing).rollbackReadiness, 'blocked');
  assert.equal(evaluateDeploymentReadiness(missing).matrix.rollback_readiness, 'blocked');
});

test('deployment plan is non-mutating and never grants authorization', () => {
  const plan = buildDeploymentPlan(input());
  assert.equal(plan.mode, 'plan_only'); assert.equal(plan.deploymentApprovalRequired, true);
  assert.equal(plan.deploymentAuthorized, false); assert.equal(plan.deploymentPerformed, false); assert.equal(plan.businessWritesAllowed, false);
  const result = evaluateDeploymentReadiness(input());
  assert.equal(result.matrix.production_deployment_authorization, 'not_authorized');
  assert.equal(result.matrix.production_deployment_execution_readiness, 'not_ready');
  assert.equal(result.deploymentPerformed, false);
  for (const key of ['dbConnections','dbQueries','migrationsApplied','roleMutations','environmentMutations','businessWrites','outboxOperations','deploymentsCreated','snapshotsChanged','prsCreated','merges'] as const) assert.equal(result.externalEffects[key], 0);
});

test('build and security failures remain distinct blockers', () => {
  const buildFailure = evaluateDeploymentReadiness(mutate((value) => { value.validation.build = false; }));
  assert.equal(buildFailure.matrix.build_readiness, 'blocked');
  const auditFailure = evaluateDeploymentReadiness(mutate((value) => { value.validation.securityAudit = false; }));
  assert.equal(auditFailure.matrix.security_readiness, 'blocked');
});

test('first and replay outputs are byte deterministic and sanitized', () => {
  const first = JSON.stringify(evaluateDeploymentReadiness(input())); const replay = JSON.stringify(evaluateDeploymentReadiness(input()));
  assert.equal(first, replay);
  assert.doesNotMatch(first, /postgres(?:ql)?:\/\/|https?:\/\/|secret_value|access_token|team_id|account_id|project_id|hostname|username/i);
  const result = JSON.parse(first);
  assert.equal(result.secretValuesRead, 0); assert.equal(result.secretHashesCreated, 0);
});
