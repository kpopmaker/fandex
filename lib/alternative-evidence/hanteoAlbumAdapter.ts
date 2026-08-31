import { sha256Canonical } from '../shared/canonicalDigest';
import {
  buildDirectAlbumObservation,
  validateDirectAlbumObservation,
  type DirectAlbumObservation,
  type DirectAlbumProviderDescriptor,
} from './directAlbumProvider';
import { HANTEO_EVIDENCE_DESCRIPTOR } from './directProviderEvidence';
import {
  qualifyHanteoAlbumRow,
  type HanteoAlbumCurrentTimeframe,
  type HanteoAlbumDecodedResponse,
  type HanteoAlbumQualifiedRow,
} from './hanteoAlbumDiscovery';
import {
  isResolved,
  type IdentityResolutionState,
  type IdentityReviewState,
} from './identityFoundation';

export const HANTEO_ALBUM_ADAPTER_CONTRACT_VERSION = 'hanteo-album-adapter-v1' as const;

export type HanteoAlbumIdentityResolution = Readonly<{
  fandexArtistId: string | null;
  fandexReleaseId: string | null;
  fandexReleaseFamilyId: string | null;
  artistResolutionState: IdentityResolutionState;
  artistReviewState: IdentityReviewState;
  releaseResolutionState: IdentityResolutionState;
  releaseReviewState: IdentityReviewState;
  evidenceIds: readonly string[];
}>;

export type HanteoAlbumIdentityResolver = (
  row: HanteoAlbumQualifiedRow,
  rowIndex: number,
) => HanteoAlbumIdentityResolution | null;

export type HanteoAlbumAdapterRejectionCode =
  | 'source-row-invalid'
  | 'quantity-invalid'
  | 'artist-identity-unresolved'
  | 'release-identity-unresolved'
  | 'identity-evidence-missing';

export type HanteoAlbumAdapterRejection = Readonly<{
  rowIndex: number;
  providerTargetId: string | null;
  providerArtistId: string | null;
  releaseRaw: string | null;
  artistRaw: string | null;
  reasons: readonly HanteoAlbumAdapterRejectionCode[];
}>;

export type HanteoAlbumAdapterResult = Readonly<{
  contractVersion: typeof HANTEO_ALBUM_ADAPTER_CONTRACT_VERSION;
  providerId: 'hanteo-chart';
  timeframe: HanteoAlbumCurrentTimeframe;
  providerPeriod: string;
  sourceDigest: string;
  observations: readonly DirectAlbumObservation[];
  rejections: readonly HanteoAlbumAdapterRejection[];
  quantityEvidenceId: string;
  historicalExactCopiesEligible: false;
  liveEligible: false;
  featureBridgeEligible: false;
  adapterDigest: string;
}>;

function validInstant(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function strongIdentity(identity: HanteoAlbumIdentityResolution): Readonly<{
  artistResolved: boolean;
  releaseResolved: boolean;
}> {
  return Object.freeze({
    artistResolved: isResolved(
      identity.artistResolutionState,
      identity.fandexArtistId,
      identity.artistReviewState,
    ),
    releaseResolved: isResolved(
      identity.releaseResolutionState,
      identity.fandexReleaseId,
      identity.releaseReviewState,
    ),
  });
}

function normalizedProviderPeriod(
  timeframe: HanteoAlbumCurrentTimeframe,
  label: string | null,
): string {
  if (!label || label.trim() === '') throw new Error('hanteo-adapter-provider-period-missing');
  return `${timeframe}:${label.trim()}`;
}

function rejection(
  rowIndex: number,
  row: HanteoAlbumQualifiedRow | null,
  reasons: readonly HanteoAlbumAdapterRejectionCode[],
): HanteoAlbumAdapterRejection {
  return Object.freeze({
    rowIndex,
    providerTargetId: row?.providerTargetId ?? null,
    providerArtistId: row?.providerArtistId ?? null,
    releaseRaw: row?.releaseRaw ?? null,
    artistRaw: row?.artistRaw ?? null,
    reasons: Object.freeze([...new Set(reasons)]),
  });
}

export function adaptHanteoCurrentAlbumResponse(input: Readonly<{
  decoded: HanteoAlbumDecodedResponse;
  timeframe: HanteoAlbumCurrentTimeframe;
  observedAt: string;
  collectedAt: string;
  quantityEvidenceId: string;
  resolveIdentity: HanteoAlbumIdentityResolver;
  syntheticFixture?: boolean;
}>): HanteoAlbumAdapterResult {
  if (input.decoded.responseState !== 'success') {
    throw new Error('hanteo-adapter-response-not-success');
  }
  if (!validInstant(input.observedAt)) throw new Error('hanteo-adapter-observed-at-invalid');
  if (!validInstant(input.collectedAt)) throw new Error('hanteo-adapter-collected-at-invalid');
  if (input.quantityEvidenceId.trim() === '') throw new Error('hanteo-adapter-quantity-evidence-id-required');

  const providerPeriod = normalizedProviderPeriod(input.timeframe, input.decoded.providerPeriodLabel);
  const observations: DirectAlbumObservation[] = [];
  const rejections: HanteoAlbumAdapterRejection[] = [];

  input.decoded.rows.forEach((rawRow, rowIndex) => {
    let row: HanteoAlbumQualifiedRow;
    try {
      row = qualifyHanteoAlbumRow(rawRow, { quantityEvidenceId: input.quantityEvidenceId });
    } catch {
      rejections.push(rejection(rowIndex, null, ['source-row-invalid', 'quantity-invalid']));
      return;
    }

    const reasons: HanteoAlbumAdapterRejectionCode[] = [];
    const identity = input.resolveIdentity(row, rowIndex);
    if (!identity) {
      reasons.push('artist-identity-unresolved', 'release-identity-unresolved', 'identity-evidence-missing');
    } else {
      const resolved = strongIdentity(identity);
      if (!resolved.artistResolved) reasons.push('artist-identity-unresolved');
      if (!resolved.releaseResolved) reasons.push('release-identity-unresolved');
      if (identity.evidenceIds.length === 0) reasons.push('identity-evidence-missing');
    }

    if (reasons.length > 0 || !identity) {
      rejections.push(rejection(rowIndex, row, reasons));
      return;
    }

    observations.push(buildDirectAlbumObservation({
      contractVersion: 'direct-album-observation-v1',
      providerId: 'hanteo-chart',
      providerObservationId: `${row.providerTargetId}|${providerPeriod}`,
      providerArtistId: row.providerArtistId,
      // targetIdx is preserved as Hanteo's chart-target/release identity candidate.
      // Its exact release-vs-edition level is still unresolved, so capability
      // supportsReleaseIdentity remains unknown even though the raw ID is retained.
      providerReleaseId: row.providerTargetId,
      providerEditionId: null,
      providerSkuId: null,
      fandexArtistId: identity.fandexArtistId,
      fandexReleaseId: identity.fandexReleaseId,
      fandexReleaseFamilyId: identity.fandexReleaseFamilyId,
      semantic: 'period-sale',
      value: row.salesCopies,
      unit: 'physical-units',
      territory: null,
      format: null,
      providerPeriod,
      providerPublishedAt: null,
      observedAt: input.observedAt,
      collectedAt: input.collectedAt,
      revisionId: null,
      revisionObservedAt: null,
      supersedesObservationId: null,
      knowledgeMode: 'current-research',
      scopeRole: 'standalone',
      parentObservationId: null,
      syntheticFixture: input.syntheticFixture ?? false,
    }));
  });

  const digestShape = {
    contractVersion: HANTEO_ALBUM_ADAPTER_CONTRACT_VERSION,
    providerId: 'hanteo-chart' as const,
    timeframe: input.timeframe,
    providerPeriod,
    sourceDigest: input.decoded.rawDigest,
    observationIds: observations.map(observation => observation.observationId),
    rejections,
    quantityEvidenceId: input.quantityEvidenceId,
    historicalExactCopiesEligible: false as const,
    liveEligible: false as const,
    featureBridgeEligible: false as const,
  };

  return Object.freeze({
    ...digestShape,
    observations: Object.freeze(observations),
    rejections: Object.freeze(rejections),
    adapterDigest: sha256Canonical(digestShape),
  });
}

export function validateHanteoCurrentObservations(
  observations: readonly DirectAlbumObservation[],
  descriptor: DirectAlbumProviderDescriptor = HANTEO_EVIDENCE_DESCRIPTOR,
): Readonly<{ valid: boolean; issues: readonly string[] }> {
  const issues = observations.flatMap(observation =>
    validateDirectAlbumObservation(observation, descriptor, {
      allowSyntheticUnknownCapabilities: observation.syntheticFixture,
    }).issues,
  );
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze([...new Set(issues)].sort()),
  });
}

export class HanteoAlbumLiveGateError extends Error {
  readonly code = 'hanteo-album-live-calls-disabled' as const;
  constructor() {
    super('hanteo_album_live_calls_disabled');
    this.name = 'HanteoAlbumLiveGateError';
  }
}

export const HANTEO_ALBUM_ADAPTER = Object.freeze({
  descriptor: HANTEO_EVIDENCE_DESCRIPTOR,
  normalizeCurrentResponse: adaptHanteoCurrentAlbumResponse,
  executeLive: async (): Promise<never> => {
    throw new HanteoAlbumLiveGateError();
  },
});
