import { canonicalJson, sha256Canonical } from '../../shared/canonicalDigest';

export const ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_GATE_VERSION =
  'album-bounded-production-research-write-gate-v1' as const;

export const ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET = Object.freeze({
  projectId: 'wild-tree-38937656',
  projectName: 'fandex-managed-postgres',
  branchId: 'br-old-term-azv3tpra',
  branchName: 'main',
  databaseName: 'neondb',
  schemaName: 'fandex',
  tableName: 'album_research_observation_records',
});

export const ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_MIGRATION_SHA256 =
  '637b934b0e7cef4d823b0e8943d48d0a94b71ca113690f3800a97dc745fe4c97' as const;

export const ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT = Object.freeze({
  sourceValidationVersion: 'album-reviewed-identity-live-validation-v1',
  sourceWorkflowRunId: 33458837843,
  acquisitionProviderId: 'circle-retail',
  providerId: 'circle-chart',
  timeframe: 'day',
  providerPeriod: 'day:20260831',
  requestMode: 'historical-backfill',
  sourcePayloadDigest: 'd21ba4cb22b58ee014b1cdfc1f899f9860408b927c21ef387b0ba473de5f2236',
  reviewedSubsetResultDigest: 'f0258a5a4a7990877d4c613d8c1e6301a521eb3f0e0acf706ef0f78fa2ba957b',
  maxProviderRequests: 1,
  maxDatabaseWrites: 3,
  observations: Object.freeze([
    Object.freeze({
      observationId: '3f94e51454edbdff932cb9cbeba2697e141864dc7f99f46ce96e1a60b5de22dd',
      providerSkuId: '8809954226502',
      fandexArtistId: 'straykids',
      fandexReleaseId: 'straykids-this-and-that',
    }),
    Object.freeze({
      observationId: '5e907dc8f731b1d9895cf5f90ffb43acdc2282e0437aa4a8b55c60696eaebb95',
      providerSkuId: '8809704435567',
      fandexArtistId: 'enhypen',
      fandexReleaseId: 'enhypen-the-sin-bliss',
    }),
    Object.freeze({
      observationId: 'f18a8b5d1267b63bb7d4f020e18346d674365fe16f90ceb811448341abb771c9',
      providerSkuId: '8800370675042',
      fandexArtistId: 'katseye',
      fandexReleaseId: 'katseye-wild',
    }),
  ]),
});

export const ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_EXCLUSIONS = Object.freeze({
  hanteo: 'historical-exact-copy-reacquisition-unverified',
  rawBodyStorageAuthorized: false,
  publicationAuthorized: false,
  commercialUseAuthorized: false,
  rightsCleared: false,
});

export type AlbumBoundedProductionResearchWriteTargetSnapshot = Readonly<{
  projectId: string;
  branchId: string;
  branchName: string;
  databaseName: string;
  schemaName: string;
}>;

export type AlbumBoundedProductionResearchWritePreflight = Readonly<{
  target: AlbumBoundedProductionResearchWriteTargetSnapshot;
  migration3Sha256: string | null;
  albumResearchTablePresent: boolean;
  tableOwner: string | null;
  appendOnlyTriggerEnabled: boolean;
  runtimeSelect: boolean;
  runtimeInsert: boolean;
  runtimeUpdate: boolean;
  runtimeDelete: boolean;
  totalRowCount: number;
  selectedObservationIdsPresent: readonly string[];
  sourceWorkflowRunId: number;
  sourcePayloadDigest: string;
  reviewedSubsetResultDigest: string;
  selectedObservationIds: readonly string[];
}>;

export type AlbumBoundedProductionResearchWriteGateBlocker =
  | 'target-mismatch'
  | 'migration-3-digest-mismatch'
  | 'album-research-table-missing'
  | 'table-owner-mismatch'
  | 'append-only-trigger-missing'
  | 'runtime-privileges-invalid'
  | 'first-write-table-must-be-empty'
  | 'selected-observation-already-present'
  | 'source-workflow-run-mismatch'
  | 'source-payload-digest-mismatch'
  | 'reviewed-subset-result-digest-mismatch'
  | 'selected-observation-set-mismatch';

export type AlbumBoundedProductionResearchWriteGateResult = Readonly<{
  contractVersion: typeof ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_GATE_VERSION;
  target: typeof ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET;
  cohort: typeof ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT;
  exclusions: typeof ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_EXCLUSIONS;
  blockers: readonly AlbumBoundedProductionResearchWriteGateBlocker[];
  eligibleForExplicitApproval: boolean;
  executionAuthorized: false;
  productionResearchWriteAuthorized: false;
  productionPublicationAuthorized: false;
  commercialRightsCleared: false;
  gateDigest: string;
}>;

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function expectedObservationIds(): readonly string[] {
  return uniqueSorted(ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.observations.map(item => item.observationId));
}

function targetMatches(target: AlbumBoundedProductionResearchWriteTargetSnapshot): boolean {
  return target.projectId === ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET.projectId
    && target.branchId === ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET.branchId
    && target.branchName === ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET.branchName
    && target.databaseName === ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET.databaseName
    && target.schemaName === ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET.schemaName;
}

export function evaluateAlbumBoundedProductionResearchWriteGate(
  preflight: AlbumBoundedProductionResearchWritePreflight,
): AlbumBoundedProductionResearchWriteGateResult {
  const blockers: AlbumBoundedProductionResearchWriteGateBlocker[] = [];
  if (!targetMatches(preflight.target)) blockers.push('target-mismatch');
  if (preflight.migration3Sha256 !== ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_MIGRATION_SHA256) {
    blockers.push('migration-3-digest-mismatch');
  }
  if (!preflight.albumResearchTablePresent) blockers.push('album-research-table-missing');
  if (preflight.tableOwner !== 'fandex_migrator') blockers.push('table-owner-mismatch');
  if (!preflight.appendOnlyTriggerEnabled) blockers.push('append-only-trigger-missing');
  if (!preflight.runtimeSelect || !preflight.runtimeInsert || preflight.runtimeUpdate || preflight.runtimeDelete) {
    blockers.push('runtime-privileges-invalid');
  }
  if (!Number.isSafeInteger(preflight.totalRowCount) || preflight.totalRowCount !== 0) {
    blockers.push('first-write-table-must-be-empty');
  }
  if (preflight.selectedObservationIdsPresent.length > 0) blockers.push('selected-observation-already-present');
  if (preflight.sourceWorkflowRunId !== ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.sourceWorkflowRunId) {
    blockers.push('source-workflow-run-mismatch');
  }
  if (preflight.sourcePayloadDigest !== ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.sourcePayloadDigest) {
    blockers.push('source-payload-digest-mismatch');
  }
  if (preflight.reviewedSubsetResultDigest !== ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.reviewedSubsetResultDigest) {
    blockers.push('reviewed-subset-result-digest-mismatch');
  }
  if (canonicalJson(uniqueSorted(preflight.selectedObservationIds)) !== canonicalJson(expectedObservationIds())) {
    blockers.push('selected-observation-set-mismatch');
  }

  const stableBlockers = Object.freeze([...blockers].sort());
  const payload = Object.freeze({
    contractVersion: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_GATE_VERSION,
    target: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_TARGET,
    cohort: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT,
    exclusions: ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_EXCLUSIONS,
    blockers: stableBlockers,
    eligibleForExplicitApproval: stableBlockers.length === 0,
    executionAuthorized: false as const,
    productionResearchWriteAuthorized: false as const,
    productionPublicationAuthorized: false as const,
    commercialRightsCleared: false as const,
  });

  return Object.freeze({ ...payload, gateDigest: sha256Canonical(payload) });
}

export type AlbumBoundedProductionResearchWriteReacquisition = Readonly<{
  providerId: 'circle-chart';
  providerPeriod: 'day:20260831';
  sourcePayloadDigest: string;
  observationIds: readonly string[];
  nonIdentityRejectedRowCount: number;
}>;

export function validateAlbumBoundedProductionResearchWriteReacquisition(
  input: AlbumBoundedProductionResearchWriteReacquisition,
): Readonly<{ valid: boolean; issues: readonly string[] }> {
  const issues: string[] = [];
  if (input.providerId !== ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.providerId) issues.push('provider-mismatch');
  if (input.providerPeriod !== ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.providerPeriod) issues.push('period-mismatch');
  if (input.sourcePayloadDigest !== ALBUM_BOUNDED_PRODUCTION_RESEARCH_WRITE_COHORT.sourcePayloadDigest) issues.push('payload-digest-mismatch');
  if (canonicalJson(uniqueSorted(input.observationIds)) !== canonicalJson(expectedObservationIds())) issues.push('observation-set-mismatch');
  if (!Number.isSafeInteger(input.nonIdentityRejectedRowCount) || input.nonIdentityRejectedRowCount !== 0) {
    issues.push('provider-data-rejection-present');
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues.sort()) });
}
