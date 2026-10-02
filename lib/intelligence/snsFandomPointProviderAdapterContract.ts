import type { SnsFandomObservationRecord } from './snsFandomPointObservationContract';

export const SNS_FANDOM_PROVIDER_ADAPTER_CONTRACT_VERSION =
  'sns-fandom-provider-adapter-contract-v1' as const;

export type SnsFandomProviderAdapterState =
  | 'registered'
  | 'blocked-by-rights'
  | 'ready-for-collection'
  | 'collecting'
  | 'failed-closed';

export type SnsFandomProviderAdapterContext = Readonly<{
  providerId: string;
  artistIdentityRef: string;
  observationWindowStart: string;
  observationWindowEnd: string;
}>;

export type SnsFandomProviderCollectionResult = Readonly<{
  providerId: string;
  state: 'collected' | 'empty' | 'blocked' | 'failed';
  observations: readonly SnsFandomObservationRecord[];
  blockers: readonly string[];
}>;

/**
 * Provider adapters only translate authorized provider responses into
 * observation records.
 *
 * They must not:
 * - calculate final snsFandomPoint;
 * - normalize cross-provider values;
 * - convert missing data into zero;
 * - bypass provider rights qualification.
 */
export interface SnsFandomProviderAdapter {
  readonly contractVersion: typeof SNS_FANDOM_PROVIDER_ADAPTER_CONTRACT_VERSION;
  readonly providerId: string;

  getState(): SnsFandomProviderAdapterState;

  collect(
    context: SnsFandomProviderAdapterContext,
  ): Promise<SnsFandomProviderCollectionResult>;
}

export function isCollectionEligibleAdapterState(
  state: SnsFandomProviderAdapterState,
): boolean {
  return state === 'ready-for-collection' || state === 'collecting';
}
