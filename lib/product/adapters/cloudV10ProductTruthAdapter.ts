import {
  makeAvailableProductNumericFact,
  makeNotRankedProductNumericFact,
  makeUnavailableProductNumericFact,
} from '../contracts/productNumericFact';
import type { ProductNumericFact } from '../contracts/productNumericFact';
import type {
  ProductFreshness,
  ProductPresentation,
} from '../contracts/productState';
import type { ProductSourceAttribution } from '../contracts/productSource';
import type {
  ProductDataTime,
  ProductObservationTime,
} from '../contracts/productTime';

export type CloudV10ProductTruth = Readonly<{
  fact: ProductNumericFact;
  freshness: ProductFreshness;
  presentation: ProductPresentation;
  dataTime: ProductDataTime;
  sourceAttribution: ProductSourceAttribution;
}>;

export type CloudV10ProductTruthIssue =
  | 'non-finite-value'
  | 'source-status-value-mismatch'
  | 'unsupported-source-status'
  | 'unsupported-artifact-mode';

export type CloudV10ProductTruthResult =
  | Readonly<{
      status: 'ok';
      truth: CloudV10ProductTruth;
    }>
  | Readonly<{
      status: 'data-issue';
      reason: CloudV10ProductTruthIssue;
    }>;

function unknownObservation(): ProductObservationTime {
  return Object.freeze({ kind: 'unknown' } as const);
}

function observationFromDate(
  value: string | null,
): ProductObservationTime {
  const normalized = value?.trim();

  if (!normalized) {
    return unknownObservation();
  }

  return Object.freeze({
    kind: 'instant',
    observedAt: normalized,
  } as const);
}

function optionalTimestamp(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function issue(
  reason: CloudV10ProductTruthIssue,
): CloudV10ProductTruthResult {
  return Object.freeze({
    status: 'data-issue',
    reason,
  });
}

function success(
  truth: CloudV10ProductTruth,
): CloudV10ProductTruthResult {
  return Object.freeze({
    status: 'ok',
    truth: Object.freeze(truth),
  });
}

export type ExplicitUnavailableTruthInput = Readonly<{
  availability: 'UNAVAILABLE';
  sourceKey: string | null;
  sourceLabel: string | null;
  updatedAt: string | null;
}>;

export function adaptExplicitUnavailableTruth(
  input: ExplicitUnavailableTruthInput,
): CloudV10ProductTruthResult {
  return success({
    fact: makeUnavailableProductNumericFact(),
    freshness: 'unknown',
    presentation: 'standard',
    dataTime: Object.freeze({
      dataAsOf: unknownObservation(),
      updatedAt: optionalTimestamp(input.updatedAt),
    }),
    sourceAttribution: Object.freeze({
      sourceKey: input.sourceKey?.trim() || null,
      sourceLabel: input.sourceLabel?.trim() || null,
    }),
  });
}

export type MusicPlatformTruthInput = Readonly<{
  status: string;
  point: number | null;
  snapshotDate: string | null;
  createdAt: string | null;
  version: string | null;
  usage: string | null;
}>;

export function adaptMusicPlatformTruth(
  input: MusicPlatformTruthInput,
): CloudV10ProductTruthResult {
  if (input.usage !== 'parallel_candidate_only') {
    return issue('unsupported-artifact-mode');
  }

  let fact: ProductNumericFact;

  if (input.status === 'RANKED') {
    if (typeof input.point !== 'number' || !Number.isFinite(input.point)) {
      return issue('non-finite-value');
    }

    fact = makeAvailableProductNumericFact(input.point);
  } else if (input.status === 'NOT_RANKED') {
    if (input.point !== 0) {
      return issue('source-status-value-mismatch');
    }

    fact = makeNotRankedProductNumericFact();
  } else {
    return issue('unsupported-source-status');
  }

  return success({
    fact,
    freshness: 'unknown',
    presentation: 'preview',
    dataTime: Object.freeze({
      dataAsOf: observationFromDate(input.snapshotDate),
      updatedAt: optionalTimestamp(input.createdAt),
    }),
    sourceAttribution: Object.freeze({
      sourceKey: 'music',
      sourceLabel: input.version?.trim() || null,
    }),
  });
}

export type LastFmRollingPreviewTruthInput = Readonly<{
  version: string | null;
  latestDate: string | null;
  status: string;
  rollingCombinedPreviewPoint: number | null;
}>;

export function adaptLastFmRollingPreviewTruth(
  input: LastFmRollingPreviewTruthInput,
): CloudV10ProductTruthResult {
  if (!input.version?.includes('preview')) {
    return issue('unsupported-artifact-mode');
  }

  if (input.status !== 'ok') {
    return issue('unsupported-source-status');
  }

  if (
    typeof input.rollingCombinedPreviewPoint !== 'number' ||
    !Number.isFinite(input.rollingCombinedPreviewPoint)
  ) {
    return issue('non-finite-value');
  }

  return success({
    fact: makeAvailableProductNumericFact(
      input.rollingCombinedPreviewPoint,
    ),
    freshness: 'unknown',
    presentation: 'preview',
    dataTime: Object.freeze({
      dataAsOf: observationFromDate(input.latestDate),
      updatedAt: null,
    }),
    sourceAttribution: Object.freeze({
      sourceKey: 'lastfm',
      sourceLabel: input.version.trim(),
    }),
  });
}

export type FrozenCutoverTruthInput = Readonly<{
  source: string | null;
  note: string | null;
  createdAt: string | null;
  value: number | null;
}>;

function adaptFrozenCutoverTruth(
  sourceKey: 'naver' | 'youtube',
  input: FrozenCutoverTruthInput,
): CloudV10ProductTruthResult {
  if (
    input.source !== 'production_v10_status_snapshot' ||
    !input.note?.toLowerCase().includes('cutover')
  ) {
    return issue('unsupported-artifact-mode');
  }

  if (typeof input.value !== 'number' || !Number.isFinite(input.value)) {
    return issue('non-finite-value');
  }

  return success({
    fact: makeAvailableProductNumericFact(input.value),
    freshness: 'frozen',
    presentation: 'standard',
    dataTime: Object.freeze({
      dataAsOf: unknownObservation(),
      updatedAt: optionalTimestamp(input.createdAt),
    }),
    sourceAttribution: Object.freeze({
      sourceKey,
      sourceLabel: input.source,
    }),
  });
}

export function adaptNaverFrozenCutoverTruth(
  input: FrozenCutoverTruthInput,
): CloudV10ProductTruthResult {
  return adaptFrozenCutoverTruth('naver', input);
}

export function adaptYouTubeFrozenCutoverTruth(
  input: FrozenCutoverTruthInput,
): CloudV10ProductTruthResult {
  return adaptFrozenCutoverTruth('youtube', input);
}