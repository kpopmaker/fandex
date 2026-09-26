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
import { sha256Canonical } from '../shared/canonicalDigest';

export const IU_PIECES_RESEARCH_EVIDENCE_CONTRACT_VERSION =
  'iu-pieces-research-evidence-v1' as const;

export const IU_PIECES_RELEASE_ID =
  'research:iu:release:pieces:2021-12-29' as const;
export const IU_PIECES_RELEASE_FAMILY_ID =
  'research:iu:release-family:pieces' as const;
export const IU_PIECES_MUSICBRAINZ_RELEASE_GROUP_ID =
  'cd6cb8a6-1e27-45ac-a0af-6bed5f2e56c5' as const;

export const IU_PIECES_RESEARCH_EVIDENCE_DESCRIPTOR = Object.freeze({
  contractVersion: IU_PIECES_RESEARCH_EVIDENCE_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  canonicalArtistId: 'iu' as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productionEligible: false as const,
  musicAlbumPointReleaseEligibilityCandidate: true as const,
  baselineSelectionWithoutComparableObservationAllowed: false as const,
  semantics: 'evidence-backed-iu-pieces-release-identity' as const,
});

export const IU_PIECES_MUSICBRAINZ_EVIDENCE: IuReleaseReferenceEvidence = Object.freeze({
  evidenceId: `web:musicbrainz:release-group:${IU_PIECES_MUSICBRAINZ_RELEASE_GROUP_ID}`,
  providerId: 'musicbrainz',
  sourceKind: 'catalog-provider-release-group',
  sourceUrl: `https://musicbrainz.org/release-group/${IU_PIECES_MUSICBRAINZ_RELEASE_GROUP_ID}`,
  providerEntityId: IU_PIECES_MUSICBRAINZ_RELEASE_GROUP_ID,
  observedArtist: 'IU',
  observedTitle: '조각집',
  observedReleaseType: 'EP',
  providerFirstReleaseDate: '2021-12-29',
  retailProductReleaseDate: null,
  territory: 'XW',
  barcode: '8804775236938',
  researchOnly: true,
});

const release: FandexReleaseIdentity = Object.freeze({
  fandexReleaseId: IU_PIECES_RELEASE_ID,
  fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
  canonicalTitle: 'Pieces',
  artistIds: Object.freeze(['iu']),
  releaseDate: '2021-12-29',
  releaseType: 'mini-album',
  label: 'EDAM Entertainment',
  territory: null,
  formatFamily: 'unknown',
  reviewState: 'provider-verified',
  resolutionState: 'resolved',
});

const providerMapping: MusicReleaseProviderMappingReference = Object.freeze({
  providerId: 'musicbrainz',
  providerReleaseGroupId: IU_PIECES_MUSICBRAINZ_RELEASE_GROUP_ID,
  evidenceRefs: Object.freeze([IU_PIECES_MUSICBRAINZ_EVIDENCE.evidenceId]),
});

export const IU_PIECES_RELEASE_REFERENCE_RESEARCH: FandexReleaseIdentityResearchReference = Object.freeze({
  release,
  aliases: Object.freeze(['Pieces', '조각집', 'IU Pieces']),
  providerMappings: Object.freeze([providerMapping]),
  evidenceRefs: Object.freeze([IU_PIECES_MUSICBRAINZ_EVIDENCE.evidenceId]),
});

export const IU_PIECES_CANONICAL_REFERENCE_ENTRY_RESEARCH: IuCanonicalReleaseReferenceCatalogEntry = Object.freeze({
  reference: IU_PIECES_RELEASE_REFERENCE_RESEARCH,
  evidenceRefs: IU_PIECES_RELEASE_REFERENCE_RESEARCH.evidenceRefs,
  releaseFamilyEvidenceRefs: IU_PIECES_RELEASE_REFERENCE_RESEARCH.evidenceRefs,
  notes: Object.freeze([
    'musicbrainz-ep-normalized-to-fandex-mini-album',
    'baseline-candidate-status-does-not-prove-luminate-physical-comparability',
  ]),
});

const digestId = (kind: string, value: string) => sha256Canonical({ kind, value });

function wrapIdentityPayload(
  payload: AlbumIdentityEvidencePersistencePayload,
  context: AlbumIdentityEvidenceCaptureContext,
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
    effectivePeriod: '2021-12-29',
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

export function buildIuPiecesIdentityPersistenceRecords(
  context: AlbumIdentityEvidenceCaptureContext,
): readonly AlbumIdentityEvidencePersistenceRecord[] {
  if (!context.observedAt || Number.isNaN(Date.parse(context.observedAt))) {
    throw new Error('iu_pieces_identity_observed_at_invalid');
  }
  if (!context.collectedAt || Number.isNaN(Date.parse(context.collectedAt))) {
    throw new Error('iu_pieces_identity_collected_at_invalid');
  }
  if (Date.parse(context.collectedAt) < Date.parse(context.observedAt)) {
    throw new Error('iu_pieces_identity_collection_before_observation');
  }

  const evidencePayload: AlbumIdentityEvidencePersistencePayload = Object.freeze({
    recordType: 'release-reference-evidence',
    canonicalArtistId: 'iu',
    provider: 'musicbrainz',
    providerEntityId: IU_PIECES_MUSICBRAINZ_RELEASE_GROUP_ID,
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
    evidenceRefs: Object.freeze([IU_PIECES_MUSICBRAINZ_EVIDENCE.evidenceId]),
    data: IU_PIECES_MUSICBRAINZ_EVIDENCE,
  });
  const canonicalPayload: AlbumIdentityEvidencePersistencePayload = Object.freeze({
    recordType: 'canonical-release-reference',
    canonicalArtistId: 'iu',
    provider: 'fandex-research',
    providerEntityId: IU_PIECES_RELEASE_ID,
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
    evidenceRefs: Object.freeze([IU_PIECES_MUSICBRAINZ_EVIDENCE.evidenceId]),
    data: IU_PIECES_CANONICAL_REFERENCE_ENTRY_RESEARCH,
  });

  return Object.freeze([
    wrapIdentityPayload(evidencePayload, context),
    wrapIdentityPayload(canonicalPayload, context),
  ]);
}
