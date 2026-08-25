import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const EXPECTED_LINEAGE = Object.freeze({
  migration001: '8c48ab0e3094461316e07e666b4b0370450548df1dca5847970b4dc9639e259a',
  grantPlanV117: '05e8eba83f4b88d7d4897b42f4cc62c3cc337dc35f88b8efa618aee8302ba546',
  correctedVerifier: 'e1012c0738bddda1c319a9f814589b66cfa48de6f79e753f7dbf6d9111f43048',
  migratorVerification: 'f6eeb2b4b9343aa4baeb4b3753f67bb2fd4cc9837c59bc3d4a07535af78d4529',
  runtimeVerification: '4b77a9e0a71a465e6f3ff60d8961449ffcd49fc87cee510a19c9b2f74ede9c7a',
  ownerCatalog: 'd523a7fde57b6b76fd8c6a7661707a57d61cebc19e07888f275adb493d2f2725',
  acl: '53415aa48c6c5cbad29c49b267e72fba1408235d54395e56fc108248b845ce17',
  vercelMetadata: '43e0a21bf3c7f215491edd2be692cfdd3fd434bda3f8f21a0667e31856622d37',
  aggregateReadinessV118: 'e1bd710f0000652f05e1b8584bf246290232c4ac99fdca515307d1234bf46289',
});

const ENV_NAMES = ['DATABASE_URL','DATABASE_URL_UNPOOLED','FANDEX_MIGRATION_DATABASE_URL','FANDEX_RUNTIME_DATABASE_URL'] as const;
type EnvironmentName = typeof ENV_NAMES[number];
type Readiness = 'ready' | 'blocked';

export type EnvironmentMetadata = Readonly<{ name: EnvironmentName; scope: 'production' | 'preview' | 'development'; sensitive: boolean }>;
export type DeploymentReadinessInput = Readonly<{
  version: 'v119';
  lineage: typeof EXPECTED_LINEAGE;
  source: Readonly<{
    expectedProductionBranch: 'main'; remoteMainSha: string | null; v118CommitSha: string;
    remoteMainObjectAvailableLocally: boolean; mainContainsV118: boolean | null;
    v118AheadBehindMain: Readonly<{ ahead: number; behind: number }> | null;
    latestProductionDeploymentSourceBranch: string | null; latestProductionDeploymentSourceCommit: string | null;
  }>;
  vercel: Readonly<{
    linkPresent: boolean; projectName: 'fandex' | null; productionBranch: 'main' | null;
    metadataReadCount: number; environment: readonly EnvironmentMetadata[];
    latestReadyProductionDeploymentIdentifiable: boolean; previousReadyProductionDeploymentIdentifiable: boolean;
    previousReadyProductionSourceBranch: string | null; previousReadyProductionSourceCommit: string | null;
  }>;
  staticInspection: Readonly<{
    runtimeEnvironmentReferencePaths: readonly string[]; migrationEnvironmentReferencePaths: readonly string[];
    legacyRuntimeFallbackFound: boolean; migrationCredentialUsedByRuntime: boolean; runtimeCredentialUsedByMigration: boolean;
    nextPublicDatabaseCredentialFound: boolean; dynamicDatabaseEnvironmentAccessFound: boolean;
    buildLifecycleDatabaseOperationFound: boolean; automaticBusinessPersistenceEntrypointFound: boolean;
    persistenceCallSites: readonly string[];
  }>;
  validation: Readonly<{ npmCi: boolean; securityAudit: boolean; typecheck: boolean; lint: boolean; securityTests: boolean; persistenceTests: boolean; roleBootstrapTests: boolean; productionBootstrapTests: boolean; v119Tests: boolean; migrationPlan: boolean; rolePlan: boolean; build: boolean }>;
}>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string { return createHash('sha256').update(canonical(value), 'utf8').digest('hex'); }
function hex40(value: string | null): boolean { return value === null || /^[0-9a-f]{40}$/.test(value); }
function noSensitiveMaterial(value: unknown): boolean {
  const text = canonical(value);
  return !/(?:postgres(?:ql)?:\/\/|https?:\/\/|password|credential_value|secret_value|access_token|team_id|account_id|project_id|hostname|username)/i.test(text);
}

export function validateDeploymentReadinessInput(input: DeploymentReadinessInput): { valid: true } {
  if (input.version !== 'v119' || canonical(input.lineage) !== canonical(EXPECTED_LINEAGE)) throw new Error('v118_lineage_mismatch');
  if (input.source.expectedProductionBranch !== 'main' || input.source.v118CommitSha !== 'c5d6be5d6e3d43218319b878d46ab8b92683a3c8'
      || !hex40(input.source.remoteMainSha) || !hex40(input.source.latestProductionDeploymentSourceCommit)
      || input.vercel.projectName !== 'fandex' || input.vercel.metadataReadCount < 0) throw new Error('deployment_readiness_input_invalid');
  if (input.vercel.environment.some((row) => !(ENV_NAMES as readonly string[]).includes(row.name)
      || !['production','preview','development'].includes(row.scope))) throw new Error('environment_metadata_invalid');
  if (!noSensitiveMaterial(input)) throw new Error('sanitized_input_required');
  return { valid: true };
}

export function buildDeploymentSourceManifest(input: DeploymentReadinessInput) {
  validateDeploymentReadinessInput(input);
  const ancestryVerified = input.source.remoteMainObjectAvailableLocally && input.source.mainContainsV118 !== null;
  const containsV118 = ancestryVerified && input.source.mainContainsV118 === true;
  return Object.freeze({
    productionBranchExpected: 'main', productionBranchObserved: input.vercel.productionBranch ?? 'unverified',
    remoteMainSha: input.source.remoteMainSha ?? 'unconfirmed', v118CommitSha: input.source.v118CommitSha,
    remoteMainObjectAvailableLocally: input.source.remoteMainObjectAvailableLocally,
    mainContainsV118: ancestryVerified ? input.source.mainContainsV118 : 'unknown',
    v118AheadBehindMain: ancestryVerified ? input.source.v118AheadBehindMain : null,
    latestProductionDeploymentSourceBranch: input.source.latestProductionDeploymentSourceBranch ?? 'unverified',
    latestProductionDeploymentSourceCommit: input.source.latestProductionDeploymentSourceCommit ?? 'unverified',
    directCurrentBranchProductionDeployPlanned: false, gitProductionBranchPathRequired: true,
    sourceIntegrationReadiness: containsV118 && input.vercel.productionBranch === 'main' ? 'ready' as const : 'blocked' as const,
  });
}

export function buildEnvironmentExposureManifest(input: DeploymentReadinessInput) {
  validateDeploymentReadinessInput(input);
  const rows = [...input.vercel.environment].sort((a, b) => `${a.name}:${a.scope}`.localeCompare(`${b.name}:${b.scope}`));
  const find = (name: EnvironmentName, scope: EnvironmentMetadata['scope']) => rows.find((row) => row.name === name && row.scope === scope);
  const required = (['FANDEX_MIGRATION_DATABASE_URL','FANDEX_RUNTIME_DATABASE_URL'] as const).map((name) => ({
    name, production: Boolean(find(name,'production')?.sensitive), previewExposed: Boolean(find(name,'preview')), developmentExposed: Boolean(find(name,'development')),
    connectionMode: name === 'FANDEX_MIGRATION_DATABASE_URL' ? 'unpooled' as const : 'pooled' as const,
  }));
  const legacy = (['DATABASE_URL','DATABASE_URL_UNPOOLED'] as const).map((name) => ({
    name, production: Boolean(find(name,'production')), preview: Boolean(find(name,'preview')), development: Boolean(find(name,'development')),
    productionSensitive: Boolean(find(name,'production')?.sensitive), classification: 'owner_bound_legacy' as const,
  }));
  return Object.freeze({
    project: 'fandex', required: Object.freeze(required), legacy: Object.freeze(legacy),
    environmentBindingReadiness: input.vercel.linkPresent && required.every((row) => row.production && !row.previewExposed && !row.developmentExposed) ? 'ready' as const : 'blocked' as const,
    privilegedLegacyEnvironmentReadiness: legacy.some((row) => row.production) ? 'blocked' as const : 'ready' as const,
    secretValuesRead: 0, secretHashesCreated: 0,
  });
}

export function buildDeploymentPlan(input: DeploymentReadinessInput) {
  const source = buildDeploymentSourceManifest(input); const environment = buildEnvironmentExposureManifest(input);
  return Object.freeze({
    mode: 'plan_only', project: 'fandex', productionBranch: 'main',
    requiredSourceCommit: 'main_commit_containing_v119_readiness_change', source,
    requiredProductionEnvironment: environment.required,
    gates: Object.freeze(['npm_ci','production_security_audit','typecheck','lint','security_tests','persistence_tests','role_bootstrap_tests','production_bootstrap_tests','v119_readiness_tests','migration_plan_only','role_plan_only','production_build']),
    expectedBehavior: 'infrastructure_only', postDeploymentHealthCheck: Object.freeze(['read_only_application_health','read_only_route_health','no_database_probe','no_business_write']),
    businessWritesAllowed: false, deploymentApprovalRequired: true, deploymentAuthorized: false, deploymentPerformed: false,
  });
}

export function buildRollbackPlan(input: DeploymentReadinessInput) {
  validateDeploymentReadinessInput(input);
  const identifiable = input.vercel.previousReadyProductionDeploymentIdentifiable && input.vercel.previousReadyProductionSourceCommit !== null;
  return Object.freeze({
    previousReadyProductionDeploymentIdentifiable: identifiable,
    previousSourceBranch: identifiable ? input.vercel.previousReadyProductionSourceBranch : null,
    previousSourceCommit: identifiable ? input.vercel.previousReadyProductionSourceCommit : null,
    applicationRollbackProcedure: Object.freeze(['identify_previous_ready_production_deployment','request_explicit_rollback_authorization','execute_vercel_application_rollback','perform_read_only_health_check']),
    migration001AdditiveBackwardCompatible: true, previousApplicationUsesFandexSchema: false,
    databaseRollbackRequiredForApplicationRollback: false,
    disasterRecoverySnapshot: 'pre-v117-production-baseline', snapshotUsedByThisPlan: false,
    rollbackAuthorization: 'not_authorized', rollbackReadiness: identifiable ? 'ready' as const : 'blocked' as const,
  });
}

export function evaluateDeploymentReadiness(input: DeploymentReadinessInput) {
  validateDeploymentReadinessInput(input);
  const source = buildDeploymentSourceManifest(input); const environment = buildEnvironmentExposureManifest(input); const rollback = buildRollbackPlan(input);
  const validationReady = Object.values(input.validation).every(Boolean);
  const runtimeReady = !input.staticInspection.legacyRuntimeFallbackFound && !input.staticInspection.migrationCredentialUsedByRuntime
    && !input.staticInspection.runtimeCredentialUsedByMigration && !input.staticInspection.nextPublicDatabaseCredentialFound
    && !input.staticInspection.dynamicDatabaseEnvironmentAccessFound && !input.staticInspection.buildLifecycleDatabaseOperationFound;
  const businessSafe = !input.staticInspection.automaticBusinessPersistenceEntrypointFound;
  const technicalReady = validationReady && input.validation.securityAudit && input.validation.securityTests
    && source.sourceIntegrationReadiness === 'ready' && environment.environmentBindingReadiness === 'ready'
    && environment.privilegedLegacyEnvironmentReadiness === 'ready' && runtimeReady && businessSafe && rollback.rollbackReadiness === 'ready';
  const matrix = Object.freeze({
    production_infrastructure_readiness: 'ready' as Readiness,
    build_readiness: validationReady ? 'ready' as Readiness : 'blocked' as Readiness,
    security_readiness: input.validation.securityAudit && input.validation.securityTests ? 'ready' as Readiness : 'blocked' as Readiness,
    source_integration_readiness: source.sourceIntegrationReadiness,
    environment_binding_readiness: environment.environmentBindingReadiness,
    privileged_legacy_environment_readiness: environment.privilegedLegacyEnvironmentReadiness,
    runtime_entrypoint_readiness: runtimeReady ? 'ready' as Readiness : 'blocked' as Readiness,
    business_persistence_safety: businessSafe ? 'ready' as Readiness : 'blocked' as Readiness,
    rollback_readiness: rollback.rollbackReadiness,
    production_deployment_technical_readiness: technicalReady ? 'ready' as Readiness : 'blocked' as Readiness,
    production_deployment_authorization: 'not_authorized' as const,
    production_deployment_execution_readiness: 'not_ready' as const,
  });
  const blockers = [
    ...(matrix.source_integration_readiness === 'blocked' ? ['remote_main_ancestry_or_production_branch_unverified','v118_v119_changes_require_pr_review_and_main_merge'] : []),
    ...(matrix.environment_binding_readiness === 'blocked' ? ['required_fandex_environment_binding_invalid'] : []),
    ...(matrix.privileged_legacy_environment_readiness === 'blocked' ? ['legacy_owner_database_environment_present_requires_separate_deletion_approval'] : []),
    ...(matrix.runtime_entrypoint_readiness === 'blocked' ? ['runtime_credential_boundary_invalid'] : []),
    ...(matrix.business_persistence_safety === 'blocked' ? ['automatic_business_persistence_entrypoint_present'] : []),
    ...(matrix.rollback_readiness === 'blocked' ? ['previous_ready_production_deployment_unidentified'] : []),
    ...(matrix.build_readiness === 'blocked' ? ['build_or_test_gate_failed'] : []),
    ...(matrix.security_readiness === 'blocked' ? ['production_security_gate_failed'] : []),
    'production_deployment_not_authorized',
  ];
  const manifests = Object.freeze({ source, environment, deploymentPlan: buildDeploymentPlan(input), rollbackPlan: rollback });
  const result = Object.freeze({
    version: 'v119', outcome: 'deployment_not_ready', matrix, blockers: Object.freeze(blockers), manifests,
    infrastructureDeploymentOnly: true, automaticCollectionApplicationActive: false,
    deploymentPerformed: false, businessPersistencePerformed: false,
    externalEffects: Object.freeze({ gitRemoteMetadataReads: 1, vercelMetadataReads: input.vercel.metadataReadCount, npmRegistryCommands: 2, dbConnections: 0, dbQueries: 0, migrationsApplied: 0, roleMutations: 0, environmentMutations: 0, businessWrites: 0, outboxOperations: 0, deploymentsCreated: 0, snapshotsChanged: 0, prsCreated: 0, merges: 0 }),
    secretValuesRead: 0, secretHashesCreated: 0,
  });
  return Object.freeze({ ...result, digests: Object.freeze({ sourceManifest: digest(source), environmentManifest: digest(environment), deploymentPlan: digest(manifests.deploymentPlan), rollbackPlan: digest(rollback), aggregateReadiness: digest(result) }) });
}

export const DEFAULT_READINESS_INPUT: DeploymentReadinessInput = Object.freeze({
  version: 'v119', lineage: EXPECTED_LINEAGE,
  source: Object.freeze({ expectedProductionBranch: 'main', remoteMainSha: '627fbd1e88f7de73869a237d9aa5bd22597e6501', v118CommitSha: 'c5d6be5d6e3d43218319b878d46ab8b92683a3c8', remoteMainObjectAvailableLocally: false, mainContainsV118: null, v118AheadBehindMain: null, latestProductionDeploymentSourceBranch: 'main', latestProductionDeploymentSourceCommit: '627fbd1e88f7de73869a237d9aa5bd22597e6501' }),
  vercel: Object.freeze({
    linkPresent: true, projectName: 'fandex', productionBranch: null, metadataReadCount: 7,
    environment: Object.freeze([
      { name: 'DATABASE_URL', scope: 'production', sensitive: true }, { name: 'DATABASE_URL', scope: 'preview', sensitive: true },
      { name: 'DATABASE_URL_UNPOOLED', scope: 'production', sensitive: true }, { name: 'DATABASE_URL_UNPOOLED', scope: 'preview', sensitive: true },
      { name: 'FANDEX_MIGRATION_DATABASE_URL', scope: 'production', sensitive: true }, { name: 'FANDEX_RUNTIME_DATABASE_URL', scope: 'production', sensitive: true },
    ] satisfies EnvironmentMetadata[]),
    latestReadyProductionDeploymentIdentifiable: true, previousReadyProductionDeploymentIdentifiable: true,
    previousReadyProductionSourceBranch: 'main', previousReadyProductionSourceCommit: '1ff8c87a175c4035c57695a26f2f8e241c0b3baf',
  }),
  staticInspection: Object.freeze({
    runtimeEnvironmentReferencePaths: Object.freeze(['lib/server/persistence/contracts.ts','lib/server/persistence/db.ts']),
    migrationEnvironmentReferencePaths: Object.freeze(['scripts/database/run-postgres-migrations.mts']),
    legacyRuntimeFallbackFound: false, migrationCredentialUsedByRuntime: false, runtimeCredentialUsedByMigration: false,
    nextPublicDatabaseCredentialFound: false, dynamicDatabaseEnvironmentAccessFound: false, buildLifecycleDatabaseOperationFound: false,
    automaticBusinessPersistenceEntrypointFound: false, persistenceCallSites: Object.freeze(['lib/server/persistence/adapter.ts','scripts/database/validate-staging-v116.mts','tests/managed-postgres-persistence.test.ts']),
  }),
  validation: Object.freeze({ npmCi: true, securityAudit: true, typecheck: true, lint: true, securityTests: true, persistenceTests: true, roleBootstrapTests: true, productionBootstrapTests: true, v119Tests: true, migrationPlan: true, rolePlan: true, build: true }),
});

export async function main(): Promise<void> { process.stdout.write(`${JSON.stringify(evaluateDeploymentReadiness(DEFAULT_READINESS_INPUT), null, 2)}\n`); }
const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) void main();
