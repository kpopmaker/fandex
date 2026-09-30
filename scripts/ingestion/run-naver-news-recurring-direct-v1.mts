import { pathToFileURL } from 'node:url';

import {
  runNaverNewsShadowRecurringScheduler,
  type NaverNewsShadowRecurringResult,
} from '../../lib/server/ingestion/naverNewsShadowRecurringScheduler';
import {
  readNaverNewsRecurringConfig,
} from '../../lib/server/ingestion/naverNewsRecurringSchedulerContracts';
import type {
  NaverNewsRecurringDependencies,
} from '../../lib/server/ingestion/naverNewsRecurringScheduler';

export const NAVER_NEWS_DIRECT_RECURRING_APPROVAL_ENV =
  'FANDEX_NAVER_DIRECT_RECURRING_EXECUTION_APPROVAL' as const;
export const NAVER_NEWS_DIRECT_RECURRING_APPROVAL_VALUE =
  'approved-github-actions-direct-v1' as const;

export type NaverNewsDirectRecurringSummary = Readonly<{
  mode: 'github-actions-direct-recurring';
  activationVersion: NaverNewsShadowRecurringResult['activationVersion'];
  canonicalArtistId: NaverNewsShadowRecurringResult['protocol']['canonicalArtistId'];
  recurringVersion: NaverNewsShadowRecurringResult['recurring']['recurringVersion'];
  schedulerVersion: NaverNewsShadowRecurringResult['recurring']['dispatch']['schedulerVersion'];
  slotStart: string;
  collectionKey: string;
  status: NaverNewsShadowRecurringResult['recurring']['dispatch']['production']['status'];
}>;

export async function runNaverNewsDirectRecurring(
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsRecurringDependencies = {},
): Promise<NaverNewsDirectRecurringSummary> {
  if (
    environment[NAVER_NEWS_DIRECT_RECURRING_APPROVAL_ENV]
      !== NAVER_NEWS_DIRECT_RECURRING_APPROVAL_VALUE
  ) {
    throw new Error('naver_news_direct_recurring_approval_required');
  }

  const config = readNaverNewsRecurringConfig(environment);
  const result = await runNaverNewsShadowRecurringScheduler(
    environment,
    `Bearer ${config.secret}`,
    dependencies,
  );

  return Object.freeze({
    mode: 'github-actions-direct-recurring' as const,
    activationVersion: result.activationVersion,
    canonicalArtistId: result.protocol.canonicalArtistId,
    recurringVersion: result.recurring.recurringVersion,
    schedulerVersion: result.recurring.dispatch.schedulerVersion,
    slotStart: result.recurring.dispatch.slotStart,
    collectionKey: result.recurring.dispatch.collectionKey,
    status: result.recurring.dispatch.production.status,
  });
}

export async function main(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const summary = await runNaverNewsDirectRecurring(environment);
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error(
      'NAVER News direct recurring run failed closed. No credential, endpoint, database detail, SQL, or raw provider payload was logged.',
    );
    process.exitCode = 1;
  });
}
