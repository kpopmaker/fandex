import 'server-only';

import { runNaverNewsShadowSeriesVerification } from '@/lib/server/ingestion/naverNewsShadowSeriesVerifier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function rejected(code: string, status = 403): Response {
  return Response.json({ ok: false, code }, { status });
}

export async function GET(request: Request): Promise<Response> {
  if (process.env.VERCEL_ENV !== 'preview') {
    return rejected('momentum_naver_preview_probe_preview_only');
  }

  const url = new URL(request.url);
  const throughSlotStart = url.searchParams.get('through-slot-start');
  if (!throughSlotStart) {
    return rejected('momentum_naver_preview_probe_through_required', 400);
  }

  try {
    const result = await runNaverNewsShadowSeriesVerification([
      '--artist',
      'iu',
      '--protocol-start',
      '2026-09-15T16:00:00.000Z',
      '--through-slot-start',
      throughSlotStart,
    ], process.env);

    return Response.json({
      ok: true,
      mode: 'momentum-naver-preview-readonly-probe',
      ...result,
    });
  } catch {
    return rejected('momentum_naver_preview_probe_failed');
  }
}
