import 'server-only';
import { getVercelOidcToken } from '@vercel/functions/oidc';

import {
  handleNaverNewsBlobOnlyProductionStage,
} from '@/lib/server/ingestion/naverNewsBlobOnlyProductionStage';
import {
  createProductionNaverNewsBlobEvidenceStore,
} from '@/lib/server/ingestion/naverNewsBlobMirrorRuntime';

export const runtime = 'nodejs';
export const preferredRegion = 'sin1';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  return handleNaverNewsBlobOnlyProductionStage(
    request,
    process.env,
    {
      resolveOidcToken: () => getVercelOidcToken(),
      createStore: createProductionNaverNewsBlobEvidenceStore,
    },
  );
}
