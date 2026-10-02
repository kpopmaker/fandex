import type { FandexRightsGateState } from './publicationGate';

export const BRAND_FIT_POINT_CONTRACT_VERSION =
  'brand-fit-point-evidence-v1' as const;

export const BRAND_FIT_POINT_CONSTRUCT = Object.freeze({
  variableId: 'brandFitPoint' as const,
  constructId: 'verified-commercial-partnership-activity' as const,
  construct:
    'Publicly verifiable artist-brand partnership and campaign activity evidence',
  productForm: 'categorical-event-stream' as const,
  numericEligible: false as const,
});

export const BRAND_FIT_SOURCE_FAMILIES = Object.freeze([
  'official-brand-announcement',
  'official-agency-announcement',
  'official-brand-youtube-video',
] as const);
export type BrandFitSourceFamily =
  typeof BRAND_FIT_SOURCE_FAMILIES[number];

export const BRAND_FIT_EVENT_TYPES = Object.freeze([
  'relationship-announced',
  'campaign-launched',
  'campaign-appearance',
  'collaboration-released',
] as const);
export type BrandFitEventType = typeof BRAND_FIT_EVENT_TYPES[number];

export const BRAND_FIT_RELATIONSHIP_TYPES = Object.freeze([
  'ambassador',
  'endorsement',
  'campaign-participant',
  'collaboration',
] as const);
export type BrandFitRelationshipType =
  typeof BRAND_FIT_RELATIONSHIP_TYPES[number];

export type BrandFitIdentityState = 'resolved' | 'unresolved' | 'conflict';
export type BrandFitSourceReliability =
  | 'primary-official'
  | 'secondary-corroborated'
  | 'unverified';

export type BrandFitPartnershipObservationInput = Readonly<{
  eventId: string;
  eventType: BrandFitEventType;
  relationshipType: BrandFitRelationshipType;
  explicitRelationshipClaim: boolean;
  identity: Readonly<{
    canonicalArtistId: string | null;
    canonicalBrandId: string | null;
    canonicalCampaignId: string | null;
    identityState: BrandFitIdentityState;
  }>;
  source: Readonly<{
    family: BrandFitSourceFamily | string;
    reliability: BrandFitSourceReliability;
    sourceUrl: string;
    sourcePublishedAt: string;
    rightsState: FandexRightsGateState;
  }>;
  time: Readonly<{
    activityStartAt: string | null;
    activityEndAt: string | null;
    collectedAt: string;
  }>;
  revision: Readonly<{
    revisionId: string;
    supersedesRevisionId: string | null;
  }>;
}>;

export type BrandFitPartnershipEvidence = Readonly<{
  contractVersion: typeof BRAND_FIT_POINT_CONTRACT_VERSION;
  variableId: 'brandFitPoint';
  constructId: typeof BRAND_FIT_POINT_CONSTRUCT.constructId;
  eventId: string;
  eventType: BrandFitEventType;
  relationshipType: BrandFitRelationshipType;
  identity: Readonly<{
    canonicalArtistId: string;
    canonicalBrandId: string;
    canonicalCampaignId: string | null;
    identityState: 'resolved';
  }>;
  source: Readonly<{
    family: BrandFitSourceFamily;
    reliability: 'primary-official';
    sourceUrl: string;
    sourcePublishedAt: string;
    rightsState: FandexRightsGateState;
  }>;
  time: Readonly<{
    activityStartAt: string | null;
    activityEndAt: string | null;
    collectedAt: string;
  }>;
  revision: Readonly<{
    revisionId: string;
    supersedesRevisionId: string | null;
  }>;
  interpretation: Readonly<{
    evidenceKind: 'verified-partnership-activity';
    score: null;
    sentiment: null;
    inferredDealValue: null;
  }>;
}>;

export type BrandFitEvidenceUnsupportedReason =
  | 'source-family-unsupported'
  | 'source-reliability-insufficient'
  | 'relationship-not-explicit'
  | 'identity-unresolved'
  | 'identity-conflict'
  | 'campaign-identity-required'
  | 'invalid-event-id'
  | 'invalid-source-url'
  | 'invalid-source-published-at'
  | 'invalid-collection-time'
  | 'invalid-activity-time'
  | 'invalid-revision';

export type BrandFitEvidenceAdapterResult =
  | Readonly<{
      status: 'ok';
      evidence: BrandFitPartnershipEvidence;
    }>
  | Readonly<{
      status: 'unsupported';
      reason: BrandFitEvidenceUnsupportedReason;
    }>;

export type BrandFitProductReadiness = Readonly<{
  status: 'insufficient_data' | 'blocked' | 'categorical_candidate';
  evidenceCount: number;
  blockers: readonly string[];
  limitations: readonly string[];
  productForm: typeof BRAND_FIT_POINT_CONSTRUCT.productForm;
  numericEligible: false;
}>;

const CAMPAIGN_ID_REQUIRED_EVENT_TYPES = new Set<BrandFitEventType>([
  'campaign-launched',
  'campaign-appearance',
  'collaboration-released',
]);

function isNonEmpty(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoTime(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function unsupported(
  reason: BrandFitEvidenceUnsupportedReason,
): BrandFitEvidenceAdapterResult {
  return Object.freeze({ status: 'unsupported' as const, reason });
}

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values)].sort((left, right) => left.localeCompare(right)),
  );
}

export function adaptBrandFitPartnershipEvidence(
  input: BrandFitPartnershipObservationInput,
): BrandFitEvidenceAdapterResult {
  if (!isNonEmpty(input.eventId)) return unsupported('invalid-event-id');
  if (!BRAND_FIT_SOURCE_FAMILIES.includes(input.source.family as BrandFitSourceFamily)) {
    return unsupported('source-family-unsupported');
  }
  if (input.source.reliability !== 'primary-official') {
    return unsupported('source-reliability-insufficient');
  }
  if (!input.explicitRelationshipClaim) {
    return unsupported('relationship-not-explicit');
  }
  if (input.identity.identityState === 'conflict') {
    return unsupported('identity-conflict');
  }
  if (
    input.identity.identityState !== 'resolved'
    || !isNonEmpty(input.identity.canonicalArtistId)
    || !isNonEmpty(input.identity.canonicalBrandId)
  ) {
    return unsupported('identity-unresolved');
  }
  if (
    CAMPAIGN_ID_REQUIRED_EVENT_TYPES.has(input.eventType)
    && !isNonEmpty(input.identity.canonicalCampaignId)
  ) {
    return unsupported('campaign-identity-required');
  }
  if (!isNonEmpty(input.source.sourceUrl)) return unsupported('invalid-source-url');
  if (!isIsoTime(input.source.sourcePublishedAt)) {
    return unsupported('invalid-source-published-at');
  }
  if (!isIsoTime(input.time.collectedAt)) {
    return unsupported('invalid-collection-time');
  }

  const activityStartAt = input.time.activityStartAt;
  const activityEndAt = input.time.activityEndAt;
  if (
    (activityStartAt !== null && !isIsoTime(activityStartAt))
    || (activityEndAt !== null && !isIsoTime(activityEndAt))
    || (
      activityStartAt !== null
      && activityEndAt !== null
      && Date.parse(activityEndAt) < Date.parse(activityStartAt)
    )
  ) {
    return unsupported('invalid-activity-time');
  }

  if (
    !isNonEmpty(input.revision.revisionId)
    || (
      input.revision.supersedesRevisionId !== null
      && (
        !isNonEmpty(input.revision.supersedesRevisionId)
        || input.revision.supersedesRevisionId === input.revision.revisionId
      )
    )
  ) {
    return unsupported('invalid-revision');
  }

  const evidence: BrandFitPartnershipEvidence = Object.freeze({
    contractVersion: BRAND_FIT_POINT_CONTRACT_VERSION,
    variableId: 'brandFitPoint',
    constructId: BRAND_FIT_POINT_CONSTRUCT.constructId,
    eventId: input.eventId.trim(),
    eventType: input.eventType,
    relationshipType: input.relationshipType,
    identity: Object.freeze({
      canonicalArtistId: input.identity.canonicalArtistId.trim(),
      canonicalBrandId: input.identity.canonicalBrandId.trim(),
      canonicalCampaignId: input.identity.canonicalCampaignId?.trim() || null,
      identityState: 'resolved' as const,
    }),
    source: Object.freeze({
      family: input.source.family as BrandFitSourceFamily,
      reliability: 'primary-official' as const,
      sourceUrl: input.source.sourceUrl.trim(),
      sourcePublishedAt: input.source.sourcePublishedAt,
      rightsState: input.source.rightsState,
    }),
    time: Object.freeze({
      activityStartAt,
      activityEndAt,
      collectedAt: input.time.collectedAt,
    }),
    revision: Object.freeze({
      revisionId: input.revision.revisionId.trim(),
      supersedesRevisionId: input.revision.supersedesRevisionId?.trim() || null,
    }),
    interpretation: Object.freeze({
      evidenceKind: 'verified-partnership-activity' as const,
      score: null,
      sentiment: null,
      inferredDealValue: null,
    }),
  });

  return Object.freeze({ status: 'ok' as const, evidence });
}

export function validateBrandFitEvidenceHistory(
  history: readonly BrandFitPartnershipEvidence[],
): readonly string[] {
  const issues: string[] = [];
  const revisionIds = new Set<string>();
  const evidenceByRevision = new Map<string, BrandFitPartnershipEvidence>();

  for (const evidence of history) {
    if (revisionIds.has(evidence.revision.revisionId)) {
      issues.push('duplicate-revision-id');
    }
    revisionIds.add(evidence.revision.revisionId);
    evidenceByRevision.set(evidence.revision.revisionId, evidence);

    const supersedes = evidence.revision.supersedesRevisionId;
    if (supersedes === null) continue;

    const prior = evidenceByRevision.get(supersedes);
    if (!prior) {
      issues.push('superseded-revision-not-found-earlier');
      continue;
    }
    if (prior.eventId !== evidence.eventId) {
      issues.push('revision-event-identity-mismatch');
    }
    if (
      prior.identity.canonicalArtistId !== evidence.identity.canonicalArtistId
      || prior.identity.canonicalBrandId !== evidence.identity.canonicalBrandId
    ) {
      issues.push('revision-entity-identity-mismatch');
    }
  }

  return orderedUnique(issues);
}

export function evaluateBrandFitProductReadiness(
  evidence: readonly BrandFitPartnershipEvidence[],
): BrandFitProductReadiness {
  if (evidence.length === 0) {
    return Object.freeze({
      status: 'insufficient_data' as const,
      evidenceCount: 0,
      blockers: Object.freeze(['no-qualified-public-partnership-evidence']),
      limitations: Object.freeze([]),
      productForm: BRAND_FIT_POINT_CONSTRUCT.productForm,
      numericEligible: false as const,
    });
  }

  const historyIssues = validateBrandFitEvidenceHistory(evidence);
  const blockers = [...historyIssues];
  const limitations: string[] = [];

  for (const item of evidence) {
    if (item.source.rightsState === 'deny') blockers.push('rights-denied');
    if (item.source.rightsState === 'unknown') blockers.push('rights-unknown');
    if (item.source.rightsState === 'restricted') {
      limitations.push('rights-restricted');
    }
  }

  const normalizedBlockers = orderedUnique(blockers);
  return Object.freeze({
    status:
      normalizedBlockers.length > 0
        ? 'blocked' as const
        : 'categorical_candidate' as const,
    evidenceCount: evidence.length,
    blockers: normalizedBlockers,
    limitations: orderedUnique(limitations),
    productForm: BRAND_FIT_POINT_CONSTRUCT.productForm,
    numericEligible: false as const,
  });
}
