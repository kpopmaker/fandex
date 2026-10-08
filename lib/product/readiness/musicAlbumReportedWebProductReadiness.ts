import {
  REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
  type ReportedAlbumSalesCurrentReleaseRead,
} from '../../alternative-evidence/reportedAlbumSalesCurrentRelease';

export const MUSIC_ALBUM_REPORTED_WEB_PRODUCT_READINESS_VERSION =
  'music-album-reported-web-product-readiness-v1' as const;

export type MusicAlbumReportedWebProductReadinessCheck =
  | 'reported-web-current-contract-valid'
  | 'current-physical-release-verified'
  | 'current-observation-available'
  | 'canonical-release-identity-resolved'
  | 'explicit-provider-period-present'
  | 'durable-evidence-bound'
  | 'reported-web-rights-reviewed'
  | 'conflict-clear'
  | 'revision-resolved'
  | 'numeric-score-not-invented'
  | 'final-product-methodology-approved'
  | 'product-activation-authorized'
  | 'public-publication-authorized';

export type MusicAlbumReportedWebProductReadiness = Readonly<{
  contractVersion:
    typeof MUSIC_ALBUM_REPORTED_WEB_PRODUCT_READINESS_VERSION;
  variableId: 'musicAlbumPoint';
  sourceTrack: 'reported-web-evidence';
  state:
    | 'source-ready-methodology-blocked'
    | 'source-blocked';
  checks: Readonly<
    Record<MusicAlbumReportedWebProductReadinessCheck, boolean>
  >;
  blockers: readonly MusicAlbumReportedWebProductReadinessCheck[];
  currentReleaseStatus: ReportedAlbumSalesCurrentReleaseRead['status'];
  sourceMaterialClass: 'real';
  lifecycle: 'production-candidate';
  productValue: null;
  numericProductEligible: false;
  methodologyLocked: false;
  productActivationAuthorized: false;
  publicPublicationAuthorized: false;
  directProviderAuthorizationRequiredForThisTrack: false;
  licensedProviderRequiredForThisTrack: false;
}>;

function checks(
  current: ReportedAlbumSalesCurrentReleaseRead,
): Record<MusicAlbumReportedWebProductReadinessCheck, boolean> {
  const available = current.status === 'available';

  return {
    'reported-web-current-contract-valid':
      current.contractVersion
        === REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
    'current-physical-release-verified': available,
    'current-observation-available': available,
    'canonical-release-identity-resolved':
      available
      || current.status === 'pending',
    'explicit-provider-period-present':
      available
      && current.providerPeriodStart.trim() !== ''
      && current.providerPeriodEnd.trim() !== '',
    'durable-evidence-bound':
      available
      && current.evidenceDigest.trim() !== ''
      && current.sourceCandidateDigest.trim() !== ''
      && current.observationId.trim() !== '',
    'reported-web-rights-reviewed':
      available,
    'conflict-clear':
      available && current.conflictState === 'clear',
    'revision-resolved':
      available
      && (
        current.revisionState === 'original'
        || current.revisionState === 'explicit-correction'
      ),
    'numeric-score-not-invented':
      !available || current.numericScoreDefined === false,
    'final-product-methodology-approved': false,
    'product-activation-authorized': false,
    'public-publication-authorized': false,
  };
}

export function evaluateMusicAlbumReportedWebProductReadiness(
  current: ReportedAlbumSalesCurrentReleaseRead,
): MusicAlbumReportedWebProductReadiness {
  const evaluated = checks(current);
  const blockers = Object.entries(evaluated)
    .filter(([, passed]) => !passed)
    .map(
      ([check]) =>
        check as MusicAlbumReportedWebProductReadinessCheck,
    );

  const sourceBlockingChecks =
    new Set<MusicAlbumReportedWebProductReadinessCheck>([
      'reported-web-current-contract-valid',
      'current-physical-release-verified',
      'current-observation-available',
      'canonical-release-identity-resolved',
      'explicit-provider-period-present',
      'durable-evidence-bound',
      'reported-web-rights-reviewed',
      'conflict-clear',
      'revision-resolved',
      'numeric-score-not-invented',
    ]);

  const sourceBlocked = blockers.some(
    blocker => sourceBlockingChecks.has(blocker),
  );

  return Object.freeze({
    contractVersion:
      MUSIC_ALBUM_REPORTED_WEB_PRODUCT_READINESS_VERSION,
    variableId: 'musicAlbumPoint' as const,
    sourceTrack: 'reported-web-evidence' as const,
    state: sourceBlocked
      ? 'source-blocked' as const
      : 'source-ready-methodology-blocked' as const,
    checks: Object.freeze(evaluated),
    blockers: Object.freeze(blockers.sort()),
    currentReleaseStatus: current.status,
    sourceMaterialClass: 'real' as const,
    lifecycle: 'production-candidate' as const,
    productValue: null,
    numericProductEligible: false as const,
    methodologyLocked: false as const,
    productActivationAuthorized: false as const,
    publicPublicationAuthorized: false as const,
    directProviderAuthorizationRequiredForThisTrack: false as const,
    licensedProviderRequiredForThisTrack: false as const,
  });
}
