import 'server-only';

import {
  isNaverNewsRecurringAuthorizationValid,
  readNaverNewsRecurringConfig,
} from '@/lib/server/ingestion/naverNewsRecurringSchedulerContracts';
import { runNaverNewsShadowSeriesVerification } from '@/scripts/ingestion/verify-naver-news-shadow-series.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VERIFIER_ARGS = Object.freeze([
  '--artist',
  'iu',
  '--protocol-start',
  '2026-09-15T16:00:00.000Z',
  '--through-slot-start',
  '2026-09-15T17:00:00.000Z',
]);

type VerificationRunner = typeof runNaverNewsShadowSeriesVerification;

function rejected(): Response {
  return Response.json(
    { ok: false, code: 'naver_news_shadow_series_verifier_rejected' },
    { status: 403 },
  );
}

export async function handleNaverNewsShadowSeriesVerifierRequest(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  runVerification: VerificationRunner = runNaverNewsShadowSeriesVerification,
): Promise<Response> {
  try {
    const config = readNaverNewsRecurringConfig(environment);
    if (!isNaverNewsRecurringAuthorizationValid(
      request.headers.get('authorization'),
      config.secret,
    )) {
      return rejected();
    }

    const result = await runVerification(VERIFIER_ARGS, environment);
    return Response.json({
      ok: true,
      mode: 'shadow-series-verifier',
      ...result,
    });
  } catch {
    return rejected();
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleNaverNewsShadowSeriesVerifierRequest(request, process.env);
}
