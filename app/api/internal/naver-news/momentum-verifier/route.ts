import 'server-only';

import {
  isMomentumProductionVerifierExecutionRequestAuthorized,
  isMomentumProductionVerifierNativeExecutionAuthorized,
} from '@/lib/server/ingestion/momentumNativeVerifierProductionExecutionAuthorization';
import {
  runNaverNewsMomentumVerifierExecutionChannel,
  type NaverNewsMomentumVerifierExecutionChannelDependencies,
} from '@/lib/server/ingestion/naverNewsMomentumVerifierExecutionChannel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function handleNaverNewsMomentumVerifierExecutionRequest(
  request: Request,
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: NaverNewsMomentumVerifierExecutionChannelDependencies = {},
): Promise<Response> {
  try {
    if (
      request.method !== 'POST'
      || !isMomentumProductionVerifierNativeExecutionAuthorized()
    ) {
      throw new Error(
        'naver_news_momentum_verifier_execution_channel_rejected',
      );
    }

    const requestBody: unknown = await request.json();
    if (!isMomentumProductionVerifierExecutionRequestAuthorized(requestBody)) {
      throw new Error(
        'naver_news_momentum_verifier_execution_channel_rejected',
      );
    }

    const result = await runNaverNewsMomentumVerifierExecutionChannel(
      {
        environment,
        authorizationHeader: request.headers.get('authorization'),
        requestBody,
      },
      dependencies,
    );

    return Response.json({
      ok: true,
      ...result,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        code: 'naver_news_momentum_verifier_execution_channel_rejected',
      },
      { status: 403 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleNaverNewsMomentumVerifierExecutionRequest(
    request,
    process.env,
  );
}
