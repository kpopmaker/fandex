import {
  buildProductMomentumEvidenceConsensusReadModel,
} from '../../product/adapters/momentumEvidenceConsensusProductReadModel';
import {
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID,
  type ProductMomentumDirectionalConsensus,
  type ProductMomentumEvidenceConsensusReadModelResult,
  type ProductMomentumEvidenceConsensusStoredRecord,
  type ProductMomentumPersistenceConsensus,
} from '../../product/contracts/productMomentumEvidenceConsensus';
import {
  sha256Canonical,
} from '../../shared/canonicalDigest';

const HISTORY_CONTRACT =
  'v147_fandex_momentum_unified_history_research_v1' as const;
const SOURCE_CONTRACT =
  'v143_fandex_momentum_output_form_eligibility_research_v1' as const;

type MomentumHistoryObservation = Readonly<{
  observationId: string;
  providerId: string;
  entity: Readonly<{
    entityType: string;
    entityId: string;
    providerEntityId: string | null;
    identityState: string;
  }>;
  variable: Readonly<{
    variableId: string;
    metricFamily: string;
    role: string;
  }>;
  value: Readonly<Record<string, unknown> & {
    rawValue: string;
    unit: unknown;
    missingState: string;
  }>;
  time: Readonly<{
    providerPeriodStart: string | null;
    providerPeriodEnd: string | null;
    observedAt: string | null;
    collectedAt: string;
  }>;
  evidence: Readonly<{
    evidenceRef: string;
    revision: string | null;
    conflictState: string | null;
  }>;
  lifecycle: Readonly<{
    state: string;
    materialClass: string;
    blockers: readonly string[];
  }>;
  contractVersion: string;
}>;

type MomentumUnifiedHistoryRecord = Readonly<{
  contractVersion: typeof HISTORY_CONTRACT;
  sequence: number;
  recordedAt: string;
  canonicalArtistId: string;
  alignmentCutoffAt: string;
  directionalConsensus: ProductMomentumDirectionalConsensus;
  persistenceConsensus: ProductMomentumPersistenceConsensus;
  sourceContractVersion: typeof SOURCE_CONTRACT;
  sourceV143Digest: string;
  changeKind:
    | 'initial-observation'
    | 'cutoff-advanced-same-state'
    | 'direction-state-changed'
    | 'persistence-state-changed'
    | 'direction-and-persistence-changed';
  previousSourceV143Digest: string | null;
  previousRecordDigest: string | null;
  observation: MomentumHistoryObservation;
  isolation: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
  }>;
  recordDigest: string;
}>;

export type MomentumEvidenceConsensusStoredEvidenceReadResult =
  | Readonly<{
      status: 'ok';
      model: Readonly<{
        carrierRecordId: string;
        observationId: string;
        canonicalArtistId: string;
        alignmentCutoffAt: string;
        directionalConsensus: ProductMomentumDirectionalConsensus;
        persistenceConsensus: ProductMomentumPersistenceConsensus;
        sourceV143Digest: string;
        observationDigest: string;
        recordedAt: string;
        changeKind: MomentumUnifiedHistoryRecord['changeKind'];
        previousRecordDigest: string | null;
        previousSourceV143Digest: string | null;
      }>;
    }>
  | Readonly<{
      status: 'not-found';
    }>
  | Readonly<{
      status: 'data-issue';
      reason:
        | 'history-validation-failed'
        | 'duplicate-record'
        | 'invalid-lineage';
    }>;

function validSha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function validIso(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function isDirectional(
  value: unknown,
): value is ProductMomentumDirectionalConsensus {
  return (
    value === 'direction-corroborated-up'
    || value === 'direction-corroborated-down'
    || value === 'flat-corroborated'
    || value === 'direction-conflicted'
    || value === 'direction-insufficient'
  );
}

function isPersistence(
  value: unknown,
): value is ProductMomentumPersistenceConsensus {
  return (
    value === 'both-directions-repeated'
    || value === 'one-direction-repeated'
    || value === 'neither-direction-repeated'
    || value === 'persistence-not-applicable'
  );
}

function isChangeKind(
  value: unknown,
): value is MomentumUnifiedHistoryRecord['changeKind'] {
  return (
    value === 'initial-observation'
    || value === 'cutoff-advanced-same-state'
    || value === 'direction-state-changed'
    || value === 'persistence-state-changed'
    || value === 'direction-and-persistence-changed'
  );
}

function digestPayload(record: MomentumUnifiedHistoryRecord) {
  return {
    contractVersion: record.contractVersion,
    sequence: record.sequence,
    recordedAt: record.recordedAt,
    canonicalArtistId: record.canonicalArtistId,
    alignmentCutoffAt: record.alignmentCutoffAt,
    directionalConsensus: record.directionalConsensus,
    persistenceConsensus: record.persistenceConsensus,
    sourceContractVersion: record.sourceContractVersion,
    sourceV143Digest: record.sourceV143Digest,
    changeKind: record.changeKind,
    previousSourceV143Digest: record.previousSourceV143Digest,
    previousRecordDigest: record.previousRecordDigest,
    observation: record.observation,
    isolation: record.isolation,
  };
}

function parseRecord(value: unknown): MomentumUnifiedHistoryRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('momentum_consensus_history_shape_invalid');
  }
  const record = value as Record<string, unknown>;
  const observation = record.observation;
  const isolation = record.isolation;

  if (
    record.contractVersion !== HISTORY_CONTRACT
    || !Number.isSafeInteger(record.sequence)
    || (record.sequence as number) <= 0
    || !validIso(record.recordedAt)
    || typeof record.canonicalArtistId !== 'string'
    || record.canonicalArtistId.length === 0
    || !validIso(record.alignmentCutoffAt)
    || !isDirectional(record.directionalConsensus)
    || !isPersistence(record.persistenceConsensus)
    || record.sourceContractVersion !== SOURCE_CONTRACT
    || !validSha(record.sourceV143Digest)
    || !isChangeKind(record.changeKind)
    || (
      record.previousSourceV143Digest !== null
      && !validSha(record.previousSourceV143Digest)
    )
    || (
      record.previousRecordDigest !== null
      && !validSha(record.previousRecordDigest)
    )
    || !validSha(record.recordDigest)
    || observation === null
    || typeof observation !== 'object'
    || Array.isArray(observation)
    || isolation === null
    || typeof isolation !== 'object'
    || Array.isArray(isolation)
  ) {
    throw new Error('momentum_consensus_history_record_invalid');
  }

  const candidate = record as unknown as MomentumUnifiedHistoryRecord;
  const obs = candidate.observation;

  if (
    obs.contractVersion !== 'fandex-observation-v1'
    || !validSha(obs.observationId)
    || obs.providerId !== 'fandex-derived'
    || obs.entity.entityType !== 'artist'
    || obs.entity.entityId !== candidate.canonicalArtistId
    || obs.entity.identityState !== 'canonical'
    || obs.variable.variableId
      !== PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID
    || obs.variable.metricFamily !== 'momentum'
    || obs.variable.role !== 'diagnostic'
    || obs.value.rawValue !== candidate.directionalConsensus
    || obs.value.unit !== null
    || obs.value.missingState !== 'observed'
    || Object.prototype.hasOwnProperty.call(obs.value, 'normalizedValue')
    || obs.time.observedAt !== candidate.alignmentCutoffAt
    || !validIso(obs.time.collectedAt)
    || obs.evidence.evidenceRef
      !== 'fandex:momentum:v143:' + candidate.sourceV143Digest
    || obs.lifecycle.state !== 'research'
    || obs.lifecycle.materialClass !== 'real'
    || candidate.isolation.productMetricReads !== 0
    || candidate.isolation.productMetricWrites !== 0
    || candidate.isolation.previewFallbackReads !== 0
    || candidate.isolation.databaseWrites !== 0
    || sha256Canonical(digestPayload(candidate)) !== candidate.recordDigest
  ) {
    throw new Error('momentum_consensus_history_lineage_invalid');
  }

  return candidate;
}

export function parseMomentumEvidenceConsensusHistory(
  jsonl: string,
): readonly MomentumUnifiedHistoryRecord[] {
  const records = jsonl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw new Error('momentum_consensus_history_json_invalid');
      }
      return parseRecord(parsed);
    });

  for (let index = 0; index < records.length; index += 1) {
    const current = records[index];

    if (current.sequence !== index + 1) {
      throw new Error('momentum_consensus_history_sequence_invalid');
    }

    if (index === 0) {
      if (
        current.previousRecordDigest !== null
        || current.previousSourceV143Digest !== null
        || current.changeKind !== 'initial-observation'
      ) {
        throw new Error('momentum_consensus_history_first_record_invalid');
      }
      continue;
    }

    const previous = records[index - 1];
    if (
      current.previousRecordDigest !== previous.recordDigest
      || current.previousSourceV143Digest !== previous.sourceV143Digest
      || current.canonicalArtistId !== previous.canonicalArtistId
      || Date.parse(current.alignmentCutoffAt)
        <= Date.parse(previous.alignmentCutoffAt)
    ) {
      throw new Error('momentum_consensus_history_chain_invalid');
    }
  }

  return Object.freeze(records);
}

function toStoredRecord(
  record: MomentumUnifiedHistoryRecord,
): ProductMomentumEvidenceConsensusStoredRecord {
  return Object.freeze({
    recordId: record.recordDigest,
    observationId: record.observation.observationId,
    canonicalArtistId: record.canonicalArtistId,
    variableId: PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID,
    alignmentCutoffAt: record.alignmentCutoffAt,
    directionalConsensus: record.directionalConsensus,
    persistenceConsensus: record.persistenceConsensus,
    sourceV143Digest: record.sourceV143Digest,
    observationDigest: sha256Canonical(record.observation),
    rawValue: record.directionalConsensus,
    lifecycleState: 'research' as const,
    materialClass: 'real' as const,
  });
}

export function readMomentumEvidenceConsensusShadowProductFromJsonl(
  input: Readonly<{
    artistId: string;
    jsonl: string;
  }>,
): ProductMomentumEvidenceConsensusReadModelResult {
  let records: readonly MomentumUnifiedHistoryRecord[];
  try {
    records = parseMomentumEvidenceConsensusHistory(input.jsonl);
  } catch {
    return Object.freeze({
      status: 'data-issue' as const,
      issues: Object.freeze([
        Object.freeze({
          code: 'invalid-stored-evidence-trace' as const,
        }),
      ]),
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
    });
  }

  return buildProductMomentumEvidenceConsensusReadModel({
    artistId: input.artistId,
    records: records.map(toStoredRecord),
  });
}

export function readMomentumEvidenceConsensusStoredEvidenceFromJsonl(
  input: Readonly<{
    artistId: string;
    carrierRecordId: string;
    jsonl: string;
  }>,
): MomentumEvidenceConsensusStoredEvidenceReadResult {
  if (!validSha(input.carrierRecordId)) {
    return Object.freeze({
      status: 'data-issue' as const,
      reason: 'invalid-lineage' as const,
    });
  }

  let records: readonly MomentumUnifiedHistoryRecord[];
  try {
    records = parseMomentumEvidenceConsensusHistory(input.jsonl);
  } catch {
    return Object.freeze({
      status: 'data-issue' as const,
      reason: 'history-validation-failed' as const,
    });
  }

  const matches = records.filter(
    (record) =>
      record.canonicalArtistId === input.artistId
      && record.recordDigest === input.carrierRecordId,
  );

  if (matches.length === 0) {
    return Object.freeze({ status: 'not-found' as const });
  }
  if (matches.length !== 1) {
    return Object.freeze({
      status: 'data-issue' as const,
      reason: 'duplicate-record' as const,
    });
  }

  const record = matches[0];
  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      carrierRecordId: record.recordDigest,
      observationId: record.observation.observationId,
      canonicalArtistId: record.canonicalArtistId,
      alignmentCutoffAt: record.alignmentCutoffAt,
      directionalConsensus: record.directionalConsensus,
      persistenceConsensus: record.persistenceConsensus,
      sourceV143Digest: record.sourceV143Digest,
      observationDigest: sha256Canonical(record.observation),
      recordedAt: record.recordedAt,
      changeKind: record.changeKind,
      previousRecordDigest: record.previousRecordDigest,
      previousSourceV143Digest: record.previousSourceV143Digest,
    }),
  });
}
