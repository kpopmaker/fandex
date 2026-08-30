import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_VERSION,
  type NaverNewsSchedulerPlan,
} from './naverNewsScheduler';
import {
  NAVER_NEWS_V124_APPROVAL_ENV,
  NAVER_NEWS_V124_APPROVAL_VALUE,
  runNaverNewsProductionWrite,
  type NaverNewsProductionWriteSummary,
// @ts-expect-error Next/Turbopack resolves the repository's existing .mts writer while tsc disallows explicit .mts imports.
} from '../../../scripts/ingestion/write-naver-news-v124.mts';

export type NaverNewsSchedulerDispatchDependencies = Readonly<{
  now?: () => Date;
  productionWrite?: typeof runNaverNewsProductionWrite;
}>;

export type NaverNewsSchedulerDispatchCoreSummary = Readonly<{
  mode: 'scheduler-dispatch';
  dispatchVersion: 'v126_naver_news_scheduler_dispatch_v1';
  schedulerVersion: typeof NAVER_NEWS_SCHEDULER_VERSION;
  slotStart: string;
  nextSlotStart: string;
  collectionKey: string;
  workerId: string;
  production: NaverNewsProductionWriteSummary;
}>;

function currentIso(now: () => Date): string {
  let current: Date;
  try { current = now(); } catch { throw new Error('naver_news_scheduler_dispatch_clock_invalid'); }
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new Error('naver_news_scheduler_dispatch_clock_invalid');
  }
  return current.toISOString();
}

function productionArguments(plan: NaverNewsSchedulerPlan): readonly string[] {
  return Object.freeze([
    '--apply', '--query', plan.command.query, '--collection-key', plan.collectionKey,
    '--display', String(plan.command.display), '--start', String(plan.command.start),
    '--sort', plan.command.sort, '--worker-id', plan.workerId,
  ]);
}

export async function runNaverNewsSchedulerDispatchCore(
  input: Readonly<{ query: string; display?: number; environment: Readonly<Record<string, string | undefined>> }>,
  dependencies: NaverNewsSchedulerDispatchDependencies = {},
): Promise<NaverNewsSchedulerDispatchCoreSummary> {
  const plan = buildNaverNewsSchedulerPlan({
    query: input.query,
    at: currentIso(dependencies.now ?? (() => new Date())),
    ...(input.display === undefined ? {} : { display: input.display }),
  });
  const delegatedEnvironment = Object.freeze({
    ...input.environment,
    [NAVER_NEWS_V124_APPROVAL_ENV]: NAVER_NEWS_V124_APPROVAL_VALUE,
  });
  let production: NaverNewsProductionWriteSummary;
  try {
    production = await (dependencies.productionWrite ?? runNaverNewsProductionWrite)(
      productionArguments(plan), delegatedEnvironment,
    );
  } catch {
    throw new Error('naver_news_scheduler_dispatch_failed');
  }
  return Object.freeze({
    mode: 'scheduler-dispatch' as const,
    dispatchVersion: 'v126_naver_news_scheduler_dispatch_v1' as const,
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    slotStart: plan.slotStart,
    nextSlotStart: plan.nextSlotStart,
    collectionKey: plan.collectionKey,
    workerId: plan.workerId,
    production,
  });
}
