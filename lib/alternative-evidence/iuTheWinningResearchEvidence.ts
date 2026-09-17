import { sha256Canonical } from '../shared/canonicalDigest';
import {
  ALBUM_IDENTITY_EVIDENCE_RECORD_VERSION,
  type AlbumIdentityEvidenceCaptureContext,
  type AlbumIdentityEvidencePersistencePayload,
  type AlbumIdentityEvidencePersistenceRecord,
} from './albumIdentityEvidencePersistenceResearch';
import type {
  IuCanonicalReleaseReferenceCatalogEntry,
  IuReleaseReferenceEvidence,
} from './iuCanonicalReleaseReferenceCatalogResearch';
import type { FandexReleaseIdentity } from './identityFoundation';
import type {
  FandexReleaseIdentityResearchReference,
  MusicReleaseProviderMappingReference,
} from './musicReleaseIdentityMappingResearch';
import { envelopeRecord } from './persistenceContracts';

export const IU_THE_WINNING_RESEARCH_EVIDENCE_CONTRACT_VERSION =
  'iu-the-winning-research-evidence-v1' as const;

export const IU_THE_WINNING_RELEASE_ID =
  'research:iu:release:the-winning:2024-02-20' as const;
export const IU_THE_WINNING_RELEASE_FAMILY_ID =
  'research:iu:release-family:the-winning' as const;
export const IU_THE_WINNING_MUSICBRAINZ_RELEASE_GROUP_ID =
  '066225ff-a8bd-4183-bff5-08329f0a063a' as const;

export const IU_THE_WINNING_RESEARCH_EVIDENCE_DESCRIPTOR = Object.freeze({
  contractVersion: IU_THE_WINNING_RESEARCH_EVIDENCE_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  canonicalArtistId: 'iu' as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productMethodologyFrozen: false as const,
  productionEligible: false as const,
  reportedWeeklySalesDirectProviderObservation: false as const,
  reportedWeeklySalesContextOnly: true as const,
  hanteoApiAuthorizationResolved: false as const,
  semantics: 'evidence-backed-release-identity-and-reported-weekly-physical-sales-context' as const,
});

export const IU_THE_WINNING_MUSICBRAINZ_EVIDENCE: IuReleaseReferenceEvidence = Object.freeze({
  evidenceId: `web:musicbrainz:release-group:${IU_THE_WINNING_MUSICBRAINZ_RELEASE_GROUP_ID}`,
  providerId: 'musicbrainz',
  sourceKind: 'catalog-provider-release-group',
  sourceUrl: `https://musicbrainz.org/release-group/${IU_THE_WINNING_MUSICBRAINZ_RELEASE_GROUP_ID}`,
  providerEntityId: IU_THE_WINNING_MUSICBRAINZ_RELEASE_GROUP_ID,
  observedArtist: 'IU',
  observedTitle: 'The Winning',
  observedReleaseType: 'EP',
  providerFirstReleaseDate: '2024-02-20',
  retailProductReleaseDate: null,
  territory: null,
  barcode: null,
  researchOnly: true,
});

const release: FandexReleaseIdentity = Object.freeze({
  fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
  fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
  canonicalTitle: 'The Winning',
  artistIds: Object.freeze(['iu']),
  releaseDate: '2024-02-20',
  releaseType: 'mini-album',
  label: null,
  territory: null,
  formatFamily: 'unknown',
  reviewState: 'human-reviewed',
  resolutionState: 'resolved',
});

const providerMapping: MusicReleaseProviderMappingReference = Object.freeze({
  providerId: 'musicbrainz',
  providerReleaseGroupId: IU_THE_WINNING_MUSICBRAINZ_RELEASE_GROUP_ID,
  evidenceRefs: Object.freeze([IU_THE_WINNING_MUSICBRAINZ_EVIDENCE.evidenceId]),
});

export const IU_THE_WINNING_RELEASE_REFERENCE_RESEARCH: FandexReleaseIdentityResearchReference = Object.freeze({
  release,
  aliases: Object.freeze(['The Winning', '아이유 미니 6집 The Winning']),
  providerMappings: Object.freeze([providerMapping]),
  evidenceRefs: Object.freeze([IU_THE_WINNING_MUSICBRAINZ_EVIDENCE.evidenceId]),
});

export const IU_THE_WINNING_CANONICAL_REFERENCE_ENTRY_RESEARCH: IuCanonicalReleaseReferenceCatalogEntry = Object.freeze({
  reference: IU_THE_WINNING_RELEASE_REFERENCE_RESEARCH,
  evidenceRefs: IU_THE_WINNING_RELEASE_REFERENCE_RESEARCH.evidenceRefs,
  releaseFamilyEvidenceRefs: IU_THE_WINNING_RELEASE_REFERENCE_RESEARCH.evidenceRefs,
  notes: Object.freeze([
    'musicbrainz-ep-normalized-to-fandex-mini-album',
    'label-territory-and-physical-format-intentionally-unresolved',
  ]),
});

export type IuTheWinningReportedWeeklySalesResearch = Readonly<{
  contractVersion: typeof IU_THE_WINNING_RESEARCH_EVIDENCE_CONTRACT_VERSION;
  lifecycle: 'research';
  canonicalArtistId: 'iu';
  fandexReleaseId: typeof IU_THE_WINNING_RELEASE_ID;
  fandexReleaseFamilyId: typeof IU_THE_WINNING_RELEASE_FAMILY_ID;
  reportedProvider: 'hanteo-chart';
  acquisitionOrigin: 'news-reported-provider-value';
  sourceArticleUrl: string;
  providerChartUrl: string;
  chartPeriod: '2024-02-19/2024-02-25';
  chartPeriodTimezone: 'KST';
  chartRank: 3;
  reportedSalesValue: 206128;
  reportedSalesUnit: 'physical-units';
  semantic: 'reported-provider-weekly-physical-album-sales';
  directProviderObservation: false;
  initialChodongClaimAllowed: false;
  cumulativeSalesClaimAllowed: false;
  directProductContributionEligible: false;
  productionEligible: false;
  limitations: readonly string[];
  evidenceDigest: string;
}>;

const reportedWeeklySalesBase = Object.freeze({
  contractVersion: IU_THE_WINNING_RESEARCH_EVIDENCE_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  canonicalArtistId: 'iu' as const,
  fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
  fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
  reportedProvider: 'hanteo-chart' as const,
  acquisitionOrigin: 'news-reported-provider-value' as const,
  sourceArticleUrl: 'https://mb.com.ph/2024/2/26/le-sserafim-twice-iu-top-album-chart-for-4th-week-of-february-in-korea',
  providerChartUrl: 'https://www.hanteochart.com/en/charts/album/weekly/2024-W08',
  chartPeriod: '2024-02-19/2024-02-25' as const,
  chartPeriodTimezone: 'KST' as const,
  chartRank: 3 as const,
  reportedSalesValue: 206128 as const,
  reportedSalesUnit: 'physical-units' as const,
  semantic: 'reported-provider-weekly-physical-album-sales' as const,
  directProviderObservation: false as const,
  initialChodongClaimAllowed: false as const,
  cumulativeSalesClaimAllowed: false as const,
  directProductContributionEligible: false as const,
  productionEligible: false as const,
  limitations: Object.freeze([
    'sales-value-acquired-from-third-party-reporting-not-authorized-hanteo-api',
    'official-hanteo-page-corroborates-chart-period-rank-and-physical-chart-semantics-not-the-reported-value-in-this-record',
    'calendar-week-sales-not-equivalent-to-initial-chodong-seven-day-sales',
    'not-cumulative-sales',
    'hanteo-api-storage-and-publication-rights-unresolved',
  ]),
});

export const IU_THE_WINNING_REPORTED_WEEKLY_SALES_RESEARCH: IuTheWinningReportedWeeklySalesResearch = Object.freeze({
  ...reportedWeeklySalesBase,
  evidenceDigest: sha256Canonical(reportedWeeklySalesBase),
});

const digestId = (kind: string, value: string) => sha256Canonical({ kind, value });

function wrapIdentityPayload(
  payload: AlbumIdentityEvidencePersistencePayload,
  context: AlbumIdentityEvidenceCaptureContext,
  effectivePeriod: string,
): AlbumIdentityEvidencePersistenceRecord {
  return envelopeRecord({
    recordType: payload.recordType,
    recordVersion: ALBUM_IDENTITY_EVIDENCE_RECORD_VERSION,
    persistenceScope: 'research',
    payload,
    sourceEntityId: digestId(`${payload.provider}:entity`, payload.providerEntityId),
    sourceRecordId: digestId(`${payload.recordType}:source`, `${payload.provider}:${payload.providerEntityId}`),
    createdFromRecordIds: [],
    contributionIdentityId: null,
    knowledgeMode: 'current-research',
    effectivePeriod,
    observedAt: context.observedAt,
    collectedAt: context.collectedAt,
    revisionObservedAt: null,
    methodologyVersion: null,
    syntheticOnly: false,
    authorizationSnapshot: context.authorizationSnapshot,
    supersedesRecordId: null,
    recordState: 'original',
  });
}

export function buildIuTheWinningIdentityPersistenceRecords(
  context: AlbumIdentityEvidenceCaptureContext,
): readonly AlbumIdentityEvidencePersistenceRecord[] {
  if (!context.observedAt || Number.isNaN(Date.parse(context.observedAt))) {
    throw new Error('iu_the_winning_identity_observed_at_invalid');
  }
  if (!context.collectedAt || Number.isNaN(Date.parse(context.collectedAt))) {
    throw new Error('iu_the_winning_identity_collected_at_invalid');
  }
  if (Date.parse(context.collectedAt) < Date.parse(context.observedAt)) {
    throw new Error('iu_the_winning_identity_collection_before_observation');
  }

  const evidencePayload: AlbumIdentityEvidencePersistencePayload = Object.freeze({
    recordType: 'release-reference-evidence',
    canonicalArtistId: 'iu',
    provider: 'musicbrainz',
    providerEntityId: IU_THE_WINNING_MUSICBRAINZ_RELEASE_GROUP_ID,
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
    evidenceRefs: Object.freeze([IU_THE_WINNING_MUSICBRAINZ_EVIDENCE.evidenceId]),
    data: IU_THE_WINNING_MUSICBRAINZ_EVIDENCE,
  });
  const canonicalPayload: AlbumIdentityEvidencePersistencePayload = Object.freeze({
    recordType: 'canonical-release-reference',
    canonicalArtistId: 'iu',
    provider: 'fandex-research',
    providerEntityId: IU_THE_WINNING_RELEASE_ID,
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
    evidenceRefs: Object.freeze([IU_THE_WINNING_MUSICBRAINZ_EVIDENCE.evidenceId]),
    data: IU_THE_WINNING_CANONICAL_REFERENCE_ENTRY_RESEARCH,
  });

  return Object.freeze([
    wrapIdentityPayload(evidencePayload, context, '2024-02-20'),
    wrapIdentityPayload(canonicalPayload, context, '2024-02-20'),
  ]);
}
