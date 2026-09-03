import { sha256Canonical } from '../../shared/canonicalDigest';
import type { DirectAlbumObservation } from '../../alternative-evidence/directAlbumProvider';
import type { PersistenceRecord } from '../../alternative-evidence/persistenceContracts';
import {
  ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
  ALBUM_RESEARCH_OBSERVATION_RECORD_TYPE,
  type AlbumResearchObservationProviderId,
  type AlbumResearchObservationRecord,
} from './albumResearchObservationIntake';

export const ALBUM_RESEARCH_OBSERVATION_CURRENT_VIEW_VERSION =
  'album-research-observation-current-view-v1' as const;

export type AlbumResearchObservationCurrentView = Readonly<{
  contractVersion: typeof ALBUM_RESEARCH_OBSERVATION_CURRENT_VIEW_VERSION;
  sourceContractVersion: typeof ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION;
  state: 'empty' | 'resolved' | 'conflicting';
  records: readonly AlbumResearchObservationRecord[];
  providerRecordCounts: Readonly<Record<AlbumResearchObservationProviderId, number>>;
  conflictingSeriesKeys: readonly string[];
  crossProviderAggregationAllowed: false;
  rawProviderSumAllowed: false;
  viewDigest: string;
}>;

function isDirectObservation(value: unknown): value is DirectAlbumObservation {
  return Boolean(value && typeof value === 'object'
    && 'observationId' in value
    && 'providerId' in value
    && 'semantic' in value);
}

function isAlbumResearchRecord(record: PersistenceRecord): record is AlbumResearchObservationRecord {
  return record.persistenceScope === 'research'
    && record.recordType === ALBUM_RESEARCH_OBSERVATION_RECORD_TYPE
    && isDirectObservation(record.payload)
    && (record.payload.providerId === 'circle-chart' || record.payload.providerId === 'hanteo-chart');
}

function currentHeads(records: readonly AlbumResearchObservationRecord[]): readonly AlbumResearchObservationRecord[] {
  const superseded = new Set(
    records.map(record => record.supersedesRecordId).filter((id): id is string => id !== null),
  );
  return Object.freeze(records.filter(record => !superseded.has(record.recordId)));
}

function conflicts(heads: readonly AlbumResearchObservationRecord[]): readonly string[] {
  const bySeries = new Map<string, AlbumResearchObservationRecord[]>();
  for (const record of heads) {
    const key = record.sourceRecordId ?? record.sourceEntityId ?? record.recordId;
    const current = bySeries.get(key) ?? [];
    current.push(record);
    bySeries.set(key, current);
  }

  const conflicting: string[] = [];
  for (const [key, records] of bySeries) {
    const payloads = new Set(records.map(record => record.payloadDigest));
    if (payloads.size > 1) conflicting.push(key);
  }
  return Object.freeze(conflicting.sort());
}

export function queryAlbumResearchObservationCurrentView(
  allRecords: readonly PersistenceRecord[],
): AlbumResearchObservationCurrentView {
  const records = allRecords.filter(isAlbumResearchRecord);
  const heads = currentHeads(records);
  const conflictingSeriesKeys = conflicts(heads);
  const providerRecordCounts = Object.freeze({
    'circle-chart': heads.filter(record => record.payload.providerId === 'circle-chart').length,
    'hanteo-chart': heads.filter(record => record.payload.providerId === 'hanteo-chart').length,
  });
  const state = heads.length === 0
    ? 'empty' as const
    : conflictingSeriesKeys.length > 0
      ? 'conflicting' as const
      : 'resolved' as const;

  const digestShape = {
    contractVersion: ALBUM_RESEARCH_OBSERVATION_CURRENT_VIEW_VERSION,
    sourceContractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
    state,
    recordIds: heads.map(record => record.recordId),
    providerRecordCounts,
    conflictingSeriesKeys,
    crossProviderAggregationAllowed: false as const,
    rawProviderSumAllowed: false as const,
  };

  return Object.freeze({
    contractVersion: ALBUM_RESEARCH_OBSERVATION_CURRENT_VIEW_VERSION,
    sourceContractVersion: ALBUM_RESEARCH_OBSERVATION_INTAKE_VERSION,
    state,
    records: heads,
    providerRecordCounts,
    conflictingSeriesKeys,
    crossProviderAggregationAllowed: false,
    rawProviderSumAllowed: false,
    viewDigest: sha256Canonical(digestShape),
  });
}
