import { pathToFileURL } from 'node:url';

import {
  buildNaverNewsSchedulerPlan,
  type NaverNewsSchedulerPlanInput,
} from '../../lib/server/ingestion/naverNewsScheduler';

const VALUE_FLAGS = Object.freeze(['--query', '--at', '--display']);

export type ParsedSchedulerPlanCommand = Readonly<{
  query: string;
  at: string;
  display?: number;
}>;

function argumentInvalid(): never {
  throw new Error('naver_news_scheduler_plan_argument_invalid');
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
    throw new Error('naver_news_scheduler_plan_clock_invalid');
  }
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new Error('naver_news_scheduler_plan_clock_invalid');
  }
  return current.toISOString();
}

export function parseSchedulerPlanCommand(
  argv: readonly string[],
  now: () => Date = () => new Date(),
): ParsedSchedulerPlanCommand {
  const seen = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!VALUE_FLAGS.includes(argument) || seen.has(argument)) return argumentInvalid();
    seen.add(argument);
    values.set(argument, valueAfter(argv, index));
    index += 1;
  }

  const query = values.get('--query');
  if (!query) return argumentInvalid();

  const at = values.get('--at') ?? currentIso(now);
  const displayValue = values.get('--display');

  return Object.freeze({
    query,
    at,
    ...(displayValue === undefined ? {} : { display: positiveInteger(displayValue) }),
  });
}

export function buildSchedulerPlanReport(input: NaverNewsSchedulerPlanInput) {
  const plan = buildNaverNewsSchedulerPlan(input);
  return Object.freeze({
    mode: 'scheduler-plan' as const,
    ...plan,
  });
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseSchedulerPlanCommand(argv);
  const report = buildSchedulerPlanReport(parsed);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error('NAVER News v125 scheduler plan failed closed. No API call, database query, database write, schedule activation, or environment mutation was performed.');
    process.exitCode = 1;
  });
}
