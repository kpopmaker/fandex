import { sha256Canonical } from '../shared/canonicalDigest';
import {
  buildDirectAlbumObservation,
  type DirectAlbumObservation,
} from './directAlbumProvider';
import {
  envelopeRecord,
  type AuthorizationSnapshot,
  type PersistenceRecordEnvelope,
} from './persistenceContracts';

export const CIRCLE_RETAIL_REVISION_CONTRACT_VERSION = 'circle-retail-revision-v1' as const;
export const CIRCLE_RETAIL_PERSISTENCE_RECORD_TYPE = 'CircleRetailDirectObservationRecord' as const;

export type CircleRetailRevisionAction =
  | 'append-original'
  | 'duplicate-noop'
  | 'revision-append'
  | 'series-mismatch';

export type CircleRetailRevisionDecision = Readonly<{
  contractVersion: typeof CIRCLE_RETAIL_REVISION_CONTRACT_VERSION;
  action: CircleRetailRevisionAction;
  seriesKey: string;
  previousObservationId: string | null;
  incomingObservationId: string;
  canonicalObservation: DirectAlbumObservation;
  candidateObservation: DirectAlbumObservation | null;
  decisionDigest: string;
}>;

function requireCirclePeriodSale(observation: DirectAlbumObservation): void {
  if (observation.providerId !== 'circle-chart') throw new Error('circle_retail_revision_provider_mismatch');
  if (observation.semantic !== 'period-sale' || observation.unit !== 'physical-units') {
    throw new Error('circle_retail_revision_semantic_mismatch');
  }
  if (!observation.providerPeriod) throw new Error('circle_retail_revision_period_missing');
  if (!observation.fandexArtistId || !observation.fandexReleaseId) {
    throw new Error('circle_retail_revision_identity_missing');
  }
  if (observation.value === null || !Number.isSafeInteger(observation.value) || observation.value < 0) {
    throw new Error('circle_retail_revision_value_invalid');
  }
}

export function buildCircleRetailSeriesKey(observation: DirectAlbumObservation): string {
  requireCirclePeriodSale(observation);
  return sha256Canonical({
    contractVersion: CIRCLE_RETAIL_REVISION_CONTRACT_VERSION,
    providerId: observation.providerId,
    semantic: observation.semantic,
    unit: observation.unit,
    providerPeriod: observation.providerPeriod,
    providerSkuId: observation.providerSkuId,
    fandexArtistId: observation.fandexArtistId,
    fandexReleaseId: observation.fandexReleaseId,
  });
}

function buildRevisionObservation(
  previous: DirectAlbumObservation,
  incoming: DirectAlbumObservation,
  revisionObservedAt: string,
  seriesKey: string,
): DirectAlbumObservation {
  if (Number.isNaN(Date.parse(revisionObservedAt))) {
    throw new Error('circle_retail_revision_observed_at_invalid');
  }
  const revisionId = sha256Canonical({
    contractVersion: CIRCLE_RETAIL_REVISION_CONTRACT_VERSION,
    seriesKey,
    previousObservationId: previous.observationId,
    incomingValue: incoming.value,
    incomingProviderPeriod: incoming.providerPeriod,
  });
  const {
    observationId: _observationId,
    evidenceDigest: _evidenceDigest,
    ...draft
  } = incoming;
  return buildDirectAlbumObservation({
    ...draft,
    revisionId,
    revisionObservedAt,
    supersedesObservationId: previous.observationId,
    knowledgeMode: 'current-research',
  });
}

export function reconcileCircleRetailObservation(input: Readonly<{
  previous: DirectAlbumObservation | null;
  incoming: DirectAlbumObservation;
  revisionObservedAt: string;
}>): CircleRetailRevisionDecision {
  requireCirclePeriodSale(input.incoming);
  const incomingSeriesKey = buildCircleRetailSeriesKey(input.incoming);

  if (!input.previous) {
    const shape = {
      contractVersion: CIRCLE_RETAIL_REVISION_CONTRACT_VERSION,
      action: 'append-original' as const,
      seriesKey: incomingSeriesKey,
      previousObservationId: null,
      incomingObservationId: input.incoming.observationId,
      canonicalObservationId: input.incoming.observationId,
      candidateObservationId: input.incoming.observationId,
    };
    return Object.freeze({
      ...shape,
      canonicalObservation: input.incoming,
      candidateObservation: input.incoming,
      decisionDigest: sha256Canonical(shape),
    });
  }

  requireCirclePeriodSale(input.previous);
  const previousSeriesKey = buildCircleRetailSeriesKey(input.previous);
  if (previousSeriesKey !== incomingSeriesKey) {
    const shape = {
      contractVersion: CIRCLE_RETAIL_REVISION_CONTRACT_VERSION,
      action: 'series-mismatch' as const,
      seriesKey: incomingSeriesKey,
      previousObservationId: input.previous.observationId,
      incomingObservationId: input.incoming.observationId,
      canonicalObservationId: input.previous.observationId,
      candidateObservationId: null,
    };
    return Object.freeze({
      ...shape,
      canonicalObservation: input.previous,
      candidateObservation: null,
      decisionDigest: sha256Canonical(shape),
    });
  }

  if (input.previous.value === input.incoming.value) {
    const shape = {
      contractVersion: CIRCLE_RETAIL_REVISION_CONTRACT_VERSION,
      action: 'duplicate-noop' as const,
      seriesKey: incomingSeriesKey,
      previousObservationId: input.previous.observationId,
      incomingObservationId: input.incoming.observationId,
      canonicalObservationId: input.previous.observationId,
      candidateObservationId: null,
    };
    return Object.freeze({
      ...shape,
      canonicalObservation: input.previous,
      candidateObservation: null,
      decisionDigest: sha256Canonical(shape),
    });
  }

  const revision = buildRevisionObservation(
    input.previous,
    input.incoming,
    input.revisionObservedAt,
    incomingSeriesKey,
  );
  const shape = {
    contractVersion: CIRCLE_RETAIL_REVISION_CONTRACT_VERSION,
    action: 'revision-append' as const,
    seriesKey: incomingSeriesKey,
    previousObservationId: input.previous.observationId,
    incomingObservationId: input.incoming.observationId,
    canonicalObservationId: revision.observationId,
    candidateObservationId: revision.observationId,
  };
  return Object.freeze({
    ...shape,
    canonicalObservation: revision,
    candidateObservation: revision,
    decisionDigest: sha256Canonical(shape),
  });
}

export function envelopeCircleRetailResearchObservation(input: Readonly<{
  observation: DirectAlbumObservation;
  authorizationSnapshot?: AuthorizationSnapshot;
  previousRecord?: PersistenceRecordEnvelope<DirectAlbumObservation> | null;
}>): PersistenceRecordEnvelope<DirectAlbumObservation> {
  requireCirclePeriodSale(input.observation);
  const seriesKey = buildCircleRetailSeriesKey(input.observation);
  const supersedesObservationId = input.observation.supersedesObservationId;
  const previousRecord = input.previousRecord ?? null;

  if (supersedesObservationId) {
    if (!previousRecord || previousRecord.payload.observationId !== supersedesObservationId) {
      throw new Error('circle_retail_revision_previous_record_mismatch');
    }
  }

  return envelopeRecord({
    recordType: CIRCLE_RETAIL_PERSISTENCE_RECORD_TYPE,
    recordVersion: CIRCLE_RETAIL_REVISION_CONTRACT_VERSION,
    persistenceScope: 'research',
    payload: input.observation,
    sourceEntityId: seriesKey,
    sourceRecordId: seriesKey,
    contributionIdentityId: input.observation.fandexReleaseId,
    knowledgeMode: input.observation.knowledgeMode,
    effectivePeriod: input.observation.providerPeriod,
    observedAt: input.observation.observedAt,
    collectedAt: input.observation.collectedAt,
    revisionObservedAt: input.observation.revisionObservedAt,
    syntheticOnly: input.observation.syntheticFixture,
    authorizationSnapshot: input.authorizationSnapshot,
    supersedesRecordId: supersedesObservationId ? previousRecord?.recordId ?? null : null,
    recordState: supersedesObservationId ? 'revised' : 'original',
  });
}
