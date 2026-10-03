import { sha256Canonical } from '../../shared/canonicalDigest';
import type {
  DirectAlbumProviderDescriptor,
} from '../../alternative-evidence/directAlbumProvider';
import type {
  AlbumNormalizationInput,
  AlbumNormalizationInputEntry,
} from '../contracts/albumNormalizationInput';
import {
  ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION,
  buildAlbumNormalizationCalibrationReviewTarget,
  type AlbumNormalizationCalibrationEvidenceRecord,
  type AlbumNormalizationCalibrationRecordConclusion,
} from './albumNormalizationCalibrationEvidenceReview';

export const ALBUM_RELEASE_SCOPE_REVIEW_PACKET_VERSION =
  'album-release-scope-review-packet-v1' as const;

export type AlbumReleaseScopeReviewPacketState =
  | 'reviewable'
  | 'insufficient-evidence'
  | 'conflicting-evidence';

export type AlbumReleaseScopeReviewGroup = Readonly<{
  releaseKey: string;
  artistId: string;
  releaseId: string | null;
  releaseFamilyId: string | null;
  primaryObservationIds: readonly string[];
  scopeKinds: readonly string[];
  skuIds: readonly string[];
  providerReleaseIds: readonly string[];
  providerEditionIds: readonly string[];
  providerPeriods: readonly string[];
  excludedDetailObservationIds: readonly string[];
  supersededObservationIds: readonly string[];
  duplicateObservationIds: readonly string[];
}>;

export type AlbumReleaseScopeProviderFact = Readonly<{
  providerId: string;
  role: 'primary' | 'secondary' | 'other';
  nativePeriodSalesQualified: boolean;
  historicalQueriesQualified: boolean;
  revisionsQualified: boolean;
  artistIdentityQualified: boolean;
  releaseIdentityQualified: boolean;
  editionIdentityQualified: boolean;
  skuIdentityQualified: boolean;
}>;

export type AlbumReleaseScopeReviewPacket = Readonly<{
  contractVersion: typeof ALBUM_RELEASE_SCOPE_REVIEW_PACKET_VERSION;
  packetId: string;
  targetFingerprint: string;
  state: AlbumReleaseScopeReviewPacketState;
  primaryObservationIds: readonly string[];
  releaseGroups: readonly AlbumReleaseScopeReviewGroup[];
  providerFacts: readonly AlbumReleaseScopeProviderFact[];
  unresolvedPrimaryObservationIds: readonly string[];
  blockedObservationIds: readonly string[];
  excludedDetailObservationIds: readonly string[];
  supersededObservationIds: readonly string[];
  duplicateObservationIds: readonly string[];
  reasonCodes: readonly string[];
  reviewQuestions: readonly [
    'does-provider-scope-cover-the-intended-release-universe',
    'are-all-relevant-skus-or-editions-accounted-for',
    'are-excluded-child-scopes-non-additive-details',
    'does-any-provider-target-remain-release-vs-edition-ambiguous'
  ];
  reviewerConclusionRequired: true;
  autoVerified: false;
  completenessDetermined: false;
  numericNormalizationDefined: false;
  scoreFieldsPresent: false;
}>;

export type AlbumReleaseScopeReviewDecision = Readonly<{
  packetId: string;
  evidenceId: string;
  conclusion: AlbumNormalizationCalibrationRecordConclusion;
  supportingEvidenceRefs: readonly string[];
  reviewerRef: string;
  reviewedAt: string;
}>;

function releaseKey(entry: AlbumNormalizationInputEntry): string | null {
  if (entry.releaseId) return `release:${entry.releaseId}`;
  if (entry.releaseFamilyId) {
    return `release-family:${entry.releaseFamilyId}`;
  }
  return null;
}

function providerFact(
  descriptor: DirectAlbumProviderDescriptor,
): AlbumReleaseScopeProviderFact {
  const role =
    descriptor.providerId === 'circle-chart'
      ? 'primary'
      : descriptor.providerId === 'hanteo-chart'
        ? 'secondary'
        : 'other';

  return Object.freeze({
    providerId: descriptor.providerId,
    role,
    nativePeriodSalesQualified:
      descriptor.capabilities.supportsNativePeriodSales.state === 'true',
    historicalQueriesQualified:
      descriptor.capabilities.supportsHistoricalQueries.state === 'true',
    revisionsQualified:
      descriptor.capabilities.supportsRevisions.state === 'true',
    artistIdentityQualified:
      descriptor.capabilities.supportsArtistIdentity.state === 'true',
    releaseIdentityQualified:
      descriptor.capabilities.supportsReleaseIdentity.state === 'true',
    editionIdentityQualified:
      descriptor.capabilities.supportsEditionIdentity.state === 'true',
    skuIdentityQualified:
      descriptor.capabilities.supportsSkuIdentity.state === 'true',
  });
}

export function buildAlbumReleaseScopeReviewPacket(input: Readonly<{
  normalizationInput: AlbumNormalizationInput;
  providers: readonly DirectAlbumProviderDescriptor[];
}>): AlbumReleaseScopeReviewPacket {
  const target =
    buildAlbumNormalizationCalibrationReviewTarget(
      input.normalizationInput,
    );
  const primarySet = new Set(
    input.normalizationInput.primaryCandidateObservationIds,
  );
  const primaryEntries = input.normalizationInput.entries.filter(
    entry => primarySet.has(entry.observationId),
  );

  const unresolvedPrimaryObservationIds = primaryEntries
    .filter(entry =>
      releaseKey(entry) === null
      || entry.scopeKind === 'unresolved'
      || entry.scopeKind === 'provider-target-unresolved')
    .map(entry => entry.observationId)
    .sort();

  const groups = new Map<string, AlbumNormalizationInputEntry[]>();
  for (const entry of input.normalizationInput.entries) {
    const key = releaseKey(entry);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }

  const releaseGroups = [...groups.entries()]
    .map(([key, entries]): AlbumReleaseScopeReviewGroup => {
      const primary = entries.filter(entry =>
        primarySet.has(entry.observationId));
      const first = primary[0] ?? entries[0];

      return Object.freeze({
        releaseKey: key,
        artistId: first.artistId ?? '',
        releaseId: first.releaseId,
        releaseFamilyId: first.releaseFamilyId,
        primaryObservationIds: Object.freeze(
          primary.map(entry => entry.observationId).sort(),
        ),
        scopeKinds: Object.freeze(
          [...new Set(primary.map(entry => entry.scopeKind))].sort(),
        ),
        skuIds: Object.freeze(
          [...new Set(
            primary
              .map(entry => entry.providerSkuId)
              .filter((value): value is string => value !== null),
          )].sort(),
        ),
        providerReleaseIds: Object.freeze(
          [...new Set(
            entries
              .map(entry => entry.providerReleaseId)
              .filter((value): value is string => value !== null),
          )].sort(),
        ),
        providerEditionIds: Object.freeze(
          [...new Set(
            entries
              .map(entry => entry.providerEditionId)
              .filter((value): value is string => value !== null),
          )].sort(),
        ),
        providerPeriods: Object.freeze(
          [...new Set(
            entries
              .map(entry => entry.providerPeriod)
              .filter((value): value is string => value !== null),
          )].sort(),
        ),
        excludedDetailObservationIds: Object.freeze(
          entries
            .filter(entry =>
              input.normalizationInput.excludedDetailObservationIds
                .includes(entry.observationId))
            .map(entry => entry.observationId)
            .sort(),
        ),
        supersededObservationIds: Object.freeze(
          entries
            .filter(entry =>
              input.normalizationInput.supersededObservationIds
                .includes(entry.observationId))
            .map(entry => entry.observationId)
            .sort(),
        ),
        duplicateObservationIds: Object.freeze(
          entries
            .filter(entry =>
              input.normalizationInput.duplicateObservationIds
                .includes(entry.observationId))
            .map(entry => entry.observationId)
            .sort(),
        ),
      });
    })
    .filter(group => group.primaryObservationIds.length > 0)
    .sort((a, b) => a.releaseKey.localeCompare(b.releaseKey));

  const reasons: string[] = [];
  let state: AlbumReleaseScopeReviewPacketState;

  if (input.normalizationInput.blockedObservationIds.length > 0) {
    state = 'conflicting-evidence';
    reasons.push('normalization-input-has-blocked-observations');
  } else if (
    primaryEntries.length === 0
    || releaseGroups.length === 0
    || unresolvedPrimaryObservationIds.length > 0
  ) {
    state = 'insufficient-evidence';
    if (primaryEntries.length === 0) {
      reasons.push('no-primary-normalization-candidate');
    }
    if (releaseGroups.length === 0) {
      reasons.push('no-reviewable-release-group');
    }
    if (unresolvedPrimaryObservationIds.length > 0) {
      reasons.push('primary-release-or-scope-unresolved');
    }
  } else {
    state = 'reviewable';
    reasons.push('primary-release-scope-facts-assembled');
  }

  const providerFacts = input.providers
    .map(providerFact)
    .sort((a, b) => a.providerId.localeCompare(b.providerId));

  const packetId = sha256Canonical({
    contractVersion: ALBUM_RELEASE_SCOPE_REVIEW_PACKET_VERSION,
    targetFingerprint: target.fingerprint,
    state,
    primaryObservationIds: target.primaryObservationIds,
    releaseGroups,
    providerFacts,
    unresolvedPrimaryObservationIds,
    blockedObservationIds:
      input.normalizationInput.blockedObservationIds,
    excludedDetailObservationIds:
      input.normalizationInput.excludedDetailObservationIds,
    supersededObservationIds:
      input.normalizationInput.supersededObservationIds,
    duplicateObservationIds:
      input.normalizationInput.duplicateObservationIds,
  });

  return Object.freeze({
    contractVersion: ALBUM_RELEASE_SCOPE_REVIEW_PACKET_VERSION,
    packetId,
    targetFingerprint: target.fingerprint,
    state,
    primaryObservationIds:
      Object.freeze([...target.primaryObservationIds]),
    releaseGroups: Object.freeze(releaseGroups),
    providerFacts: Object.freeze(providerFacts),
    unresolvedPrimaryObservationIds:
      Object.freeze(unresolvedPrimaryObservationIds),
    blockedObservationIds: Object.freeze([
      ...input.normalizationInput.blockedObservationIds,
    ]),
    excludedDetailObservationIds: Object.freeze([
      ...input.normalizationInput.excludedDetailObservationIds,
    ]),
    supersededObservationIds: Object.freeze([
      ...input.normalizationInput.supersededObservationIds,
    ]),
    duplicateObservationIds: Object.freeze([
      ...input.normalizationInput.duplicateObservationIds,
    ]),
    reasonCodes: Object.freeze([...new Set(reasons)].sort()),
    reviewQuestions: Object.freeze([
      'does-provider-scope-cover-the-intended-release-universe',
      'are-all-relevant-skus-or-editions-accounted-for',
      'are-excluded-child-scopes-non-additive-details',
      'does-any-provider-target-remain-release-vs-edition-ambiguous',
    ] as const),
    reviewerConclusionRequired: true as const,
    autoVerified: false as const,
    completenessDetermined: false as const,
    numericNormalizationDefined: false as const,
    scoreFieldsPresent: false as const,
  });
}

export function createReleaseScopeCompletenessEvidenceRecord(
  input: Readonly<{
    packet: AlbumReleaseScopeReviewPacket;
    decision: AlbumReleaseScopeReviewDecision;
  }>,
): AlbumNormalizationCalibrationEvidenceRecord {
  if (input.decision.packetId !== input.packet.packetId) {
    throw new Error(
      'album_release_scope_review_packet_mismatch',
    );
  }
  if (input.decision.evidenceId.trim() === '') {
    throw new Error(
      'album_release_scope_review_evidence_id_missing',
    );
  }
  if (input.decision.reviewerRef.trim() === '') {
    throw new Error(
      'album_release_scope_review_reviewer_ref_missing',
    );
  }
  if (
    input.decision.conclusion === 'verified'
    && input.packet.state !== 'reviewable'
  ) {
    throw new Error(
      'album_release_scope_review_verified_requires_reviewable_packet',
    );
  }
  if (
    input.decision.conclusion === 'verified'
    && (
      input.decision.supportingEvidenceRefs.length === 0
      || input.decision.supportingEvidenceRefs.some(
        value => value.trim() === '')
    )
  ) {
    throw new Error(
      'album_release_scope_review_verified_requires_supporting_evidence',
    );
  }

  return Object.freeze({
    recordVersion:
      ALBUM_NORMALIZATION_CALIBRATION_EVIDENCE_RECORD_VERSION,
    evidenceId: input.decision.evidenceId,
    dimension: 'release-scope-completeness' as const,
    targetFingerprint: input.packet.targetFingerprint,
    coveredObservationIds:
      input.packet.primaryObservationIds,
    conclusion: input.decision.conclusion,
    sourceRef: input.decision.reviewerRef,
    reviewedAt: input.decision.reviewedAt,
  });
}
