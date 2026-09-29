import 'server-only';

import {
  readNaverNewsShadowRecurringProtocol,
  runNaverNewsShadowRecurringScheduler,
  type NaverNewsShadowRecurringResult,
} from '@/lib/server/ingestion/naverNewsShadowRecurringScheduler';
import type { NaverNewsRecurringDependencies } from '@/lib/server/ingestion/naverNewsRecurringScheduler';
import {
  isNaverNewsRecurringAuthorizationValid,
  readNaverNewsRecurringConfig,
} from '@/lib/server/ingestion/naverNewsRecurringSchedulerContracts';

export const dynamic = 'force-dynamic';

type ShadowRecurringFailureClass =
  | 'config_rejected'
  | 'protocol_rejected'
  | 'authorization_rejected'
  | 'dispatch_failed';

function rejected(errorClass: ShadowRecurringFailureClass): Response {
  return Response.json(
    {
      ok: false,
      code: 'naver_news_shadow_recurring_scheduler_rejected',
      errorClass,
    },
    { status: 403 },
  );
}

export async function handleNaverNewsShadowRecurringSchedulerRequest(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsRecurringDependencies = {},
): Promise<Response> {
  let config: ReturnType<typeof readNaverNewsRecurringConfig>;
  try {
    config = readNaverNewsRecurringConfig(environment);
  } catch {
    return rejected('config_rejected');
  }

  try {
    readNaverNewsShadowRecurringProtocol(environment);
  } catch {
    return rejected('protocol_rejected');
  }

  if (!isNaverNewsRecurringAuthorizationValid(
    request.headers.get('authorization'),
    config.secret,
  )) {
    return rejected('authorization_rejected');
  }

  try {
    const result: NaverNewsShadowRecurringResult = await runNaverNewsShadowRecurringScheduler(
      environment,
      request.headers.get('authorization'),
      dependencies,
    );
    return Response.json({
      ok: true,
      mode: 'shadow-recurring-scheduler',
      activationVersion: result.activationVersion,
      canonicalArtistId: result.protocol.canonicalArtistId,
      query: result.protocol.query,
      display: result.protocol.display,
      recurringVersion: result.recurring.recurringVersion,
      schedulerVersion: result.recurring.dispatch.schedulerVersion,
      slotStart: result.recurring.dispatch.slotStart,
      collectionKey: result.recurring.dispatch.collectionKey,
      status: result.recurring.dispatch.production.status,
    });
  } catch {
    return rejected('dispatch_failed');
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleNaverNewsShadowRecurringSchedulerRequest(request, process.env);
}
