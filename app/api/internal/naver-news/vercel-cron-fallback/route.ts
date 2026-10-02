import 'server-only';
import { getVercelOidcToken } from '@vercel/functions/oidc';

import {
  handleNaverNewsVercelCronFallback,
} from '@/lib/server/ingestion/naverNewsVercelCronFallback';
import {
  createProductionNaverNewsBlobEvidenceStore,
} from '@/lib/server/ingestion/naverNewsBlobMirrorRuntime';

export const runtime = 'nodejs';
export const preferredRegion = 'sin1';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request): Promise<Response> {
  return handleNaverNewsVercelCronFallback(
    request,
    process.env,
    {
      resolveOidcToken: () => getVercelOidcToken(),
      createStore: createProductionNaverNewsBlobEvidenceStore,
    },
  );
}
