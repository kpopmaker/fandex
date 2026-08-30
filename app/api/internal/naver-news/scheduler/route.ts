import 'server-only';

import { runNaverNewsRecurringScheduler } from '@/lib/server/ingestion/naverNewsRecurringScheduler';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const result = await runNaverNewsRecurringScheduler(
      process.env,
      request.headers.get('authorization'),
    );
    return Response.json({
      ok: true,
      mode: 'recurring-scheduler',
      recurringVersion: result.recurringVersion,
      schedulerVersion: result.dispatch.schedulerVersion,
      slotStart: result.dispatch.slotStart,
      collectionKey: result.dispatch.collectionKey,
      status: result.dispatch.production.status,
    });
  } catch {
    return Response.json({ ok: false, code: 'naver_news_recurring_scheduler_rejected' }, { status: 403 });
  }
}
