import 'server-only';

import {
  isNaverNewsRecurringAuthorizationValid,
  readNaverNewsRecurringConfig,
} from '@/lib/server/ingestion/naverNewsRecurringSchedulerContracts';
import { runNaverNewsMediaActivityMethodResearch } from '@/lib/server/ingestion/naverNewsMediaActivityMethodResearch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RESEARCH_ARGS = Object.freeze([
  '--artist',
  'iu',
  '--through-slot-start',
  '2026-09-16T06:00:00.000Z',
  '--window-slots',
  '1,2,4,8,12',
]);

type ResearchRunner = typeof runNaverNewsMediaActivityMethodResearch;

function rejected(): Response {
  return Response.json(
    { ok: false, code: 'naver_news_media_activity_method_research_rejected' },
    { status: 403 },
  );
}

export async function handleNaverNewsMediaActivityMethodResearchRequest(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  runResearch: ResearchRunner = runNaverNewsMediaActivityMethodResearch,
): Promise<Response> {
  try {
    const config = readNaverNewsRecurringConfig(environment);
    if (!isNaverNewsRecurringAuthorizationValid(
      request.headers.get('authorization'),
      config.secret,
    )) {
      return rejected();
    }

    const result = await runResearch(RESEARCH_ARGS, environment);
    return Response.json({
      ok: true,
      mode: 'media-activity-method-research',
      executionScope: 'research_only_non_normative',
      ...result,
    });
  } catch {
    return rejected();
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleNaverNewsMediaActivityMethodResearchRequest(request, process.env);
}
