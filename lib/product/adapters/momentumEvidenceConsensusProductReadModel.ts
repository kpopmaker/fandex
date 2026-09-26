import {
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID,
  type ProductMomentumDirectionalConsensus,
  type ProductMomentumEvidenceConsensusDataIssue,
  type ProductMomentumEvidenceConsensusReadModelResult,
  type ProductMomentumEvidenceConsensusStoredRecord,
  type ProductMomentumPersistenceConsensus,
} from '../contracts/productMomentumEvidenceConsensus';

const DIRECTIONAL_CONSENSUS = new Set<ProductMomentumDirectionalConsensus>([
  'direction-corroborated-up',
  'direction-corroborated-down',
  'flat-corroborated',
  'direction-conflicted',
  'direction-insufficient',
]);

const PERSISTENCE_CONSENSUS = new Set<ProductMomentumPersistenceConsensus>([
  'both-directions-repeated',
  'one-direction-repeated',
  'neither-direction-repeated',
  'persistence-not-applicable',
]);

function validTimestamp(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
    && Number.isFinite(Date.parse(value))
  );
}

function validDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function qualitativeEvidenceUsable(
  value: ProductMomentumDirectionalConsensus,
): boolean {
  return (
    value === 'direction-corroborated-up'
    || value === 'direction-corroborated-down'
    || value === 'flat-corroborated'
  );
}

export function buildProductMomentumEvidenceConsensusReadModel(
  input: Readonly<{
    artistId: string;
    records: readonly ProductMomentumEvidenceConsensusStoredRecord[];
  }>,
): ProductMomentumEvidenceConsensusReadModelResult {
  const artistId = input.artistId.trim();
  const issues: ProductMomentumEvidenceConsensusDataIssue[] = [];
  const recordIds = new Set<string>();
  const observationIds = new Set<string>();

  const records = [...input.records];

  for (const record of records) {
    if (record.canonicalArtistId !== artistId) {
      issues.push({
        code: 'artist-identity-mismatch',
        recordId: record.recordId,
      });
    }

    if (recordIds.has(record.recordId)) {
      issues.push({
        code: 'duplicate-record-id',
        recordId: record.recordId,
      });
    }
    recordIds.add(record.recordId);

    if (observationIds.has(record.observationId)) {
      issues.push({
        code: 'duplicate-observation-id',
        recordId: record.recordId,
      });
    }
    observationIds.add(record.observationId);

    if (
      record.variableId
        !== PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID
    ) {
      issues.push({
        code: 'invalid-source-variable',
        recordId: record.recordId,
      });
    }

    if (
      record.lifecycleState !== 'research'
      || record.materialClass !== 'real'
    ) {
      issues.push({
        code: 'invalid-source-lifecycle',
        recordId: record.recordId,
      });
    }

    if (!validTimestamp(record.alignmentCutoffAt)) {
      issues.push({
        code: 'invalid-alignment-cutoff',
        recordId: record.recordId,
      });
    }

    if (!DIRECTIONAL_CONSENSUS.has(record.directionalConsensus)) {
      issues.push({
        code: 'invalid-directional-consensus',
        recordId: record.recordId,
      });
    }

    if (!PERSISTENCE_CONSENSUS.has(record.persistenceConsensus)) {
      issues.push({
        code: 'invalid-persistence-consensus',
        recordId: record.recordId,
      });
    }

    if (record.rawValue !== record.directionalConsensus) {
      issues.push({
        code: 'raw-value-consensus-mismatch',
        recordId: record.recordId,
      });
    }

    if (
      record.recordId.trim().length === 0
      || record.observationId.trim().length === 0
      || !validDigest(record.sourceV143Digest)
      || !validDigest(record.observationDigest)
    ) {
      issues.push({
        code: 'invalid-stored-evidence-trace',
        recordId: record.recordId,
      });
    }
  }

  if (issues.length > 0) {
    return Object.freeze({
      status: 'data-issue' as const,
      issues: Object.freeze(issues) as readonly [
        ProductMomentumEvidenceConsensusDataIssue,
        ...ProductMomentumEvidenceConsensusDataIssue[],
      ],
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
    });
  }

  const matchingRecords = records
    .filter((record) => record.canonicalArtistId === artistId)
    .sort((left, right) => {
      const cutoffDifference =
        Date.parse(right.alignmentCutoffAt)
        - Date.parse(left.alignmentCutoffAt);
      if (cutoffDifference !== 0) return cutoffDifference;
      return right.recordId.localeCompare(left.recordId);
    });

  if (matchingRecords.length === 0) {
    return Object.freeze({
      status: 'missing' as const,
      reason: 'no-stored-categorical-evidence' as const,
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
    });
  }

  const latest = matchingRecords[0];

  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      contractVersion:
        PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
      identity: Object.freeze({
        sourceArtistId: artistId,
        constructId:
          PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
      }),
      construct: 'Momentum Evidence Consensus' as const,
      evidence: Object.freeze({
        alignmentCutoffAt: latest.alignmentCutoffAt,
        directionalConsensus: latest.directionalConsensus,
        persistenceConsensus: latest.persistenceConsensus,
        qualitativeDirectionEvidenceUsable:
          qualitativeEvidenceUsable(latest.directionalConsensus),
        conflictState:
          latest.directionalConsensus === 'direction-conflicted'
            ? 'detected' as const
            : 'none' as const,
      }),
      requiredFamilies: Object.freeze([
        'audience-consumption',
        'media-attention',
      ] as const),
      sourceCarrier: Object.freeze({
        variableId:
          PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID,
        lifecycleState: 'research' as const,
        materialClass: 'real' as const,
      }),
      storedEvidenceTrace: Object.freeze({
        carrierRecordId: latest.recordId,
        observationId: latest.observationId,
        sourceV143Digest: latest.sourceV143Digest,
        observationDigest: latest.observationDigest,
      }),
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      presentation: 'standard' as const,
      previewFallbackUsed: false as const,
      productMetricReadPerformed: false as const,
    }),
  });
}
