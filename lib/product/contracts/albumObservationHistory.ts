import { sha256Canonical } from '../../shared/canonicalDigest';
import {
  buildDirectAlbumObservationId,
  type DirectAlbumObservation,
  type DirectAlbumObservationSemantic,
} from '../../alternative-evidence/directAlbumProvider';

export const ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION =
  'album-observation-history-v1' as const;

const PRODUCT_PURCHASE_SEMANTICS = Object.freeze(
  new Set<DirectAlbumObservationSemantic>([
    'consumer-retail-sale',
    'retailer-panel-sale',
    'period-sale',
    'first-day-sale',
    'first-week-sale',
    'cumulative-sale',
  ]),
);

export type AlbumObservationHistoryEntry = Readonly<{
  contractVersion:
    typeof ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION;
  historyEntryId: string;
  observationId: string;
  seriesId: string;
  observation: DirectAlbumObservation;
  acquisitionTimes: readonly string[];
  firstCollectedAt: string;
  lastCollectedAt: string;
  acquisitionCount: number;
}>;

export type AlbumObservationHistory = Readonly<{
  contractVersion:
    typeof ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION;
  historyClass: 'production-observation-history';
  entries: readonly AlbumObservationHistoryEntry[];
  revisionAware: true;
  asKnownAtCollectionOnly: true;
  syntheticAllowed: false;
  additiveRevisionCountingAllowed: false;
  scoreFieldsPresent: false;
}>;

export type AlbumObservationAsOfRow = Readonly<{
  observationId: string;
  seriesId: string;
  providerId: string;
  artistId: string;
  releaseId: string | null;
  releaseFamilyId: string | null;
  providerPeriod: string;
  semantic: DirectAlbumObservation['semantic'];
  value: number;
  unit: 'physical-units';
  revisionId: string | null;
  supersedesObservationId: string | null;
  firstKnownAt: string;
  latestAcquiredAt: string;
  state: 'active' | 'superseded';
}>;

export type AlbumObservationAsOfRead =
  | Readonly<{
      status: 'ok';
      contractVersion:
        typeof ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION;
      asOf: string;
      rows: readonly AlbumObservationAsOfRow[];
      activeRows: readonly AlbumObservationAsOfRow[];
      supersededRows: readonly AlbumObservationAsOfRow[];
      scoreFieldsPresent: false;
      additiveRevisionCountingAllowed: false;
    }>
  | Readonly<{
      status: 'data-issue';
      contractVersion:
        typeof ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION;
      asOf: string;
      issues: readonly [string, ...string[]];
      scoreFieldsPresent: false;
      additiveRevisionCountingAllowed: false;
    }>;

function instant(value: string): number {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new Error(
      `album_observation_history_offset_required:${value}`,
    );
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(
      `album_observation_history_invalid_instant:${value}`,
    );
  }
  return parsed;
}

function observationSeriesId(
  observation: DirectAlbumObservation,
): string {
  return sha256Canonical({
    providerId: observation.providerId,
    providerArtistId: observation.providerArtistId,
    providerReleaseId: observation.providerReleaseId,
    providerEditionId: observation.providerEditionId,
    providerSkuId: observation.providerSkuId,
    fandexArtistId: observation.fandexArtistId,
    fandexReleaseId: observation.fandexReleaseId,
    fandexReleaseFamilyId: observation.fandexReleaseFamilyId,
    semantic: observation.semantic,
    unit: observation.unit,
    territory: observation.territory,
    format: observation.format,
    providerPeriod: observation.providerPeriod,
    scopeRole: observation.scopeRole,
    parentObservationId: observation.parentObservationId,
  });
}

function assertObservationBoundary(
  observation: DirectAlbumObservation,
): void {
  const rebuilt = buildDirectAlbumObservationId({
    providerId: observation.providerId,
    providerObservationId: observation.providerObservationId,
    providerArtistId: observation.providerArtistId,
    providerReleaseId: observation.providerReleaseId,
    providerEditionId: observation.providerEditionId,
    providerSkuId: observation.providerSkuId,
    semantic: observation.semantic,
    value: observation.value,
    unit: observation.unit,
    territory: observation.territory,
    format: observation.format,
    providerPeriod: observation.providerPeriod,
    revisionId: observation.revisionId,
  });

  if (rebuilt !== observation.observationId) {
    throw new Error(
      'album_observation_history_observation_id_mismatch',
    );
  }
  if (observation.syntheticFixture) {
    throw new Error(
      'album_observation_history_synthetic_forbidden',
    );
  }
  if (observation.knowledgeMode !== 'as-known-at-collection') {
    throw new Error(
      'album_observation_history_requires_as_known_at_collection',
    );
  }
  if (!observation.fandexArtistId) {
    throw new Error(
      'album_observation_history_artist_identity_required',
    );
  }
  if (
    !observation.fandexReleaseId
    && !observation.fandexReleaseFamilyId
  ) {
    throw new Error(
      'album_observation_history_release_identity_required',
    );
  }
  if (!observation.providerPeriod) {
    throw new Error(
      'album_observation_history_provider_period_required',
    );
  }
  if (
    observation.unit !== 'physical-units'
    || observation.value === null
    || !PRODUCT_PURCHASE_SEMANTICS.has(observation.semantic)
  ) {
    throw new Error(
      'album_observation_history_physical_purchase_required',
    );
  }
  instant(observation.observedAt);
  instant(observation.collectedAt);
  if (observation.revisionObservedAt !== null) {
    instant(observation.revisionObservedAt);
  }
  if (
    observation.supersedesObservationId !== null
    && observation.revisionId === null
  ) {
    throw new Error(
      'album_observation_history_supersession_requires_revision_id',
    );
  }
}

function sameObservationPayload(
  left: DirectAlbumObservation,
  right: DirectAlbumObservation,
): boolean {
  return left.observationId === right.observationId
    && observationSeriesId(left) === observationSeriesId(right)
    && left.value === right.value
    && left.revisionId === right.revisionId
    && left.supersedesObservationId
      === right.supersedesObservationId
    && left.providerPublishedAt === right.providerPublishedAt
    && left.revisionObservedAt === right.revisionObservedAt;
}

function buildEntry(
  observation: DirectAlbumObservation,
): AlbumObservationHistoryEntry {
  const seriesId = observationSeriesId(observation);
  const acquisitionTimes = Object.freeze([
    observation.collectedAt,
  ]);

  return Object.freeze({
    contractVersion:
      ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION,
    historyEntryId: sha256Canonical({
      contractVersion:
        ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION,
      observationId: observation.observationId,
      seriesId,
    }),
    observationId: observation.observationId,
    seriesId,
    observation,
    acquisitionTimes,
    firstCollectedAt: observation.collectedAt,
    lastCollectedAt: observation.collectedAt,
    acquisitionCount: 1,
  });
}

function validateEntry(
  entry: AlbumObservationHistoryEntry,
): void {
  assertObservationBoundary(entry.observation);

  const expected = buildEntry(entry.observation);
  if (
    entry.contractVersion
      !== ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION
    || entry.historyEntryId !== expected.historyEntryId
    || entry.observationId !== entry.observation.observationId
    || entry.seriesId !== expected.seriesId
    || entry.acquisitionCount < 1
    || !Number.isInteger(entry.acquisitionCount)
    || entry.acquisitionTimes.length !== entry.acquisitionCount
  ) {
    throw new Error(
      'album_observation_history_entry_invalid',
    );
  }

  const sorted = [...new Set(entry.acquisitionTimes)].sort(
    (a, b) => instant(a) - instant(b),
  );
  if (sorted.length !== entry.acquisitionTimes.length) {
    throw new Error(
      'album_observation_history_duplicate_acquisition_time',
    );
  }
  if (
    sorted[0] !== entry.firstCollectedAt
    || sorted[sorted.length - 1] !== entry.lastCollectedAt
  ) {
    throw new Error(
      'album_observation_history_collection_range_invalid',
    );
  }
}

function validateRevisionGraph(
  entries: readonly AlbumObservationHistoryEntry[],
): void {
  const byId = new Map(
    entries.map(entry => [entry.observationId, entry]),
  );
  const childrenByParent = new Map<
    string,
    AlbumObservationHistoryEntry[]
  >();

  for (const entry of entries) {
    const parentId =
      entry.observation.supersedesObservationId;
    if (!parentId) continue;

    const parent = byId.get(parentId);
    if (!parent) {
      throw new Error(
        'album_observation_history_revision_parent_missing',
      );
    }
    if (parent.seriesId !== entry.seriesId) {
      throw new Error(
        'album_observation_history_revision_series_mismatch',
      );
    }
    if (
      instant(parent.firstCollectedAt)
      > instant(entry.firstCollectedAt)
    ) {
      throw new Error(
        'album_observation_history_revision_known_before_parent',
      );
    }

    const children = childrenByParent.get(parentId) ?? [];
    children.push(entry);
    childrenByParent.set(parentId, children);
  }

  for (const children of childrenByParent.values()) {
    if (children.length > 1) {
      throw new Error(
        'album_observation_history_revision_branch_conflict',
      );
    }
  }

  for (const entry of entries) {
    const seen = new Set<string>();
    let cursor: AlbumObservationHistoryEntry | undefined =
      entry;
    while (cursor?.observation.supersedesObservationId) {
      if (seen.has(cursor.observationId)) {
        throw new Error(
          'album_observation_history_revision_cycle',
        );
      }
      seen.add(cursor.observationId);
      cursor = byId.get(
        cursor.observation.supersedesObservationId,
      );
    }
  }
}

export function appendAlbumObservationHistory(input: Readonly<{
  existing?: AlbumObservationHistory;
  observations: readonly DirectAlbumObservation[];
}>): AlbumObservationHistory {
  const byId = new Map<string, AlbumObservationHistoryEntry>();

  if (input.existing !== undefined) {
    if (
      input.existing.contractVersion
        !== ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION
      || input.existing.historyClass
        !== 'production-observation-history'
      || input.existing.revisionAware !== true
      || input.existing.asKnownAtCollectionOnly !== true
      || input.existing.syntheticAllowed !== false
      || input.existing.additiveRevisionCountingAllowed !== false
      || input.existing.scoreFieldsPresent !== false
    ) {
      throw new Error(
        'album_observation_history_contract_invalid',
      );
    }
  }

  for (const entry of input.existing?.entries ?? []) {
    validateEntry(entry);
    if (byId.has(entry.observationId)) {
      throw new Error(
        'album_observation_history_duplicate_existing_observation_id',
      );
    }
    byId.set(entry.observationId, entry);
  }

  for (const observation of input.observations) {
    assertObservationBoundary(observation);
    const previous = byId.get(observation.observationId);

    if (!previous) {
      byId.set(
        observation.observationId,
        buildEntry(observation),
      );
      continue;
    }

    if (
      !sameObservationPayload(
        previous.observation,
        observation,
      )
    ) {
      throw new Error(
        'album_observation_history_observation_identity_collision',
      );
    }

    const acquisitionTimes = [...new Set([
      ...previous.acquisitionTimes,
      observation.collectedAt,
    ])].sort((a, b) => instant(a) - instant(b));

    byId.set(
      observation.observationId,
      Object.freeze({
        ...previous,
        acquisitionTimes: Object.freeze(acquisitionTimes),
        firstCollectedAt: acquisitionTimes[0],
        lastCollectedAt:
          acquisitionTimes[acquisitionTimes.length - 1],
        acquisitionCount: acquisitionTimes.length,
        observation:
          instant(observation.collectedAt)
            >= instant(previous.lastCollectedAt)
            ? observation
            : previous.observation,
      }),
    );
  }

  const entries = [...byId.values()].sort((a, b) => {
    const time =
      instant(a.firstCollectedAt)
      - instant(b.firstCollectedAt);
    return time !== 0
      ? time
      : a.observationId.localeCompare(b.observationId);
  });

  for (const entry of entries) validateEntry(entry);
  validateRevisionGraph(entries);

  return Object.freeze({
    contractVersion:
      ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION,
    historyClass: 'production-observation-history' as const,
    entries: Object.freeze(entries),
    revisionAware: true as const,
    asKnownAtCollectionOnly: true as const,
    syntheticAllowed: false as const,
    additiveRevisionCountingAllowed: false as const,
    scoreFieldsPresent: false as const,
  });
}

export function readAlbumObservationHistoryAsOf(
  history: AlbumObservationHistory,
  asOf: string,
): AlbumObservationAsOfRead {
  const asOfMs = instant(asOf);
  const issues: string[] = [];

  if (
    history.contractVersion
      !== ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION
    || history.historyClass !== 'production-observation-history'
    || history.revisionAware !== true
    || history.asKnownAtCollectionOnly !== true
    || history.syntheticAllowed !== false
    || history.additiveRevisionCountingAllowed !== false
    || history.scoreFieldsPresent !== false
  ) {
    issues.push('album_observation_history_contract_invalid');
  }

  for (const entry of history.entries) {
    try {
      validateEntry(entry);
    } catch (error) {
      issues.push(
        error instanceof Error
          ? error.message
          : 'album_observation_history_entry_invalid',
      );
    }
  }

  if (issues.length > 0) {
    return Object.freeze({
      status: 'data-issue' as const,
      contractVersion:
        ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION,
      asOf,
      issues: Object.freeze(
        [...new Set(issues)].sort(),
      ) as readonly [string, ...string[]],
      scoreFieldsPresent: false as const,
      additiveRevisionCountingAllowed: false as const,
    });
  }

  const visible = history.entries
    .map(entry => {
      const eligibleAcquisitions =
        entry.acquisitionTimes.filter(
          value => instant(value) <= asOfMs,
        );
      if (eligibleAcquisitions.length === 0) return null;
      return Object.freeze({
        entry,
        firstKnownAt: eligibleAcquisitions[0],
        latestAcquiredAt:
          eligibleAcquisitions[
            eligibleAcquisitions.length - 1
          ],
      });
    })
    .filter((value): value is NonNullable<typeof value> =>
      value !== null);

  const visibleById = new Map(
    visible.map(value => [
      value.entry.observationId,
      value,
    ]),
  );
  const supersededIds = new Set<string>();
  const childrenByParent = new Map<string, string[]>();

  for (const value of visible) {
    const parentId =
      value.entry.observation.supersedesObservationId;
    if (!parentId) continue;

    if (!visibleById.has(parentId)) {
      issues.push(
        `visible-revision-parent-not-known:${value.entry.observationId}`,
      );
      continue;
    }

    const children = childrenByParent.get(parentId) ?? [];
    children.push(value.entry.observationId);
    childrenByParent.set(parentId, children);
    supersededIds.add(parentId);
  }

  for (const [parentId, children] of childrenByParent) {
    if (children.length > 1) {
      issues.push(
        `visible-revision-branch-conflict:${parentId}`,
      );
    }
  }

  if (issues.length > 0) {
    return Object.freeze({
      status: 'data-issue' as const,
      contractVersion:
        ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION,
      asOf,
      issues: Object.freeze(
        [...new Set(issues)].sort(),
      ) as readonly [string, ...string[]],
      scoreFieldsPresent: false as const,
      additiveRevisionCountingAllowed: false as const,
    });
  }

  const rows = visible
    .map(({ entry, firstKnownAt, latestAcquiredAt }) => {
      const observation = entry.observation;
      return Object.freeze({
        observationId: observation.observationId,
        seriesId: entry.seriesId,
        providerId: observation.providerId,
        artistId: observation.fandexArtistId!,
        releaseId: observation.fandexReleaseId,
        releaseFamilyId:
          observation.fandexReleaseFamilyId,
        providerPeriod: observation.providerPeriod!,
        semantic: observation.semantic,
        value: observation.value!,
        unit: 'physical-units' as const,
        revisionId: observation.revisionId,
        supersedesObservationId:
          observation.supersedesObservationId,
        firstKnownAt,
        latestAcquiredAt,
        state: supersededIds.has(observation.observationId)
          ? 'superseded' as const
          : 'active' as const,
      });
    })
    .sort((a, b) => {
      const series = a.seriesId.localeCompare(b.seriesId);
      if (series !== 0) return series;
      const time =
        instant(a.firstKnownAt) - instant(b.firstKnownAt);
      return time !== 0
        ? time
        : a.observationId.localeCompare(b.observationId);
    });

  return Object.freeze({
    status: 'ok' as const,
    contractVersion:
      ALBUM_OBSERVATION_HISTORY_CONTRACT_VERSION,
    asOf,
    rows: Object.freeze(rows),
    activeRows: Object.freeze(
      rows.filter(row => row.state === 'active'),
    ),
    supersededRows: Object.freeze(
      rows.filter(row => row.state === 'superseded'),
    ),
    scoreFieldsPresent: false as const,
    additiveRevisionCountingAllowed: false as const,
  });
}
