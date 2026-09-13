import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import {
  runNaverNewsRecurringScheduler,
  type NaverNewsRecurringDependencies,
  type NaverNewsRecurringResult,
} from './naverNewsRecurringScheduler';
import { readNaverNewsRecurringConfig } from './naverNewsRecurringSchedulerContracts';
import { NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY } from './naverNewsScheduler';

export const NAVER_NEWS_SHADOW_RECURRING_ACTIVATION_VERSION =
  'v1_naver_news_shadow_recurring_activation' as const;

export const NAVER_NEWS_SHADOW_RECURRING_CANONICAL_ARTIST_ID = 'iu' as const;

export type NaverNewsShadowRecurringProtocol = Readonly<{
  canonicalArtistId: typeof NAVER_NEWS_SHADOW_RECURRING_CANONICAL_ARTIST_ID;
  query: string;
  display: typeof NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY;
}>;

export type NaverNewsShadowRecurringResult = Readonly<{
  activationVersion: typeof NAVER_NEWS_SHADOW_RECURRING_ACTIVATION_VERSION;
  protocol: NaverNewsShadowRecurringProtocol;
  recurring: NaverNewsRecurringResult;
}>;

function rejected(): never {
  throw new Error('naver_news_shadow_recurring_scheduler_rejected');
}

export function readNaverNewsShadowRecurringProtocol(
  environment: Readonly<Record<string, string | undefined>>,
): NaverNewsShadowRecurringProtocol {
  let config: ReturnType<typeof readNaverNewsRecurringConfig>;
  try {
    config = readNaverNewsRecurringConfig(environment);
  } catch {
    return rejected();
  }

  const binding = bindCanonicalArtistToNaverNews(NAVER_NEWS_SHADOW_RECURRING_CANONICAL_ARTIST_ID);
  if (config.query !== binding.query || config.display !== NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY) {
    return rejected();
  }

  return Object.freeze({
    canonicalArtistId: NAVER_NEWS_SHADOW_RECURRING_CANONICAL_ARTIST_ID,
    query: binding.query,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
}

export async function runNaverNewsShadowRecurringScheduler(
  environment: Readonly<Record<string, string | undefined>>,
  authorizationHeader: unknown,
  dependencies: NaverNewsRecurringDependencies = {},
): Promise<NaverNewsShadowRecurringResult> {
  const protocol = readNaverNewsShadowRecurringProtocol(environment);
  let recurring: NaverNewsRecurringResult;
  try {
    recurring = await runNaverNewsRecurringScheduler(
      environment,
      authorizationHeader,
      dependencies,
    );
  } catch {
    return rejected();
  }

  return Object.freeze({
    activationVersion: NAVER_NEWS_SHADOW_RECURRING_ACTIVATION_VERSION,
    protocol,
    recurring,
  });
}
