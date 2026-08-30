import {
  isNaverNewsRecurringAuthorizationValid,
  NAVER_NEWS_RECURRING_SCHEDULER_VERSION,
  readNaverNewsRecurringConfig,
} from './naverNewsRecurringSchedulerContracts';
import { runNaverNewsSchedulerDispatchCore, type NaverNewsSchedulerDispatchCoreSummary } from './naverNewsSchedulerDispatch';

export type NaverNewsRecurringDependencies = Readonly<{
  now?: () => Date;
  dispatch?: typeof runNaverNewsSchedulerDispatchCore;
}>;

export type NaverNewsRecurringResult = Readonly<{
  recurringVersion: typeof NAVER_NEWS_RECURRING_SCHEDULER_VERSION;
  dispatch: NaverNewsSchedulerDispatchCoreSummary;
}>;

export async function runNaverNewsRecurringScheduler(
  environment: Readonly<Record<string, string | undefined>>,
  authorizationHeader: unknown,
  dependencies: NaverNewsRecurringDependencies = {},
): Promise<NaverNewsRecurringResult> {
  const config = readNaverNewsRecurringConfig(environment);
  if (!isNaverNewsRecurringAuthorizationValid(authorizationHeader, config.secret)) {
    throw new Error('naver_news_recurring_scheduler_rejected');
  }
  const dispatch = dependencies.dispatch ?? runNaverNewsSchedulerDispatchCore;
  try {
    const result = await dispatch({ query: config.query, display: config.display, environment }, { now: dependencies.now });
    return Object.freeze({ recurringVersion: NAVER_NEWS_RECURRING_SCHEDULER_VERSION, dispatch: result });
  } catch {
    throw new Error('naver_news_recurring_scheduler_rejected');
  }
}
