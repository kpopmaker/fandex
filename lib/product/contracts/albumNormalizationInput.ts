import { sha256Canonical } from '../../shared/canonicalDigest';
import type {
  DirectAlbumObservation,
  DirectAlbumProviderDescriptor,
} from '../../alternative-evidence/directAlbumProvider';

export const ALBUM_NORMALIZATION_INPUT_CONTRACT_VERSION =
  'album-normalization-input-v1' as const;

export type AlbumNormalizationProviderRole =
  | 'primary-historical'
  | 'secondary-current-corroboration'
  | 'unsupported';

export type AlbumNormalizationScopeKind =
  | 'release'
  | 'release-family'
  | 'sku'
  | 'format'
  | 'provider-target-unresolved'
  | 'unresolved';

export type AlbumNormalizationDisposition =
  | 'primary-normalization-candidate'
  | 'secondary-corroboration'
  | 'scope-detail-only'
  | 'superseded'
  | 'duplicate-noop'
  | 'blocked-conflict'
  | 'blocked-unresolved-scope'
  | 'blocked-provider'
  | 'blocked-synthetic';

export type AlbumNormalizationInputEntry = Readonly<{
  entryId: string;
  observationId: string;
  providerId: string;
  providerRole: AlbumNormalizationProviderRole;
  artistId: string | null;
  releaseId: string | null;
  releaseFamilyId: string | null;
  providerReleaseId: string | null;
  providerEditionId: string | null;
  providerSkuId: string | null;
  providerPeriod: string | null;
  semantic: DirectAlbumObservation['semantic'];
  unit: DirectAlbumObservation['unit'];
  value: number | null;
  scopeKind: AlbumNormalizationScopeKind;
  scopeKey: string | null;
  revisionId: string | null;
  supersedesObservationId: string | null;
  disposition: AlbumNormalizationDisposition;
  blockers: readonly string[];
  rawContributionAllowed: false;
  additiveContributionAllowed: false;
}>;

export type AlbumNormalizationInput = Readonly<{
  contractVersion: typeof ALBUM_NORMALIZATION_INPUT_CONTRACT_VERSION;
  methodologyDefined: true;
  providerPolicy: Readonly<{
    primaryProviderId: 'circle-chart';
    secondaryProviderId: 'hanteo-chart';
    primaryRequiresHistoricalQueries: true;
    primaryRequiresRevisionSupport: true;
    secondaryMayCorroborateCurrentEvidence: true;
    secondaryMayReplacePrimary: false;
  }>;
  entries: readonly AlbumNormalizationInputEntry[];
  primaryCandidateObservationIds: readonly string[];
  secondaryCorroborationObservationIds: readonly string[];
  supersededObservationIds: readonly string[];
  blockedObservationIds: readonly string[];
  excludedDetailObservationIds: readonly string[];
  duplicateObservationIds: readonly string[];
  inputSetUsable: boolean;
  rawProviderAdditionAllowed: false;
  crossProviderAdditionAllowed: false;
  parentChildAdditionAllowed: false;
  skuAdditionToReleaseAllowed: false;
  numericNormalizationDefined: false;
  normalizedValue: null;
  scoreFieldsPresent: false;
}>;

type MutableEntry = {
  observation: DirectAlbumObservation;
  providerRole: AlbumNormalizationProviderRole;
  scopeKind: AlbumNormalizationScopeKind;
  scopeKey: string | null;
  disposition: AlbumNormalizationDisposition;
  blockers: string[];
};

function providerRole(
  descriptor: DirectAlbumProviderDescriptor | undefined,
): AlbumNormalizationProviderRole {
  if (!descriptor) return 'unsupported';

  if (
    descriptor.providerId === 'circle-chart'
    && descriptor.capabilities.supportsNativePeriodSales.state === 'true'
    && descriptor.capabilities.supportsHistoricalQueries.state === 'true'
    && descriptor.capabilities.supportsRevisions.state === 'true'
  ) {
    return 'primary-historical';
  }

  if (
    descriptor.providerId === 'hanteo-chart'
    && descriptor.capabilities.supportsNativePeriodSales.state === 'true'
  ) {
    return 'secondary-current-corroboration';
  }

  return 'unsupported';
}

function scopeOf(
  observation: DirectAlbumObservation,
): Readonly<{
  kind: AlbumNormalizationScopeKind;
  key: string | null;
}> {
  if (observation.scopeRole === 'child-sku') {
    return Object.freeze({
      kind: observation.providerSkuId ? 'sku' : 'unresolved',
      key: observation.providerSkuId
        ? `sku:${observation.providerSkuId}`
        : null,
    });
  }

  if (observation.scopeRole === 'format-child') {
    return Object.freeze({
      kind: observation.format ? 'format' : 'unresolved',
      key: observation.format
        ? `format:${observation.format}`
        : null,
    });
  }

  if (observation.scopeRole === 'release-total') {
    if (observation.fandexReleaseId) {
      return Object.freeze({
        kind: 'release',
        key: `release:${observation.fandexReleaseId}`,
      });
    }
    if (observation.fandexReleaseFamilyId) {
      return Object.freeze({
        kind: 'release-family',
        key: `release-family:${observation.fandexReleaseFamilyId}`,
      });
    }
    return Object.freeze({ kind: 'unresolved', key: null });
  }

  // Circle retail rows are Barcode/SKU observations even though the adapter
  // currently labels them standalone. Never promote one SKU row to release total.
  if (
    observation.providerId === 'circle-chart'
    && observation.providerSkuId
  ) {
    return Object.freeze({
      kind: 'sku',
      key: `sku:${observation.providerSkuId}`,
    });
  }

  // Hanteo targetIdx is retained as a provider target candidate, but the
  // exact release-vs-edition level is still unresolved.
  if (
    observation.providerId === 'hanteo-chart'
    && observation.providerReleaseId
  ) {
    return Object.freeze({
      kind: 'provider-target-unresolved',
      key: `provider-target:${observation.providerReleaseId}`,
    });
  }

  if (observation.fandexReleaseId) {
    return Object.freeze({
      kind: 'release',
      key: `release:${observation.fandexReleaseId}`,
    });
  }

  if (observation.fandexReleaseFamilyId) {
    return Object.freeze({
      kind: 'release-family',
      key: `release-family:${observation.fandexReleaseFamilyId}`,
    });
  }

  return Object.freeze({ kind: 'unresolved', key: null });
}

function releaseIdentityKey(
  observation: DirectAlbumObservation,
): string | null {
  if (observation.fandexReleaseId) {
    return `release:${observation.fandexReleaseId}`;
  }
  if (observation.fandexReleaseFamilyId) {
    return `release-family:${observation.fandexReleaseFamilyId}`;
  }
  return null;
}

function seriesCompatibilityKey(
  observation: DirectAlbumObservation,
  scopeKey: string | null,
): string {
  return sha256Canonical({
    providerId: observation.providerId,
    artistId: observation.fandexArtistId,
    releaseIdentity: releaseIdentityKey(observation),
    scopeKey,
    semantic: observation.semantic,
    unit: observation.unit,
    providerPeriod: observation.providerPeriod,
    territory: observation.territory,
    format: observation.format,
  });
}

function dedupeKey(
  observation: DirectAlbumObservation,
): string {
  return sha256Canonical({
    providerId: observation.providerId,
    providerObservationId: observation.providerObservationId,
    providerArtistId: observation.providerArtistId,
    providerReleaseId: observation.providerReleaseId,
    providerEditionId: observation.providerEditionId,
    providerSkuId: observation.providerSkuId,
    fandexArtistId: observation.fandexArtistId,
    fandexReleaseId: observation.fandexReleaseId,
    fandexReleaseFamilyId: observation.fandexReleaseFamilyId,
    semantic: observation.semantic,
    value: observation.value,
    unit: observation.unit,
    territory: observation.territory,
    format: observation.format,
    providerPeriod: observation.providerPeriod,
    revisionId: observation.revisionId,
    supersedesObservationId: observation.supersedesObservationId,
    scopeRole: observation.scopeRole,
    parentObservationId: observation.parentObservationId,
  });
}

function entryId(entry: MutableEntry): string {
  return sha256Canonical({
    contractVersion: ALBUM_NORMALIZATION_INPUT_CONTRACT_VERSION,
    observationId: entry.observation.observationId,
    providerRole: entry.providerRole,
    scopeKind: entry.scopeKind,
    scopeKey: entry.scopeKey,
    disposition: entry.disposition,
    blockers: [...new Set(entry.blockers)].sort(),
  });
}

function block(
  entry: MutableEntry,
  disposition: AlbumNormalizationDisposition,
  reason: string,
): void {
  entry.disposition = disposition;
  entry.blockers.push(reason);
}

export function buildAlbumNormalizationInput(input: Readonly<{
  observations: readonly DirectAlbumObservation[];
  providers: readonly DirectAlbumProviderDescriptor[];
}>): AlbumNormalizationInput {
  const providerById = new Map(
    input.providers.map(provider => [provider.providerId, provider]),
  );

  const entries: MutableEntry[] = input.observations.map(observation => {
    const scope = scopeOf(observation);
    const role = providerRole(providerById.get(observation.providerId));
    const blockers: string[] = [];
    let disposition: AlbumNormalizationDisposition =
      role === 'primary-historical'
        ? 'primary-normalization-candidate'
        : role === 'secondary-current-corroboration'
          ? 'secondary-corroboration'
          : 'blocked-provider';

    if (role === 'unsupported') blockers.push('provider-role-unsupported');
    if (observation.syntheticFixture) {
      disposition = 'blocked-synthetic';
      blockers.push('synthetic-observation-forbidden');
    }
    if (!observation.fandexArtistId) {
      disposition = 'blocked-unresolved-scope';
      blockers.push('artist-identity-unresolved');
    }
    if (!releaseIdentityKey(observation)) {
      disposition = 'blocked-unresolved-scope';
      blockers.push('release-identity-unresolved');
    }
    if (!observation.providerPeriod) {
      disposition = 'blocked-unresolved-scope';
      blockers.push('provider-period-unresolved');
    }
    if (
      observation.unit !== 'physical-units'
      || observation.value === null
    ) {
      disposition = 'blocked-unresolved-scope';
      blockers.push('physical-unit-observation-required');
    }
    if (scope.kind === 'unresolved') {
      disposition = 'blocked-unresolved-scope';
      blockers.push('normalization-scope-unresolved');
    }

    return {
      observation,
      providerRole: role,
      scopeKind: scope.kind,
      scopeKey: scope.key,
      disposition,
      blockers,
    };
  });

  // Exact duplicate payloads are no-ops even if they were reacquired under
  // distinct observation IDs.
  const byDuplicateKey = new Map<string, MutableEntry[]>();
  for (const entry of entries) {
    const key = dedupeKey(entry.observation);
    const group = byDuplicateKey.get(key) ?? [];
    group.push(entry);
    byDuplicateKey.set(key, group);
  }
  for (const group of byDuplicateKey.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((a, b) =>
      a.observation.observationId.localeCompare(
        b.observation.observationId,
      ));
    for (const duplicate of ordered.slice(1)) {
      if (!duplicate.disposition.startsWith('blocked-')) {
        block(
          duplicate,
          'duplicate-noop',
          'exact-observation-duplicate',
        );
      }
    }
  }

  const byObservationId = new Map(
    entries.map(entry => [entry.observation.observationId, entry]),
  );
  const supersedersByParent = new Map<string, MutableEntry[]>();

  for (const entry of entries) {
    const parentId = entry.observation.supersedesObservationId;
    if (!parentId) continue;
    const parent = byObservationId.get(parentId);
    if (!parent) {
      block(
        entry,
        'blocked-conflict',
        'supersession-parent-missing',
      );
      continue;
    }

    const parentSeries = seriesCompatibilityKey(
      parent.observation,
      parent.scopeKey,
    );
    const childSeries = seriesCompatibilityKey(
      entry.observation,
      entry.scopeKey,
    );
    if (parentSeries !== childSeries) {
      block(
        entry,
        'blocked-conflict',
        'supersession-series-mismatch',
      );
      continue;
    }

    const children = supersedersByParent.get(parentId) ?? [];
    children.push(entry);
    supersedersByParent.set(parentId, children);
  }

  for (const [parentId, children] of supersedersByParent) {
    const parent = byObservationId.get(parentId);
    if (!parent) continue;

    if (children.length > 1) {
      block(
        parent,
        'blocked-conflict',
        'revision-branch-conflict',
      );
      for (const child of children) {
        block(
          child,
          'blocked-conflict',
          'revision-branch-conflict',
        );
      }
      continue;
    }

    if (!parent.disposition.startsWith('blocked-')) {
      block(parent, 'superseded', 'superseded-by-revision');
    }
  }

  // Parent/release totals and child SKU/format detail must never be additive.
  const releasePeriodGroups = new Map<string, MutableEntry[]>();
  for (const entry of entries) {
    const releaseKey = releaseIdentityKey(entry.observation);
    if (!releaseKey || !entry.observation.providerPeriod) continue;
    const key = sha256Canonical({
      providerId: entry.observation.providerId,
      artistId: entry.observation.fandexArtistId,
      releaseKey,
      providerPeriod: entry.observation.providerPeriod,
      semantic: entry.observation.semantic,
      territory: entry.observation.territory,
    });
    const group = releasePeriodGroups.get(key) ?? [];
    group.push(entry);
    releasePeriodGroups.set(key, group);
  }

  for (const group of releasePeriodGroups.values()) {
    const hasReleaseTotal = group.some(entry =>
      entry.observation.scopeRole === 'release-total'
      && !entry.disposition.startsWith('blocked-')
      && entry.disposition !== 'superseded'
      && entry.disposition !== 'duplicate-noop');

    if (!hasReleaseTotal) continue;

    for (const entry of group) {
      if (
        (
          entry.scopeKind === 'sku'
          || entry.scopeKind === 'format'
        )
        && !entry.disposition.startsWith('blocked-')
        && entry.disposition !== 'superseded'
        && entry.disposition !== 'duplicate-noop'
      ) {
        block(
          entry,
          'scope-detail-only',
          'release-total-overlaps-child-scope',
        );
      }
    }
  }

  // Parallel current observations for the exact same provider/scope/period
  // with different values and no revision relation are conflicts.
  const parallelGroups = new Map<string, MutableEntry[]>();
  for (const entry of entries) {
    if (
      entry.disposition === 'superseded'
      || entry.disposition === 'duplicate-noop'
      || entry.disposition.startsWith('blocked-')
    ) {
      continue;
    }
    const key = seriesCompatibilityKey(
      entry.observation,
      entry.scopeKey,
    );
    const group = parallelGroups.get(key) ?? [];
    group.push(entry);
    parallelGroups.set(key, group);
  }

  for (const group of parallelGroups.values()) {
    if (group.length < 2) continue;
    const values = new Set(group.map(entry => entry.observation.value));
    if (values.size <= 1) continue;
    const hasRevisionEdge = group.some(entry =>
      entry.observation.supersedesObservationId !== null);
    if (hasRevisionEdge) continue;

    for (const entry of group) {
      block(
        entry,
        'blocked-conflict',
        'parallel-observation-value-conflict',
      );
    }
  }

  // When Circle primary and Hanteo secondary overlap on the same resolved
  // release + provider period, Hanteo remains corroboration only. No values
  // are added or averaged.
  const crossProviderGroups = new Map<string, MutableEntry[]>();
  for (const entry of entries) {
    const releaseKey = releaseIdentityKey(entry.observation);
    if (!releaseKey || !entry.observation.providerPeriod) continue;
    const key = sha256Canonical({
      artistId: entry.observation.fandexArtistId,
      releaseKey,
      providerPeriod: entry.observation.providerPeriod,
      semantic: entry.observation.semantic,
      territory: entry.observation.territory,
    });
    const group = crossProviderGroups.get(key) ?? [];
    group.push(entry);
    crossProviderGroups.set(key, group);
  }

  for (const group of crossProviderGroups.values()) {
    const primaryExists = group.some(entry =>
      entry.providerRole === 'primary-historical'
      && entry.disposition === 'primary-normalization-candidate');

    if (!primaryExists) continue;

    for (const entry of group) {
      if (
        entry.providerRole === 'secondary-current-corroboration'
        && !entry.disposition.startsWith('blocked-')
        && entry.disposition !== 'superseded'
        && entry.disposition !== 'duplicate-noop'
      ) {
        entry.disposition = 'secondary-corroboration';
        entry.blockers.push(
          'primary-provider-prevents-secondary-contribution',
        );
      }
    }
  }

  const frozenEntries = entries
    .map((entry): AlbumNormalizationInputEntry => Object.freeze({
      entryId: entryId(entry),
      observationId: entry.observation.observationId,
      providerId: entry.observation.providerId,
      providerRole: entry.providerRole,
      artistId: entry.observation.fandexArtistId,
      releaseId: entry.observation.fandexReleaseId,
      releaseFamilyId: entry.observation.fandexReleaseFamilyId,
      providerReleaseId: entry.observation.providerReleaseId,
      providerEditionId: entry.observation.providerEditionId,
      providerSkuId: entry.observation.providerSkuId,
      providerPeriod: entry.observation.providerPeriod,
      semantic: entry.observation.semantic,
      unit: entry.observation.unit,
      value: entry.observation.value,
      scopeKind: entry.scopeKind,
      scopeKey: entry.scopeKey,
      revisionId: entry.observation.revisionId,
      supersedesObservationId:
        entry.observation.supersedesObservationId,
      disposition: entry.disposition,
      blockers: Object.freeze(
        [...new Set(entry.blockers)].sort(),
      ),
      rawContributionAllowed: false as const,
      additiveContributionAllowed: false as const,
    }))
    .sort((a, b) => a.observationId.localeCompare(b.observationId));

  const primaryCandidateObservationIds = frozenEntries
    .filter(entry =>
      entry.disposition === 'primary-normalization-candidate')
    .map(entry => entry.observationId)
    .sort();
  const secondaryCorroborationObservationIds = frozenEntries
    .filter(entry =>
      entry.disposition === 'secondary-corroboration')
    .map(entry => entry.observationId)
    .sort();
  const supersededObservationIds = frozenEntries
    .filter(entry => entry.disposition === 'superseded')
    .map(entry => entry.observationId)
    .sort();
  const duplicateObservationIds = frozenEntries
    .filter(entry => entry.disposition === 'duplicate-noop')
    .map(entry => entry.observationId)
    .sort();
  const blockedObservationIds = frozenEntries
    .filter(entry => entry.disposition.startsWith('blocked-'))
    .map(entry => entry.observationId)
    .sort();
  const excludedDetailObservationIds = frozenEntries
    .filter(entry => entry.disposition === 'scope-detail-only')
    .map(entry => entry.observationId)
    .sort();

  return Object.freeze({
    contractVersion: ALBUM_NORMALIZATION_INPUT_CONTRACT_VERSION,
    methodologyDefined: true as const,
    providerPolicy: Object.freeze({
      primaryProviderId: 'circle-chart' as const,
      secondaryProviderId: 'hanteo-chart' as const,
      primaryRequiresHistoricalQueries: true as const,
      primaryRequiresRevisionSupport: true as const,
      secondaryMayCorroborateCurrentEvidence: true as const,
      secondaryMayReplacePrimary: false as const,
    }),
    entries: Object.freeze(frozenEntries),
    primaryCandidateObservationIds:
      Object.freeze(primaryCandidateObservationIds),
    secondaryCorroborationObservationIds:
      Object.freeze(secondaryCorroborationObservationIds),
    supersededObservationIds:
      Object.freeze(supersededObservationIds),
    blockedObservationIds:
      Object.freeze(blockedObservationIds),
    excludedDetailObservationIds:
      Object.freeze(excludedDetailObservationIds),
    duplicateObservationIds:
      Object.freeze(duplicateObservationIds),
    inputSetUsable:
      primaryCandidateObservationIds.length > 0
      && blockedObservationIds.length === 0,
    rawProviderAdditionAllowed: false as const,
    crossProviderAdditionAllowed: false as const,
    parentChildAdditionAllowed: false as const,
    skuAdditionToReleaseAllowed: false as const,
    numericNormalizationDefined: false as const,
    normalizedValue: null,
    scoreFieldsPresent: false as const,
  });
}
