import {
  FANDEX_VARIABLE_PRODUCT_CONTRACT_VERSION,
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
  type FandexVariableProductRecord,
} from './fandexVariableProduct';

export const FANDEX_VARIABLE_PRODUCT_SNAPSHOT_CONTRACT_VERSION =
  'fandex-variable-product-snapshot-v1' as const;

export type FandexVariableProductSnapshot = Readonly<{
  contractVersion: typeof FANDEX_VARIABLE_PRODUCT_SNAPSHOT_CONTRACT_VERSION;
  canonicalArtistId: string;
  records: readonly FandexVariableProductRecord[];
  productionVariableIds: readonly FandexVariableProductId[];
  unresolvedVariableIds: readonly FandexVariableProductId[];
  blockedVariableIds: readonly FandexVariableProductId[];
}>;

function freezeIds(
  ids: readonly FandexVariableProductId[],
): readonly FandexVariableProductId[] {
  return Object.freeze([...ids]);
}

export function createFandexVariableProductSnapshot(
  records: readonly FandexVariableProductRecord[],
): FandexVariableProductSnapshot {
  if (records.length !== FANDEX_VARIABLE_PRODUCT_IDS.length) {
    throw new Error('fandex_variable_product_snapshot_record_count_invalid');
  }

  const canonicalArtistId = records[0]?.canonicalArtistId?.trim();
  if (!canonicalArtistId) {
    throw new Error('fandex_variable_product_snapshot_artist_id_invalid');
  }

  const byVariableId = new Map<
    FandexVariableProductId,
    FandexVariableProductRecord
  >();

  for (const record of records) {
    if (
      record.contractVersion !== FANDEX_VARIABLE_PRODUCT_CONTRACT_VERSION
    ) {
      throw new Error(
        'fandex_variable_product_snapshot_record_contract_invalid',
      );
    }

    if (record.canonicalArtistId.trim() !== canonicalArtistId) {
      throw new Error(
        'fandex_variable_product_snapshot_artist_identity_mismatch',
      );
    }

    if (byVariableId.has(record.variableId)) {
      throw new Error(
        'fandex_variable_product_snapshot_duplicate_variable',
      );
    }

    if (
      record.readinessState === 'production'
      && record.lifecycleState !== 'production'
    ) {
      throw new Error(
        'fandex_variable_product_snapshot_production_readiness_invalid',
      );
    }

    if (
      record.lifecycleState === 'production'
      && record.materialClass !== 'real'
    ) {
      throw new Error(
        'fandex_variable_product_snapshot_production_material_invalid',
      );
    }

    byVariableId.set(record.variableId, record);
  }

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    if (!byVariableId.has(variableId)) {
      throw new Error(
        'fandex_variable_product_snapshot_variable_missing',
      );
    }
  }

  const orderedRecords = Object.freeze(
    FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) => {
      const record = byVariableId.get(variableId);
      if (!record) {
        throw new Error(
          'fandex_variable_product_snapshot_variable_missing',
        );
      }
      return record;
    }),
  );

  const productionVariableIds = freezeIds(
    orderedRecords
      .filter(
        (record) =>
          record.lifecycleState === 'production'
          && record.materialClass === 'real'
          && record.readinessState === 'production',
      )
      .map((record) => record.variableId),
  );

  const unresolvedVariableIds = freezeIds(
    orderedRecords
      .filter((record) => record.readinessState !== 'production')
      .map((record) => record.variableId),
  );

  const blockedVariableIds = freezeIds(
    orderedRecords
      .filter(
        (record) =>
          record.lifecycleState === 'blocked'
          || record.readinessState === 'blocked'
          || record.availability === 'blocked',
      )
      .map((record) => record.variableId),
  );

  return Object.freeze({
    contractVersion: FANDEX_VARIABLE_PRODUCT_SNAPSHOT_CONTRACT_VERSION,
    canonicalArtistId,
    records: orderedRecords,
    productionVariableIds,
    unresolvedVariableIds,
    blockedVariableIds,
  });
}
