import { pathToFileURL } from 'node:url';

import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_VERSION,
  type NaverNewsSchedulerPlan,
} from '../../lib/server/ingestion/naverNewsScheduler';
import {
  NAVER_NEWS_V124_APPROVAL_ENV,
  NAVER_NEWS_V124_APPROVAL_VALUE,
  productionWriteExitCode,
  runNaverNewsProductionWrite,
  type NaverNewsProductionWriteSummary,
} from './write-naver-news-v124.mjs';

export const NAVER_NEWS_V126_DISPATCH_VERSION = 'v126_naver_news_scheduler_dispatch_v1';
export const NAVER_NEWS_V126_APPROVAL_ENV = 'FANDEX_APPROVE_V126_NAVER_NEWS_SCHEDULER_DISPATCH';
export const NAVER_NEWS_V126_APPROVAL_VALUE = 'approved-v126-scheduler-dispatch';

const VALUE_FLAGS = Object.freeze(['--query', '--display']);

export type ParsedSchedulerDispatchCommand = Readonly<{
  query: string;
  display?: number;
}>;

export type NaverNewsSchedulerDispatchDependencies = Readonly<{
  now?: () => Date;
  productionWrite?: typeof runNaverNewsProductionWrite;
}>;

export type NaverNewsSchedulerDispatchSummary = Readonly<{
  mode: 'scheduler-dispatch';
  dispatchVersion: typeof NAVER_NEWS_V126_DISPATCH_VERSION;
  schedulerVersion: typeof NAVER_NEWS_SCHEDULER_VERSION;
  activation: 'manual-only';
  slotStart: string;
  nextSlotStart: string;
  collectionKey: string;
  workerId: string;
  production: NaverNewsProductionWriteSummary;
}>;

function argumentInvalid(): never {
  throw new Error('naver_news_scheduler_dispatch_argument_invalid');
}

function valueAfter(argv: readonly string[], index: number): string {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) return argumentInvalid();
  return value;
}

function positiveInteger(value: string): number {
  if (!/^\d+$/.test(value)) return argumentInvalid();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return argumentInvalid();
  return parsed;
}

function currentIso(now: () => Date): string {
  let current: Date;
  try {
    current = now();
  } catch {
    throw new Error('naver_news_scheduler_dispatch_clock_invalid');
  }
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new Error('naver_news_scheduler_dispatch_clock_invalid');
  }
  return current.toISOString();
}

export function parseSchedulerDispatchCommand(argv: readonly string[]): ParsedSchedulerDispatchCommand {
  const seen = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply') {
      if (seen.has(argument)) return argumentInvalid();
      seen.add(argument);
      continue;
    }
    if (!VALUE_FLAGS.includes(argument) || seen.has(argument)) return argumentInvalid();
    seen.add(argument);
    values.set(argument, valueAfter(argv, index));
    index += 1;
  }

  if (!seen.has('--apply')) throw new Error('naver_news_scheduler_dispatch_apply_required');
  const query = values.get('--query');
  if (!query) return argumentInvalid();
  const displayValue = values.get('--display');

  return Object.freeze({
    query,
    ...(displayValue === undefined ? {} : { display: positiveInteger(displayValue) }),
  });
}

function productionArguments(plan: NaverNewsSchedulerPlan): readonly string[] {
  return Object.freeze([
    '--apply',
    '--query', plan.command.query,
    '--collection-key', plan.collectionKey,
    '--display', String(plan.command.display),
    '--start', String(plan.command.start),
    '--sort', plan.command.sort,
    '--worker-id', plan.workerId,
  ]);
}

function dispatchFailed(): Error {
  return new Error('naver_news_scheduler_dispatch_failed');
}

export async function runNaverNewsSchedulerDispatch(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsSchedulerDispatchDependencies = {},
): Promise<NaverNewsSchedulerDispatchSummary> {
  if (environment[NAVER_NEWS_V126_APPROVAL_ENV] !== NAVER_NEWS_V126_APPROVAL_VALUE) {
    throw new Error('naver_news_scheduler_dispatch_approval_required');
  }

  const parsed = parseSchedulerDispatchCommand(argv);
  const plan = buildNaverNewsSchedulerPlan({
    query: parsed.query,
    at: currentIso(dependencies.now ?? (() => new Date())),
    ...(parsed.display === undefined ? {} : { display: parsed.display }),
  });

  const delegatedEnvironment = Object.freeze({
    ...environment,
    [NAVER_NEWS_V124_APPROVAL_ENV]: NAVER_NEWS_V124_APPROVAL_VALUE,
  });

  let production: NaverNewsProductionWriteSummary;
  try {
    production = await (dependencies.productionWrite ?? runNaverNewsProductionWrite)(
      productionArguments(plan),
      delegatedEnvironment,
    );
  } catch {
    throw dispatchFailed();
  }

  return Object.freeze({
    mode: 'scheduler-dispatch' as const,
    dispatchVersion: NAVER_NEWS_V126_DISPATCH_VERSION,
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    activation: 'manual-only' as const,
    slotStart: plan.slotStart,
    nextSlotStart: plan.nextSlotStart,
    collectionKey: plan.collectionKey,
    workerId: plan.workerId,
    production,
  });
}

export async function main(
  argv = process.argv.slice(2),
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const summary = await runNaverNewsSchedulerDispatch(argv, environment);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = productionWriteExitCode(summary.production.status);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('NAVER News v126 scheduler dispatch failed closed. No credential, endpoint, database detail, SQL, or raw payload was logged.');
    process.exitCode = 1;
  });
}
