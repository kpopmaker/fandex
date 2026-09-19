import { readFile } from 'node:fs/promises';

import type { LuminateFandexAuthorizationGrant } from './luminateAlbumAuthorizationResearch';
import {
  assessIuLuminateLicensedBootstrap,
  buildIuLuminateLicensedBootstrapManifest,
  type LuminateDataShareAccessEvidence,
} from './iuLuminateLicensedBootstrapResearch';
import {
  evaluateIuLuminateProviderIdentityCandidate,
  type IuLuminateProviderIdentityCandidate,
} from './iuLuminateProviderIdentityReviewResearch';
import {
  buildLuminateSnowflakeBreakoutEvidence,
  type LuminateSnowflakeExtractionPlan,
} from './luminateSnowflakeAlbumExtractionResearch';

export const IU_LUMINATE_LICENSED_BOOTSTRAP_COMMAND_RESEARCH_VERSION =
  'iu-luminate-licensed-bootstrap-command-research-v1' as const;

export const IU_LUMINATE_LICENSED_BOOTSTRAP_COMMAND_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: IU_LUMINATE_LICENSED_BOOTSTRAP_COMMAND_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  inputMode: 'local-json-file' as const,
  networkCalls: 0 as const,
  databaseReads: 0 as const,
  databaseWrites: 0 as const,
  credentialsAccepted: false as const,
  secretsAccepted: false as const,
  preResolvedIdentityStateAccepted: false as const,
  precomputedBreakoutDigestAccepted: false as const,
  productionActivationPerformed: false as const,
  productPublicationPerformed: false as const,
});

export type IuLuminateLicensedBootstrapCommandInput = Readonly<{
  grant: LuminateFandexAuthorizationGrant;
  territory: 'US' | 'CA';
  access: LuminateDataShareAccessEvidence;
  breakouts: Readonly<{
    metricCategoryProductSales: string;
    distributionChannelPhysical: string;
    purchaseMethodOnline: string;
    purchaseMethodStorefront: string;
    physicalProductFormats: readonly string[];
  }>;
  currentIdentityCandidate: IuLuminateProviderIdentityCandidate;
  baselineIdentityCandidate: IuLuminateProviderIdentityCandidate;
}>;

export type IuLuminateLicensedBootstrapCommandSummary = Readonly<{
  mode: 'licensed-bootstrap-review';
  contractVersion: typeof IU_LUMINATE_LICENSED_BOOTSTRAP_COMMAND_RESEARCH_VERSION;
  status: 'ready-for-licensed-extraction-review' | 'blocked';
  territory: 'US' | 'CA';
  manifestDigest: string;
  blockers: readonly string[];
  currentExtractionPlan: LuminateSnowflakeExtractionPlan | null;
  baselineExtractionPlan: LuminateSnowflakeExtractionPlan | null;
}>;

export type IuLuminateLicensedBootstrapCommandDependencies = Readonly<{
  readFileText?: (path: string) => Promise<string>;
}>;

const FORBIDDEN_INPUT_KEYS = new Set([
  'password',
  'passphrase',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'api_key',
  'secret',
  'clientsecret',
  'privatekey',
  'private_key',
  'connectionstring',
  'connection_string',
  'databaseurl',
  'database_url',
]);

function defaultReadFileText(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

export function parseIuLuminateLicensedBootstrapArgs(
  argv: readonly string[],
): Readonly<{ inputPath: string }> {
  if (argv.length !== 2 || argv[0] !== '--input' || !argv[1] || argv[1].startsWith('--')) {
    throw new Error('iu_luminate_bootstrap_command_argument_invalid');
  }
  return Object.freeze({ inputPath: argv[1] });
}

function assertNoCredentialKeys(value: unknown, path = 'root'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoCredentialKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.replace(/[-\s]/g, '').toLowerCase();
    if (FORBIDDEN_INPUT_KEYS.has(normalized)) {
      throw new Error('iu_luminate_bootstrap_command_credential_field_forbidden');
    }
    assertNoCredentialKeys(child, `${path}.${key}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseInputFile(text: string): IuLuminateLicensedBootstrapCommandInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('iu_luminate_bootstrap_command_input_invalid');
  }

  assertNoCredentialKeys(parsed);
  if (!isRecord(parsed)) throw new Error('iu_luminate_bootstrap_command_input_invalid');

  const candidate = parsed as Partial<IuLuminateLicensedBootstrapCommandInput>;
  if (!candidate.grant
      || (candidate.territory !== 'US' && candidate.territory !== 'CA')
      || !candidate.access
      || !candidate.breakouts
      || !candidate.currentIdentityCandidate
      || !candidate.baselineIdentityCandidate) {
    throw new Error('iu_luminate_bootstrap_command_input_invalid');
  }

  if (candidate.access.surface !== 'snowflake-data-share') {
    throw new Error('iu_luminate_bootstrap_command_data_share_surface_required');
  }
  if (!Array.isArray(candidate.access.availableViews)) {
    throw new Error('iu_luminate_bootstrap_command_input_invalid');
  }
  if (!Array.isArray(candidate.breakouts.physicalProductFormats)) {
    throw new Error('iu_luminate_bootstrap_command_input_invalid');
  }

  return candidate as IuLuminateLicensedBootstrapCommandInput;
}

export async function runIuLuminateLicensedBootstrapReview(
  argv: readonly string[],
  dependencies: IuLuminateLicensedBootstrapCommandDependencies = {},
): Promise<IuLuminateLicensedBootstrapCommandSummary> {
  const { inputPath } = parseIuLuminateLicensedBootstrapArgs(argv);
  const text = await (dependencies.readFileText ?? defaultReadFileText)(inputPath);
  const input = parseInputFile(text);

  const breakouts = buildLuminateSnowflakeBreakoutEvidence(input.breakouts);
  const currentIdentity = evaluateIuLuminateProviderIdentityCandidate(input.currentIdentityCandidate);
  const baselineIdentity = evaluateIuLuminateProviderIdentityCandidate(input.baselineIdentityCandidate);

  const manifest = buildIuLuminateLicensedBootstrapManifest({
    grant: input.grant,
    territory: input.territory,
    access: input.access,
    breakouts,
    currentIdentity,
    baselineIdentity,
  });
  const assessment = assessIuLuminateLicensedBootstrap(manifest);

  return Object.freeze({
    mode: 'licensed-bootstrap-review' as const,
    contractVersion: IU_LUMINATE_LICENSED_BOOTSTRAP_COMMAND_RESEARCH_VERSION,
    status: assessment.state,
    territory: assessment.territory,
    manifestDigest: assessment.manifestDigest,
    blockers: assessment.blockers,
    currentExtractionPlan: assessment.currentExtractionPlan,
    baselineExtractionPlan: assessment.baselineExtractionPlan,
  });
}
