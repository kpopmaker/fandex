import { isSha256, sha256Canonical } from '../shared/canonicalDigest';
import {
  ALBUM_RESEARCH_CLAIM_CONTRACT_VERSION,
  type AlbumResearchClaim,
  type AlbumResearchClaimBlocker,
  type AlbumResearchClaimSemantic,
  type AlbumResearchConflictReason,
  type AlbumResearchDefinitionState,
  type AlbumResearchExtractionSpan,
  type AlbumResearchIdentityCandidate,
  type AlbumResearchIdentityResolution,
  type AlbumResearchQualityMetadata,
  type AlbumResearchQualityState,
  type AlbumResearchRevisionContract,
  type AlbumResearchSemanticState,
  type AlbumResearchShadowEligibility,
  type AlbumResearchTemporalContract,
  type AlbumResearchValueKind,
  type AlternativeEvidence,
  type AlternativeEvidenceOrigin,
} from './contracts';

export type AlbumResearchClaimDraft = Readonly<{
  evidence: AlternativeEvidence;
  origin: AlternativeEvidenceOrigin;
  reportedProvider: string | null;
  artist: AlbumResearchIdentityResolution;
  release: AlbumResearchIdentityResolution;
  releaseFamilyCandidate: AlbumResearchIdentityCandidate | null;
  semantic: AlbumResearchClaimSemantic;
  semanticState: AlbumResearchSemanticState;
  definitionState: AlbumResearchDefinitionState;
  value: number | null;
  valueKind: AlbumResearchValueKind;
  unit: string | null;
  territory: string | null;
  temporal: AlbumResearchTemporalContract;
  extraction: AlbumResearchExtractionSpan;
  revision?: Partial<AlbumResearchRevisionContract>;
}>;

function normalizedLabel(candidate: AlbumResearchIdentityCandidate | null): string | null {
  return candidate?.label.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US')
    || null;
}

function identityKey(resolution: AlbumResearchIdentityResolution): Readonly<{
  fandexId: string | null;
  providerNativeId: string | null;
  label: string | null;
}> {
  return Object.freeze({
    fandexId: resolution.fandexId,
    providerNativeId: resolution.candidate?.providerNativeId ?? null,
    label: normalizedLabel(resolution.candidate),
  });
}

function releaseFamilyKey(candidate: AlbumResearchIdentityCandidate | null) {
  return Object.freeze({
    providerNativeId: candidate?.providerNativeId ?? null,
    label: normalizedLabel(candidate),
  });
}

function buildScopeShape(draft: AlbumResearchClaimDraft) {
  return Object.freeze({
    contractVersion: ALBUM_RESEARCH_CLAIM_CONTRACT_VERSION,
    reportedProvider: draft.reportedProvider,
    artist: identityKey(draft.artist),
    release: identityKey(draft.release),
    releaseFamily: releaseFamilyKey(draft.releaseFamilyCandidate),
    semantic: draft.semantic,
    providerPeriod: draft.temporal.providerPeriod,
    reportedPeriod: draft.temporal.reportedPeriod,
    territory: draft.territory,
  });
}

export function buildAlbumResearchClaimScopeId(draft: AlbumResearchClaimDraft): string {
  return sha256Canonical(buildScopeShape(draft));
}

export function buildAlbumResearchClaimFamilyId(draft: AlbumResearchClaimDraft): string {
  return sha256Canonical({
    ...buildScopeShape(draft),
    value: draft.value,
    valueKind: draft.valueKind,
    unit: draft.unit,
  });
}

export function buildAlbumResearchClaimId(draft: AlbumResearchClaimDraft): string {
  return sha256Canonical({
    contractVersion: ALBUM_RESEARCH_CLAIM_CONTRACT_VERSION,
    sourceEvidenceId: draft.evidence.evidenceId,
    extraction: {
      ordinal: draft.extraction.ordinal,
      start: draft.extraction.start,
      end: draft.extraction.end,
      textDigest: draft.extraction.textDigest,
    },
    claimFamilyId: buildAlbumResearchClaimFamilyId(draft),
  });
}

function qualityStateForIdentity(
  resolution: AlbumResearchIdentityResolution,
): AlbumResearchQualityState {
  if (resolution.state === 'resolved') return 'clear';
  if (resolution.state === 'candidate') return 'partial';
  if (resolution.state === 'conflicting') return 'conflicting';
  return 'unknown';
}

function qualityStateForSemantic(
  state: AlbumResearchSemanticState,
): AlbumResearchQualityState {
  if (state === 'clear') return 'clear';
  if (state === 'definition-unverified') return 'partial';
  if (state === 'conflicting') return 'conflicting';
  return 'unknown';
}

function buildQualityMetadata(draft: AlbumResearchClaimDraft): AlbumResearchQualityMetadata {
  const originQuality: AlbumResearchQualityState = draft.origin === 'unknown-public-claim'
    ? 'unknown'
    : draft.origin.startsWith('news-reported-')
      ? 'partial'
      : 'clear';
  const revisionState: AlbumResearchQualityState = draft.revision?.revisionState === 'explicit-correction'
    ? 'clear'
    : draft.revision?.revisionState === 'possible-correction'
      ? 'partial'
      : 'unknown';

  return Object.freeze({
    originQuality,
    providerAttributionClarity: draft.reportedProvider ? 'clear' : 'unknown',
    semanticClarity: qualityStateForSemantic(draft.semanticState),
    unitClarity: draft.unit ? 'clear' : 'unknown',
    periodClarity: draft.temporal.providerPeriod || draft.temporal.reportedPeriod
      ? draft.semanticState === 'definition-unverified' ? 'partial' : 'clear'
      : 'unknown',
    artistIdentityClarity: qualityStateForIdentity(draft.artist),
    releaseIdentityClarity: qualityStateForIdentity(draft.release),
    territoryClarity: draft.territory ? 'clear' : 'unknown',
    crossSourceAgreement: 'unknown',
    revisionState,
  });
}

function buildBlockers(draft: AlbumResearchClaimDraft): readonly AlbumResearchClaimBlocker[] {
  const blockers: AlbumResearchClaimBlocker[] = [];
  if (draft.artist.state !== 'resolved') blockers.push('artist-identity-unresolved');
  if (draft.release.state !== 'resolved') blockers.push('release-identity-unresolved');
  if (draft.semantic === 'unknown' || draft.semanticState === 'unknown') blockers.push('semantic-unknown');
  if (draft.semanticState === 'definition-unverified') blockers.push('semantic-definition-unverified');
  if (!draft.unit) blockers.push('unit-unknown');
  if (!draft.temporal.providerPeriod && !draft.temporal.reportedPeriod) blockers.push('period-unknown');
  if (draft.value === null) blockers.push('exact-value-missing');
  if (!draft.reportedProvider && draft.origin !== 'news-reported-agency-value') {
    blockers.push('provider-attribution-unknown');
  }
  if (!draft.territory) blockers.push('territory-unknown');
  if (draft.valueKind === 'threshold' || draft.valueKind === 'threshold-label') {
    blockers.push('threshold-only');
  }
  return Object.freeze(blockers);
}

export function classifyAlbumResearchShadowEligibility(
  draft: AlbumResearchClaimDraft,
): AlbumResearchShadowEligibility {
  const provenanceReady = isSha256(draft.evidence.evidenceDigest)
    && draft.evidence.sourceId.length > 0
    && draft.evidence.researchOnly;
  if (!provenanceReady) return 'not-eligible';

  const shadowReady = draft.artist.state === 'resolved'
    && draft.release.state === 'resolved'
    && draft.semantic !== 'unknown'
    && draft.semanticState === 'clear'
    && draft.unit !== null
    && (draft.temporal.providerPeriod !== null || draft.temporal.reportedPeriod !== null)
    && draft.value !== null
    && !['threshold', 'threshold-label', 'none'].includes(draft.valueKind);

  if (shadowReady) return 'shadow-feature-eligible';
  if (draft.semantic !== 'unknown' || draft.value !== null || draft.valueKind === 'threshold-label') {
    return 'normalized-research-ready';
  }
  return 'not-eligible';
}

function buildRevisionContract(
  revision?: Partial<AlbumResearchRevisionContract>,
): AlbumResearchRevisionContract {
  const revisionState = revision?.revisionState ?? 'original';
  const supersedesClaimId = revision?.supersedesClaimId ?? null;
  const possibleCorrectionOf = Object.freeze([...(revision?.possibleCorrectionOf ?? [])]);
  if (supersedesClaimId && revisionState !== 'explicit-correction') {
    throw new Error('album_research_supersession_requires_explicit_correction');
  }
  if (revisionState === 'explicit-correction' && !supersedesClaimId) {
    throw new Error('album_research_explicit_correction_target_required');
  }
  return Object.freeze({
    revisionState,
    supersedesClaimId,
    possibleCorrectionOf,
    conflictReason: revision?.conflictReason ?? null,
  });
}

export function createAlbumResearchClaim(draft: AlbumResearchClaimDraft): AlbumResearchClaim {
  if (!Number.isInteger(draft.extraction.ordinal) || draft.extraction.ordinal < 0
      || draft.extraction.start < 0 || draft.extraction.end <= draft.extraction.start
      || !isSha256(draft.extraction.textDigest)) {
    throw new Error('album_research_extraction_span_invalid');
  }
  if (draft.value !== null && (!Number.isSafeInteger(draft.value) || draft.value < 0)) {
    throw new Error('album_research_value_invalid');
  }
  if (draft.value === 0) {
    throw new Error('album_research_missing_must_not_be_zero');
  }

  const revision = buildRevisionContract(draft.revision);
  return Object.freeze({
    contractVersion: ALBUM_RESEARCH_CLAIM_CONTRACT_VERSION,
    claimId: buildAlbumResearchClaimId(draft),
    claimFamilyId: buildAlbumResearchClaimFamilyId(draft),
    claimScopeId: buildAlbumResearchClaimScopeId(draft),
    sourceEvidenceId: draft.evidence.evidenceId,
    origin: draft.origin,
    acquisitionProvider: draft.evidence.acquisitionProvider,
    reportedProvider: draft.reportedProvider,
    artistId: draft.artist.fandexId,
    artistCandidate: draft.artist.candidate,
    artistIdentityState: draft.artist.state,
    releaseId: draft.release.fandexId,
    releaseCandidate: draft.release.candidate,
    releaseIdentityState: draft.release.state,
    releaseFamilyCandidate: draft.releaseFamilyCandidate,
    semantic: draft.semantic,
    semanticState: draft.semanticState,
    definitionState: draft.definitionState,
    value: draft.value,
    valueKind: draft.valueKind,
    unit: draft.unit,
    territory: draft.territory,
    providerPeriod: draft.temporal.providerPeriod,
    reportedPeriod: draft.temporal.reportedPeriod,
    sourcePublishedAt: draft.temporal.sourcePublishedAt,
    observedAt: draft.temporal.observedAt,
    collectedAt: draft.temporal.collectedAt,
    revisionObservedAt: draft.temporal.revisionObservedAt,
    knowledgeMode: draft.temporal.knowledgeMode,
    evidenceDigest: draft.evidence.evidenceDigest,
    extraction: draft.extraction,
    revision,
    researchOnly: true,
    shadowEligibility: classifyAlbumResearchShadowEligibility(draft),
    quality: buildQualityMetadata(draft),
    blockers: buildBlockers(draft),
  });
}

export type AlbumResearchClaimDedupeResult = Readonly<{
  claims: readonly AlbumResearchClaim[];
  duplicates: readonly Readonly<{ claimId: string; occurrences: number }>[];
}>;

export function dedupeAlbumResearchClaims(
  claims: readonly AlbumResearchClaim[],
): AlbumResearchClaimDedupeResult {
  const unique = new Map<string, AlbumResearchClaim>();
  const counts = new Map<string, number>();
  for (const claim of claims) {
    counts.set(claim.claimId, (counts.get(claim.claimId) ?? 0) + 1);
    if (!unique.has(claim.claimId)) unique.set(claim.claimId, claim);
  }
  const duplicates = [...counts.entries()]
    .filter(([, occurrences]) => occurrences > 1)
    .map(([claimId, occurrences]) => Object.freeze({ claimId, occurrences }))
    .sort((left, right) => left.claimId.localeCompare(right.claimId));
  return Object.freeze({
    claims: Object.freeze([...unique.values()]),
    duplicates: Object.freeze(duplicates),
  });
}

export type AlbumResearchClaimFamilyGroup = Readonly<{
  claimFamilyId: string;
  groupingState: 'complete-candidate' | 'partial-candidate';
  claims: readonly AlbumResearchClaim[];
}>;

export function groupAlbumResearchClaimFamilies(
  claims: readonly AlbumResearchClaim[],
): readonly AlbumResearchClaimFamilyGroup[] {
  const groups = new Map<string, AlbumResearchClaim[]>();
  for (const claim of claims) {
    const group = groups.get(claim.claimFamilyId) ?? [];
    group.push(claim);
    groups.set(claim.claimFamilyId, group);
  }
  return Object.freeze([...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([claimFamilyId, groupedClaims]) => Object.freeze({
      claimFamilyId,
      groupingState: groupedClaims.every((claim) => claim.artistCandidate && claim.releaseCandidate)
        ? 'complete-candidate' as const
        : 'partial-candidate' as const,
      claims: Object.freeze([...groupedClaims]),
    })));
}

export type AlbumResearchClaimConflict = Readonly<{
  claimScopeId: string;
  state: 'conflicting';
  reason: AlbumResearchConflictReason;
  claimIds: readonly string[];
  claimFamilyIds: readonly string[];
}>;

export function findAlbumResearchClaimConflicts(
  claims: readonly AlbumResearchClaim[],
): readonly AlbumResearchClaimConflict[] {
  const scopes = new Map<string, AlbumResearchClaim[]>();
  for (const claim of claims) {
    const scope = scopes.get(claim.claimScopeId) ?? [];
    scope.push(claim);
    scopes.set(claim.claimScopeId, scope);
  }

  const conflicts: AlbumResearchClaimConflict[] = [];
  for (const [claimScopeId, scopedClaims] of scopes) {
    const families = [...new Set(scopedClaims.map((claim) => claim.claimFamilyId))].sort();
    if (families.length < 2) continue;
    const explicitReasons = [...new Set(scopedClaims
      .map((claim) => claim.revision.conflictReason)
      .filter((reason): reason is AlbumResearchConflictReason => reason !== null))];
    conflicts.push(Object.freeze({
      claimScopeId,
      state: 'conflicting',
      reason: explicitReasons.length === 1 ? explicitReasons[0] : 'unknown',
      claimIds: Object.freeze(scopedClaims.map((claim) => claim.claimId).sort()),
      claimFamilyIds: Object.freeze(families),
    }));
  }
  return Object.freeze(conflicts.sort((left, right) => left.claimScopeId.localeCompare(right.claimScopeId)));
}
