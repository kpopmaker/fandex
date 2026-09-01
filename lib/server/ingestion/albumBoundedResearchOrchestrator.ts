import { sha256Canonical } from '../../shared/canonicalDigest';
import type {
  AlbumCollectorPlan,
  AlbumCollectorPlannedRequest,
  AlbumCollectorProvider,
} from './albumCollectorPlan';

export const ALBUM_BOUNDED_RESEARCH_ORCHESTRATOR_VERSION = 'album-bounded-research-orchestrator-v1' as const;
export const ALBUM_BOUNDED_RESEARCH_MAX_REQUESTS = 20 as const;

export type AlbumBoundedResearchExecutorKind = 'fixture' | 'live-network';
export type AlbumBoundedResearchExecutionStatus =
  | 'ok'
  | 'http-error'
  | 'schema-drift'
  | 'quantity-field-missing'
  | 'provider-semantic-conflict';

export type AlbumBoundedResearchAuthorization = Readonly<{
  boundedResearchImplementationAuthorized: boolean;
  fixtureExecutionAuthorized: boolean;
  liveNetworkExecutionAuthorized: boolean;
  liveNetworkGrantDigest: string | null;
  globalEnabled: boolean;
  providerEnabled: Readonly<Record<AlbumCollectorProvider, boolean>>;
  persistenceAuthorized: false;
  scheduleMutationAuthorized: false;
  environmentMutationAuthorized: false;
}>;

export const DEFAULT_ALBUM_BOUNDED_RESEARCH_AUTHORIZATION: AlbumBoundedResearchAuthorization = Object.freeze({
  boundedResearchImplementationAuthorized: true,
  fixtureExecutionAuthorized: false,
  liveNetworkExecutionAuthorized: false,
  liveNetworkGrantDigest: null,
  globalEnabled: false,
  providerEnabled: Object.freeze({
    'circle-retail': false,
    hanteo: false,
  }),
  persistenceAuthorized: false,
  scheduleMutationAuthorized: false,
  environmentMutationAuthorized: false,
});

export type AlbumBoundedResearchExecutorResult = Readonly<{
  status: AlbumBoundedResearchExecutionStatus;
  httpStatus?: number;
  providerResultCode?: string | number | null;
  rowCount?: number | null;
  payloadDigest?: string | null;
  evidenceIds?: readonly string[];
}>;

export type AlbumBoundedResearchExecutor = Readonly<{
  kind: AlbumBoundedResearchExecutorKind;
  authorizationDigest?: string | null;
  execute(request: AlbumCollectorPlannedRequest): Promise<AlbumBoundedResearchExecutorResult>;
}>;

export type AlbumBoundedResearchAttempt = Readonly<{
  requestIndex: number;
  provider: AlbumCollectorProvider;
  timeframe: AlbumCollectorPlannedRequest['timeframe'];
  periodMode: AlbumCollectorPlannedRequest['periodMode'];
  status: AlbumBoundedResearchExecutionStatus;
  httpStatus: number | null;
  rowCount: number | null;
  payloadDigest: string | null;
  haltReason: string | null;
}>;

export type AlbumBoundedResearchReport = Readonly<{
  orchestratorVersion: typeof ALBUM_BOUNDED_RESEARCH_ORCHESTRATOR_VERSION;
  runMode: 'bounded-research';
  executionKind: AlbumBoundedResearchExecutorKind;
  planDigest: string;
  status: 'completed' | 'halted' | 'authorization-blocked';
  haltReason: string | null;
  requestBudget: Readonly<{
    maxRequests: number;
    plannedRequests: number;
    executedRequests: number;
    remainingRequests: number;
  }>;
  attempts: readonly AlbumBoundedResearchAttempt[];
  effects: Readonly<{
    fixtureExecutorCalls: number;
    externalCalls: number;
    databaseReads: 0;
    databaseWrites: 0;
    scheduleMutations: 0;
    environmentMutations: 0;
  }>;
  reportDigest: string;
}>;

function planIsSideEffectFree(plan: AlbumCollectorPlan): boolean {
  return plan.runMode === 'plan-only'
    && plan.activation === 'disabled'
    && plan.effects.externalCalls === 0
    && plan.effects.databaseReads === 0
    && plan.effects.databaseWrites === 0
    && plan.effects.scheduleMutation === 0
    && plan.effects.environmentMutation === 0
    && plan.requests.every((request) => request.executionAuthorized === false);
}

function maxRequestBudget(value: number | undefined): number {
  const budget = value ?? ALBUM_BOUNDED_RESEARCH_MAX_REQUESTS;
  if (!Number.isSafeInteger(budget) || budget < 1 || budget > ALBUM_BOUNDED_RESEARCH_MAX_REQUESTS) {
    throw new Error('album_bounded_research_request_budget_invalid');
  }
  return budget;
}

function authorizationBlockReason(
  plan: AlbumCollectorPlan,
  authorization: AlbumBoundedResearchAuthorization,
  executor: AlbumBoundedResearchExecutor,
): string | null {
  if (!authorization.boundedResearchImplementationAuthorized) return 'bounded-research-implementation-not-authorized';
  if (!authorization.globalEnabled) return 'global-kill-switch-disabled';
  if (authorization.persistenceAuthorized !== false) return 'persistence-must-remain-disabled';
  if (authorization.scheduleMutationAuthorized !== false) return 'schedule-mutation-must-remain-disabled';
  if (authorization.environmentMutationAuthorized !== false) return 'environment-mutation-must-remain-disabled';
  if (executor.kind === 'live-network') {
    if (!authorization.liveNetworkExecutionAuthorized) return 'live-network-execution-not-authorized-v1';
    if (!authorization.liveNetworkGrantDigest) return 'live-network-grant-required';
    if (!executor.authorizationDigest || executor.authorizationDigest !== authorization.liveNetworkGrantDigest) {
      return 'live-network-grant-mismatch';
    }
  }
  if (executor.kind === 'fixture' && !authorization.fixtureExecutionAuthorized) {
    return 'fixture-execution-not-authorized';
  }

  for (const request of plan.requests) {
    if (!authorization.providerEnabled[request.provider]) return `${request.provider}-kill-switch-disabled`;
  }
  return null;
}

function haltReason(result: AlbumBoundedResearchExecutorResult): string | null {
  if (result.status === 'ok') return null;
  if (result.status === 'schema-drift') return 'schema-drift';
  if (result.status === 'quantity-field-missing') return 'quantity-field-missing';
  if (result.status === 'provider-semantic-conflict') return 'provider-semantic-conflict';
  if (result.httpStatus === 403) return 'http-403-halt-no-bypass';
  if (result.httpStatus === 429) return 'http-429-halt';
  if (result.httpStatus !== undefined && result.httpStatus >= 500) return 'provider-5xx-halt-v1';
  return 'provider-http-error-halt';
}

function freezeReport(input: Omit<AlbumBoundedResearchReport, 'reportDigest'>): AlbumBoundedResearchReport {
  const digestInput = {
    orchestratorVersion: input.orchestratorVersion,
    runMode: input.runMode,
    executionKind: input.executionKind,
    planDigest: input.planDigest,
    status: input.status,
    haltReason: input.haltReason,
    requestBudget: input.requestBudget,
    attempts: input.attempts,
    effects: input.effects,
  };
  return Object.freeze({ ...input, reportDigest: sha256Canonical(digestInput) });
}

export async function runAlbumBoundedResearch(input: Readonly<{
  plan: AlbumCollectorPlan;
  authorization?: AlbumBoundedResearchAuthorization;
  executor: AlbumBoundedResearchExecutor;
  maxRequests?: number;
}>): Promise<AlbumBoundedResearchReport> {
  const authorization = input.authorization ?? DEFAULT_ALBUM_BOUNDED_RESEARCH_AUTHORIZATION;
  const maxRequests = maxRequestBudget(input.maxRequests);

  if (!planIsSideEffectFree(input.plan)) {
    throw new Error('album_bounded_research_plan_contract_invalid');
  }
  if (input.plan.requests.length > maxRequests) {
    throw new Error('album_bounded_research_plan_exceeds_request_budget');
  }
  if (input.executor.kind !== 'fixture' && input.executor.kind !== 'live-network') {
    throw new Error('album_bounded_research_executor_kind_invalid');
  }

  const blocked = authorizationBlockReason(input.plan, authorization, input.executor);
  if (blocked) {
    return freezeReport({
      orchestratorVersion: ALBUM_BOUNDED_RESEARCH_ORCHESTRATOR_VERSION,
      runMode: 'bounded-research',
      executionKind: input.executor.kind,
      planDigest: input.plan.planDigest,
      status: 'authorization-blocked',
      haltReason: blocked,
      requestBudget: Object.freeze({
        maxRequests,
        plannedRequests: input.plan.requests.length,
        executedRequests: 0,
        remainingRequests: maxRequests,
      }),
      attempts: Object.freeze([]),
      effects: Object.freeze({
        fixtureExecutorCalls: 0,
        externalCalls: 0,
        databaseReads: 0 as const,
        databaseWrites: 0 as const,
        scheduleMutations: 0 as const,
        environmentMutations: 0 as const,
      }),
    });
  }

  const attempts: AlbumBoundedResearchAttempt[] = [];
  let stoppedBy: string | null = null;

  for (let index = 0; index < input.plan.requests.length; index += 1) {
    const request = input.plan.requests[index];
    let result: AlbumBoundedResearchExecutorResult;
    try {
      result = await input.executor.execute(request);
    } catch {
      stoppedBy = 'executor-threw-fail-closed';
      attempts.push(Object.freeze({
        requestIndex: index,
        provider: request.provider,
        timeframe: request.timeframe,
        periodMode: request.periodMode,
        status: 'provider-semantic-conflict',
        httpStatus: null,
        rowCount: null,
        payloadDigest: null,
        haltReason: stoppedBy,
      }));
      break;
    }

    const reason = haltReason(result);
    attempts.push(Object.freeze({
      requestIndex: index,
      provider: request.provider,
      timeframe: request.timeframe,
      periodMode: request.periodMode,
      status: result.status,
      httpStatus: result.httpStatus ?? null,
      rowCount: result.rowCount ?? null,
      payloadDigest: result.payloadDigest ?? null,
      haltReason: reason,
    }));

    if (reason) {
      stoppedBy = reason;
      break;
    }
  }

  const executedRequests = attempts.length;
  return freezeReport({
    orchestratorVersion: ALBUM_BOUNDED_RESEARCH_ORCHESTRATOR_VERSION,
    runMode: 'bounded-research',
    executionKind: input.executor.kind,
    planDigest: input.plan.planDigest,
    status: stoppedBy ? 'halted' : 'completed',
    haltReason: stoppedBy,
    requestBudget: Object.freeze({
      maxRequests,
      plannedRequests: input.plan.requests.length,
      executedRequests,
      remainingRequests: maxRequests - executedRequests,
    }),
    attempts: Object.freeze(attempts),
    effects: Object.freeze({
      fixtureExecutorCalls: input.executor.kind === 'fixture' ? executedRequests : 0,
      externalCalls: input.executor.kind === 'live-network' ? executedRequests : 0,
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      scheduleMutations: 0 as const,
      environmentMutations: 0 as const,
    }),
  });
}
