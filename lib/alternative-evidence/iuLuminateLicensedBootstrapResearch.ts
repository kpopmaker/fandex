import { sha256Canonical } from '../shared/canonicalDigest';
import {
  evaluateLuminateFandexAuthorizationGrant,
  type LuminateAuthorizationAssessment,
  type LuminateFandexAuthorizationGrant,
} from './luminateAlbumAuthorizationResearch';
import {
  buildLuminateSnowflakeFirstWeekExtractionPlan,
  validateLuminateSnowflakeBreakouts,
  type LuminateSnowflakeExtractionPlan,
  type LuminateSnowflakeResolvedBreakouts,
} from './luminateSnowflakeAlbumExtractionResearch';
import {
  validateIuLuminateProviderIdentityPair,
  type IuLuminateProviderIdentityResolution,
} from './iuLuminateProviderIdentityReviewResearch';
import { IU_PIECES_RELEASE_ID } from './iuPiecesResearchEvidence';
import { IU_THE_WINNING_RELEASE_ID } from './iuTheWinningResearchEvidence';

export const IU_LUMINATE_LICENSED_BOOTSTRAP_RESEARCH_VERSION =
  'iu-luminate-licensed-bootstrap-research-v1' as const;

export const IU_LUMINATE_LICENSED_BOOTSTRAP_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: IU_LUMINATE_LICENSED_BOOTSTRAP_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  providerId: 'luminate-music' as const,
  requiredAccessSurface: 'snowflake-data-share' as const,
  genericApiOrDataShareGrantAloneSufficient: false as const,
  surfaceSpecificAccessEvidenceRequired: true as const,
  purchasedShareObjectInventoryEvidenceRequired: true as const,
  credentialsStoredInManifest: false as const,
  secretsStoredInManifest: false as const,
  liveProviderCallPerformed: false as const,
  databaseWritePerformed: false as const,
  extractionExecutionPerformed: false as const,
  currentReleaseId: IU_THE_WINNING_RELEASE_ID,
  firstBaselineReleaseId: IU_PIECES_RELEASE_ID,
});

export type LuminateDataShareAccessEvidence = Readonly<{
  surface: 'snowflake-data-share';
  evidenceId: string;
  shareObjectInventoryEvidenceId: string;
  availableViews: readonly string[];
}>;

export type IuLuminateLicensedBootstrapManifest = Readonly<{
  contractVersion: typeof IU_LUMINATE_LICENSED_BOOTSTRAP_RESEARCH_VERSION;
  grant: LuminateFandexAuthorizationGrant;
  territory: 'US' | 'CA';
  access: LuminateDataShareAccessEvidence;
  breakouts: LuminateSnowflakeResolvedBreakouts;
  currentIdentity: IuLuminateProviderIdentityResolution;
  baselineIdentity: IuLuminateProviderIdentityResolution;
}>;

export type IuLuminateLicensedBootstrapAssessment = Readonly<{
  state: 'ready-for-licensed-extraction-review' | 'blocked';
  authorizationState: LuminateAuthorizationAssessment['state'];
  territory: 'US' | 'CA';
  manifestDigest: string;
  blockers: readonly string[];
  currentExtractionPlan: LuminateSnowflakeExtractionPlan | null;
  baselineExtractionPlan: LuminateSnowflakeExtractionPlan | null;
}>;

const REQUIRED_DATA_SHARE_VIEWS = Object.freeze([
  'VW_DAILY_FACT_MRELG_DETAIL_DS',
  'VW_MUSICAL_RELEASE_GROUP_DS',
  'VW_FACT_VALUES_DS',
] as const);

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function buildIuLuminateLicensedBootstrapManifest(input: Omit<
  IuLuminateLicensedBootstrapManifest,
  'contractVersion'
>): IuLuminateLicensedBootstrapManifest {
  return Object.freeze({
    contractVersion: IU_LUMINATE_LICENSED_BOOTSTRAP_RESEARCH_VERSION,
    ...input,
  });
}

export function assessIuLuminateLicensedBootstrap(
  manifest: IuLuminateLicensedBootstrapManifest,
): IuLuminateLicensedBootstrapAssessment {
  const blockers: string[] = [];
  const authorization = evaluateLuminateFandexAuthorizationGrant(manifest.grant);

  if (manifest.contractVersion !== IU_LUMINATE_LICENSED_BOOTSTRAP_RESEARCH_VERSION) {
    blockers.push('iu-luminate-bootstrap-contract-version-invalid');
  }
  if (authorization.state !== 'eligible-for-provider-onboarding-review' || !authorization.rightsResolved) {
    blockers.push('iu-luminate-bootstrap-authorization-unresolved');
    blockers.push(...authorization.blockers);
  }
  if (!authorization.authorizedTerritories.includes(manifest.territory)) {
    blockers.push('iu-luminate-bootstrap-territory-not-authorized');
  }

  if (manifest.access.surface !== 'snowflake-data-share') {
    blockers.push('iu-luminate-bootstrap-snowflake-data-share-required');
  }
  if (!nonEmpty(manifest.access.evidenceId)) {
    blockers.push('iu-luminate-bootstrap-data-share-access-evidence-missing');
  }
  if (!nonEmpty(manifest.access.shareObjectInventoryEvidenceId)) {
    blockers.push('iu-luminate-bootstrap-share-object-inventory-evidence-missing');
  }
  for (const view of REQUIRED_DATA_SHARE_VIEWS) {
    if (!manifest.access.availableViews.includes(view)) {
      blockers.push(`iu-luminate-bootstrap-required-view-missing:${view}`);
    }
  }

  blockers.push(...validateLuminateSnowflakeBreakouts(manifest.breakouts));
  blockers.push(...validateIuLuminateProviderIdentityPair(
    manifest.currentIdentity,
    manifest.baselineIdentity,
  ));

  if (manifest.currentIdentity.fandexReleaseId !== IU_THE_WINNING_RELEASE_ID) {
    blockers.push('iu-luminate-bootstrap-current-release-unexpected');
  }
  if (manifest.baselineIdentity.fandexReleaseId !== IU_PIECES_RELEASE_ID) {
    blockers.push('iu-luminate-bootstrap-baseline-release-unexpected');
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const manifestDigest = sha256Canonical({
    contractVersion: manifest.contractVersion,
    agreementEvidenceId: manifest.grant.agreementEvidenceId,
    postTerminationPolicyEvidenceId: manifest.grant.postTerminationPolicyEvidenceId,
    licenseActive: manifest.grant.licenseActive,
    authorizedTerritories: [...manifest.grant.authorizedTerritories].sort(),
    publicOutputMode: manifest.grant.publicOutputMode,
    territory: manifest.territory,
    access: {
      surface: manifest.access.surface,
      evidenceId: manifest.access.evidenceId,
      shareObjectInventoryEvidenceId: manifest.access.shareObjectInventoryEvidenceId,
      availableViews: [...manifest.access.availableViews].sort(),
    },
    breakoutsDigest: manifest.breakouts.evidenceDigest,
    current: {
      releaseId: manifest.currentIdentity.fandexReleaseId,
      mrelgId: manifest.currentIdentity.mrelgId,
      state: manifest.currentIdentity.state,
    },
    baseline: {
      releaseId: manifest.baselineIdentity.fandexReleaseId,
      mrelgId: manifest.baselineIdentity.mrelgId,
      state: manifest.baselineIdentity.state,
    },
  });

  if (uniqueBlockers.length > 0
      || !manifest.currentIdentity.mrelgId
      || !manifest.baselineIdentity.mrelgId) {
    return Object.freeze({
      state: 'blocked' as const,
      authorizationState: authorization.state,
      territory: manifest.territory,
      manifestDigest,
      blockers: uniqueBlockers,
      currentExtractionPlan: null,
      baselineExtractionPlan: null,
    });
  }

  const currentExtractionPlan = buildLuminateSnowflakeFirstWeekExtractionPlan({
    mrelgId: manifest.currentIdentity.mrelgId,
    territory: manifest.territory,
    releaseDate: '2024-02-20',
    breakouts: manifest.breakouts,
  });
  const baselineExtractionPlan = buildLuminateSnowflakeFirstWeekExtractionPlan({
    mrelgId: manifest.baselineIdentity.mrelgId,
    territory: manifest.territory,
    releaseDate: '2021-12-29',
    breakouts: manifest.breakouts,
  });

  if (currentExtractionPlan.state !== 'ready-after-license-and-provider-id-resolution') {
    blockers.push(...currentExtractionPlan.blockers);
  }
  if (baselineExtractionPlan.state !== 'ready-after-license-and-provider-id-resolution') {
    blockers.push(...baselineExtractionPlan.blockers);
  }
  const finalBlockers = Object.freeze([...new Set(blockers)]);
  if (finalBlockers.length > 0) {
    return Object.freeze({
      state: 'blocked' as const,
      authorizationState: authorization.state,
      territory: manifest.territory,
      manifestDigest,
      blockers: finalBlockers,
      currentExtractionPlan: null,
      baselineExtractionPlan: null,
    });
  }

  return Object.freeze({
    state: 'ready-for-licensed-extraction-review' as const,
    authorizationState: authorization.state,
    territory: manifest.territory,
    manifestDigest,
    blockers: Object.freeze([]),
    currentExtractionPlan,
    baselineExtractionPlan,
  });
}
