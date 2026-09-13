import 'server-only';

import {
  runNaverNewsShadowRecurringScheduler,
  type NaverNewsShadowRecurringResult,
} from '@/lib/server/ingestion/naverNewsShadowRecurringScheduler';
import type { NaverNewsRecurringDependencies } from '@/lib/server/ingestion/naverNewsRecurringScheduler';

export const dynamic = 'force-dynamic';

export async function handleNaverNewsShadowRecurringSchedulerRequest(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsRecurringDependencies = {},
): Promise<Response> {
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
    return Response.json(
      { ok: false, code: 'naver_news_shadow_recurring_scheduler_rejected' },
      { status: 403 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleNaverNewsShadowRecurringSchedulerRequest(request, process.env);
}
